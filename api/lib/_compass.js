/* ══════════════════════════════════════════════════════════════════════
   CABANA · COMPASS
   api/lib/_compass.js

   One profile per person, built from what they actually do on Cabana,
   and used for three things:

     1. SHOWING EACH PERSON WHAT FITS THEM. The For-you rail ranks the live
        catalogue against their own interests: the places they keep coming
        back to, the budget they actually browse at, the party size they
        search for, the services they use.
     2. MAKING APA KNOW THEM. APA reads a short, factual summary before she
        answers, so "somewhere for the weekend" means the right city and
        the right price without a single question.
     3. GIVING ADVERTISERS AUDIENCES, NOT PEOPLE. Segments are sized and
        described; individuals are never sold, exported or named.

   HOW INTEREST IS MEASURED
   ────────────────────────
   Every signal adds weight to a dimension (a service, a place, a price
   band, an amenity) and every weight halves after thirty days without
   reinforcement. Someone who looked at Diani every day in March and has
   searched Nairobi all week is, today, a Nairobi person who likes the
   coast — which is exactly what a good concierge would conclude.

   Weights are ordered by commitment: looking is cheap, searching with
   dates is a plan, saving is a shortlist, starting checkout is a decision.

   PRIVACY, IN CODE
   ────────────────
   · No IP address is stored. Location comes from the edge network's
     country/region/city headers, which is the granularity kept.
   · Do Not Track and the in-app opt-out stop collection at the browser;
     the server refuses anything from an opted-out profile as well.
   · Global Privacy Control turns advertising use off for that person.
   · Advertising audiences count only people whose consent allows it.
   · Anyone can see their own profile (op=profile) and erase it (op=forget).
   ══════════════════════════════════════════════════════════════════════ */
import { select, insert, update as dbUpdate } from './_db.js';
import { authenticatedUser, consumeRateLimit, requestIp, setCors } from './_security.js';
import { resolvePlace, slugify } from './_places.js';
import { parseQuery } from './_search-terms.js';
import { keyOf, priceUsd, inPlace, FAMILY_KIND, KIND_SERVICE } from './_catalogue.js';
import { img, priceLine } from './_seo-render.js';

const DAY = 86400000;
export const HALF_LIFE_DAYS = 30;

export const EVENT_TYPES = new Set([
  'page_view', 'entity_view', 'hub_view', 'search', 'filter', 'save', 'unsave', 'share', 'dwell',
  'checkout_start', 'booking', 'apa_message', 'list_start', 'signup', 'login', 'click',
]);

/* What each act says about intent. */
const WEIGHT = {
  page_view: 0.15, hub_view: 0.6, entity_view: 1, search: 1.2, filter: 0.5, dwell: 0, click: 0.2,
  save: 2.5, unsave: -1.5, share: 2, checkout_start: 4, booking: 6, apa_message: 0.8, list_start: 2,
};
/* Funnel stage per act, 0–100. Intent is the highest recent stage,
   decayed by age, plus a little for sustained activity. */
const STAGE = {
  page_view: 6, hub_view: 15, entity_view: 28, search: 32, filter: 30, save: 58, share: 50,
  checkout_start: 85, booking: 100, apa_message: 35, dwell: 30, list_start: 40, click: 8,
};

/* Pages that imply a service when no entity says so. */
const PAGE_SERVICE = [
  [/^\/(apartments|stay\/|[a-z0-9-]+-apartments)/, 'stays'], [/^\/(tours|tour\/|tours-catalogue|[a-z0-9-]+-safaris|kenya-safari)/, 'tours'],
  [/^\/(events|event\/|[a-z0-9-]+-events)/, 'events'], [/^\/(carhire|car\/|[a-z0-9-]+-car-hire)/, 'carhire'],
  [/^\/(rides|rider|[a-z0-9-]+-airport-transfers)/, 'rides'], [/^\/(food|restaurant|eat\/|[a-z0-9-]+-restaurants)/, 'food'],
  [/^\/(shopping|shop\/)/, 'shopping'], [/^\/(roommates|room\/|[a-z0-9-]+-rooms)/, 'roommates'], [/^\/flights/, 'flights'],
  [/^\/(become-partner|add-listing|list-property|become-driver|agents|partner)/, 'hosting'],
];
export function serviceForPath(path) {
  const p = String(path || '/');
  for (const [re, s] of PAGE_SERVICE) if (re.test(p)) return s;
  return null;
}

const COAST = new Set(['mombasa', 'diani', 'watamu', 'malindi', 'lamu', 'nyali', 'bamburi', 'kilifi', 'ukunda', 'zanzibar']);
const SAFARI = new Set(['maasai-mara', 'amboseli', 'tsavo', 'samburu', 'naivasha', 'nakuru', 'serengeti', 'arusha', 'nairobi-national-park']);

/* ── Small pure helpers ────────────────────────────────────────────── */

export function priceBand(usd) {
  if (!(usd > 0)) return null;
  if (usd < 20) return 'under-20';
  if (usd < 50) return '20-50';
  if (usd < 100) return '50-100';
  if (usd < 200) return '100-200';
  return '200-plus';
}

export function parseUA(ua = '') {
  const s = String(ua);
  return {
    device: /iPad|Tablet/i.test(s) ? 'tablet' : /Mobi|Android|iPhone/i.test(s) ? 'mobile' : 'desktop',
    os: /Android/i.test(s) ? 'Android' : /iPhone|iPad|iPod/i.test(s) ? 'iOS' : /Windows/i.test(s) ? 'Windows' : /Mac OS X|Macintosh/i.test(s) ? 'macOS' : /Linux/i.test(s) ? 'Linux' : 'Other',
    browser: /Edg\//.test(s) ? 'Edge' : /OPR\/|Opera/.test(s) ? 'Opera' : /SamsungBrowser/.test(s) ? 'Samsung' : /Chrome\//.test(s) ? 'Chrome' : /Safari\//.test(s) ? 'Safari' : /Firefox\//.test(s) ? 'Firefox' : 'Other',
    bot: /bot|crawl|spider|slurp|preview|headless|lighthouse|pagespeed/i.test(s),
  };
}

