/*
 * CLOUDFLARE WORKERS AI  (api/lib/_cloudflare.js)
 *
 * One small client for the two things Cabana uses Workers AI for:
 *
 *   chat   OpenAI-compatible chat completions (a second fast lane next to
 *          Groq, with tool calling), consumed by _ai-gateway.js
 *   speak  text-to-speech (Deepgram Aura-2), consumed by the voice op
 *
 * Credentials come from the environment only:
 *   CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_AI_API_TOKEN
 * Nothing here logs a token, a prompt, or a transcript.
 */

const API = 'https://api.cloudflare.com/client/v4/accounts';

export const CF_CHAT_MODELS = [
  { id: '@cf/meta/llama-3.3-70b-instruct-fp8-fast', timeout: 9_000 },
  { id: '@cf/openai/gpt-oss-120b',                  timeout: 12_000 },
  { id: '@cf/openai/gpt-oss-20b',                   timeout: 8_000 },
];
export const CF_TTS_MODEL = '@cf/deepgram/aura-2-en';
export const CF_TTS_FALLBACK_MODEL = '@cf/deepgram/aura-1';

/* Aura-2 English speakers. "thalia" is the warm, clear, unhurried one;
   the rest are accepted so the voice can be changed without a deploy. */
export const CF_SPEAKERS = new Set([
  'amalthea', 'andromeda', 'apollo', 'arcas', 'aries', 'asteria', 'athena', 'atlas', 'aurora',
  'callista', 'cora', 'cordelia', 'delia', 'draco', 'electra', 'harmonia', 'helena', 'hera',
  'hermes', 'hyperion', 'iris', 'janus', 'juno', 'jupiter', 'luna', 'mars', 'minerva', 'neptune',
  'odysseus', 'ophelia', 'orion', 'orpheus', 'pandora', 'phoebe', 'pluto', 'saturn', 'thalia',
  'theia', 'vesta', 'zeus',
]);
export const DEFAULT_SPEAKER = 'thalia';

export function cloudflareConfigured() {
  return Boolean(cleanEnv('CLOUDFLARE_ACCOUNT_ID') && cleanEnv('CLOUDFLARE_AI_API_TOKEN'));
}

function cleanEnv(name) {
  const value = process.env[name];
  return value && String(value).trim() ? String(value).trim() : '';
}

function accountBase() {
  const id = cleanEnv('CLOUDFLARE_ACCOUNT_ID');
  /* An account id is 32 hex characters. Refusing anything else keeps a
     mistyped variable from being interpolated into a URL path. */
  if (!/^[a-f0-9]{32}$/i.test(id)) throw new Error('cloudflare_account_invalid');
  return `${API}/${id}/ai`;
}

function authHeaders(extra = {}) {
  const token = cleanEnv('CLOUDFLARE_AI_API_TOKEN');
  if (!token) throw new Error('cloudflare_not_configured');
  return { Authorization: `Bearer ${token}`, ...extra };
}

async function timedFetch(url, init, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (error) {
    if (error?.name === 'AbortError') throw new Error(`timeout_after_${timeoutMs}ms`);
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

export function cloudflareChatModels() {
  const ids = String(process.env.CLOUDFLARE_AI_MODEL || '').split(',').map(v => v.trim()).filter(Boolean);
  if (!ids.length) return CF_CHAT_MODELS;
  return [...new Set(ids)].map((id, i) => ({
    id, timeout: CF_CHAT_MODELS[Math.min(i, CF_CHAT_MODELS.length - 1)].timeout,
  }));
}

/* ── chat ─────────────────────────────────────────────────────────────
   Returns the raw OpenAI-shaped body for the first model that answers.
   Throws `cloudflare_<status>` / `cloudflare_<model>_<reason>` so the
   gateway's attempt log says exactly what happened. */
export async function cloudflareChat(body, { onFailure } = {}) {
  const base = accountBase();
  let lastError = 'cloudflare_unavailable';
  for (const model of cloudflareChatModels()) {
    try {
      const response = await timedFetch(`${base}/v1/chat/completions`, {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ ...body, model: model.id }),
      }, model.timeout);
      if (onFailure) onFailure(response.status, response.headers?.get?.('retry-after'));
      const raw = await response.text();
      let data = null;
      try { data = raw ? JSON.parse(raw) : null; } catch { /* the status is enough */ }
      if (response.ok && data?.choices?.[0]?.message) {
        return { ...data, model: data.model || model.id };
      }
      lastError = `cloudflare_${response.status}`;
      if ([401, 402, 403, 429].includes(response.status)) break;
    } catch (error) {
      lastError = `cloudflare_${model.id}_${error.message}`;
    }
  }
  throw new Error(lastError);
}

/* ── text to speech ───────────────────────────────────────────────────
   Resolves { bytes: Buffer, contentType, model }. The REST endpoint
   returns raw audio for Aura; a JSON envelope carrying base64 is also
   accepted so a platform change does not silence the assistant. */
export async function cloudflareSpeak(text, { speaker = DEFAULT_SPEAKER, timeoutMs = 8_000 } = {}) {
  const input = String(text || '').trim();
  if (!input) throw new Error('speak_empty');
  const base = accountBase();
  const voice = CF_SPEAKERS.has(speaker) ? speaker : DEFAULT_SPEAKER;
  let lastError = 'speak_unavailable';

  for (const model of [CF_TTS_MODEL, CF_TTS_FALLBACK_MODEL]) {
    try {
      /* aura-1 has its own speaker list; asking it for an Aura-2 name is
         an error, so the fallback uses its documented default. */
      const payload = model === CF_TTS_MODEL
        ? { text: input, speaker: voice, encoding: 'mp3' }
        : { text: input, encoding: 'mp3' };
      const response = await timedFetch(`${base}/run/${model}`, {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json', Accept: 'audio/mpeg' }),
        body: JSON.stringify(payload),
      }, timeoutMs);
      if (!response.ok) {
        lastError = `speak_${response.status}`;
        if ([401, 402, 403, 429].includes(response.status)) break;
        continue;
      }
      const type = String(response.headers.get('content-type') || '').toLowerCase();
      if (type.includes('json')) {
        const json = await response.json().catch(() => null);
        const b64 = json?.result?.audio || json?.audio;
        if (!b64) { lastError = 'speak_no_audio'; continue; }
        return { bytes: Buffer.from(b64, 'base64'), contentType: 'audio/mpeg', model };
      }
      const bytes = Buffer.from(await response.arrayBuffer());
      if (bytes.length < 200) { lastError = 'speak_no_audio'; continue; }
      return { bytes, contentType: type.startsWith('audio/') ? type.split(';')[0] : 'audio/mpeg', model };
    } catch (error) {
      lastError = `speak_${model}_${error.message}`;
    }
  }
  throw new Error(lastError);
}
