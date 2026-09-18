import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from 'playwright';
import app from '../../server.js';

// Public-page verification only. No form submission or external write is allowed.
// Own the test server unless explicitly testing an existing preview.
const localServer = process.env.PROGRAMME_QA_ORIGIN ? null : await new Promise(resolve => {
  const server = app.listen(0, '127.0.0.1', () => resolve(server));
});
const origin = process.env.PROGRAMME_QA_ORIGIN || `http://127.0.0.1:${localServer.address().port}`;
const output = resolve(process.env.PROGRAMME_QA_OUTPUT || 'artifacts/programme-redesign');
const pages = [
  { name: 'influencers', role: 'influencer', demo: '[data-creator-demo]' },
  { name: 'agents', role: 'agent', demo: '[data-agent-demo]' },
  { name: 'ambassadors', role: 'ambassador', demo: '[data-amb-stage]' },
];
const results = [];
const routeChecks = new Map();
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });

function record(label, passed, details = {}) {
  results.push({ label, passed, ...details });
  console.log(`${passed ? 'PASS' : 'FAIL'} ${label}${details.error ? `: ${details.error}` : ''}`);
}

async function contextFor(width, reducedMotion = 'no-preference') {
  const context = await browser.newContext({
    viewport: { width, height: width < 500 ? 844 : 1000 },
    reducedMotion,
    serviceWorkers: 'block',
  });
  await context.route('**/*', route => {
    const request = route.request();
    return ['GET', 'HEAD', 'OPTIONS'].includes(request.method())
      ? route.continue() : route.abort('blockedbyclient');
  });
  // Use the application's supported no-service-worker path, avoiding a register stub.
  await context.addInitScript(() => { delete Object.getPrototypeOf(navigator).serviceWorker; });
  return context;
}

function captureDiagnostics(page) {
  const diagnostics = { runtimeErrors: [], environmentErrors: [], failedAssets: [], blockedWrites: [] };
  page.on('pageerror', error => diagnostics.runtimeErrors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error') diagnostics.environmentErrors.push(message.text());
  });
  page.on('response', response => {
    if (response.status() >= 400) diagnostics.environmentErrors.push(`${response.status()} ${response.url()}`);
  });
  page.on('requestfailed', request => {
    const detail = { url: request.url(), reason: request.failure()?.errorText || 'unknown' };
    if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method())) diagnostics.blockedWrites.push(detail);
    else if (['font', 'image', 'stylesheet', 'script'].includes(request.resourceType())) diagnostics.failedAssets.push(detail);
    else diagnostics.environmentErrors.push(`${detail.reason} ${detail.url}`);
  });
  return diagnostics;
}

async function revealAll(page) {
  await page.evaluate(async () => {
    for (let top = 0; top < document.documentElement.scrollHeight; top += Math.max(400, innerHeight * 0.8)) {
      scrollTo({ top, behavior: 'instant' });
      await new Promise(resolve => setTimeout(resolve, 45));
    }
    for (const element of document.querySelectorAll('.pg-reveal:not(.is-visible)')) {
      element.scrollIntoView({ block: 'center', behavior: 'instant' });
      await new Promise(resolve => setTimeout(resolve, 70));
    }
    scrollTo({ top: 0, behavior: 'instant' });
  });
  await page.waitForFunction(() => [...document.images].every(image => image.complete));
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(650);
}

