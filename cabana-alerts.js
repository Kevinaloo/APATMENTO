/* ═══════════════════════════════════════════════════════════════════
   CABANA · ALERTS  v1
   ───────────────────────────────────────────────────────────────────
   One place for how Cabana gets your attention.

     SOUND   Five chimes, one per kind of news. They share a home key
             (D major pentatonic) so they sound like one family and never
             clash, but each has its own instrument, shape and length, so
             a host or guest knows what arrived without looking:

               message       Kalimba Drop    two warm plucks, a rising fourth
               notification  Glass Bloom     one glassy bell strike that blooms
               match         Sonar Beacon    a radar sweep, then two pings, twice
               offer         Sunrise         a golden sparkle climbing, over a swell
               promo         Marimba Skip    a bouncy three-step skip and a landing

             Each also has its own vibration pattern. Everything is
             synthesised in the browser: no files to download, nothing to
             license, nothing to go stale.

     BADGES  A count for the bell (notifications) and for messages, shown
             as a pill on the icon, on the installed app's icon, and kept
             in step everywhere the count appears.

   API
     CabanaAlerts.play(kind, {force})   kind: message|notification|match|offer|promo
     CabanaAlerts.kindFor(n)            notification row -> sound kind
     CabanaAlerts.setCount(which, n)    which: notifications|messages
     CabanaAlerts.counts()              { notifications, messages, total }
     CabanaAlerts.setEnabled(bool)      the person's sound switch
     CabanaAlerts.openSoundBoard()      preview each chime, mute or unmute
   ═══════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';
  if (global.CabanaAlerts) return;
  var D = global.document;

  function safe(fn, l) { try { return fn(); } catch (e) { if (global.console && console.debug) console.debug('[alerts:' + (l || '?') + ']', e && e.message); } }
  function ls(k, v) {
    try {
      if (v === undefined) { var r = global.localStorage.getItem(k); return r === null ? null : JSON.parse(r); }
      global.localStorage.setItem(k, JSON.stringify(v));
    } catch (e) { return null; }
  }

  /* ═══ THE SCORES ════════════════════════════════════════════════════
     Data, not code: [seconds, midi note, length, level, voice]. Keeping
     them as plain data lets a test prove the five really are different. */
  var SCORES = {
    message: [                                    // Kalimba Drop
      [0.00, 81, 0.55, 0.28, 'kal'],              // A5
      [0.15, 86, 0.80, 0.26, 'kal']               // D6
    ],
    notification: [                               // Glass Bloom
      [0.00, 83, 1.30, 0.40, 'bell'],             // B5
      [0.02, 90, 1.00, 0.10, 'bell'],             // F#6 shimmer
      [0.30, 78, 0.90, 0.16, 'bell']              // F#5 soft answer
    ],
    match: [                                      // Sonar Beacon
      [0.00, 62, 0.60, 0.30, 'sub'],              // D4 under the sweep
      [0.00, 74, 0.55, 0.20, 'sweep', 98],        // D5 glides to D7
      [0.62, 86, 0.95, 0.30, 'ping'],             // D6
      [0.82, 93, 1.10, 0.28, 'ping'],             // A6
      [1.75, 62, 0.60, 0.30, 'sub'],
      [1.75, 74, 0.55, 0.20, 'sweep', 98],
      [2.37, 86, 0.95, 0.30, 'ping'],
      [2.57, 93, 1.30, 0.30, 'ping']
    ],
    offer: [                                      // Sunrise
      [0.00, 62, 1.20, 0.16, 'pad'],              // D4
      [0.00, 69, 1.20, 0.14, 'pad'],              // A4
      [0.00, 78, 1.20, 0.12, 'pad'],              // F#5
      [0.05, 86, 0.40, 0.20, 'spark'],            // D6
      [0.12, 90, 0.40, 0.20, 'spark'],            // F#6
      [0.19, 93, 0.40, 0.20, 'spark'],            // A6
      [0.26, 95, 0.40, 0.20, 'spark'],            // B6
      [0.33, 98, 0.90, 0.24, 'spark']             // D7
    ],
    promo: [                                      // Marimba Skip
      [0.00, 74, 0.28, 0.26, 'mar'],              // D5
      [0.12, 78, 0.28, 0.24, 'mar'],              // F#5
      [0.24, 81, 0.28, 0.24, 'mar'],              // A5
      [0.42, 86, 0.70, 0.30, 'mar'],              // D6
      [0.42, 78, 0.70, 0.14, 'mar']               // F#5 under the landing
    ]
  };
  var HAPTICS = {
    message: [60, 50, 60],
    notification: [140],
    match: [260, 120, 260, 120, 520],
    offer: [40, 40, 40, 40, 40, 40, 260],
    promo: [70, 60, 70, 60, 200]
  };
  /* Echo: how far each one travels. Match carries furthest; a message
     stays close, like someone leaning in. */
  var ROOM = {
    message: [0.11, 0.18], notification: [0.19, 0.30], match: [0.27, 0.40],
    offer: [0.15, 0.30], promo: [0.12, 0.20]
  };
  var KINDS = ['message', 'notification', 'match', 'offer', 'promo'];
  var LABELS = {
    message: ['Messages', 'Kalimba Drop', 'Two warm plucks'],
    notification: ['Notifications', 'Glass Bloom', 'One bell that blooms'],
    match: ['Cabana Match', 'Sonar Beacon', 'A radar sweep, then two pings'],
    offer: ['Offers', 'Sunrise', 'A golden sparkle, climbing'],
    promo: ['Promotions', 'Marimba Skip', 'A bouncy three-step skip']
  };

  function hz(m) { return 440 * Math.pow(2, (m - 69) / 12); }

  /* Which sound a notification row should make. */
  function kindFor(n) {
    var k = String((n && n.kind) || '').toLowerCase();
    var meta = (n && n.meta) || {};
    if (k === 'message' || k === 'chat') return 'message';
    if (k === 'match') return 'match';
    if (/^(offer|stay[-_]?offer|counter[-_]?offer|deal)s?$/.test(k) || meta.offer_id || meta.stay_offer_id) return 'offer';
    if (/^(promo|promotion|promotions|campaign|marketing|newsletter|reward|rewards)$/.test(k) || meta.campaign_id) return 'promo';
    return 'notification';
  }

  /* ═══ THE ENGINE ════════════════════════════════════════════════════ */
  var _ac = null, _last = {}, _enabled = null;

  function enabled() {
    if (_enabled === null) _enabled = ls('cabana_alert_sound') !== false;
    return _enabled;
  }
  function setEnabled(on) { _enabled = !!on; ls('cabana_alert_sound', _enabled); paintBoard(); return _enabled; }

  function context(create) {
    try {
      var AC = global.AudioContext || global.webkitAudioContext;
      if (!AC) return null;
      if (!_ac && create) _ac = new AC();
      if (_ac && _ac.state === 'suspended' && create) { var p = _ac.resume(); if (p && p.catch) p.catch(function () {}); }
      return _ac;
    } catch (e) { return null; }
  }
  /* Browsers keep a page silent until the person has touched it, so the
     first tap or key press anywhere wakes the audio up. After that an
     alert can ring whenever it arrives. */
  function unlock() { context(true); }
  if (D) ['pointerdown', 'touchstart', 'keydown'].forEach(function (ev) {
    D.addEventListener(ev, function once() {
      unlock();
      ['pointerdown', 'touchstart', 'keydown'].forEach(function (e2) { D.removeEventListener(e2, once, true); });
    }, true);
  });

  function env(g, t, peak, att, len) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t + att);
    g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(len, att + 0.02));
  }
  function osc(ac, type, f, t0, t1, out) {
    var o = ac.createOscillator();
    o.type = type; o.frequency.setValueAtTime(f, t0);
    o.connect(out); o.start(t0); o.stop(t1 + 0.05);
    return o;
  }
  function part(ac, bus, type, f, t, att, len, level) {
    var g = ac.createGain(); env(g, t, level, att, len); g.connect(bus);
    return osc(ac, type, f, t, t + len, g);
  }

  var VOICES = {
    /* A thumb piano: a pure tone, a bright inharmonic tick that dies fast,
       and an octave that gives it body. */
    kal: function (ac, bus, t, f, d, v) {
      part(ac, bus, 'sine', f, t, 0.004, d, v);
      part(ac, bus, 'sine', f * 5.43, t, 0.002, d * 0.16, v * 0.28);
      part(ac, bus, 'triangle', f * 2, t, 0.004, d * 0.5, v * 0.16);
    },
    /* Glass: a carrier whose pitch is bent by a modulator that fades, so
       the strike is bright and then settles into a pure ring. */
    bell: function (ac, bus, t, f, d, v) {
      var g = ac.createGain(); env(g, t, v, 0.006, d); g.connect(bus);
      var c = osc(ac, 'sine', f, t, t + d, g);
      var m = ac.createOscillator(), mg = ac.createGain();
      m.type = 'sine'; m.frequency.setValueAtTime(f * 3.5, t);
      mg.gain.setValueAtTime(f * 2.2, t);
      mg.gain.exponentialRampToValueAtTime(f * 0.02, t + d * 0.6);
      m.connect(mg); mg.connect(c.frequency); m.start(t); m.stop(t + d + 0.05);
      part(ac, bus, 'sine', f * 2, t, 0.006, d * 0.55, v * 0.2);
    },
    /* A sonar ping: a clean tone that leans down into its note and rings. */
    ping: function (ac, bus, t, f, d, v) {
      var g = ac.createGain(); env(g, t, v, 0.008, d); g.connect(bus);
      var o = osc(ac, 'sine', f * 1.012, t, t + d, g);
      o.frequency.exponentialRampToValueAtTime(f, t + 0.09);
      part(ac, bus, 'sine', f * 2, t, 0.008, d * 0.35, v * 0.12);
    },
    /* The sweep that opens a Match alert: a rising glide that swells and
       is gone just as the pings land. */
    sweep: function (ac, bus, t, f, d, v, to) {
      var g = ac.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(v, t + d * 0.85);
      g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      g.connect(bus);
      var o = osc(ac, 'sine', f, t, t + d, g);
      o.frequency.exponentialRampToValueAtTime(hz(to), t + d);
      var o2 = osc(ac, 'triangle', f / 2, t, t + d, g);
      o2.frequency.exponentialRampToValueAtTime(hz(to) / 2, t + d);
    },
    sub: function (ac, bus, t, f, d, v) { part(ac, bus, 'sine', f, t, 0.012, d, v); },
    spark: function (ac, bus, t, f, d, v) {
      part(ac, bus, 'sine', f, t, 0.002, d, v);
      part(ac, bus, 'sine', f * 2.01, t, 0.002, d * 0.45, v * 0.4);
    },
    pad: function (ac, bus, t, f, d, v) {
      [-4, 4].forEach(function (cents) {
        var g = ac.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(v * 0.6, t + d * 0.35);
        g.gain.exponentialRampToValueAtTime(0.0001, t + d);
        g.connect(bus);
        var o = osc(ac, 'sine', f, t, t + d, g); o.detune.value = cents;
      });
    },
    /* A marimba bar: a round tone, a short wooden knock, a faint overtone. */
    mar: function (ac, bus, t, f, d, v) {
      part(ac, bus, 'sine', f, t, 0.003, d, v);
      part(ac, bus, 'sine', f * 4, t, 0.002, 0.07, v * 0.34);
      part(ac, bus, 'sine', f * 10, t, 0.001, 0.03, v * 0.08);
    }
  };

  /* Wire one chime: voices -> bus -> gentle compressor, plus an echo send. */
  function perform(ac, kind, t0) {
    var score = SCORES[kind], room = ROOM[kind];
    var out = ac.createGain(); out.gain.value = 0.9;
    var comp = ac.createDynamicsCompressor();
    comp.threshold.value = -18; comp.ratio.value = 3; comp.attack.value = 0.003; comp.release.value = 0.2;
    out.connect(comp); comp.connect(ac.destination);

    var bus = ac.createGain(); bus.gain.value = 1; bus.connect(out);
    var delay = ac.createDelay(1), fb = ac.createGain(), lp = ac.createBiquadFilter(), send = ac.createGain();
    delay.delayTime.value = room[0]; fb.gain.value = room[1]; lp.type = 'lowpass'; lp.frequency.value = 3200;
    send.gain.value = 0.55;
    bus.connect(send); send.connect(delay); delay.connect(lp); lp.connect(fb); fb.connect(delay); lp.connect(out);

    score.forEach(function (n) { VOICES[n[4]](ac, bus, t0 + n[0], hz(n[1]), n[2], n[3], n[5]); });
  }

  /* Plays a chime. Returns true if it sounded. A chime that would fire
     late, after the page was asleep, is worse than none, so a context
     that is not running stays quiet. */
  function play(kind, opts) {
    opts = opts || {};
    if (!SCORES[kind]) kind = 'notification';
    if (!opts.force && !enabled()) return false;
    var now = Date.now();
    if (!opts.force && _last[kind] && now - _last[kind] < 1500) return false;
    var ac = context(true);
    if (!ac || ac.state !== 'running') return false;
    _last[kind] = now;
    if (!safe(function () { perform(ac, kind, ac.currentTime + 0.03); return true; }, 'perform')) return false;
    if (!opts.silentHaptics && global.navigator && navigator.vibrate && enabled()) safe(function () { navigator.vibrate(HAPTICS[kind]); }, 'vibrate');
    return true;
  }

  /* ═══ COUNTS AND BADGES ═════════════════════════════════════════════ */
  var _counts = { notifications: 0, messages: 0 };
  var _listeners = [];

  var CSS = '' +
    '.cab-badge{position:absolute;top:-5px;right:-5px;z-index:3;min-width:20px;height:20px;padding:0 6px;box-sizing:border-box;' +
    'border-radius:999px;display:none;align-items:center;justify-content:center;pointer-events:none;color:#fff;' +
    'font:800 11px/1 Geist,Inter,system-ui,-apple-system,sans-serif;letter-spacing:-.01em;font-variant-numeric:tabular-nums;' +
    'background:linear-gradient(135deg,#FF7A45,#FF2D6B);' +
    'box-shadow:0 0 0 2px var(--cab-ring,#fff),0 5px 12px -2px rgba(255,45,107,.55);isolation:isolate;}' +
    '.cab-badge[data-kind="messages"]{background:linear-gradient(135deg,#8E63FF,#5B2BFF);box-shadow:0 0 0 2px var(--cab-ring,#fff),0 5px 12px -2px rgba(91,43,255,.55);}' +
    '.cab-badge.on{display:inline-flex;}' +
    '.cab-badge.pop{animation:cabPop .55s cubic-bezier(.2,1.7,.4,1);}' +
    '.cab-badge::after{content:"";position:absolute;inset:0;border-radius:inherit;background:inherit;z-index:-1;opacity:0;}' +
    '.nav.on-dark,.on-dark{--cab-ring:#0D0A26;}' +
    /* The old dot is replaced by the count, so it stays out of the way. */
    '.apa-ico[data-apa="notif"] .apa-ico-dot,.apa-ico[data-apa="msg"] .apa-ico-dot{display:none!important;}' +
    '.apa-ico[data-apa="msg"]{position:relative;}' +
    '.apa-bell-badge.cab-badge{top:-5px;right:-5px;}' +
    /* The older message badges adopt the same pill. */
    '.cbx-nav-badge.on,#tb-inbox-badge.on{background:linear-gradient(135deg,#8E63FF,#5B2BFF)!important;font-weight:800;box-shadow:0 4px 10px -2px rgba(91,43,255,.5);}' +
    '@media(prefers-reduced-motion:no-preference){' +
    '.cab-badge.on::after{animation:cabHalo 2.6s ease-out infinite;}' +
    '.apa-ico.cab-ring[data-apa="notif"] svg:not(.apa-fav-heart){transform-origin:50% 12%;animation:cabRing .9s ease-in-out;}' +
    '.apa-ico.cab-ring[data-apa="msg"] svg{animation:cabHop .6s cubic-bezier(.3,1.6,.5,1);}}' +
    '@keyframes cabPop{0%{transform:scale(.2)}60%{transform:scale(1.3)}100%{transform:scale(1)}}' +
    '@keyframes cabHalo{0%{opacity:.55;transform:scale(1)}100%{opacity:0;transform:scale(1.9)}}' +
    '@keyframes cabRing{0%,100%{transform:rotate(0)}15%{transform:rotate(16deg)}30%{transform:rotate(-14deg)}45%{transform:rotate(10deg)}60%{transform:rotate(-7deg)}75%{transform:rotate(3deg)}}' +
    '@keyframes cabHop{0%{transform:translateY(0)}40%{transform:translateY(-4px) scale(1.08)}100%{transform:none}}' +
    /* Sound board */
    '.cab-sb{position:fixed;inset:0;z-index:2147483000;display:none;align-items:flex-end;justify-content:center;background:rgba(10,8,30,.45);backdrop-filter:blur(3px);}' +
    '.cab-sb.open{display:flex;}' +
    '.cab-sb-card{width:min(440px,100%);background:#fff;color:#0A0A14;border-radius:24px 24px 0 0;padding:20px 18px calc(18px + env(safe-area-inset-bottom,0px));font-family:Inter,system-ui,sans-serif;box-shadow:0 -20px 60px rgba(30,10,90,.3);animation:cabUp .35s cubic-bezier(.2,1,.3,1);}' +
    '@media(min-width:640px){.cab-sb{align-items:center}.cab-sb-card{border-radius:24px}}' +
    '@keyframes cabUp{from{transform:translateY(40px);opacity:0}to{transform:none;opacity:1}}' +
    '.cab-sb h3{margin:0 0 2px;font:800 18px/1.2 Geist,Inter,system-ui,sans-serif;letter-spacing:-.01em;}' +
    '.cab-sb p{margin:0 0 14px;font-size:13px;color:#5b5e7a;}' +
    '.cab-sb-row{width:100%;display:flex;align-items:center;gap:12px;padding:11px 12px;margin-bottom:8px;border:1px solid rgba(10,10,20,.08);border-radius:16px;background:#fafaff;cursor:pointer;text-align:left;font:inherit;color:inherit;}' +
    '.cab-sb-row:hover{border-color:rgba(109,40,255,.4);background:#f4f0ff;}' +
    '.cab-sb-ico{width:38px;height:38px;border-radius:12px;display:grid;place-items:center;color:#fff;flex-shrink:0;font-size:17px;}' +
    '.cab-sb-row b{display:block;font-size:14px;}.cab-sb-row small{display:block;font-size:12px;color:#6b6e8c;margin-top:1px;}' +
    '.cab-sb-play{margin-left:auto;font-size:11px;font-weight:800;color:#5B2BFF;letter-spacing:.06em;text-transform:uppercase;}' +
    '.cab-sb-foot{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:6px;}' +
    '.cab-sb-mute{padding:10px 14px;border-radius:12px;border:1px solid rgba(10,10,20,.12);background:#fff;font:700 13px Inter,system-ui,sans-serif;cursor:pointer;}' +
    '.cab-sb-done{padding:10px 18px;border-radius:12px;border:0;background:linear-gradient(135deg,#8E63FF,#5B2BFF);color:#fff;font:800 13px Inter,system-ui,sans-serif;cursor:pointer;}';

  function injectCSS() {
    if (!D || D.getElementById('cab-alerts-css')) return;
    var s = D.createElement('style'); s.id = 'cab-alerts-css'; s.textContent = CSS;
    (D.head || D.documentElement).appendChild(s);
  }

  function label(n) { return n > 99 ? '99+' : String(n); }

  function badgeFor(host, which) {
    var b = host.querySelector(':scope > .cab-badge[data-kind="' + which + '"]');
    if (!b) {
      b = D.createElement('span'); b.className = 'cab-badge'; b.setAttribute('data-kind', which); b.setAttribute('aria-hidden', 'true');
      host.appendChild(b);
    }
    return b;
  }
  function hostsFor(which) {
    var sel = which === 'notifications'
      ? '.apa-ico[data-apa="notif"],.apa-bell,[data-cab-host="notifications"]'
      : '.apa-ico[data-apa="msg"],[data-cab-host="messages"]';
    return Array.prototype.slice.call(D.querySelectorAll(sel));
  }

  function paint(which, grew) {
    if (!D) return;
    var n = _counts[which];
    hostsFor(which).forEach(function (host) {
      /* apa-push's own bell badge element is the badge on its bell. */
      var b = host.querySelector(':scope > .apa-bell-badge') || badgeFor(host, which);
      b.classList.add('cab-badge'); b.setAttribute('data-kind', which);
      b.textContent = n > 0 ? label(n) : '';
      b.classList.toggle('on', n > 0);
      if (!host.hasAttribute('data-cab-label')) host.setAttribute('data-cab-label', host.getAttribute('aria-label') || (which === 'messages' ? 'Messages' : 'Notifications'));
      host.setAttribute('aria-label', host.getAttribute('data-cab-label') + (n > 0 ? ', ' + n + ' unread' : ''));
      if (grew && n > 0) {
        b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop');
        host.classList.remove('cab-ring'); void host.offsetWidth; host.classList.add('cab-ring');
        setTimeout(function () { host.classList.remove('cab-ring'); }, 1000);
      }
    });
    /* Any element that just wants the number. */
    Array.prototype.forEach.call(D.querySelectorAll('[data-cab-count="' + which + '"]'), function (el) { el.textContent = n > 0 ? label(n) : ''; el.hidden = n < 1; });
    Array.prototype.forEach.call(D.querySelectorAll('[data-cab-count="total"]'), function (el) { var t = total(); el.textContent = t > 0 ? label(t) : ''; el.hidden = t < 1; });
  }

  function total() { return _counts.notifications + _counts.messages; }

  /* The installed app's icon carries the combined count. */
  function appBadge() {
    var t = total();
    safe(function () {
      if (!global.navigator) return;
      if (t > 0 && navigator.setAppBadge) navigator.setAppBadge(t);
      else if (!t && navigator.clearAppBadge) navigator.clearAppBadge();
    }, 'appbadge');
  }

  function setCount(which, n) {
    if (!(which in _counts)) return;
    n = Math.max(0, Math.floor(Number(n) || 0));
    var prev = _counts[which];
    if (prev === n) { paint(which, false); return; }
    _counts[which] = n;
    paint(which, n > prev);
    appBadge();
    _listeners.forEach(function (fn) { safe(function () { fn(counts()); }, 'listener'); });
  }
  function counts() { return { notifications: _counts.notifications, messages: _counts.messages, total: total() }; }
  function onChange(fn) { if (typeof fn === 'function') _listeners.push(fn); }

  /* ═══ THE MESSAGES ICON ═════════════════════════════════════════════
     The bell has always lived in the header; messages hid inside it. Now
     the signed-in header carries a message bubble of its own, next to
     the bell, with its own count. */
  var BUBBLE = '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>';

  function mountMessageIcons() {
    if (!D) return;
    Array.prototype.forEach.call(D.querySelectorAll('.apa-ico[data-apa="notif"]'), function (bell) {
      if (bell.closest('[data-when="guest"]')) return;
      var prev = bell.previousElementSibling;
      if (prev && prev.getAttribute && prev.getAttribute('data-apa') === 'msg') return;
      var btn = D.createElement('button');
      btn.type = 'button'; btn.className = 'apa-ico'; btn.setAttribute('data-apa', 'msg');
      btn.setAttribute('aria-label', 'Messages'); btn.title = 'Messages';
      btn.innerHTML = BUBBLE;
      bell.parentNode.insertBefore(btn, bell);
    });
    paint('messages', false); paint('notifications', false);
  }
  function openMessages() {
    if (global.CabanaChat && CabanaChat.openInbox) return CabanaChat.openInbox();
    if (global.ApatmentoChat && ApatmentoChat.openInbox) return ApatmentoChat.openInbox();
    global.location.href = '/dashboard.html?inbox=1';
  }
  if (D) D.addEventListener('click', function (e) {
    var el = e.target && e.target.closest ? e.target.closest('[data-apa="msg"]') : null;
    if (!el) return;
    e.preventDefault(); openMessages();
  });

  /* ═══ SOUND BOARD ═══════════════════════════════════════════════════ */
  var COLORS = {
    message: 'linear-gradient(135deg,#8E63FF,#5B2BFF)', notification: 'linear-gradient(135deg,#FF7A45,#FF2D6B)',
    match: 'linear-gradient(135deg,#14B8A6,#0E7C86)', offer: 'linear-gradient(135deg,#FFD25E,#FF8A3D)',
    promo: 'linear-gradient(135deg,#FF5FA2,#B517D0)'
  };
  var GLYPH = { message: '💬', notification: '🔔', match: '📡', offer: '✨', promo: '🎉' };
  var _board = null;

  function openSoundBoard() {
    if (!D) return;
    injectCSS(); unlock();
    if (!_board) {
      _board = D.createElement('div'); _board.className = 'cab-sb';
      _board.setAttribute('role', 'dialog'); _board.setAttribute('aria-modal', 'true'); _board.setAttribute('aria-label', 'Alert sounds');
      _board.innerHTML = '<div class="cab-sb-card"><h3>Cabana alert sounds</h3><p>Each kind of news has its own sound, so you know what arrived before you look.</p><div data-rows></div>' +
        '<div class="cab-sb-foot"><button type="button" class="cab-sb-mute" data-mute></button><button type="button" class="cab-sb-done" data-done>Done</button></div></div>';
      var rows = _board.querySelector('[data-rows]');
      KINDS.forEach(function (k) {
        var b = D.createElement('button'); b.type = 'button'; b.className = 'cab-sb-row'; b.setAttribute('data-k', k);
        b.innerHTML = '<span class="cab-sb-ico" style="background:' + COLORS[k] + '">' + GLYPH[k] + '</span><span><b>' + LABELS[k][0] + '</b><small>' + LABELS[k][1] + ' · ' + LABELS[k][2] + '</small></span><span class="cab-sb-play">Play</span>';
        rows.appendChild(b);
      });
      _board.addEventListener('click', function (e) {
        if (e.target === _board || e.target.closest('[data-done]')) { _board.classList.remove('open'); return; }
        var row = e.target.closest('.cab-sb-row');
        if (row) { unlock(); setTimeout(function () { play(row.getAttribute('data-k'), { force: true }); }, 30); return; }
        if (e.target.closest('[data-mute]')) setEnabled(!enabled());
      });
      D.addEventListener('keydown', function (e) { if (e.key === 'Escape' && _board) _board.classList.remove('open'); });
      D.body.appendChild(_board);
    }
    paintBoard();
    _board.classList.add('open');
  }
  function paintBoard() {
    if (!_board) return;
    var m = _board.querySelector('[data-mute]');
    if (m) m.textContent = enabled() ? 'Mute alert sounds' : 'Turn alert sounds on';
  }

  /* ═══ BOOT ══════════════════════════════════════════════════════════ */
  function boot() { injectCSS(); mountMessageIcons(); }
  if (D) {
    if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', boot); else boot();
    /* Headers that build themselves later get their icons then. */
    global.addEventListener('load', function () { setTimeout(mountMessageIcons, 600); });
  }

  global.CabanaAlerts = {
    play: play, kindFor: kindFor, setCount: setCount, counts: counts, onChange: onChange,
    setEnabled: setEnabled, isEnabled: enabled, unlock: unlock, openSoundBoard: openSoundBoard,
    mountMessageIcons: mountMessageIcons, refresh: function () { paint('notifications'); paint('messages'); },
    scores: SCORES, haptics: HAPTICS, kinds: KINDS, labels: LABELS
  };
})(typeof window !== 'undefined' ? window : globalThis);
