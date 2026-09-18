import test from 'node:test';
import assert from 'node:assert/strict';
import { callAI, discoverModels, fileToAttachment, parseJSONResponse, providerDefaults, validateAIConfig } from '../src/ai.js';

function mockAPI(t) {
  const calls = [];
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    calls.push({ url, options });
    return { ok: true, status: 200, json: async () => ({
      choices: [{ message: { content: 'OK' } }],
      content: [{ type: 'text', text: 'OK' }],
      candidates: [{ content: { parts: [{ text: 'OK' }] } }],
      data: [{ id: 'custom-model' }], models: [{ name: 'models/custom-model' }],
    }) };
  });
  return calls;
}

for (const provider of ['openai', 'anthropic', 'gemini']) {
  test(`${provider}: authentication modes apply to requests and model discovery`, async (t) => {
    const calls = mockAPI(t);
    for (const authMode of ['bearer', 'header', 'none']) {
      const config = { provider, baseUrl: 'https://api.example/v1', model: 'custom-model', authMode, authHeader: 'x-custom-key', authPrefix: 'Token ' };
      assert.equal(await callAI({ config, apiKey: 'secret', prompt: 'ping' }), 'OK');
      assert.deepEqual(await discoverModels({ config, apiKey: 'secret' }), ['custom-model']);
      for (const { options } of calls.splice(0)) {
        assert.equal(options.redirect, 'error', 'API keys must not follow redirects');
        const headers = options.headers;
        assert.equal(headers.Authorization, authMode === 'bearer' ? 'Bearer secret' : undefined);
        assert.equal(headers['x-custom-key'], authMode === 'header' ? 'Token secret' : undefined);
        assert.equal(headers['x-api-key'], undefined);
        assert.equal(headers['x-goog-api-key'], undefined);
        if (provider === 'anthropic') assert.equal(headers['anthropic-version'], '2023-06-01');
      }
    }
    await callAI({ config: { provider, baseUrl: 'https://api.example/v1', model: 'custom', authMode: 'none' }, prompt: 'no key needed' });
  });
}

test('URL validation rejects unsupported schemes, embedded credentials and invalid input clearly', () => {
  const config = { provider: 'openai', model: 'custom' };
  for (const baseUrl of ['ftp://localhost/v1', 'ftp://127.0.0.1/v1', 'file:///tmp/models', 'http://remote.example/v1']) {
    assert.throws(() => validateAIConfig({ ...config, baseUrl }), /HTTPS/);
  }
  for (const baseUrl of ['https://user:pass@api.example/v1', 'http://user@localhost:1234/v1']) {
    assert.throws(() => validateAIConfig({ ...config, baseUrl }), /username or password/);
  }
  for (const baseUrl of ['', 'not a URL', 'api.example/v1']) assert.throws(() => validateAIConfig({ ...config, baseUrl }), /valid API URL/);
  assert.throws(() => validateAIConfig(null), /Choose the API format/);
  assert.throws(() => validateAIConfig({ ...config, baseUrl: 'https://api.example/v1#chat' }), /fragment/);
  assert.equal(validateAIConfig({ ...config, baseUrl: 'http://[::1]:1234/v1' }).baseUrl, 'http://[::1]:1234/v1');
});

test('model-list overrides must be valid same-origin URLs before any key is sent', async (t) => {
  const calls = mockAPI(t);
  const config = { provider: 'openai', baseUrl: 'https://api.example/v1', model: 'custom' };
  for (const modelsUrl of ['https://other.example/models', 'https://api.example:8443/models', 'http://localhost/models']) {
    await assert.rejects(() => discoverModels({ config: { ...config, modelsUrl }, apiKey: 'secret' }), /same origin/);
  }
  for (const modelsUrl of ['ftp://localhost/models', 'https://user:pass@api.example/models', 'not a URL']) {
    await assert.rejects(() => discoverModels({ config: { ...config, modelsUrl }, apiKey: 'secret' }), /HTTPS|username or password|valid model-list URL/);
  }
  assert.equal(calls.length, 0);
  await discoverModels({ config: { ...config, model: '', modelsUrl: 'https://api.example/catalog?version=2' }, apiKey: 'secret' });
  assert.equal(calls[0].url, 'https://api.example/catalog?version=2');
});

