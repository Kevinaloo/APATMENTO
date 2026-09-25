/* Cabana Move and Cabana Drive: the rides marketplace, the car hire
   marketplace and the route service they share.

   The pages are big interactive apps; these tests pin the contracts
   that must never drift: every African country and currency, money in
   the right exponent, the rider's fare (not a client-computed price)
   is what reaches the server, zero commission, the database refusing
   what the client must not decide, and the route service answering
   without any network at all. */
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { JSDOM } from 'jsdom';
import routeHandler, { __test as R, estimateRoute, shape } from '../api/lib/_route.js';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const read = file => readFileSync(join(ROOT, file), 'utf8');
const HTML = read('rides.html');
const SCRIPT = read('cabana-rides.js');
const MOTION = read('cabana-motion.js');
const RIDES_SQL = read('supabase/migrations/20260925130000_cabana_rides_marketplace.sql');
const DRIVE_SQL = read('supabase/migrations/20260925140000_cabana_drive_bookings.sql');
const TUNING_SQL = read('supabase/migrations/20260925160000_cabana_move_tuning.sql');

function bootRides(url = 'https://cabana.africa/rides') {
  const dom = new JSDOM(HTML, { url, runScripts: 'outside-only', pretendToBeVisual: true });
  const w = dom.window;
  const calls = [];
  w.matchMedia = w.matchMedia || (() => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} }));
  w.ApaSession = {
    ready(cb) { cb({ status: 'guest' }); },
    client() {
      return {
        rpc(name, args) { calls.push({ name, args }); return Promise.resolve({ data: name === 'ride_requests_list' ? [] : { available: false }, error: null }); },
        from() { const b = { select() { return b; }, eq() { return b; }, in() { return b; }, order() { return b; }, limit() { return b; }, then(r) { return Promise.resolve({ data: [], error: null }).then(r); } }; return b; }
      };
    }
  };
  w.eval(MOTION);
  w.eval(SCRIPT);
  return { dom, w, calls };
}

test('Move knows all 54 African countries, each with its own currency', () => {
  const { w } = bootRides();
  const api = w.CabanaRides;
  const codes = Object.keys(api.COUNTRIES);
  assert.equal(codes.length, 54);
  for (const [cc, cur] of [['KE', 'KES'], ['NG', 'NGN'], ['UG', 'UGX'], ['RW', 'RWF'], ['SN', 'XOF'], ['ZA', 'ZAR'], ['EG', 'EGP'], ['MA', 'MAD']]) {
    assert.equal(api.currencyFor(cc), cur, `${cc} should price in ${cur}`);
  }
});

test('money honours zero-decimal currencies instead of assuming cents', () => {
  const { w } = bootRides();
  const { money, factor } = w.CabanaRides;
  assert.equal(factor('KES'), 100);
  assert.equal(factor('UGX'), 1);
  assert.equal(factor('XOF'), 1);
  assert.match(money(145000, 'KES'), /KES\s?1,450/);
  assert.match(money(1250, 'USD'), /12\.5/);
  assert.match(money(25000, 'UGX'), /UGX\s?25,000/);
  assert.equal(money(null, 'KES'), '—');
});

test('the mode catalogue covers road, water, air and animal movement', () => {
  const { w } = bootRides();
  const keys = new Set(w.CabanaRides.MODES.map(m => m.key));
  for (const k of ['economy', 'comfort', 'executive', 'van', 'motorcycle', 'tuk_tuk', 'electric', 'accessible', 'minibus', 'boat', 'helicopter', 'horse', 'bicycle', 'e_bike']) {
    assert.ok(keys.has(k), `missing mode ${k}`);
  }
  for (const m of w.CabanaRides.MODES) assert.ok(w.CabanaRides.ART[m.art || m.key] || w.CabanaRides.ART[m.key] || m.art, `mode ${m.key} has artwork`);
});

