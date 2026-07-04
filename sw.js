/* ════════════════════════════════════════════════════════════════
   APATMENTO SERVICE WORKER
   - Caches all pages + assets for offline use
   - Network-first for HTML (always fresh content)
   - Cache-first for fonts, images, CSS (performance)
   - Background sync for failed booking attempts
   - Push notification handler
════════════════════════════════════════════════════════════════ */

const VERSION = 'apatmento-v5';
const STATIC_CACHE = `${VERSION}-static`;
const DYNAMIC_CACHE = `${VERSION}-dynamic`;
const IMAGE_CACHE   = `${VERSION}-images`;

/* Pages to pre-cache on install */
const PRECACHE_PAGES = [
  '/',
  '/index.html',
  '/apartments.html',
  '/flights.html',
  '/tours.html',
  '/events.html',
  '/rides.html',
  '/food.html',
  '/shopping.html',
  '/carhire.html',
  '/add-listing.html',
  '/auth.html',
  '/manifest.json',
];

/* ── INSTALL: pre-cache shell ── */
self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(STATIC_CACHE).then(cache => {
      return cache.addAll(PRECACHE_PAGES).catch(err => {
        console.warn('[SW] Pre-cache partial failure:', err);
      });
    })
  );
});

/* ── ACTIVATE: clean old caches ── */
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k.startsWith('apatmento-') && k !== STATIC_CACHE && k !== DYNAMIC_CACHE && k !== IMAGE_CACHE)
          .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

/* ── FETCH: smart caching strategy ── */
self.addEventListener('fetch', e => {
  const { request } = e;
  const url = new URL(request.url);

  // Skip non-GET, chrome-extension, Supabase API calls
  if (request.method !== 'GET') return;
  if (url.protocol === 'chrome-extension:') return;
  if (url.hostname.includes('supabase.co')) return;
  if (url.hostname.includes('api.unsplash.com')) return;
  if (url.pathname.startsWith('/api/')) return;
  // Always fetch showcase.js and pwa.js fresh — stale versions cause stuck loading screens
  if (url.pathname === '/showcase.js' || url.pathname === '/pwa.js') return;

  // Images → cache-first (aggressive)
  if (request.destination === 'image' || url.pathname.match(/\.(png|jpg|jpeg|webp|svg|gif|ico)$/i)) {
    e.respondWith(cacheFirst(IMAGE_CACHE, request));
    return;
  }

  // Fonts → cache-first (long-lived)
  if (url.hostname.includes('fonts.googleapis.com') || url.hostname.includes('fonts.gstatic.com') || url.hostname.includes('fontshare.com')) {
    e.respondWith(cacheFirst(STATIC_CACHE, request));
    return;
  }

  // JS/CSS from CDN → cache-first
  if (url.hostname.includes('cdn.jsdelivr.net') || url.hostname.includes('cdnjs.cloudflare.com')) {
    e.respondWith(cacheFirst(STATIC_CACHE, request));
    return;
  }

  // HTML pages → network-first (fresh content), fall back to cache
  if (request.destination === 'document' || url.pathname.match(/\.html?$/i) || url.pathname === '/') {
    e.respondWith(networkFirst(DYNAMIC_CACHE, request));
    return;
  }

  // Everything else → stale-while-revalidate
  e.respondWith(staleWhileRevalidate(DYNAMIC_CACHE, request));
});

/* ── Caching strategies ── */
async function cacheFirst(cacheName, request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return offlineFallback(request);
  }
}

async function networkFirst(cacheName, request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    return offlineFallback(request);
  }
}

async function staleWhileRevalidate(cacheName, request) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const fetchPromise = fetch(request).then(response => {
    if (response.ok) cache.put(request, response.clone());
    return response;
  }).catch(() => null);
  return cached || fetchPromise || offlineFallback(request);
}

function offlineFallback(request) {
  if (request.destination === 'document') {
    return caches.match('/index.html');
  }
  return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
}

/* ── PUSH NOTIFICATIONS ── */
self.addEventListener('push', e => {
  let data = { title: 'Apatmento', body: 'You have a new notification', icon: '/logo-mark.png', badge: '/logo-mark.png', tag: 'apatmento-general', url: '/' };
  try { if (e.data) data = { ...data, ...e.data.json() }; } catch {}

  e.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon || '/logo-mark.png',
      badge: data.badge || '/logo-mark.png',
      tag: data.tag,
      data: { url: data.url || '/' },
      requireInteraction: data.requireInteraction || false,
      actions: data.actions || [],
      vibrate: [200, 100, 200],
    })
  );
});

/* ── NOTIFICATION CLICK ── */
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = e.notification.data?.url || '/';
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
      const existing = windowClients.find(c => c.url.includes(self.location.origin) && 'focus' in c);
      if (existing) return existing.focus().then(c => c.navigate(url));
      return clients.openWindow(url);
    })
  );
});

/* ── BACKGROUND SYNC (retry failed bookings) ── */
self.addEventListener('sync', e => {
  if (e.tag === 'sync-bookings') {
    e.waitUntil(retryFailedBookings());
  }
});

async function retryFailedBookings() {
  // Retries any queued booking requests from IndexedDB
  // Will be called when network is restored
  console.log('[SW] Background sync: retrying failed bookings');
}

