/* ═══════════════════════════════════════════════════════════════════
   APATMENTO · INTERSTITIAL  v1
   ───────────────────────────────────────────────────────────────────
   A full-screen, un-cancellable splash that plays a silent video OR
   shows an image the instant someone lands on the site, then dismisses
   itself on a timer. Managed entirely from the admin console.

   Design rules (learned the hard way, same spirit as apa-session.js):

     1. NEVER trap the user. Every path — success, network failure,
        decode error, a hung <video>, a config that half-loaded — ends
        in the overlay being removed. There is a hard wall-clock ceiling
        that fires no matter what. If anything is uncertain, we bail to
        the normal site.

     2. NO FLASH. The decision to cover the page is made synchronously,
        from a config snapshot cached in localStorage, by a tiny inline
        head script (see index.html). This file inherits an already-
        painted black curtain and fills it — it never has to "pop in".

     3. NOTHING here may throw in a way that reaches the page. The site
        must load normally even if this entire subsystem is broken.

     4. Config + media live in a PUBLIC Supabase storage bucket. No
        schema, no auth, no server function. One tiny JSON fetch.

     5. It plays for the admin-set duration (video) or a fixed 3s
        (image), with no cancel affordance, then fades out.

   Public config shape (splash.json in the bucket):
     {
       "active":    true,
       "type":      "video" | "image",
       "url":       "https://…/interstitial/campaign-xyz.mp4",
       "durationMs": 15000,          // video only; image is fixed 3000
       "frequency": "once" | "daily" | "always",
       "campaign":  "worldcup-2026", // changes ⇒ everyone sees it again
       "updatedAt": 1720000000000
     }
   ═══════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  if (global.__apaInterstitial) return;
  global.__apaInterstitial = true;

  var doc = global.document;

  /* ── Where the config lives. Public bucket, public object. ─────── */
  var SUPA_URL   = 'https://gfwgbgdvxtocwhilrtdw.supabase.co';
  var BUCKET     = 'interstitial';
  var CONFIG_KEY = 'splash.json';
  var CONFIG_URL = SUPA_URL + '/storage/v1/object/public/' + BUCKET + '/' + CONFIG_KEY;

  var LS_CONFIG = 'apa-splash-config';   // last-known config (for instant decisions)
  var LS_SEEN   = 'apa-splash-seen';     // { campaign, ts } — frequency capping

  var IMAGE_MS      = 3000;    // images always show for 3s
  var HARD_CEIL_MS  = 45000;   // default absolute ceiling (raised per-video below)
  var ABS_MAX_MS    = 600000;  // 10 min — the furthest any splash may ever run
  var LOAD_WAIT_MS  = 6000;    // max wait for media's first frame before bailing
  var FADE_MS       = 420;     // dismiss transition

  function safe(fn, label) {
    try { return fn(); }
    catch (e) { if (global.console) console.warn('[splash:' + (label || '?') + ']', e && e.message); }
  }

  /* ── localStorage helpers (never throw; private-mode safe) ─────── */
  function lsGet(k) {
    return safe(function () { return global.localStorage.getItem(k); }, 'lsGet');
  }
  function lsSet(k, v) {
    safe(function () { global.localStorage.setItem(k, v); }, 'lsSet');
  }

  function readCachedConfig() {
    var raw = lsGet(LS_CONFIG);
    if (!raw) return null;
    return safe(function () { return JSON.parse(raw); }, 'parseCfg') || null;
  }

  /* ── Frequency capping ─────────────────────────────────────────
     "once"   → once per campaign per device, forever.
     "daily"  → once per campaign per calendar-ish day (24h).
     "always" → every landing.                                      */
  function alreadySeen(cfg) {
    if (cfg.frequency === 'always') return false;

    var raw = lsGet(LS_SEEN);
    if (!raw) return false;
    var seen = safe(function () { return JSON.parse(raw); }, 'parseSeen');
    if (!seen || seen.campaign !== cfg.campaign) return false;

    if (cfg.frequency === 'daily') {
      return (Date.now() - (seen.ts || 0)) < 24 * 60 * 60 * 1000;
    }
    // default: "once"
    return true;
  }

  function markSeen(cfg) {
    lsSet(LS_SEEN, JSON.stringify({ campaign: cfg.campaign || '', ts: Date.now() }));
  }

  /* ── Should this config play at all? (structural validity only) ── */
  function playable(cfg) {
    if (!cfg || cfg.active !== true) return false;
    if (cfg.type !== 'video' && cfg.type !== 'image') return false;
    if (typeof cfg.url !== 'string' || cfg.url.length < 8) return false;
    return true;
  }

  /* ═══════════════════════════════════════════════════════════════
     THE CURTAIN
     The inline head script may already have painted #apa-splash-curtain
     (an opaque black cover) so the page never flashes. We reuse it if
     present, otherwise create it. Either way, this element is what we
     fade out at the end — removing it reveals the fully-loaded site.
     ═══════════════════════════════════════════════════════════════ */
  function getCurtain() {
    var el = doc.getElementById('apa-splash-curtain');
    if (el) return el;
    el = doc.createElement('div');
    el.id = 'apa-splash-curtain';
    el.setAttribute('style', [
      'position:fixed', 'inset:0', 'z-index:2147483000',
      'background:#0A0A14', 'display:block'
    ].join(';'));
    (doc.body || doc.documentElement).appendChild(el);
    return el;
  }

  function removeCurtain() {
    var el = doc.getElementById('apa-splash-curtain');
    safe(function () {
      if (global.__apaSplashWatch) { global.clearTimeout(global.__apaSplashWatch); global.__apaSplashWatch = null; }
    }, 'watch');
    if (!el) return;
    el.style.transition = 'opacity ' + FADE_MS + 'ms ease';
    el.style.opacity = '0';
    global.setTimeout(function () {
      if (el && el.parentNode) el.parentNode.removeChild(el);
      doc.documentElement.classList.remove('apa-splash-lock');
    }, FADE_MS + 40);
  }

  /* Lock scroll while the splash is up. Class defined inline in head. */
  function lockScroll()   { safe(function () { doc.documentElement.classList.add('apa-splash-lock'); }); }

  /* ═══════════════════════════════════════════════════════════════
     PLAYER
     Builds the media inside the curtain, arms every failsafe, and
     guarantees exactly one dismissal.
     ═══════════════════════════════════════════════════════════════ */
  function play(cfg) {
    var curtain = getCurtain();
    lockScroll();

    /* The engine is now in control — cancel the head watchdog so it
       doesn't rip the curtain out from under a playing video. */
    safe(function () {
      if (global.__apaSplashWatch) { global.clearTimeout(global.__apaSplashWatch); global.__apaSplashWatch = null; }
    }, 'watch');

    var done = false;
    var timers = [];
    function clearTimers() { for (var i = 0; i < timers.length; i++) global.clearTimeout(timers[i]); timers = []; }
    function after(ms, fn) { var t = global.setTimeout(fn, ms); timers.push(t); return t; }

    function finish() {
      if (done) return;
      done = true;
      clearTimers();
      safe(function () { markSeen(cfg); }, 'mark');
      removeCurtain();
    }

    /* HARD WALL-CLOCK CEILING — fires regardless of anything else.
       For video we honour the admin's chosen length (a "world cup clip"
       may legitimately run minutes), but never beyond ABS_MAX_MS, and
       we add a small buffer over the intended duration so the ceiling
       never pre-empts a correctly-running clip. Images use the default. */
    var ceil = HARD_CEIL_MS;
    if (cfg.type === 'video') {
      var want = Math.max(1000, cfg.durationMs | 0) || 15000;
      ceil = Math.min(ABS_MAX_MS, want + 5000);
    }
    after(ceil, finish);

    /* Respect reduced-motion for video: skip straight through. An
       image is static and stays (3s is harmless), but a forced video
       to a motion-sensitive user is not okay. */
    var reduce = safe(function () {
      return global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches;
    });
    if (reduce && cfg.type === 'video') { finish(); return; }

    /* Progress hairline — purely cosmetic, communicates "this will end"
       without offering a cancel. */
    var bar = doc.createElement('div');
    bar.setAttribute('style', [
      'position:absolute', 'left:0', 'bottom:0', 'height:3px', 'width:0%',
      'background:linear-gradient(90deg,#7B2FF7,#5EEAD4)',
      'box-shadow:0 0 12px rgba(123,47,247,.6)', 'z-index:2', 'pointer-events:none'
    ].join(';'));

    /* Brand watermark, subtle. */
    var mark = doc.createElement('div');
    mark.setAttribute('style', [
      'position:absolute', 'left:50%', 'bottom:22px', 'transform:translateX(-50%)',
      'font:600 11px/1 system-ui,sans-serif', 'letter-spacing:.18em',
      'color:rgba(255,255,255,.55)', 'text-transform:uppercase', 'z-index:2',
      'pointer-events:none', 'user-select:none'
    ].join(';'));
    mark.textContent = 'APATMENTO';

    function animateBar(totalMs) {
      var start = Date.now();
      (function tick() {
        if (done) return;
        var pct = Math.min(100, ((Date.now() - start) / totalMs) * 100);
        bar.style.width = pct + '%';
        if (pct < 100) global.requestAnimationFrame(tick);
      })();
    }

    /* ── IMAGE ──────────────────────────────────────────────────── */
    if (cfg.type === 'image') {
      var img = new Image();
      var placed = false;

      function showImage() {
        if (placed || done) return;
        placed = true;
        img.setAttribute('style', [
          'position:absolute', 'inset:0', 'width:100%', 'height:100%',
          'object-fit:cover', 'z-index:1'
        ].join(';'));
        curtain.appendChild(img);
        curtain.appendChild(bar);
        curtain.appendChild(mark);
        animateBar(IMAGE_MS);
        after(IMAGE_MS, finish);
      }

      img.onload  = showImage;
      img.onerror = finish;                 // broken image ⇒ just load the site
      after(LOAD_WAIT_MS, function () {     // slow image ⇒ don't stall the user
        if (!placed) finish();
      });
      img.src = cfg.url;
      /* Cached images can be complete synchronously without firing onload. */
      if (img.complete && img.naturalWidth > 0) showImage();
      return;
    }

    /* ── VIDEO ──────────────────────────────────────────────────── */
    var dur = Math.max(1000, Math.min(ABS_MAX_MS, cfg.durationMs | 0)) || 15000;

    var vid = doc.createElement('video');
    vid.muted = true; vid.defaultMuted = true;   // silent by design
    vid.setAttribute('muted', '');
    vid.autoplay = true; vid.setAttribute('autoplay', '');
    vid.playsInline = true; vid.setAttribute('playsinline', ''); vid.setAttribute('webkit-playsinline', '');
    vid.loop = false;
    vid.preload = 'auto';
    vid.setAttribute('style', [
      'position:absolute', 'inset:0', 'width:100%', 'height:100%',
      'object-fit:cover', 'z-index:1', 'background:#0A0A14'
    ].join(';'));

    var started = false;
    function begin() {
      if (started || done) return;
      started = true;
      curtain.appendChild(bar);
      curtain.appendChild(mark);
      animateBar(dur);
      /* Timer is the source of truth for length — not the file. If the
         file is shorter, its last frame holds; if longer, we cut it. */
      after(dur, finish);
    }

    /* Dismiss when the clip naturally ends too (whichever comes first). */
    vid.addEventListener('ended', finish);
    /* Any fatal media error ⇒ bail to the site. */
    vid.addEventListener('error', finish);
    /* First frame / can-play ⇒ start the countdown. */
    vid.addEventListener('playing', begin);
    vid.addEventListener('loadeddata', begin);

    /* If the browser blocks autoplay even when muted (rare), or the
       network hangs, we must not sit on a black screen. */
    after(LOAD_WAIT_MS, function () { if (!started) finish(); });

    curtain.appendChild(vid);
    vid.src = cfg.url;

    /* Kick playback. Muted autoplay is allowed by every modern browser,
       but we still catch the promise so a rejection bails cleanly. */
    safe(function () {
      var p = vid.play();
      if (p && typeof p.catch === 'function') {
        p.catch(function () {
          /* Give it a beat; if still not started, bail. */
          after(1200, function () { if (!started) finish(); });
        });
      }
    }, 'play');
  }

  /* ═══════════════════════════════════════════════════════════════
     BOOT
     Two-phase:
       Phase A (instant): the inline head script already decided, from
       the cached config, whether to paint the curtain. If it did, we
       arrive with #apa-splash-curtain present and a cached config that
       says "play". We render immediately — no waiting on the network.

       Phase B (background): fetch the live config to (a) refresh the
       cache for next time and (b) if the head script did NOT paint a
       curtain but the live config now says a fresh campaign is active,
       we still won't yank the user mid-page — the interstitial is a
       first-paint experience only. Freshness applies to the *next*
       landing. This keeps the current load smooth and predictable.
     ═══════════════════════════════════════════════════════════════ */
  function refreshCache() {
    safe(function () {
      fetch(CONFIG_URL, { cache: 'no-store' })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (cfg) {
          if (cfg && typeof cfg === 'object') lsSet(LS_CONFIG, JSON.stringify(cfg));
          else lsSet(LS_CONFIG, JSON.stringify({ active: false }));
        })
        .catch(function () { /* offline / missing ⇒ keep last cache */ });
    }, 'refresh');
  }

  function boot() {
    var curtainPainted = !!doc.getElementById('apa-splash-curtain');
    var cfg = readCachedConfig();

    if (curtainPainted) {
      /* The head script committed to a splash. Honour it — but re-validate,
         and if for any reason it's not actually playable, drop the curtain. */
      if (cfg && playable(cfg) && !alreadySeen(cfg)) {
        /* Body may not exist yet if we're extremely early; wait for it. */
        if (doc.body) play(cfg);
        else doc.addEventListener('DOMContentLoaded', function () { play(cfg); }, { once: true });
      } else {
        removeCurtain();
      }
    }

    /* Always refresh the cached config for the next visit. */
    refreshCache();
  }

  if (doc.readyState === 'loading') {
    doc.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }

  /* bfcache restores: if a user navigates back to the landing page from
     history, the head script won't have re-run. We don't replay on back —
     that would be hostile. Nothing to do, but expose a hook for QA. */
  global.ApaInterstitial = {
    _config: readCachedConfig,
    _replayForTest: function () {
      var cfg = readCachedConfig();
      if (cfg && playable(cfg)) { safe(function(){ global.localStorage.removeItem(LS_SEEN); }); getCurtain(); play(cfg); }
    }
  };

})(typeof window !== 'undefined' ? window : this);
