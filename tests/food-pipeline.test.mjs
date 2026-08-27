/* ══════════════════════════════════════════════════════════════════════
   THE FOOD PIPELINE
   tests/food-pipeline.test.mjs

   No kitchen has published a menu yet, so the only way to know the food
   page works is to hand it a menu and watch what it does. These tests
   stand a fake Supabase in front of the real page script and assert on
   the DOM that comes out the other side.

   Two things are being protected. First, that a dish published by a
   kitchen actually reaches the page, priced correctly, linked to the
   right menu, and addable to an order. Second — and this is the one
   that is easy to get wrong — that the page's opinion about the hour
   stays an opinion: breakfast may be sorted to the front at eight in
   the morning, but nyama choma must still be on the page, reachable,
   and never quietly filtered out.
   ══════════════════════════════════════════════════════════════════════ */
import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { JSDOM } from 'jsdom';

const ROOT = new URL('..', import.meta.url).pathname;
const read = (f) => readFileSync(join(ROOT, f), 'utf8');

const PAGE = read('food.html');
const CART = read('cabana-cart.js');
const CART_UI = read('cabana-cart-ui.js');

/* ── fixtures ──────────────────────────────────────────────────────────
   One kitchen that only does breakfast, one that only does dinner, so
   whichever hour a test pins the clock to, there is always food that
   belongs and food that does not. */
const LISTINGS = [
  { id: 'k-morning', title: 'Kahawa Corner', city: 'Nairobi', area: 'Westlands',
    service: 'food', is_active: true, photos: ['https://x/cafe.jpg'],
    created_at: '2026-01-01T00:00:00Z', contact_whatsapp: '+254700000001' },
  { id: 'k-night', title: 'Choma Yard', city: 'Nairobi', area: 'Kilimani',
    service: 'food', is_active: true, photos: ['https://x/grill.jpg'],
    created_at: '2026-01-02T00:00:00Z', contact_whatsapp: '+254700000002' }
];
const PROFILES = [
  { listing_id: 'k-morning', cuisines: ['Cafe', 'Bakery'], currency: 'KES',
    opens_at: '06:00', closes_at: '18:00', hero_photo: 'https://x/cafe.jpg',
    order_whatsapp: '+254700000001', delivery_fee: 150, min_order: 500,
    serves_delivery: true, serves_pickup: true, serves_dine_in: true },
  { listing_id: 'k-night', cuisines: ['Grill', 'Nyama Choma'], currency: 'KES',
    opens_at: '12:00', closes_at: '23:00', hero_photo: 'https://x/grill.jpg',
    order_whatsapp: '+254700000002', delivery_fee: 250,
    serves_delivery: true, serves_pickup: true, serves_dine_in: true }
];
const SECTIONS = [
  { id: 's1', listing_id: 'k-morning', name: 'Breakfast', is_active: true, sort_order: 1 },
  { id: 's2', listing_id: 'k-night', name: 'From the Grill', is_active: true, sort_order: 1 }
];
const ITEMS = [
  { id: 'i-mandazi', listing_id: 'k-morning', section_id: 's1', name: 'Mandazi',
    description: 'Three, still warm', price: 60, promo_price: null, photo: 'https://x/m.jpg',
    badge: null, tags: ['breakfast'], is_available: true, created_at: '2026-01-01T00:00:00Z' },
  { id: 'i-chai', listing_id: 'k-morning', section_id: 's1', name: 'Chai ya Maziwa',
    price: 50, photo: 'https://x/c.jpg', badge: 'favourite', tags: [],
    is_available: true, created_at: '2026-01-01T00:00:00Z' },
  { id: 'i-eggs', listing_id: 'k-morning', section_id: 's1', name: 'Omelette',
    price: 250, photo: 'https://x/e.jpg', is_available: true, created_at: '2026-01-01T00:00:00Z' },
  { id: 'i-choma', listing_id: 'k-night', section_id: 's2', name: 'Nyama Choma',
    description: 'Half kilo goat, over charcoal', price: 900, promo_price: 750,
    photo: 'https://x/n.jpg', badge: null, tags: ['grill'],
    is_available: true, created_at: '2026-01-02T00:00:00Z' },
  { id: 'i-ribs', listing_id: 'k-night', section_id: 's2', name: 'Pork Ribs',
    price: 1100, photo: 'https://x/r.jpg', is_available: true, created_at: '2026-01-02T00:00:00Z' },
  { id: 'i-kachumbari', listing_id: 'k-night', section_id: 's2', name: 'Kachumbari',
    price: 150, photo: 'https://x/k.jpg', is_available: true, created_at: '2026-01-02T00:00:00Z' }
];
const PROMOS = [];

