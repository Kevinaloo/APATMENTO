/* ══════════════════════════════════════════════════════════════════════
   Cabana Move · the road between two points   (GET /api/route)
   ──────────────────────────────────────────────────────────────────────
   A fare a rider names, the ETA a driver quotes and the trip check a
   renter reads all start from one question: how far is it by road, and
   how long will it take at the hour they leave?

     GET /api/route?from=-1.2921,36.8219&to=-1.3192,36.9278&at=2026-09-25T08:00:00Z

   PROVIDERS
   ─────────
   Tried in order, first usable answer wins. Everything is optional:

     mapbox   MAPBOX_TOKEN          driving-traffic, live congestion
     google   GOOGLE_MAPS_API_KEY   Routes API, traffic aware
     fossgis  —                     OSRM on routing.openstreetmap.de
     osrm     —                     OSRM demo server, the last road answer
     estimate —                     straight line × road factor

   Override with ROUTER_ORDER="fossgis,osrm". The free routers follow
   their usage policies: an identifying User-Agent, one request per
   route (never per keystroke; the page asks once both ends are pinned),
   and answers cached here and at the edge so a popular corridor costs
   them nothing after the first rider.

   TRAFFIC
   ───────
   OSRM answers in free-flow time, which in Nairobi at 8am is fiction.
   Inside a big African metro the free-flow time is multiplied by an
   hour-of-day factor: two hard peaks (about ×1.9), a slow midday
   (×1.35), a clear night (×1). Outside a metro it gets a small, honest
   margin. Live providers (Mapbox, Google) are trusted as they are.

   The answer is a ROUTE, never a price. Fares come from the database.
══════════════════════════════════════════════════════════════════════ */
import { optional } from './_env.js';

const UA = 'CabanaMove/1.0 (+https://cabana.africa; routing for rides and car hire)';
const TIMEOUT_MS = 3800;
const CACHE_MAX = 800;
const cache = new Map();

/* Where Cabana routes: the continent plus its islands. Anything outside
   gets the geometric estimate and never reaches a third-party router. */
const AFRICA_BOX = { minLat: -47, maxLat: 38, minLng: -26, maxLng: 64 };

const TZ = {
  KE:'Africa/Nairobi', UG:'Africa/Kampala', TZ:'Africa/Dar_es_Salaam', ET:'Africa/Addis_Ababa',
  SO:'Africa/Mogadishu', DJ:'Africa/Djibouti', ER:'Africa/Asmara', KM:'Indian/Comoro',
  MG:'Indian/Antananarivo', RW:'Africa/Kigali', BI:'Africa/Bujumbura', SS:'Africa/Juba',
  SD:'Africa/Khartoum', EG:'Africa/Cairo', LY:'Africa/Tripoli', TN:'Africa/Tunis',
  DZ:'Africa/Algiers', MA:'Africa/Casablanca', MR:'Africa/Nouakchott', ML:'Africa/Bamako',
  SN:'Africa/Dakar', GM:'Africa/Banjul', GW:'Africa/Bissau', GN:'Africa/Conakry',
  SL:'Africa/Freetown', LR:'Africa/Monrovia', CI:'Africa/Abidjan', BF:'Africa/Ouagadougou',
  GH:'Africa/Accra', TG:'Africa/Lome', BJ:'Africa/Porto-Novo', NE:'Africa/Niamey',
  NG:'Africa/Lagos', CM:'Africa/Douala', TD:'Africa/Ndjamena', CF:'Africa/Bangui',
  GQ:'Africa/Malabo', GA:'Africa/Libreville', CG:'Africa/Brazzaville', CD:'Africa/Kinshasa',
  AO:'Africa/Luanda', ZM:'Africa/Lusaka', MW:'Africa/Blantyre', MZ:'Africa/Maputo',
  ZW:'Africa/Harare', BW:'Africa/Gaborone', NA:'Africa/Windhoek', ZA:'Africa/Johannesburg',
  LS:'Africa/Maseru', SZ:'Africa/Mbabane', MU:'Indian/Mauritius', SC:'Indian/Mahe',
  ST:'Africa/Sao_Tome', CV:'Atlantic/Cape_Verde'
};

