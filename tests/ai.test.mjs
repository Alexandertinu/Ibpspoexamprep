import test from 'node:test';
import assert from 'node:assert/strict';
import { parseJSONResponse, providerDefaults, validateAIConfig } from '../src/ai.js';

test('AI config validates HTTPS endpoints and keeps custom model names', () => {
  const config = validateAIConfig({ provider: 'openai', baseUrl: 'https://example.com/v1/', model: 'local-model' });
  assert.equal(config.baseUrl, 'https://example.com/v1');
  assert.equal(config.model, 'local-model');
  assert.throws(() => validateAIConfig({ provider: 'openai', baseUrl: 'http://remote.example/v1', model: 'x' }), /HTTPS/);
  assert.equal(validateAIConfig({ provider: 'openai', baseUrl: 'http://localhost:1234/v1', model: 'local', authMode: 'none' }).authMode, 'none');
});

test('provider defaults include Gemini and OpenAI-compatible profiles', () => {
  assert.match(providerDefaults('gemini').baseUrl, /googleapis/);
  assert.match(providerDefaults('openai').baseUrl, /openai/);
});

test('JSON parser accepts fenced model output', () => {
  const parsed = parseJSONResponse('```json\n{"questions":[]}\n```');
  assert.deepEqual(parsed, { questions: [] });
});
