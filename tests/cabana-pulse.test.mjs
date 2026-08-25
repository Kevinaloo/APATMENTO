import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { JSDOM } from 'jsdom';

const ROOT = new URL('..', import.meta.url).pathname;
const read = (file) => readFileSync(join(ROOT, file), 'utf8');
const SCRIPT = read('cabana-pulse.js');
const EVENTS = read('events.html');
const EVENT_ENGINE = read('cabana-events.js');
const MIGRATION = read('supabase/migrations/20260825110000_cabana_pulse_music_chart.sql');
const EDGE = read('supabase/functions/youtube-sync/index.ts');

const tracks = [
  { videoId: 'abcdefghijk', rank: 1, previousRank: 3, title: 'Safari', artist: 'Bien VEVO',
    thumb: 'https://i.ytimg.com/one.jpg', views: 5100000, likes: 190000, viewsDelta: 42000,
    format: 'track', refreshedAt: '2026-08-25T08:00:00Z' },
  { videoId: 'lmnopqrstuv', rank: 2, previousRank: 1, title: 'Nairobi Mix', artist: 'DJ Shinski',
    thumb: 'https://i.ytimg.com/two.jpg', views: 2200000, likes: 60000, viewsDelta: 18000,
    format: 'dj_mix', refreshedAt: '2026-08-25T08:00:00Z' },
  { videoId: 'wxyzABCDEF0', rank: 3, previousRank: null, title: 'Mugithi Night', artist: 'Waithaka',
    thumb: 'https://i.ytimg.com/three.jpg', views: 980000, likes: 24000, viewsDelta: 0,
    format: 'roots', refreshedAt: '2026-08-25T08:00:00Z' },
];

function browser() {
  const dom = new JSDOM(`<!doctype html><html><body>
    <section id="cabana-pulse">
      <div id="cbp-fresh"></div><div id="cbp-filters"></div>
      <div id="cbp-feature"></div><div id="cbp-trackrail"></div>
    </section>
  </body></html>`, {
    runScripts: 'outside-only', url: 'https://cabana.africa/events'
  });
  const channel = { on() { return this; }, subscribe() { return this; } };
  dom.window.supabase = { createClient: () => ({ channel: () => channel }) };
  dom.window.fetch = async () => ({
    ok: true,
    json: async () => ({
      tracks,
      meta: { last_refreshed_at: '2026-08-25T08:00:00Z' },
      stale: false,
    }),
  });
  dom.window.eval(SCRIPT);
  dom.window.document.dispatchEvent(new dom.window.Event('DOMContentLoaded'));
  return dom;
}

test('Pulse renders a real chart but creates no player until the visitor taps', async () => {
  const dom = browser();
  await new Promise((resolve) => setTimeout(resolve, 25));
  const { document } = dom.window;

  assert.match(document.querySelector('#cbp-feature').textContent, /Safari/);
  assert.match(document.querySelector('#cbp-feature').textContent, /5\.1M/);
  assert.equal(document.querySelectorAll('.cbp-filter').length, 4);
  assert.equal(document.querySelector('iframe'), null,
    'loading Events must not autoplay or download an embedded video');

  document.querySelector('[data-cbp-play="abcdefghijk"]').click();
  const iframe = document.querySelector('#cbp-player iframe');
  assert.ok(iframe, 'a deliberate tap opens the player');
  assert.match(iframe.src, /youtube-nocookie\.com\/embed\/abcdefghijk/);
  assert.equal(document.querySelector('#cbp-player').classList.contains('open'), true);

  dom.window.CabanaPulse.close();
  assert.equal(document.querySelector('#cbp-player iframe'), null,
    'closing destroys the iframe so playback and data use stop');
  dom.window.close();
});

test('an event line-up gets matching live music, not an invented association', async () => {
  const dom = browser();
  await new Promise((resolve) => setTimeout(resolve, 25));
  const host = dom.window.document.createElement('div');
  dom.window.document.body.appendChild(host);

  dom.window.CabanaPulse.renderEventMix(host, ['Bien', 'Sauti Sol'], { category: 'music' });
  assert.match(host.textContent, /Listen to the line-up/);
  assert.match(host.textContent, /Safari/);
  assert.doesNotMatch(host.textContent, /Nairobi Mix/);
  dom.window.close();
});

test('Events owns the Pulse experience and both charts refresh through Realtime', () => {
  assert.match(EVENTS, /id="cabana-pulse"/);
  assert.match(EVENTS, /cabana-pulse\.css/);
  assert.match(EVENTS, /cabana-pulse\.js/);
  assert.match(EVENT_ENGINE, /table: 'events'/);
  assert.match(EVENT_ENGINE, /CabanaPulse\.renderEventMix/);
  assert.doesNotMatch(EVENT_ENGINE, /id="ev-hero-clock"/,
    'hero and sheet clocks must not share an invalid duplicate id');
});

test('the backend is server-written, RLS-protected, quota-cached and truthfully sourced', () => {
  assert.match(MIGRATION, /enable row level security/i);
  assert.match(MIGRATION, /to anon, authenticated\s+using \(active\)/i);
  assert.match(MIGRATION, /revoke insert, update, delete/i);
  assert.match(MIGRATION, /security_invoker = true/i);
  assert.match(MIGRATION, /supabase_realtime add table public\.music_chart_tracks/i);

  assert.match(EDGE, /chart: "mostPopular"/);
  assert.match(EDGE, /regionCode: MARKET/);
  assert.match(EDGE, /videoCategoryId: "10"/);
  assert.match(EDGE, /CACHE_MS = 30 \* 60 \* 1000/);
  assert.match(EDGE, /SUPABASE_DB_URL/);
  assert.match(EDGE, /legacyMusicCache/,
    'the old service may provide server-side continuity, never direct browser access');
  assert.doesNotMatch(SCRIPT, /uinxdkpnxwyrecnxjhdm/,
    'Cabana must not depend on Kenya-music’s separate database');
  assert.doesNotMatch(SCRIPT, /\.insert\(|\.update\(|\.delete\(/,
    'the public Pulse client is read-only');
});
