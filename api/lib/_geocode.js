/* ══════════════════════════════════════════════════════════════════════
   Cabana. Global Geocoder  (api/geocode.js)
   ──────────────────────────────────────────────────────────────────────
   One door for every question the platform asks about a place:

     GET /api/geocode?q=westgate mall nairobi     forward search
     GET /api/geocode?lat=-1.267&lng=36.806       reverse lookup
     GET /api/geocode?health=1                    which providers are live

   Why this exists as a server route at all, when the browser can call
   a geocoder directly:

   1. Nominatim's usage policy requires an identifying User-Agent, and a
      browser is forbidden from setting one. Every direct-from-browser
      OSM lookup the platform has ever made was technically in breach and
      one traffic spike away from a block. A server can identify itself.

   2. Paid providers need a key, and a key in a static HTML page is a key
      that has been given away. Keys live here, in the environment, and
      the browser never sees them.

   3. A geocode is the most cacheable request in the product. "Westlands,
      Nairobi" resolves to the same point today, tomorrow and next year.
      Behind this route the answer is cached in the lambda, then again at
      Vercel's edge, so the tenth thousandth guest who types Westlands
      costs nobody a provider call.

   4. Providers disagree, rate-limit, and go down. Behind one normalised
      response the caller does not care which of five upstreams answered,
      and a dead provider degrades to the next instead of to an empty
      dropdown.

   PROVIDER CHAIN
   ──────────────
   Tried in order; the first with a usable answer wins. Everything is
   optional — with no keys set at all the free tier still answers
   worldwide, which is why this ships working rather than pending
   procurement.

     google      GOOGLE_MAPS_API_KEY     Places Text Search (new)
     mapbox      MAPBOX_TOKEN            Geocoding v6
     locationiq  LOCATIONIQ_KEY          Autocomplete / reverse
     photon      —                       Komoot's OSM typeahead
     nominatim   —                       OSM canonical

   Override the order with GEOCODER_ORDER="mapbox,photon". Set
   GEOCODER_CONTACT to the address OSM should write to if we ever
   misbehave; it goes in the User-Agent.

   THE SHAPE EVERY PROVIDER IS FLATTENED INTO
   ──────────────────────────────────────────
     { id, name, label, short, lat, lng, kind, city, area, street,
       state, country, countryCode, postcode, bbox, score, source }

   `label` is the full postal-ish string, `short` is the three-part
   version a human recognises, `kind` is normalised across providers so
   the client can rank a city above a street without knowing whether it
   came from Google's `locality` or OSM's `place=city`.
══════════════════════════════════════════════════════════════════════ */

import { optional } from './_env.js';

/* ── Tunables ─────────────────────────────────────────────────────── */

const MAX_LIMIT       = 12;
const FWD_TTL_MS      = 24 * 60 * 60 * 1000;   // a place does not move
const REV_TTL_MS      = 7  * 24 * 60 * 60 * 1000;
const CACHE_MAX       = 3000;
const UPSTREAM_TIMEOUT = 4500;                  // a slow provider is a dead one
const NOMINATIM_GAP   = 1100;                   // OSM asks for 1 req/sec
const RATE_PER_MIN    = 120;                    // per IP, best effort

const DEFAULT_ORDER = ['google', 'mapbox', 'locationiq', 'photon', 'nominatim'];

/* ── Small utilities ──────────────────────────────────────────────── */

const num = (v) => { const n = parseFloat(v); return Number.isFinite(n) ? n : null; };

const clean = (s) => String(s == null ? '' : s).replace(/\s+/g, ' ').trim();

/* Distinct, order-preserving, empty-dropping join. Address components
   repeat constantly — "Nairobi, Nairobi, Kenya" is the default output of
   every geocoder on earth and it reads like a stutter. */
function joinParts(parts, max) {
  const seen = new Set();
  const out = [];
  for (const p of parts) {
    const v = clean(p);
    if (!v) continue;
    const k = v.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(v);
    if (max && out.length >= max) break;
  }
  return out.join(', ');
}

