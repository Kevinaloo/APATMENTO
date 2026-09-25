/* ═══════════════════════════════════════════════════════════════════
   Ad system · contracts that must not drift
   ─────────────────────────────────────────────────────────────────
   Ads used to disappear silently when a service page was redesigned:
   the page lost the element an ad hung on, the console still said
   "live". These tests make that a failing build instead: every
   placement in the registry must find its anchor in the page's HTML,
   every page the registry lists must load the engine, and the console
   and the site must share one registry.
   ═══════════════════════════════════════════════════════════════════ */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import vm from 'node:vm';
import { JSDOM } from 'jsdom';

const read = f => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
// The registry is a browser script (the package is ESM); load it the way a page does.
const sandbox = { window: {} };
vm.runInNewContext(read('apa-ad-registry.js'), sandbox);
const REG = sandbox.window.CabanaAdRegistry;
const htmlFor = page => (page === 'index' ? 'index.html' : `${page}.html`);

test('every surface in the registry is a real page that loads the registry and the engine', () => {
  for (const s of REG.SURFACES) {
    assert.ok(existsSync(new URL(`../${htmlFor(s.page)}`, import.meta.url)), `${s.page} has no html file`);
    const h = read(htmlFor(s.page));
    assert.match(h, /src="\/apa-ad-registry\.js[^"]*"/, `${s.page} must load the placement registry`);
    assert.match(h, /src="\/showcase\.js[^"]*"/, `${s.page} must load the ad engine`);
    assert.ok(h.indexOf('apa-ad-registry.js') < h.indexOf('/showcase.js'), `${s.page}: registry before engine`);
  }
});

test('every placement finds its anchor in the page (a redesign that drops one fails here)', () => {
  for (const s of REG.SURFACES) {
    const doc = new JSDOM(read(htmlFor(s.page))).window.document;
    for (const sl of s.slots) {
      if (sl.anchor) {
        const hit = sl.anchor.some(sel => doc.querySelector(sel));
        assert.ok(hit, `${sl.id}: none of its anchors (${sl.anchor.join(', ')}) exist in ${htmlFor(s.page)}`);
      }
      if (sl.kind === 'infeed') {
        assert.ok((s.feed && s.feed.grid || []).some(sel => doc.querySelector(sel)), `${sl.id}: results grid ${s.feed && s.feed.grid} missing`);
      }
      if (sl.kind === 'managed' && sl.probe) assert.ok(doc.querySelector(sl.probe), `${sl.id}: ${sl.probe} missing`);
    }
  }
});

test('slot ids are unique, stable in shape, and every slot accepts known formats', () => {
  const seen = new Set();
  for (const s of REG.SURFACES) for (const sl of s.slots) {
    assert.match(sl.id, /^[a-z0-9-]+\.[a-z0-9-]+$/);
    assert.ok(sl.id.startsWith(s.page + '.'), `${sl.id} must start with its page`);
    assert.ok(!seen.has(sl.id), `duplicate slot ${sl.id}`); seen.add(sl.id);
    for (const f of sl.formats) assert.ok(REG.FORMATS[f], `${sl.id} accepts unknown format ${f}`);
  }
});

test('service pages carry no hand-placed ad at the top or orphaned after the page', () => {
  for (const s of REG.SURFACES.filter(x => x.service)) {
    const h = read(htmlFor(s.page));
    const first = h.indexOf('data-showcase=');
    if (first === -1) continue;
    const fixed = s.slots.filter(sl => (sl.anchor || []).some(a => /data-showcase/.test(a)));
    assert.ok(fixed.length, `${s.page} has a data-showcase element no placement owns`);
    assert.doesNotMatch(h, /data-showcase="ticker"/, `${s.page}: tickers above results were the clutter we removed`);
  }
});

