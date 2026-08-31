const DEFAULTS = {
  gemini: {
    label: 'Google Gemini',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    model: 'gemini-2.5-flash',
  },
  anthropic: {
    label: 'Anthropic Claude',
    baseUrl: 'https://api.anthropic.com/v1/messages',
    model: 'claude-sonnet-4-6',
  },
  inception: {
    label: 'Inception Labs Mercury',
    baseUrl: 'https://api.inceptionlabs.ai/v1/chat/completions',
    model: 'mercury-2',
  },
  openai: {
    label: 'Other OpenAI-compatible',
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4.1-mini',
  },
};

export function providerDefaults(provider) {
  return { ...(DEFAULTS[provider] || DEFAULTS.openai) };
}

export function inferProvider(baseUrl='') {
  const host = (() => { try { return new URL(baseUrl).hostname; } catch { return ''; } })();
  if (host.includes('generativelanguage.googleapis.com')) return 'gemini';
  if (host.includes('anthropic.com')) return 'anthropic';
  if (host.includes('inceptionlabs.ai')) return 'inception';
  return 'openai';
}

export function validateAIConfig(config) {
  if (!['gemini', 'anthropic', 'inception', 'openai'].includes(config.provider)) throw new Error('Choose Gemini, Claude, Inception Mercury or another OpenAI-compatible provider.');
  const url = new URL(config.baseUrl);
  if (url.protocol !== 'https:' && url.hostname !== 'localhost' && url.hostname !== '127.0.0.1') throw new Error('Use an HTTPS endpoint, or localhost for a trusted local model.');
  if (!String(config.model || '').trim()) throw new Error('Enter a model name.');
  return { ...config, baseUrl: config.baseUrl.replace(/\/+$/, ''), model: config.model.trim() };
}

function modelsEndpoint(config) {
  if (config.provider === 'gemini') return `${config.baseUrl.replace(/\/+$/, '')}/models`;
  if (config.provider === 'anthropic') return config.baseUrl.replace(/\/v1\/messages$/, '/v1/models');
  return config.baseUrl.replace(/\/chat\/completions$/, '').replace(/\/+$/, '') + '/models';
}