const TABLES = {
  listings: LISTINGS, restaurant_profiles: PROFILES,
  menu_items: ITEMS, restaurant_promos: PROMOS, menu_sections: SECTIONS
};

/* ── a Supabase that answers from the fixtures ─────────────────────── */
function fakeSupabase(tables) {
  return {
    createClient() {
      return {
        from(name) {
          const rows = tables[name] || [];
          const b = {
            select: () => b, eq: () => b, is: () => b, in: () => b,
            order: () => b, maybeSingle: () => b,
            then: (res, rej) => Promise.resolve({ data: rows, error: null }).then(res, rej),
            catch: (fn) => Promise.resolve({ data: rows, error: null }).catch(fn)
          };
          return b;
        }
      };
    }
  };
}

/* The page sets intervals to notice the hour turning over. Left
   running they hold the test process open, so every window built here
   is torn down as soon as its test is done. */
const OPEN = [];
afterEach(() => { while (OPEN.length) OPEN.pop().close(); });

/* ── stand the page up at a chosen hour ────────────────────────────── */
async function openPage({ hour = 9, tables = TABLES } = {}) {
  /* Take every script out of the markup: the ones with a src point at
     files jsdom will not fetch, and the page's own script must not run
     until a Supabase and a clock are standing behind it. They go back
     in below, in order, as real script elements — which matters,
     because the page script is strict mode, and a strict script only
     publishes its functions globally when it is a script rather than
     an eval. */
  const inline = [...PAGE.matchAll(
    /<script(?![^>]*\bsrc=)(?![^>]*application\/ld\+json)[^>]*>([\s\S]*?)<\/script>/gi
  )].map((m) => m[1]).filter((s) => s.includes('CABANA · FOOD'))[0];
  assert.ok(inline, 'found the page script');

  const html = PAGE.replace(
    /<script(?![^>]*application\/ld\+json)[^>]*>[\s\S]*?<\/script>/gi, ''
  );

  const dom = new JSDOM(html, {
    url: 'https://cabana.africa/food',
    runScripts: 'dangerously',
    pretendToBeVisual: true
  });
  OPEN.push(dom.window);
  const { window } = dom;

  /* pin the clock so "which meal is it" is a decision, not a coin toss */
  const RealDate = window.Date;
  const base = new RealDate(2026, 5, 15, hour, 30, 0);
  class Fixed extends RealDate {
    constructor(...a) { return a.length ? new RealDate(...a) : new RealDate(base); }
    static now() { return base.getTime(); }
  }
  window.Date = Fixed;

  window.gtag = () => {};
  window.supabase = fakeSupabase(tables);
  window.matchMedia = window.matchMedia || (() => ({ matches: false, addListener() {}, removeListener() {} }));

  const run = (code) => {
    const s = window.document.createElement('script');
    s.textContent = code;
    window.document.body.appendChild(s);
  };
  run(CART);
  run(CART_UI);
  run(inline);              /* ends by calling boot() */

  /* let the fixture promises settle and the grid paint */
  for (let i = 0; i < 8; i++) await new Promise((r) => setTimeout(r, 0));
  return window;
}

const cards = (w) => [...w.document.querySelectorAll('#grid .dish')];
const names = (w) => cards(w).map((c) => c.querySelector('.dish-n')?.textContent.trim());

/* ══════════════════════════════════════════════════════════════════════
   THE PAGE IS ABOUT FOOD
   ══════════════════════════════════════════════════════════════════════ */

test('the main grid is dishes, not restaurants', async () => {
  const w = await openPage();
  assert.equal(w.document.querySelectorAll('#grid .kit').length, 0, 'no kitchen cards in the grid');
  assert.ok(cards(w).length > 0, 'dish cards instead');
});

test('every published dish reaches the page', async () => {
  const w = await openPage();
  const shown = names(w);
  for (const it of ITEMS) {
    assert.ok(shown.includes(it.name), `${it.name} is on the page`);
  }
  assert.equal(shown.length, ITEMS.length);
});

test('a dish card carries the kitchen that cooks it', async () => {
  const w = await openPage();
  const choma = cards(w).find((c) => c.querySelector('.dish-n').textContent.includes('Nyama Choma'));
  assert.equal(choma.querySelector('.dish-from').textContent.trim(), 'Choma Yard');
});

