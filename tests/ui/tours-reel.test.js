/* ═══════════════════════════════════════════════════════════════════════════
   TOURS REEL AND CANOPY GATE · BROWSER TESTS
   ─────────────────────────────────────────────────────────────────────────
   Drives tours.html in real Chromium against tests/ui/stub-server.js, with
   Playwright intercepting Supabase so the catalogue is fixed and the assertions
   are about behaviour rather than about whatever happens to be published.

   What this suite exists to hold in place:

     ARRIVAL   The canopy gate always clears. It covers the page's own load,
               so every failure mode it has is a visitor staring at a dark
               rectangle on the one page they came to browse. Blocking the
               gate script entirely must still leave a usable page.

     DATA      Nothing in the reel downloads until it is on screen. A
               duplicated track is sixteen <video> elements; starting them
               all is both a decoder problem and somebody's mobile bundle.

     DEGRADE   A reel needs two tours to loop. With one, or none, it hides
               rather than showing a half-empty band. Reduced motion and
               Save-Data get the same cards, holding still.

     SPLIT     Listings are stills. Film lives in the reel. A <video> inside
               .ct-grid means the hover-clip behaviour has come back, which
               made the grid behave one way with a mouse and another on the
               phone most guests actually book from.

   Run:  ./tests/ui/run-tours-reel.sh
   ═══════════════════════════════════════════════════════════════════════════ */

import path from 'node:path';
import { pathToFileURL } from 'node:url';

const PORT = Number(process.env.UI_TEST_PORT || 8899);
const BASE = 'http://localhost:' + PORT;

/* Playwright lives in a scratch dir, not the repo — same file: URL
   specifier dance as the rails suite next door. */
let chromium;
try {
  const spec = process.env.PW_PATH
    ? pathToFileURL(path.join(process.env.PW_PATH, 'index.mjs')).href
    : 'playwright';
  ({ chromium } = await import(spec));
} catch (e) {
  console.error('playwright not available:', e.message);
  console.error('Run tests/ui/run-tours-reel.sh, which installs it.');
  process.exit(2);
}
const CHROME = process.env.PW_CHROMIUM || undefined;

const cors = () => ({
  'access-control-allow-origin': '*',
  'access-control-allow-headers': '*',
  'access-control-allow-methods': '*',
  'access-control-expose-headers': 'content-range'
});

/* A clip Chromium can actually decode. The bundled build is the
   open-source one, which has no H.264, so an .mp4 fixture would fail for
   a reason that has nothing to do with this code. */
const CLIP = '/_probe.webm';

const tour = (id, over = {}) => Object.assign({
  id, title: 'Tour ' + id, destination: 'Somewhere', county: 'Nairobi',
  price_kes: 5000, price_basis: 'per_person', days: 1, duration_hours: 4,
  operator_name: 'Local Operator', operator_kind: 'partner',
  showcase: false, showcase_rank: 0, videos: [], photos: [], tags: [],
  cover_url: '/og-tours.jpg'
}, over);

const results = [];
function check(name, pass, detail) {
  results.push({ name, pass, detail });
  console.log(`${pass ? 'ok  ' : 'FAIL'}  ${name}${pass || !detail ? '' : '  → ' + detail}`);
}

async function visit(browser, tours, opts = {}) {
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    reducedMotion: opts.reduced ? 'reduce' : 'no-preference'
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));

  await page.route('**://*.supabase.co/**', r => {
    if (r.request().method() === 'OPTIONS') return r.fulfill({ status: 204, headers: cors() });
    const body = /tours_public/.test(r.request().url()) ? tours : [];
    return r.fulfill({
      status: 200,
      headers: Object.assign({ 'content-type': 'application/json' }, cors()),
      body: JSON.stringify(body)
    });
  });
  if (opts.blockGate) await page.route('**/cabana-jungle-gate.js', r => r.abort());

  await page.goto(`${BASE}/tours.html`, { waitUntil: 'load' });
  /* Deliberately never click or skip: the gate has to clear by itself. */
  await page.waitForTimeout(opts.wait || 7200);
  return { page, ctx, errors };
}

