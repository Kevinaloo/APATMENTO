import { fileURLToPath } from 'node:url';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { JSDOM } from 'jsdom';

/* Cabana Live: /events as an events and streaming platform.

   The guarantees this file holds:
     · arriving makes no sound and loads no YouTube player; music starts
       only from a tap
     · every old address into /events still lands somewhere real
     · premium is decided by the database (live_play, storage RLS), and
       the page only ever tells the truth about it: one free month per
       member, claimed after sign-in
     · the party room cannot strobe, and it only shows the reactions it
       offers, whatever arrives over the public channel
     · the YouTube key never reaches anything the browser downloads */

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const read = (f) => readFileSync(join(ROOT, f), 'utf8');

const EVENTS = read('events.html');
const MODULES = ['cabana-live-core.js', 'cabana-live-ui.js', 'cabana-live-views.js', 'cabana-live-player.js', 'cabana-live-music.js'];
const SRC = Object.fromEntries(MODULES.map((m) => [m, read(m)]));
const ALL = Object.values(SRC).join('\n');
const SQL = read('supabase/migrations/20260927090000_cabana_live.sql');
const EDGE = read('supabase/functions/youtube-sync/index.ts');
const VERCEL = JSON.parse(read('vercel.json'));

const tracks = [
  { videoId: 'abcdefghijk', rank: 1, previousRank: 3, title: 'Bien - Safari (Official Video)', artist: 'Bien VEVO', views: 5100000, viewsDelta: 42000, genre: 'afropop' },
  { videoId: 'lmnopqrstuv', rank: 2, previousRank: 1, title: 'Nairobi Mix', artist: 'DJ Shinski', views: 2200000, genre: 'other' },
  { videoId: 'wxyzABCDEF0', rank: 3, previousRank: null, title: 'Mugithi Night', artist: 'Waithaka', views: 980000, genre: 'tribal', culture: 'Kikuyu' },
];

function fakeClient(tables, rpcs) {
  function builder(name) {
    const rows = tables[name] || [];
    const b = {
      select() { return b; }, eq() { return b; }, order() { return b; }, limit() { return b; }, is() { return b; },
      upsert() { return b; }, delete() { return b; },
      then(res, rej) { return Promise.resolve({ data: rows, error: null }).then(res, rej); },
    };
    return b;
  }
  const calls = [];
  return {
    calls,
    from: builder,
    rpc(fn, args) {
      calls.push([fn, args]);
      const v = typeof rpcs[fn] === 'function' ? rpcs[fn](args) : (rpcs[fn] ?? null);
      return Promise.resolve({ data: v, error: null });
    },
    channel() { const ch = { on() { return ch; }, subscribe() { return ch; }, track() {}, untrack() {}, unsubscribe() {}, send() {}, presenceState() { return {}; } }; return ch; },
    storage: { from() { return { createSignedUrl: () => Promise.resolve({ data: { signedUrl: 'https://cdn.example/film.mp4' } }) }; } },
  };
}

const open = new Set();
test.afterEach(() => { for (const d of open) d.window.close(); open.clear(); });

function boot(path, { tables = {}, rpcs = {} } = {}) {
  const dom = new JSDOM(
    `<!doctype html><html><body class="lv-body"><div class="lv" data-tab="home"><header class="lv-top" id="lv-top"></header><main class="lv-view" id="lv-view"></main></div><section class="seo-content"></section></body></html>`,
    { runScripts: 'outside-only', url: 'https://cabana.africa' + path, pretendToBeVisual: true },
  );
  open.add(dom);
  const w = dom.window;
  const client = fakeClient(tables, Object.assign({ live_state: { signed_in: false, premium: false, trial_enabled: true, trial_days: 30, trial_used: false } }, rpcs));
  w.supabase = { createClient: () => client };
  w.fetch = async (url) => ({
    ok: true,
    json: async () => (String(url).includes('action=chart') ? { tracks, artists: [], awards: [], releases: [], meta: {} } : []),
  });
  w.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
  w.IntersectionObserver = class { constructor(fn) { this.fn = fn; } observe(n) { this.fn([{ isIntersecting: true, target: n }]); } unobserve() {} disconnect() {} };
  w.scrollTo = () => {};
  w.HTMLMediaElement.prototype.play = () => Promise.resolve();
  w.HTMLMediaElement.prototype.pause = () => {};
  try { w.sessionStorage.setItem('lv-sting', '1'); } catch (e) {}
  for (const m of MODULES) w.eval(SRC[m]);
  w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
  return { dom, w, client };
}

