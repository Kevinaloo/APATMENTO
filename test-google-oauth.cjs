/* ════════════════════════════════════════════════════════════════
   GOOGLE OAUTH HARNESS

   Proves the four behaviours that were broken:
     1. A provider error is reported as a Google error — NOT as
        "that reset link has expired" on the password-reset screen.
     2. A successful return reaches goDashboard().
     3. A real recovery link still wins (no regression).
     4. signInWithGoogle() targets the extensionless /auth path, so
        Vercel's cleanUrls 308 can't strip the token fragment.

   Run: node test-google-oauth.cjs
   ════════════════════════════════════════════════════════════════ */
const fs = require('fs');
const { JSDOM, VirtualConsole } = require('jsdom');

const HTML = fs.readFileSync(__dirname + '/auth.html', 'utf8');

/* Pull the auth script block (the one that builds the client). */
function authScript() {
  const re = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(HTML))) {
    if (m[1].includes('async function signInWithGoogle')) return m[1];
  }
  throw new Error('auth script block not found');
}

function fakeSupabase({ session = null, sessionAfterMs = null, onOAuth = () => ({}), upserts = [] }) {
  let cb = null;
  let current = session;
  if (sessionAfterMs != null) {
    setTimeout(() => {
      current = { user: { id: 'u-google', email: 'g@example.com', user_metadata: {} } };
      if (cb) cb('SIGNED_IN', current);
    }, sessionAfterMs);
  }
  return {
    createClient: () => ({
      auth: {
        getSession: () => Promise.resolve({ data: { session: current } }),
        onAuthStateChange: (fn) => {
          cb = fn;
          return { data: { subscription: { unsubscribe() {} } } };
        },
        signInWithOAuth: (opts) => Promise.resolve(onOAuth(opts)),
        signInWithPassword: () => Promise.resolve({ data: {}, error: null }),
        signOut: () => Promise.resolve({}),
      },
      from: (table) => ({
        upsert: (row) => { upserts.push({ table, row }); return Promise.resolve({}); },
        select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null }) }) }),
      }),
    }),
  };
}

async function run(name, { url, supa, act }) {
  const vc = new VirtualConsole();
  const errors = [];
  vc.on('jsdomError', e => errors.push(e.message));

  const dom = new JSDOM(HTML.replace(/<script[^>]*\bsrc=[^>]*><\/script>/gi, ''), {
    url,
    runScripts: 'dangerously',
    virtualConsole: vc,
    beforeParse(w) {
      w.supabase = supa;
      w.__nav = null;
      // jsdom refuses real navigation; capture the intent instead.
      delete w.location;
      const u = new URL(url);
      const loc = {
        origin: u.origin, pathname: u.pathname,
        search: u.search, hash: u.hash,
        replace(v) { w.__nav = v; },
        assign(v) { w.__nav = v; },
        toString() { return url; },
      };
      Object.defineProperty(loc, 'href', {
        get() { return url; },
        set(v) { w.__nav = v; },
        configurable: true,
      });
      w.location = loc;
    },
  });

  const w = dom.window;
  await new Promise(r => setTimeout(r, 60));
  if (act) await act(w);
  await new Promise(r => setTimeout(r, 400));

  return { w, errors, nav: w.__nav };
}

function visible(w, id) {
  const el = w.document.getElementById(id);
  if (!el) return false;
  return el.classList.contains('show') ||
         (el.style && el.style.display && el.style.display !== 'none');
}

function text(w, id) {
  const el = w.document.getElementById(id);
  return el ? (el.textContent || '').trim() : '';
}

let pass = 0, fail = 0;
const ok  = (m) => { console.log('  \u2713 ' + m); pass++; };
const bad = (m) => { console.log('  \u2717 ' + m); fail++; };

