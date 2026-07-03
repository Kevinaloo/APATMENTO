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
export default async function handler(req, res) {
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