test('money, identity and form pages never load ads', () => {
  for (const p of ['auth', 'checkout', 'booking-confirm', 'add-listing', 'admin']) {
    if (!existsSync(new URL(`../${p}.html`, import.meta.url))) continue;
    const h = read(`${p}.html`);
    if (p === 'admin') continue;     // the console loads the engine for previews only
    assert.doesNotMatch(h, /src="\/showcase\.js/, `${p} must not load the ad engine`);
    assert.ok(REG.never(p), `${p} must be on the never list`);
  }
  assert.ok(REG.never('admin'));
});

test('candidate selection honours status, dates, slot picks and page targets', () => {
  const sl = REG.slot('tours.end');
  const base = { id: 'a', format: 'video', status: 'live', active: true, media_url: 'https://x/v.mp4', page_targets: ['all'], slots: [] };
  assert.equal(REG.candidates([base], sl).length, 1);
  assert.equal(REG.candidates([{ ...base, status: 'paused' }], sl).length, 0);
  assert.equal(REG.candidates([{ ...base, end_date: '2000-01-01' }], sl).length, 0);
  assert.equal(REG.candidates([{ ...base, start_date: '2999-01-01' }], sl).length, 0);
  assert.equal(REG.candidates([{ ...base, slots: ['events.end'] }], sl).length, 0);
  assert.equal(REG.candidates([{ ...base, slots: ['tours.end'] }], sl).length, 1);
  assert.equal(REG.candidates([{ ...base, page_targets: ['food'] }], sl).length, 0);
  // A native card campaign can still fill an end-of-page band, marked adapted.
  const ad = REG.candidates([{ ...base, format: 'native' }], sl);
  assert.equal(ad.length, 1); assert.equal(ad[0].fit, 'adapted');
  // Posters and corner cards never leak into inline slots.
  assert.equal(REG.candidates([{ ...base, format: 'poster' }], sl).length, 0);
  assert.equal(REG.candidates([{ ...base, format: 'sticky' }], sl).length, 0);
});

test('ad links are sanitised', () => {
  assert.equal(REG.safeHref('javascript:alert(1)'), '');
  assert.equal(REG.safeHref('#'), '');
  assert.equal(REG.safeHref('tours.html'), '/tours.html');
  assert.equal(REG.safeHref('https://emirates.com'), 'https://emirates.com');
  assert.equal(REG.safeHref('//evil.com'), 'https://evil.com');
});

test('the engine keeps the service first', () => {
  const eng = read('showcase.js');
  assert.match(eng, /function foldClear/, 'first screen of service pages stays ad-free');
  assert.match(eng, /function roomFor/, 'unit budget and spacing are enforced before mounting');
  assert.match(eng, /ad_heartbeat/, 'every slot reports its state to the console');
  assert.match(eng, /CACHE_MAX/, 'the last good answer is used when the database is unreachable');
  assert.match(eng, /claimOverlay/, 'overlays share one lock');
  assert.match(eng, /var\(--cbn-corner-claim, 0px\)/);
});

test('the dashboard keeps its placements; the welcome poster decides before the splash', () => {
  const d = read('dashboard.html');
  const poster = d.indexOf('/apa-interstitial.js'), splash = d.indexOf("if (location.search.indexOf('back=1') !== -1) return;");
  assert.ok(poster > 0 && poster < splash, 'poster script must run before the brand splash');
  assert.match(d, /if \(window\.__cbpPosterClaim\) return;/);
  assert.equal((d.match(/data-showcase="window"/g) || []).length, 1, 'the dashboard window slot stays exactly where it was');
  assert.match(d, /id="hero-stage"/);
  const s = read('apa-interstitial.js');
  assert.match(s, /back=1/, 'never on back-navigation');
  assert.match(s, /total \+ 6000/, 'hard ceiling so it can never trap anyone');
});

test('the console room is wired to the same registry and to guarded RPCs', () => {
  const shell = read('admin.html'), room = read('admin-views-ads.js'), mig = read('supabase/migrations/20260926090000_ads_v2_bulletproof.sql');
  const order = ['apa-ad-registry.js', 'showcase.js', 'admin-views-ads.js'].map(f => shell.indexOf(f));
  assert.ok(order.every(i => i > 0) && order[0] < order[2] && order[1] < order[2]);
  assert.match(room, /CX\.view\('ads'/);
  assert.match(room, /REG\.candidates\(/, 'what the console shows as running is computed like the site');
  for (const fn of ['admin_ads_overview', 'admin_ads_settings_save', 'admin_ad_preview', 'admin_ads_health_clear']) {
    const body = mig.slice(mig.indexOf(`function public.${fn}(`));
    assert.match(body.slice(0, body.indexOf('$$;')), /cabana_admin\.guard\(\)/, `${fn} must be guarded`);
    assert.doesNotMatch(mig, new RegExp(`grant execute on function public\\.${fn}[^;]*to anon`));
  }
  for (const fn of ['ad_track', 'ad_heartbeat', 'ads_bundle']) assert.match(mig, new RegExp(`create or replace function public\\.${fn}\\(`));
  assert.match(mig, /new\.active := \(new\.status = 'live'\)/, 'status is the single switch');
  assert.match(mig, /new\.sub      := new\.sub_text/, 'one supporting line');
});
