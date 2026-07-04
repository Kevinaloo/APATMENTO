/* ════════════════════════════════════════════════════════════════
   APATMENTO  ·  Shopping Scraper — Jumia Kenya
   Fetches top-rated products from Jumia Kenya across 4 categories.
   Jumia is server-rendered PHP/hybrid: full product data including
   names, prices, discounts, ratings, images in the HTML source.
   Cron: daily 1am UTC  ·  Manual: GET /api/scrape-shopping
════════════════════════════════════════════════════════════════ */
const SUPA_URL = 'https://gfwgbgdvxtocwhilrtdw.supabase.co';
const SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdmd2diZ2R2eHRvY3doaWxydGR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1MTE2NjMsImV4cCI6MjA5NzA4NzY2M30.U8JClv06YsNAwq9qsPb3lQ4SIPeRPjKMzsYxVfcmujw';

const HEADERS = {
  'apikey': SUPA_KEY, 'Authorization': 'Bearer ' + SUPA_KEY, 'Content-Type': 'application/json'
};

const BROWSER = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept-Encoding': 'gzip, deflate, br',
  'Cache-Control': 'no-cache',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
};

async function db(method, path, body) {
  const opts = { method, headers: { ...HEADERS } };
  if (method === 'POST') opts.headers.Prefer = 'resolution=merge-duplicates,return=minimal';
  if (body) opts.body = JSON.stringify(body);
  const r = await fetch(`${SUPA_URL}/rest/v1/${path}`, opts);
  if (!r.ok) throw new Error(`DB ${r.status}: ${await r.text().catch(() => '')}`);
  return method === 'GET' ? r.json() : null;
}

async function fetchPage(url, ms = 18000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const r = await fetch(url, { headers: BROWSER, signal: ctrl.signal, redirect: 'follow' });
    clearTimeout(t);
    return r.ok ? r.text() : null;
  } catch { clearTimeout(t); return null; }
}

/* ── Category mapping: Jumia URL → our category ── */
const SOURCES = [
  { url: 'https://www.jumia.co.ke/smartphones/?sort=top-rated',           cat: 'electronics', label: 'Smartphones' },
  { url: 'https://www.jumia.co.ke/tvs-dvds-videos/?sort=top-rated',       cat: 'electronics', label: 'TVs & Electronics' },
  { url: 'https://www.jumia.co.ke/womens-clothing/?sort=top-rated',       cat: 'fashion',     label: 'Fashion' },
  { url: 'https://www.jumia.co.ke/home-and-office/?sort=top-rated',       cat: 'home',        label: 'Home & Office' },
];

