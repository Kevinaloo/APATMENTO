/* ═══════════════════════════════════════════════════════════════════
   APATMENTO · PUSH + REALTIME NOTIFICATIONS  v2
   Load after apa-session.js:  <script src="/apa-push.js" defer></script>
   (apa-session.js also loads it on its own for any signed-in page.)

   Three channels, one feed:
     · Web Push           → the lock screen, when Cabana is closed
     · Supabase Realtime  → instant in-page alerts, no polling
     · The service worker → hands a push to the open tab instead of
                            announcing it twice

   All three read the same `notifications` table, so nothing is lost:
   if push is blocked the realtime feed still fires; if the tab is
   closed push still fires; if the realtime socket dropped while a
   laptop slept, the worker's message still arrives. Whichever lands
   first wins, and every alert is shown once, keyed by its id.

   Cabana Match alerts are routed to /cabana-match.js (loaded on
   demand), which raises a full-screen takeover for a host and a live
   offer for a guest.
   ═══════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';
  if (global.ApaPush) return;

  // Public VAPID key. Safe to ship. The private half never leaves the server.
  var VAPID_PUBLIC = 'BIteWNc_QXpcPP2rj0BDVOzFZYUs7mFpys-QdUwwFbtqGANd2l59OOplmMKjQ8X5i2F0SsDn3v4F9S-8XSMSXT8';

  var _sub = null;      // PushSubscription
  var _channel = null;  // realtime channel
  var _channelUid = null;
  var _unread = 0;
  var _uid = null;

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

  function client() {
    try { return (global.ApaSession && global.ApaSession.client && global.ApaSession.client()) || null; }
    catch (e) { return null; }
  }

  /* ── ONE ALERT, ONCE ─────────────────────────────────────────────
     chat.js and this file both listen to the notification feed, and
     the service worker can deliver the same alert again. Every in-page
     toast checks in here first. */
  var _shown = global.__cabanaShown = global.__cabanaShown || {};
  function firstTime(id) {
    if (!id) return true;
    if (_shown[id]) return false;
    _shown[id] = Date.now();
    return true;
  }

  /* ── CABANA MATCH, ON DEMAND ─────────────────────────────────────── */
  var _matchP = null;
  function loadMatch() {
    if (global.CabanaMatch) return Promise.resolve(global.CabanaMatch);
    if (_matchP) return _matchP;
    _matchP = new Promise(function (resolve) {
      var done = function () { resolve(global.CabanaMatch || null); };
      global.addEventListener('cabana:match-ready', done, { once: true });
      var el = document.querySelector('script[src^="/cabana-match.js"]');
      if (!el) {
        el = document.createElement('script');
        el.src = '/cabana-match.js?v=2';
        el.async = true;
        el.onerror = function () { _matchP = null; resolve(null); };
        (document.head || document.documentElement).appendChild(el);
      }
      setTimeout(done, 9000);
    });
    return _matchP;
  }
  global.CabanaMatchLoad = global.CabanaMatchLoad || loadMatch;

  /* ── STYLES ──────────────────────────────────────────────────── */
  var CSS = `
.apa-toast-wrap{position:fixed;top:84px;right:20px;z-index:99996;display:flex;flex-direction:column;gap:10px;pointer-events:none;}
.apa-toast{pointer-events:all;width:340px;max-width:calc(100vw - 40px);background:#FCFCFE;border:1px solid rgba(8,8,15,.09);border-radius:18px;padding:14px 16px;display:flex;gap:12px;align-items:flex-start;box-shadow:0 18px 50px rgba(109,40,255,.16),0 4px 14px rgba(8,8,15,.06);transform:translateX(120%);opacity:0;transition:transform .55s cubic-bezier(.22,1,.36,1),opacity .35s;cursor:pointer;}
.apa-toast.show{transform:none;opacity:1;}
.apa-toast-ico{width:38px;height:38px;border-radius:12px;flex-shrink:0;display:flex;align-items:center;justify-content:center;color:#fff;background:linear-gradient(135deg,#6D28FF,#4F6DFF);}
.apa-toast-ico svg{width:18px;height:18px;}
.apa-toast[data-kind=booking] .apa-toast-ico{background:linear-gradient(135deg,#14B8A6,#4EE0C8);}
.apa-toast[data-kind=payment] .apa-toast-ico{background:linear-gradient(135deg,#F5B12E,#D98E0B);}
.apa-toast[data-kind=message] .apa-toast-ico{background:linear-gradient(135deg,#0D0A26,#3B2BA8);}
.apa-toast-body{flex:1;min-width:0;}
.apa-toast-title{font-family:'Geist','Inter',sans-serif;font-weight:600;font-size:14px;color:#08080F;margin-bottom:2px;line-height:1.3;}
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
      w.setAttribute('aria-live', 'polite');
      document.body.appendChild(w);
    }
    return w;
  }

  var ICONS = {
    booking: '<path d="M20 6 9 17l-5-5"/>',
    payment: '<path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>',
    message: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
    general: '<path d="M10.3 21a1.94 1.94 0 0 0 3.4 0M3.3 16.6c-.6.7-.1 1.8.8 1.8h15.8c.9 0 1.4-1.1.8-1.8C19.5 15 18 13.2 18 8A6 6 0 0 0 6 8c0 5.2-1.5 7-2.7 8.6"/>',
  };

  function toast(n) {
    if (!n || !firstTime(n.id)) return;
    injectCSS();
    var el = document.createElement('div');
    el.className = 'apa-toast';
    el.setAttribute('role', 'status');
    el.setAttribute('data-kind', n.kind || 'general');
    el.innerHTML =
      '<div class="apa-toast-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
      (ICONS[n.kind] || ICONS.general) + '</svg></div>' +
      '<div class="apa-toast-body">' +
      '<div class="apa-toast-title"></div>' +
      '<div class="apa-toast-text"></div>' +
      '</div>' +
      '<button class="apa-toast-x" aria-label="Dismiss"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg></button>';

    // textContent, not innerHTML. Notification bodies are user-influenced
    // (host names, listing titles) and must never be parsed as markup.
    el.querySelector('.apa-toast-title').textContent = n.title || 'Cabana';
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
    el.addEventListener('click', function () {
      close();
      if (n.id) markRead(n.id);
      if (n.url) {
        var conv = (String(n.url).match(/[?&]c=([0-9a-f-]{36})/i) || [])[1];
        if (conv && global.CabanaChat && global.CabanaChat.openConversation) { global.CabanaChat.openConversation(conv); return; }
        location.href = n.url;
      }
      else if (global.CabanaPulse) global.CabanaPulse.open('notifs');
    });

    setTimeout(close, 7000);
  }

  function markRead(id) {
    var sb = client();
    if (!sb || !id) return;
    sb.from('notifications').update({ read: true }).eq('id', id).then(function () {}, function () {});
  }

  /* ── BELL BADGE ──────────────────────────────────────────────── */
  function setUnread(n) {
    _unread = Math.max(0, n);
    var b = document.querySelector('.apa-bell-badge');
    if (b) {
      b.textContent = _unread > 9 ? '9+' : String(_unread);
      b.classList.toggle('on', _unread > 0);
    }
    /* The installed app's icon carries the same count. */
    try {
      if (_unread > 0 && navigator.setAppBadge) navigator.setAppBadge(_unread);
      else if (!_unread && navigator.clearAppBadge) navigator.clearAppBadge();
    } catch (e) {}
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
    btn.addEventListener('click', function () {
      if (global.CabanaPulse) global.CabanaPulse.open('notifs');
      else location.href = '/dashboard.html#notifications';
    });
    host.insertBefore(btn, host.firstChild);
    setUnread(_unread);
  }

  /* ── PUSH SUBSCRIPTION ───────────────────────────────────────────
     Healthy means: permission granted, a subscription that was made
     with today's key, and a row on the server that points at it. The
     check runs on every signed-in page, so a subscription the browser
     rotated or dropped is repaired the next time the person opens
     Cabana rather than the next time someone tries to reach them. */
  function sameKey(sub) {
    try {
      var k = sub && sub.options && sub.options.applicationServerKey;
      if (!k) return true;                        // browser does not expose it; trust it
      return b64(k) === VAPID_PUBLIC;
    } catch (e) { return true; }
  }

  async function subscribe(userId) {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return null;
    if (!('Notification' in window) || Notification.permission !== 'granted') return null;

    var reg = await Promise.race([
      navigator.serviceWorker.ready,
      new Promise(function (r) { setTimeout(function () { r(null); }, 10000); })
    ]);
    if (!reg || !reg.pushManager) return null;
    _sub = await reg.pushManager.getSubscription();

    if (_sub && !sameKey(_sub)) {
      try { await _sub.unsubscribe(); } catch (e) {}
      _sub = null;
    }
    if (!_sub) {
      _sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlB64ToU8(VAPID_PUBLIC),
      });
    }
    await persist(_sub, userId || _uid);
    return _sub;
  }

  /* Store the subscription against the user. Endpoint is the unique
     key: re-subscribing the same browser must update, not duplicate. */
  async function persist(sub, userId) {
    var sb = client();
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
  function onIncoming(n, via) {
    if (!n) return;
    if (n.kind === 'match') {
      loadMatch().then(function (m) {
        var handled = m && (via === 'push' ? m.onPush(n.__push || n) : m.onNotification(n));
        if (!handled) toast(n);
      });
    } else if (document.visibilityState === 'visible') {
      toast(n);
      if (global.CabanaPulse) {
        try {
          global.CabanaPulse.state.notifications.unshift({
            id: n.id || ('rt-' + Date.now()),
            kind: n.kind || 'system',
            title: n.title || 'Notification',
            text: n.body || '',
            time: 'Just now',
            read: false,
            link: n.url,
          });
          if (global.CabanaPulse.playChime) global.CabanaPulse.playChime();
        } catch (e) {}
      }
    }
    if (via !== 'push') setUnread(_unread + 1);
  }

  function listen(userId) {
    var sb = client();
    if (!sb || !userId) return;
    if (_channel && _channelUid === userId) return;
    if (_channel) { try { sb.removeChannel(_channel); } catch (e) {} _channel = null; }

    _channelUid = userId;
    _channel = sb.channel('notif:' + userId)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: 'user_id=eq.' + userId,
      }, function (payload) { onIncoming(payload.new, 'realtime'); })
      .subscribe(function (status) {
        /* A socket that dropped while the device slept comes back here.
           Catch up on anything that landed in the gap. */
        if (status === 'SUBSCRIBED') safe(function () { loadUnread(userId); }, 'resync');
      });
  }

  async function loadUnread(userId) {
    var sb = client();
    if (!sb || !userId) return;
    var r = await sb.from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId).eq('read', false);
    if (!r.error) setUnread(r.count || 0);
  }

  /* ── THE WORKER HANDS US A PUSH WHEN THIS TAB IS IN FRONT ───────── */
  if (navigator.serviceWorker && navigator.serviceWorker.addEventListener) {
    navigator.serviceWorker.addEventListener('message', function (e) {
      var m = e && e.data || {};
      if (m.type === 'cabana:push' && m.payload) {
        var d = m.payload;
        var n = { id: d.nid || null, kind: d.kind || 'general', title: d.title, body: d.body, url: d.url, meta: {}, __push: d };
        onIncoming(n, 'push');
      }
      if (m.type === 'cabana:open' && m.url && /[?&](req|match)=[0-9a-f-]{36}/i.test(m.url)) {
        loadMatch().then(function (cm) { if (cm && cm.openUrl) cm.openUrl(m.url); });
      }
    });
  }

  /* ── CATCHING UP WHEN CABANA OPENS ─────────────────────────────────
     A host who swiped a push away, or whose phone was on silent, opens
     Cabana later. If a guest is still waiting, put them in front of the
     host once, wherever they landed. The same for a guest's live
     request: the pill follows them to any page. */
  async function catchUp(userId) {
    var sb = client();
    if (!sb || !userId) return;
    var live = null;
    try { live = JSON.parse(localStorage.getItem('cm_live') || 'null'); } catch (e) {}
    if (live && live.exp && new Date(live.exp).getTime() > Date.now() && !global.CabanaMatch) {
      loadMatch().then(function (m) { if (m && m.restore) m.restore(); });
    }
    if (/partner-cabana/.test(location.pathname)) return;   // the inbox handles it there
    var since = new Date(Date.now() - 25 * 60000).toISOString();
    var r = await sb.from('notifications').select('id,meta,created_at')
      .eq('user_id', userId).eq('kind', 'match').eq('read', false)
      .gt('created_at', since).order('created_at', { ascending: false }).limit(5);
    var rows = (r && r.data) || [];
    var hostWaiting = rows.some(function (x) { return x.meta && x.meta.role === 'host' && !x.meta.engaged; });
    if (hostWaiting) loadMatch().then(function (m) { if (m && m.hostCatchUp) m.hostCatchUp(); });
  }

  /* ── PERMISSION ──────────────────────────────────────────────── */
  async function ask(userId) {
    if (!('Notification' in window)) return false;
    if (Notification.permission === 'granted') { await subscribe(userId); return true; }
    if (Notification.permission === 'denied') return false;
    var p = await Notification.requestPermission();
    if (p !== 'granted') return false;
    await subscribe(userId);
    return true;
  }

  /* The mandatory permission gate lives in cabana-permit.js, which
     covers notifications and location together, every browser state,
     installed app or tab. This stays as the entry point older pages
     call. */
  function requireNotifications() {
    return loadPermit().then(function (P) { if (P && P.check) P.check(); });
  }
  var _permitP = null;
  function loadPermit() {
    if (global.CabanaPermit) return Promise.resolve(global.CabanaPermit);
    if (_permitP) return _permitP;
    _permitP = new Promise(function (resolve) {
      var el = document.querySelector('script[src^="/cabana-permit.js"]');
      if (!el) {
        el = document.createElement('script');
        el.src = '/cabana-permit.js?v=1';
        el.async = true;
        (document.head || document.documentElement).appendChild(el);
      }
      var t = setInterval(function () { if (global.CabanaPermit) { clearInterval(t); resolve(global.CabanaPermit); } }, 60);
      setTimeout(function () { clearInterval(t); resolve(global.CabanaPermit || null); }, 10000);
    });
    return _permitP;
  }

  /* ── BOOT ────────────────────────────────────────────────────── */
  function boot(st) {
    injectCSS();
    if (st.status !== 'user') { _unread = 0; _uid = null; return; }
    var uid = st.user && st.user.id;
    if (!uid) return;
    var first = _uid !== uid;
    _uid = uid;

    safe(function () { mountBell(); }, 'bell');
    if (!first) return;
    safe(function () { loadUnread(uid); }, 'unread');
    safe(function () { listen(uid); }, 'realtime');
    setTimeout(function () { safe(function () { catchUp(uid); }, 'catchup'); }, 900);

    if (('Notification' in window) && Notification.permission === 'granted') {
      safe(function () { subscribe(uid).catch(function (e) { console.warn('[push] subscribe:', e && e.message); }); }, 'subscribe');
    }
    /* The permission gate decides for itself which pages it guards. */
    setTimeout(function () { safe(function () { loadPermit(); }, 'permit'); }, 700);
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

  /* Opening Cabana clears the dot on the installed app's icon. */
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState !== 'visible' || !_uid) return;
    safe(function () { loadUnread(_uid); }, 'unread-visible');
  });

  global.ApaPush = {
    ask: ask,
    subscribe: subscribe,
    toast: toast,
    setUnread: setUnread,
    requireNotifications: requireNotifications,
    loadMatch: loadMatch,
    firstTime: firstTime,
    vapid: VAPID_PUBLIC,
  };
})(window);
