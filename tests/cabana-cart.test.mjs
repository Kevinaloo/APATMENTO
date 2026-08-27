/* ══════════════════════════════════════════════════════════════════════
   THE ORDER
   tests/cabana-cart.test.mjs

   The basket is the one piece of the food pipeline that holds a
   diner's intent between pages, so the things asserted here are the
   things that would quietly cost somebody money or a meal: a total
   that does not add up, a promotional price ignored, an order from one
   kitchen leaking into another kitchen's ticket, a basket that empties
   itself on the walk from a dish to a menu.

   The arithmetic is checked against the prices a kitchen actually set,
   because every price on this platform is the kitchen's own and Cabana
   adds nothing to it. A test that let a fee creep in would be a test
   that let the promise break.
   ══════════════════════════════════════════════════════════════════════ */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { JSDOM } from 'jsdom';

const ROOT = new URL('..', import.meta.url).pathname;
const read = (f) => readFileSync(join(ROOT, f), 'utf8');
const CART_SRC = read('cabana-cart.js');

/* A fresh window per test: the basket is a singleton keyed to one
   localStorage, and tests that share one would share a basket. */
function boot(seed = {}) {
  const dom = new JSDOM('<!doctype html><body></body>', {
    url: 'https://cabana.africa/food',
    runScripts: 'outside-only'
  });
  const { window } = dom;
  for (const [k, v] of Object.entries(seed)) window.localStorage.setItem(k, v);
  window.eval(CART_SRC);
  return window.CabanaCart;
}

const KITCHEN = {
  id: 'k1', name: 'Mama Oliech', currency: 'KES',
  wa: '+254 700 111 222', ph: '+254700111222',
  area: 'Kilimani', city: 'Nairobi',
  delivery_fee: 200, min_order: 800,
  serves_delivery: true, serves_pickup: true, serves_dine_in: true
};
const OTHER = {
  id: 'k2', name: 'Artcaffe', currency: 'KES',
  wa: '+254 700 333 444', delivery_fee: 0
};
const FISH = { id: 'd1', name: 'Whole Tilapia', price: 1200, photo: 'https://x/t.jpg' };
const UGALI = { id: 'd2', name: 'Ugali', price: 100 };
const CAKE = { id: 'd3', name: 'Red Velvet', price: 600, promo_price: 450 };

/* ── The sum is the kitchen's price, times how many ─────────────────── */

test('a line totals at quantity times unit price', () => {
  const c = boot();
  c.add(KITCHEN, FISH, 2);
  const g = c.group('k1');
  assert.equal(g.count, 2);
  assert.equal(g.subtotal, 2400);
  assert.equal(g.items[0].line, 2400);
});

test('a promotional price is what gets charged, and the old price is kept to show', () => {
  const c = boot();
  c.add(OTHER, CAKE, 2);
  const g = c.group('k2');
  assert.equal(g.subtotal, 900, 'two at the promo price of 450');
  assert.equal(g.items[0].price, 600, 'the struck-through price survives for display');
  assert.equal(g.items[0].promo_price, 450);
  assert.equal(g.items[0].unit, 450);
});

test('Cabana never adds anything to a kitchen total', () => {
  const c = boot();
  c.add(KITCHEN, FISH, 1);
  c.setMode('k1', 'pickup');            /* collection: no delivery fee */
  const g = c.group('k1');
  assert.equal(g.subtotal, 1200);
  assert.equal(g.fee, 0);
  assert.equal(g.total, 1200, 'exactly what the kitchen asked for');
});

test('a delivery fee is the kitchen’s own and only applies to delivery', () => {
  const c = boot();
  c.add(KITCHEN, FISH, 1);
  c.setMode('k1', 'delivery');
  assert.equal(c.group('k1').total, 1400, '1200 food + the kitchen’s 200 delivery');
  c.setMode('k1', 'pickup');
  assert.equal(c.group('k1').total, 1200, 'collected in person, so nothing for delivery');
});

/* ── Adding to what is already there ────────────────────────────────── */

test('adding the same dish again increases the quantity rather than duplicating the line', () => {
  const c = boot();
  c.add(KITCHEN, UGALI, 1);
  c.add(KITCHEN, UGALI, 2);
  const g = c.group('k1');
  assert.equal(g.items.length, 1);
  assert.equal(g.items[0].qty, 3);
  assert.equal(g.subtotal, 300);
});

test('a quantity taken to zero removes the line, and the last line removes the kitchen', () => {
  const c = boot();
  c.add(KITCHEN, UGALI, 2);
  c.setQty('k1', 'd2', 0);
  assert.equal(c.group('k1'), null);
  assert.equal(c.isEmpty(), true);
});