function haversineKm(aLat, aLng, bLat, bLng) {
  const R = 6371, p = Math.PI / 180;
  const dLat = (bLat - aLat) * p, dLng = (bLng - aLng) * p;
  const s = Math.sin(dLat / 2) ** 2 +
            Math.cos(aLat * p) * Math.cos(bLat * p) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}

/* No provider is allowed to hold the request open. A geocode that takes
   five seconds has already failed the guest typing into the box. */
async function fetchJSON(url, opts = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), opts.timeout || UPSTREAM_TIMEOUT);
  try {
    const r = await fetch(url, { ...opts, signal: ctrl.signal });
    if (!r.ok) throw new Error(`upstream ${r.status}`);
    return await r.json();
  } finally {
    clearTimeout(timer);
  }
}

function userAgent() {
  const contact = optional('GEOCODER_CONTACT', 'ops@cabana.africa');
  return `CabanaGeocoder/1.0 (+https://cabana.africa; ${contact})`;
}

/* ── Kind normalisation ───────────────────────────────────────────── */

/* Every provider names the same nine ideas differently. The client ranks
   on `kind`, so the mapping lives here once rather than in each adapter. */
const KIND_ALIASES = {
  airport: 'airport', aerodrome: 'airport', international_airport: 'airport',
  bus_station: 'transport', train_station: 'transport', railway: 'transport',
  station: 'transport', ferry_terminal: 'transport',
  hotel: 'poi', motel: 'poi', hostel: 'poi', guest_house: 'poi', resort: 'poi',
  mall: 'poi', shopping_mall: 'poi', supermarket: 'poi', marketplace: 'poi',
  restaurant: 'poi', cafe: 'poi', bar: 'poi', attraction: 'poi', museum: 'poi',
  hospital: 'poi', university: 'poi', college: 'poi', school: 'poi',
  stadium: 'poi', park: 'poi', beach: 'poi', point_of_interest: 'poi',
  establishment: 'poi', premise: 'address', street_address: 'address',
  house: 'address', building: 'address', address: 'address',
  road: 'street', residential: 'street', route: 'street', pedestrian: 'street',
  neighbourhood: 'neighbourhood', neighborhood: 'neighbourhood',
  suburb: 'neighbourhood', quarter: 'neighbourhood', locality: 'city',
  sublocality: 'neighbourhood', city_district: 'neighbourhood',
  district: 'neighbourhood', place: 'neighbourhood', block: 'neighbourhood',
  city: 'city', town: 'city', village: 'city', hamlet: 'city',
  municipality: 'city', postal_code: 'postcode', postcode: 'postcode',
  county: 'region', state: 'region', province: 'region', region: 'region',
  administrative_area_level_1: 'region', administrative_area_level_2: 'region',
  administrative: 'region', country: 'country',
};

function normalKind(...candidates) {
  for (const c of candidates.flat()) {
    if (!c) continue;
    const k = KIND_ALIASES[String(c).toLowerCase()];
    if (k) return k;
  }
  return 'place';
}

/* How specific is this result? Used to break ties: a guest typing an
   airport name wants the airport, not the county that contains it. */
const KIND_WEIGHT = {
  airport: 1.00, transport: 0.94, poi: 0.90, address: 0.88, street: 0.80,
  neighbourhood: 0.76, city: 0.72, postcode: 0.55, region: 0.42,
  country: 0.30, place: 0.60,
};

/* ── Providers ────────────────────────────────────────────────────── */

/* Google Places — Text Search (New).

   Autocomplete would be the obvious endpoint, but it returns place ids
   with no coordinates, forcing a second billed Place Details call per
   suggestion. Text Search returns location, formatted address and types
   in one round trip, which for a typeahead is both cheaper and faster. */
