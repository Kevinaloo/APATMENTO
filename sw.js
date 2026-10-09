/* ════════════════════════════════════════════════════════════════
   CABANA SERVICE WORKER v4
   Strategy: Network-first for ALL own assets (HTML, JS, CSS).
   Cache-first only for external fonts and images.
   This ensures every deploy is seen immediately by all users.
   No more stale JS/CSS causing inconsistent behaviour.
════════════════════════════════════════════════════════════════ */

const VERSION = 'cabana-v43-alerts';
const CACHE = `${VERSION}`;

/* How long we will wait on the network before falling back to a cached
   copy. The previous worker raced nothing: it called fetch() and waited,
   with no ceiling. On a stalled mobile connection that fetch could hang
   for the browser's full timeout while the user stared at nothing, even
   though a perfectly good copy of the page sat in the cache. That was
   the "sometimes it doesn't even load" failure. */
const NET_TIMEOUT_MS = 3500;

/* The same idea for JS and CSS, but tighter. A navigation has nothing to
   show until it resolves, so it is worth waiting 3.5s. A subresource has
   a known-good cached copy sitting right there, and they are fetched in
   parallel, so the whole page pays this once rather than once per file. */
const ASSET_TIMEOUT_MS = 2000;

// ── INSTALL: skip waiting immediately, take control NOW ──
self.addEventListener('install', () => self.skipWaiting());

// ── ACTIVATE: delete ALL old caches, claim clients, enable nav preload ──
self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    // Navigation preload lets the browser start the network request in
    // parallel with the worker booting, removing SW start-up from the
    // critical path of every navigation.
    if (self.registration.navigationPreload) {
      try { await self.registration.navigationPreload.enable(); } catch {}
    }
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

// ── FETCH: strategy per resource type ──
self.addEventListener('fetch', e => {
  const { request } = e;
  let url;
  try { url = new URL(request.url); } catch { return; }

  if (request.method !== 'GET') return;
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return;
  if (url.hostname.includes('supabase.co')) return;
  if (url.hostname.includes('groq.com')) return;
  if (url.pathname.startsWith('/api/')) return;
  if (url.hostname.includes('google-analytics') || url.hostname.includes('clarity.ms')) return;
  if (url.hostname.includes('googletagmanager')) return;

  const isOurOrigin = url.origin === self.location.origin;
  const isHTML  = request.mode === 'navigate' || request.destination === 'document'
                  || url.pathname.match(/\.html?$/i) || url.pathname === '/';
  const isOurJS  = isOurOrigin && /\.js$/i.test(url.pathname);
  const isOurCSS = isOurOrigin && /\.css$/i.test(url.pathname);
  const isVendor = isOurOrigin && /^\/vendor-[^/]+\.js$/i.test(url.pathname);
  const isMedia  = isOurOrigin && /\.(mp4|webm|mov|m4v)$/i.test(url.pathname);
  const isOurImg = isOurOrigin && (request.destination === 'image'
                  || /\.(png|jpe?g|webp|avif|gif|svg|ico)$/i.test(url.pathname));
  const isFont   = url.hostname.includes('fonts.google') || url.hostname.includes('fonts.gstatic')
                  || url.hostname.includes('fontshare');
  const isExtImage = !isOurOrigin && (request.destination === 'image'
                  || /\.(png|jpe?g|webp|svg|gif)$/i.test(url.pathname));
  const isExtLib = url.hostname.includes('unpkg.com') || url.hostname.includes('cdn.jsdelivr')
                  || url.hostname.includes('cdnjs.cloudflare');

  // Version-pinned vendor bundles and media never change under the same
  // URL, so they are pure cache-first. No revalidation, no network.
  if (isVendor || isMedia) { e.respondWith(cacheFirst(request)); return; }

  /* Our JS and CSS: network-first, bounded.

     These were stale-while-revalidate, which is wrong for un-versioned
     filenames. SWR hands back the CACHED copy and only refreshes for
     NEXT time, so every deploy was invisible for at least one full page
     load — and if the visitor did not happen to reload a second time,
     indefinitely. That is how a shipped, live, READY deployment kept
     rendering the previous build's UI.

     The original reason for SWR was that network-first blocked the page
     on a queue of revalidations. That is fixed by the bound, not by
     serving stale code: browsers fetch subresources in parallel, so the
     worst case here is one timeout, not one per file. Below the bound we
     are correct AND fast; above it we fall back to cache exactly as
     before, so the offline and slow-connection stories are unchanged. */
  if (isOurJS || isOurCSS) { e.respondWith(networkFirstAsset(request)); return; }

  // Our images: same deal, instant from cache.
  if (isOurImg) { e.respondWith(staleWhileRevalidate(request)); return; }

  // HTML: still network-first so a deploy is picked up straight away,
  // but now bounded. If the network has not answered within the timeout
  // and we hold a cached copy, we show that immediately rather than
  // leaving the user on a blank screen.
  if (isHTML) { e.respondWith(networkFirstWithTimeout(e, request)); return; }

  if (isFont)     { e.respondWith(cacheFirst(request)); return; }
  if (isExtLib)   { e.respondWith(cacheFirst(request)); return; }
  if (isExtImage) { e.respondWith(staleWhileRevalidate(request)); return; }

  e.respondWith(fetch(request).catch(() => caches.match(request)));
});

