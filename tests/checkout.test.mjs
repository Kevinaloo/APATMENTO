/* ══════════════════════════════════════════════════════════════════════
   CHECKOUT
   tests/checkout.test.mjs

   This is the last page before somebody spends money, and the money is
   not spent here — it is spent at the counter, against a ticket this
   page wrote. So the tests are about the ticket being right and the
   arithmetic being honest: the total a diner reads here is the total a
   kitchen will ask them for, no fee has crept in, and one kitchen's
   ticket never contains another kitchen's food.

   The other half is refusing to send a ticket a kitchen cannot act on.
   An order with no name, no number, or no address to deliver to is not
   an order; it is a message that wastes a cook's time.
   ══════════════════════════════════════════════════════════════════════ */
import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { JSDOM } from 'jsdom';

const ROOT = new URL('..', import.meta.url).pathname;
const read = (f) => readFileSync(join(ROOT, f), 'utf8');

const PAGE = read('checkout.html');
const CART = read('cabana-cart.js');

const OPEN = [];
afterEach(() => { while (OPEN.length) OPEN.pop().close(); });

/* a basket as it would arrive from the food page */
function basket(kitchens) {
  return JSON.stringify({ v: 1, t: Date.now(), kitchens });
}
const NIGHT = {
  id: 'k-night', name: 'Choma Yard', currency: 'KES',
  wa: '+254700000002', ph: '+254700000002', where: 'Kilimani, Nairobi',
  delivery_fee: 250, min_order: 700,
  serves_delivery: true, serves_pickup: true, serves_dine_in: true,
  opens_at: '12:00', closes_at: '23:00', t: Date.now(),
  items: { 'i-choma': { id: 'i-choma', name: 'Nyama Choma', price: 900, promo_price: 750, qty: 2 } }
};
const CAFE = {
  id: 'k-cafe', name: 'Kahawa Corner', currency: 'KES',
  wa: '+254700000001', where: 'Westlands, Nairobi',
  delivery_fee: 150, serves_delivery: true, serves_pickup: true, serves_dine_in: false,
  t: Date.now() + 1,
  items: { 'i-chai': { id: 'i-chai', name: 'Chai ya Maziwa', price: 50, qty: 3 } }
};

async function openPage({ cart = null, diner = null, hour = 19 } = {}) {
  const inline = [...PAGE.matchAll(
    /<script(?![^>]*\bsrc=)(?![^>]*application\/ld\+json)[^>]*>([\s\S]*?)<\/script>/gi
  )].map((m) => m[1]).filter((s) => s.includes('CABANA · CHECKOUT'))[0];
  assert.ok(inline, 'found the page script');

  const html = PAGE.replace(
    /<script(?![^>]*application\/ld\+json)[^>]*>[\s\S]*?<\/script>/gi, ''
  );

  const dom = new JSDOM(html, {
    url: 'https://cabana.africa/checkout',
    runScripts: 'dangerously', pretendToBeVisual: true
  });
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
  run(inline);

  await new Promise((r) => setTimeout(r, 0));
  return window;
}

const text = (w) => w.document.getElementById('app').textContent;
const tickets = (w) => [...w.document.querySelectorAll('.tick')];

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
   ONE TICKET PER KITCHEN
   ══════════════════════════════════════════════════════════════════════ */

test('each kitchen gets its own ticket', async () => {
  const w = await openPage({ cart: basket({ 'k-night': NIGHT, 'k-cafe': CAFE }) });
  assert.equal(tickets(w).length, 2);
  assert.match(text(w), /Choma Yard/);
  assert.match(text(w), /Kahawa Corner/);
  assert.match(text(w), /2 kitchens\. 2 tickets\./);
});

test('a ticket contains only its own kitchen’s food', async () => {
  const w = await openPage({ cart: basket({ 'k-night': NIGHT, 'k-cafe': CAFE }) });
  const night = w.document.getElementById('k-k-night');
  assert.match(night.textContent, /Nyama Choma/);
  assert.doesNotMatch(night.textContent, /Chai ya Maziwa/);
});

