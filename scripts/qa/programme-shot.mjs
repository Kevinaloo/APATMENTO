/* Quick visual capture for the programme pages.
   node scripts/qa/programme-shot.mjs influencers agents ambassadors
   Writes full-page desktop and mobile screenshots plus any console errors. */
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from 'playwright';
import app from '../../server.js';

const names = process.argv.slice(2).filter(a => !a.startsWith('--'));
const pages = names.length ? names : ['influencers', 'agents', 'ambassadors'];
const output = resolve('artifacts/programme-shots');
await mkdir(output, { recursive: true });

const server = await new Promise(done => {
  const s = app.listen(0, '127.0.0.1', () => done(s));
});
const origin = `http://127.0.0.1:${server.address().port}`;
// PROGRAMME_QA_BROWSER lets a machine with a pre-installed Chromium point at
// it rather than downloading a second copy for this one script.
const browser = await chromium.launch({
  executablePath: process.env.PROGRAMME_QA_BROWSER || undefined,
  channel: process.env.PROGRAMME_QA_BROWSER ? undefined : 'chrome',
  args: ['--no-sandbox'],
});
const report = [];

for (const name of pages) {
  for (const [label, width, height] of [['desktop', 1440, 980], ['mobile', 390, 844]]) {
    const context = await browser.newContext({ viewport: { width, height }, serviceWorkers: 'block' });
    await context.addInitScript(() => { delete Object.getPrototypeOf(navigator).serviceWorker; });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push('pageerror: ' + e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
    page.on('response', r => { if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`); });
    try {
      await page.goto(`${origin}/${name}.html`, { waitUntil: 'domcontentloaded' });
      await page.evaluate(async () => {
        for (let top = 0; top < document.documentElement.scrollHeight; top += Math.max(400, innerHeight * 0.75)) {
          scrollTo({ top, behavior: 'instant' });
          await new Promise(r => setTimeout(r, 60));
        }
        for (const el of document.querySelectorAll('.pg-reveal:not(.is-visible)')) {
          el.scrollIntoView({ block: 'center', behavior: 'instant' });
          await new Promise(r => setTimeout(r, 50));
        }
        scrollTo({ top: 0, behavior: 'instant' });
      });
      await page.waitForFunction(() => [...document.images].every(i => i.complete)).catch(() => {});
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(1400);
      const layout = await page.evaluate(() => ({
        viewport: document.documentElement.clientWidth,
        content: document.documentElement.scrollWidth,
        broken: [...document.images].filter(i => !(i.complete && i.naturalWidth > 0)).map(i => i.currentSrc || i.src),
      }));
      await page.screenshot({ path: resolve(output, `${name}-${label}.png`), fullPage: true, animations: 'disabled' });
      report.push({ page: name, label, ...layout, errors });
      console.log(`${name} ${label}: ${layout.content}px content / ${layout.viewport}px viewport` +
        (layout.broken.length ? ` · BROKEN IMAGES ${layout.broken.join(', ')}` : '') +
        (errors.length ? `\n   ${errors.slice(0, 8).join('\n   ')}` : ''));
    } catch (error) {
      console.log(`${name} ${label}: FAILED ${error.message}`);
      report.push({ page: name, label, error: error.message, errors });
    } finally {
      await context.close();
    }
  }
}

await writeFile(resolve(output, 'report.json'), JSON.stringify(report, null, 2));
await browser.close();
await new Promise(done => server.close(done));
