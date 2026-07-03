/* ═══════════════════════════════════════════════════════════════
   APATMENTO EVENT INGESTION v3
   Custom parsers for:
     • Ticketsasa (PHP/Laravel — clean server-rendered HTML)
     • Tipsitickets (Next.js SSR — images, prices, categories all in HTML)
     • Eventbrite Nairobi (JSON-LD — original source, still best structured)
   Runs daily 3am UTC via Vercel Cron.
   Manual trigger: GET /api/scrape-events
═══════════════════════════════════════════════════════════════ */

const SUPA_URL = 'https://gfwgbgdvxtocwhilrtdw.supabase.co';
const SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdmd2diZ2R2eHRvY3doaWxydGR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1MTE2NjMsImV4cCI6MjA5NzA4NzY2M30.U8JClv06YsNAwq9qsPb3lQ4SIPeRPjKMzsYxVfcmujw';

const H = { 'apikey': SUPA_KEY, 'Authorization': 'Bearer ' + SUPA_KEY, 'Content-Type': 'application/json' };

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0 Safari/537.36';

/* ─── Supabase helper ─── */
async function db(method, path, body) {
  const opts = { method, headers: { ...H } };
  if (method === 'POST') opts.headers['Prefer'] = 'resolution=merge-duplicates,return=minimal';
  if (method === 'PATCH') opts.headers['Prefer'] = 'return=minimal';
  if (body) opts.body = JSON.stringify(body);
  const r = await fetch(`${SUPA_URL}/rest/v1/${path}`, opts);
  if (!r.ok) throw new Error(`DB ${r.status}: ${await r.text().catch(() => '')}`);
  return method === 'GET' ? r.json() : null;
}

/* ─── Fetch with timeout ─── */
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

