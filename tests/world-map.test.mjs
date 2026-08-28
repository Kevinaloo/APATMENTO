/* ══════════════════════════════════════════════════════════════════════
   THE WORLD MAP
   tests/world-map.test.mjs

   The globe makes two kinds of promise, and they fail differently.

   The first is factual: every pin has a real page, every price band is
   labelled for what it is, and a live count came from the database. A
   map that sends a guest to a 404, or dresses a catalogue entry up as
   availability, is worse than no map — so those are asserted against
   the filesystem and the generated atlas, not against a fixture.

   The second is behavioural: the ported camera, allocator and share
   link have to behave the way the originals did. Those are pure
   functions by design, exposed on CabanaGlobe._internals precisely so
   they can be proven here without a browser, a network or a tile
   server.
   ══════════════════════════════════════════════════════════════════════ */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { JSDOM } from 'jsdom';
import { __test as atlasTest } from '../api/lib/_atlas.js';

const ROOT = new URL('..', import.meta.url).pathname;
const read = (f) => readFileSync(join(ROOT, f), 'utf8');

const ATLAS = JSON.parse(read('cabana-world-atlas.json'));
const GLOBE = read('cabana-globe.js');
const GLOBE_CSS = read('cabana-globe.css');

/* The module is an IIFE that installs itself on `window`, so it is run
   in a jsdom window rather than imported. That also proves the file is
   loadable as a plain <script>, which is how every Cabana page takes
   it — there is no bundler to catch a mistake here. */
function loadGlobe() {
  const dom = new JSDOM('<!doctype html><html><body></body></html>', {
    runScripts: 'outside-only', url: 'https://cabana.africa/world'
  });
  dom.window.eval(GLOBE);
  return dom.window.CabanaGlobe;
}

const { _internals: I } = loadGlobe();

/* ── The atlas is true ─────────────────────────────────────────────── */

