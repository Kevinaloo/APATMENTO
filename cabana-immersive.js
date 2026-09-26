/* ═══════════════════════════════════════════════════════════════════
   CABANA IMMERSIVE · tours page
   ───────────────────────────────────────────────────────────────────
   The section, the free-trial banner, and the player. The engine
   (cabana-immersive-engine.js) draws; this file decides what, when
   and for whom.

   What a guest can do, in the order they meet it:

     1. See a headset on the page with a world already moving in its
        lenses, and choose how they want to watch: on the screen,
        fullscreen, in a phone VR viewer, or in a real headset.
     2. Put it on. A short "headset on" sequence hides the load, then
        the iris opens onto the scene.
     3. Look around (drag, pinch, or move the phone), press hotspots to
        read about what they are looking at, walk to the next scene,
        jump in the film, or go straight to booking the real tour.

   Who may watch is decided by the database, not by this file. The
   private media only comes back as signed URLs when storage RLS says
   yes. A locked card here is a courtesy that saves a failed request.
   ═══════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  var doc = global.document;
  var SB_URL = 'https://gfwgbgdvxtocwhilrtdw.supabase.co';
  var SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdmd2diZ2R2eHRvY3doaWxydGR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1MTE2NjMsImV4cCI6MjA5NzA4NzY2M30.U8JClv06YsNAwq9qsPb3lQ4SIPeRPjKMzsYxVfcmujw';
  var BUCKET = 'immersive';
  var SIGN_TTL = 4 * 3600;
  var BANNER_GAP_H = 12;
  var BANNER_MS = 9000;
  var REDUCED = !!(global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var LS = { mode: 'cim-mode', banner: 'cim-banner-at', hint: 'cim-hint', fsTip: 'cim-fs-tip' };

  var Eng = global.CabanaImmersiveEngine;
  if (!Eng) return;

  /* ── 1 · HELPERS ─────────────────────────────────────────────────── */
  function $(s, r) { return (r || doc).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || doc).querySelectorAll(s)); }
  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function store(k, v) {
    try {
      if (arguments.length > 1) { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, String(v)); return v; }
      return localStorage.getItem(k);
    } catch (e) { return null; }
  }
  function fmtTime(s) {
    s = Math.max(0, Math.floor(Number(s) || 0));
    var h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60;
    return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(x).padStart(2, '0');
  }
  function dur(s) {
    s = Number(s) || 0;
    if (!s) return '';
    if (s < 60) return s + ' sec';
    var m = Math.round(s / 60);
    return m < 60 ? m + ' min' : Math.floor(m / 60) + ' h ' + (m % 60 ? (m % 60) + ' min' : '');
  }
  function money(n) { return 'KES ' + (Number(n) || 0).toLocaleString('en-KE'); }
  function safeHttps(u) { return /^https:\/\/[^\s"'<>\\]+$/i.test(String(u || '')) ? String(u) : ''; }
  function noop() {}
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function wrap180(d) { return ((d + 180) % 360 + 360) % 360 - 180; }
  function el(tag, cls, html) { var e = doc.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }

  var sbClient = null;
  function sb() {
    if (sbClient) return sbClient;
    try { if (global.ApaSession && ApaSession.client) sbClient = ApaSession.client(); } catch (e) {}
    if (!sbClient && global.__APA_SB__) sbClient = global.__APA_SB__;
    if (!sbClient && global.supabase && global.supabase.createClient) {
      sbClient = global.supabase.createClient(SB_URL, SB_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
    }
    return sbClient;
  }

  var ICON = {
    vr: '<path d="M3 9.2A2.7 2.7 0 0 1 5.7 6.5h12.6A2.7 2.7 0 0 1 21 9.2v5.1a2.7 2.7 0 0 1-2.7 2.7h-3.1a2 2 0 0 1-1.7-.9l-.8-1.2a.9.9 0 0 0-1.5 0l-.8 1.2a2 2 0 0 1-1.7.9H5.7A2.7 2.7 0 0 1 3 14.3z"/><path d="M1 10.5v3M23 10.5v3"/><circle cx="8" cy="11.8" r="1.6"/><circle cx="16" cy="11.8" r="1.6"/>',
    play: '<path d="M7 4.5v15a1 1 0 0 0 1.5.9l12-7.5a1 1 0 0 0 0-1.8l-12-7.5A1 1 0 0 0 7 4.5z" fill="currentColor" stroke="none"/>',
    pause: '<rect x="6" y="4.5" width="4" height="15" rx="1" fill="currentColor" stroke="none"/><rect x="14" y="4.5" width="4" height="15" rx="1" fill="currentColor" stroke="none"/>',
    sound: '<path d="M11 5 6 9H3v6h3l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/>',
    mute: '<path d="M11 5 6 9H3v6h3l5 4z"/><path d="m22 9-6 6M16 9l6 6"/>',
    expand: '<path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>',
    shrink: '<path d="M4 14h6v6M20 10h-6V4M14 10l7-7M3 21l7-7"/>',
    motion: '<rect x="7" y="2.5" width="10" height="19" rx="2.5"/><path d="M11 18.5h2"/><path d="M3.5 8.5a6 6 0 0 0 0 7M20.5 8.5a6 6 0 0 1 0 7"/>',
    visor: '<path d="M2.5 8.5h19v8a2 2 0 0 1-2 2h-4.2l-1.6-2.4a.9.9 0 0 0-1.5 0l-1.6 2.4H4.5a2 2 0 0 1-2-2z"/><path d="M5 8.5 7 5h10l2 3.5"/><circle cx="8" cy="13" r="1.8"/><circle cx="16" cy="13" r="1.8"/>',
    headset: '<path d="M4 8a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v6a3 3 0 0 1-3 3h-2.5l-1.8-2.2a.9.9 0 0 0-1.4 0L9.5 17H7a3 3 0 0 1-3-3z"/><path d="M4 11H2.5M21.5 11H20"/><path d="M7 5.5C8 3.5 10 2.5 12 2.5s4 1 5 3"/>',
    screen: '<rect x="2.5" y="4" width="19" height="13" rx="2"/><path d="M8 20.5h8M12 17v3.5"/><path d="M8.5 10.5c1-1.5 2.2-2.3 3.5-2.3s2.5.8 3.5 2.3c-1 1.5-2.2 2.3-3.5 2.3s-2.5-.8-3.5-2.3z"/>',
    grid: '<rect x="3" y="3" width="7.5" height="7.5" rx="1.5"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="1.5"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="1.5"/><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.5"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    share: '<path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7"/><path d="m16 6-4-4-4 4M12 2v13"/>',
    pin: '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
    lock: '<rect x="4" y="10.5" width="16" height="10.5" rx="2.5"/><path d="M8 10.5V7a4 4 0 0 1 8 0v3.5"/>',
    info: '<circle cx="12" cy="12" r="9.5"/><path d="M12 16.5v-5M12 7.8h.01"/>',
    walk: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    ticket: '<path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2z"/><path d="M13 5v2M13 17v2M13 11v2"/>',
    link: '<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>',
    clock: '<circle cx="12" cy="12" r="9.5"/><path d="M12 7v5l3 2"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    arrowR: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    arrowL: '<path d="M19 12H5M11 18l-6-6 6-6"/>',
    recenter: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/><circle cx="12" cy="12" r="7.5"/>',
    replay: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>',
    seek: '<path d="M4 5v14l8-7zM12 5v14l8-7z" fill="currentColor" stroke="none"/>',
    phone: '<rect x="6" y="2.5" width="12" height="19" rx="2.5"/><path d="M11 18.5h2"/>',
    desktop: '<rect x="2.5" y="4" width="19" height="13" rx="2"/><path d="M8 20.5h8M12 17v3.5"/>',
    sparkle: '<path d="M12 3l1.9 5.8L20 11l-6.1 2.2L12 19l-1.9-5.8L4 11l6.1-2.2z"/>',
    hand: '<path d="M8 13V5.5a1.5 1.5 0 0 1 3 0V12M11 11.5v-2a1.5 1.5 0 0 1 3 0V12M14 10.5a1.5 1.5 0 0 1 3 0V12M17 11.5a1.5 1.5 0 0 1 3 0V15a6 6 0 0 1-6 6h-2a6 6 0 0 1-5.2-3L4.5 14a1.5 1.5 0 0 1 2.5-1.6L8 14"/>'
  };
  function icon(name, cls) {
    return '<svg class="' + (cls || '') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (ICON[name] || '') + '</svg>';
  }

  /* ── 2 · DEVICE + MODES ──────────────────────────────────────────── */
  var caps = Eng.caps();
  var DEV = {
    phone: caps.mobile,
    gyro: caps.gyro,
    fs: !!(doc.fullscreenEnabled || doc.webkitFullscreenEnabled),
    iphone: /iPhone|iPod/.test(navigator.userAgent || ''),
    xr: false
  };
  var MODES = [
    { k: 'window', label: 'Screen', ic: 'screen', hint: 'Drag to look around. On a phone, just move it.' },
    { k: 'full', label: 'Fullscreen', ic: 'expand', hint: 'Fills the whole display. Press Esc, or the button, to come back.' },
    { k: 'visor', label: 'VR viewer', ic: 'visor', hint: 'Split view for a phone slotted into a VR viewer. Look at a marker to press it.' },
    { k: 'xr', label: 'Headset', ic: 'headset', hint: 'Opens straight in your headset. Works in the Meta Quest and Apple Vision Pro browsers.' }
  ];
  function modeOk(k) {
    if (k === 'visor') return DEV.phone && DEV.gyro;
    if (k === 'xr') return DEV.xr;
    return true;
  }
  function modeWhyNot(k) {
    if (k === 'visor') return 'VR viewer mode needs a phone with motion sensors.';
    if (k === 'xr') return 'No VR headset is available to this browser. Open cabana.africa/tours in your headset’s browser.';
    return '';
  }
  function deviceName() {
    if (DEV.xr && !caps.touch) return 'headset';
    if (caps.mobile) return 'phone';
    if (caps.touch) return 'tablet';
    return 'desktop';
  }

  /* ── 3 · STATE ───────────────────────────────────────────────────── */
  var st = {
    list: [], access: null, loaded: false,
    mode: store(LS.mode) || 'window',
    byTour: {}, world: null, worldUrl: null, night: null
  };
  var P = null;   // the open player, or null

  /* The illustrated calibration world: always available, never locked,
     never counted. Labelled as illustrated wherever it shows up. */
  function worldCanvas(v) {
    if (v === 'night') { if (!st.night) st.night = Eng.paintWorld(caps.mobile ? 2048 : 4096, 'night'); return st.night; }
    if (!st.world) st.world = Eng.paintWorld(caps.mobile ? 2048 : 4096);
    return st.world;
  }
  function worldPoster() {
    if (st.worldUrl) return st.worldUrl;
    var small = Eng.paintWorld(1600);
    try { st.worldUrl = small.toDataURL('image/jpeg', 0.86); } catch (e) { st.worldUrl = ''; }
    return st.worldUrl;
  }
  var CALIBRATION = {
    id: null, slug: 'amboseli-at-dusk', illustrated: true,
    title: 'Amboseli at dusk',
    tagline: 'An illustrated world to learn the controls in.',
    destination: 'Amboseli', country: 'Kenya',
    format: '360', media: 'image', interactive: true, scene_count: 2, access: 'free',
    start_scene: 'dusk',
    scenes: [
      { id: 'dusk', name: 'Dusk', kind: 'image', projection: 'equirect', src: '@world', yaw: -12, pitch: 3, fov: 78,
        hotspots: [
          { id: 'k', type: 'info', yaw: -42, pitch: 9, label: 'Kilimanjaro', text: 'Africa’s highest mountain, 5,895 m, stands across the border in Tanzania. From Amboseli it fills the southern sky, clearest in the first and last hour of the day.' },
          { id: 'e', type: 'info', yaw: 99, pitch: 1.5, label: 'The herd', text: 'Amboseli’s elephants have been studied since 1972, one of the longest-running elephant studies anywhere. Family groups walk in to the swamps by day and out onto the plains at dusk.' },
          { id: 's', type: 'info', yaw: 34, pitch: 4, label: 'Try this', text: 'Drag to look around, or on a phone just move it. Pinch or scroll to zoom. Look for the teal markers: some tell you about the view, some take you somewhere.' },
          { id: 'n', type: 'scene', yaw: 150, pitch: -2, label: 'Stay for nightfall', target: 'night' }
        ] },
      { id: 'night', name: 'Nightfall', kind: 'image', projection: 'equirect', src: '@night', yaw: 30, pitch: 10, fov: 80,
        hotspots: [
          { id: 'm', type: 'info', yaw: 34, pitch: 20, label: 'Moonrise', text: 'On the plains there is no light but this. Guides on night drives read the ground by it, and by the eyeshine of whatever is watching back.' },
          { id: 'b', type: 'scene', yaw: -150, pitch: -2, label: 'Back to dusk', target: 'dusk' }
        ] }
    ]
  };

  /* ── 4 · DATA ────────────────────────────────────────────────────── */
  var COLS = 'id,slug,title,tagline,description,destination,country,credits,tour_id,poster_url,teaser_url,duration_s,access,featured,sort_order,scenes,start_scene,format,media,stereo,interactive,scene_count,published_at';
  function load() {
    var c = sb();
    if (!c) { st.loaded = true; st.access = { open: true, trial: false, banner: { enabled: false } }; renderAll(); return Promise.resolve(); }
    var list = c.from('immersive_experiences').select(COLS).eq('status', 'published')
      .order('featured', { ascending: false }).order('sort_order', { ascending: false }).order('published_at', { ascending: false });
    var acc = c.rpc('immersive_state');
    return Promise.all([list, acc]).then(function (r) {
      st.list = (r[0] && r[0].data) || [];
      st.access = (r[1] && r[1].data) || { open: true, trial: true, banner: { enabled: false } };
      st.loaded = true;
      st.byTour = {};
      st.list.forEach(function (e) { if (e.tour_id != null && !st.byTour[e.tour_id]) st.byTour[e.tour_id] = e; });
      renderAll();
      decorateTours();
      deepLink();
      maybeBanner();
    }, function () {
      st.loaded = true;
      st.access = { open: true, trial: false, banner: { enabled: false } };
      renderAll();
    });
  }
  function refreshAccess() {
    var c = sb(); if (!c) return Promise.resolve(st.access);
    return c.rpc('immersive_state').then(function (r) { if (r && r.data) st.access = r.data; return st.access; }, function () { return st.access; });
  }
  function locked(e) {
    if (!e || e.illustrated || e.access !== 'pass') return false;
    var a = st.access || {};
    return !(a.open || a.has_pass || a.admin);
  }
  function featured() { return st.list[0] || CALIBRATION; }
  function bySlug(s) {
    if (s === CALIBRATION.slug) return CALIBRATION;
    return st.list.filter(function (e) { return e.slug === s; })[0] || null;
  }

  /* ── 5 · THE SECTION ─────────────────────────────────────────────── */
  var root = null;
  function renderAll() {
    root = doc.getElementById('immersive');
    if (!root) return;
    renderTrial();
    renderModes();
    renderLenses();
    renderRail();
  }

  function renderTrial() {
    var t = $('#cim-trial', root); if (!t) return;
    var a = st.access || {};
    if (a.trial) {
      var ends = a.trial_ends_at ? new Date(a.trial_ends_at) : null;
      t.hidden = false;
      $('.cim-trial-t', t).innerHTML = '<b>Every world is open.</b> ' +
        (ends ? 'Free until ' + ends.toLocaleDateString('en-KE', { day: 'numeric', month: 'long' }) + '.' : 'Free while we launch.');
    } else if (a.has_pass) {
      t.hidden = false;
      $('.cim-trial-tag', t).textContent = 'Pass holder';
      $('.cim-trial-t', t).innerHTML = '<b>Your Immersive Pass is active.</b>' +
        (a.pass_expires_at ? ' Until ' + new Date(a.pass_expires_at).toLocaleDateString('en-KE', { day: 'numeric', month: 'long' }) + '.' : '');
    } else {
      t.hidden = true;
    }
  }

  function renderModes() {
    var seg = $('#cim-seg', root), hint = $('#cim-modes-h', root);
    if (!seg) return;
    if (!modeOk(st.mode)) st.mode = 'window';
    seg.innerHTML = MODES.map(function (m) {
      var ok = modeOk(m.k);
      // A mode this device cannot do is still shown, greyed, with the reason:
      // a guest on a laptop should learn that a headset works too.
      return '<button type="button" data-mode="' + m.k + '" aria-pressed="' + (st.mode === m.k) + '"' +
        (ok ? '' : ' disabled aria-disabled="true"') + ' title="' + esc(ok ? m.hint : modeWhyNot(m.k)) + '">' +
        icon(m.ic) + '<span>' + m.label + '</span></button>';
    }).join('');
    var cur = MODES.filter(function (m) { return m.k === st.mode; })[0];
    if (hint) hint.textContent = cur ? cur.hint : '';
    $$('[data-mode]', seg).forEach(function (b) {
      b.addEventListener('click', function () {
        st.mode = b.getAttribute('data-mode');
        store(LS.mode, st.mode);
        renderModes();
      });
      b.addEventListener('mouseenter', function () { if (b.disabled && hint) hint.textContent = modeWhyNot(b.getAttribute('data-mode')); });
      b.addEventListener('mouseleave', function () { if (hint && cur) hint.textContent = cur.hint; });
    });
  }

  /* The lenses: the featured world, panning, with a HUD that reads the
     heading it is actually showing. Runs only while on screen. */
  var lens = { yaw: -30, raf: 0, visible: false, px: 0.5, py: 0.5, src: null, ready: false };
  function renderLenses() {
    var f = featured();
    var src = f.illustrated ? worldPoster() : (f.poster_url || worldPoster());
    if (!src || lens.src === src) return;
    lens.src = src;
    lens.ready = false;
    $$('.cim-lens-world', root).forEach(function (w) {
      w.innerHTML = '<img alt="" decoding="async" src="' + esc(src) + '"/><img alt="" decoding="async" src="' + esc(src) + '"/>';
      var im = w.querySelector('img');
      if (im.complete) lens.ready = true; else im.addEventListener('load', function () { lens.ready = true; });
    });
    var cap = $('#cim-hs-cap', root);
    if (cap) cap.innerHTML = 'Now showing <b>' + esc(f.title) + '</b>' + (f.illustrated ? ' · illustrated' : '');
    var hs = $('#cim-hs', root);
    if (hs) hs.setAttribute('aria-label', 'Step inside ' + f.title);
    startLens();
  }
  var CARD = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  function heading(y) { var d = ((y % 360) + 360) % 360; return CARD[Math.round(d / 45) % 8] + ' ' + String(Math.round(d)).padStart(3, '0') + '°'; }
  function paintLens() {
    var worlds = $$('.cim-lens-world', root);
    if (!worlds.length) return;
    var lensEl = worlds[0].parentNode;
    var lw = lensEl.offsetWidth, img = worlds[0].querySelector('img');
    if (!img || !lw) return;
    var iw = img.offsetWidth; if (!iw) return;
    var look = lens.yaw + (lens.px - 0.5) * 24;
    worlds.forEach(function (w, i) {
      var px = iw * (0.5 + look / 360) + (i ? iw * 0.006 : 0) - lw / 2;
      px = ((px % iw) + iw) % iw;
      w.style.transform = 'translate3d(' + (-px).toFixed(1) + 'px,' + (-50 + (lens.py - 0.5) * 14).toFixed(2) + '%,0)';
    });
    var h = heading(look);
    $$('.cim-lens-hud .c', root).forEach(function (c) { c.textContent = h; });
  }
  function startLens() {
    if (lens.io || !root) { paintLens(); return; }
    var hs = $('#cim-hs', root);
    if (global.IntersectionObserver) {
      lens.io = new IntersectionObserver(function (en) {
        lens.visible = en[0].isIntersecting;
        if (lens.visible) loop();
      }, { threshold: 0.05 });
      lens.io.observe(hs || root);
    } else { lens.visible = true; loop(); }
    var last = 0;
    function loop(t) {
      cancelAnimationFrame(lens.raf);
      if (!lens.visible || doc.hidden) return;
      lens.raf = requestAnimationFrame(loop);
      if (t && last) lens.yaw += REDUCED ? 0 : (t - last) * 0.006;
      last = t || 0;
      paintLens();
    }
    doc.addEventListener('visibilitychange', function () { if (!doc.hidden && lens.visible) loop(); });

    // The headset turns toward the pointer, and the world inside the
    // lenses turns with it. Fine pointers only: on a phone it just floats.
    if (hs && !caps.touch && !REDUCED) {
      root.addEventListener('pointermove', function (e) {
        var r = hs.getBoundingClientRect();
        var x = clamp((e.clientX - r.left) / r.width, -0.4, 1.4), y = clamp((e.clientY - r.top) / r.height, -0.4, 1.4);
        lens.px = x; lens.py = y;
        hs.style.setProperty('--ry', ((x - 0.5) * 22).toFixed(2) + 'deg');
        hs.style.setProperty('--rx', ((0.5 - y) * 14).toFixed(2) + 'deg');
      });
      root.addEventListener('pointerleave', function () {
        lens.px = lens.py = 0.5;
        hs.style.removeProperty('--ry'); hs.style.removeProperty('--rx');
      });
    }
  }

  function formatChip(e) {
    var f = e.format === '180' ? '180°' : e.format === 'flat' ? 'Cinema' : e.format === 'mixed' ? 'Mixed' : '360°';
    return f + (e.stereo ? ' 3D' : '');
  }
  function cardHTML(e) {
    var isLocked = locked(e);
    var trialOpens = !e.illustrated && e.access === 'pass' && st.access && st.access.trial;
    var poster = e.illustrated ? worldPoster() : (e.poster_url || '');
    var where = [e.destination, e.country].filter(Boolean).join(', ');
    var meta = [];
    if (e.duration_s) meta.push(dur(e.duration_s));
    if (e.scene_count > 1) meta.push(e.scene_count + ' scenes');
    meta.push(e.media === 'image' ? 'Panorama' : e.media === 'mixed' ? 'Film + panorama' : 'Film');
    if (e.illustrated) meta = ['Illustrated', '2 scenes', 'Learn the controls'];
    return '<button class="cim-card" type="button" data-slug="' + esc(e.slug) + '" aria-label="' + esc((isLocked ? 'Locked: ' : 'Step inside: ') + e.title) + '">' +
      '<span class="cim-card-media">' + (poster ? '<img alt="" loading="lazy" decoding="async" src="' + esc(poster) + '"/>' : '') + '</span>' +
      '<span class="cim-card-glare"></span>' +
      '<span class="cim-card-top">' +
        '<span class="cim-chip hot">' + icon('vr') + esc(formatChip(e)) + '</span>' +
        (e.interactive ? '<span class="cim-chip">' + icon('sparkle') + 'Interactive</span>' : '') +
        (trialOpens ? '<span class="cim-chip holo">Free trial</span>' : '') +
      '</span>' +
      (isLocked ? '<span class="cim-card-lock" title="Needs an Immersive Pass">' + icon('lock') + '</span>' : '') +
      '<span class="cim-card-body">' +
        (where ? '<span class="cim-card-where">' + icon('pin') + esc(where) + '</span>' : '') +
        '<span class="cim-card-title">' + esc(e.title) + '</span>' +
        '<span class="cim-card-meta">' + esc(meta.join(' · ')) + '</span>' +
        '<span class="cim-card-go">' + (isLocked ? icon('lock') + 'Unlock' : 'Step inside' + icon('arrowR')) + '</span>' +
      '</span>' +
    '</button>';
  }
  function renderRail() {
    var track = $('#cim-track', root);
    if (!track) return;
    if (!st.loaded) { track.innerHTML = '<div class="cim-skel"></div><div class="cim-skel"></div><div class="cim-skel"></div>'; return; }
    var list = st.list.slice();
    // Real footage first. The illustrated world rides along while there
    // is little else, so the band always has something to step into.
    if (list.length < 3) list.push(CALIBRATION);
    var html = list.map(cardHTML).join('');
    if (!st.list.length) {
      html += '<div class="cim-card soon" aria-hidden="true"><div class="cim-soon-in">' + icon('vr') +
        '<b>New worlds are being filmed</b><span>Safaris, reefs and cities in 360°, shot on the routes our operators run.</span></div></div>';
    }
    track.innerHTML = html;
    var cnt = $('#cim-worlds-s', root);
    if (cnt) cnt.textContent = st.list.length
      ? st.list.length + ' world' + (st.list.length === 1 ? '' : 's') + ' to step into'
      : 'Start with the calibration world while the first films are cut';
    $$('.cim-card[data-slug]', track).forEach(function (c) {
      c.addEventListener('click', function () { var e = bySlug(c.getAttribute('data-slug')); if (e) open(e, { from: c }); });
      if (caps.touch || REDUCED) return;
      c.addEventListener('pointermove', function (ev) {
        var r = c.getBoundingClientRect(), x = (ev.clientX - r.left) / r.width, y = (ev.clientY - r.top) / r.height;
        c.style.setProperty('--ty', ((x - 0.5) * 12).toFixed(2) + 'deg');
        c.style.setProperty('--tx', ((0.5 - y) * 10).toFixed(2) + 'deg');
        c.style.setProperty('--gx', (x * 100).toFixed(1) + '%');
        c.style.setProperty('--gy', (y * 100).toFixed(1) + '%');
      });
      c.addEventListener('pointerleave', function () { c.style.removeProperty('--tx'); c.style.removeProperty('--ty'); });
    });
  }

  function wireSection() {
    root = doc.getElementById('immersive');
    if (!root || root.dataset.wired) return;
    root.dataset.wired = '1';
    var go = $('#cim-go', root), hs = $('#cim-hs', root), how = $('#cim-how-btn', root);
    if (go) go.addEventListener('click', function () { open(featured(), { from: go }); });
    if (hs) {
      hs.addEventListener('click', function () { open(featured(), { from: hs }); });
      hs.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(featured(), { from: hs }); } });
    }
    if (how) how.addEventListener('click', function () {
      var p = $('#cim-how', root); if (!p) return;
      p.hidden = !p.hidden;
      how.setAttribute('aria-expanded', String(!p.hidden));
      if (!p.hidden && p.scrollIntoView) p.scrollIntoView({ behavior: REDUCED ? 'auto' : 'smooth', block: 'nearest' });
    });
    $$('[data-rail]', root).forEach(function (b) {
      b.addEventListener('click', function () {
        var t = $('#cim-track', root); if (!t) return;
        var card = t.querySelector('.cim-card');
        t.scrollBy({ left: (card ? card.offsetWidth + 16 : 280) * Number(b.getAttribute('data-rail')), behavior: REDUCED ? 'auto' : 'smooth' });
      });
    });
  }

  /* ── 6 · TOUR LISTINGS: badge the ones you can step into ─────────── */
  function badgeCards() {
    $$('.ct-card[data-id]').forEach(function (c) {
      var e = st.byTour[c.getAttribute('data-id')];
      var media = c.querySelector('.ct-card-media');
      if (!media) return;
      var b = media.querySelector('.cim-tourbadge');
      if (e && !b) media.insertAdjacentHTML('beforeend', '<span class="cim-tourbadge" title="Step inside this tour in 360°">' + icon('vr') + formatChip(e) + '</span>');
      if (!e && b) b.remove();
    });
  }
  function decorateSheet() {
    var sheet = doc.getElementById('ct-sheet');
    if (!sheet || !sheet.classList.contains('open') || sheet.querySelector('.cim-sheetbtn')) return;
    var book = sheet.querySelector('[data-book]');
    var e = book && st.byTour[book.getAttribute('data-book')];
    if (!e) return;
    var btn = el('button', 'cim-sheetbtn');
    btn.type = 'button';
    btn.innerHTML = '<span class="i">' + icon('vr') + '</span><span><b>Step inside before you book</b><span>' +
      esc(formatChip(e)) + ' · ' + esc(e.title) + (locked(e) ? ' · Pass' : '') + '</span></span>';
    btn.addEventListener('click', function () { open(e, { from: btn }); });
    var anchor = sheet.querySelector('.ct-sheet-meta') || sheet.querySelector('.ct-sheet-title');
    if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(btn, anchor.nextSibling);
  }
  var decorated = false;
  function decorateTours() {
    if (!Object.keys(st.byTour).length) return;
    badgeCards();
    if (decorated || !global.MutationObserver) return;
    decorated = true;
    var grid = doc.getElementById('ct-grid');
    if (grid) new MutationObserver(badgeCards).observe(grid, { childList: true });
    var sheet = doc.getElementById('ct-sheet');
    if (sheet) new MutationObserver(decorateSheet).observe(sheet, { attributes: true, attributeFilter: ['class'], childList: true });
  }

  /* ── 7 · THE FREE-TRIAL BANNER ───────────────────────────────────── */
  var bannerShown = false;
  function maybeBanner() {
    var a = st.access;
    if (bannerShown || !a || !a.banner || !a.banner.enabled) return;
    var last = Number(store(LS.banner) || 0);
    if (last && Date.now() - last < BANNER_GAP_H * 3600e3) return;
    // Wait for the page's own entry animation to finish: two things
    // arriving at once is one thing too many.
    var waited = 0;
    (function wait() {
      var gate = doc.getElementById('jungle-gate'), lockd = doc.documentElement.classList.contains('jg-lock');
      if ((gate || lockd) && waited < 12000) { waited += 250; setTimeout(wait, 250); return; }
      setTimeout(waitTurn, 900);
    })();
    // Then wait for the room to be free: the welcome gift, a referral
    // offer or a celebration all have first claim on a new visitor.
    var turns = 0;
    function waitTurn() {
      if (othersBusy()) { if (++turns < 60) setTimeout(waitTurn, 800); return; }
      showBanner();
    }
  }
  /* The platform's shared rule for anything that takes the screen:
     global.__cabanaOverlay names who has it (cabana-credit.js,
     referral.js). Take it when showing, give it back only if still ours. */
  function othersBusy() {
    var o = global.__cabanaOverlay;
    if (o && String(o).indexOf('immersive') !== 0) return true;
    return !!doc.querySelector('.ccp-wrap, .cw-wrap, #apt-ref-popup');
  }
  function claim(who) { if (!global.__cabanaOverlay) global.__cabanaOverlay = who; }
  function release(who) { if (global.__cabanaOverlay === who) global.__cabanaOverlay = null; }
  function showBanner() {
    if (bannerShown || P || othersBusy()) return;
    bannerShown = true;
    store(LS.banner, Date.now());
    claim('immersive-banner');
    var a = st.access || {}, b = a.banner || {};
    var ends = a.trial_ends_at ? ' Ends ' + new Date(a.trial_ends_at).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' }) + '.' : '';
    var node = el('div', 'cim-banner');
    node.setAttribute('role', 'status');
    node.setAttribute('aria-live', 'polite');
    node.innerHTML =
      '<div class="cim-banner-in">' +
        '<div class="cim-banner-ic">' + icon('vr') + '</div>' +
        '<div><div class="cim-banner-k">Cabana Immersive · New</div>' +
          '<div class="cim-banner-t">' + esc(b.title || 'Enjoy a free trial') + '</div>' +
          '<div class="cim-banner-s">' + esc(b.text || '') + esc(ends) + '</div></div>' +
        '<div class="cim-banner-act">' +
          '<button class="cim-banner-go" type="button">Step inside' + icon('arrowR') + '</button>' +
          '<button class="cim-banner-x" type="button" aria-label="Dismiss">' + icon('x') + '</button>' +
        '</div>' +
        '<div class="cim-banner-clock"><i style="--dur:' + BANNER_MS + 'ms"></i></div>' +
      '</div>';
    doc.body.appendChild(node);
    var gone = false;
    function dismiss() {
      if (gone) return; gone = true;
      release('immersive-banner');
      node.classList.remove('on'); node.classList.add('out');
      setTimeout(function () { node.remove(); }, 700);
    }
    requestAnimationFrame(function () { requestAnimationFrame(function () { node.classList.add('on'); sparks(node); }); });
    // The countdown bar is the timer: hovering or focusing pauses the bar,
    // and with it the dismissal.
    var clock = node.querySelector('.cim-banner-clock i');
    clock.addEventListener('animationend', dismiss);
    if (REDUCED) setTimeout(dismiss, BANNER_MS);
    node.querySelector('.cim-banner-x').addEventListener('click', dismiss);
    node.querySelector('.cim-banner-go').addEventListener('click', function (ev) { dismiss(); open(featured(), { from: ev.currentTarget }); });
    var y0 = null;
    node.addEventListener('touchstart', function (e) { y0 = e.touches[0].clientY; }, { passive: true });
    node.addEventListener('touchmove', function (e) { if (y0 != null && e.touches[0].clientY - y0 < -28) { y0 = null; dismiss(); } }, { passive: true });
  }
  function sparks(node) {
    if (REDUCED) return;
    var ic = node.querySelector('.cim-banner-ic'); if (!ic) return;
    var host = node.querySelector('.cim-banner-in');
    var r = ic.getBoundingClientRect(), h = host.getBoundingClientRect();
    for (var i = 0; i < 14; i++) {
      var s = el('i', 'cim-spark');
      var a = Math.random() * Math.PI * 2, d = 30 + Math.random() * 70;
      s.style.left = (r.left - h.left + r.width / 2) + 'px';
      s.style.top = (r.top - h.top + r.height / 2) + 'px';
      s.style.setProperty('--sx', (Math.cos(a) * d).toFixed(0) + 'px');
      s.style.setProperty('--sy', (Math.sin(a) * d).toFixed(0) + 'px');
      s.style.background = ['#5EEAD4', '#7C5CFF', '#FF7AC6', '#F5B12E', '#fff'][i % 5];
      s.style.animationDelay = (0.35 + Math.random() * 0.2).toFixed(2) + 's';
      host.appendChild(s);
    }
  }

  /* ── 8 · MEDIA URLS ──────────────────────────────────────────────── */
  function refs(e) {
    var out = [];
    (e.scenes || []).forEach(function (s) {
      ['src', 'src_mobile', 'audio'].forEach(function (k) { if (typeof s[k] === 'string' && s[k].indexOf('sb:') === 0) out.push(s[k].slice(3)); });
    });
    return out.filter(function (v, i, a) { return a.indexOf(v) === i; });
  }
  function signAll(e) {
    var paths = refs(e);
    if (!paths.length) return Promise.resolve({});
    var c = sb();
    if (!c) return Promise.reject(new Error('offline'));
    return c.storage.from(BUCKET).createSignedUrls(paths, SIGN_TTL).then(function (r) {
      if (r.error) { var er = new Error(r.error.message || 'denied'); er.code = 'denied'; throw er; }
      var map = {}, missing = 0;
      (r.data || []).forEach(function (d) {
        var u = d.signedUrl || d.signedURL;
        if (u && !d.error) map[d.path] = /^https?:/.test(u) ? u : SB_URL + '/storage/v1' + u;
        else missing++;
      });
      if (missing && !Object.keys(map).length) { var e2 = new Error('denied'); e2.code = 'denied'; throw e2; }
      return map;
    });
  }
  function resolveRef(ref, map) {
    if (!ref) return null;
    if (typeof ref !== 'string') return ref;
    if (ref === '@world') return worldCanvas();
    if (ref === '@night') return worldCanvas('night');
    if (ref.indexOf('sb:') === 0) return map[ref.slice(3)] || null;
    return safeHttps(ref) || null;
  }

  /* ── 9 · THE PLAYER ──────────────────────────────────────────────── */
  function open(e, o) {
    o = o || {};
    if (!e) return;
    if (P) close(true);
    var mode = o.mode || st.mode;
    if (!modeOk(mode)) mode = 'window';
    buildPlayer(e, mode, o);
    if (locked(e)) { gate(e); return; }
    startEngine(mode, o);
  }

  function buildPlayer(e, mode, o) {
    var scenes = e.scenes || [];
    var root2 = el('div', 'cim-player is-window');
    root2.setAttribute('role', 'dialog');
    root2.setAttribute('aria-modal', 'true');
    root2.setAttribute('aria-label', e.title + ', immersive player');
    var tour = e.tour_id != null ? tourById(e.tour_id) : null;
    root2.innerHTML =
      '<div class="cim-frame">' +
        '<div class="cim-stage blur" id="cim-stage"></div>' +
        '<div class="cim-vignette"></div><div class="cim-grain"></div>' +
        '<div class="cim-hots" id="cim-hots"></div>' +
        '<div class="cim-hud">' +
          '<div class="cim-top">' +
            '<div class="cim-titleblk">' +
              '<button class="cim-ib" type="button" data-k="close" aria-label="Take off the headset (Esc)">' + icon('x') + '</button>' +
              '<div class="cim-tt"><div class="cim-tt-k" id="cim-tt-k"></div><div class="cim-tt-t">' + esc(e.title) + '</div></div>' +
            '</div>' +
            '<div class="cim-compass" aria-hidden="true"><div class="cim-compass-strip" id="cim-strip"></div><div class="cim-compass-needle"></div></div>' +
            '<div class="cim-top-r">' +
              '<button class="cim-ib" type="button" data-k="share" aria-label="Share this world">' + icon('share') + '</button>' +
            '</div>' +
          '</div>' +
          '<div class="cim-radar" aria-hidden="true"><div class="cim-radar-cone" id="cim-cone"></div><div id="cim-rdots"></div><div class="cim-radar-me"></div><div class="cim-radar-n">N</div></div>' +
          (tour ? '<div class="cim-book"><div class="cim-book-t"><div class="cim-book-k">The real thing</div><div class="cim-book-n">' + esc(tour.title) + '</div></div>' +
            '<button class="cim-book-b" type="button" data-k="book">Book it</button></div>' : '') +
          '<div class="cim-dock" role="toolbar" aria-label="Player controls">' +
            '<button class="cim-ib" type="button" data-k="play" aria-label="Play" hidden>' + icon('play') + '</button>' +
            '<span class="cim-time" id="cim-time" hidden>0:00</span>' +
            '<div class="cim-scrub" id="cim-scrub" hidden><div class="cim-rail"><i class="buf"></i><i class="fill"></i></div><input type="range" min="0" max="1000" value="0" step="1" aria-label="Seek"/></div>' +
            '<div class="cim-still" id="cim-still">' + (e.illustrated ? 'Illustrated · look around' : 'Panorama · look around') + '</div>' +
            '<button class="cim-ib" type="button" data-k="mute" aria-label="Mute">' + icon('sound') + '</button>' +
            '<span class="cim-dock-sep"></span>' +
            '<button class="cim-ib" type="button" data-k="scenes" aria-label="Scenes" hidden>' + icon('grid') + '</button>' +
            '<button class="cim-ib" type="button" data-k="recenter" aria-label="Face forward">' + icon('recenter') + '</button>' +
            (DEV.gyro && DEV.phone ? '<button class="cim-ib" type="button" data-k="gyro" aria-label="Look around by moving your phone" aria-pressed="false">' + icon('motion') + '</button>' : '') +
            (modeOk('visor') ? '<button class="cim-ib" type="button" data-k="visor" aria-label="VR viewer mode">' + icon('visor') + '</button>' : '') +
            '<button class="cim-ib" type="button" data-k="full" aria-label="Fullscreen (F)" aria-pressed="false">' + icon('expand') + '</button>' +
            (DEV.xr ? '<button class="cim-ib" type="button" data-k="xr" aria-label="Open in headset">' + icon('headset') + '</button>' : '') +
          '</div>' +
        '</div>' +
        '<div class="cim-center" id="cim-buf" hidden><div class="cim-spin"></div><div class="cim-spin-l">Streaming 360°</div></div>' +
        '<div class="cim-hint" id="cim-hint"></div>' +
        '<div class="cim-info" id="cim-info" role="dialog" aria-live="polite"></div>' +
        '<div class="cim-scenes" id="cim-scenes"></div>' +
        '<div class="cim-visor" id="cim-visor"><div class="cim-visor-div"></div><button class="cim-visor-x" type="button" data-k="visor-exit">' + icon('x') + 'Leave viewer</button></div>' +
        '<div class="cim-prep" id="cim-prep" hidden></div>' +
        '<div class="cim-xr"><div class="cim-xr-in">' + icon('headset') + '<h3>You’re in the headset</h3><p>Look at a marker and press the trigger to use it. Squeeze the grip, or take the headset off, to come back.</p>' +
          '<button class="cim-btn cim-btn-ghost" type="button" data-k="xr-exit">Leave headset</button></div></div>' +
        '<div class="cim-modal" id="cim-modal"><div class="cim-modal-in" id="cim-modal-in"></div></div>' +
        bootHTML(e, o) +
        '<div class="cim-toast" id="cim-toast" role="status"></div>' +
        '<div class="cim-sr" aria-live="polite" id="cim-live"></div>' +
      '</div>';
    doc.body.appendChild(root2);
    doc.body.classList.add('cim-lock');
    release('immersive-banner');
    claim('immersive');

    P = {
      e: e, root: root2, mode: 'window', bestMode: mode === 'full' ? 'fullscreen' : 'window',
      eng: null, sceneId: null, seen: {}, hotEls: [], dur: 0, t: 0,
      t0: Date.now(), active: 0, lastTick: Date.now(), completed: false, closing: false,
      from: o.from || doc.activeElement, hudTimer: 0, infoTimer: 0, panelTimer: 0, signed: null,
      pushed: false, tour: tour, wantMode: mode, needsTap: !!o.needsTap
    };
    P.$ = function (s) { return root2.querySelector(s); };

    // Back button closes the player instead of leaving the page.
    if (!o.fromHistory && global.history && history.pushState && !e.illustrated) {
      try {
        var u = new URL(location.href); u.searchParams.set('vr', e.slug);
        history.pushState({ cim: e.slug }, '', u.toString());
        P.pushed = true;
      } catch (x) {}
    }

    wirePlayer();
    buildCompass();
    requestAnimationFrame(function () { root2.classList.add('on'); });
    var closeBtn = P.$('[data-k="close"]');
    if (closeBtn) setTimeout(function () { try { closeBtn.focus({ preventScroll: true }); } catch (x) {} }, 60);
  }

  function bootHTML(e, o) {
    return '<div class="cim-boot" id="cim-boot">' +
      '<div class="cim-boot-in">' +
        '<div class="cim-boot-lenses">' +
          [0, 1].map(function () {
            return '<svg class="cim-boot-lens" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="46"/><circle class="b" cx="50" cy="50" r="38"/>' +
              '<line x1="50" y1="40" x2="50" y2="60"/><line x1="40" y1="50" x2="60" y2="50"/>' +
              '<g class="sweep"><path d="M50 50 L50 8" stroke="rgba(94,234,212,.5)" stroke-width="1"/></g></svg>';
          }).join('') +
        '</div>' +
        '<div class="cim-boot-brand">Cabana Immersive</div>' +
        '<div class="cim-boot-lines" id="cim-boot-lines"><div>Calibrating horizon</div><div>Locking orientation</div><div>' +
          (e.media === 'image' ? 'Unfolding the panorama' : 'Streaming the world') + '</div></div>' +
        '<div class="cim-boot-bar"><i id="cim-boot-bar"></i></div>' +
      '</div>' +
      '<div class="cim-boot-skip" id="cim-boot-skip">' + (o.needsTap ? 'Tap to step inside' : 'Tap to skip') + '</div>' +
    '</div>';
  }

  function tourById(id) {
    try {
      var list = global.CabanaTours && CabanaTours.get ? CabanaTours.get() : [];
      return list.filter(function (t) { return String(t.id) === String(id); })[0] || null;
    } catch (e) { return null; }
  }

  /* ── boot: headset on ── */
  function bootStep(i) {
    if (!P) return;
    var lines = $$('#cim-boot-lines div', P.root);
    lines.forEach(function (d, j) { if (j < i) d.classList.add('on', 'ok'); else if (j === i) d.classList.add('on'); });
    var bar = P.$('#cim-boot-bar'); if (bar) bar.style.width = Math.min(100, (i / lines.length) * 100) + '%';
  }
  function openIris() {
    if (!P || P.irisOpen) return;
    P.irisOpen = true;
    bootStep(3);
    var boot = P.$('#cim-boot'), stage = P.$('#cim-stage');
    if (!boot) return;
    if (REDUCED) { boot.classList.add('gone'); stage.classList.remove('blur'); afterOpen(); return; }
    boot.classList.add('opening');
    var t0 = performance.now(), D = 1100;
    setTimeout(function () { stage.classList.remove('blur'); }, 120);
    (function step(t) {
      var k = Math.min(1, (t - t0) / D), e = 1 - Math.pow(1 - k, 3);
      boot.style.setProperty('--iris', (e * 75).toFixed(2) + '%');
      if (k < 1) requestAnimationFrame(step);
      else { boot.classList.add('gone'); afterOpen(); }
    })(t0);
  }
  function afterOpen() {
    if (!P) return;
    showHint();
    bumpHud(7000);          // first look: long enough to find the controls
  }

  function startEngine(mode, o) {
    var stage = P.$('#cim-stage');
    var e = P.e;
    var eng;
    try {
      eng = Eng.create(stage, {
        presence: st.access ? st.access.presence_motion !== false : true,
        onFrame: onFrame, onTime: onTime, onState: onState, onError: onErr,
        onHotspot: function (h) { act(h); }, onTap: onTap,
        onXR: function (on) { if (!P) return; P.root.classList.toggle('is-xr', on); if (on) P.bestMode = 'xr'; else setMode('window'); }
      });
    } catch (err) {
      bootStep(1);
      flatFallback();
      return;
    }
    P.eng = eng;

    // Everything that needs the guest's tap has to happen now, inside it.
    if (mode === 'xr' && DEV.xr) {
      eng.enterXR().catch(function () { toast('The headset did not start. Showing it on screen.'); });
    } else if (DEV.gyro && DEV.phone && !P.needsTap) {
      eng.setGyro(true).then(syncGyro);
    }
    if (mode === 'full') setFull(true);

    setTimeout(function () { bootStep(1); }, 350);
    setTimeout(function () { bootStep(2); }, 800);

    var t0 = Date.now();
    signAll(e).then(function (map) {
      if (!P || P.e !== e) return;
      P.signed = map;
      return showScene(e.start_scene || (e.scenes[0] && e.scenes[0].id), null, true);
    }).then(function () {
      if (!P || P.e !== e) return;
      var wait = Math.max(0, 1500 - (Date.now() - t0));
      if (P.needsTap) {
        var sk = P.$('#cim-boot-skip'); if (sk) { sk.style.color = '#D6FFF6'; sk.textContent = 'Tap to step inside'; }
        return;
      }
      setTimeout(openIris, REDUCED ? 0 : wait);
      if (mode === 'visor') setTimeout(function () { visorPrep(); }, REDUCED ? 0 : wait + 600);
    }).catch(function (err) {
      if (!P || P.e !== e) return;
      if (err && err.code === 'denied') { refreshAccess().then(function () { gate(e, true); }); return; }
      showError(err);
    });
  }

  function sceneById(id) { return (P.e.scenes || []).filter(function (s) { return s.id === id; })[0] || (P.e.scenes || [])[0]; }

  function showScene(id, via, first) {
    var sc = sceneById(id);
    if (!sc || !P.eng) return Promise.resolve();
    var src = {
      url: resolveRef(sc.src, P.signed),
      fallback: resolveRef(sc.src_mobile, P.signed),
      stream: safeHttps(sc.stream) || null,
      audio: resolveRef(sc.audio, P.signed)
    };
    if (!src.url && !src.fallback && !src.stream) {
      var er = new Error('This scene’s footage is not available right now.'); er.code = 'missing';
      return Promise.reject(er);
    }
    P.sceneId = sc.id;
    P.seen[sc.id] = 1;
    clearHots();
    P.eng.setHotspots([]);
    hideInfo();
    var shown = P.eng.show(sc, src, { transition: !first, toward: via ? { yaw: via.yaw, pitch: via.pitch } : null });
    if (!first) showBuf(true, 'Walking there');
    return shown.then(function () {
      if (!P) return;
      showBuf(false);
      P.eng.setHotspots(sc.hotspots || []);
      buildHots(sc);
      paintSceneHud(sc);
      announce((sc.name || P.e.title) + (sc.hotspots && sc.hotspots.length ? ', ' + sc.hotspots.length + ' markers to explore' : ''));
    }, function (err) { showBuf(false); throw err; });
  }

  function paintSceneHud(sc) {
    var scenes = P.e.scenes || [];
    var k = P.$('#cim-tt-k');
    if (k) {
      var where = [P.e.destination, P.e.country].filter(Boolean).join(' · ');
      k.textContent = (scenes.length > 1 ? 'Scene ' + (scenes.indexOf(sc) + 1) + '/' + scenes.length + ' · ' + (sc.name || '') : where || 'Cabana Immersive');
    }
    var isVid = sc.kind === 'video';
    ['#cim-time', '#cim-scrub'].forEach(function (s) { var n = P.$(s); if (n) n.hidden = !isVid; });
    var pb = P.$('[data-k="play"]'); if (pb) pb.hidden = !isVid;
    var still = P.$('#cim-still'); if (still) still.hidden = isVid;
    var mb = P.$('[data-k="mute"]'); if (mb) mb.hidden = !isVid && !sc.audio;
    var sb2 = P.$('[data-k="scenes"]'); if (sb2) sb2.hidden = scenes.length < 2;
    paintTicks(sc);
    paintRadarDots(sc);
    paintCompassDots(sc);
  }

  /* ── HUD: compass, radar, time ── */
  var PX_PER_DEG = 3;
  function buildCompass() {
    var strip = P.$('#cim-strip'); if (!strip) return;
    var h = '';
    for (var d = -540; d <= 540; d += 5) {
      var x = (d + 540) * PX_PER_DEG, n = ((d % 360) + 360) % 360;
      h += '<i class="' + (n % 45 === 0 ? 'm' : '') + '" style="left:' + x + 'px"></i>';
      if (n % 45 === 0) h += '<b class="' + (n === 0 ? 'n' : '') + '" style="left:' + x + 'px">' + CARD[n / 45] + '</b>';
    }
    strip.style.width = (1080 * PX_PER_DEG) + 'px';
    strip.innerHTML = h + '<span id="cim-cdots"></span>';
  }
  function paintCompassDots(sc) {
    var host = P.$('#cim-cdots'); if (!host) return;
    host.innerHTML = (sc.hotspots || []).map(function (hs) {
      var y = wrap180(hs.yaw || 0);
      return [-360, 0, 360].map(function (o) {
        return '<u class="' + (hs.type === 'tour' ? 't' : '') + '" style="left:' + ((y + o + 540) * PX_PER_DEG) + 'px"></u>';
      }).join('');
    }).join('');
  }
  function paintRadarDots(sc) {
    var host = P.$('#cim-rdots'); if (!host) return;
    host.innerHTML = (sc.hotspots || []).map(function (hs) {
      var a = (hs.yaw || 0) * Math.PI / 180, r = 32 * (1 - Math.min(Math.abs(hs.pitch || 0), 80) / 160);
      return '<u class="' + (hs.type === 'tour' ? 't' : '') + '" style="transform:translate(' + (Math.sin(a) * r).toFixed(1) + 'px,' + (-Math.cos(a) * r).toFixed(1) + 'px)"></u>';
    }).join('');
  }
  function paintTicks(sc) {
    var scrub = P.$('#cim-scrub'); if (!scrub) return;
    $$('.cim-rail-tick', scrub).forEach(function (t) { t.remove(); });
    P.tickSc = sc;
  }
  function placeTicks() {
    var scrub = P && P.$('#cim-scrub'); if (!scrub || !P.dur || !P.tickSc || P.ticked === P.tickSc.id) return;
    P.ticked = P.tickSc.id;
    (P.tickSc.hotspots || []).forEach(function (hs) {
      if (hs.t0 == null && hs.type !== 'seek') return;
      var t = hs.type === 'seek' && hs.t0 == null ? Number(hs.target) : Number(hs.t0);
      if (!isFinite(t)) return;
      var d = el('i', 'cim-rail-tick'); d.style.left = clamp(t / P.dur * 100, 0, 100) + '%';
      scrub.appendChild(d);
    });
  }

  function onFrame(v) {
    if (!P || !v) return;
    P.view = v;
    var strip = P.$('#cim-strip');
    if (strip && strip.parentNode.offsetWidth) {
      var w = strip.parentNode.offsetWidth;
      strip.style.transform = 'translate3d(' + (-(wrap180(v.sceneYaw) + 540) * PX_PER_DEG + w / 2).toFixed(1) + 'px,0,0)';
    }
    var cone = P.$('#cim-cone');
    if (cone) { cone.style.setProperty('--h', v.sceneYaw.toFixed(1) + 'deg'); cone.style.setProperty('--f', (v.fov * 0.55).toFixed(1) + 'deg'); }
    positionHots();
    var vid = P.eng && P.eng.video();
    if (vid && P.dur && !P.scrubbing) paintProgress(vid.currentTime, vid);
  }
  function paintProgress(t, vid) {
    var s = P.$('#cim-scrub'); if (!s) return;
    var k = P.dur ? t / P.dur : 0;
    var fill = s.querySelector('.fill'); if (fill) fill.style.width = (k * 100).toFixed(2) + '%';
    var inp = s.querySelector('input'); if (inp && doc.activeElement !== inp) inp.value = Math.round(k * 1000);
    if (vid && vid.buffered && vid.buffered.length) {
      var b = vid.buffered.end(vid.buffered.length - 1);
      var buf = s.querySelector('.buf'); if (buf) buf.style.width = clamp(b / P.dur * 100, 0, 100).toFixed(1) + '%';
    }
    var tm = P.$('#cim-time'); if (tm) tm.textContent = fmtTime(t) + ' / ' + fmtTime(P.dur);
  }
  function onTime(t, d) {
    if (!P) return;
    P.dur = d || P.dur; P.t = t;
    placeTicks();
    if (P.dur && t / P.dur > 0.9) P.completed = true;
  }
  function onState(s) {
    if (!P) return;
    var pb = P.$('[data-k="play"]');
    if (pb) { pb.innerHTML = icon(s.playing ? 'pause' : 'play'); pb.setAttribute('aria-label', s.playing ? 'Pause (Space)' : 'Play (Space)'); }
    var mb = P.$('[data-k="mute"]');
    if (mb) { mb.innerHTML = icon(s.muted ? 'mute' : 'sound'); mb.setAttribute('aria-label', s.muted ? 'Unmute (M)' : 'Mute (M)'); }
    if (s.buffering != null) showBuf(!!s.buffering && s.video, 'Streaming 360°');
    if (s.mutedByBrowser) toast('Tap the speaker for sound');
    if (s.ended) { P.completed = true; endCard(); }
    if (s.duration) P.dur = s.duration;
    if (!s.playing && s.video) showHud(true); else bumpHud();
  }
  function onErr(err) {
    if (!P) return;
    if (err && err.code === 'context_lost') { toast(err.message); return; }
    showError(err);
  }
  function onTap(pick) {
    if (!P) return;
    if (P.mode === 'visor') { var v = P.$('#cim-visor'); v.classList.add('show'); clearTimeout(P.vt); P.vt = setTimeout(function () { v.classList.remove('show'); }, 3000); return; }
    if (P.root.classList.contains('hud-off')) showHud(); else showHud(false);
    hideScenes();
  }

  /* ── hotspots on the screen ── */
  var HOT_IC = { info: 'info', scene: 'walk', tour: 'ticket', seek: 'seek', link: 'link' };
  function clearHots() { var h = P && P.$('#cim-hots'); if (h) h.innerHTML = ''; if (P) P.hotEls = []; }
  function buildHots(sc) {
    var host = P.$('#cim-hots');
    host.innerHTML = '';
    P.hotEls = (sc.hotspots || []).map(function (h) {
      var b = el('button', 'cim-hot');
      b.type = 'button';
      b.setAttribute('data-type', h.type);
      var label = h.label || (h.type === 'scene' ? 'Go' : h.type === 'tour' ? 'Book this tour' : h.type === 'seek' ? 'Jump ahead' : 'More');
      b.setAttribute('aria-label', label);
      b.innerHTML = '<span class="cim-hot-dot">' + icon(HOT_IC[h.type] || 'info') + '</span><span class="cim-hot-l">' + esc(label) + '</span>';
      b.addEventListener('click', function (ev) { ev.stopPropagation(); act(h); });
      host.appendChild(b);
      return { h: h, b: b };
    });
    positionHots();
  }
  function positionHots() {
    if (!P || !P.eng || P.mode !== 'window' && P.mode !== 'full') return;
    var t = P.eng.video() ? P.eng.video().currentTime : null;
    P.hotEls.forEach(function (x) {
      var h = x.h, live = t == null || ((h.t0 == null || t >= h.t0) && (h.t1 == null || t <= h.t1));
      var p = live ? P.eng.project(h.yaw || 0, h.pitch || 0) : { visible: false };
      if (!p.visible) { if (!x.b.hasAttribute('data-off')) x.b.setAttribute('data-off', ''); x.b.tabIndex = -1; return; }
      if (x.b.hasAttribute('data-off')) { x.b.removeAttribute('data-off'); x.b.tabIndex = 0; }
      // Nearer the middle of the view, a little larger: depth without a model.
      var cx = p.x / (P.root.offsetWidth || 1) - 0.5, cy = p.y / (P.root.offsetHeight || 1) - 0.5;
      var s = 1.06 - Math.min(0.26, Math.hypot(cx, cy) * 0.5);
      x.b.style.setProperty('--x', p.x.toFixed(1) + 'px');
      x.b.style.setProperty('--y', p.y.toFixed(1) + 'px');
      x.b.style.setProperty('--s', s.toFixed(3));
    });
  }

  function act(h) {
    if (!P || !h) return;
    bumpHud();
    if (h.type === 'scene') { goScene(h.target, h); return; }
    if (h.type === 'seek') { if (P.eng) { P.eng.seek(Number(h.target) || 0); P.eng.play(); } toast('Jumped to ' + fmtTime(h.target)); return; }
    if (h.type === 'tour') { book(); return; }
    if (h.type === 'link') {
      var u = safeHttps(h.target);
      if (!u) return;
      if (P.mode === 'visor' || P.root.classList.contains('is-xr')) { panel(h, 'Opens when you leave the viewer.'); return; }
      global.open(u, '_blank', 'noopener');
      return;
    }
    // info
    if (P.mode === 'visor' || P.root.classList.contains('is-xr')) { panel(h); return; }
    showInfo(h);
  }
  function goScene(id, via) {
    if (!P || !id || id === P.sceneId) return;
    hideScenes();
    showScene(id, via, false).catch(showError);
  }
  function showInfo(h) {
    var box = P.$('#cim-info'); if (!box) return;
    box.innerHTML = '<button class="cim-ib" type="button" aria-label="Close">' + icon('x') + '</button>' +
      '<div class="cim-info-k">' + esc(P.e.illustrated ? 'Field note' : (P.e.destination || 'Field note')) + '</div>' +
      '<div class="cim-info-t">' + esc(h.label || 'About this') + '</div>' +
      (h.text ? '<div class="cim-info-p">' + esc(h.text) + '</div>' : '');
    box.classList.add('on');
    box.querySelector('.cim-ib').addEventListener('click', hideInfo);
    clearTimeout(P.infoTimer);
    P.infoTimer = setTimeout(hideInfo, Math.max(9000, (h.text || '').length * 70));
    announce((h.label || '') + '. ' + (h.text || ''));
  }
  function hideInfo() { var b = P && P.$('#cim-info'); if (b) b.classList.remove('on'); }

  // A text panel drawn into the world, for the viewer and the headset.
  function panel(h, extra) {
    if (!P || !P.eng) return;
    var W = 900, pad = 54, cv = doc.createElement('canvas'), g = cv.getContext('2d');
    g.font = '400 34px Inter, system-ui, sans-serif';
    var words = String((extra || h.text || '')).split(/\s+/), lines = [], line = '';
    words.forEach(function (w) { var t = line ? line + ' ' + w : w; if (g.measureText(t).width > W - pad * 2) { lines.push(line); line = w; } else line = t; });
    if (line) lines.push(line);
    lines = lines.slice(0, 9);
    var H = pad * 2 + 64 + lines.length * 48 + 40;
    cv.width = W; cv.height = H;
    g.fillStyle = 'rgba(8,12,24,.9)';
    roundRect(g, 0, 0, W, H, 40); g.fill();
    g.strokeStyle = 'rgba(94,234,212,.7)'; g.lineWidth = 3; roundRect(g, 1.5, 1.5, W - 3, H - 3, 38); g.stroke();
    g.fillStyle = '#fff'; g.font = '700 46px Geist, Inter, sans-serif';
    g.fillText(h.label || 'About this', pad, pad + 40);
    g.fillStyle = 'rgba(226,233,250,.85)'; g.font = '400 34px Inter, system-ui, sans-serif';
    lines.forEach(function (l, i) { g.fillText(l, pad, pad + 104 + i * 48); });
    g.fillStyle = 'rgba(94,234,212,.8)'; g.font = '500 24px "Geist Mono", monospace';
    g.fillText('LOOK AWAY TO CLOSE', pad, H - pad + 10);
    P.eng.showPanel(cv, { yaw: h.yaw || 0, pitch: (h.pitch || 0) + 10, w: 0.44 });
    clearTimeout(P.panelTimer);
    P.panelTimer = setTimeout(function () { if (P && P.eng) P.eng.hidePanel(); }, 9000);
  }
  function roundRect(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }

  /* ── scenes sheet ── */
  function toggleScenes() {
    var box = P.$('#cim-scenes'); if (!box) return;
    if (box.classList.contains('on')) { hideScenes(); return; }
    var scenes = P.e.scenes || [];
    box.innerHTML = '<div class="cim-scenes-h">Scenes in this world</div><div class="cim-scenes-l">' + scenes.map(function (s, i) {
      var poster = P.e.illustrated ? '' : (typeof s.poster === 'string' && /^https:/.test(s.poster) ? s.poster : (i === 0 ? P.e.poster_url : ''));
      return '<button class="cim-sc" type="button" data-sc="' + esc(s.id) + '" aria-current="' + (s.id === P.sceneId) + '">' +
        (poster ? '<img alt="" loading="lazy" src="' + esc(poster) + '"/>' : '') +
        '<i class="cim-sc-n">' + (i + 1) + '</i><span>' + esc(s.name || 'Scene ' + (i + 1)) + '</span></button>';
    }).join('') + '</div>';
    box.classList.add('on');
    $$('[data-sc]', box).forEach(function (b) { b.addEventListener('click', function () { goScene(b.getAttribute('data-sc')); }); });
  }
  function hideScenes() { var b = P && P.$('#cim-scenes'); if (b) b.classList.remove('on'); }

  /* ── HUD visibility ── */
  function showHud(on) {
    if (!P) return;
    if (on === false) { P.root.classList.add('hud-off'); return; }
    P.root.classList.remove('hud-off');
    bumpHud();
  }
  function bumpHud(ms) {
    if (!P) return;
    P.root.classList.remove('hud-off');
    clearTimeout(P.hudTimer);
    P.hudTimer = setTimeout(function () {
      if (!P || P.root.querySelector('.cim-modal.on, .cim-scenes.on') || (P.root.contains(doc.activeElement) && doc.activeElement.closest('.cim-dock'))) return;
      var s = P.eng ? P.eng.state() : null;
      if (s && s.video && !s.playing) return;
      P.root.classList.add('hud-off');
    }, typeof ms === 'number' ? ms : 3600);
  }
  function showBuf(on, label) {
    var b = P && P.$('#cim-buf'); if (!b) return;
    b.hidden = !on;
    if (label) { var l = b.querySelector('.cim-spin-l'); if (l) l.textContent = label; }
  }
  function toast(msg) {
    var t = P && P.$('#cim-toast'); if (!t) return;
    t.textContent = msg; t.classList.add('on');
    clearTimeout(t._t); t._t = setTimeout(function () { t.classList.remove('on'); }, 2600);
  }
  function announce(msg) { var l = P && P.$('#cim-live'); if (l) l.textContent = msg; }

  function showHint() {
    if (!P || P.mode === 'visor' || REDUCED) return;
    var gyro = P.eng && P.eng.state().gyro;
    var seen = store(LS.hint) || '';
    var key = gyro ? 'g' : 'd';
    if (seen.indexOf(key) > -1) return;
    store(LS.hint, seen + key);
    var h = P.$('#cim-hint'); if (!h) return;
    h.innerHTML = gyro
      ? icon('phone', 'phone') + '<b>Move your phone to look around</b><span>Turn around. It’s all there.</span>'
      : icon('hand', 'hand') + '<b>Drag to look around</b><span>Scroll or pinch to zoom</span>';
    h.classList.add('on');
    setTimeout(function () { h.classList.remove('on'); }, 3400);
  }

  /* ── modes: window, fullscreen, visor, headset ── */
  function fsEl() { return doc.fullscreenElement || doc.webkitFullscreenElement || null; }
  function setFull(on) {
    if (!P) return;
    var btn = P.$('[data-k="full"]');
    if (on) {
      var f = P.root.requestFullscreen || P.root.webkitRequestFullscreen;
      P.root.classList.add('is-full'); P.root.classList.remove('is-window');
      P.mode = 'full'; if (P.bestMode === 'window') P.bestMode = 'fullscreen';
      if (f && DEV.fs) { try { var r = f.call(P.root, { navigationUI: 'hide' }); if (r && r.catch) r.catch(noop); } catch (x) {} }
      else if (DEV.iphone && !store(LS.fsTip)) { store(LS.fsTip, '1'); toast('For edge-to-edge, add Cabana to your Home Screen'); }
    } else {
      P.root.classList.remove('is-full'); P.root.classList.add('is-window');
      P.mode = 'window';
      var x = doc.exitFullscreen || doc.webkitExitFullscreen;
      if (fsEl() && x) { try { var r2 = x.call(doc); if (r2 && r2.catch) r2.catch(noop); } catch (y) {} }
    }
    if (btn) { btn.setAttribute('aria-pressed', String(!!on)); btn.innerHTML = icon(on ? 'shrink' : 'expand'); btn.setAttribute('aria-label', on ? 'Leave fullscreen (F)' : 'Fullscreen (F)'); }
    setTimeout(positionHots, 60);
  }
  function onFsChange() {
    if (!P) return;
    if (!fsEl() && P.mode === 'full') setFull(false);
    if (!fsEl() && P.mode === 'visor') exitVisor();
  }
  doc.addEventListener('fullscreenchange', onFsChange);
  doc.addEventListener('webkitfullscreenchange', onFsChange);

  function setMode(m) {
    if (!P) return;
    if (m === 'full') setFull(true);
    else if (m === 'window') { if (P.mode === 'visor') exitVisor(); else setFull(false); }
  }

  function visorPrep() {
    if (!P || !P.eng) return;
    var prep = P.$('#cim-prep');
    function paint() {
      var portrait = global.innerHeight > global.innerWidth;
      prep.innerHTML = '<div class="cim-prep-in">' +
        (portrait
          ? '<svg class="art" viewBox="0 0 180 120" aria-hidden="true"><g class="rot"><rect x="68" y="18" width="44" height="84" rx="8" fill="none" stroke="#5EEAD4" stroke-width="2.5"/><line x1="84" y1="94" x2="96" y2="94" stroke="#5EEAD4" stroke-width="2.5" stroke-linecap="round"/></g></svg>' +
            '<h3>Turn your phone sideways</h3><p>VR viewer mode splits the screen into two lenses. It needs the phone in landscape.</p>'
          : '<svg class="art" viewBox="0 0 180 120" aria-hidden="true"><path d="M20 40h140v48a10 10 0 0 1-10 10h-36l-10-14a4 4 0 0 0-8 0l-10 14H30a10 10 0 0 1-10-10z" fill="none" stroke="#7C5CFF" stroke-width="2.5"/><g class="ph"><rect x="30" y="30" width="120" height="16" rx="4" fill="#0B1020" stroke="#5EEAD4" stroke-width="2.5"/></g></svg>' +
            '<h3>Slot your phone into the viewer</h3><p>Screen facing the lenses, centred on the divider. Look at a marker to press it. Tap the screen any time to leave.</p>') +
        '<button class="cim-btn cim-btn-primary" type="button" data-k="visor-go"' + (portrait ? ' disabled style="opacity:.5"' : '') + '>' + icon('visor') + 'I’m ready</button>' +
        '<button class="cim-btn cim-btn-ghost" type="button" data-k="visor-cancel">Not now</button>' +
      '</div>';
      var go = prep.querySelector('[data-k="visor-go"]');
      if (go) go.addEventListener('click', startVisor);
      prep.querySelector('[data-k="visor-cancel"]').addEventListener('click', function () { prep.hidden = true; global.removeEventListener('resize', paint); });
    }
    prep.hidden = false;
    paint();
    global.addEventListener('resize', paint);
    P.prepPaint = paint;
  }
  function startVisor() {
    if (!P || !P.eng) return;
    var prep = P.$('#cim-prep');
    var f = P.root.requestFullscreen || P.root.webkitRequestFullscreen;
    var fsP = (f && DEV.fs) ? Promise.resolve(f.call(P.root, { navigationUI: 'hide' })).catch(noop) : Promise.resolve();
    var gyroP = P.eng.setGyro(true);
    Promise.all([fsP, gyroP]).then(function (r) {
      if (!P) return;
      if (!r[1]) { toast('Motion sensors are off, so the viewer cannot follow your head.'); syncGyro(false); return; }
      try { if (screen.orientation && screen.orientation.lock) screen.orientation.lock('landscape').catch(noop); } catch (x) {}
      prep.hidden = true;
      if (P.prepPaint) global.removeEventListener('resize', P.prepPaint);
      P.mode = 'visor'; P.bestMode = 'visor';
      P.root.classList.add('is-visor'); P.root.classList.remove('is-window', 'is-full');
      P.eng.setMode('visor');
      hideInfo(); hideScenes();
      syncGyro(true);
    });
  }
  function exitVisor() {
    if (!P || P.mode !== 'visor') return;
    P.eng.setMode('screen');
    P.eng.hidePanel();
    P.root.classList.remove('is-visor');
    P.mode = 'window'; P.root.classList.add('is-window');
    try { if (screen.orientation && screen.orientation.unlock) screen.orientation.unlock(); } catch (x) {}
    var x2 = doc.exitFullscreen || doc.webkitExitFullscreen;
    if (fsEl() && x2) { try { var r = x2.call(doc); if (r && r.catch) r.catch(noop); } catch (y) {} }
    positionHots(); bumpHud();
  }
  function syncGyro(on) {
    if (!P) return;
    var b = P.$('[data-k="gyro"]');
    if (b) b.setAttribute('aria-pressed', String(!!on));
  }

  /* ── booking the real tour ── */
  function book() {
    if (!P) return;
    var id = P.e.tour_id;
    if (id == null) return;
    close();
    setTimeout(function () {
      if (global.CabanaTours && CabanaTours.open) CabanaTours.open(id);
      else location.href = '/tours?open=' + encodeURIComponent(id);
    }, 380);
  }
  function share() {
    var url = location.origin + '/tours?vr=' + encodeURIComponent(P.e.slug);
    var data = { title: P.e.title + ' · Cabana Immersive', text: P.e.tagline || 'Step inside, in 360°.', url: url };
    if (navigator.share) { navigator.share(data).catch(noop); return; }
    if (navigator.clipboard) navigator.clipboard.writeText(url).then(function () { toast('Link copied'); }, function () { toast(url); });
    else toast(url);
  }

  /* ── modal shapes: gate, error, end ── */
  function modal(html, wire) {
    var m = P.$('#cim-modal'), inn = P.$('#cim-modal-in');
    inn.innerHTML = html;
    m.classList.add('on');
    var boot = P.$('#cim-boot'); if (boot && !P.irisOpen) boot.classList.add('gone');
    P.$('#cim-stage').classList.remove('blur');
    if (wire) wire(inn);
    var f = inn.querySelector('input, .cim-btn'); if (f) setTimeout(function () { try { f.focus(); } catch (x) {} }, 80);
  }
  function hideModal() { var m = P && P.$('#cim-modal'); if (m) m.classList.remove('on'); }

  function gate(e, lapsed) {
    var a = st.access || {};
    var price = a.pass_price_kes ? '<div class="cim-price">' + esc(money(a.pass_price_kes)) + ' <span>/ ' + esc(a.pass_days || 30) + ' days</span></div>' : '';
    var freeOnes = st.list.filter(function (x) { return x.access === 'free'; });
    var who = a.signed_in;
    var body = '<div class="cim-modal-ic gold">' + icon('lock') + '</div>' +
      '<h3>' + (lapsed ? 'The free trial has ended' : 'This world needs an <em>Immersive Pass</em>') + '</h3>' +
      '<p>' + esc(e.title) + ' is part of Cabana Immersive. A pass opens every world in 360° and VR, on every device you own.</p>' +
      price +
      '<ul>' +
        '<li>' + icon('check') + '<span>Every safari, reef and city we film, as it lands</span></li>' +
        '<li>' + icon('check') + '<span>Phone, desktop, VR viewer and headset</span></li>' +
        '<li>' + icon('check') + '<span>Step inside a tour before you book it</span></li>' +
      '</ul>';
    if (a.request_open) {
      body += '<p class="cim-fine">Your pass request is in. The team will reach you shortly.</p>' +
        '<div class="cim-modal-acts">' + (freeOnes.length ? '<button class="cim-btn cim-btn-primary" type="button" data-k="free">Try a free world</button>' : '') +
        '<button class="cim-btn cim-btn-ghost" type="button" data-k="close">Close</button></div>';
    } else if (!who) {
      body += '<div class="cim-modal-acts"><a class="cim-btn cim-btn-primary" href="/auth?next=' + encodeURIComponent('/tours?vr=' + e.slug) + '">Sign in to get a pass</a>' +
        (freeOnes.length ? '<button class="cim-btn cim-btn-ghost" type="button" data-k="free">Try a free world</button>' : '') +
        '<button class="cim-btn cim-btn-ghost" type="button" data-k="close">Not now</button></div>';
    } else {
      body += '<div class="cim-field"><label for="cim-ph">Phone or WhatsApp</label><input id="cim-ph" type="tel" inputmode="tel" autocomplete="tel" placeholder="+254 7xx xxx xxx"/></div>' +
        '<div class="cim-modal-acts"><button class="cim-btn cim-btn-primary" type="button" data-k="req">Get the pass</button>' +
        (freeOnes.length ? '<button class="cim-btn cim-btn-ghost" type="button" data-k="free">Try a free world</button>' : '') +
        '<button class="cim-btn cim-btn-ghost" type="button" data-k="close">Not now</button></div>' +
        '<p class="cim-fine">The team confirms your pass and payment with you directly. Nothing is charged here.</p>';
    }
    modal(body, function (inn) {
      var r = inn.querySelector('[data-k="req"]');
      if (r) r.addEventListener('click', function () {
        var ph = inn.querySelector('#cim-ph');
        r.disabled = true; r.textContent = 'Sending…';
        sb().rpc('immersive_request_pass', { p_phone: ph ? ph.value : null, p_message: null, p_experience: e.id }).then(function (res) {
          if (res.error) throw res.error;
          st.access.request_open = true;
          modal('<div class="cim-modal-ic">' + icon('check') + '</div><h3>Request received</h3><p>We’ll be in touch to set up your pass. Meanwhile, the free worlds are all yours.</p>' +
            '<div class="cim-modal-acts">' + (freeOnes.length ? '<button class="cim-btn cim-btn-primary" type="button" data-k="free">Try a free world</button>' : '') +
            '<button class="cim-btn cim-btn-ghost" type="button" data-k="close">Close</button></div>', wireCommon);
        }).catch(function () { r.disabled = false; r.textContent = 'Try again'; toast('That did not send. Check the connection.'); });
      });
      wireCommon(inn);
    });
    function wireCommon(inn) {
      $$('[data-k="close"]', inn).forEach(function (b) { b.addEventListener('click', function () { close(); }); });
      $$('[data-k="free"]', inn).forEach(function (b) { b.addEventListener('click', function () { var f = freeOnes[0]; close(true); setTimeout(function () { open(f); }, 60); }); });
    }
  }

  function showError(err) {
    if (!P) return;
    showBuf(false);
    var msg = (err && err.message) || 'Something went wrong loading this world.';
    modal('<div class="cim-modal-ic bad">' + icon('info') + '</div><h3>We couldn’t open this world</h3><p>' + esc(msg) + '</p>' +
      '<div class="cim-modal-acts"><button class="cim-btn cim-btn-primary" type="button" data-k="retry">' + icon('replay') + 'Try again</button>' +
      '<button class="cim-btn cim-btn-ghost" type="button" data-k="close">Close</button></div>', function (inn) {
        inn.querySelector('[data-k="retry"]').addEventListener('click', function () { var e = P.e, m = P.wantMode; close(true); setTimeout(function () { open(e, { mode: m }); }, 60); });
        inn.querySelector('[data-k="close"]').addEventListener('click', function () { close(); });
      });
  }

  function endCard() {
    if (!P || P.root.querySelector('.cim-modal.on')) return;
    var idx = st.list.indexOf(P.e), next = st.list[idx + 1] || (idx > 0 ? st.list[0] : null);
    if (next === P.e) next = null;
    modal('<div class="cim-modal-ic">' + icon('vr') + '</div><h3>That was <em>' + esc(P.e.title) + '</em></h3>' +
      '<p>' + (P.tour ? 'Now go and stand in it for real.' : 'Thanks for stepping inside.') + '</p>' +
      '<div class="cim-modal-acts">' +
        (P.tour ? '<button class="cim-btn cim-btn-primary" type="button" data-k="book">' + icon('ticket') + 'Book ' + esc(P.tour.title) + '</button>' : '') +
        '<button class="cim-btn cim-btn-ghost" type="button" data-k="again">' + icon('replay') + 'Watch again</button>' +
        (next ? '<button class="cim-btn cim-btn-ghost" type="button" data-k="next">Next: ' + esc(next.title) + icon('arrowR') + '</button>' : '') +
        '<button class="cim-btn cim-btn-ghost" type="button" data-k="close">Take off the headset</button>' +
      '</div>', function (inn) {
        var b = inn.querySelector('[data-k="book"]'); if (b) b.addEventListener('click', book);
        inn.querySelector('[data-k="again"]').addEventListener('click', function () { hideModal(); if (P.eng) { P.eng.seek(0); P.eng.play(); } });
        var n = inn.querySelector('[data-k="next"]'); if (n) n.addEventListener('click', function () { close(true); setTimeout(function () { open(next); }, 60); });
        inn.querySelector('[data-k="close"]').addEventListener('click', function () { close(); });
      });
  }

  /* ── no 3D on this device: still show something ── */
  function flatFallback() {
    var e = P.e, stage = P.$('#cim-stage');
    stage.classList.remove('blur');
    signAll(e).then(function (map) {
      if (!P) return;
      P.signed = map;
      var sc = sceneById(e.start_scene);
      var url = resolveRef(sc.src_mobile, map) || resolveRef(sc.src, map);
      var wrap = el('div', sc.kind === 'video' ? 'cim-flat' : 'cim-pano');
      if (sc.kind === 'video' && typeof url === 'string') {
        wrap.innerHTML = '<video controls playsinline autoplay src="' + esc(url) + '"></video>';
      } else {
        var bg = typeof url === 'string' ? url : (url && url.toDataURL ? url.toDataURL('image/jpeg', 0.85) : '');
        wrap.innerHTML = '<div style="background-image:url(\'' + esc(bg) + '\')"></div>';
        var strip = wrap.firstChild, x = 0, down = null;
        wrap.addEventListener('pointerdown', function (ev) { down = ev.clientX; });
        global.addEventListener('pointerup', function () { down = null; });
        wrap.addEventListener('pointermove', function (ev) { if (down == null) return; x += ev.clientX - down; down = ev.clientX; strip.style.backgroundPosition = x + 'px 0'; });
      }
      stage.appendChild(wrap);
      var boot = P.$('#cim-boot'); if (boot) boot.classList.add('gone');
      toast(Eng.WHY.no_webgl);
    }).catch(function (err) { if (err && err.code === 'denied') gate(e, true); else showError(err); });
  }

  /* ── wiring ── */
  function wirePlayer() {
    var r = P.root;
    r.addEventListener('click', function (ev) {
      var b = ev.target.closest('[data-k]'); if (!b || !P) return;
      var k = b.getAttribute('data-k');
      bumpHud();
      if (k === 'close') close();
      else if (k === 'play') P.eng && P.eng.toggle();
      else if (k === 'mute') { if (P.eng) P.eng.setMuted(!P.eng.state().muted); }
      else if (k === 'full') setFull(P.mode !== 'full');
      else if (k === 'visor') visorPrep();
      else if (k === 'visor-exit') exitVisor();
      else if (k === 'xr') { if (P.eng) P.eng.enterXR().catch(function () { toast('The headset did not start.'); }); }
      else if (k === 'xr-exit') { if (P.eng) P.eng.exitXR(); }
      else if (k === 'gyro') { if (!P.eng) return; var on = !P.eng.state().gyro; P.eng.setGyro(on).then(function (ok) { syncGyro(ok); if (on && !ok) toast('Motion sensors are unavailable. Drag to look around.'); }); }
      else if (k === 'recenter') { if (P.eng) P.eng.recenter(); }
      else if (k === 'scenes') toggleScenes();
      else if (k === 'share') share();
      else if (k === 'book') book();
    });
    var boot = P.$('#cim-boot');
    boot.addEventListener('click', function () {
      if (!P) return;
      if (P.needsTap) {
        P.needsTap = false;
        // This tap is the gesture the browser wanted: sound and motion now.
        if (P.eng) {
          if (DEV.gyro && DEV.phone) P.eng.setGyro(true).then(syncGyro);
          P.eng.play();
          if (P.wantMode === 'xr' && DEV.xr) P.eng.enterXR().catch(noop);
          if (P.wantMode === 'full') setFull(true);
        }
        if (P.eng && P.eng.state().ready) { openIris(); if (P.wantMode === 'visor') setTimeout(visorPrep, 600); }
        return;
      }
      if (P.eng && P.eng.state().ready) openIris();
    });
    var inp = P.$('#cim-scrub input');
    if (inp) {
      inp.addEventListener('input', function () {
        P.scrubbing = true;
        var t = inp.value / 1000 * (P.dur || 0);
        var fill = P.$('#cim-scrub .fill'); if (fill) fill.style.width = (inp.value / 10) + '%';
        var tm = P.$('#cim-time'); if (tm) tm.textContent = fmtTime(t) + ' / ' + fmtTime(P.dur);
      });
      inp.addEventListener('change', function () { if (P.eng) P.eng.seek(inp.value / 1000 * (P.dur || 0)); P.scrubbing = false; });
    }
    r.addEventListener('pointermove', function (ev) { if (ev.pointerType === 'mouse') bumpHud(); });
    doc.addEventListener('keydown', onKey, true);
    P.tick = setInterval(function () {
      if (!P) return;
      var s = P.eng ? P.eng.state() : null, now = Date.now();
      if (!doc.hidden && P.irisOpen && (!s || !s.video || s.playing)) P.active += now - P.lastTick;
      P.lastTick = now;
    }, 1000);
  }

  function onKey(ev) {
    if (!P) return;
    var t = ev.target;
    if (t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) && t.type !== 'range') { if (ev.key === 'Escape') { t.blur(); ev.preventDefault(); } return; }
    var k = ev.key;
    if (k === 'Escape') {
      ev.preventDefault(); ev.stopPropagation();
      if (P.$('#cim-scenes.on')) { hideScenes(); return; }
      if (P.$('#cim-info.on')) { hideInfo(); return; }
      if (P.mode === 'visor') { exitVisor(); return; }
      if (fsEl()) { setFull(false); return; }
      close(); return;
    }
    if (!P.eng) return;
    var handled = true;
    if (k === ' ' || k === 'k' || k === 'K') { if (t && t.closest && t.closest('button')) return; P.eng.toggle(); }
    else if (k === 'ArrowLeft') P.eng.nudge(-6, 0);
    else if (k === 'ArrowRight') P.eng.nudge(6, 0);
    else if (k === 'ArrowUp') P.eng.nudge(0, 5);
    else if (k === 'ArrowDown') P.eng.nudge(0, -5);
    else if (k === '+' || k === '=') P.eng.zoom(-6);
    else if (k === '-' || k === '_') P.eng.zoom(6);
    else if (k === 'm' || k === 'M') P.eng.setMuted(!P.eng.state().muted);
    else if (k === 'f' || k === 'F') setFull(P.mode !== 'full');
    else if ((k === 'v' || k === 'V') && modeOk('visor')) visorPrep();
    else if (k === 's' || k === 'S') { if ((P.e.scenes || []).length > 1) toggleScenes(); }
    else if (k === 'h' || k === 'H') showHud(P.root.classList.contains('hud-off'));
    else handled = false;
    if (handled) { ev.preventDefault(); bumpHud(); }
  }

  function logPlay(beacon) {
    if (!P || P.logged || P.e.illustrated || !P.e.id) return;
    var secs = Math.round(P.active / 1000);
    if (secs < 2) return;
    P.logged = true;
    var args = { p_experience: P.e.id, p_seconds: secs, p_mode: P.bestMode, p_device: deviceName(), p_completed: !!P.completed, p_scenes: Object.keys(P.seen).length || 1 };
    if (beacon) {
      // The page is going away: a fetch that survives the unload.
      var token = null;
      try { var s = global.ApaSession && ApaSession.get && ApaSession.get(); token = s && s.session && s.session.access_token; } catch (x) {}
      try {
        fetch(SB_URL + '/rest/v1/rpc/immersive_log_play', {
          method: 'POST', keepalive: true,
          headers: { 'Content-Type': 'application/json', apikey: SB_KEY, Authorization: 'Bearer ' + (token || SB_KEY) },
          body: JSON.stringify(args)
        }).catch(noop);
      } catch (x) {}
      return;
    }
    var c = sb(); if (c) c.rpc('immersive_log_play', args).then(noop, noop);
  }

  function close(silent) {
    if (!P || P.closing) return;
    var cur = P;
    cur.closing = true;
    logPlay(false);
    clearInterval(cur.tick);
    clearTimeout(cur.hudTimer); clearTimeout(cur.infoTimer); clearTimeout(cur.panelTimer);
    doc.removeEventListener('keydown', onKey, true);
    if (cur.prepPaint) global.removeEventListener('resize', cur.prepPaint);
    if (cur.eng && cur.eng.inXR()) try { cur.eng.exitXR(); } catch (x) {}
    try { if (screen.orientation && screen.orientation.unlock) screen.orientation.unlock(); } catch (x) {}
    var x2 = doc.exitFullscreen || doc.webkitExitFullscreen;
    if (fsEl() && x2) { try { var r = x2.call(doc); if (r && r.catch) r.catch(noop); } catch (y) {} }
    var finish = function () {
      if (cur.eng) cur.eng.destroy();
      cur.root.remove();
      doc.body.classList.remove('cim-lock');
      release('immersive');
    };
    P = null;
    if (cur.pushed && history.state && history.state.cim) {
      try {
        if (cur.landed) {
          // Arrived on a shared link: there is no page of ours to go back
          // to, so drop the parameter instead of leaving the site.
          var u = new URL(location.href); u.searchParams.delete('vr');
          history.replaceState(null, '', u.toString());
        } else history.back();
      } catch (x) {}
    }
    if (silent || REDUCED || !cur.eng) { finish(); }
    else {
      // Headset off: the world narrows to a point, then the page is back.
      var boot = cur.root.querySelector('#cim-boot');
      if (boot) { boot.classList.remove('gone', 'opening'); boot.querySelector('.cim-boot-in').style.opacity = '0'; boot.style.setProperty('--iris', '75%'); }
      var t0 = performance.now();
      (function step(t) {
        var k = Math.min(1, (t - t0) / 420);
        if (boot) boot.style.setProperty('--iris', (75 * (1 - k * k)).toFixed(2) + '%');
        if (k < 1) requestAnimationFrame(step);
        else { cur.root.classList.remove('on'); setTimeout(finish, 320); }
      })(t0);
    }
    if (cur.from && cur.from.focus && doc.contains(cur.from)) { try { cur.from.focus({ preventScroll: true }); } catch (x) {} }
  }

  global.addEventListener('popstate', function (ev) {
    var s = ev.state;
    if (P && !(s && s.cim === P.e.slug)) { P.pushed = false; close(); return; }
    if (!P && s && s.cim) { var e = bySlug(s.cim); if (e) open(e, { fromHistory: true, needsTap: true }); }
  });
  global.addEventListener('pagehide', function () { logPlay(true); });

  /* ── 10 · DEEP LINKS ─────────────────────────────────────────────── */
  var linked = false;
  function deepLink() {
    if (linked) return;
    linked = true;
    var slug = null;
    try { slug = new URLSearchParams(location.search).get('vr'); } catch (e) {}
    if (!slug) return;
    var e = bySlug(slug);
    if (!e) return;
    // Arriving from a shared link is not a tap on this page, so the
    // browser will not allow sound or motion yet. The boot screen asks.
    try { history.replaceState({ cim: slug }, '', location.href); } catch (x) {}
    open(e, { fromHistory: true, needsTap: true });
    if (P) { P.pushed = true; P.landed = true; }
  }

  /* ── 11 · START ──────────────────────────────────────────────────── */
  function start() {
    wireSection();
    renderAll();
    Eng.xrSupported().then(function (ok) { DEV.xr = ok; if (ok && store(LS.mode) == null) st.mode = 'xr'; renderModes(); });
    load();
  }
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', start);
  else start();

  global.CabanaImmersive = {
    open: function (slugOrExp, o) { var e = typeof slugOrExp === 'string' ? bySlug(slugOrExp) : slugOrExp; if (e) open(e, o); },
    close: function () { close(); },
    list: function () { return st.list.slice(); },
    forTour: function (id) { return st.byTour[id] || null; },
    reload: load
  };
})(window);