/* ─── Shared utilities ─── */
const clean = s => (s || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

function dedupe(rows) {
  const s = new Set();
  return rows.filter(r => s.has(r.dedupe_key) ? false : (s.add(r.dedupe_key), true));
}

function inferCategory(title, tags = '') {
  const t = (title + ' ' + tags).toLowerCase();
  if (/concert|music|live|afro|gengetone|dj set|festival|album|gig|band|orchestra/.test(t)) return 'music';
  if (/run|marathon|race|match|league|football|rugby|golf|cycling|fitness|trail|sport/.test(t)) return 'sports';
  if (/comedy|stand.?up|laugh|open mic/.test(t)) return 'comedy';
  if (/art|paint|photography|gallery|exhibition|fashion|design|creative/.test(t)) return 'art';
  if (/food|drink|wine|cocktail|brunch|dine|dining|chef|cook|taste|culinary|festival.*food/.test(t)) return 'food';
  if (/summit|conference|expo|business|invest|startup|tech|innovation|network/.test(t)) return 'business';
  if (/workshop|training|class|learn|education|seminar|webinar/.test(t)) return 'workshop';
  if (/church|prayer|worship|spiritual|gospel|faith/.test(t)) return 'spirituality';
  if (/kids|children|family|teen|school|camp/.test(t)) return 'family';
  return 'general';
}

/* ══════════════════════════════════════════════════════════════
   PARSER 1 — TICKETSASA
   Structure: [/events/SLUG](URL)\nDATE TIME\n###### [TITLE](url "full")VENUE\nKES PRICE
═══════════════════════════════════════════════════════════════*/
function parseTicketsasa(html) {
  if (!html) return [];
  const events = [];

  // Match event cards: link to /events/ → date → heading with title → price
  // Pattern as it appears in raw HTML: <a href="/events/SLUG">...<time>...<h6>TITLE</h6>...venue...price
  
  // Extract event cards via URL slug + title h6 pairs in the HTML
  // Ticketsasa: <a href="/events/[slug]"> wrapping the card
  const cardRe = /href="(\/events\/[a-z0-9\-]+)"[\s\S]{0,50}?>[\s\S]{0,3000}?<\/a>/gi;
  let m;
  const seen = new Set();
  
  while ((m = cardRe.exec(html)) !== null) {
    const slug = m[1];
    if (seen.has(slug) || slug === '/events' || slug.includes('category') || slug.includes('listing')) continue;
    seen.add(slug);
    
    const card = m[0];
    const fullUrl = 'https://www.ticketsasa.com' + slug;

    // Title: inside h6 or strong — truncate if '...' appears  
    const titleM = card.match(/<h6[^>]*>([^<]{4,120})<\/h6>/i) ||
                   card.match(/title="([^"]{5,150})"/) ||
                   card.match(/>([A-Z][^<]{8,120})</);
    const rawTitle = titleM ? titleM[1].trim() : null;
    if (!rawTitle) continue;
    const title = rawTitle.replace(/\.\.\.$/, '').trim();
    if (title.length < 5) continue;

    // Date: matches "SAT 11 JUL 2026 12:00 PM" pattern
    const dateM = card.match(/([A-Z]{3}\s+\d{1,2}\s+[A-Z]{3}\s+\d{4}(?:\s+\d{1,2}:\d{2}\s*(?:AM|PM))?)/);
    let startDate = null;
    if (dateM) {
      try { startDate = new Date(dateM[1].replace(/\s+/g, ' ')).toISOString(); } catch {}
      if (!startDate || startDate === 'Invalid Date') startDate = null;
    }

    // Venue: text after title, before price
    const venueM = card.match(/<\/h6>[\s\S]{0,20}?([A-Z][^<]{8,80}(?:Nairobi|Kenya|Stadium|Centre|Arena|Park|Hotel|Club|Garden)[^<]{0,40})/i);
    const venue = venueM ? clean(venueM[1]).slice(0, 150) : 'Kenya';

    // Price
    const priceM = card.match(/Starting\s+KES\s+([\d,]+)/i);
    const price = priceM ? parseFloat(priceM[1].replace(/,/g, '')) : null;
    const isFree = /\bFREE\b/i.test(card);

    // Image: Ticketsasa doesn't always show images in listing cards
    // Individual event pages have og:image — we'll use null here and let the event page image load
    // (scraping individual pages would be 50+ requests, too slow for serverless)
    const imgM = card.match(/src="(https:\/\/[^"]+(?:ticketsasa|pesapal)[^"]+\.(?:jpg|jpeg|png|webp|svg))"/) ||
                 card.match(/src="(\/[^"]+\.(?:jpg|jpeg|png|webp))"/);
    const image = imgM ? (imgM[1].startsWith('http') ? imgM[1] : 'https://www.ticketsasa.com' + imgM[1]) : null;

    const dedupe_key = ('ts-' + title.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').slice(0, 180));
    events.push({
      dedupe_key,
      title: title.slice(0, 200),
      description: null,
      venue: venue.slice(0, 150),
      city: 'Nairobi',
      start_date: startDate,
      end_date: null,
      price_from: isFree ? 0 : price,
      currency: 'KES',
      image_url: image,
      event_url: fullUrl,
      source_url: 'https://www.ticketsasa.com/events',
      category: inferCategory(title),
      active: true,
      scraped_at: new Date().toISOString(),
    });
    if (events.length >= 40) break;
  }

  // Fallback: simpler link+title extraction if card regex missed events
  if (events.length < 5) {
    const linkRe = /<a[^>]+href="(\/events\/([a-z0-9\-]+))"[^>]*>\s*[\s\S]{0,200}?<h6[^>]*>([^<]{5,120})<\/h6>/gi;
    while ((m = linkRe.exec(html)) !== null) {
      const slug = m[1];
      const title = m[3].trim();
      if (seen.has(slug) || !title) continue;
      seen.add(slug);
      const slice = html.slice(m.index, m.index + 600);
      const priceM = slice.match(/KES\s*([\d,]+)/i);
      events.push({
        dedupe_key: 'ts-' + title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 180),
        title: title.slice(0, 200), description: null,
        venue: 'Nairobi, Kenya', city: 'Nairobi',
        start_date: null, end_date: null,
        price_from: priceM ? parseFloat(priceM[1].replace(/,/g,'')) : null,
        currency: 'KES', image_url: null,
        event_url: 'https://www.ticketsasa.com' + slug,
        source_url: 'https://www.ticketsasa.com/events',
        category: inferCategory(title), active: true,
        scraped_at: new Date().toISOString(),
      });
    }
  }

  return dedupe(events);
}