export function geoFromHeaders(h = {}) {
  const g = k => { const v = h[k]; return Array.isArray(v) ? v[0] : v; };
  const dec = v => { try { return v ? decodeURIComponent(String(v)) : null; } catch { return String(v); } };
  return {
    country: (g('x-vercel-ip-country') || '').toUpperCase().slice(0, 2) || null,
    region: dec(g('x-vercel-ip-country-region'))?.slice(0, 40) || null,
    city: dec(g('x-vercel-ip-city'))?.slice(0, 60) || null,
    timezone: dec(g('x-vercel-ip-timezone'))?.slice(0, 60) || null,
  };
}

const AFRICA = new Set('DZ AO BJ BW BF BI CV CM CF TD KM CG CD DJ EG GQ ER SZ ET GA GM GH GN GW CI KE LS LR LY MG MW ML MR MU MA MZ NA NE NG RW ST SN SC SL SO ZA SS SD TZ TG TN UG ZM ZW'.split(' '));

function decay(score, at, now) {
  const age = Math.max(0, now - (at || now)) / DAY;
  return score * Math.pow(0.5, age / HALF_LIFE_DAYS);
}

export function affinityNow(aff, now = Date.now()) {
  const out = {};
  for (const [k, v] of Object.entries(aff || {})) {
    if (!Array.isArray(v)) continue;
    const s = decay(Number(v[0]) || 0, Number(v[1]) || now, now);
    if (s > 0.02) out[k] = s;
  }
  return out;
}

function bump(aff, key, w, now) {
  if (!key || !w) return;
  const cur = aff[key];
  const base = cur ? decay(Number(cur[0]) || 0, Number(cur[1]) || now, now) : 0;
  const next = Math.max(0, base + w);
  if (next < 0.02) delete aff[key];
  else aff[key] = [Math.round(next * 1000) / 1000, now];
}

function top(aff, prefix, n = 1) {
  return Object.entries(aff).filter(([k]) => k.startsWith(prefix)).sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, v]) => [k.slice(prefix.length), v]);
}

const ema = (prev, x, a = 0.3) => (prev == null || !Number.isFinite(prev) ? x : prev + a * (x - prev));

/* ── The fold: a profile plus some events is a new profile ─────────── */

/**
 * Pure. `events` have already been validated and enriched
 * ({ type, at, service, kind, key, place: {area, city, country}, price_usd, ... }).
 */
export function fold(profile, events, ctx = {}, now = Date.now()) {
  const p = {
    affinity: { ...(profile.affinity || {}) },
    stats: JSON.parse(JSON.stringify(profile.stats || {})),
    recent: Array.isArray(profile.recent) ? [...profile.recent] : [],
    events: Number(profile.events) || 0,
    sessions: Number(profile.sessions) || 0,
    first_seen: profile.first_seen || new Date(now).toISOString(),
  };
  const st = p.stats;
  st.hours = Array.isArray(st.hours) && st.hours.length === 24 ? st.hours : new Array(24).fill(0);
  st.dow = Array.isArray(st.dow) && st.dow.length === 7 ? st.dow : new Array(7).fill(0);
  st.stage = Array.isArray(st.stage) ? st.stage : [];
  st.bookings = Number(st.bookings) || 0;
  st.searches = Number(st.searches) || 0;
  st.views = Number(st.views) || 0;
  st.saves = Number(st.saves) || 0;

  if (ctx.session && ctx.session !== st.last_session) { p.sessions += 1; st.last_session = ctx.session; }

  const tz = ctx.timezone || 'Africa/Nairobi';
  for (const e of events) {
    const at = Math.min(now, Number(e.at) || now);
    const w = WEIGHT[e.type] ?? 0.1;
    p.events += 1;

    try {
      const parts = new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: 'numeric', weekday: 'short', hour12: false }).formatToParts(new Date(at));
      const h = Number(parts.find(x => x.type === 'hour')?.value) % 24;
      const wd = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(parts.find(x => x.type === 'weekday')?.value);
      if (h >= 0) st.hours[h] += 1;
      if (wd >= 0) st.dow[wd] += 1;
    } catch { /* an odd timezone header costs one hour bucket */ }

    if (e.service) bump(p.affinity, 'svc:' + e.service, w, now);
    if (e.kind) bump(p.affinity, 'kind:' + e.kind, w * 0.5, now);
    const pl = e.place || {};
    if (pl.area) bump(p.affinity, 'place:' + pl.area, w, now);
    if (pl.city) bump(p.affinity, 'city:' + pl.city, w * 0.7, now);
    if (pl.country) bump(p.affinity, 'country:' + pl.country, w * 0.35, now);
    if (e.price_usd > 0) {
      bump(p.affinity, 'price:' + priceBand(e.price_usd), w * 0.6, now);
      if (w > 0) st.price_usd = Math.round(ema(st.price_usd, e.price_usd) * 100) / 100;
    }
    if (e.type_label) bump(p.affinity, 'type:' + slugify(e.type_label), w * 0.4, now);
    for (const a of (e.amenities || []).slice(0, 8)) bump(p.affinity, 'amen:' + slugify(a), w * 0.12, now);
    if (e.guests > 0 && ['search', 'checkout_start', 'booking'].includes(e.type)) st.party = Math.round(ema(st.party, Math.min(30, e.guests)) * 10) / 10;
    if (e.bedrooms > 0 && ['search', 'save', 'checkout_start'].includes(e.type)) st.beds = Math.round(ema(st.beds, e.bedrooms) * 10) / 10;
    if (e.lead_days != null && e.lead_days >= 0 && e.lead_days < 400) st.lead_days = Math.round(ema(st.lead_days, e.lead_days));
    if (e.nights > 0 && e.nights < 120) st.nights = Math.round(ema(st.nights, e.nights) * 10) / 10;
    if (e.type === 'search') { st.searches += 1; if (e.q) st.last_query = String(e.q).slice(0, 80); }
    if (e.type === 'entity_view') st.views += 1;
    if (e.type === 'save') st.saves += 1;
    if (e.type === 'booking') { st.bookings += 1; st.last_booking = new Date(at).toISOString(); }
    if (e.service === 'hosting') bump(p.affinity, 'svc:hosting', 0.5, now);

    if (STAGE[e.type]) {
      st.stage.push([STAGE[e.type] + (e.type === 'search' && e.lead_days != null ? 13 : 0), at]);
      if (st.stage.length > 40) st.stage = st.stage.slice(-40);
    }

    if (e.key && e.kind && ['entity_view', 'save', 'share', 'checkout_start', 'booking'].includes(e.type)) {
      const id = e.kind + ':' + e.key;
      p.recent = p.recent.filter(r => r.id !== id);
      p.recent.unshift({ id, t: String(e.title || '').slice(0, 90), path: e.path || null, at, type: e.type });
      if (p.recent.length > 24) p.recent.length = 24;
    }
  }

  const aff = affinityNow(p.affinity, now);
  const traits = deriveTraits(aff, st, ctx, p);
  const intent = intentOf(st, now);
  const out = {
    ...p,
    affinity: p.affinity,
    stats: st,
    traits,
    intent,
  };
  out.lifecycle = lifecycleOf(out, now);
  out.segments = segmentsOf({ ...out, aff, device: ctx.device, pwa: ctx.pwa, consent: profile.consent, origin: traits.origin });
  return out;
}