/* The metros where the hour of day decides the trip. Radius in km. */
const METROS = [
  ['Nairobi', -1.2864, 36.8172, 32], ['Mombasa', -4.0435, 39.6682, 18], ['Kampala', 0.3476, 32.5825, 22],
  ['Dar es Salaam', -6.7924, 39.2083, 26], ['Kigali', -1.9441, 30.0619, 14], ['Addis Ababa', 8.9806, 38.7578, 24],
  ['Lagos', 6.5244, 3.3792, 40], ['Abuja', 9.0765, 7.3986, 24], ['Accra', 5.6037, -0.1870, 28],
  ['Kumasi', 6.6885, -1.6244, 16], ['Abidjan', 5.3600, -4.0083, 26], ['Dakar', 14.7167, -17.4677, 20],
  ['Douala', 4.0511, 9.7679, 18], ['Kinshasa', -4.4419, 15.2663, 30], ['Luanda', -8.8390, 13.2894, 26],
  ['Johannesburg', -26.2041, 28.0473, 40], ['Pretoria', -25.7479, 28.2293, 24], ['Cape Town', -33.9249, 18.4241, 32],
  ['Durban', -29.8587, 31.0218, 24], ['Lusaka', -15.3875, 28.3228, 18], ['Harare', -17.8252, 31.0335, 18],
  ['Maputo', -25.9692, 32.5732, 18], ['Cairo', 30.0444, 31.2357, 40], ['Alexandria', 31.2001, 29.9187, 22],
  ['Casablanca', 33.5731, -7.5898, 26], ['Rabat', 34.0209, -6.8416, 16], ['Marrakech', 31.6295, -7.9811, 14],
  ['Tunis', 36.8065, 10.1815, 18], ['Algiers', 36.7538, 3.0588, 22], ['Khartoum', 15.5007, 32.5599, 24],
  ['Kisumu', -0.0917, 34.7680, 10], ['Nakuru', -0.3031, 36.0800, 10], ['Arusha', -3.3869, 36.6830, 10],
  ['Zanzibar City', -6.1659, 39.2026, 8], ['Windhoek', -22.5609, 17.0658, 12], ['Gaborone', -24.6282, 25.9231, 12]
];

function rad(d) { return d * Math.PI / 180; }
export function haversineKm(a, b) {
  const dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.min(1, Math.sqrt(s)));
}

function validPoint(p) {
  return p && Number.isFinite(p.lat) && Number.isFinite(p.lng) && p.lat >= -90 && p.lat <= 90 && p.lng >= -180 && p.lng <= 180;
}
function inAfrica(p) {
  return p.lat >= AFRICA_BOX.minLat && p.lat <= AFRICA_BOX.maxLat && p.lng >= AFRICA_BOX.minLng && p.lng <= AFRICA_BOX.maxLng;
}
function parsePoint(q, name) {
  const raw = q[name];
  if (raw) {
    const [lat, lng] = String(raw).split(',').map(Number);
    const p = { lat, lng };
    if (validPoint(p)) return p;
  }
  const p = { lat: Number(q[name + 'Lat'] ?? q[name + '_lat']), lng: Number(q[name + 'Lng'] ?? q[name + '_lng']) };
  return validPoint(p) ? p : null;
}

export function metroFor(p) {
  let best = null;
  for (const [name, lat, lng, r] of METROS) {
    const d = haversineKm(p, { lat, lng });
    if (d <= r && (!best || d < best.km)) best = { name, km: d };
  }
  return best;
}

/* The clock where the rider stands. */
export function localClock(when, cc) {
  const tz = TZ[String(cc || '').toUpperCase()] || 'Africa/Nairobi';
  try {
    const parts = new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: 'numeric', hourCycle: 'h23', weekday: 'short' })
      .formatToParts(when);
    const hour = Number(parts.find(x => x.type === 'hour')?.value);
    const wd = parts.find(x => x.type === 'weekday')?.value;
    return { hour: Number.isFinite(hour) ? hour : when.getUTCHours(), weekend: wd === 'Sat' || wd === 'Sun', tz };
  } catch {
    return { hour: (when.getUTCHours() + 3) % 24, weekend: [0, 6].includes(when.getUTCDay()), tz };
  }
}

