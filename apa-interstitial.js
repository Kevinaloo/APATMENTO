/* ═══════════════════════════════════════════════════════════════════
   APATMENTO · INTERSTITIAL  v2
   ───────────────────────────────────────────────────────────────────
   A full-screen, un-cancellable splash that plays a silent video OR
   shows an image the instant someone opens the site — BEFORE the
   greeting / dashboard is shown — then dismisses itself on a timer.

   Runs on the landing page (index.html) and the dashboard
   (dashboard.html), for guests and signed-in users alike.

   Design rules (kept deliberately simple, per the brief — render it,
   don't entangle it with the intro film or greeting animations):

     1. NEVER trap the user. Every path ends in the cover being removed
        and the site shown. A hard wall-clock ceiling fires regardless.

     2. WORKS ON FIRST VISIT. v1 only painted from a cached config, so a
        brand-new visitor (empty cache) never saw it. v2 fetches the live
        config immediately (short timeout) AND uses the instant cached
        snapshot when present — so it shows the very first time.

     3. INDEPENDENT. Sits above everything at max z-index; does not touch
        the intro film, greeting, or any existing script. Removing its
        cover simply reveals whatever the page already is.

     4. Config + media live in a PUBLIC Supabase storage bucket
        (interstitial/splash.json). No schema, no auth, no server fn.

     5. Video plays for the admin-set duration; images for 3s. No skip.
   ═══════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  if (global.__apaInterstitial) return;
  global.__apaInterstitial = true;

  var doc = global.document;

  var SUPA_URL   = 'https://gfwgbgdvxtocwhilrtdw.supabase.co';
  var BUCKET     = 'interstitial';
  var CONFIG_KEY = 'splash.json';
  var CONFIG_URL = SUPA_URL + '/storage/v1/object/public/' + BUCKET + '/' + CONFIG_KEY;

  var LS_CONFIG = 'apa-splash-config';
  var LS_SEEN   = 'apa-splash-seen';

  var IMAGE_MS      = 3000;
  var ABS_MAX_MS    = 600000;
  var FETCH_MS      = 2500;
  var LOAD_WAIT_MS  = 6000;
  var FADE_MS       = 420;

  function safe(fn, label) {
    try { return fn(); }
    catch (e) { if (global.console) console.warn('[splash:' + (label || '?') + ']', e && e.message); }
  }
  function lsGet(k){ return safe(function(){ return global.localStorage.getItem(k); }, 'lsGet'); }
  function lsSet(k,v){ safe(function(){ global.localStorage.setItem(k,v); }, 'lsSet'); }

  function readCachedConfig() {
    var raw = lsGet(LS_CONFIG);
    if (!raw) return null;
    return safe(function () { return JSON.parse(raw); }, 'parseCfg') || null;
  }
  function playable(cfg) {
    if (!cfg || cfg.active !== true) return false;
    if (cfg.type !== 'video' && cfg.type !== 'image') return false;
    if (typeof cfg.url !== 'string' || cfg.url.length < 8) return false;
    return true;
  }
  function alreadySeen(cfg) {
    if (cfg.frequency === 'always') return false;
    var raw = lsGet(LS_SEEN);
    if (!raw) return false;
    var seen = safe(function () { return JSON.parse(raw); }, 'parseSeen');
    if (!seen || seen.campaign !== cfg.campaign) return false;
    if (cfg.frequency === 'daily') return (Date.now() - (seen.ts || 0)) < 864e5;
    return true;
  }
  function markSeen(cfg) {
    lsSet(LS_SEEN, JSON.stringify({ campaign: cfg.campaign || '', ts: Date.now() }));
  }

  function getCover() {
    var el = doc.getElementById('apa-splash-curtain');
    if (el) return el;
    el = doc.createElement('div');
    el.id = 'apa-splash-curtain';
    el.setAttribute('style', 'position:fixed;inset:0;z-index:2147483000;background:#0A0A14;display:block;');
    (doc.body || doc.documentElement).appendChild(el);
    return el;
  }
  function killWatch() {
    safe(function () {
      if (global.__apaSplashWatch) { global.clearTimeout(global.__apaSplashWatch); global.__apaSplashWatch = null; }
    }, 'watch');
  }
  function removeCover() {
    killWatch();
    var el = doc.getElementById('apa-splash-curtain');
    if (!el) { doc.documentElement.classList.remove('apa-splash-lock'); return; }
    el.style.transition = 'opacity ' + FADE_MS + 'ms ease';
    el.style.opacity = '0';
    global.setTimeout(function () {
      if (el && el.parentNode) el.parentNode.removeChild(el);
      doc.documentElement.classList.remove('apa-splash-lock');
    }, FADE_MS + 40);
  }
  function lockScroll(){ safe(function(){ doc.documentElement.classList.add('apa-splash-lock'); }); }

  var PLAYED = false;
  function play(cfg) {
    if (PLAYED) return; PLAYED = true;

    var cover = getCover();
    lockScroll();
    killWatch();

    var done = false, timers = [];
    function clearTimers(){ for (var i=0;i<timers.length;i++) global.clearTimeout(timers[i]); timers=[]; }
    function after(ms, fn){ var t = global.setTimeout(fn, ms); timers.push(t); return t; }
    function finish(){
      if (done) return; done = true;
      clearTimers();
      safe(function(){ markSeen(cfg); }, 'mark');
      removeCover();
    }

    var ceil = 45000;
    if (cfg.type === 'video') {
      var want = Math.max(1000, cfg.durationMs | 0) || 15000;
      ceil = Math.min(ABS_MAX_MS, want + 5000);
    }
    after(ceil, finish);

    var reduce = safe(function(){ return global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches; });
    if (reduce && cfg.type === 'video') { finish(); return; }

    var bar = doc.createElement('div');
    bar.setAttribute('style', 'position:absolute;left:0;bottom:0;height:3px;width:0%;background:linear-gradient(90deg,#7B2FF7,#5EEAD4);box-shadow:0 0 12px rgba(123,47,247,.6);z-index:2;pointer-events:none;');
    var mark = doc.createElement('div');
    mark.setAttribute('style', 'position:absolute;left:50%;bottom:22px;transform:translateX(-50%);font:600 11px/1 system-ui,sans-serif;letter-spacing:.18em;color:rgba(255,255,255,.55);text-transform:uppercase;z-index:2;pointer-events:none;user-select:none;');
    mark.textContent = 'APATMENTO';

    function animateBar(totalMs){
      var start = Date.now();
      (function tick(){
        if (done) return;
        var pct = Math.min(100, ((Date.now()-start)/totalMs)*100);
        bar.style.width = pct + '%';
        if (pct < 100) global.requestAnimationFrame(tick);
      })();
    }

    if (cfg.type === 'image') {
      var img = new Image();
      var placed = false;
      function showImage(){
        if (placed || done) return; placed = true;
        img.setAttribute('style', 'position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:1;');
        cover.appendChild(img); cover.appendChild(bar); cover.appendChild(mark);
        animateBar(IMAGE_MS); after(IMAGE_MS, finish);
      }
      img.onload = showImage;
      img.onerror = finish;
      after(LOAD_WAIT_MS, function(){ if (!placed) finish(); });
      img.src = cfg.url;
      if (img.complete && img.naturalWidth > 0) showImage();
      return;
    }

    var dur = Math.max(1000, Math.min(ABS_MAX_MS, cfg.durationMs | 0)) || 15000;
    var vid = doc.createElement('video');
    vid.muted = true; vid.defaultMuted = true; vid.setAttribute('muted','');
    vid.autoplay = true; vid.setAttribute('autoplay','');
    vid.playsInline = true; vid.setAttribute('playsinline',''); vid.setAttribute('webkit-playsinline','');
    vid.loop = false; vid.preload = 'auto';
    vid.setAttribute('style', 'position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:1;background:#0A0A14;');

    var started = false;
    function begin(){
      if (started || done) return; started = true;
      cover.appendChild(bar); cover.appendChild(mark);
      animateBar(dur);
      after(dur, finish);
    }
    vid.addEventListener('ended', finish);
    vid.addEventListener('error', finish);
    vid.addEventListener('playing', begin);
    vid.addEventListener('loadeddata', begin);
    after(LOAD_WAIT_MS, function(){ if (!started) finish(); });

    cover.appendChild(vid);
    vid.src = cfg.url;
    safe(function(){
      var p = vid.play();
      if (p && typeof p.catch === 'function') {
        p.catch(function(){ after(1200, function(){ if (!started) finish(); }); });
      }
    }, 'play');
  }

  function fetchConfig() {
    return new Promise(function (resolve) {
      var settled = false;
      var to = global.setTimeout(function(){ if(!settled){ settled = true; resolve(null); } }, FETCH_MS);
      safe(function () {
        fetch(CONFIG_URL + '?t=' + Date.now(), { cache: 'no-store' })
          .then(function (r) { return r.ok ? r.json() : null; })
          .then(function (cfg) {
            if (settled) return; settled = true; global.clearTimeout(to);
            if (cfg && typeof cfg === 'object') lsSet(LS_CONFIG, JSON.stringify(cfg));
            resolve(cfg && typeof cfg === 'object' ? cfg : null);
          })
          .catch(function () { if(!settled){ settled = true; global.clearTimeout(to); resolve(null); } });
      }, 'fetch');
    });
  }

  function decideAndPlay(cfg, coverAlreadyPainted) {
    if (cfg && playable(cfg) && !alreadySeen(cfg)) {
      play(cfg);
    } else if (coverAlreadyPainted) {
      removeCover();
    }
  }

  function boot() {
    var coverPainted = !!doc.getElementById('apa-splash-curtain');
    var cached = readCachedConfig();

    if (coverPainted && cached && playable(cached) && !alreadySeen(cached)) {
      play(cached);
      fetchConfig();
      return;
    }

    fetchConfig().then(function (live) {
      var cfg = live || cached;
      decideAndPlay(cfg, coverPainted);
      if (!cfg && coverPainted) removeCover();
    });
  }

  if (doc.readyState === 'loading') {
    doc.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }

  global.ApaInterstitial = {
    config: readCachedConfig,
    replayForTest: function () {
      safe(function(){ global.localStorage.removeItem(LS_SEEN); });
      PLAYED = false;
      fetchConfig().then(function (cfg) {
        cfg = cfg || readCachedConfig();
        if (cfg && playable(cfg)) { getCover(); lockScroll(); play(cfg); }
        else if (global.console) console.log('[splash] nothing active to replay');
      });
    }
  };

})(typeof window !== 'undefined' ? window : this);