test('a single kitchen is described as one ticket, not two', async () => {
  const w = await openPage({ cart: basket({ 'k-night': NIGHT }) });
  assert.match(text(w), /One kitchen\. One ticket\./);
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
  const t = w.CabanaCart.totals();
  assert.equal(t.subtotal, 1650, '1500 choma + 150 chai');
  assert.equal(t.fees, 400, '250 + 150');
  assert.equal(t.total, 2050);
  assert.match(w.document.getElementById('barV').textContent, /KES 2,050/);
});

test('the page states plainly that Cabana takes nothing', async () => {
  const w = await openPage({ cart: basket({ 'k-night': NIGHT }) });
  const t = text(w);
  assert.match(t, /Cabana.s cut/i);
  assert.match(t, /Taken by Cabana/);
  assert.match(t, /KES 0/, 'and the figure against it is zero');
});

test('switching to collection drops the delivery fee from the total', async () => {
  const w = await openPage({ cart: basket({ 'k-night': NIGHT }) });
  assert.equal(w.CabanaCart.group('k-night').total, 1750);
  w.document.querySelector('.mode[data-mode="pickup"]').click();
  assert.equal(w.CabanaCart.group('k-night').total, 1500, 'nobody is delivering, so nobody charges for it');
});

test('a way a kitchen does not offer is shown but cannot be chosen', async () => {
  const w = await openPage({ cart: basket({ 'k-cafe': CAFE }) });
  const dine = w.document.querySelector('#k-k-cafe .mode[data-mode="dine_in"]');
  assert.equal(dine.disabled, true, 'the diner learns what is possible instead of wondering');
});

test('a stepper changes the quantity and the total together', async () => {
  const w = await openPage({ cart: basket({ 'k-night': NIGHT }) });
  w.document.querySelector('#k-k-night [data-b="1"]').click();
  assert.equal(w.CabanaCart.qty('k-night', 'i-choma'), 3);
  assert.equal(w.CabanaCart.group('k-night').subtotal, 2250);
});

test('taking the last dish to zero empties that kitchen’s ticket', async () => {
  const w = await openPage({ cart: basket({ 'k-night': NIGHT, 'k-cafe': CAFE }) });
  w.document.querySelector('#k-k-night [data-b="-1"]').click();
  w.document.querySelector('#k-k-night [data-b="-1"]').click();
  assert.equal(w.CabanaCart.group('k-night'), null);
  assert.equal(tickets(w).length, 1, 'the other kitchen stands');
});

/* ══════════════════════════════════════════════════════════════════════
   A TICKET A KITCHEN CAN ACT ON
   ══════════════════════════════════════════════════════════════════════ */

test('an order with no name and no number is not sent', async () => {
  const w = await openPage({ cart: basket({ 'k-night': NIGHT }) });
  assert.equal(w.detailsOk(), false);
  assert.equal(w.document.getElementById('dName').classList.contains('bad'), true);
});

test('a delivery with no address is not sent', async () => {
  const w = await openPage({ cart: basket({ 'k-night': NIGHT }),
    diner: { name: 'Wanjiru', phone: '0722000111', address: '' } });
  assert.equal(w.detailsOk(), false, 'a rider cannot find a blank');
  assert.equal(w.document.getElementById('dAddr').classList.contains('bad'), true);
});

test('a collection order needs no address at all', async () => {
  const pickup = { ...NIGHT, mode: 'pickup' };
  const w = await openPage({ cart: basket({ 'k-night': pickup }),
    diner: { name: 'Wanjiru', phone: '0722000111', address: '' } });
  assert.equal(w.document.getElementById('dAddr'), null, 'the field is not even asked for');
  assert.equal(w.detailsOk(), true);
});

test('a plausible set of details lets the ticket go', async () => {
  const w = await openPage({ cart: basket({ 'k-night': NIGHT }),
    diner: { name: 'Wanjiru', phone: '0722000111', address: 'Rose Ave, gate 4' } });
  assert.equal(w.detailsOk(), true);
});

test('a phone number too short to dial is refused', async () => {
  const w = await openPage({ cart: basket({ 'k-night': NIGHT }),
    diner: { name: 'Wanjiru', phone: '072', address: 'Rose Ave' } });
  assert.equal(w.detailsOk(), false);
  assert.equal(w.document.getElementById('dPhone').classList.contains('bad'), true);
});