/* Mirrors public.ride_estimate_minutes so the page and the database
   tell the rider the same story. */
export function citySpeed(hour, weekend) {
  if (weekend) {
    if (hour >= 23 || hour < 7) return 45;
    if (hour >= 11 && hour < 19) return 26;
    return 34;
  }
  if (hour >= 23 || hour < 6) return 44;
  if (hour === 6) return 30;
  if (hour >= 7 && hour < 10) return 14;
  if (hour >= 10 && hour < 16) return 24;
  if (hour >= 16 && hour < 20) return 13;
  return 32;
}
/* How much slower than free-flow the hour is, in a big metro. */
export function trafficFactor(clock) {
  const h = clock.hour;
  if (clock.weekend) return h >= 11 && h < 19 ? 1.3 : (h >= 23 || h < 7) ? 1 : 1.12;
  if (h >= 23 || h < 6) return 1;
  if (h === 6) return 1.2;
  if (h >= 7 && h < 10) return 1.85;
  if (h >= 10 && h < 16) return 1.35;
  if (h >= 16 && h < 20) return 1.95;
  return 1.2;
}

export function modelMinutes(km, clock) {
  if (!(km > 0)) return 0;
  const spd = citySpeed(clock.hour, clock.weekend);
  if (km > 45) {
    const cityKm = Math.min(km, 20);
    return Math.max(1, Math.round(cityKm / spd * 60 + (km - cityKm) / 78 * 60));
  }
  return Math.max(1, Math.round(km / spd * 60));
}

/* Douglas-Peucker on [lat,lng] pairs; enough points to draw a road,
   few enough to ship in a kilobyte or two. */
export function simplify(points, maxPoints = 220) {
  if (!Array.isArray(points) || points.length <= maxPoints) return points || [];
  let tolerance = 0.00002;
  let out = points;
  for (let i = 0; i < 12 && out.length > maxPoints; i++) {
    out = dp(points, tolerance);
    tolerance *= 2.2;
  }
  return out;
}
function dp(pts, eps) {
  const keep = new Uint8Array(pts.length);
  keep[0] = keep[pts.length - 1] = 1;
  const stack = [[0, pts.length - 1]];
  while (stack.length) {
    const [s, e] = stack.pop();
    let maxD = 0, idx = -1;
    const [ax, ay] = pts[s], [bx, by] = pts[e];
    const dx = bx - ax, dy = by - ay, len = dx * dx + dy * dy || 1e-12;
    for (let i = s + 1; i < e; i++) {
      const [px, py] = pts[i];
      const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len));
      const qx = ax + t * dx - px, qy = ay + t * dy - py;
      const d = qx * qx + qy * qy;
      if (d > maxD) { maxD = d; idx = i; }
    }
    if (idx > -1 && maxD > eps * eps) { keep[idx] = 1; stack.push([s, idx], [idx, e]); }
  }
  return pts.filter((_, i) => keep[i]);
}