async function putSafe(request, response) {
  // Opaque and partial responses must never be written to the cache.
  if (!response || !response.ok || response.type === 'opaque' || response.status === 206) return;
  try { const c = await caches.open(CACHE); await c.put(request, response); } catch {}
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const r = await fetch(request);
  putSafe(request, r.clone());
  return r;
}

async function staleWhileRevalidate(request) {
  const cached = await caches.match(request);
  const fresh = fetch(request)
    .then(r => { putSafe(request, r.clone()); return r; })
    .catch(() => null);
  if (cached) return cached;                 // instant, revalidate detached
  const r = await fresh;
  return r || Response.error();
}

/* Network-first for subresources. Unlike the navigation version there is
   no preload response to consider and no offline page to fall back to —
   if the network fails and we hold nothing, the request simply fails, as
   it would without a worker at all. */
async function networkFirstAsset(request) {
  const cached = await caches.match(request);

  const network = fetch(request)
    .then(r => { putSafe(request, r.clone()); return r; })
    .catch(() => null);

  if (!cached) return (await network) || Response.error();

  let timer;
  const timeout = new Promise(res => { timer = setTimeout(() => res(null), ASSET_TIMEOUT_MS); });
  try {
    const winner = await Promise.race([network, timeout]);
    return winner || cached;
  } finally { clearTimeout(timer); }
}

async function networkFirstWithTimeout(event, request) {
  const cached = await caches.match(request);

  // Use the preloaded navigation response when the browser gives us one.
  const preload = event.preloadResponse
    ? event.preloadResponse.catch(() => null)
    : Promise.resolve(null);

  const network = (async () => {
    const pre = await preload;
    const r = pre || await fetch(request);
    putSafe(request, r.clone());
    return r;
  })();

  if (!cached) {
    // Nothing cached: we have to wait, but fall back to the offline page
    // rather than surfacing a raw network error.
    try { return await network; }
    catch { return (await caches.match('/offline.html')) || Response.error(); }
  }

  // Cached copy in hand: give the network a bounded head start, then
  // serve what we have. The network write still lands for next time.
  let timer;
  const timeout = new Promise(res => { timer = setTimeout(() => res(null), NET_TIMEOUT_MS); });
  try {
    const winner = await Promise.race([network.catch(() => null), timeout]);
    return winner || cached;
  } finally { clearTimeout(timer); }
}

// ── PUSH NOTIFICATIONS ──
/* Each kind arrives with its own weight. A host's guest request stays on
   the lock screen until it is acted on, vibrates like a call, and offers
   "Send an offer" straight from the banner. A newsletter does none of
   that. When Cabana is already open and in front of the person, the
   page shows its own alert instead, so nothing is announced twice. */
const VIBRATE = {
  match: [260, 120, 260, 120, 520],
  call: [500, 200, 500, 200, 500],
  message: [120, 70, 120, 70, 240],
  booking: [200, 100, 200],
  payment: [200, 100, 200],
  /* The same personalities as the in-app chimes. */
  offer: [40, 40, 40, 40, 40, 40, 260],
  promo: [70, 60, 70, 60, 200],
  general: [140],
};

function parsePush(e) {
  let d = { title: 'Cabana', body: 'You have a new update', url: '/dashboard.html', kind: 'general' };
  try { if (e.data) d = Object.assign(d, e.data.json()); }
  catch (err) { try { if (e.data) d.body = e.data.text(); } catch (_) {} }
  return d;
}