test('a dish links through to its kitchen’s menu, at that dish', async () => {
  const w = await openPage();
  const choma = cards(w).find((c) => c.querySelector('.dish-n').textContent.includes('Nyama Choma'));
  assert.equal(choma.querySelector('.dish-hit').getAttribute('href'),
    'restaurant.html?id=k-night#dish-i-choma');
});

test('the link over a dish card is a real anchor, and carries no button inside it', async () => {
  const w = await openPage();
  const card = cards(w)[0];
  const hit = card.querySelector('.dish-hit');
  assert.equal(hit.tagName, 'A', 'crawlers and right-clicks still see an href');
  assert.equal(hit.querySelectorAll('button').length, 0,
    'a button inside a link is neither valid nor operable by keyboard');
  assert.ok(hit.getAttribute('aria-label'), 'and the bare anchor still has a name');
});

test('a promotional price is shown struck through, at the price actually charged', async () => {
  const w = await openPage();
  const choma = cards(w).find((c) => c.querySelector('.dish-n').textContent.includes('Nyama Choma'));
  const price = choma.querySelector('.dish-pr').textContent;
  assert.match(price, /900/, 'the old price is still visible');
  assert.match(price, /750/, 'the promotional price is there too');
  assert.ok(choma.querySelector('.dish-pr s'), 'the old price is struck through');
});

/* ══════════════════════════════════════════════════════════════════════
   THE HOUR SORTS. IT DOES NOT FILTER.
   This is the promise that matters most: being strategic about the
   time must never become hiding food from somebody who wants it.
   ══════════════════════════════════════════════════════════════════════ */

test('at breakfast the breakfast dishes come first', async () => {
  const w = await openPage({ hour: 8 });
  const shown = names(w);
  const firstGrill = Math.min(shown.indexOf('Nyama Choma'), shown.indexOf('Pork Ribs'));
  const lastBreakfast = Math.max(shown.indexOf('Mandazi'), shown.indexOf('Chai ya Maziwa'));
  assert.ok(lastBreakfast < firstGrill,
    `breakfast should outrank the grill at 8am — got ${shown.join(', ')}`);
});

test('at dinner the grill comes first', async () => {
  const w = await openPage({ hour: 19 });
  const shown = names(w);
  const firstGrill = Math.min(shown.indexOf('Nyama Choma'), shown.indexOf('Pork Ribs'));
  const firstBreakfast = Math.min(shown.indexOf('Mandazi'), shown.indexOf('Omelette'));
  assert.ok(firstGrill < firstBreakfast,
    `the grill should outrank breakfast at 7pm — got ${shown.join(', ')}`);
});

test('nyama choma is still on the page at eight in the morning', async () => {
  const w = await openPage({ hour: 8 });
  const shown = names(w);
  assert.ok(shown.includes('Nyama Choma'), 'sorted down, never removed');
  assert.ok(shown.includes('Pork Ribs'));
  assert.equal(shown.length, ITEMS.length, 'the hour removed nothing at all');
});

test('mandazi is still on the page at eleven at night', async () => {
  const w = await openPage({ hour: 23 });
  const shown = names(w);
  assert.ok(shown.includes('Mandazi'));
  assert.equal(shown.length, ITEMS.length);
});

test('the page says which meal it sorted for, and that it only sorted', async () => {
  const w = await openPage({ hour: 8 });
  const say = w.document.getElementById('dishSay').textContent;
  assert.match(say, /breakfast/i, 'it names the meal it chose');
    assert.match(say, /not filtered by it/i, 'and is explicit that nothing was removed');
});

test('choosing another meal re-sorts without dropping anything', async () => {
  const w = await openPage({ hour: 8 });
  w.setMeal('evening');
  const shown = names(w);
  assert.equal(shown.length, ITEMS.length, 'still every dish');
  const firstGrill = Math.min(shown.indexOf('Nyama Choma'), shown.indexOf('Pork Ribs'));
  const firstBreakfast = Math.min(shown.indexOf('Mandazi'), shown.indexOf('Chai ya Maziwa'));
  assert.ok(firstGrill < firstBreakfast, 'asked for dinner, given dinner first');
});

test('the meal chips offer the clock’s choice plus every meal with real food', async () => {
  const w = await openPage({ hour: 8 });
  const chips = [...w.document.querySelectorAll('#hours .hr')].map((b) => b.textContent.trim());
  assert.ok(chips.some((c) => /Right now/i.test(c)), 'the clock’s own choice is offered');
  assert.ok(chips.some((c) => /Breakfast/i.test(c)));
  assert.ok(chips.some((c) => /Dinner/i.test(c)));
});

