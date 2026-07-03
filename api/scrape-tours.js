/* ═══════════════════════════════════════════════════════════════
   APATMENTO TOURS INGESTION — GetYourGuide + Viator custom parsers
   Both sites server-render tour cards with titles, CDN images,
   prices and URLs in the HTML — no JSON-LD needed.
   Cron: daily 4am UTC. Manual: GET /api/scrape-tours
═══════════════════════════════════════════════════════════════ */

const SUPA_URL = 'https://gfwgbgdvxtocwhilrtdw.supabase.co';
const SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdmd2diZ2R2eHRvY3doaWxydGR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1MTE2NjMsImV4cCI6MjA5NzA4NzY2M30.U8JClv06YsNAwq9qsPb3lQ4SIPeRPjKMzsYxVfcmujw';
const HEADERS = {
  'apikey': SUPA_KEY, 'Authorization': 'Bearer ' + SUPA_KEY,
  'Content-Type': 'application/json',
};
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0 Safari/537.36';

async function db(method, path, body) {
  const opts = { method, headers: { ...HEADERS } };
  if (method === 'POST') opts.headers['Prefer'] = 'resolution=merge-duplicates,return=minimal';
  if (method === 'PATCH') opts.headers['Prefer'] = 'return=minimal';
  if (body) opts.body = JSON.stringify(body);
  const r = await fetch(`${SUPA_URL}/rest/v1/${path}`, opts);
  if (!r.ok) throw new Error(`DB ${r.status}: ${await r.text().catch(()=>'')}`);
  return method === 'GET' ? r.json() : null;
}

async function fetchHtml(url) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 14000);
  try {
    const r = await fetch(url, {
      headers: { 'User-Agent': UA, 'Accept': 'text/html', 'Accept-Language': 'en-US,en;q=0.9' },
      signal: ctrl.signal, redirect: 'follow',
    });
    clearTimeout(t);
    return r.ok ? r.text() : null;
  } catch { clearTimeout(t); return null; }
}

function clean(s) {
  return s ? s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() : '';
}

/* ── GetYourGuide parser ─────────────────────────────────────── */
function parseGYG(html) {
  const tours = [];
  if (!html) return tours;

  // Extract from "Our most recommended" section
  // Pattern: <a href="URL"><img src="CDN_IMG" ...> ... title ... description
  // GYG image CDN: cdn.getyourguide.com/image/...tour_img/HASH.jpg
  const imgLinkRe = /href="(https:\/\/www\.getyourguide\.com\/[^"]+\/[^"]+-(t\d+)\/[^"]*)"\s*>\s*<[^>]*>\s*<img[^>]+src="(https:\/\/cdn\.getyourguide\.com[^"]+tour_img[^"]+)"[^>]*>/gi;
  let m;
  while ((m = imgLinkRe.exec(html)) !== null) {
    const url = m[1];
    const imgRaw = m[3];
    // Upgrade image quality: replace small dimensions with larger ones
    const img = imgRaw.replace(/width=\d+/, 'width=600').replace(/height=\d+/, 'height=400');

    // Find title & description near this match (next ~2000 chars)
    const slice = html.slice(m.index, m.index + 2200);
    const titleM = slice.match(/>([^<]{10,120})</);
    const title = titleM ? clean(titleM[1]) : null;
    if (!title || title.length < 8) continue;

    const descM = slice.match(/See more\s*$/m) ? slice.match(/\][\s\S]{0,40}\n([\s\S]{80,600})\n\nSee more/) : null;
    const desc = descM ? clean(descM[1]).slice(0, 500) : null;

    const priceM = slice.match(/From \$(\d[\d,]*)/i);
    const price = priceM ? parseFloat(priceM[1].replace(',', '')) : null;
    const ratingM = slice.match(/(\d\.\d)\s*\([\d,]+\)/);
    const rating = ratingM ? parseFloat(ratingM[1]) : null;
    const reviewM = slice.match(/\((\d[\d,]*)\)/);
    const reviews = reviewM ? parseInt(reviewM[1].replace(',', '')) : 0;
    const durM = slice.match(/(\d[\d\-\.]*\s*(?:hour|day|night|week|min)[s]?\s*[\d\-]*\s*(?:hour|day|night|min)?[s]?)/i);
    const duration = durM ? durM[1].trim() : null;

    const dedupe = title.toLowerCase().trim().replace(/\s+/g, '-').slice(0, 200);
    tours.push({
      dedupe_key: 'gyg-' + dedupe,
      title: title.slice(0, 200),
      description: desc,
      location: 'Nairobi, Kenya',
      duration,
      price_from: price,
      currency: 'USD',
      rating,
      review_count: reviews,
      image_url: img,
      tour_url: url,
      source: 'GetYourGuide',
      category: inferCategory(title),
      tags: inferTags(title, desc),
      active: true,
      scraped_at: new Date().toISOString(),
    });
  }
  return tours;
}

