/* ══════════════════════════════════════════════════════════════════════
   ONE RESTAURANT
   tests/restaurant-page.test.mjs

   The menu page is where an order is actually built, so what is
   asserted here is what a diner would notice going wrong: a dish that
   cannot be added, a quantity that does not stick, a total that
   disagrees with the menu, food from another kitchen leaking into this
   kitchen's ticket, or a restaurant's photographs sitting still when
   there are five of them to show.

   The slideshow is checked for the thing that is easy to get wrong
   rather than the thing that is easy to test: that a photograph which
   fails to load leaves the slideshow instead of becoming a blank frame
   the diner has to sit through.
   ══════════════════════════════════════════════════════════════════════ */
import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { JSDOM } from 'jsdom';

const ROOT = new URL('..', import.meta.url).pathname;
const read = (f) => readFileSync(join(ROOT, f), 'utf8');

const PAGE = read('restaurant.html');
const CART = read('cabana-cart.js');
const CART_UI = read('cabana-cart-ui.js');

const LISTING = {
  id: 'k-night', title: 'Choma Yard', city: 'Nairobi', area: 'Kilimani',
  street: 'Ngong Road', country: 'Kenya', service: 'food', is_active: true,
  description: 'Charcoal, goat and a long table.',
  photos: ['https://x/yard1.jpg', 'https://x/yard2.jpg', 'https://x/yard3.jpg'],
  contact_whatsapp: '+254700000002', contact_phone: '+254700000002'
};
const PROFILE = {
  listing_id: 'k-night', tagline: 'Goat over charcoal since 2009',
  cuisines: ['Grill', 'Nyama Choma'], currency: 'KES',
  hero_photo: 'https://x/hero.jpg', signature_dish: 'Half kilo goat',
  opens_at: '12:00', closes_at: '23:00',
  order_whatsapp: '+254700000002', order_phone: '+254700000002',
  delivery_fee: 250, min_order: 700, delivery_mins: 45, prep_mins: 30,
  serves_delivery: true, serves_pickup: true, serves_dine_in: true
};
const SECTIONS = [
  { id: 's2', listing_id: 'k-night', name: 'From the Grill', is_active: true, sort_order: 1 },
  { id: 's3', listing_id: 'k-night', name: 'Sides', is_active: true, sort_order: 2 }
];
const ITEMS = [
  { id: 'i-choma', listing_id: 'k-night', section_id: 's2', name: 'Nyama Choma',
    description: 'Half kilo goat, over charcoal', price: 900, promo_price: 750,
    photo: 'https://x/n.jpg', badge: null, is_available: true, prep_mins: 35,
    created_at: '2026-01-02T00:00:00Z' },
  { id: 'i-ribs', listing_id: 'k-night', section_id: 's2', name: 'Pork Ribs',
    price: 1100, photo: 'https://x/r.jpg', badge: 'chef', is_available: true,
    created_at: '2026-01-02T00:00:00Z' },
  { id: 'i-kachumbari', listing_id: 'k-night', section_id: 's3', name: 'Kachumbari',
    price: 150, photo: null, is_available: true, created_at: '2026-01-02T00:00:00Z' },
  { id: 'i-ugali', listing_id: 'k-night', section_id: null, name: 'Ugali',
    price: 100, is_available: true, created_at: '2026-01-02T00:00:00Z' }
];

const TABLES = {
  listings: LISTING, restaurant_profiles: PROFILE,
  menu_sections: SECTIONS, menu_items: ITEMS, restaurant_promos: []
};

function fakeSupabase(tables) {
  return {
    createClient() {
      return {
        from(name) {
          const rows = tables[name];
          const b = {
            _one: false,
            select: () => b, eq: () => b, is: () => b, in: () => b, order: () => b,
            maybeSingle() { b._one = true; return b; },
            then: (res, rej) => {
              const data = b._one ? (Array.isArray(rows) ? rows[0] : rows)
                                  : (Array.isArray(rows) ? rows : (rows ? [rows] : []));
              return Promise.resolve({ data, error: null }).then(res, rej);
            },
            catch: (fn) => Promise.resolve({ data: rows, error: null }).catch(fn)
          };
          return b;
        }
      };
    }
  };
}

