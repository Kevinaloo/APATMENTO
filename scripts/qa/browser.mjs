import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { services, requiredJourneys } from './catalog.mjs';
import { assertStaging } from './core.mjs';

export async function loadBrowser(env = process.env) {
  return import(env.QA_PLAYWRIGHT_MODULE ? pathToFileURL(env.QA_PLAYWRIGHT_MODULE).href : 'playwright');
}

export async function eventually(fn, timeout = 10_000) {
  const end = Date.now() + timeout;
  let error;
  do {
    try { return await fn(); } catch (e) { error = e; }
    await new Promise(resolve => setTimeout(resolve, 150));
  } while (Date.now() < end);
  throw error;
}

export async function protectContext(context, origin, { mutating = false, allowedOrigins = [], bypass } = {}) {
  // Route interception cannot see service-worker-owned requests. Exercise the
  // application's supported no-service-worker path instead of Playwright's
  // register() stub (which resolves undefined and creates artificial crashes).
  if (context.addInitScript) await context.addInitScript(() => {
    delete Object.getPrototypeOf(navigator).serviceWorker;
  });
  await context.route('**/*', async route => {
    const req = route.request(), url = new URL(req.url());
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return route.continue();
    const write = !['GET', 'HEAD', 'OPTIONS'].includes(req.method());
    if (write && (!mutating || ![origin, ...allowedOrigins].includes(url.origin))) return route.abort('blockedbyclient');
    const headers = { ...req.headers() };
    // A request-level header avoids leaking the Vercel bypass secret to CDNs.
    delete headers['x-vercel-protection-bypass'];
    if (url.origin === origin && bypass) headers['x-vercel-protection-bypass'] = bypass;
    await route.continue({ headers });
  });
}

async function launch(env) {
  const { chromium } = await loadBrowser(env);
  return chromium.launch({ headless: true, ...(env.QA_BROWSER_CHANNEL ? { channel: env.QA_BROWSER_CHANNEL } : {}) });
}