const google = {
  id: 'google',
  key: () => optional('GOOGLE_MAPS_API_KEY'),

  async forward({ q, limit, near, lang, country }) {
    const body = {
      textQuery: q,
      maxResultCount: Math.min(limit, 20),
      languageCode: lang,
    };
    if (near) {
      body.locationBias = {
        circle: { center: { latitude: near.lat, longitude: near.lng }, radius: 50000 },
      };
    }
    if (country && country.length === 1) body.regionCode = country[0].toUpperCase();

    const data = await fetchJSON('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': this.key(),
        'X-Goog-FieldMask':
          'places.id,places.displayName,places.formattedAddress,places.location,' +
          'places.types,places.addressComponents,places.viewport',
      },
      body: JSON.stringify(body),
    });

    return (data.places || []).map((p) => {
      const c = componentsFromGoogle(p.addressComponents);
      const lat = num(p.location?.latitude), lng = num(p.location?.longitude);
      if (lat == null || lng == null) return null;
      const name = clean(p.displayName?.text) || c.city || clean(p.formattedAddress);
      return place({
        id: `google:${p.id}`,
        name,
        label: clean(p.formattedAddress) || name,
        lat, lng,
        kind: normalKind(p.types || []),
        ...c,
        bbox: p.viewport
          ? [num(p.viewport.low?.latitude), num(p.viewport.low?.longitude),
             num(p.viewport.high?.latitude), num(p.viewport.high?.longitude)]
          : null,
        source: 'google',
      });
    }).filter(Boolean);
  },

  async reverse({ lat, lng, lang }) {
    const u = new URL('https://maps.googleapis.com/maps/api/geocode/json');
    u.searchParams.set('latlng', `${lat},${lng}`);
    u.searchParams.set('language', lang);
    u.searchParams.set('key', this.key());
    const data = await fetchJSON(u);
    return (data.results || []).slice(0, 3).map((r) => {
      const c = componentsFromGoogle(
        (r.address_components || []).map((a) => ({
          longText: a.long_name, shortText: a.short_name, types: a.types,
        }))
      );
      return place({
        id: `google:${r.place_id}`,
        name: c.street || c.area || c.city || clean(r.formatted_address),
        label: clean(r.formatted_address),
        lat: num(r.geometry?.location?.lat) ?? lat,
        lng: num(r.geometry?.location?.lng) ?? lng,
        kind: normalKind(r.types || []),
        ...c,
        source: 'google',
      });
    });
  },
};

function componentsFromGoogle(components) {
  const out = { street: '', area: '', city: '', state: '', country: '', countryCode: '', postcode: '' };
  for (const c of components || []) {
    const t = c.types || [];
    const v = clean(c.longText || c.long_name);
    if (t.includes('route')) out.street = out.street || v;
    else if (t.includes('street_number')) out.street = out.street ? `${v} ${out.street}` : out.street;
    else if (t.includes('sublocality') || t.includes('sublocality_level_1') || t.includes('neighborhood')) out.area = out.area || v;
    else if (t.includes('locality') || t.includes('postal_town')) out.city = out.city || v;
    else if (t.includes('administrative_area_level_1')) out.state = out.state || v;
    else if (t.includes('administrative_area_level_2')) out.city = out.city || v;
    else if (t.includes('country')) {
      out.country = out.country || v;
      out.countryCode = out.countryCode || String(c.shortText || c.short_name || '').toLowerCase();
    } else if (t.includes('postal_code')) out.postcode = out.postcode || v;
  }
  return out;
}

/* Mapbox Geocoding v6 — strong on addresses, weak on informal African
   place names, which is exactly why it is not first. */
const mapbox = {
  id: 'mapbox',
  key: () => optional('MAPBOX_TOKEN'),

  async forward({ q, limit, near, lang, country }) {
    const u = new URL('https://api.mapbox.com/search/geocode/v6/forward');
    u.searchParams.set('q', q);
    u.searchParams.set('limit', String(Math.min(limit, 10)));
    u.searchParams.set('language', lang);
    u.searchParams.set('access_token', this.key());
    if (near) u.searchParams.set('proximity', `${near.lng},${near.lat}`);
    if (country?.length) u.searchParams.set('country', country.join(','));
    const data = await fetchJSON(u);
    return (data.features || []).map(fromMapbox).filter(Boolean);
  },

  async reverse({ lat, lng, lang }) {
    const u = new URL('https://api.mapbox.com/search/geocode/v6/reverse');
    u.searchParams.set('latitude', String(lat));
    u.searchParams.set('longitude', String(lng));
    u.searchParams.set('language', lang);
    u.searchParams.set('access_token', this.key());
    const data = await fetchJSON(u);
    return (data.features || []).slice(0, 3).map(fromMapbox).filter(Boolean);
  },
};

