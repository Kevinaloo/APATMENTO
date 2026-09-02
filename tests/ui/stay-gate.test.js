/* ═══════════════════════════════════════════════════════════════════════════
   STAYS FACADE GATE · BROWSER TESTS
   ─────────────────────────────────────────────────────────────────────────
   Drives apartments.html in real Chromium against tests/ui/stub-server.js.

   What this suite exists to hold in place:

     ARRIVAL   The gate always clears. It covers the flagship page's own
               load, so every failure mode it has is a guest staring at a
               dark rectangle on the page the business runs on. Blocking
               the gate script entirely must still leave a usable page.

     PLACE     The name is never wrong. It is taken from what the page
               actually knows — landing pages hand off as
               /apartments?q=Kilimani — and anything unrecognised falls
               back to "Tonight, somewhere in Africa" rather than being
               guessed at. The rendered string always comes from the
               map, never from the query string, so a hostile value
               cannot reach the DOM.

     GEOMETRY  The camera goes through the hero window, not through the
               middle of the screen and approximately near it. --hx/--hy
               must land on the element carrying .sg-hero.

     DEGRADE   Reduced motion lights the block and holds it still: no
               scaling, no travel, no flicker, and the page still arrives.

   Run:  ./tests/ui/run-stay-gate.sh
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
  console.error('Run tests/ui/run-stay-gate.sh, which installs it.');
  process.exit(2);
}
const CHROME = process.env.PW_CHROMIUM || undefined;

const results = [];
function check(name, pass, detail) {
  results.push({ name, pass });
  console.log(`${pass ? 'ok  ' : 'FAIL'}  ${name}${pass || !detail ? '' : '  → ' + detail}`);
}

const browser = await chromium.launch({
  executablePath: CHROME,
  args: ['--no-sandbox']
});

async function visit(opts = {}) {
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    reducedMotion: opts.reduced ? 'reduce' : 'no-preference'
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  if (opts.blockGate) await page.route('**/cabana-stay-gate.js', r => r.abort());
  await page.goto(`${BASE}/apartments.html`, { waitUntil: 'domcontentloaded' });
  return { page, ctx, errors };
}

const settled = page => page.evaluate(() => ({
  gate: !!document.getElementById('stay-gate'),
  locked: document.documentElement.classList.contains('sg-lock'),
  bodyHidden: getComputedStyle(document.body).overflow === 'hidden',
  pageUsable: !!document.querySelector('.hero') || !!document.querySelector('#hero-title')
}));

// ── ARRIVAL ────────────────────────────────────────────────────────────────
{
  const { page, ctx, errors } = await visit();
  await page.waitForTimeout(7500);          // never touched; must clear alone
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
  await page.evaluate(() => document.getElementById('stay-gate')?.click());
  await page.waitForTimeout(1600);
  const s = await settled(page);
  check('tapping skips out cleanly', !s.gate && !s.locked);
  await ctx.close();
}

// ── PLACE ────────────────────────────────────────────────────────────────
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();

  async function lineFor(query) {
    await page.goto(`${BASE}/apartments.html${query}`, { waitUntil: 'load' });
    await page.waitForTimeout(500);
    return page.evaluate(() => {
      const el = document.querySelector('#stay-gate .sg-place');
      return el ? el.textContent.replace(/\s+/g, ' ').trim() : null;
    });
  }

  check('a known neighbourhood is named',
    (await lineFor('?q=Kilimani')) === 'Tonight in Kilimani');
  check('case and punctuation still resolve',
    (await lineFor('?q=KILIMANI,%20Nairobi')) === 'Tonight in Kilimani');
  check('a multi-word place resolves',
    (await lineFor('?q=dar%20es%20salaam')) === 'Tonight in Dar es Salaam');
  check('an accented spelling resolves',
    (await lineFor('?q=Medell%C3%ADn')) === 'Tonight in Medellín');
  check('city= is honoured as well as q=',
    (await lineFor('?city=Lekki')) === 'Tonight in Lekki');

  const bare = await lineFor('');
  check('no place given falls back, never guesses',
    bare === 'Tonight, somewhere in Africa', bare);
  const junk = await lineFor('?q=asdfghjkl');
  check('an unrecognised place falls back',
    junk === 'Tonight, somewhere in Africa', junk);
  const amb = await lineFor('?q=cbd');
  check('an ambiguous place falls back',
    amb === 'Tonight, somewhere in Africa', amb);

  /* The rendered name is looked up, never echoed, so nothing from the
     query string can reach the DOM. */
  const hostile = await lineFor('?q=%3Cimg%20src%3Dx%20onerror%3Dalert(1)%3E');
  check('a hostile value never renders',
    hostile === 'Tonight, somewhere in Africa', hostile);
  const injected = await page.evaluate(() =>
    document.querySelector('#stay-gate') ? document.querySelector('#stay-gate').innerHTML : '');
  check('and injects nothing into the gate',
    !/onerror|<img|<script/i.test(injected));

  await ctx.close();
}

// ── GEOMETRY ───────────────────────────────────────────────────────────────
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/apartments.html`, { waitUntil: 'load' });
  await page.waitForTimeout(400);
  const g = await page.evaluate(() => {
    document.getElementById('stay-gate')?.remove();
    window.CabanaStayGate.curtain({});
    const gate = document.getElementById('stay-gate');
    const hero = gate.querySelector('.sg-hero');
    if (!hero) return null;
    const r = hero.getBoundingClientRect();
    const hx = parseFloat(gate.style.getPropertyValue('--hx'));
    const hy = parseFloat(gate.style.getPropertyValue('--hy'));
    const out = {
      heroes: gate.querySelectorAll('.sg-hero').length,
      dx: Math.abs((hx / 100) * innerWidth - (r.x + r.width / 2)),
      dy: Math.abs((hy / 100) * innerHeight - (r.y + r.height / 2)),
      heroLit: !!hero.querySelector('.sg-win-l')
    };
    gate.remove();
    document.documentElement.classList.remove('sg-lock');
    return out;
  });
  check('exactly one hero window', g && g.heroes === 1, g && String(g.heroes));
  check('camera origin lands on it (x)', g && g.dx < 6, g && g.dx.toFixed(1) + 'px off');
  check('camera origin lands on it (y)', g && g.dy < 6, g && g.dy.toFixed(1) + 'px off');
  check('the hero window is lit', !!(g && g.heroLit));
  await ctx.close();
}

// ── DEGRADE ────────────────────────────────────────────────────────────────
{
  const { page, ctx } = await visit({ reduced: true });
  await page.waitForTimeout(3000);
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
