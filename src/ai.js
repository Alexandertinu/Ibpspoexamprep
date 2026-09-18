const DEFAULTS = {
  openai: { label: 'Chat Completions compatible', baseUrl: '', model: '', authMode: 'bearer', authHeader: 'Authorization', authPrefix: 'Bearer ' },
  anthropic: { label: 'Messages compatible', baseUrl: '', model: '', authMode: 'header', authHeader: 'x-api-key', authPrefix: '' },
  gemini: { label: 'Generate Content compatible', baseUrl: '', model: '', authMode: 'header', authHeader: 'x-goog-api-key', authPrefix: '' },
};

export function providerDefaults(provider) {
  return { ...(DEFAULTS[provider] || DEFAULTS.openai) };
}

export function inferProvider() {
  return 'openai';
}

function validateEndpoint(value, label) {
  let url;
  try { url = new URL(String(value || '').trim()); }
  catch { throw new Error(`Enter a valid ${label}, including https:// (or http://localhost for a trusted local model).`); }
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && local)) throw new Error(`Use an HTTPS ${label}, or HTTP on localhost for a trusted local model.`);
  if (url.username || url.password) throw new Error(`Remove the username or password from the ${label}. Use the API key field instead.`);
  if (url.hash) throw new Error(`Remove the #fragment from the ${label}; it is not sent to the API.`);
  url.pathname = url.pathname.replace(/\/+$/, '') || '/';
  return url;
}

export function validateAIConfig(config = {}, { requireModel = true } = {}) {
  if (!['openai', 'anthropic', 'gemini'].includes(config?.provider)) throw new Error('Choose the API format used by your provider.');
  const url = validateEndpoint(config.baseUrl, 'API URL');
  const model = String(config.model || '').trim();
  if (requireModel && !model) throw new Error('Enter the model ID required by your provider.');
  const defaults = providerDefaults(config.provider);
  const authMode = config.authMode === 'apiKey' ? defaults.authMode : (config.authMode || defaults.authMode);
  if (!['bearer', 'header', 'none'].includes(authMode)) throw new Error('Choose Bearer token, Custom key header, or No authentication.');
  // Bearer mode has a standard header; custom mode uses the saved name and prefix.
  const authHeader = authMode === 'bearer' ? 'Authorization' : String(config.authHeader || defaults.authHeader).trim();
  const authPrefix = authMode === 'bearer' ? 'Bearer ' : String(config.authPrefix ?? '');
  if (authMode === 'header' && !/^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/.test(authHeader)) throw new Error('Enter a valid key header name, such as x-api-key (no spaces or line breaks).');
  if (authMode === 'header' && /[^\x20-\x7e]/.test(authPrefix)) throw new Error('The key prefix must contain only plain text, without line breaks.');
  const modelsUrl = String(config.modelsUrl || '').trim() ? validateEndpoint(config.modelsUrl, 'model-list URL') : null;
  if (modelsUrl && modelsUrl.origin !== url.origin) throw new Error('The model-list URL must use the same origin (scheme, host and port) as the API URL so your API key is not sent to another site.');
  return { ...config, authMode, authHeader, authPrefix, baseUrl: url.toString(), modelsUrl: modelsUrl?.toString() || '', model };
}

// Change only the pathname: query parameters belong after the derived endpoint.
function endpointURL(config, pathFor) {
  const url = new URL(config.baseUrl);
  url.pathname = pathFor(url.pathname.replace(/\/+$/, ''));
  return url.toString();
}

function modelsEndpoint(config) {
  if (config.modelsUrl) return config.modelsUrl;
  if (config.provider === 'gemini') return endpointURL(config, (path) => `${path.replace(/\/models(?:\/[^/]+(?::generateContent)?)?$/, '')}/models`);
  if (config.provider === 'anthropic') {
    const url = new URL(anthropicEndpoint(config));
    url.pathname = url.pathname.replace(/\/messages$/, '/models');
    return url.toString();
  }
  return endpointURL(config, (path) => `${path.replace(/\/chat\/completions$/, '').replace(/\/models$/, '')}/models`);
}