function fromMapbox(f) {
  const p = f.properties || {};
  const coords = p.coordinates || {};
  const lat = num(coords.latitude), lng = num(coords.longitude);
  if (lat == null || lng == null) return null;
  const ctx = p.context || {};
  return place({
    id: `mapbox:${p.mapbox_id || `${lat},${lng}`}`,
    name: clean(p.name),
    label: clean(p.full_address || p.place_formatted || p.name),
    lat, lng,
    kind: normalKind(p.feature_type),
    street: clean(ctx.street?.name),
    area: clean(ctx.neighborhood?.name || ctx.locality?.name),
    city: clean(ctx.place?.name),
    state: clean(ctx.region?.name),
    country: clean(ctx.country?.name),
    countryCode: String(ctx.country?.country_code || '').toLowerCase(),
    postcode: clean(ctx.postcode?.name),
    bbox: Array.isArray(p.bbox) ? [p.bbox[1], p.bbox[0], p.bbox[3], p.bbox[2]] : null,
    source: 'mapbox',
  });
}

/* LocationIQ — Nominatim's data with a commercial SLA, so the response
   shape is shared with the nominatim adapter below. */
const locationiq = {
  id: 'locationiq',
  key: () => optional('LOCATIONIQ_KEY'),

  async forward({ q, limit, near, country }) {
    const u = new URL('https://api.locationiq.com/v1/autocomplete');
    u.searchParams.set('key', this.key());
    u.searchParams.set('q', q);
    u.searchParams.set('limit', String(Math.min(limit, 20)));
    u.searchParams.set('normalizecity', '1');
    u.searchParams.set('dedupe', '1');
    if (country?.length) u.searchParams.set('countrycodes', country.join(','));
    if (near) u.searchParams.set('viewbox', viewboxAround(near));
    const rows = await fetchJSON(u);
    return (Array.isArray(rows) ? rows : []).map((r) => fromOSM(r, 'locationiq')).filter(Boolean);
  },

  async reverse({ lat, lng }) {
    const u = new URL('https://us1.locationiq.com/v1/reverse');
    u.searchParams.set('key', this.key());
    u.searchParams.set('lat', String(lat));
    u.searchParams.set('lon', String(lng));
    u.searchParams.set('format', 'json');
    u.searchParams.set('normalizecity', '1');
    u.searchParams.set('addressdetails', '1');
    u.searchParams.set('zoom', '18');
    const r = await fetchJSON(u);
    const p = fromOSM(r, 'locationiq');
    return p ? [p] : [];
  },
};

/* Photon — Komoot's OSM index, built for prefix matching. It is the only
   free provider that behaves like a real typeahead rather than a search
   engine, so it leads the free tier. */
const photon = {
  id: 'photon',
  key: () => 'free',

  async forward({ q, limit, near, lang }) {
    const u = new URL('https://photon.komoot.io/api');
    u.searchParams.set('q', q);
    u.searchParams.set('limit', String(Math.min(limit, 20)));
    /* Photon only ships a handful of language indexes; anything else
       returns nothing at all rather than falling back. */
    u.searchParams.set('lang', ['en', 'de', 'fr', 'it'].includes(lang) ? lang : 'en');
    if (near) { u.searchParams.set('lat', String(near.lat)); u.searchParams.set('lon', String(near.lng)); }
    const data = await fetchJSON(u, { headers: { 'User-Agent': userAgent() } });
    return (data.features || []).map(fromPhoton).filter(Boolean);
  },

  async reverse({ lat, lng, lang }) {
    const u = new URL('https://photon.komoot.io/reverse');
    u.searchParams.set('lat', String(lat));
    u.searchParams.set('lon', String(lng));
    u.searchParams.set('lang', ['en', 'de', 'fr', 'it'].includes(lang) ? lang : 'en');
    const data = await fetchJSON(u, { headers: { 'User-Agent': userAgent() } });
    return (data.features || []).slice(0, 3).map(fromPhoton).filter(Boolean);
  },
};