/* Google's encoded polyline → [[lat,lng]] */
function decodePolyline(str, precision = 5) {
  let index = 0, lat = 0, lng = 0;
  const out = [], factor = Math.pow(10, precision);
  while (index < str.length) {
    let b, shift = 0, result = 0;
    do { b = str.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lat += (result & 1) ? ~(result >> 1) : (result >> 1);
    shift = 0; result = 0;
    do { b = str.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lng += (result & 1) ? ~(result >> 1) : (result >> 1);
    out.push([lat / factor, lng / factor]);
  }
  return out;
}

async function fetchJson(url, init = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(url, { ...init, signal: ctrl.signal, headers: { 'User-Agent': UA, Referer: 'https://cabana.africa/', ...(init.headers || {}) } });
    if (!r.ok) throw new Error('http_' + r.status);
    return await r.json();
  } finally {
    clearTimeout(timer);
  }
}

const PROVIDERS = {
  mapbox: {
    live: true,
    ready: () => !!optional('MAPBOX_TOKEN'),
    async run(a, b) {
      const token = optional('MAPBOX_TOKEN');
      const u = `https://api.mapbox.com/directions/v5/mapbox/driving-traffic/${a.lng},${a.lat};${b.lng},${b.lat}` +
        `?geometries=geojson&overview=simplified&alternatives=false&access_token=${encodeURIComponent(token)}`;
      const d = await fetchJson(u);
      const r = d && d.routes && d.routes[0];
      if (!r) throw new Error('no_route');
      return { meters: r.distance, seconds: r.duration, line: (r.geometry?.coordinates || []).map(([lng, lat]) => [lat, lng]) };
    }
  },
  google: {
    live: true,
    ready: () => !!optional('GOOGLE_MAPS_API_KEY'),
    async run(a, b, when) {
      const d = await fetchJson('https://routes.googleapis.com/directions/v2:computeRoutes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': optional('GOOGLE_MAPS_API_KEY'),
          'X-Goog-FieldMask': 'routes.distanceMeters,routes.duration,routes.polyline.encodedPolyline'
        },
        body: JSON.stringify({
          origin: { location: { latLng: { latitude: a.lat, longitude: a.lng } } },
          destination: { location: { latLng: { latitude: b.lat, longitude: b.lng } } },
          travelMode: 'DRIVE', routingPreference: 'TRAFFIC_AWARE',
          departureTime: when > new Date() ? when.toISOString() : undefined
        })
      });
      const r = d && d.routes && d.routes[0];
      if (!r) throw new Error('no_route');
      return { meters: r.distanceMeters, seconds: parseInt(String(r.duration || '0'), 10), line: decodePolyline(r.polyline?.encodedPolyline || '') };
    }
  },
  fossgis: {
    live: false,
    ready: () => true,
    run: (a, b) => osrm('https://routing.openstreetmap.de/routed-car', a, b)
  },
  osrm: {
    live: false,
    ready: () => true,
    run: (a, b) => osrm('https://router.project-osrm.org', a, b)
  }
};

async function osrm(base, a, b) {
  const u = `${base}/route/v1/driving/${a.lng.toFixed(6)},${a.lat.toFixed(6)};${b.lng.toFixed(6)},${b.lat.toFixed(6)}` +
    '?overview=simplified&geometries=geojson&alternatives=false&steps=false';
  const d = await fetchJson(u);
  const r = d && d.code === 'Ok' && d.routes && d.routes[0];
  if (!r) throw new Error('no_route');
  return { meters: r.distance, seconds: r.duration, line: (r.geometry?.coordinates || []).map(([lng, lat]) => [lat, lng]) };
}

function order() {
  const raw = optional('ROUTER_ORDER');
  const list = raw ? raw.split(',').map(s => s.trim().toLowerCase()).filter(k => PROVIDERS[k]) : ['mapbox', 'google', 'fossgis', 'osrm'];
  return list.filter(k => PROVIDERS[k].ready());
}

function cacheGet(key) {
  const hit = cache.get(key);
  if (!hit) return null;
  if (Date.now() > hit.exp) { cache.delete(key); return null; }
  return hit.value;
}
function cacheSet(key, value, ttlMs) {
  if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value);
  cache.set(key, { value, exp: Date.now() + ttlMs });
}

/* The geometric answer: always available, clearly labelled. */
export function estimateRoute(a, b) {
  const straight = haversineKm(a, b);
  const km = Math.max(0.3, straight * (straight > 45 ? 1.18 : 1.32));
  const city = Math.min(km, 20);
  return { provider: 'estimate', live: false, meters: km * 1000, seconds: (city / 38 + (km - city) / 75) * 3600, line: [[a.lat, a.lng], [b.lat, b.lng]] };
}

