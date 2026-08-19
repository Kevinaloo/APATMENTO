/* ═══════════════════════════════════════════════════════════════════════════
   AMBASSADOR UI · BROWSER TESTS
   ─────────────────────────────────────────────────────────────────────────
   Drives ambassadors.html and ambassador-dashboard.html in real Chromium,
   against tests/ui/stub-server.js.

   Two halves:

     RENDER   every gate state, in both themes, plus a phone viewport. Each
              one asserts the boot curtain actually lifted, nothing overflows
              horizontally, and no script threw. A dashboard stuck behind its
              own loading screen is the failure mode that matters most here,
              because it looks like a network problem and is not.

     BEHAVIOUR the things an ambassador does on their first day: read the
              numbers, filter the pipeline, copy the link, claim a lead,
              switch the theme.

   apa-session.js bails if window.ApaSession already exists, so an init
   script cleanly substitutes a stub for the real Supabase-backed session.

     node tests/ui/ambassador-ui.test.js        (see run-ambassador-ui.sh)
   ═══════════════════════════════════════════════════════════════════════════ */
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const PORT = Number(process.env.UI_TEST_PORT || 8899);
const BASE = 'http://localhost:' + PORT;
const SHOTS = process.env.UI_TEST_SHOTS || '';

/* Playwright lives in a scratch dir, not the repo — this is a static site
   with no dependencies and adding one would change how it deploys. */
let chromium;
try {
  /* A bare specifier will not resolve from a scratch dir, and a plain
     absolute path is not a valid ESM specifier — it has to be a file: URL. */
  /* index.mjs is the ESM entry; index.js is CJS and its named exports do
     not survive an ESM import, which fails later as `chromium is undefined`
     rather than as an import error. */
  const spec = process.env.PW_PATH
    ? pathToFileURL(path.join(process.env.PW_PATH, 'index.mjs')).href
    : 'playwright';
  ({ chromium } = await import(spec));
} catch (e) {
  console.error('playwright not available:', e.message);
  console.error('Run tests/ui/run-ambassador-ui.sh, which installs it.');
  process.exit(2);
}

let fails = 0;
const ok = (cond, label) => {
  console.log((cond ? '  ok    ' : '  FAIL  ') + label);
  if (!cond) fails++;
};

const stub = (signedIn) => `
window.ApaSession = {
  ready(fn){ setTimeout(()=>fn(${signedIn}
    ? {status:'user', user:{id:'amb-1', email:'amara@example.com'}, session:{access_token:'stub'}}
    : {status:'guest'}), 10); },
  subscribe(fn){ this.ready(fn); },
  get(){ return {status:'${signedIn ? 'user' : 'guest'}'}; },
  signOut(){},
  client(){ return { auth: {
    getSession: async () => ({ data: { session: ${signedIn ? "{access_token:'stub'}" : 'null'} } }),
    resend: async () => ({ error: null })
  } }; }
};`;

/* Google Fonts is unreachable in CI and behind the agent proxy, and waiting
   on it turns every test into a timeout. Block everything off-host. */
const localOnly = ctx => ctx.route('**/*', r =>
  r.request().url().startsWith(BASE) ? r.continue() : r.abort());

async function makeCtx(browser, { theme = 'light', scenario = 'ok', signedIn = true, mobile = false } = {}) {
  const ctx = await browser.newContext({
    viewport: mobile ? { width: 390, height: 844 } : { width: 1280, height: 1000 },
    deviceScaleFactor: mobile ? 2 : 1,
    isMobile: mobile, hasTouch: mobile,
    colorScheme: theme,
  });
  await localOnly(ctx);
  await ctx.addCookies([{ name: 'scenario', value: scenario, url: BASE }]);
  await ctx.addInitScript(stub(signedIn));
  return ctx;
}