const settle = (ms = 60) => new Promise((r) => setTimeout(r, ms));

test('arriving on Events plays nothing and loads no YouTube player', async () => {
  const { w, dom } = boot('/events');
  await settle(120);
  const d = w.document;
  assert.ok(d.querySelector('.lv-bb'), 'the billboard is up');
  assert.match(d.querySelector('.lv-bb').textContent, /Safari/, 'the number one record leads when nothing else is scheduled');
  assert.match(d.querySelector('.lv-bb').textContent, /one month free/i, 'the free month has its own slide');
  assert.equal(d.querySelector('#lv-yt iframe'), null, 'no player exists before a tap');
  assert.equal(d.querySelector('script[src*="iframe_api"]'), null, 'the YouTube API is not even downloaded');
  const tabs = [...d.querySelectorAll('.lv-tab')].map((a) => a.getAttribute('href'));
  assert.deepEqual(tabs, ['/events', '/events/whats-on', '/events/live', '/events/movies', '/events/shows', '/events/music']);
  dom.window.close();
});

test('a tap on a record starts the one shared player', async () => {
  const { w, dom } = boot('/events/music');
  await settle(120);
  const d = w.document;
  const row = d.querySelector('.lv-trk[data-vid="wxyzABCDEF0"]');
  assert.ok(row, 'the chart renders');
  assert.match(row.textContent, /Kikuyu/, 'a record in a mother tongue is labelled by its culture');
  row.click();
  await settle(20);
  assert.ok(d.querySelector('.lv-dock.is-on'), 'the dock opens');
  assert.ok(d.querySelector('script[src="https://www.youtube.com/iframe_api"]'), 'the player loads only now');
  dom.window.close();
});

test('old addresses into /events still land somewhere real', async () => {
  const ev = { id: 77, title: 'Warehouse Night', starts_at: new Date(Date.now() + 86400000).toISOString(), venue: 'The Mint', city: 'Nairobi', price_from: 1500, tiers: [], lineup: [], tags: [], photos: [], videos: [] };
  const a = boot('/events?open=77', { tables: { events_public: [ev] } });
  await settle(120);
  assert.equal(a.w.location.pathname, '/events/e/77', 'a dashboard rail link opens the event page');
  assert.match(a.w.document.querySelector('h1').textContent, /Warehouse Night/);
  a.dom.window.close();

  const b = boot('/events?room=music');
  await settle(60);
  assert.equal(b.w.location.pathname, '/events/music', 'the old music room link opens the music tab');
  b.dom.window.close();
});

test('premium asks the database, then offers the free month honestly', async () => {
  const t = { id: 't1', slug: 'nairobi-nights', kind: 'movie', title: 'Nairobi Nights', status: 'published', access: 'premium', genres: [], cast_list: [] };
  const { w, dom, client } = boot('/events/watch/nairobi-nights', { tables: { live_titles: [t] }, rpcs: { live_play: { ok: false, reason: 'signin', trial_available: true } } });
  await settle(120);
  w.document.querySelector('.lv-hero [data-act="play"]').click();
  await settle(40);
  const call = client.calls.find((c) => c[0] === 'live_play');
  assert.deepEqual(JSON.parse(JSON.stringify(call)), ['live_play', { p_title: 't1', p_episode: null }]);
  const modal = w.document.querySelector('.lv-modal');
  assert.ok(modal, 'the paywall is a conversation, not a dead button');
  assert.match(modal.textContent, /one month free/i);
  assert.match(modal.querySelector('a[href^="/auth"]').getAttribute('href'), /claim%3D1/, 'sign-in returns to claim the month');
  dom.window.close();
});

