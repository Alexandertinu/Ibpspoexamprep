const KEYS = {
  bank: 'po-prep-bank-v1',
  attempts: 'po-prep-attempts-v1',
  active: 'po-prep-active-v1',
  settings: 'po-prep-settings-v1',
  tests: 'po-prep-tests-v2',
  aiConfig: 'po-prep-ai-config-v1',
  aiProfiles: 'po-prep-ai-profiles-v1',
  aiKeys: 'po-prep-ai-keys-v1',
  tutor: 'po-prep-tutor-v1',
  tutorChats: 'po-prep-tutor-chats-v1',
  mistakeState: 'po-prep-mistake-state-v1',
};

const memoryFallback = new Map();
const volatileKeys = new Set();

function read(key, fallback) {
  // A volatile key without a memory value is a failed-delete tombstone.
  if (volatileKeys.has(key)) return memoryFallback.has(key) ? memoryFallback.get(key) : fallback;
  try {
    const raw = localStorage.getItem(key);
    if (raw !== null) return JSON.parse(raw);
  } catch { /* localStorage can be unavailable in sandboxed previews */ }
  return memoryFallback.has(key) ? memoryFallback.get(key) : fallback;
}

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function readList(key, fallback = []) {
  const value = read(key, fallback);
  return Array.isArray(value) ? value.filter(isRecord) : fallback;
}

function readRecord(key, fallback = {}) {
  const value = read(key, fallback);
  return isRecord(value) ? value : fallback;
}

function write(key, value) {
  memoryFallback.set(key, value);
  try { localStorage.setItem(key, JSON.stringify(value)); volatileKeys.delete(key); return true; }
  catch { volatileKeys.add(key); return false; }
}

function remove(key) {
  memoryFallback.delete(key);
  try { localStorage.removeItem(key); volatileKeys.delete(key); }
  catch { volatileKeys.add(key); }
}

function sanitizeConfig(config) {
  if (!isRecord(config)) return null;
  const { apiKey, key, token, authorization, ...safe } = config;
  return safe;
}

export const storage = {
  hasPersistenceIssue: () => volatileKeys.size > 0,
  loadBank: () => readList(KEYS.bank, null),
  saveBank: (bank) => write(KEYS.bank, bank),
  loadAttempts: () => readList(KEYS.attempts),
  saveAttempts: (attempts) => write(KEYS.attempts, attempts),
  clearAttempts: () => remove(KEYS.attempts),
  loadActive: () => readRecord(KEYS.active, null),
  saveActive: (active) => write(KEYS.active, active),
  clearActive: () => remove(KEYS.active),
  loadSettings: () => readRecord(KEYS.settings, { questionCount: 20, durationMinutes: 20 }),
  saveSettings: (settings) => write(KEYS.settings, settings),
  loadTests: () => readList(KEYS.tests),
  saveTests: (tests) => write(KEYS.tests, tests),
  loadAIConfig: () => sanitizeConfig(read(KEYS.aiConfig, null)),
  saveAIConfig: (config) => write(KEYS.aiConfig, sanitizeConfig(config)),
  loadAIProfiles: () => readList(KEYS.aiProfiles).map(sanitizeConfig),
  saveAIProfiles: (profiles) => write(KEYS.aiProfiles, (profiles || []).map(sanitizeConfig)),
  loadAIKeys: () => readRecord(KEYS.aiKeys),
  // false means session-only fallback; callers must not report the keys as persisted.
  saveAIKeys: (keys) => write(KEYS.aiKeys, keys || {}),
  clearAIKeys: () => remove(KEYS.aiKeys),
  loadTutor: () => readList(KEYS.tutor),
  saveTutor: (messages) => write(KEYS.tutor, messages),
  clearTutor: () => remove(KEYS.tutor),
  loadTutorChats: () => readList(KEYS.tutorChats),
  saveTutorChats: (chats) => write(KEYS.tutorChats, chats),
  clearTutorChats: () => remove(KEYS.tutorChats),
  loadMistakeState: () => readRecord(KEYS.mistakeState),
  saveMistakeState: (state) => write(KEYS.mistakeState, state || {}),
  clearAll: () => Object.values(KEYS).forEach(remove),
  exportAll: () => ({
    schemaVersion: 3,
    exportedAt: new Date().toISOString(),
    bank: storage.loadBank(),
    attempts: storage.loadAttempts(),
    tests: storage.loadTests(),
    settings: readRecord(KEYS.settings),
    aiConfig: storage.loadAIConfig(),
    aiProfiles: storage.loadAIProfiles(),
    tutor: storage.loadTutor(),
    tutorChats: storage.loadTutorChats(),
    mistakeState: storage.loadMistakeState(),
  }),
};
