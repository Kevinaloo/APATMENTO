/* ══════════════════════════════════════════════════════════════════════
   CABANA KARAOKE  ·  the judge  /api/karaoke
   ──────────────────────────────────────────────────────────────────────
   A song sung for the record is recorded in the browser and uploaded to
   a private bucket. Nothing the page says about how well it went is
   believed. This route listens to the recording itself.

     op=verify   (member)  Whisper hears the take, word by word with
                           timestamps. The words are mapped from the
                           recording's clock to the song's clock (the
                           page wrote down anchors while it played),
                           aligned against the lyric, and scored with
                           the one rulebook the stage also uses
                           (cabana-karaoke-lyrics.js). The database gets
                           the verdict through karaoke_settle(), which
                           only the service role may call.
     op=take     (anyone)  a two-hour signed link to a recording, for
                           whoever may see that performance
     op=sweep    (cron)    finishes verdicts nobody waited for and
                           deletes recordings past their keep date
     op=health             which parts are configured, never a value

   What the verdict is made of (the weights live in the rulebook):
     lyrics      Whisper's words against the lyric, in order, in time
     pitch       against the melody Cabana has learned for this video
                 from earlier singers, else by the singer's own tuning
                 and key
     timing      how tightly the words land on their moments, once the
                 video's own offset is allowed for
     expression  light and shade, held notes, vibrato

   A good performance also teaches: the video's lyric offset is nudged
   toward what was heard, and the melody learns the notes.
══════════════════════════════════════════════════════════════════════ */

import '../../cabana-karaoke-lyrics.js';
import {
  authenticatedUser, isAdminUser, isCronAuthorized, hasInternalSecret,
  consumeRateLimit, setCors, requestIp,
} from './_security.js';

const K = globalThis.CabanaKaraokeLyrics;
const BUCKET = 'karaoke-takes';
const GROQ_URL = 'https://api.groq.com/openai/v1/audio/transcriptions';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const MAX_TAKE_BYTES = 25 * 1024 * 1024;
const MAX_ATTEMPTS = 3;

function cfg() {
  return {
    url: (process.env.SUPABASE_URL || '').replace(/\/+$/, ''),
    service: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    groq: process.env.GROQ_API_KEY || '',
    model: process.env.KARAOKE_WHISPER_MODEL || 'whisper-large-v3-turbo',
  };
}

/* ── Supabase, as the service ─────────────────────────────────────── */

async function rest(path, { method = 'GET', body, prefer } = {}) {
  const c = cfg();
  const headers = { apikey: c.service, Authorization: `Bearer ${c.service}` };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (prefer) headers.Prefer = prefer;
  const r = await fetch(`${c.url}/rest/v1/${path}`, {
    method, headers, body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(10000),
  });
  const text = await r.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!r.ok) {
    const err = new Error(`rest ${method} ${path.split('?')[0]} ${r.status}`);
    err.status = r.status; err.detail = data;
    throw err;
  }
  return data;
}

const rpc = (name, args) => rest(`rpc/${name}`, { method: 'POST', body: args });

async function download(path) {
  const c = cfg();
  const r = await fetch(`${c.url}/storage/v1/object/${BUCKET}/${path.split('/').map(encodeURIComponent).join('/')}`, {
    headers: { apikey: c.service, Authorization: `Bearer ${c.service}` },
    signal: AbortSignal.timeout(15000),
  });
  if (!r.ok) { const e = new Error(`take ${r.status}`); e.code = r.status === 404 || r.status === 400 ? 'take_missing' : 'take_unreachable'; throw e; }
  const buf = Buffer.from(await r.arrayBuffer());
  if (buf.length > MAX_TAKE_BYTES) { const e = new Error('take too large'); e.code = 'take_too_large'; throw e; }
  return buf;
}

