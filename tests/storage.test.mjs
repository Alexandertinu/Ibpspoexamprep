import test from 'node:test';
import assert from 'node:assert/strict';
import { storage } from '../src/storage.js';

function mockStorage(t, entries = []) {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const data = new Map();
  const local = {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, value),
    removeItem: (key) => data.delete(key),
  };
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, writable: true, value: local });
  storage.clearAll();
  for (const [key, value] of entries) data.set(key, value);
  t.after(() => {
    // Reset module state using only the synthetic store, even after a failure test.
    globalThis.localStorage = { ...local, removeItem: (key) => data.delete(key) };
    storage.clearAll();
    if (original) Object.defineProperty(globalThis, 'localStorage', original);
    else delete globalThis.localStorage;
  });
  return { data, local };
}

test('storage falls back to memory when browser localStorage is unavailable', (t) => {
  mockStorage(t);
  delete globalThis.localStorage;
  storage.clearAttempts();
  storage.saveAttempts([{ id: 'a1' }]);
  assert.deepEqual(storage.loadAttempts(), [{ id: 'a1' }]);
  storage.clearAttempts();
  assert.deepEqual(storage.loadAttempts(), []);
});

test('failed persistent writes prefer fresh in-memory data over stale localStorage', (t) => {
  const { local } = mockStorage(t, [['po-prep-bank-v1', JSON.stringify([{ id: 'old' }])]]);
  local.setItem = () => { throw new Error('Quota exceeded'); };
  assert.equal(storage.saveBank([{ id: 'new' }]), false);
  assert.deepEqual(storage.loadBank(), [{ id: 'new' }]);
  assert.deepEqual(storage.exportAll().bank, [{ id: 'new' }]);
});

test('AI credentials are stripped from saved configuration and backups', (t) => {
  mockStorage(t);
  storage.saveAIConfig({ provider: 'openai', baseUrl: 'https://example.com/v1', model: 'x', apiKey: 'test', token: 'test2' });
  assert.equal(storage.loadAIConfig().apiKey, undefined);
  assert.equal(storage.exportAll().aiConfig.token, undefined);
  storage.saveAIProfiles([{ id: 'p1', name: 'Free model', provider: 'openai', model: 'x', apiKey: 'test' }]);
  assert.equal(storage.loadAIProfiles()[0].apiKey, undefined);
  assert.equal(storage.exportAll().aiProfiles[0].apiKey, undefined);
});

test('legacy tutor conversation can be saved, exported and cleared', (t) => {
  mockStorage(t);
  const messages = [{ role: 'user', content: 'Explain percentages' }];
  storage.saveTutor(messages);
  assert.deepEqual(storage.loadTutor(), messages);
  assert.deepEqual(storage.exportAll().tutor, messages);
  storage.clearTutor();
  assert.deepEqual(storage.loadTutor(), []);
});

test('remembered API keys stay local and are excluded from backups', (t) => {
  mockStorage(t);
  storage.saveAIKeys({ 'profile-1': 'secret-key-value' });
  assert.deepEqual(storage.loadAIKeys(), { 'profile-1': 'secret-key-value' });
  const backup = storage.exportAll();
  assert.equal(backup.aiKeys, undefined);
  assert.equal(JSON.stringify(backup).includes('secret-key-value'), false);
  storage.clearAIKeys();
  assert.deepEqual(storage.loadAIKeys(), {});
});

test('mistake notebook mastery and notes are included in backups', (t) => {
  mockStorage(t);
  const state = { q1: { mastered: true, note: 'Review ratio formula' } };
  storage.saveMistakeState(state);
  assert.deepEqual(storage.loadMistakeState(), state);
  assert.deepEqual(storage.exportAll().mistakeState, state);
});