async function typographyAndImages(page) {
  const media = await page.evaluate(() => {
    const normalize = family => family.replace(/["']/g, '').trim();
    const loaded = [...document.fonts].filter(font => font.status === 'loaded').map(font => normalize(font.family));
    const type = ['body', 'h1'].map(selector => {
      const style = getComputedStyle(document.querySelector(selector));
      return { selector, family: normalize(style.fontFamily.split(',')[0]), weight: style.fontWeight };
    });
    return {
      type, loaded: [...new Set(loaded)],
      images: [...document.images].map(image => ({ src: image.currentSrc || image.src, loaded: image.complete && image.naturalWidth > 0 })),
    };
  });
  assert.ok(media.images.length, 'Page has no image elements');
  assert.deepEqual(media.images.filter(image => !image.loaded), [], 'A page image failed to load');
  for (const font of media.type) assert.ok(media.loaded.includes(font.family), `${font.selector} font ${font.family} is not a loaded custom FontFace`);
  return media;
}

async function navigation(page, definition) {
  const hrefs = await page.locator('.pg-button, .pg-button-ghost, .pg-nav-cta, #panel a.btn, .pg-nav-links a').evaluateAll(elements =>
    elements.filter(element => element.tagName === 'A').map(element => element.getAttribute('href')));
  assert.ok(hrefs.length >= 4, 'Expected programme navigation and calls to action');
  if (definition.role !== 'ambassador') {
    assert.ok(hrefs.some(href => href.includes(`panel=${definition.role}`) && href.includes('intent=join')), 'Missing role-specific join link');
    assert.ok(hrefs.some(href => href.includes(`panel=${definition.role}`)), 'Missing role-specific auth link');
  } else {
    assert.ok(hrefs.some(href => href.includes('auth.html?next=ambassadors.html')), 'Ambassador sign-in must return to its invitation page');
  }
  for (const href of new Set(hrefs)) {
    assert.ok(href && href !== '#', 'Empty call-to-action target');
    if (href.startsWith('mailto:')) continue;
    const url = new URL(href, page.url());
    if (url.origin !== origin) continue;
    if (url.hash) assert.ok(await page.locator(`[id=${JSON.stringify(decodeURIComponent(url.hash.slice(1)))}]`).count(), `Missing anchor target ${url.hash}`);
    const key = url.origin + url.pathname;
    if (!routeChecks.has(key)) routeChecks.set(key, page.request.get(key).then(response => response.status()));
    assert.equal(await routeChecks.get(key), 200, `CTA route ${key} did not return 200`);
  }
}

async function creator(page) {
  const demo = page.locator('[data-creator-demo]');
  const initialTitle = await demo.locator('[data-demo-title]').innerText();
  const initialImage = await demo.locator('[data-demo-image]').getAttribute('src');
  await demo.locator('[data-setting="city"]').click();
  await page.waitForFunction(title => document.querySelector('[data-demo-title]').textContent !== title, initialTitle);
  assert.notEqual(await demo.locator('[data-demo-image]').getAttribute('src'), initialImage);
  assert.equal(await demo.locator('[data-setting="city"]').getAttribute('aria-pressed'), 'true');
  const story = await demo.locator('[data-demo-caption]').innerText();
  await demo.locator('[data-mood="minimal"]').click();
  assert.notEqual(await demo.locator('[data-demo-caption]').innerText(), story, 'Caption mood did not change');
  assert.equal(await demo.locator('[data-mood="minimal"]').getAttribute('aria-pressed'), 'true');
  assert.match(await demo.locator('[data-demo-caption]').innerText(), /commission/i, 'Sample caption lost its disclosure');
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  await demo.locator('[data-copy-post]').click();
  await page.waitForFunction(() => /copied|selected/i.test(document.querySelector('[data-copy-status]').textContent));
  const copyStatus = await demo.locator('[data-copy-status]').innerText();
  if (/copied/i.test(copyStatus)) assert.equal((await page.evaluate(() => navigator.clipboard.readText())).replace(/\r\n/g, '\n'), await demo.locator('[data-demo-caption]').textContent());
  // Force denied clipboard permission to exercise the accessible selection fallback.
  await page.evaluate(() => { Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: () => Promise.reject(new Error('QA: clipboard denied')) } }); });
  await demo.locator('[data-copy-post]').click();
  await page.waitForFunction(() => /selected/i.test(document.querySelector('[data-copy-status]').textContent));
  assert.equal(await page.evaluate(() => getSelection().toString()), await demo.locator('[data-demo-caption]').textContent());
}

