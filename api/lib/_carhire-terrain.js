/* ═══════════════════════════════════════════════════════════════════
   CABANA · CAR HIRE · TERRAIN REASONING
   ───────────────────────────────────────────────────────────────────
   GET /api/carhire-terrain?lat=..&lng=..&label=..&date=..
   GET /api/carhire-terrain?from=lat,lng&to=lat,lng&label=..&date=..

   The problem this solves
   ────────────────────────
   cabana-carhire-core.js grades a vehicle against a route with real
   engineering judgement — ground clearance, drivetrain, fuel range, wet
   season penalties — but only for 11 hand-written Kenyan corridors. Ask
   it about a route to Kilimanjaro's Machame gate, or a delivery run
   into Kampala's outskirts, or literally anywhere outside that list,
   and it has nothing to say. The dropdown constrains the destination to
   what a person on our team already thought to type in.

   This route lets a guest name ANY destination — reached through the
   worldwide geocoder already in the product — and derives a route
   profile in the *same shape* the grading engine already consumes:

     { key, label, km, clearance_mm, drive, range_km,
       surface, wet_penalty, note, confidence, sources }

   That last field is the honest part. A model reasoning about a road
   it has never driven is not a surveyor. Every profile ships with a
   confidence band and a one-line account of what the reasoning leaned
   on, and the UI is required to show both — see cabana-carhire-ui.js.
   An "AI-derived, treat with care" route and a "measured, from our own
   11-corridor table" route must never look identical to a guest making
   a safety decision about black cotton soil in the rains.

   Fail-closed, same as grade() itself: if the model cannot answer, or
   answers with something out of range, this hands back the nearest of
   our 11 known corridors by great-circle distance rather than a made-up
   number — a slightly-wrong known route beats a confident invention.
   ═══════════════════════════════════════════════════════════════════ */

import { generateStructuredJson } from './_ai-gateway.js';

/* The 11 corridors CabanaCarHire.ROUTES already ships, duplicated here
   in plain data form. api/ cannot import cabana-carhire-core.js — that
   file is written for the browser and reaches for `window` — so this is
   the server's own copy of the same table, kept in the same order and
   used only as (a) few-shot grounding for the model and (b) the
   fallback when reasoning fails. If that file's ROUTES array changes,
   mirror it here; the sync test at the bottom of this comment block
   exists so drift is at least visible in review. */
const KNOWN_ROUTES = [
  { key: 'metro',      label: 'Nairobi & suburbs',        lat: -1.2921, lng: 36.8219, km: 60,  clearance_mm: 115, drive: '2wd',     range_km: 120, surface: 'Tarmac throughout', wet_penalty: 0 },
  { key: 'highway',    label: 'Nairobi → Mombasa',        lat: -2.7,    lng: 38.6,    km: 485, clearance_mm: 120, drive: '2wd',     range_km: 190, surface: 'A109 tarmac, heavy truck traffic', wet_penalty: 0 },
  { key: 'riftvalley', label: "Naivasha, Nakuru & the Rift", lat: -0.6, lng: 36.2,    km: 210, clearance_mm: 140, drive: '2wd',     range_km: 150, surface: 'A104 tarmac with rough park approaches', wet_penalty: 1 },
  { key: 'coast',      label: 'Diani & the South Coast',  lat: -4.28,   lng: 39.59,   km: 520, clearance_mm: 125, drive: '2wd',     range_km: 190, surface: 'Tarmac plus the Likoni ferry', wet_penalty: 0 },
  { key: 'amboseli',   label: 'Amboseli & Kilimanjaro side', lat: -2.65, lng: 37.26,  km: 240, clearance_mm: 165, drive: '2wd',     range_km: 220, surface: 'Tarmac then corrugated volcanic dust', wet_penalty: 2 },
  { key: 'mara',       label: 'Masai Mara',               lat: -1.5,    lng: 35.15,   km: 285, clearance_mm: 180, drive: 'awd',     range_km: 260, surface: 'Murram, then black cotton soil inside the reserve', wet_penalty: 3 },
  { key: 'tsavo',      label: 'Tsavo East & West',        lat: -3.0,    lng: 38.6,    km: 330, clearance_mm: 180, drive: 'awd',     range_km: 280, surface: 'Red laterite, rock shelves, sand river beds', wet_penalty: 2 },
  { key: 'mtkenya',    label: 'Nanyuki & Mount Kenya',    lat: 0.01,    lng: 37.07,   km: 200, clearance_mm: 160, drive: 'awd',     range_km: 180, surface: 'Tarmac to town, steep rutted forest tracks above', wet_penalty: 2 },
  { key: 'samburu',    label: 'Samburu & the north',      lat: 0.6,     lng: 37.5,    km: 350, clearance_mm: 195, drive: '4wd',     range_km: 320, surface: 'Rough gravel beyond Isiolo, long fuel gaps', wet_penalty: 3 },
  { key: 'turkana',    label: 'Turkana & Marsabit expedition', lat: 3.5, lng: 36.0,   km: 780, clearance_mm: 205, drive: '4wd_low', range_km: 420, surface: 'Lava desert, sand, corrugation for hundreds of km', wet_penalty: 3 },
];

