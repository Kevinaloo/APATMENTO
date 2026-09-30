import { fileURLToPath } from 'node:url';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { JSDOM } from 'jsdom';

/* Cabana Karaoke: /events/karaoke.

   The guarantees this file holds:
     · the judge hears what was sung: it finds a video's lyric clock by
       itself, ignores what Whisper invents over silence, and gives
       nonsense and silence the scores they deserve
     · a verify call settles a take through the database, as the
       service, only for the singer; a take's audio is only handed to
       people allowed to hear it
     · every call the page makes to the database exists there, with
       those argument names, and the room channels are private
     · the lyric clock is only moved by a big, agreed offset, never by
       a speech recogniser's own lag; a song stopped early is judged on
       all of it
     · the page fetches karaoke only when someone opens it, in order,
       and the home page and the tabs lead there
     · the room QR code is a real QR code, and the voice relay codec
       keeps the voice */

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const read = (f) => readFileSync(join(ROOT, f), 'utf8');
const MIGRATIONS = readdirSync(join(ROOT, 'supabase/migrations')).filter((f) => f.endsWith('.sql')).map((f) => read('supabase/migrations/' + f)).join('\n');
const KARAOKE_SQL = read('supabase/migrations/20260929090000_cabana_karaoke.sql') + '\n' + read('supabase/migrations/20260929120000_karaoke_live_lines.sql');
const CLIENT = ['cabana-karaoke.js', 'cabana-karaoke-views.js', 'cabana-live-views.js', 'cabana-live-music.js'].map(read).join('\n');

process.env.SUPABASE_URL = 'https://sb.test';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-key';
process.env.SUPABASE_ANON_KEY = 'anon-key';
process.env.GROQ_API_KEY = 'groq-key';
const API = await import('../api/lib/_karaoke.js');
const K = globalThis.CabanaKaraokeLyrics;

/* An invented song: nobody's lyrics. */
const LINES = [
  [10.0, 'Morning light across the river'],
  [14.0, 'Drums are rolling down the valley'],
  [18.0, 'Every window singing louder'],
  [22.0, 'Hold my hand and dance tonight'],
  [26.0, 'Stars are falling on the city'],
  [30.0, 'Carry me beyond the mountains'],
  [34.0, 'Sing it louder sing it proud'],
  [38.0, 'Let the music fill the crowd'],
].map(([t, x]) => ({ t, e: t + 3.2, x }));
const SONG = { video_id: 'kkTestSong1', kind: 'karaoke', lang: 'en', duration_s: 60, offset_s: 0, melody_n: 0, lyrics: { synced: true, lines: LINES } };

function contour(seconds, voiced) {
  const n = Math.round(seconds * K.FPS), fr = new Uint8Array(n * 2);
  for (let k = 0; k < n; k++) {
    const on = voiced(k / K.FPS);
    fr[2 * k] = on ? K.pitchCode(60 + ((k / 5 | 0) % 5) * 2) : 0;
    fr[2 * k + 1] = K.energyCode(on ? -24 + (k % 13) : -75);
  }
  return K.b64(fr);
}
/* The singer's recording began at song time 8; the video's lyric runs
   1.1 s behind the lyric file. */
function sungWhisper({ late = 1.1, skip = 9, hallucinate = true } = {}) {
  const tl = K.timeline({ synced: true, lines: LINES }, { duration: 60 });
  const words = [];
  tl.tokens.forEach((t, i) => {
    if (t.b || i % skip === 4) return;
    const rec = t.t + late - 8 + ((i * 7) % 5 - 2) * 0.03;
    words.push({ word: i % 11 === 3 ? t.x.toUpperCase() + ',' : t.x, start: rec, end: rec + 0.3 });
  });
  const segments = [{ start: 0, end: 36, avg_logprob: -0.3, no_speech_prob: 0.02, compression_ratio: 1.4 }];
  if (hallucinate) {
    words.push({ word: 'Thank', start: 44, end: 44.2 }, { word: 'you', start: 44.2, end: 44.4 });
    segments.push({ start: 43.5, end: 45, avg_logprob: -1.4, no_speech_prob: 0.8, compression_ratio: 1.1 });
  }
  return { text: '…', segments, words };
}
const PERF = { id: '5b0a3f0e-6a53-4d4e-8f39-1f6a5b2c9d10', user_id: '11111111-1111-4111-8111-111111111111', song_start_s: 8, timemap: [[0, 8], [20, 28], [40, 48]], live: { acc: 0.8, vib: 2 } };