export function deriveTraits(aff, st, ctx = {}, p = {}) {
  const t = {};
  const svc = top(aff, 'svc:', 3).filter(([s]) => s !== 'hosting');
  if (svc.length) { t.top_service = svc[0][0]; t.services = svc.map(([s]) => s); }
  const area = top(aff, 'place:', 3), city = top(aff, 'city:', 3), country = top(aff, 'country:', 1);
  if (area.length) { t.top_place = area[0][0]; t.places = area.map(([s]) => s); }
  if (city.length) { t.top_city = city[0][0]; t.cities = city.map(([s]) => s); }
  if (country.length) t.top_country = country[0][0];
  if (st.price_usd > 0) { t.budget_usd = st.price_usd; t.budget_band = priceBand(st.price_usd); }
  if (st.party > 0) t.party = Math.round(st.party);

  /* Who they are travelling as, from what they search for. */
  const weekendShare = st.dow ? (st.dow[5] + st.dow[6] + st.dow[0]) / Math.max(1, st.dow.reduce((a, b) => a + b, 0)) : 0;
  const workspace = (aff['amen:workspace'] || 0) + (aff['amen:desk'] || 0) + (aff['amen:wifi'] || 0) * 0.3;
  if (t.party >= 3) t.purpose = 'family-or-group';
  else if (t.party === 2 && weekendShare >= 0.5) t.purpose = 'couple-getaway';
  else if (t.party === 1 && workspace > 0.6 && weekendShare < 0.4) t.purpose = 'business';
  else if ((aff['svc:events'] || 0) > (aff['svc:stays'] || 0) && (aff['svc:events'] || 0) > 1) t.purpose = 'nightlife-and-events';
  else if (t.top_place && (COAST.has(t.top_place) || COAST.has(t.top_city))) t.purpose = 'beach-holiday';
  else if (t.top_service === 'tours' || SAFARI.has(t.top_place)) t.purpose = 'safari-and-adventure';

  /* Local, regional or international, from where they are and where
     they are looking. A Londoner browsing Nairobi is a different guest,
     and a different advertiser audience, from a Nairobian doing the same. */
  const from = (ctx.country || '').toUpperCase();
  const toIso = t.top_country === 'kenya' ? 'KE' : t.top_country ? (resolvePlace({ country: t.top_country }).country?.iso || '') : '';
  if (from) {
    if (toIso && from === toIso) t.origin = 'local';
    else if (!toIso && from === 'KE') t.origin = 'local';
    else if (AFRICA.has(from)) t.origin = 'regional';
    else t.origin = 'international';
  }
  if (st.lead_days != null) t.planner = st.lead_days <= 3 ? 'last-minute' : st.lead_days <= 21 ? 'short-lead' : 'long-lead';
  if (st.nights > 0) t.stay_length = st.nights >= 14 ? 'long-stay' : st.nights >= 4 ? 'week' : 'short-break';
  const hours = st.hours || [];
  const total = hours.reduce((a, b) => a + b, 0);
  if (total >= 6) {
    const late = [22, 23, 0, 1, 2, 3, 4].reduce((a, h) => a + (hours[h] || 0), 0) / total;
    const peak = hours.indexOf(Math.max(...hours));
    t.active_hour = peak;
    if (late >= 0.4) t.rhythm = 'night-owl';
    else if (peak < 11) t.rhythm = 'morning';
    else if (peak < 17) t.rhythm = 'daytime';
    else t.rhythm = 'evening';
  }
  if (weekendShare >= 0.6 && total >= 6) t.weekend_planner = true;
  if ((aff['svc:hosting'] || 0) >= 0.5) t.host_prospect = true;
  return t;
}

export function intentOf(st, now = Date.now()) {
  const stages = Array.isArray(st?.stage) ? st.stage : [];
  let best = 0;
  for (const [s, at] of stages) {
    const age = Math.max(0, now - at) / DAY;
    best = Math.max(best, s * Math.exp(-age / 7));
  }
  const recent = stages.filter(([, at]) => now - at < 3 * DAY).length;
  return Math.max(0, Math.min(100, Math.round(best + Math.min(12, recent * 1.5))));
}

