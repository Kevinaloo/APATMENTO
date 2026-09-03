/* ═══════════════════════════════════════════════════════════════════
   CABANA · LOCATION
   ───────────────────────────────────────────────────────────────────
   One location layer for the whole platform, modelled on apa-push.js:
   ask once, properly, with our own explanation first — then hold the
   grant and stop asking.

   The problem this replaces
   ────────────────────────
   Every surface called navigator.geolocation.getCurrentPosition() on
   its own, with its own options. Most passed no options at all, which
   means enableHighAccuracy defaults to false — the browser is then
   free to answer from the network, and it does. That is why the pin
   landed in the wrong suburb, and why SOS in particular was unreliable
   at exactly the moment it mattered. Several surfaces also passed a
   generous maximumAge, so they were handed a fix from twenty minutes
   and three kilometres ago.

   Worse, each call site triggered its own permission flow, so a guest
   was asked again and again across the app.

   What this does instead
   ──────────────────────
   · Asks once, behind a branded gate, on a real user gesture.
   · Holds a single watchPosition() with enableHighAccuracy, so fixes
     improve over time instead of being re-requested cold.
   · Keeps the best recent fix in memory and localStorage, so any
     surface gets an answer on the first call rather than a spinner.
   · Never prompts again once the browser has answered. If permission
     was already granted in a previous session it resumes silently.
   · Degrades honestly: every fix carries accuracy and source, so a
     caller can refuse to act on a 4km network guess.

   API
   ───
     ApaLocation.current()            last known fix, or null. Sync.
     ApaLocation.get(opts)            → Promise<fix|null>
     ApaLocation.prime(opts)          → Promise<bool>  branded gate
     ApaLocation.ensure(opts)         → Promise<fix|null> gate + fix
     ApaLocation.start() / .stop()    continuous tracking
     ApaLocation.permission()         → 'granted'|'denied'|'prompt'|'unsupported'
     ApaLocation.on(fn) / .off(fn)    subscribe to fixes
     ApaLocation.label(fix)           → Promise<string|null> via ApaGeo

   A fix:
     { latitude, longitude, accuracy, altitude, heading, speed,
       fixed_at (ISO), source: 'gps'|'cache', age_ms }
   ═══════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  if (global.ApaLocation) return;

  var LS_FIX  = 'cabana_last_fix';
  var LS_ASK  = 'cabana_loc_asked';      // we have shown the gate before
  var SS_SKIP = 'cabana_loc_dismissed';  // dismissed this session, do not nag

  /* A fix older than this is stale enough to refresh in the background,
     but still worth returning immediately rather than showing nothing. */
  var STALE_MS = 90 * 1000;
  /* Beyond this we stop trusting a cached fix for anything that matters. */
  var DEAD_MS  = 30 * 60 * 1000;

  var _fix = null;
  var _watchId = null;
  var _listeners = [];
  var _pending = [];       // resolvers waiting on the first good fix
  var _starting = false;

  /* ── storage, defensively ────────────────────────────────────────── */
  function lsGet(k) {
    try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : null; }
    catch (e) { return null; }
  }
  function lsSet(k, v) {
    try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {}
  }

  function supported() {
    return typeof navigator !== 'undefined' && 'geolocation' in navigator;
  }

  /* ── shape a browser Position into our fix ───────────────────────── */
  function shape(pos, source) {
    var c = pos.coords || {};
    return {
      latitude:  c.latitude,
      longitude: c.longitude,
      accuracy:  c.accuracy != null ? c.accuracy : null,
      altitude:  c.altitude != null ? c.altitude : null,
      heading:   c.heading  != null && !isNaN(c.heading) ? c.heading : null,
      speed:     c.speed    != null && !isNaN(c.speed)   ? c.speed   : null,
      fixed_at:  new Date(pos.timestamp || Date.now()).toISOString(),
      source:    source || 'gps',
      age_ms:    0,
    };
  }

  function age(fix) {
    if (!fix || !fix.fixed_at) return Infinity;
    return Date.now() - new Date(fix.fixed_at).getTime();
  }

  /* A new fix replaces the old one when it is newer, or when it is
     meaningfully more accurate. Without the second test a precise GPS
     lock gets overwritten by the next sloppy network sample. */
  function better(next, prev) {
    if (!prev) return true;
    if (age(prev) > STALE_MS) return true;
    if (next.accuracy == null) return false;
    if (prev.accuracy == null) return true;
    return next.accuracy <= prev.accuracy;
  }

  function adopt(fix) {
    if (!better(fix, _fix)) return;
    _fix = fix;
    lsSet(LS_FIX, fix);
    var waiting = _pending.splice(0, _pending.length);
    waiting.forEach(function (r) { try { r(fix); } catch (e) {} });
    _listeners.slice().forEach(function (fn) { try { fn(fix); } catch (e) {} });
  }

  /* ── permission ──────────────────────────────────────────────────── */
  function permission() {
    if (!supported()) return 'unsupported';
    if (global.__apaLocPerm) return global.__apaLocPerm;
    return 'prompt';
  }

  /* The Permissions API tells us the state without prompting, which is
     the only way to resume a previous grant silently. Safari lacks it
     for geolocation, so this is an enhancement, never a dependency. */
  function probe() {
    if (!supported() || !navigator.permissions || !navigator.permissions.query) {
      return Promise.resolve(permission());
    }
    return navigator.permissions.query({ name: 'geolocation' }).then(function (st) {
      global.__apaLocPerm = st.state;
      if (st.state === 'granted') start();
      /* If the user flips the switch in browser settings, react without
         needing a reload. */
      st.onchange = function () {
        global.__apaLocPerm = st.state;
        if (st.state === 'granted') start();
        else stop();
      };
      return st.state;
    }, function () { return permission(); });
  }

  /* ── continuous tracking ─────────────────────────────────────────── */
  function start() {
    if (!supported() || _watchId != null || _starting) return;
    _starting = true;
    try {
      _watchId = navigator.geolocation.watchPosition(
        function (pos) {
          _starting = false;
          global.__apaLocPerm = 'granted';
          adopt(shape(pos, 'gps'));
        },
        function (err) {
          _starting = false;
          if (err && err.code === 1) {          // PERMISSION_DENIED
            global.__apaLocPerm = 'denied';
            stop();
          }
          /* TIMEOUT and POSITION_UNAVAILABLE are transient. watchPosition
             keeps trying; we simply have no fix yet. */
        },
        /* The three options that were missing everywhere before. */
        { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 }
      );
    } catch (e) { _starting = false; }
  }

  function stop() {
    if (_watchId != null) {
      try { navigator.geolocation.clearWatch(_watchId); } catch (e) {}
      _watchId = null;
    }
  }

  /* Tracking a backgrounded tab drains a battery for nothing. Pause on
     hide, resume on show — the cached fix covers the gap. */
  function wireVisibility() {
    if (typeof document === 'undefined') return;
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'hidden') stop();
      else if (permission() === 'granted') start();
    });
  }

  /* ── reading a fix ───────────────────────────────────────────────── */
  function current() {
    if (_fix) { _fix.age_ms = age(_fix); return _fix; }
    var cached = lsGet(LS_FIX);
    if (cached && age(cached) < DEAD_MS) {
      cached.source = 'cache';
      cached.age_ms = age(cached);
      _fix = cached;
      return cached;
    }
    return null;
  }

  /* get() resolves with the best fix available within `timeout`.
     `maxAge` decides whether a cached fix is good enough to return
     without waiting; `minAccuracy` lets a caller insist on GPS-grade. */
  function get(opts) {
    opts = opts || {};
    var maxAge = opts.maxAge != null ? opts.maxAge : STALE_MS;
    var timeout = opts.timeout != null ? opts.timeout : 12000;
    var minAccuracy = opts.minAccuracy || null;

    if (!supported()) return Promise.resolve(null);

    var have = current();
    var goodEnough = have
      && age(have) <= maxAge
      && (!minAccuracy || (have.accuracy != null && have.accuracy <= minAccuracy));
    if (goodEnough) return Promise.resolve(have);

    if (permission() !== 'denied') start();

    return new Promise(function (resolve) {
      var done = false;
      function finish(v) {
        if (done) return;
        done = true;
        var i = _pending.indexOf(push);
        if (i > -1) _pending.splice(i, 1);
        resolve(v);
      }
      function push(fix) {
        if (minAccuracy && fix && fix.accuracy != null && fix.accuracy > minAccuracy) return;
        finish(fix);
      }
      _pending.push(push);

      /* A one-shot request alongside the watch. On some browsers this
         returns sooner than the first watch callback. */
      try {
        navigator.geolocation.getCurrentPosition(
          function (pos) { adopt(shape(pos, 'gps')); },
          function () {},
          { enableHighAccuracy: true, maximumAge: Math.min(maxAge, 30000), timeout: timeout }
        );
      } catch (e) {}

      /* Never hang a caller. Fall back to whatever we have, even if it
         is stale — an approximate location beats none, as long as the
         accuracy travels with it so the caller can judge. */
      setTimeout(function () { finish(current()); }, timeout);
    });
  }

  /* ── the branded gate ────────────────────────────────────────────── */
  function gateCSS() {
    if (document.getElementById('apa-loc-css')) return;
    var s = document.createElement('style');
    s.id = 'apa-loc-css';
    s.textContent = [
      '.apa-loc{position:fixed;inset:0;z-index:99999;background:rgba(8,8,15,.72);backdrop-filter:blur(10px);display:flex;align-items:center;justify-content:center;padding:20px;opacity:0;transition:opacity .35s;}',
      '.apa-loc.show{opacity:1;}',
      '.apa-loc-card{position:relative;background:#FCFCFE;border-radius:26px;padding:34px 30px;max-width:400px;width:100%;text-align:center;box-shadow:0 30px 80px rgba(8,8,15,.4);transform:translateY(16px) scale(.97);transition:transform .45s cubic-bezier(.22,1,.36,1);}',
      '.apa-loc.show .apa-loc-card{transform:none;}',
      '.apa-loc-ico{width:62px;height:62px;border-radius:19px;margin:0 auto 20px;display:flex;align-items:center;justify-content:center;color:#fff;background:linear-gradient(135deg,#6D28FF,#4F6DFF);box-shadow:0 12px 30px rgba(109,40,255,.34);}',
      '.apa-loc-ico svg{width:28px;height:28px;}',
      '.apa-loc-h{font-family:Geist,Inter,sans-serif;font-size:23px;font-weight:500;color:#08080F;margin-bottom:10px;}',
      '.apa-loc-p{font-size:14px;color:#474A66;line-height:1.6;margin-bottom:24px;}',
      '.apa-loc-btn{width:100%;padding:15px;border-radius:100px;border:none;background:linear-gradient(135deg,#6D28FF,#4F6DFF);color:#fff;font-weight:600;font-size:15px;cursor:pointer;transition:transform .2s,box-shadow .2s;}',
      '.apa-loc-btn:hover{transform:translateY(-2px);box-shadow:0 14px 34px rgba(109,40,255,.34);}',
      '.apa-loc-btn:disabled{opacity:.6;cursor:default;transform:none;}',
      '.apa-loc-btn2{width:100%;padding:13px;margin-top:10px;border-radius:100px;border:1px solid #E4E4EE;background:#fff;color:#474A66;font-weight:600;font-size:14px;cursor:pointer;}',
      '.apa-loc-btn2:hover{background:#F4F4FA;}',
      '.apa-loc-note{margin-top:16px;font-size:12px;color:#8B8EAC;line-height:1.55;}',
      '.apa-loc-x{position:absolute;top:14px;right:14px;width:34px;height:34px;border-radius:50%;border:none;background:rgba(139,142,172,.12);color:#474A66;font-size:20px;line-height:1;cursor:pointer;display:flex;align-items:center;justify-content:center;}',
      '.apa-loc-x:hover{background:rgba(139,142,172,.22);}'
    ].join('');
    (document.head || document.documentElement).appendChild(s);
  }

  var PIN_SVG = '<path d="M12 21.7C17.3 17 20 13 20 10a8 8 0 1 0-16 0c0 3 2.7 6.9 8 11.7z"/><circle cx="12" cy="10" r="3"/>';

  /* Copy differs by reason. A guest pressing SOS should not be read the
     same sentence as one browsing stays. */
  var REASONS = {
    sos: {
      h: 'Share your location',
      p: 'If you need help, the fastest thing you can give us is where you are. Cabana sends your exact position to the safety desk with your alert.',
      btn: 'Share my location',
    },
    nearby: {
      h: 'Find what is near you',
      p: 'Turn on location and Cabana shows stays, rides and tours around you, and fills in pick-up points without you typing an address.',
      btn: 'Turn on location',
    },
    ride: {
      h: 'Where should the driver meet you?',
      p: 'Sharing your location sets the pick-up point precisely, so the driver arrives at the right gate rather than the right street.',
      btn: 'Turn on location',
    },
    'default': {
      h: 'Turn on location',
      p: 'Cabana uses your location to set pick-up points, show what is nearby, and reach you quickly if you ever raise an SOS.',
      btn: 'Turn on location',
    },
  };

  function closeGate(g) {
    if (!g) return;
    try { sessionStorage.setItem(SS_SKIP, '1'); } catch (e) {}
    g.classList.remove('show');
    setTimeout(function () { if (g && g.parentNode) g.remove(); }, 400);
  }

  /* prime() shows our explanation, then lets the user's click drive the
     native prompt — browsers only surface it on a gesture. Resolves true
     if we ended up with permission. */
  function prime(opts) {
    opts = opts || {};
    var reason = REASONS[opts.reason] || REASONS['default'];

    if (!supported()) return Promise.resolve(false);
    if (permission() === 'granted') { start(); return Promise.resolve(true); }

    return new Promise(function (resolve) {
      gateCSS();
      if (document.getElementById('apa-loc-gate')) return resolve(false);

      var denied = permission() === 'denied';
      var g = document.createElement('div');
      g.className = 'apa-loc';
      g.id = 'apa-loc-gate';
      g.innerHTML =
        '<div class="apa-loc-card">' +
        '<button class="apa-loc-x" aria-label="Close">&times;</button>' +
        '<div class="apa-loc-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">' + PIN_SVG + '</svg></div>' +
        '<div class="apa-loc-h"></div>' +
        '<div class="apa-loc-p"></div>' +
        (denied ? '' : '<button class="apa-loc-btn"></button>') +
        '<button class="apa-loc-btn2">' + (denied ? 'Got it' : 'Not now') + '</button>' +
        '<div class="apa-loc-note"></div>' +
        '</div>';

      g.querySelector('.apa-loc-h').textContent = denied ? 'Location is blocked' : reason.h;
      g.querySelector('.apa-loc-p').textContent = denied
        ? 'Your browser is blocking location for Cabana. You can still type an address anywhere we ask for one.'
        : reason.p;
      g.querySelector('.apa-loc-note').textContent = denied
        ? 'To enable: tap the lock icon in the address bar → Site settings → Location → Allow, then reload.'
        : 'Used while you are using Cabana. You can turn it off in your browser at any time.';
      var go = g.querySelector('.apa-loc-btn');
      if (go) go.textContent = reason.btn;

      document.body.appendChild(g);
      requestAnimationFrame(function () { g.classList.add('show'); });
      try { localStorage.setItem(LS_ASK, '1'); } catch (e) {}

      function bail() { closeGate(g); resolve(permission() === 'granted'); }
      g.querySelector('.apa-loc-x').addEventListener('click', bail);
      g.querySelector('.apa-loc-btn2').addEventListener('click', bail);
      g.addEventListener('click', function (e) { if (e.target === g) bail(); });
      document.addEventListener('keydown', function onEsc(e) {
        if (e.key === 'Escape') { document.removeEventListener('keydown', onEsc); bail(); }
      });

      if (go) go.addEventListener('click', function () {
        go.disabled = true;
        go.textContent = 'Waiting for permission…';
        navigator.geolocation.getCurrentPosition(
          function (pos) {
            global.__apaLocPerm = 'granted';
            adopt(shape(pos, 'gps'));
            start();
            closeGate(g);
            resolve(true);
          },
          function (err) {
            if (err && err.code === 1) global.__apaLocPerm = 'denied';
            g.remove();
            /* Re-render as the blocked variant rather than leaving a
               dead button behind. */
            prime(opts).then(resolve, function () { resolve(false); });
          },
          { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 }
        );
      });
    });
  }

  /* ensure(): the one most callers want. Gate if we must, then return
     the best fix we can get. Never throws, never hangs. */
  function ensure(opts) {
    opts = opts || {};
    if (!supported()) return Promise.resolve(null);
    if (permission() === 'granted') return get(opts);
    if (permission() === 'denied') return Promise.resolve(current());

    var skipped = false;
    try { skipped = sessionStorage.getItem(SS_SKIP) === '1'; } catch (e) {}
    /* An SOS overrides an earlier "not now". Nothing else does. */
    if (skipped && opts.reason !== 'sos') return Promise.resolve(current());

    return prime(opts).then(function (ok) {
      return ok ? get(opts) : current();
    });
  }

  /* ── a human-readable place name, via the geocoder we already run ── */
  function label(fix) {
    fix = fix || current();
    if (!fix || !global.ApaGeo || !ApaGeo.reverse) return Promise.resolve(null);
    return ApaGeo.reverse(fix.latitude, fix.longitude).then(
      function (p) { return p && (p.label || p.name) || null; },
      function () { return null; }
    );
  }

  function on(fn)  { if (typeof fn === 'function') _listeners.push(fn); }
  function off(fn) { var i = _listeners.indexOf(fn); if (i > -1) _listeners.splice(i, 1); }

  /* ── boot ────────────────────────────────────────────────────────── */
  function boot() {
    if (!supported()) return;
    current();          // hydrate from localStorage so callers get an
                        // immediate answer even before the first fix
    wireVisibility();
    probe();            // resumes silently if already granted
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', boot, { once: true });
    } else { boot(); }
  }

  global.ApaLocation = {
    current: current,
    get: get,
    prime: prime,
    ensure: ensure,
    start: start,
    stop: stop,
    permission: permission,
    probe: probe,
    on: on,
    off: off,
    label: label,
    supported: supported,
    STALE_MS: STALE_MS,
  };
})(window);
