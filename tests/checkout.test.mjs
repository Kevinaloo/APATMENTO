import { fileURLToPath } from 'node:url';
/* ══════════════════════════════════════════════════════════════════════
   CHECKOUT
   tests/checkout.test.mjs

   The checkout turns a basket into order requests a kitchen answers on
   Cabana. Money is not taken here: the diner pays the kitchen on
   handover. So the tests are about three things.

     1. The arithmetic is honest. The total a diner reads is the total
        the kitchen will ask for, no fee creeps in, and one kitchen's
        order never contains another kitchen's food.
     2. Nothing a kitchen cannot act on is sent: no name, no reachable
        number, no address for a delivery, or a delivery under the
        kitchen's minimum.
     3. What is sent is the order, not the prices. The browser names
        dishes and quantities; the server prices every line from the
        kitchen's own menu.
   ══════════════════════════════════════════════════════════════════════ */
import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { JSDOM } from 'jsdom';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const read = (f) => readFileSync(join(ROOT, f), 'utf8');

const PAGE = read('checkout.html');
const CART = read('cabana-cart.js');
const ORDERS = read('cabana-orders.js');

const OPEN = [];
afterEach(() => { while (OPEN.length) OPEN.pop().close(); });

function basket(kitchens) {
  return JSON.stringify({ v: 1, t: Date.now(), kitchens });
}
const NIGHT = {
  id: 'k-night', name: 'Choma Yard', currency: 'KES', where: 'Kilimani, Nairobi',
  delivery_fee: 250, min_order: 700,
  serves_delivery: true, serves_pickup: true, serves_dine_in: true,
  opens_at: '12:00', closes_at: '23:00', t: Date.now(),
  items: { 'i-choma': { id: 'i-choma', name: 'Nyama Choma', price: 900, promo_price: 750, qty: 2 } }
};
const CAFE = {
  id: 'k-cafe', name: 'Kahawa Corner', currency: 'KES', where: 'Westlands, Nairobi',
  delivery_fee: 150, serves_delivery: true, serves_pickup: true, serves_dine_in: false,
  t: Date.now() + 1,
  items: { 'i-chai': { id: 'i-chai', name: 'Chai ya Maziwa', price: 50, qty: 3 } }
};

async function openPage({ cart = null, diner = null, hour = 19, place = null } = {}) {
  const inline = [...PAGE.matchAll(
    /<script(?![^>]*\bsrc=)(?![^>]*application\/ld\+json)[^>]*>([\s\S]*?)<\/script>/gi
  )].map((m) => m[1]).filter((s) => s.includes('CABANA · CHECKOUT'))[0];
  assert.ok(inline, 'found the page script');

  const html = PAGE.replace(/<script(?![^>]*application\/ld\+json)[^>]*>[\s\S]*?<\/script>/gi, '');
  const dom = new JSDOM(html, { url: 'https://cabana.africa/checkout', runScripts: 'dangerously', pretendToBeVisual: true });
  OPEN.push(dom.window);
  const { window } = dom;

  if (cart) window.localStorage.setItem('cabana-cart', cart);
  if (diner) window.localStorage.setItem('cabana-diner', JSON.stringify(diner));

  const RealDate = window.Date;
  const base = new RealDate(2026, 5, 15, hour, 30, 0);
  class Fixed extends RealDate {
    constructor(...a) { return a.length ? new RealDate(...a) : new RealDate(base); }
    static now() { return base.getTime(); }
  }
  window.Date = Fixed;
  window.gtag = () => {};
  window.Element.prototype.scrollIntoView = function () {};

  const run = (code) => {
    const s = window.document.createElement('script');
    s.textContent = code;
    window.document.body.appendChild(s);
  };
  run(CART);
  run(ORDERS);
  window.__placed = [];
  window.CabanaOrders.place = (payload) => {
    window.__placed.push(payload);
    return place ? place(payload) : Promise.resolve({ ref: 'CF-TEST' + window.__placed.length, token: 't' + window.__placed.length, total: 1, currency: 'KES' });
  };
  run(inline);
  await new Promise((r) => setTimeout(r, 0));
  return window;
}

