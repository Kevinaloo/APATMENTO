/* ═══════════════════════════════════════════════════════════════
   APATMENTO TOURS SCRAPER v2 — GYG + Viator
   Handles lazy-loaded images (data-src, data-lazy-src),
   JSON-LD TouristAttraction/Product, and Next.js __NEXT_DATA__
═══════════════════════════════════════════════════════════════ */

const SUPA_URL = 'https://gfwgbgdvxtocwhilrtdw.supabase.co';
const SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdmd2diZ2R2eHRvY3doaWxydGR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1MTE2NjMsImV4cCI6MjA5NzA4NzY2M30.U8JClv06YsNAwq9qsPb3lQ4SIPeRPjKMzsYxVfcmujw';

const H = {
  'apikey': SUPA_KEY, 'Authorization': 'Bearer ' + SUPA_KEY, 'Content-Type': 'application/json'
};

async function db(method, path, body) {
  const opts = { method, headers: { ...H } };
  if (method === 'POST') opts.headers['Prefer'] = 'resolution=merge-duplicates,return=minimal';
  if (method === 'PATCH') opts.headers['Prefer'] = 'return=minimal';
  if (body) opts.body = JSON.stringify(body);
  const r = await fetch(`${SUPA_URL}/rest/v1/${path}`, opts);
  if (!r.ok) throw new Error(`DB ${r.status}`);
  return method === 'GET' ? r.json() : null;
}

async function fetchHtml(url) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 14000);
  try {
    const r = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache',
      },
      signal: ctrl.signal, redirect: 'follow',
    });
    clearTimeout(t);
    return r.ok ? r.text() : null;
  } catch (e) { clearTimeout(t); return null; }
}

/* ── Extract image src from any lazy-loading pattern ── */
function extractImg(attrs) {
  // Priority: data-src > data-lazy-src > data-original > srcset (first item) > src
  const patterns = [
    /data-src="([^"]+)"/i,
    /data-lazy-src="([^"]+)"/i,
    /data-original="([^"]+)"/i,
    /srcset="([^\s"]+)/i,
    /src="([^"]+)"/i,
  ];
  for (const p of patterns) {
    const m = attrs.match(p);
    if (m && m[1] && !m[1].startsWith('data:') && m[1].includes('http')) {
      return m[1].split(' ')[0];
    }
  }
  return null;
}

/* ── Try to extract __NEXT_DATA__ (Next.js SSR payload) ── */
function extractNextData(html) {
  const m = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (!m) return null;
  try { return JSON.parse(m[1]); } catch { return null; }
}

/* ── Infer category from title ── */
function cat(t) {
  const s = (t || '').toLowerCase();
  if (/maasai mara|serengeti|amboseli|tsavo|nakuru|samburu/.test(s)) return 'big-safari';
  if (/nairobi national park|game drive|half.?day safari/.test(s)) return 'day-safari';
  if (/balloon|hot air/.test(s)) return 'adventure';
  if (/walking|city tour|downtown/.test(s)) return 'city-tour';
  if (/giraffe|elephant orphan|sheldrick|wildlife trust|kibera/.test(s)) return 'wildlife';
  if (/maasai village|cultural|bomas|cooking class|tribe/.test(s)) return 'culture';
  if (/hell.?s gate|naivasha|nakuru|rift valley|boat/.test(s)) return 'day-trip';
  if (/transfer|airport|shuttle|pickup/.test(s)) return 'transfer';
  return 'safari';
}
function tags(title, desc) {
  const s = ((title||'')+(desc||'')).toLowerCase();
  const t = [];
  if (/big five|lion|rhino|leopard|elephant|buffalo/.test(s)) t.push('Big Five');
  if (/hotel pickup|free pickup|pickup included/.test(s)) t.push('Hotel pickup');
  if (/private/.test(s)) t.push('Private option');
  if (/small group/.test(s)) t.push('Small group');
  if (/skip.?the.?line/.test(s)) t.push('Skip the line');
  if (/maasai mara/.test(s)) t.push('Maasai Mara');
  if (/balloon/.test(s)) t.push('Hot air balloon');
  if (/kilimanjaro/.test(s)) t.push('Kilimanjaro view');
  return t.slice(0, 5);
}