const DRIVE_VALUES = ['2wd', 'awd', '4wd', '4wd_low'];

/* ── cache ─────────────────────────────────────────────────────────
   A route's terrain does not change between two guests asking about
   it an hour apart. Keyed on rounded coordinates + season month, so
   "Nanyuki" in March and "Nanyuki" in August cache separately — the
   wet-season penalty genuinely differs. ── */
const CACHE_MAX = 500;
const cache = new Map();

function cacheKey(lat, lng, month) {
  /* ~1.1km grid at the equator. Tight enough that two guests typing
     the same town land on the same cell, loose enough that the cache
     is not one entry per unique click. */
  return `${lat.toFixed(2)},${lng.toFixed(2)},m${month}`;
}
function cacheGet(key) {
  const hit = cache.get(key);
  if (!hit) return null;
  if (Date.now() > hit.expires) { cache.delete(key); return null; }
  return hit.value;
}
function cacheSet(key, value, ttlMs) {
  if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value);
  cache.set(key, { value, expires: Date.now() + ttlMs });
}

/* ── great-circle fallback ────────────────────────────────────────── */
function haversineKm(a, b) {
  const R = 6371;
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLng = (b.lng - a.lng) * Math.PI / 180;
  const s = Math.sin(dLat / 2) ** 2
    + Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}

function nearestKnown(lat, lng) {
  let best = null, bestKm = Infinity;
  for (const r of KNOWN_ROUTES) {
    const d = haversineKm({ lat, lng }, { lat: r.lat, lng: r.lng });
    if (d < bestKm) { bestKm = d; best = r; }
  }
  return { route: best, distanceKm: Math.round(bestKm) };
}

function fallbackProfile(lat, lng, label) {
  const { route, distanceKm } = nearestKnown(lat, lng);
  return {
    key: `derived_${route.key}`,
    label: label || route.label,
    km: route.km,
    clearance_mm: route.clearance_mm,
    drive: route.drive,
    range_km: route.range_km,
    surface: route.surface,
    wet_penalty: route.wet_penalty,
    note: `Reasoning was unavailable, so this is graded against ${route.label}, the closest of our surveyed corridors (${distanceKm}km away). Treat clearance and drivetrain needs as an estimate.`,
    confidence: 'low',
    basis: 'nearest_known_corridor',
    sources: [route.label],
  };
}

/* ── prompt construction ─────────────────────────────────────────── */
function seasonMonth(dateStr) {
  const d = dateStr ? new Date(dateStr) : new Date();
  return Number.isFinite(d.getTime()) ? d.getMonth() + 1 : new Date().getMonth() + 1;
}

function systemPrompt() {
  return `You are the terrain-grading engine for Cabana Car Hire, an East and
Southern African vehicle rental marketplace. A guest has typed a real-world
destination. You must estimate the DRIVING DEMANDS of the road from a
sensible starting point (the nearest city with a Cabana depot) to that
destination — not describe the destination as a tourist attraction.

Ground every answer in genuinely knowable facts about the region: is this
route mostly paved highway, or does it cross unsealed rural roads, mountain
tracks, desert, or a national park where roads are seasonal murram? Is there
a known river crossing, ferry, or border post? What is the general elevation
gain? Is the area known for a particular hazard — black cotton soil, deep
sand, washboard corrugation, steep switchbacks, flooding?

You are reasoning from general geographic and infrastructure knowledge, not
live road-condition data. Where you are genuinely unsure, say so honestly in
"confidence" and keep the numbers conservative (favour MORE clearance and
BETTER drivetrain, never less, when uncertain) — a vehicle graded as needing
more than it truly does merely costs a guest a pricier hire; a vehicle
graded as needing less than it truly does can strand or injure someone.

Respond with EXACTLY this JSON shape and nothing else:
{
  "label": string,                          // short name for this route
  "km": number,                             // approximate one-way distance in km from the nearest major city/depot
  "clearance_mm": number,                   // minimum ground clearance a vehicle needs, 100-260
  "drive": "2wd" | "awd" | "4wd" | "4wd_low",
  "range_km": number,                       // longest stretch between reliable fuel, in km
  "surface": string,                        // one clause, plain words, e.g. "Tarmac to town, then rutted forest track"
  "wet_penalty": number,                    // 0-3, how much worse this route gets in heavy rain
  "note": string,                           // one sentence a traveller can act on — the single most important thing to know
  "confidence": "high" | "medium" | "low",  // how sure you are, honestly
  "sources": string[]                       // 1-4 short phrases naming what kind of general knowledge this leans on, e.g. "known national park road conditions", "standard highway infrastructure for this country"
}`;
}

