import test from 'node:test';
import assert from 'node:assert/strict';
import { callAI, discoverModels, fileToAttachment, parseJSONResponse, providerDefaults, validateAIConfig } from '../src/ai.js';

test('AI config accepts arbitrary HTTPS endpoints and model IDs', () => {
  const config = validateAIConfig({ provider: 'openai', baseUrl: 'https://example.com/v1/', model: 'any/custom-model', authMode: 'bearer' });
  assert.equal(config.baseUrl, 'https://example.com/v1');
  assert.equal(config.model, 'any/custom-model');
  assert.throws(() => validateAIConfig({ provider: 'openai', baseUrl: 'http://remote.example/v1', model: 'x' }), /HTTPS/);
  assert.equal(validateAIConfig({ provider: 'openai', baseUrl: 'http://localhost:1234/v1', model: 'local', authMode: 'none' }).authMode, 'none');
});

test('API format defaults do not hard-code providers or model names', () => {
  for (const format of ['openai', 'anthropic', 'gemini']) {
    const defaults = providerDefaults(format);
    assert.equal(defaults.baseUrl, '');
    assert.equal(defaults.model, '');
  }
  assert.equal(providerDefaults('openai').authHeader, 'Authorization');
  assert.equal(providerDefaults('anthropic').authHeader, 'x-api-key');
});

test('model discovery supports a custom endpoint and custom key header', async () => {
  const originalFetch = globalThis.fetch;
  let captured;
  globalThis.fetch = async (url, options) => { captured={url,options}; return { ok:true, status:200, json:async()=>({data:[{id:'model-b'},{id:'model-a'}]}) }; };
  try {
    const models = await discoverModels({ config:{provider:'openai',baseUrl:'https://platform.example/v1',modelsUrl:'https://platform.example/catalog/models',model:'manual',authMode:'header',authHeader:'x-api-key',authPrefix:''}, apiKey:'test-key' });
    assert.deepEqual(models, ['model-a','model-b']);
    assert.equal(captured.url, 'https://platform.example/catalog/models');
    assert.equal(captured.options.headers['x-api-key'], 'test-key');
  } finally { globalThis.fetch=originalFetch; }
});

test('file attachment detection handles uppercase PDF and missing image MIME types', async () => {
  const pdf = await fileToAttachment({ name: 'PAPER.PDF', type: '', size: 3, arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer });
  const image = await fileToAttachment({ name: 'chart.PNG', type: '', size: 3, arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer });
  const octetPdf = await fileToAttachment({ name: 'paper.pdf', type: 'application/octet-stream', size: 3, arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer });
  assert.equal(pdf.mimeType, 'application/pdf');
  assert.equal(image.mimeType, 'image/png');
  assert.equal(octetPdf.mimeType, 'application/pdf');
  await assert.rejects(() => fileToAttachment({ name: 'unknown.bin', type: '', size: 3 }), /could not identify/);
});

test('JSON parser accepts fenced model output', () => {
  assert.deepEqual(parseJSONResponse('```json\n{"questions":[]}\n```'), { questions: [] });
  assert.deepEqual(parseJSONResponse('{"questions":[]}\nHere is why [done]'), { questions: [] });
  assert.deepEqual(parseJSONResponse('Note [draft] — final data: {"questions":[]}'), { questions: [] });
});

test('Chat Completions format sends an arbitrary model with bearer authentication', async () => {
  const originalFetch = globalThis.fetch;
  let captured;
  globalThis.fetch = async (url, options) => {
    captured = { url, options, body: JSON.parse(options.body) };
    return { ok: true, status: 200, json: async () => ({ choices: [{ message: { content: 'CONNECTED' } }] }) };
  };
  try {
    const text = await callAI({ config: { provider: 'openai', baseUrl: 'https://platform.example/v1', model: 'vendor/model-42', authMode: 'bearer', authHeader: 'Authorization', authPrefix: 'Bearer ' }, apiKey: 'test-key', prompt: 'ping' });
    assert.equal(text, 'CONNECTED');
    assert.equal(captured.url, 'https://platform.example/v1/chat/completions');
    assert.equal(captured.options.headers.Authorization, 'Bearer test-key');
    assert.equal(captured.body.model, 'vendor/model-42');
  } finally { globalThis.fetch = originalFetch; }
});

test('Chat Completions format supports custom API-key headers', async () => {
  const originalFetch = globalThis.fetch;
  let captured;
  globalThis.fetch = async (url, options) => {
    captured = { url, options };
    return { ok: true, status: 200, json: async () => ({ choices: [{ message: { content: 'OK' } }] }) };
  };
  try {
    await callAI({ config: { provider: 'openai', baseUrl: 'https://platform.example/v1', model: 'custom', authMode: 'header', authHeader: 'api-key', authPrefix: '' }, apiKey: 'secret', prompt: 'ping' });
    assert.equal(captured.options.headers['api-key'], 'secret');
    assert.equal(captured.options.headers.Authorization, undefined);
  } finally { globalThis.fetch = originalFetch; }
});

test('Messages format uses its required headers and parses content blocks', async () => {
  const originalFetch = globalThis.fetch;
  let captured;
  globalThis.fetch = async (url, options) => {
    captured = { url, options, body: JSON.parse(options.body) };
    return { ok: true, status: 200, json: async () => ({ content: [{ type: 'text', text: 'CONNECTED' }] }) };
  };
  try {
    const text = await callAI({ config: { provider: 'anthropic', baseUrl: 'https://messages.example/v1/messages', model: 'any-message-model', authMode: 'header' }, apiKey: 'test-key', prompt: 'ping' });
    assert.equal(text, 'CONNECTED');
    assert.equal(captured.options.headers['x-api-key'], 'test-key');
    assert.equal(captured.options.headers['anthropic-version'], '2023-06-01');
    assert.equal(captured.body.model, 'any-message-model');
  } finally { globalThis.fetch = originalFetch; }
});