test('a re-priced dish updates on the next add rather than billing yesterday’s price', () => {
  const c = boot();
  c.add(KITCHEN, UGALI, 1);
  c.add(KITCHEN, { ...UGALI, price: 150 }, 1);
  const g = c.group('k1');
  assert.equal(g.items[0].price, 150);
  assert.equal(g.subtotal, 300, 'both now at the current price');
});

/* ── Several kitchens in one order ──────────────────────────────────── */

test('two kitchens stay two kitchens, with separate totals', () => {
  const c = boot();
  c.add(KITCHEN, FISH, 1);
  c.add(OTHER, CAKE, 1);
  const gs = c.groups();
  assert.equal(gs.length, 2);
  assert.equal(c.group('k1').subtotal, 1200);
  assert.equal(c.group('k2').subtotal, 450);
  const t = c.totals();
  assert.equal(t.kitchens, 2);
  assert.equal(t.count, 2);
  assert.equal(t.subtotal, 1650);
});

test('emptying one kitchen leaves the other untouched', () => {
  const c = boot();
  c.add(KITCHEN, FISH, 1);
  c.add(OTHER, CAKE, 1);
  c.clearKitchen('k1');
  assert.equal(c.group('k1'), null);
  assert.equal(c.group('k2').subtotal, 450);
  assert.equal(c.totals().kitchens, 1);
});

test('the grand total is every kitchen’s total added up, delivery included', () => {
  const c = boot();
  c.add(KITCHEN, FISH, 1);        /* 1200 + 200 delivery */
  c.add(OTHER, CAKE, 2);          /* 900 + 0 delivery */
  const t = c.totals();
  assert.equal(t.subtotal, 2100);
  assert.equal(t.fees, 200);
  assert.equal(t.total, 2300);
});

/* ── The ticket a kitchen receives ──────────────────────────────────── */

test('a ticket carries only that kitchen’s food', () => {
  const c = boot();
  c.add(KITCHEN, FISH, 1);
  c.add(OTHER, CAKE, 1);
  const t = c.ticket('k1');
  assert.match(t, /Whole Tilapia/);
  assert.doesNotMatch(t, /Red Velvet/, 'the other kitchen’s cake must not appear');
  assert.match(t, /Mama Oliech/);
});

test('a ticket states a total that matches the arithmetic', () => {
  const c = boot();
  c.add(KITCHEN, FISH, 2);
  c.setMode('k1', 'delivery');
  const t = c.ticket('k1');
  assert.match(t, /2 x Whole Tilapia/);
  assert.match(t, /Food total: KES 2,400/);
  assert.match(t, /Delivery: KES 200/);
  assert.match(t, /Total: KES 2,600/);
});

test('a ticket carries who is ordering and where to bring it', () => {
  const c = boot();
  c.add(KITCHEN, FISH, 1);
  c.setDiner({ name: 'Wanjiru', phone: '0722000111', address: 'Rose Ave, gate 4' });
  c.setMode('k1', 'delivery');
  const t = c.ticket('k1');
  assert.match(t, /Name: Wanjiru/);
  assert.match(t, /Phone: 0722000111/);
  assert.match(t, /Address: Rose Ave, gate 4/);
});

test('an address is left off a ticket the diner is collecting themselves', () => {
  const c = boot();
  c.add(KITCHEN, FISH, 1);
  c.setDiner({ name: 'Wanjiru', phone: '0722000111', address: 'Rose Ave, gate 4' });
  c.setMode('k1', 'pickup');
  const t = c.ticket('k1');
  assert.doesNotMatch(t, /Address:/, 'nobody is delivering, so the address is not theirs to have');
  assert.match(t, /I will collect/);
});

test('the WhatsApp link points at the kitchen’s own number and carries the ticket', () => {
  const c = boot();
  c.add(KITCHEN, FISH, 1);
  const link = c.waLink('k1');
  assert.match(link, /^https:\/\/wa\.me\/254700111222\?text=/);
  assert.match(decodeURIComponent(link), /Whole Tilapia/);
});

/* ── Honest warnings, never blockers ────────────────────────────────── */

test('an order under the kitchen’s minimum says how far short it is, and still stands', () => {
  const c = boot();
  c.add(KITCHEN, UGALI, 2);              /* 200, against a minimum of 800 */
  const g = c.group('k1');
  assert.equal(g.shortBy, 600);
  assert.equal(g.count, 2, 'the order is not emptied or refused');
  assert.ok(c.waLink('k1'), 'it can still be sent — the kitchen decides, not us');
});