test('the offline route estimate never claims to be shorter than the straight line', () => {
  const { w } = bootRides();
  const a = { lat: -1.2673, lng: 36.8065 }, b = { lat: -1.3192, lng: 36.9278 };
  const r = w.CabanaRides.routeFallback(a, b);
  const straight = R.haversineKm(a, b);
  assert.ok(r.distance_km >= straight, 'road distance at least the straight line');
  assert.ok(r.distance_km < straight * 2, 'and not absurdly longer');
  assert.ok(r.duration_min > 10 && r.duration_min < 120, `plausible minutes, got ${r.duration_min}`);
});

test('the request sends the rider\'s own fare and nothing the server must decide', () => {
  const start = SCRIPT.indexOf("var payload = {", SCRIPT.indexOf('function submit()'));
  const end = SCRIPT.indexOf('};', start);
  const payload = SCRIPT.slice(start, end);
  assert.match(payload, /rider_offer_minor:/);
  assert.match(payload, /auto_accept:/);
  for (const forbidden of ['status:', 'agreed', 'driver_id', 'trip_pin', 'commission', 'quote_total', 'fare_hint']) {
    assert.ok(!payload.includes(forbidden), `payload must not carry ${forbidden}`);
  }
  assert.doesNotMatch(HTML, /cabana-fare\.js/, 'the legacy client fare engine stays gone');
});

test('the database, not the page, measures the trip and bounds every fare', () => {
  assert.match(RIDES_SQL, /create or replace function public\.ride_request_place\(p jsonb\)[\s\S]*?security definer/);
  /* Client distances are trusted only within a band around the straight line. */
  assert.match(RIDES_SQL, /0\.95/);
  assert.match(RIDES_SQL, /2\.8/);
  /* Drivers cannot counter wildly away from what the rider named. */
  assert.match(RIDES_SQL, /v_price < round\(v_ref \* 0\.4\) or v_price > v_ref \* 4/);
  /* A wrong PIN is recorded, not rolled back. */
  assert.match(RIDES_SQL, /A wrong PIN is an answer, not an exception/);
  assert.match(RIDES_SQL, /'attempts_left', greatest\(0, 6 - r\.pin_attempts\)/);
  /* Drivers see no rider phone or pin in the open board. */
  const board = RIDES_SQL.slice(RIDES_SQL.indexOf('create or replace function public.ride_driver_board'), RIDES_SQL.indexOf('create or replace function public.ride_driver_offer'));
  const invitations = board.slice(board.indexOf('v_inv'), board.indexOf('into v_active'));
  assert.doesNotMatch(invitations.split('into v_inv')[0], /rider_phone|trip_pin/);
});

test('the driver console speaks the marketplace, not the old metered engine', () => {
  const driver = read('driver.html');
  for (const rpc of ['ride_driver_board', 'ride_driver_offer', 'ride_driver_pass', 'ride_driver_progress', 'cab_ping']) assert.match(driver, new RegExp(`'${rpc}'`));
  assert.doesNotMatch(driver, /cab_accept|cab_set_status|cabana-fare\.js|platformFeePct/);
  assert.match(driver, /Cabana takes 0%/);
});

test('car hire: money is minor units, the fee line is always zero, and handover needs the code', () => {
  assert.match(DRIVE_SQL, /'label', 'Cabana fee'[\s\S]{0,120}'amount', 0/);
  assert.match(DRIVE_SQL, /create or replace function public\.car_booking_place\(p jsonb\)[\s\S]*?security definer/);
  assert.match(DRIVE_SQL, /public\.food_digits\(p->>'code'\) is distinct from b\.handover_code/);
  assert.match(DRIVE_SQL, /'attempts_left', greatest\(0, 8 - b\.code_attempts\)/);
  /* A finished hire frees the calendar again. */
  assert.match(TUNING_SQL, /completed/);
  assert.match(TUNING_SQL, /car_booking_blackout/);
});

