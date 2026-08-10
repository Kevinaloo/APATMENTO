/* ════════════════════════════════════════════════════════════════
   APATMENTO SERVICE WORKER v2
   Strategy: Network-first for ALL own assets (HTML, JS, CSS).
   Cache-first only for external fonts and images.
   This ensures every deploy is seen immediately by all users.
   No more stale JS/CSS causing inconsistent behaviour.
════════════════════════════════════════════════════════════════ */

const VERSION = 'apatmento-v25';
const CACHE = `${VERSION}`;

// ── INSTALL: skip waiting immediately, take control NOW ──
self.addEventListener('install', () => self.skipWaiting());

// ── ACTIVATE: delete ALL old caches, claim all clients ──
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// ── FETCH: smart strategy per resource type ──
self.addEventListener('fetch', e => {
  const { request } = e;
  const url = new URL(request.url);

  // Skip non-GET
  if (request.method !== 'GET') return;
  // Skip browser extensions
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return;
  // Skip Supabase, Groq, external APIs, always network
  if (url.hostname.includes('supabase.co')) return;
  if (url.hostname.includes('groq.com')) return;
  if (url.pathname.startsWith('/api/')) return;
  // Skip analytics, tracking, external services
  if (url.hostname.includes('google-analytics') || url.hostname.includes('clarity.ms')) return;

  const isOurOrigin = url.origin === self.location.origin;
  const isHTML = request.destination === 'document' || url.pathname.match(/\.html?$/i) || url.pathname === '/';
  const isOurJS = isOurOrigin && url.pathname.match(/\.js$/i);
  const isOurCSS = isOurOrigin && url.pathname.match(/\.css$/i);
  const isFont = url.hostname.includes('fonts.google') || url.hostname.includes('fonts.gstatic') || url.hostname.includes('fontshare');
  const isExtImage = !isOurOrigin && (request.destination === 'image' || url.pathname.match(/\.(png|jpg|jpeg|webp|svg|gif)$/i));
  const isExtLib = url.hostname.includes('unpkg.com') || url.hostname.includes('cdn.jsdelivr') || url.hostname.includes('cdnjs.cloudflare');

  // OUR HTML, JS, CSS → always network-first, NO cache serve
  // This is the key fix: our own files never served stale
  if (isHTML || isOurJS || isOurCSS) {
    e.respondWith(
      fetch(request).then(r => {
        if (r.ok) {
          caches.open(CACHE).then(c => c.put(request, r.clone()));
        }
        return r;
      }).catch(() => caches.match(request))
    );
    return;
  }

  // External fonts → cache-first (they never change)
  if (isFont) {
    e.respondWith(cacheFirst(request));
    return;
  }

  // External CDN libraries (leaflet, etc.) → cache-first
  if (isExtLib) {
    e.respondWith(cacheFirst(request));
    return;
  }

  // External images (Unsplash, CDNs) → stale-while-revalidate
  if (isExtImage) {
    e.respondWith(staleWhileRevalidate(request));
    return;
  }

  // Everything else → network with cache fallback
  e.respondWith(
    fetch(request).catch(() => caches.match(request))
  );
});

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const r = await fetch(request);
  if (r.ok) { const c = await caches.open(CACHE); c.put(request, r.clone()); }
  return r;
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(request);
  const fresh = fetch(request).then(r => { if (r.ok) cache.put(request, r.clone()); return r; }).catch(() => null);
  return cached || fresh;
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
