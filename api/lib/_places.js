/* ══════════════════════════════════════════════════════════════════════
   CABANA · PLACES
   api/lib/_places.js

   Hosts type where they are however they like: "Kilimani division",
   "Syokimau, 360 Apartments Phase 1", "360 Apartments Phase 1, Syokimau",
   "Nairobi National Park, Nairobi, Kenya". A search engine, a hub page and
   a demand chart all need the same answer to "where is this": Kilimani,
   Syokimau, Syokimau, Nairobi National Park in Nairobi.

   This module is that answer, and nothing else computes it. It reads the
   atlas the SEO build generates (cabana-world-atlas.json: 175 places, each
   with its real pages) and resolves free text onto it. A place the atlas
   has never heard of is not dropped: it becomes a new place with a clean
   slug under its city, which is how a host in Kitengela gets a live
   /kitengela-apartments page the day they publish, with nobody adding
   Kitengela to a list first.
   ══════════════════════════════════════════════════════════════════════ */
import { readFileSync } from 'node:fs';

/* Same folding as seo/build_world_atlas.py and api/lib/_atlas.js:
   accents fold to their base letter rather than vanishing, so
   "Côte d'Ivoire" keys as cote-divoire everywhere. */
export function slugify(s) {
  return String(s == null ? '' : s)
    .trim().toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[‘’']/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function titleCase(s) {
  return String(s || '').trim().toLowerCase()
    .replace(/(^|[\s\-'(])([a-z])/g, (m, a, b) => a + b.toUpperCase())
    .replace(/\b(Cbd|Jkia|Uk|Usa|Uae|Suv|Mpv|Kicc|Bnb)\b/g, w => w.toUpperCase());
}

/* Segments that name a building, a road or a phase rather than a place.
   They are real addresses, which is precisely why they must never become
   a public page: "/360-apartments-phase-1-apartments" helps nobody and
   tells the world where a door is. */
const BUILDING = /\d|\b(apartments?|apts?|phase|plaza|court|towers?|house|suites?|residences?|residency|block|floor|road|rd|street|st|avenue|ave|drive|lane|close|crescent|mall|centre|center|building|hostel|hotel|lodge|villa|villas|gardens?|heights|park view|flats?|opposite|next to|behind|near)\b/i;

/* Administrative words people append to a real place name. */
const NOISE = /\b(division|ward|sub[\s-]?county|location|constituency|county|area|town|village|municipality|district)\b/gi;

/* Places that come up in real listings but are not (yet) atlas pages.
   Each points at the atlas place it belongs to, so it gets a sensible
   parent and a hub page of its own once it has supply. */
const EXTRA = [
  { id: 'maasai-mara', name: 'Maasai Mara', kind: 'district', parent: 'kenya', countrySlug: 'kenya', aliases: ['masai mara', 'mara', 'maasai mara national reserve', 'masai mara game reserve'] },
  { id: 'nairobi-national-park', name: 'Nairobi National Park', kind: 'district', parent: 'nairobi', countrySlug: 'kenya' },
  { id: 'amboseli', name: 'Amboseli', kind: 'district', parent: 'kenya', countrySlug: 'kenya', aliases: ['amboseli national park'] },
  { id: 'tsavo', name: 'Tsavo', kind: 'district', parent: 'kenya', countrySlug: 'kenya', aliases: ['tsavo east', 'tsavo west'] },
  { id: 'samburu', name: 'Samburu', kind: 'district', parent: 'kenya', countrySlug: 'kenya' },
  { id: 'kitengela', name: 'Kitengela', kind: 'district', parent: 'nairobi', countrySlug: 'kenya' },
  { id: 'ruaka', name: 'Ruaka', kind: 'district', parent: 'nairobi', countrySlug: 'kenya' },
  { id: 'kasarani', name: 'Kasarani', kind: 'district', parent: 'nairobi', countrySlug: 'kenya' },
  { id: 'embakasi', name: 'Embakasi', kind: 'district', parent: 'nairobi', countrySlug: 'kenya' },
  { id: 'langata', name: 'Langata', kind: 'district', parent: 'nairobi', countrySlug: 'kenya', aliases: ["lang'ata"] },
  { id: 'hurlingham', name: 'Hurlingham', kind: 'district', parent: 'nairobi', countrySlug: 'kenya' },
  { id: 'ngong', name: 'Ngong', kind: 'district', parent: 'nairobi', countrySlug: 'kenya' },
  { id: 'ukunda', name: 'Ukunda', kind: 'district', parent: 'diani', countrySlug: 'kenya' },
  { id: 'kilifi', name: 'Kilifi', kind: 'city', parent: 'kenya', countrySlug: 'kenya' },
  { id: 'thika', name: 'Thika', kind: 'city', parent: 'kenya', countrySlug: 'kenya' },
  { id: 'eldoret', name: 'Eldoret', kind: 'city', parent: 'kenya', countrySlug: 'kenya' },
  { id: 'machakos', name: 'Machakos', kind: 'city', parent: 'kenya', countrySlug: 'kenya' },
];

/* Which hub family shows which service. The first four have static,
   hand-built pages for atlas places; the rest exist only as live pages. */
export const HUB_SUFFIX = {
  stays: 'apartments',
  tours: 'safaris',
  carhire: 'car-hire',
  events: 'events',
  food: 'restaurants',
  roommates: 'rooms',
};
export const SUFFIX_SERVICE = Object.fromEntries(Object.entries(HUB_SUFFIX).map(([s, x]) => [x, s]));
const ATLAS_CATEGORY = { stays: 'apartments', tours: 'safaris', carhire: 'car-hire' };

let ATLAS = null;
function loadAtlas() {
  if (ATLAS) return ATLAS;
  let places = [];
  try {
    const raw = JSON.parse(readFileSync(new URL('../../cabana-world-atlas.json', import.meta.url), 'utf8'));
    places = Array.isArray(raw.places) ? raw.places : [];
  } catch (e) {
    console.warn('[places] atlas unreadable:', e.message);
  }
  const byId = new Map();
  for (const p of places) byId.set(p.id, { ...p, atlas: true });
  for (const p of EXTRA) if (!byId.has(p.id)) byId.set(p.id, { ...p, pages: {}, atlas: false });

  /* name → place, for every spelling we accept. Longest first, so
     "nairobi national park" wins over "nairobi" inside the same string. */
  const names = [];
  for (const p of byId.values()) {
    const spellings = new Set([p.id, slugify(p.name), ...(p.aliases || []).map(slugify)]);
    for (const s of spellings) if (s) names.push({ slug: s, place: p });
  }
  names.sort((a, b) => b.slug.length - a.slug.length);

  const byIso = new Map();
  for (const p of byId.values()) if (p.kind === 'country' && p.iso) byIso.set(String(p.iso).toUpperCase(), p);

  ATLAS = { byId, names, byIso };
  return ATLAS;
}

export function placeById(id) {
  return loadAtlas().byId.get(id) || null;
}

/* Whole-token containment: "kilimani-division" contains "kilimani";
   "karengata" does not contain "karen". */
function containsToken(hay, needle) {
  if (!hay || !needle) return false;
  return hay === needle || hay.startsWith(needle + '-') || hay.endsWith('-' + needle) || hay.includes('-' + needle + '-');
}

function matchName(text, kinds) {
  const s = slugify(text);
  if (!s) return null;
  const { names } = loadAtlas();
  for (const n of names) if (n.slug === s && (!kinds || kinds.includes(n.place.kind))) return n.place;
  for (const n of names) if (containsToken(s, n.slug) && (!kinds || kinds.includes(n.place.kind))) return n.place;
  return null;
}

function segments(s) {
  return String(s || '').split(/[,;/|]+/).map(x => x.trim()).filter(Boolean);
}

function countryOf(text) {
  const raw = String(text || '').trim();
  if (!raw) return null;
  const { byIso } = loadAtlas();
  if (/^[A-Za-z]{2}$/.test(raw)) return byIso.get(raw.toUpperCase()) || null;
  return matchName(raw, ['country']);
}

function ancestor(place, kind) {
  let p = place, guard = 0;
  while (p && guard++ < 6) {
    if (p.kind === kind) return p;
    p = p.parent ? placeById(p.parent) : null;
  }
  return null;
}

function synthetic(name, kind, parent) {
  const clean = String(name || '').replace(NOISE, ' ').replace(/\s+/g, ' ').trim();
  const id = slugify(clean);
  if (!id || id.length < 3 || id.length > 48) return null;
  const known = placeById(id);
  if (known) return known;
  return { id, name: titleCase(clean), kind, parent: parent ? parent.id : '', countrySlug: parent?.countrySlug || '', pages: {}, synthetic: true };
}

/**
 * Resolve a thing's free-text location onto the place graph.
 * Returns { area, city, country, key, label } where each level is a place
 * object or null. `key` is the most specific place id.
 */
export function resolvePlace({ area, city, country } = {}) {
  let C = countryOf(country);
  let T = null; // city
  let A = null; // area

  /* City first: it anchors which district a bare area name means. */
  for (const seg of segments(city)) {
    const hit = matchName(seg, ['city']) || matchName(seg, ['district']);
    if (hit) { if (hit.kind === 'city') T = hit; else { A = A || hit; T = T || ancestor(hit, 'city'); } break; }
  }
  if (!T) {
    const seg = segments(city).find(x => !BUILDING.test(x) && !countryOf(x));
    if (seg) T = matchName(seg, ['district']) ? ancestor(matchName(seg, ['district']), 'city') : synthetic(seg, 'city', C);
  }

  for (const seg of segments(area)) {
    if (BUILDING.test(seg) && !matchName(seg, ['district', 'city'])) continue;
    if (countryOf(seg)) continue;
    const district = matchName(seg, ['district']);
    if (district && (!T || ancestor(district, 'city')?.id === T.id || T.synthetic || !ancestor(district, 'city'))) { A = district; break; }
    const asCity = matchName(seg, ['city']);
    if (asCity && (!T || asCity.id !== T.id)) {
      /* The "area" field names a whole city (Diani, while the city field
         says Kwale). Trust the more specific-sounding field. */
      if (!T || T.synthetic) { T = asCity; continue; }
    }
    if (asCity && T && asCity.id === T.id) continue;
    if (!district && !asCity) { A = synthetic(seg, 'district', T || C); if (A) break; }
  }

  if (!T && A) T = ancestor(A, 'city');
  if (!C) C = ancestor(A || T, 'country') || (T?.countrySlug ? placeById(T.countrySlug) : null);
  if (A && T && A.id === T.id) A = null;

  const most = A || T || C;
  const label = [A?.name, T?.name].filter(Boolean).join(', ') || C?.name || '';
  return { area: A, city: T, country: C, key: most ? most.id : null, label };
}

/* The hub page a place has for a service, if any: the static, hand-built
   page when the atlas has one, otherwise the live page this engine serves.
   `staticPage` tells the caller which, because only live pages are listed
   in the live sitemap (static ones have their own). */
export function hubFor(place, service) {
  const suffix = HUB_SUFFIX[service];
  if (!place || !suffix) return null;
  const cat = ATLAS_CATEGORY[service];
  const staticPath = cat && place.pages && place.pages[cat];
  if (staticPath) return { path: staticPath, staticPage: true };
  if (place.kind === 'country' || place.kind === 'continent') return null;
  return { path: `/${place.id}-${suffix}`, staticPage: false };
}

/* Inverse of hubFor for live hubs: "/kitengela-apartments" → kitengela,
   stays. Static pages never reach here (the filesystem answers first). */
export function parseHub(path) {
  const m = /^\/?([a-z0-9]+(?:-[a-z0-9]+)*)-(apartments|safaris|car-hire|events|restaurants|rooms)$/.exec(String(path || ''));
  if (!m) return null;
  return { placeId: m[1], service: SUFFIX_SERVICE[m[2]], suffix: m[2] };
}

export const __test = { BUILDING, NOISE, matchName, segments, countryOf, synthetic, loadAtlas, containsToken };