/* ══════════════════════════════════════════════════════════════════════
   THE BELT
   ══════════════════════════════════════════════════════════════════════ */

test('the belt runs on the photographs the kitchens supplied', async () => {
  const w = await openPage();
  const belt = w.document.getElementById('belt');
  assert.equal(belt.hidden, false, 'six photographed dishes is enough for a belt');
  assert.ok(w.document.querySelectorAll('#beltA .plate').length > 0);
  assert.ok(w.document.querySelectorAll('#beltB .plate').length > 0);
});

test('each belt lane prints its run twice so the loop has no seam', async () => {
  const w = await openPage();
  const lane = w.document.querySelectorAll('#beltA .plate');
  const hrefs = [...lane].map((a) => a.getAttribute('href'));
  const half = hrefs.length / 2;
  assert.equal(hrefs.length % 2, 0, 'an even number of tiles');
  assert.deepEqual(hrefs.slice(0, half), hrefs.slice(half),
    'the second half is the first half again, so -50% lands exactly');
});

test('a short menu still fills the belt, by cycling its own plates', async () => {
  /* six photographed dishes is the minimum a belt runs on, and six
     tiles would leave a gap on a wide screen halfway through the loop */
  const w = await openPage();
  const perLane = w.document.querySelectorAll('#beltA .plate').length / 2;
  assert.ok(perLane >= 12, `a lane needs enough tiles to outrun the viewport, got ${perLane}`);
});

test('the two lanes run at different speeds so they never lock together', async () => {
  const w = await openPage();
  const a = w.document.querySelector('#beltA .belt-run').style.getPropertyValue('--belt-dur');
  const b = w.document.querySelector('#beltB .belt-run').style.getPropertyValue('--belt-dur');
  assert.ok(a && b, 'both lanes are paced');
  assert.notEqual(a, b);
});

test('the belt hides itself rather than running on nothing', async () => {
  const bare = { ...TABLES, menu_items: ITEMS.slice(0, 2).map((i) => ({ ...i, photo: null })) };
  const w = await openPage({ tables: bare });
  assert.equal(w.document.getElementById('belt').hidden, true);
});

test('belt tiles are hidden from screen readers, since the grid says it all', async () => {
  const w = await openPage();
  const tile = w.document.querySelector('#beltA .plate');
  assert.equal(tile.getAttribute('aria-hidden'), 'true');
  assert.equal(tile.getAttribute('tabindex'), '-1');
});

/* ══════════════════════════════════════════════════════════════════════
   ADDING TO AN ORDER FROM THE FOOD PAGE
   ══════════════════════════════════════════════════════════════════════ */

test('a dish card can be added to the order without leaving the page', async () => {
  const w = await openPage();
  const card = cards(w).find((c) => c.querySelector('.dish-n').textContent.includes('Nyama Choma'));
  card.querySelector('.dish-add').click();

  const g = w.CabanaCart.group('k-night');
  assert.ok(g, 'the kitchen is in the order');
  assert.equal(g.items[0].name, 'Nyama Choma');
  assert.equal(g.items[0].qty, 1);
  assert.equal(g.subtotal, 750, 'charged at the promotional price');
});

test('adding carries the kitchen’s contact details, so the order can be sent from anywhere', async () => {
  const w = await openPage();
  const card = cards(w).find((c) => c.querySelector('.dish-n').textContent.includes('Mandazi'));
  card.querySelector('.dish-add').click();

  const g = w.CabanaCart.group('k-morning');
  assert.equal(g.name, 'Kahawa Corner');
  assert.equal(g.wa, '+254700000001');
  assert.equal(g.delivery_fee, 150);
  assert.equal(g.min_order, 500);
  assert.ok(w.CabanaCart.waLink('k-morning'), 'a ticket can be built straight away');
});

test('the add button shows the quantity once a dish is in the order', async () => {
  const w = await openPage();
  const card = cards(w).find((c) => c.querySelector('.dish-n').textContent.includes('Pork Ribs'));
  card.querySelector('.dish-add').click();
  card.querySelector('.dish-add').click();
  const btn = w.document.querySelector('.dish[data-dish="i-ribs"] .dish-add');
  assert.equal(btn.textContent.trim(), '2');
  assert.ok(btn.classList.contains('in'));
});

