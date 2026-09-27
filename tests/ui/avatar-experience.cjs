// Run: node tests/ui/avatar-experience.cjs
// Uses a local fixture server and a stateful API double; never writes a real
// account. CABANA_BROWSER_PATH or CABANA_BROWSER_CHANNEL overrides Chrome.
const { chromium, expect } = require(process.env.CABANA_PLAYWRIGHT || '@playwright/test');
const { createServer } = require('node:http');
const { readFileSync, mkdirSync } = require('node:fs');
const { resolve, extname, sep } = require('node:path');
const assert = require('node:assert/strict');
const root = resolve(__dirname, '../..'), out = resolve(root, 'artifacts/avatar-ui');
const ME = '11111111-1111-4111-8111-111111111111';
const initialAvatar = { v: 1, k: 'a', a: 2, t: 0, x: 0, b: 3, mo: 2, n: 'twiga' };
const db = {
  failNextSave: false, saves: [],
  settings: { display_name: 'Amani O.', handle: 'amani.o', headline: '', bio: '', account_type: 'individual', org_kind: null, org_website: null,
    city: '', country_code: null, show_location: false, languages: [], interests: [], theme: 'equator', avatar: initialAvatar,
    published: false, show_followers: true, allow_follow: true, show_listings: true, photo_url: null, photo_status: 'none', photo_pending: false, photo_locked: false },
};
function card() {
  const s = db.settings;
  return { id: ME, name: s.display_name, level: 'self', handle: s.handle, type: s.account_type, avatar: s.avatar, photo: null, badge: null, headline: s.headline, can_follow: false };
}
function profile() {
  return { ...card(), bio: db.settings.bio, theme: db.settings.theme, roles: ['traveller'], member_since: '2026-01', operators: [], languages: [], interests: [], listings: [],
    stats: { followers: 2, following: 5, listings: 0, reviews: 0, rating: null }, viewer: { signed_in: true, self: true, following: false }, settings: { ...db.settings },
    verification: { identity: { state: 'not_started', available: false, session: null, last_decline: null }, organization: null, can_upload_photo: false, provider: false } };
}
const mock = `(()=>{
  const user={id:${JSON.stringify(ME)},email:'avatar-qa@example.test',created_at:'2026-01-01',user_metadata:{first_name:'Amani'}};
  let state={status:'user',user,name:'Amani',initial:'A',role:'guest',isAdmin:false};
  const subscriptions=new Set(),authListeners=new Set();
  const query=table=>{let single=false;const values=table==='profiles'?[{id:user.id,first_name:'Amani',last_role:'guest'}]:[];
    const q={then:(yes,no)=>Promise.resolve({data:single?values[0]||null:values,error:null,count:0}).then(yes,no)};
    for(const k of ['select','limit','order','or','in','gte','lte','gt','lt','neq','is','not','filter','eq','insert','update','upsert','delete','range'])q[k]=()=>q;
    q.single=q.maybeSingle=()=>(single=true,q);return q;};
  const channel={on(){return this},subscribe(){return this},unsubscribe(){}};
  const session=()=>state.user?{user:state.user,access_token:'qa-only'}:null;
  window.__avatarSignOut=()=>{state={status:'guest',user:null,name:'Guest',initial:'?',role:'guest',isAdmin:false};subscriptions.forEach(f=>f(state));authListeners.forEach(f=>f('SIGNED_OUT',null));};
  const client={from:query,rpc:async()=>({data:[],error:null}),channel:()=>Object.create(channel),removeChannel(){},removeAllChannels(){},
    storage:{from:()=>({upload:async()=>({data:{},error:null})})},
    auth:{getSession:async()=>({data:{session:session()}}),getUser:async()=>({data:{user:state.user}}),updateUser:async()=>({data:{},error:null}),signOut:async()=>{window.__avatarSignOut();return {error:null}},
      onAuthStateChange:f=>{authListeners.add(f);return {data:{subscription:{unsubscribe(){authListeners.delete(f)}}}}}}};
  window.sb=client;window.supabase={createClient:()=>client};
  window.ApaSession={client:()=>client,get:()=>state,ready:f=>{if(f)f(state);return Promise.resolve(state)},subscribe:f=>{subscriptions.add(f);f(state);return()=>subscriptions.delete(f)},token:async()=>session()?.access_token||null,setRole:()=>{}};
})();`;
new (require('node:vm').Script)(mock);

