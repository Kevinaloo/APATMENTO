/* ══════════════════════════════════════════════════════════════════════
   CABANA AI GATEWAY (_ai-gateway.js)
   Unified, ultra-resilient multi-provider AI engine for APA.
   Coexists Google Gemini (Gemini 3.6/3.5/3.1 Flash series) and Groq.
   Includes automated model cascading, function calling, structured JSON,
   and zero-config out-of-the-box operation.
══════════════════════════════════════════════════════════════════════ */
import { GoogleGenAI, Type } from '@google/genai';

const GEMINI_MODELS = [
  { id: 'gemini-3.6-flash',      timeout: 8000 },
  { id: 'gemini-3.1-flash-lite', timeout: 6000 },
  { id: 'gemini-3.5-flash',      timeout: 7000 },
];

const GROQ_API = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODELS = [
  { id: 'openai/gpt-oss-120b', timeout: 8000 },
  { id: 'qwen/qwen3.6-27b',    timeout: 7000 },
  { id: 'openai/gpt-oss-20b',  timeout: 6000 },
];

let _geminiClient = null;

function getGemini() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;
  if (!_geminiClient) {
    _geminiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
    });
  }
  return _geminiClient;
}

function withTimeout(promise, ms) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`timeout_after_${ms}ms`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

/* Convert OpenAI tool schema to Gemini function declarations */
function convertParameters(p) {
  if (!p) return undefined;
  const typeMap = {
    string: Type.STRING,
    number: Type.NUMBER,
    integer: Type.INTEGER,
    boolean: Type.BOOLEAN,
    object: Type.OBJECT,
    array: Type.ARRAY,
  };
  const out = {
    type: typeMap[p.type] || Type.OBJECT,
    description: p.description,
  };
  if (p.properties) {
    out.properties = {};
    for (const [k, v] of Object.entries(p.properties)) {
      out.properties[k] = convertParameters(v);
    }
  }
  if (p.required) out.required = p.required;
  if (p.items) out.items = convertParameters(p.items);
  return out;
}

function convertToolSchema(tools) {
  if (!tools || !Array.isArray(tools) || !tools.length) return undefined;
  const declarations = tools.map(t => {
    const fn = t.function || t;
    return {
      name: fn.name,
      description: fn.description,
      parameters: fn.parameters ? convertParameters(fn.parameters) : undefined,
    };
  });
  return [{ functionDeclarations: declarations }];
}

/* Convert OpenAI-format messages to Gemini contents + systemInstruction */
function convertMessagesToGemini(messages) {
  let systemInstruction = '';
  const contents = [];

  for (const m of messages) {
    if (m.role === 'system') {
      systemInstruction += (systemInstruction ? '\n\n' : '') + String(m.content || '');
    } else if (m.role === 'user') {
      contents.push({
        role: 'user',
        parts: [{ text: String(m.content || '') }],
      });
    } else if (m.role === 'assistant') {
      if (m._geminiContent) {
        // Preserve exact Gemini model candidate content (with thought signatures if present)
        contents.push(m._geminiContent);
      } else {
        const parts = [];
        if (m.content) parts.push({ text: String(m.content) });
        if (m.tool_calls?.length) {
          for (const tc of m.tool_calls) {
            let args = {};
            try {
              args = typeof tc.function?.arguments === 'string'
                ? JSON.parse(tc.function.arguments)
                : (tc.function?.arguments || {});
            } catch {
              args = {};
            }
            parts.push({ functionCall: { name: tc.function?.name, args } });
          }
        }
        if (parts.length) {
          contents.push({ role: 'model', parts });
        }
      }
    } else if (m.role === 'tool') {
      let respObj;
      try {
        respObj = typeof m.content === 'string' ? JSON.parse(m.content) : m.content;
      } catch {
        respObj = { output: m.content };
      }
      contents.push({
        role: 'user',
        parts: [{ functionResponse: { name: m.name || 'tool', response: respObj } }],
      });
    }
  }

  return { systemInstruction, contents };
}

