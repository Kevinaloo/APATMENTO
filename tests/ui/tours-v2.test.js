/* ═══════════════════════════════════════════════════════════════════════════
   CABANA TOURS v2 · BROWSER TESTS
   ─────────────────────────────────────────────────────────────────────────
   Drives the four tours pages in real Chromium against
   tests/ui/stub-server.js, with Playwright answering Supabase from fixtures
   so the assertions are about behaviour, not about what happens to be
   published today. Dates in the fixtures are relative to now.

   What this suite holds in place:

     SPOTLIGHT  Never empty. With no data at all Cabana's own slides run;
                the arrows move it; reduced motion keeps it still.

     BOARD      Only departures inside thirty days, never a full one, never
                an on-request tour, and the clocks actually tick. With no
                departures the board says so instead of showing a blank rail.

     SAVES      A heart is a real save: pressed state, the header counter
                and local storage all agree after one tap.

     BOOKING    Deep links open the right sheet; the booking modal never
                offers a full departure; a signed-out guest who tries to pay
                is sent to sign in and brought back to this tour.

     PAGES      Catalogue filters come from the URL, the guides directory
                renders, the studio asks a stranger to sign in, and nothing
                scrolls sideways on a phone.

   Run:  ./tests/ui/run-tours-v2.sh
   ═══════════════════════════════════════════════════════════════════════════ */

import path from 'node:path';
import { pathToFileURL } from 'node:url';

const PORT = Number(process.env.UI_TEST_PORT || 8899);
const BASE = 'http://localhost:' + PORT;

let chromium;
try {
  const spec = process.env.PW_PATH
    ? pathToFileURL(path.join(process.env.PW_PATH, 'index.mjs')).href
    : 'playwright';
  ({ chromium } = await import(spec));
} catch (e) {
  console.error('playwright not available:', e.message);
  console.error('Run tests/ui/run-tours-v2.sh, which installs it.');
  process.exit(2);
}
const CHROME = process.env.PW_CHROMIUM || undefined;

const cors = () => ({
  'access-control-allow-origin': '*',
  'access-control-allow-headers': '*',
  'access-control-allow-methods': '*',
  'access-control-expose-headers': 'content-range'
});

/* ── fixtures ─────────────────────────────────────────────────────────── */

const op = (id, name, persona) => ({
  operator_id: id, operator_name: name, operator_persona: persona, operator_verified: true,
  operator_kind: 'partner', operator_county: 'Nairobi', operator_slug: name.toLowerCase().replace(/\W+/g, '-')
});
const tour = (id, over) => Object.assign({
  id, title: 'Tour ' + id, summary: 'A tour.', destination: 'Nairobi', county: 'Nairobi', days: 1,
  duration_label: '4 hours', price_kes: 5000, price_basis: 'per_person', deposit_pct: 30,
  group_min: 1, group_max: 8, spots_total: 8, departure_days: [], departure_time: '07:00:00',
  booking_cutoff_hours: 12, cover_url: null, photos: [], videos: [], tags: [], featured: false, sort_weight: 0
}, op(4, 'Savanna Trails', 'guide'), over);

const TOURS = [
  tour(201, { title: 'Dawn Game Drive', category: 'day-safari', schedule_type: 'daily' }),
  tour(202, { title: 'Street Food Walk', category: 'city-tour', schedule_type: 'weekly', departure_days: ['sat'], price_kes: 2500 }),
  tour(203, { title: 'Kibera Music Walk', category: 'culture', schedule_type: 'weekly', departure_days: ['wed'], destination: 'Kibera', price_kes: 0 }),
  tour(204, { title: 'Mount Kenya Trek', category: 'expedition', schedule_type: 'on_request', days: 5, price_kes: 85000 }),
  tour(205, { title: 'Far Future Safari', category: 'big-safari', schedule_type: 'fixed', days: 3, price_kes: 48000 })
];

const DAY = 864e5;
const iso = d => new Date(d).toISOString().slice(0, 10);
function departures() {
  const out = [];
  const add = (id, inDays, seats = 5) => {
    const on = iso(Date.now() + inDays * DAY);
    out.push({
      tour_id: id, departs_on: on,
      departs_at: new Date(Date.parse(on + 'T07:00:00+03:00')).toISOString(),
      closes_at: new Date(Date.parse(on + 'T00:00:00+03:00') - 12 * 3600e3).toISOString(),
      seats_left: seats, seats_total: 8
    });
  };
  // 201 runs daily; the first one is full and must never be offered.
  add(201, 2, 0); add(201, 3); add(201, 4); add(201, 5);
  // 202 runs on Saturdays; its first one is full too, so the booking
  // modal has to skip it when it picks a date for the guest.
  add(202, 6, 0); add(202, 13); add(202, 20);
  add(203, 8);
  // Outside the thirty-day window: loaded, but not on the board.
  add(205, 45);
  return out.sort((a, b) => a.departs_at.localeCompare(b.departs_at));
}

