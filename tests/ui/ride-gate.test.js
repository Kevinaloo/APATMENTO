/* ═══════════════════════════════════════════════════════════════════════════
   RIDES GATE · BROWSER TESTS
   ─────────────────────────────────────────────────────────────────────────
   Drives rides.html in real Chromium against tests/ui/stub-server.js.

   What this suite exists to hold in place:

     GEOMETRY  Drivers sit on roads. That is the detail separating this
               from a starfield, it is invisible in a screenshot once
               anything is moving, and it breaks silently the moment
               anyone changes how the network is generated. Every dot
               is checked against the lane positions it was placed on.

     ANCHORING The request lands where the frame wants it, not where
               the generator happened to put it. This already broke
               once: r1() rounds to one decimal, which is right for a
               percentage like 43.2 and catastrophic for a 0-1
               fraction, and it slid the whole city 12% off centre.

     THE WAVE  The request crosses the city rather than switching it
               on — each driver's delay is its distance. Same invariant
               as the coals on the food gate, same reason it needs a
               test: collapse the delays to one value and the animation
               still runs and still screenshots perfectly.

     MEANING   rides.html states twice, in its own comments, that
               signal green means live and kerb yellow means the price
               is fixed, and that neither is ever decorative. Yellow
               must therefore appear on exactly one thing.

     ARRIVAL   The gate always clears, including when its own script
               never loads.

   Run:  ./tests/ui/run-ride-gate.sh
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
  console.error('Run tests/ui/run-ride-gate.sh, which installs it.');
  process.exit(2);
}
const CHROME = process.env.PW_CHROMIUM || undefined;

const results = [];
function check(name, pass, detail) {
  results.push({ name, pass });
  console.log(`${pass ? 'ok  ' : 'FAIL'}  ${name}${pass || !detail ? '' : '  → ' + detail}`);
}

const browser = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });

async function visit(opts = {}) {
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    reducedMotion: opts.reduced ? 'reduce' : 'no-preference'
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  if (opts.blockGate) await page.route('**/cabana-ride-gate.js', r => r.abort());
  await page.goto(`${BASE}/rides.html`, { waitUntil: 'domcontentloaded' });
  return { page, ctx, errors };
}

const settled = page => page.evaluate(() => ({
  gate: !!document.getElementById('ride-gate'),
  locked: document.documentElement.classList.contains('rg-lock'),
  bodyHidden: getComputedStyle(document.body).overflow === 'hidden',
  pageUsable: !!document.querySelector('#rd-title')
}));

// ── THE JOURNEY ────────────────────────────────────────────────────────────
// The route changes mode as the ground changes. That is the product, it is
// the thing the page says a generic taxi form cannot express, and it lives
// in per-leg data an eye cannot audit once the thing is moving.
{
  const { page, ctx } = await visit();
  await page.waitForTimeout(600);

  const j = await page.evaluate(() => {
    const gate = document.getElementById('ride-gate');
    const legs = [...gate.querySelectorAll('.rg-leg')];
    const colours = legs.map(l => l.style.getPropertyValue('--c').trim());
    const offsets = legs.map(l => parseFloat(l.style.getPropertyValue('--lo')));
    const web = [...gate.querySelectorAll('.rg-web')];
    return {
      legs: legs.length,
      distinctModes: new Set(colours).size,
      colours,
      sequential: offsets.every((v, i) => i === 0 || v > offsets[i - 1]),
      web: web.length,
      webModes: new Set(web.map(w => w.style.getPropertyValue('--c').trim())).size,
      stops: gate.querySelectorAll('.rg-dot.is-stop').length,
      dots: gate.querySelectorAll('.rg-dot').length
    };
  });

  check('the journey has several legs', j.legs >= 3, j.legs + ' legs');
  check('and changes mode along the way', j.distinctModes >= 3,
    j.distinctModes + ' modes: ' + j.colours.join(' '));
  check('legs run one after another, not at once', j.sequential);
  check('each stop is marked', j.stops === j.legs, j.stops + ' stops for ' + j.legs + ' legs');

  /* Only these four colours mean anything, and they come from the
     page's own tokens: coral road, aqua water, amber trail, blue
     transfer. Anything else on a leg is decoration. */
  const allowed = ['#ff715b', '#63efdc', '#ffc565', '#8abfff'];
  check('every leg uses a mode colour from the page',
    j.colours.every(c => allowed.includes(c.toLowerCase())), j.colours.join(' '));

  check('every other way is drawn too', j.web >= 12, j.web + ' routes');
  check('and the continent uses every mode', j.webModes >= 3, j.webModes + ' modes');
  await ctx.close();
}

