/* ══════════════════════════════════════════════════════════════════════
   CAR HIRE · terrain reasoning and the route object contract
   tests/carhire-terrain.test.mjs

   Two systems meet here and both must hold under the same tests:

     cabana-carhire-core.js   grade() and quote() — previously took only
                              a route KEY looked up in a fixed reference
                              table.
     api/lib/_carhire-terrain.js
                              derives a route PROFILE between exact
                              pickup and destination points anywhere in
                              Africa, with an honest geometry fallback
                              when model enrichment is unavailable.

   The risk being guarded against is not "does the model call work". It is:
   does an AI-derived route grade a vehicle with the SAME rigour as a
   surveyed one, does a wrong or missing answer ever get treated as
   ground truth, and does the object shape stay wire-compatible with
   the grading engine that has to consume whichever kind of route it is
   handed.

   Also pinned here: a bug this feature-work surfaced. quote() read
   opts.routeKey, but every real call site passes opts.route — so the
   chauffeur upcountry rate has never actually applied; every hire
   silently priced at the metro rate regardless of the route chosen.
   Fixed in the same change as this file, and pinned here so it cannot
   regress back to "silently wrong" without a red test.
   ══════════════════════════════════════════════════════════════════════ */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { JSDOM } from 'jsdom';

const ROOT = new URL('..', import.meta.url).pathname;
const read = (f) => readFileSync(join(ROOT, f), 'utf8');
const CORE_SRC = read('cabana-carhire-core.js');

function boot() {
  const dom = new JSDOM('<!doctype html><body></body>', {
    url: 'https://cabana.africa/carhire',
    runScripts: 'outside-only'
  });
  dom.window.eval(CORE_SRC);
  return dom.window.CabanaCarHire;
}

/* An AI-derived route, in exactly the shape api/lib/_carhire-terrain.js
   returns — a Masai Mara-grade corridor, reasoned rather than surveyed. */
const DERIVED_MARA_LIKE = {
  key: 'derived_1500_35200', label: 'Somewhere off-grid near the Mara',
  km: 285, clearance_mm: 180, drive: 'awd', range_km: 260,
  surface: 'Murram, then black cotton soil', wet_penalty: 3,
  note: 'Reasoned route', confidence: 'medium', basis: 'ai_reasoning',
  sources: ['known national park road conditions'],
};

const SALOON = { clearance_mm: 130, drive: '2wd', tank_litres: 45, consumption_kmpl: 13 };
const LAND_CRUISER = {
  clearance_mm: 210, drive: '4wd', tank_litres: 80, consumption_kmpl: 9,
  make: 'Toyota', model: 'Land Cruiser', day_rate: 12000, deposit: 20000,
  peak_uplift: 2000, chauffeur_metro: 2500, chauffeur_upcountry: 5000,
  fuel_policy: 'full_to_full',
};

const LONG_RAINS = new Date('2026-04-15');

/* ── grade() accepts a route object, not only a known key ──────────── */

test('grade() takes an AI-derived route object and applies the same rigour as a known key', () => {
  const E = boot();
  const known = E.grade(SALOON, 'mara', LONG_RAINS);
  const derived = E.grade(SALOON, DERIVED_MARA_LIKE, LONG_RAINS);

  assert.equal(known.verdict, 'blocked', 'a 2wd saloon must be blocked on the real Mara route');
  assert.equal(derived.verdict, 'blocked', 'the same vehicle must be blocked on an equivalent derived route');
  assert.ok(derived.blockers.some(b => /four-wheel drive/i.test(b)), 'blocker must name the drivetrain shortfall');
  assert.ok(derived.blockers.some(b => /clearance/i.test(b)), 'blocker must name the clearance shortfall');
});

test('grade() clears a vehicle that genuinely meets a derived route\'s demands', () => {
  const E = boot();
  const g = E.grade(LAND_CRUISER, DERIVED_MARA_LIKE, LONG_RAINS);
  assert.equal(g.verdict, 'cleared');
  assert.equal(g.score, 100);
});

test('grade() still fails closed on an unknown string key — an AI object is opt-in, never inferred', () => {
  const E = boot();
  const g = E.grade(SALOON, 'not-a-real-key', LONG_RAINS);
  assert.equal(g.verdict, 'blocked');
  assert.equal(g.score, 0);
  assert.equal(g.route, null);
});

test('grade() rejects a vehicle with no verified clearance figure, on a derived route exactly as on a known one', () => {
  const E = boot();
  const noSpec = { drive: '4wd' }; // clearance_mm missing
  const g = E.grade(noSpec, DERIVED_MARA_LIKE, LONG_RAINS);
  assert.equal(g.verdict, 'blocked');
  assert.match(g.blockers[0], /no verified ground-clearance/i);
});

test('country catalogue contains all 54 African sovereign states with local currencies', () => {
  const E = boot();
  assert.equal(E.AFRICA_COUNTRIES.length, 54);
  assert.equal(E.COUNTRY_BY_CODE.GH.currency, 'GHS');
  assert.equal(E.COUNTRY_BY_CODE.ZA.currency, 'ZAR');
  assert.equal(E.COUNTRY_BY_CODE.MA.currency, 'MAD');
});