async function signTake(path, seconds = 7200) {
  const c = cfg();
  const r = await fetch(`${c.url}/storage/v1/object/sign/${BUCKET}/${path.split('/').map(encodeURIComponent).join('/')}`, {
    method: 'POST',
    headers: { apikey: c.service, Authorization: `Bearer ${c.service}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ expiresIn: seconds }),
    signal: AbortSignal.timeout(8000),
  });
  const d = await r.json().catch(() => ({}));
  const rel = d.signedURL || d.signedUrl;
  if (!r.ok || !rel) return null;
  return /^https?:/.test(rel) ? rel : `${c.url}/storage/v1${rel.startsWith('/') ? '' : '/'}${rel}`;
}

async function removeTakes(paths) {
  if (!paths.length) return 0;
  const c = cfg();
  const r = await fetch(`${c.url}/storage/v1/object/${BUCKET}`, {
    method: 'DELETE',
    headers: { apikey: c.service, Authorization: `Bearer ${c.service}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ prefixes: paths }),
    signal: AbortSignal.timeout(15000),
  });
  return r.ok ? paths.length : 0;
}

/* ── Whisper ──────────────────────────────────────────────────────── */

const EXT_MIME = { webm: 'audio/webm', ogg: 'audio/ogg', m4a: 'audio/mp4', mp4: 'audio/mp4', mp3: 'audio/mpeg', aac: 'audio/aac', wav: 'audio/wav' };

