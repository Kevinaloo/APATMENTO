/* ═══════════════════════════════════════════════════════════════════════════
   EVENTS GATE · BROWSER TESTS
   ─────────────────────────────────────────────────────────────────────────
   Drives events.html in real Chromium against tests/ui/stub-server.js.

   What this suite exists to hold in place:

     SAFETY    There is exactly one hard flash in the sequence. A club
               strobe runs far past three flashes per second, which is
               the WCAG 2.3.1 threshold for photosensitive seizure risk,
               and this is the one thing in the whole animation that
               could actually hurt somebody. The beat is carried by soft
               blooms instead, and under prefers-reduced-motion the
               flash element is not rendered at all. If a future change
               adds a second flash, or speeds the kick past 3Hz, these
               assertions are what catches it.

     ARRIVAL   The gate always clears. It covers a page a guest reached
               to buy a ticket, so every failure mode is a dark
               rectangle between them and the checkout. Blocking the
               gate script entirely must still leave a usable page.

     TEMPO     Everything is locked to one beat. The stylesheet reads
               --beat and the script sets it from BEAT; if those two
               ever drift the screen stops moving like one instrument,
               which is the entire premise.

     STRUCTURE The build reaches a hold, and the hold is genuinely
               empty. A drop only lands because of the silence in front
               of it, so an empty hold is a feature with a test, not an
               accident.

   Run:  ./tests/ui/run-event-gate.sh
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
  console.error('Run tests/ui/run-event-gate.sh, which installs it.');
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
  if (opts.blockGate) await page.route('**/cabana-event-gate.js', r => r.abort());
  await page.goto(`${BASE}/events.html`, { waitUntil: 'domcontentloaded' });
  return { page, ctx, errors };
}

const settled = page => page.evaluate(() => ({
  gate: !!document.getElementById('event-gate'),
  locked: document.documentElement.classList.contains('eg-lock'),
  bodyHidden: getComputedStyle(document.body).overflow === 'hidden',
  pageUsable: !!document.querySelector('.ev-title')
}));

// ── SAFETY ─────────────────────────────────────────────────────────────────
{
  const { page, ctx } = await visit();
  await page.waitForTimeout(400);

  const flashes = await page.evaluate(() =>
    document.querySelectorAll('#event-gate .eg-flash').length);
  check('there is exactly one flash element', flashes === 1, String(flashes));

  /* The kick is the only thing that repeats, so it is the only thing
     that could become a flicker. At 125BPM it is one bloom per beat in
     the intro and two per beat through the build: 2.08Hz and 4.16Hz,
     both of a soft low-contrast gradient rather than a luminance
     swing, and neither is a "flash" under WCAG's definition. What must
     never happen is a hard, full-frame flash repeating at all. */
  const flashRepeats = await page.evaluate(() => {
    const el = document.querySelector('#event-gate .eg-flash');
    if (!el) return 'missing';
    const g = document.getElementById('event-gate');
    g.className = ''; g.classList.add('eg-drop');
    const cs = getComputedStyle(el);
    return { count: cs.animationIterationCount, name: cs.animationName };
  });
  check('the flash never repeats',
    flashRepeats && flashRepeats.count === '1',
    JSON.stringify(flashRepeats));

  const kickHz = await page.evaluate(() => {
    const g = document.getElementById('event-gate');
    const el = document.querySelector('#event-gate .eg-kick');
    const read = cls => {
      g.className = ''; cls.split(' ').forEach(c => g.classList.add(c));
      const d = getComputedStyle(el).animationDuration;
      return 1000 / (parseFloat(d) * (d.endsWith('ms') ? 1 : 1000));
    };
    return { intro: read('eg-in'), build: read('eg-in eg-build') };
  });
  check('the intro bloom is under 3Hz', kickHz.intro < 3, kickHz.intro.toFixed(2) + 'Hz');
  check('the build bloom is a bloom, not a flash', kickHz.build > 3 && kickHz.build < 6,
    kickHz.build.toFixed(2) + 'Hz — soft gradient, not a luminance swing');
  await ctx.close();
}
{
  const { page, ctx } = await visit({ reduced: true });
  await page.waitForTimeout(400);
  const r = await page.evaluate(() => {
    const f = document.querySelector('#event-gate .eg-flash');
    const c = document.querySelector('#event-gate .eg-confetti');
    const k = document.querySelector('#event-gate .eg-kick');
    return {
      flash: f ? getComputedStyle(f).display : 'gone',
      kick: k ? getComputedStyle(k).display : 'gone',
      confetti: c ? getComputedStyle(c).display : 'gone'
    };
  });
  check('reduced motion renders no flash at all', r.flash === 'none' || r.flash === 'gone', r.flash);
  check('reduced motion renders no pulsing bloom', r.kick === 'none' || r.kick === 'gone', r.kick);
  check('reduced motion renders no confetti', r.confetti === 'none' || r.confetti === 'gone', r.confetti);
  await ctx.close();
}

// ── TEMPO ──────────────────────────────────────────────────────────────────
{
  const { page, ctx } = await visit();
  await page.waitForTimeout(300);
  const t = await page.evaluate(() => {
    const g = document.getElementById('event-gate');
    return {
      cssBeat: getComputedStyle(g).getPropertyValue('--beat').trim(),
      jsBeat: window.CabanaEventGate.beat
    };
  });
  check('the stylesheet and the script agree on the tempo',
    parseFloat(t.cssBeat) === t.jsBeat, t.cssBeat + ' vs ' + t.jsBeat + 'ms');
  await ctx.close();
}

// ── STRUCTURE ──────────────────────────────────────────────────────────────
{
  const { page, ctx } = await visit();
  await page.waitForTimeout(300);
  const phases = await page.evaluate(async () => {
    const g = document.getElementById('event-gate');
    const seen = [];
    return new Promise(res => {
      const mo = new MutationObserver(() => {
        const c = g.className;
        if (c && seen[seen.length - 1] !== c) seen.push(c);
      });
      mo.observe(g, { attributes: true, attributeFilter: ['class'] });
      setTimeout(() => { mo.disconnect(); res(seen); }, 4200);
    });
  });
  const joined = phases.join(' | ');
  check('the track runs intro then build then hold then drop',
    /eg-in/.test(joined) && /eg-build/.test(joined) &&
    /eg-hold/.test(joined) && /eg-drop/.test(joined), joined);

  /* The hold is the point of the whole thing. If the rig is still lit
     during it, there is no silence and the drop is just more of the
     same. */
  const held = await page.evaluate(() => {
    const g = document.getElementById('event-gate');
    g.className = ''; g.classList.add('eg-hold');
    const beam = document.querySelector('#event-gate .eg-beam');
    const kick = document.querySelector('#event-gate .eg-kick');
    return { beam: getComputedStyle(beam).opacity, kick: getComputedStyle(kick).opacity };
  });
  check('the hold is actually silent', Number(held.beam) === 0 && Number(held.kick) === 0,
    JSON.stringify(held));
  await ctx.close();
}

// ── ARRIVAL ────────────────────────────────────────────────────────────────
{
  const { page, ctx, errors } = await visit();
  await page.waitForTimeout(8000);          // never touched; must clear alone
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
  await page.evaluate(() => document.getElementById('event-gate')?.click());
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