test('car hire: every console the migrations link to exists and uses its RPCs', () => {
  for (const link of ['/partner-fleet', '/carhire?booking=', '/carhire?request=']) assert.ok(DRIVE_SQL.includes(link), `migration links ${link}`);
  assert.ok(existsSync(join(ROOT, 'partner-fleet.html')));
  const fleet = read('partner-fleet.html');
  for (const rpc of ['car_operator_board', 'car_operator_respond', 'car_operator_booking_update', 'car_operator_request_offer', 'car_operator_vehicle_save', 'car_operator_blackout', 'car_operator_settings']) {
    assert.match(fleet, new RegExp(`'${rpc}'`), `fleet console calls ${rpc}`);
  }
  const ui = read('cabana-carhire-ui.js');
  for (const rpc of ['car_quote', 'car_booking_place', 'car_booking_track', 'car_request_place', 'car_request_track', 'car_request_accept', 'car_hires_list']) {
    assert.match(ui, new RegExp(`'${rpc}'`), `renter app calls ${rpc}`);
  }
  const admin = read('cabana-rides-admin.js');
  for (const rpc of ['ride_desk_offer', 'ride_desk_progress', 'car_desk_board', 'car_desk_request_offer', 'car_desk_booking_update', 'car_desk_vehicle_status', 'car_desk_operator_verify']) {
    assert.match(admin, new RegExp(`'${rpc}'`), `desk calls ${rpc}`);
  }
  assert.match(read('dashboard.html'), /manage:'partner-fleet'/);
});

test('route service: traffic follows the local clock, not the server clock', () => {
  const a = { lat: -1.2673, lng: 36.8065 }, b = { lat: -1.3192, lng: 36.9278 };
  const raw = estimateRoute(a, b);
  /* 08:00 and 03:00 in Nairobi on a Tuesday. */
  const rush = shape(raw, a, b, new Date('2026-09-29T05:00:00Z'), 'KE');
  const night = shape(raw, a, b, new Date('2026-09-29T00:00:00Z'), 'KE');
  assert.equal(rush.local_hour, 8);
  assert.equal(night.local_hour, 3);
  assert.ok(rush.duration_min > night.duration_min * 1.5, `rush ${rush.duration_min} vs night ${night.duration_min}`);
  assert.equal(night.traffic, 'light');
  assert.equal(rush.traffic, 'heavy');
  assert.equal(rush.basis, 'estimate');
  assert.equal(R.trafficFactor({ hour: 3, weekend: false }), 1);
});

test('route service answers from its own estimate when no router is reachable', async () => {
  const prev = process.env.ROUTER_ORDER;
  process.env.ROUTER_ORDER = 'none';
  try {
    const res = { code: 0, body: null, headers: {}, setHeader(k, v) { this.headers[k] = v; }, status(c) { this.code = c; return this; }, json(b) { this.body = b; return this; }, end() { return this; } };
    await routeHandler({ method: 'GET', query: { from: '-1.2864,36.8172', to: '-1.3192,36.9278', cc: 'KE', at: '2026-09-29T09:00:00Z' } }, res);
    assert.equal(res.code, 200);
    assert.equal(res.body.ok, true);
    assert.equal(res.body.provider, 'estimate');
    assert.ok(res.body.distance_km > res.body.straight_km);
    assert.ok(Array.isArray(res.body.geometry) && res.body.geometry.length >= 2);
    const bad = { ...res, code: 0, body: null };
    await routeHandler({ method: 'GET', query: { from: 'x' } }, bad);
    assert.equal(bad.code, 400);
  } finally {
    if (prev == null) delete process.env.ROUTER_ORDER; else process.env.ROUTER_ORDER = prev;
  }
});

test('the route endpoint is routed through the shared utilities function', () => {
  const vercel = JSON.parse(read('vercel.json'));
  assert.ok((vercel.rewrites || []).some(r => r.source === '/api/route' && /action=route/.test(r.destination)));
  assert.match(read('api/utilities.js'), /action === 'route'/);
});
