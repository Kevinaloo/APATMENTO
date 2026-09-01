/*
 * CABANA AI GATEWAY
 *
 * One server-side contract for OpenAI, Gemini, and Groq. Providers are
 * ordered, not blended: the first healthy provider answers and the others
 * remain automatic fallbacks. Cabana's tools still validate every read and
 * write, so changing models never changes authorization or payment rules.
 */
import { createHash } from 'node:crypto';
import { GoogleGenAI, Type } from '@google/genai';

const OPENAI_API = 'https://api.openai.com/v1/responses';
const VERCEL_AI_GATEWAY_API = 'https://ai-gateway.vercel.sh/v1/responses';
const GROQ_API = 'https://api.groq.com/openai/v1/chat/completions';

const DEFAULT_GATEWAY_MODELS = [
  { id: 'google/gemini-3.5-flash-lite', timeout: 12_000 },
  { id: 'openai/gpt-5.6-luna',         timeout: 15_000 },
  { id: 'google/gemini-3.1-flash-lite', timeout: 12_000 },
];

const DEFAULT_OPENAI_MODELS = [
  { id: 'gpt-5.6-luna', timeout: 12_000 },
  { id: 'gpt-5-mini',   timeout: 12_000 },
  { id: 'gpt-5-nano',   timeout: 10_000 },
];

const DEFAULT_GEMINI_MODELS = [
  { id: 'gemini-3.5-flash-lite', timeout: 7_000 },
  { id: 'gemini-3.1-flash-lite', timeout: 6_000 },
  { id: 'gemini-2.5-flash-lite', timeout: 7_000 },
];

const DEFAULT_GROQ_MODELS = [
  { id: 'openai/gpt-oss-120b', timeout: 8_000 },
  { id: 'openai/gpt-oss-20b',  timeout: 6_000 },
];

const PROVIDERS = ['gateway', 'openai', 'gemini', 'groq'];
const DEFAULT_PROVIDER_ORDER = ['gateway', 'groq', 'gemini', 'openai'];
const REASONING_EFFORTS = new Set(['none', 'low', 'medium', 'high', 'xhigh', 'max']);
const MAX_TOOL_CALLS = 3;
const MAX_TOOL_ARGUMENT_BYTES = 12_000;

let _geminiClient = null;
let _geminiKey = null;

function clampNumber(value, fallback, min, max) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(min, Math.min(max, Math.round(n))) : fallback;
}

function configuredModels(envName, defaults) {
  const ids = String(process.env[envName] || '')
    .split(',')
    .map(value => value.trim())
    .filter(Boolean);
  if (!ids.length) return defaults;
  return [...new Set(ids)].map((id, index) => ({
    id,
    timeout: defaults[Math.min(index, defaults.length - 1)]?.timeout || 10_000,
  }));
}

function getGemini() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;
  if (!_geminiClient || _geminiKey !== key) {
    _geminiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: { headers: { 'User-Agent': 'cabana-apa' } },
    });
    _geminiKey = key;
  }
  return _geminiClient;
}

function providerIsConfigured(provider) {
  if (provider === 'gateway') return Boolean(process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN);
  if (provider === 'openai') return Boolean(process.env.OPENAI_API_KEY);
  if (provider === 'gemini') return Boolean(process.env.GEMINI_API_KEY);
  if (provider === 'groq') return Boolean(process.env.GROQ_API_KEY);
  return false;
}

function gatewayToken() {
  return process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN || '';
}

function providerOrder(value = process.env.AI_PROVIDER_ORDER) {
  const requested = Array.isArray(value) ? value : String(value || '').split(',');
  const valid = requested.map(item => String(item).trim().toLowerCase())
    .filter(item => PROVIDERS.includes(item));
  return valid.length ? [...new Set(valid)] : [...DEFAULT_PROVIDER_ORDER];
}

function privacySafeIdentifier(value) {
  const raw = String(value || '').trim();
  if (!raw) return null;
  return createHash('sha256').update(`cabana:apa:${raw}`).digest('hex');
}

function withTimeout(promise, ms) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`timeout_after_${ms}ms`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

