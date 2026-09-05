import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import postgres from "npm:postgres@3.4.7";
import { corsHeaders as sdkCorsHeaders } from "npm:@supabase/supabase-js@2.112.3/cors";

/* ═══════════════════════════════════════════════════════════════════════════
   CABANA PULSE · the room behind the music page
   ───────────────────────────────────────────────────────────────────────────
   Three jobs, one function, one YouTube key that never leaves the server.

     action=chart    the board: 50 tracks, artist standings, three titles
     action=search   a visitor types a song name and gets something playable.
                     Cached hard, because search costs 100 quota units a call
                     against a 10,000 unit day.
     action=artist   one artist's shelf, for the podium detail panel

   Ranking artists is deliberately not "whoever holds rank 1". Three records
   in the middle of the board beat one hit at the top, and a record that is
   climbing beats one coasting on lifetime views. The score below is the
   whole argument, written once.
   ═══════════════════════════════════════════════════════════════════════════ */

const DATABASE_URL = Deno.env.get("SUPABASE_DB_URL") || "";
const YOUTUBE_API_KEY = Deno.env.get("YOUTUBE_API_KEY") || "";
const CACHE_MS = 30 * 60 * 1000;
const LOCK_MS = 75 * 1000;
const MARKET = "KE";
const SEARCH_TTL_HOURS = 12;
const LEGACY_CHART_URL = "https://uinxdkpnxwyrecnxjhdm.supabase.co/functions/v1/youtube-sync?type=trending&region=KE";

const database = DATABASE_URL ? postgres(DATABASE_URL, {
  prepare: false,
  max: 1,
  idle_timeout: 2,
  connect_timeout: 10,
}) : null;

const ALLOWED_ORIGINS = new Set([
  "https://cabana.africa",
  "https://www.cabana.africa",
  "https://apatmento.space",
  "https://www.apatmento.space",
  "https://kenya-music.vercel.app",
]);

function cors(req: Request) {
  const origin = req.headers.get("origin") || "";
  const isPreview = /^https:\/\/[a-z0-9-]+(?:-worlddossy-7636s-projects)?\.vercel\.app$/i.test(origin);
  const isLocal = /^https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?$/i.test(origin);
  const allowOrigin = ALLOWED_ORIGINS.has(origin) || isPreview || isLocal
    ? origin
    : "https://cabana.africa";
  return {
    ...sdkCorsHeaders,
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    Vary: "Origin",
  };
}

function json(req: Request, status: number, body: unknown, cache = "no-store") {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...cors(req),
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": cache,
    },
  });
}

function number(value: unknown) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 0;
}

function durationSeconds(value: string | undefined) {
  const match = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(value || "");
  if (!match) return null;
  return number(match[1]) * 3600 + number(match[2]) * 60 + number(match[3]);
}

/* ── how a record is shelved ───────────────────────────────────────────────
   Format answers "what kind of thing is this" (a record, a mix, a live set).
   Genre answers "what does it sound like". Culture answers "whose language
   is it in", which is a separate question from genre and the reason Tribal
   is its own shelf rather than being folded into Other. */

const CULTURES: Array<[string, RegExp]> = [
  ["Kikuyu", /\b(mugithi|kikuyu|gikuyu|kiuk|muthirigu)\b/],
  ["Luo", /\b(ohangla|luo|dholuo|nyatiti|benga)\b/],
  ["Kamba", /\b(kamba|kikamba|katitu|kilumi)\b/],
  ["Kalenjin", /\b(kalenjin|kipsigis|nandi)\b/],
  ["Luhya", /\b(luhya|isukuti|bukusu|maragoli)\b/],
  ["Mijikenda", /\b(mijikenda|giriama|chonyi|duruma|sengenya)\b/],
  ["Maasai", /\b(maasai|masai|olmaa)\b/],
  ["Kisii", /\b(kisii|gusii|ekegusii)\b/],
  ["Meru", /\b(meru|kimeru)\b/],
  ["Taita", /\b(taita|dawida)\b/],
  ["Somali", /\b(somali|soomaali)\b/],
  ["Turkana", /\b(turkana|ngiturkana)\b/],
  ["Swahili coast", /\b(taarab|mwanzele|chakacha)\b/],
];

