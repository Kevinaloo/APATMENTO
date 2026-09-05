import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { JSDOM } from 'jsdom';

/* The Pulse strip and the room that opens behind it.

   The guarantee this file exists to hold is the one the old suite held:
   arriving on Events must not start a download or a sound. The room adds
   a second: a podium is a claim about people, so it must rank from the
   standings it was given rather than from whatever arrived first. */

const ROOT = new URL('..', import.meta.url).pathname;
const read = (file) => readFileSync(join(ROOT, file), 'utf8');

const SCRIPT = read('cabana-room.js');
const EVENTS = read('events.html');
const EVENT_ENGINE = read('cabana-events.js');
const EDGE = read('supabase/functions/youtube-sync/index.ts');
const SEARCH = read('api/lib/_music-search.js');
const VERCEL = JSON.parse(read('vercel.json'));

const tracks = [
  { videoId: 'abcdefghijk', rank: 1, previousRank: 3, title: 'Bien - Safari (Official Video)',
    artist: 'Bien VEVO', thumb: 'https://i.ytimg.com/one.jpg', views: 5100000, likes: 190000,
    viewsDelta: 42000, genre: 'afrobeat', culture: null, format: 'track' },
  { videoId: 'lmnopqrstuv', rank: 2, previousRank: 1, title: 'Nairobi Mix', artist: 'DJ Shinski',
    thumb: 'https://i.ytimg.com/two.jpg', views: 2200000, likes: 60000, viewsDelta: 18000,
    genre: 'other', culture: null, format: 'dj_mix' },
  { videoId: 'wxyzABCDEF0', rank: 3, previousRank: null, title: 'Mugithi Night', artist: 'Waithaka',
    thumb: 'https://i.ytimg.com/three.jpg', views: 980000, likes: 24000, viewsDelta: 0,
    genre: 'tribal', culture: 'Kikuyu', format: 'roots' },
];

const artists = [
  { key: 'bien', name: 'Bien', rank: 1, previousRank: 2, tracks: 3, bestRank: 1,
    views: 9000000, viewsDelta: 51000, leadVideoId: 'abcdefghijk', thumb: 'https://i.ytimg.com/one.jpg' },
  { key: 'djshinski', name: 'DJ Shinski', rank: 2, previousRank: 1, tracks: 2, bestRank: 2,
    views: 4000000, viewsDelta: 18000, leadVideoId: 'lmnopqrstuv', thumb: 'https://i.ytimg.com/two.jpg' },
  { key: 'waithaka', name: 'Waithaka', rank: 3, previousRank: null, tracks: 1, bestRank: 3,
    views: 980000, viewsDelta: 0, leadVideoId: 'wxyzABCDEF0', thumb: 'https://i.ytimg.com/three.jpg' },
  { key: 'nyashinski', name: 'Nyashinski', rank: 4, previousRank: 9, tracks: 1, bestRank: 6,
    views: 700000, viewsDelta: 4000, leadVideoId: 'zzzzzzzzzzz', thumb: '' },
];

const awards = [
  { period: 'week', periodStart: '2026-08-31', name: 'Bien', key: 'bien',
    viewsDelta: 240000, days: 6, thumb: 'https://i.ytimg.com/one.jpg', leadVideoId: 'abcdefghijk' },
];

function browser(search = '') {
  const dom = new JSDOM(
    `<!doctype html><html><body>
       <main class="ev"><div class="ev-pulse" id="ev-pulse"></div></main>
     </body></html>`,
    { runScripts: 'outside-only', url: 'https://cabana.africa/events' + search },
  );

  dom.window.fetch = async () => ({
    ok: true,
    json: async () => ({ tracks, artists, awards, meta: { last_refreshed_at: new Date().toISOString() } }),
  });
  dom.window.requestAnimationFrame = (fn) => setTimeout(() => fn(16), 0);
  dom.window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
  dom.window.IntersectionObserver = class {
    constructor(fn) { this.fn = fn; }
    observe(node) { this.fn([{ isIntersecting: true, target: node }]); }
    unobserve() {} disconnect() {}
  };

  dom.window.eval(SCRIPT);
  dom.window.document.dispatchEvent(new dom.window.Event('DOMContentLoaded'));
  return dom;
}

