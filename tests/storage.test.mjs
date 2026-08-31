import test from 'node:test';
import assert from 'node:assert/strict';
import { storage } from '../src/storage.js';

test('storage falls back to memory when browser localStorage is unavailable', () => {
  storage.clearAttempts();
  storage.saveAttempts([{ id: 'a1' }]);
  assert.deepEqual(storage.loadAttempts(), [{ id: 'a1' }]);
  storage.clearAttempts();
  assert.deepEqual(storage.loadAttempts(), []);
});

test('AI credentials are stripped from saved configuration and backups', () => {
  storage.saveAIConfig({ provider: 'openai', baseUrl: 'https://example.com/v1', model: 'x', apiKey: 'test', token: 'test2' });
  assert.equal(storage.loadAIConfig().apiKey, undefined);
  assert.equal(storage.exportAll().aiConfig.token, undefined);
});