export function lifecycleOf(p, now = Date.now()) {
  const st = p.stats || {};
  if ((st.bookings || 0) >= 2) return 'loyal';
  if ((st.bookings || 0) >= 1) {
    const last = st.last_booking ? new Date(st.last_booking).getTime() : 0;
    return last && now - last > 120 * DAY ? 'lapsed-customer' : 'customer';
  }
  if (p.intent >= 75) return 'ready';
  if (p.intent >= 45) return 'considering';
  if ((p.events || 0) < 4 && (p.sessions || 0) <= 1) return 'new';
  return 'exploring';
}

/* ── Audiences ─────────────────────────────────────────────────────── */

export const SEGMENTS = [
  { id: 'ready-to-book', label: 'Ready to book', category: 'intent', why: 'Started checkout, saved or searched with dates in the last few days.', test: p => p.intent >= 70 },
  { id: 'considering', label: 'Actively considering', category: 'intent', why: 'Comparing places over several visits.', test: p => p.intent >= 45 && p.intent < 70 },
  { id: 'stay-seekers', label: 'Looking for a stay', category: 'service', why: 'Strong, recent interest in apartments and stays.', test: p => (p.aff['svc:stays'] || 0) >= 2 },
  { id: 'safari-planners', label: 'Safari and tour planners', category: 'service', why: 'Browsing tours, safaris or safari destinations.', test: p => (p.aff['svc:tours'] || 0) >= 1.5 || [...SAFARI].some(s => (p.aff['place:' + s] || 0) >= 1) },
  { id: 'event-goers', label: 'Event-goers', category: 'service', why: 'Following events and tickets.', test: p => (p.aff['svc:events'] || 0) >= 1.5 },
  { id: 'car-hire-intenders', label: 'Car hire intenders', category: 'service', why: 'Looking at cars to hire.', test: p => (p.aff['svc:carhire'] || 0) >= 1.5 },
  { id: 'foodies', label: 'Food lovers', category: 'service', why: 'Ordering or browsing restaurants.', test: p => (p.aff['svc:food'] || 0) >= 1.5 },
  { id: 'room-hunters', label: 'Room hunters', category: 'service', why: 'Looking for a room to rent.', test: p => (p.aff['svc:roommates'] || 0) >= 1.5 },
  { id: 'coast-holidaymakers', label: 'Coast holidaymakers', category: 'place', why: 'Interest in Mombasa, Diani, Watamu, Malindi, Lamu or Zanzibar.', test: p => [...COAST].reduce((a, c) => a + (p.aff['place:' + c] || 0) + (p.aff['city:' + c] || 0), 0) >= 1.5 },
  { id: 'nairobi-explorers', label: 'Nairobi explorers', category: 'place', why: 'Most of their interest is in Nairobi.', test: p => (p.aff['city:nairobi'] || 0) >= 2 },
  { id: 'international-visitors', label: 'International visitors', category: 'origin', why: 'Browsing from outside Africa.', test: p => p.origin === 'international' },
  { id: 'regional-travellers', label: 'Regional travellers', category: 'origin', why: 'Browsing from another African country.', test: p => p.origin === 'regional' },
  { id: 'locals', label: 'Locals', category: 'origin', why: 'Browsing places in their own country.', test: p => p.origin === 'local' },
  { id: 'budget-travellers', label: 'Budget travellers', category: 'budget', why: 'Typically browse under US$30 a night.', test: p => p.stats.price_usd > 0 && p.stats.price_usd < 30 },
  { id: 'premium-travellers', label: 'Premium travellers', category: 'budget', why: 'Typically browse over US$100 a night.', test: p => p.stats.price_usd >= 100 },
  { id: 'families-and-groups', label: 'Families and groups', category: 'party', why: 'Search for three or more guests.', test: p => p.traits.party >= 3 },
  { id: 'couples', label: 'Couples', category: 'party', why: 'Search for two guests.', test: p => p.traits.party === 2 },
  { id: 'business-travellers', label: 'Business travellers', category: 'purpose', why: 'Solo, weekday, workspace-minded.', test: p => p.traits.purpose === 'business' },
  { id: 'weekend-planners', label: 'Weekend planners', category: 'habit', why: 'Most of their activity is Friday to Sunday.', test: p => !!p.traits.weekend_planner },
  { id: 'last-minute', label: 'Last-minute bookers', category: 'habit', why: 'Search for dates within three days.', test: p => p.traits.planner === 'last-minute' },
  { id: 'night-owls', label: 'Night owls', category: 'habit', why: 'Mostly active late at night.', test: p => p.traits.rhythm === 'night-owl' },
  { id: 'mobile-first', label: 'Mobile-first', category: 'device', why: 'Use Cabana on a phone.', test: p => p.device === 'mobile' },
  { id: 'app-users', label: 'App users', category: 'device', why: 'Use the installed Cabana app.', test: p => !!p.pwa },
  { id: 'returning-visitors', label: 'Returning visitors', category: 'loyalty', why: 'Three or more visits.', test: p => p.sessions >= 3 },
  { id: 'customers', label: 'Customers', category: 'loyalty', why: 'Have booked on Cabana.', test: p => (p.stats.bookings || 0) >= 1 },
  /* Not an advertising audience: an onboarding list for the partner team. */
  { id: 'host-prospects', label: 'Host prospects', category: 'supply', why: 'Looked at listing, hosting or partner pages.', internal: true, test: p => !!p.traits.host_prospect },
];

export function segmentsOf(p) {
  const view = { ...p, aff: p.aff || affinityNow(p.affinity), stats: p.stats || {}, traits: p.traits || {}, intent: p.intent || 0 };
  return SEGMENTS.filter(s => { try { return s.test(view); } catch { return false; } }).map(s => s.id);
}

/* ── Merging two profiles (a visitor signs in) ─────────────────────── */

