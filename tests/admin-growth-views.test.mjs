/* ═══════════════════════════════════════════════════════════════════
   Console · Search engine and Intelligence views render every tab
   ─────────────────────────────────────────────────────────────────
   Boots the real console core and ops helpers in jsdom, captures the
   two growth views as they register, and renders each tab against data
   shaped like the admin RPCs and /api/growth?op=report return. Catches
   the runtime errors a syntax check cannot: a helper called with the
   wrong arguments, a field read off undefined.
   ═══════════════════════════════════════════════════════════════════ */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

const read = f => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');

const BEACON = {
  live: { stay: 6, tour: 1 }, version: { v: 12, pending: 1 },
  changes: [{ id: 1, kind: 'stay', entity_id: 'x', change: 'created', snapshot: { title: 'The Jets Nest', area: 'Obama estate' }, created_at: '2026-10-09T10:00:00Z', processed_at: '2026-10-09T10:01:00Z', result: { ok: true, urls: 2 } }],
  pings: [{ id: 1, created_at: '2026-10-09T10:01:00Z', engine: 'indexnow', reason: 'change', urls: 2, status: 202, ok: true }],
  pings_7d: { runs: 3, ok: 3, urls: 9 },
  places: [{ place: 'syokimau', service: 'stays', name: 'Syokimau', kind: 'district', count: 3, low_usd: 19, high_usd: 23 }],
  settings: { 'growth.brand.gsc': 'done' },
};
const REPORT = {
  ok: true, sitemap: 7,
  items: [
    { kind: 'stay', key: '65ef1d11', title: 'The Jets Nest', path: '/stay/the-jets-nest-obama-estate-65ef1d11', url: 'https://cabana.africa/stay/the-jets-nest-obama-estate-65ef1d11', location: 'Obama Estate, Nairobi', price: 1560, currency: 'KES', unit: 'night', updated_at: '2026-08-28T15:05:19Z',
      quality: { indexable: true, score: 72, issues: ['short description'] }, serp: { title: 'The Jets Nest, Obama Estate | Cabana', description: 'Apartment in Obama Estate…' }, badge: '<a href="#">badge</a>' },
    { kind: 'stay', key: 'aa11bb22', title: 'Garden cottage', path: '/stay/garden-cottage-obama-estate-aa11bb22', url: 'https://cabana.africa/stay/garden-cottage-obama-estate-aa11bb22', location: 'Obama Estate, Nairobi', price: 2288, currency: 'KES', unit: 'night', updated_at: '2026-09-30T10:00:00Z',
      quality: { indexable: false, score: 10, issues: ['no photos', 'short description'] }, serp: { title: 'Garden cottage | Cabana', description: '…' }, badge: '' },
  ],
};
const COMPASS = {
  totals: { profiles: 120, active: 80, active_7d: 30, members: 12, opted_out: 1, ads_consent: 5, high_intent: 4 },
  lifecycle: { new: 40, exploring: 25, considering: 10, ready: 4, customer: 1 },
  origin: { local: 50, international: 20, regional: 10 },
  countries: [{ key: 'KE', count: 50 }, { key: 'GB', count: 12 }],
  devices: [{ key: 'mobile', count: 60 }], segments: [{ id: 'stay-seekers', people: 30, ads_ready: 3 }, { id: 'host-prospects', people: 6, ads_ready: 0 }],
  services: [{ key: 'stays', count: 40 }], budget: [{ key: '20-50', count: 22 }], purpose: [{ key: 'beach-holiday', count: 9 }],
  hours: [{ h: 20, count: 30 }, { h: 9, count: 10 }],
  demand: [{ place: 'diani', service: 'stays', people: 14, signals: 30, searches: 20, views: 10, supply: 0 }, { place: 'syokimau', service: 'stays', people: 6, signals: 9, searches: 3, views: 6, supply: 3 }],
  hot: [{ id: '0f0e0d0c-0000-4000-8000-000000000001', member: false, country: 'GB', city: 'London', device: 'mobile', intent: 78, lifecycle: 'ready', segments: ['stay-seekers'], top_place: 'diani', top_service: 'stays', budget: '50-100', last_seen: '2026-10-09T09:00:00Z' }],
};
const APA = {
  episodes: 14, outcomes: { resolved: 9, escalated: 2, browsing: 3 }, topics: [{ key: 'billing', count: 4 }],
  threads: { total: 20, escalated: 3, apa_resolved: 12, csat_avg: 4.6 },
  recent: [{ n: 2, ended_at: '2026-10-09T08:00:00Z', turns: 4, topic: 'parking question', outcome: 'resolved', summary: 'Asked if the Jets Nest has parking; told no parking is listed.', member: true }],
};
const SEGMENTS = { segments: [{ id: 'stay-seekers', label: 'Looking for a stay', category: 'service', why: 'Strong interest in stays.' }, { id: 'host-prospects', label: 'Host prospects', category: 'supply', why: 'Looked at hosting pages.', internal: true }] };
const PROFILE = { profile: { id: '0f0e0d0c-0000-4000-8000-000000000001', intent: 78, lifecycle: 'ready', sessions: 4, first_seen: '2026-10-01T00:00:00Z', traits: { services: ['stays'], places: ['diani'], budget_usd: 80, party: 2, origin: 'international' }, segments: ['stay-seekers'], recent: [{ id: 'stay:x', t: 'Beach villa', path: '/stay/beach-villa-x', type: 'save', at: Date.now() }], consent: { ads: false } }, events: [{ created_at: '2026-10-09T09:00:00Z', type: 'search', service: 'stays', place: 'diani' }], episodes: [] };

