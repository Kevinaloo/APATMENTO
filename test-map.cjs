/* Guards for the shared map layer (apa-map.js).

   The load-bearing claim in this module is the privacy one: the
   approximate map must blur an address without leaking it. That is
   a property you can actually test, so it is tested here rather than
   trusted. */

const fs = require('fs'), { JSDOM, VirtualConsole } = require('jsdom');

const errs = [];
const vc = new VirtualConsole();
vc.on('jsdomError', e => errs.push(e.message));

const dom = new JSDOM('<!doctype html><body></body>', {
  runScripts: 'outside-only', url: 'https://cabana.africa/', virtualConsole: vc
});
const w = dom.window;
w.eval(fs.readFileSync('apa-map.js', 'utf8'));
const M = w.ApaMap;

let pass = true;
const ok = (n, c, x) => {
  console.log('  ' + (c ? '✓' : '✗') + ' ' + n + (c ? '' : '  → ' + (x == null ? '' : x)));
  pass &= !!c;
  return !!c;
};

console.log('\n[1] Module surface');
ok('ApaMap is exported', !!M);
['approx', 'exact', 'picker', 'results', 'autocomplete', 'geocode', 'reverse', 'blur', 'distance']
  .forEach(k => ok('  .' + k + '()', typeof M[k] === 'function', typeof M[k]));

console.log('\n[2] The blur is deterministic');
const TRUE_LAT = -1.2921, TRUE_LNG = 36.8219;   // Nairobi
const a = M.blur(TRUE_LAT, TRUE_LNG, 'listing-abc', 500);
const b = M.blur(TRUE_LAT, TRUE_LNG, 'listing-abc', 500);
ok('same listing → identical offset across calls', a[0] === b[0] && a[1] === b[1], a + ' vs ' + b);

/* The old payment-page code used Math.random(), so twenty loads gave
   twenty centres whose mean is the real address. Averaging the new
   one must not converge on anything, because it never moves. */
const samples = Array.from({ length: 200 }, () => M.blur(TRUE_LAT, TRUE_LNG, 'listing-abc', 500));
const spread = Math.max.apply(null, samples.map(s => Math.abs(s[0] - a[0]) + Math.abs(s[1] - a[1])));
ok('200 redraws cannot be averaged to recover the address', spread === 0, 'spread=' + spread);

const c = M.blur(TRUE_LAT, TRUE_LNG, 'listing-xyz', 500);
ok('different listings → different offsets', a[0] !== c[0] || a[1] !== c[1]);

console.log('\n[3] The circle drawn is honest');
/* The guest is shown a circle of `radius` centred on the blurred
   point and told the stay is inside it. That has to be true. */
let inside = 0, offCentre = 0, worst = 0;
for (let i = 0; i < 400; i++) {
  const p = M.blur(TRUE_LAT, TRUE_LNG, 'seed-' + i, 500);
  const d = M.distance(p[0], p[1], TRUE_LAT, TRUE_LNG);
  worst = Math.max(worst, d);
  if (d < 500) inside++;
  if (d > 150) offCentre++;   // never a bullseye on the front door
}
ok('the true address always falls inside the circle shown', inside === 400, inside + '/400, worst=' + Math.round(worst) + 'm');
ok('the pin is never centred on the address', offCentre === 400, offCentre + '/400');

console.log('\n[4] Geocoding is global');
const src = fs.readFileSync('apa-map.js', 'utf8');
ok('no hardcoded country allowlist', !/countrycodes=ke,tz,ug,rw,et/.test(src));
ok('no hardcoded city appended to queries', !/Nairobi Kenya/.test(src));
ok('requests are throttled for Nominatim', /setTimeout\(r, 1100\)/.test(src));
ok('tile attribution is present', /OpenStreetMap/.test(src) && /carto\.com\/attributions/.test(src));

console.log('\n[5] Wiring');
const apts = fs.readFileSync('apartments.html', 'utf8');
const book = fs.readFileSync('booking-confirm.html', 'utf8');
const add = fs.readFileSync('add-listing.html', 'utf8');

ok('listing detail carries a map', /id="dl-map"/.test(apts) && /ApaMap\.approx\('dl-map'/.test(apts));
ok('coordinates survive the Supabase mapper', /lat: l\.latitude/.test(apts));
ok('results map container exists', /id="split-map"/.test(apts));
ok('coordinates are handed to the payment page', /params\.set\('lat'/.test(apts));

ok('payment page no longer rolls random jitter', !/Math\.random\(\)-\.5/.test(book));
/* The prose above the fix names the old bug, so match the construct
   rather than the words: a geocode query with a city glued onto it. */
ok('payment page no longer hardcodes a city into the query',
  !/encodeURIComponent\([^)]*\+\s*['"] ?Nairobi/.test(book));
ok('payment page uses the shared layer', /ApaMap\.approx/.test(book));

ok('host picker replaced the read-only iframe', !/id="map-frame"/.test(add) && /id="pin-map"/.test(add));
ok('host can use their own location', /ApaMap[\s\S]*?locate|_pin\.locate\(\)/.test(add));
ok('step 2 restores saved location on edit', /function restLoc/.test(add));

[['apartments.html', apts], ['booking-confirm.html', book], ['add-listing.html', add]]
  .forEach(([n, s]) => ok(n + ' loads apa-map.js', /src="\/apa-map\.js"/.test(s)));

console.log('\n[6] No stale references left behind');
['pinL(', 'addrIn(', 'geoS(', 'map-frame'].forEach(sym =>
  ok('add-listing.html: "' + sym + '" is gone', add.indexOf(sym) === -1));

ok('no jsdom errors', errs.length === 0, errs.join('|'));

console.log('\n' + (pass ? '✅ MAP PASS' : '❌ MAP FAIL'));
process.exit(pass ? 0 : 1);
