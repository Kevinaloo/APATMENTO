/* Tour benchmark: loads a tour in headless Chromium, enters walk mode,
   holds W for a few seconds while turning, and reports frame timings.
   Usage: node bench/bench.cjs <slug> [mobile] */
const { chromium } = require('/home/user/APATMENTO/node_modules/playwright');
const slug = process.argv[2] || 'kileleshwa-elegant';
const mobile = process.argv[3] === 'mobile';
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await browser.newContext(mobile ? { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 } : { viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  const t0 = Date.now();
  await page.goto('http://localhost:4173/tours/' + slug + '/index.html', { waitUntil: 'domcontentloaded' });
  const gl = await page.evaluate(() => { const c = document.createElement('canvas'); const g = c.getContext('webgl2'); return g ? g.getParameter(g.RENDERER) : 'none'; });
  // Wait for ready: an enter button or a canvas.
  await page.waitForFunction(() => document.querySelector('canvas'), null, { timeout: 60000 });
  const enter = await page.waitForSelector('button.enter-button:not([disabled]), [data-tour-enter]:not([disabled])', { timeout: 60000 }).catch(() => null);
  const readyMs = Date.now() - t0;
  if (enter) await enter.click();
  await page.waitForTimeout(800);
  const canvas = await page.$('canvas');
  const box = await canvas.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  // Measure frames while walking and turning.
  await page.evaluate(() => {
    window.__ft = []; let last = performance.now();
    const loop = t => { window.__ft.push(t - last); last = t; if (window.__ft.length < 100000) requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
  });
  await page.keyboard.down('KeyW');
  for (let i = 0; i < 30; i++) { await page.mouse.down(); await page.mouse.move(box.x + box.width / 2 + (i % 2 ? 40 : -40), box.y + box.height / 2, { steps: 4 }); await page.mouse.up(); await page.waitForTimeout(100); }
  await page.keyboard.up('KeyW');
  const ft = await page.evaluate(() => window.__ft.slice(5));
  ft.sort((a, b) => a - b);
  const avg = ft.reduce((a, b) => a + b, 0) / ft.length;
  const p95 = ft[Math.floor(ft.length * 0.95)];
  const res = await page.evaluate(() => performance.getEntriesByType('resource').filter(r => /\/tours\//.test(r.name)).reduce((a, r) => a + (r.transferSize || r.encodedBodySize || 0), 0));
  console.log(JSON.stringify({ slug, mobile, gl, readyMs, frames: ft.length, avgMs: +avg.toFixed(1), p95Ms: +p95.toFixed(1), fps: +(1000 / avg).toFixed(1), tourBytes: res, errors: errors.slice(0, 3) }));
  await browser.close();
})().catch(e => { console.error('BENCH FAIL', e.message); process.exit(1); });