const text = (w) => w.document.getElementById('app').textContent;
const tickets = (w) => [...w.document.querySelectorAll('.tick')];
const settle = () => new Promise((r) => setTimeout(r, 30));
function fill(w, { name = 'Achieng', phone = '0712 345 678', address = 'Kilimani, Argwings Kodhek Rd, House 12' } = {}) {
  const set = (id, v) => { const el = w.document.getElementById(id); if (el) { el.value = v; el.dispatchEvent(new w.Event('input')); } };
  set('dName', name); set('dPhone', phone); set('dAddr', address);
}

/* ══════════════════════════════════════════════════════════════════════
   NOTHING TO CHECK OUT
   ══════════════════════════════════════════════════════════════════════ */
test('an empty order says so and points back at the food', async () => {
  const w = await openPage();
  assert.match(text(w), /Your order is empty/);
  assert.ok(w.document.querySelector('a[href="/food"]'));
  assert.equal(w.document.getElementById('bar').classList.contains('up'), false);
});

/* ══════════════════════════════════════════════════════════════════════
   ONE REQUEST PER KITCHEN
   ══════════════════════════════════════════════════════════════════════ */
test('each kitchen gets its own order', async () => {
  const w = await openPage({ cart: basket({ 'k-night': NIGHT, 'k-cafe': CAFE }) });
  assert.equal(tickets(w).length, 2);
  assert.match(text(w), /One basket\. 2 kitchens\./);
  assert.match(w.document.getElementById('sendBtn').textContent, /Send 2 order requests/);
});

test('an order contains only its own kitchen’s food', async () => {
  const w = await openPage({ cart: basket({ 'k-night': NIGHT, 'k-cafe': CAFE }) });
  const night = w.document.getElementById('k-k-night');
  assert.match(night.textContent, /Nyama Choma/);
  assert.doesNotMatch(night.textContent, /Chai ya Maziwa/);
});

test('a single kitchen is named in the heading and on the button', async () => {
  const w = await openPage({ cart: basket({ 'k-night': NIGHT }) });
  assert.match(text(w), /Send it to Choma Yard\./);
  assert.match(w.document.getElementById('sendBtn').textContent, /Send order to Choma Yard/);
});

test('the page explains the four steps before anything is sent', async () => {
  const w = await openPage({ cart: basket({ 'k-night': NIGHT }) });
  const steps = [...w.document.querySelectorAll('.journey li b')].map((b) => b.textContent);
  assert.deepEqual(steps, ['You send', 'Kitchen answers', 'Cooked & ready', 'Codes swapped']);
});

/* ══════════════════════════════════════════════════════════════════════
   THE ARITHMETIC
   ══════════════════════════════════════════════════════════════════════ */
test('a kitchen total is its food plus only its own delivery fee', async () => {
  const w = await openPage({ cart: basket({ 'k-night': NIGHT }) });
  const g = w.CabanaCart.group('k-night');
  assert.equal(g.subtotal, 1500, 'two at the promotional 750');
  assert.equal(g.fee, 250);
  assert.equal(g.total, 1750);
  assert.match(text(w), /KES 1,750/);
});

test('the grand total is every kitchen added up', async () => {
  const w = await openPage({ cart: basket({ 'k-night': NIGHT, 'k-cafe': CAFE }) });
  assert.match(w.document.querySelector('.led.grand').textContent, /KES 2,050/, '1750 + 300');
});

test('the page states plainly that Cabana takes nothing', async () => {
  const w = await openPage({ cart: basket({ 'k-night': NIGHT }) });
  assert.match(text(w), /Cabana fee/);
  assert.match(w.document.querySelector('.led.keep').textContent, /KES 0/);
  assert.match(text(w), /nothing is charged here/i);
});

