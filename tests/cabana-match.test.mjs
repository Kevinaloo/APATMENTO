import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

const file = path => new URL('../' + path, import.meta.url);
const read = path => readFileSync(file(path), 'utf8');

/* Match state is written only by the database functions (RLS refuses
   direct writes), so no page may try to insert or update it itself. */
test('no client writes Cabana Match tables directly', () => {
  const root = new URL('../', import.meta.url);
  const pages = readdirSync(root).filter(f => /\.(html|js)$/.test(f) && !/^admin/.test(f));
  for (const f of pages) {
    const src = read(f);
    assert.doesNotMatch(src, /from\(['"]cabana_match_(requests|responses|deliveries)['"]\)\s*\.(insert|update|upsert|delete)/, f);
    assert.doesNotMatch(src, /from\(['"]cabana_host_opt_ins['"]\)\s*\.(insert|update|upsert)/, f);
  }
});

test('the Match module calls only the RPCs the migration grants', () => {
  const js = read('cabana-match.js');
  const sql = read('supabase/migrations/20260928120000_cabana_match_v2.sql');
  const called = new Set([...js.matchAll(/rpc\('(cabana_match_\w+)'/g)].map(m => m[1]));
  assert.ok(called.size >= 10);
  for (const fn of called) assert.match(sql, new RegExp(`'public\\.${fn}\\(`), fn + ' is granted');
  assert.match(sql, /grant execute on function public\.cabana_match_preview\(jsonb\) to anon/);
});

test('every Match surface loads the module and its stylesheet', () => {
  for (const page of ['apartments.html', 'dashboard.html', 'partner-cabana.html']) {
    const html = read(page);
    assert.match(html, /<script src="\/cabana-match\.js\?v=\d+" defer><\/script>/, page);
    assert.match(html, /href="\/cabana-match\.css\?v=\d+"/, page);
  }
  const stays = read('apartments.html');
  assert.doesNotMatch(stays, /id="gs-sheet"|id="gm-live-tab"|id="gm-sent-overlay"/);
  assert.match(stays, /CabanaMatch\.configure\(/);
  assert.match(read('partner-cabana.html'), /CabanaMatch\.mountInbox\(/);
});

test('realtime match alerts are routed to the module, not a generic toast', () => {
  assert.match(read('chat.js'), /n\.kind === 'match'[\s\S]{0,120}routeMatch\(n\)/);
  const push = read('apa-push.js');
  assert.match(push, /n\.kind === 'match'/);
  assert.match(push, /hostCatchUp/);
  assert.match(read('api/push-send.js'), /nid: m\.notification_id/);
});

test('the module parses and exposes its public API', () => {
  const src = read('cabana-match.js');
  const window = { addEventListener() {}, dispatchEvent() {}, matchMedia: () => ({ matches: false }), devicePixelRatio: 1 };
  const document = { addEventListener() {}, querySelector: () => null, getElementById: () => null, createElement: () => ({ style: {} }), head: { appendChild() {} }, documentElement: {} };
  const localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
  Object.assign(window, { document, localStorage, sessionStorage: localStorage });
  const fn = new Function('window', 'document', 'localStorage', 'sessionStorage', 'navigator', 'location', 'history', 'CustomEvent',
    src.replace(/\}\)\(window\);\s*$/, '})(window); return window.CabanaMatch;'));
  const api = fn(window, document, localStorage, localStorage, {}, { pathname: '/apartments', search: '', hash: '' }, {}, function () {});
  for (const k of ['compose', 'openLive', 'restore', 'showRequest', 'mountInbox', 'onNotification', 'onPush', 'hostCatchUp', 'configure']) {
    assert.equal(typeof api[k], 'function', k);
  }
  assert.equal(api._thumb('https://x.supabase.co/storage/v1/object/public/listings/a.jpg', 100, 80),
    'https://x.supabase.co/storage/v1/render/image/public/listings/a.jpg?width=100&height=80&resize=cover&quality=72');
});