async function fetchJson(url, init, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    const raw = await response.text();
    let data = null;
    try { data = raw ? JSON.parse(raw) : null; } catch { /* status is enough */ }
    return { response, data };
  } catch (error) {
    if (error?.name === 'AbortError') throw new Error(`timeout_after_${timeoutMs}ms`);
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

function messageText(content) {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return content == null ? '' : String(content);
  return content.map(part => {
    if (typeof part === 'string') return part;
    return part?.text || part?.content || '';
  }).filter(Boolean).join('\n');
}

function normalizeSchema(schema) {
  if (!schema || typeof schema !== 'object' || Array.isArray(schema)) {
    return { type: 'object', properties: {}, required: [], additionalProperties: false };
  }
  const out = {};
  for (const [key, value] of Object.entries(schema)) {
    if (key === 'properties' && value && typeof value === 'object') {
      out.properties = Object.fromEntries(
        Object.entries(value).map(([name, child]) => [name, normalizeSchema(child)])
      );
    } else if (key === 'items') {
      out.items = normalizeSchema(value);
    } else {
      out[key] = value;
    }
  }
  if (out.type === 'object' || out.properties) {
    out.type = out.type || 'object';
    out.properties = out.properties || {};
    out.required = Array.isArray(out.required) ? out.required : [];
    out.additionalProperties = false;
  }
  return out;
}

function schemaSupportsStrictMode(schema) {
  if (!schema || typeof schema !== 'object') return true;
  if (schema.type === 'object' || schema.properties) {
    const names = Object.keys(schema.properties || {});
    const required = new Set(schema.required || []);
    if (schema.additionalProperties !== false || names.some(name => !required.has(name))) return false;
    if (names.some(name => !schemaSupportsStrictMode(schema.properties[name]))) return false;
  }
  if (schema.type === 'array' && schema.items && !schemaSupportsStrictMode(schema.items)) return false;
  return true;
}

function toolDefinition(tool) {
  return tool?.function || tool || {};
}

function toOpenAiTools(tools) {
  if (!Array.isArray(tools) || !tools.length) return undefined;
  return tools.map(tool => {
    const fn = toolDefinition(tool);
    const parameters = normalizeSchema(fn.parameters);
    return {
      type: 'function',
      name: String(fn.name || '').slice(0, 64),
      description: String(fn.description || '').slice(0, 1024),
      parameters,
      strict: schemaSupportsStrictMode(parameters),
    };
  }).filter(tool => tool.name);
}

function sanitizeValue(value, schema, depth = 0) {
  if (depth > 6 || value == null) return value;
  const type = Array.isArray(schema?.type) ? schema.type.find(item => item !== 'null') : schema?.type;
  if ((type === 'object' || schema?.properties) && typeof value === 'object' && !Array.isArray(value)) {
    const out = {};
    for (const [key, childSchema] of Object.entries(schema?.properties || {})) {
      if (Object.prototype.hasOwnProperty.call(value, key)) {
        out[key] = sanitizeValue(value[key], childSchema, depth + 1);
      }
    }
    return out;
  }
  if (type === 'array' && Array.isArray(value)) {
    return value.slice(0, 50).map(item => sanitizeValue(item, schema?.items, depth + 1));
  }
  if (typeof value === 'string') return value.slice(0, 5000);
  return value;
}

function sanitizeToolCalls(calls, tools) {
  if (!Array.isArray(calls) || !Array.isArray(tools) || !tools.length) return null;
  const allowed = new Map(tools.map(tool => {
    const fn = toolDefinition(tool);
    return [fn.name, fn];
  }));

  const clean = [];
  for (const call of calls) {
    const name = String(call?.function?.name || '');
    const definition = allowed.get(name);
    if (!definition) continue;
    const raw = typeof call?.function?.arguments === 'string'
      ? call.function.arguments
      : JSON.stringify(call?.function?.arguments || {});
    let parsed = {};
    if (raw.length <= MAX_TOOL_ARGUMENT_BYTES) {
      try {
        const candidate = JSON.parse(raw || '{}');
        if (candidate && typeof candidate === 'object' && !Array.isArray(candidate)) parsed = candidate;
      } catch { /* malformed arguments become an empty, safely rejected call */ }
    }
    const args = sanitizeValue(parsed, normalizeSchema(definition.parameters));
    clean.push({
      id: String(call.id || `call_${Date.now()}_${clean.length}`).slice(0, 180),
      type: 'function',
      function: { name, arguments: JSON.stringify(args || {}) },
    });
    if (clean.length >= MAX_TOOL_CALLS) break;
  }
  return clean.length ? clean : null;
}

function convertMessagesToOpenAi(messages) {
  const instructions = [];
  const input = [];

  for (const message of messages || []) {
    if (message?.role === 'system') {
      const text = messageText(message.content);
      if (text) instructions.push(text);
      continue;
    }

    if (message?.role === 'assistant' && Array.isArray(message._openaiOutput)) {
      input.push(...message._openaiOutput.filter(item => item && typeof item === 'object'));
      continue;
    }

    if (message?.role === 'user' || message?.role === 'assistant') {
      const text = messageText(message.content);
      if (text) input.push({ role: message.role, content: text });
      if (message.role === 'assistant' && Array.isArray(message.tool_calls)) {
        for (const call of message.tool_calls) {
          input.push({
            type: 'function_call',
            call_id: String(call.id || ''),
            name: String(call.function?.name || ''),
            arguments: typeof call.function?.arguments === 'string'
              ? call.function.arguments
              : JSON.stringify(call.function?.arguments || {}),
          });
        }
      }
      continue;
    }

    if (message?.role === 'tool') {
      input.push({
        type: 'function_call_output',
        call_id: String(message.tool_call_id || ''),
        output: messageText(message.content),
      });
    }
  }

  return { instructions: instructions.join('\n\n'), input };
}

function openAiResponseMessage(data) {
  const text = [];
  const calls = [];
  for (const item of data?.output || []) {
    if (item?.type === 'message') {
      for (const part of item.content || []) {
        if (part?.type === 'output_text' && part.text) text.push(part.text);
        else if (part?.type === 'refusal' && part.refusal) text.push(part.refusal);
      }
    } else if (item?.type === 'function_call') {
      calls.push({
        id: item.call_id || item.id,
        type: 'function',
        function: { name: item.name, arguments: item.arguments || '{}' },
      });
    }
  }
  return {
    role: 'assistant',
    content: text.join('\n').trim(),
    tool_calls: calls.length ? calls : null,
    _openaiOutput: Array.isArray(data?.output) ? data.output : [],
  };
}

function openAiReasoningEffort(options) {
  const requested = String(options.reasoningEffort || process.env.OPENAI_REASONING_EFFORT || '').toLowerCase();
  if (REASONING_EFFORTS.has(requested)) return requested;
  return options.profile === 'fast' ? 'low' : 'medium';
}

function supportsReasoning(model) {
  return /^(?:gpt-5|o\d)/i.test(String(model || ''));
}

async function callOpenAi(messages, options = {}) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error('openai_not_configured');
  const { instructions, input } = convertMessagesToOpenAi(messages);
  const tools = toOpenAiTools(options.tools);
  const safetyIdentifier = privacySafeIdentifier(options.safetyIdentifier);
  let lastError = 'openai_unavailable';

  for (const model of configuredModels('OPENAI_MODEL', DEFAULT_OPENAI_MODELS)) {
    try {
      const body = {
        model: model.id,
        input,
        store: false,
        max_output_tokens: clampNumber(
          options.maxTokens,
          options.profile === 'fast' ? 700 : 1400,
          64,
          8000
        ),
        ...(instructions ? { instructions } : {}),
        ...(safetyIdentifier ? { safety_identifier: safetyIdentifier } : {}),
        ...(supportsReasoning(model.id) ? {
          reasoning: { effort: openAiReasoningEffort(options) },
        } : {}),
        ...(tools?.length ? {
          tools,
          tool_choice: 'auto',
          parallel_tool_calls: false,
        } : {}),
      };
      const { response, data } = await fetchJson(OPENAI_API, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify(body),
      }, model.timeout);

      if (response.ok) {
        return {
          provider: 'openai',
          model: data?.model || model.id,
          usage: data?.usage || null,
          choices: [{ message: openAiResponseMessage(data) }],
        };
      }

      lastError = `openai_${response.status}`;
      if ([401, 402, 403, 429].includes(response.status)) break;
    } catch (error) {
      lastError = `openai_${error.message}`;
    }
  }
  throw new Error(lastError);
}

