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
  storage.saveAIProfiles([{ id: 'p1', name: 'Free model', provider: 'openai', model: 'x', apiKey: 'test' }]);
  assert.equal(storage.loadAIProfiles()[0].apiKey, undefined);
  assert.equal(storage.exportAll().aiProfiles[0].apiKey, undefined);
});

test('tutor conversation can be saved, exported and cleared', () => {
  const messages = [{ role: 'user', content: 'Explain percentages' }];
  storage.saveTutor(messages);
  assert.deepEqual(storage.loadTutor(), messages);
  assert.deepEqual(storage.exportAll().tutor, messages);
  storage.clearTutor();
  assert.deepEqual(storage.loadTutor(), []);
});