/* ══════════════════════════════════════════════════════════════
   PARSER 2 — TIPSITICKETS
   Next.js SSR — full data in HTML: images, titles, venues, prices
   Image: https://media.tipsitickets.com/event_banners/variants/NAME.webp
   Event URL: https://www.tipsitickets.com/event/SLUG?eventId=UUID
   Price: "Starting from KES X,XXX"
   Date: "Saturday, 4 July 2026"
═══════════════════════════════════════════════════════════════*/
function parseTipsi(html) {
  if (!html) return [];
  const events = [];

  // Strategy 1: __NEXT_DATA__ (Tipsitickets uses Next.js)
  const nextM = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (nextM) {
    try {
      const nd = JSON.parse(nextM[1]);
      const props = nd?.props?.pageProps;
      // Tipsitickets stores events in various keys
      const eventsList = props?.events || props?.data?.events || props?.allEvents || 
                        props?.upcomingEvents || props?.featuredEvents || [];
      
      if (Array.isArray(eventsList) && eventsList.length) {
        eventsList.forEach(e => {
          const title = e.name || e.title;
          if (!title) return;
          const slug = e.slug || e.eventSlug;
          const uuid = e.id || e.eventId;
          const url = `https://www.tipsitickets.com/event/${slug}${uuid ? '?eventId='+uuid : ''}`;
          const image = e.bannerUrl || e.imageUrl || e.coverImage || 
                       (e.banner ? `https://media.tipsitickets.com/event_banners/variants/${e.banner}` : null);
          const price = e.ticketPrice || e.minPrice || e.price || (e.tickets?.[0]?.price);
          const venue = e.venue?.name || e.location || e.venueName;
          const startDate = e.startDate || e.date || e.startDateTime;
          
          events.push({
            dedupe_key: 'ti-' + title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 180),
            title: title.slice(0, 200),
            description: (e.description || '').replace(/<[^>]+>/g, ' ').slice(0, 500),
            venue: (venue || 'Kenya').slice(0, 150),
            city: e.city || 'Nairobi',
            start_date: startDate ? new Date(startDate).toISOString() : null,
            end_date: e.endDate ? new Date(e.endDate).toISOString() : null,
            price_from: price ? parseFloat(price) : null,
            currency: 'KES',
            image_url: image,
            event_url: url,
            source_url: 'https://www.tipsitickets.com',
            category: inferCategory(title, e.category),
            active: true,
            scraped_at: new Date().toISOString(),
          });
        });
        if (events.length > 0) return dedupe(events);
      }
    } catch {}
  }

  // Strategy 2: HTML parsing — Tipsitickets renders full cards server-side
  // Pattern: <img alt="TITLE" src="https://media.tipsitickets.com/...">
  //          <h2 class="...">TITLE</h2>
  //          DATE, VENUE, "Starting from KES X,XXX"
  const imgRe = /src="(https:\/\/(?:media\.tipsitickets\.com|www\.tipsitickets\.com\/_next\/image)[^"]+\.(?:webp|jpg|jpeg|png)(?:[^"]*)?)"[^>]*alt="([^"]{3,150})"/gi;
  let m;
  const seen = new Set();

  while ((m = imgRe.exec(html)) !== null) {
    let img = m[1];
    const altTitle = m[2].trim();
    if (!altTitle || seen.has(altTitle.toLowerCase())) continue;
    
    // Upgrade Next.js image proxy URL to direct media URL
    if (img.includes('_next/image?url=')) {
      const urlM = img.match(/url=([^&]+)/);
      if (urlM) img = decodeURIComponent(urlM[1]);
    }

    seen.add(altTitle.toLowerCase());
    const slice = html.slice(m.index, m.index + 2000);

    // Title from h2/h3 near image
    const titleM = slice.match(/<h[23][^>]*>([^<]{4,150})<\/h[23]>/i);
    const title = titleM ? clean(titleM[1]) : altTitle;
    if (!title || title.length < 4) continue;

    // Date: "Saturday, 4 July 2026" or "Mon\n04\nJul"
    const dateM = slice.match(/([A-Z][a-z]+,\s+\d{1,2}\s+[A-Z][a-z]+\s+\d{4})/) ||
                  slice.match(/(\d{1,2}\.\d{2}\s*(?:am|pm)[\s\S]{0,30}([A-Z][a-z]+,\s+\d{1,2}\s+[A-Z][a-z]+\s+\d{4}))/);
    let startDate = null;
    if (dateM) {
      try { startDate = new Date(dateM[1] || dateM[2]).toISOString(); } catch {}
      if (startDate === 'Invalid Date') startDate = null;
    }

    // Venue
    const venueM = slice.match(/([A-Z][^<\n]{8,100}(?:Nairobi|Kenya|Stadium|Centre|Arena|Park|Hotel|Club|Restaurant|Ground|Mall)[^<\n]{0,60})/i);
    const venue = venueM ? venueM[1].trim().slice(0, 150) : 'Nairobi, Kenya';

    // Price
    const priceM = slice.match(/Starting\s+from\s*KES\s*([\d,]+)/i) ||
                   slice.match(/KES\s*([\d,]+)/i);
    const price = priceM ? parseFloat(priceM[1].replace(/,/g, '')) : null;

    // Event URL
    const urlM = slice.match(/href="(\/event\/[^"?]+(?:\?eventId=[^"]+)?)"/i);
    const eventUrl = urlM ? 'https://www.tipsitickets.com' + urlM[1] : 'https://www.tipsitickets.com';

    events.push({
      dedupe_key: 'ti-' + title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 180),
      title: title.slice(0, 200),
      description: null,
      venue: venue.slice(0, 150),
      city: 'Nairobi',
      start_date: startDate,
      end_date: null,
      price_from: price,
      currency: 'KES',
      image_url: img,
      event_url: eventUrl,
      source_url: 'https://www.tipsitickets.com',
      category: inferCategory(title),
      active: true,
      scraped_at: new Date().toISOString(),
    });
    if (events.length >= 30) break;
  }

  return dedupe(events);
}

