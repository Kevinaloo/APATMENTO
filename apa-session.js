/* ═══════════════════════════════════════════════════════════════════
   APATMENTO · SESSION CORE  v2
   ───────────────────────────────────────────────────────────────────
   The single source of truth for auth across every page.

   Design rules (learned the hard way):
     1. ONE Supabase client per tab. Ever. Reused across scripts.
     2. Never rely on a single async callback firing. Poll + event + bfcache.
     3. Every subscriber is idempotent. Safe to call 100 times.
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

  /* ══ OAUTH PAYLOAD SNAPSHOT ══════════════════════════════════════
     THIS MUST RUN BEFORE ANY SUPABASE CLIENT EXISTS. Do not move it.

     On the implicit flow Google hands the tokens back in the URL
     fragment. GoTrue's detectSessionInUrl reads that fragment, then
     does `window.location.hash = ''` the instant it succeeds — and on
     failure _initialize() simply returns the error and never retries.
     Either way the caller gets no second chance: by the time anything
     downstream notices the session did not land, the only copy of the
     tokens has been wiped off the URL.

     So we take our own copy first, synchronously, at parse time. This
     is the difference between "we can recover" and "the user has to
     start the whole Google round trip again".                       */
  var AUTH_KEYS = ['access_token','refresh_token','expires_in','expires_at','token_type',
                   'provider_token','provider_refresh_token','type','code',
                   'error','error_code','error_description'];
  var authPayload = (function () {
    var out = {};
    try {
      var take = function (src) {
        if (!src) return;
        new URLSearchParams(src).forEach(function (v, k) {
          if (AUTH_KEYS.indexOf(k) > -1 && out[k] == null) out[k] = v;
        });
      };
      take(global.location.hash.replace(/^#/, ''));
      take(global.location.search.replace(/^\?/, ''));
    } catch (e) {}
    return out;
  })();
  global.__APA_AUTH_PAYLOAD__ = authPayload;

  /* ══ STORAGE THAT CANNOT FAIL ════════════════════════════════════
     GoTrue picks localStorage when it is writable and silently falls
     back to a fresh in-memory object when it is not. In a Chrome
     Custom Tab, an Instagram/Facebook webview, or private browsing,
     that fallback is invisible to us and the user is told nothing
     useful. Here the ladder is explicit and reportable:

       localStorage   → survives tabs and restarts (the goal)
       sessionStorage → survives the tab. Enough to finish a booking
       memory         → survives the page. Still beats being signed out

     storageMode() lets the UI say something TRUE about what happened
     instead of guessing at cookies.                                 */
  var memStore = {};
  var storageMode = 'memory';

  function probe(kind) {
    try {
      var s = global[kind];
      if (!s) return false;
      var k = '__apa_probe__';
      s.setItem(k, '1');
      s.removeItem(k);
      return true;
    } catch (e) { return false; }
  }
  if (probe('localStorage')) storageMode = 'local';
  else if (probe('sessionStorage')) storageMode = 'session';

  var apaStorage = {
    getItem: function (k) {
      try {
        if (storageMode === 'local')   return global.localStorage.getItem(k);
        if (storageMode === 'session') return global.sessionStorage.getItem(k);
      } catch (e) {}
      return Object.prototype.hasOwnProperty.call(memStore, k) ? memStore[k] : null;
    },
    setItem: function (k, v) {
      memStore[k] = v;                       // always mirror, so a quota
      try {                                  // error mid-write still leaves
        if (storageMode === 'local')   { global.localStorage.setItem(k, v);   return; }
        if (storageMode === 'session') { global.sessionStorage.setItem(k, v); return; }
      } catch (e) {
        /* Quota, or a policy change mid-session. Demote once, keep going.
           A downgraded session beats a dropped one every time. */
        storageMode = (storageMode === 'local' && probe('sessionStorage')) ? 'session' : 'memory';
      }
    },
    removeItem: function (k) {
      delete memStore[k];
      try {
        if (storageMode === 'local')   global.localStorage.removeItem(k);
        if (storageMode === 'session') global.sessionStorage.removeItem(k);
      } catch (e) {}
    }
  };

  /* ── SINGLETON GUARD ──────────────────────────────────────────
     26 pages each called supabase.createClient() on the same auth
     storage key. Concurrent GoTrue clients race on token refresh and
     silently drop the session. The quiet half of the "signed out
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
            storageKey: 'apa-auth',
            /* Never let GoTrue choose its own storage. Its private
               fallback is unreportable; ours degrades in public. */
            storage: apaStorage
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
    // Explicit URL param. Trust it and persist so future loads remember
    if (r === 'partner' || r === 'guest') {
      persistRole(r);
      return r;
    }
    // No URL param. Use whatever the partner last selected
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

  /* Tab refocus after a long idle. Token may have rotated. */
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
    _boot: boot,

    /* The tokens exactly as they arrived, before GoTrue wiped the URL.
       auth.html uses this to finish a sign-in by hand when the library's
       own attempt is still in flight or has failed outright. */
    authPayload: function () { return authPayload; },

    /* 'local' | 'session' | 'memory'. Lets the UI warn honestly when a
       sign-in will not survive the tab closing. */
    storageMode: function () { return storageMode; },

    /* Read the persisted session without going through getSession(),
       which queues behind the GoTrue lock. An independent signal, so a
       single stuck lock cannot masquerade as a failed sign-in. */
    peekSession: function () {
      try {
        var raw = apaStorage.getItem('apa-auth');
        if (!raw) return null;
        var s = JSON.parse(raw);
        return (s && s.access_token && s.user) ? s : null;
      } catch (e) { return null; }
    }
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