/* Road answer + the hour → what the rider is told. */
export function shape(raw, a, b, when, cc) {
  const km = Math.round(raw.meters / 100) / 10;
  const freeflow = Math.max(1, Math.round(raw.seconds / 60));
  const clock = localClock(when, cc);
  const metro = metroFor(a) || metroFor(b);
  let minutes = freeflow;
  let factor = 1;
  if (!raw.live) {
    /* Long trips spend only their first stretch in the city. */
    const cityShare = km > 45 ? Math.min(1, 20 / km) : 1;
    factor = metro ? 1 + (trafficFactor(clock) - 1) * cityShare : (km > 45 ? 1.08 : 1.15);
    minutes = Math.max(1, Math.round(freeflow * factor));
  }
  const traffic = raw.live ? 'live' : factor >= 1.7 ? 'heavy' : factor >= 1.25 ? 'moderate' : 'light';
  const line = simplify(raw.line || []);
  let minLat = 90, minLng = 180, maxLat = -90, maxLng = -180;
  for (const [la, ln] of line.length ? line : [[a.lat, a.lng], [b.lat, b.lng]]) {
    if (la < minLat) minLat = la; if (la > maxLat) maxLat = la;
    if (ln < minLng) minLng = ln; if (ln > maxLng) maxLng = ln;
  }
  return {
    ok: true,
    provider: raw.provider,
    basis: raw.provider === 'estimate' ? 'estimate' : 'road',
    distance_km: km,
    duration_min: minutes,
    freeflow_min: freeflow,
    traffic,
    metro: metro ? metro.name : null,
    local_hour: clock.hour,
    depart_at: when.toISOString(),
    arrive_at: new Date(when.getTime() + minutes * 60000).toISOString(),
    straight_km: Math.round(haversineKm(a, b) * 10) / 10,
    geometry: line.map(([la, ln]) => [Math.round(la * 1e5) / 1e5, Math.round(ln * 1e5) / 1e5]),
    bbox: [minLat, minLng, maxLat, maxLng]
  };
}

export async function routeBetween(a, b, opts = {}) {
  const when = opts.when instanceof Date && Number.isFinite(opts.when.getTime()) ? opts.when : new Date();
  const cc = String(opts.country || '').toUpperCase();
  const key = `${a.lat.toFixed(4)},${a.lng.toFixed(4)}>${b.lat.toFixed(4)},${b.lng.toFixed(4)}`;
  let raw = cacheGet(key), cacheState = raw ? 'hit' : 'miss';
  if (!raw) {
    if (haversineKm(a, b) < 0.05) raw = { ...estimateRoute(a, b), provider: 'estimate' };
    else if (!inAfrica(a) || !inAfrica(b) || haversineKm(a, b) > 4000) raw = estimateRoute(a, b);
    else {
      for (const name of order()) {
        try {
          const r = await PROVIDERS[name].run(a, b, when);
          if (!(r.meters > 0) || !(r.seconds > 0)) throw new Error('empty');
          /* A router that snaps to a road 40 km away has answered a
             different question. */
          const straight = haversineKm(a, b);
          if (r.meters / 1000 < straight * 0.9 || r.meters / 1000 > straight * 4 + 25) throw new Error('implausible');
          raw = { ...r, provider: name, live: PROVIDERS[name].live };
          break;
        } catch (err) {
          if (opts.log !== false) console.warn(`[route] ${name} unavailable: ${err && err.message}`);
        }
      }
      if (!raw) raw = estimateRoute(a, b);
    }
    cacheSet(key, raw, raw.live ? 5 * 60000 : raw.provider === 'estimate' ? 10 * 60000 : 24 * 3600000);
  }
  return { ...shape(raw, a, b, when, cc), cache: cacheState };
}

export default async function routeHandler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  const q = req.query || {};
  const a = parsePoint(q, 'from'), b = parsePoint(q, 'to');
  if (!a || !b) return res.status(400).json({ ok: false, error: 'from_and_to_required' });
  let when = q.at ? new Date(String(q.at)) : new Date();
  if (!Number.isFinite(when.getTime())) when = new Date();
  const out = await routeBetween(a, b, { when, country: q.cc || q.country });
  res.setHeader('Cache-Control', out.provider === 'estimate'
    ? 'public, max-age=60, s-maxage=300'
    : 'public, max-age=300, s-maxage=900, stale-while-revalidate=3600');
  return res.status(200).json(out);
}

export const __test = { haversineKm, simplify, decodePolyline, shape, estimateRoute, metroFor, localClock, citySpeed, modelMinutes, trafficFactor, order };
