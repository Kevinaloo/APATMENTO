import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { JSDOM } from 'jsdom';

import fxHandler, { __test as fxTest, FX_CODES } from '../api/lib/_fx.js';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');

function res() {
  const r = { code: 0, headers: {}, body: null };
  r.setHeader = (k, v) => { r.headers[k.toLowerCase()] = v; };
  r.status = c => { r.code = c; return r; };
  r.json = b => { r.body = b; return r; };
  return r;
}

/* ── /api/utilities?action=fx ─────────────────────────────────────── */
test('fx route serves KES-based display rates and caches them at the edge', async t => {
  fxTest.reset();
  const orig = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => {
    calls++;
    return new Response(JSON.stringify({ result: 'success', time_last_update_unix: 1790985752,
      rates: { KES: 1, USD: 0.0077, EUR: 0.0068, GBP: 0.0058, NGN: 10.2, ZAR: 0.126, XXX: 5 } }), { status: 200 });
  };
  t.after(() => { globalThis.fetch = orig; fxTest.reset(); });
  const a = res();
  await fxHandler({ query: { action: 'fx' } }, a);
  assert.equal(a.code, 200);
  assert.equal(a.body.base, 'KES');
  assert.equal(a.body.rates.KES, 1);
  assert.equal(a.body.rates.USD, 0.0077);
  assert.equal(a.body.rates.XXX, undefined, 'only offered currencies pass through');
  assert.match(a.headers['cache-control'], /s-maxage=\d+/);
  const b = res();
  await fxHandler({ query: { action: 'fx' } }, b);
  assert.equal(calls, 1, 'second call answered from cache');
  assert.ok(FX_CODES.includes('NGN') && FX_CODES.includes('USD'));
});

test('fx route says it is unavailable instead of inventing rates', async t => {
  fxTest.reset();
  const orig = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error('offline'); };
  t.after(() => { globalThis.fetch = orig; fxTest.reset(); });
  const r = res();
  await fxHandler({ query: { action: 'fx' } }, r);
  assert.equal(r.code, 503);
  assert.equal(r.body.ok, false);
  assert.equal(r.headers['cache-control'], 'no-store');
});

test('utilities routes the fx action', () => {
  assert.match(read('api/utilities.js'), /if \(action === 'fx'\) \{\s*return fxHandler\(req, res\);/);
});

/* ── cabana-fx.js ─────────────────────────────────────────────────── */
function loadFX(stored) {
  const store = new Map(Object.entries(stored || {}));
  const ls = { getItem: k => store.has(k) ? store.get(k) : null, setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k) };
  const events = [];
  const window = {
    localStorage: ls, document: { getElementById: () => null, head: { appendChild() {} } },
    addEventListener() {}, removeEventListener() {}, dispatchEvent: e => events.push(e.type),
    fetch: () => new Promise(() => {}), innerWidth: 1200,
  };
  const ctx = vm.createContext({ window, localStorage: ls, fetch: window.fetch, Intl, CustomEvent: function (type, o) { this.type = type; this.detail = o && o.detail; }, setTimeout, clearTimeout, requestAnimationFrame: f => f() });
  ctx.window = window;
  vm.runInContext(read('cabana-fx.js').replace('})(window);', '})(window); this.FX = window.CabanaFX;'), ctx);
  return { FX: ctx.FX, store, events };
}

test('KES is shown exactly; other currencies are marked approximate', () => {
  const { FX } = loadFX({ cabana_currency: '"KES"' });
  assert.equal(FX.format(2500), 'KES 2,500');
  FX.set('USD');
  assert.match(FX.format(2500), /^≈ \$\d+$/);
  assert.equal(FX.format(2500, { approx: false }).startsWith('$'), true);
});

test('converted amounts round-trip back to KES for filters and requests', () => {
  const { FX } = loadFX({ cabana_currency: '"EUR"' });
  for (const kes of [1000, 2500, 37500]) {
    const back = FX.toKes(FX.toLocal(kes));
    assert.ok(Math.abs(back - kes) < 0.01, kes + ' → ' + back);
  }
});

test('the chosen currency is remembered and announced', () => {
  const { FX, store, events } = loadFX({ cabana_currency: '"KES"' });
  FX.set('NGN');
  assert.equal(FX.code(), 'NGN');
  assert.equal(store.get('cabana_currency'), '"NGN"');
  assert.ok(events.includes('cabana:currency'));
  FX.set('NOT-A-CODE');
  assert.equal(FX.code(), 'NGN');
});

test('slider steps land on round numbers in every currency', () => {
  const { FX } = loadFX();
  for (const c of FX.list()) {
    const step = FX.niceStep(250, c);
    const m = step / Math.pow(10, Math.floor(Math.log10(step)));
    assert.ok([1, 2, 5, 10].some(x => Math.abs(m - x) < 1e-9), c + ' step ' + step);
  }
});

/* ── cabana-range.js ──────────────────────────────────────────────── */
test('the two price handles can never cross', () => {
  const dom = new JSDOM('<div id="h"></div>', { runScripts: 'outside-only' });
  const { window } = dom;
  window.eval(read('cabana-range.js'));
  const changes = [];
  const r = window.CabanaRange.mount(window.document.getElementById('h'), {
    min: 0, max: 10000, step: 100, values: [2000, 6000], hist: [1, 4, 2, 0, 1],
    format: v => 'KES ' + v, onChange: (a, b) => changes.push([a, b]),
  });
  r.set(8000, 3000);
  const [lo, hi] = r.values();
  assert.ok(lo <= hi, 'low stays at or below high');
  const lowThumb = window.document.querySelector('.crg-thumb[data-h="lo"]');
  for (let i = 0; i < 200; i++) lowThumb.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
  const [lo2, hi2] = r.values();
  assert.ok(lo2 < hi2, 'keyboard cannot push low past high');
  assert.equal(lowThumb.getAttribute('role'), 'slider');
  assert.ok(lowThumb.getAttribute('aria-valuetext'));
  assert.equal(window.document.querySelectorAll('.crg-bar').length, 5, 'one bar per price bucket');
});