const settle = (ms = 40) => new Promise((resolve) => setTimeout(resolve, ms));

test('arriving on Events shows the chart but starts nothing', async () => {
  const dom = browser();
  await settle();
  const { document } = dom.window;

  const strip = document.querySelector('#ev-pulse');
  assert.match(strip.textContent, /Safari/, 'the strip names what is at number one');
  assert.match(strip.textContent, /Bien/);
  assert.doesNotMatch(strip.textContent, /Official Video/,
    'YouTube upload noise is trimmed for display');

  assert.equal(document.querySelector('iframe'), null,
    'landing on Events must not download or autoplay a video');
  assert.equal(document.querySelector('.cbr'), null,
    'the room is not built until it is asked for');
  dom.window.close();
});

test('the doorway opens the room, and the room has its own address', async () => {
  const dom = browser();
  await settle();
  const { document } = dom.window;

  document.querySelector('[data-room-open]').click();
  await settle();

  assert.ok(document.querySelector('.cbr'), 'the room mounts on demand');
  assert.match(dom.window.location.search, /room=music/,
    'the room pushes state so back closes it and the address can be shared');
  dom.window.close();
});

test('the podium ranks from the standings, tallest in the middle', async () => {
  const dom = browser('?room=music');
  await settle(60);
  const { document } = dom.window;

  const plinths = [...document.querySelectorAll('.cbr-plinth')];
  assert.equal(plinths.length, 3, 'a podium holds three');
  assert.deepEqual(
    plinths.map((p) => p.getAttribute('data-place')),
    ['2', '1', '3'],
    'second, first, third across the stage so the tallest block is centre',
  );
  assert.match(plinths[1].textContent, /Bien/, 'the winner stands in the middle');

  const rest = [...document.querySelectorAll('.cbr-row')];
  assert.equal(rest.length, 1, 'ranks four to ten follow the podium');
  assert.match(rest[0].textContent, /Nyashinski/);
  assert.match(rest[0].querySelector('.cbr-move').className, /up/,
    'a climb from nine to four reads as a climb');
  dom.window.close();
});

test('the wall runs the number one muted, and only a tap makes sound', async () => {
  const dom = browser('?room=music');
  await settle(60);
  const { document } = dom.window;

  const wall = document.querySelector('#cbr-screen iframe');
  assert.ok(wall, 'the current number one lights the room');
  assert.match(wall.src, /youtube-nocookie\.com\/embed\/abcdefghijk/);
  assert.match(wall.src, /mute=1/, 'ambient video is always silent');
  assert.match(wall.src, /autoplay=1/);

  assert.equal(document.querySelector('#cbr-player-art iframe'), null,
    'no audio source exists before a tap');

  document.querySelector('.cbr-track[data-vid="wxyzABCDEF0"]').click();
  const player = document.querySelector('#cbr-player-art iframe');
  assert.ok(player, 'a deliberate tap opens the player');
  assert.match(player.src, /embed\/wxyzABCDEF0/);
  assert.doesNotMatch(player.src, /mute=1/, 'a requested track is not muted');
  assert.equal(document.querySelector('#cbr-player').classList.contains('on'), true);

  document.querySelector('#cbr-stop').click();
  assert.equal(document.querySelector('#cbr-player-art iframe'), null,
    'stopping destroys the iframe so playback and data use actually stop');
  dom.window.close();
});

test('Tribal is a permanent shelf, and it reads the culture not the genre', async () => {
  const dom = browser('?room=music');
  await settle(60);
  const { document } = dom.window;

  const shelves = [...document.querySelectorAll('.cbr-shelf')].map((b) => b.getAttribute('data-shelf'));
  assert.ok(shelves.includes('tribal'),
    'Tribal stays on the wall whether or not the board carries one today');
  assert.ok(shelves.includes('all'));

  const kikuyu = document.querySelector('.cbr-track[data-vid="wxyzABCDEF0"]');
  assert.match(kikuyu.textContent, /Kikuyu/,
    'a record in a mother tongue is labelled by its culture, not by "tribal"');

  document.querySelector('.cbr-shelf[data-shelf="tribal"]').click();
  const shown = [...document.querySelectorAll('.cbr-track')];
  assert.equal(shown.length, 1);
  assert.match(shown[0].textContent, /Mugithi/);
  dom.window.close();
});