export async function publicBrowser(origin, record, output, env = process.env) {
  const browser = await launch(env);
  const databases = new Set();
  const networkWarnings = new Set();
  let failed = false;
  async function check(id, viewport, fn, kind = 'browser') {
    const context = await browser.newContext({ viewport, reducedMotion: 'reduce', serviceWorkers: 'block' });
    await protectContext(context, origin, { bypass: env.QA_VERCEL_BYPASS_SECRET });
    context.on('request', request => {
      const url = new URL(request.url());
      if (url.hostname.endsWith('.supabase.co')) databases.add(url.origin);
    });
    context.on('requestfailed', request => {
      const url = new URL(request.url()), failure = request.failure()?.errorText || '';
      if (url.origin !== origin && ['image', 'font', 'stylesheet'].includes(request.resourceType())
          && !/ABORTED|BLOCKED_BY_CLIENT/i.test(failure)) networkWarnings.add(`${url.hostname}${url.pathname}`);
    });
    const page = await context.newPage(), errors = [];
    page.setDefaultTimeout(12_000); page.setDefaultNavigationTimeout(25_000);
    page.on('pageerror', error => errors.push(error.message));
    await page.addLocatorHandler(page.locator('.ccp-wrap.ccp-on'), async popup => {
      await popup.locator('button[data-ccp-close]').click();
    });
    await page.addLocatorHandler(page.locator('#apa-loc-gate.show'), async popup => {
      await popup.locator('button.apa-loc-x').click();
    });
    try {
      await fn(page);
      assert.deepEqual(errors, [], 'Uncaught JavaScript exceptions');
      record({ id, kind, status: 'passed', detail: 'Deployed UI assertions passed in Chromium.' });
    } catch (error) {
      failed = true;
      const name = id.replace(/[^a-z0-9.-]/gi, '-');
      await page.screenshot({ path: join(output, `${name}.png`), fullPage: true, timeout: 5000 }).catch(() => {});
      record({ id, kind, status: 'failed', detail: `${error.message}; screenshot: ${name}.png` });
    } finally { await context.close(); }
  }
  try {
    await mkdir(output, { recursive: true });
    for (const service of services) {
      await check(`${service.id}.page`, { width: 1440, height: 1000 }, async page => {
        const response = await page.goto(origin + service.path, { waitUntil: 'domcontentloaded' });
        assert.equal(response.status(), 200);
        await page.locator('h1').first().waitFor({ state: 'visible' });
        assert.ok((await page.title()).length > 4);
        assert.equal(new URL(page.url()).origin, origin, 'Navigation escaped deployment');
        const assets = await page.locator('script[src], link[rel="stylesheet"]').evaluateAll(nodes => nodes.map(n => n.src || n.href));
        for (const asset of assets.filter(a => new URL(a).origin === origin)) {
          const res = await contextRequest(page, asset, env);
          assert.equal(res.status(), 200, `First-party asset missing: ${new URL(asset).pathname}`);
        }
      });
      await check(`${service.id}.mobile-navigation`, { width: 390, height: 844 }, async page => {
        await page.goto(origin + '/', { waitUntil: 'domcontentloaded' });
        // The home route intentionally redirects all visitors to dashboard.
        // Exercise its primary service tiles, not far-off footer links.
        await page.waitForURL(url => ['/dashboard', '/dashboard.html'].includes(url.pathname));
        await page.locator('#cbp-splash').waitFor({ state: 'hidden', timeout: 20_000 });
        const link = page.locator(service.id === 'stays' ? '.svc-stays-mega' : `.svc-icon-tile[onclick="navigateToService('${service.id}')"]`);
        await link.click();
        await page.waitForURL(url => url.origin === origin && [service.path, service.path + '.html'].includes(url.pathname));
        await page.locator('h1').first().waitFor({ state: 'visible' });
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
        assert.ok(overflow <= 4, `Mobile page overflows by ${overflow}px`);
      }, 'journey');
    }
    for (const [name, fn] of [
      ['login-validation', async page => { await page.locator('#login-btn').click(); assert.ok(await page.locator('#login-email-err').innerText()); }],
      ['signup-validation', async page => { await page.locator('#tab-signup').click(); await page.locator('#install-skip-btn').click(); await page.locator('#signup-btn').click(); assert.ok(await page.locator('#signup-first-err').innerText()); }],
      ['reset-validation', async page => { await page.getByRole('button', { name: 'Forgot password?' }).click(); await page.locator('#reset-btn').click(); assert.match(await page.locator('#reset-alert-error').innerText(), /valid email/i); }],
    ]) {
      await check(`auth.${name}`, { width: 390, height: 844 }, async page => {
        await page.goto(origin + '/auth', { waitUntil: 'domcontentloaded' });
        await fn(page);
      });
    }
  } finally { await browser.close(); }
  for (const path of networkWarnings) record({ id: `asset-warning:${path}`, kind: 'asset', status: 'warning', detail: 'External visual asset failed to load; inspect network availability and provider health.' });
  const expectedDatabase = env.QA_SUPABASE_PROJECT_REF && `https://${env.QA_SUPABASE_PROJECT_REF}.supabase.co`;
  record({ id: 'database-target', kind: 'check', status: !expectedDatabase || !databases.size ? 'blocked'
    : databases.size === 1 && databases.has(expectedDatabase) ? 'passed' : 'failed',
  detail: expectedDatabase && databases.size ? `Browser database origins: ${[...databases].join(', ')}; expected ${expectedDatabase}` : 'Database project binding could not be verified from browser requests and configuration.' });
  record({ id: 'browser', kind: 'check', status: failed ? 'failed' : 'passed', detail: 'Nine service pages, nine mobile navigation journeys and three authentication validation checks.' });
}

async function contextRequest(page, url, env) {
  return page.request.get(url, { headers: env.QA_VERCEL_BYPASS_SECRET ? { 'x-vercel-protection-bypass': env.QA_VERCEL_BYPASS_SECRET } : {}, maxRedirects: 0 });
}

export function validatePlan(plan) {
  assert.ok(Array.isArray(plan.steps) && plan.steps.length, 'Journey needs steps');
  const actions = new Set(['click', 'fill', 'select', 'check', 'upload', 'drag', 'click-response']);
  assert.ok(plan.steps.some(s => actions.has(s.action)), 'Journey must exercise an interaction');
  assert.ok(plan.steps.some(s => s.action?.startsWith('expect-') || s.action === 'click-response'), 'Journey must assert an observable result');
  assert.ok(Array.isArray(plan.cleanup) && plan.cleanup.length, 'Staging journey needs explicit cleanup steps');
}

function value(input, variables, env) {
  return String(input ?? '').replace(/\$\{([^}]+)\}/g, (_, name) => {
    const result = variables[name] ?? env[name];
    if (result === undefined) throw Error(`Missing journey variable ${name}`);
    return String(result);
  });
}