function fromPhoton(f) {
  const p = f.properties || {};
  const g = f.geometry || {};
  const lng = num(g.coordinates?.[0]), lat = num(g.coordinates?.[1]);
  if (lat == null || lng == null) return null;
  const name = clean(p.name) || clean(p.street) || clean(p.city) || clean(p.country);
  return place({
    id: `photon:${p.osm_type || 'x'}${p.osm_id || `${lat},${lng}`}`,
    name,
    label: joinParts([
      p.housenumber ? `${p.housenumber} ${p.street || ''}` : p.street,
      name !== clean(p.street) ? name : '',
      p.district, p.city, p.county, p.state, p.country,
    ]),
    lat, lng,
    kind: normalKind(p.osm_value, p.osm_key, p.type),
    street: clean(p.street),
    area: clean(p.district || p.suburb),
    city: clean(p.city || p.county),
    state: clean(p.state),
    country: clean(p.country),
    countryCode: String(p.countrycode || '').toLowerCase(),
    postcode: clean(p.postcode),
    /* Photon's extent is [west, north, east, south] — not the usual
       order, and getting it wrong flips maps into the ocean. */
    bbox: Array.isArray(p.extent) ? [p.extent[3], p.extent[0], p.extent[1], p.extent[2]] : null,
    source: 'photon',
  });
}

/* Nominatim — the canonical OSM search. Rate-limited to a request a
   second and unhappy about bursts, so every call queues through one
   chain per lambda instance. Last in the chain, but it resolves informal
   names the commercial providers have never heard of. */
const nominatim = {
  id: 'nominatim',
  key: () => 'free',

  async forward({ q, limit, near, lang, country }) {
    return osmQueue(async () => {
      const u = new URL('https://nominatim.openstreetmap.org/search');
      u.searchParams.set('q', q);
      u.searchParams.set('format', 'jsonv2');
      u.searchParams.set('addressdetails', '1');
      u.searchParams.set('limit', String(Math.min(limit, 20)));
      if (country?.length) u.searchParams.set('countrycodes', country.join(','));
      if (near) { u.searchParams.set('viewbox', viewboxAround(near)); u.searchParams.set('bounded', '0'); }
      const rows = await fetchJSON(u, {
        headers: { 'User-Agent': userAgent(), 'Accept-Language': lang || 'en' },
      });
      return (Array.isArray(rows) ? rows : []).map((r) => fromOSM(r, 'nominatim')).filter(Boolean);
    });
  },

  async reverse({ lat, lng, lang }) {
    return osmQueue(async () => {
      const u = new URL('https://nominatim.openstreetmap.org/reverse');
      u.searchParams.set('lat', String(lat));
      u.searchParams.set('lon', String(lng));
      u.searchParams.set('format', 'jsonv2');
      u.searchParams.set('addressdetails', '1');
      u.searchParams.set('zoom', '18');
      const r = await fetchJSON(u, {
        headers: { 'User-Agent': userAgent(), 'Accept-Language': lang || 'en' },
      });
      const p = fromOSM(r, 'nominatim');
      return p ? [p] : [];
    });
  },
};

/* Shared by every Nominatim-shaped provider. */
function fromOSM(r, source) {
  if (!r) return null;
  const lat = num(r.lat), lng = num(r.lon);
  if (lat == null || lng == null) return null;
  const a = r.address || {};
  const street = clean(a.road || a.pedestrian || a.footway || a.street || a.path || a.avenue || a.highway);
  const building = clean(a.building || a.house_name || a.amenity || a.tourism || a.hotel || a.commercial);
  const name = clean(r.name) || building || (a.house_number && street ? `${a.house_number} ${street}` : street) ||
               clean(a.suburb || a.neighbourhood || a.residential) ||
               clean(a.city || a.town || a.village) ||
               clean(String(r.display_name || '').split(',')[0]);
  return place({
    id: `${source}:${r.osm_type || 'x'}${r.osm_id || `${lat},${lng}`}`,
    name,
    label: clean(r.display_name) || name,
    lat, lng,
    kind: normalKind(r.type, r.class, a.amenity),
    street: a.house_number && street ? `${a.house_number} ${street}` : (building && street ? `${building}, ${street}` : (street || building)),
    area: clean(a.suburb || a.neighbourhood || a.residential || a.city_district || a.quarter || a.subdistrict),
    city: clean(a.city || a.town || a.village || a.municipality || a.county),
    state: clean(a.state || a.region || a.state_district),
    country: clean(a.country),
    countryCode: String(a.country_code || '').toLowerCase(),
    postcode: clean(a.postcode),
    /* OSM's boundingbox is [south, north, west, east] as strings. */
    bbox: Array.isArray(r.boundingbox)
      ? [num(r.boundingbox[0]), num(r.boundingbox[2]), num(r.boundingbox[1]), num(r.boundingbox[3])]
      : null,
    importance: num(r.importance),
    source,
  });
}