test('every place on the map has a page that exists on disk', () => {
  const missing = [];
  for (const place of ATLAS.places) {
    for (const [category, url] of Object.entries(place.pages)) {
      const file = join(ROOT, url.replace(/^\//, '') + '.html');
      if (!existsSync(file)) missing.push(`${place.id}/${category} → ${url}`);
    }
  }
  assert.deepEqual(missing, [],
    'the map must never advertise a destination that 404s');
});

test('every place is positioned, parented and on a continent', () => {
  for (const p of ATLAS.places) {
    assert.ok(Number.isFinite(p.lat) && Math.abs(p.lat) <= 90, `${p.id} latitude`);
    assert.ok(Number.isFinite(p.lng) && Math.abs(p.lng) <= 180, `${p.id} longitude`);
    assert.ok(p.continent, `${p.id} has no continent`);
    assert.ok(p.zoom > 0, `${p.id} has no framing zoom`);
    if (p.kind !== 'continent') {
      assert.ok(p.parent, `${p.id} has no parent to drill up to`);
    }
  }
});

test('every parent link resolves to a place that is on the map', () => {
  const ids = new Set(ATLAS.places.map((p) => p.id));
  for (const p of ATLAS.places) {
    if (!p.parent) continue;
    assert.ok(ids.has(p.parent),
      `${p.id} points at a parent (${p.parent}) that is not in the atlas`);
  }
});

test('corridors only join places the platform actually serves', () => {
  const ids = new Set(ATLAS.places.map((p) => p.id));
  for (const r of ATLAS.routes) {
    assert.ok(ids.has(r.from), `corridor from unknown place ${r.from}`);
    assert.ok(ids.has(r.to), `corridor to unknown place ${r.to}`);
    assert.notEqual(r.from, r.to, 'a corridor must join two different places');
  }
});

test('a live inventory count is only ever a real one', () => {
  /* `live` is copied straight from seo/data/inventory.json, which is
     wired to the database. A zero or a negative there would be a
     fabricated availability claim on the place card. */
  const source = JSON.parse(read('seo/data/inventory.json'));
  for (const p of ATLAS.places) {
    if (!p.live) continue;
    assert.deepEqual(p.live, source[p.id],
      `${p.id} carries a live count the database did not produce`);
    for (const supply of Object.values(p.live)) {
      assert.ok(supply.count > 0, `${p.id} claims live inventory of ${supply.count}`);
      assert.ok(supply.lowUSD <= supply.highUSD, `${p.id} price range is inverted`);
    }
  }
});

test('categories on a place match the pages behind it', () => {
  for (const p of ATLAS.places) {
    for (const c of p.categories) {
      assert.ok(p.pages[c], `${p.id} claims ${c} with no page`);
    }
  }
});

/* ── The camera ────────────────────────────────────────────────────── */

test('a longer journey takes longer, but never unwatchably longer', () => {
  /* The published curve, restated. What must not regress is its
     SHAPE: distance across the Earth spans four orders of magnitude,
     and a proportional duration would make the long moves
     unwatchable, so the ramp is a fourth root under a hard ceiling. */
  const durationFor = (km) =>
    I.clamp(0.72 + Math.pow(Math.max(km, 1), 0.25) * 0.17, 0.85, 3.1);

  const hop = durationFor(3);       // across a neighbourhood
  const region = durationFor(450);  // Nairobi to Mombasa
  const world = durationFor(6800);  // London to Lagos and beyond

  assert.ok(hop < region && region < world, 'duration must rise with distance');
  assert.ok(world <= 3.1, 'no camera move may outstay its welcome');
  assert.ok(hop >= 0.85, 'a short hop still needs enough time to read');
  assert.ok(world / hop < 5,
    'a 2,000x longer distance must not be a 2,000x longer wait');

  assert.match(GLOBE, /Math\.pow\(Math\.max\(km, 1\), 0\.25\)/,
    'the shipped curve must still be the one asserted here');
  assert.match(GLOBE, /if \(this\.reduced\) return 0;/,
    'reduced motion must collapse the flight to nothing');
});

test('great-circle distance is real geography', () => {
  const nairobi = { lat: -1.2921, lng: 36.8219 };
  const london = { lat: 51.5074, lng: -0.1278 };
  const d = I.haversine(nairobi, london);
  assert.ok(d > 6700 && d < 6900, `London–Nairobi came out at ${d} km`);
  assert.equal(Math.round(I.haversine(nairobi, nairobi)), 0);
});

test('a corridor follows the great circle, not a straight screen line', () => {
  const accra = { lat: 5.5571, lng: -0.2012 };
  const ny = { lat: 40.7128, lng: -74.006 };
  const mid = I.slerp(accra, ny, 0.5);

  /* The midpoint of the real flight path bows north of the straight
     average — that bow is the whole reason slerp is used. */
  const flatMid = (accra.lat + ny.lat) / 2;
  assert.ok(mid.lat > flatMid,
    'the great-circle midpoint should sit north of the naive average');

  assert.deepEqual(
    { lat: +I.slerp(accra, ny, 0).lat.toFixed(4), lng: +I.slerp(accra, ny, 0).lng.toFixed(4) },
    { lat: accra.lat, lng: accra.lng }, 't=0 is the origin');
});

test('easing is a real ease, anchored at both ends', () => {
  assert.equal(I.cubicInOut(0), 0);
  assert.equal(I.cubicInOut(1), 1);
  assert.ok(Math.abs(I.cubicInOut(0.5) - 0.5) < 1e-9, 'symmetric at the middle');
  assert.ok(I.cubicInOut(0.25) < 0.25, 'slow lead-in');
  assert.ok(I.cubicInOut(0.75) > 0.75, 'slow settle');
});

/* ── The allocator ─────────────────────────────────────────────────── */

const VIEW = { width: 1000, height: 700, limit: 40 };

test('labels that do not collide all get a slot', () => {
  const cands = [];
  for (let i = 0; i < 8; i++) {
    cands.push({ id: 'p' + i, x: 80 + i * 110, y: 350, w: 60, h: 20, priority: 100 });
  }
  const out = I.allocate(cands, VIEW);
  assert.equal(Object.keys(out).length, 8);
});

test('when there is one slot left, the higher priority takes it', () => {
  const out = I.allocate([
    { id: 'minor', x: 480, y: 350, w: 90, h: 20, priority: 100 },
    { id: 'major', x: 500, y: 350, w: 90, h: 20, priority: 900 }
  ], { width: 1000, height: 700, limit: 1 });

  assert.ok(out.major, 'the ranked winner must keep its label');
  assert.ok(!out.minor, 'the loser must fall back to a bare dot');
});

test('a place with nowhere to put its name keeps its dot and loses the label', () => {
  /* Five candidates stacked on one point, and only four anchors to go
     round. The fifth is not dropped from the map — it simply does not
     shout. That is the whole design: density is bounded by legibility,
     never by throwing places away. */
  const stacked = [];
  for (let i = 0; i < 5; i++) {
    stacked.push({ id: 's' + i, x: 500, y: 350, w: 90, h: 20, priority: 100 - i });
  }
  const out = I.allocate(stacked, VIEW);
  const won = Object.keys(out);

  assert.ok(won.length >= 1, 'the top-ranked candidate always gets a slot');
  assert.ok(won.length < stacked.length,
    'and a point cannot hold every label stacked on it');
  assert.ok(out.s0, 'the highest priority is never the one that yields');
  assert.ok(!out.s4, 'the lowest is');

  /* Everything that did win took a different side of the dot — the
     anchors are alternatives, not a queue. */
  assert.equal(new Set(won.map((id) => out[id].cls)).size, won.length);
});

test('two crowded labels take opposite anchors rather than one losing', () => {
  /* The reason four anchors exist. Given room above and below, both
     places keep their names. */
  const out = I.allocate([
    { id: 'a', x: 500, y: 350, w: 900, h: 20, priority: 900 },
    { id: 'b', x: 505, y: 350, w: 900, h: 20, priority: 100 }
  ], VIEW);

  assert.ok(out.a && out.b, 'both should be placed');
  assert.notEqual(out.a.cls, out.b.cls, 'on different sides of their dots');
});

test('a label that would leave the viewport takes another anchor', () => {
  /* Hard against the right edge: the preferred right anchor cannot
     fit, so the allocator must find the left one rather than clip. */
  const out = I.allocate(
    [{ id: 'edge', x: 970, y: 350, w: 120, h: 20, priority: 500 }], VIEW);
  assert.ok(out.edge, 'an edge label should still be placed');
  assert.equal(out.edge.align, 'right', 'it should have flipped to the left side');
});

test('off-screen candidates never consume a slot', () => {
  const out = I.allocate([
    { id: 'gone', x: -500, y: 350, w: 60, h: 20, priority: 9999 },
    { id: 'here', x: 500, y: 350, w: 60, h: 20, priority: 1 }
  ], { width: 1000, height: 700, limit: 1 });

  assert.ok(!out.gone, 'an off-screen place must not be labelled');
  assert.ok(out.here, 'and must not have spent the only slot');
});

test('the cohort limit is honoured', () => {
  const cands = [];
  for (let i = 0; i < 60; i++) {
    cands.push({ id: 'p' + i, x: 60 + (i % 10) * 90, y: 60 + Math.floor(i / 10) * 90,
      w: 40, h: 20, priority: i });
  }
  const out = I.allocate(cands, { width: 1000, height: 700, limit: 12 });
  assert.equal(Object.keys(out).length, 12);
});

/* ── Priority reflects the product, not taste ──────────────────────── */

test('a place you can book outranks one you cannot', () => {
  const base = { kind: 'city', categories: ['apartments'] };
  const withLive = I.basePriority({ ...base, live: { stays: { count: 4 } } });
  const without = I.basePriority(base);
  assert.ok(withLive > without, 'live inventory must rank a place up');
});

test('a place serving more of Cabana outranks one serving less', () => {
  const many = I.basePriority({ kind: 'city', categories: ['apartments', 'safaris', 'car-hire', 'rides'] });
  const one = I.basePriority({ kind: 'city', categories: ['apartments'] });
  assert.ok(many > one);
});

test('wayfinding outranks detail at every altitude', () => {
  const continent = I.basePriority({ kind: 'continent', categories: [] });
  const country = I.basePriority({ kind: 'country', categories: [] });
  const city = I.basePriority({ kind: 'city', categories: [] });
  const district = I.basePriority({ kind: 'district', categories: [] });
  assert.ok(continent > country && country > city && city > district);
});

/* ── Level of detail ───────────────────────────────────────────────── */

test('altitude decides what may exist', () => {
  /* Spread first: these arrays are built inside the jsdom realm, and
     deepStrictEqual compares prototypes, which differ across realms. */
  assert.deepEqual([...I.lodFor(2.5).kinds], ['continent'],
    'at world zoom only the continents are on');
  assert.ok(I.lodFor(14).kinds.includes('district'),
    'neighbourhoods appear only close in');
  assert.ok(!I.lodFor(3).kinds.includes('district'),
    'and never from orbit');
});

test('the label budget grows as the camera descends', () => {
  const budgets = [2.5, 4, 5.5, 8, 11, 15].map((z) => I.lodFor(z).labels);
  for (let i = 1; i < budgets.length; i++) {
    assert.ok(budgets[i] >= budgets[i - 1],
      'a lower altitude must never allow fewer labels than a higher one');
  }
});

/* ── Share links ───────────────────────────────────────────────────── */

test('a shared view round-trips', () => {
  const url = I.ShareLink.write({
    at: 'diani', zoom: 11.6, skin: 'savannah',
    categories: ['apartments', 'safaris'], arcs: false
  });
  const back = I.ShareLink.read(new URL(url).search);

  assert.equal(back.at, 'diani');
  assert.equal(back.zoom, 11.6);
  assert.equal(back.skin, 'savannah');
  assert.deepEqual([...back.categories], ['apartments', 'safaris']);
  assert.equal(back.arcs, false);
});

test('the default view produces a clean URL', () => {
  const url = I.ShareLink.write({ skin: 'aurora', categories: [], arcs: true });
  assert.ok(!url.includes('skin='), 'the default optic is not worth a parameter');
  assert.ok(!url.includes('cat='), 'nor an empty filter');
  assert.ok(!url.includes('arcs='), 'nor a setting that is already on');
});

test('an unknown optic in a link is ignored, not applied', () => {
  const state = I.ShareLink.read('?skin=definitely-not-a-skin');
  assert.equal(state.skin, undefined);
});

test('a named place beats raw coordinates in a shared link', () => {
  const url = I.ShareLink.write({
    at: 'nairobi', center: { lat: -1.29, lng: 36.82 }, zoom: 11
  });
  assert.ok(url.includes('at=nairobi'));
  assert.ok(!url.includes('ll='), 'coordinates are the fallback, not a duplicate');
});

/* ── HUD readout ───────────────────────────────────────────────────── */

test('a selected place fills both readout lines', () => {
  const s = I.miniStatus({ place: { name: 'Diani', kind: 'city', country: 'Kenya' } });
  assert.equal(s.line1, 'Diani');
  assert.equal(s.line2, 'Kenya');
});

test('a free-text search lands somewhere real, not on a dash', () => {
  /* The bug the upstream module documents: only the record path was
     rendered, so a search left the readout empty while the camera sat
     over the destination. */
  const s = I.miniStatus({ searchedLabel: 'Tokyo Tower, Shibakoen, Minato City, Japan' });
  assert.equal(s.line1, 'Tokyo Tower');
  assert.ok(s.line2.includes('Japan'));
  assert.notEqual(s.line2, '--');
});

test('a one-segment search still says something', () => {
  const s = I.miniStatus({ searchedLabel: 'Japan' });
  assert.equal(s.line1, 'Japan');
  assert.equal(s.line2, 'Searched location');
});

test('an empty readout invites the guest in rather than showing a dash', () => {
  const s = I.miniStatus({});
  assert.equal(s.kind, 'none');
  assert.ok(!s.line1.includes('--'));
});

/* ── Journeys ──────────────────────────────────────────────────────── */

test('every journey stop is a place on the map', () => {
  const ids = new Set(ATLAS.places.map((p) => p.id));
  const unknown = [];
  for (const j of I.JOURNEYS) {
    for (const s of j.stops) if (!ids.has(s.id)) unknown.push(`${j.id}: ${s.id}`);
  }
  assert.deepEqual(unknown, [],
    'a tour must not fly to somewhere Cabana does not serve');
});

test('every journey is long enough to be a journey', () => {
  for (const j of I.JOURNEYS) {
    assert.ok(j.stops.length >= 3, `${j.id} is too short to be a tour`);
    assert.ok(j.title && j.blurb, `${j.id} needs a title and a blurb`);
  }
});

/* ── Optics ────────────────────────────────────────────────────────── */

test('every optic is complete and reachable by keyboard', () => {
  assert.equal(I.SKIN_ORDER.length, Object.keys(I.SKINS).length,
    'an optic missing from the order is unreachable by number key');
  assert.ok(I.SKIN_ORDER.length <= 9, 'the number keys only go so far');

  for (const key of I.SKIN_ORDER) {
    const s = I.SKINS[key];
    assert.ok(s, `${key} is in the order but not defined`);
    for (const field of ['label', 'hint', 'tiles', 'filter', 'accent', 'vignette']) {
      assert.ok(s[field], `${key} is missing ${field}`);
    }
    assert.match(s.tiles, /^https:\/\//, `${key} must load tiles over TLS`);
  }
});

/* ── Licence and provenance ────────────────────────────────────────── */

test('the ported work is attributed where it is used', () => {
  assert.match(GLOBE, /gods-eye-view/,
    'cabana-globe.js must name what it is derived from');
  assert.match(GLOBE, /MIT/, 'and the licence it is used under');
  assert.ok(existsSync(join(ROOT, 'NOTICE-gods-eye-view.md')),
    'the full notice must ship with the code');

  const notice = read('NOTICE-gods-eye-view.md');
  assert.match(notice, /Bilawal Sidhu/, 'the author must be named');
  assert.match(notice, /Permission is hereby granted/,
    'the MIT text must be reproduced in full');
});

test('the basemap attribution cannot be dropped', () => {
  /* OpenStreetMap and Esri both require it, and it is a licence breach
     to remove. It lives in the layer factory rather than in each
     caller for exactly that reason — and apa-map.js must agree. */
  assert.match(GLOBE, /openstreetmap\.org\/copyright/);
  assert.match(GLOBE, /esri\.com/);
  assert.match(read('apa-map.js'), /openstreetmap\.org\/copyright/);
  assert.match(read('apa-map.js'), /esri\.com/);
});

test('no basemap is requested from a source that now demands a key', () => {
  /* CARTO began stamping API KEY REQUIRED across anonymous tiles.
     Every map on the platform wore it — the results map, the listing
     map, the globe and the host's own pin picker — because they all
     drew from the same two URLs. Nothing may quietly reintroduce it. */
  for (const file of ['apa-map.js', 'cabana-globe.js', 'cabana-pinpoint.js',
                      'world.html', 'global-apartments.html']) {
    assert.ok(!/cartocdn\.com/.test(read(file)),
      `${file} must not request a keyed basemap`);
  }
});

test('every skin declares the source it is crediting', () => {
  /* Two providers now, not one. A skin that carried the wrong credit
     would be a licence breach that no test could see from the URL
     alone, so the pairing is asserted here. */
  for (const key of I.SKIN_ORDER) {
    const s = I.SKINS[key];
    assert.ok(s.attrib, `${key} must name its basemap's source`);
    if (/openstreetmap\.org/.test(s.tiles)) {
      assert.match(s.attrib, /OpenStreetMap/, `${key} draws OSM and must say so`);
    } else if (/arcgisonline\.com/.test(s.tiles)) {
      assert.match(s.attrib, /Esri/, `${key} draws Esri imagery and must say so`);
    }
  }
});

test('no non-commercial upstream dataset came across', () => {
  /* The upstream MIT grant covers code only. Its bundled TeleGeography
     cables are CC BY-NC-SA — NonCommercial — and Cabana is a
     commercial platform. */
  for (const file of ['cabana-globe.js', 'cabana-globe.css', 'cabana-world-atlas.json']) {
    const body = read(file).toLowerCase();
    assert.ok(!body.includes('telegeography'), `${file} must not carry NC data`);
  }
});

/* ── The page ──────────────────────────────────────────────────────── */

test('the world map page works without JavaScript', () => {
  const doc = new JSDOM(read('world.html')).window.document;

  const cards = [...doc.querySelectorAll('.wcard')];
  assert.ok(cards.length > 100,
    `only ${cards.length} destinations are reachable with JS off`);

  for (const a of cards) {
    const href = a.getAttribute('href');
    assert.ok(existsSync(join(ROOT, href.replace(/^\//, '') + '.html')),
      `the crawlable index links to ${href}, which does not exist`);
  }
});

test('the generated index and the map read the same inventory', () => {
  const doc = new JSDOM(read('world.html')).window.document;
  const linked = new Set([...doc.querySelectorAll('.wcard')]
    .map((a) => a.getAttribute('href')));

  /* Every place with a page should appear in the index. Continents are
     the exception: they head their own section rather than sitting in
     it as a card. */
  for (const p of ATLAS.places) {
    if (p.kind === 'continent') continue;
    const primary = p.pages.apartments || p.pages.safaris || p.pages['car-hire']
      || p.pages.rides || p.pages.travel || p.pages.guide;
    assert.ok(linked.has(primary),
      `${p.id} is on the map but not in the crawlable index`);
  }
});

test('the page declares itself to search engines from real counts', () => {
  const doc = new JSDOM(read('world.html')).window.document;
  const blocks = [...doc.querySelectorAll('script[type="application/ld+json"]')]
    .map((s) => JSON.parse(s.textContent));

  const page = blocks.find((b) => b['@type'] === 'CollectionPage');
  assert.ok(page, 'the page needs an identity');
  assert.ok(page.description.includes(String(ATLAS.stats.places)),
    'the description must quote the real place count');

  /* A map is not a shop window. AggregateOffer belongs on the pages
     with database-backed inventory, which seo/inject_schema.py owns. */
  assert.ok(!read('world.html').includes('AggregateOffer'),
    'the map must not make an offer claim');
});

test('the globe is lazy on every page that mounts it', () => {
  for (const page of ['world.html', 'global-apartments.html']) {
    const body = read(page);
    assert.match(body, /cabana-globe\.js/, `${page} should load the globe`);
    assert.match(body, /requestIdleCallback/,
      `${page} must not block first paint on a world map`);
    assert.match(body, /id="cabana-world"/, `${page} needs a mount point`);
  }
});

test('nothing is fetched until a globe is actually mounted', () => {
  /* The whole file is one IIFE that only registers an API. If a fetch
     or a script tag escaped to module scope, every page carrying
     cabana-globe.js would pay for a map it never shows. */
  const beforeMount = GLOBE.slice(0, GLOBE.indexOf('function loadLeaflet'));
  assert.ok(!/\bfetch\s*\(/.test(beforeMount),
    'no network call may sit at module scope');
  assert.ok(!/document\.head\.appendChild/.test(beforeMount),
    'no asset may be injected at module scope');
});

/* ── Regressions ───────────────────────────────────────────────────
   Two bugs that were invisible in unit tests and only showed up in a
   real browser. Both are the kind that come back. */

test('the map stage is styled as the Leaflet container, not its parent', () => {
  /* L.map() is handed .cg-stage directly, so Leaflet adds
     `leaflet-container` to that same element. A descendant selector
     matches nothing, Leaflet's own #ddd container background wins,
     and every optic renders on a grey plate. */
  assert.match(GLOBE_CSS, /\.cg-stage\.leaflet-container\s*\{/,
    'the container rule must be compound');
  assert.ok(!/\.cg-stage\s+\.leaflet-container\s*\{/.test(GLOBE_CSS),
    'a descendant selector here matches no element');
});

test('the default optic is painted, not just recorded', () => {
  /* setSkin short-circuits when the key has not changed, which is
     right for a click and wrong for the first frame: Aurora would
     never receive its filter, its vignette or its data-skin. */
  assert.match(GLOBE, /_paintSkin\s*=\s*function/,
    'painting must be separable from switching');
  assert.match(GLOBE, /this\._buildSkinRail\(\);\s*\n\s*this\._paintSkin\(this\.skin\);/,
    'the initial optic must be painted at build time');
});

test('optics that share a basemap do not re-request its tiles', () => {
  /* Four of the six optics sit on the same OpenStreetMap raster.
     Rebuilding the layer tears the tile grid down and refetches it, so
     swapping between those four must be a repaint. */
  assert.match(GLOBE, /if \(this\._tileUrl !== skin\.tiles\)/,
    'the tile URL must be compared before the layer is rebuilt');

  const shared = I.SKIN_ORDER.filter((k) => I.SKINS[k].tiles === I.SKINS.aurora.tiles);
  assert.ok(shared.length >= 3,
    'this guard only earns its place while optics really do share a basemap');
});

test('a basemap swap replaces the layer rather than re-pointing it', () => {
  /* Leaflet's credit line follows layer add and remove events, not a
     layer's current URL. setUrl would leave the globe crediting
     OpenStreetMap over Esri's imagery — the same licence bug
     cabana-pinpoint.js already had to fix once. */
  assert.ok(!/this\.tiles\.setUrl\(/.test(GLOBE),
    'setUrl on the basemap is what breaks attribution');
  assert.match(GLOBE, /this\.map\.removeLayer\(this\.tiles\)/,
    'the outgoing layer must be removed so its credit goes with it');
});

test('the keyboard is claimed by dominance, not by proximity to an edge', () => {
  /* The first version compared the map's edges to fixed fractions of
     the viewport, which failed on the one page it was written for:
     under a tall hero the map never reached the top threshold, so
     none of the shortcuts fired. Coverage of the viewport is the
     property that actually means "this is what is being looked at". */
  assert.match(GLOBE, /Math\.min\(r\.bottom, vh\) - Math\.max\(r\.top, 0\)/,
    'focus must be decided from visible coverage');
  assert.match(GLOBE, /visible \/ vh >= 0\.4/, 'with an explicit threshold');
  assert.ok(!/r\.top < vh \* 0\.4 && r\.bottom > vh \* 0\.5/.test(GLOBE),
    'the edge-fraction test must not come back');
});

test('a keystroke is never taken from a field', () => {
  assert.match(GLOBE, /tagName === 'INPUT'/);
  assert.match(GLOBE, /tagName === 'TEXTAREA'/);
  assert.match(GLOBE, /isContentEditable/);
});

test('the animation loops stand down when nobody is looking', () => {
  /* A globe scrolled off an article keeps its rAF loop alive unless
     something stops it — a background tab is throttled by the browser,
     an off-screen element is not. */
  assert.match(GLOBE, /visibilitychange/, 'a backgrounded tab must pause');
  assert.match(GLOBE, /IntersectionObserver/, 'and so must a scrolled-past map');
  assert.match(GLOBE, /if \(self\.paused\) return;/,
    'the arc loop must honour the pause');
  assert.match(GLOBE, /if \(wasPaused && !this\.paused\) this\._t0 = 0;/,
    'and rebase its clock on resume, so returning looks like a resume');
  assert.match(GLOBE, /this\._io\.disconnect\(\)/,
    'the observer must be released on destroy');
});

/* ── Live inventory ────────────────────────────────────────────────
   The generated atlas is as old as the last deploy. /api/atlas is what
   makes the map current without one — and it inherits the pipeline's
   rule exactly: a count on screen is a count of rows a guest could
   book right now, and a place with nothing bookable is ABSENT rather
   than present with a zero. */

const { slug: liveSlug, rollUp } = atlasTest;

test('only rows a guest could actually book are counted', () => {
  const inv = rollUp([
    { city: 'Nairobi', country: 'Kenya', service: 'stays',
      price_night: 2000, currency: 'KES', status: 'active', is_active: true },
    /* Each of these is unbookable for a different reason, and every one
       of them has at some point been counted by something. */
    { city: 'Nairobi', country: 'Kenya', service: 'stays',
      price_night: 2000, currency: 'KES', status: 'draft', is_active: true },
    { city: 'Nairobi', country: 'Kenya', service: 'stays',
      price_night: 2000, currency: 'KES', status: 'active', is_active: false },
    { city: 'Nairobi', country: 'Kenya', service: 'stays', price_night: 2000,
      currency: 'KES', status: 'active', is_active: true, deleted_at: '2026-01-01' },
    { city: 'Nairobi', country: 'Kenya', service: 'stays',
      price_night: 0, currency: 'KES', status: 'active', is_active: true },
    { city: 'Nairobi', country: 'Kenya', service: 'stays',
      price_night: null, currency: 'KES', status: 'active', is_active: true },
  ]);

  assert.equal(inv.nairobi.stays.count, 1);
  assert.equal(inv.kenya.stays.count, 1);
});

test('a place with nothing bookable is absent, never a zero', () => {
  const inv = rollUp([
    { city: 'Lagos', country: 'Nigeria', service: 'stays',
      price_night: 0, currency: 'NGN', status: 'active', is_active: true },
  ]);
  assert.equal(inv.lagos, undefined,
    'a zero count would be an availability claim about an empty city');
  assert.deepEqual(Object.keys(inv), []);
});

test('one listing counts for its area, its city and its country', () => {
  /* All three have pages, and a guest on any of them is asking a fair
     question. The same row in three buckets is a rollup, not double
     counting. */
  const inv = rollUp([
    { area: 'Kilimani', city: 'Nairobi', country: 'Kenya', service: 'stays',
      price_night: 2600, currency: 'KES', status: 'active', is_active: true },
  ]);
  assert.equal(inv.kilimani.stays.count, 1);
  assert.equal(inv.nairobi.stays.count, 1);
  assert.equal(inv.kenya.stays.count, 1);
});

test('prices are converted so one band spans every currency', () => {
  const inv = rollUp([
    { city: 'Nairobi', country: 'Kenya', service: 'stays',
      price_night: 2600, currency: 'KES', status: 'active', is_active: true },
    { city: 'Nairobi', country: 'Kenya', service: 'stays',
      price_night: 90, currency: 'USD', status: 'active', is_active: true },
  ]);
  const s = inv.nairobi.stays;
  assert.equal(s.count, 2);
  assert.ok(s.lowUSD > 19 && s.lowUSD < 21, `2600 KES came out at $${s.lowUSD}`);
  assert.equal(s.highUSD, 90);
  assert.ok(s.lowUSD <= s.highUSD);
});

test('an unknown currency is passed through rather than dropped', () => {
  /* Losing the listing entirely would be worse than an imprecise band:
     the guest would be told a real, bookable place does not exist. */
  const inv = rollUp([
    { city: 'Accra', country: 'Ghana', service: 'stays',
      price_night: 55, currency: 'ZZZ', status: 'active', is_active: true },
  ]);
  assert.equal(inv.accra.stays.count, 1);
  assert.equal(inv.accra.stays.lowUSD, 55);
});

test('the live route and the build pipeline slug places identically', () => {
  /* They key the same map. If they disagreed about "Cote d Ivoire" the
     live counts would land on places the atlas has never heard of, and
     silently do nothing. */
  assert.equal(liveSlug("Côte d'Ivoire"), 'cote-divoire');
  assert.equal(liveSlug('São Tomé and Príncipe'), 'sao-tome-and-principe');
  assert.equal(liveSlug('Türkiye'), 'turkiye');
  assert.equal(liveSlug('  Dar es Salaam '), 'dar-es-salaam');
  assert.equal(liveSlug('Ongata Rongai'), 'ongata-rongai');
  assert.equal(liveSlug(''), '');
  assert.equal(liveSlug(null), '');
});

test('the live keys line up with real atlas places', () => {
  const ids = new Set(ATLAS.places.map((p) => p.id));
  for (const [city, country] of [['Nairobi', 'Kenya'], ['Kilimani', 'Kenya'],
                                 ['Lagos', 'Nigeria'], ['Accra', 'Ghana'],
                                 ['Diani', 'Kenya'], ['Zanzibar', 'Tanzania']]) {
    assert.ok(ids.has(liveSlug(city)),
      `${city} rolls up to "${liveSlug(city)}", which is not on the map`);
    assert.ok(ids.has(liveSlug(country)), `${country} likewise`);
  }
});

test('the globe patches live counts in and removes ones that went away', () => {
  /* A place that sold out since the build must LOSE its count. Keeping
     a stale one is the exact failure asking the database was meant to
     fix. */
  assert.match(GLOBE, /if \(next\) p\.live = next; else delete p\.live;/);
  assert.match(GLOBE, /rec\.priority = basePriority\(rec\.place\)/,
    'new counts change what is worth showing, so ranking must be rebuilt');
});

test('a failed live read leaves the map working on generated counts', () => {
  assert.match(GLOBE, /source: 'unavailable'/,
    'the failure must be recorded, not swallowed');
  const body = GLOBE.slice(GLOBE.indexOf('function refreshLive'),
                           GLOBE.indexOf('CAMERA DIRECTOR'));
  assert.match(body, /\.catch\(function \(err\) \{/,
    'refreshLive must never reject — the caller already has a usable atlas');
  assert.ok(body.lastIndexOf('.catch(') > body.lastIndexOf('.then('),
    'the catch must terminate the chain, not sit mid-way through it');
  assert.match(GLOBE, /Counts from the last site build/,
    'and the readout must say which numbers it is showing');
});

test('the live route is public, cacheable and read-only', () => {
  const atlas = read('api/lib/_atlas.js');
  assert.match(atlas, /s-maxage=60/, 'one database read a minute, not one a visitor');
  assert.match(atlas, /stale-while-revalidate/);
  assert.match(atlas, /method not allowed/, 'GET only');
  assert.ok(!/\b(insert|update|delete|upsert)\b/i.test(atlas),
    'this route must never write');
  assert.ok(!/SUPABASE_ANON/.test(atlas));
  assert.match(atlas, /AbortSignal\.timeout/,
    'a slow database must not hold the map open');
});

test('the live route is reachable at a clean URL', () => {
  const vercel = JSON.parse(read('vercel.json'));
  const route = vercel.rewrites.find((r) => r.source === '/api/atlas');
  assert.ok(route, '/api/atlas must be routed');
  assert.equal(route.destination, '/api/utilities?action=atlas');
  assert.match(read('api/utilities.js'), /action === 'atlas'/,
    'and dispatched');
});

test('every country in the atlas keys identically on both sides', () => {
  /* The failure this prevents is silent: a live count keyed
     "c-te-divoire" against a map that calls the place "cote-divoire"
     does not error, it simply never appears. Abidjan would have shown
     nothing forever. */
  const ids = new Set(ATLAS.places.map((p) => p.id));
  /* Resolution is by id OR alias, exactly as the client does it —
     "Republic of the Congo" slugs to republic-of-the-congo and reaches
     the republic-of-congo page through the alias the builder emitted. */
  const reach = new Map();
  for (const p of ATLAS.places) {
    reach.set(p.id, p.id);
    for (const a of p.aliases || []) reach.set(a, p.id);
  }
  const missed = [];

  for (const p of ATLAS.places) {
    if (!p.country) continue;
    const key = liveSlug(p.country);
    /* Only countries that are themselves places on the map can be
       checked — Japan has cities on Cabana but no page of its own. */
    if (ids.has(p.countrySlug) && reach.get(key) !== p.countrySlug) {
      missed.push(`${p.country}: live="${key}" reaches ` +
        `"${reach.get(key) || 'nothing'}" not "${p.countrySlug}"`);
    }
  }
  assert.deepEqual([...new Set(missed)], []);

  /* Where a display name does not slug to its own page id — Nairobi
     CBD's page is "cbd", Upper Hill's is "upperhill" — the atlas must
     carry the alias, or a host publishing there stays invisible. */
  const keyed = new Map();
  for (const p of ATLAS.places) {
    keyed.set(p.id, p.id);
    for (const a of p.aliases || []) keyed.set(a, p.id);
  }
  for (const p of ATLAS.places) {
    assert.equal(keyed.get(liveSlug(p.name)), p.id,
      `${p.name} rolls up to "${liveSlug(p.name)}", which reaches ` +
      `${keyed.get(liveSlug(p.name)) || 'nothing'} rather than ${p.id}`);
  }
});

test('no alias is claimed by two places, or shadows a real one', () => {
  const ids = new Set(ATLAS.places.map((p) => p.id));
  const claimed = new Map();
  for (const p of ATLAS.places) {
    for (const a of p.aliases || []) {
      assert.ok(!ids.has(a),
        `${p.id} claims "${a}", which is another place's id`);
      assert.ok(!claimed.has(a),
        `"${a}" is claimed by both ${claimed.get(a)} and ${p.id}`);
      claimed.set(a, p.id);
    }
  }
});

test('live counts land on a place, or are reported as unmatched', () => {
  assert.match(GLOBE, /atlas\.resolve\(key\)/,
    'incoming keys must resolve through the alias index');
  assert.match(GLOBE, /unmatched \+= 1/,
    'and a key that reaches nothing must be counted, not dropped silently');
  /* Two keys folding onto one place must ADD UP rather than overwrite. */
  assert.match(GLOBE, /a\.count \+= b\.count/);
});
