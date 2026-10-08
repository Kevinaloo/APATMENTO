/* ════════════════════════════════════════════════════════════════════
   CABANA · LISTING SHARE LINKS
   /s/:id  →  a tiny page with the listing's own title, photo and price in
   its Open Graph tags (so WhatsApp, iMessage, X, Facebook and Slack unfold
   a real card), then straight on to the exact listing on Cabana.

   People get the redirect in one frame; crawlers read the tags. Nothing
   private is exposed: only a live, public listing's title, place, first
   photo and guest price are used. Anything else lands on the home page.
   ════════════════════════════════════════════════════════════════════ */
const SITE = 'https://cabana.africa';
const ID = /^[A-Za-z0-9_-]{6,64}$/;

/* Where each service opens its own listing. Keep in step with the pages. */
const DEST = {
  stays: id => `/apartments?open=${id}`,
  roommates: id => `/roommates?room=${id}`,
  shopping: id => `/shopping?open=${id}`,
  food: id => `/restaurant?id=${id}`,
};

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clip = (s, n) => { s = String(s ?? '').replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s; };

async function rest(path, { env, fetchImpl }) {
  const key = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY;
  if (!env.SUPABASE_URL || !key) return null;
  const r = await fetchImpl(`${env.SUPABASE_URL}/rest/v1/${path}`, { headers: { apikey: key, Authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(4000) });
  return r.ok ? r.json() : null;
}

export function shareDestination(row) {
  const svc = String(row?.service || 'stays').toLowerCase();
  return (DEST[svc] || DEST.stays)(encodeURIComponent(row.id));
}

export async function buildShare(id, { env = process.env, fetchImpl = fetch } = {}) {
  if (!ID.test(id || '')) return null;
  const rows = await rest(`listings?id=eq.${encodeURIComponent(id)}&status=eq.active&is_active=eq.true&deleted_at=is.null&select=id,title,city,area,location,country,price_night,price_per_night,currency,photos,service,beds,max_guests&limit=1`, { env, fetchImpl }).catch(() => null);
  const row = rows && rows[0];
  if (!row) return null;
  let price = Number(row.price_night || row.price_per_night) || 0;
  if (price && String(row.service || 'stays') === 'stays') {
    // Guests see one all-in price everywhere, so the card must say the same.
    const key = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY;
    try {
      const r = await fetchImpl(`${env.SUPABASE_URL}/rest/v1/rpc/cabana_all_in_prices`, { method: 'POST', headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ p_service: 'stays', p_amounts: [price] }), signal: AbortSignal.timeout(3000) });
      const j = r.ok ? await r.json() : null;
      if (Array.isArray(j) && Number(j[0]) > 0) price = Number(j[0]);
    } catch { /* fall back to the listed figure */ }
  }
  const place = [row.area, row.city].filter(Boolean).join(', ') || row.location || row.country || '';
  const photo = Array.isArray(row.photos) ? row.photos.find(p => typeof p === 'string' && /^https:\/\//.test(p)) : null;
  const unit = String(row.service || 'stays') === 'roommates' ? 'month' : 'night';
  return {
    id: row.id, dest: shareDestination(row), title: clip(row.title || 'A place on Cabana', 90), place: clip(place, 80), photo,
    priceLine: price ? `${row.currency || 'KES'} ${Math.round(price).toLocaleString('en-KE')} / ${unit}` : '',
  };
}

export function renderShare(info, { id } = {}) {
  const dest = info ? `${SITE}${info.dest}${info.dest.includes('?') ? '&' : '?'}utm_source=share&utm_medium=link` : SITE;
  const title = info ? `${info.title}${info.place ? ' · ' + info.place : ''}` : 'Cabana';
  const desc = info ? [info.priceLine, 'Book direct with the host on Cabana. Zero commission.'].filter(Boolean).join(' · ') : 'Book direct with local hosts across Africa.';
  const img = info?.photo || `${SITE}/og-stays.jpg`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)} | Cabana</title><meta name="robots" content="noindex,follow"><link rel="canonical" href="${esc(dest)}">
<meta property="og:type" content="website"><meta property="og:site_name" content="Cabana"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}">
<meta property="og:image" content="${esc(img)}"><meta property="og:url" content="${SITE}/s/${esc(id || '')}">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(title)}"><meta name="twitter:description" content="${esc(desc)}"><meta name="twitter:image" content="${esc(img)}">
<meta http-equiv="refresh" content="0;url=${esc(dest)}">
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;font:16px system-ui,sans-serif;background:#0b0b14;color:#f4f4fb}a{color:#b8a4f4}</style></head>
<body><p>Opening <a href="${esc(dest)}">${esc(info?.title || 'Cabana')}</a>…</p><script>location.replace(${JSON.stringify(dest)})</script></body></html>`;
}

export default async function listingShareHandler(req, res) {
  const id = String(req.query?.id || '').trim();
  const info = await buildShare(id).catch(() => null);
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=3600');
  return res.status(200).send(renderShare(info, { id }));
}
