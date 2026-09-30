import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import postgres from "npm:postgres@3.4.7";
import { parse as parseYaml } from "npm:yaml@2.6.1";

/* ═══════════════════════════════════════════════════════════════════════════
   CABANA KARAOKE · the song desk
   ───────────────────────────────────────────────────────────────────────────
   Everything the karaoke stage needs to know about a YouTube video before
   anyone sings over it, fetched once and kept in karaoke_songs.

     action=song    one video: its real title and channel (from YouTube's
                    oEmbed, never trusted from the page), what kind of track
                    it is (karaoke/instrumental, lyric video, original, live),
                    the song and artist it is, and its lyrics, matched from
                    LRCLIB with timing (word by word when LRCLIB has it)
     action=search  songs to sing: what Cabana already knows first, then
                    YouTube's karaoke versions when a key is configured.
                    A search costs 100 of YouTube's 10,000 daily units, so
                    each query is answered once and kept for a week
     action=meta    tempo for the lights in the party room, from Deezer

   Lyrics are matched, not guessed: a candidate must look like the same song
   by the same artist, and a lyric with a clock beats one without. When
   nothing is good enough the song is marked 'none' and sung in freestyle.
   ═══════════════════════════════════════════════════════════════════════════ */

const DATABASE_URL = Deno.env.get("SUPABASE_DB_URL") || "";
const YOUTUBE_API_KEY = Deno.env.get("YOUTUBE_API_KEY") || "";
const UA = "CabanaKaraoke/1.0 (+https://cabana.africa/events/karaoke)";
const SEARCH_TTL_DAYS = 7;
const LYRICS_RETRY_HOURS = { none: 24 * 7, error: 6 } as const;

const database = DATABASE_URL ? postgres(DATABASE_URL, { prepare: false, max: 1, idle_timeout: 2, connect_timeout: 10 }) : null;

const ALLOWED_ORIGINS = new Set([
  "https://cabana.africa",
  "https://www.cabana.africa",
  "https://apatmento.space",
  "https://www.apatmento.space",
]);

function cors(req: Request) {
  const origin = req.headers.get("origin") || "";
  const isPreview = /^https:\/\/[a-z0-9-]+(?:-worlddossy-7636s-projects)?\.vercel\.app$/i.test(origin);
  const isLocal = /^https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?$/i.test(origin);
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGINS.has(origin) || isPreview || isLocal ? origin : "https://cabana.africa",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    Vary: "Origin",
  };
}

function json(req: Request, status: number, body: unknown, cache = "no-store") {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors(req), "Content-Type": "application/json; charset=utf-8", "Cache-Control": cache },
  });
}

const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;

/* A light per-address meter, per isolate. Search spends YouTube quota and
   a new song costs a lyric lookup; neither should be one visitor's to
   burn. */
const meters = new Map<string, { at: number; n: number }>();
function allowed(req: Request, scope: string, limit: number) {
  const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || req.headers.get("cf-connecting-ip") || "anon";
  const key = `${scope}:${ip}`, now = Date.now();
  const m = meters.get(key);
  if (!m || now - m.at > 60_000) {
    meters.set(key, { at: now, n: 1 });
    if (meters.size > 5000) for (const [k, v] of meters) if (now - v.at > 60_000) meters.delete(k);
    return true;
  }
  m.n += 1;
  return m.n <= limit;
}

/* ── words ─────────────────────────────────────────────────────────────────── */