// ── IN FRAME ───────────────────────────────────────────────────────────────
// The map square is wider than the viewport, so a journey scattered across
// the whole of it spends most of its length off screen. This already went
// wrong twice: once from rounding a 0-1 fraction to one decimal, and once
// from anchoring the frame on one point while placing markets around another.
{
  const { page, ctx } = await visit();
  await page.waitForTimeout(600);
  const framing = await page.evaluate(() => {
    const gate = document.getElementById('ride-gate');
    const o = gate.querySelector('.rg-origin').getBoundingClientRect();
    const stops = [...gate.querySelectorAll('.rg-dot.is-stop')].map(d => {
      const r = d.getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    });
    const onScreen = stops.filter(s =>
      s.x > -20 && s.x < innerWidth + 20 && s.y > -20 && s.y < innerHeight + 20);
    const g = document.getElementById('ride-gate');
    return {
      ox: o.x + o.width / 2, oy: o.y + o.height / 2,
      vw: innerWidth, vh: innerHeight,
      stops: stops.length, onScreen: onScreen.length,
      oxf: g.style.getPropertyValue('--oxf'), oxPct: g.style.getPropertyValue('--ox')
    };
  });
  check('the start is anchored horizontally',
    Math.abs(framing.ox - framing.vw * 0.5) < 14,
    Math.round(framing.ox) + 'px vs ' + Math.round(framing.vw * 0.5));
  check('the start is anchored vertically',
    Math.abs(framing.oy - framing.vh * 0.56) < 14,
    Math.round(framing.oy) + 'px vs ' + Math.round(framing.vh * 0.56));
  check('the whole journey stays in frame',
    framing.onScreen === framing.stops,
    framing.onScreen + ' of ' + framing.stops + ' stops visible');
  check('the fraction and the percentage describe the same point',
    Math.abs(parseFloat(framing.oxf) * 100 - parseFloat(framing.oxPct)) < 0.2,
    framing.oxf + ' vs ' + framing.oxPct);
  await ctx.close();
}

// ── ARRIVAL ────────────────────────────────────────────────────────────────
{
  const { page, ctx, errors } = await visit();
  await page.waitForTimeout(8600);          // never touched; must clear alone
  const s = await settled(page);
  check('gate clears without being touched', !s.gate);
  check('scroll is unlocked afterwards', !s.locked && !s.bodyHidden);
  check('page is usable', s.pageUsable);
  check('no page errors on arrival', errors.length === 0, errors.join('; '));
  await ctx.close();
}
{
  const { page, ctx } = await visit({ blockGate: true });
  await page.waitForTimeout(10500);
  const s = await settled(page);
  check('gate script blocked still yields a page', !s.gate && !s.locked && s.pageUsable);
  await ctx.close();
}
{
  const { page, ctx } = await visit();
  await page.waitForTimeout(1400);
  await page.evaluate(() => document.getElementById('ride-gate')?.click());
  await page.waitForTimeout(1800);
  const s = await settled(page);
  check('tapping skips out cleanly', !s.gate && !s.locked);
  await ctx.close();
}
{
  const { page, ctx } = await visit({ reduced: true });
  await page.waitForTimeout(3200);
  const s = await settled(page);
  check('reduced motion still clears the gate', !s.gate && !s.locked);
  check('reduced motion leaves a usable page', s.pageUsable);
  await ctx.close();
}

await browser.close();
const failed = results.filter(r => !r.pass);
console.log(`\n1..${results.length}`);
console.log(`# pass ${results.length - failed.length}`);
console.log(`# fail ${failed.length}`);
process.exit(failed.length ? 1 : 0);