function viewboxAround(near, deg = 1.2) {
  return [near.lng - deg, near.lat + deg, near.lng + deg, near.lat - deg].join(',');
}

/* One OSM call at a time, spaced, per lambda instance. */
let osmChain = Promise.resolve();
function osmQueue(fn) {
  const run = osmChain.then(fn, fn);
  osmChain = run.then(gap, gap);
  return run;
  function gap() { return new Promise((r) => setTimeout(r, NOMINATIM_GAP)); }
}

const PROVIDERS = { google, mapbox, locationiq, photon, nominatim };

function activeProviders() {
  const configured = optional('GEOCODER_ORDER');
  const order = configured
    ? configured.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean)
    : DEFAULT_ORDER;
  return order.map((id) => PROVIDERS[id]).filter((p) => p && p.key());
}

/* ── The normalised record ────────────────────────────────────────── */

function place(o) {
  const label = clean(o.label) || clean(o.name);
  return {
    id: o.id,
    name: clean(o.name),
    label,
    /* The three-part version. Nobody reads eight comma-separated
       administrative divisions; they recognise a place by its name, its
       neighbourhood and its city. */
    short: joinParts([o.name, o.area || o.street, o.city, o.country], 3) ||
           joinParts(label.split(','), 3),
    lat: o.lat,
    lng: o.lng,
    kind: o.kind || 'place',
    street: clean(o.street),
    area: clean(o.area),
    city: clean(o.city),
    state: clean(o.state),
    country: clean(o.country),
    countryCode: clean(o.countryCode).toLowerCase(),
    postcode: clean(o.postcode),
    bbox: Array.isArray(o.bbox) && o.bbox.every((n) => Number.isFinite(n)) ? o.bbox : null,
    score: 0,
    source: o.source,
    _importance: Number.isFinite(o.importance) ? o.importance : null,
  };
}

/* ── Ranking ──────────────────────────────────────────────────────── */

/* Providers rank for their own idea of relevance, which is a global one.
   Ours is local: what did this person type, and where are they standing?
   A guest in Nairobi typing "west" means Westlands long before West
   Virginia, and no upstream knows that. */
function rank(results, { q, near }) {
  const query = q.toLowerCase().trim();
  const tokens = query.split(/[\s,]+/).filter(Boolean);

  for (const r of results) {
    const name = r.name.toLowerCase();
    const label = r.label.toLowerCase();

    let s = 0;

    if (name === query) s += 5;
    else if (name.startsWith(query)) s += 3.6;
    else if (name.includes(query)) s += 2.2;
    else if (label.includes(query)) s += 1.2;

    /* Multi-word queries — "diani beach kwale" — rarely match one field
       exactly, so credit each token that lands anywhere in the record. */
    const hits = tokens.filter((t) => label.includes(t)).length;
    if (tokens.length > 1) s += 1.6 * (hits / tokens.length);

    s += 1.8 * (KIND_WEIGHT[r.kind] ?? 0.6);

    /* OSM's own notability signal, where we have it: it is what puts
       Paris, France above Paris, Texas without a hardcoded list. */
    if (r._importance != null) s += Math.min(r._importance, 1) * 1.2;

    if (near && Number.isFinite(r.lat)) {
      const km = haversineKm(near.lat, near.lng, r.lat, r.lng);
      /* Decays over ~150km: strong pull inside a city, gone by the next
         country, so proximity bias never buries a correct far answer. */
      s += 2.4 * Math.exp(-km / 150);
      r.distanceKm = Math.round(km * 10) / 10;
    }

    r.score = Math.round(s * 1000) / 1000;
  }

  return results.sort((a, b) => b.score - a.score);
}