async function sameAvatar(page, selector, spec) {
  return page.evaluate(({ selector, spec, id }) => {
    const actual = document.querySelector(selector);
    if (!actual) return false;
    const size = actual.closest('.cpa')?.clientWidth || actual.clientWidth;
    const holder = document.createElement('div');
    holder.innerHTML = CabanaAvatars.render(spec, { size, name: 'Amani O.', seed: id, label: 'Amani O. avatar' });
    const normalize = svg => {
      const node = svg.cloneNode(true);
      [node, ...node.querySelectorAll('*')].forEach(el => {
        el.removeAttribute('id'); el.removeAttribute('style');
        for (const attr of [...el.attributes]) if (/url\(#/.test(attr.value)) el.setAttribute(attr.name, attr.value.replace(/url\(#[^)]+\)/g, 'url(#local)'));
      });
      return node.innerHTML;
    };
    return normalize(actual) === normalize(holder.firstElementChild);
  }, { selector, spec, id: ME });
}

async function main() {
  mkdirSync(out, { recursive: true });
  const server = createServer((req, res) => {
    try {
      let pathname = new URL(req.url, 'http://local').pathname;
      if (pathname === '/motion-fixture') {
        res.setHeader('Content-Type', 'text/html');
        return res.end('<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><script src="/cabana-avatars.js"></script></head><body><main id="fixture"></main></body></html>');
      }
      if (pathname === '/') pathname = '/index.html';
      if (!extname(pathname)) pathname += '.html';
      const file = resolve(root, '.' + pathname);
      if (!file.startsWith(root + sep)) throw new Error('outside fixture root');
      res.setHeader('Content-Type', ({ '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg' })[extname(file)] || 'application/octet-stream');
      res.end(readFileSync(file));
    } catch (_) { res.statusCode = 404; res.end(); }
  });
  await new Promise(done => server.listen(0, '127.0.0.1', done));
  const origin = 'http://127.0.0.1:' + server.address().port;
  let browser, page, context;
  const errors = [];
  try {
    browser = await chromium.launch({ headless: true, ...(process.env.CABANA_BROWSER_PATH ? { executablePath: process.env.CABANA_BROWSER_PATH } : { channel: process.env.CABANA_BROWSER_CHANNEL || 'chrome' }) });
    context = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'no-preference', serviceWorkers: 'block', permissions: ['notifications'] });
    context.setDefaultTimeout(90000);
    context.setDefaultNavigationTimeout(90000);
    await context.addInitScript(() => {
      Object.defineProperty(navigator, 'serviceWorker', { value: { register: async () => ({}), getRegistrations: async () => [], getRegistration: async () => null, ready: new Promise(() => {}), addEventListener() {} } });
      try { localStorage.setItem('cabana_seen_welcome', '1'); } catch (_) { /* initial about:blank */ }
    });
    context.on('page', p => {
      p.on('pageerror', error => errors.push(error.message));
      p.on('dialog', dialog => dialog.accept());
    });
    await context.route('**/*', route => {
      const u = new URL(route.request().url());
      if (u.pathname === '/vendor-supabase-2.112.3.js') return route.fulfill({ contentType: 'application/javascript', body: mock });
      if (u.pathname === '/apa-session.js') return route.fulfill({ contentType: 'application/javascript', body: '' });
      if (u.pathname === '/api/people') {
        const op = u.searchParams.get('op');
        if (op === 'cards') return route.fulfill({ json: { cards: { [ME]: card() } } });
        if (op === 'profile') return route.fulfill({ json: { profile: profile() } });
        if (op === 'save') {
          const body = route.request().postDataJSON(); db.saves.push(body);
          if (db.failNextSave) { db.failNextSave = false; return route.fulfill({ status: 503, json: { error: 'The profile could not be saved. Please try again.' } }); }
          Object.assign(db.settings, body);
          return route.fulfill({ json: { ok: true, handle: db.settings.handle } });
        }
        return route.fulfill({ json: { ok: true } });
      }
      if (u.pathname.startsWith('/rest/v1/')) return route.fulfill({ json: [] });
      if (u.pathname.startsWith('/api/')) return route.fulfill({ json: { ok: true, items: [], messages: [], suggestions: [], thread: null } });
      if (u.origin !== origin) return route.abort();
      return route.continue();
    });

    page = await context.newPage();
    await page.goto(origin + '/motion-fixture', { waitUntil: 'domcontentloaded' });
    const svgProblems = await page.evaluate(() => {
      const AV = CabanaAvatars, parser = new DOMParser(), problems = [];
      for (const item of Object.values(AV.catalogue()).flat()) for (const size of [28, 44, 180]) {
        const xml = parser.parseFromString(AV.render(item.spec, { size, name: 'Amani & Company' }), 'image/svg+xml');
        if (xml.querySelector('parsererror')) problems.push(item.id + ': invalid SVG at ' + size);
        if (xml.querySelector('script,foreignObject,image,iframe')) problems.push(item.id + ': unexpected external content');
        for (const node of xml.querySelectorAll('*')) for (const attr of node.attributes) if (/^on/i.test(attr.name)) problems.push(item.id + ': event attribute');
      }
      return problems;
    });
    assert.deepEqual(svgProblems, [], 'every character parses as real SVG at icon, card and portrait sizes');
    console.log('PASS catalogue SVG parsing and safe elements');
    await page.evaluate(() => {
      const C = CabanaAvatars.catalogue(), items = [...C.spirits.slice(12), ...C.spirits.slice(0, 2), ...C.people.slice(0, 2)];
      document.body.style.cssText = 'margin:24px;background:#f3f1fb;font:14px system-ui;color:#24203b';
      document.querySelector('#fixture').innerHTML = '<div style="display:grid;grid-template-columns:repeat(4,180px);gap:20px">' + items.map(item => '<div style="padding:10px;background:#fff;border-radius:20px;text-align:center"><div style="width:160px;height:160px">' + CabanaAvatars.render(item.spec, { size: 160, motion: 0 }) + '</div><strong>' + item.name + '</strong><div style="font-size:11px">' + item.trait + '</div></div>').join('') + '</div>';
    });
    await page.locator('#fixture').screenshot({ path: resolve(out, 'character-contact-sheet.png') });

    if (!process.argv.includes('--app-only')) {
    await page.evaluate(() => {
      const AV = CabanaAvatars, spec = { ...AV.catalogue().spirits[0].spec, mo: 2 };
      document.querySelector('#fixture').innerHTML = '<div id="live" style="width:180px;height:180px"></div><div id="tiny" style="width:28px;height:28px"></div><div id="still" style="width:90px;height:90px"></div><div id="far" style="position:absolute;top:3000px;width:90px;height:90px"></div>';
      document.querySelector('#live').innerHTML = AV.render(spec, { size: 180 });
      document.querySelector('#tiny').innerHTML = AV.render(spec, { size: 28 });
      AV.mount(document.querySelector('#still'), { ...spec, mo: 0 });
      AV.mount(document.querySelector('#far'), spec);
    });
    await page.waitForFunction(() => document.querySelector('#live svg').getAnimations({ subtree: true }).some(a => a.playState === 'running'));
    await page.waitForFunction(() => document.querySelector('#tiny svg').getAnimations({ subtree: true }).some(a => a.playState === 'running'));
    assert.equal(await page.locator('#still svg').evaluate(el => el.getAnimations({ subtree: true }).length), 0, 'still character does not animate');
    await page.waitForFunction(() => document.querySelector('#far svg').getAnimations({ subtree: true }).every(a => a.playState === 'paused'));
    await page.locator('#far').scrollIntoViewIfNeeded();
    await page.waitForFunction(() => document.querySelector('#far svg').getAnimations({ subtree: true }).some(a => a.playState === 'running'));
    await page.locator('#live').scrollIntoViewIfNeeded();
    await page.waitForFunction(() => document.querySelector('#live svg').getAnimations({ subtree: true }).some(a => a.playState === 'running'));
    assert.equal(await page.evaluate(() => CabanaAvatars.react(document.querySelector('#live'), 'dance')), true);
    await page.waitForFunction(() => document.querySelector('#live svg').dataset.cavReaction === 'dance');
    assert.equal(await page.evaluate(() => CabanaAvatars.react(document.querySelector('#still'), 'dance')), false);
    await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: true }); document.dispatchEvent(new Event('visibilitychange')); });
    await page.waitForFunction(() => document.querySelector('#live svg').getAnimations({ subtree: true }).every(a => a.playState === 'paused'));
    await page.evaluate(() => { delete document.hidden; document.dispatchEvent(new Event('visibilitychange')); });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.waitForFunction(() => [...document.querySelectorAll('svg.cav')].every(el => el.getAnimations({ subtree: true }).length === 0));
    assert.equal(await page.evaluate(() => CabanaAvatars.react(document.querySelector('#live'), 'wave')), false);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.evaluate(() => { CabanaAvatars.unmount(document.querySelector('#live')); });
    assert.equal(await page.locator('#live svg').count(), 0, 'unmount releases its rendered character');
    console.log('PASS lively tiny icons, automatic hydration, reactions, still/reduced motion and visibility pause/resume');
    }

    const dashboard = await context.newPage();
    let engineAttempts = 0;
    await dashboard.route('**/cabana-avatars.js*', route => ++engineAttempts === 1 ? route.abort() : route.fallback());
    await dashboard.goto(origin + '/dashboard.html', { waitUntil: 'domcontentloaded' });
    await dashboard.waitForSelector('#apa-avatar svg.cav');
    assert.ok(engineAttempts >= 2, 'a transient avatar-engine load failure recovers');
    assert.equal(await sameAvatar(dashboard, '#apa-avatar svg.cav', initialAvatar), true, 'dashboard loads the saved avatar');
    await expect(dashboard.locator('#apa-avatar')).toHaveAttribute('aria-label', /profile/i);
    await dashboard.locator('#apa-avatar').click();
    await dashboard.waitForURL(/\/profile(?:\.html)?(?:[?#]|$)/);
    await dashboard.waitForSelector('#stage-ava svg.cav');
    await dashboard.goto(origin + '/dashboard.html', { waitUntil: 'domcontentloaded' });
    await dashboard.waitForSelector('#apa-avatar svg.cav');
    console.log('PASS signed-in dashboard shows saved character and opens profile');

    await page.bringToFront();
    await page.goto(origin + '/profile.html', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#tab-catalogue [data-pick]');
    assert.equal(await page.locator('#tab-catalogue [data-pick]').count(), 12, 'the catalogue paints one lively set at a time');
    await page.locator('#more-characters').click();
    await expect(page.locator('#tab-catalogue [data-pick]')).toHaveCount(24);
    await page.locator('#character-search').fill('zawadi');
    await expect(page.locator('#tab-catalogue [data-pick]')).toHaveCount(1);
    await page.locator('[data-pick="zawadi"]').click();
    await expect(page.locator('#stage-name')).toHaveText('Zawadi');
    await expect(page.locator('[data-pick="zawadi"]')).toBeFocused();
    await page.locator('#character-search').fill('zzzz-no-character');
    await expect(page.locator('#tab-catalogue [data-pick]')).toHaveCount(0);
    assert.ok((await page.locator('#tab-catalogue').innerText()).trim().length > 0, 'search explains empty results');
    await page.locator('#character-search').fill('');
    await page.locator('#tab-catalogue [data-sec="spirits"]').click();
    await page.locator('#more-characters').click();
    assert.ok(await page.locator('#tab-catalogue [data-pick]').count() >= 20);
    const newest = page.locator('#tab-catalogue [data-pick]').last();
    const newestId = await newest.getAttribute('data-pick');
    await newest.click();
    await page.locator('[data-mo="2"]').click();
    await page.locator('[data-react="dance"]').click();
    await page.waitForFunction(() => document.querySelector('#stage-ava svg').dataset.cavReaction === 'dance');
    await expect(page.locator('#preview-nav svg.cav')).toHaveCount(1);
    await page.locator('[data-tab="customise"]').click();
    await page.locator('#tab-customise [data-k="t"][data-v="2"]').click();
    await expect(page.locator('#tab-customise [data-k="t"][data-v="2"]')).toBeFocused();
    await page.locator('#save').click();
    await page.waitForFunction(() => !document.querySelector('#savebar').classList.contains('show'));
    const saved = JSON.parse(JSON.stringify(db.settings.avatar));
    assert.ok(saved.a >= 12, 'a newly added character persists');
    assert.equal(saved.t, 2); assert.equal(saved.mo, 2);
    assert.equal(await sameAvatar(page, '#preview-nav svg.cav', saved), true, 'live icon preview reflects the saved character');
    await expect.poll(() => sameAvatar(dashboard, '#apa-avatar svg.cav', saved)).toBe(true);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#stage-ava svg.cav');
    assert.equal(await sameAvatar(page, '#preview-nav svg.cav', saved), true, 'saved customization survives reload');
    console.log('PASS catalogue search, new character selection, keyboard focus, customization, persistence and cross-tab header refresh: ' + newestId);

    await page.locator('[data-mo="0"]').click();
    await expect(page.locator('[data-react="dance"]')).toBeDisabled();
    assert.equal(await page.locator('#stage-ava svg').evaluate(el => el.getAnimations({ subtree: true }).length), 0);
    db.failNextSave = true;
    await page.locator('#save').click();
    await expect(page.locator('#save')).toBeEnabled();
    await expect(page.locator('#savebar')).toHaveClass(/show/);
    await expect(page.locator('[data-mo="0"]')).toHaveAttribute('aria-pressed', 'true');
    assert.deepEqual(db.settings.avatar, saved, 'failed save never changes persisted avatar');
    await page.locator('#surprise').click();
    await expect(page.locator('[data-mo="0"]')).toHaveAttribute('aria-pressed', 'true');
    await page.locator('[data-tab="customise"]').click();
    await page.locator('[data-kind="p"]').click();
    await expect(page.locator('[data-mo="0"]')).toHaveAttribute('aria-pressed', 'true');
    await page.locator('[data-kind="a"]').click();
    await expect(page.locator('[data-mo="0"]')).toHaveAttribute('aria-pressed', 'true');
    await page.locator('#discard').click();
    await expect(page.locator('[data-mo="2"]')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('#savebar')).not.toHaveClass(/show/);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect(page.locator('[data-react="wave"]')).toBeDisabled();
    await page.waitForFunction(() => document.querySelector('#stage-ava svg').getAnimations({ subtree: true }).length === 0);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    console.log('PASS save failure keeps the draft, discard restores saved choice, reduced-motion disables reaction controls');

    await page.screenshot({ path: resolve(out, 'studio-desktop.png'), fullPage: false });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.locator('#look').scrollIntoViewIfNeeded();
    await page.screenshot({ path: resolve(out, 'studio-mobile.png'), fullPage: false });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2), 'profile studio fits narrow viewports');
    await dashboard.evaluate(() => window.__avatarSignOut());
    await expect(dashboard.locator('#apa-avatar svg.cav')).toHaveCount(0);
    assert.deepEqual(errors, [], 'no uncaught browser errors');
    console.log('PASS responsive studio and signout clears account artwork; screenshots: ' + out);
  } catch (error) {
    console.error('Browser errors:', errors);
    if (context) for (const [i, p] of context.pages().entries()) {
      await p.screenshot({ path: resolve(out, 'failure-' + i + '.png'), fullPage: false }).catch(() => {});
      console.error('Page state:', p.url(), await p.evaluate(() => { const panel=document.querySelector('#tab-catalogue'), pick=panel?.querySelector('[data-pick]'); return { icon: document.querySelector('#apa-avatar')?.outerHTML.slice(0, 350), session: window.ApaSession?.get?.()?.status, engine: !!window.CabanaAvatars, people: !!window.CabanaPeople, lookCount: panel?.querySelectorAll('[data-pick]').length, panelHidden: panel?.hidden, panelDisplay: panel && getComputedStyle(panel).display, pickDisplay: pick && getComputedStyle(pick).display, pickRect: pick?.getBoundingClientRect().toJSON(), selectedTab: document.querySelector('#look-tabs [aria-selected="true"]')?.dataset.tab, stage: !!document.querySelector('#stage-ava svg'), hero: document.querySelector('#hero-name')?.textContent }; }).catch(() => ({})));
    }
    if (page) await page.screenshot({ path: resolve(out, 'failure.png'), fullPage: false }).catch(() => {});
    throw error;
  } finally {
    if (context) await context.close();
    if (browser) await browser.close();
    await new Promise(done => server.close(done));
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
