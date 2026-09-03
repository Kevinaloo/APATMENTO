/* Cabana Drive Africa · route intelligence endpoint.
   It accepts exact pickup and destination coordinates. AI enriches a route
   when available; the deterministic fallback is continent-wide, transparent
   and never substitutes an unrelated Kenyan corridor. */
import { generateStructuredJson } from './_ai-gateway.js';

const DRIVE_VALUES = ['2wd', 'awd', '4wd', '4wd_low'];
const KNOWN_ROUTES = [
  { key:'metro', label:'Nairobi & suburbs', from:{lat:-1.2921,lng:36.8219}, to:{lat:-1.2921,lng:36.8219}, km:60, duration_minutes:150, clearance_mm:115, drive:'2wd', range_km:120, surface:'Tarmac throughout', surface_mix:{paved:98,gravel:2,unsealed:0}, wet_penalty:0, fuel_multiplier:1.08, note:'City tarmac with speed bumps and occasional flooded underpasses.' },
  { key:'highway', label:'Nairobi → Mombasa', from:{lat:-1.2921,lng:36.8219}, to:{lat:-4.0435,lng:39.6682}, km:485, duration_minutes:570, clearance_mm:120, drive:'2wd', range_km:190, surface:'A109 tarmac with heavy truck traffic', surface_mix:{paved:98,gravel:2,unsealed:0}, wet_penalty:0, fuel_multiplier:1.08, note:'A long paved run where comfort, fatigue management and cruising range matter.' },
  { key:'riftvalley', label:'Nairobi → Naivasha / Nakuru', from:{lat:-1.2921,lng:36.8219}, to:{lat:-0.3031,lng:36.0800}, km:110, duration_minutes:150, clearance_mm:140, drive:'2wd', range_km:150, surface:'Paved highway with rough park approaches', surface_mix:{paved:88,gravel:10,unsealed:2}, wet_penalty:1, fuel_multiplier:1.10, note:'The highway is paved; lake and park approaches can be broken gravel.' },
  { key:'coast', label:'Mombasa → Diani', from:{lat:-4.0435,lng:39.6682}, to:{lat:-4.2796,lng:39.5947}, km:45, duration_minutes:105, clearance_mm:125, drive:'2wd', range_km:120, surface:'Paved road plus ferry and beach approaches', surface_mix:{paved:92,gravel:6,unsealed:2}, wet_penalty:0, fuel_multiplier:1.10, note:'Allow for ferry queues and avoid soft beach sand unless the operator permits it.' },
  { key:'amboseli', label:'Nairobi → Amboseli', from:{lat:-1.2921,lng:36.8219}, to:{lat:-2.6527,lng:37.2606}, km:240, duration_minutes:300, clearance_mm:165, drive:'2wd', range_km:220, surface:'Paved road then corrugated volcanic dust', surface_mix:{paved:72,gravel:20,unsealed:8}, wet_penalty:2, fuel_multiplier:1.17, note:'Washboard park roads punish low-clearance cars.' },
  { key:'mara', label:'Nairobi → Masai Mara', from:{lat:-1.2921,lng:36.8219}, to:{lat:-1.4931,lng:35.1439}, km:285, duration_minutes:360, clearance_mm:180, drive:'awd', range_km:260, surface:'Murram followed by black-cotton-soil tracks', surface_mix:{paved:55,gravel:25,unsealed:20}, wet_penalty:3, fuel_multiplier:1.24, note:'Black cotton soil can become impassable to two-wheel drive after heavy rain.' },
  { key:'tsavo', label:'Nairobi → Tsavo', from:{lat:-1.2921,lng:36.8219}, to:{lat:-3.0000,lng:38.6000}, km:330, duration_minutes:390, clearance_mm:180, drive:'awd', range_km:280, surface:'Laterite, rock shelves and sandy river beds', surface_mix:{paved:62,gravel:24,unsealed:14}, wet_penalty:2, fuel_multiplier:1.20, note:'Tyre condition and a second spare matter on remote park tracks.' },
  { key:'mtkenya', label:'Nairobi → Nanyuki / Mount Kenya', from:{lat:-1.2921,lng:36.8219}, to:{lat:0.0064,lng:37.0722}, km:200, duration_minutes:255, clearance_mm:160, drive:'awd', range_km:180, surface:'Paved road to town then steep forest tracks', surface_mix:{paved:82,gravel:12,unsealed:6}, wet_penalty:2, fuel_multiplier:1.14, note:'The final gate approach is usually the demanding section.' },
  { key:'samburu', label:'Nairobi → Samburu', from:{lat:-1.2921,lng:36.8219}, to:{lat:0.6000,lng:37.5000}, km:350, duration_minutes:420, clearance_mm:195, drive:'4wd', range_km:320, surface:'Rough gravel with long remote sections', surface_mix:{paved:58,gravel:28,unsealed:14}, wet_penalty:3, fuel_multiplier:1.23, note:'Travel in daylight and fill at every reliable fuel stop.' },
  { key:'turkana', label:'Nairobi → Turkana / Marsabit', from:{lat:-1.2921,lng:36.8219}, to:{lat:3.5000,lng:36.0000}, km:780, duration_minutes:900, clearance_mm:205, drive:'4wd_low', range_km:420, surface:'Lava, sand and severe corrugation', surface_mix:{paved:35,gravel:35,unsealed:30}, wet_penalty:3, fuel_multiplier:1.34, note:'Expedition preparation, low range and recovery equipment are essential.' }
];