async function calculator(page) {
  const demo = page.locator('[data-agent-demo]');
  for (const [selector, value] of [['#demo-value', '50000'], ['#demo-rate', '12']]) {
    await demo.locator(selector).evaluate((input, value) => { input.value = value; input.dispatchEvent(new Event('input', { bubbles: true })); }, value);
  }
  await page.waitForFunction(() => document.querySelector('[data-commission]').textContent.replace(/\s/g, '') === 'KES6,000');
  assert.equal((await demo.locator('[data-booking-label]').innerText()).trim(), 'KES 50,000');
  assert.equal((await demo.locator('[data-ledger-rate]').innerText()).trim(), '12%');
  await demo.locator('#demo-rate').focus();
  await page.keyboard.press('ArrowRight');
  await page.waitForFunction(() => document.querySelector('[data-commission]').textContent.replace(/\s/g, '') === 'KES6,500');
}

async function ambassador(page) {
  const buttons = page.locator('[data-amb-stage]');
  assert.equal(await buttons.count(), 4);
  const titles = [];
  for (let index = 0; index < 4; index++) {
    await buttons.nth(index).click();
    await page.waitForFunction(index => document.querySelector('#amb-journey-detail').dataset.activeStage === String(index), index);
    assert.equal(await buttons.nth(index).getAttribute('aria-pressed'), 'true');
    assert.equal(await page.locator('[data-amb-stage][aria-pressed="true"]').count(), 1);
    titles.push(await page.locator('#amb-example-title').innerText());
  }
  assert.equal(new Set(titles).size, 4, 'All four stages must present distinct titles');
}

async function motion(page) {
  const toggle = page.locator('[data-motion-toggle]').first();
  assert.ok(await toggle.count(), 'Missing motion control');
  assert.equal(await toggle.getAttribute('aria-pressed'), 'false');
  assert.ok(await page.evaluate(() => document.getAnimations().some(animation => animation.playState === 'running')), 'No running animation in normal motion mode');
  await toggle.click();
  assert.equal(await toggle.getAttribute('aria-pressed'), 'true');
  await page.waitForTimeout(150);
  assert.equal(await page.evaluate(() => document.getAnimations().filter(animation => animation.playState === 'running').length), 0, 'Pause left running animations');
  await toggle.click();
  assert.equal(await toggle.getAttribute('aria-pressed'), 'false');
  assert.ok(await page.evaluate(() => document.getAnimations().some(animation => animation.playState === 'running')), 'Resume did not restart animation');
}

async function invitationStates() {
  const fixtures = [
    { name: 'signed out', signedIn: false, heading: 'This is a private door.' },
    { name: 'invited', verdict: { ok: true, enrolled: false, full_name: 'QA Example', region: 'Nairobi' }, heading: 'Welcome. Let us set you up.' },
    { name: 'unconfirmed', verdict: { ok: false, reason: 'email_unconfirmed', email: 'qa@example.com' }, heading: 'Confirm your email first.' },
    { name: 'not invited', verdict: { ok: false, reason: 'not_authorised', email: 'qa@example.com' }, heading: 'This area is for ambassadors.' },
    { name: 'suspended', verdict: { ok: false, reason: 'suspended' }, heading: 'Your access is paused.' },
    { name: 'enrolled', verdict: { ok: true, enrolled: true }, redirect: true },
  ];
  for (const fixture of fixtures) {
    const context = await contextFor(390, 'reduce');
    const page = await context.newPage();
    page.setDefaultTimeout(12000);
    const diagnostics = captureDiagnostics(page);
    await context.addInitScript(signedIn => {
      const state = signedIn ? { status: 'user', user: { id: 'qa', email: 'qa@example.com' }, session: { access_token: 'fixture-only' } } : { status: 'guest' };
      window.ApaSession = { ready: callback => setTimeout(() => callback(state), 0), subscribe: callback => callback(state), get: () => state, client: () => ({ auth: { getSession: async () => ({ data: { session: state.session || null } }) } }) };
    }, fixture.signedIn !== false);
    // Fulfilled in the browser: no fixture requests reach a real backend.
    await context.route('**/api/ambassadors?*', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(fixture.verdict || { ok: false }) }));
    if (fixture.redirect) await context.route('**/ambassador-dashboard.html', route => route.fulfill({ status: 200, contentType: 'text/html', body: '<title>Verified dashboard destination</title>' }));
    try {
      await page.goto(`${origin}/ambassadors.html#access`, { waitUntil: 'domcontentloaded' });
      if (fixture.redirect) await page.waitForURL('**/ambassador-dashboard.html');
      else {
        await page.locator('#panel h2').filter({ hasText: fixture.heading }).waitFor();
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'Invitation state overflows the mobile viewport');
        if (fixture.name === 'invited') {
          assert.equal(await page.locator('#e-name').inputValue(), 'QA Example');
          assert.ok(await page.locator('#e-submit').isEnabled());
        }
      }
      assert.deepEqual(diagnostics.runtimeErrors, []);
      record(`ambassador invitation: ${fixture.name}`, true);
    } catch (error) { record(`ambassador invitation: ${fixture.name}`, false, { error: error.message, diagnostics }); }
    finally { await context.close(); }
  }
}