const CASES = [
  { name: 'gateway-signedout',   page: '/ambassadors.html',          signedIn: false, scenario: 'ok' },
  { name: 'gateway-enrol',       page: '/ambassadors.html',          signedIn: true,  scenario: 'enrol' },
  { name: 'gateway-notauth',     page: '/ambassadors.html',          signedIn: true,  scenario: 'notauth' },
  { name: 'gateway-unconfirmed', page: '/ambassadors.html',          signedIn: true,  scenario: 'unconfirmed' },
  { name: 'gateway-suspended',   page: '/ambassadors.html',          signedIn: true,  scenario: 'suspended' },
  { name: 'dashboard',           page: '/ambassador-dashboard.html', signedIn: true,  scenario: 'ok' },
];

async function renderPass(browser) {
  console.log('\n── RENDER ──');
  for (const theme of ['light', 'dark']) {
    for (const c of CASES) {
      const ctx = await makeCtx(browser, { theme, scenario: c.scenario, signedIn: c.signedIn });
      const errors = [];
      const page = await ctx.newPage();
      page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
      page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()); });

      await page.goto(BASE + c.page, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1700);

      const stuck = await page.evaluate(() => {
        const b = document.querySelector('.boot');
        return !!(b && !b.hasAttribute('hidden') && !b.classList.contains('gone'));
      });
      const overflow = await page.evaluate(() =>
        document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);

      if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `${c.name}-${theme}.png`), fullPage: true });

      const bad = errors.filter(e => !/favicon|net::ERR/i.test(e));
      const problems = [];
      if (stuck)      problems.push('BOOT-STUCK');
      if (overflow)   problems.push('H-OVERFLOW');
      if (bad.length) problems.push('JS-ERR');
      ok(problems.length === 0, `${c.name} · ${theme}` + (problems.length ? '  [' + problems.join(' ') + ']' : ''));
      bad.slice(0, 2).forEach(e => console.log('          ' + e.slice(0, 140)));
      await ctx.close();
    }
  }

  /* Phones are the primary device for this audience. A dashboard that
     overflows on a 390px viewport is a dashboard nobody can use in the field. */
  const ctx = await makeCtx(browser, { theme: 'dark', mobile: true });
  const p = await ctx.newPage();
  await p.goto(BASE + '/ambassador-dashboard.html', { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(1500);
  const mOver = await p.evaluate(() =>
    document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  if (SHOTS) await p.screenshot({ path: path.join(SHOTS, 'dashboard-mobile.png'), fullPage: true });
  ok(!mOver, 'dashboard · 390px phone, no horizontal overflow');
  await ctx.close();
}

async function alignmentPass(browser) {
  console.log('\n── ALIGNMENT ──');
  for (const w of [1440, 1280, 900]) {
    const ctx = await makeCtx(browser, { theme: 'dark', scenario: 'enrol' });
    const p = await ctx.newPage();
    await p.setViewportSize({ width: w, height: 900 });
    await p.goto(BASE + '/ambassadors.html', { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(1300);
    const m = await p.evaluate(() => ({
      hero:  Math.round(document.querySelector('.display').getBoundingClientRect().left),
      panel: Math.round(document.querySelector('#panel').getBoundingClientRect().left),
      rates: Math.round(document.querySelector('.rates .eyebrow').getBoundingClientRect().left),
    }));
    ok(m.hero === m.panel && m.panel === m.rates,
       `gateway columns align at ${w}px (hero=${m.hero} panel=${m.panel} rates=${m.rates})`);
    await ctx.close();
  }
}

async function revealPass(browser) {
  console.log('\n── REVEALS ──');
  const ctx = await makeCtx(browser, { theme: 'light' });
  const p = await ctx.newPage();
  await p.goto(BASE + '/ambassador-dashboard.html', { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(1400);

  await p.evaluate(async () => {
    for (let y = 0; y <= document.body.scrollHeight; y += 400) {
      window.scrollTo(0, y); await new Promise(r => setTimeout(r, 80));
    }
  });
  await p.waitForTimeout(2200);

  /* Content that scrolls into view must end up fully opaque. A reveal that
     never fires leaves a section permanently invisible, and the page still
     "works" — which is exactly why it needs a test. */
  const hidden = await p.$$eval('.reveal', els =>
    els.filter(e => getComputedStyle(e).opacity !== '1').length);
  ok(hidden === 0, `every reveal settles visible after scrolling (${hidden} stuck)`);

  const board = await p.$eval('#board', e => e.textContent.trim().length);
  ok(board > 40, 'leaderboard populates');
  await ctx.close();
}

async function behaviourPass(browser) {
  console.log('\n── BEHAVIOUR ──');
  const ctx = await makeCtx(browser, { theme: 'light' });
  await ctx.grantPermissions(['clipboard-read', 'clipboard-write']);
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.goto(BASE + '/ambassador-dashboard.html', { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(1500);

  ok((await p.textContent('#earn-total')).includes('48,250'), 'earnings count up to the API total');
  ok((await p.textContent('#earn-avail')).includes('31,400'), 'matured split is correct');
  ok((await p.textContent('#earn-hold')).includes('16,850'),  'held split is correct');
  ok((await p.textContent('.ring-num')) === '7',              'ring lands on this month’s count');

  const all = await p.$$eval('.lead', e => e.length);
  await p.click('[data-filter="claimed"]'); await p.waitForTimeout(250);
  const claimed = await p.$$eval('.lead', e => e.length);
  ok(all === 6 && claimed === 2, `tabs filter the pipeline (${all} all → ${claimed} claimed)`);
  await p.click('[data-filter="all"]'); await p.waitForTimeout(200);

  const warns = await p.$$eval('.lead .small', e => e.map(x => x.textContent.trim()).filter(Boolean));
  ok(warns.some(w => /Lapses in \d+ day/.test(w)), 'an imminent lapse is called out');
  ok(warns.length === 1, 'a claim with weeks left is not warned about');

  await p.click('#copy'); await p.waitForTimeout(400);
  ok((await p.evaluate(() => navigator.clipboard.readText())).includes('AMB-7K2P9X'),
     'copy puts the referral link on the clipboard');
  ok(await p.isVisible('.toast'), 'a toast confirms the copy');

  await p.click('#claim-open'); await p.waitForTimeout(450);
  ok(await p.isVisible('#claim-modal .modal-body'), 'claim modal opens');
  ok((await p.evaluate(() => document.activeElement && document.activeElement.id)) === 'c-name',
     'focus lands in the first field');

  await p.click('[data-kind="email"]'); await p.waitForTimeout(150);
  ok((await p.getAttribute('#c-contact', 'type')) === 'email'
     && /address/.test(await p.textContent('#c-hint')),
     'contact-kind switch rewrites the field and its hint');
  await p.click('[data-kind="phone"]'); await p.waitForTimeout(150);

  await p.fill('#c-name', 'Test Person');
  await p.fill('#c-contact', '0712000999');
  await p.click('#c-submit'); await p.waitForTimeout(700);
  ok(!(await p.isVisible('#claim-modal .modal-body')), 'modal closes after a successful claim');
  ok((await p.$$eval('.lead', e => e.length)) === all + 1, 'the new claim is prepended to the pipeline');

  await p.click('#claim-open'); await p.waitForTimeout(350);
  await p.keyboard.press('Escape'); await p.waitForTimeout(300);
  ok(!(await p.isVisible('#claim-modal .modal-body')), 'Escape closes the modal');

  const t1 = await p.evaluate(() => document.documentElement.getAttribute('data-theme'));
  await p.click('#theme'); await p.waitForTimeout(200);
  const t2 = await p.evaluate(() => document.documentElement.getAttribute('data-theme'));
  ok(t1 !== t2, `theme toggle changes the theme (${t1} → ${t2})`);
  await p.reload({ waitUntil: 'domcontentloaded' }); await p.waitForTimeout(1300);
  ok((await p.evaluate(() => document.documentElement.getAttribute('data-theme'))) === t2,
     'theme survives a reload');

  ok(errs.length === 0, 'no uncaught JS errors' + (errs.length ? ': ' + errs[0] : ''));
  await ctx.close();
}

const browser = await chromium.launch({
    args: ['--no-sandbox'],
  executablePath: process.env.PW_CHROMIUM || undefined,
});

await renderPass(browser);
await alignmentPass(browser);
await revealPass(browser);
await behaviourPass(browser);
await browser.close();

console.log(fails ? `\n${fails} failure(s)` : '\nAll UI checks passed');
process.exit(fails ? 1 : 0);
