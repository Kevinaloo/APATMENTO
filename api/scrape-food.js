/* =========================================================
   APATMENTO  -  Food Scraper (OpenStreetMap Overpass API)
   Queries real Nairobi restaurants, cafes, and food spots.
   Runs daily 2am UTC via Vercel Cron.
   ========================================================= */
const SUPA_URL = 'https://gfwgbgdvxtocwhilrtdw.supabase.co';
const SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdmd2diZ2R2eHRvY3doaWxydGR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1MTE2NjMsImV4cCI6MjA5NzA4NzY2M30.U8JClv06YsNAwq9qsPb3lQ4SIPeRPjKMzsYxVfcmujw';

async function db(method, path, body) {
  const opts = { method, headers: { apikey: SUPA_KEY, Authorization: 'Bearer ' + SUPA_KEY, 'Content-Type': 'application/json' } };
  if (method === 'POST') opts.headers.Prefer = 'resolution=merge-duplicates,return=minimal';
  if (body) opts.body = JSON.stringify(body);
  const r = await fetch(`${SUPA_URL}/rest/v1/${path}`, opts);
  if (!r.ok) throw new Error(`DB ${r.status}`);
  return method === 'GET' ? r.json() : null;
}

// Map OSM amenity + cuisine tags to our category labels
function mapCuisine(tags) {
  const c = (tags.cuisine || '').toLowerCase();
  const a = (tags.amenity || '').toLowerCase();
  if (/coffee|cafe|tea/.test(c) || a === 'cafe') return 'cafe';
  if (/pizza|italian/.test(c)) return 'italian';
  if (/indian|punjabi|bangladeshi/.test(c)) return 'indian';
  if (/chinese|asian|sushi|thai/.test(c)) return 'chinese';
  if (/burger|american|bbq|grill|steak/.test(c)) return 'burgers';
  if (/seafood|fish/.test(c)) return 'seafood';
  if (/kenyan|african|ugali|nyama/.test(c)) return 'kenyan';
  if (/ethiopian|somali/.test(c)) return 'african';
  if (a === 'fast_food') return 'fast-food';
  return 'kenyan';
}

function mapPriceRange(tags) {
  const p = tags['payment:cash'] || '';
  // Estimate based on name keywords
  const n = (tags.name || '').toLowerCase();
  if (/five star|intercontinental|radisson|hilton|serena|sankara/.test(n)) return 'KES 4,000-15,000';
  if (/carnivore|talisman|haandi|fogo|tamarind/.test(n)) return 'KES 3,000-8,000';
  if (/artcaffe|java house|nyama mama|cultiva/.test(n)) return 'KES 800-2,500';
  return 'KES 300-1,500';
}

export default async function handler(req, res) {
  const t0 = Date.now();
  try {
    // Overpass API query - Nairobi bounding box
    const query = `[out:json][timeout:25];
(
  node["amenity"~"restaurant|cafe|fast_food"]["name"](-1.40,36.65,-1.10,36.97);
  way["amenity"~"restaurant|cafe|fast_food"]["name"](-1.40,36.65,-1.10,36.97);
);
out center 150;`;

    const overpassRes = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'data=' + encodeURIComponent(query),
      signal: AbortSignal.timeout(28000),
    });

    if (!overpassRes.ok) throw new Error(`Overpass: ${overpassRes.status}`);
    const data = await overpassRes.json();
    const elements = data.elements || [];

    const seen = new Set();
    const rows = elements.map(el => {
      const tags = el.tags || {};
      const name = tags.name;
      if (!name || name.length < 2) return null;
      const dk = 'osm-' + name.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 180);
      if (seen.has(dk)) return null;
      seen.add(dk);

      // Extract area from neighbourhood/suburb tags
      const area = tags['addr:suburb'] || tags['addr:neighbourhood'] || tags['addr:city'] || 'Nairobi';

      return {
        dedupe_key: dk,
        name: name.slice(0, 200),
        cuisine: mapCuisine(tags),
        area: area.slice(0, 100),
        city: 'Nairobi',
        description: tags.description || null,
        price_range: mapPriceRange(tags),
        phone: tags.phone || tags['contact:phone'] || null,
        website: tags.website || tags['contact:website'] || null,
        latitude: el.lat || el.center?.lat || null,
        longitude: el.lon || el.center?.lon || null,
        hot: false,
        active: true,
        source: 'openstreetmap',
        scraped_at: new Date().toISOString(),
      };
    }).filter(Boolean);

    // Upsert in batches of 50
    for (let i = 0; i < rows.length; i += 50) {
      await db('POST', 'scraped_restaurants?on_conflict=dedupe_key', rows.slice(i, i + 50));
    }

    res.status(200).json({
      ok: true, ran: new Date().toISOString(), ms: Date.now() - t0,
      found: rows.length, message: `${rows.length} Nairobi restaurants upserted from OpenStreetMap`
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
}