test('the judge finds the lyric clock, drops what Whisper invents, and scores real singing high', () => {
  const out = API.judge({ perf: PERF, song: SONG, whisper: sungWhisper(), contour: contour(46, (t) => t > 1.5 && t < 38) });
  assert.ok(Math.abs(out.verify.offset - 1.1) < 0.3, `offset ${out.verify.offset}`);
  assert.ok(out.verify.votes >= 6, 'enough words vote for the offset');
  assert.ok(out.parts.lyrics > 0.75, `lyrics ${out.parts.lyrics}`);
  assert.ok(out.parts.timing > 0.8, `timing ${out.parts.timing}`);
  assert.ok(out.score >= 70, `score ${out.score}`);
  assert.equal(out.verify.lines.length, LINES.length);
  assert.ok(!out.verify.words.some((w) => w[2] > 4600), 'the words Whisper invented over the silence are not counted');
  assert.deepEqual(out.verify.flags.filter((f) => f === 'silent'), []);
});

test('nonsense and silence get the scores they deserve', () => {
  const junk = { segments: [{ start: 0, end: 38, avg_logprob: -0.4, no_speech_prob: 0.05, compression_ratio: 1.3 }], words: 'blah la la something banana my phone is ringing okay'.split(' ').map((w, i) => ({ word: w, start: 3 + i * 2, end: 3.4 + i * 2 })) };
  const bad = API.judge({ perf: PERF, song: SONG, whisper: junk, contour: contour(46, (t) => t > 1.5 && t < 38) });
  assert.ok(bad.parts.lyrics < 0.15, `junk lyrics ${bad.parts.lyrics}`);
  assert.ok(bad.score < 30, `junk score ${bad.score}: a good hum over the wrong words is not the song`);
  const quiet = API.judge({ perf: PERF, song: SONG, whisper: { segments: [], words: [] }, contour: null });
  assert.equal(quiet.parts.lyrics, 0);
  assert.ok(quiet.verify.flags.includes('silent'));
  assert.ok(quiet.score < 20);
});

test('a word is only kept where the microphone heard a voice', () => {
  const w = sungWhisper({ hallucinate: false });
  const all = API.heardWords(w, null);
  const bytes = K.unb64(contour(46, (t) => t < 12));      /* the singer went quiet after 12 s of recording */
  const some = API.heardWords(w, bytes);
  assert.ok(some.words.length < all.words.length / 2, 'words sung into silence are dropped');
  assert.ok(some.unvoiced > 0);
});

/* ── the route ─────────────────────────────────────────────────────── */