try {
  for (const definition of pages) {
    for (const width of [1440, 768, 390, 320]) {
      const context = await contextFor(width);
      const page = await context.newPage();
      page.setDefaultTimeout(12000);
      const diagnostics = captureDiagnostics(page);
      const label = `${definition.name} ${width}px`;
      let media;
      try {
        const response = await page.goto(`${origin}/${definition.name}.html`, { waitUntil: 'domcontentloaded' });
        assert.equal(response.status(), 200);
        await page.locator('h1').waitFor({ state: 'visible' });
        await page.locator(definition.demo).first().waitFor({ state: 'attached' });
        await revealAll(page);
        const layout = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, content: document.documentElement.scrollWidth }));
        assert.ok(layout.content <= layout.viewport + 1, `Horizontal overflow: ${layout.content}px content / ${layout.viewport}px viewport`);
        media = await typographyAndImages(page);
        if (width === 1440) {
          await navigation(page, definition);
          if (definition.role === 'influencer') await creator(page);
          if (definition.role === 'agent') await calculator(page);
          if (definition.role === 'ambassador') await ambassador(page);
          await motion(page);
        }
        assert.deepEqual(diagnostics.runtimeErrors, [], 'Uncaught browser runtime errors');
        record(label, true, { media, diagnostics });
      } catch (error) {
        record(label, false, { error: error.message, media, diagnostics });
      } finally {
        if (width === 1440 || width === 390) {
          await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' })).catch(() => {});
          await page.screenshot({ path: resolve(output, `${definition.name}-${width === 1440 ? 'desktop' : 'mobile'}.png`), fullPage: true, animations: 'disabled', timeout: 15000 }).catch(error => record(`${label} screenshot`, false, { error: error.message }));
        }
        await context.close();
      }
    }
    const context = await contextFor(390, 'reduce');
    const page = await context.newPage();
    const diagnostics = captureDiagnostics(page);
    try {
      await page.goto(`${origin}/${definition.name}.html`, { waitUntil: 'domcontentloaded' });
      await revealAll(page);
      assert.equal(await page.evaluate(() => document.getAnimations().filter(animation => animation.playState === 'running').length), 0, 'Reduced motion left running animations');
      // A site's toggle must not override the operating-system preference.
      await page.locator('[data-motion-toggle]').first().click();
      await page.waitForTimeout(200);
      assert.equal(await page.evaluate(() => document.getAnimations().filter(animation => animation.playState === 'running').length), 0, 'Motion control overrode reduced-motion preference');
      assert.deepEqual(diagnostics.runtimeErrors, []);
      record(`${definition.name} reduced motion`, true, { diagnostics });
    } catch (error) {
      record(`${definition.name} reduced motion`, false, { error: error.message, diagnostics });
    } finally { await context.close(); }
  }
  await invitationStates();
} finally {
  await browser.close();
  if (localServer) await new Promise(resolve => localServer.close(resolve));
  await writeFile(resolve(output, 'report.json'), JSON.stringify({ origin, checkedAt: new Date().toISOString(), results }, null, 2));
}

const failed = results.filter(result => !result.passed);
console.log(`\n${results.length - failed.length}/${results.length} checks passed. Artifacts: ${output}`);
process.exitCode = failed.length ? 1 : 0;
