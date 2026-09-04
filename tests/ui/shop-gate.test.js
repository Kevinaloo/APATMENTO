/* ═══════════════════════════════════════════════════════════════════════════
   SHOPPING GATE · BROWSER TESTS
   ─────────────────────────────────────────────────────────────────────────
   Drives shopping.html in real Chromium against tests/ui/stub-server.js.

   What this suite exists to hold in place:

     THE WEAVE   The interlace is in register. Warp threads sit on
                 multiples of the pitch; weft dashes are exactly one
                 pitch on, one pitch off, phase-flipped every row. Get
                 the dash period wrong by a factor of two — which is
                 what happened on the first pass — and the cloth still
                 renders, still looks like a pattern, and is not a
                 weave. Nothing about that is visible in a screenshot
                 once the thing is moving, so it is asserted here.

     COVERAGE    Threads are nearly as wide as the pitch. At half the
                 pitch a quarter of the frame stayed bare white and the
                 whole cloth washed out.

     LIGHT       This is the only arrival that opens on a light page,
                 and it must stay light. A dark gate over #FCFCFD would
                 flash white at the handover.

     MEANING     Green is the zero-commission mark on shopping.html and
                 is not woven into the cloth. It appears once, on the
                 line that means it.

     ARRIVAL     The gate always clears, including when its own script
                 never loads.

   Run:  ./tests/ui/run-shop-gate.sh
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
  console.error('Run tests/ui/run-shop-gate.sh, which installs it.');
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
  if (opts.blockGate) await page.route('**/cabana-shop-gate.js', r => r.abort());
  await page.goto(`${BASE}/shopping.html`, { waitUntil: 'domcontentloaded' });
  return { page, ctx, errors };
}

const settled = page => page.evaluate(() => ({
  gate: !!document.getElementById('shop-gate'),
  locked: document.documentElement.classList.contains('wv-lock'),
  bodyHidden: getComputedStyle(document.body).overflow === 'hidden',
  pageUsable: !!document.querySelector('.hero-title')
}));

// ── THE WEAVE ──────────────────────────────────────────────────────────────
{
  const { page, ctx } = await visit();
  await page.waitForTimeout(600);

  const w = await page.evaluate(() => {
    const gate = document.getElementById('shop-gate');
    const warp = [...gate.querySelectorAll('.wv-warp')];
    const weft = [...gate.querySelectorAll('.wv-weft')];

    const xs = warp.map(l => parseFloat(l.getAttribute('x1'))).sort((a, b) => a - b);
    const gaps = xs.slice(1).map((v, i) => +(v - xs[i]).toFixed(3));
    const pitch = gaps[0];

    const dashes = weft.map(l => l.style.getPropertyValue('--dash').trim());
    const phases = weft.map(l => parseFloat(l.style.getPropertyValue('--phase')));
    const froms = weft.map(l => l.style.getPropertyValue('--from').trim());
    const widths = warp.map(l => parseFloat(l.style.getPropertyValue('--w')));

    return {
      warp: warp.length, weft: weft.length,
      pitch,
      evenPitch: gaps.every(g => Math.abs(g - pitch) < 0.001),
      dash: dashes[0],
      dashUniform: new Set(dashes).size === 1,
      /* alternating 0, pitch, 0, pitch … */
      phaseAlternates: phases.every((p, i) => Math.abs(p - (i % 2 ? pitch : 0)) < 0.001),
      shuttleAlternates: froms.every((f, i) => f === (i % 2 ? '100%' : '0%')),
      widthRatio: widths[0] / pitch,
      /* Each dash must be centred on a warp column. The line starts
         half a pitch before one, so (x1 + pitch/2) lands exactly on a
         multiple of the pitch. Expressed this way rather than with a
         modulo, which is signed in JS and quietly wrong for the
         negative start coordinate this uses. */
      startAligned: (function () {
        const x1 = parseFloat(weft[0].getAttribute('x1'));
        const k = (x1 + pitch / 2) / pitch;
        return Math.abs(k - Math.round(k)) < 0.001;
      })()
    };
  });

  check('the loom is dressed', w.warp > 30 && w.weft > 30,
    w.warp + ' warp, ' + w.weft + ' weft');
  check('warp threads sit on an even pitch', w.evenPitch, 'pitch ' + w.pitch);

  /* The bug this exists for: dash period must equal 2x pitch, so a
     weft passes over one warp and under exactly the next. Half that
     and it alternates twice per column, which is not a weave. */
  const [on, off] = w.dash.split(/\s+/).map(Number);
  check('the weft passes over one warp and under one',
    Math.abs(on - w.pitch) < 0.001 && Math.abs(off - w.pitch) < 0.001,
    'dash ' + w.dash + ' against pitch ' + w.pitch);
  check('every weft row uses the same dash', w.dashUniform, w.dash);
  check('the phase flips each row', w.phaseAlternates);
  check('the weft starts in register with the warp', w.startAligned);
  check('the shuttle goes across and comes back', w.shuttleAlternates);

  /* Half the pitch left a quarter of the frame bare. */
  check('the cloth is solid, not open', w.widthRatio > 0.85 && w.widthRatio <= 1.0,
    'thread is ' + w.widthRatio.toFixed(2) + ' of the pitch');
  await ctx.close();
}

// ── LIGHT ──────────────────────────────────────────────────────────────────
{
  const { page, ctx } = await visit();
  await page.waitForTimeout(400);
  const light = await page.evaluate(() => {
    const g = document.getElementById('shop-gate');
    const bg = getComputedStyle(g).backgroundColor;
    const m = bg.match(/\d+/g).map(Number);
    const lum = (0.2126 * m[0] + 0.7152 * m[1] + 0.0722 * m[2]) / 255;
    const sub = getComputedStyle(document.querySelector('#shop-gate .wv-sub')).color;
    const warpCols = [...document.querySelectorAll('#shop-gate .wv-warp')]
      .map(l => l.style.getPropertyValue('--c').trim().toLowerCase());
    const weftCols = [...document.querySelectorAll('#shop-gate .wv-weft')]
      .map(l => l.style.getPropertyValue('--c').trim().toLowerCase());
    return { lum, sub, green: [...warpCols, ...weftCols].filter(c => c === '#00a082').length };
  });
  check('the gate opens light, like the page it covers', light.lum > 0.9,
    'luminance ' + light.lum.toFixed(2));
  /* #00A082 is the commission mark on shopping.html. */
  check('green is the commission mark and nothing else',
    light.sub === 'rgb(0, 160, 130)' && light.green === 0,
    light.sub + ', ' + light.green + ' green threads');
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
  await page.waitForTimeout(1300);
  await page.evaluate(() => document.getElementById('shop-gate')?.click());
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
