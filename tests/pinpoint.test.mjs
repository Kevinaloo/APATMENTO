/* ══════════════════════════════════════════════════════════════════════
   THE PRECISION LOCATION PICKER
   tests/pinpoint.test.mjs

   Two things here can hurt a real person, so they are tested hardest.

   The first is the Plus Code. A host gives it to a guest, and a guest
   arriving at midnight in Kilimani types it into whatever navigation
   app they have. If the encoder is a metre out that is a nuisance; if
   it is a kilometre out because of a floating-point slip at a cell
   boundary, someone is standing in the dark on the wrong road. So it is
   checked against the specification's own vectors, against a code
   Google publishes for its own front door, and round-tripped through an
   independently written decoder over thousands of random points.

   The second is the precision grade. Its whole job is to refuse to
   overstate a pin, and a grader that flatters a bad pin is worse than
   no grader at all — it launders a guess into a promise.
   ══════════════════════════════════════════════════════════════════════ */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { JSDOM } from 'jsdom';

const ROOT = new URL('..', import.meta.url).pathname;
const read = (f) => readFileSync(join(ROOT, f), 'utf8');

const PINPOINT = read('cabana-pinpoint.js');
const PINPOINT_CSS = read('cabana-pinpoint.css');

/* The module is an IIFE that installs itself on `window`, so it is run
   in a jsdom window rather than imported — which also proves it loads
   as a plain <script>, the only way any Cabana page takes it. */
function loadPin() {
  const dom = new JSDOM('<!doctype html><html><body></body></html>', {
    runScripts: 'outside-only', url: 'https://cabana.africa/add-listing'
  });
  dom.window.eval(PINPOINT);
  return dom.window.CabanaPin;
}

const P = loadPin();

/* ── Plus Codes: the specification's own vectors ───────────────────── */

test('the encoder matches every published test vector', () => {
  const vectors = [
    // From the Open Location Code specification's encoding test data.
    [20.375,          2.775,          6,  '7FG49Q00+'],
    [20.3700625,      2.7821875,      10, '7FG49QCJ+2V'],
    [20.3701125,      2.782234375,    11, '7FG49QCJ+2VX'],
    [20.3701135,      2.78223535156,  13, '7FG49QCJ+2VXGJ'],
    [47.0000625,      8.0000625,      10, '8FVC2222+22'],
    [-41.2730625,     174.7859375,    10, '4VCPPQGP+Q9'],
    [-89.9999375,     -179.9999375,   10, '22222222+22'],
    // Google's own front door, 1600 Amphitheatre Parkway — the code
    // they publish for it. An independent check on the whole chain.
    [37.4220656,      -122.0840897,   10, '849VCWC8+R9'],
  ];

  for (const [lat, lng, len, want] of vectors) {
    assert.equal(P.plusCode(lat, lng, len), want,
      `${lat},${lng} at ${len} digits`);
  }
});

/* A decoder written from the specification rather than from the
   encoder, so a shared misreading cannot pass both. */
function decode(code) {
  const A = '23456789CFGHJMPQRVWX';
  const clean = code.replace(/\+/g, '').replace(/0+$/, '');
  let latVal = -90 * 25000000;
  let lngVal = -180 * 8192000;
  let latPlace = 25000000 * 400;
  let lngPlace = 8192000 * 400;

  for (let i = 0; i < Math.min(clean.length, 10); i += 2) {
    latPlace /= 20; lngPlace /= 20;
    latVal += A.indexOf(clean.charAt(i)) * latPlace;
    lngVal += A.indexOf(clean.charAt(i + 1)) * lngPlace;
  }
  for (let i = 10; i < Math.min(clean.length, 15); i++) {
    latPlace /= 5; lngPlace /= 4;
    const d = A.indexOf(clean.charAt(i));
    latVal += Math.floor(d / 4) * latPlace;
    lngVal += (d % 4) * lngPlace;
  }
  return {
    latLo: latVal / 25000000, latHi: (latVal + latPlace) / 25000000,
    lngLo: lngVal / 8192000,  lngHi: (lngVal + lngPlace) / 8192000,
  };
}

