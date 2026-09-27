import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

const people = readFileSync(new URL('../cabana-people.js', import.meta.url), 'utf8');
const chrome = readFileSync(new URL('../apa-chrome.js', import.meta.url), 'utf8');
const A = '11111111-1111-4111-8111-111111111111';
const B = '22222222-2222-4222-8222-222222222222';
const account = id => ({ status: 'user', user: { id }, initial: id === A ? 'A' : 'B', name: id === A ? 'Amani' : 'Baraka' });
const guest = { status: 'guest', user: null, initial: '?' };
const response = cards => ({ ok: true, json: async () => ({ cards }) });
const engine = {
  render: spec => `<svg class="cav" data-character="${spec.a}"></svg>`,
  defaultFor: () => ({ a: 0 }), observeAll() {}
};
const waitFor = async (fn, message) => {
  for (let i = 0; i < 100; i++) {
    if (fn()) return;
    await new Promise(resolve => setTimeout(resolve, 15));
  }
  assert.fail(message);
};

function environment(t, { ready = true, state = account(A), session = true } = {}) {
  const dom = new JSDOM(`<a id="apa-avatar" data-cp-self href="/profile">?</a><span data-cp-avatar="${A}">?</span>`, {
    url: 'https://cabana.test', runScripts: 'outside-only', pretendToBeVisual: true
  });
  t.after(() => dom.window.close());
  const w = dom.window, listeners = [], requests = [];
  const cards = {
    [A]: { id: A, name: 'Amani', type: 'individual', avatar: { a: 10 } },
    [B]: { id: B, name: 'Baraka', type: 'individual', avatar: { a: 20 } }
  };
  let deferred = null;
  if (ready) w.CabanaAvatars = engine;
  const core = {
    get: () => state,
    subscribe: fn => { listeners.push(fn); },
    client: () => ({ auth: { getSession: async () => ({ data: { session: state.status === 'user' ? { access_token: state.user.id } : null } }) } })
  };
  if (session) w.ApaSession = core;
  w.fetch = async (url, options) => {
    requests.push({ url, options });
    if (deferred) { const next = deferred; deferred = null; return next; }
    const ids = new URL(url, w.location.href).searchParams.get('ids').split(',');
    return response(Object.fromEntries(ids.map(id => [id, cards[id]])));
  };
  w.eval(people);
  return {
    w, cards, requests, core,
    icon: () => w.document.querySelector('#apa-avatar'),
    character: () => w.document.querySelector('#apa-avatar svg')?.dataset.character,
    setState: next => { state = next; listeners.forEach(fn => fn(next)); },
    deferNext: () => { let release; deferred = new Promise(resolve => { release = resolve; }); return release; }
  };
}

test('saved avatars refresh across navigation slots, reused member slots and tabs', async t => {
  const e = environment(t), { w, cards } = e;
  await waitFor(() => e.character() === '10', 'saved own avatar should render');
  assert.equal(e.requests[0].options.headers.Authorization, 'Bearer ' + A);
  assert.equal(e.icon().getAttribute('href'), '/profile');

  cards[A].avatar = { a: 11 };
  w.CabanaPeople.changed(A);
  await waitFor(() => e.character() === '11', 'save should invalidate the cached card');
  const notice = JSON.parse(w.localStorage.getItem('cabana:profile-updated'));
  assert.deepEqual(Object.keys(notice).sort(), ['at', 'id', 'nonce']);
  assert.equal(notice.id, A);

  w.document.body.insertAdjacentHTML('beforeend', '<a class="tb-avatar" data-cp-self href="/profile">?</a>');
  await waitFor(() => w.document.querySelectorAll('[data-cp-self] svg').length === 2, 'dynamic partner slot should hydrate');
  cards[A].avatar = { a: 12 };
  w.dispatchEvent(new w.StorageEvent('storage', { key: 'cabana:profile-updated', newValue: JSON.stringify({ id: A, at: Date.now() }) }));
  await waitFor(() => [...w.document.querySelectorAll('[data-cp-self] svg')].every(n => n.dataset.character === '12'), 'cross-tab save should refresh both slots');

  const peer = w.document.querySelector('[data-cp-avatar]');
  peer.setAttribute('data-cp-avatar', B);
  await waitFor(() => peer.querySelector('svg')?.dataset.character === '20', 'reused member slots should track their new member');

  w.eval(chrome);
  w.ApaChrome.render(account(A));
  assert.equal(e.character(), '12', 'legacy navigation rendering must preserve the character');
});

test('late responses cannot restore an old avatar after sign-out or an account switch', async t => {
  const e = environment(t), { w } = e;
  await waitFor(() => e.character() === '10', 'initial avatar');
  const release = e.deferNext(), count = e.requests.length;
  w.CabanaPeople.changed(A);
  await waitFor(() => e.requests.length > count, 'refresh request should start');
  e.setState(guest);
  assert.equal(e.icon().textContent, '?', 'sign-out should synchronously clear the previous account');
  e.setState(account(B));
  await waitFor(() => e.character() === '20', 'new account should load its own saved character');
  release(response({ [A]: { ...e.cards[A], avatar: { a: 99 } } }));
  await new Promise(resolve => setTimeout(resolve, 60));
  assert.equal(e.character(), '20', 'old authenticated response must be discarded');
  assert.equal(e.icon().dataset.cpSelfUser, B);
  e.setState(guest);
  assert.equal(e.icon().querySelector('svg'), null);
  assert.equal(e.icon().dataset.cpSelfUser, undefined);
});

test('an older request cannot overwrite a character saved during that request', async t => {
  const e = environment(t), { w } = e;
  await waitFor(() => e.character() === '10', 'initial avatar');
  const release = e.deferNext(), count = e.requests.length;
  w.CabanaPeople.changed(A);
  await waitFor(() => e.requests.length > count, 'old refresh should be in flight');
  e.cards[A].avatar = { a: 14 };
  w.CabanaPeople.changed(A);
  await waitFor(() => e.character() === '14', 'new save should win');
  release(response({ [A]: { ...e.cards[A], avatar: { a: 10 } } }));
  await new Promise(resolve => setTimeout(resolve, 60));
  assert.equal(e.character(), '14');
  assert.equal((await w.CabanaPeople.card(A)).avatar.a, 14, 'stale response must not repopulate the cache');
});

test('a failed renderer download can recover and pending avatar HTML becomes live', async t => {
  const e = environment(t, { ready: false }), { w } = e;
  await waitFor(() => w.document.querySelector('script[src*="cabana-avatars"]'), 'renderer should load on demand');
  w.document.querySelector('script[src*="cabana-avatars"]').onerror();
  await new Promise(resolve => setTimeout(resolve, 50));
  w.document.body.insertAdjacentHTML('beforeend', '<div id="pending">' + w.CabanaPeople.avatarHTML(e.cards[B], 44) + '</div>');
  assert.ok(w.document.querySelector('#pending [data-cp-pending]'));
  w.CabanaAvatars = engine;
  w.document.querySelector('script[src*="cabana-avatars"]').onload();
  w.dispatchEvent(new w.Event('online'));
  await waitFor(() => e.character() === '10', 'retry should restore the saved own avatar');
  await waitFor(() => w.document.querySelector('#pending svg')?.dataset.character === '20', 'pre-renderer HTML should hydrate');
});

test('session initialization after the people layer still hydrates profile icons', async t => {
  const e = environment(t, { session: false });
  await new Promise(resolve => setTimeout(resolve, 30));
  assert.equal(e.icon().textContent, '?');
  e.w.ApaSession = e.core;
  await waitFor(() => e.character() === '10', 'late session core should bind');
});