function fakeRes() {
  const r = { statusCode: 200, headers: {}, body: null };
  r.setHeader = (k, v) => { r.headers[k.toLowerCase()] = v; };
  r.status = (c) => { r.statusCode = c; return r; };
  r.json = (o) => { r.body = o; return r; };
  r.end = () => r;
  return r;
}
function mockSupabase({ perf, song = SONG, whisper = sungWhisper(), users = { 'user-token': { id: PERF.user_id, email: 'a@b.c' } } } = {}) {
  const calls = [];
  const row = Object.assign({ status: 'uploaded', take_path: `${PERF.user_id}/${PERF.id}.webm`, take_mime: 'audio/webm', contour: contour(46, (t) => t > 1.5 && t < 38), visibility: 'private', room_id: null, verify: null }, PERF, perf || {});
  const fetchImpl = async (url, opts = {}) => {
    const u = String(url), method = (opts.method || 'GET').toUpperCase();
    calls.push([method, u.replace('https://sb.test', ''), opts.body && typeof opts.body === 'string' ? JSON.parse(opts.body) : null, opts.headers || {}]);
    const ok = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } });
    if (u.endsWith('/auth/v1/user')) { const t = String(opts.headers.Authorization || '').slice(7); return users[t] ? ok(users[t]) : ok({ msg: 'bad' }, 401); }
    if (u.includes('/rest/v1/karaoke_performances?id=eq.') && method === 'GET') return ok([row]);
    if (u.includes('/rest/v1/karaoke_performances?id=eq.') && method === 'PATCH') { const b = JSON.parse(opts.body); if (u.includes('status=eq.uploaded') && row.status !== 'uploaded') return ok([]); Object.assign(row, b); return ok([row]); }
    if (u.includes('/rest/v1/karaoke_songs?video_id=eq.') && method === 'GET') return ok([song]);
    if (u.includes('/rest/v1/karaoke_songs?video_id=eq.') && method === 'PATCH') return ok([{ video_id: song.video_id }]);
    if (u.includes('/rest/v1/karaoke_members')) return ok([]);
    if (u.includes('/rest/v1/admin_users')) return ok([]);
    if (u.endsWith('/rest/v1/rpc/karaoke_settle')) { const b = JSON.parse(opts.body); Object.assign(row, { status: 'scored', score: b.p_result.score }); return ok({ ok: true }); }
    if (u.endsWith('/rest/v1/rpc/karaoke_song_calibrate')) return ok({ ok: true });
    if (u.includes('/storage/v1/object/sign/')) return ok({ signedURL: '/object/sign/karaoke-takes/x.webm?token=t' });
    if (u.includes('/storage/v1/object/karaoke-takes/')) return new Response(new Uint8Array(1200), { status: 200 });
    if (u.startsWith('https://api.groq.com/')) return ok(whisper);
    return ok({ error: 'unmocked ' + u }, 500);
  };
  return { calls, row, fetchImpl };
}
async function call(req, mock) {
  const real = globalThis.fetch;
  globalThis.fetch = mock.fetchImpl;
  try { const res = fakeRes(); await API.default(Object.assign({ headers: {}, query: {} }, req), res); return res; }
  finally { globalThis.fetch = real; }
}

test('verify: the singer asks, Whisper listens, the database settles a verified score', async () => {
  const m = mockSupabase();
  const res = await call({ method: 'POST', headers: { authorization: 'Bearer user-token', 'x-forwarded-for': '10.0.0.1' }, query: { op: 'verify' }, body: { perf: PERF.id } }, m);
  assert.equal(res.statusCode, 200, JSON.stringify(res.body));
  assert.equal(res.body.status, 'scored');
  assert.equal(res.body.verified, true);
  const settle = m.calls.find((c) => c[1] === '/rest/v1/rpc/karaoke_settle');
  assert.ok(settle, 'the verdict goes through karaoke_settle');
  assert.equal(settle[3].Authorization, 'Bearer service-key', 'as the service, never as the singer');
  assert.equal(settle[2].p_result.verified, true);
  assert.ok(settle[2].p_result.score >= 70);
  const claim = m.calls.find((c) => c[0] === 'PATCH' && c[1].includes('status=eq.uploaded'));
  assert.ok(claim, 'the take is claimed before it is judged, so two calls cannot judge it twice');
  assert.equal(res.headers['cache-control'], 'no-store');
});