export async function discoverModels({ config, apiKey, timeoutMs = 30000 }) {
  const safeConfig = validateAIConfig(config);
  if (!apiKey && !(safeConfig.provider === 'openai' && safeConfig.authMode === 'none')) throw new Error('Enter a key before fetching models, or use no authentication for a trusted local endpoint.');
  const headers = { Accept: 'application/json' };
  if (safeConfig.provider === 'gemini') headers['x-goog-api-key'] = apiKey;
  else if (safeConfig.provider === 'anthropic') { headers['x-api-key'] = apiKey; headers['anthropic-version'] = '2023-06-01'; headers['anthropic-dangerous-direct-browser-access'] = 'true'; }
  else if (apiKey) headers.Authorization = `Bearer ${apiKey}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(modelsEndpoint(safeConfig), { headers, signal: controller.signal });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload?.error?.message || `Model discovery failed (${response.status}). Enter a model manually if this provider does not expose /models.`);
    const raw = safeConfig.provider === 'gemini' ? payload.models : payload.data;
    const models = (Array.isArray(raw) ? raw : []).map((item) => String(item?.id || item?.name || '')).map((name) => name.replace(/^models\//, '')).filter(Boolean);
    if (!models.length) throw new Error('The provider returned no model names. Enter the model manually.');
    return [...new Set(models)].sort();
  } catch (error) {
    if (error.name === 'AbortError') throw new Error('Model discovery timed out.');
    if (error instanceof TypeError) throw new Error('The browser could not fetch models. Check the URL and the provider’s CORS policy.');
    throw error;
  } finally { clearTimeout(timeout); }
}

function bytesToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  return btoa(binary);
}

export async function fileToAttachment(file) {
  if (!file) return null;
  if (file.size > 12 * 1024 * 1024) throw new Error('Choose a file smaller than 12 MB for direct browser upload.');
  const mimeType = file.type || (file.name.endsWith('.pdf') ? 'application/pdf' : 'text/plain');
  if (mimeType.startsWith('text/') || file.name.match(/\.(md|csv|json)$/i)) {
    return { name: file.name, mimeType, text: await file.text() };
  }
  return { name: file.name, mimeType, base64: bytesToBase64(await file.arrayBuffer()) };
}

function geminiEndpoint(config) {
  return `${config.baseUrl}/models/${encodeURIComponent(config.model)}:generateContent`;
}

function openAIEndpoint(config) {
  return config.baseUrl.endsWith('/chat/completions') ? config.baseUrl : `${config.baseUrl}/chat/completions`;
}

async function requestGemini(config, apiKey, prompt, attachment, signal) {
  const parts = [{ text: prompt }];
  if (attachment?.text) parts.push({ text: `\n\nATTACHED FILE: ${attachment.name}\n${attachment.text}` });
  if (attachment?.base64) parts.push({ inlineData: { mimeType: attachment.mimeType, data: attachment.base64 } });
  const response = await fetch(geminiEndpoint(config), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify({ contents: [{ role: 'user', parts }], generationConfig: { temperature: config.temperature ?? 0.2 } }),
    signal,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.error?.message || `Gemini request failed (${response.status}).`);
  const text = payload?.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('\n').trim();
  if (!text) throw new Error('Gemini returned no text. Check the model name and safety settings.');
  return text;
}

async function requestOpenAI(config, apiKey, prompt, attachment, signal) {
  if (attachment?.base64 && attachment.mimeType === 'application/pdf') throw new Error('Direct PDF upload is not standardized for OpenAI-compatible endpoints. Use Gemini, or extract the PDF to text first.');
  let content = prompt;
  if (attachment?.text) content += `\n\nATTACHED FILE: ${attachment.name}\n${attachment.text}`;
  if (attachment?.base64 && attachment.mimeType.startsWith('image/')) content = [
    { type: 'text', text: prompt },
    { type: 'image_url', image_url: { url: `data:${attachment.mimeType};base64,${attachment.base64}` } },
  ];
  const headers = { 'Content-Type': 'application/json' };
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`;
  const response = await fetch(openAIEndpoint(config), {
    method: 'POST',
    headers,
    body: JSON.stringify({ model: config.model, messages: [{ role: 'user', content }], temperature: config.temperature ?? 0.2 }),
    signal,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.error?.message || `Model request failed (${response.status}).`);
  const text = payload?.choices?.[0]?.message?.content;
  if (typeof text !== 'string' || !text.trim()) throw new Error('The endpoint returned no compatible text response.');
  return text.trim();
}

function anthropicEndpoint(config) {
  return config.baseUrl.endsWith('/v1/messages') ? config.baseUrl : `${config.baseUrl}/v1/messages`;
}

async function requestAnthropic(config, apiKey, prompt, attachment, signal) {
  if (attachment?.base64 && attachment.mimeType === 'application/pdf') throw new Error('Direct PDF upload is not enabled for this Claude adapter. Extract the PDF to text or use Gemini for paper conversion.');
  let content = [{ type: 'text', text: prompt }];
  if (attachment?.text) content.push({ type: 'text', text: `\n\nATTACHED FILE: ${attachment.name}\n${attachment.text}` });
  if (attachment?.base64 && attachment.mimeType.startsWith('image/')) content.push({ type: 'image', source: { type: 'base64', media_type: attachment.mimeType, data: attachment.base64 } });
  const response = await fetch(anthropicEndpoint(config), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({ model: config.model, max_tokens: Number(config.maxTokens || 4096), messages: [{ role: 'user', content }] }),
    signal,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.error?.message || `Claude request failed (${response.status}).`);
  const text = Array.isArray(payload?.content) ? payload.content.map((block) => block?.text || '').join('\n').trim() : '';
  if (!text) throw new Error('Claude returned no text. Check the model name and account access.');
  return text;
}

export async function callAI({ config, apiKey, prompt, attachment = null, timeoutMs = 90000 }) {
  const safeConfig = validateAIConfig(config);
  if (!apiKey && !(safeConfig.provider === 'openai' && safeConfig.authMode === 'none')) throw new Error('Enter an API key, or choose no authentication for a trusted local OpenAI-compatible endpoint.');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    if (safeConfig.provider === 'gemini') return await requestGemini(safeConfig, apiKey, prompt, attachment, controller.signal);
    if (safeConfig.provider === 'anthropic') return await requestAnthropic(safeConfig, apiKey, prompt, attachment, controller.signal);
    return await requestOpenAI(safeConfig, apiKey, prompt, attachment, controller.signal);
  } catch (error) {
    if (error.name === 'AbortError') throw new Error('The model request timed out.');
    if (error instanceof TypeError) throw new Error('The browser could not reach the endpoint. Check the URL, internet connection and the provider’s CORS policy.');
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export function parseJSONResponse(text) {
  const cleaned = String(text).trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
  const start = Math.min(...['[', '{'].map((char) => {
    const index = cleaned.indexOf(char);
    return index < 0 ? Infinity : index;
  }));
  if (!Number.isFinite(start)) throw new Error('The model did not return JSON.');
  const candidate = cleaned.slice(start);
  try { return JSON.parse(candidate); } catch {
    const objectEnd = candidate.lastIndexOf('}');
    const arrayEnd = candidate.lastIndexOf(']');
    const end = Math.max(objectEnd, arrayEnd);
    if (end < 0) throw new Error('The model returned incomplete JSON.');
    try { return JSON.parse(candidate.slice(0, end + 1)); }
    catch { throw new Error('The model response could not be parsed as valid JSON. Ask it to return JSON only.'); }
  }
}

export function paperConversionPrompt({ defaultSubject = 'Reasoning Ability', instructions = '' } = {}) {
  return `Convert the attached examination paper into a validated mock-test question bank. Return JSON only, with this exact shape:\n{"questions":[{"id":"unique-id","type":"mcq or descriptive","subject":"subject name","section":"section name","topic":"topic","difficulty":"Prelims or Mains","passage":"shared directions/data or empty","question":"question text","options":["A","B","C","D","E"],"answer":0,"marks":1,"negativeMarks":0.25,"explanation":"answer explanation","modelAnswer":"for descriptive questions","wordLimit":0,"rubric":["criterion"]}]}\n\nRules:\n- answer is a zero-based option index for MCQs.\n- descriptive questions use an empty options array and answer null.\n- Preserve shared puzzle directions and data tables in passage.\n- Do not invent missing answer keys. Omit ambiguous questions rather than guessing.\n- Default subject when unclear: ${defaultSubject}.\n- Preserve the paper's section structure.\n${instructions}`;
}

export function generationPrompt({ subject, topic, difficulty, count, type }) {
  return `Create ${count} original ${difficulty} ${subject} questions on ${topic}. Return JSON only using this schema: {"questions":[{"id":"unique-id","type":"${type}","subject":"${subject}","section":"${subject}","topic":"${topic}","difficulty":"${difficulty}","passage":"","question":"","options":[],"answer":0,"marks":1,"negativeMarks":0.25,"explanation":"","modelAnswer":"","wordLimit":0,"rubric":[]}]}. For MCQs provide five options, a zero-based answer index, a verified explanation and exactly one correct answer. For descriptive items use no options, answer null, a model answer, word limit and a concrete rubric. Avoid copyrighted wording and repeated templates.`;
}