export async function transcribe(buf, { ext = 'webm', mime, lang, hint } = {}, fetchImpl = fetch) {
  const c = cfg();
  if (!c.groq) { const e = new Error('no whisper'); e.code = 'whisper_unconfigured'; throw e; }
  const form = new FormData();
  form.append('file', new Blob([buf], { type: mime || EXT_MIME[ext] || 'audio/webm' }), `take.${ext}`);
  form.append('model', c.model);
  form.append('response_format', 'verbose_json');
  form.append('timestamp_granularities[]', 'word');
  form.append('timestamp_granularities[]', 'segment');
  form.append('temperature', '0');
  if (lang === 'en' || lang === 'sw') form.append('language', lang);
  /* The song's name and artist, never its words: a prompt made of the
     lyric would be repeated back over silence. */
  if (hint) form.append('prompt', String(hint).slice(0, 200));
  const r = await fetchImpl(GROQ_URL, {
    method: 'POST', headers: { Authorization: `Bearer ${c.groq}` }, body: form,
    signal: AbortSignal.timeout(22000),
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) {
    const e = new Error(`whisper ${r.status}`);
    e.code = r.status === 429 ? 'whisper_busy' : r.status === 413 ? 'take_too_large' : 'whisper_failed';
    e.retryAfter = Number(r.headers?.get?.('retry-after')) || null;
    throw e;
  }
  return d;
}

/* Whisper's words, kept only where it was sure something was sung.
   A segment it thinks is silence, or one that repeats itself (the way
   it hallucinates over music), gives up its words; and when the page
   sent a contour, a word must sit on a moment the microphone actually
   heard a voice. */
export function heardWords(whisper, contourBytes) {
  const segs = Array.isArray(whisper?.segments) ? whisper.segments : [];
  const bad = segs.filter((s) => (Number(s.no_speech_prob) > 0.6 && Number(s.avg_logprob) < -0.7)
    || Number(s.compression_ratio) > 2.6 || Number(s.avg_logprob) < -1.25);
  const inBad = (t) => bad.some((s) => t >= Number(s.start) - 0.05 && t <= Number(s.end) + 0.05);
  const frames = contourBytes && contourBytes.length >= 20 ? contourBytes : null;
  const voicedAt = (t0, t1) => {
    if (!frames) return true;
    const a = Math.max(0, Math.floor(t0 * K.FPS) - 1), b = Math.min((frames.length >> 1) - 1, Math.ceil(t1 * K.FPS) + 1);
    if (a > b) return true;                     /* past the contour's end: no evidence either way */
    for (let k = a; k <= b; k++) {
      if (frames[2 * k] || K.codeDb(frames[2 * k + 1]) > -48) return true;
    }
    return false;
  };
  let words = Array.isArray(whisper?.words) ? whisper.words.slice() : [];
  if (!words.length) for (const s of segs) if (Array.isArray(s.words)) words.push(...s.words);
  if (!words.length) {
    /* No word stamps: spread each segment's words across it. */
    for (const s of segs) {
      const ws = String(s.text || '').trim().split(/\s+/).filter(Boolean);
      const d = (Number(s.end) - Number(s.start)) / Math.max(1, ws.length);
      ws.forEach((w, i) => words.push({ word: w, start: Number(s.start) + i * d, end: Number(s.start) + (i + 1) * d }));
    }
  }
  const out = [];
  let dropped = 0, unvoiced = 0;
  for (const w of words) {
    const t0 = Number(w.start), t1 = Number(w.end);
    if (!isFinite(t0) || !String(w.word || '').trim()) continue;
    if (inBad(t0)) { dropped++; continue; }
    if (!voicedAt(t0, isFinite(t1) ? t1 : t0 + 0.3)) { unvoiced++; continue; }
    out.push({ w: String(w.word).trim(), r0: t0, r1: isFinite(t1) ? t1 : t0 + 0.3 });
  }
  return { words: out, dropped, unvoiced, total: words.length };
}

/* ── the verdict ──────────────────────────────────────────────────── */

export function judge({ perf, song, whisper, contour }) {
  const doc = song?.lyrics && Array.isArray(song.lyrics.lines) ? song.lyrics : null;
  const tl = doc ? K.timeline({ synced: doc.synced, lines: doc.lines }, { duration: song.duration_s || 0 }) : null;
  const timemap = Array.isArray(perf.timemap) ? perf.timemap : [];
  const bytes = contour ? K.unb64(contour) : null;
  const heard = whisper ? heardWords(whisper, bytes) : { words: [], dropped: 0, unvoiced: 0, total: 0 };
  const inSong = heard.words.map((h) => ({
    w: h.w,
    t0: K.songTimeAt(timemap, h.r0, perf.song_start_s),
    t1: K.songTimeAt(timemap, h.r1, perf.song_start_s),
  }));

  let lyrics = null, timing = null, align = null, lines = null, words = null;
  if (tl && tl.tokens.length) {
    align = K.align(tl.tokens, inSong, { offset: Number(song.offset_s) || 0 });
    lyrics = align.accuracy;
    timing = tl.synced ? align.timing : null;
    /* per line and per word, for the replay and the results card */
    lines = tl.lines.map((l) => {
      let num = 0, den = 0;
      l.toks.forEach((t) => { if (!t.wt) return; den += t.wt; num += t.wt * ((align.hits[t.i] && align.hits[t.i].c) || 0); });
      return den ? Math.round(num / den * 100) : null;
    });
    words = Object.keys(align.hits).slice(0, 900).map((i) => [Number(i), Math.round(align.hits[i].c * 100), Math.round(align.hits[i].t * 100)]);
  }

  const frames = bytes ? K.frames(bytes, timemap, perf.song_start_s) : [];
  const pitch = frames.length ? K.pitchScore(frames, song?.melody_n >= 3 ? song.melody : null) : { score: null };
  const live = perf.live && typeof perf.live === 'object' ? perf.live : {};
  const vib = isFinite(Number(live.vib)) ? Math.max(0, Math.min(20, Number(live.vib))) : null;
  const expression = frames.length ? K.expressionScore(frames, vib) : { score: null };

  const parts = {
    lyrics: lyrics == null ? null : +lyrics.toFixed(3),
    pitch: pitch.score == null ? null : +pitch.score.toFixed(3),
    timing: timing == null ? null : +timing.toFixed(3),
    expression: expression.score == null ? null : +expression.score.toFixed(3),
  };
  const score = K.finalScore(parts);
  const grade = K.grade(score);

  const flags = [];
  if (lyrics != null && lyrics > 0.97 && timing != null && timing > 0.95) flags.push('flawless');
  if (song?.kind && song.kind !== 'karaoke' && lyrics != null && lyrics > 0.85) flags.push('vocal_track');
  if (heard.total > 12 && heard.unvoiced > heard.total * 0.35) flags.push('unvoiced_words');
  if (tl && tl.tokens.length && inSong.length < 5) flags.push('silent');

  return {
    score, grade: grade.letter, title: grade.title, parts, tl, align, frames,
    verify: {
      v: 1,
      lang: song?.lang || null,
      heard: heard.total, used: inSong.length, dropped: heard.dropped, unvoiced: heard.unvoiced,
      offset: align ? align.offset : null, votes: align ? align.offsetVotes : 0,
      matched: align ? align.matched : 0, expected: align ? align.expected : 0,
      synced: tl ? tl.synced : false,
      pitch: pitch.mode ? { mode: pitch.mode, voiced: pitch.voiced, compared: pitch.compared || null, lag: pitch.lag ?? null, in_tune: pitch.inTune ?? null, in_key: pitch.inKey ?? null } : null,
      expression: expression.score == null ? null : { range: expression.range, held: expression.held, vib },
      live: isFinite(Number(live.acc)) ? +Number(live.acc).toFixed(3) : null,
      lines, words, flags,
    },
  };
}

/* ── verify ───────────────────────────────────────────────────────── */

const SONG_FIELDS = 'video_id,title,artist,track,track_artist,kind,lyrics,lyrics_status,lang,duration_s,offset_s,offset_n,melody,melody_n';

async function loadPerf(id) {
  const rows = await rest(`karaoke_performances?id=eq.${id}&select=*`);
  return Array.isArray(rows) && rows[0] ? rows[0] : null;
}

async function learn(perf, song, out) {
  const tasks = [];
  const a = out.align;
  /* The lyric clock for this video. */
  if (a && out.tl && out.tl.synced && a.offsetVotes >= 6 && out.parts.lyrics >= 0.35) {
    tasks.push(rpc('karaoke_song_calibrate', { p_video: song.video_id, p_offset: a.offset, p_weight: Math.min(3, a.offsetVotes / 8) }).catch(() => null));
  }
  /* The melody, from singers who clearly sang this song. */
  const voiced = out.frames.filter((f) => f.m != null).length;
  if (out.parts.lyrics != null && out.parts.lyrics >= 0.55 && voiced >= 100 && out.tl && out.tl.synced && !out.verify.flags.includes('vocal_track')) {
    const weight = out.parts.lyrics >= 0.85 ? 3 : out.parts.lyrics >= 0.7 ? 2 : 1;
    tasks.push((async () => {
      for (let attempt = 0; attempt < 2; attempt++) {
        const rows = attempt ? await rest(`karaoke_songs?video_id=eq.${encodeURIComponent(song.video_id)}&select=melody,melody_n`) : [song];
        const cur = rows && rows[0] ? rows[0] : song;
        const merged = K.b64(K.mergeMelody(cur.melody || null, out.frames, weight));
        if (merged.length > 40000) return;
        /* Optimistic: only if nobody else taught it in the meantime. */
        const done = await rest(`karaoke_songs?video_id=eq.${encodeURIComponent(song.video_id)}&melody_n=eq.${Number(cur.melody_n) || 0}&select=video_id`, {
          method: 'PATCH', body: { melody: merged, melody_n: (Number(cur.melody_n) || 0) + 1 }, prefer: 'return=representation',
        }).then((r) => Array.isArray(r) && r.length > 0, () => false);
        if (done) return;
      }
    })().catch(() => null));
  }
  await Promise.all(tasks);
}

async function settleFallback(perf, reason) {
  /* Whisper could not hear it (not configured, or failing repeatedly):
     the page's own live reading stands, marked unverified, never
     ranked. */
  const live = perf.live && typeof perf.live === 'object' ? perf.live : {};
  const parts = {
    lyrics: isFinite(Number(live.acc)) ? Math.max(0, Math.min(1, Number(live.acc))) : null,
    pitch: isFinite(Number(live.pitch)) ? Math.max(0, Math.min(0.9, Number(live.pitch))) : null,
    timing: null,
    expression: null,
  };
  const score = K.finalScore(parts);
  const g = K.grade(score);
  await rpc('karaoke_settle', {
    p_perf: perf.id,
    p_result: { score, grade: g.letter, parts, verified: false, verify: { v: 1, fallback: reason, live: parts.lyrics } },
  });
  return { ok: true, status: 'scored', score, grade: g.letter, title: g.title, parts, verified: false };
}

export async function runVerify(perfId, { userId = null, admin = false } = {}) {
  const perf = await loadPerf(perfId);
  if (!perf || (userId && perf.user_id !== userId && !admin)) return { status: 404, body: { error: 'not_found' } };
  if (perf.status === 'scored') {
    const g = K.grade(perf.score || 0);
    return { body: { ok: true, status: 'scored', score: perf.score, grade: perf.grade, title: g.title, parts: perf.parts, verified: perf.verified } };
  }
  if (perf.status === 'verifying') return { status: 202, body: { ok: true, status: 'verifying' } };
  if (perf.status !== 'uploaded' || !perf.take_path) return { status: 409, body: { error: 'state', status: perf.status } };

  const claimed = await rest(`karaoke_performances?id=eq.${perfId}&status=eq.uploaded`, {
    method: 'PATCH', body: { status: 'verifying' }, prefer: 'return=representation',
  });
  if (!Array.isArray(claimed) || !claimed.length) return { status: 202, body: { ok: true, status: 'verifying' } };

  const attempts = Number(perf.verify && perf.verify.attempts) || 0;
  try {
    const songs = await rest(`karaoke_songs?video_id=eq.${encodeURIComponent(perf.video_id)}&select=${SONG_FIELDS}`);
    const song = songs && songs[0];
    if (!song) throw Object.assign(new Error('song'), { code: 'song_missing' });
    if (!cfg().groq) return { body: await settleFallback(perf, 'whisper_unconfigured') };

    const buf = await download(perf.take_path);
    const ext = (perf.take_path.split('.').pop() || 'webm').toLowerCase();
    const hint = [song.track || '', song.track_artist ? `by ${song.track_artist}` : ''].filter(Boolean).join(' ') || song.title;
    const whisper = await transcribe(buf, { ext, mime: perf.take_mime, lang: song.lang, hint });
    const out = judge({ perf, song, whisper, contour: perf.contour });
    const verify = Object.assign({}, out.verify, { model: cfg().model, attempts: attempts + 1 });
    await rpc('karaoke_settle', {
      p_perf: perf.id,
      p_result: { score: out.score, grade: out.grade, parts: out.parts, verified: true, verify },
    });
    await learn(perf, song, out);
    return { body: { ok: true, status: 'scored', score: out.score, grade: out.grade, title: out.title, parts: out.parts, verified: true, lines: verify.lines, flags: verify.flags } };
  } catch (e) {
    const code = e.code || 'verify_failed';
    console.error('[karaoke] verify failed', perfId, code, e.message);
    if (attempts + 1 >= MAX_ATTEMPTS || code === 'take_missing' || code === 'take_too_large' || code === 'song_missing') {
      try { return { body: await settleFallback(perf, code) }; } catch (e2) { console.error('[karaoke] fallback failed', e2.message); }
    }
    await rest(`karaoke_performances?id=eq.${perfId}&status=eq.verifying`, {
      method: 'PATCH', body: { status: 'uploaded', verify: { v: 1, attempts: attempts + 1, last_error: code } },
    }).catch(() => null);
    return { status: code === 'whisper_busy' ? 503 : 502, body: { ok: false, status: 'queued', error: code, retry_after: e.retryAfter || 30 } };
  }
}

/* ── who may hear a take ──────────────────────────────────────────── */

export async function mayHear(perf, user) {
  if (!perf || !perf.take_path || !['uploaded', 'verifying', 'scored'].includes(perf.status)) return false;
  if (user && perf.user_id === user.id) return true;
  if (perf.status === 'scored' && (perf.visibility === 'public' || perf.visibility === 'link')) return true;
  if (user && perf.room_id) {
    const m = await rest(`karaoke_members?room_id=eq.${perf.room_id}&user_id=eq.${user.id}&select=role&limit=1`).catch(() => []);
    if (Array.isArray(m) && m.length) return true;
  }
  if (user && await isAdminUser(user)) return true;
  return false;
}

/* ── the sweep ────────────────────────────────────────────────────── */

async function sweep(deadline) {
  const out = { verified: 0, queued: 0, deleted: 0 };
  const now = new Date();
  const since = new Date(now.getTime() - 90 * 1000).toISOString();
  const waiting = await rest(`karaoke_performances?status=eq.uploaded&finished_at=lt.${encodeURIComponent(since)}&select=id&order=finished_at.asc&limit=4`).catch(() => []);
  for (const p of waiting || []) {
    if (Date.now() > deadline - 12000) { out.queued++; continue; }
    const r = await runVerify(p.id, { admin: true }).catch(() => null);
    if (r && r.body && r.body.status === 'scored') out.verified++; else out.queued++;
  }
  /* Recordings past their keep date, and the ones nobody kept. */
  const expired = await rest(`karaoke_performances?take_path=not.is.null&expires_at=lt.${encodeURIComponent(now.toISOString())}&select=id,take_path&limit=100`).catch(() => []);
  const stale = await rest(`karaoke_performances?take_path=not.is.null&status=in.(discarded,failed)&created_at=lt.${encodeURIComponent(new Date(now.getTime() - 2 * 86400000).toISOString())}&select=id,take_path&limit=100`).catch(() => []);
  const rows = [...(expired || []), ...(stale || [])];
  if (rows.length && Date.now() < deadline - 4000) {
    const removed = await removeTakes(rows.map((r) => r.take_path));
    if (removed) {
      await rest(`karaoke_performances?id=in.(${rows.map((r) => r.id).join(',')})`, { method: 'PATCH', body: { take_path: null } }).catch(() => null);
      out.deleted = removed;
    }
  }
  return out;
}

/* ── the route ────────────────────────────────────────────────────── */

function param(req, name) {
  const q = req.query || {};
  if (q[name] != null) return String(q[name]);
  if (req.body && typeof req.body === 'object' && req.body[name] != null) return String(req.body[name]);
  try { return new URL(req.url || '/', 'http://x').searchParams.get(name) || ''; } catch { return ''; }
}

export default async function karaokeHandler(req, res) {
  setCors(req, res, 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(204).end();
  const c = cfg();
  const op = param(req, 'op');
  res.setHeader('Cache-Control', 'no-store');

  if (op === 'health') {
    return res.status(200).json({ ok: true, whisper: !!c.groq, storage: !!(c.url && c.service), model: c.model });
  }
  if (!c.url || !c.service) return res.status(503).json({ error: 'karaoke_unconfigured' });

  try {
    if (op === 'verify') {
      if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
      const user = await authenticatedUser(req);
      if (!user) return res.status(401).json({ error: 'authentication_required' });
      if (!consumeRateLimit(req, res, 'karaoke-verify', 12, 60_000, user.id)) return;
      const perf = param(req, 'perf');
      if (!UUID.test(perf)) return res.status(400).json({ error: 'bad_performance' });
      const out = await runVerify(perf, { userId: user.id });
      return res.status(out.status || 200).json(out.body);
    }

    if (op === 'take') {
      if (!consumeRateLimit(req, res, 'karaoke-take', 60, 60_000, requestIp(req))) return;
      const perfId = param(req, 'perf');
      if (!UUID.test(perfId)) return res.status(400).json({ error: 'bad_performance' });
      const [perf, user] = await Promise.all([loadPerf(perfId), authenticatedUser(req)]);
      if (!(await mayHear(perf, user))) return res.status(404).json({ error: 'not_found' });
      const url = await signTake(perf.take_path);
      if (!url) return res.status(404).json({ error: 'take_missing' });
      return res.status(200).json({ url, mime: perf.take_mime || null, expires_in: 7200 });
    }

    if (op === 'sweep') {
      if (!isCronAuthorized(req) && !hasInternalSecret(req)) return res.status(401).json({ error: 'unauthorized' });
      const out = await sweep(Date.now() + 26000);
      return res.status(200).json({ ok: true, ...out });
    }

    return res.status(400).json({ error: 'unknown_op', ops: ['verify', 'take', 'sweep', 'health'] });
  } catch (e) {
    console.error('[karaoke] request failed', op, e.message);
    return res.status(500).json({ error: 'karaoke_failed' });
  }
}