function authHeaders(config, apiKey) {
  const headers = config.provider === 'anthropic' ? { 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' } : {};
  if (apiKey && config.authMode !== 'none') headers[config.authHeader] = `${config.authPrefix}${apiKey}`;
  return headers;
}

export async function discoverModels({ config, apiKey, timeoutMs = 30000 }) {
  const safeConfig = validateAIConfig(config, { requireModel: false });
  if (!apiKey && safeConfig.authMode !== 'none') throw new Error('Enter an API key before fetching models, or choose no authentication for a trusted local endpoint.');
  const headers = { Accept: 'application/json', ...authHeaders(safeConfig, apiKey) };
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(modelsEndpoint(safeConfig), { headers, redirect: 'error', signal: controller.signal });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload?.error?.message || `Model discovery failed (${response.status}). Enter a model manually if this provider does not expose /models.`);
    const raw = safeConfig.provider === 'gemini' ? payload.models : payload.data;
    const models = (Array.isArray(raw) ? raw : []).map((item) => String(item?.id || item?.name || '')).map((name) => name.replace(/^models\//, '')).filter(Boolean);
    if (!models.length) throw new Error('The provider returned no model names. Enter the model manually.');
    return [...new Set(models)].sort();
  } catch (error) {
    if (error.name === 'AbortError') throw new Error('Model discovery timed out.');
    if (error instanceof TypeError) throw new Error('The browser could not fetch models. Check the URL and internet access. The provider must allow browser requests (CORS); redirects are blocked to protect your API key. Use the final endpoint URL.');
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
  const name = String(file.name || 'attachment');
  const extension = name.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1] || '';
  const inferred = ({ pdf:'application/pdf', png:'image/png', jpg:'image/jpeg', jpeg:'image/jpeg', gif:'image/gif', webp:'image/webp', svg:'image/svg+xml', txt:'text/plain', md:'text/markdown', csv:'text/csv', json:'application/json' })[extension] || '';
  const mimeType = !file.type || file.type === 'application/octet-stream' ? inferred : file.type;
  if (!mimeType) throw new Error('The browser could not identify this file type. Use PDF, image, text, Markdown, CSV or JSON.');
  if (mimeType.startsWith('text/') || ['application/json','image/svg+xml'].includes(mimeType)) {
    return { name, mimeType, text: await file.text() };
  }
  if (mimeType !== 'application/pdf' && !mimeType.startsWith('image/')) throw new Error(`Unsupported file type: ${mimeType}.`);
  return { name, mimeType, base64: bytesToBase64(await file.arrayBuffer()) };
}

function geminiEndpoint(config) {
  return endpointURL(config, (path) => {
    if (/\/models\/[^/]+:generateContent$/.test(path)) return path;
    return `${path.replace(/\/models$/, '')}/models/${encodeURIComponent(config.model.replace(/^models\//, ''))}:generateContent`;
  });
}

function openAIEndpoint(config) {
  return endpointURL(config, (path) => path.endsWith('/chat/completions') ? path : `${path}/chat/completions`);
}

async function requestGemini(config, apiKey, prompt, attachment, signal) {
  const parts = [{ text: prompt }];
  if (attachment?.text) parts.push({ text: `\n\nATTACHED FILE: ${attachment.name}\n${attachment.text}` });
  if (attachment?.base64) parts.push({ inlineData: { mimeType: attachment.mimeType, data: attachment.base64 } });
  const response = await fetch(geminiEndpoint(config), {
    method: 'POST',
    redirect: 'error',
    headers: { 'Content-Type': 'application/json', ...authHeaders(config, apiKey) },
    body: JSON.stringify({ contents: [{ role: 'user', parts }], generationConfig: { temperature: config.temperature ?? 0.2 } }),
    signal,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.error?.message || `Generate Content request failed (${response.status}).`);
  const text = payload?.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('\n').trim();
  if (!text) throw new Error('The Generate Content endpoint returned no text. Check the model ID and platform settings.');
  return text;
}

async function requestOpenAI(config, apiKey, prompt, attachment, signal) {
  if (attachment?.base64 && attachment.mimeType === 'application/pdf') throw new Error('Direct PDF upload is not standardized for Chat Completions endpoints. Extract the PDF to text or use a compatible multimodal endpoint.');
  let content = prompt;
  if (attachment?.text) content += `\n\nATTACHED FILE: ${attachment.name}\n${attachment.text}`;
  if (attachment?.base64 && attachment.mimeType.startsWith('image/')) content = [
    { type: 'text', text: prompt },
    { type: 'image_url', image_url: { url: `data:${attachment.mimeType};base64,${attachment.base64}` } },
  ];
  const headers = { 'Content-Type': 'application/json', ...authHeaders(config, apiKey) };
  const response = await fetch(openAIEndpoint(config), {
    method: 'POST',
    redirect: 'error',
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
  return endpointURL(config, (path) => {
    if (path.endsWith('/messages')) return path;
    return `${path.endsWith('/v1') ? path : `${path}/v1`}/messages`;
  });
}

async function requestAnthropic(config, apiKey, prompt, attachment, signal) {
  if (attachment?.base64 && attachment.mimeType === 'application/pdf') throw new Error('Direct PDF upload is not enabled for the Messages adapter. Extract the PDF to text or use a compatible multimodal endpoint.');
  let content = [{ type: 'text', text: prompt }];
  if (attachment?.text) content.push({ type: 'text', text: `\n\nATTACHED FILE: ${attachment.name}\n${attachment.text}` });
  if (attachment?.base64 && attachment.mimeType.startsWith('image/')) content.push({ type: 'image', source: { type: 'base64', media_type: attachment.mimeType, data: attachment.base64 } });
  const response = await fetch(anthropicEndpoint(config), {
    method: 'POST',
    redirect: 'error',
    headers: { 'Content-Type': 'application/json', ...authHeaders(config, apiKey) },
    body: JSON.stringify({ model: config.model, max_tokens: Number(config.maxTokens || 4096), messages: [{ role: 'user', content }] }),
    signal,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.error?.message || `Messages request failed (${response.status}).`);
  const text = Array.isArray(payload?.content) ? payload.content.map((block) => block?.text || '').join('\n').trim() : '';
  if (!text) throw new Error('The Messages endpoint returned no text. Check the model ID and account access.');
  return text;
}

export async function callAI({ config, apiKey, prompt, attachment = null, timeoutMs = 90000 }) {
  const safeConfig = validateAIConfig(config);
  if (!apiKey && safeConfig.authMode !== 'none') throw new Error('Enter an API key, or choose no authentication for a trusted local endpoint.');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    if (safeConfig.provider === 'gemini') return await requestGemini(safeConfig, apiKey, prompt, attachment, controller.signal);
    if (safeConfig.provider === 'anthropic') return await requestAnthropic(safeConfig, apiKey, prompt, attachment, controller.signal);
    return await requestOpenAI(safeConfig, apiKey, prompt, attachment, controller.signal);
  } catch (error) {
    if (error.name === 'AbortError') throw new Error('The model request timed out.');
    if (error instanceof TypeError) throw new Error('The browser could not reach the endpoint. Check the URL and internet access. The provider must allow browser requests (CORS); redirects are blocked to protect your API key. Use the final endpoint URL.');
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export function parseJSONResponse(text) {
  const cleaned = String(text).trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
  const starts = [...cleaned.matchAll(/[\[{]/g)].map((match) => match.index);
  if (!starts.length) throw new Error('The model did not return JSON.');
  let sawIncomplete = false;
  for (const start of starts) {
    const opening = cleaned[start];
    const closing = opening === '{' ? '}' : ']';
    let depth = 0, inString = false, escaped = false, closed = false;
    for (let index = start; index < cleaned.length; index += 1) {
      const char = cleaned[index];
      if (inString) {
        if (escaped) escaped = false;
        else if (char === '\\') escaped = true;
        else if (char === '"') inString = false;
        continue;
      }
      if (char === '"') { inString = true; continue; }
      if (char === opening) depth += 1;
      else if (char === closing) {
        depth -= 1;
        if (depth === 0) {
          closed = true;
          try { return JSON.parse(cleaned.slice(start, index + 1)); }
          catch { break; }
        }
      }
    }
    if (!closed) sawIncomplete = true;
  }
  if (sawIncomplete) throw new Error('The model returned incomplete JSON.');
  throw new Error('The model response could not be parsed as valid JSON. Ask it to return JSON only.');
}

export function paperConversionPrompt({ defaultSubject = 'Reasoning Ability', instructions = '' } = {}) {
  return `Convert the attached examination paper into a validated mock-test question bank. Return JSON only, with this exact shape:\n{"questions":[{"id":"unique-id","type":"mcq or descriptive","subject":"subject name","section":"section name","topic":"topic","setId":"shared-set-id when needed","difficulty":"Prelims or Mains","passage":"shared directions/data or empty","table":{"role":"prompt","caption":"optional","headers":["col1","col2"],"rows":[["val1","val2"]]},"image":{"src":"https://url-or-data-uri","alt":"description","caption":"optional"},"question":"question text","options":["A","B","C","D","E"],"answer":0,"marks":1,"negativeMarks":0.25,"explanation":"answer explanation","modelAnswer":"for descriptive questions","wordLimit":0,"rubric":["criterion"]}]}\n\nRules:\n- answer is a zero-based option index for MCQs.\n- descriptive questions use an empty options array and answer null.\n- Preserve shared puzzle directions and data tables in passage.\n- Give every question from the same DI, puzzle or passage set the same setId so they stay together when shuffled. Omit setId for standalone questions.\n- Include only tables printed as part of the question. Set table.role to "prompt" and preserve its caption, headers and rows.
- Never place solved arrangements, decoded-word tables, final-answer tables or solution diagrams in passage, table or image. Keep solution material only in explanation.\n- When the paper contains a diagram or graph, include it as the "image" field if you can describe it as a URL or base64 data URI; otherwise describe the diagram in the passage field.\n- Omit "table" and "image" when not needed.\n- Do not invent missing answer keys. Omit ambiguous questions rather than guessing.\n- Default subject when unclear: ${defaultSubject}.\n- Preserve the paper's section structure.\n${instructions}`;
}

export function generationPrompt({ subject, topic, difficulty, count, type }) {
  return `Create ${count} original ${difficulty} ${subject} questions on ${topic}. Return JSON only using this schema: {"questions":[{"id":"unique-id","type":"${type}","subject":"${subject}","section":"${subject}","topic":"${topic}","setId":"shared-set-id when needed","difficulty":"${difficulty}","passage":"","table":{"role":"prompt","caption":"optional","headers":["col1","col2"],"rows":[["val1","val2"]]},"image":{"src":"url-or-data-uri","alt":"description","caption":"optional"},"question":"","options":[],"answer":0,"marks":1,"negativeMarks":0.25,"explanation":"","modelAnswer":"","wordLimit":0,"rubric":[]}]}. For MCQs provide five options, a zero-based answer index, a verified explanation and exactly one correct answer. For descriptive items use no options, answer null, a model answer, word limit and a concrete rubric. Give related DI, puzzle or passage questions the same setId and omit it for standalone questions. When a question needs a data table, include only the unsolved question data as the "table" field with role "prompt". Never expose a solved arrangement, decoded table or answer-revealing diagram outside the explanation. When a question needs a diagram, include it as the "image" field or describe it in the passage. Omit "table" and "image" when not needed. Avoid copyrighted wording and repeated templates.`;
}
