/* ════════════════════════════════════════════════════════════════
   APATMENTO PWA MANAGER
   Drop this script on every page: <script src="/pwa.js" defer></script>
   Handles:
   1. Service Worker registration
   2. Custom install prompt (beautiful, on-brand)
   3. Web Push notification subscription
   4. Offline/online status banner
   5. Update available banner
════════════════════════════════════════════════════════════════ */

(function() {
'use strict';

/* ── EQUATOR LIGHT bootstrap — ensures the brand system on every page ── */
try {
  if (!document.querySelector('link[href="/brand.css"]')) {
    var __brandCss = document.createElement('link');
    __brandCss.rel = 'stylesheet';
    __brandCss.href = '/brand.css';
    (document.head || document.documentElement).appendChild(__brandCss);
  }
  if (!window.__APA_BRAND__ && !document.querySelector('script[src="/brand.js"]')) {
    var __brandJs = document.createElement('script');
    __brandJs.src = '/brand.js';
    __brandJs.defer = true;
    (document.head || document.documentElement).appendChild(__brandJs);
  }
} catch (e) {}

/* ── CSS injected once ── */
const PWA_CSS = `
.pwa-install-banner{position:fixed;bottom:24px;left:50%;transform:translateX(-50%) translateY(120px);z-index:99998;width:calc(100% - 40px);max-width:420px;background:#FCFCFD;border:1px solid rgba(10,10,20,0.1);border-radius:22px;padding:18px 20px;box-shadow:0 24px 64px rgba(123,47,247,0.18),0 8px 24px rgba(10,10,20,0.08);display:flex;align-items:center;gap:14px;transition:transform .5s cubic-bezier(.34,1.56,.64,1),opacity .4s;opacity:0;pointer-events:none;}
.pwa-install-banner.show{transform:translateX(-50%) translateY(0);opacity:1;pointer-events:all;}
.pwa-install-ico{width:48px;height:48px;border-radius:14px;background:linear-gradient(135deg,#B8A4F4,#7B2FF7);display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.pwa-install-ico svg{width:24px;height:24px;color:#fff;}
.pwa-install-text{flex:1;min-width:0;}
.pwa-install-title{font-family:'Geist','Inter',sans-serif;font-weight:500;font-size:15px;color:#0A0A14;margin-bottom:3px;}
.pwa-install-sub{font-size:12px;color:#8E90AD;line-height:1.4;}
.pwa-install-btns{display:flex;gap:8px;align-items:center;flex-shrink:0;}
.pwa-install-cta{padding:10px 18px;border-radius:100px;background:linear-gradient(135deg,#B8A4F4,#7B2FF7);color:#fff;font-size:13px;font-weight:600;border:none;cursor:pointer;white-space:nowrap;box-shadow:0 4px 14px rgba(123,47,247,.3);transition:transform .2s;}
.pwa-install-cta:hover{transform:scale(1.04);}
.pwa-install-dismiss{width:30px;height:30px;border-radius:50%;border:none;background:rgba(10,10,20,.05);display:flex;align-items:center;justify-content:center;cursor:pointer;color:#8E90AD;transition:background .2s;}
.pwa-install-dismiss:hover{background:rgba(10,10,20,.1);}

.pwa-notif-banner{position:fixed;bottom:24px;left:50%;transform:translateX(-50%) translateY(120px);z-index:99997;width:calc(100% - 40px);max-width:420px;background:#FCFCFD;border:1px solid rgba(45,212,191,.3);border-radius:22px;padding:18px 20px;box-shadow:0 24px 64px rgba(45,212,191,.15);display:flex;align-items:center;gap:14px;transition:transform .5s cubic-bezier(.34,1.56,.64,1),opacity .4s;opacity:0;pointer-events:none;}
.pwa-notif-banner.show{transform:translateX(-50%) translateY(0);opacity:1;pointer-events:all;}
.pwa-notif-ico{width:48px;height:48px;border-radius:14px;background:linear-gradient(135deg,#2DD4BF,#5EEAD4);display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.pwa-notif-ico svg{width:24px;height:24px;color:#fff;}

.pwa-offline-bar{position:fixed;top:0;left:0;right:0;z-index:99999;padding:10px 20px;background:#FF4D6D;color:#fff;font-size:13px;font-weight:600;text-align:center;transform:translateY(-100%);transition:transform .35s;display:flex;align-items:center;justify-content:center;gap:8px;}
.pwa-offline-bar.show{transform:none;}
.pwa-offline-bar.online{background:#2DD4BF;}

.pwa-update-bar{position:fixed;bottom:0;left:0;right:0;z-index:99999;padding:14px 20px;background:linear-gradient(135deg,#B8A4F4,#7B2FF7);color:#fff;font-size:13px;font-weight:500;text-align:center;transform:translateY(100%);transition:transform .4s;display:flex;align-items:center;justify-content:center;gap:12px;}
.pwa-update-bar.show{transform:none;}
.pwa-update-cta{padding:7px 16px;border-radius:100px;background:rgba(255,255,255,.2);border:1px solid rgba(255,255,255,.4);color:#fff;font-size:12px;font-weight:700;cursor:pointer;transition:background .2s;}
.pwa-update-cta:hover{background:rgba(255,255,255,.3);}

@media(max-width:480px){
  .pwa-install-banner,.pwa-notif-banner{bottom:80px;width:calc(100% - 28px);}
}
`;

function pwaInjectCSS() {
  if (document.getElementById('pwa-styles')) return;
  const s = document.createElement('style');
  s.id = 'pwa-styles';
  s.textContent = PWA_CSS;
  document.head.appendChild(s);
}

/* ── 1. SERVICE WORKER REGISTRATION ── */
let swRegistration = null;

async function registerSW() {
  if (!('serviceWorker' in navigator)) return;
  try {
    swRegistration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    console.log('[PWA] Service Worker registered');

    // Listen for updates
    swRegistration.addEventListener('updatefound', () => {
      const newSW = swRegistration.installing;
      newSW.addEventListener('statechange', () => {
        if (newSW.state === 'installed' && navigator.serviceWorker.controller) {
          showUpdateBar(newSW);
        }
      });
    });
  } catch (err) {
    console.warn('[PWA] SW registration failed:', err);
  }
}

/* ── 2. INSTALL PROMPT ── */
/* index.html captures beforeinstallprompt in <head> because this file is
   `defer` and the event can fire before we parse. Adopt whatever was
   already stashed rather than assuming we're first. */
let deferredInstallPrompt = window.__APA_INSTALL_PROMPT__ || null;

window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  deferredInstallPrompt = e;
  window.__APA_INSTALL_PROMPT__ = e;
  window.dispatchEvent(new CustomEvent('apa:installable'));
});

