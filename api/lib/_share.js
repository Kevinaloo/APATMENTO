/* ══════════════════════════════════════════════════════════════════════
   Cabana · Share links   (routed as /s/<listing id>)
   ──────────────────────────────────────────────────────────────────────
   GET /s/65ef1d11-…            → preview tags for crawlers, then the stay
   GET /s/65ef1d11-…?tour=<v>   → the same, landing inside the 3D tour

   WHY THIS EXISTS
   ───────────────
   A link pasted into WhatsApp is judged by its preview before anyone
   taps it. /apartments?open=<id> previews as the generic stays page:
   the same photo and the same sentence for every flat on the site. The
   one thing the sender wanted to show — this place, this price, this
   area — is missing.

   Link-preview crawlers do not run JavaScript, so the listing has to be
   in the HTML they receive. This route reads the one listing, writes its
   own Open Graph and Twitter tags (photo at 1200×630, price a night,
   area, guests, beds), and sends a person straight on to the real page
   with a meta refresh and location.replace, so the back button skips it.

   THE RULE THIS INHERITS
   ──────────────────────
   Only what a guest could already see: active, not deleted, through the
   anon key so row-level security applies exactly as it does on the page.
   A paused, rejected or unknown listing previews as Cabana itself and
   lands on /apartments. A share link must never advertise a place that
   cannot be booked.

   CACHING
   ───────
   Ten minutes at the edge, a day stale-while-revalidate. A price change
   reaches new previews within minutes; a link going viral in a group
   chat costs one database read per ten minutes, not one per tap.
══════════════════════════════════════════════════════════════════════ */

import { publicOrigin } from './_env.js';

const ID_RE = /^[A-Za-z0-9-]{1,64}$/;
/* The tour's exact-view token (tools/tour-engine/src/share-code.ts).
   Opaque here; only its alphabet and length are checked. */
const TOUR_RE = /^[a-z0-9~.\-]{1,120}$/i;

const CACHE_OK = 'public, max-age=0, s-maxage=600, stale-while-revalidate=86400';
/* A database wobble is not an answer worth holding for ten minutes. */
const CACHE_ERR = 'public, max-age=0, s-maxage=30, stale-while-revalidate=60';

const UNIT = { stays: 'a night', roommates: 'a month', tours: 'a person', events: 'a ticket',
  carhire: 'a day', rides: 'a trip' };