/* Two providers, or one provider twice, will hand back the same place.
   Same name within ~110m is the same doorway. */
function dedupe(results) {
  const seen = new Map();
  for (const r of results) {
    const key = `${r.name.toLowerCase()}|${r.lat.toFixed(3)}|${r.lng.toFixed(3)}`;
    const prior = seen.get(key);
    if (!prior || (r.score || 0) > (prior.score || 0)) seen.set(key, r);
  }
  return [...seen.values()];
}

/* ── Cache ────────────────────────────────────────────────────────── */

/* A plain Map with insertion-order eviction. Lambdas are recycled often
   enough that anything cleverer is optimising a cache that will not live
   long enough to notice — the edge cache above is the one that matters. */
const cache = new Map();

function cacheGet(key) {
  const hit = cache.get(key);
  if (!hit) return null;
  if (Date.now() > hit.expires) { cache.delete(key); return null; }
  /* Refresh recency so hot queries survive eviction. */
  cache.delete(key); cache.set(key, hit);
  return hit.value;
}

function cacheSet(key, value, ttl) {
  if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value);
  cache.set(key, { value, expires: Date.now() + ttl });
}

/* ── Rate limit ───────────────────────────────────────────────────── */

const buckets = new Map();

function overLimit(ip) {
  const now = Date.now();
  const minute = Math.floor(now / 60000);
  const b = buckets.get(ip);
  if (!b || b.minute !== minute) { buckets.set(ip, { minute, n: 1 }); return false; }
  b.n += 1;
  if (buckets.size > 5000) buckets.clear();
  return b.n > RATE_PER_MIN;
}

/* ── Handler ──────────────────────────────────────────────────────── */

/* ── Whoami ───────────────────────────────────────────────────────────
   GET /api/geocode?whoami=1

   "Where is this request probably coming from", read off the platform
   it is running on rather than looked up. Vercel resolves every request
   to a city/region/country before it reaches a function and hands the
   answer over as headers — computed upstream, already paid for, so this
   costs nothing beyond reading req.headers. No provider chain, no
   network call, no cache, and deliberately none of the ~750 lines above
   it: those answer "where is Westlands", this answers "where even are
   you", and the two should not share a code path just because they are
   both geo.

   What the caller does with the answer is not this file's business. It
   is used today by the stays arrival screen to decide whether it can
   honestly say a neighbourhood, but it says nothing about honesty
   itself — it returns what the platform believes, or ok:false, and the
   caller is the one that gets to decide a guess is not good enough.

   Deliberately quiet about precision: IP geolocation resolves to a
   metro area, not a street, and returning latitude/longitude at all
   invites a caller to treat this as more precise than it is. Only
   city/region/country are exposed. */