test('verify: nobody else can have a take judged, and bad input is refused', async () => {
  const other = mockSupabase({ users: { 'other-token': { id: '22222222-2222-4222-8222-222222222222' } } });
  const r1 = await call({ method: 'POST', headers: { authorization: 'Bearer other-token', 'x-forwarded-for': '10.0.0.2' }, query: { op: 'verify' }, body: { perf: PERF.id } }, other);
  assert.equal(r1.statusCode, 404);
  assert.ok(!other.calls.some((c) => c[1].includes('karaoke_settle')));
  const r2 = await call({ method: 'POST', headers: { 'x-forwarded-for': '10.0.0.3' }, query: { op: 'verify' }, body: { perf: PERF.id } }, mockSupabase());
  assert.equal(r2.statusCode, 401);
  const r3 = await call({ method: 'POST', headers: { authorization: 'Bearer user-token', 'x-forwarded-for': '10.0.0.4' }, query: { op: 'verify' }, body: { perf: 'nope' } }, mockSupabase());
  assert.equal(r3.statusCode, 400);
  const r4 = await call({ method: 'GET', headers: { authorization: 'Bearer user-token' }, query: { op: 'verify', perf: PERF.id } }, mockSupabase());
  assert.equal(r4.statusCode, 405);
});

test('verify: without Whisper the live reading stands, marked unverified and never ranked', async () => {
  const key = process.env.GROQ_API_KEY;
  delete process.env.GROQ_API_KEY;
  try {
    const m = mockSupabase();
    const res = await call({ method: 'POST', headers: { authorization: 'Bearer user-token', 'x-forwarded-for': '10.0.0.5' }, query: { op: 'verify' }, body: { perf: PERF.id } }, m);
    assert.equal(res.body.status, 'scored');
    assert.equal(res.body.verified, false);
    const settle = m.calls.find((c) => c[1] === '/rest/v1/rpc/karaoke_settle');
    assert.equal(settle[2].p_result.verified, false);
    assert.equal(settle[2].p_result.verify.fallback, 'whisper_unconfigured');
  } finally { process.env.GROQ_API_KEY = key; }
});