export function esc(v) {
  return String(v == null ? '' : v).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/* Same test the stays page applies (isRoom/isStay in apartments.html):
   an explicit service wins, then the legacy `type` of untagged rows. */
export function serviceOf(row) {
  const svc = String(row?.service || '').toLowerCase().trim();
  if (svc) return svc;
  return String(row?.type || '').toLowerCase().trim() === 'room' ? 'roommates' : 'stays';
}

/* Where a person lands. Each service's own page already understands a
   deep link to one listing; where a page has none, its board. */
export function destination(row, tour) {
  const id = encodeURIComponent(row.id);
  switch (serviceOf(row)) {
    case 'stays': return '/apartments?open=' + id + (tour ? '&tour=' + encodeURIComponent(tour) : '');
    case 'roommates': return '/roommates?room=' + id;
    case 'food': return '/restaurant?id=' + id;
    /* The shop prefixes partner listings with "l" (shopping.html). */
    case 'shopping': return '/shopping?open=l' + id;
    case 'tours': return '/tours';
    case 'events': return '/events';
    case 'carhire': return '/carhire';
    case 'rides': return '/rides';
    default: return '/apartments';
  }
}

/* Photos through the Supabase image renderer, cropped to the 1.91:1
   frame every preview card uses. A 6 MB phone original would be
   skipped by WhatsApp's size limit and show no picture at all. */
export function ogImage(photos, fallback) {
  const list = Array.isArray(photos) ? photos : [];
  let src = list.find(Boolean);
  if (src && typeof src === 'object') src = src.url || src.src || '';
  if (typeof src !== 'string' || !/^https:\/\//.test(src)) return fallback;
  const OBJ = '/storage/v1/object/public/';
  if (!src.includes(OBJ)) return src;
  return src.split('?')[0].replace(OBJ, '/storage/v1/render/image/public/')
    + '?width=1200&height=630&resize=cover&quality=80';
}

function place(row) {
  const area = String(row.area || '').trim();
  const city = String(row.city || '').trim();
  if (area && city && !area.toLowerCase().includes(city.toLowerCase())) return area + ', ' + city;
  return area || city || String(row.location || '').trim();
}

/* One line a person reads in the preview: what it costs, where it is,
   how many it sleeps. Only the facts the row actually has. */
export function describe(row) {
  const svc = serviceOf(row);
  const cur = String(row.currency || 'KES').toUpperCase().slice(0, 4);
  const raw = svc === 'roommates' ? (row.price_month || row.price_night) : (row.price_night || row.price_per_night);
  const price = Number(raw);
  const bits = [];
  if (price > 0 && svc !== 'food' && svc !== 'shopping') {
    bits.push(`${cur} ${Math.round(price).toLocaleString('en-US')}${UNIT[svc] ? ' ' + UNIT[svc] : ''}`);
  }
  const where = place(row);
  if (where) bits.push(where);
  if (svc === 'stays' || svc === 'roommates') {
    const guests = parseInt(row.max_guests, 10);
    if (guests > 0) bits.push(`Up to ${guests} guest${guests === 1 ? '' : 's'}`);
    const beds = parseInt(row.beds ?? row.bedrooms, 10);
    if (beds === 0) bits.push('Studio');
    else if (beds > 0) bits.push(`${beds} bed${beds === 1 ? '' : 's'}`);
  }
  return bits.join(' · ');
}

export function isLive(row) {
  if (!row || row.deleted_at) return false;
  if (row.is_active === false) return false;
  /* Rejected, paused or awaiting verification can still carry is_active
     from before the decision. Only an active status is bookable. */
  return !row.status || row.status === 'active';
}

/* The page itself. Every value is escaped where it lands: attributes
   through esc(), the script's target through JSON with '<' encoded so a
   value can never close the <script> element. */
export function renderPage({ title, description, image, imageAlt, shareUrl, target, found }) {
  const script = JSON.stringify(target).replace(/</g, '\\u003c');
  const heading = found ? title : 'Cabana';
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(found ? title + ' · Cabana' : 'Cabana · Stays across Africa')}</title>
<meta name="description" content="${esc(description)}">
<meta name="robots" content="noindex,follow">
<link rel="canonical" href="${esc(shareUrl)}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Cabana">
<meta property="og:url" content="${esc(shareUrl)}">
<meta property="og:title" content="${esc(found ? title : 'Cabana · Stays across Africa')}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:image" content="${esc(image)}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${esc(imageAlt)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:site" content="@apatmento">
<meta name="twitter:title" content="${esc(found ? title : 'Cabana')}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:image" content="${esc(image)}">
<meta name="theme-color" content="#120F2B">
<meta http-equiv="refresh" content="0;url=${esc(target)}">
<script>location.replace(${script});</script>
<style>
body{margin:0;min-height:100vh;display:grid;place-items:center;background:#F6F4FD;color:#120F2B;font:15px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif}
a{display:block;max-width:360px;margin:24px;padding:22px 24px;border-radius:20px;background:#fff;color:inherit;text-decoration:none;box-shadow:0 18px 50px rgba(24,10,70,.14)}
small{display:block;font-size:11px;font-weight:700;letter-spacing:.14em;color:#7B2FF7}
b{display:block;margin:6px 0 4px;font-size:18px}
span{color:#6E6A88;font-size:13px}
</style>
</head>
<body>
<a href="${esc(target)}"><small>CABANA</small><b>${esc(heading)}</b><span>${esc(found ? description : 'Opening Cabana…')}</span></a>
</body>
</html>`;
}

async function readListing(id) {
  const url = process.env.SUPABASE_URL;
  /* Anon first, so the database's own visibility rules decide what a
     preview may show, exactly as on the page. The service key is the
     fallback for a deployment without the anon key set; the filters
     below then do the same job. */
  const key = process.env.SUPABASE_ANON_KEY
    || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return { row: null, ok: true };
  /* SELECT * for the same reason as the stays page: naming one column
     that a schema change dropped turns every preview into a 400. */
  const q = 'select=*&id=eq.' + encodeURIComponent(id)
    + '&is_active=eq.true&deleted_at=is.null&limit=1';
  const r = await fetch(url.replace(/\/+$/, '') + '/rest/v1/listings?' + q, {
    headers: { apikey: key, Authorization: 'Bearer ' + key, Accept: 'application/json' },
    signal: AbortSignal.timeout(4000),
  });
  if (!r.ok) {
    /* An id that is not a uuid is a client error, not an outage. */
    if (r.status === 400) return { row: null, ok: true };
    throw new Error('listings ' + r.status);
  }
  const rows = await r.json();
  return { row: Array.isArray(rows) ? rows[0] || null : null, ok: true };
}

export default async function shareHandler(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD');
    return res.status(405).json({ error: 'method not allowed' });
  }
  const params = new URL(req.url || '/', 'http://x').searchParams;
  const id = String(params.get('id') || req.query?.id || '');
  const tourRaw = String(params.get('tour') || req.query?.tour || '');
  const tour = TOUR_RE.test(tourRaw) ? tourRaw : '';
  const site = publicOrigin();
  const fallbackImage = site + '/og-stays.jpg';

  let row = null, failed = false;
  if (ID_RE.test(id)) {
    try { ({ row } = await readListing(id)); }
    catch { failed = true; }
  }

  const found = !!row && isLive(row);
  let page;
  if (found) {
    const title = String(row.title || 'A place on Cabana').trim().slice(0, 120);
    const inTour = tour && serviceOf(row) === 'stays';
    const description = describe(row) || 'Book directly on Cabana.';
    page = {
      found,
      title: inTour ? `Step inside ${title} in 3D` : title,
      description: inTour ? `Cabana 3D tour · ${description}` : description,
      image: ogImage(row.photos, fallbackImage),
      imageAlt: title,
      shareUrl: `${site}/s/${encodeURIComponent(row.id)}${inTour ? '?tour=' + encodeURIComponent(tour) : ''}`,
      target: destination(row, inTour ? tour : ''),
    };
  } else {
    /* Unknown or not bookable. When the read itself failed we cannot
       tell which, so the stays page gets the id and decides; it opens
       the listing if it is there and shows the board if not. */
    page = {
      found: false,
      title: 'Cabana',
      description: 'Stays, rooms and experiences across Africa. Book directly with the host.',
      image: fallbackImage,
      imageAlt: 'Cabana',
      shareUrl: site + '/apartments',
      target: failed && ID_RE.test(id) ? '/apartments?open=' + encodeURIComponent(id) : '/apartments',
    };
  }

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', failed ? CACHE_ERR : CACHE_OK);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  return res.status(200).send(req.method === 'HEAD' ? '' : renderPage(page));
}
