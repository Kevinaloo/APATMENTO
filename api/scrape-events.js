/* ═══════════════════════════════════════════════════════════════════
   APATMENTO EVENT INGESTION v5  ·  The Definitive Build
   Sources:
     ① NairobiEventsGuide (WP aggregator — 50+ events, images, prices)
     ② Tipsitickets (Next.js SSR — real KES prices, CDN images)
     ③ Ticketsasa (PHP — curated KES events)
     ④ Eventbrite Nairobi (JSON-LD — broad coverage)
   Cron: daily 3am UTC  ·  Manual: GET /api/scrape-events
═══════════════════════════════════════════════════════════════════ */
import { Buffer } from 'node:buffer';

const SUPA_URL = 'https://gfwgbgdvxtocwhilrtdw.supabase.co';
const SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdmd2diZ2R2eHRvY3doaWxydGR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1MTE2NjMsImV4cCI6MjA5NzA4NzY2M30.U8JClv06YsNAwq9qsPb3lQ4SIPeRPjKMzsYxVfcmujw';
const H = { 'apikey': SUPA_KEY, 'Authorization': 'Bearer ' + SUPA_KEY, 'Content-Type': 'application/json' };
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0 Safari/537.36';

/* ── DB helper ── */
async function db(method, path, body) {
  const opts = { method, headers: { ...H } };
  if (method === 'POST') opts.headers['Prefer'] = 'resolution=merge-duplicates,return=minimal';
  if (method === 'PATCH') opts.headers['Prefer'] = 'return=minimal';
  if (body) opts.body = JSON.stringify(body);
  const r = await fetch(`${SUPA_URL}/rest/v1/${path}`, opts);
  if (!r.ok) { const t = await r.text().catch(()=>''); throw new Error(`DB ${r.status}: ${t.slice(0,100)}`); }
  return method === 'GET' ? r.json() : null;
}

/* ── Fetch helper ── */
async function fetchPage(url, ms = 15000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const r = await fetch(url, {
      headers: { 'User-Agent': UA, 'Accept': 'text/html,application/xhtml+xml', 'Accept-Language': 'en-US,en;q=0.9' },
      signal: ctrl.signal, redirect: 'follow',
    });
    clearTimeout(t);
    return r.ok ? r.text() : null;
  } catch { clearTimeout(t); return null; }
}

