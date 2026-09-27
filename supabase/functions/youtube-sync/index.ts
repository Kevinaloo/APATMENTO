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
     action=resolve  a YouTube link or id, turned into what it points at
                     (a video, a channel, a playlist). The console uses it
                     to follow a channel or add a track to a playlist.

   The board has two feeds. With YOUTUBE_API_KEY set, YouTube's own Kenya
   music chart (mostPopular) leads. Beside it, and with no key at all, the
   room follows artists' channels and playlists through YouTube's public
   RSS feeds (music_sources). Those feeds carry view and like counts, so
   new releases are ranked by how fast they are moving, and a short chart
   is filled from them rather than left with gaps. Artists who chart are
   followed automatically, so the release shelf grows on its own.

   Ranking artists is deliberately not "whoever holds rank 1". Three records
   in the middle of the board beat one hit at the top, and a record that is
   climbing beats one coasting on lifetime views. The score below is the
   whole argument, written once.
   ═══════════════════════════════════════════════════════════════════════════ */

const DATABASE_URL = Deno.env.get("SUPABASE_DB_URL") || "";
const YOUTUBE_API_KEY = Deno.env.get("YOUTUBE_API_KEY") || "";
const CACHE_MS = 30 * 60 * 1000;
const LOCK_MS = 150 * 1000;
const MARKET = "KE";
const SEARCH_TTL_HOURS = 12;
const LEGACY_CHART_URL = "https://uinxdkpnxwyrecnxjhdm.supabase.co/functions/v1/youtube-sync?type=trending&region=KE";
const FEED_URL = "https://www.youtube.com/feeds/videos.xml";
const MAX_SOURCES_PER_REFRESH = 80;
const FEED_CONCURRENCY = 8;
const AUTO_FOLLOW_PER_REFRESH = 8;
const CHART_FLOOR = 30;
const CHART_SIZE = 50;
/* youtube.com in the EU answers a bare request with a cookie-consent
   interstitial. These two cookies are the documented "reject all" state,
   which is enough to be shown the page itself. Feeds and oEmbed never
   need them. */
const PAGE_HEADERS = {
  "Accept-Language": "en",
  Cookie: "SOCS=CAI; CONSENT=YES+1",
  "User-Agent": "Mozilla/5.0 (compatible; CabanaPulse/1.0; +https://cabana.africa)",
};

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

/* Titles rarely say what a record sounds like, but the artist usually
   does. Checked after the title patterns, so a gospel title by a pop
   artist is still shelved as gospel. */