(async () => {
  console.log('\nGOOGLE OAUTH HARNESS\n' + '='.repeat(60));

  /* ── 1. Provider error must not be mistaken for a dead reset link ── */
  console.log('\n1. Provider error returns a Google-specific message');
  {
    const url = 'https://www.apatmento.space/auth?callback=google'
      + '#error=server_error&error_code=validation_failed'
      + '&error_description=Unsupported%20provider%3A%20provider%20is%20not%20enabled';
    const { w, errors } = await run('err', { url, supa: fakeSupabase({}) });

    if (errors.length) bad('page threw: ' + errors[0]);
    else ok('page booted without throwing');

    const resetErr = text(w, 'reset-alert-error');
    if (/reset link has expired/i.test(resetErr))
      bad('STILL shows the bogus "reset link has expired" message');
    else ok('does not show the bogus reset-link message');

    const shown = text(w, 'alert-error') || text(w, 'login-alert-error');
    if (/not switched on|google/i.test(shown))
      ok('shows a Google-specific error: "' + shown.slice(0, 60) + '"');
    else bad('no Google error surfaced (got: "' + shown.slice(0, 60) + '")');
  }

  /* ── 2. Successful return reaches the dashboard ── */
  console.log('\n2. Successful OAuth return routes to the dashboard');
  {
    const url = 'https://www.apatmento.space/auth?callback=google'
      + '#access_token=abc&refresh_token=def&token_type=bearer&expires_in=3600';
    const upserts = [];
    const { w, nav, errors } = await run('ok', {
      url, supa: fakeSupabase({ sessionAfterMs: 120, upserts }),
    });

    /* jsdom refuses cross-document navigation, so goDashboard's redirect
       surfaces as a "navigation to another Document" error. That error is
       the redirect firing — it is the pass signal, not a failure. */
    const real = errors.filter(e => !/navigation to another Document/i.test(e));
    if (real.length) bad('page threw: ' + real[0]);
    else ok('page booted without throwing');

    const navAttempted = nav || errors.some(e => /navigation to another Document/i.test(e));
    const profiled = upserts.some(u => u.table === 'profiles' && u.row && u.row.id === 'u-google');

    if (profiled) ok('goDashboard ran and upserted the Google user profile');
    else bad('goDashboard never ran (no profiles upsert)');

    if (navAttempted) ok('redirect to the dashboard was issued');
    else bad('no dashboard redirect was issued');
  }

  /* ── 3. Genuine recovery link still wins ── */
  console.log('\n3. Real recovery link is untouched (regression guard)');
  {
    const url = 'https://www.apatmento.space/auth#type=recovery&access_token=xyz';
    const { w, nav, errors } = await run('rec', { url, supa: fakeSupabase({}) });

    if (errors.length) bad('page threw: ' + errors[0]);
    else ok('page booted without throwing');

    if (nav && /dashboard/.test(nav)) bad('recovery user was bounced to dashboard');
    else ok('recovery user was not bounced to the dashboard');
  }

  /* ── 4. redirectTo dodges the cleanUrls 308 ── */
  console.log('\n4. signInWithGoogle targets the clean /auth path');
  {
    let captured = null;
    const url = 'https://www.apatmento.space/auth';
    const { errors } = await run('click', {
      url,
      supa: fakeSupabase({ onOAuth: (o) => { captured = o; return { error: null }; } }),
      act: async (w) => { await w.signInWithGoogle(); },
    });

    if (errors.length) bad('page threw: ' + errors[0]);
    else ok('page booted without throwing');

    const rt = captured && captured.options && captured.options.redirectTo;
    if (!rt) { bad('signInWithOAuth was never called'); }
    else if (/\.html/.test(rt)) bad('redirectTo still contains .html: ' + rt);
    else ok('redirectTo avoids .html: ' + rt);

    const qp = captured && captured.options && captured.options.queryParams;
    if (qp && qp.prompt === 'consent') bad('still forces the consent screen every sign-in');
    else ok('no forced consent screen on every sign-in');
  }

  console.log('\n' + '='.repeat(60));
  console.log(`${pass} passed, ${fail} failed\n`);
  process.exit(fail ? 1 : 0);
})();