const cache = new Map();
const CACHE_MAX = 500;
const AI_BUDGET_MS = 7000;

function haversineKm(a, b) {
  const R = 6371, rad = value => value * Math.PI / 180;
  const dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng);
  const value = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

function validPoint(point) {
  return point && Number.isFinite(point.lat) && Number.isFinite(point.lng)
    && point.lat >= -90 && point.lat <= 90 && point.lng >= -180 && point.lng <= 180;
}

function nearestKnown(lat, lng) {
  let route = null, distanceKm = Infinity;
  for (const candidate of KNOWN_ROUTES) {
    const distance = haversineKm({ lat, lng }, candidate.to);
    if (distance < distanceKm) { distanceKm = distance; route = candidate; }
  }
  return { route, distanceKm:Math.round(distanceKm) };
}

function matchKnownRoute(from, to) {
  if (!validPoint(from) || !validPoint(to)) return null;
  const direct = haversineKm(from, to);
  if (direct < 35 && haversineKm(from, KNOWN_ROUTES[0].from) < 70) return KNOWN_ROUTES[0];
  let best = null, score = Infinity;
  for (const route of KNOWN_ROUTES.slice(1)) {
    const normal = haversineKm(from, route.from) + haversineKm(to, route.to);
    const reverse = haversineKm(from, route.to) + haversineKm(to, route.from);
    const distance = Math.min(normal, reverse);
    if (distance < score) { score = distance; best = route; }
  }
  return score <= 85 ? best : null;
}

function keywordsFor(label) {
  const text = String(label || '').toLowerCase();
  const expedition = /desert|dune|sand sea|expedition|off[- ]?road|lava|remote|bush|track/.test(text);
  const park = /park|reserve|conservancy|safari|game|forest|falls|delta|crater/.test(text);
  const mountain = /mount|mountain|highland|pass|escarpment|canyon|gorge|volcano/.test(text);
  const island = /island|ferry|archipelago/.test(text);
  const urban = /airport|station|terminal|city centre|city center|downtown|hotel|mall/.test(text);
  return { expedition, park, mountain, island, urban };
}

function climateWet(month, countryCode, lat) {
  const code = String(countryCode || '').toUpperCase();
  const south = ['AO','BW','LS','MW','MZ','NA','SZ','ZA','ZM','ZW','MG','MU'].includes(code) || lat < -12;
  const north = ['DZ','EG','LY','MA','SD','TN'].includes(code);
  const west = ['BJ','BF','CV','CI','GM','GH','GN','GW','LR','ML','MR','NE','NG','SN','SL','TG'].includes(code);
  if (north) return month >= 11 || month <= 3 ? 1 : 0;
  if (south) return month >= 11 || month <= 3 ? 2 : 0;
  if (west) return month >= 5 && month <= 10 ? 2 : 0;
  if (month >= 3 && month <= 5) return 3;
  return month >= 10 && month <= 12 ? 2 : 0;
}