const GENRES: Array<[string, RegExp]> = [
  ["gengetone", /\b(gengetone|genge|sheng|mbogi|boondocks|ochungulo)\b/],
  ["drill", /\b(drill|trapcore|plug)\b/],
  ["amapiano", /\b(amapiano|log\s?drum|yanos)\b/],
  ["bongo", /\b(bongo|singeli|tanzania|bongofleva|wasafi)\b/],
  ["gospel", /\b(gospel|worship|praise|bwana|mungu|yesu|jesus|hymn|tenzi)\b/],
  ["reggae", /\b(reggae|dancehall|riddim|rasta|roots\s?rock)\b/],
  ["hiphop", /\b(hip\s?hop|rap|cypher|freestyle|bars)\b/],
  ["rnb", /\b(r&b|rnb|soul|ballad|acoustic)\b/],
  ["afrobeat", /\b(afrobeat|afrobeats|afropop|afro\s?fusion|naija)\b/],
];

function formatFor(haystack: string) {
  if (/\b(live|concert|performance|session|unplugged)\b/.test(haystack)) return "live";
  if (/\b(dj|deejay|mix|mixtape|nonstop|mashup|set)\b/.test(haystack)) return "dj_mix";
  if (/\b(mugithi|ohangla|benga|traditional|cultural|vernacular)\b/.test(haystack)) return "roots";
  return "track";
}

function shelveFor(title: string, channel: string) {
  const haystack = `${title} ${channel}`.toLowerCase();
  let culture: string | null = null;
  for (const [name, pattern] of CULTURES) {
    if (pattern.test(haystack)) { culture = name; break; }
  }
  let genre = culture ? "tribal" : "other";
  if (!culture) {
    for (const [name, pattern] of GENRES) {
      if (pattern.test(haystack)) { genre = name; break; }
    }
  }
  return { format: formatFor(haystack), genre, culture };
}

/* Channel names carry noise that would split one artist across three rows:
   "Mejja Genge", "Mejja Official" and "MejjaVEVO" are one person. */
function artistKeyFor(artist: string) {
  const stripped = artist
    .toLowerCase()
    .replace(/\b(official|vevo|music|records|tv|hd|entertainment|media|studios?|channel)\b/g, " ")
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 60);
  return stripped || artist.toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 60);
}

function publicTrack(row: Record<string, any>) {
  return {
    videoId: row.video_id,
    rank: number(row.rank),
    previousRank: row.previous_rank == null ? null : number(row.previous_rank),
    title: row.title,
    artist: row.artist,
    thumb: row.thumbnail_url,
    published: row.published_at,
    durationSeconds: row.duration_seconds,
    views: number(row.views),
    likes: number(row.likes),
    comments: number(row.comments),
    viewsDelta: number(row.views_delta),
    trendScore: Number(row.trend_score || 0),
    format: row.format || "track",
    genre: row.genre || "other",
    culture: row.culture || null,
    refreshedAt: row.refreshed_at,
  };
}

function publicArtist(row: Record<string, any>) {
  return {
    key: row.artist_key,
    name: row.artist,
    rank: number(row.rank),
    previousRank: row.previous_rank == null ? null : number(row.previous_rank),
    score: Number(row.score || 0),
    tracks: number(row.tracks_count),
    bestRank: row.best_rank == null ? null : number(row.best_rank),
    views: number(row.total_views),
    viewsDelta: number(row.views_delta),
    likes: number(row.total_likes),
    leadVideoId: row.lead_video_id,
    leadTitle: row.lead_title,
    thumb: row.thumbnail_url,
    genre: row.genre || "other",
    culture: row.culture || null,
    since: row.first_seen_at,
  };
}

function publicAward(row: Record<string, any>) {
  return {
    period: row.period,
    periodStart: row.period_start,
    name: row.artist,
    key: row.artist_key,
    score: Number(row.score || 0),
    viewsDelta: number(row.views_delta),
    days: number(row.days_counted),
    thumb: row.thumbnail_url,
    leadVideoId: row.lead_video_id,
    leadTitle: row.lead_title,
    decidedAt: row.decided_at,
  };
}

async function cachedChart() {
  if (!database) throw new Error("database_unavailable");
  const [tracks, metadata, artists, awards] = await Promise.all([
    database`select * from public.music_chart_public where market = ${MARKET} order by rank`,
    database`select * from public.music_chart_meta where market = ${MARKET} limit 1`,
    database`select * from public.music_artists_public where market = ${MARKET} order by rank limit 20`,
    database`
      select distinct on (period) *
      from public.music_chart_awards
      where market = ${MARKET}
      order by period, period_start desc
    `,
  ]);
  return {
    tracks: tracks.map(publicTrack),
    meta: metadata[0] || null,
    artists: artists.map(publicArtist),
    awards: awards.map(publicAward),
  };
}