test('switching to collection drops the delivery fee from the total', async () => {
  const w = await openPage({ cart: basket({ 'k-night': NIGHT }) });
  w.document.querySelector('#k-k-night [data-mode="pickup"]').click();
  await settle();
  assert.equal(w.CabanaCart.group('k-night').total, 1500);
  assert.match(w.document.querySelector('#k-k-night .sum.big').textContent, /KES 1,500/);
});

test('a way a kitchen does not offer is shown but cannot be chosen', async () => {
  const w = await openPage({ cart: basket({ 'k-cafe': CAFE }) });
  const eatIn = w.document.querySelector('#k-k-cafe [data-mode="dine_in"]');
  assert.ok(eatIn);
  assert.equal(eatIn.disabled, true);
});

test('a stepper changes the quantity and the total together', async () => {
  const w = await openPage({ cart: basket({ 'k-night': NIGHT }) });
  w.document.querySelector('#k-k-night [data-b="1"]').click();
  await settle();
  assert.equal(w.CabanaCart.qty('k-night', 'i-choma'), 3);
  assert.match(w.document.querySelector('#k-k-night .sum.big').textContent, /KES 2,500/);
});

test('taking the last dish to zero removes that kitchen', async () => {
  const w = await openPage({ cart: basket({ 'k-night': NIGHT, 'k-cafe': CAFE }) });
  const minus = w.document.querySelector('#k-k-cafe [data-b="-1"]');
  minus.click(); await settle();
  w.document.querySelector('#k-k-cafe [data-b="-1"]').click(); await settle();
  w.document.querySelector('#k-k-cafe [data-b="-1"]').click(); await settle();
  assert.equal(w.document.getElementById('k-k-cafe'), null);
  assert.equal(tickets(w).length, 1);
});

/* ══════════════════════════════════════════════════════════════════════
   NOTHING A KITCHEN CANNOT ACT ON
   ══════════════════════════════════════════════════════════════════════ */
test('an order with no name and no number is not sent', async () => {
  const w = await openPage({ cart: basket({ 'k-night': NIGHT }) });
  w.document.getElementById('sendBtn').click(); await settle();
  assert.equal(w.__placed.length, 0);
  assert.ok(w.document.getElementById('dName').classList.contains('bad'));
});

test('a delivery with no address is not sent', async () => {
  const w = await openPage({ cart: basket({ 'k-night': NIGHT }) });
  fill(w, { address: '' });
  w.document.getElementById('sendBtn').click(); await settle();
  assert.equal(w.__placed.length, 0);
  assert.ok(w.document.getElementById('dAddr').classList.contains('bad'));
});

test('a collection order needs no address at all', async () => {
  const cart = basket({ 'k-night': Object.assign({}, NIGHT, { mode: 'pickup' }) });
  const w = await openPage({ cart });
  assert.equal(w.document.getElementById('dAddr'), null);
  fill(w);
  w.document.getElementById('sendBtn').click(); await settle();
  assert.equal(w.__placed.length, 1);
  assert.equal(w.__placed[0].mode, 'pickup');
  assert.equal(w.__placed[0].address, null);
});

test('a phone number too short to dial is refused', async () => {
  const w = await openPage({ cart: basket({ 'k-night': NIGHT }) });
  fill(w, { phone: '0712' });
  w.document.getElementById('sendBtn').click(); await settle();
  assert.equal(w.__placed.length, 0);
  assert.ok(w.document.getElementById('dPhone').classList.contains('bad'));
});

test('a delivery under the kitchen’s minimum is flagged and held back', async () => {
  const small = Object.assign({}, NIGHT, { items: { 'i-choma': { id: 'i-choma', name: 'Nyama Choma', price: 900, promo_price: 600, qty: 1 } } });
  const w = await openPage({ cart: basket({ 'k-night': small }) });
  assert.match(w.document.getElementById('k-k-night').textContent, /delivers from KES 700/);
  fill(w);
  w.document.getElementById('sendBtn').click(); await settle();
  assert.equal(w.__placed.length, 0);
});