function fold(s: string) {
  return String(s || "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function tokens(s: string) {
  return fold(s)
    .replace(/\b(feat|ft|featuring|with|x)\b\.?.*$/i, " ")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter((w) => w && !["the", "a", "an", "official", "video", "audio", "music", "lyrics", "lyric", "hd", "4k", "version"].includes(w));
}

function similarity(a: string, b: string) {
  const A = tokens(a), B = tokens(b);
  if (!A.length || !B.length) return 0;
  const sa = new Set(A), sb = new Set(B);
  let inter = 0;
  for (const w of sa) if (sb.has(w)) inter++;
  const jaccard = inter / (sa.size + sb.size - inter);
  const ja = A.join(" "), jb = B.join(" ");
  const contained = ja.includes(jb) || jb.includes(ja) ? 0.85 : 0;
  return Math.max(jaccard, contained);
}

/* ── what kind of track is this ────────────────────────────────────────────
   Karaoke means no lead vocal in the track, which is what makes a score
   fair: the microphone can only hear the singer. */
function kindOf(title: string, channel: string) {
  const t = fold(`${title} ${channel}`);
  const vocals = /\b(with (lead )?vocals?|vocal version|original vocals?)\b/.test(t);
  if (!vocals && /\b(karaoke|instrumental|backing track|minus ?one|no vocals?|without vocals?|vocals? removed|beat only|sing ?king|karafun|zoom karaoke)\b/.test(t)) return "karaoke";
  if (/\blyrics?\b|\blyric video\b|\bletra\b|\bparoles\b/.test(t)) return "lyric";
  if (/\b(live at|live from|live session|live performance|\(live\)|\[live\]| unplugged)\b/.test(t)) return "live";
  return "original";
}

const NOISE = /\s*[([【][^)\]】]*(karaoke|instrumental|lyrics?|official|video|audio|visuali[sz]er|hd|4k|remaster|version|backing|sing ?along|in the style|minus one|with vocals|no vocals|explicit|clean|mv|m\/v)[^)\]】]*[)\]】]/gi;

