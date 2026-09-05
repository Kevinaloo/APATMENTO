/* ══════════════════════════════════════════════════════════════════════
   CABANA  ·  Music search  /api/music-search
   ──────────────────────────────────────────────────────────────────────
   Someone in the music room types "sol generation" and wants to hear it.
   That means asking YouTube, and asking YouTube means holding a key.

   The key stays here. It is never sent to a browser, never embedded in a
   page, and never appears in a URL the visitor can see. The browser asks
   this route; this route asks Google.

   Quota is the whole design constraint. A YouTube Data API v3 project
   gets 10,000 units a day. One search costs 100 of them, so an unguarded
   search box is a hundred queries away from a dead chart. Three defences,
   in order of how much they save:

     1. An in-process cache keyed on the normalised query. Repeated
        searches inside a warm instance cost nothing at all.
     2. An edge cache header, so Vercel serves the same query to the
        next visitor without waking this function.
     3. A per-address rate limit, so one person cannot spend the day's
        quota on their own.

   A search that returns nothing is a normal answer. A search that cannot
   run because no key is configured says exactly that, so the room can
   tell the visitor the truth instead of showing an empty result.
══════════════════════════════════════════════════════════════════════ */

import { optional } from './_env.js';

export const config = { maxDuration: 12 };

const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const CACHE_CEILING = 400;
const RATE_WINDOW_MS = 60 * 1000;
const RATE_LIMIT = 12;

const cache = new Map();
const meters = new Map();

function normalise(query) {
  return String(query || '').toLowerCase().replace(/\s+/g, ' ').trim().slice(0, 90);
}

function callerOf(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded) return forwarded.split(',')[0].trim();
  return req.headers['x-real-ip'] || 'anonymous';
}

/* A fixed window is enough here. The limit exists to stop one visitor
   draining a shared daily quota, not to police traffic to the millisecond. */
function withinRate(caller) {
  const now = Date.now();
  const meter = meters.get(caller);
  if (!meter || now - meter.since > RATE_WINDOW_MS) {
    meters.set(caller, { since: now, count: 1 });
    if (meters.size > 2000) {
      for (const [key, value] of meters) {
        if (now - value.since > RATE_WINDOW_MS) meters.delete(key);
      }
    }
    return true;
  }
  meter.count += 1;
  return meter.count <= RATE_LIMIT;
}

function remember(key, payload) {
  cache.set(key, { payload, at: Date.now() });
  if (cache.size > CACHE_CEILING) {
    const oldest = [...cache.entries()].sort((a, b) => a[1].at - b[1].at).slice(0, 80);
    for (const [staleKey] of oldest) cache.delete(staleKey);
  }
}

function recall(key) {
  const held = cache.get(key);
  if (!held) return null;
  if (Date.now() - held.at > CACHE_TTL_MS) { cache.delete(key); return null; }
  return held.payload;
}

function seconds(iso) {
  const match = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(iso || '');
  if (!match) return null;
  return (Number(match[1]) || 0) * 3600 + (Number(match[2]) || 0) * 60 + (Number(match[3]) || 0);
}

function count(value) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 0;
}

/* The same shelving rules the chart uses, so a searched record and a
   charted record are described in the same vocabulary. */
const CULTURES = [
  ['Kikuyu', /\b(mugithi|kikuyu|gikuyu|muthirigu)\b/],
  ['Luo', /\b(ohangla|luo|dholuo|nyatiti|benga)\b/],
  ['Kamba', /\b(kamba|kikamba|katitu|kilumi)\b/],
  ['Kalenjin', /\b(kalenjin|kipsigis|nandi)\b/],
  ['Luhya', /\b(luhya|isukuti|bukusu|maragoli)\b/],
  ['Mijikenda', /\b(mijikenda|giriama|chonyi|duruma|sengenya)\b/],
  ['Maasai', /\b(maasai|masai|olmaa)\b/],
  ['Kisii', /\b(kisii|gusii|ekegusii)\b/],
  ['Meru', /\b(meru|kimeru)\b/],
  ['Taita', /\b(taita|dawida)\b/],
  ['Somali', /\b(somali|soomaali)\b/],
  ['Turkana', /\b(turkana|ngiturkana)\b/],
  ['Swahili coast', /\b(taarab|mwanzele|chakacha)\b/],
];

const GENRES = [
  ['gengetone', /\b(gengetone|genge|sheng|mbogi|ochungulo)\b/],
  ['drill', /\b(drill|trapcore)\b/],
  ['amapiano', /\b(amapiano|yanos|log\s?drum)\b/],
  ['bongo', /\b(bongo|singeli|bongofleva|wasafi|tanzania)\b/],
  ['gospel', /\b(gospel|worship|praise|mungu|yesu|jesus|tenzi)\b/],
  ['reggae', /\b(reggae|dancehall|riddim|rasta)\b/],
  ['hiphop', /\b(hip\s?hop|rap|cypher|freestyle)\b/],
  ['rnb', /\b(r&b|rnb|soul|ballad|acoustic)\b/],
  ['afrobeat', /\b(afrobeat|afrobeats|afropop|naija)\b/],
];

