import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import handler from '../api/utilities.js';
import fs from 'node:fs';

function responseRecorder() {
  return {
    statusCode: 200,
    payload: null,
    status(code) { this.statusCode = code; return this; },
    json(value) { this.payload = value; return this; },
  };
}

async function callApi({ method = 'POST', body = {} } = {}) {
  const req = { method, body, query: { action: 'subscribe' }, url: '/api/subscribe' };
  const res = responseRecorder();
  await handler(req, res);
  return res;
}

test('newsletter API refuses to claim success when Supabase rejects the row', async (t) => {
  const oldUrl = process.env.SUPABASE_URL;
  const oldKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const oldFetch = global.fetch;
  process.env.SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'server-only-test-key';
  global.fetch = async () => new Response('{"message":"table missing"}', { status: 404 });
  t.after(() => {
    if (oldUrl === undefined) delete process.env.SUPABASE_URL; else process.env.SUPABASE_URL = oldUrl;
    if (oldKey === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY; else process.env.SUPABASE_SERVICE_ROLE_KEY = oldKey;
    global.fetch = oldFetch;
  });

  const res = await callApi({ body: { email: 'kevin@example.com', source: 'footer home' } });
  assert.equal(res.statusCode, 503);
  assert.equal(res.payload.ok, false);
  assert.equal(res.payload.error, 'subscription_not_saved');
});

test('newsletter API reports success only after the row is persisted', async (t) => {
  const oldUrl = process.env.SUPABASE_URL;
  const oldKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const oldFetch = global.fetch;
  let request;
  process.env.SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'server-only-test-key';
  global.fetch = async (url, init) => {
    request = { url, init, body: JSON.parse(init.body) };
    return new Response('[{"email":"kevin@example.com"}]', { status: 201 });
  };
  t.after(() => {
    if (oldUrl === undefined) delete process.env.SUPABASE_URL; else process.env.SUPABASE_URL = oldUrl;
    if (oldKey === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY; else process.env.SUPABASE_SERVICE_ROLE_KEY = oldKey;
    global.fetch = oldFetch;
  });

  const res = await callApi({ body: { email: 'Kevin@Example.com', source: 'Footer Home' } });
  assert.equal(res.statusCode, 200);
  assert.equal(res.payload.ok, true);
  assert.match(request.url, /on_conflict=email/);
  assert.equal(request.body.email, 'kevin@example.com');
  assert.equal(request.body.source, 'footer_home');
  assert.equal(request.body.unsubscribed_at, null);
});

test('newsletter API accepts POST only so email addresses never enter URLs', async () => {
  const res = await callApi({ method: 'GET' });
  assert.equal(res.statusCode, 405);
});

async function renderNewsletter(fetchImpl) {
  const dom = new JSDOM(`<!doctype html><form class="sf-newsletter-form">
    <div class="sf-newsletter-input-group"><input type="email" name="email" value="kevin@example.com"></div>
    <button type="submit">Subscribe</button><div class="sf-newsletter-feedback"></div>
  </form>`, { url: 'https://cabana.africa/', runScripts: 'outside-only' });
  dom.window.fetch = fetchImpl;
  dom.window.eval(fs.readFileSync(new URL('../cabana-newsletter.js', import.meta.url), 'utf8'));
  dom.window.CabanaNewsletter.init();
  dom.window.document.querySelector('form').dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
  await new Promise(resolve => setTimeout(resolve, 20));
  return dom;
}

test('newsletter UI shows an error and stores nothing after an API failure', async () => {
  const dom = await renderNewsletter(async () => ({
    ok: false,
    json: async () => ({ ok: false, message: 'We could not save your subscription.' }),
  }));
  assert.match(dom.window.document.querySelector('.sf-newsletter-feedback').textContent, /could not save/i);
  assert.equal(dom.window.localStorage.getItem('cabana_newsletter_subscribed'), null);
  assert.equal(dom.window.document.querySelector('button').disabled, false);
  dom.window.close();
});

test('newsletter UI stores the address only after a confirmed API success', async () => {
  const dom = await renderNewsletter(async () => ({
    ok: true,
    json: async () => ({ ok: true, message: "You're subscribed!" }),
  }));
  assert.match(dom.window.document.querySelector('.sf-newsletter-feedback').textContent, /subscribed/i);
  assert.equal(dom.window.localStorage.getItem('cabana_newsletter_subscribed'), 'kevin@example.com');
  dom.window.close();
});
