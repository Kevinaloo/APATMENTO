/* ══════════════════════════════════════════════════════════════════════
   CABANA · CATALOGUE
   api/lib/_catalogue.js

   Everything bookable on Cabana right now, as one list, in one shape,
   with one URL each. The SEO pages, the live sitemap, the hub pages, the
   For-you rail and APA all read it from here, so they cannot disagree
   about whether something is for sale or what it costs.

   FRESHNESS WITHOUT GUESSING
   ──────────────────────────
   A TTL is a guess about how often things change. The database already
   knows: beacon_version() moves on every listing, tour, event or car that
   is created, edited, paused or deleted. So the cache asks that one cheap
   question at most every few seconds and refetches only when the answer
   changed. A host publishes; the next request anywhere on the platform
   sees it. Nothing changes; nothing is refetched.

   PRICES ARE ALL-IN
   ─────────────────
   Guests see one price everywhere on Cabana, fee included. These pages
   say the same number the app says, read from the same function
   (cabana_all_in_prices). If that function cannot be reached, the price
   is left off rather than shown wrong: a page that understates the price
   it lands on is worse than one that says "see price".
   ══════════════════════════════════════════════════════════════════════ */
import { resolvePlace, slugify, titleCase } from './_places.js';
import { parseQuery } from './_search-terms.js';

export const SITE = 'https://cabana.africa';

/* URL family per kind. Short, plural-free, human-readable. */
export const FAMILY = { stay: 'stay', room: 'room', food: 'eat', shop: 'shop', tour: 'tour', event: 'event', car: 'car' };
export const FAMILY_KIND = Object.fromEntries(Object.entries(FAMILY).map(([k, f]) => [f, k]));
export const KIND_SERVICE = { stay: 'stays', room: 'roommates', food: 'food', shop: 'shopping', tour: 'tours', event: 'events', car: 'carhire' };

/* Where the app opens each kind, for the Book button. */
const APP_LINK = {
  stay: id => `/apartments?open=${encodeURIComponent(id)}`,
  room: id => `/roommates?room=${encodeURIComponent(id)}`,
  food: id => `/restaurant?id=${encodeURIComponent(id)}`,
  shop: id => `/shopping?open=${encodeURIComponent(id)}`,
  tour: id => `/tours?open=${encodeURIComponent(id)}`,
  event: id => `/events/e/${encodeURIComponent(id)}`,
  car: id => `/carhire?open=${encodeURIComponent(id)}`,
};

/* Indicative only, for comparing price bands across currencies. Kept in
   step with api/lib/_atlas.js and seo/build_inventory.py. */
export const FX_TO_USD = {
  KES: 0.0077, NGN: 0.00065, GHS: 0.065, ZAR: 0.055, TZS: 0.00038, UGX: 0.00027, RWF: 0.00073,
  USD: 1, EUR: 1.08, GBP: 1.27, MAD: 0.10, EGP: 0.021, XOF: 0.0016, XAF: 0.0016,
};

export const UNIT = { stay: 'night', room: 'month', food: 'meal', shop: 'item', tour: 'person', event: 'ticket', car: 'day' };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function keyOf(id) {
  const s = String(id == null ? '' : id).toLowerCase();
  if (UUID.test(s)) return s.replace(/-/g, '').slice(0, 8);
  if (/^\d{1,15}$/.test(s)) return s;
  return '';
}

/* "Fully furnished Elegant 1Bedroom in Kileleshwa" → readable, without
   rewriting what the host chose to say. */