/* ── Primary Gemini Invocation with Model Ladder ── */
async function callGemini(messages, { tools = null, temperature = 0.4 } = {}) {
  const ai = getGemini();
  if (!ai) throw new Error('no_gemini_key');

  const { systemInstruction, contents } = convertMessagesToGemini(messages);
  const geminiTools = convertToolSchema(tools);

  let lastErr = 'unknown_gemini';
  for (const gm of GEMINI_MODELS) {
    try {
      const config = {
        temperature,
        ...(systemInstruction ? { systemInstruction } : {}),
        ...(geminiTools ? { tools: geminiTools } : {}),
      };

      const resp = await withTimeout(ai.models.generateContent({
        model: gm.id,
        contents,
        config,
      }), gm.timeout || 8000);

      const candidate = resp?.candidates?.[0];
      const content = candidate?.content;
      const text = resp.text || '';
      const functionCalls = resp.functionCalls;

      let tool_calls = null;
      if (functionCalls && functionCalls.length > 0) {
        tool_calls = functionCalls.map((fc, idx) => ({
          id: fc.id || `call_${Date.now()}_${idx}`,
          type: 'function',
          function: {
            name: fc.name,
            arguments: JSON.stringify(fc.args || {}),
          },
        }));
      }

      // Package in standard OpenAI format for the consumer
      return {
        provider: 'gemini',
        model: gm.id,
        choices: [
          {
            message: {
              role: 'assistant',
              content: text || '',
              tool_calls,
              _geminiContent: content, // Keep for transparent multi-round preservation
            },
          },
        ],
      };
    } catch (e) {
      lastErr = `gemini:${gm.id}:${e.message}`;
      // On quota/auth/not found or temporary busy, continue to next model in ladder
      console.warn('[ai-gateway:gemini]', gm.id, e.message);
    }
  }
  throw new Error(lastErr);
}

/* ── Secondary Groq Invocation with Model Ladder ── */
async function callGroq(messages, { tools = null, temperature = 0.4, maxTokens = 700 } = {}) {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error('no_groq_key');

  // Filter out any internal properties before serializing to Groq
  const cleanMessages = messages.map(m => {
    const { _geminiContent, ...rest } = m;
    return rest;
  });

  let lastErr = 'unknown_groq';
  for (const m of GROQ_MODELS) {
    try {
      const r = await withTimeout(fetch(GROQ_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
        body: JSON.stringify({
          model: m.id,
          messages: cleanMessages,
          temperature,
          max_tokens: maxTokens,
          ...(tools ? { tools, tool_choice: 'auto' } : {}),
        }),
      }), m.timeout);

      if (r.ok) {
        const data = await r.json();
        data.provider = 'groq';
        return data;
      }
      lastErr = `groq:${m.id}:${r.status}`;
      if (r.status === 401 || r.status === 403) break;
    } catch (e) {
      lastErr = `groq:${m.id}:${e.message}`;
    }
  }
  throw new Error(lastErr);
}

/* ── Unified Dual-Provider AI Gateway Call ── */
export async function callAi(messages, options = {}) {
  const hasGemini = Boolean(process.env.GEMINI_API_KEY);
  const hasGroq   = Boolean(process.env.GROQ_API_KEY);

  let lastError = null;

  // Try Gemini first if key is available
  if (hasGemini) {
    try {
      return await callGemini(messages, options);
    } catch (e) {
      lastError = e;
      console.warn('[ai-gateway] Gemini cascade failed, attempting Groq fallback:', e.message);
    }
  }

  // Fallback to Groq if key is available
  if (hasGroq) {
    try {
      return await callGroq(messages, options);
    } catch (e) {
      lastError = e;
      console.warn('[ai-gateway] Groq cascade failed:', e.message);
    }
  }

  // If neither or all failed
  throw lastError || new Error('No AI provider credentials configured (need GEMINI_API_KEY or GROQ_API_KEY)');
}

/* ── Structured JSON Generation Helper for Listings & Imports ── */
export async function generateStructuredJson(systemInstruction, userPrompt) {
  const ai = getGemini();
  if (ai) {
    for (const gm of GEMINI_MODELS) {
      try {
        const resp = await withTimeout(ai.models.generateContent({
          model: gm.id,
          contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
          config: {
            systemInstruction,
            responseMimeType: 'application/json',
            temperature: 0.4,
          },
        }), gm.timeout || 8000);
        const text = resp.text || '';
        return JSON.parse(text.replace(/^```json\s*|\s*```$/gi, '').trim());
      } catch (e) {
        console.warn('[ai-gateway:json:gemini]', gm.id, e.message);
      }
    }
  }

  const groqKey = process.env.GROQ_API_KEY;
  if (groqKey) {
    for (const m of GROQ_MODELS) {
      try {
        const r = await withTimeout(fetch(GROQ_API, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${groqKey}` },
          body: JSON.stringify({
            model: m.id,
            messages: [
              { role: 'system', content: systemInstruction },
              { role: 'user', content: userPrompt },
            ],
            temperature: 0.4,
            max_tokens: 1200,
            response_format: { type: 'json_object' },
          }),
        }), m.timeout);
        if (r.ok) {
          const d = await r.json();
          const raw = d.choices?.[0]?.message?.content || '{}';
          return JSON.parse(raw.replace(/^```json\s*|\s*```$/gi, '').trim());
        }
      } catch (e) {
        console.warn('[ai-gateway:json:groq]', m.id, e.message);
      }
    }
  }

  throw new Error('Structured AI generation currently unavailable across all providers.');
}
