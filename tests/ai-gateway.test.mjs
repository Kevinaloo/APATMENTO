import test from 'node:test';
import assert from 'node:assert/strict';

import { callAi, generateStructuredJson, __test } from '../api/lib/_ai-gateway.js';

const AI_ENV = [
  'AI_PROVIDER_ORDER',
  'OPENAI_API_KEY',
  'OPENAI_MODEL',
  'OPENAI_REASONING_EFFORT',
  'GEMINI_API_KEY',
  'GEMINI_MODEL',
  'GROQ_API_KEY',
  'GROQ_MODEL',
];

function useAiEnv(t, values) {
  const before = Object.fromEntries(AI_ENV.map(name => [name, process.env[name]]));
  for (const name of AI_ENV) delete process.env[name];
  for (const [name, value] of Object.entries(values || {})) process.env[name] = value;
  t.after(() => {
    for (const name of AI_ENV) {
      if (before[name] === undefined) delete process.env[name];
      else process.env[name] = before[name];
    }
  });
}

function useFetch(t, implementation) {
  const before = global.fetch;
  global.fetch = implementation;
  t.after(() => { global.fetch = before; });
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

test('OpenAI Responses requests are private, bounded, and privacy identified', async (t) => {
  useAiEnv(t, {
    OPENAI_API_KEY: 'server-only-openai-key',
    OPENAI_MODEL: 'gpt-5.6',
  });
  let request;
  useFetch(t, async (url, init) => {
    request = { url, init, body: JSON.parse(init.body) };
    return jsonResponse({
      model: 'gpt-5.6-sol',
      output: [{
        type: 'message',
        role: 'assistant',
        content: [{ type: 'output_text', text: 'Here is the grounded answer.' }],
      }],
      usage: { input_tokens: 30, output_tokens: 12 },
    });
  });

  const result = await callAi([
    { role: 'system', content: 'Use Cabana facts only.' },
    { role: 'user', content: 'Help me find a stay.' },
  ], { profile: 'quality', safetyIdentifier: 'user:real-user-id' });

  assert.equal(request.url, 'https://api.openai.com/v1/responses');
  assert.equal(request.body.store, false);
  assert.equal(request.body.model, 'gpt-5.6');
  assert.equal(request.body.reasoning.effort, 'medium');
  assert.equal(request.body.max_output_tokens, 1400);
  assert.equal(request.body.instructions, 'Use Cabana facts only.');
  assert.deepEqual(request.body.input, [{ role: 'user', content: 'Help me find a stay.' }]);
  assert.match(request.body.safety_identifier, /^[a-f0-9]{64}$/);
  assert.notEqual(request.body.safety_identifier, 'user:real-user-id');
  assert.doesNotMatch(initHeader(request.init, 'Authorization'), /real-user-id/);
  assert.equal(result.provider, 'openai');
  assert.equal(result.model, 'gpt-5.6-sol');
  assert.equal(result.choices[0].message.content, 'Here is the grounded answer.');
  assert.equal(result.gateway.attempts[0].status, 'ok');
});

test('defaults stay operational without premium OpenAI or Gemini models', () => {
  assert.deepEqual(__test.providerOrder(), ['gemini', 'groq', 'openai']);
  assert.deepEqual(__test.defaultProviderOrder, ['gemini', 'groq', 'openai']);
  assert.deepEqual(__test.defaultModels.openai, ['gpt-5.6-luna', 'gpt-5-mini', 'gpt-5-nano']);
  assert.deepEqual(__test.defaultModels.gemini, [
    'gemini-3.5-flash-lite',
    'gemini-3.1-flash-lite',
    'gemini-2.5-flash-lite',
  ]);
  assert.ok(!__test.defaultModels.openai.includes('gpt-5.6'));
  assert.ok(__test.defaultModels.gemini.every(model => !model.includes('pro')));
  assert.deepEqual(__test.defaultModels.groq, ['openai/gpt-oss-120b', 'openai/gpt-oss-20b']);
});

function initHeader(init, name) {
  const headers = init?.headers || {};
  return headers[name] || headers[name.toLowerCase()] || '';
}

test('OpenAI tool schemas enable strict mode only when the schema supports it', () => {
  const converted = __test.toOpenAiTools([
    {
      type: 'function',
      function: {
        name: 'lookup_booking',
        description: 'Look up a booking.',
        parameters: {
          type: 'object',
          properties: { reference: { type: 'string' } },
          required: ['reference'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'search_stays',
        description: 'Search stays.',
        parameters: {
          type: 'object',
          properties: { area: { type: 'string' }, max_price: { type: 'number' } },
        },
      },
    },
  ]);

  assert.equal(converted[0].strict, true);
  assert.equal(converted[0].parameters.additionalProperties, false);
  assert.equal(converted[1].strict, false);
  assert.equal(converted[1].parameters.additionalProperties, false);
});

test('model tool calls are limited to allowlisted names and arguments', () => {
  const tools = [{
    type: 'function',
    function: {
      name: 'lookup_booking',
      parameters: {
        type: 'object',
        properties: { reference: { type: 'string' } },
        required: ['reference'],
      },
    },
  }];
  const clean = __test.sanitizeToolCalls([
    {
      id: 'call_allowed',
      function: {
        name: 'lookup_booking',
        arguments: JSON.stringify({ reference: 'CAB-123', admin: true, service_role_key: 'nope' }),
      },
    },
    {
      id: 'call_unknown',
      function: { name: 'run_sql', arguments: '{"query":"drop table profiles"}' },
    },
  ], tools);

  assert.equal(clean.length, 1);
  assert.equal(clean[0].function.name, 'lookup_booking');
  assert.deepEqual(JSON.parse(clean[0].function.arguments), { reference: 'CAB-123' });
});

test('OpenAI reasoning and function items survive a private tool round', () => {
  const reasoning = { type: 'reasoning', id: 'rs_1', encrypted_content: 'opaque' };
  const functionCall = {
    type: 'function_call',
    id: 'fc_1',
    call_id: 'call_1',
    name: 'lookup_booking',
    arguments: '{"reference":"CAB-123"}',
  };
  const converted = __test.convertMessagesToOpenAi([
    { role: 'system', content: 'Stay grounded.' },
    { role: 'user', content: 'Check CAB-123.' },
    { role: 'assistant', content: '', _openaiOutput: [reasoning, functionCall] },
    { role: 'tool', tool_call_id: 'call_1', content: '{"found":true}' },
  ]);

  assert.equal(converted.instructions, 'Stay grounded.');
  assert.deepEqual(converted.input[0], { role: 'user', content: 'Check CAB-123.' });
  assert.deepEqual(converted.input[1], reasoning);
  assert.deepEqual(converted.input[2], functionCall);
  assert.deepEqual(converted.input[3], {
    type: 'function_call_output',
    call_id: 'call_1',
    output: '{"found":true}',
  });
});

test('expired OpenAI billing falls back to Groq without exposing provider errors', async (t) => {
  useAiEnv(t, {
    AI_PROVIDER_ORDER: 'openai,groq',
    OPENAI_API_KEY: 'openai-test-key',
    OPENAI_MODEL: 'gpt-5.6',
    GROQ_API_KEY: 'groq-test-key',
    GROQ_MODEL: 'openai/gpt-oss-120b',
  });
  const urls = [];
  useFetch(t, async (url) => {
    urls.push(url);
    if (url.includes('api.openai.com')) {
      return jsonResponse({ error: { message: 'internal provider detail' } }, 402);
    }
    return jsonResponse({
      model: 'openai/gpt-oss-120b',
      choices: [{ message: { role: 'assistant', content: 'Groq kept APA online.' } }],
    });
  });

  const result = await callAi([{ role: 'user', content: 'Hello' }]);

  assert.deepEqual(urls, [
    'https://api.openai.com/v1/responses',
    'https://api.groq.com/openai/v1/chat/completions',
  ]);
  assert.equal(result.provider, 'groq');
  assert.equal(result.choices[0].message.content, 'Groq kept APA online.');
  assert.deepEqual(result.gateway.attempts.map(item => [item.provider, item.status]), [
    ['openai', 'failed'],
    ['groq', 'ok'],
  ]);
  assert.doesNotMatch(JSON.stringify(result.gateway), /internal provider detail/);
});

test('structured generation can use OpenAI and returns parsed JSON', async (t) => {
  useAiEnv(t, {
    OPENAI_API_KEY: 'server-only-openai-key',
    OPENAI_MODEL: 'gpt-5.6',
  });
  useFetch(t, async () => jsonResponse({
    model: 'gpt-5.6-sol',
    output: [{
      type: 'message',
      content: [{ type: 'output_text', text: '{"title":"A grounded Diani stay","score":97}' }],
    }],
  }));

  const result = await generateStructuredJson('Improve this listing.', 'A beach apartment in Diani.');
  assert.deepEqual(result, { title: 'A grounded Diani stay', score: 97 });
});