function cleanTitle(title: string) {
  return String(title || "")
    .replace(NOISE, " ")
    .replace(/\s*[|｜]\s*(sing king|karafun|zoom karaoke|karaoke|instrumental|lyrics?|official).*$/i, " ")
    .replace(/\s*[-–—]\s*(karaoke|instrumental|lyrics?|official (music )?video|official audio)( version)?( from [^-–—|]+)?\s*$/i, " ")
    .replace(/\b(karaoke|instrumental)( version)?\b/gi, " ")
    .replace(/["“”]/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/* Song and artist, as best the title says. "in the style of" is the
   karaoke trade's way of naming the artist; otherwise the two sides of
   the dash are kept both ways round and the lyric search decides. */
function songParts(title: string, channel: string) {
  const style = /in the style of\s+([^|()[\]]+)/i.exec(title);
  let clean = cleanTitle(title);
  const parts = clean.split(/\s+[-–—|]\s+/).map((p) => p.trim()).filter(Boolean);
  const ch = fold(channel).replace(/\s*(vevo|official|music|tv|- topic|topic)\s*/g, " ").trim();
  let track = clean, artist = "";
  if (style) {
    artist = style[1].replace(/\s*[-–—|].*$/, "").trim();
    track = (parts[0] || clean).replace(/\s*in the style of\b.*$/i, "").trim();
  } else if (parts.length >= 2) {
    const [a, b] = parts;
    if (ch && similarity(a, ch) >= 0.5) { artist = a; track = b; }
    else if (ch && similarity(b, ch) >= 0.5) { artist = b; track = a; }
    else { artist = a; track = b; }
  } else if (ch && !/karaoke|sing king|karafun|lyrics|instrumental/.test(ch)) {
    artist = channel.replace(/\s*(VEVO|- Topic)\s*$/i, "").trim();
  }
  track = track.replace(/\s+(ft|feat|featuring)\.?\s+.*$/i, "").trim();
  const alt = parts.length >= 2 ? { track: parts[0], artist: parts[1] } : null;
  return { track: track.slice(0, 160), artist: artist.slice(0, 120), alt };
}

/* ── YouTube, without a key: oEmbed ─────────────────────────────────────── */

async function oembed(videoId: string) {
  const url = `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(`https://www.youtube.com/watch?v=${videoId}`)}`;
  const r = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(8000) });
  if (!r.ok) return null;
  const d = await r.json().catch(() => null);
  if (!d || !d.title) return null;
  return { title: String(d.title).slice(0, 200), channel: String(d.author_name || "").slice(0, 120), thumb: d.thumbnail_url ? String(d.thumbnail_url) : null };
}

function isoSeconds(v?: string) {
  const m = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(v || "");
  if (!m) return null;
  return (Number(m[1]) || 0) * 3600 + (Number(m[2]) || 0) * 60 + (Number(m[3]) || 0);
}

async function youtubeDetails(ids: string[]) {
  if (!YOUTUBE_API_KEY || !ids.length) return new Map<string, any>();
  const u = new URL("https://www.googleapis.com/youtube/v3/videos");
  u.search = new URLSearchParams({ part: "snippet,contentDetails,statistics,status", id: ids.join(","), key: YOUTUBE_API_KEY }).toString();
  const r = await fetch(u, { signal: AbortSignal.timeout(10000) });
  const d = await r.json().catch(() => ({}));
  return new Map<string, any>((Array.isArray(d?.items) ? d.items : []).map((it: any) => [it.id, it]));
}

/* ── LRCLIB ─────────────────────────────────────────────────────────────── */

function parseLrc(text: string) {
  const lines: Array<{ t: number; x: string }> = [];
  let offset = 0;
  for (const raw of String(text || "").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const tag = /^\[offset:\s*([+-]?\d+)\]$/i.exec(line);
    if (tag) { offset = Number(tag[1]) / 1000; continue; }
    const times: number[] = [];
    let rest = line;
    let m: RegExpExecArray | null;
    while ((m = /^\[(\d{1,3}):(\d{1,2})(?:[.:](\d{1,3}))?\]/.exec(rest))) {
      const frac = m[3] ? Number(m[3]) / Math.pow(10, m[3].length) : 0;
      times.push(Number(m[1]) * 60 + Number(m[2]) + frac);
      rest = rest.slice(m[0].length);
    }
    if (!times.length) continue;
    const x = rest.replace(/<\d{1,3}:\d{1,2}(?:[.:]\d{1,3})?>/g, "").replace(/\s{2,}/g, " ").trim();
    for (const t of times) lines.push({ t: Math.max(0, +(t - offset).toFixed(2)), x });
  }
  lines.sort((a, b) => a.t - b.t);
  return lines;
}

/* LRCLIB's word-timed format (Lyricsfile, YAML). Read defensively: the
   shape is lines → words, each with start_ms/end_ms. */
function parseLyricsfile(text: string) {
  try {
    const doc: any = parseYaml(String(text || ""));
    const src = Array.isArray(doc?.lines) ? doc.lines : Array.isArray(doc?.lyrics?.lines) ? doc.lyrics.lines : null;
    if (!src || !src.length) return null;
    const lines: any[] = [];
    for (const l of src) {
      const words = (Array.isArray(l?.words) ? l.words : []).filter((w: any) => w && typeof w.text === "string" && Number.isFinite(Number(w.start_ms)));
      const t = Number.isFinite(Number(l?.start_ms)) ? Number(l.start_ms) / 1000 : words.length ? Number(words[0].start_ms) / 1000 : null;
      if (t == null) continue;
      const x = String(l?.text ?? words.map((w: any) => w.text).join("")).replace(/\s+/g, " ").trim();
      const out: any = { t: +t.toFixed(2), x };
      if (Number.isFinite(Number(l?.end_ms))) out.e = +(Number(l.end_ms) / 1000).toFixed(2);
      const w = words
        .map((w: any) => ({ t: +(Number(w.start_ms) / 1000).toFixed(2), e: Number.isFinite(Number(w.end_ms)) ? +(Number(w.end_ms) / 1000).toFixed(2) : undefined, x: String(w.text).trim() }))
        .filter((w: any) => w.x);
      if (w.length) out.w = w;
      lines.push(out);
    }
    lines.sort((a, b) => a.t - b.t);
    return lines.length ? lines : null;
  } catch {
    return null;
  }
}

async function lrclib(path: string) {
  try {
    const r = await fetch(`https://lrclib.net${path}`, { headers: { "User-Agent": UA, Accept: "application/json" }, signal: AbortSignal.timeout(9000) });
    if (r.status === 404) return null;
    if (!r.ok) throw new Error(`lrclib_${r.status}`);
    return await r.json();
  } catch (e) {
    if (e instanceof Error && /lrclib_5\d\d|timed out|abort/i.test(e.message)) throw e;
    return null;
  }
}

type Candidate = { id: number; trackName: string; artistName: string; duration?: number; instrumental?: boolean; syncedLyrics?: string | null; plainLyrics?: string | null; lyricsfile?: string | null; hasWordSync?: boolean };

function scoreCandidate(c: Candidate, want: { track: string; artist: string; alt: any; duration: number | null }) {
  if (!c || c.instrumental) return -1;
  const pairs = [[want.track, want.artist]];
  if (want.alt) pairs.push([want.alt.track, want.alt.artist], [want.alt.artist, want.alt.track]);
  let name = 0;
  for (const [t, a] of pairs) {
    const st = similarity(c.trackName, t);
    const sa = a ? similarity(c.artistName, a) : 0.35;
    name = Math.max(name, st * 0.62 + sa * 0.38);
  }
  let s = name;
  if (c.syncedLyrics) s += 0.14;
  if (c.hasWordSync) s += 0.06;
  if (!c.syncedLyrics && !c.plainLyrics) s -= 1;
  if (want.duration && c.duration) {
    const d = Math.abs(c.duration - want.duration);
    s += d <= 3 ? 0.12 : d <= 12 ? 0.05 : d <= 35 ? 0 : -0.18;
  }
  return s;
}

/* What a candidate actually carries. LRCLIB is crowd-sourced: next to the
   real lyric there can be a vandalised or placeholder entry (a single line
   reading "probe" has been seen answering /api/get for a famous song). A
   candidate needs four real lines to be considered at all. */
function contentOf(c: Candidate) {
  const synced = c.syncedLyrics ? parseLrc(c.syncedLyrics).filter((l) => l.x) : [];
  const plain = c.plainLyrics ? String(c.plainLyrics).split(/\r?\n/).map((x) => x.trim()).filter(Boolean) : [];
  const lines = synced.length >= 4 ? synced.map((l) => l.x) : plain;
  return { synced: synced.length, plain: plain.length, fp: fold(lines.slice(0, 10).join(" ")).replace(/[^a-z0-9]+/g, "").slice(0, 200) };
}

/* Two fingerprints agree when most of their letter pairs are shared. */
function agrees(a: string, b: string) {
  if (!a || !b) return false;
  if (a === b) return true;
  const grams = (s: string) => { const m = new Map<string, number>(); for (let i = 0; i < s.length - 1; i++) { const g = s.slice(i, i + 2); m.set(g, (m.get(g) || 0) + 1); } return m; };
  const A = grams(a), B = grams(b);
  let inter = 0, na = 0, nb = 0;
  for (const v of A.values()) na += v;
  for (const v of B.values()) nb += v;
  for (const [g, v] of A) inter += Math.min(v, B.get(g) || 0);
  return na + nb > 0 && (2 * inter) / (na + nb) >= 0.8;
}

async function findLyrics(want: { track: string; artist: string; alt: any; duration: number | null; clean: string }) {
  const seen = new Map<number, Candidate>();
  const add = (list: any) => { for (const c of Array.isArray(list) ? list : list ? [list] : []) if (c && c.id != null) seen.set(c.id, c); };
  if (want.track && want.artist) {
    const q = new URLSearchParams({ track_name: want.track, artist_name: want.artist });
    if (want.duration) q.set("duration", String(want.duration));
    add(await lrclib(`/api/get?${q}`));
    add(await lrclib(`/api/search?${new URLSearchParams({ track_name: want.track, artist_name: want.artist })}`));
  }
  if (want.alt) add(await lrclib(`/api/search?${new URLSearchParams({ track_name: want.alt.artist, artist_name: want.alt.track })}`));
  if (seen.size < 3) add(await lrclib(`/api/search?${new URLSearchParams({ q: [want.track, want.artist].filter(Boolean).join(" ") || want.clean })}`));
  return chooseLyrics([...seen.values()], want);
}

/* The name has to match first; then the lyric most of the matching
   candidates agree on wins, so one bad upload cannot outvote the rest. */
function chooseLyrics(cands: Candidate[], want: { track: string; artist: string; alt: any; duration: number | null }) {
  const pool: Array<{ c: Candidate; s: number; fp: string; agree: number }> = [];
  for (const c of cands) {
    const s = scoreCandidate(c, want);
    if (s < 0.62) continue;
    const k = contentOf(c);
    if (k.synced < 4 && k.plain < 4) continue;
    pool.push({ c, s, fp: k.fp, agree: 0 });
  }
  for (const a of pool) for (const b of pool) if (a !== b && agrees(a.fp, b.fp)) a.agree++;
  let best: { c: Candidate; s: number } | null = null;
  for (const p of pool) {
    const total = p.s + Math.min(0.2, 0.07 * Math.log2(1 + p.agree)) - (pool.length >= 3 && p.agree === 0 ? 0.15 : 0);
    if (!best || total > best.s) best = { c: p.c, s: total };
  }
  if (!best || best.s < 0.62) return null;
  return { cand: best.c, score: best.s };
}

const SW = new Set("na ya wa kwa ni si za la cha nini wewe mimi yeye sisi wao nakupenda nataka sana tu hii kama lakini bado mpenzi moyo maisha mungu yesu baba mama leo kesho rafiki penzi roho mapenzi uko niko yako yangu wangu wako tena hapa sasa kila kitu watu mtu dunia raha nawe nami ndio hapana".split(" "));
const EN = new Set("the and you i to me my love in it is of that we your all be for on with so baby what dont know just like when no oh yeah can this was up get go one now night heart feel never want time way will make got".split(" "));
function langOf(lines: Array<{ x: string }>) {
  let sw = 0, en = 0;
  for (const l of lines) for (const w of fold(l.x).split(/[^a-z']+/)) { if (SW.has(w)) sw++; if (EN.has(w)) en++; }
  if (sw + en < 6) return "en";
  const r = sw / (sw + en);
  return r > 0.62 ? "sw" : r < 0.38 ? "en" : "mixed";
}

/* ── the song row ───────────────────────────────────────────────────────── */

const SONG_COLUMNS = "video_id, title, artist, track, track_artist, duration_s, kind, thumb, lyrics, lyrics_status, lyrics_source, lyrics_ref, lyrics_checked_at, lang, offset_s, offset_n, bpm, bpm_source, melody, melody_n, sung, best_score, hidden, updated_at";

async function loadSong(videoId: string) {
  const [row] = await database!`select ${database!.unsafe(SONG_COLUMNS)} from public.karaoke_songs where video_id = ${videoId}`;
  return row || null;
}

async function ensureSong(videoId: string, hint: { duration?: number | null }) {
  let row = await loadSong(videoId);
  if (!row) {
    const [meta, details] = await Promise.all([oembed(videoId), youtubeDetails([videoId])]);
    const det = details.get(videoId);
    const title = det?.snippet?.title || meta?.title;
    const channel = det?.snippet?.channelTitle || meta?.channel || "";
    if (!title) return null;
    const parts = songParts(title, channel);
    const duration = isoSeconds(det?.contentDetails?.duration) || (hint.duration && hint.duration > 0 && hint.duration < 7200 ? Math.round(hint.duration) : null);
    const thumb = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
    await database!`
      insert into public.karaoke_songs (video_id, title, artist, track, track_artist, duration_s, kind, thumb)
      values (${videoId}, ${title}, ${channel}, ${parts.track || null}, ${parts.artist || null}, ${duration}, ${kindOf(title, channel)}, ${thumb})
      on conflict (video_id) do nothing`;
    row = await loadSong(videoId);
  } else if (!row.duration_s && hint.duration && hint.duration > 0 && hint.duration < 7200) {
    await database!`update public.karaoke_songs set duration_s = ${Math.round(hint.duration)} where video_id = ${videoId} and duration_s is null`;
    row.duration_s = Math.round(hint.duration);
  }
  return row;
}

function lyricsDue(row: any) {
  if (!row) return false;
  if (row.lyrics_status === "pending") return true;
  const age = Date.now() - new Date(row.lyrics_checked_at || row.updated_at || 0).getTime();
  if (row.lyrics_status === "none") return age > LYRICS_RETRY_HOURS.none * 3600e3;
  if (row.lyrics_status === "error") return age > LYRICS_RETRY_HOURS.error * 3600e3;
  return false;
}

async function resolveLyrics(row: any) {
  const parts = songParts(row.title, row.artist);
  const want = {
    track: row.track || parts.track,
    artist: row.track_artist || parts.artist,
    alt: parts.alt,
    duration: row.duration_s || null,
    clean: cleanTitle(row.title),
  };
  let status = "none", doc: any = null, ref: string | null = null, lang: string | null = null;
  try {
    const found = await findLyrics(want);
    if (found) {
      const c = found.cand;
      ref = String(c.id);
      const file = c.lyricsfile ? parseLyricsfile(c.lyricsfile) : null;
      const lrc = c.syncedLyrics ? parseLrc(c.syncedLyrics) : [];
      const sung = (ls: any[]) => ls.filter((l) => l.x).length;
      if (file && sung(file) >= 4 && file.some((l: any) => l.w && l.w.length)) {
        doc = { v: 1, synced: true, words: true, source: "lrclib", lines: file };
        status = "words";
      } else if (file && sung(file) >= 4 && Math.abs(sung(file) - sung(lrc)) <= 2 && file.filter((l: any) => l.e != null).length >= file.length / 2) {
        /* No word clock, but real line ends: the wipe is paced inside them. */
        doc = { v: 1, synced: true, words: false, source: "lrclib", lines: file };
        status = "synced";
      } else if (sung(lrc) >= 4) {
        doc = { v: 1, synced: true, words: false, source: "lrclib", lines: lrc };
        status = "synced";
      }
      if (!doc && c.plainLyrics) {
        const lines = String(c.plainLyrics).split(/\r?\n/).map((x) => ({ t: null, x: x.trim() })).filter((l) => l.x);
        if (lines.length >= 4) { doc = { v: 1, synced: false, words: false, source: "lrclib", lines }; status = "plain"; }
      }
      if (doc) {
        doc.match = { track: c.trackName, artist: c.artistName, duration: c.duration || null, score: +found.score.toFixed(2) };
        lang = langOf(doc.lines);
      }
    }
  } catch (e) {
    console.error("[karaoke] lyrics lookup failed", e instanceof Error ? e.message : e);
    status = "error";
  }
  await database!`
    update public.karaoke_songs set
      lyrics = ${doc ? database!.json(doc) : null},
      lyrics_status = ${status},
      lyrics_source = ${doc ? "lrclib" : null},
      lyrics_ref = ${ref},
      lang = ${lang},
      track = ${doc?.match?.track || row.track || want.track || null},
      track_artist = ${doc?.match?.artist || row.track_artist || want.artist || null},
      lyrics_checked_at = now()
    where video_id = ${row.video_id}`;
  return await loadSong(row.video_id);
}

function publicSong(row: any, withLyrics = true) {
  if (!row) return null;
  return {
    video_id: row.video_id, title: row.title, artist: row.artist, track: row.track, track_artist: row.track_artist,
    duration_s: row.duration_s, kind: row.kind, thumb: row.thumb, lyrics_status: row.lyrics_status,
    lyrics: withLyrics ? row.lyrics : undefined, lang: row.lang, offset_s: row.offset_s, offset_n: row.offset_n,
    bpm: row.bpm, melody: withLyrics ? row.melody : undefined, melody_n: row.melody_n, sung: row.sung, best_score: row.best_score,
  };
}

async function handleSong(req: Request, url: URL) {
  const v = String(url.searchParams.get("v") || "");
  if (!VIDEO_ID.test(v)) return json(req, 400, { error: "bad_video" });
  const duration = Number(url.searchParams.get("d") || 0) || null;
  const known = await loadSong(v);
  if (!known && !allowed(req, "new-song", 30)) return json(req, 429, { error: "rate_limited" });
  let row = await ensureSong(v, { duration });
  if (!row) return json(req, 404, { error: "video_unavailable" });
  if (row.hidden) return json(req, 404, { error: "video_unavailable" });
  if (lyricsDue(row)) row = await resolveLyrics(row);
  return json(req, 200, { song: publicSong(row) }, row.lyrics_status === "pending" ? "no-store" : "public, max-age=60, stale-while-revalidate=600");
}

/* ── search ──────────────────────────────────────────────────────────────── */

function normQuery(q: string) {
  return fold(q).replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);
}

async function catalogue(q: string) {
  const words = normQuery(q).split(" ").filter((w) => w.length > 1).slice(0, 5);
  if (!words.length) return [];
  const conds = words.map((_, i) => `(lower(title) like $${i + 1} or lower(artist) like $${i + 1} or lower(coalesce(track,'')) like $${i + 1} or lower(coalesce(track_artist,'')) like $${i + 1})`).join(" and ");
  const rows = await database!.unsafe(
    `select ${SONG_COLUMNS} from public.karaoke_songs where not hidden and ${conds}
     order by (kind = 'karaoke') desc, (lyrics_status in ('words','synced')) desc, sung desc, updated_at desc limit 16`,
    words.map((w) => `%${w}%`));
  return rows.map((r: any) => publicSong(r, false));
}

async function youtubeKaraoke(q: string) {
  const u = new URL("https://www.googleapis.com/youtube/v3/search");
  u.search = new URLSearchParams({
    part: "snippet", q: `${q} karaoke`, type: "video", videoEmbeddable: "true", maxResults: "15", safeSearch: "moderate", key: YOUTUBE_API_KEY,
  }).toString();
  const r = await fetch(u, { signal: AbortSignal.timeout(10000) });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) {
    const reason = d?.error?.errors?.[0]?.reason || "";
    const err: any = new Error(d?.error?.message || `youtube_${r.status}`);
    err.quota = reason === "quotaExceeded" || reason === "dailyLimitExceeded";
    throw err;
  }
  const ids: string[] = (Array.isArray(d.items) ? d.items : []).map((it: any) => it?.id?.videoId).filter((id: string) => VIDEO_ID.test(id));
  const details = await youtubeDetails(ids);
  const out: any[] = [];
  for (const id of ids) {
    const det = details.get(id);
    if (det?.status && det.status.embeddable === false) continue;
    const title = String(det?.snippet?.title || "").slice(0, 200);
    const channel = String(det?.snippet?.channelTitle || "").slice(0, 120);
    if (!title) continue;
    const parts = songParts(title, channel);
    const duration = isoSeconds(det?.contentDetails?.duration);
    if (duration && (duration < 45 || duration > 1200)) continue;
    out.push({
      video_id: id, title, artist: channel, track: parts.track || null, track_artist: parts.artist || null,
      duration_s: duration, kind: kindOf(title, channel), thumb: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
      views: Number(det?.statistics?.viewCount || 0) || 0,
    });
  }
  /* Karaoke tracks first, then lyric videos, then the rest; within a kind,
     the ones people actually watch. */
  const rank: Record<string, number> = { karaoke: 0, lyric: 1, original: 2, live: 3 };
  out.sort((a, b) => (rank[a.kind] - rank[b.kind]) || (b.views - a.views));
  return out;
}

async function handleSearch(req: Request, url: URL) {
  const q = String(url.searchParams.get("q") || "").trim().slice(0, 80);
  const key = normQuery(q);
  if (key.length < 2) return json(req, 400, { error: "query_too_short" });
  const local = await catalogue(q);
  if (!YOUTUBE_API_KEY) return json(req, 200, { query: q, results: local, source: "catalogue", unconfigured: true }, "public, max-age=60");
  if (!allowed(req, "search", 12)) return json(req, 200, { query: q, results: local, source: "catalogue", limited: true });

  const cacheKey = `k:${key}`;
  const [cached] = await database!`select results from public.music_search_cache where query_key = ${cacheKey} and expires_at > now() limit 1`;
  let remote: any[] = [];
  let exhausted = false;
  if (cached) {
    remote = Array.isArray(cached.results) ? cached.results : [];
    database!`update public.music_search_cache set hits = hits + 1 where query_key = ${cacheKey}`.catch(() => {});
  } else {
    try {
      remote = await youtubeKaraoke(q);
      await database!`
        insert into public.music_search_cache (query_key, query, results, expires_at)
        values (${cacheKey}, ${q}, ${database!.json(remote)}, now() + make_interval(days => ${SEARCH_TTL_DAYS}))
        on conflict (query_key) do update set results = excluded.results, expires_at = excluded.expires_at, created_at = now()`;
      /* Everything found joins the catalogue, so the next person to look
         finds it without spending quota. Lyrics are fetched when sung. */
      for (const s of remote) {
        await database!`
          insert into public.karaoke_songs (video_id, title, artist, track, track_artist, duration_s, kind, thumb)
          values (${s.video_id}, ${s.title}, ${s.artist}, ${s.track}, ${s.track_artist}, ${s.duration_s}, ${s.kind}, ${s.thumb})
          on conflict (video_id) do nothing`.catch(() => {});
      }
    } catch (e: any) {
      if (e?.quota) exhausted = true;
      else console.error("[karaoke] search failed", e?.message || e);
    }
  }
  /* Known songs carry what Cabana has learned (lyrics, best score), so
     they are merged over the raw search results. */
  const byId = new Map<string, any>();
  for (const s of remote) byId.set(s.video_id, s);
  if (byId.size) {
    const rows = await database!`select ${database!.unsafe(SONG_COLUMNS)} from public.karaoke_songs where video_id in ${database!([...byId.keys()])}`;
    for (const r of rows) byId.set(r.video_id, { ...byId.get(r.video_id), ...publicSong(r, false) });
  }
  const merged = [...local];
  const have = new Set(local.map((s: any) => s.video_id));
  for (const s of byId.values()) if (!have.has(s.video_id) && !s.hidden) merged.push(s);
  return json(req, 200, { query: q, results: merged.slice(0, 24), source: remote.length ? "youtube" : "catalogue", exhausted },
    "public, max-age=120, stale-while-revalidate=900");
}

/* ── tempo, for the lights ─────────────────────────────────────────────── */

async function deezerBpm(track: string, artist: string, duration: number | null) {
  const q = artist ? `artist:"${artist.replace(/"/g, "")}" track:"${track.replace(/"/g, "")}"` : track;
  const r = await fetch(`https://api.deezer.com/search?q=${encodeURIComponent(q)}&limit=6`, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(8000) });
  const d = await r.json().catch(() => ({}));
  const list = Array.isArray(d?.data) ? d.data : [];
  let best: any = null, bestScore = 0;
  for (const it of list) {
    let s = similarity(it?.title || "", track) * 0.6 + (artist ? similarity(it?.artist?.name || "", artist) * 0.4 : 0.2);
    if (duration && it?.duration) s += Math.abs(it.duration - duration) <= 20 ? 0.1 : -0.1;
    if (s > bestScore) { bestScore = s; best = it; }
  }
  if (!best || bestScore < 0.55) return null;
  const t = await fetch(`https://api.deezer.com/track/${best.id}`, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(8000) });
  const td = await t.json().catch(() => ({}));
  const bpm = Number(td?.bpm || 0);
  return bpm >= 50 && bpm <= 220 ? Math.round(bpm * 10) / 10 : null;
}

