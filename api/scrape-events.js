/* ═══════════════════════════════════════════════════════════════
   APATMENTO EVENT INGESTION v4
   Sources: Ticketsasa · Tipsitickets · Eventbrite Nairobi
   Fixes: proper date parsing, price HTML entities, real venue
          extraction, image quality, Tipsitickets media CDN URLs
═══════════════════════════════════════════════════════════════ */

const SUPA_URL = 'https://gfwgbgdvxtocwhilrtdw.supabase.co';
const SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdmd2diZ2R2eHRvY3doaWxydGR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1MTE2NjMsImV4cCI6MjA5NzA4NzY2M30.U8JClv06YsNAwq9qsPb3lQ4SIPeRPjKMzsYxVfcmujw';
const H = { 'apikey': SUPA_KEY, 'Authorization': 'Bearer ' + SUPA_KEY, 'Content-Type': 'application/json' };
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0 Safari/537.36';

async function db(method, path, body) {
  const opts = { method, headers: { ...H } };
  if (method === 'POST') opts.headers['Prefer'] = 'resolution=merge-duplicates,return=minimal';
  if (method === 'PATCH') opts.headers['Prefer'] = 'return=minimal';
  if (body) opts.body = JSON.stringify(body);
  const r = await fetch(`${SUPA_URL}/rest/v1/${path}`, opts);
  if (!r.ok) throw new Error(`DB ${r.status}`);
  return method === 'GET' ? r.json() : null;
}

async function fetchPage(url, timeout = 14000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeout);
  try {
    const r = await fetch(url, {
      headers: { 'User-Agent': UA, 'Accept': 'text/html,application/xhtml+xml', 'Accept-Language': 'en-US,en;q=0.9' },
      signal: ctrl.signal, redirect: 'follow',
    });
    clearTimeout(t);
    return r.ok ? r.text() : null;
  } catch { clearTimeout(t); return null; }
}

