/* ════════════════════════════════════════════════════════════════
   APATMENTO  ·  Unified Scraper  /api/scrape.js
   Routes: ?service=events | tours | food | shopping | all
   Consolidates 4 scrapers into 1 Vercel function (Hobby plan: max 12)
   
   Cron schedule (vercel.json):
   - events:   0 3 * * *  (3am UTC daily)
   - tours:    0 4 * * *  (4am UTC daily)  
   - food:     0 2 * * *  (2am UTC daily)
   - shopping: 0 1 * * *  (1am UTC daily)
   Each cron hits /api/scrape?service=<name>
════════════════════════════════════════════════════════════════ */
export const config = { maxDuration: 60 };

/* ══════════════════════════════════════
   EVENTS SCRAPER
══════════════════════════════════════ */
/* ═══════════════════════════════════════════════════════════════════
   APATMENTO EVENT INGESTION v6  ·  Production-grade
   Sources:
     ① NairobiEventsGuide — Tribe Events WP-JSON REST API (JSON, no CF block)
     ② Tipsitickets       — Next.js SSR with realistic browser headers
     ③ Ticketsasa         — PHP server-rendered, Kenyan KES events
     ④ Eventbrite Nairobi — JSON-LD structured data
   Cron: daily 3am UTC  ·  Manual: GET /api/scrape-events
═══════════════════════════════════════════════════════════════════ */

const SUPA_URL = 'https://gfwgbgdvxtocwhilrtdw.supabase.co';
const SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdmd2diZ2R2eHRvY3doaWxydGR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1MTE2NjMsImV4cCI6MjA5NzA4NzY2M30.U8JClv06YsNAwq9qsPb3lQ4SIPeRPjKMzsYxVfcmujw';
const H = { 'apikey': SUPA_KEY, 'Authorization': 'Bearer ' + SUPA_KEY, 'Content-Type': 'application/json' };

/* Ultra-realistic browser headers to bypass basic bot detection */
const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept-Encoding': 'gzip, deflate, br',
  'DNT': '1',
  'Connection': 'keep-alive',
  'Upgrade-Insecure-Requests': '1',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Sec-Fetch-User': '?1',
  'Cache-Control': 'max-age=0',
};

const JSON_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (compatible; ApatmentoBot/2.0; +https://www.apatmento.space)',
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'en-US,en;q=0.9',
  'Referer': 'https://www.google.com/',
};

/* ── Supabase helper ── */
async function db(method, path, body) {
  const opts = { method, headers: { ...H } };
  if (method === 'POST') opts.headers['Prefer'] = 'resolution=merge-duplicates,return=minimal';
  if (method === 'PATCH') opts.headers['Prefer'] = 'return=minimal';
  if (body) opts.body = JSON.stringify(body);
  const r = await fetch(`${SUPA_URL}/rest/v1/${path}`, opts);
  if (!r.ok) { const t = await r.text().catch(()=>''); throw new Error(`DB ${r.status}: ${t.slice(0,80)}`); }
  return method === 'GET' ? r.json() : null;
}

/* ── Generic fetch with timeout ── */
async function fetchUrl(url, headers = BROWSER_HEADERS, ms = 15000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const r = await fetch(url, { headers, signal: ctrl.signal, redirect: 'follow' });
    clearTimeout(t);
    return r.ok ? r : null;
  } catch { clearTimeout(t); return null; }
}
const fetchHtml = async (url, ms) => { const r = await fetchUrl(url, BROWSER_HEADERS, ms); return r ? r.text() : null; };
const fetchJson = async (url, ms) => { const r = await fetchUrl(url, JSON_HEADERS, ms); if (!r) return null; try { return await r.json(); } catch { return null; } };