/* ── Smart search on the stays page ───────────────────────────────── */
function loadParser() {
  const html = read('apartments.html');
  const code = html.slice(html.indexOf('const SS_AMEN = ['), html.indexOf('async function runAISearch()'));
  const ctx = vm.createContext({
    fxCode: () => 'KES',
    window: {},
    _normLoc: v => String(v || '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim(),
    inventoryAreas: () => [{ main: 'Kilimani', secondary: 'Nairobi' }, { main: 'Syokimau', secondary: 'Nairobi' }],
  });
  vm.runInContext(code + '\nthis.parse = parseStayQuery;', ctx);
  return ctx.parse;
}

test('smart search reads place, rooms, budget, party and dates from one sentence', () => {
  const parse = loadParser();
  const p = parse('Quiet 2 bed in Kilimani under 8k this weekend for 3 people with parking');
  assert.equal(p.loc, 'kilimani');
  assert.equal(p.beds, 2);
  assert.equal(p.maxK, 8000);
  assert.equal(p.adults, 3);
  assert.equal(p.preset, 2);
  assert.deepEqual(Array.from(p.amen), ['Parking']);
});

test('smart search finds a known place without "in", and a budget range', () => {
  const parse = loadParser();
  const p = parse('studio syokimau between 2k and 3.5k for 4 nights with pets');
  assert.equal(p.loc, 'syokimau');
  assert.equal(p.studio, true);
  assert.equal(p.minK, 2000);
  assert.equal(p.maxK, 3500);
  assert.equal(p.nights, 4);
  assert.equal(p.pets, 1);
});

test('smart search no longer posts to an AI endpoint the browser cannot call', () => {
  assert.doesNotMatch(read('apartments.html'), /api\.anthropic\.com/);
});

/* ── The console's contract ───────────────────────────────────────── */
test('a press on a place suggestion keeps the box focused and the list still', () => {
  const html = read('apartments.html');
  assert.match(html, /_locPressing = true/);
  assert.match(html, /if \(_locPressing\) \{ _locPending = true; return; \}/);
  assert.match(html, /const row = _locShown\[i\] \|\| _locSuggestions\[i\];/);
});

test('typed places are resolved to a point before a search or a Match request', () => {
  const html = read('apartments.html');
  assert.match(html, /async function ensureLocation\(/);
  assert.match(html, /async function runPrimaryAction\(\)[\s\S]{0,700}await ensureLocation\(\)/);
  assert.match(html, /async function openMatchSheet\(\)[\s\S]{0,400}await ensureLocation\(\)/);
});

test('the location circle widens only to stays that fit every other filter', () => {
  const html = read('apartments.html');
  const fn = html.slice(html.indexOf('function filterStays('), html.indexOf('function sortStays('));
  assert.ok(fn.indexOf('locateStays(') > fn.indexOf('totalGuests'), 'where is applied after the party size');
  assert.ok(fn.indexOf('locateStays(') > fn.indexOf('maxPrice'), 'and after the budget');
});

test('the stays page loads the currency, range and console assets', () => {
  const html = read('apartments.html');
  assert.match(html, /<script src="\/cabana-fx\.js\?v=\d+"><\/script>/);
  assert.match(html, /<script src="\/cabana-range\.js\?v=\d+" defer><\/script>/);
  assert.match(html, /href="\/cabana-stay-search\.css\?v=\d+"/);
});

/* ── Cabana Match on the guest side ───────────────────────────────── */
test('Match reach offers named distances inside the range the database accepts', () => {
  const js = read('cabana-match.js');
  const stops = [...js.matchAll(/\{ km: (\d+), t: '([^']+)' \}/g)].map(m => +m[1]);
  assert.deepEqual(stops, [5, 10, 25, 50, 100]);
  const sql = read('supabase/migrations/20260928120000_cabana_match_v2.sql');
  assert.match(sql, /radius := greatest\(3, least\(coalesce\(cabana_private\.int_or_null\(p->>'radius_km'\), 25\), 150\)\)/);
  assert.ok(stops.every(k => k >= 3 && k <= 150));
});

test('closing a request is confirmed in the sheet and shown at once', () => {
  const js = read('cabana-match.js');
  assert.doesNotMatch(js, /Tap again to close/);
  const fn = js.slice(js.indexOf('function cancelConfirm('), js.indexOf('function engage('));
  assert.ok(fn.indexOf("G.req.status = 'closed'") < fn.indexOf("rpc('cabana_match_close'"), 'the UI closes before the server answers');
  assert.match(fn, /G\.req\.status = before\.status/, 'and reopens if the server refuses');
  assert.match(js, /if \(G\._closingId === st\.request\.id && st\.request\.status === 'live'\) st\.request\.status = 'closed';/);
});

test('the live score only plays while the sheet is open, live and visible', () => {
  const js = read('cabana-match.js');
  assert.match(js, /if \(AMB\.on \|\| !soundOn\(\) \|\| !isLive\(\) \|\| D\.visibilityState !== 'visible'\) return;/);
  assert.match(js, /if \(D\.visibilityState !== 'visible'\) ambStop\(false\);/);
  assert.match(js, /if \(s\.mode === 'live'\) stopLiveTimers\(false\);\s*ambStop\(true\);/);
});