const clean = s => (s || '').replace(/&amp;/g,'&').replace(/&#\d+;/g,'').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();
const decHtml = s => (s||'').replace(/&amp;/g,'&').replace(/&nbsp;/g,' ').replace(/&#160;/g,' ').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"');

// Robust KE date parser — handles "SAT 11 JUL 2026 12:00 PM"
const MO = {JAN:0,FEB:1,MAR:2,APR:3,MAY:4,JUN:5,JUL:6,AUG:7,SEP:8,OCT:9,NOV:10,DEC:11};
function parseDate(s) {
  if (!s) return null;
  // "SAT 11 JUL 2026 12:00 PM" or "11 JUL 2026"
  const m = s.match(/(\d{1,2})\s+([A-Z]{3})\s+(\d{4})(?:\s+(\d{1,2}):(\d{2})\s*(AM|PM))?/i);
  if (!m) {
    // Try ISO / standard format
    try { const d = new Date(s); return isNaN(d) ? null : d.toISOString(); } catch { return null; }
  }
  const [,day, mon, yr, hr, min, ap] = m;
  const month = MO[mon.toUpperCase()];
  if (month === undefined) return null;
  let h = parseInt(hr || '0');
  if (ap) { if (ap.toUpperCase() === 'PM' && h !== 12) h += 12; if (ap.toUpperCase() === 'AM' && h === 12) h = 0; }
  return new Date(Date.UTC(parseInt(yr), month, parseInt(day), h, parseInt(min || '0'))).toISOString();
}

function dedup(rows) {
  const s = new Set();
  return rows.filter(r => s.has(r.dedupe_key) ? false : (s.add(r.dedupe_key), true));
}

function inferCategory(t = '', extra = '') {
  const s = (t + ' ' + extra).toLowerCase();
  if (/concert|music|live|afro|gengetone|dj|festival|album|gig|band|orchestra|beats|rave/.test(s)) return 'music';
  if (/run|marathon|race|football|rugby|golf|cycling|fitness|trail|sport|gym|match/.test(s)) return 'sports';
  if (/comedy|stand.?up|laugh|open mic/.test(s)) return 'comedy';
  if (/art|paint|photography|gallery|fashion|design|creative|sketch|draw/.test(s)) return 'art';
  if (/food|drink|wine|cocktail|brunch|dining|chef|cook|culinary|tasting|eat/.test(s)) return 'food';
  if (/summit|conference|expo|invest|startup|tech|innovation|network|business/.test(s)) return 'business';
  if (/workshop|training|class|learn|seminar|webinar|education/.test(s)) return 'workshop';
  if (/church|prayer|worship|spiritual|gospel|faith/.test(s)) return 'spirituality';
  if (/kids|children|family|teen|school|camp/.test(s)) return 'family';
  return 'general';
}

/* ──────────────────────────────────────────────────────────────
   TICKETSASA — PHP server-rendered, clean HTML structure
────────────────────────────────────────────────────────────── */
function parseTicketsasa(html) {
  if (!html) return [];
  const events = [];
  const seen = new Set();

  // Each event card is wrapped in an <a href="/events/SLUG"> tag
  // We split the HTML on /events/ hrefs and process each block
  const parts = html.split(/(?=<a[^>]+href="\/events\/[a-z0-9\-]+")/i);

  for (const part of parts) {
    const slugM = part.match(/href="(\/events\/([a-z0-9\-]+))"/i);
    if (!slugM) continue;
    const slug = slugM[1];
    const name = slugM[2];
    // Skip navigation/category links
    if (['listing', 'category', 'events'].some(x => name.includes(x))) continue;
    if (seen.has(slug)) continue;
    seen.add(slug);

    const url = 'https://www.ticketsasa.com' + slug;

    // Title: from <h6> or title attribute or data-title
    const titleM = part.match(/title="([^"]{5,150})"/) ||
                   part.match(/<h6[^>]*>\s*<a[^>]*>([^<]{5,150})<\/a>/) ||
                   part.match(/<h6[^>]*>([^<]{5,150})<\/h6>/);
    const rawTitle = titleM ? decHtml(titleM[1]).trim() : null;
    if (!rawTitle || rawTitle.length < 4) continue;
    const title = rawTitle;

    // Date: "SUN 05 JUL 2026 09:00 AM" — appears as text in the card
    const dateM = part.match(/([A-Z]{3}\s+\d{1,2}\s+[A-Z]{3}\s+\d{4}(?:\s+\d{1,2}:\d{2}\s*(?:AM|PM))?)/);
    const startDate = dateM ? parseDate(dateM[1]) : null;

    // Price: "Starting KES&nbsp;2,000" or "Starting KES 500" or "FREE"
    const isFree = /\bFREE\b/i.test(part);
    const priceM = part.match(/Starting\s+KES(?:&nbsp;|\s|&#160;)+([\d,]+)/i) ||
                   part.match(/KES(?:&nbsp;|\s|&#160;)+([\d,]+)/i);
    const price = priceM ? parseFloat(priceM[1].replace(/,/g, '')) : (isFree ? 0 : null);

    // Venue: truncated text after title (contains "...Nairobi..." or venue name)
    const venueM = part.match(/(?:h6|\/a>)[^<]{0,20}([A-Z][^<]{6,100}(?:Nairobi|Kenya|Stadium|Centre|Center|Arena|Park|Hotel|Club|Garden|Restaurant|Mall|Grounds|Hall|Museum|Church|KICC)[^<]{0,60})/i);
    const venue = venueM ? clean(venueM[1]).slice(0, 150) : 'Nairobi, Kenya';

    // Image: upgrade quality from q_10 to q_80
    const imgM = part.match(/src="(https:\/\/[^"]+ticketsasa[^"]+\.(?:jpg|jpeg|png|webp|svg)(?:\?[^"]*)?)"/) ||
                 part.match(/src="(\/_ipx[^"]+)"/);
    let image = imgM ? (imgM[1].startsWith('/') ? 'https://www.ticketsasa.com' + imgM[1] : imgM[1]) : null;
    if (image) image = image.replace('q_10&', 'q_80&').replace('q_10,', 'q_80,');

    events.push({
      dedupe_key: 'ts-' + title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 180),
      title: title.slice(0, 200), description: null,
      venue: venue.slice(0, 150), city: 'Nairobi',
      start_date: startDate, end_date: null,
      price_from: price, currency: 'KES',
      image_url: image, event_url: url,
      source_url: 'https://www.ticketsasa.com/events',
      category: inferCategory(title), active: true,
      scraped_at: new Date().toISOString(),
    });
    if (events.length >= 40) break;
  }
  return dedup(events);
}

/* ──────────────────────────────────────────────────────────────
   TIPSITICKETS — Next.js SSR, images at media.tipsitickets.com
────────────────────────────────────────────────────────────── */
function parseTipsi(html) {
  if (!html) return [];
  const events = [];

  // Strategy 1: __NEXT_DATA__ 
  const ndM = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (ndM) {
    try {
      const nd = JSON.parse(ndM[1]);
      const props = nd?.props?.pageProps;
      const list = props?.events || props?.allEvents || props?.upcomingEvents || [];
      if (Array.isArray(list) && list.length) {
        list.forEach(e => {
          const title = e.name || e.title;
          if (!title) return;
          const slug = e.slug || e.eventSlug || '';
          const uuid = e.id || e.eventId || '';
          const url = `https://www.tipsitickets.com/event/${slug}${uuid ? '?eventId=' + uuid : ''}`;
          let img = e.bannerUrl || e.imageUrl || e.coverImage || e.banner || null;
          if (img && !img.startsWith('http')) img = `https://media.tipsitickets.com/event_banners/variants/${img}`;
          const price = e.minPrice || e.ticketPrice || e.price || e.tickets?.[0]?.price || null;
          events.push({
            dedupe_key: 'ti-' + title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 180),
            title: title.slice(0, 200),
            description: ((e.description || '').replace(/<[^>]+>/g,' ').trim()).slice(0, 500),
            venue: ((e.venue?.name || e.location || e.venueName || 'Kenya')).slice(0, 150),
            city: e.city || 'Nairobi',
            start_date: e.startDate || e.date ? new Date(e.startDate || e.date).toISOString() : null,
            end_date: e.endDate ? new Date(e.endDate).toISOString() : null,
            price_from: price ? parseFloat(price) : null, currency: 'KES',
            image_url: img, event_url: url,
            source_url: 'https://www.tipsitickets.com',
            category: inferCategory(title, e.category || ''), active: true,
            scraped_at: new Date().toISOString(),
          });
        });
        if (events.length) return dedup(events);
      }
    } catch {}
  }

  // Strategy 2: HTML parsing — match media.tipsitickets.com images
  // The key insight: Tipsitickets always loads images from media.tipsitickets.com
  // They appear as: src=".../_next/image?url=https%3A%2F%2Fmedia.tipsitickets.com%2F...&w=3840&q=72"
  // OR directly: src="https://media.tipsitickets.com/event_banners/variants/NAME.webp"
  
  const imgRe = /(?:src|data-src)="((?:https:\/\/(?:media\.tipsitickets\.com|www\.tipsitickets\.com\/_next\/image)[^"]+|[^"]+media\.tipsitickets[^"]+))"/gi;
  let m;
  const seenTitles = new Set();

  while ((m = imgRe.exec(html)) !== null) {
    let img = m[1];
    
    // Decode Next.js image proxy
    if (img.includes('_next/image?url=')) {
      const dec = img.match(/url=([^&]+)/);
      if (dec) img = decodeURIComponent(dec[1]);
    }

    // Only care about event banner images
    if (!img.includes('event_banners')) continue;

    // Get context after this image tag
    const ctx = html.slice(m.index, m.index + 3000);

    // Alt text = event title (usually)
    const altM = ctx.match(/alt="([^"]{3,150})"/);
    const altTitle = altM ? decHtml(altM[1]).trim() : null;

    // h2 / h3 title nearby
    const titleM = ctx.match(/<h[23][^>]*>([^<]{4,180})<\/h[23]>/i);
    const title = titleM ? clean(titleM[1]) : altTitle;
    if (!title || title.length < 4) continue;
    if (seenTitles.has(title.toLowerCase())) continue;
    seenTitles.add(title.toLowerCase());

    // Date: "Saturday, 4 July 2026" or "4.00 pm" style date blocks
    const dateM = ctx.match(/([A-Z][a-z]+,\s+\d{1,2}\s+[A-Z][a-z]+\s+\d{4})/);
    let startDate = null;
    if (dateM) { try { startDate = new Date(dateM[1]).toISOString(); } catch {} }

    // Venue
    const venueM = ctx.match(/([A-Z][^<\n]{8,120}(?:Nairobi|Kenya|Stadium|Centre|Center|Arena|Park|Hotel|Club|Restaurant|Garden|Ground|Mall|Hall)[^<\n]{0,80})/i);
    const venue = venueM ? venueM[1].trim().slice(0, 150) : 'Kenya';

    // Price "Starting from KES 2,750"
    const priceM = ctx.match(/Starting\s+from\s*KES\s*([\d,]+)/i) || ctx.match(/KES\s*([\d,]+)/i);
    const price = priceM ? parseFloat(priceM[1].replace(/,/g,'')) : null;

    // URL
    const urlM = ctx.match(/href="(\/event\/[^"]+)"/i);
    const url = urlM ? 'https://www.tipsitickets.com' + urlM[1] : 'https://www.tipsitickets.com';

    events.push({
      dedupe_key: 'ti-' + title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 180),
      title: title.slice(0, 200), description: null,
      venue: venue.slice(0, 150), city: 'Nairobi',
      start_date: startDate, end_date: null,
      price_from: price, currency: 'KES',
      image_url: img, event_url: url,
      source_url: 'https://www.tipsitickets.com',
      category: inferCategory(title), active: true,
      scraped_at: new Date().toISOString(),
    });
    if (events.length >= 30) break;
  }
  return dedup(events);
}

