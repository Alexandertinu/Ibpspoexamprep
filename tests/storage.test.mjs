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

test('failed persistent writes prefer fresh in-memory data over stale localStorage', () => {
  const original = globalThis.localStorage;
  const data = new Map([['po-prep-bank-v1', JSON.stringify([{ id: 'old' }])]]);
  globalThis.localStorage = {
    getItem: (key) => data.get(key) ?? null,
    setItem: () => { throw new Error('Quota exceeded'); },
    removeItem: (key) => data.delete(key),
  };
  try {
    storage.saveBank([{ id: 'new' }]);
    assert.deepEqual(storage.loadBank(), [{ id: 'new' }]);
    assert.deepEqual(storage.exportAll().bank, [{ id: 'new' }]);
  } finally {
    if (original === undefined) delete globalThis.localStorage; else globalThis.localStorage = original;
  }
});

test('AI credentials are stripped from saved configuration and backups', () => {
  storage.saveAIConfig({ provider: 'openai', baseUrl: 'https://example.com/v1', model: 'x', apiKey: 'test', token: 'test2' });
  assert.equal(storage.loadAIConfig().apiKey, undefined);
  assert.equal(storage.exportAll().aiConfig.token, undefined);
  storage.saveAIProfiles([{ id: 'p1', name: 'Free model', provider: 'openai', model: 'x', apiKey: 'test' }]);
  assert.equal(storage.loadAIProfiles()[0].apiKey, undefined);
  assert.equal(storage.exportAll().aiProfiles[0].apiKey, undefined);
});

test('legacy tutor conversation can be saved, exported and cleared', () => {
  const messages = [{ role: 'user', content: 'Explain percentages' }];
  storage.saveTutor(messages);
  assert.deepEqual(storage.loadTutor(), messages);
  assert.deepEqual(storage.exportAll().tutor, messages);
  storage.clearTutor();
  assert.deepEqual(storage.loadTutor(), []);
});

test('remembered API keys stay local and are excluded from backups', () => {
  storage.saveAIKeys({ 'profile-1': 'secret-key-value' });
  assert.deepEqual(storage.loadAIKeys(), { 'profile-1': 'secret-key-value' });
  const backup = storage.exportAll();
  assert.equal(backup.aiKeys, undefined);
  assert.equal(JSON.stringify(backup).includes('secret-key-value'), false);
  storage.clearAIKeys();
  assert.deepEqual(storage.loadAIKeys(), {});
});

test('mistake notebook mastery and notes are included in backups', () => {
  const state = { q1: { mastered: true, note: 'Review ratio formula' } };
  storage.saveMistakeState(state);
  assert.deepEqual(storage.loadMistakeState(), state);
  assert.deepEqual(storage.exportAll().mistakeState, state);
});

test('multiple tutor chats are stored in backups and can be cleared', () => {
  const chats = [
    { id: 'chat-1', title: 'Percentage analysis', messages: [{ role: 'user', content: 'Analyse my score' }] },
    { id: 'chat-2', title: 'Reasoning shortcuts', messages: [{ role: 'assistant', content: 'Start with direct questions.' }] },
  ];
  storage.saveTutorChats(chats);
  assert.deepEqual(storage.loadTutorChats(), chats);
  assert.deepEqual(storage.exportAll().tutorChats, chats);
  assert.equal(storage.exportAll().schemaVersion, 3);
  storage.clearTutorChats();
  assert.deepEqual(storage.loadTutorChats(), []);
});
