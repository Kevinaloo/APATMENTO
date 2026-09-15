import assert from 'node:assert/strict';
import test from 'node:test';

const sender = '11111111-1111-4111-8111-111111111111';
const host = '22222222-2222-4222-8222-222222222222';
const message = '33333333-3333-4333-8333-333333333333';
const conversation = '44444444-4444-4444-8444-444444444444';

function response() {
  return { statusCode: 200, headers: {}, setHeader(k,v){this.headers[k]=v},
    status(n){this.statusCode=n;return this}, json(v){this.data=v;return this}, end(){return this} };
}

test('a signed-in chat sender can notify only the recipient derived from the conversation', async () => {
  Object.assign(process.env, {
    SUPABASE_URL: 'https://example.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY: 'service-key',
    SUPABASE_ANON_KEY: 'anon-key',
    VAPID_PUBLIC_KEY: Buffer.alloc(65).toString('base64url'),
    VAPID_PRIVATE_KEY: Buffer.alloc(32).toString('base64url'),
  });
  const writes = [];
  const priorFetch = globalThis.fetch;
  globalThis.fetch = async (url, options = {}) => {
    const target = String(url);
    if (target.endsWith('/auth/v1/user')) return new Response(JSON.stringify({ id: sender }), { status: 200 });
    if (target.includes('/chat_messages?')) return new Response(JSON.stringify([{
      id: message, conversation_id: conversation, sender_id: sender, content: 'Is this available?',
    }]), { status: 200 });
    if (target.includes('/chat_conversations?')) return new Response(JSON.stringify([{
      id: conversation, host_id: host, guest_id: sender, listing_title: 'Garden studio',
    }]), { status: 200 });
    if (target.includes('/notifications?')) return new Response('[]', { status: 200 });
    if (target.endsWith('/rest/v1/notifications')) {
      writes.push(JSON.parse(options.body));
      return new Response(JSON.stringify(writes), { status: 201 });
    }
    if (target.includes('/push_subscriptions?') || target.includes('/profiles?')) return new Response('[]', { status: 200 });
    throw new Error('Unexpected request: ' + target);
  };
  try {
    const { default: handler } = await import('../api/push-send.js?chat-delivery-test');
    const res = response();
    await handler({ method:'POST', headers:{authorization:'Bearer user-token'}, query:{action:'chat-message'},
      body:{action:'chat-message',message_id:message} }, res);
    assert.equal(res.statusCode, 200);
    assert.equal(writes.length, 1);
    assert.equal(writes[0].user_id, host);
    assert.equal(writes[0].kind, 'message');
    assert.equal(writes[0].meta.message_id, message);
    assert.equal(writes[0].body, 'Is this available?');
  } finally { globalThis.fetch = priorFetch; }
});