/* ─── GetYourGuide ─────────────────────────────────────────── */
function parseGYG(html) {
  const tours = [];
  if (!html) return tours;

  // Strategy 1: Look for Next.js __NEXT_DATA__ (GYG uses Next.js)
  const nextData = extractNextData(html);
  if (nextData) {
    try {
      // GYG stores tours in pageProps.tours or pageProps.activities
      const props = nextData?.props?.pageProps;
      const activities = props?.activities || props?.tours || props?.searchResults?.activities || [];
      if (activities.length) {
        activities.forEach(a => {
          const title = a.title || a.name;
          if (!title) return;
          const image = a.image?.medium || a.image?.small || a.images?.[0]?.medium || a.coverImage;
          const url = `https://www.getyourguide.com${a.path || a.url || ''}`;
          const price = a.pricing?.summary?.fromPrice?.amount || a.fromPrice?.amount || a.price;
          const rating = a.ratingInfo?.overallRating || a.reviews?.combinedAverageRating;
          const reviews = a.ratingInfo?.numberOfRatings || a.reviews?.totalCount;
          tours.push({
            dedupe_key: ('gyg-' + title.toLowerCase().trim().replace(/\s+/g, '-').slice(0, 180)),
            title: title.slice(0, 200),
            description: (a.abstract || a.description || '').slice(0, 500),
            location: 'Nairobi, Kenya',
            duration: a.durationFormatted || a.duration?.label || null,
            price_from: price ? parseFloat(price) : null,
            currency: 'USD',
            rating: rating ? parseFloat(rating) : null,
            review_count: reviews ? parseInt(reviews) : 0,
            image_url: image || null,
            tour_url: url,
            source: 'GetYourGuide',
            category: cat(title),
            tags: tags(title, a.abstract),
            active: true, scraped_at: new Date().toISOString(),
          });
        });
        if (tours.length) return tours;
      }
    } catch (e) { /* fall through to HTML parsing */ }
  }

  // Strategy 2: HTML parsing — GYG tour cards
  // Match links to tour pages (always /-tNNNNNN/ pattern)
  const tourUrlRe = /href="(https:\/\/www\.getyourguide\.com\/[^"]*-t\d{4,}\/[^"]*)"/g;
  const found = new Map();
  let m;
  while ((m = tourUrlRe.exec(html)) !== null) {
    const url = m[1].split('?')[0];
    if (found.has(url)) continue;
    const slice = html.slice(Math.max(0, m.index - 200), m.index + 1500);

    // Image: try all lazy-load patterns in nearby img tags
    const imgTagM = slice.match(/<img[^>]+>/i);
    const image = imgTagM ? extractImg(imgTagM[0]) : null;

    // Title: next non-empty text content after url anchor
    const titleM = slice.match(/alt="([^"]{8,150})"/i) ||
                   slice.match(/>([A-Z][^<]{10,120})</);
    const title = titleM ? titleM[1].trim() : null;
    if (!title) continue;

    const priceM = slice.match(/From[\s\$€£]*(\d[\d,\.]*)/i);
    const price = priceM ? parseFloat(priceM[1].replace(',', '')) : null;
    const ratingM = slice.match(/(\d\.\d)\s*(?:out of 5|\([\d,]+\)|\/5)/i);
    const rating = ratingM ? parseFloat(ratingM[1]) : null;
    const reviewM = slice.match(/\((\d[\d,]*)\)\s*(?:review|rating)/i) || slice.match(/(\d[\d,]+)\s*review/i);
    const reviewCount = reviewM ? parseInt(reviewM[1].replace(',', '')) : 0;
    const durM = slice.match(/(\d[\d\-\.]*\s*(?:hour|day|night|week|min)[s]?)/i);

    found.set(url, true);
    tours.push({
      dedupe_key: 'gyg-' + title.toLowerCase().trim().replace(/\s+/g, '-').slice(0, 180),
      title: title.slice(0, 200),
      description: null,
      location: 'Nairobi, Kenya',
      duration: durM ? durM[1].trim() : null,
      price_from: price,
      currency: 'USD',
      rating,
      review_count: reviewCount,
      image_url: image,
      tour_url: url,
      source: 'GetYourGuide',
      category: cat(title),
      tags: tags(title, null),
      active: true, scraped_at: new Date().toISOString(),
    });
    if (tours.length >= 30) break;
  }
  return tours;
}

