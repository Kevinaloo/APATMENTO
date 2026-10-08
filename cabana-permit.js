/* ═══════════════════════════════════════════════════════════════════
   CABANA · PERMISSIONS GATE
   ───────────────────────────────────────────────────────────────────
   Notifications and location are required to use Cabana signed in: a
   host who cannot be alerted misses a guest who is waiting, and a guest
   without location gets the wrong pick-up, the wrong "near me" and a
   blind SOS. This gate makes both true on the device, and is honest
   about the cases where the device itself cannot.

   Every state it knows how to resolve
   ───────────────────────────────────
     not asked yet        → one button, asked on the tap (browsers only
                            show the prompt on a real gesture)
     blocked              → the exact switch for this browser or app,
                            and it unlocks itself the moment the switch
                            flips (Permissions API), or on "Check again"
     quietly blocked      → Chrome's quiet UI answers "default" without
                            a prompt: point at the bell in the address bar
     iPhone, Safari tab   → web push only exists once Cabana is on the
                            Home Screen: show how, step by step
     in-app browser       → Instagram, Facebook, TikTok and friends can't
                            do either: open the page in the real browser
     location switched off at the phone
                          → permission is granted but no fix arrives:
                            turn on the phone's location
     truly unsupported    → nothing to ask for; email and SMS cover it,
                            and the gate lets the person through

   It never shows on sign-in, legal, help or admin pages, never to a
   signed-out visitor, and never on top of the stays loader.

   API: CabanaPermit.check() · .show({force}) · .status() → Promise
   ═══════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';
  if (global.CabanaPermit) return;

  var D = global.document, N = global.navigator || {};
  var UA = String(N.userAgent || '');
  var EXEMPT = /^\/(auth|login|signup|sign-in|register|reset|verify|callback|help|faq|legal|terms|privacy|cookies|policy|unsubscribe|delete-account|support|contact|offline|404|admin|ops|status)(\.html)?(\/|$)|admin/i;

  /* ── the device ────────────────────────────────────────────────── */
  var ios = /iPad|iPhone|iPod/.test(UA) || (N.platform === 'MacIntel' && N.maxTouchPoints > 1);
  var android = /Android/i.test(UA);
  var standalone = !!((global.matchMedia && global.matchMedia('(display-mode: standalone)').matches) || N.standalone === true);
  /* The Android app is Chrome in standalone mode. The referrer names the
     app on the first page only, so keep what it told us for the session. */
  var twa = (D.referrer || '').indexOf('android-app://africa.cabana.app') === 0 || /; wv\).*Cabana/i.test(UA);
  try {
    if (twa) sessionStorage.setItem('cabana_in_app', '1');
    else if (sessionStorage.getItem('cabana_in_app') === '1' && android) twa = true;
  } catch (e) {}
  /* Any installed Android app runs without a browser bar; its switches are
     under Settings → Apps → Cabana, whichever way it was installed. */
  if (android && standalone) twa = true;
  var inApp = /FBAN|FBAV|FB_IAB|Instagram|Line\/|TikTok|musical_ly|Bytedance|Twitter|Snapchat|LinkedInApp|Pinterest|GSA\/|MicroMessenger|WhatsApp/i.test(UA) ||
    (android && /; wv\)/.test(UA) && !twa);
  var firefox = /Firefox\//.test(UA);
  var samsung = /SamsungBrowser/i.test(UA);
  var edge = /Edg\//.test(UA);
  var safari = /Safari\//.test(UA) && !/Chrome|CriOS|FxiOS|EdgiOS|Android/.test(UA);
  var mobile = ios || android || (global.matchMedia && global.matchMedia('(pointer: coarse)').matches);
  var iosVersion = (function () { var m = UA.match(/OS (\d+)_(\d+)/); return m ? parseFloat(m[1] + '.' + m[2]) : null; })();

  function notifSupported() { return 'Notification' in global && 'serviceWorker' in N; }
  function geoSupported() { return 'geolocation' in N; }

  /* ── state ─────────────────────────────────────────────────────── */
  var st = { notif: 'unknown', geo: 'unknown', geoFix: null };
  var gate = null, watching = false, busy = false;

  function ls(k, v) {
    try {
      if (arguments.length === 1) return localStorage.getItem(k);
      if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v);
    } catch (e) { return null; }
  }

  function notifState() {
    if (inApp) return 'inapp';
    if (!notifSupported()) {
      if (ios && !standalone && (iosVersion == null || iosVersion >= 16.4)) return 'install';
      if (ios && iosVersion != null && iosVersion < 16.4) return 'unsupported';
      return 'unsupported';
    }
    var p = global.Notification.permission;
    return p === 'granted' ? 'on' : p === 'denied' ? 'blocked' : 'ask';
  }

  function geoPermission() {
    if (inApp && !geoSupported()) return Promise.resolve('inapp');
    if (!geoSupported()) return Promise.resolve('unsupported');
    if (N.permissions && N.permissions.query) {
      return N.permissions.query({ name: 'geolocation' }).then(function (p) {
        watchPerm(p, 'geo');
        return p.state === 'granted' ? 'on' : p.state === 'denied' ? 'blocked' : (ls('cabana_loc_ok') === '1' ? 'on' : 'ask');
      }, function () { return ls('cabana_loc_ok') === '1' ? 'on' : 'ask'; });
    }
    /* Older Safari has no way to ask without prompting. A fix we got
       before is the best evidence we can hold. */
    return Promise.resolve(ls('cabana_loc_ok') === '1' ? 'on' : 'ask');
  }

  var _watched = {};
  function watchPerm(p, key) {
    if (!p || _watched[key]) return;
    _watched[key] = 1;
    try { p.onchange = function () { refresh(); }; } catch (e) {}
  }
  function watchNotifPerm() {
    if (!N.permissions || !N.permissions.query || !notifSupported()) return;
    N.permissions.query({ name: 'notifications' }).then(function (p) { watchPerm(p, 'notif'); }, function () {});
  }

  function status() {
    return geoPermission().then(function (g) {
      st.notif = notifState();
      st.geo = g;
      return { notifications: st.notif, location: st.geo, locationFix: st.geoFix };
    });
  }

  function satisfied(s) {
    var n = s.notifications, g = s.location;
    var nOk = n === 'on' || n === 'unsupported';
    var gOk = (g === 'on' && st.geoFix !== 'off') || g === 'unsupported';
    return nOk && gOk;
  }

  /* ── where it applies ─────────────────────────────────────────── */
  function exemptPage() { return EXEMPT.test(global.location.pathname) || /[?&]nogate=1/.test(global.location.search); }

  function signedIn() {
    return new Promise(function (resolve) {
      var done = false;
      function fin(v) { if (!done) { done = true; resolve(!!v); } }
      try { if (global.ApaSession) global.ApaSession.ready(function (s) { fin(s && s.status === 'user'); }); else fin(false); } catch (e) { fin(false); }
      setTimeout(function () { fin(false); }, 6000);
    });
  }

  /* The stays loader owns the screen for its first seconds. */
  function whenClear() {
    return new Promise(function (resolve) {
      var n = 0;
      (function wait() {
        var busyScreen = D.getElementById('stay-gate') || D.getElementById('cbp-splash') ||
          D.documentElement.classList.contains('apa-splash-lock') || D.querySelector('.apa-loader.show,#enter-tx:not(.gone)');
        if (!busyScreen || ++n > 300) return resolve();
        setTimeout(wait, 400);
      })();
    });
  }

  /* ── location: the fix, not just the flag ─────────────────────── */
  function probeFix(timeout) {
    return new Promise(function (resolve) {
      if (!geoSupported()) return resolve('unsupported');
      var t = setTimeout(function () { st.geoFix = 'slow'; resolve('slow'); }, (timeout || 12000) + 1500);
      try {
        N.geolocation.getCurrentPosition(function (pos) {
          clearTimeout(t);
          ls('cabana_loc_ok', '1');
          st.geoFix = 'ok';
          try { if (global.ApaLocation && global.ApaLocation.start) global.ApaLocation.start(); } catch (e) {}
          try { D.dispatchEvent(new CustomEvent('cabana:location', { detail: { latitude: pos.coords.latitude, longitude: pos.coords.longitude, accuracy: pos.coords.accuracy, source: 'gps', fixed_at: new Date().toISOString() } })); } catch (e) {}
          resolve('ok');
        }, function (err) {
          clearTimeout(t);
          if (err && err.code === 1) { ls('cabana_loc_ok', null); st.geoFix = null; return resolve('denied'); }
          /* 2 = POSITION_UNAVAILABLE: allowed, but the phone's location
             is switched off. 3 = TIMEOUT: indoors, try again. */
          if (err && err.code === 2) { st.geoFix = mobile ? 'off' : 'weak'; return resolve('off'); }
          st.geoFix = 'slow';
          resolve('slow');
        }, { enableHighAccuracy: true, timeout: timeout || 12000, maximumAge: 60000 });
      } catch (e) { clearTimeout(t); resolve('slow'); }
    });
  }

  /* ── copy for every browser ───────────────────────────────────── */
  function fixSteps(which) {
    var what = which === 'notif' ? 'Notifications' : 'Location';
    if (twa || (android && standalone)) return ['Open your phone’s Settings', 'Apps → Cabana → ' + (which === 'notif' ? 'Notifications → Allow' : 'Permissions → Location → Allow'), 'Come back here. Cabana unlocks on its own.'];
    if (ios && standalone) return which === 'notif'
      ? ['Open the Settings app', 'Notifications → Cabana → Allow Notifications', 'Come back here and tap Check again.']
      : ['Open the Settings app', 'Privacy & Security → Location Services → Cabana → While Using', 'Come back here and tap Check again.'];
    if (ios) return which === 'geo'
      ? ['Open the Settings app → Privacy & Security → Location Services', 'Turn Location Services on, then Safari Websites → While Using', 'Back in Safari: tap aA → Website Settings → Location → Allow']
      : ['Add Cabana to your Home Screen first (see above)'];
    if (samsung) return ['Tap ≡ at the bottom → Settings → Sites and downloads', 'Site permissions → ' + what + ' → cabana.africa → Allow', 'Come back here. Cabana unlocks on its own.'];
    if (android) return ['Tap the icon left of the address bar (⊶ or 🔒)', 'Permissions → ' + what + ' → Allow', 'Cabana unlocks on its own.'];
    if (firefox) return ['Click the permissions icon left of the address bar', 'Remove “Blocked” next to ' + what, 'Tap Check again, then Allow.'];
    if (safari) return ['Safari menu → Settings → Websites → ' + what, 'Set cabana.africa to Allow', 'Come back here and tap Check again.'];
    return ['Click the icon left of the address bar (' + (edge ? '🔒' : '⊶') + ')', 'Site settings → ' + what + ' → Allow', 'Cabana unlocks on its own.'];
  }

  var ICO = {
    bell: '<path d="M10.3 21a1.94 1.94 0 0 0 3.4 0M3.3 16.6c-.6.7-.1 1.8.8 1.8h15.8c.9 0 1.4-1.1.8-1.8C19.5 15 18 13.2 18 8A6 6 0 0 0 6 8c0 5.2-1.5 7-2.7 8.6"/>',
    pin: '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    down: '<path d="m6 9 6 6 6-6"/>',
    share: '<path d="M12 3v12M8 7l4-4 4 4"/><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/>',
    plus: '<rect x="4" y="4" width="16" height="16" rx="4"/><path d="M12 8v8M8 12h8"/>',
    ext: '<path d="M14 4h6v6M20 4l-9 9"/><path d="M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5"/>'
  };
  function svg(n) { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ICO[n] + '</svg>'; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  /* ── styles ───────────────────────────────────────────────────── */
  var CSS = [
    "@font-face{font-family:'Cabana Display';src:url('/fonts/cabana-display-soft.woff2') format('woff2');font-weight:100 900;font-display:swap}",
    '.cp{position:fixed;inset:0;z-index:2147483200;display:flex;align-items:flex-end;justify-content:center;padding:0;background:rgba(9,7,26,.62);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);opacity:0;transition:opacity .35s cubic-bezier(.22,1,.36,1);font-family:Geist,Inter,system-ui,-apple-system,sans-serif;-webkit-font-smoothing:antialiased;color:#120F2B}',
    '@media(min-width:620px){.cp{align-items:center;padding:24px}}',
    '.cp.on{opacity:1}',
    '.cp *{box-sizing:border-box}',
    '.cp-card{position:relative;width:min(440px,100%);max-height:94vh;overflow:auto;background:#fff;border-radius:28px 28px 0 0;padding:26px 22px calc(20px + env(safe-area-inset-bottom,0px));box-shadow:0 -20px 70px rgba(9,7,26,.35);transform:translateY(40px);transition:transform .5s cubic-bezier(.22,1,.36,1)}',
    '@media(min-width:620px){.cp-card{border-radius:28px;padding:30px 28px 24px}}',
    '.cp.on .cp-card{transform:none}',
    '.cp-hero{position:relative;height:120px;margin:-26px -22px 18px;border-radius:28px 28px 0 0;overflow:hidden;background:radial-gradient(120% 130% at 50% 0%,#3A2489 0%,#0D0A26 70%)}',
    '@media(min-width:620px){.cp-hero{margin:-30px -28px 20px}}',
    '.cp-hero i{position:absolute;left:50%;top:58%;width:44px;height:44px;margin:-22px 0 0 -22px;border-radius:50%;border:1.5px solid rgba(51,224,195,.55);animation:cpRing 2.6s cubic-bezier(.22,1,.36,1) infinite}',
    '.cp-hero i:nth-child(2){animation-delay:.85s}.cp-hero i:nth-child(3){animation-delay:1.7s}',
    '@keyframes cpRing{from{transform:scale(.4);opacity:1}to{transform:scale(4.2);opacity:0}}',
    '.cp-hero b{position:absolute;left:50%;top:58%;width:48px;height:48px;margin:-24px 0 0 -24px;border-radius:16px;display:grid;place-items:center;color:#fff;background:linear-gradient(145deg,#8B3DFF,#4A36E0);box-shadow:0 10px 30px rgba(123,47,247,.55)}',
    '.cp-hero b svg{width:22px;height:22px}',
    '.cp-h{margin:0;font-family:"Cabana Display",Geist,Georgia,serif!important;font-variation-settings:"SOFT" 100!important;font-weight:520;font-size:26px;line-height:1.1;letter-spacing:-.02em;text-align:center}',
    '.cp-p{margin:8px auto 18px;max-width:330px;text-align:center;font-size:14px;line-height:1.5;color:#4B4867}',
    '.cp-rows{display:grid;gap:9px}',
    '.cp-row{display:flex;align-items:center;gap:12px;padding:12px 12px 12px 13px;border-radius:17px;border:1px solid rgba(18,15,43,.09);background:#F7F5FE;transition:border-color .3s,background .3s}',
    '.cp-row.ok{background:rgba(20,184,166,.07);border-color:rgba(20,184,166,.25)}',
    '.cp-row.bad{background:rgba(229,72,77,.06);border-color:rgba(229,72,77,.22)}',
    '.cp-ico{width:38px;height:38px;border-radius:12px;flex-shrink:0;display:grid;place-items:center;background:#fff;color:#7B2FF7;box-shadow:0 2px 8px rgba(18,15,43,.06)}',
    '.cp-row.ok .cp-ico{background:#14B8A6;color:#fff}',
    '.cp-ico svg{width:18px;height:18px}',
    '.cp-txt{flex:1;min-width:0}',
    '.cp-txt b{display:block;font-size:14.5px;font-weight:650}',
    '.cp-txt span{display:block;font-size:12.5px;color:#6D6A88;margin-top:1px;line-height:1.4}',
    '.cp-chip{flex-shrink:0;font-size:12px;font-weight:700;padding:5px 10px;border-radius:99px;background:#fff;color:#4B4867;border:1px solid rgba(18,15,43,.1)}',
    '.cp-row.ok .cp-chip{background:transparent;border-color:transparent;color:#0E7C70}',
    '.cp-row.bad .cp-chip{color:#B4262B;border-color:rgba(229,72,77,.3)}',
    '.cp-steps{margin:14px 0 0;padding:14px 16px 14px 34px;border-radius:16px;background:#0D0A26;color:rgba(255,255,255,.86);font-size:13.5px;line-height:1.55}',
    '.cp-steps li+li{margin-top:5px}',
    '.cp-steps b{color:#fff}',
    '.cp-go{position:relative;display:flex;align-items:center;justify-content:center;gap:9px;width:100%;min-height:54px;margin-top:16px;border:0;border-radius:17px;color:#fff;font:650 15.5px/1 Geist,Inter,system-ui,sans-serif;cursor:pointer;background:linear-gradient(135deg,#8B3DFF 0%,#6A2DF0 48%,#4A36E0 100%);box-shadow:0 14px 34px rgba(106,45,240,.36);transition:transform .2s,opacity .2s}',
    '.cp-go:active{transform:scale(.985)}',
    '.cp-go[disabled]{opacity:.6;cursor:default}',
    '.cp-go svg{width:18px;height:18px}',
    '.cp-alt{display:block;width:100%;margin-top:9px;min-height:46px;border-radius:15px;border:1px solid rgba(18,15,43,.12);background:#fff;color:#4B4867;font:600 14px/1 Geist,Inter,system-ui,sans-serif;cursor:pointer}',
    '.cp-alt:hover{border-color:rgba(18,15,43,.25);color:#120F2B}',
    '.cp-learn{margin-top:14px}',
    '.cp-learn summary{list-style:none;display:inline-flex;align-items:center;gap:5px;cursor:pointer;font-size:12.5px;font-weight:600;color:#8C89A6}',
    '.cp-learn summary::-webkit-details-marker{display:none}',
    '.cp-learn summary svg{width:13px;height:13px;transition:transform .25s}',
    '.cp-learn[open] summary svg{transform:rotate(180deg)}',
    '.cp-learn p{margin:8px 0 0;font-size:12.5px;line-height:1.55;color:#6D6A88}',
    '.cp-done{text-align:center;padding:10px 0 4px}',
    '.cp-done i{display:grid;place-items:center;width:70px;height:70px;margin:0 auto 12px;border-radius:50%;background:#33E0C3;color:#0D0A26;box-shadow:0 0 0 10px rgba(51,224,195,.18);animation:cpPop .55s cubic-bezier(.34,1.56,.64,1) both}',
    '.cp-done i svg{width:32px;height:32px}',
    '@keyframes cpPop{from{transform:scale(.4);opacity:0}to{transform:none;opacity:1}}',
    '.cp-note{margin-top:12px;font-size:12px;color:#8C89A6;text-align:center;line-height:1.5}',
    '@media(prefers-reduced-motion:reduce){.cp,.cp *{animation:none!important;transition:none!important}}'
  ].join('');

  function injectCSS() {
    if (D.getElementById('cp-css')) return;
    var s = D.createElement('style');
    s.id = 'cp-css'; s.textContent = CSS;
    (D.head || D.documentElement).appendChild(s);
  }

  /* ── render ───────────────────────────────────────────────────── */
  function row(key, icon, title, s) {
    var ok = s === 'on' || s === 'unsupported';
    var bad = s === 'blocked' || s === 'off' || s === 'inapp';
    var sub = {
      notif: {
        on: 'Hosts, guests and bookings reach you instantly', ask: 'So a host or guest never waits on you',
        blocked: 'Blocked in this browser', install: 'Needs Cabana on your Home Screen', inapp: 'Not possible inside this app',
        unsupported: 'Not available here. We’ll email and text you'
      },
      geo: {
        on: 'Nearby stays, exact pick-ups and SOS', ask: 'For nearby stays, exact pick-ups and SOS',
        blocked: 'Blocked in this browser', off: 'Your phone’s location is switched off', inapp: 'Not possible inside this app',
        unsupported: 'Not available on this device', weak: 'On. We’ll use Wi-Fi when GPS is weak'
      }
    }[key][s] || '';
    var chip = ok ? svg('check').replace('<svg', '<svg width="16" height="16"') : bad ? (s === 'off' ? 'Off' : 'Blocked') : 'Needed';
    return '<div class="cp-row' + (ok ? ' ok' : bad ? ' bad' : '') + '"><span class="cp-ico">' + svg(ok ? 'check' : icon) + '</span>' +
      '<span class="cp-txt"><b>' + title + '</b><span>' + esc(sub) + '</span></span><span class="cp-chip">' + chip + '</span></div>';
  }

  function render(s) {
    if (!gate) return;
    var card = gate.querySelector('.cp-card');
    var n = s.notifications, g = st.geoFix === 'off' && s.location === 'on' ? 'off' : (st.geoFix === 'slow' && s.location !== 'on' ? 'slow' : s.location);
    if (satisfied(s)) {
      card.innerHTML = '<div class="cp-done"><i>' + svg('check') + '</i><h2 class="cp-h">You’re all set</h2>' +
        '<p class="cp-p">Alerts and location are on. Cabana can reach you the moment something happens.</p></div>';
      setTimeout(close, 1300);
      return;
    }
    var html = '<div class="cp-hero" aria-hidden="true"><i></i><i></i><i></i><b>' + svg(n !== 'on' && n !== 'unsupported' ? 'bell' : 'pin') + '</b></div>' +
      '<h2 class="cp-h" id="cp-h">Turn on alerts and location</h2>' +
      '<p class="cp-p">Cabana needs both to work on this device.</p>' +
      '<div class="cp-rows">' + row('notif', 'bell', 'Notifications', n) + row('geo', 'pin', 'Location', g === 'weak' ? 'on' : g === 'slow' ? 'ask' : g) + '</div>';

    var action = '', steps = null, alt = '', note = '';
    if (n === 'inapp' || g === 'inapp') {
      steps = ios
        ? ['Tap <b>•••</b> or the share icon in this app', 'Choose <b>Open in Safari</b>', 'Sign in there, and allow both']
        : ['Tap <b>⋮</b> at the top right of this app', 'Choose <b>Open in Chrome</b> (or your browser)', 'Allow both there'];
      action = android ? '<button class="cp-go" data-a="open-browser">' + svg('ext') + 'Open in Chrome</button>' : '';
      alt = '<button class="cp-alt" data-a="copy">Copy link</button>';
    } else if (n === 'install') {
      steps = ['Tap the <b>Share</b> button in Safari ' + svg('share').replace('<svg', '<svg width="15" height="15" style="vertical-align:-2px"'),
        'Choose <b>Add to Home Screen</b> ' + svg('plus').replace('<svg', '<svg width="15" height="15" style="vertical-align:-2px"'),
        'Open <b>Cabana</b> from your Home Screen and allow alerts'];
      note = 'iPhone only delivers web alerts to apps on the Home Screen.';
      if (g === 'ask') action = '<button class="cp-go" data-a="geo">' + svg('pin') + 'Turn on location</button>';
      else if (g === 'blocked' || g === 'off') { alt = '<button class="cp-alt" data-a="recheck">Check again</button>'; }
    } else if (n === 'ask') {
      action = '<button class="cp-go" data-a="notif">' + svg('bell') + 'Turn on notifications</button>';
    } else if (n === 'blocked') {
      steps = fixSteps('notif');
      alt = '<button class="cp-alt" data-a="recheck">Check again</button>';
    } else if (n === 'quiet') {
      steps = android ? ['Look for the <b>bell</b> or a message at the bottom of the screen', 'Tap it and choose <b>Allow</b>'] : ['Click the <b>bell with a line</b> in the address bar', 'Choose <b>Allow</b>'];
      alt = '<button class="cp-alt" data-a="recheck">Check again</button>';
    } else if (g === 'ask') {
      action = '<button class="cp-go" data-a="geo">' + svg('pin') + 'Turn on location</button>';
    } else if (g === 'blocked') {
      steps = fixSteps('geo');
      alt = '<button class="cp-alt" data-a="recheck">Check again</button>';
    } else if (g === 'off') {
      steps = ios ? ['Open <b>Settings → Privacy &amp; Security</b>', 'Turn <b>Location Services</b> on', 'Come back and tap Check again']
        : twa ? ['Swipe down from the top of your screen and turn <b>Location</b> on',
                 'Open <b>Settings → Apps → Cabana → Permissions → Location</b> and choose <b>Allow</b>',
                 'Come back and tap Check again']
        : ['Swipe down from the top of your screen', 'Tap <b>Location</b> to turn it on', 'Come back and tap Check again'];
      alt = '<button class="cp-alt" data-a="recheck">Check again</button>';
    } else if (g === 'slow') {
      /* Allowed, but no position yet: indoors, or the phone is still
         warming up. Say so, rather than offering the same button again. */
      steps = twa ? ['Step near a window or outside', 'Check <b>Settings → Apps → Cabana → Permissions → Location</b> is on', 'Tap Try again']
        : ['Step near a window or outside', 'Tap Try again'];
      action = '<button class="cp-go" data-a="geo">' + svg('pin') + 'Try again</button>';
    }
    html += (steps ? '<ol class="cp-steps">' + steps.map(function (x) { return '<li>' + (/<b>|<svg/.test(x) ? x : esc(x)) + '</li>'; }).join('') + '</ol>' : '') +
      action + alt + (note ? '<div class="cp-note">' + esc(note) + '</div>' : '') +
      '<details class="cp-learn"><summary>Why Cabana needs this' + svg('down') + '</summary>' +
      '<p>Bookings, payments, messages and Cabana Match requests happen in real time. A host has 20 minutes to answer a guest; an alert that never arrives loses the booking. Location sets exact pick-up points, shows what is near you, and tells the safety desk where you are if you raise an SOS.</p>' +
      '<p>You can change either setting later in your browser or phone settings. Private windows and some in-app browsers can’t keep them on; open Cabana in your normal browser.</p></details>';
    card.innerHTML = html;
  }

  function open() {
    injectCSS();
    if (gate) return;
    /* One permission surface at a time. */
    var plain = D.getElementById('apa-loc-gate');
    if (plain && plain.parentNode) plain.parentNode.removeChild(plain);
    gate = D.createElement('div');
    gate.className = 'cp';
    gate.setAttribute('role', 'dialog');
    gate.setAttribute('aria-modal', 'true');
    gate.setAttribute('aria-labelledby', 'cp-h');
    gate.innerHTML = '<div class="cp-card"></div>';
    D.body.appendChild(gate);
    gate.addEventListener('click', onClick);
    D.documentElement.style.overflow = 'hidden';
    requestAnimationFrame(function () { gate.classList.add('on'); });
    startWatching();
  }

  function close() {
    if (!gate) return;
    var g = gate; gate = null;
    g.classList.remove('on');
    D.documentElement.style.overflow = '';
    setTimeout(function () { if (g.parentNode) g.remove(); }, 400);
  }

  function onClick(e) {
    var b = e.target.closest && e.target.closest('[data-a]');
    if (!b || busy) return;
    var a = b.getAttribute('data-a');
    if (a === 'notif') askNotif(b);
    else if (a === 'geo') askGeo(b);
    else if (a === 'recheck') { b.textContent = 'Checking…'; recheck(true); }
    else if (a === 'open-browser') {
      var here = global.location.href.replace(/^https?:\/\//, '');
      global.location.href = 'intent://' + here + '#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=' + encodeURIComponent(global.location.href) + ';end';
    } else if (a === 'copy') {
      var url = global.location.href;
      (N.clipboard && N.clipboard.writeText ? N.clipboard.writeText(url) : Promise.reject()).then(function () { b.textContent = 'Link copied. Paste it in your browser'; },
        function () { global.prompt('Copy this link into your browser', url); });
    }
  }

  function askNotif(btn) {
    busy = true;
    btn.disabled = true; btn.lastChild.textContent = 'Waiting for your answer…';
    var p;
    try { p = global.Notification.requestPermission(); } catch (e) { p = null; }
    Promise.resolve(p).then(function (res) {
      res = res || global.Notification.permission;
      busy = false;
      if (res === 'granted') {
        try { if (global.ApaPush && global.ApaPush.subscribe) global.ApaPush.subscribe(); } catch (e) {}
        return refresh();
      }
      /* "default" straight back, no prompt: Chrome's quiet mode. */
      if (res === 'default') { st.notifQuiet = true; }
      return refresh();
    }, function () { busy = false; refresh(); });
  }

  function askGeo(btn) {
    busy = true;
    btn.disabled = true; btn.lastChild.textContent = 'Waiting for your answer…';
    probeFix(15000).then(function (r) {
      busy = false;
      /* "off" means the browser said yes but the phone has no fix to give:
         permission is granted, the phone's switch is what's left. */
      if (r === 'off') ls('cabana_loc_ok', '1');
      refresh();
    });
  }

  function recheck(withFix) {
    var p = withFix && st.geoFix === 'off' ? probeFix(10000) : Promise.resolve();
    return p.then(refresh);
  }

  var _rp = null;
  function refresh() {
    if (_rp) return _rp;
    _rp = status().then(function (s) {
      _rp = null;
      if (s.notifications === 'ask' && st.notifQuiet) s.notifications = 'quiet';
      if (gate) render(s);
      return s;
    }, function () { _rp = null; });
    return _rp;
  }

  function startWatching() {
    if (watching) return;
    watching = true;
    watchNotifPerm();
    /* Coming back from Settings is the moment most fixes land. */
    D.addEventListener('visibilitychange', function () { if (D.visibilityState === 'visible' && gate) recheck(true); });
    global.addEventListener('focus', function () { if (gate) refresh(); });
    setInterval(function () { if (gate && D.visibilityState === 'visible') refresh(); }, 4000);
  }

  /* ── entry points ─────────────────────────────────────────────── */
  var _checking = false;
  function check(opts) {
    opts = opts || {};
    if (_checking && !opts.force) return;
    if (!opts.force && exemptPage()) return;
    _checking = true;
    signedIn().then(function (yes) {
      if (!yes && !opts.force) return;
      return whenClear().then(status).then(function (s) {
        if (s.location === 'on' && !opts.force && ls('cabana_loc_ok') !== '1') {
          /* Granted before, never proven: take one fix in the background so
             a phone with location switched off is caught. */
          probeFix(12000).then(function (r) { if (r === 'off' && mobile) { st.geoFix = 'off'; show(); } });
        }
        if (satisfied(s) && !opts.force) return;
        show();
      });
    }).then(function () { _checking = false; }, function () { _checking = false; });
  }

  function show() {
    open();
    refresh();
  }

  global.CabanaPermit = { check: check, show: function (o) { if (o && o.force) { open(); refresh(); } else check(o); }, status: status, close: close };

  if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', function () { setTimeout(check, 900); });
  else setTimeout(check, 900);
})(window);