test('every code contains the point it was made from', () => {
  /* Fixed seed rather than Math.random: a test that fails once in a
     thousand runs and passes on the retry teaches nobody anything. */
  let seed = 20260825;
  const rnd = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };

  let checked = 0;
  for (let i = 0; i < 3000; i++) {
    const lat = rnd() * 180 - 90;
    const lng = rnd() * 360 - 180;
    for (const len of [10, 11, 12]) {
      const c = decode(P.plusCode(lat, lng, len));
      assert.ok(lat >= c.latLo - 1e-9 && lat <= c.latHi + 1e-9,
        `latitude ${lat} fell outside its own cell at ${len} digits`);
      assert.ok(lng >= c.lngLo - 1e-9 && lng <= c.lngHi + 1e-9,
        `longitude ${lng} fell outside its own cell at ${len} digits`);
      checked += 1;
    }
  }
  assert.equal(checked, 9000);
});

test('eleven digits is a three-metre square, which is what we claim', () => {
  /* The default length. It is chosen because it is the finest
     resolution a host can actually verify against imagery — claiming
     more precision than the picture supports is a lie with extra
     digits. */
  const c = decode(P.plusCode(-1.2864, 36.8172, 11));
  const mLat = (c.latHi - c.latLo) * 111320;
  const mLng = (c.lngHi - c.lngLo) * 111320 * Math.cos(-1.2864 * Math.PI / 180);

  assert.ok(mLat > 2 && mLat < 4, `latitude cell is ${mLat.toFixed(2)}m`);
  assert.ok(mLng > 2 && mLng < 5, `longitude cell is ${mLng.toFixed(2)}m`);
});

test('codes are stable — the same point always gives the same code', () => {
  const a = P.plusCode(-1.2921, 36.7833, 11);
  const b = P.plusCode(-1.2921, 36.7833, 11);
  assert.equal(a, b);
  /* A code a host has already given out must not drift when the same
     coordinates come back from the database as strings. */
  assert.equal(P.plusCode(Number('-1.2921'), Number('36.7833'), 11), a);
});

test('the poles and the antimeridian produce a valid code, not a crash', () => {
  for (const [lat, lng] of [[90, 180], [-90, -180], [90, -180], [0, 180], [0, -180]]) {
    const code = P.plusCode(lat, lng, 11);
    assert.match(code, /^[23456789CFGHJMPQRVWX]{8}\+[23456789CFGHJMPQRVWX]{3}$/,
      `${lat},${lng} produced ${code}`);
  }
});

test('a longitude past the meridian is normalised, not clipped', () => {
  assert.equal(P.plusCode(0, 181, 10), P.plusCode(0, -179, 10));
  assert.equal(P.plusCode(0, -181, 10), P.plusCode(0, 179, 10));
});

test('the short form drops the region and names the town instead', () => {
  const full = P.plusCode(-1.2864, 36.8172, 11);
  const short = P.shortPlusCode(-1.2864, 36.8172, 'Nairobi', 11);

  assert.equal(short, full.slice(4) + ' Nairobi');
  assert.ok(short.length < full.length + 'Nairobi'.length,
    'the short form exists to be shorter to read out');
  /* With nowhere to name, there is nothing to trade the digits for. */
  assert.equal(P.shortPlusCode(-1.2864, 36.8172, '', 11), full);
});

/* ── Precision: the grader must never flatter a pin ────────────────── */

test('a pin placed on a roof is graded exact; one dropped on a city is not', () => {
  assert.equal(P.precisionOf({ zoom: 20, source: 'manual' }).key, 'rooftop');
  assert.equal(P.precisionOf({ zoom: 19, source: 'manual' }).key, 'rooftop');
  assert.equal(P.precisionOf({ zoom: 17, source: 'search' }).key, 'parcel');
  assert.equal(P.precisionOf({ zoom: 15, source: 'search' }).key, 'street');
  assert.equal(P.precisionOf({ zoom: 12, source: 'search' }).key, 'district');
  assert.equal(P.precisionOf({ zoom: 9,  source: 'search' }).key, 'city');
});

test('the grade only ever improves as the host zooms in', () => {
  const order = ['city', 'district', 'street', 'parcel', 'rooftop'];
  let last = -1;
  for (let z = 3; z <= 21; z++) {
    const rank = order.indexOf(P.precisionOf({ zoom: z, source: 'manual' }).key);
    assert.ok(rank >= last, `zoom ${z} graded worse than zoom ${z - 1}`);
    last = rank;
  }
});

test('a GPS fix is believed about itself, not flattered by its zoom', () => {
  /* A phone triangulating on cell towers reports two kilometres of
     error. Rendering that as "Exact" because the map happened to be at
     zoom 20 would be the single most dangerous thing this module could
     do. */
  const bad = P.precisionOf({ source: 'device', accuracy: 2400, zoom: 20 });
  assert.equal(bad.key, 'city');
  assert.match(bad.note, /2400 m/);

  const good = P.precisionOf({ source: 'device', accuracy: 6, zoom: 12 });
  assert.equal(good.key, 'rooftop');

  for (const [acc, key] of [[5, 'rooftop'], [30, 'parcel'], [150, 'street'],
                            [900, 'district'], [5000, 'city']]) {
    assert.equal(P.precisionOf({ source: 'device', accuracy: acc }).key, key,
      `${acc}m should grade as ${key}`);
  }
});