test('efficiency() exposes every requested unit without confusing US and UK gallons', () => {
  const E = boot();
  const fuel = E.efficiency({ tank_litres: 50, consumption_kmpl: 10 }, { km: 200, fuel_multiplier: 1.1 });
  assert.equal(fuel.kmpl, 10);
  assert.equal(fuel.litresPer100Km, 10);
  assert.equal(fuel.litresPerKm, 0.1);
  assert.equal(fuel.mpgUS, 23.5);
  assert.equal(fuel.mpgUK, 28.2);
  assert.equal(fuel.litresOneWay, 22);
  assert.equal(fuel.litresReturn, 44);
});

/* ── quote(): the routing-name bug ──────────────────────────────────
   opts.route is what every real caller passes (see cabana-carhire-ui.js:
   `route:S.route`); opts.routeKey is what quote() used to read. The two
   never matched, so the route argument was silently ignored and every
   quote priced against ROUTE_BY_KEY.metro — the chauffeur upcountry
   uplift could never fire, on any route, ever. ────────────────────── */

test('quote() applies the upcountry chauffeur rate for a non-metro route passed as `route`', () => {
  const E = boot();
  const q = E.quote({
    vehicle: LAND_CRUISER, days: 3, chauffeur: true, insurance: 'basic',
    route: 'mara', extras: [],
  });
  const line = q.lines.find(l => l.key === 'chauffeur');
  assert.ok(line, 'chauffeur line must be present when chauffeur: true');
  assert.match(line.detail, /5,000\/day upcountry/, 'must charge the upcountry rate, not the metro rate');
});

test('quote() applies the metro chauffeur rate for the metro route, both as a key and via `route`', () => {
  const E = boot();
  const viaRoute = E.quote({ vehicle: LAND_CRUISER, days: 3, chauffeur: true, insurance: 'basic', route: 'metro', extras: [] });
  const line = viaRoute.lines.find(l => l.key === 'chauffeur');
  assert.match(line.detail, /2,500\/day/, 'metro route must charge the metro rate');
});

test('quote() accepts an AI-derived route object directly, pricing it as upcountry', () => {
  const E = boot();
  const q = E.quote({
    vehicle: LAND_CRUISER, days: 3, chauffeur: true, insurance: 'basic',
    route: DERIVED_MARA_LIKE, extras: [],
  });
  const line = q.lines.find(l => l.key === 'chauffeur');
  assert.match(line.detail, /5,000\/day upcountry/, 'a derived route (key starts with "derived_") must not be treated as metro');
});

test('quote() back-compat: the old opts.routeKey parameter name still works for any other caller', () => {
  const E = boot();
  const viaRoute = E.quote({ vehicle: LAND_CRUISER, days: 3, chauffeur: true, insurance: 'basic', route: 'metro', extras: [] });
  const viaRouteKey = E.quote({ vehicle: LAND_CRUISER, days: 3, chauffeur: true, insurance: 'basic', routeKey: 'metro', extras: [] });
  assert.equal(viaRouteKey.total, viaRoute.total, 'routeKey must resolve identically to route for the same value');
});

test('quote() with no route at all still defaults to metro rather than throwing', () => {
  const E = boot();
  const q = E.quote({ vehicle: LAND_CRUISER, days: 1, chauffeur: true, insurance: 'basic', extras: [] });
  const line = q.lines.find(l => l.key === 'chauffeur');
  assert.match(line.detail, /2,500\/day/);
});

/* ── api/lib/_carhire-terrain.js — validation and fail-closed fallback ──
   Exercised directly against the module's exported __test surface
   rather than over HTTP, and separately against the real handler with
   a fake req/res so the fallback path (no AI keys configured, exactly
   this repo's default state) is proven rather than assumed. ───────── */

test('terrain: a plausible AI response is accepted with its stated confidence', async () => {
  const { coerceProfile } = await import('../api/lib/_carhire-terrain.js').then(m => m.__test);
  const p = coerceProfile({
    label: 'Test Route', km: 200, clearance_mm: 180, drive: 'awd',
    range_km: 250, surface: 'Murram track', wet_penalty: 2,
    note: 'Watch for mud.', confidence: 'medium', sources: ['test'],
  }, 'fallback label');
  assert.equal(p.drive, 'awd');
  assert.equal(p.confidence, 'medium');
  assert.equal(p.basis, 'ai_reasoning');
});

test('terrain: an invalid drivetrain value is rejected, not coerced to a guess', async () => {
  const { coerceProfile } = await import('../api/lib/_carhire-terrain.js').then(m => m.__test);
  assert.throws(
    () => coerceProfile({ km: 100, clearance_mm: 150, drive: 'rocket', range_km: 100, wet_penalty: 1 }, 'x'),
    /invalid_drive/
  );
});