async function callVercelGateway(messages, options = {}) {
  const token = gatewayToken();
  if (!token) throw new Error('gateway_not_configured');
  const models = configuredModels('AI_GATEWAY_MODEL', DEFAULT_GATEWAY_MODELS);
  const [primary, ...fallbacks] = models;
  const { instructions, input } = convertMessagesToOpenAi(messages);
  const tools = toOpenAiTools(options.tools);
  const user = privacySafeIdentifier(options.safetyIdentifier);
  const body = {
    model: primary.id,
    input,
    store: false,
    max_output_tokens: clampNumber(
      options.maxTokens,
      options.profile === 'fast' ? 700 : 1400,
      64,
      8000
    ),
    ...(instructions ? { instructions } : {}),
    ...(tools?.length ? {
      tools,
      tool_choice: 'auto',
      parallel_tool_calls: false,
    } : {}),
    providerOptions: {
      gateway: {
        ...(fallbacks.length ? { models: fallbacks.map(model => model.id) } : {}),
        ...(user ? { user } : {}),
        tags: ['app:cabana', 'feature:apa', `profile:${options.profile || 'quality'}`],
      },
    },
  };

  const { response, data } = await fetchJson(VERCEL_AI_GATEWAY_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  }, Math.max(...models.map(model => model.timeout)));

  if (!response.ok) throw new Error(`gateway_${response.status}`);
  return {
    provider: 'gateway',
    model: data?.model || primary.id,
    usage: data?.usage || null,
    choices: [{ message: openAiResponseMessage(data) }],
  };
}

