import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import postgres from "npm:postgres@3.4.7";
import { corsHeaders as sdkCorsHeaders } from "npm:@supabase/supabase-js@2.112.3/cors";

const DATABASE_URL = Deno.env.get("SUPABASE_DB_URL") || "";
const YOUTUBE_API_KEY = Deno.env.get("YOUTUBE_API_KEY") || "";
const CACHE_MS = 30 * 60 * 1000;
const LOCK_MS = 75 * 1000;
const MARKET = "KE";
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

function formatFor(title: string, channel: string) {
  const haystack = `${title} ${channel}`.toLowerCase();
  if (/\b(live|concert|performance|session)\b/.test(haystack)) return "live";
  if (/\b(dj|deejay|mix|mixtape|nonstop|mashup|set)\b/.test(haystack)) return "dj_mix";
  if (/\b(mugithi|ohangla|benga|kalenjin|kamba|kikuyu|luo|traditional|cultural|vernacular)\b/.test(haystack)) return "roots";
  return "track";
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
    refreshedAt: row.refreshed_at,
  };
}

async function cachedChart() {
  if (!database) throw new Error("database_unavailable");
  const [tracks, metadata] = await Promise.all([
    database`select * from public.music_chart_public where market = ${MARKET} order by rank`,
    database`select * from public.music_chart_meta where market = ${MARKET} limit 1`,
  ]);
  return { tracks: tracks.map(publicTrack), meta: metadata[0] || null };
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

async function refreshChart(token: string) {
  try {
    if (!database) {
      throw new Error("Cabana Pulse server configuration is incomplete");
    }

    const [previous, upstream] = await Promise.all([
      database`select video_id, rank, views, first_seen_at from public.music_chart_tracks where market = ${MARKET}`,
      upstreamChart(),
    ]);
    const { videos, source } = upstream;

    const before = new Map((previous || []).map((row) => [row.video_id, row]));
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
        format: video._format || formatFor(title, artist),
        active: true,
        last_seen_at: refreshedAt,
        refreshed_at: refreshedAt,
      };
    }).filter((row: Record<string, any>) => row.video_id && row.title);

    if (!rows.length) throw new Error("YouTube returned an empty Kenya music chart");

    const ids = rows.map((row: Record<string, any>) => row.video_id);
    await database.begin(async (transaction) => {
      await transaction`
        insert into public.music_chart_tracks ${transaction(rows,
          "market", "video_id", "rank", "previous_rank", "title", "artist",
          "thumbnail_url", "published_at", "duration_seconds", "views", "likes",
          "comments", "views_delta", "trend_score", "format", "active",
          "last_seen_at", "refreshed_at")}
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
          active = true,
          last_seen_at = excluded.last_seen_at,
          refreshed_at = excluded.refreshed_at
      `;
      await transaction`
        update public.music_chart_tracks
        set active = false, refreshed_at = ${refreshedAt}
        where market = ${MARKET} and video_id not in ${transaction(ids)}
      `;
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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(req) });
  if (req.method !== "GET") return json(req, 405, { error: "method_not_allowed" });

  const url = new URL(req.url);
  if ((url.searchParams.get("action") || "chart") !== "chart") {
    return json(req, 404, { error: "unsupported_action" });
  }

  try {
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