test('every grade says something a host can act on', () => {
  for (const z of [21, 19, 17, 15, 12, 8, 3]) {
    const g = P.precisionOf({ zoom: z, source: 'manual' });
    assert.ok(g.label && g.note, `zoom ${z} produced an empty grade`);
    assert.ok(g.note.length > 8, `zoom ${z} note is not advice`);
  }
});

test('a pin with no provenance is graded at its worst, not its best', () => {
  /* An unknown pin is a pin nobody watched being placed. Defaulting it
     to anything but the floor would let a missing field publish itself
     as an exact address. */
  assert.equal(P.precisionOf({}).key, 'city');
  assert.equal(P.precisionOf().key, 'city');
});

/* ── Distance ──────────────────────────────────────────────────────── */

test('drift is measured in real metres', () => {
  const kilimani = { lat: -1.2921, lng: 36.7833 };
  const cbd = { lat: -1.2864, lng: 36.8172 };
  const d = P.metresBetween(kilimani, cbd);

  assert.ok(d > 3700 && d < 3900, `Kilimani to the CBD came out at ${d} m`);
  assert.equal(Math.round(P.metresBetween(cbd, cbd)), 0);
  /* Symmetric, or the warning would depend on argument order. */
  assert.ok(Math.abs(P.metresBetween(cbd, kilimani) - d) < 1e-6);
});

/* ── Imagery and licences ──────────────────────────────────────────── */

test('the picker opens on imagery, because that is the whole point', () => {
  const I = P._internals;
  assert.equal(I.VIEW_ORDER[0], 'hybrid',
    'a host must see their roof on the first frame, not a street diagram');
  assert.ok(I.VIEWS.hybrid.overlay, 'hybrid needs its labels');
  assert.ok(!I.VIEWS.satellite.overlay, 'satellite is imagery alone');
});

