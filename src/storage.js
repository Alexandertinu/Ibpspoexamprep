const KEYS = {
  bank: 'po-prep-bank-v1',
  attempts: 'po-prep-attempts-v1',
  active: 'po-prep-active-v1',
  settings: 'po-prep-settings-v1',
  tests: 'po-prep-tests-v2',
  aiConfig: 'po-prep-ai-config-v1',
  tutor: 'po-prep-tutor-v1',
};

const memoryFallback = new Map();

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (raw !== null) return JSON.parse(raw);
  } catch { /* localStorage can be unavailable in sandboxed previews */ }
  return memoryFallback.has(key) ? memoryFallback.get(key) : fallback;
}

function write(key, value) {
  memoryFallback.set(key, value);
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* continue in memory */ }
}

function remove(key) {
  memoryFallback.delete(key);
  try { localStorage.removeItem(key); } catch { /* continue in memory */ }
}

function sanitizeConfig(config) {
  if (!config) return null;
  const { apiKey, key, token, authorization, ...safe } = config;
  return safe;
}

export const storage = {
  loadBank: () => read(KEYS.bank, null),
  saveBank: (bank) => write(KEYS.bank, bank),
  loadAttempts: () => read(KEYS.attempts, []),
  saveAttempts: (attempts) => write(KEYS.attempts, attempts),
  clearAttempts: () => remove(KEYS.attempts),
  loadActive: () => read(KEYS.active, null),
  saveActive: (active) => write(KEYS.active, active),
  clearActive: () => remove(KEYS.active),
  loadSettings: () => read(KEYS.settings, { questionCount: 20, durationMinutes: 20 }),
  saveSettings: (settings) => write(KEYS.settings, settings),
  loadTests: () => read(KEYS.tests, []),
  saveTests: (tests) => write(KEYS.tests, tests),
  loadAIConfig: () => sanitizeConfig(read(KEYS.aiConfig, null)),
  saveAIConfig: (config) => write(KEYS.aiConfig, sanitizeConfig(config)),
  loadTutor: () => read(KEYS.tutor, []),
  saveTutor: (messages) => write(KEYS.tutor, messages),
  clearTutor: () => remove(KEYS.tutor),
  clearAll: () => Object.values(KEYS).forEach(remove),
  exportAll: () => ({
    schemaVersion: 2,
    exportedAt: new Date().toISOString(),
    bank: read(KEYS.bank, null),
    attempts: read(KEYS.attempts, []),
    tests: read(KEYS.tests, []),
    settings: read(KEYS.settings, {}),
    aiConfig: sanitizeConfig(read(KEYS.aiConfig, null)),
    tutor: read(KEYS.tutor, []),
  }),
};
