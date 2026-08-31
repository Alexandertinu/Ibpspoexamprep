import test from 'node:test';
import assert from 'node:assert/strict';
import { callAI, parseJSONResponse, providerDefaults, validateAIConfig } from '../src/ai.js';

test('AI config validates HTTPS endpoints and keeps custom model names', () => {
  const config = validateAIConfig({ provider: 'openai', baseUrl: 'https://example.com/v1/', model: 'local-model' });
  assert.equal(config.baseUrl, 'https://example.com/v1');
  assert.equal(config.model, 'local-model');
  assert.throws(() => validateAIConfig({ provider: 'openai', baseUrl: 'http://remote.example/v1', model: 'x' }), /HTTPS/);
  assert.equal(validateAIConfig({ provider: 'openai', baseUrl: 'http://localhost:1234/v1', model: 'local', authMode: 'none' }).authMode, 'none');
});

test('provider defaults include Gemini, Inception Mercury and generic OpenAI-compatible profiles', () => {
  assert.match(providerDefaults('gemini').baseUrl, /googleapis/);
  assert.equal(providerDefaults('inception').baseUrl, 'https://api.inceptionlabs.ai/v1/chat/completions');
  assert.equal(providerDefaults('inception').model, 'mercury-2');
  assert.match(providerDefaults('openai').baseUrl, /openai/);
  assert.equal(validateAIConfig({ provider: 'inception', baseUrl: providerDefaults('inception').baseUrl, model: 'mercury-2' }).provider, 'inception');
});

test('JSON parser accepts fenced model output', () => {
  const parsed = parseJSONResponse('```json\n{"questions":[]}\n```');
  assert.deepEqual(parsed, { questions: [] });
});

test('Mercury preset sends an OpenAI-compatible bearer request and parses the reply', async () => {
  const originalFetch = globalThis.fetch;
  let captured;
  globalThis.fetch = async (url, options) => {
    captured = { url, options, body: JSON.parse(options.body) };
    return { ok: true, status: 200, json: async () => ({ choices: [{ message: { content: 'CONNECTED' } }] }) };
  };
  try {
    const text = await callAI({ config: { provider: 'inception', ...providerDefaults('inception') }, apiKey: 'test-key', prompt: 'ping' });
    assert.equal(text, 'CONNECTED');
    assert.equal(captured.url, 'https://api.inceptionlabs.ai/v1/chat/completions');
    assert.equal(captured.options.headers.Authorization, 'Bearer test-key');
    assert.equal(captured.body.model, 'mercury-2');
    assert.equal(captured.body.messages[0].content, 'ping');
  } finally {
    globalThis.fetch = originalFetch;
  }
});