test('take: a private recording is only for its singer; a shared one for anyone with the link', async () => {
  const priv = await call({ method: 'GET', headers: { 'x-forwarded-for': '10.0.1.1' }, query: { op: 'take', perf: PERF.id } }, mockSupabase({ perf: { status: 'scored' } }));
  assert.equal(priv.statusCode, 404);
  const mine = await call({ method: 'GET', headers: { authorization: 'Bearer user-token', 'x-forwarded-for': '10.0.1.2' }, query: { op: 'take', perf: PERF.id } }, mockSupabase({ perf: { status: 'scored' } }));
  assert.equal(mine.statusCode, 200);
  assert.match(mine.body.url, /^https:\/\/sb\.test\/storage\/v1\/object\/sign\//);
  const shared = await call({ method: 'GET', headers: { 'x-forwarded-for': '10.0.1.3' }, query: { op: 'take', perf: PERF.id } }, mockSupabase({ perf: { status: 'scored', visibility: 'link' } }));
  assert.equal(shared.statusCode, 200);
});

test('sweep only runs for the scheduler', async () => {
  const res = await call({ method: 'POST', headers: { authorization: 'Bearer guess' }, query: { op: 'sweep' } }, mockSupabase());
  assert.equal(res.statusCode, 401);
});

/* ── the contract with the database ────────────────────────────────── */

function sqlParams(fn) {
  const m = KARAOKE_SQL.match(new RegExp(`create or replace function public\\.${fn}\\(([\\s\\S]*?)\\)\\s*returns`, 'i'));
  if (!m) return null;
  return m[1].split(',').map((p) => p.trim().split(/\s+/)[0]).filter(Boolean);
}

test('every database call the page makes exists, with those argument names', () => {
  const calls = [...CLIENT.matchAll(/rpc\('(karaoke_[a-z_]+)'(?:,\s*(\{[^}]*\}))?/g)];
  assert.ok(calls.length > 30, 'the pages call the karaoke functions');
  for (const [, fn, args] of calls) {
    const params = sqlParams(fn);
    assert.ok(params, `${fn} is called but never defined`);
    const keys = [...String(args || '').matchAll(/\b(p_[a-z_]+)\s*:/g)].map((x) => x[1]);
    for (const k of keys) assert.ok(params.includes(k), `${fn} has no argument ${k} (has ${params.join(', ')})`);
  }
  for (const t of new Set([...CLIENT.matchAll(/from\('(karaoke_[a-z_]+)'\)/g)].map((x) => x[1]))) {
    assert.match(MIGRATIONS, new RegExp(`create table if not exists public\\.${t} \\(`), `table ${t} is read but never created`);
  }
});

test('room channels are private, and only the singer or host may speak on the stage channel', () => {
  assert.match(CLIENT, /channel\('kr:' \+ id, \{ config: \{ private: true/);
  assert.match(CLIENT, /channel\('kc:' \+ id, \{ config: \{ private: true/);
  assert.match(KARAOKE_SQL, /create policy "karaoke rooms listen" on realtime\.messages\s+for select/);
  assert.match(KARAOKE_SQL, /create policy "karaoke rooms speak" on realtime\.messages\s+for insert/);
  const send = KARAOKE_SQL.slice(KARAOKE_SQL.indexOf('function public.karaoke_rt_send('));
  assert.match(send.slice(0, send.indexOf('$$;')), /role in \('host', 'singer'\)/);
  assert.match(KARAOKE_SQL, /grant execute on function public\.karaoke_settle\(uuid, jsonb\) to service_role/);
  assert.doesNotMatch(KARAOKE_SQL, /grant execute on function public\.karaoke_settle\([^)]*\) to (anon|authenticated)/);
});

/* ── the page, in a DOM ────────────────────────────────────────────── */

const LIVE = ['cabana-live-core.js', 'cabana-live-ui.js', 'cabana-live-views.js', 'cabana-live-player.js', 'cabana-live-music.js'];
const KMODS = ['cabana-karaoke-lyrics.js', 'cabana-karaoke-audio.js', 'cabana-visuals.js', 'cabana-karaoke.js', 'cabana-karaoke-views.js'];
function fakeClient(rpcs = {}) {
  function builder() {
    const b = { select() { return b; }, eq() { return b; }, neq() { return b; }, in() { return b; }, or() { return b; }, order() { return b; }, limit() { return b; }, is() { return b; }, upsert() { return b; }, delete() { return b; },
      then(res, rej) { return Promise.resolve({ data: [], error: null }).then(res, rej); } };
    return b;
  }
  return {
    from: builder,
    rpc(fn, args) { const v = typeof rpcs[fn] === 'function' ? rpcs[fn](args) : (rpcs[fn] ?? null); return Promise.resolve({ data: v, error: null }); },
    channel() { const ch = { on() { return ch; }, subscribe() { return ch; }, track() {}, untrack() {}, unsubscribe() {}, send() {}, presenceState() { return {}; } }; return ch; },
    storage: { from() { return {}; } },
  };
}
const open = new Set();
test.afterEach(() => { for (const d of open) d.window.close(); open.clear(); });
function boot(path, { karaoke = false } = {}) {
  const dom = new JSDOM(`<!doctype html><html><body class="lv-body"><div class="lv" data-tab="home"><header class="lv-top" id="lv-top"></header><main class="lv-view" id="lv-view"></main></div></body></html>`,
    { runScripts: 'outside-only', url: 'https://cabana.africa' + path, pretendToBeVisual: true });
  open.add(dom);
  const w = dom.window;
  const client = fakeClient({ live_state: { signed_in: false }, karaoke_rooms_live: [] });
  w.supabase = { createClient: () => client };
  w.fetch = async () => ({ ok: true, json: async () => ({ tracks: [], artists: [], awards: [], releases: [], meta: {} }) });
  w.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
  w.IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} };
  w.scrollTo = () => {};
  try { w.sessionStorage.setItem('lv-sting', '1'); } catch (e) {}
  for (const m of LIVE) w.eval(read(m));
  if (karaoke) for (const m of KMODS) w.eval(read(m));
  w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
  return { dom, w };
}
const settle = (ms = 60) => new Promise((r) => setTimeout(r, ms));

test('the tab and the home band lead to karaoke, and nothing of karaoke loads until then', async () => {
  const { w, dom } = boot('/events');
  await settle(120);
  const d = w.document;
  assert.equal(d.querySelector('.lv-tab[data-tab="karaoke"]').getAttribute('href'), '/events/karaoke');
  const band = d.querySelector('[data-rows] .lv-kk');
  assert.ok(band, 'the home page carries the karaoke band');
  assert.ok(band.querySelector('a[href="/events/karaoke?start=room"]'), 'a room is one tap from home');
  assert.equal(d.querySelector('script[src*="cabana-karaoke"]'), null, 'no karaoke code on the first paint');
  dom.window.close();
});

test('opening karaoke fetches its files once, in order, with its stylesheet', async () => {
  const { w, dom } = boot('/events/karaoke');
  await settle(60);
  const d = w.document;
  const srcs = [...d.querySelectorAll('script[src]')].map((s) => s.getAttribute('src'));
  const want = ['/cabana-karaoke-lyrics.js', '/cabana-karaoke-audio.js', '/cabana-visuals.js', '/cabana-karaoke.js', '/cabana-karaoke-views.js'];
  assert.deepEqual(srcs.map((s) => s.split('?')[0]), want);
  assert.ok([...d.querySelectorAll('script[src]')].every((s) => s.async === false), 'executed in the order asked');
  assert.ok(d.querySelector('link[rel="stylesheet"][href^="/cabana-karaoke.css"]'));
  assert.ok(d.querySelector('.lv-kk-boot'), 'a loading stage while the files arrive');
  dom.window.close();
});

test('the lyric clock follows a big agreed offset, never a recogniser’s own lag', async () => {
  const { w, dom } = boot('/events', { karaoke: true });
  await settle(120);
  const KK = w.CabanaLive.karaoke;
  const tl = w.CabanaKaraokeLyrics.timeline({ synced: true, lines: LINES }, { duration: 60 });
  const small = new KK.LiveJudge(tl, SONG);
  for (let i = 0; i < 12; i++) small.vote(0.75);
  assert.equal(small.shift, 0, 'three quarters of a second is the recogniser, not the song');
  const big = new KK.LiveJudge(tl, SONG);
  let moved = null; big.onShift = (o) => { moved = o; };
  for (let i = 0; i < 8; i++) big.vote(3.0);
  assert.equal(big.shift, 3);
  assert.equal(moved, 3);
  dom.window.close();
});

test('a song stopped early is judged on all of it', async () => {
  const { w, dom } = boot('/events', { karaoke: true });
  await settle(120);
  const KL = w.CabanaKaraokeLyrics, KK = w.CabanaLive.karaoke;
  const plain = KL.timeline({ synced: false, lines: LINES.map((l) => ({ x: l.x })) }, {});
  const j = new KK.LiveJudge(plain, SONG);
  j.words('1:0', ['morning', 'light', 'across', 'the', 'river'], 5, true);
  const early = j.tick(5).length;
  assert.ok(early <= 3, 'while singing, plain lyrics wait for the singer to move on');
  const rest = j.tick(1e9, true);
  assert.equal(early + rest.length, plain.tokens.length, 'at the end everything is judged');
  assert.ok(j.score() < 40, `early stop scores low: ${j.score()}`);
  dom.window.close();
});

test('the room QR code is a well-formed QR code', async () => {
  const { w, dom } = boot('/events', { karaoke: true });
  await settle(120);
  const QR = w.CabanaLive.karaoke.QR;
  const q = QR.matrix('https://cabana.africa/k/ABC234');
  const size = q.length;
  assert.ok(size === 25 || size === 29, `version 2 or 3 (size ${size})`);
  const finder = (r0, c0) => {
    for (let r = 0; r < 7; r++) for (let c = 0; c < 7; c++) {
      const on = r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4);
      assert.equal(q[r0 + r][c0 + c], on ? 1 : 0, `finder at ${r0},${c0}`);
    }
  };
  finder(0, 0); finder(0, size - 7); finder(size - 7, 0);
  for (let i = 8; i < size - 8; i++) { assert.equal(q[6][i], i % 2 === 0 ? 1 : 0); assert.equal(q[i][6], i % 2 === 0 ? 1 : 0); }
  assert.equal(q[size - 8][8], 1, 'the dark module');
  /* the format information: level M, a valid BCH code */
  let f = 0;
  const bits = [];
  for (let i = 0; i <= 5; i++) bits[i] = q[i][8];
  bits[6] = q[7][8]; bits[7] = q[8][8]; bits[8] = q[8][7];
  for (let i = 9; i < 15; i++) bits[i] = q[8][14 - i];
  for (let i = 14; i >= 0; i--) f = (f << 1) | bits[i];
  f ^= 0x5412;
  let rem = f;
  for (let i = 14; i >= 10; i--) if (rem & (1 << i)) rem ^= 0x537 << (i - 10);
  assert.equal(rem, 0, 'the format bits carry a valid BCH code');
  assert.equal(f >> 13, 0, 'error correction level M');
  const copy = [];
  for (let i = 0; i < 8; i++) copy[i] = q[8][size - 1 - i];
  for (let i = 8; i < 15; i++) copy[i] = q[size - 15 + i][8];
  assert.deepEqual(copy, bits, 'both copies of the format information agree');
  assert.match(QR.svg('https://cabana.africa/k/ABC234'), /^<svg class="kk-qr" viewBox="0 0 \d+ \d+"/);
  dom.window.close();
});

test('the voice relay keeps the voice', async () => {
  const { w, dom } = boot('/events', { karaoke: true });
  await settle(120);
  const KA = w.CabanaKaraokeAudio;
  const n = 4800, pcm = new w.Int16Array(n);
  for (let i = 0; i < n; i++) pcm[i] = Math.round(12000 * Math.sin(2 * Math.PI * 220 * i / 12000) + 4000 * Math.sin(2 * Math.PI * 660 * i / 12000));
  const st = { p: 0, i: 0 };
  const a = KA.adpcmEncode(pcm.subarray(0, 2400), st), b = KA.adpcmEncode(pcm.subarray(2400), st);
  assert.ok(a.length <= 1210, 'about four bits a sample');
  const da = KA.adpcmDecode(a), db = KA.adpcmDecode(KA.unb64(KA.b64(b)));
  let sig = 0, err = 0;
  for (let i = 0; i < n; i++) { const o = pcm[i] / 32768, d = i < 2400 ? da[i] : db[i - 2400]; sig += o * o; err += (o - d) ** 2; }
  assert.ok(10 * Math.log10(sig / err) > 20, 'better than 20 dB');
  assert.equal(KA.noteName(69), 'A4');
  dom.window.close();
});

test('short room links reach the room', () => {
  const vercel = JSON.parse(read('vercel.json'));
  const r = vercel.redirects.find((x) => x.source === '/k/:code');
  assert.ok(r, '/k/<code> is a redirect');
  assert.equal(r.destination, '/events/karaoke/room/:code');
  assert.ok(vercel.rewrites.some((x) => x.source === '/api/karaoke' && x.destination === '/api/utilities?action=karaoke'));
  assert.match(read('server.js'), /\\\/k\\\/\(\[A-Za-z0-9\]\{6\}\)/);
});
