/* ═══════════════════════════════════════════════════════════════
   APATMENTO EVENT INGESTION — Vercel serverless function (ESM)
   Fetches registered sources IN PARALLEL, extracts schema.org
   Event JSON-LD, normalizes, upserts into Supabase.
   Cron: daily 3am UTC (vercel.json). Manual: GET /api/scrape-events
═══════════════════════════════════════════════════════════════ */

const SUPA_URL = 'https://gfwgbgdvxtocwhilrtdw.supabase.co';
const SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdmd2diZ2R2eHRvY3doaWxydGR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1MTE2NjMsImV4cCI6MjA5NzA4NzY2M30.U8JClv06YsNAwq9qsPb3lQ4SIPeRPjKMzsYxVfcmujw';

const HEADERS = {
  'apikey': SUPA_KEY,
  'Authorization': 'Bearer ' + SUPA_KEY,
  'Content-Type': 'application/json',
};

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36 ApatmentoBot/1.0 (+https://www.apatmento.space)';

/* ── Supabase helpers ── */
async function db(method, path, body) {
  const opts = { method, headers: { ...HEADERS } };
  if (method === 'POST') opts.headers['Prefer'] = 'resolution=merge-duplicates,return=minimal';
  if (method === 'PATCH') opts.headers['Prefer'] = 'return=minimal';
  if (body) opts.body = JSON.stringify(body);
  const r = await fetch(`${SUPA_URL}/rest/v1/${path}`, opts);
  if (!r.ok) throw new Error(`DB ${method} ${path}: ${r.status} ${await r.text().catch(() => '')}`.slice(0, 200));
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
      const clean = m[1].replace(/<!--[\s\S]*?-->/g, '').trim();
      blocks.push(JSON.parse(clean));
    } catch (e) { /* skip malformed */ }
  }
  return blocks;
}

/* ── Recursively collect Event objects ── */
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
  if (node.itemListElement) {
    const items = Array.isArray(node.itemListElement) ? node.itemListElement : [node.itemListElement];
    items.forEach(i => collectEvents(i.item || i, out));
  }
}

/* ── Normalize schema.org Event → row ── */
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
  const desc = typeof ev.description === 'string' ? ev.description.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 500) : null;
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

/* ── Scrape one source (12s cap) ── */
async function scrapeSource(src) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const r = await fetch(src.url, {
      headers: { 'User-Agent': UA, 'Accept': 'text/html,application/xhtml+xml' },
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

    const seen = new Set();
    const unique = rows.filter(x => seen.has(x.dedupe_key) ? false : (seen.add(x.dedupe_key), true));
    return { status: unique.length ? 'ok' : 'no_events', events: unique };
  } catch (e) {
    clearTimeout(timer);
    return { status: ('error:' + (e.name === 'AbortError' ? 'timeout' : e.message)).slice(0, 100), events: [] };
  }
}

/* ── Handler (ESM — repo package.json is type:module) ── */
export default async function handler(req, res) {
  try {
    const sources = await db('GET', 'scrape_sources?active=eq.true&service=eq.events&select=id,url,label');
    if (!sources.length) {
      return res.status(200).json({ ok: true, message: 'No active sources registered.' });
    }

    // ALL sources in parallel — total wall time ≈ slowest single site, not the sum
    const results = await Promise.allSettled(sources.map(s => scrapeSource(s)));

    const summary = [];
    for (let i = 0; i < sources.length; i++) {
      const src = sources[i];
      const r = results[i].status === 'fulfilled' ? results[i].value : { status: 'error:internal', events: [] };
      if (r.events.length) {
        for (let j = 0; j < r.events.length; j += 50) {
          await db('POST', 'scraped_events?on_conflict=dedupe_key', r.events.slice(j, j + 50));
        }
      }
      await db('PATCH', `scrape_sources?id=eq.${src.id}`, {
        last_run: new Date().toISOString(),
        last_status: r.status,
        events_found: r.events.length,
      });
      summary.push({ source: src.label || src.url, status: r.status, found: r.events.length });
    }

    await db('PATCH', `scraped_events?end_date=lt.${new Date(Date.now() - 86400000).toISOString()}&active=eq.true`, { active: false }).catch(() => {});

    res.status(200).json({ ok: true, ran: new Date().toISOString(), summary });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
}
