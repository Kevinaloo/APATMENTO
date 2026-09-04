/* ═══════════════════════════════════════════════════════════════════════════
   FOOD GATE · BROWSER TESTS
   ─────────────────────────────────────────────────────────────────────────
   Drives food.html in real Chromium against tests/ui/stub-server.js.

   What this suite exists to hold in place:

     ARRIVAL   The gate always clears. It covers a page a guest reached
               because they are hungry, so every failure mode is a dark
               rectangle between them and dinner. Blocking the gate
               script entirely must still leave a usable page.

     THE FIRE  The heat crosses the bed rather than the bed switching
               on. That is the entire effect, and it lives in one
               property — each coal's delay is its distance from the
               coal that caught first. If that ever collapses to a
               single value the animation still runs and still looks
               fine in a screenshot, which is exactly why it needs a
               test rather than an eye.

     SAFETY    Nothing in this sequence flashes. The breathing is a
               slow swell well under the three-per-second WCAG 2.3.1
               threshold, and under prefers-reduced-motion the bed sits
               at heat and nothing moves at all.

     COST      The per-coal bloom is the one thing here that can wreck
               the frame rate: at 3.4x coal width the overdraw took the
               spread from 60fps to 46. It is pinned at 2x with a test
               so nobody widens it back for a glow the room light was
               already providing.

   Run:  ./tests/ui/run-food-gate.sh
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
  console.error('Run tests/ui/run-food-gate.sh, which installs it.');
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
  if (opts.blockGate) await page.route('**/cabana-food-gate.js', r => r.abort());
  await page.goto(`${BASE}/food.html`, { waitUntil: 'domcontentloaded' });
  return { page, ctx, errors };
}

const settled = page => page.evaluate(() => ({
  gate: !!document.getElementById('food-gate'),
  locked: document.documentElement.classList.contains('fg-lock'),
  bodyHidden: getComputedStyle(document.body).overflow === 'hidden',
  pageUsable: !!document.getElementById('heroLine')
}));

// ── THE FIRE ───────────────────────────────────────────────────────────────
{
  const { page, ctx } = await visit();
  await page.waitForTimeout(500);

  const bed = await page.evaluate(() => {
    const coals = [...document.querySelectorAll('#food-gate .fg-c')];
    const delays = coals.map(c => parseFloat(c.style.getPropertyValue('--d')) || 0);
    const rests = coals.map(c => parseFloat(c.style.getPropertyValue('--rest')) || 0);
    const cores = new Set(coals.map(c => c.style.getPropertyValue('--core')));
    return {
      count: coals.length,
      minDelay: Math.min(...delays),
      maxDelay: Math.max(...delays),
      distinctDelays: new Set(delays).size,
      distinctTemps: cores.size,
      restSpread: Math.max(...rests) - Math.min(...rests),
      ashed: document.querySelectorAll('#food-gate .fg-ash').length
    };
  });

  check('the bed is laid', bed.count > 60, bed.count + ' coals');

  /* A wavefront, not a switch. If every coal shared a delay the fire
     would simply turn on, which is the thing this is built to avoid. */
  check('the heat crosses the bed rather than switching it on',
    bed.distinctDelays > bed.count * 0.8 && bed.maxDelay - bed.minDelay > 900,
    bed.distinctDelays + ' distinct delays, spread ' + (bed.maxDelay - bed.minDelay) + 'ms');
  check('something catches first', bed.minDelay < 300, bed.minDelay + 'ms');
  check('the far side takes a while', bed.maxDelay > 1200, bed.maxDelay + 'ms');

  /* A bed of one colour is a bed of orange lights. */
  check('coals run at different temperatures', bed.distinctTemps >= 3,
    bed.distinctTemps + ' core colours');
  check('and settle at different heats', bed.restSpread > 0.25,
    bed.restSpread.toFixed(2) + ' spread');
  check('some of it ashes over', bed.ashed > 5 && bed.ashed < bed.count,
    bed.ashed + ' of ' + bed.count);
  await ctx.close();
}

// ── COST ───────────────────────────────────────────────────────────────────
{
  const { page, ctx } = await visit();
  await page.waitForTimeout(400);
  const bloom = await page.evaluate(() => {
    const c = document.querySelector('#food-gate .fg-c');
    const w = parseFloat(getComputedStyle(c).width);
    const bw = parseFloat(getComputedStyle(c, '::before').width);
    return bw / w;
  });
  /* 3.4x measured 46fps on the spread; 2x measured 60 and looks the
     same, because the ambient light comes from .fg-room. */
  check('the per-coal bloom stays within its overdraw budget',
    bloom <= 2.4, bloom.toFixed(2) + 'x coal width');
  await ctx.close();
}

// ── SAFETY ─────────────────────────────────────────────────────────────────
{
  const { page, ctx } = await visit();
  await page.waitForTimeout(400);
  const hz = await page.evaluate(() => {
    const g = document.getElementById('food-gate');
    g.className = ''; ['fg-cold', 'fg-lit', 'fg-breathe'].forEach(c => g.classList.add(c));
    const coals = [...document.querySelectorAll('#food-gate .fg-c')].slice(0, 40);
    const rates = coals.map(c => {
      const d = getComputedStyle(c, '::after').animationDuration;
      const ms = parseFloat(d) * (d.endsWith('ms') ? 1 : 1000);
      /* alternate: a full cycle is two durations */
      return 1000 / (ms * 2);
    });
    return { fastest: Math.max(...rates) };
  });
  check('the breathing is nowhere near a flicker', hz.fastest < 3,
    hz.fastest.toFixed(2) + 'Hz');

  const flashes = await page.evaluate(() =>
    document.querySelectorAll('#food-gate [class*="flash"]').length);
  check('there is no flash element at all', flashes === 0);
  await ctx.close();
}
{
  const { page, ctx } = await visit({ reduced: true });
  await page.waitForTimeout(400);
  const r = await page.evaluate(() => {
    const q = s => document.querySelector('#food-gate ' + s);
    return {
      spark: q('.fg-spark') ? getComputedStyle(q('.fg-spark')).display : 'gone',
      heat: q('.fg-heat') ? getComputedStyle(q('.fg-heat')).display : 'gone',
      coalAnim: q('.fg-c') ? getComputedStyle(q('.fg-c'), '::after').animationName : 'none'
    };
  });
  check('reduced motion stops the sparks', r.spark === 'none' || r.spark === 'gone', r.spark);
  check('reduced motion stops the rising heat', r.heat === 'none' || r.heat === 'gone', r.heat);
  check('reduced motion holds the bed still', r.coalAnim === 'none', r.coalAnim);
  await ctx.close();
}

// ── ARRIVAL ────────────────────────────────────────────────────────────────
{
  const { page, ctx, errors } = await visit();
  await page.waitForTimeout(8200);          // never touched; must clear alone
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
  await page.waitForTimeout(1200);
  await page.evaluate(() => document.getElementById('food-gate')?.click());
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