function convertParameters(parameters) {
  if (!parameters) return undefined;
  const type = Array.isArray(parameters.type)
    ? parameters.type.find(item => item !== 'null')
    : parameters.type;
  const typeMap = {
    string: Type.STRING,
    number: Type.NUMBER,
    integer: Type.INTEGER,
    boolean: Type.BOOLEAN,
    object: Type.OBJECT,
    array: Type.ARRAY,
  };
  const out = {
    type: typeMap[type] || Type.OBJECT,
    description: parameters.description,
  };
  if (parameters.properties) {
    out.properties = Object.fromEntries(
      Object.entries(parameters.properties).map(([key, value]) => [key, convertParameters(value)])
    );
  }
  if (parameters.required) out.required = parameters.required;
  if (parameters.items) out.items = convertParameters(parameters.items);
  if (parameters.enum) out.enum = parameters.enum;
  return out;
}

function convertToolsToGemini(tools) {
  if (!Array.isArray(tools) || !tools.length) return undefined;
  const functionDeclarations = tools.map(tool => {
    const fn = toolDefinition(tool);
    return {
      name: fn.name,
      description: fn.description,
      parameters: fn.parameters ? convertParameters(fn.parameters) : undefined,
    };
  });
  return [{ functionDeclarations }];
}

function convertMessagesToGemini(messages) {
  let systemInstruction = '';
  const contents = [];

  for (const message of messages || []) {
    if (message.role === 'system') {
      systemInstruction += `${systemInstruction ? '\n\n' : ''}${messageText(message.content)}`;
    } else if (message.role === 'user') {
      contents.push({ role: 'user', parts: [{ text: messageText(message.content) }] });
    } else if (message.role === 'assistant') {
      if (message._geminiContent) {
        contents.push(message._geminiContent);
      } else {
        const parts = [];
        const text = messageText(message.content);
        if (text) parts.push({ text });
        for (const call of message.tool_calls || []) {
          let args = {};
          try {
            args = typeof call.function?.arguments === 'string'
              ? JSON.parse(call.function.arguments)
              : (call.function?.arguments || {});
          } catch { /* malformed arguments stay empty */ }
          parts.push({ functionCall: { name: call.function?.name, args } });
        }
        if (parts.length) contents.push({ role: 'model', parts });
      }
    } else if (message.role === 'tool') {
      let response;
      try {
        response = typeof message.content === 'string' ? JSON.parse(message.content) : message.content;
      } catch {
        response = { output: message.content };
      }
      contents.push({
        role: 'user',
        parts: [{ functionResponse: { name: message.name || 'tool', response } }],
      });
    }
  }
  return { systemInstruction, contents };
}

