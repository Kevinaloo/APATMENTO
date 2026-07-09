/* Boot harness: proves the dashboard reaches a consistent, fully-rendered
   state for guest AND signed-in users, and survives a bfcache restore.
   Run: node test-boot.js            */
const fs = require('fs');
const { JSDOM, VirtualConsole } = require('jsdom');

const SESSION = {
  user: {
    id: 'u1',
    email: 'worlddossy@gmail.com',            // admin, to exercise that branch
    user_metadata: { first_name: 'kevin' }
  }
};

function fakeSupabase(session) {
  let cb = null;
  const client = {
    auth: {
      getSession: () => Promise.resolve({ data: { session } }),
      onAuthStateChange: (fn) => { cb = fn; return { data: { subscription: { unsubscribe(){} } } }; },
      signOut: () => Promise.resolve({}),
      _fire: (e, s) => cb && cb(e, s)
    },
    from: () => ({
      select: () => ({
        eq: () => ({ maybeSingle: () => Promise.resolve({ data: { first_name: 'Kevin', last_role: 'guest' } }) })
      }),
      upsert: () => Promise.resolve({})
    })
  };
  return { createClient: () => client, __client: client };
}

async function boot(session, label, file) {
  file = file || 'dashboard.html';
  const errors = [];
  const vc = new VirtualConsole();
  vc.on('jsdomError', e => errors.push('jsdomError: ' + e.message));
  vc.on('error', (...a) => errors.push('error: ' + a.join(' ')));

  let html = fs.readFileSync(file, 'utf8');
  // strip remote scripts; we inject a fake supabase
  html = html.replace(/<script src="https?:\/\/[^"]*"[^>]*><\/script>/g, '');

  const dom = new JSDOM(html, {
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    url: 'https://apatmento.com/dashboard.html',
    virtualConsole: vc,
    beforeParse(w) {
      w.supabase = fakeSupabase(session);
      w.matchMedia = () => ({ matches: false, addListener(){}, removeListener(){}, addEventListener(){}, removeEventListener(){} });
      w.IntersectionObserver = class { observe(){} unobserve(){} disconnect(){} };
      w.requestAnimationFrame = f => setTimeout(f, 0);
      w.scrollTo = () => {};
      w.HTMLElement.prototype.scrollTo = () => {};
      // Return one plausible row per table so category rails render.
      w.fetch = (u) => {
        const url = String(u);
        const row =
          /scraped_events/.test(url)      ? [{ title:'Nairobi Fest', venue:'KICC', city:'Nairobi', start_date:'2026-08-01', image_url:'e.jpg', price_from:1500 }] :
          /scraped_tours/.test(url)       ? [{ title:'Masai Mara', location:'Narok', duration:'3 days', image_url:'t.jpg', price_from:40000 }] :
          /scraped_restaurants/.test(url) ? [{ name:'Talisman', cuisine:'Fusion', area:'Karen', image_url:'f.jpg', delivery_mins:35 }] :
          /scraped_shopping/.test(url)    ? [{ name:'Kikoy', category:'Textiles', seller:'Soko', image_url:'s.jpg', price:1200 }] :
          /scraped_carhire/.test(url)     ? [{ name:'Prado', vehicle_type:'SUV', seats:7, image_url:'c.jpg', price_self:12000 }] :
          /type=eq\.share/.test(url)      ? [{ id:'r1', title:'Room in Kilimani', area:'Kilimani', price_night:25000, photos:['r.jpg'] }] :
          /listings/.test(url)            ? [{ id:'l1', title:'Luxore', area:'Syokimau', price_night:3000, photos:['p.jpg'], beds:1, max_guests:2 }] :
          [];
        return Promise.resolve({ ok:true, json: () => Promise.resolve(row) });
      };
    }
  });

  const w = dom.window;
  // load local module scripts by hand (jsdom won't fetch /apa-*.js)
  for (const f of ['apa-session.js', 'apa-chrome.js', 'apa-rail.js', 'apa-categories.js']) {
    const s = w.document.createElement('script');
    s.textContent = fs.readFileSync(f, 'utf8');
    w.document.head.appendChild(s);
  }
  w.document.dispatchEvent(new w.Event('DOMContentLoaded', { bubbles: true }));

  await new Promise(r => setTimeout(r, 400));
  return { w, errors, label };
}

function check(w, name, cond, detail) {
  const ok = !!cond;
  console.log(`  ${ok ? '✓' : '✗'} ${name}${ok ? '' : '   → ' + detail}`);
  return ok;
}

