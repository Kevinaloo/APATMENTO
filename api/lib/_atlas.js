/* ══════════════════════════════════════════════════════════════════════
   Cabana · Live atlas   (routed as /api/atlas)
   ──────────────────────────────────────────────────────────────────────
   GET /api/atlas                  live inventory for every place
   GET /api/atlas?place=nairobi    one place

   WHY THIS EXISTS
   ───────────────
   cabana-world-atlas.json is generated at build time. That is right for
   the parts that do not move — where Diani is, what currency Ghana
   uses, which pages exist — and wrong for the one part that changes
   every day: how many stays are actually bookable, and at what price.

   Baked counts go stale the moment a host publishes. A guest who opens
   the map an hour after a new listing goes live should see it, and
   nobody should have to redeploy the site for that to happen.

   So the map now loads in two beats:

     1. The static atlas from the CDN. Instant, cached, complete —
        every place, every page, every coordinate.
     2. This route, in the background. Small, live, and it patches the
        counts in place.

   The map is therefore fast AND current, which the usual argument
   ("static or dynamic, pick one") says you cannot have. You can; you
   just have to be honest about which half of the data is which.

   THE RULE THIS INHERITS
   ──────────────────────
   A count returned here is a count of rows a guest could actually book
   right now: active, not deleted, priced above zero. A place with
   nothing bookable is ABSENT rather than present with a zero — the same
   contract as seo/data/inventory.json, because the map and the
   structured data must never disagree about what is for sale.

   CACHING
   ───────
   Sixty seconds at the edge, five minutes stale-while-revalidate. A new
   listing shows up within a minute; a traffic spike costs one database
   read a minute rather than one per visitor.
══════════════════════════════════════════════════════════════════════ */

/* Approximate FX to USD, so the map can show one comparable band across
   fourteen currencies. These only need to be right to within a few
   percent — they are indicative ranges, not a checkout. Kept in step
   with seo/build_inventory.py, which makes the same claim on the
   generated side. */
const FX_TO_USD = {
  KES: 0.0077, NGN: 0.00065, GHS: 0.065, ZAR: 0.055, TZS: 0.00038,
  UGX: 0.00027, RWF: 0.00073, USD: 1.0, EUR: 1.08, GBP: 1.27,
  MAD: 0.10, EGP: 0.021, XOF: 0.0016, XAF: 0.0016,
};

const CACHE_TTL_MS = 60 * 1000;
const ROW_LIMIT = 20000;

/* One warm lambda serves many requests. Holding the last answer for the
   same window the CDN holds it means a burst that slips past the edge
   still costs one query, not one per invocation. */
let _cache = null;

/* Must fold identically to seo/build_world_atlas.py's slug(), because
   the two key the same map. Accents are folded to their ASCII base
   rather than dropped: stripping the circumflex from "Cote d'Ivoire"
   yields "c-te-divoire", while the country's real page — and its id in
   the atlas — is "cote-divoire". Live counts for every accented place
   would land on a key nothing has ever heard of, and silently do
   nothing at all. A test asserts the two agree. */
function slug(s) {
  return String(s == null ? '' : s)
    .trim().toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\u2018\u2019']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Roll active listings up into per-place, per-service counts.
 *
 * A listing counts for its area, its city AND its country, because all
 * three have pages and a guest on any of them is asking a fair
 * question. The same row therefore appears in up to three buckets —
 * that is a rollup, not double counting.
 */
function rollUp(rows) {
  const buckets = new Map();

  for (const r of rows) {
    if (!r.is_active || r.status !== 'active' || r.deleted_at) continue;

    const raw = Number(r.price_night != null ? r.price_night : r.price_per_night);
    if (!Number.isFinite(raw) || raw <= 0) continue;

    const rate = FX_TO_USD[String(r.currency || 'USD').toUpperCase()];
    const usd = raw * (rate == null ? 1 : rate);
    const service = String(r.service || 'stays').toLowerCase();

    for (const key of [slug(r.area), slug(r.city), slug(r.country)]) {
      if (!key) continue;
      const id = key + ' ' + service;
      const b = buckets.get(id);
      if (b) {
        b.count += 1;
        if (usd < b.lowUSD) b.lowUSD = usd;
        if (usd > b.highUSD) b.highUSD = usd;
      } else {
        buckets.set(id, { place: key, service, count: 1, lowUSD: usd, highUSD: usd });
      }
    }
  }

  const out = {};
  for (const b of buckets.values()) {
    if (!out[b.place]) out[b.place] = {};
    out[b.place][b.service] = {
      count: b.count,
      lowUSD: Math.round(b.lowUSD * 100) / 100,
      highUSD: Math.round(b.highUSD * 100) / 100,
    };
  }
  return out;
}

async function fetchInventory() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

  /* With no credentials configured this is not an error — it is a
     deployment without a database attached, and the honest response is
     "no live data", which leaves the map showing its generated counts
     rather than showing nothing. */
  if (!url || !key) return { inventory: {}, source: 'unconfigured' };

  const q = 'select=city,area,country,service,price_night,price_per_night,'
          + 'currency,status,is_active,deleted_at'
          + '&is_active=eq.true&status=eq.active&deleted_at=is.null'
          + '&limit=' + ROW_LIMIT;

  const r = await fetch(url + '/rest/v1/listings?' + q, {
    headers: { apikey: key, Authorization: 'Bearer ' + key },
    signal: AbortSignal.timeout(6000),
  });
  if (!r.ok) throw new Error('listings ' + r.status);

  const rows = await r.json();
  return { inventory: rollUp(rows), source: 'database', rows: rows.length };
}

async function live() {
  if (_cache && Date.now() - _cache.at < CACHE_TTL_MS) return _cache.value;

  let value;
  try {
    const got = await fetchInventory();
    value = {
      inventory: got.inventory,
      places: Object.keys(got.inventory).length,
      source: got.source,
      at: new Date().toISOString(),
    };
  } catch (err) {
    /* A database wobble must not take the map down. The client already
       holds the generated counts; telling it the live read failed lets
       it keep showing those and say so, which is better than an empty
       map or a confident lie. */
    value = {
      inventory: {},
      places: 0,
      source: 'unavailable',
      error: String((err && err.message) || err),
      at: new Date().toISOString(),
    };
  }

  _cache = { at: Date.now(), value };
  return value;
}

export default async function atlasHandler(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD');
    return res.status(405).json({ error: 'method not allowed' });
  }

  const params = new URL(req.url || '/', 'http://x').searchParams;
  const data = await live();

  /* Public and cacheable: this is the same answer for every visitor,
     and it is exactly the kind of request that should never reach the
     database twice in the same minute. */
  res.setHeader('Cache-Control',
    'public, s-maxage=60, stale-while-revalidate=300, max-age=30');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  const place = params.get('place');
  if (place) {
    const key = slug(place);
    return res.status(200).json({
      place: key,
      live: data.inventory[key] || null,
      source: data.source,
      at: data.at,
    });
  }

  return res.status(200).json(Object.assign({
    inventory: data.inventory,
    places: data.places,
    source: data.source,
    at: data.at,
  }, data.error ? { error: data.error } : {}));
}

export const __test = { slug, rollUp, FX_TO_USD };
