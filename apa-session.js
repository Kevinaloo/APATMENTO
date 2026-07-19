/* ═══════════════════════════════════════════════════════════════════
   APATMENTO · SESSION CORE  v2
   ───────────────────────────────────────────────────────────────────
   The single source of truth for auth across every page.

   Design rules (learned the hard way):
     1. ONE Supabase client per tab. Ever. Reused across scripts.
     2. Never rely on a single async callback firing. Poll + event + bfcache.
     3. Every subscriber is idempotent — safe to call 100 times.
     4. Nothing here may throw. A broken analytics call must never
        take down the header.
     5. State is resolved synchronously from localStorage when possible,
        then reconciled with the network.

   Public API:
     ApaSession.ready(fn)        → fn(state) once, when first resolved
     ApaSession.subscribe(fn)    → fn(state) now + on every change
     ApaSession.get()            → current state (sync)
     ApaSession.signOut()
     ApaSession.client()         → raw supabase client (may be null)

   state = { status:'guest'|'user', user, profile, name, initial, role, isAdmin }
   ═══════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  if (global.ApaSession) return;

  var SUPA_URL = 'https://gfwgbgdvxtocwhilrtdw.supabase.co';
  var SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdmd2diZ2R2eHRvY3doaWxydGR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1MTE2NjMsImV4cCI6MjA5NzA4NzY2M30.U8JClv06YsNAwq9qsPb3lQ4SIPeRPjKMzsYxVfcmujw';

  var ADMINS = ['apatmento@gmail.com', 'worlddossy@gmail.com'];

  /* ── safety net ─────────────────────────────────────────────── */
  function safe(fn, label) {
    try { return fn(); }
    catch (e) { if (global.console) console.warn('[session:' + (label || '?') + ']', e && e.message); }
  }

  /* ── SINGLETON GUARD ──────────────────────────────────────────
     26 pages each called supabase.createClient() on the same auth
     storage key. Concurrent GoTrue clients race on token refresh and
     silently drop the session — the quiet half of the "signed out
     after navigating" bug.

     Rather than editing every page, we memoize createClient at the
     source. Any caller, anywhere, now receives the same instance for
     the same URL. Different projects still get their own client.   */
  function installSingleton() {
    if (!global.supabase || !global.supabase.createClient) return;
    if (global.supabase.__apaMemo) return;

    var real = global.supabase.createClient;
    var cache = Object.create(null);

    global.supabase.createClient = function (url, key, opts) {
      var k = String(url);
      if (cache[k]) return cache[k];
      var merged = opts || {};
      if (k === SUPA_URL) {
        merged = Object.assign({}, merged, {
          auth: Object.assign({
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
            storageKey: 'apa-auth'
          }, merged.auth || {})
        });
      }
      cache[k] = real.call(this, url, key, merged);
      if (k === SUPA_URL) global.__APA_SB__ = cache[k];
      return cache[k];
    };
    global.supabase.__apaMemo = 1;
  }
  installSingleton();

  /* ── the ONE client ─────────────────────────────────────────── */
  var sb = null;
  function client() {
    if (sb) return sb;
    if (global.__APA_SB__) { sb = global.__APA_SB__; return sb; }
    safe(function () {
      if (!global.supabase || !global.supabase.createClient) return;
      installSingleton();                 // in case supabase loaded late
      sb = global.supabase.createClient(SUPA_URL, SUPA_KEY);
      global.__APA_SB__ = sb;
    }, 'client');
    return sb;
  }

  /* ── state ──────────────────────────────────────────────────── */
  var GUEST = {
    status: 'guest', user: null, profile: null,
    name: '', initial: '?', role: 'guest', isAdmin: false
  };

  var state = GUEST;
  var resolved = false;
  var subs = [];
  var readyQ = [];

  function get() { return state; }

  function emit(next) {
    // Skip no-op emissions to keep subscribers cheap.
    var same = state.status === next.status &&
      (state.user && state.user.id) === (next.user && next.user.id) &&
      state.role === next.role &&
      state.name === next.name;
    state = next;
    if (same && resolved) return;

    if (!resolved) {
      resolved = true;
      var q = readyQ; readyQ = [];
      q.forEach(function (fn) { safe(function () { fn(state); }, 'ready'); });
    }
    subs.forEach(function (fn) { safe(function () { fn(state); }, 'sub'); });
  }

  function ready(fn) {
    if (typeof fn !== 'function') return;
    if (resolved) { safe(function () { fn(state); }, 'ready'); return; }
    readyQ.push(fn);
  }

  function subscribe(fn) {
    if (typeof fn !== 'function') return function () {};
    subs.push(fn);
    if (resolved) safe(function () { fn(state); }, 'sub');
    return function () {
      var i = subs.indexOf(fn);
      if (i > -1) subs.splice(i, 1);
    };
  }

  /* ── derive role from URL, never from stale memory ──────────── */
  /* ── Role persistence: URL param wins, then localStorage, then 'guest' ──
     Fixes the bug where partners landing without ?role=partner always saw
     the guest screen. Now the last chosen role is remembered in localStorage
     so a signed-in partner is always routed to their partner screen.       */
  var ROLE_KEY = 'apa-last-role';

  function persistRole(role) {
    safe(function () { localStorage.setItem(ROLE_KEY, role); }, 'persistRole');
  }

  function cachedRole() {
    var r = 'guest';
    safe(function () { r = localStorage.getItem(ROLE_KEY) || 'guest'; }, 'cachedRole');
    return (r === 'partner') ? 'partner' : 'guest';
  }

  function urlRole() {
    var r = null;
    safe(function () {
      r = new URLSearchParams(global.location.search).get('role');
    }, 'urlRole');
    // Explicit URL param — trust it and persist so future loads remember
    if (r === 'partner' || r === 'guest') {
      persistRole(r);
      return r;
    }
    // No URL param — use whatever the partner last selected
    return cachedRole();
  }

  /* ── profile fetch is best-effort, never blocking ───────────── */
  function buildUserState(session, profile) {
    var user = session.user || {};
    var meta = user.user_metadata || {};
    var p = profile || {};

    var name =
      p.first_name ||
      meta.first_name ||
      meta.given_name ||
      (meta.name ? String(meta.name).split(' ')[0] : '') ||
      (user.email ? String(user.email).split('@')[0] : '') ||
      'there';

    name = String(name);
    name = name.charAt(0).toUpperCase() + name.slice(1);

    var email = (user.email || '').toLowerCase();

    // If the DB profile carries a last_role, persist it so urlRole() picks it up
    // on subsequent page loads (even without a ?role= param).
    var dbRole = p && (p.last_role === 'partner' ? 'partner' : null);
    if (dbRole) persistRole(dbRole);

    return {
      status: 'user',
      user: user,
      profile: p,
      name: name,
      initial: (name[0] || '?').toUpperCase(),
      role: urlRole(),   // honours URL > localStorage (updated above if DB had one)
      isAdmin: ADMINS.indexOf(email) > -1
    };
  }

  function guestState() {
    return {
      status: 'guest', user: null, profile: null,
      name: '', initial: '?', role: 'guest', isAdmin: false
    };
  }

  /* Resolve a session → emit immediately with what we know,
     then enrich with the profile row when/if it lands.        */
  var enrichSeq = 0;
  function apply(session) {
    if (!session || !session.user) { emit(guestState()); return; }

    // 1. Emit instantly using JWT metadata. Header renders NOW.
    emit(buildUserState(session, null));

    // 2. Enrich in the background. Slow DB must never block UI.
    var seq = ++enrichSeq;
    var c = client();
    if (!c) return;

    safe(function () {
      c.from('profiles')
        .select('first_name,last_role')
        .eq('id', session.user.id)
        .maybeSingle()
        .then(function (res) {
          if (seq !== enrichSeq) return;           // superseded
          if (!state.user) return;                 // signed out meanwhile
          var p = res && res.data;
          if (!p) return;
          emit(buildUserState(session, p));
        }, function () { /* swallow */ });
    }, 'enrich');
  }

  /* ── boot ───────────────────────────────────────────────────── */
  var booted = false;
  function boot() {
    if (booted) return;
    booted = true;

    var c = client();

    // No supabase lib? Degrade to guest rather than hanging forever.
    if (!c) { emit(guestState()); return; }

    // Hard ceiling: the UI is NEVER allowed to wait more than 2.5s.
    var bail = setTimeout(function () {
      if (!resolved) emit(guestState());
    }, 2500);

    safe(function () {
      c.auth.getSession().then(function (res) {
        clearTimeout(bail);
        apply(res && res.data && res.data.session);
      }, function () {
        clearTimeout(bail);
        emit(guestState());
      });
    }, 'getSession');

    // Live updates: sign-in, sign-out, token refresh, OAuth return.
    safe(function () {
      c.auth.onAuthStateChange(function (event, session) {
        clearTimeout(bail);
        if (event === 'TOKEN_REFRESHED' && state.status === 'user') return;
        apply(session);
      });
    }, 'onAuthStateChange');
  }

  /* ── bfcache: the back-button killer ────────────────────────── */
  /* When a page is restored from the back/forward cache, no scripts
     re-run and no auth events fire. We must actively re-sync.      */
  global.addEventListener('pageshow', function (e) {
    if (!e.persisted) return;
    var c = client();
    if (!c) return;
    safe(function () {
      c.auth.getSession().then(function (res) {
        apply(res && res.data && res.data.session);
      }, function () {});
    }, 'pageshow');
  });

  /* Tab refocus after a long idle — token may have rotated. */
  global.addEventListener('visibilitychange', function () {
    if (global.document.visibilityState !== 'visible') return;
    if (!resolved) return;
    var c = client();
    if (!c) return;
    safe(function () {
      c.auth.getSession().then(function (res) {
        var s = res && res.data && res.data.session;
        var wasUser = state.status === 'user';
        var isUser = !!(s && s.user);
        if (wasUser !== isUser) apply(s);   // only re-render on real change
      }, function () {});
    }, 'visibility');
  });

  function signOut() {
    var c = client();
    var done = function () { global.location.href = 'auth.html'; };
    if (!c) { done(); return; }
    safe(function () { c.auth.signOut().then(done, done); }, 'signOut');
  }

  global.ApaSession = {
    ready: ready,
    subscribe: subscribe,
    get: get,
    signOut: signOut,
    client: client,
    _boot: boot
  };

  // Boot as soon as the supabase lib exists. It's loaded sync above us,
  // but we poll briefly in case of defer/async ordering surprises.
  if (global.supabase && global.supabase.createClient) {
    boot();
  } else {
    var tries = 0;
    var t = setInterval(function () {
      if (global.supabase && global.supabase.createClient) { clearInterval(t); installSingleton(); boot(); }
      else if (++tries > 40) { clearInterval(t); boot(); }  // ~2s → guest
    }, 50);
  }

})(window);
