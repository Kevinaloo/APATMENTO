/* ════════════════════════════════════════════════════════════════
   CABANA SERVICE WORKER v3
   Strategy: Network-first for ALL own assets (HTML, JS, CSS).
   Cache-first only for external fonts and images.
   This ensures every deploy is seen immediately by all users.
   No more stale JS/CSS causing inconsistent behaviour.
════════════════════════════════════════════════════════════════ */

const VERSION = 'cabana-v27';
const CACHE = `${VERSION}`;

/* How long we will wait on the network before falling back to a cached
   copy. The previous worker raced nothing: it called fetch() and waited,
   with no ceiling. On a stalled mobile connection that fetch could hang
   for the browser's full timeout while the user stared at nothing, even
   though a perfectly good copy of the page sat in the cache. That was
   the "sometimes it doesn't even load" failure. */
const NET_TIMEOUT_MS = 3500;

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

  // Our JS and CSS: serve from cache instantly, refresh in the background.
  // Previously these were network-first, so every navigation blocked on
  // ~17 sequential revalidations before the page could run.
  if (isOurJS || isOurCSS) { e.respondWith(staleWhileRevalidate(request)); return; }

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
self.addEventListener('push', e => {
  let d = { title:'Cabana', body:'You have a notification', icon:'/cabana-icon-192.png', tag:'cabana' };
  try { if (e.data) d = { ...d, ...e.data.json() }; } catch {}
  e.waitUntil(self.registration.showNotification(d.title, {
    body: d.body, icon: d.icon, badge: d.icon, tag: d.tag,
    data: { url: d.url || '/' }, vibrate: [200,100,200],
  }));
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = e.notification.data?.url || '/';
  e.waitUntil(clients.matchAll({ type:'window' }).then(cs => {
    const w = cs.find(c => 'focus' in c);
    return w ? w.focus().then(c => c.navigate(url)) : clients.openWindow(url);
  }));
});

self.addEventListener('sync', e => {
  if (e.tag === 'sync-bookings') e.waitUntil(Promise.resolve());
});

// ── UPDATE HANDSHAKE ──
// pwa.js posts SKIP_WAITING when the user taps "Update now". Without
// this listener the message was dropped and the page reloaded straight
// back into the old worker.
self.addEventListener('message', e => {
  if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
});