async function callGemini(messages, options = {}) {
  const ai = getGemini();
  if (!ai) throw new Error('gemini_not_configured');
  const { systemInstruction, contents } = convertMessagesToGemini(messages);
  const tools = convertToolsToGemini(options.tools);
  let lastError = 'gemini_unavailable';

  for (const model of configuredModels('GEMINI_MODEL', DEFAULT_GEMINI_MODELS)) {
    try {
      const response = await withTimeout(ai.models.generateContent({
        model: model.id,
        contents,
        config: {
          temperature: options.temperature ?? 0.4,
          ...(systemInstruction ? { systemInstruction } : {}),
          ...(tools ? { tools } : {}),
        },
      }), model.timeout);
      const candidate = response?.candidates?.[0];
      const functionCalls = response?.functionCalls || [];
      return {
        provider: 'gemini',
        model: model.id,
        usage: response?.usageMetadata || null,
        choices: [{
          message: {
            role: 'assistant',
            content: response?.text || '',
            tool_calls: functionCalls.length ? functionCalls.map((call, index) => ({
              id: call.id || `call_${Date.now()}_${index}`,
              type: 'function',
              function: { name: call.name, arguments: JSON.stringify(call.args || {}) },
            })) : null,
            _geminiContent: candidate?.content,
          },
        }],
      };
    } catch (error) {
      lastError = `gemini_${model.id}_${error.message}`;
      const status = Number(error?.status || error?.code);
      if ([401, 402, 403, 429].includes(status)) break;
      console.warn('[ai-gateway:gemini]', model.id, error.message);
    }
  }
  throw new Error(lastError);
}

function cleanChatMessages(messages) {
  return (messages || []).map(message => {
    const { _geminiContent, _openaiOutput, ...clean } = message;
    return clean;
  });
}

async function callGroq(messages, options = {}) {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error('groq_not_configured');
  const cleanMessages = cleanChatMessages(messages);
  let lastError = 'groq_unavailable';

  for (const model of configuredModels('GROQ_MODEL', DEFAULT_GROQ_MODELS)) {
    try {
      const { response, data } = await fetchJson(GROQ_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
        body: JSON.stringify({
          model: model.id,
          messages: cleanMessages,
          temperature: options.temperature ?? 0.4,
          max_tokens: clampNumber(options.maxTokens, 700, 64, 8000),
          ...(Array.isArray(options.tools) && options.tools.length ? {
            tools: options.tools,
            tool_choice: 'auto',
            parallel_tool_calls: false,
          } : {}),
        }),
      }, model.timeout);
      if (response.ok) {
        return { ...data, provider: 'groq', model: data?.model || model.id };
      }
      lastError = `groq_${response.status}`;
      if ([401, 402, 403, 429].includes(response.status)) break;
    } catch (error) {
      lastError = `groq_${model.id}_${error.message}`;
    }
  }
  throw new Error(lastError);
}

function safeAttemptCode(error) {
  return String(error?.message || 'provider_failed').replace(/[^a-zA-Z0-9_./:-]/g, '_').slice(0, 140);
}

function finalizeResponse(data, tools, attempts, startedAt) {
  const message = data?.choices?.[0]?.message;
  if (!message) throw new Error('provider_returned_no_message');
  message.content = messageText(message.content);
  message.tool_calls = sanitizeToolCalls(message.tool_calls, tools);
  if (Array.isArray(message._openaiOutput)) {
    const allowedCalls = new Map((message.tool_calls || []).map(call => [call.id, call]));
    message._openaiOutput = message._openaiOutput.filter(item => {
      if (item?.type !== 'function_call') return true;
      const clean = allowedCalls.get(String(item.call_id || item.id || ''));
      if (!clean) return false;
      item.call_id = clean.id;
      item.name = clean.function.name;
      item.arguments = clean.function.arguments;
      return true;
    });
  }
  return {
    ...data,
    gateway: {
      attempts,
      totalLatencyMs: Date.now() - startedAt,
    },
  };
}

/*
 * Vercel's OIDC-authenticated gateway supplies low-cost Gemini and OpenAI
 * models without personal provider keys. Direct Groq is independent of that
 * budget and remains the first fallback. Premium models remain opt-in.
 */
export async function callAi(messages, options = {}) {
  const startedAt = Date.now();
  const attempts = [];
  const order = providerOrder(options.providerOrder);
  const available = order.filter(providerIsConfigured);
  if (!available.length) throw new Error('ai_gateway_unconfigured');

  const callers = { gateway: callVercelGateway, openai: callOpenAi, gemini: callGemini, groq: callGroq };
  for (const provider of available) {
    const attemptStarted = Date.now();
    try {
      const data = await callers[provider](messages, options);
      attempts.push({
        provider,
        status: 'ok',
        model: data.model,
        latencyMs: Date.now() - attemptStarted,
      });
      return finalizeResponse(data, options.tools, attempts, startedAt);
    } catch (error) {
      const code = safeAttemptCode(error);
      attempts.push({ provider, status: 'failed', code, latencyMs: Date.now() - attemptStarted });
      console.warn(`[ai-gateway] ${provider} failed; trying fallback`, code);
    }
  }

  const error = new Error('ai_gateway_unavailable');
  error.attempts = attempts;
  throw error;
}