test('a closed kitchen is named as closed and offers to schedule for opening', async () => {
  const w = await openPage({ cart: basket({ 'k-night': NIGHT }), hour: 4 });
  const t = w.document.getElementById('k-k-night').textContent;
  assert.match(t, /Closed now/);
  assert.ok(w.document.querySelector('#k-k-night [data-schedule]'), 'a one-tap schedule for opening time');
});

test('a kitchen that is open says so', async () => {
  const w = await openPage({ cart: basket({ 'k-night': NIGHT }), hour: 19 });
  assert.match(w.document.getElementById('k-k-night').textContent, /Open now/);
});

/* ══════════════════════════════════════════════════════════════════════
   WHAT IS SENT
   ══════════════════════════════════════════════════════════════════════ */
test('sending names dishes and quantities, never prices, and shares one basket', async () => {
  const w = await openPage({ cart: basket({ 'k-night': NIGHT, 'k-cafe': CAFE }) });
  fill(w);
  w.document.getElementById('sendBtn').click();
  await new Promise((r) => setTimeout(r, 80));
  assert.equal(w.__placed.length, 2);
  const [a, b] = w.__placed;
  assert.equal(a.listing_id, 'k-night');
  assert.equal(JSON.stringify(a.items), JSON.stringify([{ id: 'i-choma', qty: 2 }]));
  assert.equal(b.listing_id, 'k-cafe');
  assert.equal(JSON.stringify(b.items), JSON.stringify([{ id: 'i-chai', qty: 3 }]));
  assert.ok(a.basket && a.basket === b.basket, 'one basket id ties them together');
  assert.equal(a.name, 'Achieng');
  assert.equal(a.phone, '0712 345 678');
  assert.equal(a.pay_method, 'mpesa');
  assert.ok(!JSON.stringify(a).includes('750'), 'no price travels with the order');
});

test('a sent kitchen leaves the basket; a refused one stays with the reason', async () => {
  const w = await openPage({
    cart: basket({ 'k-night': NIGHT, 'k-cafe': CAFE }),
    place: (p) => p.listing_id === 'k-cafe'
      ? Promise.reject(Object.assign(new Error('kitchen_paused'), { code: 'kitchen_paused', detail: '20:30' }))
      : Promise.resolve({ ref: 'CF-AAAAAA', token: 'x', total: 1750, currency: 'KES' })
  });
  fill(w);
  w.document.getElementById('sendBtn').click();
  await new Promise((r) => setTimeout(r, 1200));
  assert.equal(w.CabanaCart.group('k-night'), null, 'the sent kitchen is cleared');
  assert.ok(w.CabanaCart.group('k-cafe'), 'the refused kitchen is kept');
  assert.match(w.document.getElementById('k-k-cafe').textContent, /Not sent\..*paused new orders until 20:30/);
});

test('the details are remembered so they are typed once, not once per kitchen', async () => {
  const w = await openPage({ cart: basket({ 'k-night': NIGHT }), diner: { name: 'Achieng', phone: '0712345678', address: 'Kilimani' } });
  assert.equal(w.document.getElementById('dName').value, 'Achieng');
  assert.equal(w.document.getElementById('dPhone').value, '0712345678');
  assert.equal(w.document.getElementById('dAddr').value, 'Kilimani');
});

test('a note to one kitchen is kept against that kitchen only', async () => {
  const w = await openPage({ cart: basket({ 'k-night': NIGHT, 'k-cafe': CAFE }) });
  const ta = w.document.querySelector('[data-note="k-night"]');
  ta.value = 'No chilli'; ta.dispatchEvent(new w.Event('blur'));
  assert.equal(w.CabanaCart.note('k-night'), 'No chilli');
  assert.equal(w.CabanaCart.note('k-cafe'), '');
});