test('base URLs and full endpoints derive request and model-list paths without corrupting queries', async (t) => {
  const calls = mockAPI(t);
  const cases = [
    ['openai', '/v1', '/v1/chat/completions', '/v1/models'],
    ['openai', '/v1/chat/completions/', '/v1/chat/completions', '/v1/models'],
    ['anthropic', '', '/v1/messages', '/v1/models'],
    ['anthropic', '/v1/', '/v1/messages', '/v1/models'],
    ['anthropic', '/proxy/v1', '/proxy/v1/messages', '/proxy/v1/models'],
    ['anthropic', '/proxy/v1/messages/', '/proxy/v1/messages', '/proxy/v1/models'],
    ['gemini', '/v1beta', '/v1beta/models/custom-model:generateContent', '/v1beta/models'],
    ['gemini', '/v1beta/models/', '/v1beta/models/custom-model:generateContent', '/v1beta/models'],
    ['gemini', '/v1beta/models/full-model:generateContent/', '/v1beta/models/full-model:generateContent', '/v1beta/models'],
  ];
  const query = '?api-version=preview&route=%2Fchat%2Fcompletions&value=ends/';
  for (const [provider, base, request, models] of cases) {
    const config = { provider, baseUrl: `https://api.example${base}${query}`, model: 'custom-model', authMode: 'none' };
    await callAI({ config, prompt: 'ping' });
    await discoverModels({ config });
    assert.equal(calls.at(-2).url, `https://api.example${request}${query}`);
    assert.equal(calls.at(-1).url, `https://api.example${models}${query}`);
  }
});

test('Generate Content accepts model resource names and sends attachments', async (t) => {
  const calls = mockAPI(t);
  await callAI({ config: { provider: 'gemini', baseUrl: 'https://api.example/v1beta', model: 'models/custom-model' }, apiKey: 'secret', prompt: 'read it', attachment: { name: 'q.txt', text: 'question' } });
  assert.equal(calls[0].url, 'https://api.example/v1beta/models/custom-model:generateContent');
  assert.equal(calls[0].options.headers['x-goog-api-key'], 'secret');
  assert.equal(calls[0].options.headers.Authorization, undefined);
  assert.match(JSON.parse(calls[0].options.body).contents[0].parts[1].text, /question/);
});

test('legacy auth and custom header validation keep beginners out of fetch errors', () => {
  for (const provider of ['openai', 'anthropic', 'gemini']) {
    const config = validateAIConfig({ provider, baseUrl: 'https://api.example/v1', model: 'custom', authMode: 'apiKey' });
    assert.equal(config.authMode, provider === 'openai' ? 'bearer' : 'header');
  }
  const config = { provider: 'gemini', baseUrl: 'https://api.example/v1', model: 'custom', authMode: 'header' };
  assert.throws(() => validateAIConfig({ ...config, authHeader: 'X API Key' }), /header name/);
  assert.throws(() => validateAIConfig({ ...config, authPrefix: 'Key\n' }), /prefix/);
  assert.throws(() => validateAIConfig({ ...config, authMode: 'unknown' }), /Choose Bearer/);
});

test('network and timeout errors explain actionable next steps', async (t) => {
  const config = { provider: 'openai', baseUrl: 'https://api.example/v1', model: 'custom', authMode: 'none' };
  const mock = t.mock.method(globalThis, 'fetch', async () => { throw new TypeError('Failed to fetch'); });
  await assert.rejects(() => callAI({ config, prompt: 'ping' }), /browser requests \(CORS\).*redirects/);
  await assert.rejects(() => discoverModels({ config }), /browser requests \(CORS\).*redirects/);
  mock.mock.mockImplementation(async () => { throw Object.assign(new Error('aborted'), { name: 'AbortError' }); });
  await assert.rejects(() => callAI({ config, prompt: 'ping' }), /timed out/);
  await assert.rejects(() => discoverModels({ config }), /timed out/);
});

test('JSON parsing uses correct offsets after emoji in model commentary', () => {
  assert.deepEqual(parseJSONResponse('✅ 🙂 Result: {"questions":[]}'), { questions: [] });
});

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