test('the titles are shown when held and honestly described when not', async () => {
  const dom = browser('?room=music');
  await settle(60);
  const { document } = dom.window;

  const titles = [...document.querySelectorAll('.cbr-title')];
  assert.equal(titles.length, 3, 'week, month and year each keep their slot');

  const week = titles.find((t) => t.getAttribute('data-period') === 'week');
  assert.match(week.textContent, /Bien/);

  const year = titles.find((t) => t.getAttribute('data-period') === 'year');
  assert.match(year.textContent, /full year/i,
    'an undecided title says what will decide it rather than showing a blank');
  dom.window.close();
});

test('Events owns the doorway, and the client never writes to the chart', () => {
  assert.match(EVENTS, /id="ev-pulse"/);
  assert.match(EVENTS, /cabana-room\.css/);
  assert.match(EVENTS, /cabana-room\.js/);
  assert.doesNotMatch(EVENTS, /cabana-pulse\.(js|css)/,
    'the retired module must not be left referenced');

  assert.doesNotMatch(SCRIPT, /uinxdkpnxwyrecnxjhdm/,
    'Cabana must not depend on a separate music database');
  assert.doesNotMatch(SCRIPT, /\.insert\(|\.update\(|\.delete\(/,
    'the public client is read-only');
  assert.match(SCRIPT, /music_artists_public/,
    'standings are read from the public projection, never the base table');
});

test('the board is server-written, region-locked and quota-cached', () => {
  assert.match(EDGE, /chart: "mostPopular"/);
  assert.match(EDGE, /regionCode: MARKET/);
  assert.match(EDGE, /videoCategoryId: "10"/);
  assert.match(EDGE, /CACHE_MS = 30 \* 60 \* 1000/);
  assert.match(EDGE, /SUPABASE_DB_URL/);
  assert.match(EDGE, /legacyMusicCache/,
    'the old service may provide server-side continuity, never direct browser access');
});

test('search protects the daily quota and never leaks the key', () => {
  assert.match(SEARCH, /RATE_LIMIT/, 'one visitor cannot spend the whole day');
  assert.match(SEARCH, /CACHE_TTL_MS/, 'a repeated query must not reach Google twice');
  assert.match(SEARCH, /s-maxage=/, 'the edge answers before the function wakes');
  assert.match(SEARCH, /optional\('YOUTUBE_API_KEY'\)/);
  assert.doesNotMatch(SCRIPT, /YOUTUBE_API_KEY|AIza/,
    'the key must never appear in anything the browser downloads');
  assert.doesNotMatch(EVENTS, /AIza/);

  const rewrite = VERCEL.rewrites.find((r) => r.source === '/api/music-search');
  assert.ok(rewrite, 'the route the browser calls must resolve');
  assert.equal(rewrite.destination, '/api/utilities?action=music-search');
});

test('the board serves every crowd, not only the nightlife one', () => {
  for (const key of ['kids', 'corporate', 'community']) {
    assert.match(EVENT_ENGINE, new RegExp(`key: '${key}'`),
      `${key} must be listable, or that organiser has nowhere to go`);
  }
  assert.match(EVENT_ENGINE, /function audienceOf/);
  assert.match(EVENT_ENGINE, /state\.aud !== 'all'/,
    'the audience lens re-weights the board');
  assert.doesNotMatch(EVENT_ENGINE, /if \(state\.aud !== 'all' && audienceOf\(e\) !== state\.aud\) return false/,
    'the lens must never hide an event, only reorder it');
  assert.match(EVENTS, /id="ev-tally"/);
  assert.doesNotMatch(EVENT_ENGINE, /id="ev-hero-clock"/,
    'hero and sheet clocks must not share an invalid duplicate id');
});