test('the details are remembered so they are typed once, not once per kitchen', async () => {
  const w = await openPage({ cart: basket({ 'k-night': NIGHT, 'k-cafe': CAFE }),
    diner: { name: 'Wanjiru', phone: '0722000111', address: 'Rose Ave' } });
  assert.equal(w.document.getElementById('dName').value, 'Wanjiru');
  assert.equal(tickets(w).length, 2, 'two kitchens');
  assert.equal(w.document.querySelectorAll('#dName').length, 1, 'one set of details');
});

/* ══════════════════════════════════════════════════════════════════════
   WHAT THE KITCHEN RECEIVES
   ══════════════════════════════════════════════════════════════════════ */

test('the ticket carries the order, the total, and who to hand it to', async () => {
  const w = await openPage({ cart: basket({ 'k-night': NIGHT }),
    diner: { name: 'Wanjiru', phone: '0722000111', address: 'Rose Ave, gate 4' } });
  const t = w.CabanaCart.ticket('k-night');
  assert.match(t, /2 x Nyama Choma/);
  assert.match(t, /Food total: KES 1,500/);
  assert.match(t, /Delivery: KES 250/);
  assert.match(t, /Total: KES 1,750/);
  assert.match(t, /Name: Wanjiru/);
  assert.match(t, /Address: Rose Ave, gate 4/);
});

test('each kitchen’s send button points at that kitchen’s own number', async () => {
  const w = await openPage({ cart: basket({ 'k-night': NIGHT, 'k-cafe': CAFE }) });
  const links = [...w.document.querySelectorAll('a[href^="https://wa.me"]')]
    .map((a) => a.getAttribute('href'));
  assert.ok(links.some((h) => h.includes('254700000002')), 'the grill');
  assert.ok(links.some((h) => h.includes('254700000001')), 'the cafe');
});

test('a kitchen with no number is offered a copyable ticket instead of a dead end', async () => {
  const silent = { ...NIGHT, wa: '', ph: '' };
  const w = await openPage({ cart: basket({ 'k-night': silent }) });
  assert.ok(w.document.querySelector('[data-copy="k-night"]'));
  assert.match(text(w), /has not left a number yet/);
});

/* ══════════════════════════════════════════════════════════════════════
   HONEST WARNINGS, NEVER BLOCKERS
   ══════════════════════════════════════════════════════════════════════ */

test('an order under a kitchen’s minimum is flagged and still sendable', async () => {
  const small = { ...NIGHT, items: { 'i-ugali': { id: 'i-ugali', name: 'Ugali', price: 100, qty: 1 } } };
  const w = await openPage({ cart: basket({ 'k-night': small }) });
  assert.match(text(w), /minimum order of KES 700/);
  assert.match(text(w), /send it anyway and ask/, 'the kitchen decides, not the software');
  assert.ok(w.document.querySelector('a[href^="https://wa.me"]'), 'the button is still there');
});

test('a closed kitchen is named as closed and the order still stands', async () => {
  const w = await openPage({ cart: basket({ 'k-night': NIGHT }), hour: 4 });
  assert.match(text(w), /closed right now/i);
  assert.match(text(w), /Send it anyway/);
  assert.ok(w.document.querySelector('a[href^="https://wa.me"]'));
});

test('a kitchen that is open says so', async () => {
  const w = await openPage({ cart: basket({ 'k-night': NIGHT }), hour: 19 });
  assert.match(text(w), /Cooking now/);
});

/* ══════════════════════════════════════════════════════════════════════
   NOTES
   ══════════════════════════════════════════════════════════════════════ */

test('a note to one kitchen is kept against that kitchen only', async () => {
  const w = await openPage({ cart: basket({ 'k-night': NIGHT, 'k-cafe': CAFE }) });
  w.CabanaCart.setNote('k-night', 'No chilli please');
  assert.equal(w.CabanaCart.note('k-night'), 'No chilli please');
  assert.equal(w.CabanaCart.note('k-cafe'), '');
  assert.match(w.CabanaCart.ticket('k-night'), /Note: No chilli please/);
  assert.doesNotMatch(w.CabanaCart.ticket('k-cafe'), /No chilli/);
});