const OPEN = [];
afterEach(() => { while (OPEN.length) OPEN.pop().close(); });

async function openPage({ tables = TABLES, hour = 19, seed = {} } = {}) {
  const inline = [...PAGE.matchAll(
    /<script(?![^>]*\bsrc=)(?![^>]*application\/ld\+json)[^>]*>([\s\S]*?)<\/script>/gi
  )].map((m) => m[1]).filter((s) => s.includes('CABANA · ONE RESTAURANT'))[0];
  assert.ok(inline, 'found the page script');

  const html = PAGE.replace(
    /<script(?![^>]*application\/ld\+json)[^>]*>[\s\S]*?<\/script>/gi, ''
  );

  const dom = new JSDOM(html, {
    url: 'https://cabana.africa/restaurant?id=k-night',
    runScripts: 'dangerously', pretendToBeVisual: true
  });
  OPEN.push(dom.window);
  const { window } = dom;

  for (const [k, v] of Object.entries(seed)) window.localStorage.setItem(k, v);

  const RealDate = window.Date;
  const base = new RealDate(2026, 5, 15, hour, 30, 0);
  class Fixed extends RealDate {
    constructor(...a) { return a.length ? new RealDate(...a) : new RealDate(base); }
    static now() { return base.getTime(); }
  }
  window.Date = Fixed;

  window.gtag = () => {};
  window.supabase = fakeSupabase(tables);
  window.Element.prototype.scrollIntoView = function () {};
  window.Element.prototype.scrollTo = function () {};
  window.Element.prototype.scrollBy = function () {};

  const run = (code) => {
    const s = window.document.createElement('script');
    s.textContent = code;
    window.document.body.appendChild(s);
  };
  run(CART);
  run(CART_UI);
  run(inline);

  for (let i = 0; i < 10; i++) await new Promise((r) => setTimeout(r, 0));
  return window;
}

const items = (w) => [...w.document.querySelectorAll('.it')];
const byName = (w, name) => items(w).find((el) => el.querySelector('.it-n').textContent.includes(name));

/* ══════════════════════════════════════════════════════════════════════
   THE MENU
   ══════════════════════════════════════════════════════════════════════ */

test('every dish on the menu is rendered, sections and strays alike', async () => {
  const w = await openPage();
  const shown = items(w).map((el) => el.querySelector('.it-n').textContent.trim());
  for (const it of ITEMS) assert.ok(shown.includes(it.name), `${it.name} is on the menu`);
});

test('a dish filed under no section still gets a home', async () => {
  const w = await openPage();
  assert.ok(byName(w, 'Ugali'), 'a dish cannot fall off the page for want of a section');
});

test('the sections the kitchen made become the menu’s own headings', async () => {
  const w = await openPage();
  const heads = [...w.document.querySelectorAll('.msec .mhead h2')].map((h) => h.textContent);
  assert.ok(heads.some((h) => h.includes('From the Grill')));
  assert.ok(heads.some((h) => h.includes('Sides')));
});

test('the kitchen’s facts are stated from its own profile', async () => {
  const w = await openPage();
  const t = w.document.getElementById('app').textContent;
  assert.match(t, /KES 100/, 'the cheapest dish sets the "from" price');
  assert.match(t, /45/, 'the delivery time the kitchen gave');
  assert.match(t, /Goat over charcoal since 2009/);
});

/* ══════════════════════════════════════════════════════════════════════
   THE HERO SLIDESHOW
   ══════════════════════════════════════════════════════════════════════ */