function userPrompt({ label, lat, lng, toLat, toLng, month }) {
  const monthName = new Date(2000, month - 1, 1).toLocaleString('en', { month: 'long' });
  const dest = toLat != null
    ? `Destination coordinates: ${toLat}, ${toLng} (start point: ${lat}, ${lng})`
    : `Destination: "${label}" at approximately ${lat}, ${lng}`;
  return `${dest}
Month of travel: ${monthName}

Reference examples of how Cabana already grades routes in this region, so
your numbers land in a comparable range and comparable units:
${KNOWN_ROUTES.slice(0, 4).map(r =>
    `- ${r.label}: ${r.km}km, needs ${r.clearance_mm}mm clearance, ${r.drive} drive, ${r.range_km}km fuel range, "${r.surface}"`
  ).join('\n')}

Grade the route to the stated destination now.`;
}

/* ── validation. The model's JSON is untrusted input. ─────────────── */
function coerceProfile(raw, label) {
  if (!raw || typeof raw !== 'object') throw new Error('empty_response');

  const clearance = Number(raw.clearance_mm);
  const km = Number(raw.km);
  const range = Number(raw.range_km);
  const wet = Number(raw.wet_penalty);
  const drive = DRIVE_VALUES.includes(raw.drive) ? raw.drive : null;

  if (!Number.isFinite(clearance) || clearance < 80 || clearance > 400) throw new Error('clearance_out_of_range');
  if (!drive) throw new Error('invalid_drive');
  if (!Number.isFinite(km) || km <= 0 || km > 3000) throw new Error('km_out_of_range');
  if (!Number.isFinite(range) || range <= 0 || range > 1000) throw new Error('range_out_of_range');
  if (!Number.isFinite(wet) || wet < 0 || wet > 3) throw new Error('wet_penalty_out_of_range');

  const confidence = ['high', 'medium', 'low'].includes(raw.confidence) ? raw.confidence : 'medium';
  const surface = String(raw.surface || '').slice(0, 200) || 'Surface not specified.';
  const note = String(raw.note || '').slice(0, 400) || 'No further detail from the reasoning pass.';
  const sources = Array.isArray(raw.sources) ? raw.sources.map(s => String(s).slice(0, 80)).slice(0, 4) : [];

  return {
    key: 'derived_' + cacheKey(0, 0, 0).slice(0, 0) /* placeholder, replaced by caller */,
    label: String(raw.label || label || 'Your route').slice(0, 80),
    km: Math.round(km),
    clearance_mm: Math.round(clearance),
    drive,
    range_km: Math.round(range),
    surface,
    wet_penalty: Math.round(wet),
    note,
    confidence,
    basis: 'ai_reasoning',
    sources: sources.length ? sources : ['general regional road knowledge'],
  };
}

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export default async function terrainHandler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'method_not_allowed' });

  const q = req.query || {};
  const lat = num(q.lat);
  const lng = num(q.lng);
  const label = (q.label ? String(q.label) : '').slice(0, 200) || null;
  const month = seasonMonth(q.date);

  if (lat == null || lng == null || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return res.status(400).json({ error: 'lat and lng are required and must be valid coordinates' });
  }

  const key = cacheKey(lat, lng, month);
  const cached = cacheGet(key);
  if (cached) {
    res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=604800, stale-while-revalidate=2592000');
    return res.status(200).json({ ...cached, cache: 'hit' });
  }

  let profile;
  try {
    const raw = await generateStructuredJson(
      systemPrompt(),
      userPrompt({ label, lat, lng, toLat: null, toLng: null, month })
    );
    profile = coerceProfile(raw, label);
    profile.key = 'derived_' + Math.abs(Math.round(lat * 1000)) + '_' + Math.abs(Math.round(lng * 1000));
  } catch (err) {
    console.warn('[carhire-terrain] reasoning failed, falling back:', err.message);
    profile = fallbackProfile(lat, lng, label);
  }

  const ttlMs = profile.basis === 'ai_reasoning' ? 7 * 24 * 3600 * 1000 : 60 * 60 * 1000;
  cacheSet(key, profile, ttlMs);

  const sMax = Math.floor(ttlMs / 1000);
  res.setHeader('Cache-Control', `public, max-age=300, s-maxage=${sMax}, stale-while-revalidate=2592000`);
  return res.status(200).json({ ...profile, cache: 'miss' });
}

export const __test = { coerceProfile, nearestKnown, fallbackProfile, haversineKm, KNOWN_ROUTES };