/* ──────────────────────────────────────────────────────────────
   EVENTBRITE — JSON-LD, proven working
────────────────────────────────────────────────────────────── */
const EV_TYPES = new Set(['Event','MusicEvent','TheaterEvent','Festival','ComedyEvent',
  'SportsEvent','DanceEvent','ExhibitionEvent','FoodEvent','ScreeningEvent',
  'SocialEvent','BusinessEvent','EducationEvent','ChildrensEvent']);

function collectEvents(node, out) {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) { node.forEach(n => collectEvents(n, out)); return; }
  if ([].concat(node['@type'] || []).some(x => EV_TYPES.has(x))) out.push(node);
  if (node['@graph']) collectEvents(node['@graph'], out);
  if (node.itemListElement) [].concat(node.itemListElement).forEach(i => collectEvents(i.item || i, out));
}
const fs = v => !v ? null : typeof v === 'string' ? v : Array.isArray(v) ? fs(v[0]) : v.url || v['@id'] || v.name || null;

function parseEventbrite(html) {
  if (!html) return [];
  const blocks = [];
  const re = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html)) !== null) { try { blocks.push(JSON.parse(m[1].trim())); } catch {} }
  const found = [];
  blocks.forEach(b => collectEvents(b, found));
  const seen = new Set();
  return found.map(e => {
    const title = fs(e.name); const start = e.startDate;
    if (!title || !start) return null;
    const dk = (title.toLowerCase() + '|' + String(start).slice(0,10)).slice(0,300);
    if (seen.has(dk)) return null; seen.add(dk);
    const loc = Array.isArray(e.location) ? e.location[0] : e.location;
    let venue = null, city = null;
    if (loc) { venue = typeof loc === 'string' ? loc : fs(loc.name); const a = loc.address; if (a) city = typeof a === 'string' ? a : a.addressLocality || a.addressRegion || null; }
    const offers = [].concat(e.offers || []);
    let price = null, cur = 'KES';
    for (const o of offers) { if (!o) continue; const p = parseFloat(o.lowPrice ?? o.price); if (!isNaN(p) && (price === null || p < price)) { price = p; if (o.priceCurrency) cur = o.priceCurrency; } }
    return { dedupe_key: dk, title: title.slice(0,200),
      description: typeof e.description === 'string' ? e.description.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim().slice(0,500) : null,
      venue: venue ? String(venue).slice(0,150) : null, city: city ? String(city).slice(0,80) : null,
      start_date: start, end_date: e.endDate || null, price_from: price, currency: cur,
      image_url: fs(e.image), event_url: fs(e.url) || null,
      source_url: 'https://www.eventbrite.com', category: inferCategory(title), active: true,
      scraped_at: new Date().toISOString() };
  }).filter(Boolean);
}