export function mergeProfiles(into, from, now = Date.now()) {
  const aff = { ...(into.affinity || {}) };
  for (const [k, v] of Object.entries(from.affinity || {})) {
    if (!Array.isArray(v)) continue;
    const s = decay(Number(v[0]) || 0, Number(v[1]) || now, now);
    bump(aff, k, s, now);
  }
  const a = into.stats || {}, b = from.stats || {};
  const sum = k => (Number(a[k]) || 0) + (Number(b[k]) || 0);
  const pick = k => a[k] ?? b[k];
  const stats = {
    ...b, ...a,
    hours: (a.hours || new Array(24).fill(0)).map((x, i) => x + ((b.hours || [])[i] || 0)),
    dow: (a.dow || new Array(7).fill(0)).map((x, i) => x + ((b.dow || [])[i] || 0)),
    stage: [...(a.stage || []), ...(b.stage || [])].sort((x, y) => x[1] - y[1]).slice(-40),
    bookings: sum('bookings'), searches: sum('searches'), views: sum('views'), saves: sum('saves'),
    price_usd: pick('price_usd'), party: pick('party'), lead_days: pick('lead_days'), nights: pick('nights'),
  };
  const seen = new Set();
  const recent = [...(into.recent || []), ...(from.recent || [])].sort((x, y) => (y.at || 0) - (x.at || 0))
    .filter(r => (seen.has(r.id) ? false : (seen.add(r.id), true))).slice(0, 24);
  return {
    affinity: aff, stats, recent,
    events: (Number(into.events) || 0) + (Number(from.events) || 0),
    sessions: (Number(into.sessions) || 0) + (Number(from.sessions) || 0),
    first_seen: [into.first_seen, from.first_seen].filter(Boolean).sort()[0] || new Date(now).toISOString(),
    aliases: [...new Set([...(into.aliases || []), ...(from.aliases || []), from.visitor_id].filter(Boolean))].slice(-20),
  };
}

/* ── For you ───────────────────────────────────────────────────────── */

function priceFit(item, budgetUsd) {
  const usd = priceUsd(item);
  if (!(usd > 0) || !(budgetUsd > 0)) return 0.5;
  const r = Math.log(usd / budgetUsd);
  return Math.exp(-(r * r) / (2 * 0.45 * 0.45));
}

export function scoreItem(item, aff, st = {}, ctx = {}, now = Date.now()) {
  const svcMax = Math.max(1, ...Object.entries(aff).filter(([k]) => k.startsWith('svc:')).map(([, v]) => v));
  const placeMax = Math.max(1, ...Object.entries(aff).filter(([k]) => /^(place|city):/.test(k)).map(([, v]) => v));
  const p = item.place || {};
  const svc = (aff['svc:' + item.service] || 0) / svcMax;
  const place = ((p.area ? aff['place:' + p.area.id] || 0 : 0) + (p.city ? (aff['city:' + p.city.id] || 0) * 0.7 : 0) +
                 (p.country ? (aff['country:' + p.country.id] || 0) * 0.3 : 0)) / placeMax;
  const amen = Math.min(1, item.amenities.reduce((a, x) => a + (aff['amen:' + slugify(x)] || 0), 0) / 3);
  const type = item.type ? Math.min(1, (aff['type:' + slugify(item.type)] || 0) / 2) : 0;
  const fresh = item.created_at && now - new Date(item.created_at).getTime() < 14 * DAY ? 1 : 0;
  const near = ctx.geoCountryIso && p.country?.iso === ctx.geoCountryIso ? 1 : 0;
  const quality = (item.quality?.score || 50) / 100;
  const social = Math.min(1, (item.reviews || 0) / 10) * ((item.rating || 4) / 5);
  const guests = st.party > 0 && item.guests > 0 ? (item.guests >= st.party ? 1 : 0.2) : 0.6;
  return 2.2 * svc + 2.4 * place + 1.4 * priceFit(item, st.price_usd) + 0.5 * amen + 0.4 * type +
         0.6 * guests + 0.5 * quality + 0.4 * social + 0.35 * fresh + 0.3 * near + (item.featured ? 0.25 : 0);
}

/* Maximal marginal relevance: the second pick is the best one that is
   not just another flat on the same street as the first. */
export function diversify(scored, limit) {
  const out = [];
  const pool = [...scored];
  while (out.length < limit && pool.length) {
    let bi = 0, bv = -Infinity;
    for (let i = 0; i < pool.length; i++) {
      const c = pool[i];
      const sameSvc = out.filter(o => o.item.service === c.item.service).length;
      const samePlace = out.filter(o => (o.item.place?.area?.id || o.item.place?.city?.id) === (c.item.place?.area?.id || c.item.place?.city?.id)).length;
      const v = c.s - 0.35 * samePlace - 0.15 * sameSvc;
      if (v > bv) { bv = v; bi = i; }
    }
    out.push(pool.splice(bi, 1)[0]);
  }
  return out.map(x => x.item);
}

export function card(item) {
  return {
    kind: item.kind, path: item.path, title: item.title, location: item.location, type: item.type,
    price: item.price > 0 ? priceLine(item) : null, photo: item.photos[0] ? img(item.photos[0], 480, 360) : null,
    rating: item.reviews > 0 ? item.rating : null, isNew: !!(item.created_at && Date.now() - new Date(item.created_at).getTime() < 14 * DAY),
  };
}