function surfaceProfile(flags, directKm) {
  if (flags.expedition) return { clearance:205, drive:'4wd_low', mix:{paved:30,gravel:30,unsealed:40}, wet:3, factor:1.34, speed:38 };
  if (flags.park) return { clearance:185, drive:'4wd', mix:{paved:48,gravel:28,unsealed:24}, wet:3, factor:1.24, speed:44 };
  if (flags.mountain) return { clearance:175, drive:'awd', mix:{paved:62,gravel:23,unsealed:15}, wet:2, factor:1.20, speed:42 };
  if (flags.island) return { clearance:145, drive:'2wd', mix:{paved:82,gravel:13,unsealed:5}, wet:1, factor:1.14, speed:40 };
  if (flags.urban || directKm < 25) return { clearance:125, drive:'2wd', mix:{paved:96,gravel:3,unsealed:1}, wet:1, factor:1.10, speed:30 };
  return { clearance:150, drive:'2wd', mix:{paved:78,gravel:15,unsealed:7}, wet:2, factor:1.14, speed:55 };
}

function estimateProfile({ from, to, fromLabel, toLabel, fromCountry, toCountry, month }) {
  const directKm = Math.max(1, haversineKm(from, to));
  const flags = keywordsFor(`${toLabel || ''} ${fromLabel || ''}`);
  const terrain = surfaceProfile(flags, directKm);
  const roadFactor = directKm < 25 ? 1.30 : directKm < 100 ? 1.24 : directKm < 350 ? 1.18 : 1.13;
  const km = Math.max(3, Math.round(directKm * roadFactor));
  const crossBorder = fromCountry && toCountry && String(fromCountry).toUpperCase() !== String(toCountry).toUpperCase();
  const duration = Math.round(km / terrain.speed * 60 + (crossBorder ? 120 : 0));
  const seasonWet = climateWet(month, toCountry, to.lat);
  const possibleGap = Math.max(80, Math.min(420, Math.round(km * (flags.expedition ? .55 : flags.park ? .40 : .28))));
  const hazards = [];
  if (crossBorder) hazards.push('Cross-border permission, vehicle documents and destination-country insurance must be approved in writing.');
  if (flags.park) hazards.push('Park-gate rules and recent access-road conditions can change; confirm them with the operator or lodge.');
  if (flags.expedition) hazards.push('Carry recovery equipment, water, offline navigation and a locally confirmed fuel plan.');
  if (!hazards.length) hazards.push('Night driving and recent weather can materially change travel time; confirm locally before departure.');
  return {
    key:`estimated_${Math.abs(Math.round(from.lat * 100))}_${Math.abs(Math.round(from.lng * 100))}_${Math.abs(Math.round(to.lat * 100))}_${Math.abs(Math.round(to.lng * 100))}`,
    label:`${fromLabel || 'Pickup'} → ${toLabel || 'Destination'}`.slice(0, 120),
    km, direct_km:Math.round(directKm), duration_minutes:duration,
    clearance_mm:terrain.clearance, drive:terrain.drive, range_km:possibleGap,
    surface:'Road mix is not live-verified; the estimate allows for paved road plus possible gravel or unsealed approaches.',
    surface_mix:terrain.mix, wet_penalty:terrain.wet, season_wet:seasonWet,
    fuel_multiplier:terrain.factor, note:'This is a conservative geometry-and-terrain estimate, not live navigation. The operator must confirm the exact road, permits and current conditions.',
    hazards, border_crossings:crossBorder ? [`${String(fromCountry).toUpperCase()} → ${String(toCountry).toUpperCase()}`] : [],
    recommendations:['Confirm the exact itinerary with the operator before payment.','Download offline maps and plan to arrive before dark.'],
    confidence:'low', basis:'geometry_estimate', distance_basis:'great_circle_adjusted', duration_basis:'estimated_average_speed',
    sources:['great-circle geometry','Cabana conservative terrain rules'],
    from_country_code:String(fromCountry || '').toUpperCase(), to_country_code:String(toCountry || '').toUpperCase(),
    from_lat:from.lat, from_lng:from.lng, to_lat:to.lat, to_lng:to.lng
  };
}