async function focusedClient() {
  const all = await clients.matchAll({ type: 'window', includeUncontrolled: true });
  return all.find(c => c.focused && c.visibilityState === 'visible') || null;
}

self.addEventListener('push', e => {
  const d = parsePush(e);
  e.waitUntil((async () => {
    const live = await focusedClient();
    if (live) {
      live.postMessage({ type: 'cabana:push', payload: d });
      /* A host alert is too important to trust to one channel: the page
         raises its own takeover, and the banner still lands in case the
         person is looking at a different app on a split screen. */
      if (d.kind !== 'match' || d.role !== 'host') return;
    }
    const opts = {
      body: d.body || '',
      icon: d.icon || '/cabana-icon-192.png',
      badge: d.badge || '/cabana-badge-96.png',
      tag: d.tag || ('cbn-' + Date.now()),
      renotify: d.renotify !== false,
      requireInteraction: !!d.requireInteraction,
      timestamp: d.ts || Date.now(),
      data: { url: d.url || '/dashboard.html', kind: d.kind || 'general', role: d.role || null, request_id: d.request_id || null },
      vibrate: VIBRATE[d.kind] || [200, 100, 200],
      silent: false,
    };
    if (Array.isArray(d.actions) && d.actions.length) opts.actions = d.actions.slice(0, 2);
    if (d.image) opts.image = d.image;
    await self.registration.showNotification(d.title || 'Cabana', opts);
    /* The installed app shows an unread dot on its icon. */
    try { if (self.navigator && self.navigator.setAppBadge) await self.navigator.setAppBadge(); } catch (_) {}
  })());
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  if (e.action === 'later') return;
  const data = e.notification.data || {};
  let targetUrl = data.url || '/dashboard.html';
  if (e.action === 'respond' && data.request_id) {
    targetUrl = '/partner-cabana.html?req=' + encodeURIComponent(data.request_id) + '&act=respond';
  }
  const absolute = new URL(targetUrl, self.location.origin).href;

  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cs => {
      const mine = cs.filter(c => c.url && c.url.indexOf(self.location.origin) === 0);
      /* Prefer a tab that is already on the right page, then any Cabana tab. */
      const exact = mine.find(c => c.url === absolute);
      const any = exact || mine[0];
      if (any && 'focus' in any) {
        return any.focus().then(c => {
          const client = c || any;
          if (exact) return client.postMessage({ type: 'cabana:open', url: targetUrl, data });
          if ('navigate' in client) return client.navigate(absolute);
        });
      }
      if (clients.openWindow) return clients.openWindow(absolute);
    })
  );
});

/* Browsers rotate push subscriptions (expiry, key rotation, a cleared
   profile). Without this handler the old endpoint dies and the person
   hears nothing until they next open Cabana. Re-subscribe here and tell
   the server, proving ownership with the old endpoint. */
self.addEventListener('pushsubscriptionchange', e => {
  e.waitUntil((async () => {
    try {
      const old = e.oldSubscription;
      const key = (old && old.options && old.options.applicationServerKey) || null;
      const next = e.newSubscription || await self.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: key || urlB64ToU8('BIteWNc_QXpcPP2rj0BDVOzFZYUs7mFpys-QdUwwFbtqGANd2l59OOplmMKjQ8X5i2F0SsDn3v4F9S-8XSMSXT8'),
      });
      if (!old || !next) return;
      await fetch('/api/push-send?action=resubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'resubscribe', old_endpoint: old.endpoint, subscription: next.toJSON() }),
      });
    } catch (err) {}
  })());
});

function urlB64ToU8(b64) {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4);
  const s = (b64 + pad).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(s);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

self.addEventListener('sync', e => {
  if (e.tag === 'sync-bookings') e.waitUntil(Promise.resolve());
});

// ── UPDATE HANDSHAKE ──
// pwa.js posts SKIP_WAITING when the user taps "Update now". Without
// this listener the message was dropped and the page reloaded straight
// back into the old worker.
self.addEventListener('message', e => {
  if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
  if (e.data && e.data.type === 'CLEAR_BADGE') {
    try { if (self.navigator && self.navigator.clearAppBadge) self.navigator.clearAppBadge(); } catch (_) {}
  }
});