test('every photograph the restaurant has becomes a frame', async () => {
  const w = await openPage();
  const frames = w.document.querySelectorAll('.hero-fr');
  assert.equal(frames.length, 4, 'the hero photo plus three of the room');
  assert.equal(frames[0].classList.contains('on'), true, 'the first is showing');
});

test('the hero photo is not repeated when it is also a gallery photo', async () => {
  const dup = { ...TABLES, listings: { ...LISTING, photos: ['https://x/hero.jpg', 'https://x/yard2.jpg'] } };
  const w = await openPage({ tables: dup });
  const srcs = [...w.document.querySelectorAll('.hero-fr img')].map((i) => i.getAttribute('src'));
  assert.deepEqual(srcs, ['https://x/hero.jpg', 'https://x/yard2.jpg'],
    'a hero that is also the first gallery shot would otherwise fade to itself');
});

test('the frames are counted and dotted so a diner knows how many there are', async () => {
  const w = await openPage();
  assert.equal(w.document.getElementById('heroC').textContent, '1 / 4');
  assert.equal(w.document.querySelectorAll('.hero-dot').length, 4);
});

test('a dot moves the slideshow to that photograph', async () => {
  const w = await openPage();
  w.document.querySelectorAll('.hero-dot')[2].click();
  const frames = w.document.querySelectorAll('.hero-fr');
  assert.equal(frames[2].classList.contains('on'), true);
  assert.equal(frames[0].classList.contains('on'), false);
  assert.equal(w.document.getElementById('heroC').textContent, '3 / 4');
});

test('the slideshow wraps rather than stopping at the last photograph', async () => {
  const w = await openPage();
  w.goHero(3);
  w.goHero(4);
  assert.equal(w.document.querySelectorAll('.hero-fr')[0].classList.contains('on'), true);
});

test('a photograph that will not load leaves the slideshow', async () => {
  const w = await openPage();
  const second = w.document.querySelectorAll('.hero-fr')[1];
  w.dropFrame(second.querySelector('img'));
  assert.equal(w.document.querySelectorAll('.hero-fr').length, 3);
  assert.equal(w.document.querySelectorAll('.hero-dot').length, 3,
    'and takes its dot with it, so the count stays honest');
});

test('a restaurant with one photograph gets no dots and no cycling', async () => {
  const one = {
    ...TABLES,
    listings: { ...LISTING, photos: [] },
    restaurant_profiles: { ...PROFILE, hero_photo: 'https://x/only.jpg' },
    menu_items: ITEMS.map((i) => ({ ...i, photo: null }))
  };
  const w = await openPage({ tables: one });
  assert.equal(w.document.querySelectorAll('.hero-fr').length, 1);
  assert.equal(w.document.getElementById('heroDots'), null, 'nothing to page through');
});

test('a restaurant that only photographed its food still gets a slideshow', async () => {
  const foodOnly = {
    ...TABLES,
    listings: { ...LISTING, photos: [] },
    restaurant_profiles: { ...PROFILE, hero_photo: null }
  };
  const w = await openPage({ tables: foodOnly });
  const frames = w.document.querySelectorAll('.hero-fr');
  assert.ok(frames.length >= 2, 'the plates stand in for the room');
});

/* ══════════════════════════════════════════════════════════════════════
   THE GALLERY AT THE FOOT OF THE MENU
   ══════════════════════════════════════════════════════════════════════ */

test('the gallery sits below the menu, not above it', async () => {
  const w = await openPage();
  const app = w.document.getElementById('app');
  const gal = w.document.querySelector('.gal-wrap');
  assert.ok(gal, 'there is a gallery');
  const firstMenu = app.querySelector('.msec .mlist');
  assert.equal(
    firstMenu.compareDocumentPosition(gal) & w.Node.DOCUMENT_POSITION_FOLLOWING,
    w.Node.DOCUMENT_POSITION_FOLLOWING,
    'the food comes first; the room is what is left to decide'
  );
});