/* Legacy single-destination callers remain safe. A nearby reference is
   allowed only inside a 60km envelope; the rest never inherits Kenya. */
function fallbackProfile(lat, lng, label) {
  const near = nearestKnown(lat, lng);
  if (near.distanceKm <= 60) {
    return {
      ...near.route, key:`reference_${near.route.key}`, label:label || near.route.label,
      confidence:'low', basis:'nearby_reference_corridor', distance_basis:'reference_corridor',
      note:`Live reasoning was unavailable. This uses the nearby ${near.route.label} reference (${near.distanceKm}km away), so confirm the exact approach locally.`,
      sources:[near.route.label], hazards:['Confirm the final approach and current weather with the operator.']
    };
  }
  const to = { lat:Number(lat), lng:Number(lng) };
  const from = { lat:Number(lat) + 0.35, lng:Number(lng) };
  return estimateProfile({ from, to, fromLabel:'Nearest pickup area', toLabel:label, month:new Date().getMonth() + 1 });
}

function seasonMonth(value) {
  const date = value ? new Date(value) : new Date();
  return Number.isFinite(date.getTime()) ? date.getMonth() + 1 : new Date().getMonth() + 1;
}

function systemPrompt() {
  return `You are Cabana Drive Africa's conservative route-intelligence engine. Evaluate the exact road journey between the supplied pickup and destination anywhere in Africa. This is vehicle-suitability guidance, not tourism copy and not live navigation.

Use general geographic and road-infrastructure knowledge only. Never claim live traffic, live weather, a road survey, guaranteed fuel availability, or exact border opening status. Prefer a more capable vehicle when uncertain. Mention ferries, borders, park access, deep sand, black-cotton soil, corrugation, flood risk, mountain tracks, and long fuel gaps only when reasonably relevant.

Return JSON only:
{
  "label": string,
  "distance_km": number,
  "duration_minutes": number,
  "clearance_mm": number,
  "drive": "2wd" | "awd" | "4wd" | "4wd_low",
  "range_km": number,
  "surface": string,
  "surface_mix": { "paved": number, "gravel": number, "unsealed": number },
  "wet_penalty": 0 | 1 | 2 | 3,
  "season_wet": 0 | 1 | 2 | 3,
  "fuel_multiplier": number,
  "note": string,
  "hazards": string[],
  "border_crossings": string[],
  "recommendations": string[],
  "confidence": "high" | "medium" | "low",
  "sources": string[]
}`;
}

function userPrompt(context) {
  const month = new Date(2000, context.month - 1, 1).toLocaleString('en', { month:'long' });
  return `Pickup: ${context.fromLabel || 'unspecified'} (${context.from.lat}, ${context.from.lng}), country ${context.fromCountry || 'unknown'}
Destination: ${context.toLabel || 'unspecified'} (${context.to.lat}, ${context.to.lng}), country ${context.toCountry || 'unknown'}
Straight-line distance: ${Math.round(haversineKm(context.from, context.to))}km
Travel month: ${month}

Estimate the likely driven distance, time, road-surface mix and minimum safe vehicle capability. Be concise, actionable and explicit about uncertainty.`;
}

function boundedStrings(value, maxItems, maxLength) {
  return Array.isArray(value) ? value.map(item => String(item || '').trim().slice(0, maxLength)).filter(Boolean).slice(0, maxItems) : [];
}