export function cleanTitle(t) {
  return String(t || '')
    .replace(/\s+/g, ' ')
    .replace(/(\d)(bed(room)?s?|br|bdr)\b/gi, '$1 $2')
    .replace(/\s*@\s*/g, ' @ ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 140);
}

function cut(s, n) {
  if (s.length <= n) return s;
  const c = s.slice(0, n);
  const at = c.lastIndexOf('-');
  return (at > n * 0.5 ? c.slice(0, at) : c).replace(/-+$/, '');
}

export function slugFor(item) {
  let base = cut(slugify(item.title), 60) || item.kind;
  const where = item.place?.area || item.place?.city;
  if (where && !base.includes(where.id)) base = cut(`${base}-${where.id}`, 78);
  return base;
}

export function pathFor(item) {
  return `/${FAMILY[item.kind]}/${item.slug}-${item.key}`;
}

/* /stay/<anything>-<key> → { kind, key, slug }. The slug is decoration;
   the key decides. A stale slug (the host renamed the listing) is
   answered with a 301 to the current one, never a 404. */
export function parsePath(path) {
  const m = /^\/(stay|room|eat|shop|tour|event|car)\/([a-z0-9-]{1,140})$/.exec(String(path || '').toLowerCase());
  if (!m) return null;
  const kind = FAMILY_KIND[m[1]];
  const tail = m[2];
  const hex = /(?:^|-)([0-9a-f]{8})$/.exec(tail);
  const num = /(?:^|-)(\d{1,15})$/.exec(tail);
  const key = (hex && hex[1]) || (num && num[1]) || '';
  if (!key) return null;
  return { kind, key, slug: tail.slice(0, Math.max(0, tail.length - key.length - 1)) };
}

function strings(v, max = 30) {
  if (!Array.isArray(v)) return [];
  return v.map(x => typeof x === 'string' ? x : (x && (x.text || x.title || x.name || x.label)) || '')
    .map(x => String(x).replace(/\s+/g, ' ').trim()).filter(Boolean).slice(0, max);
}

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/* Quality decides indexability. A page with one blurry photo, no price
   and no words is exactly what Google's scaled-content policy exists to
   demote, and it drags the domain down with it. Such a page still works
   for people who follow a link to it; it just asks not to be indexed
   until the host gives it something to say. The admin console lists the
   reasons so the team can ask the host for exactly what is missing. */
export function quality(item) {
  const issues = [];
  const photos = item.photo_count ?? item.photos.length;
  if (photos < 1) issues.push('no photos');
  else if (photos < 3 && !['event', 'tour'].includes(item.kind)) issues.push('fewer than 3 photos');
  if (!(item.base_price > 0) && item.kind !== 'event') issues.push('no price');
  if ((item.desc_len || 0) < 120) issues.push('short description');
  if (!item.place?.city) issues.push('no city');
  if (item.lat == null) issues.push('no map pin');
  if ((item.amenities || []).length < 3 && ['stay', 'room'].includes(item.kind)) issues.push('few amenities listed');
  const blocking = issues.filter(i => ['no photos', 'no price', 'no city'].includes(i));
  const substance = (item.desc_len || 0) >= 40 || (item.amenities || []).length >= 3 || ['tour', 'event', 'car'].includes(item.kind);
  const score = Math.max(0, 100 - issues.length * 14 - blocking.length * 20);
  return { score, issues, indexable: !blocking.length && substance && (item.title || '').length >= 4 };
}

/* One raw catalogue row → the shape everything else uses. Pure, so it is
   tested directly. */
export function normalise(raw) {
  if (!raw || !raw.kind || !FAMILY[raw.kind]) return null;
  const id = String(raw.id);
  const key = keyOf(id);
  if (!key) return null;
  const title = cleanTitle(raw.title);
  if (!title) return null;

  /* An event's "area" is its venue: a place name for a page about a
     neighbourhood, not a neighbourhood. Venues stay a label. */
  const place = raw.kind === 'event'
    ? resolvePlace({ city: raw.city, country: raw.country })
    : resolvePlace({ area: raw.area, city: raw.city, country: raw.country });

  const currency = String(raw.currency || 'KES').toUpperCase();
  const base = num(raw.price);
  const item = {
    kind: raw.kind,
    id, key,
    service: KIND_SERVICE[raw.kind],
    title,
    type: raw.type ? titleCase(String(raw.type).replace(/[_-]+/g, ' ')) : null,
    place,
    location: place.label || [raw.area, raw.city].filter(Boolean).join(', '),
    venue: raw.kind === 'event' ? (raw.extra?.venue || raw.area || null) : null,
    city_raw: raw.city || null,
    lat: num(raw.lat), lng: num(raw.lng),
    base_price: base && base > 0 ? base : null,
    price: null,
    currency,
    unit: raw.unit || UNIT[raw.kind],
    photos: strings(raw.photos, 6).filter(u => /^https:\/\//.test(u)),
    photo_count: num(raw.photo_count) ?? (raw.photos || []).length,
    amenities: strings(raw.amenities, 24),
    bedrooms: num(raw.bedrooms), baths: num(raw.baths), guests: num(raw.guests),
    rating: num(raw.rating), reviews: num(raw.reviews) || 0,
    updated_at: raw.updated_at || raw.created_at || null,
    created_at: raw.created_at || null,
    featured: !!raw.featured,
    score: num(raw.score),
    desc_len: num(raw.desc_len) || 0,
    /* Listings carry the host's first name; tours, events and cars carry
       a business name, which is kept whole. Only all-lowercase names are
       re-cased ("mariana" → "Mariana"); "KICC Events" is left alone. */
    host: raw.host ? (String(raw.host) === String(raw.host).toLowerCase() ? titleCase(String(raw.host)) : String(raw.host).trim()).slice(0, 60) : null,
    host_verified: !!raw.host_verified,
    extra: raw.extra || {},
  };
  item.slug = slugFor(item);
  item.path = pathFor(item);
  item.url = SITE + item.path;
  item.app = APP_LINK[item.kind](id);
  item.quality = quality(item);
  return item;
}

export function priceUsd(item) {
  const p = item.price ?? item.base_price;
  const fx = FX_TO_USD[item.currency];
  return p && fx ? Math.round(p * fx * 100) / 100 : null;
}

/* All-in prices, one RPC per service, in batches the function accepts. */
export async function applyAllIn(items, rpc) {
  const groups = new Map();
  for (const it of items) {
    if (!(it.base_price > 0)) continue;
    const svc = it.service;
    if (!groups.has(svc)) groups.set(svc, []);
    groups.get(svc).push(it);
  }
  let failed = false;
  for (const [svc, list] of groups) {
    for (let i = 0; i < list.length; i += 300) {
      const chunk = list.slice(i, i + 300);
      try {
        const out = await rpc('cabana_all_in_prices', { p_service: svc, p_amounts: chunk.map(x => x.base_price) });
        if (!Array.isArray(out) || out.length !== chunk.length) throw new Error('shape');
        chunk.forEach((x, k) => { const v = Number(out[k]); x.price = v > 0 ? Math.round(v) : null; });
      } catch {
        failed = true;
        chunk.forEach(x => { x.price = null; });
      }
    }
  }
  return { failed };
}

/* ── The cache ─────────────────────────────────────────────────────── */

export function createCatalogue({ rpc, now = () => Date.now(), checkEveryMs = 4000, maxAgeMs = 10 * 60 * 1000 } = {}) {
  let state = { items: [], byKey: new Map(), version: null, fetchedAt: 0, checkedAt: 0, source: 'empty', pricing: 'unknown' };
  let inflight = null;

  async function fetchAll(version) {
    const rows = await rpc('beacon_catalogue', { p_limit: 20000 });
    const items = (Array.isArray(rows) ? rows : []).map(normalise).filter(Boolean);
    const { failed } = await applyAllIn(items, rpc);
    const byKey = new Map(items.map(it => [it.kind + ':' + it.key, it]));
    state = { items, byKey, version, loaded: true, fetchedAt: now(), checkedAt: now(), source: 'database', pricing: failed ? 'unavailable' : 'all-in' };
    return state;
  }

  async function get({ force = false } = {}) {
    const t = now();
    if (!force && state.loaded && t - state.checkedAt < checkEveryMs) return state;
    if (inflight) return inflight;
    inflight = (async () => {
      let version = null;
      try {
        const v = await rpc('beacon_version', {});
        version = v && v.v != null ? String(v.v) : null;
      } catch { /* the version probe is an optimisation, not a dependency */ }
      const stale = force || !state.loaded || version == null || version !== state.version || t - state.fetchedAt > maxAgeMs;
      if (!stale) { state.checkedAt = t; return state; }
      try {
        return await fetchAll(version);
      } catch (e) {
        /* Keep serving what we had. A database blip must not empty every
           page on the site; it should make them a minute old. */
        console.warn('[catalogue] refresh failed:', e.message);
        state.checkedAt = t;
        return state;
      }
    })().finally(() => { inflight = null; });
    return inflight;
  }

  return {
    get,
    peek: () => state,
    reset: () => { state = { items: [], byKey: new Map(), version: null, fetchedAt: 0, checkedAt: 0, source: 'empty', pricing: 'unknown' }; },
  };
}

/* ── Questions everything asks of it ───────────────────────────────── */

export function inPlace(item, placeId) {
  const p = item.place || {};
  return !!placeId && (p.area?.id === placeId || p.city?.id === placeId || p.country?.id === placeId);
}

/* Live supply per place and service: the rows written to beacon_places.
   Every item counts for its area, its city and its country. */
export function placeSupply(items) {
  const out = new Map();
  for (const it of items) {
    if (!it.quality.indexable && !it.price) continue;
    for (const lvl of ['area', 'city', 'country']) {
      const p = it.place?.[lvl];
      if (!p) continue;
      const k = p.id + '|' + it.service;
      let b = out.get(k);
      if (!b) {
        b = { place: p.id, service: it.service, name: p.name, kind: p.kind, parent: p.parent || null,
              country: it.place.country?.name || null, count: 0, low_usd: null, high_usd: null, sample: [], synthetic: !!p.synthetic };
        out.set(k, b);
      }
      b.count += 1;
      const usd = priceUsd(it);
      if (usd != null) {
        b.low_usd = b.low_usd == null ? usd : Math.min(b.low_usd, usd);
        b.high_usd = b.high_usd == null ? usd : Math.max(b.high_usd, usd);
      }
      if (b.sample.length < 3) b.sample.push(it.path);
    }
  }
  return [...out.values()];
}

/* Fuzzy text search across the catalogue, for APA and the search box.
   People search the way they talk: "2 bedroom airbnb in kilimani under
   5k", "bedsitter rongai", "land cruiser with driver". Words that only
   name a service become the service, numbers become filters, kind words
   ("cottage", "studio") rank a match higher, and only what is left has
   to land somewhere (place, title, type, amenity, host). Place hits weigh
   most because "Kilimani" means Kilimani. */
const CATALOGUE_SERVICES = new Set(Object.values(KIND_SERVICE));

export function search(items, { q = '', service, place, maxPrice, minBeds, guests, kind, driver, limit = 8 } = {}) {
  const ask = parseQuery(q);
  /* Asked only for something the catalogue does not hold (a taxi, a
     flight): nothing here answers it, and a stay near the airport is not
     a ride to it. */
  if (!service && !kind && ask.services.length && !ask.services.some(x => CATALOGUE_SERVICES.has(x))) return [];
  service = service || ask.services.find(x => CATALOGUE_SERVICES.has(x));
  maxPrice = maxPrice > 0 ? maxPrice : ask.maxPrice || 0;
  minBeds = minBeds > 0 ? minBeds : ask.beds || 0;
  guests = guests > 0 ? guests : ask.guests || 0;
  driver = driver ?? ask.driver;
  const words = ask.words.map(slugify).filter(w => w.length > 1);
  const prefer = ask.prefer.map(slugify);
  const placeId = place ? resolvePlace({ area: place, city: place }).key || slugify(place) : null;
  const scored = [];
  for (const it of items) {
    if (service && it.service !== service) continue;
    if (kind && it.kind !== kind) continue;
    if (placeId && !inPlace(it, placeId) && !slugify(it.location).includes(slugify(place))) continue;
    const p = it.price ?? it.base_price;
    if (maxPrice > 0 && p && p > maxPrice) continue;
    if (minBeds > 0 && it.bedrooms != null && it.bedrooms < minBeds) continue;
    if (guests > 0 && it.guests != null && it.guests < guests) continue;
    if (driver && it.kind === 'car' && !it.extra?.chauffeur) continue;
    let s = 0;
    const hay = {
      title: slugify(it.title), place: slugify(it.location + ' ' + (it.place?.country?.name || '')),
      type: slugify(it.type || ''), amen: slugify(it.amenities.join(' ')), host: slugify(it.host || ''),
    };
    if (words.length) {
      let missed = 0;
      for (const w of words) {
        const hit = (hay.place.includes(w) ? 4 : 0) + (hay.title.includes(w) ? 3 : 0) + (hay.type.includes(w) ? 2 : 0) +
                    (hay.amen.includes(w) ? 1 : 0) + (hay.host.includes(w) ? 1 : 0);
        if (!hit) missed++;
        s += hit;
      }
      if (missed > Math.floor(words.length / 3)) continue;
    }
    for (const w of prefer) if (hay.type.includes(w) || hay.title.includes(w) || hay.amen.includes(w)) s += 4;
    s += (it.quality.score / 50) + (it.featured ? 1 : 0) + Math.min(2, (it.reviews || 0) / 5);
    scored.push({ it, s, p });
  }
  /* "Cheap" and "luxury" are a lean, not a filter. */
  if (ask.price) {
    const ps = scored.map(x => x.p).filter(v => v > 0);
    const lo = Math.min(...ps), hi = Math.max(...ps);
    if (ps.length > 1 && hi > lo) for (const x of scored) if (x.p > 0) x.s += 3 * (ask.price === 'low' ? (hi - x.p) / (hi - lo) : (x.p - lo) / (hi - lo));
  }
  return scored.sort((a, b) => b.s - a.s).slice(0, limit).map(x => x.it);
}

export const __test = { cut, strings };