test('the gallery counts its photographs and offers a way through them', async () => {
  const w = await openPage();
  assert.match(w.document.getElementById('galC').textContent, /\/ \d+$/);
  assert.ok(w.document.querySelector('.gal-nav.prev'));
  assert.ok(w.document.querySelector('.gal-nav.next'));
  assert.doesNotThrow(() => w.galNudge(1));
});

/* ══════════════════════════════════════════════════════════════════════
   BUILDING AN ORDER
   ══════════════════════════════════════════════════════════════════════ */

test('the add button puts one dish in the order without opening anything', async () => {
  const w = await openPage();
  byName(w, 'Pork Ribs').querySelector('.it-add').click();
  const g = w.CabanaCart.group('k-night');
  assert.equal(g.count, 1);
  assert.equal(g.items[0].name, 'Pork Ribs');
  assert.equal(w.document.querySelector('.ov').classList.contains('on'), false,
    'no sheet was opened for a one-tap add');
});

test('adding twice makes two, and the card says so', async () => {
  const w = await openPage();
  byName(w, 'Pork Ribs').querySelector('.it-add').click();
  byName(w, 'Pork Ribs').querySelector('.it-add').click();
  assert.equal(w.CabanaCart.qty('k-night', 'i-ribs'), 2);
  assert.equal(w.document.querySelector('#dish-i-ribs .it-qty').textContent, '2');
});

test('the add button does not also open the dish sheet', async () => {
  const w = await openPage();
  let opened = false;
  const card = byName(w, 'Nyama Choma');
  card.addEventListener('click', (e) => { if (!e.defaultPrevented) opened = true; });
  card.querySelector('.it-add').click();
  assert.equal(opened, false);
});

test('tapping the card itself opens the dish', async () => {
  const w = await openPage();
  byName(w, 'Nyama Choma').querySelector('.it-hit').click();
  assert.equal(w.document.querySelector('.ov').classList.contains('on'), true);
  assert.match(w.document.getElementById('sh').textContent, /Nyama Choma/);
  assert.match(w.document.getElementById('sh').textContent, /Add to my order/);
});

test('a menu card puts no button inside another button', async () => {
  const w = await openPage();
  const hit = byName(w, 'Nyama Choma').querySelector('.it-hit');
  assert.equal(hit.querySelectorAll('button').length, 0);
  assert.ok(hit.getAttribute('aria-label'), 'the overlay target still announces itself');
});

test('the tray totals this kitchen at the prices on this menu', async () => {
  const w = await openPage();
  byName(w, 'Nyama Choma').querySelector('.it-add').click();   /* 750 on offer */
  byName(w, 'Ugali').querySelector('.it-add').click();         /* 100 */
  assert.equal(w.document.getElementById('trayN').textContent, '2 items');
  assert.equal(w.document.getElementById('trayV').textContent, 'KES 850');
  assert.equal(w.document.getElementById('tray').classList.contains('up'), true);
});

test('an order survives a reload of the menu page', async () => {
  const first = await openPage();
  byName(first, 'Nyama Choma').querySelector('.it-add').click();
  const saved = first.localStorage.getItem('cabana-cart');

  const again = await openPage({ seed: { 'cabana-cart': saved } });
  assert.equal(again.CabanaCart.qty('k-night', 'i-choma'), 1);
  assert.equal(again.document.getElementById('trayV').textContent, 'KES 750');
  assert.ok(again.document.querySelector('#dish-i-choma .it-qty'), 'the card remembers too');
});

test('clearing this kitchen does not touch food from another one', async () => {
  const w = await openPage();
  byName(w, 'Nyama Choma').querySelector('.it-add').click();
  w.CabanaCart.add({ id: 'k-cafe', name: 'Kahawa Corner', currency: 'KES' },
    { id: 'i-chai', name: 'Chai', price: 50 }, 2);

  w.emptyOrder();
  assert.equal(w.CabanaCart.group('k-night'), null);
  assert.equal(w.CabanaCart.qty('k-cafe', 'i-chai'), 2, 'the other kitchen is untouched');
});

