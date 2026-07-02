/* ═══════════════════════════════════════════════════════════════
   APATMENTO EVENT INGESTION — Vercel serverless function
   Fetches registered source sites, extracts schema.org Event
   JSON-LD, normalizes, and upserts into Supabase.
   Runs via daily cron (vercel.json) or manually: /api/scrape-events
   Zero dependencies — native fetch + regex JSON-LD extraction.
═══════════════════════════════════════════════════════════════ */

const SUPA_URL = 'https://gfwgbgdvxtocwhilrtdw.supabase.co';
const SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdmd2diZ2R2eHRvY3doaWxydGR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1MTE2NjMsImV4cCI6MjA5NzA4NzY2M30.U8JClv06YsNAwq9qsPb3lQ4SIPeRPjKMzsYxVfcmujw';

const HEADERS = {
  'apikey': SUPA_KEY,
  'Authorization': 'Bearer ' + SUPA_KEY,
  'Content-Type': 'application/json',
};

const UA = 'Mozilla/5.0 (compatible; ApatmentoBot/1.0; +https://www.apatmento.space)';

/* ── Supabase helpers ── */
async function db(method, path, body) {
  const opts = { method, headers: { ...HEADERS } };
  if (method === 'POST') opts.headers['Prefer'] = 'resolution=merge-duplicates,return=minimal';
  if (method === 'PATCH') opts.headers['Prefer'] = 'return=minimal';
  if (body) opts.body = JSON.stringify(body);
  const r = await fetch(`${SUPA_URL}/rest/v1/${path}`, opts);
  if (!r.ok) throw new Error(`DB ${method} ${path}: ${r.status} ${await r.text().catch(()=> '')}`.slice(0, 200));
  if (method === 'GET') return r.json();
  return null;
}

/* ── Extract all JSON-LD blocks from HTML ── */
function extractJsonLd(html) {
  const blocks = [];
  const re = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    try {
      // Some sites have trailing commas / HTML comments inside — be forgiving
      const clean = m[1].replace(/<!--[\s\S]*?-->/g, '').trim();
      blocks.push(JSON.parse(clean));
    } catch (e) { /* skip malformed blocks */ }
  }
  return blocks;
}

/* ── Recursively collect Event objects (handles @graph, arrays, nesting) ── */
const EVENT_TYPES = new Set([
  'Event','MusicEvent','TheaterEvent','Festival','ComedyEvent','SportsEvent',
  'DanceEvent','ExhibitionEvent','FoodEvent','ScreeningEvent','SocialEvent',
  'BusinessEvent','EducationEvent','ChildrensEvent','LiteraryEvent','VisualArtsEvent'
]);

function collectEvents(node, out) {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) { node.forEach(n => collectEvents(n, out)); return; }
  const t = node['@type'];
  const types = Array.isArray(t) ? t : (t ? [t] : []);
  if (types.some(x => EVENT_TYPES.has(x))) out.push(node);
  if (node['@graph']) collectEvents(node['@graph'], out);
  // Some sites nest events under itemListElement
  if (node.itemListElement) {
    const items = Array.isArray(node.itemListElement) ? node.itemListElement : [node.itemListElement];
    items.forEach(i => collectEvents(i.item || i, out));
  }
}

/* ── Normalize one schema.org Event to our row shape ── */
function firstStr(v) {
  if (!v) return null;
  if (typeof v === 'string') return v;
  if (Array.isArray(v)) return firstStr(v[0]);
  if (typeof v === 'object') return v.url || v['@id'] || v.name || null;
  return null;
}

function normalize(ev, sourceUrl) {
  const title = firstStr(ev.name);
  const startDate = ev.startDate || null;
  if (!title || !startDate) return null;

  // Location: can be Place object, array, or string
  let venue = null, city = null;
  const loc = Array.isArray(ev.location) ? ev.location[0] : ev.location;
  if (loc) {
    if (typeof loc === 'string') venue = loc;
    else {
      venue = firstStr(loc.name);
      const addr = loc.address;
      if (addr) city = typeof addr === 'string' ? addr : (addr.addressLocality || addr.addressRegion || null);
    }
  }

  // Offers: object or array — take lowest price found
  let price = null, currency = 'KES';
  const offers = Array.isArray(ev.offers) ? ev.offers : (ev.offers ? [ev.offers] : []);
  for (const o of offers) {
    if (!o) continue;
    const p = parseFloat(o.lowPrice ?? o.price);
    if (!isNaN(p) && (price === null || p < price)) {
      price = p;
      if (o.priceCurrency) currency = o.priceCurrency;
    }
  }

  const image = firstStr(ev.image);
  const url = firstStr(ev.url) || sourceUrl;
  const desc = typeof ev.description === 'string' ? ev.description.slice(0, 500) : null;

  const dedupe = (title.toLowerCase().trim() + '|' + String(startDate).slice(0, 10)).slice(0, 300);

  return {
    dedupe_key: dedupe,
    title: title.slice(0, 200),
    description: desc,
    venue: venue ? String(venue).slice(0, 150) : null,
    city: city ? String(city).slice(0, 80) : null,
    start_date: startDate,
    end_date: ev.endDate || null,
    price_from: price,
    currency,
    image_url: image,
    event_url: url,
    source_url: sourceUrl,
    active: true,
    scraped_at: new Date().toISOString(),
  };
}

/* ── Scrape one source ── */
async function scrapeSource(src) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const r = await fetch(src.url, {
      headers: { 'User-Agent': UA, 'Accept': 'text/html' },
      signal: controller.signal,
      redirect: 'follow',
    });
    clearTimeout(timer);
    if (!r.ok) return { status: `error:http_${r.status}`, events: [] };

    const html = await r.text();
    const blocks = extractJsonLd(html);
    const found = [];
    blocks.forEach(b => collectEvents(b, found));
    const rows = found.map(e => normalize(e, src.url)).filter(Boolean);

    // Dedupe within this batch (same dedupe_key twice breaks upsert)
    const seen = new Set();
    const unique = rows.filter(r2 => seen.has(r2.dedupe_key) ? false : (seen.add(r2.dedupe_key), true));
    return { status: unique.length ? 'ok' : 'no_events', events: unique };
  } catch (e) {
    clearTimeout(timer);
    return { status: ('error:' + e.message).slice(0, 100), events: [] };
  }
}

/* ── Handler ── */
module.exports = async (req, res) => {
  try {
    const sources = await db('GET', 'scrape_sources?active=eq.true&service=eq.events&select=id,url,label');
    if (!sources.length) {
      return res.status(200).json({ ok: true, message: 'No active sources registered. Add rows to scrape_sources.' });
    }

    const summary = [];
    for (const src of sources) {
      const { status, events } = await scrapeSource(src);
      if (events.length) {
        // Upsert in chunks of 50
        for (let i = 0; i < events.length; i += 50) {
          await db('POST', 'scraped_events?on_conflict=dedupe_key', events.slice(i, i + 50));
        }
      }
      await db('PATCH', `scrape_sources?id=eq.${src.id}`, {
        last_run: new Date().toISOString(),
        last_status: status,
        events_found: events.length,
      });
      summary.push({ source: src.label || src.url, status, found: events.length });
    }

    // Auto-expire events that have passed (keep DB clean)
    await db('PATCH', `scraped_events?end_date=lt.${new Date(Date.now() - 86400000).toISOString()}&active=eq.true`, { active: false }).catch(() => {});

    res.status(200).json({ ok: true, ran: new Date().toISOString(), summary });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
};