function isFresh(meta: Record<string, any> | null, count: number) {
  if (!meta?.last_refreshed_at || !count) return false;
  return Date.now() - Date.parse(meta.last_refreshed_at) < CACHE_MS;
}

async function claimRefresh(meta: Record<string, any> | null) {
  if (!database) return null;
  const now = new Date();
  if (meta?.refreshing_until && Date.parse(meta.refreshing_until) > now.getTime()) return null;

  const token = crypto.randomUUID();
  const rows = meta?.updated_at
    ? await database`
        update public.music_chart_meta
        set refresh_token = ${token},
            refreshing_until = ${new Date(now.getTime() + LOCK_MS)},
            updated_at = ${now}
        where market = ${MARKET} and updated_at = ${meta.updated_at}
        returning refresh_token
      `
    : [];
  return rows[0]?.refresh_token === token ? token : null;
}

async function youtubeMostPopular() {
  const endpoint = new URL("https://www.googleapis.com/youtube/v3/videos");
  endpoint.search = new URLSearchParams({
    part: "snippet,statistics,contentDetails",
    chart: "mostPopular",
    regionCode: MARKET,
    videoCategoryId: "10",
    maxResults: "50",
    key: YOUTUBE_API_KEY,
  }).toString();

  const response = await fetch(endpoint, { signal: AbortSignal.timeout(15_000) });
  const payload = await response.json();
  if (!response.ok) {
    const message = payload?.error?.message || `YouTube returned ${response.status}`;
    throw new Error(message);
  }
  return Array.isArray(payload.items) ? payload.items : [];
}

async function legacyMusicCache() {
  const response = await fetch(LEGACY_CHART_URL, { signal: AbortSignal.timeout(15_000) });
  const payload = await response.json();
  if (!response.ok || payload?.error) {
    throw new Error(payload?.error || `Legacy music cache returned ${response.status}`);
  }

  const combined = [
    ...(Array.isArray(payload.songs) ? payload.songs.map((item: any) => ({ ...item, _format: "track" })) : []),
    ...(Array.isArray(payload.mixes) ? payload.mixes.map((item: any) => ({ ...item, _format: "dj_mix" })) : []),
    ...(Array.isArray(payload.tribal) ? payload.tribal.map((item: any) => ({ ...item, _format: "roots" })) : []),
  ];
  const seen = new Set<string>();
  return combined.filter((item: any) => {
    const id = item.videoId || item.video_id;
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  }).slice(0, 50).map((item: any) => ({
    id: item.videoId || item.video_id,
    snippet: {
      title: item.title,
      channelTitle: item.artist,
      publishedAt: item.published,
      thumbnails: { high: { url: item.thumb } },
    },
    statistics: {
      viewCount: item.views,
      likeCount: item.likes,
      commentCount: item.comments,
    },
    contentDetails: {},
    _format: item._format,
  }));
}

async function upstreamChart() {
  if (YOUTUBE_API_KEY) {
    return { videos: await youtubeMostPopular(), source: "youtube_most_popular" };
  }
  return { videos: await legacyMusicCache(), source: "legacy_music_chart" };
}

/* ── standings ─────────────────────────────────────────────────────────────
   Every track an artist holds contributes. Position on the board is worth
   more at the top but never worth everything, momentum counts for more than
   lifetime views, and depth adds a modest premium so a catalogue beats a
   fluke without letting a label channel with forty uploads run away with
   the year. */
