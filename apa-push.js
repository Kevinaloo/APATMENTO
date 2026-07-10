/* ═══════════════════════════════════════════════════════════════════
   APATMENTO · PUSH + REALTIME NOTIFICATIONS
   Load after apa-session.js:  <script src="/apa-push.js" defer></script>

   Two channels, one feed:
     · Web Push      → notifications when the tab is closed
     · Supabase Realtime → instant in-tab toasts, no polling

   Both read the same `notifications` table, so nothing is ever lost:
   if push is blocked, the realtime feed still fires; if the tab is
   closed, push still fires. Whichever arrives first wins, and the
   bell badge reconciles on next load.
   ═══════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';
  if (global.ApaPush) return;

  // Public VAPID key. Safe to ship — the private half never leaves the server.
  var VAPID_PUBLIC = 'BIteWNc_QXpcPP2rj0BDVOzFZYUs7mFpys-QdUwwFbtqGANd2l59OOplmMKjQ8X5i2F0SsDn3v4F9S-8XSMSXT8';

  var _sub = null;      // PushSubscription
  var _channel = null;  // realtime channel
  var _unread = 0;

  function safe(fn, label) {
    try { return fn(); } catch (e) { console.warn('[push:' + (label || '?') + ']', e && e.message); }
  }

  function urlB64ToU8(b64) {
    var pad = '='.repeat((4 - (b64.length % 4)) % 4);
    var s = (b64 + pad).replace(/-/g, '+').replace(/_/g, '/');
    var raw = atob(s);
    var out = new Uint8Array(raw.length);
    for (var i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
    return out;
  }

  function b64(buf) {
    return btoa(String.fromCharCode.apply(null, new Uint8Array(buf)))
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  }

  /* ── STYLES ──────────────────────────────────────────────────── */
  var CSS = `
.apa-toast-wrap{position:fixed;top:84px;right:20px;z-index:99996;display:flex;flex-direction:column;gap:10px;pointer-events:none;}
.apa-toast{pointer-events:all;width:340px;max-width:calc(100vw - 40px);background:#FCFCFE;border:1px solid rgba(8,8,15,.09);border-radius:18px;padding:14px 16px;display:flex;gap:12px;align-items:flex-start;box-shadow:0 18px 50px rgba(109,40,255,.16),0 4px 14px rgba(8,8,15,.06);transform:translateX(120%);opacity:0;transition:transform .55s cubic-bezier(.22,1,.36,1),opacity .35s;cursor:pointer;}
.apa-toast.show{transform:none;opacity:1;}
.apa-toast-ico{width:38px;height:38px;border-radius:12px;flex-shrink:0;display:flex;align-items:center;justify-content:center;color:#fff;background:linear-gradient(135deg,#6D28FF,#4F6DFF);}
.apa-toast-ico svg{width:18px;height:18px;}
.apa-toast[data-kind=booking] .apa-toast-ico{background:linear-gradient(135deg,#14B8A6,#4EE0C8);}
.apa-toast[data-kind=payment] .apa-toast-ico{background:linear-gradient(135deg,#F5B12E,#D98E0B);}
.apa-toast-body{flex:1;min-width:0;}
.apa-toast-title{font-family:'Fraunces',Georgia,serif;font-weight:500;font-size:14px;color:#08080F;margin-bottom:2px;line-height:1.3;}
.apa-toast-text{font-size:12.5px;color:#474A66;line-height:1.45;}
.apa-toast-x{width:26px;height:26px;border-radius:50%;border:none;background:rgba(8,8,15,.05);color:#8B8EAC;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.apa-toast-x:hover{background:rgba(8,8,15,.1);}
@media(max-width:520px){.apa-toast-wrap{top:auto;bottom:90px;right:14px;left:14px;}.apa-toast{width:100%;}}

/* bell */
.apa-bell{position:relative;width:38px;height:38px;border-radius:12px;border:none;background:rgba(8,8,15,.05);color:inherit;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background .2s;}
.apa-bell:hover{background:rgba(8,8,15,.1);}
.nav.on-dark .apa-bell{background:rgba(255,255,255,.1);color:#fff;}
.apa-bell-badge{position:absolute;top:5px;right:5px;min-width:16px;height:16px;padding:0 4px;border-radius:9px;background:#FF6A3C;color:#fff;font-size:10px;font-weight:700;display:none;align-items:center;justify-content:center;line-height:1;}
.apa-bell-badge.on{display:flex;}
`;

  function injectCSS() {
    if (document.getElementById('apa-push-css')) return;
    var s = document.createElement('style');
    s.id = 'apa-push-css';
    s.textContent = CSS;
    (document.head || document.documentElement).appendChild(s);
  }

  /* ── TOASTS ──────────────────────────────────────────────────── */
  function wrap() {
    var w = document.getElementById('apa-toast-wrap');
    if (!w) {
      w = document.createElement('div');
      w.className = 'apa-toast-wrap';
      w.id = 'apa-toast-wrap';
      document.body.appendChild(w);
    }
    return w;
  }

  var ICONS = {
    booking: '<path d="M20 6 9 17l-5-5"/>',
    payment: '<path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>',
    general: '<path d="M10.3 21a1.94 1.94 0 0 0 3.4 0M3.3 16.6c-.6.7-.1 1.8.8 1.8h15.8c.9 0 1.4-1.1.8-1.8C19.5 15 18 13.2 18 8A6 6 0 0 0 6 8c0 5.2-1.5 7-2.7 8.6"/>',
  };

  function toast(n) {
    injectCSS();
    var el = document.createElement('div');
    el.className = 'apa-toast';
    el.setAttribute('data-kind', n.kind || 'general');
    el.innerHTML =
      '<div class="apa-toast-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
      (ICONS[n.kind] || ICONS.general) + '</svg></div>' +
      '<div class="apa-toast-body">' +
      '<div class="apa-toast-title"></div>' +
      '<div class="apa-toast-text"></div>' +
      '</div>' +
      '<button class="apa-toast-x" aria-label="Dismiss"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg></button>';

    // textContent, not innerHTML — notification bodies are user-influenced
    // (host names, listing titles) and must never be parsed as markup.
    el.querySelector('.apa-toast-title').textContent = n.title || 'Apatmento';
    el.querySelector('.apa-toast-text').textContent = n.body || '';

    wrap().appendChild(el);
    requestAnimationFrame(function () { el.classList.add('show'); });

    function close() {
      el.classList.remove('show');
      setTimeout(function () { el.remove(); }, 500);
    }
    el.querySelector('.apa-toast-x').addEventListener('click', function (e) {
      e.stopPropagation(); close();
    });
    if (n.url) el.addEventListener('click', function () { location.href = n.url; });

    setTimeout(close, 7000);
  }

  /* ── BELL BADGE ──────────────────────────────────────────────── */
  function setUnread(n) {
    _unread = Math.max(0, n);
    var b = document.querySelector('.apa-bell-badge');
    if (!b) return;
    b.textContent = _unread > 9 ? '9+' : String(_unread);
    b.classList.toggle('on', _unread > 0);
  }

  function mountBell() {
    injectCSS();
    if (document.getElementById('apa-bell')) return;
    var host = document.querySelector('.nav-right');
    if (!host) return;
    var btn = document.createElement('button');
    btn.className = 'apa-bell';
    btn.id = 'apa-bell';
    btn.setAttribute('aria-label', 'Notifications');
    btn.innerHTML =
      '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' +
      ICONS.general + '</svg><span class="apa-bell-badge"></span>';
    btn.addEventListener('click', function () { location.href = '/dashboard.html#notifications'; });
    host.insertBefore(btn, host.firstChild);
    setUnread(_unread);
  }

  /* ── PUSH SUBSCRIPTION ───────────────────────────────────────── */
  async function subscribe(userId) {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return null;
    if (Notification.permission !== 'granted') return null;

    var reg = await navigator.serviceWorker.ready;
    _sub = await reg.pushManager.getSubscription();

    if (!_sub) {
      _sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlB64ToU8(VAPID_PUBLIC),
      });
    }
    await persist(_sub, userId);
    return _sub;
  }

  /* Store the subscription against the user. Endpoint is the unique
     key: re-subscribing the same browser must update, not duplicate. */
  async function persist(sub, userId) {
    var sb = global.ApaSession && ApaSession.client && ApaSession.client();
    if (!sb || !sub) return;

    var raw = sub.toJSON ? sub.toJSON() : {};
    var keys = raw.keys || {};
    var row = {
      user_id: userId || null,
      endpoint: sub.endpoint,
      p256dh: keys.p256dh || b64(sub.getKey('p256dh')),
      auth: keys.auth || b64(sub.getKey('auth')),
      user_agent: navigator.userAgent.slice(0, 300),
      last_seen_at: new Date().toISOString(),
    };

    var res = await sb.from('push_subscriptions')
      .upsert(row, { onConflict: 'endpoint' });
    if (res.error) console.warn('[push] persist:', res.error.message);
  }

  /* ── REALTIME FEED ───────────────────────────────────────────── */
  function listen(userId) {
    var sb = global.ApaSession && ApaSession.client && ApaSession.client();
    if (!sb || !userId || _channel) return;

    _channel = sb.channel('notif:' + userId)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: 'user_id=eq.' + userId,
      }, function (payload) {
        var n = payload.new;
        // If the page is hidden the service worker's push handler will
        // show the OS notification. Showing a toast too would double up.
        if (document.visibilityState === 'visible') toast(n);
        setUnread(_unread + 1);
      })
      .subscribe();
  }

  async function loadUnread(userId) {
    var sb = global.ApaSession && ApaSession.client && ApaSession.client();
    if (!sb || !userId) return;
    var r = await sb.from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId).eq('read', false);
    if (!r.error) setUnread(r.count || 0);
  }

  /* ── PERMISSION PROMPT (deferred, non-intrusive) ─────────────── */
  async function ask(userId) {
    if (!('Notification' in window)) return false;
    if (Notification.permission === 'granted') { await subscribe(userId); return true; }
    if (Notification.permission === 'denied') return false;
    var p = await Notification.requestPermission();
    if (p !== 'granted') return false;
    await subscribe(userId);
    return true;
  }

  /* ── MANDATORY NOTIFICATION GATE ─────────────────────────────────
     Once the user is inside the app, notifications are required — the
     product is bookings and payments, and silent failures there are
     worse than a permission prompt.

     Browsers only surface the native permission dialog on a user
     gesture, so we present our own modal and let their click drive it.
     If they hard-deny, the OS locks us out permanently; at that point
     nagging is pointless and we explain how to re-enable instead. */
  function gateCSS() {
    if (document.getElementById('apa-gate-css')) return;
    var s = document.createElement('style');
    s.id = 'apa-gate-css';
    s.textContent = `
.apa-gate{position:fixed;inset:0;z-index:99999;background:rgba(8,8,15,.72);backdrop-filter:blur(10px);display:flex;align-items:center;justify-content:center;padding:20px;opacity:0;transition:opacity .35s;}
.apa-gate.show{opacity:1;}
.apa-gate-card{background:#FCFCFE;border-radius:26px;padding:34px 30px;max-width:400px;width:100%;text-align:center;box-shadow:0 30px 80px rgba(8,8,15,.4);transform:translateY(16px) scale(.97);transition:transform .45s cubic-bezier(.22,1,.36,1);}
.apa-gate.show .apa-gate-card{transform:none;}
.apa-gate-ico{width:62px;height:62px;border-radius:19px;margin:0 auto 20px;display:flex;align-items:center;justify-content:center;color:#fff;background:linear-gradient(135deg,#6D28FF,#4F6DFF);box-shadow:0 12px 30px rgba(109,40,255,.34);}
.apa-gate-ico svg{width:28px;height:28px;}
.apa-gate-h{font-family:'Fraunces',Georgia,serif;font-size:23px;font-weight:500;color:#08080F;margin-bottom:10px;}
.apa-gate-p{font-size:14px;color:#474A66;line-height:1.6;margin-bottom:24px;}
.apa-gate-btn{width:100%;padding:15px;border-radius:100px;border:none;background:linear-gradient(135deg,#6D28FF,#4F6DFF);color:#fff;font-weight:600;font-size:15px;cursor:pointer;transition:transform .2s,box-shadow .2s;}
.apa-gate-btn:hover{transform:translateY(-2px);box-shadow:0 14px 34px rgba(109,40,255,.34);}
.apa-gate-btn:disabled{opacity:.6;cursor:default;transform:none;}
.apa-gate-note{margin-top:16px;font-size:12px;color:#8B8EAC;line-height:1.55;}
`;
    (document.head || document.documentElement).appendChild(s);
  }

  function showGate(denied) {
    gateCSS();
    if (document.getElementById('apa-gate')) return;

    var g = document.createElement('div');
    g.className = 'apa-gate';
    g.id = 'apa-gate';
    g.innerHTML =
      '<div class="apa-gate-card">' +
      '<div class="apa-gate-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">' + ICONS.general + '</svg></div>' +
      '<div class="apa-gate-h"></div>' +
      '<div class="apa-gate-p"></div>' +
      (denied ? '' : '<button class="apa-gate-btn" id="apa-gate-btn">Turn on notifications</button>') +
      '<div class="apa-gate-note"></div>' +
      '</div>';

    g.querySelector('.apa-gate-h').textContent = denied
      ? 'Notifications are blocked' : 'Stay in the loop';

    g.querySelector('.apa-gate-p').textContent = denied
      ? 'Apatmento needs notifications to tell you about bookings, payments and messages. Your browser has blocked them for this site.'
      : 'Apatmento sends you booking confirmations, payment receipts and host messages the moment they happen. This is required to use the app.';

    g.querySelector('.apa-gate-note').textContent = denied
      ? 'Tap the lock icon in your address bar → Site settings → Notifications → Allow, then reload this page.'
      : 'You can change this anytime in your browser settings.';

    document.body.appendChild(g);
    requestAnimationFrame(function () { g.classList.add('show'); });

    var btn = g.querySelector('#apa-gate-btn');
    if (btn) btn.addEventListener('click', async function () {
      btn.disabled = true; btn.textContent = 'Waiting for permission…';
      var uid = (global.ApaSession && ApaSession.get && ApaSession.get().user || {}).id;
      var ok = await ask(uid);
      if (ok) {
        g.classList.remove('show');
        setTimeout(function () { g.remove(); }, 400);
        toast({ title: 'Notifications on', body: 'You\u2019re all set. We\u2019ll keep you posted.', kind: 'general' });
      } else {
        // Denied at the OS level. The prompt will never appear again,
        // so swap to instructions rather than leaving a dead button.
        g.remove();
        showGate(true);
      }
    });
  }

  /* Call this from any in-app page once a user is signed in. */
  function requireNotifications() {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) return;
    var p = Notification.permission;
    if (p === 'granted') return;
    if (p === 'denied') { showGate(true); return; }
    showGate(false);
  }

  // Pages that count as "inside the app". Marketing and auth pages are
  // deliberately excluded — gating a signed-out visitor is hostile.
  // Declared before boot() so it is initialised when boot runs.
  var IN_APP_PAGES = /(dashboard|my-bookings|profile|partner-|booking-confirm|apartments)/i;

  /* ── BOOT ────────────────────────────────────────────────────── */
  function boot(st) {
    injectCSS();
    if (st.status !== 'user') { _unread = 0; return; }
    var uid = st.user && st.user.id;
    if (!uid) return;

    safe(function () { mountBell(); }, 'bell');
    safe(function () { loadUnread(uid); }, 'unread');
    safe(function () { listen(uid); }, 'realtime');

    if (!('Notification' in window)) return;
    if (Notification.permission === 'granted') {
      safe(function () { subscribe(uid); }, 'subscribe');
    } else if (IN_APP_PAGES.test(location.pathname)) {
      // Inside the app proper — notifications are mandatory here.
      // Delay slightly so the page paints before we block it.
      setTimeout(function () { safe(requireNotifications, 'gate'); }, 1200);
    }
  }

  function init() {
    if (global.ApaSession) { ApaSession.subscribe(boot); return true; }
    return false;
  }
  if (!init()) {
    var n = 0, iv = setInterval(function () {
      if (init() || ++n > 60) clearInterval(iv);
    }, 50);
  }

  global.ApaPush = {
    ask: ask,
    subscribe: subscribe,
    toast: toast,
    setUnread: setUnread,
    requireNotifications: requireNotifications,
    vapid: VAPID_PUBLIC,
  };
})(window);