/* ──────────────────────────────────────────────────────────────
   HANDLER
────────────────────────────────────────────────────────────── */
export default async function handler(req, res) {
  try {
    const [tsHtml, tipsiHtml, ebHtml] = await Promise.all([
      fetchPage('https://www.ticketsasa.com/events'),
      fetchPage('https://www.tipsitickets.com/'),
      fetchPage('https://www.eventbrite.com/d/kenya--nairobi/events/'),
    ]);

    const tsEvents    = parseTicketsasa(tsHtml);
    const tipsiEvents = parseTipsi(tipsiHtml);
    const ebEvents    = parseEventbrite(ebHtml);
    const all         = dedup([...tsEvents, ...tipsiEvents, ...ebEvents]);

    if (all.length) {
      for (let i = 0; i < all.length; i += 50)
        await db('POST', 'scraped_events?on_conflict=dedupe_key', all.slice(i, i + 50));
    }

    // Expire past events
    await db('PATCH',
      `scraped_events?end_date=lt.${new Date(Date.now()-86400000).toISOString()}&active=eq.true`,
      { active: false }
    ).catch(() => {});

    const now = new Date().toISOString();
    for (const [label, count] of [
      ['Ticketsasa', tsEvents.length],
      ['Tipsi Tickets', tipsiEvents.length],
      ['Eventbrite Nairobi', ebEvents.length],
    ]) {
      await db('PATCH', `scrape_sources?label=eq.${encodeURIComponent(label)}`,
        { last_run: now, last_status: count > 0 ? 'ok' : 'no_events', events_found: count }
      ).catch(() => {});
    }

    res.status(200).json({ ok: true, ran: now, summary: [
      { source: 'Ticketsasa',   found: tsEvents.length },
      { source: 'Tipsitickets', found: tipsiEvents.length },
      { source: 'Eventbrite',   found: ebEvents.length },
      { total_upserted: all.length },
    ]});
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
}