/* ── Utilities ── */
const clean = s => (s||'').replace(/&amp;/g,'&').replace(/&#\d+;/g,' ').replace(/&[a-z]+;/g,' ').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();
const decHtml = s => (s||'').replace(/&amp;/g,'&').replace(/&nbsp;/g,' ').replace(/&#160;/g,' ').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'");

const MONTHS = {january:0,february:1,march:2,april:3,may:4,june:5,july:6,august:7,september:8,october:9,november:10,december:11};
const MO3 = {jan:0,feb:1,mar:2,apr:3,may:4,jun:5,jul:6,aug:7,sep:8,oct:9,nov:10,dec:11};

function parseDate(s) {
  if (!s) return null;
  const d = s.trim();
  // "Thu, July 2, 2026 08:00 AM" or "Thu, July 2, 2026"
  let m = d.match(/([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})(?:\s+(\d{1,2}):(\d{2})\s*(AM|PM))?/i);
  if (m) {
    const mo = MONTHS[m[1].toLowerCase()];
    if (mo === undefined) return null;
    let h = parseInt(m[4]||'0'); const mn = parseInt(m[5]||'0'); const ap = (m[6]||'').toUpperCase();
    if (ap==='PM' && h!==12) h+=12; if (ap==='AM' && h===12) h=0;
    return new Date(Date.UTC(parseInt(m[3]),mo,parseInt(m[2]),h,mn)).toISOString();
  }
  // "SAT 11 JUL 2026 12:00 PM" — Ticketsasa format
  m = d.match(/(\d{1,2})\s+([A-Z]{3})\s+(\d{4})(?:\s+(\d{1,2}):(\d{2})\s*(AM|PM))?/i);
  if (m) {
    const mo = MO3[m[2].toLowerCase()];
    if (mo === undefined) return null;
    let h = parseInt(m[4]||'0'); const mn = parseInt(m[5]||'0'); const ap = (m[6]||'').toUpperCase();
    if (ap==='PM' && h!==12) h+=12; if (ap==='AM' && h===12) h=0;
    return new Date(Date.UTC(parseInt(m[3]),mo,parseInt(m[1]),h,mn)).toISOString();
  }
  // "Saturday, 4 July 2026" — Tipsitickets format
  m = d.match(/([A-Za-z]+),?\s+(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})(?:\s+(\d{1,2}).(\d{2})\s*(am|pm))?/i);
  if (m) {
    const mo = MONTHS[m[3].toLowerCase()];
    if (mo === undefined) return null;
    let h = parseInt(m[5]||'0'); const mn = parseInt(m[6]||'0'); const ap = (m[7]||'').toLowerCase();
    if (ap==='pm' && h!==12) h+=12; if (ap==='am' && h===12) h=0;
    return new Date(Date.UTC(parseInt(m[4]),mo,parseInt(m[2]),h,mn)).toISOString();
  }
  return null;
}

function extractPrice(text) {
  const t = text||'';
  // KSh 3,500 | KES 2,000 | Ksh 500
  const m = t.match(/(?:KSh|KES|Ksh)\s*([\d,]+)/i);
  if (m) return parseFloat(m[1].replace(/,/g,''));
  if (/\bfree\b|\bfree entry\b/i.test(t)) return 0;
  return null;
}

function inferCategory(title='', extra='') {
  const s = (title+' '+extra).toLowerCase();
  if (/concert|music|live|afro|gengetone|dj\b|festival|album|gig|band|beats|rave|jam session|r&b|rnb/.test(s)) return 'music';
  if (/run|marathon|race|football|rugby|golf|cycling|fitness|trail|sport|match|tournament|gym/.test(s)) return 'sports';
  if (/comedy|stand.?up|laugh|open mic/.test(s)) return 'comedy';
  if (/art|paint|photography|gallery|fashion|design|creative|sketch|draw|exhibition/.test(s)) return 'art';
  if (/food|drink|wine|cocktail|brunch|dining|chef|cook|culinary|tasting|eat|brunch/.test(s)) return 'food';
  if (/summit|conference|expo|invest|startup|tech|innovation|network|business|digital/.test(s)) return 'business';
  if (/workshop|training|class|learn|seminar|webinar|education/.test(s)) return 'workshop';
  if (/church|prayer|worship|spiritual|gospel|faith/.test(s)) return 'spirituality';
  if (/kids|children|family|teen|school|camp|baby/.test(s)) return 'family';
  if (/film|movie|screening|cinema|documentary/.test(s)) return 'film';
  return 'general';
}

function dedup(rows) {
  const s = new Set();
  return rows.filter(r => r && s.has(r.dedupe_key) ? false : (s.add(r?.dedupe_key), !!r));
}

/* ════════════════════════════════════════════════════════════════
   PARSER 1 — NairobiEventsGuide (WordPress)
   Structure: [img](event_url) → [TITLE](event_url) → VENUE → DATE → DESC
════════════════════════════════════════════════════════════════ */
function parseNEG(html) {
  if (!html) return [];
  const events = [];
  const seen = new Set();

  // Split on each event card anchor pointing to /event/
  // Pattern: <a href="URL/event/SLUG/"><img ...title="TITLE">
  const eventUrlRe = /href="(https:\/\/nairobieventsguide\.com\/event\/[^"]+\/)"[\s\S]{0,200}?<img[^>]+(?:src|data-src)="(https:\/\/nairobieventsguide\.com\/wp-content\/uploads\/[^"]+\.(?:jpg|jpeg|png|webp)[^"]*)"/gi;
  let m;

  while ((m = eventUrlRe.exec(html)) !== null) {
    const url = m[1];
    const img = m[2];

    if (seen.has(url)) continue;
    seen.add(url);

    // Get context after this match (~3000 chars)
    const ctx = html.slice(m.index, m.index + 3500);

    // Title: next link text pointing to same URL
    const titleRe = new RegExp(`href="${url.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}"[^>]*>([^<]{3,180})<`, 'i');
    const titleM = ctx.match(titleRe);
    const title = titleM ? clean(decHtml(titleM[1])) : null;
    if (!title || title.length < 4) continue;
    if (/facebook|twitter|linkedin|whatsapp|favorite_border|share/i.test(title)) continue;

    // Date: "Thu, July 2, 2026" or "Thu, July 2, 2026 08:00 AM"
    const dateM = ctx.match(/(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun),\s+[A-Z][a-z]+\s+\d{1,2},\s+\d{4}(?:\s+\d{1,2}:\d{2}\s*(?:AM|PM))?/);
    const startDate = dateM ? parseDate(dateM[0]) : null;

    // Venue: text between title link end and date — typically 1-2 lines
    const venueM = ctx.match(/\)[\s\S]{0,30}?\n([^\n<]{5,100})\n(?=(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun),)/);
    const venue = venueM ? clean(venueM[1]).slice(0, 150) : null;

    // Description: first paragraph after date
    const descM = ctx.match(/\d{4}(?:\s+\d{1,2}:\d{2}\s*(?:AM|PM))?\n([\s\S]{20,600}?)\n\[View Details\]/);
    const description = descM ? clean(descM[1]).slice(0, 500) : null;

    // Price from description
    const price = extractPrice(description || '');

    events.push({
      dedupe_key: ('neg-' + title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 180)),
      title: title.slice(0, 200),
      description,
      venue: venue || 'Kenya',
      city: venue && /nairobi/i.test(venue) ? 'Nairobi' : 'Kenya',
      start_date: startDate,
      end_date: null,
      price_from: price,
      currency: 'KES',
      image_url: img,
      event_url: url,
      source_url: 'https://nairobieventsguide.com/upcoming-events/',
      category: inferCategory(title, description || ''),
      active: true,
      scraped_at: new Date().toISOString(),
    });

    if (events.length >= 60) break;
  }

  return dedup(events);
}