function standingsFrom(rows: Array<Record<string, any>>, refreshedAt: string) {
  const bucket = new Map<string, any>();

  for (const row of rows) {
    const key = artistKeyFor(row.artist);
    if (!key) continue;
    const positional = Math.max(0, 51 - row.rank) / 50;
    const momentum = Math.log10(1 + row.views_delta) * 4;
    const reach = Math.log10(1 + row.views) * 1.6;
    const affection = Math.log10(1 + row.likes) * 0.9;
    const weight = positional * 10 + momentum + reach + affection;

    const held = bucket.get(key);
    if (!held) {
      bucket.set(key, {
        artist_key: key,
        artist: row.artist,
        score: weight,
        tracks_count: 1,
        best_rank: row.rank,
        total_views: row.views,
        views_delta: row.views_delta,
        total_likes: row.likes,
        lead_video_id: row.video_id,
        lead_title: row.title,
        thumbnail_url: row.thumbnail_url,
        genre: row.genre,
        culture: row.culture,
      });
      continue;
    }
    held.score += weight;
    held.tracks_count += 1;
    held.total_views += row.views;
    held.views_delta += row.views_delta;
    held.total_likes += row.likes;
    if (row.rank < held.best_rank) {
      held.best_rank = row.rank;
      held.lead_video_id = row.video_id;
      held.lead_title = row.title;
      held.thumbnail_url = row.thumbnail_url;
      held.genre = row.genre;
      held.culture = row.culture;
    }
  }

  return [...bucket.values()]
    .map((entry) => ({
      ...entry,
      score: Number((entry.score * (1 + Math.log10(entry.tracks_count) * 0.35)).toFixed(4)),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 60)
    .map((entry, index) => ({
      market: MARKET,
      ...entry,
      rank: index + 1,
      active: true,
      last_seen_at: refreshedAt,
      refreshed_at: refreshedAt,
    }));
}

const AWARD_WINDOWS: Array<[string, string]> = [
  ["week", "7 days"],
  ["month", "30 days"],
  ["year", "365 days"],
];

async function decideAwards(transaction: any, refreshedAt: string) {
  for (const [period, span] of AWARD_WINDOWS) {
    const [winner] = await transaction`
      select artist_key,
             max(artist) as artist,
             sum(score) as score,
             sum(views_delta) as views_delta,
             count(*)::int as days_counted,
             max(thumbnail_url) as thumbnail_url
      from public.music_chart_artist_daily
      where market = ${MARKET}
        and day > (current_date - ${span}::interval)
      group by artist_key
      order by sum(score) desc
      limit 1
    `;
    if (!winner) continue;

    const [lead] = await transaction`
      select lead_video_id, lead_title, thumbnail_url
      from public.music_chart_artists
      where market = ${MARKET} and artist_key = ${winner.artist_key}
      limit 1
    `;

    const [{ d: periodStart }] = period === "week"
      ? await transaction`select date_trunc('week', current_date)::date as d`
      : period === "month"
        ? await transaction`select date_trunc('month', current_date)::date as d`
        : await transaction`select date_trunc('year', current_date)::date as d`;

    await transaction`
      insert into public.music_chart_awards
        (market, period, period_start, artist_key, artist, score, views_delta,
         days_counted, thumbnail_url, lead_video_id, lead_title, decided_at)
      values (${MARKET}, ${period}, ${periodStart}, ${winner.artist_key},
              ${winner.artist}, ${Number(winner.score) || 0}, ${Number(winner.views_delta) || 0},
              ${winner.days_counted}, ${lead?.thumbnail_url || winner.thumbnail_url || null},
              ${lead?.lead_video_id || null}, ${lead?.lead_title || null}, ${refreshedAt})
      on conflict (market, period, period_start) do update set
        artist_key = excluded.artist_key,
        artist = excluded.artist,
        score = excluded.score,
        views_delta = excluded.views_delta,
        days_counted = excluded.days_counted,
        thumbnail_url = excluded.thumbnail_url,
        lead_video_id = excluded.lead_video_id,
        lead_title = excluded.lead_title,
        decided_at = excluded.decided_at
    `;
  }
}

async function refreshChart(token: string) {
  try {
    if (!database) {
      throw new Error("Cabana Pulse server configuration is incomplete");
    }

    const [previous, previousArtists, upstream] = await Promise.all([
      database`select video_id, rank, views, first_seen_at from public.music_chart_tracks where market = ${MARKET}`,
      database`select artist_key, rank from public.music_chart_artists where market = ${MARKET}`,
      upstreamChart(),
    ]);
    const { videos, source } = upstream;

    const before = new Map((previous || []).map((row) => [row.video_id, row]));
    const beforeArtists = new Map((previousArtists || []).map((row) => [row.artist_key, row.rank]));
    const refreshedAt = new Date().toISOString();

    const rows = videos.map((video: any, index: number) => {
      const old: any = before.get(video.id);
      const views = number(video.statistics?.viewCount);
      const likes = number(video.statistics?.likeCount);
      const comments = number(video.statistics?.commentCount);
      const previousViews = number(old?.views);
      const viewsDelta = old ? Math.max(0, views - previousViews) : 0;
      const published = video.snippet?.publishedAt || null;
      const ageDays = Math.max(1, (Date.now() - Date.parse(published || refreshedAt)) / 86_400_000);
      const engagement = views ? (likes + comments * 2) / views : 0;
      const trendScore = viewsDelta > 0
        ? viewsDelta * (1 + engagement * 12)
        : (views / ageDays) * (1 + engagement * 8);
      const artist = String(video.snippet?.channelTitle || "Unknown artist").trim();
      const title = String(video.snippet?.title || "Untitled").trim();
      const shelf = shelveFor(title, artist);

      return {
        market: MARKET,
        video_id: video.id,
        rank: index + 1,
        previous_rank: old?.rank || null,
        title,
        artist,
        thumbnail_url: video.snippet?.thumbnails?.maxres?.url
          || video.snippet?.thumbnails?.high?.url
          || video.snippet?.thumbnails?.medium?.url
          || null,
        published_at: published,
        duration_seconds: durationSeconds(video.contentDetails?.duration),
        views,
        likes,
        comments,
        views_delta: viewsDelta,
        trend_score: Number(trendScore.toFixed(3)),
        format: video._format || shelf.format,
        genre: shelf.genre,
        culture: shelf.culture,
        active: true,
        last_seen_at: refreshedAt,
        refreshed_at: refreshedAt,
      };
    }).filter((row: Record<string, any>) => row.video_id && row.title);

    if (!rows.length) throw new Error("YouTube returned an empty Kenya music chart");

    const standings = standingsFrom(rows, refreshedAt).map((entry) => ({
      ...entry,
      previous_rank: beforeArtists.get(entry.artist_key) ?? null,
    }));
    const ids = rows.map((row: Record<string, any>) => row.video_id);
    const artistKeys = standings.map((entry) => entry.artist_key);

    await database.begin(async (transaction) => {
      await transaction`
        insert into public.music_chart_tracks ${transaction(rows,
          "market", "video_id", "rank", "previous_rank", "title", "artist",
          "thumbnail_url", "published_at", "duration_seconds", "views", "likes",
          "comments", "views_delta", "trend_score", "format", "genre", "culture",
          "active", "last_seen_at", "refreshed_at")}
        on conflict (market, video_id) do update set
          rank = excluded.rank,
          previous_rank = excluded.previous_rank,
          title = excluded.title,
          artist = excluded.artist,
          thumbnail_url = excluded.thumbnail_url,
          published_at = excluded.published_at,
          duration_seconds = excluded.duration_seconds,
          views = excluded.views,
          likes = excluded.likes,
          comments = excluded.comments,
          views_delta = excluded.views_delta,
          trend_score = excluded.trend_score,
          format = excluded.format,
          genre = excluded.genre,
          culture = excluded.culture,
          active = true,
          last_seen_at = excluded.last_seen_at,
          refreshed_at = excluded.refreshed_at
      `;
      await transaction`
        update public.music_chart_tracks
        set active = false, refreshed_at = ${refreshedAt}
        where market = ${MARKET} and video_id not in ${transaction(ids)}
      `;

      if (standings.length) {
        await transaction`
          insert into public.music_chart_artists ${transaction(standings,
            "market", "artist_key", "artist", "rank", "previous_rank", "score",
            "tracks_count", "best_rank", "total_views", "views_delta", "total_likes",
            "lead_video_id", "lead_title", "thumbnail_url", "genre", "culture",
            "active", "last_seen_at", "refreshed_at")}
          on conflict (market, artist_key) do update set
            artist = excluded.artist,
            rank = excluded.rank,
            previous_rank = excluded.previous_rank,
            score = excluded.score,
            tracks_count = excluded.tracks_count,
            best_rank = excluded.best_rank,
            total_views = excluded.total_views,
            views_delta = excluded.views_delta,
            total_likes = excluded.total_likes,
            lead_video_id = excluded.lead_video_id,
            lead_title = excluded.lead_title,
            thumbnail_url = excluded.thumbnail_url,
            genre = excluded.genre,
            culture = excluded.culture,
            active = true,
            last_seen_at = excluded.last_seen_at,
            refreshed_at = excluded.refreshed_at
        `;
        await transaction`
          update public.music_chart_artists
          set active = false, refreshed_at = ${refreshedAt}
          where market = ${MARKET} and artist_key not in ${transaction(artistKeys)}
        `;

        /* One row per artist per day. Later refreshes on the same day replace
           the earlier snapshot rather than stacking, so a busy day of
           refreshes cannot inflate a title. */
        const today = refreshedAt.slice(0, 10);
        const daily = standings.slice(0, 40).map((entry) => ({
          market: MARKET,
          day: today,
          artist_key: entry.artist_key,
          artist: entry.artist,
          score: entry.score,
          views_delta: entry.views_delta,
          best_rank: entry.best_rank,
          thumbnail_url: entry.thumbnail_url,
        }));
        await transaction`
          insert into public.music_chart_artist_daily ${transaction(daily,
            "market", "day", "artist_key", "artist", "score", "views_delta",
            "best_rank", "thumbnail_url")}
          on conflict (market, day, artist_key) do update set
            artist = excluded.artist,
            score = excluded.score,
            views_delta = excluded.views_delta,
            best_rank = excluded.best_rank,
            thumbnail_url = excluded.thumbnail_url
        `;
        await transaction`
          delete from public.music_chart_artist_daily
          where market = ${MARKET} and day < (current_date - interval '400 days')
        `;

        await decideAwards(transaction, refreshedAt);
      }

      await transaction`
        update public.music_chart_meta
        set source = ${source},
            last_refreshed_at = ${refreshedAt},
            next_refresh_at = ${new Date(Date.now() + CACHE_MS)},
            refreshing_until = null,
            refresh_token = null,
            tracks_count = ${rows.length},
            last_error = null,
            updated_at = ${refreshedAt}
        where market = ${MARKET} and refresh_token = ${token}
      `;
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (database) {
      await database`
        update public.music_chart_meta
        set refreshing_until = null,
            refresh_token = null,
            last_error = ${message.slice(0, 500)},
            updated_at = ${new Date()}
        where market = ${MARKET} and refresh_token = ${token}
      `;
    }
    throw error;
  }
}

/* ── search ────────────────────────────────────────────────────────────────
   A visitor types "sol generation" and expects a playable result. YouTube
   search costs 100 units of a 10,000 unit day, so a repeated query must
   never reach Google twice. Results are keyed on the normalised query and
   held for twelve hours. */

function searchKey(query: string) {
  return query.toLowerCase().replace(/\s+/g, " ").trim().slice(0, 90);
}

async function youtubeSearch(query: string) {
  if (!YOUTUBE_API_KEY) throw new Error("search_unconfigured");

  const endpoint = new URL("https://www.googleapis.com/youtube/v3/search");
  endpoint.search = new URLSearchParams({
    part: "snippet",
    q: query,
    type: "video",
    videoCategoryId: "10",
    videoEmbeddable: "true",
    regionCode: MARKET,
    maxResults: "12",
    key: YOUTUBE_API_KEY,
  }).toString();

  const response = await fetch(endpoint, { signal: AbortSignal.timeout(12_000) });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.error?.message || `YouTube search returned ${response.status}`);
  }

  const items = Array.isArray(payload.items) ? payload.items : [];
  const ids = items.map((item: any) => item?.id?.videoId).filter(Boolean);
  if (!ids.length) return [];

  /* A second call at 1 unit buys real view counts and durations, which is
     what makes a search result feel like part of the same chart. */
  const detailUrl = new URL("https://www.googleapis.com/youtube/v3/videos");
  detailUrl.search = new URLSearchParams({
    part: "snippet,statistics,contentDetails",
    id: ids.join(","),
    key: YOUTUBE_API_KEY,
  }).toString();
  const detailResponse = await fetch(detailUrl, { signal: AbortSignal.timeout(12_000) });
  const detail = await detailResponse.json();
  const details = new Map(
    (Array.isArray(detail?.items) ? detail.items : []).map((item: any) => [item.id, item]),
  );

  return ids.map((id: string) => {
    const full: any = details.get(id);
    const base = items.find((item: any) => item?.id?.videoId === id);
    const title = String(full?.snippet?.title || base?.snippet?.title || "Untitled").trim();
    const artist = String(full?.snippet?.channelTitle || base?.snippet?.channelTitle || "Unknown artist").trim();
    const shelf = shelveFor(title, artist);
    return {
      videoId: id,
      title,
      artist,
      thumb: full?.snippet?.thumbnails?.high?.url
        || base?.snippet?.thumbnails?.high?.url
        || base?.snippet?.thumbnails?.medium?.url
        || null,
      published: full?.snippet?.publishedAt || base?.snippet?.publishedAt || null,
      durationSeconds: durationSeconds(full?.contentDetails?.duration),
      views: number(full?.statistics?.viewCount),
      likes: number(full?.statistics?.likeCount),
      genre: shelf.genre,
      culture: shelf.culture,
      format: shelf.format,
    };
  });
}

async function handleSearch(req: Request, query: string) {
  const key = searchKey(query);
  if (key.length < 2) return json(req, 400, { error: "query_too_short" });
  if (!database) return json(req, 503, { error: "search_unavailable" });

  const [cached] = await database`
    select results from public.music_search_cache
    where query_key = ${key} and expires_at > now()
    limit 1
  `;
  if (cached) {
    await database`update public.music_search_cache set hits = hits + 1 where query_key = ${key}`;
    return json(req, 200, { query, cached: true, results: cached.results },
      "public, max-age=300, stale-while-revalidate=3600");
  }

  /* No key configured is a working state, not an error: the board still
     plays, search simply says so rather than throwing at the visitor. */
  let results: unknown[] = [];
  try {
    results = await youtubeSearch(query);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message === "search_unconfigured") {
      return json(req, 200, { query, results: [], unconfigured: true });
    }
    console.error("[youtube-sync] search failed", message);
    return json(req, 502, { error: "search_failed" });
  }

  await database`
    insert into public.music_search_cache (query_key, query, results, expires_at)
    values (${key}, ${query.slice(0, 120)}, ${JSON.stringify(results)}::jsonb,
            ${new Date(Date.now() + SEARCH_TTL_HOURS * 3600_000)})
    on conflict (query_key) do update set
      results = excluded.results,
      expires_at = excluded.expires_at,
      created_at = now()
  `;
  await database`delete from public.music_search_cache where expires_at < now() - interval '2 days'`;

  return json(req, 200, { query, cached: false, results },
    "public, max-age=300, stale-while-revalidate=3600");
}

async function handleArtist(req: Request, key: string) {
  if (!database) return json(req, 503, { error: "artist_unavailable" });
  if (!key) return json(req, 400, { error: "artist_key_required" });

  const [artist] = await database`
    select * from public.music_artists_public
    where market = ${MARKET} and artist_key = ${key} limit 1
  `;
  if (!artist) return json(req, 404, { error: "artist_not_found" });

  const [tracks, history] = await Promise.all([
    database`
      select * from public.music_chart_public
      where market = ${MARKET} and artist = ${artist.artist}
      order by rank
    `,
    database`
      select day, score, best_rank from public.music_chart_artist_daily
      where market = ${MARKET} and artist_key = ${key}
      order by day desc limit 30
    `,
  ]);

  return json(req, 200, {
    artist: publicArtist(artist),
    tracks: tracks.map(publicTrack),
    history,
  }, "public, max-age=120, stale-while-revalidate=600");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(req) });
  if (req.method !== "GET") return json(req, 405, { error: "method_not_allowed" });

  const url = new URL(req.url);
  const action = url.searchParams.get("action") || "chart";

  try {
    if (action === "search") {
      return await handleSearch(req, String(url.searchParams.get("q") || ""));
    }
    if (action === "artist") {
      return await handleArtist(req, String(url.searchParams.get("key") || ""));
    }
    if (action !== "chart") {
      return json(req, 404, { error: "unsupported_action" });
    }

    let current = await cachedChart();
    if (isFresh(current.meta, current.tracks.length)) {
      return json(req, 200, { ...current, stale: false }, "public, max-age=60, stale-while-revalidate=300");
    }

    const token = await claimRefresh(current.meta);
    if (token) {
      try {
        await refreshChart(token);
      } catch (error) {
        console.error("[youtube-sync] refresh failed", error);
      }
    } else if (!current.tracks.length) {
      await new Promise((resolve) => setTimeout(resolve, 900));
    }

    current = await cachedChart();
    if (!current.tracks.length) {
      return json(req, 503, { error: "chart_unavailable", meta: current.meta });
    }
    return json(req, 200, {
      ...current,
      stale: !isFresh(current.meta, current.tracks.length),
    }, "public, max-age=30, stale-while-revalidate=180");
  } catch (error) {
    console.error("[youtube-sync] request failed", error);
    return json(req, 500, { error: "chart_unavailable" });
  }
});