/* ══════════════════════════════════════════════════════════════
   PARSER 3 — EVENTBRITE (JSON-LD — existing, reliable)
═══════════════════════════════════════════════════════════════*/
function extractJsonLd(html) {
  const blocks = [];
  const re = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    try { blocks.push(JSON.parse(m[1].replace(/<!--[\s\S]*?-->/g, '').trim())); } catch {}
  }
  return blocks;
}

const EV_TYPES = new Set(['Event','MusicEvent','TheaterEvent','Festival','ComedyEvent',
  'SportsEvent','DanceEvent','ExhibitionEvent','FoodEvent','ScreeningEvent',
  'SocialEvent','BusinessEvent','EducationEvent','ChildrensEvent']);

function collectEvents(node, out) {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) { node.forEach(n => collectEvents(n, out)); return; }
  const t = node['@type'];
  if ([].concat(t || []).some(x => EV_TYPES.has(x))) out.push(node);
  if (node['@graph']) collectEvents(node['@graph'], out);
}

function firstStr(v) {
  if (!v) return null;
  if (typeof v === 'string') return v;
  if (Array.isArray(v)) return firstStr(v[0]);
  if (typeof v === 'object') return v.url || v['@id'] || v.name || null;
  return null;
}

function parseEventbrite(html) {
  if (!html) return [];
  const blocks = extractJsonLd(html);
  const found = [];
  blocks.forEach(b => collectEvents(b, found));

  const rows = found.map(e => {
    const title = firstStr(e.name);
    const startDate = e.startDate || null;
    if (!title || !startDate) return null;

    let venue = null, city = null;
    const loc = Array.isArray(e.location) ? e.location[0] : e.location;
    if (loc) {
      venue = typeof loc === 'string' ? loc : firstStr(loc.name);
      const addr = loc.address;
      if (addr) city = typeof addr === 'string' ? addr : (addr.addressLocality || addr.addressRegion || null);
    }

    const offers = [].concat(e.offers || []);
    let price = null, currency = 'KES';
    for (const o of offers) {
      if (!o) continue;
      const p = parseFloat(o.lowPrice ?? o.price);
      if (!isNaN(p) && (price === null || p < price)) { price = p; if (o.priceCurrency) currency = o.priceCurrency; }
    }

    const dedupe_key = (title.toLowerCase().trim() + '|' + String(startDate).slice(0, 10)).slice(0, 300);
    return {
      dedupe_key, title: title.slice(0, 200),
      description: typeof e.description === 'string' ? e.description.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim().slice(0,500) : null,
      venue: venue ? String(venue).slice(0, 150) : null,
      city: city ? String(city).slice(0, 80) : null,
      start_date: startDate, end_date: e.endDate || null,
      price_from: price, currency,
      image_url: firstStr(e.image),
      event_url: firstStr(e.url) || 'https://www.eventbrite.com',
      source_url: 'https://www.eventbrite.com',
      category: inferCategory(title),
      active: true, scraped_at: new Date().toISOString(),
    };
  }).filter(Boolean);

  const s = new Set();
  return rows.filter(r => s.has(r.dedupe_key) ? false : (s.add(r.dedupe_key), true));
}