test('adding a dish does not follow the card’s link', async () => {
  const w = await openPage();
  const card = cards(w)[0];
  let navigated = false;
  card.addEventListener('click', (e) => { if (!e.defaultPrevented) navigated = true; });
  card.querySelector('.dish-add').click();
  assert.equal(navigated, false, 'the click was stopped before the browser followed the href');
});

test('dishes from two kitchens sit in one order as two tickets', async () => {
  const w = await openPage();
  cards(w).find((c) => c.querySelector('.dish-n').textContent.includes('Mandazi'))
    .querySelector('.dish-add').click();
  cards(w).find((c) => c.querySelector('.dish-n').textContent.includes('Nyama Choma'))
    .querySelector('.dish-add').click();

  const t = w.CabanaCart.totals();
  assert.equal(t.kitchens, 2);
  assert.equal(t.count, 2);
  assert.equal(t.subtotal, 810, '60 mandazi + 750 choma');
  assert.doesNotMatch(w.CabanaCart.ticket('k-morning'), /Nyama Choma/);
});

test('the cart badge counts what is in the order', async () => {
  const w = await openPage();
  const badge = w.document.querySelector('[data-cart-count]');
  assert.equal(badge.classList.contains('on'), false, 'hidden while empty');
  cards(w)[0].querySelector('.dish-add').click();
  assert.equal(badge.textContent, '1');
  assert.equal(badge.classList.contains('on'), true);
});

/* ══════════════════════════════════════════════════════════════════════
   SEARCH, CRAVINGS AND EMPTY STATES
   ══════════════════════════════════════════════════════════════════════ */

test('search reaches dish names, not only restaurant names', async () => {
  const w = await openPage();
  w.document.getElementById('hunt').value = 'kachumbari';
  w.redraw();
  const shown = names(w);
  assert.deepEqual(shown, ['Kachumbari']);
});

test('search also reaches the kitchen, so a place name still works', async () => {
  const w = await openPage();
  w.document.getElementById('hunt').value = 'choma yard';
  w.redraw();
  assert.equal(names(w).length, 3, 'every dish from that kitchen');
});

test('a search with no answer says so and offers a way back', async () => {
  const w = await openPage();
  w.document.getElementById('hunt').value = 'sushi';
  w.redraw();
  const g = w.document.getElementById('grid');
  assert.match(g.textContent, /Nothing matches that yet/);
  assert.equal(cards(w).length, 0);
});

test('the kitchens remain reachable as a second way in', async () => {
  const w = await openPage();
  const sec = w.document.getElementById('kitSec');
  assert.equal(sec.hidden, false);
  const kits = w.document.querySelectorAll('#kitGrid .kit');
  assert.equal(kits.length, 2);
  assert.equal(kits[0].getAttribute('href').startsWith('restaurant.html?id='), true);
});

/* ══════════════════════════════════════════════════════════════════════
   THE PIPELINE WITH NOTHING IN IT
   This is today's reality: kitchens may exist before menus do, and no
   menus may exist at all. Neither case may invent food to fill a gap.
   ══════════════════════════════════════════════════════════════════════ */

test('no kitchens at all: the page says so and asks for the first one', async () => {
  const w = await openPage({ tables: { ...TABLES, listings: [], menu_items: [], menu_sections: [] } });
  const g = w.document.getElementById('grid');
  assert.match(g.textContent, /No kitchen has opened here yet/);
  assert.equal(w.document.getElementById('belt').hidden, true);
  assert.equal(w.document.getElementById('kitSec').hidden, true);
  assert.doesNotMatch(g.textContent, /Nyama Choma/, 'nothing invented to fill the space');
});

test('kitchens but no menus: the page waits rather than inventing dishes', async () => {
  const w = await openPage({ tables: { ...TABLES, menu_items: [] } });
  const g = w.document.getElementById('grid');
  assert.match(g.textContent, /The kitchens are here/);
  assert.equal(cards(w).length, 0);
  assert.equal(w.document.getElementById('kitSec').hidden, false,
    'the kitchens themselves are still offered');
});

test('a dish with no photograph still gets a card and a price', async () => {
  const noPic = ITEMS.map((i) => ({ ...i, photo: null }));
  const w = await openPage({ tables: { ...TABLES, menu_items: noPic } });
  assert.equal(cards(w).length, ITEMS.length);
  assert.ok(w.document.querySelector('#grid .dish-none'), 'a drawn mark stands in for the photograph');
});