/* ─── Viator ───────────────────────────────────────────────── */
function parseViator(html) {
  const tours = [];
  if (!html) return tours;

  // Strategy 1: __NEXT_DATA__
  const nextData = extractNextData(html);
  if (nextData) {
    try {
      const props = nextData?.props?.pageProps;
      const products = props?.products || props?.experiences || props?.results || [];
      if (products.length) {
        products.forEach(p => {
          const title = p.title || p.heading;
          if (!title) return;
          const image = p.thumbnailHiResURL || p.thumbnailURL || p.images?.[0]?.variants?.[0]?.url;
          const url = `https://www.viator.com${p.webURL || p.url || ''}`;
          const price = p.price?.fromPrice || p.pricing?.fromPrice;
          const rating = p.rating || p.reviews?.combinedAverageRating;
          tours.push({
            dedupe_key: 'via-' + title.toLowerCase().trim().replace(/\s+/g, '-').slice(0, 180),
            title: title.slice(0, 200),
            description: (p.description || '').slice(0, 500),
            location: 'Nairobi, Kenya',
            duration: p.duration?.fixedDurationInMinutes ? `${Math.round(p.duration.fixedDurationInMinutes/60)} hours` : null,
            price_from: price ? parseFloat(price) : null,
            currency: 'USD',
            rating: rating ? parseFloat(rating) : null,
            review_count: p.reviews?.totalReviews || 0,
            image_url: image || null,
            tour_url: url,
            source: 'Viator',
            category: cat(title),
            tags: tags(title, p.description),
            active: true, scraped_at: new Date().toISOString(),
          });
        });
        if (tours.length) return tours;
      }
    } catch {}
  }

  // Strategy 2: HTML — Viator tour card links always /tours/ pattern
  const re = /href="(https:\/\/www\.viator\.com\/tours\/[A-Za-z0-9\-\/]+)"/g;
  const found = new Map();
  let m;
  while ((m = re.exec(html)) !== null) {
    const url = m[1].split('?')[0];
    if (found.has(url) || url.endsWith('/tours/')) continue;
    const slice = html.slice(Math.max(0, m.index - 300), m.index + 1200);
    const imgTagM = slice.match(/<img[^>]+>/i);
    const image = imgTagM ? extractImg(imgTagM[0]) : null;
    const titleM = slice.match(/alt="([^"]{8,150})"/i) || slice.match(/>([A-Z][^<]{10,120})</);
    const title = titleM ? titleM[1].trim() : null;
    if (!title) continue;
    const priceM = slice.match(/From[\s\$]*(\d[\d,\.]*)/i);
    const price = priceM ? parseFloat(priceM[1].replace(',', '')) : null;
    const ratingM = slice.match(/(\d\.\d)\s*\/\s*5/);
    const rating = ratingM ? parseFloat(ratingM[1]) : null;
    found.set(url, true);
    tours.push({
      dedupe_key: 'via-' + title.toLowerCase().trim().replace(/\s+/g, '-').slice(0, 180),
      title: title.slice(0, 200), description: null, location: 'Nairobi, Kenya', duration: null,
      price_from: price, currency: 'USD', rating, review_count: 0,
      image_url: image, tour_url: url, source: 'Viator',
      category: cat(title), tags: tags(title, null),
      active: true, scraped_at: new Date().toISOString(),
    });
    if (tours.length >= 30) break;
  }
  return tours;
}

function dedup(rows) {
  const s = new Set();
  return rows.filter(r => s.has(r.dedupe_key) ? false : (s.add(r.dedupe_key), true));
}

export default async function handler(req, res) {
  try {
    const [gygHtml, viaHtml] = await Promise.all([
      fetchHtml('https://www.getyourguide.com/nairobi-l267/'),
      fetchHtml('https://www.viator.com/Nairobi/d5280-ttd'),
    ]);

    const gygTours = dedup(parseGYG(gygHtml));
    const viaTours = dedup(parseViator(viaHtml));
    const all = dedup([...gygTours, ...viaTours]);

    if (all.length) {
      for (let i = 0; i < all.length; i += 50)
        await db('POST', 'scraped_tours?on_conflict=dedupe_key', all.slice(i, i + 50));
    }

    const now = new Date().toISOString();
    await db('PATCH', "scrape_sources?label=eq.GetYourGuide Nairobi", { last_run: now, last_status: gygTours.length ? 'ok' : 'no_tours', events_found: gygTours.length });
    await db('PATCH', "scrape_sources?label=eq.Viator Nairobi", { last_run: now, last_status: viaTours.length ? 'ok' : 'no_tours', events_found: viaTours.length });

    res.status(200).json({ ok: true, ran: now, summary: [
      { source: 'GetYourGuide', strategy: gygHtml ? 'fetched' : 'timeout', found: gygTours.length },
      { source: 'Viator', strategy: viaHtml ? 'fetched' : 'timeout', found: viaTours.length },
      { total_upserted: all.length }
    ]});
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
}