/* ══════════════════════════════════════════════════════════════
   MAIN HANDLER
═══════════════════════════════════════════════════════════════*/
export default async function handler(req, res) {
  try {
    // Parallel fetch all sources
    const [tsHtml, tipsiHtml, ebHtml] = await Promise.all([
      fetchPage('https://www.ticketsasa.com/events'),
      fetchPage('https://www.tipsitickets.com/'),
      fetchPage('https://www.eventbrite.com/d/kenya--nairobi/events/'),
    ]);

    const tsEvents    = parseTicketsasa(tsHtml);
    const tipsiEvents = parseTipsi(tipsiHtml);
    const ebEvents    = parseEventbrite(ebHtml);

    const all = dedupe([...tsEvents, ...tipsiEvents, ...ebEvents]);

    // Upsert in batches
    for (let i = 0; i < all.length; i += 50) {
      await db('POST', 'scraped_events?on_conflict=dedupe_key', all.slice(i, i + 50));
    }

    // Auto-expire past events
    await db('PATCH',
      `scraped_events?end_date=lt.${new Date(Date.now()-86400000).toISOString()}&active=eq.true`,
      { active: false }
    ).catch(() => {});

    // Update source records
    const now = new Date().toISOString();
    const updates = [
      ['Ticketsasa',    tsEvents.length,    'https://www.ticketsasa.com/events'],
      ['Tipsi Tickets', tipsiEvents.length, 'https://www.tipsitickets.com/'],
      ['Eventbrite Nairobi', ebEvents.length, 'https://www.eventbrite.com/d/kenya--nairobi/events/'],
    ];
    for (const [label, count] of updates) {
      await db('PATCH', `scrape_sources?label=eq.${encodeURIComponent(label)}`, {
        last_run: now,
        last_status: count > 0 ? 'ok' : 'no_events',
        events_found: count,
      }).catch(() => {});
    }

    res.status(200).json({
      ok: true, ran: now,
      summary: [
        { source: 'Ticketsasa',    found: tsEvents.length },
        { source: 'Tipsitickets',  found: tipsiEvents.length },
        { source: 'Eventbrite',    found: ebEvents.length },
        { total_upserted: all.length },
      ],
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
}