function surfaceMix(value) {
  const raw = value && typeof value === 'object' ? value : {};
  const parts = ['paved','gravel','unsealed'].map(key => Math.max(0, Math.min(100, Number(raw[key]) || 0)));
  const sum = parts.reduce((a, b) => a + b, 0);
  if (!sum) return { paved:70, gravel:20, unsealed:10 };
  const paved = Math.round(parts[0] / sum * 100);
  const gravel = Math.min(100 - paved, Math.round(parts[1] / sum * 100));
  return { paved, gravel, unsealed:100 - paved - gravel };
}

function coerceProfile(raw, label, context) {
  if (!raw || typeof raw !== 'object') throw new Error('empty_response');
  const km = Number(raw.distance_km == null ? raw.km : raw.distance_km);
  const duration = Number(raw.duration_minutes || Math.round(km / 50 * 60));
  const clearance = Number(raw.clearance_mm), range = Number(raw.range_km), wet = Number(raw.wet_penalty);
  const seasonWet = raw.season_wet == null ? wet : Number(raw.season_wet);
  const drive = DRIVE_VALUES.includes(raw.drive) ? raw.drive : null;
  const fuelMultiplier = Number(raw.fuel_multiplier == null ? 1.15 : raw.fuel_multiplier);
  if (!Number.isFinite(clearance) || clearance < 80 || clearance > 400) throw new Error('clearance_out_of_range');
  if (!drive) throw new Error('invalid_drive');
  if (!Number.isFinite(km) || km <= 0 || km > 6000) throw new Error('km_out_of_range');
  if (!Number.isFinite(duration) || duration <= 0 || duration > 10000) throw new Error('duration_out_of_range');
  if (!Number.isFinite(range) || range <= 0 || range > 1200) throw new Error('range_out_of_range');
  if (!Number.isFinite(wet) || wet < 0 || wet > 3 || !Number.isFinite(seasonWet) || seasonWet < 0 || seasonWet > 3) throw new Error('wet_penalty_out_of_range');
  if (!Number.isFinite(fuelMultiplier) || fuelMultiplier < 1 || fuelMultiplier > 1.8) throw new Error('fuel_multiplier_out_of_range');
  if (context && context.from && context.to) {
    const direct = haversineKm(context.from, context.to);
    if (km < direct * .92 || km > Math.max(120, direct * 4)) throw new Error('distance_implausible');
  }
  const confidence = ['high','medium','low'].includes(raw.confidence) ? raw.confidence : 'medium';
  return {
    key:'derived_pending', label:String(raw.label || label || 'Your route').slice(0, 120),
    km:Math.round(km), direct_km:context && context.from && context.to ? Math.round(haversineKm(context.from, context.to)) : null,
    duration_minutes:Math.round(duration), clearance_mm:Math.round(clearance), drive, range_km:Math.round(range),
    surface:String(raw.surface || 'Road surface not specified.').slice(0, 240), surface_mix:surfaceMix(raw.surface_mix),
    wet_penalty:Math.round(wet), season_wet:Math.round(seasonWet), fuel_multiplier:Number(fuelMultiplier.toFixed(2)),
    note:String(raw.note || 'Confirm current conditions with the operator.').slice(0, 500),
    hazards:boundedStrings(raw.hazards, 5, 220), border_crossings:boundedStrings(raw.border_crossings, 4, 120),
    recommendations:boundedStrings(raw.recommendations, 5, 220), confidence, basis:'ai_reasoning',
    distance_basis:'ai_estimate', duration_basis:'ai_estimate', sources:boundedStrings(raw.sources, 4, 100),
    from_country_code:context && String(context.fromCountry || '').toUpperCase(),
    to_country_code:context && String(context.toCountry || '').toUpperCase(),
    from_lat:context && context.from.lat, from_lng:context && context.from.lng,
    to_lat:context && context.to.lat, to_lng:context && context.to.lng
  };
}

function parsePair(value) {
  if (!value) return null;
  const parts = String(value).split(',').map(Number);
  const point = { lat:parts[0], lng:parts[1] };
  return validPoint(point) ? point : null;
}