function whoamiHandler(req, res) {
  res.setHeader('Cache-Control', 'private, max-age=0, no-store');

  var city    = req.headers['x-vercel-ip-city'];
  var region  = req.headers['x-vercel-ip-country-region'];
  var country = req.headers['x-vercel-ip-country'];

  if (!city && !region && !country) {
    return res.status(200).json({ ok: false });
  }

  var decode = function (v) {
    if (!v) return null;
    try { return decodeURIComponent(v); } catch (e) { return v; }
  };

  return res.status(200).json({
    ok: true,
    city: decode(city),
    region: decode(region),
    country: decode(country),
  });
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ ok: false, error: 'method_not_allowed' });

  if (req.query.whoami != null) return whoamiHandler(req, res);

  const providers = activeProviders();

  if (req.query.health != null) {
    return res.status(200).json({
      ok: true,
      providers: providers.map((p) => p.id),
      /* Never the keys, never a prefix of them — only whether one is
         present, which is all an operator needs to debug a chain. */
      configured: Object.keys(PROVIDERS).filter((id) => !!PROVIDERS[id].key()),
      cacheEntries: cache.size,
    });
  }

  if (!providers.length) {
    return res.status(503).json({ ok: false, error: 'no_provider', results: [] });
  }

  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'anon';
  if (overLimit(ip)) {
    res.setHeader('Retry-After', '30');
    return res.status(429).json({ ok: false, error: 'rate_limited', results: [] });
  }

  const lang    = clean(req.query.lang).slice(0, 5).toLowerCase() || 'en';
  const limit   = Math.min(Math.max(parseInt(req.query.limit, 10) || 8, 1), MAX_LIMIT);
  const country = clean(req.query.country)
    ? clean(req.query.country).toLowerCase().split(',').map((c) => c.trim()).filter((c) => c.length === 2)
    : null;

  let near = null;
  if (req.query.near) {
    const [a, b] = String(req.query.near).split(',').map(num);
    if (a != null && b != null && Math.abs(a) <= 90 && Math.abs(b) <= 180) near = { lat: a, lng: b };
  }

  const revLat = num(req.query.lat);
  const revLng = num(req.query.lng);
  const isReverse = !req.query.q && revLat != null && revLng != null;

  try {
    if (isReverse) {
      if (Math.abs(revLat) > 90 || Math.abs(revLng) > 180) {
        return res.status(400).json({ ok: false, error: 'bad_coordinates', results: [] });
      }
      /* ~11m of precision. Finer than that is a different doorway on the
         same plot and not worth a separate cache entry. */
      const key = `r|${revLat.toFixed(4)},${revLng.toFixed(4)}|${lang}`;
      const hit = cacheGet(key);
      if (hit) return send(res, { ...hit, cached: true }, REV_TTL_MS);

      const { results, source } = await race(providers, 'reverse', { lat: revLat, lng: revLng, lang });
      const payload = { ok: true, mode: 'reverse', source, results: results.slice(0, 3) };
      if (results.length) cacheSet(key, payload, REV_TTL_MS);
      return send(res, payload, REV_TTL_MS);
    }

    const q = clean(req.query.q);
    if (q.length < 2) {
      return res.status(200).json({ ok: true, mode: 'forward', query: q, results: [] });
    }

    const key = `f|${q.toLowerCase()}|${limit}|${lang}|${country?.join('+') || '*'}|` +
                (near ? `${near.lat.toFixed(1)},${near.lng.toFixed(1)}` : '-');
    const hit = cacheGet(key);
    if (hit) return send(res, { ...hit, cached: true }, FWD_TTL_MS);

    const { results, source, tried } = await race(providers, 'forward', { q, limit, near, lang, country });
    const ranked = rank(dedupe(results), { q, near }).slice(0, limit);
    const payload = { ok: true, mode: 'forward', query: q, source, tried, results: strip(ranked) };
    if (ranked.length) cacheSet(key, payload, FWD_TTL_MS);
    return send(res, payload, FWD_TTL_MS);
  } catch (e) {
    /* A geocoder that 500s takes the search box down with it. An empty
       result set lets the client fall back to its own gazetteer, which
       is worse than a real answer and far better than a broken form. */
    console.error('[geocode]', e?.message || e);
    return res.status(200).json({ ok: false, error: 'geocode_failed', results: [] });
  }
}

/* Walk the chain until something useful comes back. Not a true race:
   providers are ordered by quality, and asking all five in parallel would
   burn paid quota to throw four answers away. */
async function race(providers, method, ctx) {
  const tried = [];
  for (const p of providers) {
    try {
      const results = await p[method](ctx);
      tried.push(p.id);
      if (results && results.length) return { results, source: p.id, tried };
    } catch (e) {
      tried.push(`${p.id}:fail`);
      console.warn(`[geocode] ${p.id} ${method} failed:`, e?.message || e);
    }
  }
  return { results: [], source: null, tried };
}

/* `_importance` is a ranking input, not something the client should ever
   see or start depending on. */
function strip(results) {
  return results.map(({ _importance, ...rest }) => rest);
}

function send(res, payload, ttlMs) {
  const s = Math.floor(ttlMs / 1000);
  res.setHeader('Cache-Control', `public, max-age=300, s-maxage=${s}, stale-while-revalidate=604800`);
  return res.status(200).json(payload);
}