/* ════════════════════════════════════════════════════════════════
   PARSER 2 — Tipsitickets (Next.js SSR)
════════════════════════════════════════════════════════════════ */
function parseTipsi(html) {
  if (!html) return [];
  const events = [];
  const seen = new Set();

  // Strategy A: __NEXT_DATA__
  const ndM = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (ndM) {
    try {
      const nd = JSON.parse(ndM[1]);
      const pp = nd?.props?.pageProps;
      const list = pp?.events || pp?.allEvents || pp?.upcomingEvents || pp?.featuredEvents || [];
      if (Array.isArray(list) && list.length) {
        list.forEach(e => {
          const title = e.name || e.title; if (!title) return;
          const slug = e.slug || e.eventSlug || '';
          const uuid = e.id || e.eventId || '';
          const url = `https://www.tipsitickets.com/event/${slug}${uuid ? '?eventId='+uuid : ''}`;
          let img = e.bannerUrl || e.imageUrl || e.coverImage || e.banner || null;
          if (img && !img.startsWith('http')) img = `https://media.tipsitickets.com/event_banners/variants/${img}`;
          const price = e.minPrice || e.ticketPrice || e.price || e.tickets?.[0]?.price || null;
          const venue = (e.venue?.name || e.location || e.venueName || 'Kenya').slice(0,150);
          const sd = e.startDate || e.date;
          if (seen.has(title.toLowerCase())) return; seen.add(title.toLowerCase());
          events.push({
            dedupe_key: 'ti-'+title.toLowerCase().replace(/[^a-z0-9]+/g,'-').slice(0,180),
            title: title.slice(0,200),
            description: ((e.description||'').replace(/<[^>]+>/g,' ').trim()).slice(0,500),
            venue, city: e.city || 'Nairobi',
            start_date: sd ? new Date(sd).toISOString() : null,
            end_date: e.endDate ? new Date(e.endDate).toISOString() : null,
            price_from: price ? parseFloat(price) : null, currency: 'KES',
            image_url: img, event_url: url,
            source_url: 'https://www.tipsitickets.com',
            category: inferCategory(title, e.category||''), active: true,
            scraped_at: new Date().toISOString(),
          });
        });
        if (events.length) return dedup(events);
      }
    } catch {}
  }

  // Strategy B: HTML parsing — "All Events" section
  // Image pattern: Next.js proxy URL containing media.tipsitickets.com
  // followed by Category, Day abbreviation, Day number, Month
  // then ## TITLE
  // then Day, D Month Year
  // then time
  // then venue (twice — take first)
  // then "Starting fromKES X,XXX" (no space before KES)
  const allEventsIdx = html.indexOf('## All Events') > -1 ? html.indexOf('## All Events') : 0;
  const allEventsSection = html.slice(allEventsIdx);

  const imgRe = /url=([^&"]+media\.tipsitickets[^&"]+\.webp)[^"]*"/gi;
  let im;
  while ((im = imgRe.exec(allEventsSection)) !== null) {
    let img;
    try { img = decodeURIComponent(im[1]); } catch { continue; }
    if (!img.includes('event_banners')) continue;

    const ctx = allEventsSection.slice(im.index, im.index + 2500);

    // Category (Art, Music, Sports, Food, Business, Poetry, Other)
    const catM = ctx.match(/\n(Art|Music|Sports|Food|Business|Poetry|Other|Health|Tech|Comedy|Film)\n/i);
    const rawCat = catM ? catM[1] : '';

    // Title: ## heading (truncated with ...)
    const titleM = ctx.match(/## ([^\n]{4,150})/);
    let title = titleM ? clean(decHtml(titleM[1])).replace(/\.\.\.$/, '').trim() : null;
    if (!title || title.length < 4) continue;
    if (seen.has(title.toLowerCase())) continue;
    seen.add(title.toLowerCase());

    // Date: "Saturday, 4 July 2026"
    const dateM = ctx.match(/([A-Z][a-z]+,\s+\d{1,2}\s+[A-Z][a-z]+\s+\d{4})/);
    const startDate = dateM ? parseDate(dateM[1]) : null;

    // Venue: first occurrence of "VENUE, VENUE" (Tipsitickets repeats venue)
    const venueM = ctx.match(/\d{4}\n([\d.:\s]+am\s*-\s*[\d.:\s]+pm\n)?([^\n,]{5,100},[^\n]{5,100})/i);
    const venue = venueM ? clean(venueM[2].split(',')[0]).slice(0,150) : 'Kenya';

    // Price: "Starting fromKES 2,750" (no space)
    const priceM = ctx.match(/Starting\s+from\s*KES\s*([\d,]+)/i) ||
                   ctx.match(/KES\s*([\d,]+)/i);
    const price = priceM ? parseFloat(priceM[1].replace(/,/g,'')) : null;

    // URL: /event/SLUG?eventId=UUID
    const urlM = ctx.match(/href="(\/event\/[^"]+)"/i);
    const url = urlM ? 'https://www.tipsitickets.com' + urlM[1] : 'https://www.tipsitickets.com';

    events.push({
      dedupe_key: 'ti-'+title.toLowerCase().replace(/[^a-z0-9]+/g,'-').slice(0,180),
      title: title.slice(0,200), description: null,
      venue: venue.slice(0,150), city: 'Nairobi',
      start_date: startDate, end_date: null,
      price_from: price, currency: 'KES',
      image_url: img, event_url: url,
      source_url: 'https://www.tipsitickets.com',
      category: rawCat ? rawCat.toLowerCase() : inferCategory(title),
      active: true, scraped_at: new Date().toISOString(),
    });
    if (events.length >= 30) break;
  }

  return dedup(events);
}

/* ════════════════════════════════════════════════════════════════
   PARSER 3 — Ticketsasa (PHP/Laravel server-rendered)
════════════════════════════════════════════════════════════════ */
function parseTicketsasa(html) {
  if (!html) return [];
  const events = []; const seen = new Set();

  const parts = html.split(/(?=<a[^>]+href="\/events\/[a-z0-9\-]+")/i);
  for (const part of parts) {
    const slugM = part.match(/href="(\/events\/([a-z0-9][a-z0-9\-]+[a-z0-9]))"(?!\s*class="(?:event-cat|category))/i);
    if (!slugM) continue;
    const slug = slugM[1]; const name = slugM[2];
    if (['listing','category','upcoming','search'].some(x => name.includes(x))) continue;
    if (seen.has(slug)) continue; seen.add(slug);
    const url = 'https://www.ticketsasa.com' + slug;

    const titleM = part.match(/title="([^"]{5,150})"/) ||
                   part.match(/<h6[^>]*>(?:<a[^>]*>)?([^<]{5,150}?)(?:<\/a>)?<\/h6>/i) ||
                   part.match(/class="event[^"]*title[^"]*"[^>]*>([^<]{5,150})</i);
    const title = titleM ? clean(decHtml(titleM[1])) : null;
    if (!title || title.length < 4) continue;

    const dateM = part.match(/([A-Z]{3}\s+\d{1,2}\s+[A-Z]{3}\s+\d{4}(?:\s+\d{1,2}:\d{2}\s*(?:AM|PM))?)/);
    const startDate = dateM ? parseDate(dateM[0]) : null;

    const isFree = /\bFREE\b/.test(part);
    const priceM = part.match(/Starting\s+KES(?:&nbsp;|\s|&#160;)+([\d,]+)/i) || part.match(/KES(?:&nbsp;|\s|&#160;)+([\d,]+)/i);
    const price = priceM ? parseFloat(priceM[1].replace(/,/g,'')) : (isFree ? 0 : null);

    const venueM = part.match(/<\/h6>[\s\S]{0,30}?([A-Z][^<\n]{8,80}(?:Nairobi|Kenya|Stadium|Centre|Center|Arena|Park|Hotel|Club|Garden|Restaurant|Ground|Mall|Hall|Museum|KICC|Grounds)[^<\n]{0,60})/i);
    const venue = venueM ? clean(venueM[1]).slice(0,150) : 'Kenya';

    let img = null;
    const imgM = part.match(/src="((?:https?:\/\/[^"]*ticketsasa[^"]*|\/[^"]+)\.(?:jpg|jpeg|png|webp|svg)(?:\?[^"]*)?)"/) ||
                 part.match(/src="(\/_ipx[^"]+)"/);
    if (imgM) {
      img = imgM[1].startsWith('/') ? 'https://www.ticketsasa.com' + imgM[1] : imgM[1];
      img = img.replace('q_10&','q_80&').replace('q_10,','q_80,');
    }

    events.push({
      dedupe_key: 'ts-'+title.toLowerCase().replace(/[^a-z0-9]+/g,'-').slice(0,180),
      title: title.slice(0,200), description: null, venue, city: 'Nairobi',
      start_date: startDate, end_date: null, price_from: price, currency: 'KES',
      image_url: img, event_url: url,
      source_url: 'https://www.ticketsasa.com/events',
      category: inferCategory(title), active: true, scraped_at: new Date().toISOString(),
    });
    if (events.length >= 40) break;
  }
  return dedup(events);
}

/* ════════════════════════════════════════════════════════════════
   PARSER 4 — Eventbrite (JSON-LD, proven)
════════════════════════════════════════════════════════════════ */
const EV_TYPES = new Set(['Event','MusicEvent','TheaterEvent','Festival','ComedyEvent',
  'SportsEvent','DanceEvent','ExhibitionEvent','FoodEvent','ScreeningEvent',
  'SocialEvent','BusinessEvent','EducationEvent','ChildrensEvent']);

function gatherEvents(node, out) {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) { node.forEach(n => gatherEvents(n, out)); return; }
  if ([].concat(node['@type']||[]).some(x => EV_TYPES.has(x))) out.push(node);
  if (node['@graph']) gatherEvents(node['@graph'], out);
}
const fs = v => !v ? null : typeof v === 'string' ? v : Array.isArray(v) ? fs(v[0]) : v.url || v['@id'] || v.name || null;

function parseEventbrite(html) {
  if (!html) return [];
  const blocks = []; const re = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi; let m;
  while ((m = re.exec(html)) !== null) { try { blocks.push(JSON.parse(m[1].trim())); } catch {} }
  const found = []; blocks.forEach(b => gatherEvents(b, found));
  const seen = new Set();
  return found.map(e => {
    const title = fs(e.name); const start = e.startDate;
    if (!title || !start) return null;
    const dk = (title.toLowerCase()+'|'+String(start).slice(0,10)).slice(0,300);
    if (seen.has(dk)) return null; seen.add(dk);
    const loc = Array.isArray(e.location) ? e.location[0] : e.location;
    let venue = null, city = null;
    if (loc) { venue = typeof loc === 'string' ? loc : fs(loc.name); const a = loc.address; if (a) city = typeof a === 'string' ? a : a.addressLocality || null; }
    // Exclude non-Kenya events
    if (city && !/nairobi|kenya|mombasa|kisumu|nakuru/i.test(city+' '+(venue||''))) return null;
    const offers = [].concat(e.offers||[]);
    let price = null, cur = 'KES';
    for (const o of offers) { if (!o) continue; const p = parseFloat(o.lowPrice??o.price); if (!isNaN(p) && (price===null||p<price)) { price=p; if(o.priceCurrency) cur=o.priceCurrency; } }
    return {
      dedupe_key: dk, title: title.slice(0,200),
      description: typeof e.description === 'string' ? e.description.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim().slice(0,500) : null,
      venue: venue ? String(venue).slice(0,150) : null, city: city ? String(city).slice(0,80) : null,
      start_date: start, end_date: e.endDate||null, price_from: price, currency: cur,
      image_url: fs(e.image), event_url: fs(e.url)||null,
      source_url: 'https://www.eventbrite.com', category: inferCategory(title), active: true,
      scraped_at: new Date().toISOString(),
    };
  }).filter(Boolean);
}

/* ════════════════════════════════════════════════════════════════
   HANDLER
════════════════════════════════════════════════════════════════ */
export default async function handler(req, res) {
  const t0 = Date.now();
  try {
    // Fetch all sources in parallel
    const [negHtml, tipsiHtml, tsHtml, ebHtml] = await Promise.all([
      fetchPage('https://nairobieventsguide.com/upcoming-events/'),
      fetchPage('https://www.tipsitickets.com/'),
      fetchPage('https://www.ticketsasa.com/events'),
      fetchPage('https://www.eventbrite.com/d/kenya--nairobi/events/'),
    ]);

    const negEvents   = parseNEG(negHtml);
    const tipsiEvents = parseTipsi(tipsiHtml);
    const tsEvents    = parseTicketsasa(tsHtml);
    const ebEvents    = parseEventbrite(ebHtml);

    // Merge — NEG first (most events), then others fill gaps
    const all = dedup([...negEvents, ...tipsiEvents, ...tsEvents, ...ebEvents]);

    // Upsert in batches of 50
    for (let i = 0; i < all.length; i += 50)
      await db('POST', 'scraped_events?on_conflict=dedupe_key', all.slice(i, i + 50));

    // Expire past events
    await db('PATCH',
      `scraped_events?start_date=lt.${new Date(Date.now()-86400000).toISOString()}&active=eq.true`,
      { active: false }
    ).catch(() => {});

    // Update source records
    const now = new Date().toISOString();
    const src = [
      ['NairobiEventsGuide', negEvents.length],
      ['Tipsi Tickets',      tipsiEvents.length],
      ['Ticketsasa',         tsEvents.length],
      ['Eventbrite Nairobi', ebEvents.length],
    ];
    await Promise.all(src.map(([label, count]) =>
      db('PATCH', `scrape_sources?label=eq.${encodeURIComponent(label)}`, {
        last_run: now, last_status: count > 0 ? 'ok' : 'no_events', events_found: count,
      }).catch(() => {})
    ));

    res.status(200).json({
      ok: true, ran: now, ms: Date.now() - t0,
      summary: [
        { source: 'NairobiEventsGuide', found: negEvents.length },
        { source: 'Tipsitickets',       found: tipsiEvents.length },
        { source: 'Ticketsasa',         found: tsEvents.length },
        { source: 'Eventbrite',         found: ebEvents.length },
        { total_upserted: all.length },
      ],
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
}