function pointFromQuery(q, prefix) {
  const pair = parsePair(q[prefix]);
  if (pair) return pair;
  const cap = prefix.charAt(0).toUpperCase() + prefix.slice(1);
  const point = { lat:Number(q[prefix + 'Lat'] ?? q[cap + 'Lat']), lng:Number(q[prefix + 'Lng'] ?? q[cap + 'Lng']) };
  return validPoint(point) ? point : null;
}

function cacheKey(context) {
  const point = p => `${p.lat.toFixed(2)},${p.lng.toFixed(2)}`;
  return `${point(context.from)}>${point(context.to)}|m${context.month}`;
}
function cacheGet(key) {
  const item = cache.get(key);
  if (!item) return null;
  if (Date.now() > item.expires) { cache.delete(key); return null; }
  return item.value;
}
function cacheSet(key, value, ttl) {
  if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value);
  cache.set(key, { value, expires:Date.now() + ttl });
}

async function enrichWithinBudget(context) {
  let timer;
  try {
    return await Promise.race([
      generateStructuredJson(systemPrompt(), userPrompt(context)),
      new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('route_enrichment_timeout')), AI_BUDGET_MS); })
    ]);
  } finally {
    clearTimeout(timer);
  }
}

export default async function terrainHandler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error:'method_not_allowed' });
  const q = req.query || {};
  let from = pointFromQuery(q, 'from'), to = pointFromQuery(q, 'to');
  const legacy = validPoint({ lat:Number(q.lat), lng:Number(q.lng) }) ? { lat:Number(q.lat), lng:Number(q.lng) } : null;
  if (!to && legacy) to = legacy;
  const month = seasonMonth(q.date);
  const fromLabel = String(q.fromLabel || '').slice(0, 200) || null;
  const toLabel = String(q.toLabel || q.label || '').slice(0, 200) || null;
  const fromCountry = String(q.fromCountry || '').slice(0, 2).toUpperCase();
  const toCountry = String(q.toCountry || '').slice(0, 2).toUpperCase();

  if (!to) return res.status(400).json({ error:'A valid destination coordinate is required.' });
  if (!from) {
    const profile = fallbackProfile(to.lat, to.lng, toLabel);
    res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400');
    return res.status(200).json({ ...profile, cache:'miss', legacy:true });
  }

  const context = { from, to, fromLabel, toLabel, fromCountry, toCountry, month };
  const key = cacheKey(context), cached = cacheGet(key);
  if (cached) {
    res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=604800, stale-while-revalidate=2592000');
    return res.status(200).json({ ...cached, cache:'hit' });
  }

  const reference = matchKnownRoute(from, to);
  let profile;
  if (reference) {
    profile = { ...reference, confidence:'high', basis:'cabana_reference', distance_basis:'corridor_reference', duration_basis:'corridor_reference',
      sources:['Cabana corridor reference'], hazards:[reference.note], recommendations:['Confirm recent weather and the final approach with the operator.'],
      border_crossings:[], from_country_code:fromCountry, to_country_code:toCountry,
      from_lat:from.lat, from_lng:from.lng, to_lat:to.lat, to_lng:to.lng };
  } else {
    try {
      const raw = await enrichWithinBudget(context);
      profile = coerceProfile(raw, `${fromLabel || 'Pickup'} → ${toLabel || 'Destination'}`, context);
      profile.key = `derived_${Math.abs(Math.round(from.lat * 100))}_${Math.abs(Math.round(to.lat * 100))}`;
    } catch (error) {
      console.warn('[carhire-terrain] enrichment unavailable:', error && error.message);
      profile = estimateProfile(context);
    }
  }

  const ttl = profile.basis === 'ai_reasoning' || profile.basis === 'cabana_reference' ? 7 * 86400000 : 3600000;
  cacheSet(key, profile, ttl);
  res.setHeader('Cache-Control', `public, max-age=300, s-maxage=${Math.floor(ttl / 1000)}, stale-while-revalidate=2592000`);
  return res.status(200).json({ ...profile, cache:'miss' });
}

export const __test = { coerceProfile, nearestKnown, matchKnownRoute, fallbackProfile, estimateProfile, haversineKm, KNOWN_ROUTES, surfaceMix };
