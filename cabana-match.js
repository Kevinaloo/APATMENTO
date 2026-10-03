/* ═══════════════════════════════════════════════════════════════════
   CABANA MATCH · client  v2
   ───────────────────────────────────────────────────────────────────
   One module for both sides of a match.

   Guest
     compose(criteria)   what goes out, and how many hosts will hear it
     openLive(id)        the radar: who has seen it, the offers landing
     restore()           picks a live request back up on any page

   Host
     showRequest(id)     full-screen takeover: a guest is waiting
     mountInbox(el)      the Match inbox on partner-cabana.html

   Plumbing
     onNotification(n)   fed by the realtime notification feed
     onPush(payload)     fed by the service worker when a tab is open
     configure(hooks)    page-specific behaviour (stays page, dashboard)

   Every decision that matters is made by the database (see migration
   20260928120000_cabana_match_v2.sql): who is eligible, who is alerted,
   what an offer costs, when a request closes. This file only renders
   state it is handed and calls the RPCs that change it, so two tabs,
   two devices and the notification tray can never disagree.
   ═══════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';
  if (global.CabanaMatch) return;

  var VERSION = '2.1.0';
  var CSS_HREF = '/cabana-match.css?v=3';
  var D = global.document;
  var LIVE_MS = 20 * 60 * 1000;

  /* ── tiny helpers ────────────────────────────────────────────────── */
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function num(v) { var n = Number(v); return v === null || v === '' || !isFinite(n) ? null : n; }
  function money(v) { var n = num(v); return n == null ? '' : 'KES ' + Math.round(n).toLocaleString('en-KE'); }
  /* What a guest reads. KES stays exact; any other currency is shown
     converted and marked ≈ by cabana-fx.js. Hosts always see KES. */
  function fxOn() { return !!(global.CabanaFX && global.CabanaFX.code() !== 'KES'); }
  function gmoney(v) { var n = num(v); if (n == null) return ''; return fxOn() ? global.CabanaFX.format(n) : money(n); }
  function bandLabel(b) {
    if (!b.min && !b.max) return 'Any';
    if (!global.CabanaFX) return b.label;
    var F = global.CabanaFX, c = function (v) { return F.format(v, { compact: true, approx: false }); },
        bare = function (v) { return F.format(v, { compact: true, approx: false, bare: true }); };
    if (b.min && b.max) return c(b.min) + '–' + bare(b.max);
    return b.max ? 'Up to ' + c(b.max) : c(b.min) + '+';
  }
  function plain(v) { var n = num(v); return n == null ? '' : Math.round(n).toLocaleString('en-KE'); }
  function plural(n, one, many) { return n + ' ' + (n === 1 ? one : (many || one + 's')); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function $(sel, root) { return (root || D).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || D).querySelectorAll(sel)); }
  function ls(k, v) {
    try {
      if (arguments.length === 1) { var r = localStorage.getItem(k); return r == null ? null : JSON.parse(r); }
      if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v));
    } catch (e) { return null; }
  }
  function ss(k, v) {
    try {
      if (arguments.length === 1) { var r = sessionStorage.getItem(k); return r == null ? null : JSON.parse(r); }
      if (v === null) sessionStorage.removeItem(k); else sessionStorage.setItem(k, JSON.stringify(v));
    } catch (e) { return null; }
  }
  function uuid(s) { return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(s || '')); }
  function hash(s) { var h = 2166136261; s = String(s || ''); for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function reduced() { try { return global.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } }

  /* ── dates, always as the calendar day the guest picked ──────────── */
  var DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function day(s) { if (!s) return null; var d = new Date(String(s).slice(0, 10) + 'T12:00:00'); return isNaN(d) ? null : d; }
  function nightsOf(a, b) { var x = day(a), y = day(b); return x && y ? Math.max(0, Math.round((y - x) / 864e5)) : 0; }
  function rangeShort(a, b) {
    var x = day(a), y = day(b);
    if (!x || !y) return '';
    if (x.getMonth() === y.getMonth()) return x.getDate() + '–' + y.getDate() + ' ' + MON[y.getMonth()];
    return x.getDate() + ' ' + MON[x.getMonth()] + ' – ' + y.getDate() + ' ' + MON[y.getMonth()];
  }
  function dayLong(s) { var d = day(s); return d ? DOW[d.getDay()] + ' ' + d.getDate() + ' ' + MON[d.getMonth()] : ''; }
  function clock(ms) {
    var s = Math.max(0, Math.ceil(ms / 1000)), m = Math.floor(s / 60);
    return m + ':' + String(s % 60).padStart(2, '0');
  }
  function placeOf(r) {
    var t = String((r && (r.label || r.location)) || '').split(',')[0].trim();
    return t || 'your area';
  }
  function ago(ts) {
    var d = (Date.now() - new Date(ts).getTime()) / 1000;
    if (!isFinite(d)) return '';
    if (d < 60) return 'just now';
    if (d < 3600) return Math.floor(d / 60) + ' min ago';
    if (d < 86400) return Math.floor(d / 3600) + ' h ago';
    var x = new Date(ts);
    return x.getDate() + ' ' + MON[x.getMonth()];
  }
  function dur(sec) {
    sec = num(sec);
    if (sec == null) return '—';
    if (sec < 60) return Math.round(sec) + 's';
    var m = Math.floor(sec / 60), s = Math.round(sec % 60);
    return m < 60 ? m + 'm' + (s ? ' ' + s + 's' : '') : Math.floor(m / 60) + 'h ' + (m % 60) + 'm';
  }

  /* ── photos through the image CDN, originals as the fallback ─────── */
  var SB_OBJ = '/storage/v1/object/public/', SB_RENDER = '/storage/v1/render/image/public/';
  function thumb(src, w, h) {
    if (typeof src !== 'string' || !src) return '';
    if (src.indexOf(SB_OBJ) === -1) return src;
    var dpr = Math.min(2, global.devicePixelRatio || 1);
    /* Width and height together. With width alone the renderer keeps the
       original height and crops a sliver out of the middle. */
    return src.replace(SB_OBJ, SB_RENDER) + '?width=' + Math.round(w * dpr) +
      '&height=' + Math.round(h * dpr) + '&resize=cover&quality=72';
  }
  function img(src, w, h, alt) {
    if (!src) return '';
    var t = thumb(src, w, h);
    return '<img src="' + esc(t) + '"' + (t !== src ? ' data-fallback="' + esc(src) + '"' : '') +
      ' alt="' + esc(alt || '') + '" loading="lazy" decoding="async">';
  }
  D.addEventListener('error', function (e) {
    var t = e.target;
    if (!t || t.tagName !== 'IMG' || !t.getAttribute('data-fallback')) return;
    var f = t.getAttribute('data-fallback');
    t.removeAttribute('data-fallback');
    t.src = f;
  }, true);

  /* ── icons ───────────────────────────────────────────────────────── */
  var I = {
    radar: '<path d="M4.9 4.9a10 10 0 0 0 0 14.2M19.1 4.9a10 10 0 0 1 0 14.2M7.8 7.8a6 6 0 0 0 0 8.4M16.2 7.8a6 6 0 0 1 0 8.4"/><circle cx="12" cy="12" r="2" fill="currentColor" stroke="none"/>',
    pin: '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
    cal: '<rect x="3" y="4.5" width="18" height="17" rx="2.5"/><path d="M16 2.5v4M8 2.5v4M3 10h18"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
    bed: '<path d="M2 20v-8a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v8M2 16h20M6 10V7a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v3"/>',
    pen: '<path d="M4 20h4L19 9a2.1 2.1 0 0 0-3-3L5 17z"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    chat: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    star: '<path d="m12 2.8 2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.6l-5.8 3.1 1.1-6.5L2.6 9.6l6.5-.9z" fill="currentColor" stroke="none"/>',
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    tag: '<path d="M20.6 13.4 12.4 21.6a2 2 0 0 1-2.8 0l-7.2-7.2a2 2 0 0 1-.6-1.4V4a2 2 0 0 1 2-2h9a2 2 0 0 1 1.4.6l6.4 6.4a2 2 0 0 1 0 2.8z"/><circle cx="7.5" cy="7.5" r="1.3" fill="currentColor" stroke="none"/>',
    down: '<path d="m6 9 6 6 6-6"/>',
    bell: '<path d="M10.3 21a1.94 1.94 0 0 0 3.4 0M3.3 16.6c-.6.7-.1 1.8.8 1.8h15.8c.9 0 1.4-1.1.8-1.8C19.5 15 18 13.2 18 8A6 6 0 0 0 6 8c0 5.2-1.5 7-2.7 8.6"/>',
    home: '<path d="M3 10.5 12 4l9 6.5"/><path d="M5 9.5V20h14V9.5"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20.5 20.5-4.2-4.2"/>',
    spark: '<path d="M12 2.6l2.1 5.9 5.9 2.1-5.9 2.1-2.1 5.9-2.1-5.9L4 10.6l5.9-2.1z" fill="currentColor" stroke="none"/>',
    bolt: '<path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/>',
    pause: '<rect x="6" y="4.5" width="4" height="15" rx="1"/><rect x="14" y="4.5" width="4" height="15" rx="1"/>',
    speaker: '<path d="M11 5 6 9H2v6h4l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14"/>',
    mute: '<path d="M11 5 6 9H2v6h4l5 4z"/><path d="m22 9-6 6M16 9l6 6"/>',
    eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    send: '<path d="m22 2-7 20-4-9-9-4z"/><path d="M22 2 11 13"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    sms: '<rect x="5" y="2" width="14" height="20" rx="2.5"/><path d="M9.5 18h5"/>',
    mail: '<rect x="2.5" y="4.5" width="19" height="15" rx="2.5"/><path d="m3 6 9 7 9-7"/>'
  };
  function svg(name, cls) {
    return '<svg class="' + (cls || '') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (I[name] || '') + '</svg>';
  }

  /* ── stylesheet, loaded on demand so any page can raise a takeover ── */
  /* Until the stylesheet has arrived, anything this module draws stays
     invisible, so a lazily loaded takeover never flashes unstyled. The
     stylesheet itself lifts this with a more specific rule. */
  function ensureCSS() {
    if (!D.getElementById('cm-pre')) {
      var st = D.createElement('style');
      st.id = 'cm-pre';
      st.textContent = '.cm-sheet-root,.cm-take,.cm-float,.cm-toast{visibility:hidden}';
      (D.head || D.documentElement).appendChild(st);
    }
    var l = D.querySelector('link[href^="/cabana-match.css"]');
    if (l) { if (l.media === 'print') l.media = 'all'; return; }
    l = D.createElement('link');
    l.rel = 'stylesheet'; l.href = CSS_HREF; l.id = 'cm-css';
    (D.head || D.documentElement).appendChild(l);
  }

  /* ── session and data ────────────────────────────────────────────── */
  function client() {
    try { return (global.ApaSession && global.ApaSession.client && global.ApaSession.client()) || global.sb || null; }
    catch (e) { return global.sb || null; }
  }

  /* Who is signed in, with a deadline. A hung session probe must never
     mean a button that silently does nothing. */
  var _userP = null, _uid = null;
  function user() {
    if (_userP) return _userP;
    _userP = new Promise(function (resolve) {
      var done = false;
      function fin(u) { if (done) return; done = true; _uid = u && u.id || null; resolve(u || null); }
      try {
        if (global.ApaSession && global.ApaSession.ready) global.ApaSession.ready(function (st) { fin(st && st.user); });
      } catch (e) {}
      setTimeout(function () {
        if (done) return;
        var c = client();
        if (!c) return fin(global.CURRENT_USER || null);
        c.auth.getSession().then(function (r) { fin(r && r.data && r.data.session && r.data.session.user); },
          function () { fin(global.CURRENT_USER || null); });
      }, 2600);
      setTimeout(function () { fin(global.CURRENT_USER || null); }, 7000);
    });
    _userP.then(function (u) { if (!u) setTimeout(function () { _userP = null; }, 1500); });
    return _userP;
  }
  try {
    if (global.ApaSession && global.ApaSession.subscribe) {
      global.ApaSession.subscribe(function (st) {
        var id = st && st.user && st.user.id || null;
        if (id !== _uid) { _userP = null; _uid = id; }
      });
    }
  } catch (e) {}

  function friendly(e) {
    var m = String(e && (e.message || e.error_description || e) || '');
    if (/failed to fetch|networkerror|load failed|network request failed|timed out|timeout/i.test(m)) {
      return 'You look offline. Check your connection and try again.';
    }
    if (/could not find the function|PGRST202|schema cache/i.test(m)) return 'Cabana just updated. Refresh the page and try again.';
    if (/jwt|not authenticated|permission denied for function/i.test(m)) return 'Your session ended. Sign in again to continue.';
    return m.replace(/^error:\s*/i, '') || 'Something went wrong. Try again.';
  }

  function rpc(fn, args, ms) {
    var c = client();
    if (!c) return Promise.reject(Object.assign(new Error('Cabana is still loading. Try again in a moment.'), { code: 'no_client' }));
    return new Promise(function (resolve, reject) {
      var t = setTimeout(function () { reject(Object.assign(new Error('The request timed out.'), { code: 'timeout' })); }, ms || 15000);
      c.rpc(fn, args || {}).then(function (res) {
        clearTimeout(t);
        if (res && res.error) {
          var er = new Error(friendly(res.error));
          er.hint = res.error.hint || null; er.code = res.error.code || null; er.raw = res.error.message;
          return reject(er);
        }
        resolve(res ? res.data : null);
      }, function (err) { clearTimeout(t); reject(Object.assign(new Error(friendly(err)), { code: 'network' })); });
    });
  }

  /* ── page hooks ──────────────────────────────────────────────────── */
  var hooks = {};
  function configure(h) { Object.keys(h || {}).forEach(function (k) { hooks[k] = h[k]; }); return api; }

  /* ── sound, touch and attention ──────────────────────────────────── */
  var _ac = null;
  function audio(create) {
    try {
      var AC = global.AudioContext || global.webkitAudioContext;
      if (!AC) return null;
      if (!_ac && create) _ac = new AC();
      if (_ac && _ac.state === 'suspended' && create) _ac.resume().catch(function () {});
      return _ac;
    } catch (e) { return null; }
  }
  /* Browsers only let a page make sound after the person has touched it.
     Anything they touch inside Match counts, and a host's first tap on
     any page does too, so a guest request can ring out later. */
  function primeAudio() { audio(true); }
  function tone(ac, t0, f, len, vol, type) {
    var o = ac.createOscillator(), g = ac.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(f, t0);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.014);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + len);
    o.connect(g); g.connect(ac.destination);
    o.start(t0); o.stop(t0 + len + 0.03);
  }
  var SOUNDS = {
    /* A bright rising arpeggio, twice. Recognisable across a room and
       unlike the message chime, so a host knows what it is unseen. */
    alert: function (ac, t) {
      [0, 0.95].forEach(function (o) {
        [[0, 783.99], [0.12, 1046.5], [0.24, 1318.51], [0.36, 1567.98]].forEach(function (n, i) {
          tone(ac, t + o + n[0], n[1], i === 3 ? 0.7 : 0.38, 0.17, 'sine');
          tone(ac, t + o + n[0], n[1] * 2, 0.2, 0.025, 'triangle');
        });
      });
    },
    offer: function (ac, t) {
      tone(ac, t, 1318.51, 0.32, 0.15);
      tone(ac, t + 0.13, 1975.53, 0.6, 0.13);
      tone(ac, t + 0.13, 3951.07, 0.18, 0.02, 'triangle');
    },
    seen: function (ac, t) {
      tone(ac, t, 1318.51, 0.28, 0.07);
      tone(ac, t + 0.11, 1760, 0.42, 0.06);
    },
    pass: function (ac, t) {
      tone(ac, t, 523.25, 0.3, 0.05);
      tone(ac, t + 0.12, 392, 0.45, 0.045);
    },
    close: function (ac, t) {
      [[0, 880], [0.12, 659.25], [0.24, 493.88]].forEach(function (n, i) { tone(ac, t + n[0], n[1], i === 2 ? 0.6 : 0.3, 0.06); });
    },
    low: function (ac, t) {
      tone(ac, t, 987.77, 0.18, 0.05, 'triangle');
      tone(ac, t + 0.2, 987.77, 0.18, 0.05, 'triangle');
    },
    sent: function (ac, t) {
      var o = ac.createOscillator(), g = ac.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(420, t);
      o.frequency.exponentialRampToValueAtTime(1260, t + 0.32);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.12, t + 0.05);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.42);
      o.connect(g); g.connect(ac.destination); o.start(t); o.stop(t + 0.45);
      tone(ac, t + 0.3, 1567.98, 0.5, 0.08);
    }
  };
  function soundOn() { return ls('cm_sound') !== false; }
  /* Someone who hosts gets their audio unlocked by their first tap on any
     page, so a request can ring later without them touching Match. A
     guest-only visitor never has an audio context created for them. */
  if (ls('cm_host')) {
    ['pointerdown', 'keydown'].forEach(function (ev) {
      D.addEventListener(ev, function once() { primeAudio(); D.removeEventListener(ev, once, true); }, true);
    });
  }
  function play(name) {
    if (!soundOn()) return;
    var ac = audio(false);
    if (!ac || ac.state !== 'running') return;   // a queued chime that fires late is worse than none
    try { SOUNDS[name](ac, ac.currentTime + 0.02); } catch (e) {}
  }
  function buzz(p) { try { if (navigator.vibrate) navigator.vibrate(p); } catch (e) {} }

  var _title = null, _titleTimer = null;
  function flashTitle(text) {
    if (_titleTimer) return;
    _title = D.title;
    var on = false;
    _titleTimer = setInterval(function () {
      if (D.visibilityState === 'visible') return stopTitle();
      on = !on;
      D.title = on ? text : _title;
    }, 1100);
  }
  function stopTitle() {
    if (_titleTimer) { clearInterval(_titleTimer); _titleTimer = null; }
    if (_title != null) { D.title = _title; _title = null; }
  }

  /* Tabs talk to each other so one alert is one alert. */
  var bc = null;
  try { bc = new global.BroadcastChannel('cabana-match'); } catch (e) {}
  function tell(msg) { try { if (bc) bc.postMessage(msg); } catch (e) {} }
  if (bc) bc.onmessage = function (e) {
    var m = e && e.data || {};
    if (m.type === 'host-done' && m.id) { handled(m.id, m.how || 'elsewhere'); if (H.open && H.open.id === m.id) closeTake(true); }
    if (m.type === 'guest-changed' && m.id && G.req && G.req.id === m.id) refresh(m.id);
  };
  function claim(key, ms) {
    var k = 'cm_claim_' + key, v = ls(k);
    if (v && Date.now() - v < (ms || 8000)) return false;
    ls(k, Date.now());
    return true;
  }

  /* ── toast ───────────────────────────────────────────────────────── */
  var _toast = null, _toastTimer = null;
  function toast(msg, opts) {
    opts = opts || {};
    ensureCSS();
    if (!_toast) {
      _toast = D.createElement('div');
      _toast.className = 'cm-root cm-toast';
      _toast.setAttribute('role', 'status');
      _toast.setAttribute('aria-live', 'polite');
      D.body.appendChild(_toast);
    }
    _toast.innerHTML = (opts.icon ? svg(opts.icon, 'cm-toast-ico') : '') +
      '<span class="cm-toast-txt"><b></b>' + (opts.sub ? '<small></small>' : '') + '</span>' +
      (opts.action ? '<span class="cm-toast-go">' + svg('arrow') + '</span>' : '');
    _toast.querySelector('b').textContent = msg;
    if (opts.sub) _toast.querySelector('small').textContent = opts.sub;
    _toast.classList.toggle('is-action', !!opts.action);
    _toast.onclick = function () {
      _toast.classList.remove('is-on');
      if (opts.action) opts.action();
    };
    requestAnimationFrame(function () { _toast.classList.add('is-on'); });
    clearTimeout(_toastTimer);
    _toastTimer = setTimeout(function () { if (_toast) _toast.classList.remove('is-on'); }, opts.ms || 3600);
  }

  /* ── layers: sheet and takeover, with focus, Escape and Back ─────── */
  var _layers = [];
  var FOCUSABLE = 'button:not([disabled]),[href],input:not([disabled]),textarea:not([disabled]),select:not([disabled]),summary,[tabindex]:not([tabindex="-1"])';

  function lockScroll(on) {
    var html = D.documentElement;
    if (on) {
      if (!html.classList.contains('cm-lock')) {
        html.style.setProperty('--cm-sbw', (global.innerWidth - html.clientWidth) + 'px');
        html.classList.add('cm-lock');
      }
    } else if (!_layers.length) {
      html.classList.remove('cm-lock');
    }
  }

  function pushLayer(layer) {
    _layers.push(layer);
    lockScroll(true);
    try { history.pushState({ cmLayer: layer.key }, ''); layer.hist = true; } catch (e) {}
    layer.prevFocus = D.activeElement;
  }
  function popLayer(layer, opts) {
    var i = _layers.indexOf(layer);
    if (i === -1) return;
    _layers.splice(i, 1);
    lockScroll(false);
    if (layer.hist && !(opts && opts.fromPop) && !(opts && opts.navigating)) {
      try { if (history.state && history.state.cmLayer === layer.key) history.back(); } catch (e) {}
    }
    try { if (layer.prevFocus && D.contains(layer.prevFocus)) layer.prevFocus.focus({ preventScroll: true }); } catch (e) {}
  }
  global.addEventListener('popstate', function () {
    var top = _layers[_layers.length - 1];
    if (top && top.close) top.close({ fromPop: true });
  });
  D.addEventListener('keydown', function (e) {
    var top = _layers[_layers.length - 1];
    if (!top) return;
    if (e.key === 'Escape' && top.close) { e.preventDefault(); top.close(); return; }
    if (e.key === 'Tab' && top.el) {
      var f = $$(FOCUSABLE, top.el).filter(function (n) { return n.offsetParent !== null || n === D.activeElement; });
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && D.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && D.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  /* One sheet at a time: the composer becomes the radar in place. */
  var S = null;
  function openSheet(label) {
    ensureCSS();
    if (S) return S;
    var root = D.createElement('div');
    root.className = 'cm-root cm-sheet-root';
    root.innerHTML = '<div class="cm-scrim"></div>' +
      '<section class="cm-sheet" role="dialog" aria-modal="true" tabindex="-1">' +
      '<div class="cm-grab" aria-hidden="true"></div>' +
      '<button type="button" class="cm-x" data-cm="close" aria-label="Close">' + svg('x') + '</button>' +
      '<div class="cm-stage"></div></section>';
    D.body.appendChild(root);
    var sheet = root.querySelector('.cm-sheet');
    sheet.setAttribute('aria-label', label || 'Cabana Match');
    S = {
      key: 'sheet-' + Date.now(),
      root: root, el: sheet, stage: root.querySelector('.cm-stage'), mode: null,
      close: function (o) { closeSheet(o); }
    };
    pushLayer(S);
    root.querySelector('.cm-scrim').addEventListener('click', function () { closeSheet(); });
    root.addEventListener('click', onSheetClick);
    root.addEventListener('input', onSheetInput);
    root.addEventListener('change', onSheetInput);
    root.addEventListener('keydown', onSheetKey);
    root.addEventListener('pointerdown', primeAudio, { passive: true });
    dragToClose(sheet, root.querySelector('.cm-grab'));
    requestAnimationFrame(function () {
      root.querySelector('.cm-scrim').classList.add('is-on');
      sheet.classList.add('is-on');
      setTimeout(function () { try { sheet.focus({ preventScroll: true }); } catch (e) {} }, 60);
    });
    return S;
  }

  function closeSheet(o) {
    if (!S) return;
    var s = S; S = null;
    popLayer(s, o);
    s.root.querySelector('.cm-scrim').classList.remove('is-on');
    s.el.classList.remove('is-on');
    setTimeout(function () { if (s.root.parentNode) s.root.remove(); }, 460);
    clearTimeout(C.timer);
    G.confirm = false;
    if (s.mode === 'live') stopLiveTimers(false);
    ambStop(true);
    renderFloat();
  }

  /* Pull the sheet down to dismiss it, like every native sheet. */
  function dragToClose(sheet, grab) {
    if (!grab || !('PointerEvent' in global)) return;
    var y0 = null, dy = 0;
    grab.style.touchAction = 'none';
    grab.addEventListener('pointerdown', function (e) {
      if (global.innerWidth >= 720) return;
      y0 = e.clientY; dy = 0;
      sheet.style.transition = 'none';
      try { grab.setPointerCapture(e.pointerId); } catch (x) {}
    });
    grab.addEventListener('pointermove', function (e) {
      if (y0 == null) return;
      dy = Math.max(0, e.clientY - y0);
      sheet.style.transform = 'translate(-50%,' + dy + 'px)';
    });
    function end() {
      if (y0 == null) return;
      y0 = null;
      sheet.style.transition = '';
      sheet.style.transform = '';
      if (dy > 110) closeSheet();
    }
    grab.addEventListener('pointerup', end);
    grab.addEventListener('pointercancel', end);
  }

  /* ════════════════════════════════════════════════════════════════
     GUEST · COMPOSER
     ════════════════════════════════════════════════════════════════ */
  var BANDS = [
    { k: 'any', label: 'Any', min: null, max: null },
    { k: '1', label: '1K–2K', min: 1000, max: 2000 },
    { k: '2', label: '2K–3.5K', min: 2000, max: 3500 },
    { k: '3', label: '3.5K–5K', min: 3500, max: 5000 },
    { k: '4', label: '5K+', min: 5000, max: null }
  ];
  function bandKey(min, max) {
    for (var i = 0; i < BANDS.length; i++) {
      if ((BANDS[i].min || 0) === (num(min) || 0) && (BANDS[i].max || 0) === (num(max) || 0)) return BANDS[i].k;
    }
    return null;
  }

  var C = { crit: null, preview: null, seq: 0, timer: null, sending: false, user: undefined, memo: ss('cm_memo') || {} };

  function normCrit(c) {
    c = c || {};
    var out = {
      location: String(c.location || c.label || '').trim(),
      label: String(c.label || c.location || '').trim(),
      lat: num(c.lat), lng: num(c.lng),
      checkin: String(c.checkin || c.checkin_date || '').slice(0, 10),
      checkout: String(c.checkout || c.checkout_date || '').slice(0, 10),
      guests: Math.max(1, num(c.guests) || 1),
      bedrooms: num(c.bedrooms) || null,
      min_price: num(c.min_price) || null,
      max_price: num(c.max_price) || null,
      radius_km: num(c.radius_km) || null,
      notes: String(c.notes || '').slice(0, 280),
      source: c.source || (/dashboard/.test(location.pathname) ? 'dashboard' : 'stays')
    };
    if (out.lat == null || out.lng == null) { out.lat = null; out.lng = null; }
    var m = C.memo || {};
    if (!out.notes && m.notes) out.notes = m.notes;
    if (!out.radius_km && m.radius_km) out.radius_km = m.radius_km;
    /* A page with its own budget control (the stays page) is the truth
       for the budget; elsewhere the last choice carries over. */
    if (!hooks.budget && out.min_price == null && out.max_price == null && m.band && m.band !== 'any') {
      var b = BANDS.filter(function (x) { return x.k === m.band; })[0];
      if (b) { out.min_price = b.min; out.max_price = b.max; }
    }
    return out;
  }
  function payload(c) {
    return {
      location: c.location || null, label: c.label || c.location || null,
      lat: c.lat, lng: c.lng, checkin: c.checkin || null, checkout: c.checkout || null,
      guests: c.guests, bedrooms: c.bedrooms, min_price: c.min_price, max_price: c.max_price,
      radius_km: c.radius_km || 25, notes: c.notes || null, source: c.source
    };
  }
  function remember() {
    var c = C.crit || {};
    C.memo = { band: bandKey(c.min_price, c.max_price) || 'any', notes: c.notes || '', radius_km: c.radius_km || null };
    ss('cm_memo', C.memo);
  }

  function compose(input) {
    ensureCSS();
    primeAudio();
    var raw = input || (hooks.criteria ? hooks.criteria() : null) || (G.req ? fromReq(G.req) : {});
    C.crit = normCrit(raw);
    C.preview = null;
    C.sending = false;
    var s = openSheet('Get matched');
    s.mode = 'compose';
    renderFloat();
    s.el.classList.remove('cm-live', 'cm-dark');
    renderComposer();
    previewSoon(0);
    pinCrit();
    user().then(function (u) { C.user = u; updateGo(); });
    track('match_compose_open');
    return api;
  }
  /* A request typed as words ("Diani") still deserves a radius. Find the
     point quietly and re-count once it lands. */
  function pinCrit() {
    var c = C.crit;
    if (!c || c.lat != null || !c.location || !global.ApaGeo || !global.ApaGeo.search) return;
    var want = c.location;
    global.ApaGeo.search(want, { limit: 1 }).then(function (list) {
      var p = list && list[0];
      if (!p || !C.crit || C.crit.location !== want || C.crit.lat != null || !S || S.mode !== 'compose') return;
      C.crit.lat = p.lat; C.crit.lng = p.lng;
      C.crit.label = p.short || p.label || want;
      renderComposer();
      previewSoon(0);
    }).catch(function () {});
  }

  function fromReq(r) {
    return {
      location: r.location, label: r.label, lat: r.lat, lng: r.lng, checkin: r.checkin, checkout: r.checkout,
      guests: r.guests, bedrooms: r.bedrooms, min_price: r.min_price, max_price: r.max_price,
      radius_km: r.radius_km, notes: r.notes
    };
  }

  function chip(field, icon, html, missing) {
    return '<button type="button" class="cm-chip' + (missing ? ' is-missing' : '') + '" data-cm="edit" data-field="' + field + '">' +
      svg(icon) + '<span>' + html + '</span>' + svg(missing ? 'plus' : 'pen', 'cm-pen') + '</button>';
  }

  function renderComposer() {
    if (!S) return;
    var c = C.crit, n = nightsOf(c.checkin, c.checkout);
    var live = G.req && G.req.status === 'live' && remaining() > 0;
    var bk = bandKey(c.min_price, c.max_price);
    var custom = !bk && (c.min_price || c.max_price);
    S.stage.innerHTML =
      '<div class="cm-body">' +
        '<header class="cm-head">' +
          '<span class="cm-mark">' + svg('radar') + '</span>' +
          '<div><h2 class="cm-title">Let hosts come to you</h2>' +
          '<div class="cm-sub">Hosts nearby reply with their best price.</div></div>' +
        '</header>' +
        '<div class="cm-chips">' +
          chip('where', 'pin', esc(c.label || c.location) || 'Where to?', !(c.location || c.lat != null)) +
          chip('dates', 'cal', c.checkin && c.checkout ? esc(rangeShort(c.checkin, c.checkout)) + ' <em>' + plural(n, 'night') + '</em>' : 'Add dates', !(c.checkin && c.checkout)) +
          chip('guests', 'users', plural(c.guests, 'guest')) +
          (c.bedrooms ? chip('rooms', 'bed', plural(c.bedrooms, 'bedroom') + '+') : '') +
        '</div>' +
        '<div class="cm-group">' +
          '<div class="cm-label">Budget a night' +
            (global.CabanaFX ? '<button type="button" class="cm-cur" data-cm="currency" aria-label="Change currency">' + esc(global.CabanaFX.code()) + svg('down') + '</button>' : ' <small>KES</small>') +
          '</div>' +
          '<div class="cm-seg" role="group" aria-label="Budget a night">' +
            BANDS.map(function (b) {
              return '<button type="button" data-cm="band" data-k="' + b.k + '" aria-pressed="' + (bk === b.k || (!bk && !custom && b.k === 'any')) + '">' + esc(bandLabel(b)) + '</button>';
            }).join('') +
            (custom ? '<button type="button" data-cm="band" data-k="custom" aria-pressed="true">' + esc(customBand(c)) + '</button>' : '') +
          '</div>' +
          (fxOn() ? '<div class="cm-fxnote">Hosts see your budget in KES. You pay in KES.</div>' : '') +
        '</div>' +
        (c.lat != null ? (
        '<div class="cm-group cm-reachctl">' +
          '<div class="cm-label">How far hosts can be <small>from ' + esc(placeOf(c)) + '</small></div>' +
          '<div class="cm-reach-grid">' +
            '<div class="cm-reach-map" aria-hidden="true"></div>' +
            '<div class="cm-reach-seg" role="radiogroup" aria-label="How far hosts can be"></div>' +
          '</div>' +
          '<p class="cm-reach-why" aria-live="polite"></p>' +
        '</div>') : (c.location ? '<div class="cm-group"><div class="cm-pinhint">' + svg('pin') +
          '<span>We’ll send this to hosts whose stays are listed in <b>' + esc(placeOf(c)) + '</b>. Pick a place from the list to choose how far hosts can be.</span></div></div>' : '')) +
        '<button type="button" class="cm-more" data-cm="note-toggle" aria-expanded="' + (!!c.notes) + '">' + svg('plus') + (c.notes ? 'Note for hosts' : 'Add a note for hosts') + '</button>' +
        '<div class="cm-note-wrap"' + (c.notes ? '' : ' hidden') + '>' +
          '<textarea class="cm-note" data-cm="note" maxlength="280" rows="3" placeholder="Late arrival, a quiet street, parking for one car…" aria-label="Note for hosts">' + esc(c.notes) + '</textarea>' +
          '<span class="cm-note-count cm-num">' + (c.notes || '').length + '/280</span>' +
        '</div>' +
        '<div class="cm-reach" aria-live="polite"></div>' +
        '<div class="cm-err" hidden></div>' +
        '<details class="cm-learn"><summary>How it works' + svg('down') + '</summary><ol>' +
          '<li>Your request reaches hosts with a stay free for your dates, nearest first.</li>' +
          '<li>They have 20 minutes to reply. Many send a special price only you can book.</li>' +
          '<li>Pick an offer, chat, or book. Nothing is committed until you pay.</li>' +
        '</ol></details>' +
      '</div>' +
      '<div class="cm-foot">' +
        '<button type="button" class="cm-go" data-cm="send">' + svg('radar') + '<span class="cm-go-label">Send request</span></button>' +
        (live ? '<div class="cm-foot-note">This replaces the request you have live now.</div>' : '') +
      '</div>';
    renderReach();
    renderReachCtl();
    updateGo();
  }
  function customBand(c) {
    return bandLabel({ min: c.min_price, max: c.max_price, label: c.min_price && c.max_price ? (c.min_price / 1000) + 'K–' + (c.max_price / 1000) + 'K'
      : c.max_price ? 'Up to ' + (c.max_price / 1000) + 'K' : (c.min_price / 1000) + 'K+' });
  }

  /* ── reach: how far a request travels ─────────────────────────────
     The old control was a bare 3–100 km slider with nothing to say what
     it did. A request rings only the hosts whose stay lies inside this
     circle, so each stop now says, live, how many hosts that is, the
     rings show where they sit by distance, and one sentence says what
     moving it changes. Five stops a person can name beat a slider
     nobody can aim. */
  var STOPS = [
    { km: 5, t: 'Close by' }, { km: 10, t: 'Nearby' }, { km: 25, t: 'Across town' },
    { km: 50, t: 'Wider area' }, { km: 100, t: 'Whole region' }
  ];
  var RING_R = { 5: 22, 10: 37, 25: 54, 50: 71, 100: 88 };
  function snapKm(v) {
    v = num(v) || 25;
    var best = STOPS[0].km;
    STOPS.forEach(function (s) { if (Math.abs(s.km - v) < Math.abs(best - v)) best = s.km; });
    return best;
  }
  function critKey(c) {
    return [c.location, c.lat, c.lng, c.checkin, c.checkout, c.guests, c.bedrooms, c.min_price, c.max_price].join('|');
  }

  function reachSVG(d, km) {
    var seed = hash((C.crit && (C.crit.label || C.crit.location)) || 'x');
    var h = '<svg viewBox="0 0 200 200">' +
      '<defs><radialGradient id="cmRg" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#7B2FF7" stop-opacity=".18"/><stop offset="1" stop-color="#4D96FF" stop-opacity=".05"/></radialGradient></defs>';
    STOPS.slice().reverse().forEach(function (s) {
      var on = s.km <= km, sel = s.km === km;
      h += '<circle cx="100" cy="100" r="' + RING_R[s.km] + '" class="rr' + (on ? ' on' : '') + (sel ? ' sel' : '') + '"' + (sel ? ' fill="url(#cmRg)"' : '') + '/>';
    });
    var prev = 0;
    STOPS.forEach(function (s, i) {
      var tot = d && d[s.km] ? (num(d[s.km].hosts) || 0) : 0;
      var n = Math.max(0, tot - prev);
      prev = Math.max(prev, tot);
      var r0 = i ? RING_R[STOPS[i - 1].km] : 8, r1 = RING_R[s.km];
      for (var j = 0; j < Math.min(n, 14); j++) {
        var a = ((seed % 360) + i * 97 + j * 137.508) * Math.PI / 180;
        var f = 0.3 + 0.55 * (((seed >>> (j % 16)) & 255) / 255);
        var rr = r0 + (r1 - r0) * f;
        h += '<circle class="hd' + (s.km <= km ? ' in' : '') + '" style="animation-delay:' + (i * 90 + j * 40) + 'ms" cx="' + (100 + Math.cos(a) * rr).toFixed(1) +
          '" cy="' + (100 + Math.sin(a) * rr).toFixed(1) + '" r="4.2"/>';
      }
    });
    h += '<circle cx="100" cy="100" r="7" class="me"/><circle cx="100" cy="100" r="7" class="me-ping"/>';
    h += '<text x="100" y="' + (100 - RING_R[km] + 11) + '" class="rl">' + km + ' km</text>';
    return h + '</svg>';
  }

  function renderReachCtl() {
    if (!S || S.mode !== 'compose' || !C.crit) return;
    var box = $('.cm-reachctl', S.stage);
    if (!box) return;
    var c = C.crit, d = C.ladder && C.ladder.key === critKey(c) ? C.ladder.data : null, km = snapKm(c.radius_km);
    var seg = $('.cm-reach-seg', box);
    if (!seg.children.length) {
      seg.innerHTML = STOPS.map(function (s) {
        return '<button type="button" role="radio" data-cm="reach" data-km="' + s.km + '" aria-checked="false">' +
          '<span class="cm-rs-dot" aria-hidden="true"></span><b class="cm-num">' + s.km + ' km</b><span class="cm-rs-t">' + s.t + '</span>' +
          '<em class="cm-num"></em></button>';
      }).join('');
    }
    $$('[data-cm="reach"]', seg).forEach(function (b) {
      var k = +b.getAttribute('data-km'), n = d && d[k] ? num(d[k].hosts) || 0 : null;
      b.setAttribute('aria-checked', String(k === km));
      b.tabIndex = k === km ? 0 : -1;
      b.classList.toggle('is-zero', n === 0);
      b.querySelector('em').innerHTML = n == null ? '<i class="cm-shimmer"></i>' : n === 0 ? 'No hosts' : plural(n, 'host');
    });
    $('.cm-reach-map', box).innerHTML = reachSVG(d, km);
    var why = $('.cm-reach-why', box), cur = d && d[km], place = esc(placeOf(c));
    if (!d) { why.textContent = 'Counting the hosts free for your dates at each distance…'; return; }
    var n = num(cur && cur.hosts) || 0;
    var more = STOPS.filter(function (s) { return s.km > km && d[s.km] && (num(d[s.km].hosts) || 0) > n; })[0];
    var txt = n
      ? 'Your request rings <b>' + plural(n, 'host') + '</b> within ' + km + ' km of ' + place +
        (cur.nearest_km != null ? ', the nearest ' + fmtKm(cur.nearest_km) + ' away' : '') + '. Hosts further out never see it.'
      : 'No host has a stay free within ' + km + ' km of ' + place + ' for these dates.';
    if (more) txt += ' Going to ' + more.km + ' km reaches <b>' + plural(num(d[more.km].hosts), 'host') + '</b>.';
    else if (n && km > 5) txt += ' A smaller circle keeps the trip short; a bigger one would not add anyone.';
    why.innerHTML = txt;
  }

  function previewSoon(ms) {
    clearTimeout(C.timer);
    C.timer = setTimeout(previewNow, ms == null ? 380 : ms);
  }
  function previewNow() {
    var c = C.crit;
    if (!c || !S || S.mode !== 'compose') return;
    var seq = ++C.seq;
    if (!(c.location || c.lat != null) || !c.checkin || !c.checkout) {
      C.preview = { need: !(c.location || c.lat != null) ? 'where' : 'dates' };
      renderReach(); updateGo();
      return;
    }
    if (c.lat != null) {
      /* One count per stop, in parallel, so the reach control can say
         what every distance would do before the guest picks one. */
      c.radius_km = snapKm(c.radius_km);
      var key = critKey(c);
      if (C.ladder && C.ladder.key === key && C.ladder.data) { applyLadder(); return; }
      C.preview = { loading: true, last: C.preview && C.preview.hosts != null ? C.preview : (C.preview && C.preview.last) };
      C.ladder = { key: key, data: null };
      renderReach(); renderReachCtl(); updateGo();
      Promise.all(STOPS.map(function (st) {
        var pl = payload(c); pl.radius_km = st.km;
        return rpc('cabana_match_preview', { p: pl }, 12000).then(function (r) { return [st.km, r || { hosts: 0, listings: 0 }]; });
      })).then(function (rows) {
        if (seq !== C.seq) return;
        var data = {};
        rows.forEach(function (x) { data[x[0]] = x[1]; });
        C.ladder = { key: key, data: data };
        applyLadder();
      }, function (e) {
        if (seq !== C.seq) return;
        C.ladder = null;
        C.preview = { error: e.message, code: e.code };
        renderReach(); renderReachCtl(); updateGo();
      });
      return;
    }
    C.preview = { loading: true, last: C.preview && C.preview.hosts != null ? C.preview : (C.preview && C.preview.last) };
    renderReach(); updateGo();
    rpc('cabana_match_preview', { p: payload(c) }, 12000).then(function (r) {
      if (seq !== C.seq) return;
      C.preview = r || { hosts: 0, listings: 0 };
      renderReach(); updateGo();
    }, function (e) {
      if (seq !== C.seq) return;
      C.preview = { error: e.message, code: e.code };
      renderReach(); updateGo();
    });
  }

  function applyLadder() {
    var c = C.crit, d = C.ladder && C.ladder.data;
    if (!c || !d) return;
    var km = snapKm(c.radius_km);
    var cur = d[km] || { hosts: 0, listings: 0 };
    var p = {};
    Object.keys(cur).forEach(function (k) { p[k] = cur[k]; });
    p.radius_km = km;
    p.wider_hosts = null; p.wider_radius_km = null;
    if (!num(p.hosts)) {
      var w = STOPS.filter(function (s) { return s.km > km && d[s.km] && num(d[s.km].hosts) > 0; })[0];
      if (w) { p.wider_hosts = d[w.km].hosts; p.wider_radius_km = w.km; }
    }
    C.preview = p;
    renderReach(); renderReachCtl(); updateGo();
  }

  function renderReach() {
    if (!S || S.mode !== 'compose') return;
    var box = $('.cm-reach', S.stage);
    if (!box) return;
    var p = C.preview || { loading: true }, c = C.crit;
    var big = '', small = '', extra = '', empty = false;
    if (p.need) {
      empty = true;
      big = p.need === 'where' ? 'Where do you want to stay?' : 'When are you going?';
      small = p.need === 'where' ? 'Pick a place so the right hosts hear you.' : 'Add your dates. Hosts only see requests they can take.';
    } else if (p.loading) {
      var last = p.last;
      big = last ? plural(last.hosts, 'host') + ' can take you' : '<span class="cm-shimmer"></span>';
      small = 'Checking who is free…';
    } else if (p.error) {
      empty = true;
      big = p.code === 'network' || p.code === 'timeout' ? 'Can’t reach hosts right now' : 'Almost there';
      small = esc(p.error);
      if (p.code === 'network' || p.code === 'timeout') extra = '<button type="button" class="cm-reach-widen" data-cm="retry">Try again</button>';
    } else if (p.hosts > 0) {
      big = plural(p.hosts, 'host') + ' can take you';
      small = plural(p.listings, 'stay') + ' free' + (p.nearest_km != null && c.lat != null ? ' · nearest ' + fmtKm(p.nearest_km) + ' away' : '');
    } else if (p.wider_hosts > 0 && p.wider_radius_km) {
      empty = true;
      big = 'No one free within ' + (p.radius_km || c.radius_km || 25) + ' km';
      small = plural(p.wider_hosts, 'host') + ' free within ' + p.wider_radius_km + ' km.';
      extra = '<button type="button" class="cm-reach-widen" data-cm="widen" data-km="' + p.wider_radius_km + '">Reach ' + p.wider_radius_km + ' km</button>';
    } else {
      empty = true;
      big = 'No hosts free here yet';
      small = 'Try other dates, a wider budget or a nearby area.';
      if (hooks.browse) extra = '<button type="button" class="cm-reach-widen" data-cm="browse">Browse all stays</button>';
    }
    box.classList.toggle('is-empty', empty);
    box.innerHTML = '<div class="cm-reach-orb" aria-hidden="true"><i></i><i></i><i></i><b></b></div>' +
      '<div class="cm-reach-txt"><div class="cm-reach-big">' + big + '</div><div class="cm-reach-small">' + small + '</div>' + extra + '</div>';
  }
  function fmtKm(k) { k = num(k); if (k == null) return ''; return k < 1 ? Math.round(k * 1000) + ' m' : (k < 10 ? k.toFixed(1) : Math.round(k)) + ' km'; }

  function updateGo() {
    if (!S || S.mode !== 'compose') return;
    var b = $('.cm-go', S.stage), l = $('.cm-go-label', S.stage);
    if (!b || !l) return;
    var p = C.preview || {};
    var label = 'Send request', off = false;
    if (C.sending) { label = 'Sending to hosts…'; off = true; }
    else if (p.need === 'where') { label = 'Add where you’re going'; }
    else if (p.need === 'dates') { label = 'Add your dates'; }
    else if (p.error && p.code !== 'network' && p.code !== 'timeout') { label = 'Check your request'; off = true; }
    else if (p.hosts === 0) { label = 'No hosts free yet'; off = true; }
    else if (C.user === null) { label = p.hosts > 0 ? 'Sign in to send to ' + plural(p.hosts, 'host') : 'Sign in to send'; }
    else if (p.hosts > 0) { label = 'Send to ' + plural(p.hosts, 'host'); }
    l.textContent = label;
    b.disabled = !!(C.sending || off);
    b.classList.toggle('is-busy', C.sending);
    b.setAttribute('aria-busy', String(!!C.sending));
  }

  function showErr(msg) {
    if (!S) return;
    var e = $('.cm-err', S.stage);
    if (!e) return;
    if (!msg) { e.hidden = true; e.textContent = ''; return; }
    e.hidden = false; e.textContent = msg;
  }

  function onSheetKey(e) {
    var t = e.target;
    if (!t || t.getAttribute('data-cm') !== 'reach') return;
    var i = STOPS.map(function (s) { return s.km; }).indexOf(+t.getAttribute('data-km'));
    var j = e.key === 'ArrowDown' || e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowUp' || e.key === 'ArrowLeft' ? i - 1 : null;
    if (j == null) return;
    e.preventDefault();
    j = clamp(j, 0, STOPS.length - 1);
    var b = $('[data-cm="reach"][data-km="' + STOPS[j].km + '"]', S.stage);
    if (b) b.click();
  }

  function onSheetInput(e) {
    var t = e.target, k = t && t.getAttribute('data-cm');
    if (!k || !C.crit) return;
    if (k === 'note') {
      C.crit.notes = t.value.slice(0, 280);
      var cnt = $('.cm-note-count', S.stage);
      if (cnt) cnt.textContent = C.crit.notes.length + '/280';
      remember();
    }
  }

  function onSheetClick(e) {
    var t = e.target.closest ? e.target.closest('[data-cm]') : null;
    if (!t || !S || !S.root.contains(t)) return;
    var k = t.getAttribute('data-cm');
    switch (k) {
      case 'close': closeSheet(); break;
      case 'edit': editField(t.getAttribute('data-field')); break;
      case 'band': pickBand(t.getAttribute('data-k')); break;
      case 'note-toggle': toggleNote(t); break;
      case 'widen':
      case 'reach':
        C.crit.radius_km = snapKm(parseInt(t.getAttribute('data-km'), 10) || 25);
        remember();
        if (C.ladder && C.ladder.data && C.ladder.key === critKey(C.crit)) applyLadder();
        else previewSoon(0);
        if (k === 'reach') { try { t.focus({ preventScroll: true }); } catch (x) {} }
        break;
      case 'currency':
        if (global.CabanaFX) global.CabanaFX.picker(t);
        break;
      case 'retry': previewSoon(0); break;
      case 'browse': closeSheet(); if (hooks.browse) hooks.browse(); break;
      case 'send': send(); break;
      /* live */
      case 'chat': engage(t.getAttribute('data-id'), 'chat', t); break;
      case 'book': engage(t.getAttribute('data-id'), 'book', t); break;
      case 'extend': extend(t); break;
      case 'cancel': cancelReq(t); break;
      case 'cancel-yes': cancelConfirm(true); break;
      case 'cancel-no': cancelConfirm(false); break;
      case 'sound': toggleSound(); break;
      case 'again': compose(fromReq(G.req || {})); break;
      case 'wider':
        var r = fromReq(G.req || {});
        r.radius_km = Math.min(150, (G.req && G.req.radius_km || 25) * 2);
        compose(r);
        break;
      case 'done':
        if (G.req && G.req.status !== 'live') ls('cm_dismiss_' + G.req.id, Date.now());
        closeSheet();
        break;
    }
  }

  function editField(field) {
    if (hooks.edit) {
      closeSheet();
      setTimeout(function () { hooks.edit(field === 'dates' ? 'checkin' : field); }, 80);
      return;
    }
    /* No page form to edit into (dashboard). Send them to the stays page
       with the request intact. */
    ls('cm_pending', { crit: C.crit, at: Date.now(), edit: field });
    closeSheet({ navigating: true });
    location.href = '/apartments#cabana-match';
  }

  function pickBand(k) {
    var b = BANDS.filter(function (x) { return x.k === k; })[0];
    if (!b) return;
    C.crit.min_price = b.min; C.crit.max_price = b.max;
    $$('.cm-seg [data-cm="band"]', S.stage).forEach(function (x) { x.setAttribute('aria-pressed', String(x.getAttribute('data-k') === k)); });
    var cu = $('.cm-seg [data-k="custom"]', S.stage);
    if (cu) cu.remove();
    remember();
    if (hooks.budget) { try { hooks.budget(b.min || 0, b.max || 0); } catch (e) {} }
    previewSoon(250);
  }

  function toggleNote(btn) {
    var wrap = $('.cm-note-wrap', S.stage);
    if (!wrap) return;
    var open = wrap.hidden;
    wrap.hidden = !open;
    btn.setAttribute('aria-expanded', String(open));
    if (open) setTimeout(function () { var ta = $('.cm-note', S.stage); if (ta) ta.focus(); }, 60);
  }

  function toSignIn(crit) {
    ls('cm_pending', { crit: crit, at: Date.now() });
    var next = location.pathname + location.search + '#cabana-match';
    try { sessionStorage.setItem('auth_next', location.origin + next); } catch (e) {}
    closeSheet({ navigating: true });
    location.href = '/auth.html?next=' + encodeURIComponent(next);
  }

  /* Ask for notification permission inside the tap that sends the
     request. Offers arrive by push; a guest who never hears them lost
     the point of asking. */
  function askNotifyInGesture() {
    try {
      if (!('Notification' in global) || Notification.permission !== 'default') return;
      var p = Notification.requestPermission(function () {});
      if (p && p.then) p.then(function (res) {
        if (res === 'granted' && global.ApaPush && global.ApaPush.subscribe) global.ApaPush.subscribe(_uid).catch(function () {});
      }, function () {});
    } catch (e) {}
  }

  function send() {
    if (C.sending || !S) return;
    var c = C.crit;
    if (!(c.location || c.lat != null)) return editField('where');
    if (!c.checkin || !c.checkout) return editField('dates');
    if (C.user === null) return toSignIn(c);
    if (C.user) askNotifyInGesture();
    primeAudio();
    showErr(null);
    C.sending = true; updateGo();
    user().then(function (u) {
      if (!u) { C.sending = false; updateGo(); return toSignIn(c); }
      return rpc('cabana_match_broadcast', { p: payload(c) }, 20000).then(function (res) {
        C.sending = false;
        remember();
        track('match_broadcast', { hosts: res && res.hosts });
        goLive(res, c);
      });
    }).catch(function (e) {
      C.sending = false;
      if (e.hint === 'no_hosts') {
        C.preview = { hosts: 0, listings: 0 };
        previewNow();
      } else if (e.code === '42501' && /sign in/i.test(e.raw || '')) {
        return toSignIn(c);
      } else {
        showErr(e.message);
      }
      updateGo();
    });
  }

  /* ════════════════════════════════════════════════════════════════
     GUEST · LIVE RADAR
     ════════════════════════════════════════════════════════════════ */
  var G = { req: null, radar: null, offers: [], offset: 0, chan: null, chanId: null, poll: null, tick: null, known: {}, fresh: {},
            loading: null, loadingId: null, lastFetch: 0, seededId: null };

  function remaining() {
    if (!G.req || !G.req.expires_at) return 0;
    return new Date(G.req.expires_at).getTime() - (Date.now() + G.offset);
  }
  function isLive() { return !!(G.req && G.req.status === 'live' && remaining() > 0); }

  function goLive(res, crit) {
    G.req = {
      id: res.request_id, status: 'live', expires_at: res.expires_at, created_at: new Date().toISOString(),
      location: crit.location, label: crit.label || crit.location, lat: crit.lat, lng: crit.lng,
      checkin: crit.checkin, checkout: crit.checkout, nights: res.nights || nightsOf(crit.checkin, crit.checkout),
      guests: crit.guests, bedrooms: crit.bedrooms, min_price: crit.min_price, max_price: crit.max_price,
      radius_km: crit.radius_km || 25, notes: crit.notes, extensions_used: 0
    };
    G.radar = { notified: res.hosts || 0, listings: res.listings || 0, seen: 0, offers: 0, passed: 0 };
    G.offers = []; G.known = {}; G.fresh = {};
    G.seededId = res.request_id;
    G.offset = 0;
    ls('cm_live', { id: G.req.id, exp: G.req.expires_at });
    tell({ type: 'guest-changed', id: G.req.id });
    showLive(true);
    play('sent');
    buzz([30, 40, 60]);
    watch(G.req.id);
    setTimeout(function () { refresh(G.req && G.req.id); }, 1200);
  }

  function openLive(id) {
    ensureCSS();
    primeAudio();
    var wanted = id || (G.req && G.req.id) || null;
    var go = function () {
      if (!G.req) return toast('That request has closed.', { icon: 'clock' });
      showLive(false);
      watch(G.req.id);
    };
    if (G.req && (!wanted || G.req.id === wanted) && Date.now() - G.lastFetch < 4000) { go(); return api; }
    refresh(wanted).then(go, function (e) { toast(e.message || 'Could not load your request.'); });
    return api;
  }

  function showLive(justSent) {
    var s = openSheet('Your Cabana Match request');
    s.mode = 'live';
    s.el.setAttribute('aria-label', 'Your Cabana Match request');
    s.el.classList.add('cm-live', 'cm-dark');
    var r = G.req;
    G.narrAt = 0; G.narrIdx = -1;
    s.stage.innerHTML =
      '<div class="cm-body">' +
        '<div class="cm-live-top"><span class="cm-pill"><i></i><span class="cm-pill-t">Live</span></span>' +
        '<span class="cm-beat cm-num" aria-live="off"></span>' +
        '<button type="button" class="cm-snd" data-cm="sound" aria-pressed="false" aria-label="Sound"></button>' +
        '<span class="cm-timer cm-num" aria-label="Time left"></span></div>' +
        '<div class="cm-live-where"></div>' +
        '<div class="cm-live-when"></div>' +
        '<div class="cm-radar' + (justSent ? ' is-sent' : '') + '" aria-hidden="true">' +
          '<svg class="cm-clock" viewBox="0 0 100 100"><circle class="trk" cx="50" cy="50" r="48.5"/><circle class="arc" cx="50" cy="50" r="48.5"/></svg>' +
          '<div class="cm-radar-disc"></div><div class="cm-radar-ring r1"></div><div class="cm-radar-ring r2"></div><div class="cm-radar-ring r3"></div>' +
          '<div class="cm-radar-sweep"></div><div class="cm-radar-dots"></div>' +
          '<div class="cm-burst"><i></i><i></i><i></i></div>' +
          '<div class="cm-radar-you"></div>' +
        '</div>' +
        '<div class="cm-narr" aria-live="polite"><span class="cm-narr-ico"></span><span class="cm-narr-t"></span></div>' +
        '<div class="cm-stats">' +
          '<div class="cm-stat"><b class="cm-num" data-s="notified">0</b><span>alerted</span></div>' +
          '<div class="cm-stat is-seen"><b class="cm-num" data-s="seen">0</b><span>seen it</span></div>' +
          '<div class="cm-stat is-offer"><b class="cm-num" data-s="offers">0</b><span>offers</span></div>' +
        '</div>' +
        '<div class="cm-offers-h"><h3>Offers</h3><small class="cm-offers-sub"></small></div>' +
        '<div class="cm-offers" aria-live="polite"></div>' +
        '<div class="cm-feed-h"><h3>Live activity</h3></div>' +
        '<ol class="cm-feed" aria-label="Live activity"></ol>' +
        '<details class="cm-learn"><summary>What happens now' + svg('down') + '</summary><ol>' +
          '<li>Hosts with a stay free for your dates are alerted, nearest first.</li>' +
          '<li>Offers land here the moment they are sent. We’ll notify you too, so you can leave this page.</li>' +
          '<li>A special price is held for you for 48 hours. Chat first or book straight away.</li>' +
        '</ol></details>' +
      '</div>' +
      '<div class="cm-foot cm-live-foot"></div>';
    if (r) {
      $('.cm-live-where', s.stage).textContent = r.label || r.location || 'Your request';
      $('.cm-live-when', s.stage).textContent = [rangeShort(r.checkin, r.checkout), plural(r.nights || nightsOf(r.checkin, r.checkout), 'night'), plural(r.guests || 1, 'guest')]
        .concat(r.bedrooms ? [plural(r.bedrooms, 'bedroom') + '+'] : []).join(' · ');
      feedSeed(r);
      loadWeather(r);
    }
    paintSound();
    updateLive(true);
    renderFeed(true);
    startLiveTimers();
    renderFloat();
    if (isLive()) ambStart();
  }

  /* ── what the guest hears while hosts look ──────────────────────
     A quiet generative score tied to the real radar, never to a loop:
     a soft pad that brightens as the request is seen and opens into a
     major chord when an offer lands; a sonar ping each sweep; and a
     note for every host on the scope as the beam crosses it, pitched by
     how far out they sit and voiced by where they are (waiting, seen,
     offered). It plays only while this sheet is open, the request is
     live and the tab is visible, and the speaker button turns it off
     for good. */
  var SWEEP_S = 3.6;
  var AMB = { on: false, bus: null, pad: null, timer: null, rev: 0 };
  var PENTA = [587.33, 659.25, 739.99, 880, 987.77, 1174.66, 1318.51];
  function ambNote(ac, t, f, len, vol, type, partial) {
    if (!AMB.bus) return;
    var o = ac.createOscillator(), g = ac.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(f, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    o.connect(g); g.connect(AMB.bus);
    o.start(t); o.stop(t + len + 0.05);
    if (partial) {
      var o2 = ac.createOscillator(), g2 = ac.createGain();
      o2.type = 'sine'; o2.frequency.setValueAtTime(f * partial, t);
      g2.gain.setValueAtTime(0.0001, t);
      g2.gain.exponentialRampToValueAtTime(vol * 0.35, t + 0.01);
      g2.gain.exponentialRampToValueAtTime(0.0001, t + len * 0.6);
      o2.connect(g2); g2.connect(AMB.bus); o2.start(t); o2.stop(t + len);
    }
  }
  function ambChord() {
    var rd = G.radar || {};
    if (G.offers.length) return [146.83, 220, 293.66, 369.99];
    if (rd.seen) return [146.83, 220, 293.66, 329.63];
    return [146.83, 220, 293.66];
  }
  function ambStart() {
    if (AMB.on || !soundOn() || !isLive() || D.visibilityState !== 'visible') return;
    var ac = audio(true);
    if (!ac) return;
    if (ac.state !== 'running') { paintSound(); return; }
    AMB.on = true;
    var t = ac.currentTime;
    var master = ac.createGain();
    master.gain.setValueAtTime(0.0001, t);
    master.gain.exponentialRampToValueAtTime(0.85, t + 1.6);
    master.connect(ac.destination);
    var delay = ac.createDelay(1.5), fb = ac.createGain(), lp = ac.createBiquadFilter(), dry = ac.createGain();
    delay.delayTime.value = SWEEP_S / 8;
    fb.gain.value = 0.34; lp.type = 'lowpass'; lp.frequency.value = 2600;
    delay.connect(lp); lp.connect(fb); fb.connect(delay); lp.connect(master);
    dry.gain.value = 1; dry.connect(master); dry.connect(delay);
    var padF = ac.createBiquadFilter(); padF.type = 'lowpass'; padF.frequency.value = 380; padF.Q.value = 0.6;
    var padG = ac.createGain(); padG.gain.setValueAtTime(0.0001, t); padG.gain.exponentialRampToValueAtTime(0.05, t + 4);
    padF.connect(padG); padG.connect(master);
    var lfo = ac.createOscillator(), lfoG = ac.createGain();
    lfo.frequency.value = 0.06; lfoG.gain.value = 140; lfo.connect(lfoG); lfoG.connect(padF.frequency); lfo.start(t);
    var oscs = ambChord().map(function (f, i) {
      var o = ac.createOscillator(), g = ac.createGain();
      o.type = i % 2 ? 'triangle' : 'sine';
      o.frequency.value = f; o.detune.value = (i - 1.5) * 4;
      g.gain.value = 0.22;
      o.connect(g); g.connect(padF); o.start(t);
      return { o: o, g: g };
    });
    AMB.bus = dry;
    AMB.pad = { master: master, padF: padF, padG: padG, lfo: lfo, oscs: oscs, delay: delay, fb: fb, lp: lp };
    AMB.rev = 0;
    ambSchedule();
    AMB.timer = setInterval(ambSchedule, SWEEP_S * 1000);
    paintSound();
  }
  function ambRetune() {
    if (!AMB.on || !AMB.pad) return;
    var ac = audio(false), chord = ambChord();
    if (!ac) return;
    AMB.pad.oscs.forEach(function (x, i) {
      var f = chord[i] || chord[chord.length - 1] * 1.5;
      x.o.frequency.setTargetAtTime(f, ac.currentTime, 0.8);
    });
    AMB.pad.padF.frequency.setTargetAtTime(G.offers.length ? 900 : (G.radar && G.radar.seen ? 560 : 380), ac.currentTime, 1.2);
  }
  function ambStop(fade) {
    if (!AMB.on) { paintSound(); return; }
    AMB.on = false;
    clearInterval(AMB.timer); AMB.timer = null;
    var ac = audio(false), pad = AMB.pad;
    AMB.bus = null; AMB.pad = null;
    if (ac && pad) {
      var t = ac.currentTime;
      try {
        pad.master.gain.cancelScheduledValues(t);
        pad.master.gain.setValueAtTime(Math.max(0.0001, pad.master.gain.value), t);
        pad.master.gain.exponentialRampToValueAtTime(0.0001, t + (fade ? 1.4 : 0.25));
      } catch (e) {}
      setTimeout(function () {
        try { pad.oscs.forEach(function (x) { x.o.stop(); }); pad.lfo.stop(); pad.master.disconnect(); } catch (e) {}
      }, fade ? 1600 : 400);
    }
    paintSound();
  }
  /* One revolution of the beam, scheduled against the sweep the guest
     sees, so a dot sounds as the light crosses it. */
  function ambSchedule() {
    if (!AMB.on) return;
    var ac = audio(false);
    if (!ac || ac.state !== 'running' || !S || S.mode !== 'live') return;
    var now = ac.currentTime + 0.05;
    var phase = sweepPhase();
    var rev = AMB.rev++;
    var startIn = ((1 - phase) % 1) * SWEEP_S;        // seconds until the beam is back at the top
    ambNote(ac, now + startIn, 1760, 1.1, 0.035, 'sine', 2.01);
    var dots = $$('.cm-radar-dots .cm-dot', S.stage);
    var waiting = 0, seen = 0;
    dots.forEach(function (d, i) {
      var ph = +d.getAttribute('data-ph') || 0, rr = +d.getAttribute('data-r') || 0.5;
      var at = now + (((ph - phase) % 1 + 1) % 1) * SWEEP_S;
      var pitch = PENTA[Math.min(PENTA.length - 1, Math.floor((1 - rr) * PENTA.length))];
      var st = d.getAttribute('data-s') || '';
      if (st === 'is-offer') ambNote(ac, at, pitch * 2, 1.4, 0.05, 'sine', 2.76);
      else if (st === 'is-seen' && seen++ < 6) ambNote(ac, at, pitch, 0.7, 0.04, 'triangle');
      else if (!st && rev % 2 === 0 && waiting++ < 4) ambNote(ac, at, pitch / 2, 0.35, 0.018, 'sine');
    });
  }
  function sweepPhase() {
    var el = S && $('.cm-radar-sweep', S.stage);
    try {
      var an = el && el.getAnimations && el.getAnimations()[0];
      if (an && an.currentTime != null) return ((an.currentTime / 1000) % SWEEP_S) / SWEEP_S;
    } catch (e) {}
    return 0;
  }
  function paintSound() {
    var b = S && S.mode === 'live' && $('.cm-snd', S.stage);
    if (!b) return;
    var on = soundOn(), ac = audio(false), blocked = on && (!ac || ac.state !== 'running');
    b.innerHTML = svg(on && !blocked ? 'speaker' : 'mute');
    b.setAttribute('aria-pressed', String(on && !blocked));
    b.setAttribute('aria-label', on && !blocked ? 'Sound on. Turn off' : 'Sound off. Turn on');
    b.title = on && !blocked ? 'Sound on' : 'Tap for sound';
    b.classList.toggle('is-on', on && !blocked);
    b.classList.toggle('is-playing', !!AMB.on);
  }
  function toggleSound() {
    var on = !(soundOn() && AMB.on);
    ls('cm_sound', on);
    if (on) { primeAudio(); setTimeout(function () { ambStart(); paintSound(); }, 60); }
    else ambStop(false);
    paintSound();
  }
  D.addEventListener('visibilitychange', function () {
    if (D.visibilityState !== 'visible') ambStop(false);
    else if (S && S.mode === 'live') ambStart();
  });

  /* ── live activity: what actually happened, when ────────────────── */
  function feedKey(id) { return 'cm_feed_' + id; }
  function feedGet(id) { var f = ss(feedKey(id)); return Array.isArray(f) ? f : []; }
  function feedPush(id, kind, text, at) {
    if (!uuid(id)) return;
    var f = feedGet(id);
    f.unshift({ k: kind, t: text, at: at || Date.now(), n: 1 });
    ss(feedKey(id), f.slice(0, 40));
    if (S && S.mode === 'live' && G.req && G.req.id === id) renderFeed(false);
  }
  /* Several hosts opening the request in a burst is one event that grew,
     not a column of identical lines. */
  function feedBump(id, kind, k, one, many) {
    var f = feedGet(id), top = f[0];
    if (top && top.k === kind && Date.now() - top.at < 3 * 60000) {
      top.n = (top.n || 1) + k;
      top.t = top.n === 1 ? one : many(top.n);
      top.at = Date.now();
      ss(feedKey(id), f);
      if (S && S.mode === 'live' && G.req && G.req.id === id) renderFeed(false);
      return;
    }
    feedPush(id, kind, k === 1 ? one : many(k));
    var g = feedGet(id); if (g[0]) { g[0].n = k; ss(feedKey(id), g); }
  }
  function feedSeed(r) {
    if (!r || !uuid(r.id) || feedGet(r.id).length) return;
    var rd = G.radar || {};
    var at = r.created_at ? new Date(r.created_at).getTime() : Date.now();
    feedPush(r.id, 'send', 'Request sent' + (rd.notified ? ' · ' + plural(rd.notified, 'host') + ' alerted' : ''), at);
  }
  var FEED_ICO = { send: 'send', seen: 'eye', offer: 'spark', pass: 'minus', extend: 'clock', close: 'x', end: 'clock', book: 'check', wx: 'sun' };
  function renderFeed(first) {
    if (!S || S.mode !== 'live' || !G.req) return;
    var ol = $('.cm-feed', S.stage);
    if (!ol) return;
    var f = feedGet(G.req.id).slice(0, 8);
    var sig = f.map(function (x) { return x.at + x.k + (x.n || 1); }).join(',');
    if (ol.getAttribute('data-sig') !== sig) {
      var before = ol.getAttribute('data-top');
      ol.innerHTML = f.map(function (x, i) {
        var fresh = !first && i === 0 && before !== String(x.at);
        return '<li class="cm-feed-i k-' + esc(x.k) + (fresh ? ' is-new' : '') + '">' + svg(FEED_ICO[x.k] || 'radar') +
          '<span class="cm-feed-t">' + esc(x.t) + '</span><time class="cm-num" data-at="' + x.at + '"></time></li>';
      }).join('');
      ol.setAttribute('data-sig', sig);
      ol.setAttribute('data-top', f[0] ? String(f[0].at) : '');
    }
    $$('time', ol).forEach(function (t) {
      var d = (Date.now() - +t.getAttribute('data-at')) / 1000;
      t.textContent = d < 45 ? 'now' : d < 3600 ? Math.round(d / 60) + ' min' : Math.round(d / 3600) + ' h';
    });
  }
  /* What changed between two reads of the request, as plain events. */
  function feedDiff(prev, st) {
    var r = st.request, id = r.id, rd = st.radar || {}, p = prev || {};
    if (p.seen != null && rd.seen > p.seen) {
      feedBump(id, 'seen', rd.seen - p.seen, 'A host opened your request', function (n) { return plural(n, 'host') + ' opened your request'; });
      play('seen'); buzz(18);
    }
    if (p.passed != null && rd.passed > p.passed) {
      feedBump(id, 'pass', rd.passed - p.passed, 'A host can’t take this one', function (n) { return plural(n, 'host') + ' can’t take this one'; });
      play('pass');
    }
    if (p.status && p.status !== r.status) {
      if (r.status === 'expired') { feedPush(id, 'end', 'Time is up · the request has closed'); play('close'); }
      else if (r.status === 'booked') feedPush(id, 'book', 'Booked');
      else if (r.status === 'closed' && G._closedByMe !== id) feedPush(id, 'close', 'The request has closed');
    }
  }

  /* ── the line under the radar: real facts, one at a time ────────── */
  function loadWeather(r) {
    if (!r || G.wxFor === r.id) return;
    G.wxFor = r.id; G.wx = null;
    var q = num(r.lat) != null && num(r.lng) != null ? 'lat=' + r.lat + '&lng=' + r.lng : 'city=' + encodeURIComponent(placeOf(r));
    try {
      fetch('/api/utilities?action=weather&' + q).then(function (res) { return res.ok ? res.json() : null; }).then(function (w) {
        if (!w || !w.live || !w.current || G.wxFor !== r.id) return;
        G.wx = { temp: Math.round(w.current.temp), label: String(w.current.label || '').toLowerCase(), day: !!w.current.isDay };
      }).catch(function () {});
    } catch (e) {}
  }
  function narrLines() {
    var r = G.req, rd = G.radar || {}, L = [];
    if (!r) return L;
    var place = placeOf(r), live = isLive();
    if (r.status === 'booked') return [{ i: 'check', t: 'Booked. Enjoy ' + place + '.' }];
    if (!live) {
      if (G.offers.length) L.push({ i: 'spark', t: plural(G.offers.length, 'offer') + ' held for you for 48 hours' });
      else L.push({ i: 'clock', t: 'This request has closed' });
      return L;
    }
    if (G.offers.length) {
      var low = Math.min.apply(null, G.offers.map(function (o) { return num(o.nightly) || 9e15; }));
      L.push({ i: 'spark', t: plural(G.offers.length, 'offer') + ' in · from ' + gmoney(low) + ' a night' });
    }
    if (rd.notified) L.push({ i: 'radar', t: 'Ringing ' + plural(rd.notified, 'host') + ' within ' + (r.radius_km || 25) + ' km of ' + place });
    if (rd.seen) L.push({ i: 'eye', t: plural(rd.seen, 'host') + ' opened your request' + (G.offers.length ? '' : ' · they’re checking dates and pricing') });
    else if (rd.notified) L.push({ i: 'bell', t: 'Hosts get an alert on their phone the moment you send' });
    L.push({ i: 'tag', t: 'Hosts can reply with a price only you can book' });
    if (G.wx) L.push({ i: 'sun', t: 'Right now in ' + place + ': ' + G.wx.temp + '° and ' + G.wx.label });
    var push = false;
    try { push = 'Notification' in global && Notification.permission === 'granted'; } catch (e) {}
    L.push({ i: 'bell', t: push ? 'Alerts are on. You can leave this page' : 'You can leave this page. Offers wait here for you' });
    L.push({ i: 'shield', t: 'Nothing is committed until you pay' });
    return L;
  }
  function tickNarr(force) {
    if (!S || S.mode !== 'live') return;
    var box = $('.cm-narr', S.stage);
    if (!box) return;
    var L = narrLines();
    if (!L.length) return;
    if (!force && Date.now() - (G.narrAt || 0) < 5200) return;
    G.narrAt = Date.now();
    G.narrIdx = ((G.narrIdx || 0) + 1) % L.length;
    if (force) G.narrIdx = 0;
    var line = L[G.narrIdx];
    var t = $('.cm-narr-t', box), ico = $('.cm-narr-ico', box);
    if (t.textContent === line.t) return;
    box.classList.remove('is-in'); void box.offsetWidth; box.classList.add('is-in');
    t.textContent = line.t;
    ico.innerHTML = svg(line.i);
  }

  function dotsFor(total) {
    var n = Math.min(total, 28), out = [], seed = (hash(G.req && G.req.id) % 360) * Math.PI / 180;
    for (var i = 0; i < n; i++) {
      var a = seed + i * 2.39996323;                    // the golden angle
      var r = 0.24 + 0.66 * Math.sqrt((i + 0.6) / (n + 0.6));
      var dx = Math.cos(a), dy = Math.sin(a);
      /* Where the beam crosses this dot: clockwise from twelve o'clock,
         as a fraction of one turn. */
      var ph = ((Math.atan2(dx, -dy) / (2 * Math.PI)) + 1) % 1;
      out.push({ x: 50 + dx * r * 46, y: 50 + dy * r * 46, ph: ph, r: r });
    }
    return out;
  }

  function updateLive(first) {
    if (!S || S.mode !== 'live' || !G.req) return;
    var st = S.stage, r = G.req, rd = G.radar || {}, live = isLive();
    var closed = !live;
    var booked = r.status === 'booked';

    var pill = $('.cm-pill', st);
    pill.classList.toggle('is-closed', closed);
    $('.cm-pill-t', st).textContent = booked ? 'Booked' : closed ? 'Closed' : 'Live';
    $('.cm-radar', st).classList.toggle('is-closed', closed);

    /* dots: offers gold, passes faded, seen lit, the rest waiting */
    var box = $('.cm-radar-dots', st), pts = dotsFor(rd.notified || 0);
    if (box.children.length !== pts.length) {
      var phase = sweepPhase();
      box.innerHTML = pts.map(function (p, i) {
        var bd = ((p.ph - phase) * SWEEP_S).toFixed(3);
        return '<i class="cm-dot" data-ph="' + p.ph.toFixed(4) + '" data-r="' + p.r.toFixed(3) + '" style="left:' + p.x.toFixed(2) + '%;top:' + p.y.toFixed(2) +
          '%;animation-delay:' + (first ? i * 45 : 0) + 'ms;--bd:' + bd + 's"></i>';
      }).join('');
    }
    var nOffer = Math.min(rd.offers || 0, pts.length);
    var nPass = Math.min(rd.passed || 0, pts.length - nOffer);
    var nSeen = Math.min(Math.max(0, (rd.seen || 0) - nOffer - nPass), pts.length - nOffer - nPass);
    Array.prototype.forEach.call(box.children, function (d, i) {
      var cls = i < nOffer ? 'is-offer' : i < nOffer + nPass ? 'is-pass' : i < nOffer + nPass + nSeen ? 'is-seen' : '';
      var had = d.getAttribute('data-s') || '';
      if (had !== cls) {
        d.className = 'cm-dot' + (cls ? ' ' + cls : '');
        d.setAttribute('data-s', cls);
        if (!first && cls && cls !== 'is-pass') { d.classList.add('is-ping'); setTimeout(function () { d.classList.remove('is-ping'); }, 1300); }
      }
    });

    setStat(st, 'notified', rd.notified || 0);
    setStat(st, 'seen', rd.seen || 0);
    setStat(st, 'offers', G.offers.length);

    renderOffers(st, closed);
    renderLiveFoot(st, live, booked);
    ambRetune();
    if (!live) ambStop(true);
    tickNarr(first);
    tickLive();
  }
  function setStat(st, k, v) {
    var b = $('[data-s="' + k + '"]', st);
    if (!b) return;
    if (b.textContent !== String(v)) {
      b.textContent = v;
      b.classList.remove('is-bump'); void b.offsetWidth; b.classList.add('is-bump');
    }
  }

  function renderOffers(st, closed) {
    var wrap = $('.cm-offers', st), sub = $('.cm-offers-sub', st);
    var offers = G.offers.slice().sort(function (a, b) { return (num(a.stay_total) || 9e15) - (num(b.stay_total) || 9e15); });
    if (!offers.length) {
      var rd = G.radar || {};
      sub.textContent = '';
      wrap.innerHTML = closed
        ? '<div class="cm-waiting is-closed">' + svg('clock') + '<span>' + (rd.notified ? 'No offers this time. Hosts near ' + esc(placeOf(G.req)) + ' were busy.' : 'This request has closed.') + '</span></div>'
        : '<div class="cm-waiting"><span class="cm-dots"><i></i><i></i><i></i></span><span>' +
          (rd.seen ? plural(rd.seen, 'host') + ' opened your request. Offers usually land within minutes.' : 'Alerting ' + plural(rd.notified || 0, 'host') + ' near ' + esc(placeOf(G.req)) + '…') +
          '</span></div>';
      return;
    }
    sub.textContent = offers.length > 1 ? 'Lowest total first' : '';
    var waitingEl = $('.cm-waiting', wrap);
    if (waitingEl) waitingEl.remove();
    var order = offers.map(function (o) { return o.id; });
    offers.forEach(function (o) {
      var el = wrap.querySelector('[data-offer="' + o.id + '"]');
      var sig = [o.status, o.nightly, o.note, o.photo].join('|');
      if (!el) {
        el = D.createElement('article');
        el.className = 'cm-offer is-in' + (G.fresh[o.id] ? ' is-new' : '');
        el.setAttribute('data-offer', o.id);
        wrap.appendChild(el);
        (function (x) { setTimeout(function () { x.classList.remove('is-in'); }, 4200); })(el);
      }
      if (el.getAttribute('data-sig') !== sig) {
        el.setAttribute('data-sig', sig);
        el.innerHTML = offerHTML(o);
      }
    });
    $$('[data-offer]', wrap).forEach(function (el) { if (order.indexOf(el.getAttribute('data-offer')) === -1) el.remove(); });
    /* Move a card only when it is out of place: re-inserting a node
       restarts its entrance and would blink every card on each refresh. */
    order.forEach(function (id, i) {
      var el = wrap.querySelector('[data-offer="' + id + '"]');
      if (el && wrap.children[i] !== el) wrap.insertBefore(el, wrap.children[i] || null);
    });
  }

  function offerHTML(o) {
    var nightly = num(o.nightly), list = num(o.list_nightly), nights = num(o.nights) || 1;
    var off = list && nightly && nightly < list ? Math.round((1 - nightly / list) * 100) : 0;
    var total = num(o.stay_total) || (nightly ? nightly * nights : null);
    var fee = num(o.service_fee) || 0;
    var meta = [];
    if (o.area || o.city) meta.push('<span>' + svg('pin') + esc(o.area || o.city) + (o.distance_km != null ? ' · ' + fmtKm(o.distance_km) : '') + '</span>');
    if (o.beds != null) meta.push('<span>' + svg('bed') + (o.beds === 0 ? 'Studio' : plural(o.beds, 'bed')) + '</span>');
    if (num(o.rating) && num(o.reviews)) meta.push('<span>' + svg('star') + Number(o.rating).toFixed(1) + ' (' + o.reviews + ')</span>');
    return '<div class="cm-offer-photo">' + (o.photo ? img(o.photo, 224, 190, o.title) : svg('home', 'cm-ph')) +
        (off >= 3 ? '<span class="cm-offer-tag">' + off + '% off</span>' : '') + '</div>' +
      '<div class="cm-offer-main">' +
        '<div class="cm-offer-title">' + esc(o.title || 'A stay for you') + '</div>' +
        '<div class="cm-offer-meta">' + meta.join('') + '</div>' +
        '<div class="cm-offer-meta"><span>' + esc(o.host_name || 'Host') + '</span>' +
          (o.host_verified ? '<span class="cm-verified">' + svg('shield') + 'Verified</span>' : '') + '</div>' +
        '<div class="cm-offer-price"><b class="cm-num">' + gmoney(nightly) + '</b>' + (off >= 1 ? '<s class="cm-num">' + (fxOn() ? gmoney(list).replace(/^≈\s*/, '') : plain(list)) + '</s>' : '') +
          '<small class="cm-num">' + (total ? gmoney(total + fee) + ' total · ' + plural(nights, 'night') : '') + '</small>' +
          (fxOn() && total ? '<small class="cm-num cm-kes">' + money(total + fee) + ' · you pay in KES</small>' : '') + '</div>' +
      '</div>' +
      (o.note ? '<div class="cm-offer-note">“' + esc(o.note) + '”</div>' : '') +
      '<div class="cm-offer-actions">' +
        '<button type="button" data-cm="chat" data-id="' + esc(o.id) + '">' + svg('chat') + '<span>Chat</span></button>' +
        '<button type="button" class="cm-book" data-cm="book" data-id="' + esc(o.id) + '">' + (o.status === 'booked' ? 'Booked' : 'View &amp; book') + svg('arrow') + '</button>' +
      '</div>';
  }

  function renderLiveFoot(st, live, booked) {
    var f = $('.cm-live-foot', st);
    var key = live ? 'live:' + (G.req.extensions_used || 0) + ':' + (remaining() < 10 * 60000 ? 1 : 0) + ':' + (G.confirm ? 1 : 0) : booked ? 'booked' : 'closed:' + G.offers.length;
    if (f.getAttribute('data-k') === key) return;
    f.setAttribute('data-k', key);
    f.classList.toggle('is-confirm', !!(live && G.confirm));
    if (live && G.confirm) {
      f.innerHTML = '<div class="cm-confirm" role="alertdialog" aria-labelledby="cm-confirm-t">' +
        '<b id="cm-confirm-t">Close this request?</b>' +
        '<span>Hosts stop seeing it straight away.' + (G.offers.length ? ' The ' + plural(G.offers.length, 'offer') + ' you have stay yours for 48 hours.' : '') + '</span>' +
        '<div class="cm-confirm-a"><button type="button" class="cm-ghost" data-cm="cancel-no">Keep it live</button>' +
        '<button type="button" class="cm-danger" data-cm="cancel-yes">Close request</button></div></div>';
      setTimeout(function () { var y = $('[data-cm="cancel-no"]', f); if (y) y.focus({ preventScroll: true }); }, 30);
      return;
    }
    if (live) {
      var canExtend = (G.req.extensions_used || 0) < 2 && remaining() < 10 * 60000;
      f.innerHTML = (canExtend
        ? '<button type="button" class="cm-ghost" data-cm="extend">' + svg('clock') + ' 10 more minutes</button>'
        : '<button type="button" class="cm-ghost" data-cm="close">Keep browsing</button>') +
        '<button type="button" class="cm-ghost is-quiet" data-cm="cancel">Close request</button>';
    } else if (G.offers.length) {
      f.innerHTML = '<button type="button" class="cm-ghost" data-cm="again">' + svg('radar') + ' New request</button>' +
        '<button type="button" class="cm-ghost" data-cm="done">Done</button>';
    } else {
      f.innerHTML = '<button type="button" class="cm-ghost" data-cm="wider">' + svg('radar') + ' Try a wider area</button>' +
        '<button type="button" class="cm-ghost" data-cm="' + (hooks.browse ? 'browse' : 'done') + '">' + (hooks.browse ? 'Browse stays' : 'Done') + '</button>';
    }
  }

  function tickLive() {
    var left = remaining(), live = isLive();
    if (S && S.mode === 'live') {
      var t = $('.cm-timer', S.stage);
      if (t) {
        t.textContent = live ? clock(left) : (G.req && G.req.status === 'booked' ? '' : G.offers.length ? 'Offers held 48 h' : '');
        t.classList.toggle('is-low', live && left < 3 * 60000);
      }
      if (live && left < 10 * 60000) renderLiveFoot(S.stage, true, false);
      /* The ring around the scope is the time left, draining. */
      var arc = $('.cm-clock .arc', S.stage);
      if (arc && G.req) {
        var total = Math.max(60000, new Date(G.req.expires_at).getTime() - new Date(G.req.created_at || Date.now()).getTime());
        var frac = live ? clamp(left / total, 0, 1) : 0;
        arc.style.strokeDashoffset = (304.73 * (1 - frac)).toFixed(2);
        arc.classList.toggle('is-low', live && left < 3 * 60000);
      }
      /* A heartbeat, so a quiet minute never looks like a frozen page. */
      var beat = $('.cm-beat', S.stage);
      if (beat) {
        var ago = Math.max(0, Math.round((Date.now() - (G.lastFetch || Date.now())) / 1000));
        beat.textContent = !live ? '' : G.loading ? 'Checking…' : 'Updated ' + (ago < 3 ? 'just now' : ago + 's ago');
        beat.classList.toggle('is-busy', !!G.loading);
      }
      tickNarr(false);
      if (Date.now() - (G.feedAt || 0) > 15000) { G.feedAt = Date.now(); renderFeed(false); }
      if (live && left < 60000 && left > 58000 && !G._lowRung) { G._lowRung = true; play('low'); }
    }
    renderFloatTime();
    if (G.req && G.req.status === 'live' && left <= 0 && !G._expiredOnce) {
      G._expiredOnce = true;
      updateLive(false);
      /* The database closes the request within a minute; fetch the final
         word so the closing state is the real one. */
      setTimeout(function () { refresh(G.req && G.req.id); }, 4000);
      setTimeout(function () { refresh(G.req && G.req.id); }, 65000);
    }
  }

  function startLiveTimers() {
    if (!G.tick) G.tick = setInterval(tickLive, 1000);
    if (!G.poll) G.poll = setInterval(function () {
      if (D.visibilityState !== 'visible' || !G.req) return;
      if (isLive() || (S && S.mode === 'live')) refresh(G.req.id);
    }, isLive() ? 9000 : 30000);
  }
  function stopLiveTimers(all) {
    ambStop(false);
    if (G.poll) { clearInterval(G.poll); G.poll = null; }
    if (all && G.tick) { clearInterval(G.tick); G.tick = null; }
    if (all) unwatch();
  }

  /* One fetch in flight at a time; everything re-renders from it. A call
     for a different request waits for the one in flight, then runs. */
  function refresh(id) {
    var want = uuid(id) ? id : null;
    if (G.loading) {
      if (want && G.loadingId !== want) return G.loading.then(function () { return refresh(want); }, function () { return refresh(want); });
      return G.loading;
    }
    G.loadingId = want;
    G.loading = rpc('cabana_match_state', want ? { p_request: want } : {}, 12000).then(function (st) {
      G.loading = null; G.loadingId = null;
      G.lastFetch = Date.now();
      if (!st || !st.request) {
        if (!want || (G.req && G.req.id === want)) {
          G.req = null; G.offers = []; G.radar = null; G.seededId = null;
          ls('cm_live', null);
          unwatch();
        }
        renderFloat();
        return null;
      }
      /* Offers are announced only against a baseline for the same
         request, so opening a page never rings for old news. */
      var fresh = [];
      if (G.seededId === st.request.id) {
        (st.offers || []).forEach(function (o) { if (!G.known[o.id]) { G.known[o.id] = 1; fresh.push(o); G.fresh[o.id] = 1; } });
      } else {
        G.known = {};
        (st.offers || []).forEach(function (o) { G.known[o.id] = 1; });
      }
      G.seededId = st.request.id;
      /* A close the guest just asked for stands while the server catches up. */
      if (G._closingId === st.request.id && st.request.status === 'live') st.request.status = 'closed';
      var prevSnap = G.req && G.req.id === st.request.id && G.radar
        ? { seen: G.radar.seen, passed: G.radar.passed, status: G.req.status } : null;
      G.req = st.request;
      G.radar = st.radar || {};
      if (prevSnap) feedDiff(prevSnap, st);
      fresh.forEach(function (o) {
        feedPush(st.request.id, 'offer', 'Offer · ' + (o.title || 'A stay') + ' · ' + gmoney(o.nightly) + ' a night', o.created_at ? new Date(o.created_at).getTime() : Date.now());
      });
      G.offers = st.offers || [];
      G.offset = st.server_time ? new Date(st.server_time).getTime() - Date.now() : 0;
      if (G.req.status === 'live') { G._expiredOnce = false; ls('cm_live', { id: G.req.id, exp: G.req.expires_at }); }
      else ls('cm_live', null);
      if (fresh.length) announceOffers(fresh);
      if (S && S.mode === 'live') updateLive(false);
      if (isLive()) { watch(G.req.id); startLiveTimers(); }
      else if (!(S && S.mode === 'live')) { stopLiveTimers(false); unwatch(); }
      if (!G.tick) G.tick = setInterval(tickLive, 1000);
      renderFloat();
      return st;
    }, function (e) { G.loading = null; G.loadingId = null; throw e; });
    return G.loading;
  }

  var _announced = 0;
  function announceOffers(list, note) {
    if (Date.now() - _announced < 2500) return;     // realtime and push can both carry one offer
    _announced = Date.now();
    var o = list && list[list.length - 1];
    play('offer');
    buzz([40, 60, 120]);
    bumpFloat();
    if (!(S && S.mode === 'live')) {
      var title, sub;
      if (o) {
        var off = num(o.list_nightly) && num(o.nightly) < num(o.list_nightly);
        title = (off ? 'Special offer · ' : 'New offer · ') + (o.title || 'A stay');
        sub = money(o.nightly) + ' a night' + (list.length > 1 ? ' · +' + (list.length - 1) + ' more' : '');
      } else {
        title = note && note.title || 'A host sent you an offer';
        sub = note && note.body || '';
      }
      toast(title, { sub: sub, icon: 'spark', ms: 6500, action: function () { openLive(G.req && G.req.id); } });
    }
    if (list) setTimeout(function () { list.forEach(function (x) { delete G.fresh[x.id]; }); }, 6000);
  }

  function watch(id) {
    if (!uuid(id) || G.chanId === id) return;
    unwatch();
    var c = client();
    if (!c || !c.channel) return;
    var again = throttle(function () { refresh(id); }, 700);
    try {
      G.chan = c.channel('cm-guest-' + id)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'cabana_match_requests', filter: 'id=eq.' + id }, again)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'cabana_match_responses', filter: 'request_id=eq.' + id }, again)
        .subscribe();
      G.chanId = id;
    } catch (e) { G.chan = null; G.chanId = null; }
  }
  function unwatch() {
    if (G.chan) { try { var c = client(); if (c && c.removeChannel) c.removeChannel(G.chan); else G.chan.unsubscribe(); } catch (e) {} }
    G.chan = null; G.chanId = null;
  }
  function throttle(fn, ms) {
    var t = null, pending = false;
    return function () {
      if (t) { pending = true; return; }
      fn();
      t = setTimeout(function () { t = null; if (pending) { pending = false; fn(); } }, ms);
    };
  }

  function extend(btn) {
    if (!G.req) return;
    btn.disabled = true;
    btn.classList.add('is-busy');
    var lbl = btn.innerHTML;
    btn.innerHTML = '<span class="cm-spin"></span>Adding time…';
    rpc('cabana_match_extend', { p_request: G.req.id }).then(function (r) {
      G.req.expires_at = r.expires_at;
      G.req.extensions_used = r.extensions_used;
      G._expiredOnce = false; G._lowRung = false;
      feedPush(G.req.id, 'extend', '10 more minutes added');
      toast('10 more minutes', { icon: 'clock' });
      ls('cm_live', { id: G.req.id, exp: G.req.expires_at });
      updateLive(false);
      refresh(G.req.id);
    }, function (e) { btn.disabled = false; btn.classList.remove('is-busy'); btn.innerHTML = lbl; toast(e.message); });
  }

  function cancelReq() {
    if (!G.req || !isLive()) return;
    G.confirm = true;
    if (S && S.mode === 'live') renderLiveFoot(S.stage, true, false);
  }
  /* The close used to wait for the server, then for a full reload of the
     request, before anything on screen moved, behind a "tap again"
     that looked like nothing had happened. Now the guest confirms once,
     the request reads closed that instant, and the server is told in
     the background. If it refuses, the request comes back live and the
     guest is told why. */
  function cancelConfirm(yes) {
    if (!G.req) return;
    if (!yes) { G.confirm = false; if (S && S.mode === 'live') renderLiveFoot(S.stage, true, false); return; }
    var id = G.req.id, before = { status: G.req.status, exp: G.req.expires_at };
    G.confirm = false;
    G._closingId = id; G._closedByMe = id;
    G.req.status = 'closed';
    ls('cm_live', null);
    feedPush(id, 'close', 'You closed the request');
    play('close'); buzz(20);
    ambStop(true);
    if (S && S.mode === 'live') updateLive(false);
    renderFloat();
    var hadOffers = G.offers.length;
    if (!hadOffers) {
      setTimeout(function () {
        if (S && S.mode === 'live' && G.req && G.req.id === id && G.req.status !== 'live') {
          closeSheet();
          toast('Request closed', { icon: 'check', sub: 'Hosts no longer see it.' });
        }
      }, 700);
    }
    rpc('cabana_match_close', { p_request: id }).then(function () {
      G._closingId = null;
      tell({ type: 'guest-changed', id: id });
      track('match_close');
      refresh(id);
    }, function (e) {
      G._closingId = null;
      if (G.req && G.req.id === id) {
        G.req.status = before.status;
        G.req.expires_at = before.exp;
        if (isLive()) ls('cm_live', { id: id, exp: before.exp });
      }
      toast('Couldn’t close it, so it’s still live', { icon: 'bolt', sub: e.message, ms: 6000, action: function () { openLive(id); } });
      if (S && S.mode === 'live') { updateLive(false); if (isLive()) ambStart(); }
      renderFloat();
    });
  }

  function engage(offerId, how, btn) {
    var o = G.offers.filter(function (x) { return x.id === offerId; })[0];
    if (!o) return;
    if (btn) {
      if (btn.classList.contains('is-busy')) return;
      btn.classList.add('is-busy'); btn.disabled = true;
      setTimeout(function () { if (btn.isConnected) { btn.classList.remove('is-busy'); btn.disabled = false; } }, 6000);
    }
    track('match_offer_' + how);
    var p = rpc('cabana_match_engage', { p_response: offerId }).catch(function () {
      return { conversation_id: o.conversation_id, listing_id: o.listing_id, checkin: G.req.checkin, checkout: G.req.checkout, guests: G.req.guests };
    });
    if (how === 'chat') {
      p.then(function (r) {
        var conv = r && r.conversation_id || o.conversation_id;
        if (conv && global.CabanaChat && global.CabanaChat.openConversation) { closeSheet(); global.CabanaChat.openConversation(conv); }
        else if (conv) { closeSheet({ navigating: true }); location.href = '/dashboard.html?inbox=1&c=' + encodeURIComponent(conv); }
        else toast('The chat is still being set up. Try again in a moment.', { icon: 'chat' });
      });
      return;
    }
    p.then(function (r) {
      var ctx = { checkin: (r && r.checkin) || G.req.checkin, checkout: (r && r.checkout) || G.req.checkout, guests: (r && r.guests) || G.req.guests, offer: o };
      var lid = (r && r.listing_id) || o.listing_id;
      if (hooks.openListing) {
        closeSheet();
        if (hooks.openListing(lid, ctx) !== false) return;
      }
      closeSheet({ navigating: true });
      location.href = '/apartments?open=' + encodeURIComponent(lid) + '&checkin=' + ctx.checkin + '&checkout=' + ctx.checkout + '&guests=' + ctx.guests;
    });
  }

  /* ── the floating pill: a live request follows you around ────────── */
  var F = null;
  function renderFloat() {
    var show = G.req && !S && (isLive() ||
      (G.offers.length && G.req.status !== 'booked' && !ls('cm_dismiss_' + G.req.id)));
    if (!show) {
      if (F) { F.classList.remove('is-on'); var f = F; F = null; setTimeout(function () { f.remove(); }, 500); }
      return;
    }
    ensureCSS();
    if (!F) {
      F = D.createElement('button');
      F.type = 'button';
      F.className = 'cm-root cm-float';
      F.innerHTML = '<span class="cm-float-orb" aria-hidden="true"><i></i></span><span class="cm-float-txt"><b></b><span class="cm-num"></span></span>';
      F.addEventListener('click', function () { openLive(G.req && G.req.id); });
      D.body.appendChild(F);
      requestAnimationFrame(function () { requestAnimationFrame(function () { if (F) F.classList.add('is-on'); }); });
    }
    var n = G.offers.length;
    F.classList.toggle('has-offers', n > 0);
    F.querySelector('b').textContent = isLive()
      ? (n ? plural(n, 'offer') + ' in' : 'Hosts are looking')
      : plural(n, 'offer') + ' waiting';
    renderFloatTime();
  }
  function renderFloatTime() {
    if (!F || !G.req) return;
    var s = F.querySelector('.cm-float-txt span');
    s.textContent = isLive() ? clock(remaining()) + ' left · ' + placeOf(G.req) : 'Tap to see them';
    F.setAttribute('aria-label', F.querySelector('b').textContent + '. ' + s.textContent);
  }
  function bumpFloat() {
    renderFloat();
    if (!F) return;
    F.classList.remove('is-bump'); void F.offsetWidth; F.classList.add('is-bump');
  }

  /* Picks the guest's request back up on any page, and finishes a
     request that was interrupted by signing in. */
  var _restored = null;
  function restore(opts) {
    opts = opts || {};
    if (_restored && !opts.force) return _restored;
    _restored = user().then(function (u) {
      var pending = ls('cm_pending');
      if (pending && Date.now() - (pending.at || 0) > 45 * 60000) { ls('cm_pending', null); pending = null; }
      var q = new URLSearchParams(location.search), wanted = q.get('match');
      var hashWants = /^#(cabana-match|get-matched|cabana-responses)/.test(location.hash);
      if (!u) {
        if (pending && hooks.apply && opts.applyPending !== false) { try { hooks.apply(pending.crit); } catch (e) {} }
        return null;
      }
      if (pending) {
        ls('cm_pending', null);
        if (hooks.apply) { try { hooks.apply(pending.crit); } catch (e) {} }
        if (pending.edit && hooks.edit) { setTimeout(function () { hooks.edit(pending.edit === 'dates' ? 'checkin' : pending.edit); }, 500); }
        else setTimeout(function () { compose(pending.crit); }, 450);
      }
      return refresh(uuid(wanted) ? wanted : null).then(function (st) {
        if (uuid(wanted)) {
          if (st && st.request) setTimeout(function () { openLive(st.request.id); }, 250);
          else toast('That request is no longer available.', { icon: 'clock' });
          try { q.delete('match'); history.replaceState(history.state, '', location.pathname + (q.toString() ? '?' + q : '') + location.hash); } catch (e) {}
        } else if (hashWants && st && st.request && !pending) {
          setTimeout(function () { openLive(st.request.id); }, 250);
        }
        return st;
      }, function () { return null; });
    });
    return _restored;
  }

  /* ════════════════════════════════════════════════════════════════
     HOST · TAKEOVER
     ════════════════════════════════════════════════════════════════ */
  var H = { open: null, queue: [], repeat: [], inbox: null };

  function handled(id, how) {
    var m = ss('cm_handled') || {};
    if (how === undefined) return m[id] || null;
    m[id] = how;
    ss('cm_handled', m);
    return how;
  }

  function showRequest(id, opts) {
    opts = opts || {};
    if (!uuid(id)) return api;
    ensureCSS();
    ls('cm_host', 1);
    if (H.open && H.open.id === id) { if (opts.alert) ring(id, false); return api; }
    if (opts.alert && handled(id)) return api;
    if (H.open) {
      if (H.queue.indexOf(id) === -1) H.queue.push(id);
      if (opts.alert) { ring(id, false); queueBadge(); }
      return api;
    }
    if (opts.alert && !claim('take-' + id, 6000) && D.visibilityState !== 'visible') return api;
    var t = mountTake(id, opts);
    /* Ring on arrival, not after the round trip. Seconds matter here. */
    if (opts.alert) ring(id, true);
    rpc('cabana_match_host_feed', { p_request: id }).then(function (list) {
      var it = Array.isArray(list) ? list[0] : null;
      if (!H.open || H.open.id !== id) return;
      if (!it) { stopRing(); return takeState(t, 'gone'); }
      t.item = it;
      renderTake(t);
      if (it.live && !it.response && it.delivery_status !== 'passed') {
        rpc('cabana_match_seen', { p_request: id }).catch(function () {});
      } else stopRing();
      markRead(id);
    }, function (e) {
      if (!H.open || H.open.id !== id) return;
      takeState(t, 'error', e.message);
    });
    return api;
  }

  function mountTake(id, opts) {
    var root = D.createElement('div');
    root.className = 'cm-root cm-take cm-dark';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.setAttribute('aria-label', 'Guest request');
    root.innerHTML = '<button type="button" class="cm-x" data-t="later" aria-label="Close">' + svg('x') + '</button>' +
      '<div class="cm-take-inner"><div class="cm-take-load"><span class="cm-dots"><i></i><i></i><i></i></span></div></div>';
    D.body.appendChild(root);
    var t = { key: 'take-' + id, id: id, el: root, item: null, opts: opts, price: null, listing: null, busy: false, touched: false,
      close: function (o) { closeTake(false, o); } };
    H.open = t;
    pushLayer(t);
    root.addEventListener('click', onTakeClick);
    root.addEventListener('input', onTakeInput);
    root.addEventListener('pointerdown', function () { t.touched = true; stopRing(); primeAudio(); }, { passive: true });
    root.addEventListener('keydown', function () { t.touched = true; stopRing(); });
    requestAnimationFrame(function () { root.classList.add('is-on'); });
    tell({ type: 'host-open', id: id });
    return t;
  }

  function closeTake(silent, o) {
    var t = H.open;
    if (!t) return;
    H.open = null;
    stopRing();
    stopTitle();
    clearInterval(t.timer);
    popLayer(t, o);
    t.el.classList.remove('is-on');
    setTimeout(function () { if (t.el.parentNode) t.el.remove(); }, 380);
    if (!silent && t.item && !handled(t.id)) handled(t.id, 'later');
    if (H.inbox) H.inbox.refresh();
    var next = H.queue.shift();
    if (next && !handled(next)) setTimeout(function () { showRequest(next, { alert: false }); }, 420);
  }

  function takeState(t, kind, msg) {
    var inner = $('.cm-take-inner', t.el);
    var it = t.item || {};
    var title = kind === 'gone' ? 'This request isn’t available'
      : kind === 'error' ? 'Couldn’t load the request'
      : kind === 'closed' ? 'This request has closed'
      : kind === 'sent' ? 'Offer sent' : '';
    var body = kind === 'gone' ? 'It may have been withdrawn by the guest.'
      : kind === 'error' ? esc(msg || 'Check your connection and try again.')
      : kind === 'closed' ? (it.response ? 'You sent an offer in time. The chat stays open.' : 'Guests choose within 20 minutes. The next one will ring here too.')
      : '';
    inner.innerHTML = '<div class="cm-take-state">' +
      '<div class="cm-take-state-ico">' + svg(kind === 'error' ? 'bolt' : 'clock') + '</div>' +
      '<h2 class="cm-take-title">' + title + '</h2><p>' + body + '</p>' +
      '<div class="cm-take-actions">' +
        (it.response && it.response.conversation_id ? '<button type="button" class="cm-go" data-t="chat" data-conv="' + esc(it.response.conversation_id) + '">' + svg('chat') + '<span class="cm-go-label">Open chat</span></button>' : '') +
        (kind === 'error' ? '<button type="button" class="cm-go" data-t="reload"><span class="cm-go-label">Try again</span></button>' : '') +
        '<button type="button" class="cm-ghost" data-t="later">Close</button>' +
      '</div></div>';
  }

  function renderTake(t) {
    var it = t.item;
    if (!it.live) return takeState(t, 'closed');
    if (it.response) {
      t.sentConv = it.response.conversation_id;
      return renderSent(t, it.response, true);
    }
    if (it.delivery_status === 'passed') return takeState(t, 'closed');
    var L = it.listings || [];
    if (!L.length) return takeState(t, 'gone');
    t.listing = t.listing && L.filter(function (l) { return l.id === t.listing.id; })[0] || L[0];
    if (t.price == null) t.price = Math.round(num(t.listing.nightly) || 0);
    var inner = $('.cm-take-inner', t.el);
    var guest = it.guest_name || 'A guest';
    var nights = it.nights || nightsOf(it.checkin, it.checkout);
    inner.innerHTML =
      '<div class="cm-take-ring"><svg viewBox="0 0 120 120" aria-hidden="true"><circle class="trk" cx="60" cy="60" r="54"/><circle class="arc" cx="60" cy="60" r="54"/></svg>' +
        '<div class="cm-take-ring-in"><b class="cm-num" data-t-clock>—</b><span>to reply</span></div></div>' +
      '<div class="cm-take-kicker">' + (t.opts.reminder ? 'Still waiting for an answer' : 'New guest request') + (H.queue.length ? ' · <span class="cm-q">+' + H.queue.length + ' more</span>' : '') + '</div>' +
      '<h2 class="cm-take-title">' + esc(guest) + ' needs a stay in ' + esc(placeOf(it)) + '</h2>' +
      '<div class="cm-card">' +
        '<div class="cm-facts">' +
          '<div class="cm-fact"><b class="cm-num">' + nights + '</b><span>' + (nights === 1 ? 'night' : 'nights') + '</span></div>' +
          '<div class="cm-fact"><b class="cm-num">' + (it.guests || 1) + '</b><span>' + (it.guests === 1 ? 'guest' : 'guests') + '</span></div>' +
          '<div class="cm-fact"><b class="cm-num">' + (it.bedrooms ? it.bedrooms + '+' : 'Any') + '</b><span>bedrooms</span></div>' +
        '</div>' +
        '<div class="cm-dates"><span>' + svg('cal') + '<b>' + esc(dayLong(it.checkin)) + '</b> → <b>' + esc(dayLong(it.checkout)) + '</b></span>' +
          (it.best_km != null ? '<span class="cm-km">' + fmtKm(it.best_km) + ' away</span>' : '') + '</div>' +
        (it.band ? '<div class="cm-budget">' + svg('tag') + '<span>Budget ' + esc(it.band) + '</span></div>' : '') +
        (it.notes ? '<div class="cm-quote">“' + esc(it.notes) + '”</div>' : '') +
        '<div class="cm-guest"><span class="cm-guest-av">' + esc(guest.charAt(0).toUpperCase()) + '</span><span>' + esc(guest) +
          (it.guest_verified ? ' · <span class="cm-verified">' + svg('shield') + 'Verified</span>' : '') +
          (it.hosts_notified > 1 ? ' · ' + (it.hosts_notified - 1) + ' other host' + (it.hosts_notified - 1 === 1 ? '' : 's') + ' alerted' : '') + '</span></div>' +
        (L.length > 1 ? '<div class="cm-pick"><div class="cm-label">Offer this stay</div><div class="cm-pick-row">' +
          L.map(function (l) {
            return '<button type="button" class="cm-pick-opt" data-t="pick" data-id="' + esc(l.id) + '" aria-pressed="' + (l.id === t.listing.id) + '">' +
              '<div class="cm-pick-img">' + (l.photo ? img(l.photo, 150, 94, l.title) : '') + '</div>' +
              '<div class="cm-pick-txt"><b>' + esc(l.title || 'Your stay') + '</b><span class="cm-num">' + money(l.nightly) + (l.km != null ? ' · ' + fmtKm(l.km) : '') + '</span></div></button>';
          }).join('') + '</div></div>'
          : '<div class="cm-one">' + (t.listing.photo ? img(t.listing.photo, 64, 52, t.listing.title) : '') +
            '<div><b>' + esc(t.listing.title || 'Your stay') + '</b><span class="cm-num">Listed at ' + money(t.listing.nightly) + ' a night</span></div></div>') +
        '<div class="cm-price"><div class="cm-label">Your price a night</div>' +
          '<div class="cm-price-row">' +
            '<button type="button" class="cm-step" data-t="minus" aria-label="Lower price">' + svg('minus') + '</button>' +
            '<div class="cm-price-box"><em>KES</em><input type="text" inputmode="numeric" autocomplete="off" data-t="price" aria-label="Price a night in KES" value="' + plain(t.price) + '"></div>' +
            '<button type="button" class="cm-step" data-t="plus" aria-label="Raise price">' + svg('plus') + '</button>' +
          '</div>' +
          '<div class="cm-price-hint"></div>' +
          '<div class="cm-quick"></div>' +
        '</div>' +
        '<button type="button" class="cm-more" data-t="note-toggle" aria-expanded="false">' + svg('plus') + 'Add a message</button>' +
        '<div class="cm-note-wrap" hidden><textarea class="cm-note" data-t="note" maxlength="400" rows="3" placeholder="Hi ' + esc(guest) + '! The place is ready for you…"></textarea></div>' +
        '<div class="cm-err" hidden></div>' +
        '<div class="cm-take-actions">' +
          '<button type="button" class="cm-go" data-t="send">' + svg('bolt') + '<span class="cm-go-label"></span></button>' +
          '<button type="button" class="cm-ghost" data-t="pass">Can’t take it</button>' +
          '<button type="button" class="cm-ghost" data-t="later">Later</button>' +
        '</div>' +
      '</div>' +
      '<details class="cm-learn"><summary>How replies work' + svg('down') + '</summary><ol>' +
        '<li>The guest sees your stay, your price and your message the moment you send.</li>' +
        '<li>A price below your listing becomes a private offer only this guest can book, held for 48 hours.</li>' +
        '<li>Fast replies win. Hosts who answer in the first five minutes get most bookings.</li>' +
      '</ol></details>';
    priceUI(t);
    t.timer && clearInterval(t.timer);
    t.timer = setInterval(function () { tickTake(t); }, 1000);
    tickTake(t);
    setTimeout(function () { var b = $('[data-t="send"]', t.el); if (b) try { b.focus({ preventScroll: true }); } catch (e) {} }, 80);
  }

  function tickTake(t) {
    var it = t.item;
    if (!it || !H.open || H.open !== t) return;
    var left = new Date(it.expires_at).getTime() - Date.now();
    var c = $('[data-t-clock]', t.el);
    if (c) c.textContent = clock(left);
    var arc = $('.cm-take-ring .arc', t.el);
    if (arc) {
      var total = Math.max(LIVE_MS, new Date(it.expires_at).getTime() - new Date(it.created_at).getTime());
      var frac = clamp(left / total, 0, 1), C2 = 2 * Math.PI * 54;
      arc.style.strokeDasharray = C2.toFixed(1);
      arc.style.strokeDashoffset = (C2 * (1 - frac)).toFixed(1);
      $('.cm-take-ring', t.el).classList.toggle('is-low', left < 3 * 60000);
    }
    if (left <= 0 && !t.busy && !t.sent) { clearInterval(t.timer); it.live = false; takeState(t, 'closed'); }
  }

  function rateStep(listed) { return listed >= 20000 ? 500 : listed >= 6000 ? 250 : listed >= 2000 ? 100 : 50; }
  function priceUI(t) {
    var it = t.item, listed = Math.round(num(t.listing.nightly) || 0), floor = Math.ceil(listed * 0.2);
    var p = t.price, nights = it.nights || nightsOf(it.checkin, it.checkout) || 1;
    var hint = $('.cm-price-hint', t.el), quick = $('.cm-quick', t.el), label = $('[data-t="send"] .cm-go-label', t.el);
    var bad = !p || p < floor || p > listed;
    var parts = [];
    if (!p) parts.push('<span>Enter a price</span>');
    else if (p > listed) parts.push('<span class="is-warn">Your listed price is ' + money(listed) + '</span>');
    else if (p < floor) parts.push('<span class="is-warn">The lowest you can offer is ' + money(floor) + '</span>');
    else if (p < listed) parts.push('<span class="is-special">' + Math.round((1 - p / listed) * 100) + '% off · private offer</span>');
    else parts.push('<span>Your listed price</span>');
    if (p && !bad) parts.push('<span class="cm-num">' + money(p * nights) + ' for ' + plural(nights, 'night') + '</span>');
    if (it.max_price && p && !bad) parts.push(p <= it.max_price * 1.001 ? '<span class="is-fit">' + svg('check') + 'Fits their budget</span>' : '<span>Above their budget</span>');
    hint.innerHTML = parts.join('');
    var q = [];
    if (p !== listed) q.push('<button type="button" data-t="set" data-v="' + listed + '">Listed ' + plain(listed) + '</button>');
    var ten = Math.max(floor, Math.round(listed * 0.9 / 50) * 50);
    if (ten < listed && p !== ten) q.push('<button type="button" data-t="set" data-v="' + ten + '">10% off</button>');
    if (it.max_price && it.max_price < listed && it.max_price >= floor && p !== Math.round(it.max_price)) {
      q.push('<button type="button" class="is-hot" data-t="set" data-v="' + Math.round(it.max_price) + '">Match budget ' + plain(it.max_price) + '</button>');
    }
    quick.innerHTML = q.join('');
    var send = $('[data-t="send"]', t.el);
    send.disabled = bad || t.busy;
    label.textContent = t.busy ? 'Sending…' : bad ? 'Send offer' : 'Send offer · ' + money(p);
  }

  function onTakeInput(e) {
    var t = H.open, k = e.target.getAttribute('data-t');
    if (!t || !k) return;
    if (k === 'price') {
      var digits = e.target.value.replace(/[^\d]/g, '').slice(0, 8);
      t.price = digits ? parseInt(digits, 10) : 0;
      var formatted = t.price ? t.price.toLocaleString('en-KE') : '';
      if (e.target.value !== formatted) {
        e.target.value = formatted;
        try { e.target.setSelectionRange(formatted.length, formatted.length); } catch (x) {}
      }
      priceUI(t);
    }
  }

  function setPrice(t, v) {
    t.price = Math.max(0, Math.round(v));
    var inp = $('[data-t="price"]', t.el);
    if (inp) inp.value = t.price ? t.price.toLocaleString('en-KE') : '';
    priceUI(t);
  }

  function onTakeClick(e) {
    var b = e.target.closest ? e.target.closest('[data-t]') : null;
    var t = H.open;
    if (!b || !t || b.tagName === 'INPUT' || b.tagName === 'TEXTAREA') return;
    var k = b.getAttribute('data-t'), it = t.item;
    switch (k) {
      case 'later': handled(t.id, 'later'); tell({ type: 'host-done', id: t.id, how: 'later' }); closeTake(true); break;
      case 'reload': closeTake(true); showRequest(t.id, {}); break;
      case 'pick':
        t.listing = (it.listings || []).filter(function (l) { return l.id === b.getAttribute('data-id'); })[0] || t.listing;
        $$('.cm-pick-opt', t.el).forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
        setPrice(t, num(t.listing.nightly) || 0);
        break;
      case 'minus': setPrice(t, Math.max(Math.ceil((num(t.listing.nightly) || 0) * 0.2), (t.price || 0) - rateStep(num(t.listing.nightly) || 0))); break;
      case 'plus': setPrice(t, Math.min(num(t.listing.nightly) || 0, (t.price || 0) + rateStep(num(t.listing.nightly) || 0))); break;
      case 'set': setPrice(t, num(b.getAttribute('data-v')) || 0); break;
      case 'note-toggle':
        var w = $('.cm-note-wrap', t.el), open = w.hidden;
        w.hidden = !open; b.setAttribute('aria-expanded', String(open));
        if (open) setTimeout(function () { var ta = $('[data-t="note"]', t.el); if (ta) ta.focus(); }, 50);
        break;
      case 'send': respond(t); break;
      case 'pass': pass(t, b); break;
      case 'chat': openChat(b.getAttribute('data-conv')); break;
      case 'done': closeTake(true); break;
    }
  }

  function takeErr(t, msg) {
    var e = $('.cm-err', t.el);
    if (!e) return toast(msg);
    e.hidden = !msg; e.textContent = msg || '';
  }

  function respond(t) {
    if (t.busy || !t.item) return;
    var note = ($('[data-t="note"]', t.el) || {}).value || '';
    t.busy = true; priceUI(t); takeErr(t, '');
    rpc('cabana_match_respond', { p_request: t.id, p_listing: t.listing.id, p_nightly: t.price, p_note: note.trim() || null }, 20000)
      .then(function (r) {
        t.busy = false; t.sent = true;
        handled(t.id, 'sent');
        tell({ type: 'host-done', id: t.id, how: 'sent' });
        track('match_host_offer', { off: num(r.nightly) < num(r.list_nightly) });
        t.item.response = { id: r.response_id, conversation_id: r.conversation_id, nightly: r.nightly, status: 'pending' };
        renderSent(t, t.item.response, false);
        if (H.inbox) H.inbox.refresh();
      }, function (e) {
        t.busy = false;
        if (e.hint === 'closed') { t.item.live = false; takeState(t, 'closed'); return; }
        if (e.hint === 'duplicate') { handled(t.id, 'sent'); closeTake(true); showRequest(t.id, {}); return; }
        priceUI(t);
        takeErr(t, e.message);
      });
  }

  function renderSent(t, resp, earlier) {
    clearInterval(t.timer);
    stopRing(); stopTitle();
    var it = t.item || {};
    var inner = $('.cm-take-inner', t.el);
    inner.innerHTML = '<div class="cm-sent">' +
      '<div class="cm-sent-check">' + svg('check') + '</div>' +
      '<h3>' + (earlier ? 'You’ve replied' : 'Offer sent') + '</h3>' +
      '<p>' + esc(it.guest_name || 'The guest') + (earlier ? ' has your offer' : ' sees it now') +
        (resp && resp.nightly ? ' at ' + money(resp.nightly) + ' a night' : '') + '. We’ll tell you the moment they open it.</p>' +
      '<div class="cm-take-actions">' +
        (resp && resp.conversation_id ? '<button type="button" class="cm-go" data-t="chat" data-conv="' + esc(resp.conversation_id) + '">' + svg('chat') + '<span class="cm-go-label">Open the chat</span></button>' : '') +
        '<button type="button" class="cm-ghost" data-t="done">Done</button>' +
      '</div></div>';
    if (!earlier) buzz([40, 50, 80]);
  }

  function pass(t, b) {
    if (!b.classList.contains('is-confirm')) {
      b.classList.add('is-confirm'); b.textContent = 'Tap again to pass';
      setTimeout(function () { if (b.isConnected) { b.classList.remove('is-confirm'); b.textContent = 'Can’t take it'; } }, 3000);
      return;
    }
    b.disabled = true;
    rpc('cabana_match_pass', { p_request: t.id }).then(function () {
      handled(t.id, 'passed');
      tell({ type: 'host-done', id: t.id, how: 'passed' });
      closeTake(true);
      toast('Passed. The next request will ring here.', { icon: 'check' });
    }, function (e) { b.disabled = false; takeErr(t, e.message); });
  }

  function openChat(conv) {
    if (!conv) return;
    closeTake(true, { navigating: true });
    closeSheet({ navigating: true });
    if (global.CabanaChat && global.CabanaChat.openConversation) global.CabanaChat.openConversation(conv);
    else location.href = '/dashboard.html?inbox=1&c=' + encodeURIComponent(conv);
  }

  /* Ring: sound, vibration, a flashing tab title, and one repeat if the
     host has not touched anything. Stops the moment they do. */
  function ring(id, loud) {
    if (!claim('ring-' + id, 5000)) return;
    if (loud) stopRing();
    play('alert');
    buzz([260, 120, 260, 120, 520]);
    if (D.visibilityState !== 'visible') flashTitle('● Guest waiting · Cabana');
    if (loud) {
      H.repeat.push(setTimeout(function () { if (H.open && !H.open.touched && !H.open.sent) { play('alert'); buzz([260, 120, 520]); } }, 15000));
      H.repeat.push(setTimeout(function () { if (H.open && !H.open.touched && !H.open.sent) play('alert'); }, 45000));
    }
    try { if (navigator.setAppBadge) navigator.setAppBadge(1 + H.queue.length); } catch (e) {}
  }
  function stopRing() { H.repeat.forEach(clearTimeout); H.repeat = []; }
  function queueBadge() {
    var q = H.open && $('.cm-take-kicker', H.open.el);
    if (q && H.queue.length) {
      var s = q.querySelector('.cm-q');
      if (s) s.textContent = '+' + H.queue.length + ' more';
      else q.insertAdjacentHTML('beforeend', ' · <span class="cm-q">+' + H.queue.length + ' more</span>');
    }
  }

  /* The notification for this request has been seen, in the only place
     that matters: the takeover. Clear it so the bell stops asking. */
  function markRead(id) {
    user().then(function (u) {
      var c = client();
      if (!u || !c) return;
      c.from('notifications').update({ read: true }).eq('user_id', u.id).eq('kind', 'match').eq('read', false)
        .eq('meta->>match_request_id', id).then(function () {}, function () {});
      try { if (navigator.clearAppBadge && !H.queue.length) navigator.clearAppBadge(); } catch (e) {}
    });
  }

  /* After a push the host did not tap, the app opening anywhere should
     still put the waiting guest in front of them, once. */
  var _caught = false;
  function hostCatchUp() {
    if (_caught) return Promise.resolve(null);
    _caught = true;
    return rpc('cabana_match_host_feed', {}).then(function (list) {
      var live = (list || []).filter(function (it) {
        return it.live && !it.response && (it.delivery_status === 'sent' || it.delivery_status === 'seen') && !handled(it.request_id);
      }).sort(function (a, b) { return new Date(a.expires_at) - new Date(b.expires_at); });
      if (!live.length) return null;
      live.slice(1).forEach(function (it) { if (H.queue.indexOf(it.request_id) === -1) H.queue.push(it.request_id); });
      showRequest(live[0].request_id, { alert: false });
      return live.length;
    }, function () { _caught = false; return null; });
  }

  /* ════════════════════════════════════════════════════════════════
     SIGNALS · notifications, push, deep links
     ════════════════════════════════════════════════════════════════ */
  var _notes = {};
  function onNotification(n) {
    if (!n || n.kind !== 'match') return false;
    var m = n.meta || {};
    var id = m.match_request_id;
    if (n.id) { if (_notes[n.id]) return true; _notes[n.id] = 1; }
    if (!uuid(id)) return false;
    ensureCSS();
    if (m.role === 'host') {
      if (m.engaged) {
        play('offer');
        toast(n.title || 'Your offer caught their eye', { sub: n.body, icon: 'chat', ms: 7000,
          action: function () { var conv = (String(n.url || '').match(/[?&]c=([0-9a-f-]{36})/i) || [])[1]; if (conv) openChat(conv); else if (n.url) location.href = n.url; } });
        if (H.inbox) H.inbox.refresh();
        return true;
      }
      showRequest(id, { alert: true, reminder: !!m.reminder });
      if (H.inbox) H.inbox.refresh();
      return true;
    }
    if (m.role === 'guest') {
      guestSignal(id, n);
      return true;
    }
    return false;
  }

  function guestSignal(id, n) {
    var baseline = G.seededId === id;
    var m = n && n.meta || {};
    refresh(id).then(function (st) {
      if (!st || !st.request) return;
      /* No baseline on this page yet (the module was loaded by the alert
         itself), so the refresh could not tell what is new. The alert
         can: announce from it directly. */
      if (!baseline && m.response_id) announceOffers(null, n);
      if (m.closed && !(S && S.mode === 'live')) {
        toast(n.title || 'Your request has closed', { sub: n.body, icon: 'clock', ms: 7000, action: function () { openLive(id); } });
      }
      renderFloat();
    }, function () {});
  }

  function onPush(d) {
    if (!d || d.kind !== 'match') return false;
    var id = d.request_id || (String(d.url || '').match(/(?:req|match)=([0-9a-f-]{36})/i) || [])[1];
    if (!uuid(id)) return false;
    if (d.role === 'host') {
      if (d.requireInteraction) showRequest(id, { alert: true });
      else if (H.inbox) H.inbox.refresh();
      return true;
    }
    /* The push tag carries the response id when this is an offer. */
    var resp = /^match-[0-9a-f-]{36}-[0-9a-f-]{36}$/i.test(String(d.tag || ''));
    guestSignal(id, { title: d.title, body: d.body, meta: { response_id: resp || null, closed: /closed|no offers/i.test(String(d.title || '') + ' ' + String(d.body || '')) && !resp } });
    return true;
  }

  function onOpenUrl(url) {
    var u; try { u = new URL(url, location.origin); } catch (e) { return false; }
    var req = u.searchParams.get('req'), match = u.searchParams.get('match');
    if (uuid(req)) { showRequest(req, {}); return true; }
    if (uuid(match)) { openLive(match); return true; }
    return false;
  }

  if (navigator.serviceWorker && navigator.serviceWorker.addEventListener) {
    navigator.serviceWorker.addEventListener('message', function (e) {
      var m = e && e.data || {};
      if (m.type === 'cabana:push' && m.payload) onPush(m.payload);
      if (m.type === 'cabana:open' && m.url) onOpenUrl(m.url);
    });
  }
  global.addEventListener('cabana:notification', function (e) { onNotification(e && e.detail); });

  D.addEventListener('visibilitychange', function () {
    if (D.visibilityState !== 'visible') return;
    stopTitle();
    if (G.req && (isLive() || (S && S.mode === 'live')) && Date.now() - G.lastFetch > 4000) refresh(G.req.id);
  });

  /* ════════════════════════════════════════════════════════════════
     HOST · INBOX  (partner-cabana.html)
     ════════════════════════════════════════════════════════════════ */
  function mountInbox(el, opts) {
    opts = opts || {};
    ensureCSS();
    if (!el) return api;
    el.classList.add('cm-root', 'cm-inbox');
    el.innerHTML = '<div class="cm-inbox-load"><span class="cm-dots"><i></i><i></i><i></i></span></div>';
    var X = { el: el, settings: null, feed: [], chan: null, timer: null, busy: false, learn: false };
    H.inbox = X;
    ls('cm_host', 1);
    D.addEventListener('pointerdown', primeAudio, { once: true, passive: true, capture: true });
    el.addEventListener('toggle', function (e) { if (e.target && e.target.classList && e.target.classList.contains('cm-learn')) X.learn = e.target.open; }, true);

    X.refresh = throttle(function () { load(false); }, 900);

    function load(first) {
      return Promise.all([
        rpc('cabana_match_host_settings', {}).catch(function (e) { return { _err: e.message }; }),
        rpc('cabana_match_host_feed', {}).catch(function () { return X.feed || []; })
      ]).then(function (r) {
        X.settings = r[0] || {};
        X.feed = Array.isArray(r[1]) ? r[1] : [];
        if (X.settings.prefs) ls('cm_sound', X.settings.prefs.sound !== false);
        render();
        if (first) {
          var q = new URLSearchParams(location.search), req = q.get('req');
          if (uuid(req)) showRequest(req, { alert: false });
        }
      });
    }

    function render() {
      var s = X.settings || {}, prefs = s.prefs || {}, st = s.stats || {}, L = s.listings || [];
      var liveItems = X.feed.filter(function (it) { return it.live; });
      var past = X.feed.filter(function (it) { return !it.live; }).slice(0, 25);
      var onCount = L.filter(function (l) { return l.on; }).length;
      var dev = deviceState();
      el.innerHTML =
        '<div class="cm-inbox-head">' +
          '<div><h1 class="cm-inbox-title">Cabana Match</h1>' +
          '<p class="cm-inbox-sub">Guests nearby send what they need. Answer first with your best price and win the booking.</p></div>' +
          '<div class="cm-switch">' + (prefs.alerts !== false ? 'Receiving requests' : 'Requests paused') +
            '<button type="button" class="cm-toggle" role="switch" data-x="alerts" aria-checked="' + (prefs.alerts !== false) + '" aria-label="Receive guest requests"></button></div>' +
        '</div>' +
        '<div class="cm-device' + (dev.ok ? ' is-ok' : '') + '">' + svg(dev.ok ? 'bell' : 'bolt') + '<span>' + esc(dev.text) + '</span>' +
          (dev.fix === 'enable' ? '<button type="button" data-x="enable">Turn on</button>' : '') +
          (dev.ok ? '<button type="button" data-x="test">Test alert</button>' : '') +
          (dev.fix === 'help' ? '<button type="button" data-x="help">How to fix</button>' : '') +
        '</div>' +
        (prefs.alerts === false ? '<div class="cm-paused">' + svg('pause') + '<span>You are not receiving guest requests. Turn them back on to be matched.</span></div>' : '') +
        '<div class="cm-kpis">' +
          kpi(st.requests || 0, 'requests') + kpi(st.offers || 0, 'offers sent') + kpi(st.booked || 0, 'booked') + kpi(dur(st.avg_reply_seconds), 'avg. reply') +
        '</div>' +
        '<div class="cm-sec-h"><h2>Live now</h2><small>' + (liveItems.length ? plural(liveItems.length, 'guest') + ' waiting' : '') + '</small></div>' +
        (liveItems.length ? liveItems.map(reqRow).join('') :
          '<div class="cm-empty"><b>No live requests right now</b><span>' + (onCount ? 'This device rings the moment a guest near your stays asks.' : 'Turn on at least one stay below to receive requests.') + '</span></div>') +
        '<div class="cm-sec-h"><h2>Your stays in Match</h2><small>' + onCount + ' of ' + L.length + ' on</small></div>' +
        (L.length ? '<div class="cm-rows">' + L.map(listRow).join('') + '</div>' :
          '<div class="cm-empty"><b>No live stays yet</b><span>Publish a stay and it joins Match automatically.</span><a class="cm-link" href="/add-listing.html">Add a stay</a></div>') +
        '<div class="cm-sec-h"><h2>Alerts</h2><small>How we reach you</small></div>' +
        '<div class="cm-prefs">' +
          pref('sound', 'speaker', 'Sound in the app', 'A chime when a request lands while Cabana is open', prefs.sound !== false) +
          pref('sms', 'sms', 'Text me if I miss one', 'An SMS when a push can’t reach you', prefs.sms !== false) +
          pref('email', 'mail', 'Email me', 'A copy of each request by email', prefs.email !== false) +
        '</div>' +
        (past.length ? '<div class="cm-sec-h"><h2>Earlier</h2><small>Last 14 days</small></div>' + past.map(reqRow).join('') : '') +
        '<details class="cm-learn"' + (X.learn ? ' open' : '') + '><summary>How Cabana Match works' + svg('down') + '</summary><ol>' +
          '<li>A guest sends where, when and their budget. Every stay of yours that is free and fits joins the request.</li>' +
          '<li>You have 20 minutes to reply with a stay and a price. A price below your listing becomes a private offer only that guest can book.</li>' +
          '<li>The guest chats or books. Bookings from Match follow your normal terms.</li>' +
          '<li>Pause a stay here any time. Paused stays and blocked dates never receive requests.</li>' +
        '</ol></details>';
      tickInbox();
    }

    function kpi(v, label) { return '<div class="cm-kpi"><b class="cm-num">' + esc(v) + '</b><span>' + label + '</span></div>'; }

    function reqRow(it) {
      var nights = it.nights || nightsOf(it.checkin, it.checkout);
      var state = it.response ? (it.response.status === 'booked' ? 'Booked' : it.response.status === 'engaged' ? 'Guest opened it' : 'Offer sent')
        : it.delivery_status === 'passed' ? 'Passed' : it.live ? '' : 'Missed';
      var cls = it.response ? ' is-sent' : '';
      return '<div class="cm-req' + (it.live ? ' is-live' : '') + '" data-req="' + esc(it.request_id) + '">' +
        '<div class="cm-req-orb">' + svg(it.live ? 'radar' : it.response ? 'check' : 'clock') + '</div>' +
        '<div class="cm-req-main"><b>' + esc(it.guest_name || 'A guest') + ' · ' + esc(placeOf(it)) + '</b>' +
          '<span>' + esc(rangeShort(it.checkin, it.checkout)) + ' · ' + plural(nights, 'night') + ' · ' + plural(it.guests || 1, 'guest') + (it.band ? ' · ' + esc(it.band) : '') + '</span></div>' +
        '<div class="cm-req-side">' +
          (it.live ? '<div class="cm-timer cm-num" data-exp="' + esc(it.expires_at) + '"></div>' : '<div class="cm-req-ago">' + esc(ago(it.created_at)) + '</div>') +
          (state ? '<span class="cm-req-state' + cls + '">' + state + '</span>' : '') +
          (it.live && !it.response && it.delivery_status !== 'passed' ? '<button type="button" class="cm-req-go" data-x="answer" data-id="' + esc(it.request_id) + '">Answer</button>' : '') +
          (it.response && it.response.conversation_id ? '<button type="button" class="cm-req-go is-light" data-x="chat" data-conv="' + esc(it.response.conversation_id) + '">Chat</button>' : '') +
        '</div></div>';
    }

    function listRow(l) {
      return '<div class="cm-list-row">' + (l.photo ? img(l.photo, 54, 44, l.title) : '<span class="ph"></span>') +
        '<div><b>' + esc(l.title || 'Untitled stay') + '</b><span class="cm-num">' + esc(l.area || '') + (l.nightly ? ' · ' + money(l.nightly) : '') + '</span></div>' +
        '<button type="button" class="cm-toggle" role="switch" data-x="listing" data-id="' + esc(l.id) + '" aria-checked="' + (!!l.on) + '" aria-label="Receive requests for ' + esc(l.title || 'this stay') + '"></button></div>';
    }

    function pref(k, icon, title, sub, on) {
      return '<div class="cm-pref"><span class="cm-pref-ico">' + svg(icon) + '</span><div>' + esc(title) + '<small>' + esc(sub) + '</small></div>' +
        '<button type="button" class="cm-toggle" role="switch" data-x="pref" data-k="' + k + '" aria-checked="' + !!on + '" aria-label="' + esc(title) + '"></button></div>';
    }

    function tickInbox() {
      $$('[data-exp]', el).forEach(function (n) {
        var left = new Date(n.getAttribute('data-exp')).getTime() - Date.now();
        n.textContent = left > 0 ? clock(left) : 'Closed';
        n.classList.toggle('is-low', left < 3 * 60000);
        if (left <= 0 && !n._r) { n._r = 1; X.refresh(); }
      });
    }

    el.addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('[data-x]') : null;
      if (!b) return;
      var k = b.getAttribute('data-x');
      primeAudio();
      if (k === 'answer') { handledClear(b.getAttribute('data-id')); showRequest(b.getAttribute('data-id'), {}); }
      else if (k === 'chat') openChat(b.getAttribute('data-conv'));
      else if (k === 'alerts' || k === 'pref') {
        var on = b.getAttribute('aria-checked') !== 'true', key = k === 'alerts' ? 'alerts' : b.getAttribute('data-k');
        b.setAttribute('aria-checked', String(on));
        var body = {}; body[key] = on;
        if (key === 'sound') ls('cm_sound', on);
        rpc('cabana_match_set_prefs', { p: body }).then(function (s) { X.settings = s || X.settings; render(); },
          function (er) { b.setAttribute('aria-checked', String(!on)); toast(er.message); });
      } else if (k === 'listing') {
        var on2 = b.getAttribute('aria-checked') !== 'true';
        b.setAttribute('aria-checked', String(on2));
        rpc('cabana_match_set_listing', { p_listing: b.getAttribute('data-id'), p_on: on2 }).then(function () {
          (X.settings.listings || []).forEach(function (l) { if (l.id === b.getAttribute('data-id')) l.on = on2; });
          render();
          toast(on2 ? 'This stay receives requests' : 'Paused for Match', { icon: on2 ? 'check' : 'pause' });
        }, function (er) { b.setAttribute('aria-checked', String(!on2)); toast(er.message); });
      } else if (k === 'enable') {
        enableAlerts().then(render);
      } else if (k === 'test') {
        testAlert();
      } else if (k === 'help') {
        if (global.CabanaPermit && global.CabanaPermit.show) global.CabanaPermit.show({ force: true });
        else toast('Allow notifications for cabana.africa in your browser’s site settings.', { ms: 6000 });
      }
    });

    user().then(function (u) {
      if (!u) { el.innerHTML = '<div class="cm-empty"><b>Sign in to see guest requests</b><a class="cm-link" href="/auth.html?next=' + encodeURIComponent(location.pathname + location.search) + '">Sign in</a></div>'; return; }
      load(true);
      var c = client();
      if (c && c.channel) {
        try {
          X.chan = c.channel('cm-host-' + u.id)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'cabana_match_deliveries', filter: 'host_id=eq.' + u.id }, function (p) {
              X.refresh();
              var d = p && p.new;
              if (d && d.status === 'sent') showRequest(d.request_id, { alert: true });
            })
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'cabana_match_deliveries', filter: 'host_id=eq.' + u.id }, function () { X.refresh(); })
            .subscribe();
        } catch (e) {}
      }
      X.timer = setInterval(function () {
        tickInbox();
      }, 1000);
      setInterval(function () { if (D.visibilityState === 'visible') X.refresh(); }, 30000);
      D.addEventListener('visibilitychange', function () { if (D.visibilityState === 'visible') X.refresh(); });
    });
    return api;
  }
  function handledClear(id) { var m = ss('cm_handled') || {}; delete m[id]; ss('cm_handled', m); }

  function deviceState() {
    if (!('Notification' in global) || !('serviceWorker' in navigator)) {
      return { ok: false, text: 'This browser can’t ring for requests. We’ll text and email you instead.', fix: null };
    }
    var p = Notification.permission;
    if (p === 'granted') return { ok: true, text: 'This device rings for new requests' };
    if (p === 'denied') return { ok: false, text: 'Alerts are blocked on this device', fix: 'help' };
    return { ok: false, text: 'Alerts are off on this device', fix: 'enable' };
  }
  function enableAlerts() {
    try {
      if (global.ApaPush && global.ApaPush.ask) return global.ApaPush.ask(_uid).then(function (ok) { if (!ok) toast('Alerts are still off on this device.'); return ok; });
      if ('Notification' in global) return Notification.requestPermission().then(function (p) { return p === 'granted'; });
    } catch (e) {}
    return Promise.resolve(false);
  }
  function testAlert() {
    primeAudio();
    setTimeout(function () { play('alert'); buzz([260, 120, 260, 120, 520]); }, 60);
    try {
      navigator.serviceWorker.ready.then(function (reg) {
        return reg.showNotification('Test · Guest request', {
          body: 'This is how a Cabana Match request arrives on this device.',
          icon: '/cabana-icon-192.png', badge: '/cabana-badge-96.png', tag: 'cm-test', renotify: true,
          vibrate: [260, 120, 260, 120, 520], data: { url: '/partner-cabana.html', kind: 'match' }
        });
      }).catch(function () {});
    } catch (e) {}
    toast('Test alert sent to this device', { icon: 'bell' });
  }

  /* ── analytics, best effort ──────────────────────────────────────── */
  function track(ev, props) {
    try { if (global.CabanaAnalytics && global.CabanaAnalytics.track) global.CabanaAnalytics.track(ev, props || {}); } catch (e) {}
    try { if (global.gtag) global.gtag('event', ev, props || {}); } catch (e) {}
  }

  /* ── public API ──────────────────────────────────────────────────── */
  var api = {
    version: VERSION,
    configure: configure,
    compose: compose,
    openLive: openLive,
    restore: restore,
    refresh: refresh,
    showRequest: showRequest,
    hostCatchUp: hostCatchUp,
    mountInbox: mountInbox,
    onNotification: onNotification,
    onPush: onPush,
    openUrl: onOpenUrl,
    close: function () { closeTake(true); closeSheet(); },
    state: function () { return { req: G.req, radar: G.radar, offers: G.offers.slice(), live: isLive(), left: remaining() }; },
    primeAudio: primeAudio,
    testAlert: testAlert,
    refreshCurrency: function () {
      if (!S) return;
      if (S.mode === 'compose') renderComposer();
      else if (S.mode === 'live') { $$('.cm-offer', S.stage).forEach(function (el) { el.removeAttribute('data-sig'); }); updateLive(false); }
    },
    _thumb: thumb
  };
  global.CabanaMatch = api;
  try { global.dispatchEvent(new CustomEvent('cabana:match-ready')); } catch (e) {}
})(window);
