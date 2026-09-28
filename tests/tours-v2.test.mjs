/* Cabana Tours v2 · static contract tests.
   The browser suite (tests/ui/tours-v2.test.js) drives the pages; these
   hold the wiring in place without a browser: the four pages and their
   scripts, the brand opt-out, the payment references, the RPCs every
   client calls actually existing in a migration, and the operator's
   private columns staying private. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';

const read = f => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
const exists = f => existsSync(new URL(`../${f}`, import.meta.url));
const PAGES = ['tours.html', 'tours-catalogue.html', 'tour-guides.html', 'tours-studio.html'];
const CLIENT = ['cabana-tours.js', 'cabana-tours-spotlight.js', 'cabana-tours-home.js', 'cabana-tour-book.js',
  'cabana-tours-catalogue.js', 'cabana-tours-guides.js', 'cabana-tours-studio.js', 'cabana-tours-admin.js',
  'cabana-list-tour.js', 'chat.js'];
const MIGRATIONS = readdirSync(new URL('../supabase/migrations/', import.meta.url))
  .filter(f => f.endsWith('.sql')).map(f => read('supabase/migrations/' + f)).join('\n');
const srcs = html => [...html.matchAll(/<script[^>]+src="\/([^"?#]+)[^"]*"/g)].map(m => m[1]);

test('the four tours pages exist and every local script they load is on disk', () => {
  for (const p of PAGES) {
    assert.ok(exists(p), p);
    for (const s of srcs(read(p))) assert.ok(exists(s), `${p} loads /${s}, which does not exist`);
  }
});

test('tours pages draw their own brand: opt-out set before pwa.js, site theme files not loaded', () => {
  for (const p of PAGES) {
    const h = read(p);
    assert.match(h, /<html lang="en" data-brand="own">/, p);
    const flag = h.indexOf("window.__APA_BRAND__ = 'cabana-tours'");
    assert.ok(flag > -1, `${p}: brand flag missing`);
    const pwa = h.indexOf('src="/pwa.js');
    assert.ok(pwa === -1 || flag < pwa, `${p}: the brand flag must come before pwa.js`);
    for (const f of ['/brand.css', '/brand.js', '/cabana-rebrand.js', '/cabana-ds.css'])
      assert.ok(!h.includes(`"${f}`), `${p} must not load ${f}`);
    assert.match(h, /cabana-tours-kit\.css/, `${p}: kit stylesheet`);
  }
});

test('home page: the kit loads before everything that uses it, sections in order', () => {
  const h = read('tours.html'), s = srcs(h);
  const at = f => s.indexOf(f);
  assert.ok(at('cabana-tours.js') > -1);
  for (const f of ['cabana-tour-book.js', 'cabana-tours-spotlight.js', 'cabana-tours-home.js'])
    assert.ok(at(f) > at('cabana-tours.js'), `${f} must load after the kit`);
  assert.ok(at('cabana-pay.js') > -1 && at('cabana-pay.js') < at('cabana-tour-book.js'), 'payments before booking');
  assert.ok(at('chat.js') > -1, 'the messenger is on the page');
  const pos = id => h.indexOf(`id="${id}"`);
  for (const id of ['ct-spotlight', 'departures', 'kinds', 'immersive', 'guides', 'ct-grid', 'featured']) assert.ok(pos(id) > -1, id);
  assert.ok(pos('ct-spotlight') < pos('departures') && pos('departures') < pos('ct-grid'));
  assert.equal((h.match(/<h1[\s>]/g) || []).length, 1, 'one h1');
});

test('header: categories plus saved and messages on every tours page', () => {
  for (const p of PAGES) {
    const h = read(p);
    for (const href of ['/tours', '/tours-catalogue', '/tour-guides']) assert.ok(h.includes(`href="${href}"`), `${p} → ${href}`);
    assert.match(h, /data-ct-saved-n/, `${p}: saved counter`);
    assert.match(h, /data-ct-inbox|data-ct-msgs|aria-label="Messages"/, `${p}: messages`);
  }
});

test('studio is private: noindex, no ad engine, on the never list', async () => {
  const h = read('tours-studio.html');
  assert.match(h, /<meta name="robots" content="noindex/);
  assert.doesNotMatch(h, /showcase\.js|apa-ad-registry/);
  const vm = await import('node:vm');
  const sandbox = { window: {} };
  vm.runInNewContext(read('apa-ad-registry.js'), sandbox);
  const REG = sandbox.window.CabanaAdRegistry;
  assert.ok(REG.never('tours-studio'));
  assert.ok(REG.surface('tours-catalogue') && REG.surface('tour-guides'), 'catalogue and guides are ad surfaces');
});

test('payments: tours and Spotlights have their own references end to end', () => {
  assert.match(read('cabana-tour-book.js'), /'TOUR-' \+ t\.id \+ '-' \+ Date\.now\(\)/);
  assert.match(read('cabana-tours-studio.js'), /tour_spotlight_create/);
  assert.match(read('api/stk-push.js'), /'SPOT-':\s*\{ table: 'tour_spotlights'/);
  const cb = read('supabase/functions/payhero-callback/index.ts');
  assert.match(cb, /\(APT\|TOUR\|EVENT\|SPOT\)/);
  assert.match(cb, /'tour_spotlights'/);
  assert.match(read('api/lib/_poll-payment.js'), /tour_spotlights/);
  assert.match(MIGRATIONS, /'SPOT-'/, 'spotlight references are minted in the database');
});

test('every RPC the tours clients call is defined by a migration', () => {
  const names = new Set();
  for (const f of CLIENT) for (const m of read(f).matchAll(/\.rpc\('([a-z_]+)'|(?:callRpc|rpc)\(\s*'([a-z_]+)'/g)) names.add(m[1] || m[2]);
  for (const m of read('chat.js').matchAll(/'(cabana_chat_[a-z_]*tour[a-z_]*)'/g)) names.add(m[1]);
  const tourish = [...names].filter(n => /tour|spotlight/.test(n));
  assert.ok(tourish.length >= 15, 'found the tours RPCs: ' + tourish.join(','));
  for (const n of tourish)
    assert.match(MIGRATIONS, new RegExp(`function public\\.${n}\\s*\\(`), `${n} is called but no migration defines it`);
});

test('the messenger knows tours: start, trip, offers and booking threads', () => {
  const c = read('chat.js');
  for (const n of ['cabana_chat_start_tour', 'cabana_chat_set_tour_trip', 'cabana_chat_send_tour_offer',
                   'cabana_chat_tour_offer_respond', 'cabana_chat_for_tour_booking'])
    assert.ok(c.includes(n), n);
  assert.match(c, /openForBooking, openTour, openForTourBooking,/, 'exported on window.CabanaChat');
});

test('operator contact details never read from the browser', () => {
  const lt = read('cabana-list-tour.js');
  assert.doesNotMatch(lt, /from\('tour_operators'\)\.select\('\*'\)/);
  assert.doesNotMatch(lt, /\.select\(\)\.then/);
  assert.match(lt, /rpc\('tour_operator_me'\)/);
  for (const f of CLIENT) assert.doesNotMatch(read(f), /tour_operators'\)\s*\.select\('\*'\)/, f);
  assert.match(read('cabana-tours-admin.js'), /rpc\('admin_tour_operators'\)/);
});

test('listing form offers weekly schedules and a departure time', () => {
  const h = read('list-your-tour.html'), js = read('cabana-list-tour.js');
  assert.match(h, /<option value="weekly">/);
  assert.equal((h.match(/name="departure_days" value="(mon|tue|wed|thu|fri|sat|sun)"/g) || []).length, 7);
  assert.match(h, /id="t-time"[^>]*type="time"/);
  assert.match(h, /id="o-persona"/);
  assert.match(js, /departure_time:/);
  assert.match(js, /departure_days:/);
  assert.match(js, /persona:/);
  assert.match(MIGRATIONS, /'fixed', 'on_request', 'daily', 'weekly'/);
});

test('sitemap lists the catalogue and guides; the studio stays out', () => {
  const s = read('sitemap-core.xml');
  assert.match(s, /<loc>https:\/\/cabana\.africa\/tours-catalogue<\/loc>/);
  assert.match(s, /<loc>https:\/\/cabana\.africa\/tour-guides<\/loc>/);
  assert.doesNotMatch(s, /tours-studio/);
});

test('Vercel Hobby cap: still twelve serverless functions or fewer', () => {
  const fns = readdirSync(new URL('../api/', import.meta.url)).filter(f => f.endsWith('.js'));
  assert.ok(fns.length <= 12, fns.join(', '));
});