export async function executeSteps(page, steps, { origin, variables = {}, env = process.env, inboxOrigins = [] }) {
  for (const step of steps) {
    const v = input => value(input, variables, env);
    const locator = step.selector ? page.locator(v(step.selector)) : null;
    switch (step.action) {
      case 'goto': {
        const url = new URL(v(step.path), origin);
        assert.equal(url.origin, origin, 'Journey navigation must stay on staging');
        const response = await page.goto(url.href, { waitUntil: 'domcontentloaded' });
        assert.ok(response?.ok(), 'Journey page failed to load'); break;
      }
      case 'fill': await locator.fill(v(step.value)); break;
      case 'click': await locator.click(); break;
      case 'check': await locator.setChecked(step.checked ?? true); break;
      case 'select': await locator.selectOption(v(step.value)); break;
      case 'upload': await locator.setInputFiles(step.files.map(file => v(file))); break;
      case 'drag': await locator.dragTo(page.locator(v(step.target))); break;
      case 'reload': await page.reload({ waitUntil: 'domcontentloaded' }); break;
      case 'expect-visible': await locator.waitFor({ state: 'visible' }); break;
      case 'expect-hidden': await locator.waitFor({ state: 'hidden' }); break;
      case 'expect-text': await eventually(async () => assert.ok((await locator.innerText()).includes(v(step.value)), 'Expected text not rendered')); break;
      case 'expect-count': await eventually(async () => assert.equal(await locator.count(), step.count)); break;
      case 'expect-url': await page.waitForURL(url => url.origin === origin && url.pathname === v(step.path)); break;
      case 'expect-storage': await eventually(async () => assert.equal(await page.evaluate(key => localStorage.getItem(key), v(step.key)), v(step.value))); break;
      case 'click-response': {
        assert.ok(step.path && step.method && Number.isInteger(step.status), 'Response assertion needs path, method and status');
        const pending = page.waitForResponse(response => new URL(response.url()).pathname === v(step.path) && response.request().method() === step.method);
        const [response] = await Promise.all([pending, locator.click()]);
        assert.equal(response.status(), step.status, 'Unexpected backend response');
        if (step.json) {
          const body = await response.json();
          for (const [key, expected] of Object.entries(step.json)) assert.equal(body[key], typeof expected === 'string' ? v(expected) : expected, `Response field ${key}`);
        }
        break;
      }
      case 'expect-inbox': {
        const url = new URL(v(step.url));
        assert.ok(inboxOrigins.includes(url.origin), 'Inbox must be an allowlisted test mail sink');
        // The sink must return only messages for this unique run. Never record bodies.
        url.searchParams.set('runId', variables.runId);
        await eventually(async () => {
          const response = await page.request.get(url.href, { maxRedirects: 0, headers: { Authorization: `Bearer ${env.QA_INBOX_TOKEN || ''}` }, timeout: 10_000 });
          assert.equal(response.status(), 200);
          const body = await response.json();
          assert.ok(body.messages?.some(m => m.runId === variables.runId && m.to === v(step.to) && m.subject.includes(v(step.subject))), 'Correlated email not delivered');
        }, 30_000);
        break;
      }
      default: throw Error(`Unknown journey action: ${step.action}`);
    }
  }
}

export async function stagingBrowser(origin, config, record, runId, env = process.env) {
  const plans = config.journeys || {};
  const known = new Set(requiredJourneys.map(j => j.id));
  for (const id of Object.keys(plans)) assert.ok(known.has(id), `Unknown journey id ${id}`);
  // N/A is a reviewed product decision; it is never silently inferred from a skip.
  for (const [id, reason] of Object.entries(config.notApplicable || {})) {
    assert.ok(known.has(id) && typeof reason === 'string' && reason.trim().length > 15 && !plans[id], `Invalid applicability decision for ${id}`);
    record({ id, kind: 'journey', status: 'not-applicable', detail: reason });
  }
  if (!Object.keys(plans).length) return;
  assertStaging(config, env);
  assert.equal(origin, config.stagingOrigins.find(o => o === origin));
  const allowedOrigins = [config.stagingSupabaseOrigin].filter(Boolean);
  assert.ok(allowedOrigins.length, 'Staging Supabase origin is required to isolate browser writes');
  assert.equal(config.stagingSupabaseOrigin, `https://${env.QA_SUPABASE_PROJECT_REF}.supabase.co`);
  const browser = await launch(env);
  try {
    for (const [id, plan] of Object.entries(plans)) {
      validatePlan(plan);
      const context = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block', reducedMotion: 'reduce' });
      await protectContext(context, origin, { mutating: true, allowedOrigins, bypass: env.QA_VERCEL_BYPASS_SECRET });
      const page = await context.newPage();
      page.setDefaultTimeout(15_000); page.setDefaultNavigationTimeout(25_000);
      const opts = { origin, env, inboxOrigins: config.inboxOrigins || [], variables: { ...config.variables, ...plan.variables, runId } };
      let status = 'passed', detail = 'Staging interactions and assertions passed.';
      try { await executeSteps(page, plan.steps, opts); }
      catch (error) { status = 'failed'; detail = error.message; }
      finally {
        try { await executeSteps(page, plan.cleanup, opts); }
        catch (error) { record({ id: `${id}.cleanup`, kind: 'check', status: 'failed', detail: error.message }); }
        await context.close();
      }
      record({ id, kind: 'journey', status, detail: `${detail} Target: ${origin}` });
    }
  } finally { await browser.close(); }
}