/* ── Parse Jumia product listing HTML ── */
function parseJumia(html, cat) {
  if (!html) return [];
  const products = [];
  const seen = new Set();

  // Each product is in an <article> with a link like href="/product-name-SKU.html"
  // Image is in data-src="https://ke.jumia.is/unsafe/fit-in/300x300/filters:fill(white)/product/XX/SKU/1.jpg"
  // Name is in alt attribute or <h3 class="name">
  // Price: class="prc" → "KSh X,XXX"
  // Original: class="old" → "KSh X,XXX"
  // Discount: class="bdg _disc" → "XX%"
  // Rating: class="rev" → "X.X out of 5"
  // Reviews: class="count" → "(XXX)"

  const articleRe = /<article[^>]*class="[^"]*prd[^"]*"[^>]*>([\s\S]*?)<\/article>/gi;
  let m;
  while ((m = articleRe.exec(html)) !== null) {
    const chunk = m[1];

    // Product URL
    const urlM = chunk.match(/href="(\/[a-z0-9][a-z0-9\-]+[0-9]+\.html)"/i);
    if (!urlM) continue;
    const relUrl = urlM[1];
    const fullUrl = 'https://www.jumia.co.ke' + relUrl + '?utm_source=apatmento';

    // Extract SKU from URL  (last number before .html)
    const skuM = relUrl.match(/-(\d{5,})\./);
    if (!skuM) continue;
    const sku = skuM[1];
    if (seen.has(sku)) continue;
    seen.add(sku);

    // Product name (from img alt or h3)
    const nameM = chunk.match(/alt="([^"]{5,150})"/i) || chunk.match(/<h3[^>]*>([^<]{5,150})<\/h3>/i);
    const name = nameM ? nameM[1].trim().replace(/<[^>]+>/g, '').replace(/\s+/g, ' ') : null;
    if (!name || name.length < 4) continue;

    // Image URL from data-src
    const imgM = chunk.match(/data-src="(https:\/\/ke\.jumia\.is[^"]+\.(?:jpg|jpeg|webp|png)[^"]*)"/i)
               || chunk.match(/src="(https:\/\/ke\.jumia\.is[^"]+\.(?:jpg|jpeg|webp|png)[^"]*)"/i);
    let image = imgM ? imgM[1] : null;
    if (image) {
      // Upgrade resolution: 300x300 → 500x500
      image = image.replace('fit-in/300x300', 'fit-in/500x500').replace('fit-in/200x200', 'fit-in/500x500');
    }

    // Price (first KSh amount)
    const priceM = chunk.match(/class="prc"[^>]*>KSh\s*([\d,]+)/i)
                 || chunk.match(/KSh\s*([\d,]+)/i);
    const price = priceM ? parseFloat(priceM[1].replace(/,/g, '')) : null;

    // Old price
    const oldM = chunk.match(/class="old"[^>]*>KSh\s*([\d,]+)/i);
    const oldPrice = oldM ? parseFloat(oldM[1].replace(/,/g, '')) : null;

    // Discount
    const discM = chunk.match(/class="bdg _disc"[^>]*>(\d+)%/i)
                || chunk.match(/-(\d+)%/);
    const discountPct = discM ? parseInt(discM[1]) : null;

    // Rating
    const ratingM = chunk.match(/class="rev"[^>]*>([\d.]+)\s*out\s*of/i);
    const rating = ratingM ? parseFloat(ratingM[1]) : null;

    // Reviews
    const revM = chunk.match(/class="count"[^>]*>\((\d+)\)/i);
    const reviewCount = revM ? parseInt(revM[1]) : 0;

    const dk = 'jumia-' + sku;
    const tags = [cat === 'electronics' ? 'Electronics' : cat === 'fashion' ? 'Fashion' : 'Jumia Kenya'];
    if (discountPct && discountPct >= 20) tags.push(discountPct + '% OFF');
    if (rating && rating >= 4.5) tags.push('Top rated');
    if (reviewCount > 100) tags.push('Popular');

    products.push({
      dedupe_key: dk,
      name: name.slice(0, 200),
      category: cat,
      seller: 'Jumia Kenya',
      market: 'Jumia Kenya',
      city: 'Nairobi',
      price: price,
      description: oldPrice && discountPct
        ? `Was KSh ${oldPrice.toLocaleString()} — now ${discountPct}% off on Jumia Kenya.${rating ? ' Rated ' + rating + '/5' : ''}`
        : `Available on Jumia Kenya.${rating ? ' Rated ' + rating + '/5' : ''}`,
      image_url: image,
      tags: tags,
      hot: (discountPct && discountPct >= 30) || (rating && rating >= 4.5 && reviewCount > 50) || false,
      in_stock: true,
      active: true,
      source: 'jumia',
      scraped_at: new Date().toISOString(),
    });

    if (products.length >= 25) break;
  }

  return products;
}

function dedup(rows) {
  const s = new Set();
  return rows.filter(r => r && !s.has(r.dedupe_key) && (s.add(r.dedupe_key), true));
}

export default async function handler(req, res) {
  const t0 = Date.now();
  try {
    // Fetch all Jumia category pages in parallel
    const pages = await Promise.all(SOURCES.map(s => fetchPage(s.url)));

    let all = [];
    const summary = [];
    for (let i = 0; i < SOURCES.length; i++) {
      const products = parseJumia(pages[i], SOURCES[i].cat);
      summary.push({ source: SOURCES[i].label, found: products.length });
      all = all.concat(products);
    }

    all = dedup(all);

    if (all.length) {
      for (let i = 0; i < all.length; i += 50) {
        await db('POST', 'scraped_shopping?on_conflict=dedupe_key', all.slice(i, i + 50));
      }
    }

    res.status(200).json({
      ok: true, ran: new Date().toISOString(), ms: Date.now() - t0,
      summary, total_upserted: all.length,
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
}