(async () => {
  let pass = true;

  // ── SIGNED IN ──────────────────────────────────────────────
  console.log('\n── SIGNED-IN user ──');
  let { w, errors } = await boot(SESSION);
  const root = w.document.documentElement;

  pass &= check(w, 'no uncaught errors', errors.length === 0, errors.join(' | '));
  pass &= check(w, 'html[data-auth=user]', root.getAttribute('data-auth') === 'user', root.getAttribute('data-auth'));
  pass &= check(w, 'html[data-admin=yes]', root.getAttribute('data-admin') === 'yes', root.getAttribute('data-admin'));
  pass &= check(w, 'avatar initial = K', w.document.getElementById('apa-avatar').textContent === 'K', w.document.getElementById('apa-avatar').textContent);
  pass &= check(w, 'welcome text set', /Welcome, Kevin/.test(w.document.getElementById('apa-welcome').textContent), '');
  pass &= check(w, 'SOS button exists', !!w.document.querySelector('[data-apa="sos"]'), '');
  pass &= check(w, 'notif button exists', !!w.document.querySelector('[data-apa="notif"]'), '');
  pass &= check(w, 'partner card exists', !!w.document.querySelector('[data-apa="role"]'), '');
  pass &= check(w, 'partner card label', w.document.getElementById('apa-psc-t').textContent === 'Switch to Partner', w.document.getElementById('apa-psc-t').textContent);
  pass &= check(w, 'loader dismissed', w.document.getElementById('loader').classList.contains('done'), '');
  pass &= check(w, 'guest screen active', w.document.getElementById('screen-guest').classList.contains('active'), '');
  pass &= check(w, 'stay-grid is rail track', w.document.getElementById('stay-grid').hasAttribute('data-rail-track'), '');
  pass &= check(w, 'rail arrows injected', w.document.querySelectorAll('.apa-rail-nav').length >= 4, w.document.querySelectorAll('.apa-rail-nav').length);

  // ── bfcache restore ───────────────────────────────────────
  console.log('\n── bfcache restore (back button) ──');
  const before = w.document.getElementById('apa-avatar').textContent;
  const ev = new w.Event('pageshow');
  Object.defineProperty(ev, 'persisted', { value: true });
  w.dispatchEvent(ev);
  await new Promise(r => setTimeout(r, 200));
  pass &= check(w, 'still signed in', root.getAttribute('data-auth') === 'user', root.getAttribute('data-auth'));
  pass &= check(w, 'avatar intact', w.document.getElementById('apa-avatar').textContent === before, '');
  pass &= check(w, 'SOS still present', !!w.document.querySelector('[data-apa="sos"]'), '');

  // ── SIGN OUT event ────────────────────────────────────────
  console.log('\n── SIGNED_OUT event ──');
  w.supabase.__client.auth._fire('SIGNED_OUT', null);
  await new Promise(r => setTimeout(r, 150));
  pass &= check(w, 'html[data-auth=guest]', root.getAttribute('data-auth') === 'guest', root.getAttribute('data-auth'));
  pass &= check(w, 'partner card → Become a partner', w.document.getElementById('apa-psc-t').textContent === 'Become a partner', w.document.getElementById('apa-psc-t').textContent);

  // ── GUEST cold boot ───────────────────────────────────────
  console.log('\n── GUEST cold boot ──');
  const g = await boot(null);
  const groot = g.w.document.documentElement;
  pass &= check(g.w, 'no uncaught errors', g.errors.length === 0, g.errors.join(' | '));
  pass &= check(g.w, 'html[data-auth=guest]', groot.getAttribute('data-auth') === 'guest', groot.getAttribute('data-auth'));
  pass &= check(g.w, 'loader dismissed', g.w.document.getElementById('loader').classList.contains('done'), '');
  pass &= check(g.w, 'partner card visible', !!g.w.document.querySelector('[data-apa="role"]'), '');

  // ── category rails ──
  console.log('\n── category rails ──');
  await new Promise(r => setTimeout(r, 500));
  const secs = w.document.querySelectorAll('#cat-rails .cat-sec');
  pass &= check(w, 'rails rendered', secs.length === 6, secs.length + ' of 6');
  const keys = [...secs].map(s2 => s2.getAttribute('data-cat'));
  pass &= check(w, 'order stable', keys.join(',') === 'events,tours,food,shopping,carhire,roommates', keys.join(','));
  pass &= check(w, 'no flights/rides rail', !keys.includes('flights') && !keys.includes('rides'), keys.join(','));
  pass &= check(w, 'product cards present', w.document.querySelectorAll('#cat-rails .pc').length === 6, w.document.querySelectorAll('#cat-rails .pc').length);
  pass &= check(w, 'product image rendered', !!w.document.querySelector('#cat-rails .pc-img img'), '');
  pass &= check(w, 'each rail is a carousel', w.document.querySelectorAll('#cat-rails [data-rail-track]').length === 6, '');
  pass &= check(w, 'service tiles autoplay', w.document.querySelector('[data-rail="compact"]').getAttribute('data-autoplay') === '4200', '');

  // ── index.html: previously referenced `supabase` without loading it,
  //    so the landing page ALWAYS looked signed-out.
  console.log('\n── index.html, SIGNED-IN ──');
  const ix = await boot(SESSION, 'index', 'index.html');
  const iroot = ix.w.document.documentElement;
  pass &= check(ix.w, 'no uncaught errors', ix.errors.length === 0, ix.errors.join(' | '));
  pass &= check(ix.w, 'html[data-auth=user]', iroot.getAttribute('data-auth') === 'user', iroot.getAttribute('data-auth'));
  pass &= check(ix.w, 'guest nav hidden', ix.w.document.getElementById('nav-guest').style.display === 'none', '');
  pass &= check(ix.w, 'user nav shown', ix.w.document.getElementById('nav-user').style.display === 'flex', '');
  pass &= check(ix.w, 'welcome set', /Welcome, Kevin/.test(ix.w.document.getElementById('nav-welcome').textContent), '');

  console.log('\n' + (pass ? '✅ ALL PASS' : '❌ FAILURES'));
  process.exit(pass ? 0 : 1);
})();