/* ── Utilities ── */
const clean = s => (s||'').replace(/&amp;/g,'&').replace(/&#\d+;/g,' ').replace(/&[a-z]{2,8};/g,' ').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();
const decH  = s => (s||'').replace(/&amp;/g,'&').replace(/&nbsp;/g,' ').replace(/&#160;/g,' ').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'");

const MO3 = {jan:0,feb:1,mar:2,apr:3,may:4,jun:5,jul:6,aug:7,sep:8,oct:9,nov:10,dec:11};
const MON = {january:0,february:1,march:2,april:3,may:4,june:5,july:6,august:7,september:8,october:9,november:10,december:11};

function parseDate(s) {
  if (!s) return null;
  const d = s.trim();
  // ISO: "2026-07-03 08:00:00" or "2026-07-03T08:00:00"
  if (/^\d{4}-\d{2}-\d{2}/.test(d)) {
    try { const dt = new Date(d.replace(' ','T')); return isNaN(dt) ? null : dt.toISOString(); } catch {}
  }
  // "Thu, July 2, 2026 08:00 AM" or "Thursday, 4 July 2026"
  let m = d.match(/([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})(?:\s+(\d{1,2}):(\d{2})\s*(AM|PM))?/i);
  if (m) {
    const mo = MON[m[1].toLowerCase()]; if (mo===undefined) return null;
    let h=parseInt(m[4]||'0'); const mn=parseInt(m[5]||'0'); const ap=(m[6]||'').toUpperCase();
    if(ap==='PM'&&h!==12)h+=12; if(ap==='AM'&&h===12)h=0;
    return new Date(Date.UTC(parseInt(m[3]),mo,parseInt(m[2]),h,mn)).toISOString();
  }
  // "Saturday, 4 July 2026" / "4 July 2026"
  m = d.match(/(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})(?:\s+(\d{1,2})[.:](\d{2})\s*(am|pm))?/i);
  if (m) {
    const mo = MON[m[2].toLowerCase()]; if(mo===undefined) return null;
    let h=parseInt(m[4]||'0'); const mn=parseInt(m[5]||'0'); const ap=(m[6]||'').toLowerCase();
    if(ap==='pm'&&h!==12)h+=12; if(ap==='am'&&h===12)h=0;
    return new Date(Date.UTC(parseInt(m[3]),mo,parseInt(m[1]),h,mn)).toISOString();
  }
  // "SAT 11 JUL 2026 12:00 PM"
  m = d.match(/(\d{1,2})\s+([A-Z]{3})\s+(\d{4})(?:\s+(\d{1,2}):(\d{2})\s*(AM|PM))?/i);
  if (m) {
    const mo = MO3[m[2].toLowerCase()]; if(mo===undefined) return null;
    let h=parseInt(m[4]||'0'); const mn=parseInt(m[5]||'0'); const ap=(m[6]||'').toUpperCase();
    if(ap==='PM'&&h!==12)h+=12; if(ap==='AM'&&h===12)h=0;
    return new Date(Date.UTC(parseInt(m[3]),mo,parseInt(m[1]),h,mn)).toISOString();
  }
  return null;
}

function extractPrice(t='') {
  const m = t.match(/(?:KSh|KES|Ksh)\s*([\d,]+)/i);
  if (m) return parseFloat(m[1].replace(/,/g,''));
  if (/\bfree\b/i.test(t)) return 0;
  return null;
}

function inferCat(t='',extra='') {
  const s=(t+' '+extra).toLowerCase();
  if(/concert|music|live|afro|gengetone|dj\b|festival|album|gig|band|beats|rave|jam|r&b|rnb|amapiano|afrohouse/.test(s)) return 'music';
  if(/run|marathon|race|football|rugby|golf|cycling|fitness|trail|sport|match|tournament|padel|gym|hyrox/.test(s)) return 'sports';
  if(/comedy|stand.?up|laugh|open mic/.test(s)) return 'comedy';
  if(/art|paint|photography|gallery|fashion|design|creative|sketch|exhibition|craft/.test(s)) return 'art';
  if(/food|drink|wine|cocktail|brunch|dining|chef|cook|culinary|tasting|brunch|bazaar|market/.test(s)) return 'food';
  if(/summit|conference|expo|invest|startup|tech|innovation|network|business|digital/.test(s)) return 'business';
  if(/workshop|training|class|learn|seminar|webinar|education/.test(s)) return 'workshop';
  if(/church|prayer|worship|spiritual|gospel|faith/.test(s)) return 'spirituality';
  if(/kids|children|family|teen|school|camp|baby/.test(s)) return 'family';
  if(/film|movie|screening|cinema|documentary/.test(s)) return 'film';
  return 'general';
}

function dedup(rows) {
  const s=new Set();
  return rows.filter(r => r && !s.has(r.dedupe_key) && (s.add(r.dedupe_key), true));
}

/* ════════════════════════════════════════════════════════════════
   PARSER 1 — NairobiEventsGuide via Tribe Events REST API
   Endpoint: /wp-json/tribe/events/v1/events — returns structured JSON
   No Cloudflare, no bot detection, clean data
════════════════════════════════════════════════════════════════ */
async function parseNEG() {
  const today = new Date().toISOString().slice(0,10);
  // Fetch up to 50 events starting from today
  const url = `https://nairobieventsguide.com/wp-json/tribe/events/v1/events?per_page=50&status=publish&start_date=${today}`;
  const data = await fetchJson(url);
  if (!data) return [];

  const eventsList = Array.isArray(data) ? data : (data.events || []);
  if (!eventsList.length) return [];

  return dedup(eventsList.map(e => {
    const title = clean(decH(e.title || e.post_title || ''));
    if (!title || title.length < 3) return null;

    const startDate = parseDate(e.start_date || e.start_date_details?.date);
    const venue = e.venue?.venue || e.venue?.name || 'Kenya';
    const city  = e.venue?.city || (venue && /nairobi/i.test(venue) ? 'Nairobi' : 'Kenya');

    let image = null;
    if (e.image) {
      image = typeof e.image === 'string' ? e.image :
              e.image.url || e.image.sizes?.large?.url || e.image.sizes?.medium?.url || null;
    }

    const desc = clean(e.description || e.excerpt || '').slice(0, 500);
    const price = e.cost ? extractPrice(e.cost) : extractPrice(desc);

    return {
      dedupe_key: ('neg-' + title.toLowerCase().replace(/[^a-z0-9]+/g,'-').slice(0,180)),
      title: title.slice(0,200), description: desc || null,
      venue: (venue || 'Kenya').slice(0,150), city,
      start_date: startDate, end_date: parseDate(e.end_date) || null,
      price_from: price, currency: 'KES',
      image_url: image, event_url: e.url || `https://nairobieventsguide.com/event/${e.slug || ''}`,
      source_url: 'https://nairobieventsguide.com/upcoming-events/',
      category: inferCat(title, desc), active: true,
      scraped_at: new Date().toISOString(),
    };
  }).filter(Boolean));
}

/* ════════════════════════════════════════════════════════════════
   PARSER 2 — Tipsitickets: HTML + __NEXT_DATA__ + precise patterns
════════════════════════════════════════════════════════════════ */
function parseTipsiHtml(html) {
  if (!html) return [];
  const events = []; const seen = new Set();

  // Strategy A: __NEXT_DATA__ JSON blob
  const ndM = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (ndM) {
    try {
      const nd = JSON.parse(ndM[1]);
      const pp = nd?.props?.pageProps;
      const list = pp?.events || pp?.allEvents || pp?.upcomingEvents || pp?.featuredEvents || [];
      if (Array.isArray(list) && list.length) {
        list.forEach(e => {
          const title = (e.name || e.title || '').trim(); if (!title) return;
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
            title: title.slice(0,200), description: ((e.description||'').replace(/<[^>]+>/g,' ').trim()).slice(0,500),
            venue, city: e.city || 'Nairobi',
            start_date: sd ? new Date(sd).toISOString() : null,
            end_date: e.endDate ? new Date(e.endDate).toISOString() : null,
            price_from: price ? parseFloat(price) : null, currency: 'KES',
            image_url: img, event_url: url,
            source_url: 'https://www.tipsitickets.com',
            category: inferCat(title, e.category||''), active: true,
            scraped_at: new Date().toISOString(),
          });
        });
        if (events.length) return dedup(events);
      }
    } catch {}
  }

  // Strategy B: HTML parsing — Featured events (clean structure at top)
  // Pattern: <img ... src="https://media.tipsitickets.com/event_banners/variants/NAME.webp">
  //          <h3>TITLE</h3> ... <a href="/event/SLUG?eventId=UUID">
  const featRe = /src="(https:\/\/media\.tipsitickets\.com\/event_banners\/variants\/[^"]+\.webp)"[^>]*>([\s\S]{0,2000}?)<a[^>]+href="(\/event\/[^"]+)"/gi;
  let m;
  while ((m = featRe.exec(html)) !== null) {
    const img = m[1];
    const ctx = m[2];
    const relUrl = m[3];
    const h3M = ctx.match(/<h3[^>]*>([^<]{3,150})<\/h3>/i);
    const title = h3M ? clean(decH(h3M[1])) : null;
    if (!title || title.length < 3) continue;
    if (seen.has(title.toLowerCase())) continue; seen.add(title.toLowerCase());
    const dateM = ctx.match(/(\w+ \d{1,2},\s+\d{4})/);
    const venueM = ctx.match(/([A-Z][^<\n]{8,100}(?:Kenya|Nairobi|Park|Hotel|Club|Gardens?|Restaurant|Ground)[^<\n]{0,60})/i);
    const priceM = ctx.match(/(?:KES|KSh)\s*([\d,]+)/i);
    events.push({
      dedupe_key: 'ti-'+title.toLowerCase().replace(/[^a-z0-9]+/g,'-').slice(0,180),
      title: title.slice(0,200), description: null,
      venue: venueM ? clean(venueM[1]).slice(0,150) : 'Kenya', city: 'Nairobi',
      start_date: dateM ? parseDate(dateM[1]) : null, end_date: null,
      price_from: priceM ? parseFloat(priceM[1].replace(/,/g,'')) : null, currency: 'KES',
      image_url: img, event_url: 'https://www.tipsitickets.com' + relUrl,
      source_url: 'https://www.tipsitickets.com',
      category: inferCat(title), active: true, scraped_at: new Date().toISOString(),
    });
    if (events.length >= 30) break;
  }

  // Strategy C: All Events section — Next.js image proxy pattern
  // "Starting fromKES X,XXX" (no space before KES is Tipsitickets-specific)
  const allIdx = Math.max(0, html.lastIndexOf('All Events'));
  const allSection = html.slice(allIdx);
  const allImgRe = /url=([^&"']+media\.tipsitickets[^&"']+\.webp)[^"']*/gi;
  let im;
  while ((im = allImgRe.exec(allSection)) !== null) {
    let img; try { img = decodeURIComponent(im[1]); } catch { continue; }
    if (!img.includes('event_banners')) continue;
    const ctx = allSection.slice(im.index, im.index + 2000);
    const titleM = ctx.match(/##\s+([^\n]{3,150})/);
    const title = titleM ? clean(decH(titleM[1])).replace(/\.\.\.$/,'').trim() : null;
    if (!title || title.length < 3) continue;
    if (seen.has(title.toLowerCase())) continue; seen.add(title.toLowerCase());
    const dateM = ctx.match(/([A-Z][a-z]+,\s+\d{1,2}\s+[A-Z][a-z]+\s+\d{4})/);
    const priceM = ctx.match(/Starting\s*from\s*KES\s*([\d,]+)/i) || ctx.match(/KES\s*([\d,]+)/i);
    const venueM = ctx.match(/\d{4}\n(?:[\d.]+\s*am\s*-\s*[\d.]+\s*pm\n)?(.{10,120}?)(?:,\1|\n)/i);
    const urlM   = ctx.match(/href="(\/event\/[^"]+)"/i);
    events.push({
      dedupe_key: 'ti-'+title.toLowerCase().replace(/[^a-z0-9]+/g,'-').slice(0,180),
      title: title.slice(0,200), description: null,
      venue: venueM ? clean(venueM[1]).split(',')[0].slice(0,150) : 'Kenya', city: 'Nairobi',
      start_date: dateM ? parseDate(dateM[1]) : null, end_date: null,
      price_from: priceM ? parseFloat(priceM[1].replace(/,/g,'')) : null, currency: 'KES',
      image_url: img, event_url: urlM ? 'https://www.tipsitickets.com'+urlM[1] : 'https://www.tipsitickets.com',
      source_url: 'https://www.tipsitickets.com',
      category: inferCat(title), active: true, scraped_at: new Date().toISOString(),
    });
    if (events.length >= 30) break;
  }

  return dedup(events);
}

/* ════════════════════════════════════════════════════════════════
   PARSER 3 — Ticketsasa
════════════════════════════════════════════════════════════════ */
function parseTicketsasa(html) {
  if (!html) return [];
  const events=[]; const seen=new Set();
  const parts = html.split(/(?=<a[^>]+href="\/events\/[a-z0-9\-]+")/i);
  for (const part of parts) {
    const sm = part.match(/href="(\/events\/([a-z0-9][a-z0-9\-]*[a-z0-9]))"(?!\s*class="[^"]*(?:cat|filter))/i);
    if (!sm) continue;
    const slug = sm[1]; const name = sm[2];
    if (['listing','category','upcoming','search'].some(x=>name===x||name.startsWith(x+'-'))) continue;
    if (seen.has(slug)) continue; seen.add(slug);
    const url = 'https://www.ticketsasa.com' + slug;
    const titleM = part.match(/title="([^"]{5,150})"/) || part.match(/<h6[^>]*>(?:<a[^>]*>)?([^<]{5,150}?)(?:<\/a>)?<\/h6>/i);
    const title = titleM ? clean(decH(titleM[1])) : null;
    if (!title || title.length < 4) continue;
    const dateM = part.match(/([A-Z]{3}\s+\d{1,2}\s+[A-Z]{3}\s+\d{4}(?:\s+\d{1,2}:\d{2}\s*(?:AM|PM))?)/);
    const startDate = dateM ? parseDate(dateM[0]) : null;
    const isFree = /\bFREE\b/.test(part);
    const priceM = part.match(/Starting\s+KES(?:&nbsp;|\s|&#160;)+([\d,]+)/i) || part.match(/KES(?:&nbsp;|\s|&#160;)+([\d,]+)/i);
    const price = priceM ? parseFloat(priceM[1].replace(/,/g,'')) : (isFree ? 0 : null);
    const venueM = part.match(/<\/h6>[\s\S]{0,50}?([A-Z][^<]{8,80}(?:Nairobi|Kenya|Stadium|Centre|Center|Arena|Park|Hotel|Club|Garden|Restaurant|Ground|Mall|Hall|Museum|KICC)[^<]{0,60})/i);
    const venue = venueM ? clean(venueM[1]).slice(0,150) : 'Kenya';
    let img = null;
    const imgM = part.match(/src="((?:https?:\/\/[^"]*ticketsasa[^"]*|\/[^"]+)\.(?:jpg|jpeg|png|webp)(?:\?[^"]*)?)"/) || part.match(/src="(\/_ipx[^"]+)"/);
    if (imgM) { img = imgM[1].startsWith('/') ? 'https://www.ticketsasa.com'+imgM[1] : imgM[1]; img=img.replace('q_10&','q_80&'); }
    events.push({
      dedupe_key: 'ts-'+title.toLowerCase().replace(/[^a-z0-9]+/g,'-').slice(0,180),
      title: title.slice(0,200), description: null, venue, city: 'Nairobi',
      start_date: startDate, end_date: null, price_from: price, currency: 'KES',
      image_url: img, event_url: url,
      source_url: 'https://www.ticketsasa.com/events',
      category: inferCat(title), active: true, scraped_at: new Date().toISOString(),
    });
    if (events.length >= 40) break;
  }
  return dedup(events);
}

/* ════════════════════════════════════════════════════════════════
   PARSER 4 — Eventbrite (JSON-LD)
════════════════════════════════════════════════════════════════ */
const EV_TYPES=new Set(['Event','MusicEvent','TheaterEvent','Festival','ComedyEvent','SportsEvent','DanceEvent','ExhibitionEvent','FoodEvent','ScreeningEvent','SocialEvent','BusinessEvent','EducationEvent','ChildrensEvent']);
function gatherEv(node,out){if(!node||typeof node!=='object')return;if(Array.isArray(node)){node.forEach(n=>gatherEv(n,out));return;}if([].concat(node['@type']||[]).some(x=>EV_TYPES.has(x)))out.push(node);if(node['@graph'])gatherEv(node['@graph'],out);}
const fs=v=>!v?null:typeof v==='string'?v:Array.isArray(v)?fs(v[0]):v.url||v['@id']||v.name||null;
function parseEventbrite(html){
  if(!html)return[];
  const blocks=[];const re=/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;let m;
  while((m=re.exec(html))!==null){try{blocks.push(JSON.parse(m[1].trim()));}catch{}}
  const found=[];blocks.forEach(b=>gatherEv(b,found));
  const seen=new Set();
  return found.map(e=>{
    const title=fs(e.name);const start=e.startDate;if(!title||!start)return null;
    const dk=(title.toLowerCase()+'|'+String(start).slice(0,10)).slice(0,300);
    if(seen.has(dk))return null;seen.add(dk);
    const loc=Array.isArray(e.location)?e.location[0]:e.location;
    let venue=null,city=null;
    if(loc){venue=typeof loc==='string'?loc:fs(loc.name);const a=loc.address;if(a)city=typeof a==='string'?a:a.addressLocality||null;}
    if(city&&!/nairobi|kenya|mombasa|kisumu|nakuru/i.test((city||'')+' '+(venue||'')))return null;
    const offers=[].concat(e.offers||[]);let price=null,cur='KES';
    for(const o of offers){if(!o)continue;const p=parseFloat(o.lowPrice??o.price);if(!isNaN(p)&&(price===null||p<price)){price=p;if(o.priceCurrency)cur=o.priceCurrency;}}
    return{dedupe_key:dk,title:title.slice(0,200),
      description:typeof e.description==='string'?e.description.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim().slice(0,500):null,
      venue:venue?String(venue).slice(0,150):null,city:city?String(city).slice(0,80):null,
      start_date:start,end_date:e.endDate||null,price_from:price,currency:cur,
      image_url:fs(e.image),event_url:fs(e.url)||null,
      source_url:'https://www.eventbrite.com',category:inferCat(title),active:true,
      scraped_at:new Date().toISOString()};
  }).filter(Boolean);
}

/* ════════════════════════════════════════════════════════════════
   HANDLER
════════════════════════════════════════════════════════════════ */
async function runEvents(res) {
  const t0 = Date.now();
  try {
    // Fetch all sources in parallel
    const [negEvents, tipsiHtml, tsHtml, ebHtml] = await Promise.all([
      parseNEG(),  // NEG uses its own async fetch + parse
      fetchHtml('https://www.tipsitickets.com/'),
      fetchHtml('https://www.ticketsasa.com/events'),
      fetchHtml('https://www.eventbrite.com/d/kenya--nairobi/events/'),
    ]);

    const tipsiEvents = parseTipsiHtml(tipsiHtml);
    const tsEvents    = parseTicketsasa(tsHtml);
    const ebEvents    = parseEventbrite(ebHtml);

    const all = dedup([...negEvents, ...tipsiEvents, ...tsEvents, ...ebEvents]);

    for (let i = 0; i < all.length; i += 50)
      await db('POST', 'scraped_events?on_conflict=dedupe_key', all.slice(i, i + 50));

    // Expire past events (keep 7-day buffer for multi-day events)
    await db('PATCH',
      `scraped_events?start_date=lt.${new Date(Date.now()-7*86400000).toISOString()}&active=eq.true`,
      { active: false }
    ).catch(() => {});

    const now = new Date().toISOString();
    await Promise.all([
      ['NairobiEventsGuide', negEvents.length],
      ['Tipsi Tickets', tipsiEvents.length],
      ['Ticketsasa', tsEvents.length],
      ['Eventbrite Nairobi', ebEvents.length],
    ].map(([label, count]) =>
      db('PATCH', `scrape_sources?label=eq.${encodeURIComponent(label)}`,
        { last_run: now, last_status: count > 0 ? 'ok' : 'no_events', events_found: count }
      ).catch(() => {})
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


/* ══════════════════════════════════════
   TOURS SCRAPER
══════════════════════════════════════ */
/* ═══════════════════════════════════════════════════════════════
   APATMENTO TOURS SCRAPER v2 — GYG + Viator
   Handles lazy-loaded images (data-src, data-lazy-src),
   JSON-LD TouristAttraction/Product, and Next.js __NEXT_DATA__
═══════════════════════════════════════════════════════════════ */

// SUPA_URL defined above
// SUPA_KEY defined above

const H = {
  'apikey': SUPA_KEY, 'Authorization': 'Bearer ' + SUPA_KEY, 'Content-Type': 'application/json'
};

// db() defined above

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

async function runTours(res) {
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


/* ══════════════════════════════════════
   FOOD SCRAPER
══════════════════════════════════════ */
/* =========================================================
   APATMENTO  -  Food Scraper v2 (OpenStreetMap Overpass API)
   Uses GET request with URL-encoded query — fixes 406 error
   Runs daily 2am UTC via Vercel Cron.
   ========================================================= */
// SUPA_URL defined above
// SUPA_KEY defined above

// db() defined above

function mapCuisine(tags) {
  const c = (tags.cuisine || '').toLowerCase();
  const a = (tags.amenity || '').toLowerCase();
  if (/coffee|cafe|tea/.test(c) || a === 'cafe') return 'cafe';
  if (/pizza|italian/.test(c)) return 'italian';
  if (/indian|punjabi/.test(c)) return 'indian';
  if (/chinese|asian|sushi|thai/.test(c)) return 'chinese';
  if (/burger|american|bbq|grill/.test(c)) return 'burgers';
  if (/seafood|fish/.test(c)) return 'seafood';
  if (/kenyan|african/.test(c)) return 'kenyan';
  if (a === 'fast_food') return 'fast-food';
  return 'kenyan';
}

async function runFood(res) {
  const t0 = Date.now();
  try {
    const query = '[out:json][timeout:25];(node["amenity"~"restaurant|cafe|fast_food"]["name"](-1.40,36.65,-1.10,36.97);way["amenity"~"restaurant|cafe|fast_food"]["name"](-1.40,36.65,-1.10,36.97););out center 120;';

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 30000);
    const overpassRes = await fetch(
      'https://overpass-api.de/api/interpreter?data=' + encodeURIComponent(query),
      { signal: ctrl.signal }
    );
    clearTimeout(timer);

    if (!overpassRes.ok) throw new Error('Overpass HTTP ' + overpassRes.status);
    const data = await overpassRes.json();
    const elements = data.elements || [];

    const seen = new Set();
    const rows = elements.map(el => {
      const tags = el.tags || {};
      const name = tags.name;
      if (!name || name.length < 2) return null;
      const dk = 'osm-' + name.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 180);
      if (seen.has(dk)) return null;
      seen.add(dk);
      const area = tags['addr:suburb'] || tags['addr:neighbourhood'] || 'Nairobi';
      return {
        dedupe_key: dk,
        name: name.slice(0, 200),
        cuisine: mapCuisine(tags),
        area: area.slice(0, 100),
        city: 'Nairobi',
        phone: tags.phone || tags['contact:phone'] || null,
        website: tags.website || tags['contact:website'] || null,
        latitude: el.lat || (el.center && el.center.lat) || null,
        longitude: el.lon || (el.center && el.center.lon) || null,
        hot: false, active: true,
        source: 'openstreetmap',
        scraped_at: new Date().toISOString(),
      };
    }).filter(Boolean);

    for (let i = 0; i < rows.length; i += 50)
      await db('POST', 'scraped_restaurants?on_conflict=dedupe_key', rows.slice(i, i + 50));

    res.status(200).json({ ok: true, ran: new Date().toISOString(), ms: Date.now()-t0, found: rows.length });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
}


/* ══════════════════════════════════════
   SHOPPING SCRAPER
══════════════════════════════════════ */
/* ════════════════════════════════════════════════════════════════
   APATMENTO  ·  Shopping Scraper — Jumia Kenya
   Fetches top-rated products from Jumia Kenya across 4 categories.
   Jumia is server-rendered PHP/hybrid: full product data including
   names, prices, discounts, ratings, images in the HTML source.
   Cron: daily 1am UTC  ·  Manual: GET /api/scrape-shopping
════════════════════════════════════════════════════════════════ */
// SUPA_URL defined above
// SUPA_KEY defined above

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

// db() defined above

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

async function runShopping(res) {
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


/* ══════════════════════════════════════
   ROUTER — dispatches to the right scraper
══════════════════════════════════════ */
export default async function handler(req, res) {
  const service = (req.query?.service || new URL(req.url || '/', 'http://x').searchParams.get('service') || 'all').toLowerCase();
  
  const t0 = Date.now();
  const results = {};

  try {
    if (service === 'events' || service === 'all') {
      await runEvents(res);
      if (service !== 'all') return; // already responded
      results.events = 'done';
    }
    if (service === 'tours' || service === 'all') {
      await runTours(res);
      if (service !== 'all') return;
      results.tours = 'done';
    }
    if (service === 'food' || service === 'all') {
      await runFood(res);
      if (service !== 'all') return;
      results.food = 'done';
    }
    if (service === 'shopping' || service === 'all') {
      await runShopping(res);
      if (service !== 'all') return;
      results.shopping = 'done';
    }

    if (service === 'all') {
      return res.status(200).json({ ok: true, ms: Date.now() - t0, results });
    }

    return res.status(400).json({ error: 'Unknown service. Use: events, tours, food, shopping, all' });
  } catch (e) {
    if (!res.headersSent) res.status(500).json({ ok: false, error: e.message });
  }
}