test('the paywall lives in the database, not in the page', () => {
  assert.match(SQL, /create or replace function public\.live_play\(p_title uuid, p_episode uuid default null\)/);
  assert.match(SQL, /if not public\.live_can_watch\(t\.id, v_ep\) then/, 'live_play refuses premium sources without access');
  assert.match(SQL, /values \('live-media', 'live-media', false,/, 'films sit in a private bucket');
  assert.match(SQL, /using \(bucket_id = 'live-media' and public\.live_object_readable\(name\)\)/, 'storage asks for every object');
  assert.match(SQL, /create unique index if not exists live_passes_one_trial on public\.live_passes \(user_id\) where source = 'trial'/, 'one free month per member, ever');
  assert.doesNotMatch(SQL, /grant [^;]*live_media[^;]* to anon/, 'the catalogue never exposes what plays');
  assert.match(SQL, /constraint live_media_upload_path_ck/, 'a title can only play files from its own folder');
  assert.doesNotMatch(ALL, /from\('live_media'\)/, 'the public page never reads the media table');
});

test('the party room cannot strobe and only shows its own reactions', () => {
  const music = SRC['cabana-live-music.js'];
  assert.match(music, /var beat = Math\.max\(\.4, 60 \/ bpm\)/, 'the beat never pulses faster than 2.5 times a second');
  assert.match(music, /if \(REACTIONS\.indexOf\(e\) !== -1\) react\(e, false\)/, 'received emoji are checked against the offered six');
  assert.match(music, /sentWindow\.length < 4/, 'a guest cannot flood the room');
  assert.match(read('cabana-live.css'), /@media \(prefers-reduced-motion: reduce\)/);
});

test('the chart is server-written and the key never reaches the browser', () => {
  assert.match(EDGE, /chart: "mostPopular"/);
  assert.match(EDGE, /regionCode: MARKET/);
  assert.match(EDGE, /function parseFeed/, 'followed channels keep the chart alive without a key');
  assert.match(EDGE, /async function autoFollow/);
  assert.match(EDGE, /force_refresh/);
  for (const [name, src] of Object.entries(SRC)) {
    assert.doesNotMatch(src, /YOUTUBE_API_KEY|AIza/, `${name} must not carry the key`);
    assert.doesNotMatch(src, /uinxdkpnxwyrecnxjhdm/, `${name} must not depend on the old music database`);
  }
  assert.doesNotMatch(EVENTS, /AIza/);
});

test('every address under /events is served by the app', () => {
  const rw = VERCEL.rewrites.find((r) => r.source === '/events/:path+');
  assert.ok(rw, 'deep links need a rewrite');
  assert.equal(rw.destination, '/events.html');
  assert.match(read('server.js'), /app\.get\(\/\^\\\/events\\\/\.\+\$\//, 'the dev server mirrors it');
});

test('the shell loads the platform in order and keeps the page contracts', () => {
  const at = (s) => EVENTS.indexOf(s);
  MODULES.reduce((prev, m) => { assert.ok(at('/' + m) > prev, `${m} loads after the module before it`); return at('/' + m); }, at('/apa-session.js'));
  assert.equal((EVENTS.match(/<title>/g) || []).length, 1);
  assert.match(EVENTS, /<section class="seo-content">/, 'the ad engine anchors before the static copy');
  assert.doesNotMatch(EVENTS, /cabana-room|cabana-event-gate|cabana-events\.js/, 'the retired modules are not referenced');
  assert.doesNotMatch(EVENTS, /\/brand\.css|cabana-rebrand\.js/, 'the light-theme brand layer stays off this page');
});

test('the audience lens reorders events and never hides one', () => {
  const views = SRC['cabana-live-views.js'];
  assert.match(views, /function audienceOf/);
  assert.match(views, /if \(f\.aud !== 'all'\) l\.sort\(/);
  assert.doesNotMatch(views, /audienceOf\(e\) !== f\.aud\) return false/);
  for (const key of ['kids', 'corporate', 'community']) assert.match(views, new RegExp(`key: '${key}'`));
});

test('the database shelves records with the same patterns as the chart function', () => {
  // music_refresh_standings() re-shelves every row with music_shelf(), so a
  // pattern added to the function alone would be silently undone.
  const shelf = read('supabase/migrations/20260927092000_music_shelf_knows_artists.sql');
  for (const list of ['CULTURES', 'GENRES', 'ARTIST_CULTURES', 'ARTIST_GENRES']) {
    const body = EDGE.match(new RegExp(`const ${list}: Array<\\[string, RegExp\\]> = \\[\\n([\\s\\S]*?)\\n\\];`))[1];
    for (const [, label, rx] of body.matchAll(/\["([^"]+)", \/\\b\((.*)\)\\b\/\]/g)) {
      const pg = `'\\m(${rx.replace(/'/g, "''")})\\M'`;
      assert.ok(shelf.includes(pg), `${list} ${label} is missing from music_shelf()`);
    }
  }
  assert.match(shelf, /regexp_replace\(lower\([^;]*'vevo\\M', ' vevo'/, 'RemaVEVO is Rema in both places');
});