export function rankForYou(profile, items, { service, limit = 8, geoCountryIso = null, now = Date.now() } = {}) {
  const aff = affinityNow(profile?.affinity || {}, now);
  const st = profile?.stats || {};
  const signal = Object.keys(aff).length > 0;
  const live = items.filter(i => (!service || i.service === service) && (i.price > 0 || i.kind === 'event'));
  const recentIds = new Set((profile?.recent || []).map(r => r.id));
  const byId = new Map(live.map(i => [i.kind + ':' + i.key, i]));

  const cont = (profile?.recent || []).filter(r => now - (r.at || 0) < 21 * DAY).map(r => byId.get(r.id)).filter(Boolean).slice(0, 4);
  const scored = live.filter(i => !recentIds.has(i.kind + ':' + i.key)).map(item => ({ item, s: scoreItem(item, aff, st, { geoCountryIso }, now) }))
    .sort((a, b) => b.s - a.s);
  const picks = diversify(scored, limit);

  const topPlace = top(aff, 'place:', 1)[0]?.[0] || top(aff, 'city:', 1)[0]?.[0];
  const placeName = topPlace ? (live.find(i => inPlace(i, topPlace))?.place?.area?.id === topPlace
    ? live.find(i => inPlace(i, topPlace)).place.area.name
    : live.find(i => inPlace(i, topPlace))?.place?.city?.name) : null;

  const sections = [];
  if (cont.length) sections.push({ id: 'continue', title: 'Pick up where you left off', items: cont.map(card) });
  if (picks.length) sections.push({ id: 'picks', title: signal ? (placeName ? `Picked for you in ${placeName}` : 'Picked for you') : 'Popular on Cabana right now', items: picks.map(card) });
  const fresh = live.filter(i => i.created_at && now - new Date(i.created_at).getTime() < 14 * DAY && !picks.includes(i)).slice(0, 6);
  if (fresh.length) sections.push({ id: 'new', title: 'New on Cabana', items: fresh.map(card) });
  return { personalised: signal, sections };
}

/* ── What APA is told ──────────────────────────────────────────────── */

const SERVICE_WORD = { stays: 'stays', tours: 'tours and safaris', events: 'events', carhire: 'car hire', food: 'food', roommates: 'rooms to rent', shopping: 'shopping', rides: 'rides', flights: 'flights' };

export function profileSummary(profile, items = [], now = Date.now()) {
  if (!profile || profile.opted_out) return '';
  const t = profile.traits || {};
  const bits = [];
  if (t.services?.length) bits.push(`mostly browses ${t.services.map(s => SERVICE_WORD[s] || s).join(', then ')}`);
  const placeName = id => items.find(i => inPlace(i, id))?.place && [items.find(i => inPlace(i, id)).place.area, items.find(i => inPlace(i, id)).place.city].find(x => x?.id === id)?.name || id.replace(/-/g, ' ');
  if (t.places?.length) bits.push(`keeps coming back to ${t.places.slice(0, 3).map(placeName).join(', ')}`);
  else if (t.cities?.length) bits.push(`interested in ${t.cities.slice(0, 2).map(placeName).join(' and ')}`);
  if (t.budget_usd > 0) bits.push(`usually looks at around US$${Math.round(t.budget_usd)} a night`);
  if (t.party > 0) bits.push(`searches for ${t.party} ${t.party === 1 ? 'person' : 'people'}`);
  if (t.purpose) bits.push(`looks like a ${t.purpose.replace(/-/g, ' ')} trip`);
  if (t.origin) bits.push(t.origin === 'international' ? 'browsing from abroad' : t.origin === 'regional' ? 'browsing from elsewhere in Africa' : 'a local');
  if (t.planner === 'last-minute') bits.push('books last-minute');
  const recent = (profile.recent || []).filter(r => now - (r.at || 0) < 14 * DAY).slice(0, 3)
    .map(r => `${r.t}${r.type === 'save' ? ' (saved)' : r.type === 'checkout_start' ? ' (started checkout)' : ''}${r.path ? ` [${r.path}]` : ''}`);
  if (!bits.length && !recent.length) return '';
  return 'WHAT THEIR BROWSING SHOWS (observed on Cabana, not told to you — use it to tailor quietly, never recite it, never say you tracked them; if they ask what Cabana knows about them, be straightforward and point them to /privacy):\n' +
    (bits.length ? `  · ${bits.join('; ')}.\n` : '') +
    (recent.length ? `  · Recently looked at: ${recent.join('; ')}.\n` : '') +
    `  · Stage: ${profile.lifecycle || 'exploring'} (intent ${profile.intent || 0}/100).`;
}

/* ── Storage ───────────────────────────────────────────────────────── */

const VISITOR = /^[A-Za-z0-9_-]{8,64}$/;

export async function loadProfile({ visitorId, userId }) {
  if (userId) {
    const byUser = await select('compass_profiles', `user_id=eq.${userId}&select=*&limit=1`).catch(() => []);
    if (byUser?.[0]) return byUser[0];
  }
  if (visitorId && VISITOR.test(visitorId)) {
    const byVisitor = await select('compass_profiles', `visitor_id=eq.${encodeURIComponent(visitorId)}&select=*&limit=1`).catch(() => []);
    if (byVisitor?.[0]) return byVisitor[0];
    const byAlias = await select('compass_profiles', `aliases=cs.${encodeURIComponent('{' + visitorId + '}')}&select=*&limit=1`).catch(() => []);
    if (byAlias?.[0]) return byAlias[0];
  }
  return null;
}

async function saveProfile(existing, next) {
  const patch = {
    affinity: next.affinity, stats: next.stats, recent: next.recent, traits: next.traits, intent: next.intent,
    lifecycle: next.lifecycle, segments: next.segments, events: next.events, sessions: next.sessions,
    last_seen: new Date().toISOString(), updated_at: new Date().toISOString(),
    ...(next.ctx || {}), version: (Number(existing.version) || 0) + 1,
    ...(next.aliases ? { aliases: next.aliases } : {}),
    ...(next.user_id ? { user_id: next.user_id } : {}),
  };
  return dbUpdate('compass_profiles', `id=eq.${existing.id}&version=eq.${Number(existing.version) || 0}`, patch);
}

/* ── Enrichment: an event that only says "viewed stay 2d488e1a" is made
   whole from the catalogue, so the browser never has to know prices. ── */