/* ══════════════════════════════════════════════════════════════════════
   FOOD FROM ELSEWHERE IS NEVER A SURPRISE
   ══════════════════════════════════════════════════════════════════════ */

test('the tray says when there is food from another kitchen in the order', async () => {
  const w = await openPage();
  byName(w, 'Ugali').querySelector('.it-add').click();
  w.CabanaCart.add({ id: 'k-cafe', name: 'Kahawa Corner', currency: 'KES' },
    { id: 'i-chai', name: 'Chai', price: 50 }, 2);

  const el = w.document.getElementById('trayElse');
  assert.equal(el.hidden, false);
  assert.match(el.textContent, /2 items from 1 other kitchen/);
  assert.ok(el.querySelector('a[href^="/checkout"]'), 'and offers the way through it');
});

test('the tray stays quiet when the order is all from this kitchen', async () => {
  const w = await openPage();
  byName(w, 'Ugali').querySelector('.it-add').click();
  assert.equal(w.document.getElementById('trayElse').hidden, true);
});

test('this kitchen’s ticket never carries another kitchen’s food', async () => {
  const w = await openPage();
  byName(w, 'Nyama Choma').querySelector('.it-add').click();
  w.CabanaCart.add({ id: 'k-cafe', name: 'Kahawa Corner', currency: 'KES' },
    { id: 'i-chai', name: 'Chai', price: 50 }, 2);

  const ticket = w.CabanaCart.ticket('k-night');
  assert.match(ticket, /Nyama Choma/);
  assert.doesNotMatch(ticket, /Chai/);
  assert.match(ticket, /Food total: KES 750/);
});

test('the WhatsApp link on the review sheet carries this kitchen’s ticket', async () => {
  const w = await openPage();
  byName(w, 'Nyama Choma').querySelector('.it-add').click();
  const link = w.waLink('+254700000002', { v: 750 });
  assert.match(link, /wa\.me\/254700000002/);
  assert.match(decodeURIComponent(link), /Nyama Choma/);
});

/* ══════════════════════════════════════════════════════════════════════
   THE ORDER OUTLIVES THE PAGE IT WAS STARTED ON
   ══════════════════════════════════════════════════════════════════════ */

test('an order started on the food page is already here on arrival', async () => {
  const seeded = JSON.stringify({
    v: 1, t: Date.now(),
    kitchens: {
      'k-night': {
        id: 'k-night', name: 'Choma Yard', currency: 'KES', t: Date.now(),
        items: { 'i-choma': { id: 'i-choma', name: 'Nyama Choma', price: 900, promo_price: 750, qty: 3 } }
      }
    }
  });
  const w = await openPage({ seed: { 'cabana-cart': seeded } });
  assert.equal(w.document.getElementById('trayV').textContent, 'KES 2,250');
  assert.equal(w.document.querySelector('#dish-i-choma .it-qty').textContent, '3');
});

test('a card is repainted when the order changes in another tab', async () => {
  const w = await openPage();
  w.CabanaCart.add({ id: 'k-night', name: 'Choma Yard', currency: 'KES' },
    { id: 'i-ribs', name: 'Pork Ribs', price: 1100 }, 4);
  assert.equal(w.document.querySelector('#dish-i-ribs .it-qty').textContent, '4');
});

/* ══════════════════════════════════════════════════════════════════════
   WHEN THERE IS NO MENU
   ══════════════════════════════════════════════════════════════════════ */

test('a kitchen with no menu says so rather than showing an empty page', async () => {
  const w = await openPage({ tables: { ...TABLES, menu_items: [] } });
  const t = w.document.getElementById('app').textContent;
  assert.match(t, /The menu is not up yet/);
  assert.match(t, /Message the kitchen/, 'and still offers a way to reach them');
});