function parseStructuredJson(raw) {
  const text = String(raw || '').replace(/^```(?:json)?\s*|\s*```$/gi, '').trim();
  const parsed = JSON.parse(text);
  if (parsed == null || typeof parsed !== 'object') throw new Error('structured_output_not_object');
  return parsed;
}

async function structuredWithOpenAi(systemInstruction, userPrompt) {
  const data = await callOpenAi([
    { role: 'system', content: `${systemInstruction}\nReturn exactly one valid JSON object and no markdown.` },
    { role: 'user', content: userPrompt },
  ], { maxTokens: 1600, profile: 'quality' });
  return parseStructuredJson(data.choices?.[0]?.message?.content);
}

async function structuredWithGateway(systemInstruction, userPrompt) {
  const data = await callVercelGateway([
    { role: 'system', content: `${systemInstruction}\nReturn exactly one valid JSON object and no markdown.` },
    { role: 'user', content: userPrompt },
  ], { maxTokens: 1600, profile: 'quality' });
  return parseStructuredJson(data.choices?.[0]?.message?.content);
}

async function structuredWithGemini(systemInstruction, userPrompt) {
  const ai = getGemini();
  if (!ai) throw new Error('gemini_not_configured');
  let lastError = 'gemini_structured_unavailable';
  for (const model of configuredModels('GEMINI_MODEL', DEFAULT_GEMINI_MODELS)) {
    try {
      const response = await withTimeout(ai.models.generateContent({
        model: model.id,
        contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          temperature: 0.4,
        },
      }), model.timeout);
      return parseStructuredJson(response?.text);
    } catch (error) {
      lastError = `gemini_structured_${model.id}_${error.message}`;
    }
  }
  throw new Error(lastError);
}

async function structuredWithGroq(systemInstruction, userPrompt) {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error('groq_not_configured');
  let lastError = 'groq_structured_unavailable';
  for (const model of configuredModels('GROQ_MODEL', DEFAULT_GROQ_MODELS)) {
    try {
      const { response, data } = await fetchJson(GROQ_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
        body: JSON.stringify({
          model: model.id,
          messages: [
            { role: 'system', content: systemInstruction },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.4,
          max_tokens: 1600,
          response_format: { type: 'json_object' },
        }),
      }, model.timeout);
      if (response.ok) return parseStructuredJson(data?.choices?.[0]?.message?.content);
      lastError = `groq_structured_${response.status}`;
      if ([401, 402, 403, 429].includes(response.status)) break;
    } catch (error) {
      lastError = `groq_structured_${model.id}_${error.message}`;
    }
  }
  throw new Error(lastError);
}

export async function generateStructuredJson(systemInstruction, userPrompt) {
  const order = providerOrder();
  const callers = {
    gateway: structuredWithGateway,
    openai: structuredWithOpenAi,
    gemini: structuredWithGemini,
    groq: structuredWithGroq,
  };
  let attempted = false;
  for (const provider of order) {
    if (!providerIsConfigured(provider)) continue;
    attempted = true;
    try {
      return await callers[provider](systemInstruction, userPrompt);
    } catch (error) {
      console.warn(`[ai-gateway:structured] ${provider} failed`, safeAttemptCode(error));
    }
  }
  throw new Error(attempted ? 'structured_ai_unavailable' : 'ai_gateway_unconfigured');
}

export const __test = {
  providerOrder,
  privacySafeIdentifier,
  normalizeSchema,
  schemaSupportsStrictMode,
  toOpenAiTools,
  sanitizeToolCalls,
  convertMessagesToOpenAi,
  openAiResponseMessage,
  parseStructuredJson,
  defaultProviderOrder: [...DEFAULT_PROVIDER_ORDER],
  defaultModels: {
    gateway: DEFAULT_GATEWAY_MODELS.map(model => model.id),
    openai: DEFAULT_OPENAI_MODELS.map(model => model.id),
    gemini: DEFAULT_GEMINI_MODELS.map(model => model.id),
    groq: DEFAULT_GROQ_MODELS.map(model => model.id),
  },
};