async function handleMeta(req: Request, url: URL) {
  const v = String(url.searchParams.get("v") || "");
  if (!VIDEO_ID.test(v)) return json(req, 400, { error: "bad_video" });
  if (!(await loadSong(v)) && !allowed(req, "new-song", 30)) return json(req, 429, { error: "rate_limited" });
  const row = await ensureSong(v, { duration: Number(url.searchParams.get("d") || 0) || null });
  if (!row) return json(req, 404, { error: "video_unavailable" });
  let bpm = row.bpm, source = row.bpm_source;
  if (!bpm && source !== "none") {
    const parts = songParts(row.title, row.artist);
    try {
      bpm = await deezerBpm(row.track || parts.track, row.track_artist || parts.artist, row.duration_s);
      if (!bpm && parts.alt) bpm = await deezerBpm(parts.alt.artist, parts.alt.track, row.duration_s);
    } catch { bpm = null; }
    source = bpm ? "deezer" : "none";
    await database!`update public.karaoke_songs set bpm = ${bpm}, bpm_source = ${source} where video_id = ${v}`;
  }
  return json(req, 200, { video_id: v, bpm: bpm || null, source, title: row.title, track: row.track, artist: row.track_artist || row.artist },
    "public, max-age=3600, stale-while-revalidate=86400");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(req) });
  if (req.method !== "GET") return json(req, 405, { error: "method_not_allowed" });
  if (!database) return json(req, 503, { error: "unavailable" });
  const url = new URL(req.url);
  const action = url.searchParams.get("action") || "";
  try {
    if (action === "song") return await handleSong(req, url);
    if (action === "search") return await handleSearch(req, url);
    if (action === "meta") return await handleMeta(req, url);
    if (action === "health") return json(req, 200, { ok: true, youtube: !!YOUTUBE_API_KEY });
    return json(req, 404, { error: "unsupported_action" });
  } catch (e) {
    console.error("[karaoke] request failed", e instanceof Error ? e.message : e);
    return json(req, 500, { error: "karaoke_unavailable" });
  }
});