window.addEventListener('apa:installable', () => {
  if (!deferredInstallPrompt) deferredInstallPrompt = window.__APA_INSTALL_PROMPT__;
});

window.addEventListener('appinstalled', () => {
  deferredInstallPrompt = null;
  window.__APA_INSTALL_PROMPT__ = null;
});

/* Trigger the native install dialog. Returns the user's choice.
   Exposed so any page can offer its own install affordance. */
async function promptInstall() {
  const p = deferredInstallPrompt || window.__APA_INSTALL_PROMPT__;
  if (!p) return 'unavailable';
  try {
    p.prompt();
    const { outcome } = await p.userChoice;
    // The event is single-use; a second prompt() throws.
    deferredInstallPrompt = null;
    window.__APA_INSTALL_PROMPT__ = null;
    return outcome;
  } catch (err) {
    console.warn('[PWA] install prompt failed:', err);
    deferredInstallPrompt = null;
    window.__APA_INSTALL_PROMPT__ = null;
    return 'unavailable';
  }
}

function initInstallPrompt() {
  // No auto-banner. Installation is driven explicitly by the signup
  // gate and the hero "Get the App" button. An unprompted banner on
  // top of those reads as nagging.
  // beforeinstallprompt is still captured at module scope above, so
  // ApatmentoPWA.install() works whenever we choose to call it.
}