export function enrich(raw, items, page) {
  const type = String(raw.t || raw.type || '');
  if (!EVENT_TYPES.has(type)) return null;
  const d = raw.d && typeof raw.d === 'object' ? raw.d : {};
  const e = { type, at: Number(raw.at) || Date.now() };
  const kind = FAMILY_KIND[d.family] || (KIND_SERVICE[d.kind] ? d.kind : null);
  const key = d.key ? String(d.key).toLowerCase().slice(0, 15) : d.id ? keyOf(d.id) : '';
  const item = kind && key ? items.find(i => i.kind === kind && i.key === key) : (key ? items.find(i => i.key === key) : null);
  if (item) {
    Object.assign(e, {
      kind: item.kind, key: item.key, service: item.service, title: item.title, path: item.path,
      place: { area: item.place?.area?.id || null, city: item.place?.city?.id || null, country: item.place?.country?.id || null },
      price_usd: priceUsd(item), amenities: item.amenities.slice(0, 8), type_label: item.type, bedrooms: item.bedrooms, guests_cap: item.guests,
    });
  } else {
    e.service = d.service && typeof d.service === 'string' ? d.service.slice(0, 20) : serviceForPath(d.path || page);
    if (kind) e.kind = kind;
  }
  if (type === 'search' || type === 'filter') {
    /* What they typed, read the way they meant it: "airbnb diani for 4"
       is a stay, in Diani, for four, whichever page the box was on. */
    const ask = parseQuery(d.q || '');
    if (!item && ask.service && !d.service) e.service = ask.service;
    const placeText = String(d.place || ask.words.join(' ') || d.q || '').slice(0, 80);
    const r = placeText ? resolvePlace({ area: placeText, city: placeText }) : null;
    if (r?.key && !r.area?.synthetic && !r.city?.synthetic) e.place = { area: r.area?.id || null, city: r.city?.id || null, country: r.country?.id || null };
    e.q = String(d.q || '').slice(0, 80) || null;
    const g = Number(d.guests) || ask.guests; if (g > 0 && g < 40) e.guests = g;
    const b = Number(d.beds) || ask.beds; if (b > 0 && b < 20) e.bedrooms = b;
    const ci = Date.parse(d.checkin || ''), co = Date.parse(d.checkout || '');
    if (Number.isFinite(ci)) e.lead_days = Math.round((ci - Date.now()) / DAY);
    if (Number.isFinite(ci) && Number.isFinite(co) && co > ci) e.nights = Math.round((co - ci) / DAY);
    const max = Number(d.max_price) || ask.maxPrice; if (max > 0) e.price_usd = Math.round(max * 0.0077 * 100) / 100;
  }
  if ((type === 'checkout_start' || type === 'booking') && Number(d.guests) > 0) e.guests = Number(d.guests);
  if (type === 'hub_view' && d.place) e.place = { area: String(d.place).slice(0, 60), city: null, country: null };
  if (type === 'dwell') e.seconds = Math.max(0, Math.min(3600, Number(d.seconds) || 0));
  e.page = String(d.path || page || '').slice(0, 120);
  return e;
}

/* ── Handlers ──────────────────────────────────────────────────────── */

function body(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  try { return JSON.parse(req.body || '{}'); } catch { return {}; }
}