test('a kitchen over its minimum is not flagged', () => {
  const c = boot();
  c.add(KITCHEN, FISH, 1);
  assert.equal(c.group('k1').shortBy, 0);
});

/* ── Surviving the walk between pages ───────────────────────────────── */

test('the basket is written where the next page will find it', () => {
  const dom = new JSDOM('<!doctype html><body></body>', {
    url: 'https://cabana.africa/food', runScripts: 'outside-only'
  });
  dom.window.eval(CART_SRC);
  dom.window.CabanaCart.add(KITCHEN, FISH, 2);

  const saved = dom.window.localStorage.getItem('cabana-cart');
  assert.ok(saved, 'something was stored');

  /* a second page opening with that same storage sees the same order */
  const next = boot({ 'cabana-cart': saved });
  assert.equal(next.group('k1').subtotal, 2400);
  assert.equal(next.totals().count, 2);
});

test('an order older than twelve hours is not resurrected', () => {
  const stale = JSON.stringify({
    v: 1, t: Date.now() - 13 * 3600e3,
    kitchens: { k1: { id: 'k1', name: 'Mama Oliech', currency: 'KES',
      t: Date.now() - 13 * 3600e3, items: { d1: { id: 'd1', name: 'Tilapia', price: 1200, qty: 1 } } } }
  });
  const c = boot({ 'cabana-cart': stale });
  assert.equal(c.isEmpty(), true, 'yesterday’s basket is a memory, not an order');
});

test('an order from an hour ago is still an order', () => {
  const fresh = JSON.stringify({
    v: 1, t: Date.now() - 3600e3,
    kitchens: { k1: { id: 'k1', name: 'Mama Oliech', currency: 'KES',
      t: Date.now() - 3600e3, items: { d1: { id: 'd1', name: 'Tilapia', price: 1200, qty: 1 } } } }
  });
  const c = boot({ 'cabana-cart': fresh });
  assert.equal(c.totals().count, 1);
});

test('an order started under the old per-restaurant basket is carried across', () => {
  const c = boot({ 'cabana-order-k9': JSON.stringify({ t: Date.now(), items: { d7: 3 } }) });
  const g = c.group('k9');
  assert.ok(g, 'the old order was adopted rather than dropped');
  assert.equal(g.items[0].qty, 3, 'the quantity the diner chose survived');
});

/* ── Nothing here throws at the page ────────────────────────────────── */

test('nonsense in storage yields an empty basket, not an exception', () => {
  const c = boot({ 'cabana-cart': '{not json' });
  assert.equal(c.isEmpty(), true);
  assert.doesNotThrow(() => c.add(KITCHEN, FISH, 1));
  assert.equal(c.totals().count, 1);
});

test('adding without an id is ignored rather than corrupting the basket', () => {
  const c = boot();
  c.add({ name: 'nameless' }, FISH, 1);
  c.add(KITCHEN, { name: 'idless' }, 1);
  assert.equal(c.isEmpty(), true);
});

test('a quantity cannot be pushed negative or absurd', () => {
  const c = boot();
  c.add(KITCHEN, FISH, 1);
  c.setQty('k1', 'd1', -5);
  assert.equal(c.group('k1'), null, 'below zero is simply gone');
  c.add(KITCHEN, FISH, 5000);
  assert.equal(c.group('k1').items[0].qty, 99, 'capped rather than accepted');
});

/* ── Everything that draws the basket hears about a change ──────────── */

test('a subscriber is told the new totals on every change', () => {
  const c = boot();
  const seen = [];
  c.onChange((t) => seen.push(t.count));
  c.add(KITCHEN, FISH, 1);
  c.add(KITCHEN, UGALI, 2);
  c.clear();
  assert.deepEqual(seen, [0, 1, 3, 0], 'initial state, then each mutation');
});

/* ── Is the kitchen cooking ─────────────────────────────────────────── */

test('a kitchen that never stated its hours is not guessed at', () => {
  const c = boot();
  c.add({ id: 'k5', name: 'Unknown hours', currency: 'KES' }, FISH, 1);
  assert.equal(c.cooking('k5'), null, 'null, not a confident false');
});

test('a kitchen closed today is closed', () => {
  const c = boot();
  const days = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  const today = days[new Date().getDay()];
  const shut = days.filter((d) => d !== today);
  c.add({ id: 'k6', name: 'Weekdays only', currency: 'KES',
    opens_at: '08:00', closes_at: '20:00', open_days: shut }, FISH, 1);
  assert.equal(c.cooking('k6'), false);
});