const ARTIST_CULTURES: Array<[string, RegExp]> = [
  ["Kikuyu", /\b(samidoh|muigai wa njoroge|muigai kigutha|kamande wa kioi|ben githae|joseph kamaru|jose gatutura|karangu muraya|john de'?mathew|ruth wamuyu|mike rua|salim junior)\b/],
  ["Kamba", /\b(alex kasau|katombi|kativui|maxwell mwalimu|kithungo|ken wa maria|kalapata)\b/],
  ["Luo", /\b(prince indah|emma jalamo|musa jakadala|odongo swagg|osogo winyo|dola kabarry|elisha toto)\b/],
  ["Kalenjin", /\b(emmy kosgei|kipchumba|kenene|msupa s)\b/],
];

const ARTIST_GENRES: Array<[string, RegExp]> = [
  ["gospel", /\b(mercy masika|guardian angel|israel mbonyi|rose muhando|christina shusho|victor muthenya|size 8|daddy owen|kambua|gloria muliro|eunice njeri|paul clement|goodluck gozbert|zabron singers)\b/],
  ["afrobeat", /\b(rema|asake|burna ?boy|wizkid|davido|fireboy|omah lay|joeboy|ayra starr|tems|kizz daniel|olamide|tiwa savage|ckay|victony|shallipopi|seyi vibez|bnxn|ruger|mayorkun|adekunle gold|zinoleesky|young jonn|khaid|odumodublvck|rexxie|lojay)\b/],
  ["amapiano", /\b(tyla|kabza|maphorisa|uncle waffles|focalistic|young stunna|tman xpress|mellow ?(&|and) ?sleazy|kelvin momo|daliwonga|scorpion kings|nkosazana|sir trill|major league)\b/],
  ["bongo", /\b(diamond platnumz|harmonize|zuchu|rayvanny|mbosso|alikiba|marioo|jux|nandy|lava lava|konde boy|kusah|jay melody|phina)\b/],
  ["drill", /\b(buruklyn boyz|dyana cods|lil maina|kushman|mad cleet|hype beast)\b/],
  ["hiphop", /\b(khaligraph|octopizzo|nyashinski|wakadinali|sewersydaa|scar mkadinali|kaa la moto|juliani|king kaka|kristoff|breeder lw)\b/],
  ["gengetone", /\b(mejja|ethic entertainment|sailors|ochungulo|exray|trio mio|zzero sufuri|toxic lyrikali|virusi mbaya|matata|ssaru|femi one)\b/],
  ["afropop", /\b(sauti sol|bien|nviiri|otile brown|nadia mukami|arrow ?bwoy|jovial|sofiya nzau|savara|bensoul|bahati|willy paul|nikita kering|charisma|xenia manasseh|kaskazini)\b/],
];

function formatFor(haystack: string) {
  if (/\b(live|concert|performance|session|unplugged)\b/.test(haystack)) return "live";
  if (/\b(dj|deejay|mix|mixtape|nonstop|mashup|set)\b/.test(haystack)) return "dj_mix";
  if (/\b(mugithi|ohangla|benga|traditional|cultural|vernacular)\b/.test(haystack)) return "roots";
  return "track";
}

function shelveFor(title: string, channel: string) {
  /* "RemaVEVO" is Rema: split the label suffix off so names match. */
  const haystack = `${title} ${channel}`.toLowerCase().replace(/vevo\b/g, " vevo");
  let culture: string | null = null;
  for (const [name, pattern] of CULTURES) {
    if (pattern.test(haystack)) { culture = name; break; }
  }
  if (!culture) {
    for (const [name, pattern] of ARTIST_CULTURES) {
      if (pattern.test(haystack)) { culture = name; break; }
    }
  }
  let genre = culture ? "tribal" : "other";
  if (!culture) {
    for (const [name, pattern] of GENRES) {
      if (pattern.test(haystack)) { genre = name; break; }
    }
  }
  if (genre === "other") {
    for (const [name, pattern] of ARTIST_GENRES) {
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

function publicRelease(row: Record<string, any>) {
  return {
    videoId: row.video_id,
    title: row.title,
    artist: row.artist,
    thumb: row.thumbnail_url,
    published: row.published_at,
    views: number(row.views),
    likes: number(row.likes),
    viewsDelta: number(row.views_delta),
    velocity: Number(row.velocity || 0),
    genre: row.genre || "other",
    culture: row.culture || null,
    format: row.format || "track",
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
  const [tracks, metadata, artists, awards, releases] = await Promise.all([
    database`select * from public.music_chart_public where market = ${MARKET} order by rank`,
    database`select * from public.music_chart_meta where market = ${MARKET} limit 1`,
    database`select * from public.music_artists_public where market = ${MARKET} order by rank limit 20`,
    database`
      select distinct on (period) *
      from public.music_chart_awards
      where market = ${MARKET}
      order by period, period_start desc
    `,
    database`
      select * from public.music_releases_public
      order by published_at desc limit 40
    `,
  ]);
  const meta = metadata[0] ? { ...metadata[0] } : null;
  if (meta) delete meta.refresh_token;
  return {
    tracks: tracks.map(publicTrack),
    meta,
    artists: artists.map(publicArtist),
    awards: awards.map(publicAward),
    releases: releases.map(publicRelease),
  };
}

function isFresh(meta: Record<string, any> | null, count: number) {
  if (!meta?.last_refreshed_at || !count) return false;
  if (meta.force_refresh) return false;
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

/* ── the feeds ─────────────────────────────────────────────────────────────
   A channel's or playlist's public RSS feed lists its latest uploads with
   view and like counts. No key, no quota. Parsed with patterns rather than
   a DOM because the edge runtime has no XML parser and the format is fixed
   by YouTube, not by the channel. */

type FeedItem = {
  videoId: string;
  channelId: string | null;
  title: string;
  artist: string;
  published: string | null;
  thumb: string | null;
  views: number;
  likes: number;
};

function decodeXml(value: string) {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_m, code) => String.fromCharCode(Number(code)))
    .replace(/&amp;/g, "&")
    .trim();
}

function tag(block: string, pattern: RegExp) {
  const match = pattern.exec(block);
  return match ? decodeXml(match[1]) : "";
}

/* Uploads that are plainly not a record: Shorts, interviews, trailers,
   reaction videos. The chart is for music. */
const NOT_A_RECORD = /(#shorts?\b|\b(interview|podcast|behind the scenes|bts|trailer|teaser|reaction|vlog|unboxing|press conference|announcement)\b)/i;

function parseFeed(xml: string): FeedItem[] {
  const out: FeedItem[] = [];
  const entries = xml.split("<entry>").slice(1);
  for (const raw of entries) {
    const block = raw.split("</entry>")[0];
    const videoId = tag(block, /<yt:videoId>([^<]+)<\/yt:videoId>/);
    if (!/^[A-Za-z0-9_-]{11}$/.test(videoId)) continue;
    const title = tag(block, /<title>([\s\S]*?)<\/title>/);
    if (!title || NOT_A_RECORD.test(title)) continue;
    out.push({
      videoId,
      channelId: tag(block, /<yt:channelId>([^<]+)<\/yt:channelId>/) || null,
      title,
      artist: tag(block, /<author>\s*<name>([\s\S]*?)<\/name>/) || "Unknown artist",
      published: tag(block, /<published>([^<]+)<\/published>/) || null,
      thumb: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      views: number(tag(block, /<media:statistics views="(\d+)"/)),
      likes: number(tag(block, /<media:starRating count="(\d+)"/)),
    });
  }
  return out;
}

async function fetchFeed(kind: string, externalId: string) {
  const param = kind === "playlist" ? "playlist_id" : "channel_id";
  const response = await fetch(`${FEED_URL}?${param}=${encodeURIComponent(externalId)}`, {
    signal: AbortSignal.timeout(9_000),
  });
  if (!response.ok) throw new Error(`feed ${response.status}`);
  const xml = await response.text();
  const head = xml.split("<entry>")[0];
  return { title: tag(head, /<title>([\s\S]*?)<\/title>/), items: parseFeed(xml) };
}

async function inBatches<T, R>(list: T[], size: number, work: (item: T) => Promise<R>) {
  const results: Array<PromiseSettledResult<R>> = [];
  for (let i = 0; i < list.length; i += size) {
    results.push(...await Promise.allSettled(list.slice(i, i + size).map(work)));
  }
  return results;
}

/* Every followed source, read once per refresh. Velocity is plays per hour
   since the last read; on first sight it falls back to lifetime plays over
   age, so a new follow is ranked immediately instead of waiting a cycle. */
async function syncSources(refreshedAt: string) {
  if (!database) return [];
  const sources = await database`
    select id, kind, external_id, market from public.music_sources
    where active order by auto asc, last_synced_at asc nulls first
    limit ${MAX_SOURCES_PER_REFRESH}
  `;
  if (!sources.length) return [];

  const fetched = await inBatches(sources, FEED_CONCURRENCY, async (source: any) => {
    try {
      const feed = await fetchFeed(source.kind, source.external_id);
      await database`
        update public.music_sources
        set last_synced_at = ${refreshedAt}, last_error = null, items_count = ${feed.items.length},
            label = coalesce(label, ${feed.title || null})
        where id = ${source.id}
      `;
      return { source, items: feed.items };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await database`
        update public.music_sources set last_synced_at = ${refreshedAt}, last_error = ${message.slice(0, 300)}
        where id = ${source.id}
      `;
      throw error;
    }
  });

  const seen = new Map<string, any>();
  for (const result of fetched) {
    if (result.status !== "fulfilled") continue;
    for (const item of result.value.items) {
      if (!seen.has(item.videoId)) seen.set(item.videoId, { ...item, source: result.value.source });
    }
  }
  const items = [...seen.values()];
  if (!items.length) return [];

  const ids = items.map((item) => item.videoId);
  const previous = await database`
    select video_id, views, refreshed_at from public.music_releases where video_id in ${database(ids)}
  `;
  const before = new Map(previous.map((row: any) => [row.video_id, row]));

  const rows = items.map((item) => {
    const old: any = before.get(item.videoId);
    const hours = old ? Math.max(0.25, (Date.parse(refreshedAt) - new Date(old.refreshed_at).getTime()) / 3_600_000) : 0;
    const ageHours = Math.max(1, (Date.parse(refreshedAt) - Date.parse(item.published || refreshedAt)) / 3_600_000);
    const delta = old ? Math.max(0, item.views - number(old.views)) : 0;
    const velocity = old && delta > 0 ? delta / hours : item.views / ageHours;
    const shelf = shelveFor(item.title, item.artist);
    return {
      video_id: item.videoId,
      source_id: item.source.id,
      channel_id: item.channelId,
      market: item.source.market || MARKET,
      title: item.title.slice(0, 300),
      artist: item.artist.slice(0, 160),
      thumbnail_url: item.thumb,
      published_at: item.published,
      views: item.views,
      likes: item.likes,
      views_delta: delta,
      velocity: Number(velocity.toFixed(3)),
      genre: shelf.genre,
      culture: shelf.culture,
      format: shelf.format,
      active: true,
      refreshed_at: refreshedAt,
    };
  });

  await database`
    insert into public.music_releases ${database(rows,
      "video_id", "source_id", "channel_id", "market", "title", "artist", "thumbnail_url",
      "published_at", "views", "likes", "views_delta", "velocity", "genre", "culture",
      "format", "active", "refreshed_at")}
    on conflict (video_id) do update set
      source_id = excluded.source_id,
      channel_id = excluded.channel_id,
      title = excluded.title,
      artist = excluded.artist,
      thumbnail_url = excluded.thumbnail_url,
      published_at = excluded.published_at,
      views = excluded.views,
      likes = excluded.likes,
      views_delta = excluded.views_delta,
      velocity = excluded.velocity,
      genre = excluded.genre,
      culture = excluded.culture,
      format = excluded.format,
      active = true,
      refreshed_at = excluded.refreshed_at
  `;
  await database`delete from public.music_releases where published_at < now() - interval '400 days'`;

  return await database`
    select * from public.music_releases
    where active and market = ${MARKET} and published_at > now() - interval '60 days'
    order by velocity desc limit ${CHART_SIZE}
  `;
}

/* A feed row dressed as a YouTube API video, so a short chart can be
   filled through the exact same mapping as the real one. */
function releaseAsVideo(row: Record<string, any>) {
  return {
    id: row.video_id,
    snippet: {
      title: row.title,
      channelTitle: row.artist,
      channelId: row.channel_id,
      publishedAt: row.published_at instanceof Date ? row.published_at.toISOString() : row.published_at,
      thumbnails: { high: { url: row.thumbnail_url } },
    },
    statistics: { viewCount: row.views, likeCount: row.likes, commentCount: 0 },
    contentDetails: {},
  };
}

/* ── following who charts ──────────────────────────────────────────────────
   The API gives a charting video's channel id directly. Without it, the
   video's oEmbed names the channel page, and the page names the id. */

const CHANNEL_ID = /^UC[A-Za-z0-9_-]{22}$/;

async function oembed(videoId: string) {
  const response = await fetch(
    `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent("https://www.youtube.com/watch?v=" + videoId)}`,
    { signal: AbortSignal.timeout(8_000) },
  );
  if (!response.ok) throw new Error(`oembed ${response.status}`);
  return await response.json();
}

async function channelIdFromPage(url: string) {
  const response = await fetch(url, { headers: PAGE_HEADERS, signal: AbortSignal.timeout(9_000) });
  if (!response.ok) throw new Error(`page ${response.status}`);
  const html = await response.text();
  const match = /<link rel="canonical" href="https:\/\/www\.youtube\.com\/channel\/(UC[A-Za-z0-9_-]{22})"/.exec(html)
    || /"externalId":"(UC[A-Za-z0-9_-]{22})"/.exec(html)
    || /"channelId":"(UC[A-Za-z0-9_-]{22})"/.exec(html);
  return match ? match[1] : null;
}

async function channelIdForVideo(videoId: string) {
  if (YOUTUBE_API_KEY) {
    const endpoint = new URL("https://www.googleapis.com/youtube/v3/videos");
    endpoint.search = new URLSearchParams({ part: "snippet", id: videoId, key: YOUTUBE_API_KEY }).toString();
    const response = await fetch(endpoint, { signal: AbortSignal.timeout(8_000) });
    const payload = await response.json();
    const id = payload?.items?.[0]?.snippet?.channelId;
    if (id && CHANNEL_ID.test(id)) return id;
  }
  const info = await oembed(videoId);
  if (!info?.author_url) return null;
  return await channelIdFromPage(String(info.author_url));
}

async function autoFollow(rows: Array<Record<string, any>>, known: Map<string, string>) {
  if (!database) return;
  const followed = new Set(
    (await database`select external_id from public.music_sources`).map((row: any) => row.external_id),
  );
  const candidates: Array<{ videoId: string; artist: string; channelId: string | null }> = [];
  const artists = new Set<string>();
  for (const row of rows.slice(0, 40)) {
    const key = artistKeyFor(row.artist);
    if (!key || artists.has(key)) continue;
    artists.add(key);
    const channelId = known.get(row.video_id) || null;
    if (channelId && followed.has(channelId)) continue;
    candidates.push({ videoId: row.video_id, artist: row.artist, channelId });
  }

  let resolved = 0;
  for (const candidate of candidates) {
    if (resolved >= AUTO_FOLLOW_PER_REFRESH) break;
    try {
      const channelId = candidate.channelId || await channelIdForVideo(candidate.videoId);
      resolved += candidate.channelId ? 0 : 1;
      if (!channelId || !CHANNEL_ID.test(channelId) || followed.has(channelId)) continue;
      followed.add(channelId);
      await database`
        insert into public.music_sources (kind, external_id, label, market, auto)
        values ('channel', ${channelId}, ${candidate.artist.slice(0, 120)}, ${MARKET}, true)
        on conflict (external_id) do nothing
      `;
    } catch (error) {
      console.warn("[youtube-sync] follow failed", candidate.artist, error instanceof Error ? error.message : error);
    }
  }
}

/* ── resolve ───────────────────────────────────────────────────────────────
   Paste anything: a watch link, youtu.be, a Shorts link, a channel link,
   an @handle, a playlist link, or a bare id. */

async function resolveThing(input: string) {
  const text = input.trim();
  let url: URL | null = null;
  try { url = new URL(/^https?:\/\//i.test(text) ? text : `https://www.youtube.com/${text.replace(/^\/+/, "")}`); } catch (_e) { url = null; }

  const list = url?.searchParams.get("list");
  if (list && /^[A-Za-z0-9_-]{10,80}$/.test(list) && !url?.searchParams.get("v")) {
    const feed = await fetchFeed("playlist", list);
    return { kind: "playlist", id: list, title: feed.title || "Playlist", items: feed.items.length,
             thumb: feed.items[0]?.thumb || null };
  }

  const videoId = /^[A-Za-z0-9_-]{11}$/.test(text) ? text
    : url?.searchParams.get("v")
      || (/youtu\.be$/i.test(url?.hostname || "") ? url?.pathname.slice(1, 12) : null)
      || /\/(?:shorts|embed|live)\/([A-Za-z0-9_-]{11})/.exec(url?.pathname || "")?.[1]
      || null;
  if (videoId && /^[A-Za-z0-9_-]{11}$/.test(videoId)) {
    const info = await oembed(videoId);
    const title = String(info?.title || "Untitled");
    const artist = String(info?.author_name || "Unknown artist");
    const shelf = shelveFor(title, artist);
    return { kind: "video", id: videoId, title, artist, channelUrl: info?.author_url || null,
             thumb: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`, genre: shelf.genre, culture: shelf.culture };
  }

  const channel = /\/channel\/(UC[A-Za-z0-9_-]{22})/.exec(url?.pathname || "")?.[1]
    || (CHANNEL_ID.test(text) ? text : null);
  const id = channel || (url ? await channelIdFromPage(`https://www.youtube.com${url.pathname}`) : null);
  if (id) {
    const feed = await fetchFeed("channel", id);
    return { kind: "channel", id, title: feed.title || "Channel", items: feed.items.length,
             thumb: feed.items[0]?.thumb || null };
  }
  throw new Error("not_found");
}

async function handleResolve(req: Request, input: string) {
  if (!input || input.length > 300) return json(req, 400, { error: "input_required" });
  try {
    return json(req, 200, await resolveThing(input), "public, max-age=600, stale-while-revalidate=3600");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return json(req, message === "not_found" ? 404 : 502, { error: message === "not_found" ? "not_found" : "resolve_failed" });
  }
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

    const refreshedAt = new Date().toISOString();
    const [previous, previousArtists, upstream, releases] = await Promise.all([
      database`select video_id, rank, views, first_seen_at from public.music_chart_tracks where market = ${MARKET}`,
      database`select artist_key, rank from public.music_chart_artists where market = ${MARKET}`,
      /* One failing feed must not silence the other. */
      upstreamChart().catch((error) => {
        console.error("[youtube-sync] upstream chart failed", error instanceof Error ? error.message : error);
        return { videos: [], source: "unavailable" };
      }),
      syncSources(refreshedAt).catch((error) => {
        console.error("[youtube-sync] feed sync failed", error instanceof Error ? error.message : error);
        return [];
      }),
    ]);
    let { videos, source } = upstream;

    /* A short board is filled from what is moving fastest on the followed
       channels, rather than being published with gaps. */
    if (videos.length < CHART_FLOOR && releases.length) {
      const have = new Set(videos.map((video: any) => video.id));
      const extra = releases.filter((row: any) => !have.has(row.video_id)).map(releaseAsVideo);
      videos = [...videos, ...extra].slice(0, CHART_SIZE);
      source = source === "unavailable" ? "youtube_feeds" : `${source}+feeds`;
    }
    const channelOf = new Map<string, string>();
    for (const video of videos) {
      if (video?.snippet?.channelId) channelOf.set(video.id, video.snippet.channelId);
    }

    const before = new Map((previous || []).map((row) => [row.video_id, row]));
    const beforeArtists = new Map((previousArtists || []).map((row) => [row.artist_key, row.rank]));

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
            force_refresh = false,
            updated_at = ${refreshedAt}
        where market = ${MARKET} and refresh_token = ${token}
      `;
    });

    /* After the board is safe. Following is best-effort by design. */
    await autoFollow(rows, channelOf).catch((error) => {
      console.warn("[youtube-sync] auto-follow failed", error instanceof Error ? error.message : error);
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
    if (action === "resolve") {
      return await handleResolve(req, String(url.searchParams.get("q") || ""));
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