export async function ingest(req, res, { catalogue }) {
  setCors(req, res, 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  res.setHeader('Cache-Control', 'no-store');
  const b = body(req);
  const visitorId = String(b.v || '');
  if (!VISITOR.test(visitorId)) return res.status(400).json({ error: 'visitor_required' });
  if (!consumeRateLimit(req, res, 'compass', 90, 60_000, visitorId)) return;
  if (!consumeRateLimit(req, res, 'compass-ip', 600, 60_000, requestIp(req))) return;

  const ua = parseUA(req.headers?.['user-agent']);
  if (ua.bot) return res.status(202).json({ ok: true, skipped: 'bot' });
  if (req.headers?.dnt === '1' && !b.consent) return res.status(202).json({ ok: true, skipped: 'dnt' });

  const geo = geoFromHeaders(req.headers || {});
  const user = b.identify ? await authenticatedUser(req).catch(() => null) : null;
  const cat = await catalogue.get().catch(() => ({ items: [] }));
  const events = (Array.isArray(b.events) ? b.events : []).slice(0, 40).map(e => enrich(e, cat.items, b.page)).filter(Boolean);

  let profile = await loadProfile({ visitorId, userId: user?.id });
  if (profile?.opted_out) {
    /* Only an explicit choice turns collection back on. */
    if (b.consent?.analytics !== true) return res.status(202).json({ ok: true, skipped: 'opted_out' });
    await dbUpdate('compass_profiles', `id=eq.${profile.id}`, { opted_out: false }).catch(() => {});
    profile.opted_out = false;
  }

  /* A visitor whose browser id belongs to another profile that this
     sign-in now owns: fold the anonymous one into the member one. */
  if (user?.id && profile && !profile.user_id) {
    const owned = await select('compass_profiles', `user_id=eq.${user.id}&select=*&limit=1`).catch(() => []);
    if (owned?.[0] && owned[0].id !== profile.id) {
      const merged = mergeProfiles(owned[0], profile);
      await dbUpdate('compass_profiles', `id=eq.${owned[0].id}`, { ...merged, updated_at: new Date().toISOString(), version: (owned[0].version || 0) + 1 }).catch(() => {});
      await dbUpdate('compass_events', `profile_id=eq.${profile.id}`, { profile_id: owned[0].id }).catch(() => {});
      await fetchDelete(profile.id);
      profile = { ...owned[0], ...merged };
    }
  }

  const consent = b.consent && typeof b.consent === 'object'
    ? { analytics: b.consent.analytics !== false, personalization: b.consent.personalization !== false, ads: b.consent.ads === true && !b.gpc }
    : null;

  if (!profile) {
    profile = await insert('compass_profiles', {
      visitor_id: visitorId, user_id: user?.id || null, aliases: [visitorId],
      ...(consent ? { consent } : b.gpc ? { consent: { analytics: true, personalization: true, ads: false } } : {}),
    }).catch(async () => loadProfile({ visitorId, userId: user?.id }));
    if (!profile) return res.status(503).json({ error: 'profile_unavailable' });
  }

  const ctx = {
    session: String(b.s || '').slice(0, 64) || null, timezone: b.ctx?.tz || geo.timezone || 'Africa/Nairobi',
    country: geo.country, device: ua.device, pwa: !!b.ctx?.pwa,
  };
  const now = Date.now();
  let next = fold(profile, events, ctx, now);
  next.ctx = {
    country: geo.country || profile.country, region: geo.region || profile.region, city: geo.city || profile.city,
    timezone: ctx.timezone, language: String(b.ctx?.lang || profile.language || '').slice(0, 16) || null,
    device: ua.device, os: ua.os, browser: ua.browser, origin: next.traits.origin || profile.origin || null,
    ...(consent ? { consent } : b.gpc && profile.consent?.ads ? { consent: { ...profile.consent, ads: false } } : {}),
  };
  if (user?.id) {
    next.user_id = user.id;
    next.aliases = [...new Set([...(profile.aliases || []), visitorId])].slice(-20);
  }

  let saved = await saveProfile(profile, next).catch(() => null);
  if (!saved) {
    /* Someone else folded into this profile between our read and write.
       Read again, fold again, once. */
    const fresh = await loadProfile({ visitorId, userId: user?.id });
    if (fresh) { next = { ...fold(fresh, events, ctx, now), ctx: next.ctx, user_id: next.user_id, aliases: next.aliases }; saved = await saveProfile(fresh, next).catch(() => null); profile = fresh; }
  }

  if (events.length) {
    await insert('compass_events', events.map(e => ({
      profile_id: profile.id, visitor_id: visitorId, user_id: user?.id || profile.user_id || null, session_id: ctx.session,
      type: e.type, kind: e.kind || null, entity_id: e.key || null, service: e.service || null,
      place: e.place?.area || e.place?.city || null, country: geo.country,
      props: Object.fromEntries(Object.entries({ q: e.q, guests: e.guests, nights: e.nights, lead: e.lead_days, usd: e.price_usd, page: e.page, s: e.seconds }).filter(([, v]) => v != null)),
      created_at: new Date(Math.min(now, e.at)).toISOString(),
    })), false).catch(err => console.warn('[compass:events]', err.message));
  }

  return res.status(200).json({ ok: true, lifecycle: next.lifecycle, intent: next.intent, segments: next.segments.filter(s => !SEGMENTS.find(x => x.id === s)?.internal) });
}

async function fetchDelete(id) {
  const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return;
  await fetch(`${url}/rest/v1/compass_profiles?id=eq.${id}`, { method: 'DELETE', headers: { apikey: key, Authorization: `Bearer ${key}` } }).catch(() => {});
}

export async function forYou(req, res, { catalogue }) {
  const p = req.query || {};
  const visitorId = String(p.v || '');
  const cat = await catalogue.get();
  const profile = VISITOR.test(visitorId) ? await loadProfile({ visitorId }).catch(() => null) : null;
  const usable = profile && !profile.opted_out && profile.consent?.personalization !== false ? profile : null;
  const svc = KIND_SERVICE[p.kind] || (Object.values(KIND_SERVICE).includes(p.service) ? p.service : null);
  const geo = geoFromHeaders(req.headers || {});
  const out = rankForYou(usable, cat.items, { service: svc, limit: Math.max(3, Math.min(12, Number(p.limit) || 8)), geoCountryIso: geo.country });
  res.setHeader('Cache-Control', usable ? 'private, no-store' : 'public, max-age=60, s-maxage=120');
  return res.status(200).json({ ok: true, ...out });
}

/* Transparency: anyone can see what Cabana has inferred about them. */
export async function ownProfile(req, res) {
  const visitorId = String((req.query || {}).v || '');
  if (!VISITOR.test(visitorId)) return res.status(400).json({ error: 'visitor_required' });
  res.setHeader('Cache-Control', 'no-store');
  const p = await loadProfile({ visitorId });
  if (!p) return res.status(200).json({ ok: true, profile: null });
  return res.status(200).json({ ok: true, profile: {
    since: p.first_seen, last_seen: p.last_seen, sessions: p.sessions, lifecycle: p.lifecycle, intent: p.intent,
    traits: p.traits, segments: (p.segments || []).map(id => SEGMENTS.find(s => s.id === id)).filter(Boolean).map(s => s.label),
    recent: (p.recent || []).slice(0, 10).map(r => ({ title: r.t, path: r.path })), consent: p.consent, opted_out: p.opted_out,
  } });
}

export async function forget(req, res) {
  setCors(req, res, 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  const b = body(req);
  const visitorId = String(b.v || '');
  if (!VISITOR.test(visitorId)) return res.status(400).json({ error: 'visitor_required' });
  if (!consumeRateLimit(req, res, 'compass-forget', 5, 60_000, visitorId)) return;
  const p = await loadProfile({ visitorId });
  if (p) {
    const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (url && key) {
      await fetch(`${url}/rest/v1/compass_events?profile_id=eq.${p.id}`, { method: 'DELETE', headers: { apikey: key, Authorization: `Bearer ${key}` } }).catch(() => {});
    }
    /* Keep a tombstone so this browser is never profiled again unless the
       person turns it back on. */
    await dbUpdate('compass_profiles', `id=eq.${p.id}`, {
      affinity: {}, stats: {}, recent: [], traits: {}, segments: [], intent: 0, lifecycle: 'new', opted_out: true,
      consent: { analytics: false, personalization: false, ads: false }, updated_at: new Date().toISOString(),
    }).catch(() => {});
  } else {
    await insert('compass_profiles', { visitor_id: visitorId, aliases: [visitorId], opted_out: true, consent: { analytics: false, personalization: false, ads: false } }, false).catch(() => {});
  }
  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json({ ok: true, forgotten: true });
}

export const __test = { WEIGHT, STAGE, decay, bump, top, priceFit };