function showInstallBanner() {
  if (!deferredInstallPrompt) return;
  pwaInjectCSS();
  const el = document.createElement('div');
  el.className = 'pwa-install-banner';
  el.id = 'pwa-install-banner';
  el.innerHTML = `
    <div class="pwa-install-ico">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
        <polyline points="7 10 12 15 17 10"/>
        <line x1="12" y1="15" x2="12" y2="3"/>
      </svg>
    </div>
    <div class="pwa-install-text">
      <div class="pwa-install-title">Install Cabana</div>
      <div class="pwa-install-sub">Add to your home screen — works offline, feels native</div>
    </div>
    <div class="pwa-install-btns">
      <button class="pwa-install-cta" id="pwa-install-btn">Install</button>
      <button class="pwa-install-dismiss" id="pwa-install-close" aria-label="Dismiss">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
      </button>
    </div>`;
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));

  document.getElementById('pwa-install-btn').addEventListener('click', async () => {
    el.classList.remove('show');
    const outcome = await promptInstall();
    if (outcome === 'accepted') {
      console.log('[PWA] User accepted install');
    }
    setTimeout(() => el.remove(), 500);
  });

  document.getElementById('pwa-install-close').addEventListener('click', () => {
    el.classList.remove('show');
    sessionStorage.setItem('pwa_install_dismissed', '1');
    setTimeout(() => el.remove(), 500);
  });
}

function showIOSBanner() {
  pwaInjectCSS();
  sessionStorage.setItem('pwa_ios_shown', '1');
  const el = document.createElement('div');
  el.className = 'pwa-install-banner';
  el.id = 'pwa-install-banner';
  el.innerHTML = `
    <div class="pwa-install-ico">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
    </div>
    <div class="pwa-install-text">
      <div class="pwa-install-title">Add to Home Screen</div>
      <div class="pwa-install-sub">Tap Share → "Add to Home Screen" for the full app experience</div>
    </div>
    <div class="pwa-install-btns">
      <button class="pwa-install-dismiss" id="pwa-install-close" aria-label="Dismiss">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
      </button>
    </div>`;
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  document.getElementById('pwa-install-close').addEventListener('click', () => {
    el.classList.remove('show'); setTimeout(() => el.remove(), 500);
  });
  setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 500); }, 12000);
}

/* ── 3. WEB PUSH NOTIFICATIONS ── */
// Apatmento's VAPID public key. The private half lives only in the
// VAPID_PRIVATE_KEY env var on the server (see api/push-send.js).
const VAPID_PUBLIC_KEY = 'BIteWNc_QXpcPP2rj0BDVOzFZYUs7mFpys-QdUwwFbtqGANd2l59OOplmMKjQ8X5i2F0SsDn3v4F9S-8XSMSXT8';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
}

async function subscribeToPush() {
  if (!swRegistration || !('PushManager' in window)) return null;
  try {
    let sub = await swRegistration.pushManager.getSubscription();
    if (!sub) {
      sub = await swRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
      console.log('[PWA] Push subscription created');
    }

    // Always re-persist, even for an existing subscription. The old
    // early-return meant a browser that subscribed before login stayed
    // in the DB with user_id = null, and was never reachable again.
    // apa-push.js owns the write because it knows the current user id.
    if (window.ApaPush) {
      const st = window.ApaSession && ApaSession.get && ApaSession.get();
      await ApaPush.subscribe(st && st.user && st.user.id);
    }
    return sub;
  } catch (err) {
    console.warn('[PWA] Push subscription failed:', err);
    return null;
  }
}

async function requestNotificationPermission() {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') { await subscribeToPush(); return true; }
  if (Notification.permission === 'denied') return false;
  // Show our own prompt first before the native browser one
  return showNotifPrompt();
}