test('every imagery source is credited, over TLS', () => {
  const I = P._internals;
  for (const key of I.VIEW_ORDER) {
    const v = I.VIEWS[key];
    assert.match(v.base, /^https:\/\//, `${key} base must be TLS`);
    assert.ok(v.baseAttrib, `${key} has no attribution`);
    if (v.overlay) {
      assert.match(v.overlay, /^https:\/\//, `${key} overlay must be TLS`);
      assert.ok(v.overlayAttrib, `${key} overlay has no attribution`);
    }
  }
  assert.match(I.VIEWS.hybrid.baseAttrib, /Esri/);
  assert.match(I.VIEWS.map.baseAttrib, /OpenStreetMap/);
  assert.match(I.VIEWS.map.baseAttrib, /CARTO/);
});

test('changing the view re-registers attribution rather than re-pointing tiles', () => {
  /* Leaflet's attribution control is driven by layer add/remove events,
     not by a layer's current options. setUrl therefore swaps the tiles
     and leaves the credit describing the layer that used to be there —
     which is how the street map ended up crediting Esri and dropping
     OpenStreetMap. Both are licence breaches. */
  assert.match(PINPOINT, /_setBase\s*=\s*function/,
    'the base layer needs its own swap path');
  assert.match(PINPOINT, /this\.map\.removeLayer\(this\.base\)/,
    'a base whose credit changed must be removed, not re-pointed');
  assert.ok(!/this\.base\.setUrl\(/.test(PINPOINT),
    'setUrl on the base layer is what broke attribution');
  assert.ok(!/attributionControl\._update\(\)/.test(PINPOINT),
    'reaching into a private Leaflet method is not the fix');
});

test('imagery keeps rendering past the last real tile', () => {
  /* Esri stops serving new tiles around zoom 19 over most of Africa.
     Without maxNativeZoom the host zooms in for a closer look and the
     map goes blank at the exact moment they need it most. */
  const I = P._internals;
  for (const key of I.VIEW_ORDER) {
    assert.equal(I.VIEWS[key].maxNativeZoom, 19, `${key} needs a native cap`);
  }
  assert.match(PINPOINT, /maxZoom:\s*21/, 'and a reachable zoom past it');
});

/* ── Interaction rules ─────────────────────────────────────────────── */

test('the crosshair never blocks the thing it is aiming at', () => {
  assert.match(PINPOINT_CSS, /\.cpin-cross-mark\{[^}]*pointer-events:none/s,
    'gestures must pass through to the map underneath');
  assert.match(PINPOINT_CSS, /\.cpin-cross-ring\{[^}]*border:/s,
    'a ring, so the target stays visible through it');
});

test('a wheel over the map does not steal the page scroll', () => {
  /* This picker lives on step four of a long listing form. Losing your
     place because you rolled past the map is worse than an extra
     click. */
  assert.match(PINPOINT, /scrollWheelZoom:\s*o\.scrollWheelZoom\s*!=\s*null\s*\?\s*o\.scrollWheelZoom\s*:\s*false/);
});

test('the picker owns its own gestures on a touch screen', () => {
  assert.match(PINPOINT_CSS, /\.cpin\{[^}]*touch-action:none/s,
    'without this a one-finger pan scrolls the form instead of the map');
});

test('attribution is never covered by the readout', () => {
  assert.match(PINPOINT_CSS, /\.cpin \.leaflet-bottom\.leaflet-right\{bottom:\d+px/,
    'the credit line must be lifted clear of the panel');
});

/* ── The handoff from the old picker ───────────────────────────────── */

test('ApaMap.picker still honours its old contract', () => {
  /* Forty call sites use this. The upgrade is worthless if it breaks
     them. */
  const apaMap = read('apa-map.js');
  assert.match(apaMap, /loadPinpoint\(\)/, 'the old picker must delegate');
  for (const method of ['set:', 'get:', 'locate:', 'destroy:']) {
    assert.ok(apaMap.includes(method),
      `the returned handle lost ${method} — call sites depend on it`);
  }
  assert.match(apaMap, /cabana-pinpoint\.js/);
});

test('the listing form records how good the pin was', () => {
  const form = read('add-listing.html');
  assert.match(form, /F\.plusCode/, 'the Plus Code must be stored');
  assert.match(form, /F\.precision/, 'and the grade');
  assert.match(form, /extras:\{plus:/,
    'carried in extras, so no schema migration is needed');
  assert.match(form, /l\.extras&&l\.extras\.plus/,
    'and read back when a saved listing is reopened');
});

/* ── Lazy by default ───────────────────────────────────────────────── */

test('nothing loads until a picker is actually mounted', () => {
  const beforeMount = PINPOINT.slice(0, PINPOINT.indexOf('function loadLeaflet'));
  assert.ok(!/\bfetch\s*\(/.test(beforeMount),
    'no network call may sit at module scope');
  assert.ok(!/document\.head\.appendChild/.test(beforeMount),
    'no asset may be injected at module scope');
  assert.ok(existsSync(join(ROOT, 'cabana-pinpoint.css')),
    'the stylesheet must ship alongside');
});

test('the picker needs no API key and bills nobody per request', () => {
  /* The reason this can replace a Google Maps picker at all. If a key
     ever creeps in, it creeps into a static HTML page, where a key is a
     key that has been given away. */
  assert.ok(!/api[_-]?key/i.test(PINPOINT), 'no key may appear here');
  assert.ok(!/maps\.googleapis\.com/.test(PINPOINT));
  assert.match(PINPOINT, /window\.ApaGeo/,
    'geocoding goes through the shared layer, which holds the keys server-side');
});

/* ── Search bias ───────────────────────────────────────────────────
   Found while investigating a report that the picker's search missed
   an actual Nairobi landmark ("The Obama Mansion") and returned
   unrelated results (Playboy Mansion, a museum in Guangzhou). Root
   cause: the free OSM-backed geocoder (Photon/Nominatim) has no record
   of that specific business at all — confirmed live against
   cabana.africa/api/geocode, whose health check reports only
   ["photon","nominatim"] configured, with GOOGLE_MAPS_API_KEY unset.
   Closing that coverage gap needs a paid provider key, which is a
   deployment decision, not a code fix.

   What WAS a real, independent bug: the picker never told ApaGeo where
   "here" was, so a global text-relevance ranking is all any provider —
   including a paid one — had to go on. A host in Nairobi searching for
   anything nearby should get Nairobi results ranked first. */

test('the picker biases search toward where the map actually is', () => {
  assert.match(PINPOINT, /near:\s*this\.opts\.near\s*\|\|\s*bias/,
    'without a bias point every provider ranks by text relevance alone');
  assert.match(PINPOINT, /country:\s*this\.opts\.country/,
    'and a caller that knows the country should be able to restrict to it');
  assert.match(PINPOINT, /var bias = \{ lat: this\.map\.getCenter\(\)\.lat, lng: this\.map\.getCenter\(\)\.lng \};/,
    'the bias point must be where the picker is actually open, not a hardcoded default');
});

test('a thin geocoder index is disclosed before it is hit, not after', () => {
  /* The free index has excellent road/estate coverage and close to none
     for informally-named local businesses. Naming the real workaround
     (search the estate, then move the map) up front is cheaper and more
     honest than a guest discovering it only after picking a wrong
     result. */
  assert.match(PINPOINT, /cpin-tip/);
  assert.match(PINPOINT, /nearest road instead/);
});

test('the coverage hint gets out of the way once a pin exists', () => {
  assert.match(PINPOINT, /if \(this\.tipEl\) this\.tipEl\.hidden = !!p;/,
    'a hint that stays up after the job is done is clutter, not help');
});

test('the coverage hint never outranks live search suggestions', () => {
  /* Both occupy the same rectangle below the search box. The dropdown
     must always win that stacking fight, or a suggestion list would
     render underneath static help text. */
  const geo = read('apa-geo.js');
  const popZ = Number((geo.match(/\.apa-geo-pop\{[^}]*z-index:(\d+)/) || [])[1]);
  const tipZ = Number((PINPOINT_CSS.match(/\.cpin-tip\{[^}]*z-index:(\d+)/) || [])[1]);
  assert.ok(popZ > 0 && tipZ > 0, 'both z-indexes must be found to compare them');
  assert.ok(popZ > tipZ, `suggestion dropdown (z=${popZ}) must sit above the hint (z=${tipZ})`);
});

/* ── OpenStreetMap contribution ────────────────────────────────────
   The only DURABLE free fix for the coverage gap: unlike a paid
   provider swap, which just rents a better index, adding the place to
   OSM directly makes every future search — Photon, Nominatim,
   LocationIQ, this picker, and anything else built on the same open
   map — find it, forever, for zero dollars. */

test('the contribution URL points at the exact pin, on the real editor', () => {
  const url = P.osmContributeUrl(-1.2527761, 36.9218624, 19);
  assert.match(url, /^https:\/\/www\.openstreetmap\.org\/edit\?editor=id#map=/,
    'must open the real iD editor, not a third-party clone');
  assert.match(url, /19\/-1\.252776\/36\.921862/,
    'zoom and coordinates must survive round-trip to 6 decimal places');
});

test('the contribution link is never offered before a pin is confirmed', () => {
  /* An unconfirmed guess going into a PUBLIC map is a different risk
     than a wrong guess in Cabana's own database — it would need a
     second host, somewhere else, to notice and fix it. The link may
     only appear once the host has looked at the roof and said yes. */
  assert.match(PINPOINT, /this\.osmEl\.hidden = true;/);
  assert.match(PINPOINT, /this\._paintOsmLink\(p\);/);
});

test('the contribution link always points at the CURRENT pin, not a stale one', () => {
  /* Rebuilt on every commit. A link left pointing at a since-corrected
     pin would send the wrong location into a public map, which is
     worse than not offering the link. */
  assert.match(PINPOINT, /Pin\.prototype\._paintOsmLink = function \(p\) \{/);
  assert.match(PINPOINT, /osmContributeUrl\(p\.lat, p\.lng,/);
});

test('the contribution link cannot hijack the picker tab', () => {
  assert.match(PINPOINT, /target="_blank" rel="noopener"/,
    'opening OSM must not hand it a reference back to window.opener');
});

test('lifting the credit line accounts for the taller, three-row readout', () => {
  /* Found in review: the OSM row made .cpin-out taller, and the
     attribution lift (tuned for the old two-element row) started
     overlapping it — confirmed by direct measurement in a real
     browser at both desktop and mobile widths before this was fixed. */
  const desktop = Number((PINPOINT_CSS.match(
    /\.cpin \.leaflet-bottom\.leaflet-right\{bottom:(\d+)px/) || [])[1]);
  const mobileBlock = PINPOINT_CSS.slice(PINPOINT_CSS.indexOf('max-width:560px'));
  const mobile = Number((mobileBlock.match(
    /\.cpin \.leaflet-bottom\.leaflet-right\{bottom:(\d+)px/) || [])[1]);

  assert.ok(desktop >= 100, `desktop lift is only ${desktop}px — too short to clear two rows`);
  assert.ok(mobile >= 160, `mobile lift is only ${mobile}px — too short to clear three stacked rows`);
  assert.ok(mobile > desktop, 'the stacked mobile layout is taller and needs more clearance');
});
