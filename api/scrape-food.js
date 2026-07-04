/* =========================================================
   APATMENTO  -  Food Scraper v2 (OpenStreetMap Overpass API)
   Uses GET request with URL-encoded query — fixes 406 error
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

function mapCuisine(tags) {
  const c = (tags.cuisine || '').toLowerCase();
  const a = (tags.amenity || '').toLowerCase();
  if (/coffee|cafe|tea/.test(c) || a === 'cafe') return 'cafe';
  if (/pizza|italian/.test(c)) return 'italian';
  if (/indian|punjabi/.test(c)) return 'indian';
  if (/chinese|asian|sushi|thai/.test(c)) return 'chinese';
  if (/burger|american|bbq|grill/.test(c)) return 'burgers';
  if (/seafood|fish/.test(c)) return 'seafood';
  if (/kenyan|african/.test(c)) return 'kenyan';
  if (a === 'fast_food') return 'fast-food';
  return 'kenyan';
}

export default async function handler(req, res) {
  const t0 = Date.now();
  try {
    const query = '[out:json][timeout:25];(node["amenity"~"restaurant|cafe|fast_food"]["name"](-1.40,36.65,-1.10,36.97);way["amenity"~"restaurant|cafe|fast_food"]["name"](-1.40,36.65,-1.10,36.97););out center 120;';

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 30000);
    const overpassRes = await fetch(
      'https://overpass-api.de/api/interpreter?data=' + encodeURIComponent(query),
      { signal: ctrl.signal }
    );
    clearTimeout(timer);

    if (!overpassRes.ok) throw new Error('Overpass HTTP ' + overpassRes.status);
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
      const area = tags['addr:suburb'] || tags['addr:neighbourhood'] || 'Nairobi';
      return {
        dedupe_key: dk,
        name: name.slice(0, 200),
        cuisine: mapCuisine(tags),
        area: area.slice(0, 100),
        city: 'Nairobi',
        phone: tags.phone || tags['contact:phone'] || null,
        website: tags.website || tags['contact:website'] || null,
        latitude: el.lat || (el.center && el.center.lat) || null,
        longitude: el.lon || (el.center && el.center.lon) || null,
        hot: false, active: true,
        source: 'openstreetmap',
        scraped_at: new Date().toISOString(),
      };
    }).filter(Boolean);

    for (let i = 0; i < rows.length; i += 50)
      await db('POST', 'scraped_restaurants?on_conflict=dedupe_key', rows.slice(i, i + 50));

    res.status(200).json({ ok: true, ran: new Date().toISOString(), ms: Date.now()-t0, found: rows.length });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
}