test('terrain: an implausible clearance figure is rejected outright', async () => {
  const { coerceProfile } = await import('../api/lib/_carhire-terrain.js').then(m => m.__test);
  assert.throws(
    () => coerceProfile({ km: 100, clearance_mm: 9999, drive: '2wd', range_km: 100, wet_penalty: 1 }, 'x'),
    /clearance_out_of_range/
  );
});

test('terrain: an empty or malformed AI response is rejected, never silently defaulted', async () => {
  const { coerceProfile } = await import('../api/lib/_carhire-terrain.js').then(m => m.__test);
  assert.throws(() => coerceProfile({}, 'x'));
  assert.throws(() => coerceProfile(null, 'x'), /empty_response/);
});

test('terrain: nearestKnown() resolves a coordinate to the closest Cabana reference corridor', async () => {
  const { nearestKnown } = await import('../api/lib/_carhire-terrain.js').then(m => m.__test);
  const near = nearestKnown(-1.5, 35.2); // a point genuinely close to the Mara anchor
  assert.equal(near.route.key, 'mara');
  assert.ok(near.distanceKm < 40, 'must be within the known-route radius used by the client tier check');
});

test('terrain: a legacy fallback near a reference is honestly labelled low-confidence', async () => {
  const { fallbackProfile } = await import('../api/lib/_carhire-terrain.js').then(m => m.__test);
  const fb = fallbackProfile(-1.5, 35.2, 'Somewhere off-grid');
  assert.equal(fb.basis, 'nearby_reference_corridor');
  assert.equal(fb.confidence, 'low');
  assert.match(fb.note, /nearby .* reference/i);
});

test('terrain: an Africa-wide fallback never borrows an unrelated Kenyan corridor', async () => {
  const { estimateProfile } = await import('../api/lib/_carhire-terrain.js').then(m => m.__test);
  const profile = estimateProfile({
    from:{ lat:5.6037, lng:-0.1870 }, to:{ lat:6.6885, lng:-1.6244 },
    fromLabel:'Accra', toLabel:'Kumasi', fromCountry:'GH', toCountry:'GH', month:8,
  });
  assert.equal(profile.basis, 'geometry_estimate');
  assert.match(profile.label, /Accra.*Kumasi/);
  assert.ok(profile.km > profile.direct_km);
  assert.ok(!/Nairobi|Mara|Kenya/i.test(profile.note + profile.surface));
});

test('terrain: cross-border estimates surface document requirements', async () => {
  const { estimateProfile } = await import('../api/lib/_carhire-terrain.js').then(m => m.__test);
  const profile = estimateProfile({
    from:{ lat:-1.9441, lng:30.0619 }, to:{ lat:-1.2921, lng:36.8219 },
    fromLabel:'Kigali', toLabel:'Nairobi', fromCountry:'RW', toCountry:'KE', month:7,
  });
  assert.equal(profile.border_crossings.length, 1);
  assert.ok(profile.hazards.some(item => /cross-border permission/i.test(item)));
});

test('terrain HTTP: rejects requests with no coordinates', async () => {
  const mod = await import('../api/lib/_carhire-terrain.js');
  const res = fakeRes();
  await mod.default({ method: 'GET', query: {} }, res);
  assert.equal(res.code, 400);
});

test('terrain HTTP: rejects non-GET methods', async () => {
  const mod = await import('../api/lib/_carhire-terrain.js');
  const res = fakeRes();
  await mod.default({ method: 'POST', query: {} }, res);
  assert.equal(res.code, 405);
});

test('terrain HTTP: an exact Africa-wide request degrades to a transparent geometry estimate rather than 500ing', async () => {
  const mod = await import('../api/lib/_carhire-terrain.js');
  const res = fakeRes();
  await mod.default({ method: 'GET', query: {
    fromLat:'5.6037', fromLng:'-0.1870', toLat:'6.6885', toLng:'-1.6244',
    fromLabel:'Accra', toLabel:'Kumasi', fromCountry:'GH', toCountry:'GH'
  } }, res);
  assert.equal(res.code, 200);
  assert.equal(res.body.basis, 'geometry_estimate');
  assert.equal(res.body.confidence, 'low');
  assert.ok(res.headers['Cache-Control'], 'must set a cache header so identical lookups are not re-derived');
});

test('terrain HTTP: an identical follow-up request hits the in-memory cache', async () => {
  const mod = await import('../api/lib/_carhire-terrain.js');
  const first = fakeRes();
  const query = { fromLat:'5.6037', fromLng:'-0.1870', toLat:'6.6885', toLng:'-1.6244', fromLabel:'Accra', toLabel:'Kumasi', fromCountry:'GH', toCountry:'GH' };
  await mod.default({ method: 'GET', query }, first);
  const second = fakeRes();
  await mod.default({ method: 'GET', query }, second);
  assert.equal(second.body.cache, 'hit');
});

function fakeRes() {
  const r = { code: 0, body: null, headers: {} };
  r.setHeader = (k, v) => { r.headers[k] = v; };
  r.status = (c) => { r.code = c; return r; };
  r.json = (b) => { r.body = b; return r; };
  r.end = () => r;
  return r;
}