const GUIDES = [
  { id: 4, slug: 'savanna-trails', name: 'Savanna Trails', tagline: 'Dawn drives.', county: 'Nairobi', kind: 'partner', persona: 'guide', verified: true, tours: 3, from_kes: 2500, languages: ['English'], places: ['Nairobi'], messageable: true },
  { id: 5, slug: 'rift-rovers', name: 'Rift Rovers', tagline: 'Naivasha.', county: 'Nakuru', kind: 'partner', persona: 'operator', verified: true, tours: 1, from_kes: 48000, languages: ['English'], places: ['Naivasha'], messageable: true }
];

/* ── harness ──────────────────────────────────────────────────────────── */

const results = [];
function check(name, pass, detail) {
  results.push({ name, pass: !!pass, detail });
  console.log(`${pass ? 'ok  ' : 'FAIL'}  ${name}${pass || !detail ? '' : '  → ' + detail}`);
}

async function visit(browser, url, opts = {}) {
  const ctx = await browser.newContext({
    viewport: opts.mobile ? { width: 390, height: 844 } : { width: 1280, height: 860 },
    isMobile: !!opts.mobile, hasTouch: !!opts.mobile,
    reducedMotion: opts.reduced ? 'reduce' : 'no-preference'
  });
  const page = await ctx.newPage();
  if (opts.signed) {
    // A stored session the way ApaSession keeps one. Nothing here is
    // verified server-side: every Supabase call is answered by the stub.
    await page.addInitScript(() => {
      const b64 = o => btoa(JSON.stringify(o)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
      const exp = Math.floor(Date.now() / 1000) + 86400;
      const user = { id: '00000000-0000-4000-8000-000000000001', email: 'guest@example.com', aud: 'authenticated', role: 'authenticated', user_metadata: {}, app_metadata: {} };
      const tok = b64({ alg: 'HS256', typ: 'JWT' }) + '.' + b64({ sub: user.id, exp, role: 'authenticated', email: user.email, aud: 'authenticated' }) + '.sig';
      localStorage.setItem('apa-auth', JSON.stringify({ access_token: tok, refresh_token: 'r', token_type: 'bearer', expires_in: 86400, expires_at: exp, user }));
    });
  }
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  const empty = !!opts.empty;
  await page.route('**://*.supabase.co/**', r => {
    const u = r.request().url();
    if (r.request().method() === 'OPTIONS') return r.fulfill({ status: 204, headers: cors() });
    let body = [];
    if (/tours_public/.test(u)) body = empty ? [] : TOURS;
    else if (/rpc\/tour_departures/.test(u)) body = empty ? [] : departures();
    else if (/rpc\/tour_guides_directory/.test(u)) body = empty ? [] : GUIDES;
    else if (/rpc\/tour_spotlight_feed/.test(u)) body = [];
    else if (/rpc\/immersive_state/.test(u)) body = { open: true, trial: true, banner: { enabled: false } };
    else if (/\/auth\/v1\//.test(u)) body = {};
    return r.fulfill({ status: 200, headers: Object.assign({ 'content-type': 'application/json' }, cors()), body: JSON.stringify(body) });
  });
  // Nothing outside the stub server and Supabase: fonts, analytics, maps.
  await page.route(/^https?:\/\/(?!localhost)(?!.*supabase\.co)/, r => r.fulfill({ status: 204, body: '' }));
  await page.goto(BASE + url, { waitUntil: 'load' });
  await page.waitForTimeout(opts.wait || 6500);
  return { page, ctx, errors };
}

const overflow = page => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
const activeSlide = page => page.evaluate(() => {
  const s = document.querySelector('#ct-spotlight .ct-slide.is-on');
  return s ? s.getAttribute('data-i') : null;
});

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });

  // ── SPOTLIGHT + BOARD, with data ──────────────────────────────────────
  {
    const { page, ctx, errors } = await visit(browser, '/tours.html');
    const s = await page.evaluate(() => ({
      gate: !!document.getElementById('jungle-gate'),
      slides: document.querySelectorAll('#ct-spotlight .ct-slide').length,
      on: document.querySelectorAll('#ct-spotlight .ct-slide.is-on').length,
      passes: Array.from(document.querySelectorAll('#ct-dep-rail .ct-pass')).map(p => ({ id: p.getAttribute('data-tour'), date: p.getAttribute('data-date') }))
    }));
    check('gate clears on its own', !s.gate);
    check('no page errors on the home page', errors.length === 0, errors.join('; '));
    check('spotlight has slides and exactly one showing', s.slides >= 3 && s.on === 1, JSON.stringify(s));

    const before = await activeSlide(page);
    await page.click('#ct-spotlight [data-sl="next"]');
    await page.waitForTimeout(1400);
    const after = await activeSlide(page);
    check('next arrow moves the spotlight', before !== null && after !== null && before !== after, before + ' → ' + after);

    const limit = iso(Date.now() + 31 * DAY);
    check('board shows departures', s.passes.length > 0, JSON.stringify(s.passes));
    check('board is limited to the next thirty days', s.passes.every(p => p.date <= limit), JSON.stringify(s.passes));
    check('board never lists an on-request tour', !s.passes.some(p => p.id === '204'));
    check('board never shows a full departure first',
      !s.passes.some(p => (p.id === '201' && p.date === iso(Date.now() + 2 * DAY)) || (p.id === '202' && p.date === iso(Date.now() + 6 * DAY))), JSON.stringify(s.passes));
    check('one card per tour on the board', new Set(s.passes.map(p => p.id)).size === s.passes.length, JSON.stringify(s.passes));

    // Clocks only tick on screen, so bring the board into view first.
    await page.evaluate(() => document.getElementById('ct-dep-rail').scrollIntoView({ block: 'center' }));
    await page.waitForTimeout(1200);
    const t1 = await page.evaluate(() => { const c = document.querySelector('#ct-dep-rail [data-cd]'); return c ? c.textContent : null; });
    await page.waitForTimeout(1600);
    const t2 = await page.evaluate(() => { const c = document.querySelector('#ct-dep-rail [data-cd]'); return c ? c.textContent : null; });
    check('departure clocks tick', t1 !== null && t1 !== t2, t1 + ' / ' + t2);

    // Saves: one tap, three places agree.
    const heart = page.locator('#ct-dep-rail [data-ct-save]').first();
    const hid = await heart.getAttribute('data-ct-save');
    await heart.click();
    await page.waitForTimeout(400);
    const saved = await page.evaluate(id => ({
      pressed: document.querySelector('[data-ct-save="' + id + '"]').getAttribute('aria-pressed'),
      count: (document.querySelector('[data-ct-saved-n]') || {}).textContent,
      stored: localStorage.getItem('ct:saves') || ''
    }), hid);
    check('heart shows as pressed', saved.pressed === 'true', JSON.stringify(saved));
    check('header counter reads 1', String(saved.count).trim() === '1', JSON.stringify(saved));
    check('save is stored', saved.stored.indexOf(hid) !== -1, JSON.stringify(saved));
    await ctx.close();
  }

  // ── EMPTY: nothing published, nothing scheduled ──────────────────────
  {
    const { page, ctx, errors } = await visit(browser, '/tours.html', { empty: true });
    const s = await page.evaluate(() => ({
      slides: document.querySelectorAll('#ct-spotlight .ct-slide').length,
      emptyBoard: !!document.querySelector('#ct-dep-rail .ct-board-empty'),
      passes: document.querySelectorAll('#ct-dep-rail .ct-pass').length
    }));
    check('spotlight still runs with no data (house slides)', s.slides >= 3, JSON.stringify(s));
    check('empty board explains itself', s.emptyBoard && s.passes === 0, JSON.stringify(s));
    check('no page errors when empty', errors.length === 0, errors.join('; '));
    await ctx.close();
  }

  // ── REDUCED MOTION ───────────────────────────────────────────────────
  {
    const { page, ctx } = await visit(browser, '/tours.html', { reduced: true, wait: 5000 });
    const a = await activeSlide(page);
    await page.waitForTimeout(9000);
    const b = await activeSlide(page);
    check('reduced motion holds the spotlight still', a !== null && a === b, a + ' → ' + b);
    await ctx.close();
  }

  // ── DEEP LINKS + BOOKING ─────────────────────────────────────────────
  {
    const { page, ctx, errors } = await visit(browser, '/tours.html?open=201');
    const sheet = await page.evaluate(() => {
      const s = document.getElementById('ct-sheet');
      return { open: !!(s && s.classList.contains('open')), title: s && (s.querySelector('.ct-sheet-title') || {}).textContent };
    });
    check('?open= opens the right tour', sheet.open && /Dawn Game Drive/.test(sheet.title || ''), JSON.stringify(sheet));

    await page.evaluate(() => { window.CabanaTours.close && window.CabanaTours.close(); window.CabanaTours.book(202); });
    await page.waitForTimeout(700);
    const gate = await page.evaluate(() => {
      const a = document.querySelector('#ct-bk a[href*="/auth"]');
      return a ? decodeURIComponent(a.getAttribute('href')) : null;
    });
    check('a signed-out guest is asked to sign in and brought back to this tour',
      !!gate && /next=\/tours\?book=202/.test(gate), String(gate));
    check('no page errors while booking', errors.length === 0, errors.join('; '));
    await ctx.close();
  }
  {
    const { page, ctx, errors } = await visit(browser, '/tours.html', { signed: true });
    await page.evaluate(() => window.CabanaTours.book(202));
    await page.waitForTimeout(900);
    const bk = await page.evaluate(() => {
      const r = document.getElementById('ct-bk');
      const dates = r ? Array.from(r.querySelectorAll('[data-bk-date]')) : [];
      const chosen = dates.filter(d => d.getAttribute('aria-pressed') === 'true')[0];
      return {
        open: !!(r && r.classList.contains('open')), n: dates.length,
        full: dates.filter(d => d.disabled).map(d => d.getAttribute('data-bk-date')),
        chosen: chosen ? chosen.getAttribute('data-bk-date') : null,
        chosenDisabled: chosen ? chosen.disabled : null,
        pay: (r && r.querySelector('[data-bk-go]') || {}).textContent || ''
      };
    });
    check('booking modal opens with the departures', bk.open && bk.n === 3, JSON.stringify(bk));
    check('a full departure is shown but cannot be picked', bk.full.length === 1 && bk.full[0] === iso(Date.now() + 6 * DAY), JSON.stringify(bk));
    check('the pre-selected date is the first one with seats', bk.chosen === iso(Date.now() + 13 * DAY) && bk.chosenDisabled === false, JSON.stringify(bk));
    check('deposit is what the guest pays now (30% of KES 2,500)', /750/.test(bk.pay), bk.pay);
    check('no page errors while signed in', errors.length === 0, errors.join('; '));
    await ctx.close();
  }

  // ── CATALOGUE ────────────────────────────────────────────────────────
  {
    const { page, ctx, errors } = await visit(browser, '/tours-catalogue.html?cat=city-tour');
    const ids = await page.evaluate(() => Array.from(document.querySelectorAll('#ct-grid .ct-card[data-id]')).map(c => c.getAttribute('data-id')));
    check('catalogue filters by category from the URL', ids.length === 1 && ids[0] === '202', JSON.stringify(ids));
    check('no page errors on the catalogue', errors.length === 0, errors.join('; '));
    await ctx.close();
  }
  {
    const { page, ctx } = await visit(browser, '/tours-catalogue.html?q=kibera');
    const ids = await page.evaluate(() => Array.from(document.querySelectorAll('#ct-grid .ct-card[data-id]')).map(c => c.getAttribute('data-id')));
    check('catalogue search matches the destination', ids.length === 1 && ids[0] === '203', JSON.stringify(ids));
    await ctx.close();
  }

  // ── GUIDES + STUDIO ──────────────────────────────────────────────────
  {
    const { page, ctx, errors } = await visit(browser, '/tour-guides.html');
    const n = await page.evaluate(() => document.querySelectorAll('#ct-gd .ct-guide').length);
    check('guides directory renders every guide', n >= 2, String(n));
    check('no page errors on the guides page', errors.length === 0, errors.join('; '));
    await ctx.close();
  }
  {
    const { page, ctx, errors } = await visit(browser, '/tours-studio.html', { wait: 4500 });
    const gate = await page.evaluate(() => !!document.querySelector('#cs-root .cs-gate [data-signin]'));
    check('studio asks a stranger to sign in', gate);
    check('no page errors on the studio', errors.length === 0, errors.join('; '));
    await ctx.close();
  }

  // ── PHONES ───────────────────────────────────────────────────────────
  for (const url of ['/tours.html', '/tours-catalogue.html', '/tour-guides.html', '/tours-studio.html']) {
    const { page, ctx } = await visit(browser, url, { mobile: true, wait: 5000 });
    const o = await overflow(page);
    check('no sideways scroll on a phone: ' + url, o <= 1, o + 'px');
    await ctx.close();
  }

  await browser.close();

  const failed = results.filter(r => !r.pass);
  console.log(`\n1..${results.length}`);
  console.log(`# pass ${results.length - failed.length}`);
  console.log(`# fail ${failed.length}`);
  process.exit(failed.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
