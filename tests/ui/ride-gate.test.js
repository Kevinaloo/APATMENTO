/* ═══════════════════════════════════════════════════════════════════════════
   MOVE AND DRIVE ARRIVALS · BROWSER TESTS
   ─────────────────────────────────────────────────────────────────────────
   Drives rides.html (golden hour) and carhire.html (the studio reveal)
   in real Chromium against tests/ui/stub-server.js.

   Both gates are decoration. What this suite holds in place is that they
   can never cost the visitor the page:

     CLEARS     each gate removes itself and its scroll lock on its own
     SKIPS      a tap ends it at once, and still ends on the hand-off
     STILLNESS  reduced motion clears fast
     ABSENT     if the gate script never loads, the page strips the
                placeholder itself and is usable
     DEEP LINK  opening a trip, booking or car directly skips the gate
     QUIET      no page errors along the way

   Run:  ./tests/ui/run-ride-gate.sh
   ═══════════════════════════════════════════════════════════════════════════ */
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const PORT = Number(process.env.UI_TEST_PORT || 8899);
const BASE = 'http://localhost:' + PORT;
let chromium;
try {
  const spec = process.env.PW_PATH ? pathToFileURL(path.join(process.env.PW_PATH, 'index.mjs')).href : 'playwright';
  ({ chromium } = await import(spec));
} catch (e) {
  console.error('playwright not available:', e.message);
  process.exit(2);
}
const CHROME = process.env.PW_CHROMIUM || undefined;
const results = [];
function check(name, pass, detail) {
  results.push({ name, pass });
  console.log(`${pass ? 'ok  ' : 'FAIL'}  ${name}${pass || !detail ? '' : '  → ' + detail}`);
}
const browser = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });

const GATES = [
  { name: 'Move', page: '/rides.html', id: 'ride-gate', lock: 'rg-lock', script: 'cabana-ride-gate.js', skip: '.rg2-skip', ready: '#rd-title', deep: '/rides.html?trip=CR-TEST01' },
  { name: 'Drive', page: '/carhire.html', id: 'drive-gate', lock: 'dg-lock', script: 'cabana-drive-gate.js', skip: '.dg-skip', ready: '#dv-go', deep: '/carhire.html?booking=CD-TEST01' }
];

async function visit(url, opts = {}) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: opts.reduced ? 'reduce' : 'no-preference' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.route('**/*', r => {
    const u = r.request().url();
    if (opts.block && u.includes(opts.block)) return r.abort();
    if (u.startsWith(BASE)) return r.continue();
    if (u.includes('/rest/v1/')) return r.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    return r.fulfill({ status: 200, body: '' });
  });
  await page.goto(BASE + url, { waitUntil: 'domcontentloaded' });
  return { page, ctx, errors };
}
const state = (page, g) => page.evaluate(([id, lock]) => ({
  gate: !!document.getElementById(id),
  locked: document.documentElement.classList.contains(lock)
}), [g.id, g.lock]);
async function until(page, g, ms) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    const s = await state(page, g);
    if (!s.gate && !s.locked) return Date.now() - t0;
    await page.waitForTimeout(100);
  }
  return -1;
}

for (const g of GATES) {
  {
    const { page, ctx, errors } = await visit(g.page);
    await page.waitForTimeout(250);
    const during = await state(page, g);
    check(`${g.name}: gate plays on a fresh visit`, during.gate && during.locked, JSON.stringify(during));
    const t = await until(page, g, 6000);
    check(`${g.name}: gate clears on its own`, t >= 0, 'still up after 6s');
    check(`${g.name}: the page is there underneath`, await page.locator(g.ready).count() > 0);
    check(`${g.name}: no page errors`, errors.length === 0, errors.join(' | '));
    await ctx.close();
  }
  {
    const { page, ctx } = await visit(g.page);
    await page.waitForTimeout(400);
    await page.click(g.skip).catch(() => page.mouse.click(195, 400));
    const t = await until(page, g, 1500);
    check(`${g.name}: a tap skips to the page`, t >= 0, 'did not clear within 1.5s of a tap');
    await ctx.close();
  }
  {
    const { page, ctx } = await visit(g.page, { reduced: true });
    const t = await until(page, g, 2000);
    check(`${g.name}: reduced motion clears fast`, t >= 0, 'still up after 2s');
    await ctx.close();
  }
  {
    const { page, ctx, errors } = await visit(g.page, { block: g.script });
    await page.waitForTimeout(400);
    const s = await state(page, g);
    check(`${g.name}: a missing gate script never blocks the page`, !s.gate && !s.locked, JSON.stringify(s));
    check(`${g.name}: and nothing throws`, errors.length === 0, errors.join(' | '));
    await ctx.close();
  }
  {
    const { page, ctx } = await visit(g.deep);
    await page.waitForTimeout(300);
    const s = await state(page, g);
    check(`${g.name}: a deep link skips the gate`, !s.gate && !s.locked, JSON.stringify(s));
    await ctx.close();
  }
}

await browser.close();
const failed = results.filter(r => !r.pass).length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