test('multiple tutor chats are stored in backups and can be cleared', (t) => {
  mockStorage(t);
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

const listCases = [
  ['po-prep-bank-v1', 'loadBank', 'bank', null],
  ['po-prep-attempts-v1', 'loadAttempts', 'attempts', []],
  ['po-prep-tests-v2', 'loadTests', 'tests', []],
  ['po-prep-ai-profiles-v1', 'loadAIProfiles', 'aiProfiles', []],
  ['po-prep-tutor-v1', 'loadTutor', 'tutor', []],
  ['po-prep-tutor-chats-v1', 'loadTutorChats', 'tutorChats', []],
];

for (const [key, getter, field, fallback] of listCases) {
  test(`${getter} and its backup tolerate malformed JSON and non-list values`, (t) => {
    const { data } = mockStorage(t);
    for (const raw of ['{broken', 'null', '{}', '"wrong shape"', '42', 'true']) {
      data.set(key, raw);
      assert.deepEqual(storage[getter](), fallback, raw);
      assert.deepEqual(storage.exportAll()[field], fallback, raw);
    }
    data.set(key, '[]');
    assert.deepEqual(storage[getter](), []);
    assert.deepEqual(storage.exportAll()[field], []);
  });

  test(`${getter} drops non-object list entries without losing valid records`, (t) => {
    const valid = { id: 'synthetic-record' };
    mockStorage(t, [[key, JSON.stringify([null, false, 42, 'wrong shape', [], valid])]]);
    assert.deepEqual(storage[getter](), [valid]);
    assert.deepEqual(storage.exportAll()[field], [valid]);
  });
}

for (const [key, getter, fallback, field, exportFallback] of [
  ['po-prep-active-v1', 'loadActive', null],
  ['po-prep-settings-v1', 'loadSettings', { questionCount: 20, durationMinutes: 20 }, 'settings', {}],
  ['po-prep-ai-config-v1', 'loadAIConfig', null, 'aiConfig', null],
  ['po-prep-ai-keys-v1', 'loadAIKeys', {}],
  ['po-prep-mistake-state-v1', 'loadMistakeState', {}, 'mistakeState', {}],
]) {
  test(`${getter} tolerates malformed JSON and non-object values`, (t) => {
    const { data } = mockStorage(t);
    for (const raw of ['{broken', 'null', '[]', '"wrong shape"', '42', 'true']) {
      data.set(key, raw);
      assert.deepEqual(storage[getter](), fallback, raw);
      if (field) assert.deepEqual(storage.exportAll()[field], exportFallback, raw);
    }
    data.set(key, '{}');
    assert.deepEqual(storage[getter](), {});
  });
}

for (const [key, save, load, clear, value, fallback, field] of [
  ['po-prep-attempts-v1', 'saveAttempts', 'loadAttempts', 'clearAttempts', [{ id: 'old' }], [], 'attempts'],
  ['po-prep-active-v1', 'saveActive', 'loadActive', 'clearActive', { id: 'old' }, null],
  ['po-prep-ai-keys-v1', 'saveAIKeys', 'loadAIKeys', 'clearAIKeys', { p1: 'synthetic-stale-key' }, {}],
  ['po-prep-tutor-v1', 'saveTutor', 'loadTutor', 'clearTutor', [{ role: 'user', content: 'old' }], [], 'tutor'],
  ['po-prep-tutor-chats-v1', 'saveTutorChats', 'loadTutorChats', 'clearTutorChats', [{ id: 'old', messages: [] }], [], 'tutorChats'],
]) {
  test(`${clear} masks stale persistent data when removeItem fails and can retry`, (t) => {
    const { data, local } = mockStorage(t);
    assert.equal(storage[save](value), true);
    local.removeItem = () => { throw new Error('Storage blocked'); };
    storage[clear]();
    assert.equal(storage.hasPersistenceIssue(), true);
    assert.deepEqual(JSON.parse(data.get(key)), value);
    assert.deepEqual(storage[load](), fallback);
    assert.deepEqual(storage[load](), fallback);
    if (field) assert.deepEqual(storage.exportAll()[field], fallback);
    assert.equal(JSON.stringify(storage.exportAll()).includes('synthetic-stale-key'), false);
    local.removeItem = (item) => data.delete(item);
    storage[clear]();
    assert.equal(data.has(key), false);
    assert.equal(storage.hasPersistenceIssue(), false);
    assert.deepEqual(storage[load](), fallback);
  });
}

test('clearAll masks every stale record when removals fail, including records never loaded', (t) => {
  const { data, local } = mockStorage(t, [
    ...listCases.map(([key]) => [key, JSON.stringify([{ id: 'old' }])]),
    ['po-prep-active-v1', '{"id":"old"}'],
    ['po-prep-settings-v1', '{"theme":"dark"}'],
    ['po-prep-ai-config-v1', '{"provider":"openai"}'],
    ['po-prep-ai-keys-v1', '{"p1":"synthetic-stale-key"}'],
    ['po-prep-mistake-state-v1', '{"q1":{"mastered":true}}'],
  ]);
  local.removeItem = () => { throw new Error('Storage blocked'); };
  storage.clearAll();
  assert.equal(data.size, 11);
  assert.equal(storage.hasPersistenceIssue(), true);
  for (const [, getter, , fallback] of listCases) assert.deepEqual(storage[getter](), fallback);
  assert.equal(storage.loadActive(), null);
  assert.deepEqual(storage.loadSettings(), { questionCount: 20, durationMinutes: 20 });
  assert.equal(storage.loadAIConfig(), null);
  assert.deepEqual(storage.loadAIKeys(), {});
  assert.deepEqual(storage.loadMistakeState(), {});
  const { exportedAt, ...backup } = storage.exportAll();
  assert.ok(Number.isFinite(Date.parse(exportedAt)));
  assert.deepEqual(backup, {
    schemaVersion: 3, bank: null, attempts: [], tests: [], settings: {},
    aiConfig: null, aiProfiles: [], tutor: [], tutorChats: [], mistakeState: {},
  });
  local.removeItem = (key) => data.delete(key);
  storage.clearAll();
  assert.equal(data.size, 0);
  assert.equal(storage.hasPersistenceIssue(), false);
});

test('API-key save reports persistence failure, stays session-readable, and recovers', (t) => {
  const key = 'po-prep-ai-keys-v1';
  const { data, local } = mockStorage(t, [[key, '{"p1":"synthetic-old-key"}']]);
  local.setItem = () => { throw new Error('Quota exceeded'); };
  assert.equal(storage.saveAIKeys({ p1: 'synthetic-session-key' }), false);
  assert.equal(storage.hasPersistenceIssue(), true);
  assert.deepEqual(storage.loadAIKeys(), { p1: 'synthetic-session-key' });
  assert.deepEqual(JSON.parse(data.get(key)), { p1: 'synthetic-old-key' });
  assert.equal(JSON.stringify(storage.exportAll()).includes('synthetic-session-key'), false);
  assert.equal(Object.hasOwn(storage.exportAll(), 'aiKeys'), false);
  local.setItem = (item, value) => data.set(item, value);
  assert.equal(storage.saveAIKeys({ p1: 'synthetic-persisted-key' }), true);
  assert.equal(storage.hasPersistenceIssue(), false);
  assert.deepEqual(JSON.parse(data.get(key)), { p1: 'synthetic-persisted-key' });
  assert.deepEqual(storage.loadAIKeys(), { p1: 'synthetic-persisted-key' });
  assert.equal(JSON.stringify(storage.exportAll()).includes('synthetic-persisted-key'), false);
});

test('a new key write after a failed removal never reveals the removed value', (t) => {
  const key = 'po-prep-ai-keys-v1';
  const { data, local } = mockStorage(t, [[key, '{"p1":"synthetic-old-key"}']]);
  local.removeItem = () => { throw new Error('Storage blocked'); };
  storage.clearAIKeys();
  assert.deepEqual(storage.loadAIKeys(), {});
  local.setItem = () => { throw new Error('Quota exceeded'); };
  assert.equal(storage.saveAIKeys({ p1: 'synthetic-new-key' }), false);
  assert.deepEqual(storage.loadAIKeys(), { p1: 'synthetic-new-key' });
  local.setItem = (item, value) => data.set(item, value);
  assert.equal(storage.saveAIKeys({ p1: 'synthetic-new-key' }), true);
  assert.equal(storage.hasPersistenceIssue(), false);
  assert.deepEqual(storage.loadAIKeys(), { p1: 'synthetic-new-key' });
  assert.deepEqual(JSON.parse(data.get(key)), { p1: 'synthetic-new-key' });
});

test('malformed or unreadable persistent JSON retains valid in-memory fallback', (t) => {
  const { data, local } = mockStorage(t);
  storage.saveAIProfiles([{ id: 'p1', model: 'synthetic-model' }]);
  data.set('po-prep-ai-profiles-v1', '{broken');
  assert.deepEqual(storage.loadAIProfiles(), [{ id: 'p1', model: 'synthetic-model' }]);
  local.getItem = () => { throw new Error('Storage blocked'); };
  assert.deepEqual(storage.loadAIProfiles(), [{ id: 'p1', model: 'synthetic-model' }]);
  assert.deepEqual(storage.loadAttempts(), []);
});

test('legacy stored profile credentials are sanitized without exporting remembered keys', (t) => {
  const credentials = { apiKey: 'synthetic-api-key', key: 'synthetic-key', token: 'synthetic-token', authorization: 'synthetic-auth' };
  mockStorage(t, [
    ['po-prep-ai-config-v1', JSON.stringify({ provider: 'openai', ...credentials })],
    ['po-prep-ai-profiles-v1', JSON.stringify([null, { id: 'p1', model: 'synthetic-model', ...credentials }])],
    ['po-prep-ai-keys-v1', '{"p1":"synthetic-remembered-key"}'],
  ]);
  assert.deepEqual(storage.loadAIConfig(), { provider: 'openai' });
  assert.deepEqual(storage.loadAIProfiles(), [{ id: 'p1', model: 'synthetic-model' }]);
  const backup = storage.exportAll();
  assert.deepEqual(backup.aiConfig, { provider: 'openai' });
  assert.deepEqual(backup.aiProfiles, [{ id: 'p1', model: 'synthetic-model' }]);
  assert.equal(Object.hasOwn(backup, 'aiKeys'), false);
  for (const value of [...Object.values(credentials), 'synthetic-remembered-key']) {
    assert.equal(JSON.stringify(backup).includes(value), false);
  }
});