/* ── Viator parser ───────────────────────────────────────────── */
function parseViator(html) {
  const tours = [];
  if (!html) return tours;

  // Viator CDN: catalog-static.viatorcdn.com/photos/
  const re = /href="(https:\/\/www\.viator\.com\/tours\/[^"]+)"\s*[^>]*>[\s\S]{0,300}?src="(https:\/\/[^"]*viatorcdn[^"]+\.(jpg|jpeg|webp|png))"[^>]*>[\s\S]{0,600}?<[^>]+>([^<]{10,180})<\//gi;
  let m;
  const seen = new Set();
  while ((m = re.exec(html)) !== null) {
    const url = m[1];
    const img = m[2];
    const title = clean(m[4]);
    if (!title || title.length < 8 || seen.has(url)) continue;
    seen.add(url);

    const slice = html.slice(m.index, m.index + 1200);
    const priceM = slice.match(/From\s*\$(\d[\d,]*)/i);
    const price = priceM ? parseFloat(priceM[1].replace(',', '')) : null;
    const ratingM = slice.match(/(\d\.\d)\s*\/\s*5/);
    const rating = ratingM ? parseFloat(ratingM[1]) : null;
    const durM = slice.match(/(\d[\d\-\.]*\s*(?:hour|day|night|week|min)[s]?)/i);
    const duration = durM ? durM[1].trim() : null;

    const dedupe = title.toLowerCase().trim().replace(/\s+/g, '-').slice(0, 200);
    tours.push({
      dedupe_key: 'via-' + dedupe,
      title: title.slice(0, 200),
      description: null,
      location: 'Nairobi, Kenya',
      duration,
      price_from: price,
      currency: 'USD',
      rating,
      review_count: 0,
      image_url: img,
      tour_url: url,
      source: 'Viator',
      category: inferCategory(title),
      tags: inferTags(title, null),
      active: true,
      scraped_at: new Date().toISOString(),
    });
  }
  return tours;
}

/* ── Category & tag inference ────────────────────────────────── */
function inferCategory(title) {
  const t = (title || '').toLowerCase();
  if (/maasai mara|serengeti|amboseli|nakuru|tsavo|ol pejeta|samburu|aberdare|rift valley/.test(t)) return 'big-safari';
  if (/nairobi national park|nai?ro?bi park|game drive/.test(t)) return 'day-safari';
  if (/balloon|hot air/.test(t)) return 'adventure';
  if (/walking|walking tour|city tour|downtown|walking tour/.test(t)) return 'city-tour';
  if (/giraffe|elephant orphan|sheldrick|wildlife trust/.test(t)) return 'wildlife';
  if (/maasai village|cultural|bomas|kibera|cooking class/.test(t)) return 'culture';
  if (/hell.?s gate|lake naivasha|nakuru|naivasha|boat/.test(t)) return 'day-trip';
  if (/transfer|airport|shuttle/.test(t)) return 'transfer';
  return 'safari';
}
function inferTags(title, desc) {
  const t = ((title||'')+(desc||'')).toLowerCase();
  const tags = [];
  if (/big five|lion|rhino|leopard|elephant|buffalo/.test(t)) tags.push('Big Five');
  if (/pickup|pick.?up/.test(t)) tags.push('Hotel pickup');
  if (/private/.test(t)) tags.push('Private option');
  if (/small group/.test(t)) tags.push('Small group');
  if (/skip.?the.?line/.test(t)) tags.push('Skip the line');
  if (/free cancel/.test(t)) tags.push('Free cancellation');
  if (/maasai mara/.test(t)) tags.push('Maasai Mara');
  if (/balloon/.test(t)) tags.push('Hot air balloon');
  if (/mount kili|kilimanjaro/.test(t)) tags.push('Kilimanjaro view');
  return tags.slice(0, 5);
}

/* ── Dedup within a batch ────────────────────────────────────── */
function dedup(rows) {
  const seen = new Set();
  return rows.filter(r => seen.has(r.dedupe_key) ? false : (seen.add(r.dedupe_key), true));
}

/* ── Handler ──────────────────────────────────────────────────── */
export default async function handler(req, res) {
  try {
    const [gygHtml, viaHtml] = await Promise.all([
      fetchHtml('https://www.getyourguide.com/nairobi-l267/'),
      fetchHtml('https://www.viator.com/Nairobi/d5280-ttd'),
    ]);

    const gygTours = dedup(parseGYG(gygHtml));
    const viaTours = dedup(parseViator(viaHtml));
    const all = dedup([...gygTours, ...viaTours]);

    // Upsert in batches of 50
    for (let i = 0; i < all.length; i += 50) {
      await db('POST', 'scraped_tours?on_conflict=dedupe_key', all.slice(i, i + 50));
    }

    // Update sources last_run
    const now = new Date().toISOString();
    await db('PATCH', "scrape_sources?label=eq.GetYourGuide Nairobi", {
      last_run: now, last_status: gygTours.length ? 'ok' : 'no_tours', events_found: gygTours.length
    });
    await db('PATCH', "scrape_sources?label=eq.Viator Nairobi", {
      last_run: now, last_status: viaTours.length ? 'ok' : 'no_tours', events_found: viaTours.length
    });

    res.status(200).json({
      ok: true, ran: now,
      summary: [
        { source: 'GetYourGuide', found: gygTours.length },
        { source: 'Viator',        found: viaTours.length },
        { total: all.length }
      ]
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
}
