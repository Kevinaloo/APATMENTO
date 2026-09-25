/* Calendar studio: the shared calendar engine, the host and fleet pages
   built on it, and the database functions that make its buttons real. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const read = f => readFileSync(new URL('../' + f, import.meta.url), 'utf8');
const ENGINE = read('cabana-calendar.js');
const CSS = read('cabana-calendar.css');
const HOST = read('partner-calendar.html');
const FLEET = read('partner-fleet.html');
const AGENT = read('agent-dashboard.html');
const SQL = read('supabase/migrations/20260926100000_calendar_studio.sql');
const API = read('api/calendar-sync.js');

function engine() {
  const listeners = {};
  const win = { matchMedia: () => ({ matches: false }), addEventListener() {}, localStorage: null };
  const ctx = vm.createContext({ window: win, document: { addEventListener() {} }, navigator: {}, setInterval() { return 0; }, clearInterval() {}, setTimeout, clearTimeout, console, Date, Math, JSON, String, Number, Object, Array, Promise, RegExp });
  vm.runInContext(ENGINE, ctx);
  return win.CabanaCal;
}

test('engine loads and exposes the public API', () => {
  const C = engine();
  for (const k of ['mount', 'agendaStore', 'toast', 'util']) assert.ok(C[k], k);
});

test('date maths is local-calendar and exclusive at the end', () => {
  const U = engine().util;
  assert.equal(U.add('2026-02-27', 2), '2026-03-01');
  assert.equal(U.add('2028-02-28', 1), '2028-02-29');       // leap year
  assert.equal(U.diff('2026-10-24', '2026-10-27'), 3);       // three nights
  assert.equal(U.addMonths('2026-01-31', 1), '2026-02-01');  // month cursor snaps to the 1st
  assert.equal(U.monthStart('2026-09-26'), '2026-09-01');
});

test('every view, gesture and productivity tool is present', () => {
  for (const v of ['paintMonth', 'paintTimeline', 'paintAgenda', 'paintYear']) assert.match(ENGINE, new RegExp('function ' + v));
  assert.match(ENGINE, /pointerdown/);                 // drag select
  assert.match(ENGINE, /press-and-hold|lp = setTimeout/); // long press paint on touch
  assert.match(ENGINE, /Swipe to change month/);
  assert.match(ENGINE, /ArrowLeft/);                   // keyboard
  assert.match(ENGINE, /Undo/);                        // undo toast
  assert.match(ENGINE, /calendar_agenda/);             // notes, tasks, reminders
  assert.match(ENGINE, /watchReminders/);
});

test('double bookings stay unmistakable: red, striped and named', () => {
  assert.match(CSS, /t-clash[\s\S]{0,200}repeating-linear-gradient/);
  assert.match(HOST, /DOUBLE BOOKED/);
});

test('host page: one overview round trip per listing, exact range edits', () => {
  assert.equal((HOST.match(/api\('overview'/g) || []).length, 1);
  assert.match(HOST, /api\('range\.set'/);
  assert.match(API, /'range\.set'/);
  assert.match(API, /cabana_calendar_set_ranges/);
  assert.ok(!HOST.includes("from('bookings')"));
});

test('paid nights can never be blocked or opened from the calendar', () => {
  assert.match(SQL, /listing_holds[\s\S]{0,300}'booked'/);
  assert.match(SQL, /feed_id is null/);                // channel-owned blocks are never carved
  assert.match(HOST, /cancel the booking from Bookings/);
});

test('fleet console has a calendar that writes through its own RPCs', () => {
  assert.match(FLEET, /data-tab="calendar"/);
  assert.match(FLEET, /'car_operator_calendar'/);
  assert.match(FLEET, /'car_operator_blackout_set'/);
  assert.match(FLEET, /'car_operator_blackout'/);      // simple sheet kept as fallback
});

test('agent availability uses the shared engine read-only', () => {
  assert.match(AGENT, /cabana-calendar\.js/);
  assert.match(AGENT, /compact: true/);
});

test('reminders are owner-only and delivered by the scheduler', () => {
  assert.match(SQL, /enable row level security/);
  assert.match(SQL, /owner_id = \(select auth\.uid\(\)\)/);
  assert.match(SQL, /cron\.schedule\('cabana-calendar-reminders'/);
  assert.match(SQL, /database-notification/);
});