function boot() {
  const dom = new JSDOM('<!doctype html><body><div id="toasts"></div><div id="view"></div></body>', { url: 'https://cabana.africa/admin', runScripts: 'outside-only' });
  const w = dom.window;
  w.matchMedia = () => ({ matches: false, addEventListener() {} });
  w.eval(read('admin-console.js'));
  w.eval(read('admin-views-ops.js'));
  const views = {};
  const register = w.CX.view;
  w.CX.view = (name, def) => { views[name] = def; return register(name, def); };
  w.CX.rpc = (fn) => Promise.resolve({ admin_beacon_overview: BEACON, admin_compass_overview: COMPASS, admin_apa_overview: APA, admin_compass_profile: PROFILE }[fn] || {});
  w.CX.api = () => Promise.resolve(REPORT);
  w.fetch = () => Promise.resolve({ ok: true, json: () => Promise.resolve(SEGMENTS) });
  w.eval(read('admin-views-growth.js'));
  return { w, views };
}

function ctx(w, q = {}) {
  const el = w.document.getElementById('view');
  el.innerHTML = '';
  return { el, q, args: [], alive: () => true, setQ() {}, refresh() {}, crumb() {} };
}

test('the search engine view renders every tab', async () => {
  const { w, views } = boot();
  assert.ok(views.search, 'search view registered');
  for (const tab of [undefined, 'fix', 'changes', 'places', 'brand']) {
    const v = ctx(w, tab ? { tab } : {});
    await views.search.render(v);
    const text = v.el.textContent;
    assert.match(text, /Search engine/);
    if (!tab) { assert.match(text, /The Jets Nest, Obama Estate \| Cabana/); assert.match(text, /held back/); }
    if (tab === 'fix') assert.match(text, /no photos/);
    if (tab === 'changes') assert.match(text, /accepted 202/i);
    if (tab === 'places') assert.match(v.el.innerHTML, /\/syokimau-apartments/);
    if (tab === 'brand') assert.match(text, /Google Business Profile/);
  }
  w.close();
});

test('the intelligence view renders every tab, and keeps internal lists off the ad table', async () => {
  const { w, views } = boot();
  assert.ok(views.intelligence, 'intelligence view registered');
  for (const tab of [undefined, 'demand', 'audiences', 'apa']) {
    const v = ctx(w, tab ? { tab } : {});
    await views.intelligence.render(v);
    const text = v.el.textContent;
    if (!tab) { assert.match(text, /Closest to booking/); assert.match(text, /London/); }
    if (tab === 'demand') { assert.match(text, /onboard here/i); assert.match(text, /Diani/); }
    if (tab === 'audiences') {
      const table = v.el.querySelector('table').textContent;
      assert.match(table, /Looking for a stay/);
      assert.doesNotMatch(table, /Host prospects/, 'onboarding leads are not an advertising audience');
      assert.match(text, /For the partner team/);
    }
    if (tab === 'apa') { assert.match(text, /no parking is listed/); assert.match(text, /4\.6 \/ 5/); }
  }
  w.close();
});