const state = page => page.evaluate(() => {
  const reel = document.getElementById('ct-reel');
  return {
    gate: !!document.getElementById('jungle-gate'),
    locked: document.documentElement.classList.contains('jg-lock'),
    reelHidden: reel ? reel.hidden : null,
    reelCards: reel ? reel.querySelectorAll('.ct-reel-card').length : 0,
    still: reel ? reel.classList.contains('is-still') : false,
    gridCards: document.querySelectorAll('.ct-grid .ct-card').length,
    gridVideos: document.querySelectorAll('.ct-grid video').length,
    pageUsable: !!document.querySelector('.ct-title')
  };
});

(async () => {
  const browser = await chromium.launch({
    executablePath: CHROME,
    args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required']
  });

  const two = [
    tour(1, { showcase: true, showcase_rank: 20, videos: [CLIP], title: 'Higher rank' }),
    tour(2, { showcase: true, showcase_rank: 10, videos: [CLIP], title: 'Lower rank' })
  ];

  // ── ARRIVAL ────────────────────────────────────────────────────────────
  {
    const { page, ctx, errors } = await visit(browser, two);
    const s = await state(page);
    check('gate clears without being touched', !s.gate);
    check('scroll is unlocked afterwards', !s.locked);
    check('page is usable', s.pageUsable);
    check('no page errors on arrival', errors.length === 0, errors.join('; '));
    await ctx.close();
  }
  {
    const { page, ctx } = await visit(browser, two, { blockGate: true, wait: 10500 });
    const s = await state(page);
    check('gate script blocked still yields a page', !s.gate && !s.locked && s.pageUsable);
    await ctx.close();
  }

  // ── SPLIT ──────────────────────────────────────────────────────────────
  {
    const { page, ctx } = await visit(browser, two);
    const s = await state(page);
    check('listings carry no video', s.gridVideos === 0);
    check('listings still render', s.gridCards === 2, 'got ' + s.gridCards);
    await ctx.close();
  }

  // ── DATA ───────────────────────────────────────────────────────────────
  {
    const four = [1, 2, 3, 4].map(i =>
      tour(i, { showcase: true, showcase_rank: 40 - i * 10, videos: [CLIP] }));
    const { page, ctx } = await visit(browser, four);
    const before = await page.evaluate(() =>
      [...document.querySelectorAll('#ct-reel video')].filter(v => v.src).length);
    check('nothing downloads while the reel is off screen', before === 0, 'loaded ' + before);

    await page.evaluate(() =>
      document.getElementById('ct-reel').scrollIntoView({ block: 'center' }));
    await page.waitForTimeout(2200);
    const after = await page.evaluate(() => {
      const v = [...document.querySelectorAll('#ct-reel video')];
      const on = e => { const b = e.getBoundingClientRect();
        return b.right > 0 && b.left < innerWidth && b.bottom > 0 && b.top < innerHeight; };
      return {
        loaded: v.filter(e => e.src).length,
        total: v.length,
        offPlaying: v.filter(e => !on(e) && !e.paused).length,
        onPlaying: v.filter(e => on(e) && !e.paused).length
      };
    });
    check('only some sources ever load', after.loaded > 0 && after.loaded < after.total,
      `${after.loaded}/${after.total}`);
    check('off-screen clips never play', after.offPlaying === 0);
    check('visible clips do play', after.onPlaying > 0);

    const order = await page.evaluate(() =>
      [...document.querySelectorAll('.ct-reel-run')][0]
        .querySelectorAll('.ct-reel-title')[0].textContent);
    check('highest rank runs first', order === 'Tour 1', order);
    await ctx.close();
  }

  // ── DEGRADE ────────────────────────────────────────────────────────────
  {
    const { page, ctx } = await visit(browser, [
      tour(1, { showcase: true, videos: [CLIP] })
    ]);
    const s = await state(page);
    check('a single tour hides the reel', s.reelHidden === true);
    await ctx.close();
  }
  {
    const { page, ctx } = await visit(browser,
      two.map(t => Object.assign({}, t, { showcase: false })));
    const s = await state(page);
    check('no showcase tours hides the reel', s.reelHidden === true);
    await ctx.close();
  }
  {
    const { page, ctx } = await visit(browser, two, { reduced: true });
    const s = await state(page);
    check('reduced motion stills the reel', s.still && s.reelHidden === false);
    check('reduced motion still clears the gate', !s.gate && !s.locked);
    await ctx.close();
  }

  await browser.close();

  const failed = results.filter(r => !r.pass);
  console.log(`\n1..${results.length}`);
  console.log(`# pass ${results.length - failed.length}`);
  console.log(`# fail ${failed.length}`);
  process.exit(failed.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