function showNotifPrompt() {
  return new Promise(resolve => {
    pwaInjectCSS();
    const el = document.createElement('div');
    el.className = 'pwa-notif-banner';
    el.id = 'pwa-notif-banner';
    el.innerHTML = `
      <div class="pwa-notif-ico">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0M3.3 16.6c-.6.7-.1 1.8.8 1.8h15.8c.9 0 1.4-1.1.8-1.8C19.5 15 18 13.2 18 8A6 6 0 0 0 6 8c0 5.2-1.5 7-2.7 8.6"/>
        </svg>
      </div>
      <div class="pwa-install-text">
        <div class="pwa-install-title">Stay in the loop</div>
        <div class="pwa-install-sub">Get notified when bookings are confirmed and check-in codes arrive</div>
      </div>
      <div class="pwa-install-btns">
        <button class="pwa-install-cta" id="pwa-notif-allow" style="background:linear-gradient(135deg,#2DD4BF,#5EEAD4);">Allow</button>
        <button class="pwa-install-dismiss" id="pwa-notif-close" aria-label="Dismiss">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
        </button>
      </div>`;
    document.body.appendChild(el);
    requestAnimationFrame(() => el.classList.add('show'));

    document.getElementById('pwa-notif-allow').addEventListener('click', async () => {
      el.classList.remove('show');
      setTimeout(() => el.remove(), 500);
      const perm = await Notification.requestPermission();
      if (perm === 'granted') { await subscribeToPush(); resolve(true); }
      else resolve(false);
    });
    document.getElementById('pwa-notif-close').addEventListener('click', () => {
      el.classList.remove('show'); setTimeout(() => el.remove(), 500);
      sessionStorage.setItem('pwa_notif_dismissed', '1');
      resolve(false);
    });
  });
}

/* ── 4. OFFLINE / ONLINE BANNER ── */
function initOfflineBanner() {
  pwaInjectCSS();
  const bar = document.createElement('div');
  bar.className = 'pwa-offline-bar';
  bar.id = 'pwa-offline-bar';
  bar.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="1" y1="1" x2="23" y2="23"/><path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55M5 12.55a10.94 10.94 0 0 1 5.17-2.39M10.71 5.05A16 16 0 0 1 22.56 9M1.42 9a15.91 15.91 0 0 1 4.7-2.88M8.53 16.11a6 6 0 0 1 6.95 0M12 20h.01"/></svg> You're offline — browsing cached pages`;
  document.body.appendChild(bar);

  window.addEventListener('offline', () => {
    bar.classList.remove('online');
    bar.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="1" y1="1" x2="23" y2="23"/><path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55M5 12.55a10.94 10.94 0 0 1 5.17-2.39"/></svg> You're offline — browsing cached pages`;
    bar.classList.add('show');
  });
  window.addEventListener('online', () => {
    bar.classList.add('online');
    bar.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.55a11 11 0 0 1 14.08 0M1.42 9a16 16 0 0 1 21.16 0M8.53 16.11a6 6 0 0 1 6.95 0M12 20h.01"/></svg> Back online!`;
    bar.classList.add('show');
    setTimeout(() => bar.classList.remove('show'), 3000);
  });
}

/* ── 5. UPDATE AVAILABLE BANNER ── */
function showUpdateBar(newSW) {
  pwaInjectCSS();
  const bar = document.createElement('div');
  bar.className = 'pwa-update-bar';
  bar.innerHTML = `✨ A new version of Cabana is ready <button class="pwa-update-cta" id="pwa-update-btn">Update now</button>`;
  document.body.appendChild(bar);
  requestAnimationFrame(() => bar.classList.add('show'));
  document.getElementById('pwa-update-btn').addEventListener('click', () => {
    newSW.postMessage({ type: 'SKIP_WAITING' });
    window.location.reload();
  });
}

/* ── INIT ── */
function init() {
  pwaInjectCSS();
  registerSW();
  initInstallPrompt();
  initOfflineBanner();

  // Notification permission is no longer nagged on a timer. It is
  // required once the user is actually inside the app — see
  // apa-push.js requireNotifications(), invoked from the dashboard.
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

/* Expose for manual trigger */
window.ApatmentoPWA = {
  requestNotifications: requestNotificationPermission,
  install: promptInstall,
  showInstallBanner: showInstallBanner,
  canInstall: () => !!(deferredInstallPrompt || window.__APA_INSTALL_PROMPT__),
  isInstalled: () => window.matchMedia('(display-mode: standalone)').matches
    || window.navigator.standalone === true,
};

})();