function shelve(title, channel) {
  const hay = `${title} ${channel}`.toLowerCase();
  let culture = null;
  for (const [name, pattern] of CULTURES) {
    if (pattern.test(hay)) { culture = name; break; }
  }
  if (culture) return { genre: 'tribal', culture };
  for (const [name, pattern] of GENRES) {
    if (pattern.test(hay)) return { genre: name, culture: null };
  }
  return { genre: 'other', culture: null };
}

async function askYouTube(key, query) {
  const search = new URL('https://www.googleapis.com/youtube/v3/search');
  search.search = new URLSearchParams({
    part: 'snippet',
    q: query,
    type: 'video',
    videoCategoryId: '10',
    videoEmbeddable: 'true',
    regionCode: 'KE',
    maxResults: '12',
    key,
  }).toString();

  const found = await fetch(search, { signal: AbortSignal.timeout(9000) });
  const payload = await found.json();
  if (!found.ok) {
    const reason = payload?.error?.errors?.[0]?.reason || '';
    const error = new Error(payload?.error?.message || `YouTube returned ${found.status}`);
    error.quota = reason === 'quotaExceeded' || reason === 'dailyLimitExceeded';
    throw error;
  }

  const items = Array.isArray(payload.items) ? payload.items : [];
  const ids = items.map((item) => item?.id?.videoId).filter(Boolean);
  if (!ids.length) return [];

  /* A second call costs 1 unit and buys real view counts and durations.
     Without it a search result looks like a stranger next to the chart. */
  const detail = new URL('https://www.googleapis.com/youtube/v3/videos');
  detail.search = new URLSearchParams({
    part: 'snippet,statistics,contentDetails',
    id: ids.join(','),
    key,
  }).toString();

  let details = new Map();
  try {
    const enriched = await fetch(detail, { signal: AbortSignal.timeout(9000) });
    const body = await enriched.json();
    if (enriched.ok && Array.isArray(body.items)) {
      details = new Map(body.items.map((item) => [item.id, item]));
    }
  } catch (_ignored) {
    /* Detail is an enhancement. Losing it costs numbers, not results. */
  }

  return ids.map((id) => {
    const full = details.get(id);
    const base = items.find((item) => item?.id?.videoId === id);
    const title = String(full?.snippet?.title || base?.snippet?.title || 'Untitled').trim();
    const artist = String(full?.snippet?.channelTitle || base?.snippet?.channelTitle || 'Unknown artist').trim();
    const shelf = shelve(title, artist);
    return {
      videoId: id,
      title,
      artist,
      thumb: full?.snippet?.thumbnails?.high?.url
        || base?.snippet?.thumbnails?.high?.url
        || base?.snippet?.thumbnails?.medium?.url
        || null,
      published: full?.snippet?.publishedAt || base?.snippet?.publishedAt || null,
      durationSeconds: seconds(full?.contentDetails?.duration),
      views: count(full?.statistics?.viewCount),
      likes: count(full?.statistics?.likeCount),
      genre: shelf.genre,
      culture: shelf.culture,
    };
  });
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(204).end();
  }
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  const query = normalise(req.query?.q);
  if (query.length < 2) {
    return res.status(400).json({ error: 'query_too_short', message: 'Type at least two characters.' });
  }

  const held = recall(query);
  if (held) {
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=21600');
    return res.status(200).json({ query, cached: true, results: held });
  }

  const key = optional('YOUTUBE_API_KEY');
  if (!key) {
    /* Not an error state for the visitor. The chart still plays; search is
       simply switched off until a key exists. */
    return res.status(200).json({
      query,
      results: [],
      unconfigured: true,
      message: 'Search is not switched on yet. The chart still plays.',
    });
  }

  if (!withinRate(callerOf(req))) {
    return res.status(429).json({
      error: 'rate_limited',
      message: 'That is a lot of searching. Give it a minute.',
    });
  }

  try {
    const results = await askYouTube(key, query);
    remember(query, results);
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=21600');
    return res.status(200).json({ query, cached: false, results });
  } catch (error) {
    if (error?.quota) {
      return res.status(200).json({
        query,
        results: [],
        exhausted: true,
        message: 'Search has used up today\u2019s allowance. The chart is unaffected.',
      });
    }
    console.error('[music-search]', error?.message || error);
    return res.status(502).json({
      error: 'search_failed',
      message: 'Could not reach YouTube just now. Try again shortly.',
    });
  }
}
