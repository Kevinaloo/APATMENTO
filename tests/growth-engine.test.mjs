/* ═══════════════════════════════════════════════════════════════════
   Growth engine · Beacon (live search pages) and Compass (profiles)
   ─────────────────────────────────────────────────────────────────
   The SQL half is tested by tests/run-growth-sql-tests.sh against a
   throwaway Postgres. This file tests everything above the database:
   what each page says, what it must never say, which URLs exist, how
   interest is scored and who ends up in which audience.
   ═══════════════════════════════════════════════════════════════════ */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { resolvePlace, hubFor, parseHub, slugify } from '../api/lib/_places.js';
import { normalise, parsePath, keyOf, createCatalogue, applyAllIn, placeSupply, search, quality } from '../api/lib/_catalogue.js';
import { renderEntity, renderHub, renderSitemap, seoTitle, metaDescription, faqFor, entitySchema, crumbsFor, img, hubIndexable } from '../api/lib/_seo-render.js';
import * as B from '../api/lib/_beacon.js';
import * as C from '../api/lib/_compass.js';

const rows = JSON.parse(readFileSync(new URL('./fixtures/growth-catalogue.json', import.meta.url), 'utf8'));
function items() {
  const list = rows.map(normalise).filter(Boolean);
  for (const i of list) i.price = i.base_price ? Math.round(i.base_price * 1.04) : null;
  return list;
}
const ldOf = html => JSON.parse(/<script type="application\/ld\+json">(.*?)<\/script>/s.exec(html)[1]);
const byType = (ld, t) => ld['@graph'].find(n => [].concat(n['@type']).includes(t));

function fakeRes() {
  const r = { statusCode: 200, headers: {}, body: null };
  r.setHeader = (k, v) => { r.headers[k.toLowerCase()] = v; };
  r.status = c => { r.statusCode = c; return r; };
  r.send = b => { r.body = b; return r; };
  r.json = b => { r.body = b; return r; };
  r.end = () => r;
  return r;
}

/* ── Places ────────────────────────────────────────────────────────── */

test('messy host locations resolve onto the place graph', () => {
  assert.equal(resolvePlace({ area: 'Kilimani division', city: 'Nairobi', country: 'Kenya' }).key, 'kilimani');
  assert.equal(resolvePlace({ area: 'Syokimau, 360 Apartments Phase 1', city: 'Nairobi' }).key, 'syokimau');
  assert.equal(resolvePlace({ area: '360 Apartments Phase 1, Syokimau', city: 'Nairobi' }).key, 'syokimau');
  assert.equal(resolvePlace({ area: 'Lekki Phase 1', city: 'Lagos' }).key, 'lekki');
  assert.equal(resolvePlace({ city: 'Nairobi', country: 'KE' }).country.id, 'kenya');
  const r = resolvePlace({ area: 'Nairobi National Park, Nairobi, Kenya', city: 'Nairobi National Park, Nairobi, Kenya' });
  assert.equal(r.area.id, 'nairobi-national-park');
  assert.equal(r.city.id, 'nairobi');
});

test('a building or a road never becomes a place page', () => {
  for (const area of ['360 Apartments Phase 1', 'Plot 12 Ngong Road', 'Riverside Towers', 'Block B, 3rd floor']) {
    const r = resolvePlace({ area, city: 'Nairobi' });
    assert.ok(!r.area || !r.area.synthetic, `${area} must not become a place (got ${r.area && r.area.id})`);
  }
});

test('a new neighbourhood gets its own clean place, under its city', () => {
  const r = resolvePlace({ area: 'Obama estate', city: 'Nairobi' });
  assert.equal(r.area.id, 'obama-estate');
  assert.equal(r.area.name, 'Obama Estate');
  assert.equal(r.area.synthetic, true);
  assert.equal(r.area.parent, 'nairobi');
});

test('hand-built hub pages win; live hubs fill the gaps', () => {
  const syok = resolvePlace({ area: 'Syokimau', city: 'Nairobi' }).area;
  assert.deepEqual(hubFor(syok, 'stays'), { path: '/syokimau-apartments', staticPage: true });
  assert.deepEqual(hubFor(syok, 'events'), { path: '/syokimau-events', staticPage: false });
  assert.deepEqual(parseHub('/obama-estate-apartments'), { placeId: 'obama-estate', service: 'stays', suffix: 'apartments' });
  assert.equal(parseHub('/best-apartments-lagos'), null);
});

/* ── Catalogue ─────────────────────────────────────────────────────── */

test('every live thing gets one readable URL, and the key decides', () => {
  const [stay] = items();
  assert.equal(stay.path, '/stay/fully-furnished-elegant-1-bedroom-in-kileleshwa-kilimani-2d488e1a');
  assert.deepEqual(parsePath(stay.path), { kind: 'stay', key: '2d488e1a', slug: 'fully-furnished-elegant-1-bedroom-in-kileleshwa-kilimani' });
  assert.deepEqual(parsePath('/stay/anything-at-all-2d488e1a'), { kind: 'stay', key: '2d488e1a', slug: 'anything-at-all' });
  assert.equal(parsePath('/tour/private-nairobi-tour-3').key, '3');
  assert.equal(parsePath('/stay/no-key-here'), null);
  assert.equal(parsePath('/stay/../../etc-2d488e1a'), null);
  assert.equal(keyOf('2D488E1A-3582-409F-AC3C-5F67ADC90C74'), '2d488e1a');
  assert.equal(keyOf(55), '55');
});

test('the app opens the exact thing from every page', () => {
  const list = items();
  assert.equal(list.find(i => i.kind === 'stay').app, '/apartments?open=2d488e1a-3582-409f-ac3c-5f67adc90c74');
  assert.equal(list.find(i => i.kind === 'tour').app, '/tours?open=3');
  assert.equal(list.find(i => i.kind === 'event').app, '/events/e/55');
  assert.match(list.find(i => i.kind === 'car').app, /^\/carhire\?open=/);
});

test('a page with nothing to say asks not to be indexed, and says why', () => {
  const bare = items().find(i => i.title === 'Garden cottage');
  assert.equal(bare.quality.indexable, false);
  assert.ok(bare.quality.issues.includes('no photos'));
  const good = items()[0];
  assert.equal(good.quality.indexable, true);
  assert.ok(quality({ ...good, photos: [], photo_count: 0 }).issues.includes('no photos'));
});

test('prices are the all-in prices guests pay, or absent — never the base rate', async () => {
  const list = rows.map(normalise).filter(Boolean);
  await applyAllIn(list, async (fn, { p_amounts }) => p_amounts.map(a => a + 100));
  assert.equal(list[0].price, 6100);
  const again = rows.map(normalise).filter(Boolean);
  const { failed } = await applyAllIn(again, async () => { throw new Error('down'); });
  assert.equal(failed, true);
  assert.equal(again[0].price, null, 'a failed pricing call leaves the price off rather than showing the base rate');
});

test('the catalogue refetches only when the database says something changed', async () => {
  let version = 1, fetches = 0, t = 0;
  const cat = createCatalogue({
    now: () => t, checkEveryMs: 1000,
    rpc: async fn => {
      if (fn === 'beacon_version') return { v: version };
      if (fn === 'beacon_catalogue') { fetches++; return rows; }
      if (fn === 'cabana_all_in_prices') return null;
      return null;
    },
  });
  await cat.get(); assert.equal(fetches, 1);
  t = 500; await cat.get(); assert.equal(fetches, 1, 'inside the probe window nothing is asked');
  t = 2000; await cat.get(); assert.equal(fetches, 1, 'same version, no refetch');
  version = 2; t = 4000; const s = await cat.get(); assert.equal(fetches, 2, 'a new version refetches');
  assert.ok(s.byKey.get('stay:2d488e1a'));
});

test('a database blip keeps serving the last good catalogue', async () => {
  let fail = false, t = 0;
  const cat = createCatalogue({ now: () => t, checkEveryMs: 10, rpc: async fn => {
    if (fail) throw new Error('down');
    if (fn === 'beacon_version') return { v: t };
    if (fn === 'beacon_catalogue') return rows;
    return null;
  } });
  const first = await cat.get();
  fail = true; t = 100;
  const second = await cat.get();
  assert.equal(second.items.length, first.items.length);
});

test('search finds by place, type and amenity, and respects filters', () => {
  const list = items();
  assert.equal(search(list, { q: 'syokimau' }).length, 2);
  assert.equal(search(list, { place: 'Kilimani' })[0].key, '2d488e1a');
  assert.equal(search(list, { q: 'pool apartment' })[0].key, '2d488e1a');
  assert.ok(search(list, { service: 'stays', maxPrice: 2000 }).every(i => i.price <= 2000));
  assert.ok(search(list, { minBeds: 2 }).every(i => i.bedrooms == null || i.bedrooms >= 2));
});

test('place supply counts each thing for its area, its city and its country', () => {
  const rowsOut = placeSupply(items());
  const nairobi = rowsOut.find(r => r.place === 'nairobi' && r.service === 'stays');
  const syok = rowsOut.find(r => r.place === 'syokimau' && r.service === 'stays');
  assert.equal(syok.count, 2);
  assert.ok(nairobi.count >= 4);
  assert.ok(nairobi.low_usd > 0 && nairobi.high_usd >= nairobi.low_usd);
});

/* ── Pages ─────────────────────────────────────────────────────────── */

test('an entity page answers the query in HTML and carries honest schema', () => {
  const list = items();
  const stay = list[0];
  const html = renderEntity(stay, { description: 'A calm flat near Yaya Centre with a pool and a gym, walking distance to Kilimani.', checkin_time: '12:00', cancel_policy: 'flexible', pets: false });
  assert.match(html, /<link rel="canonical" href="https:\/\/cabana\.africa\/stay\/fully-furnished-elegant-1-bedroom-in-kileleshwa-kilimani-2d488e1a">/);
  assert.match(html, /<meta name="robots" content="index, follow/);
  assert.match(html, /<h1>Fully furnished Elegant 1 Bedroom in Kileleshwa<\/h1>/);
  assert.match(html, /KES 6,240/);
  const ld = ldOf(html);
  const lodging = byType(ld, 'LodgingBusiness');
  assert.equal(lodging.makesOffer.price, 6240);
  assert.equal(lodging.makesOffer.priceCurrency, 'KES');
  assert.equal(lodging.address.addressLocality, 'Nairobi');
  assert.equal(lodging.address.addressRegion, 'Kilimani');
  assert.equal(lodging.aggregateRating, undefined, 'no reviews, no stars');
  assert.ok(byType(ld, 'BreadcrumbList').itemListElement.length >= 5);
  assert.ok(byType(ld, 'FAQPage').mainEntity.length >= 4);
  assert.ok(!/streetAddress|postalCode|telephone|@[a-z]+\.[a-z]/i.test(JSON.stringify(ld)), 'no street, phone or email in schema');
});

test('stars appear only with real reviews printed on the page', () => {
  const stay = { ...items()[0], rating: 4.6, reviews: 2 };
  const html = renderEntity(stay, { review_list: [{ rating: 5, text: 'Spotless and quiet.', name: 'Achieng', at: '2026-09-01' }, { rating: 4, name: 'Tom' }] });
  const lodging = byType(ldOf(html), 'LodgingBusiness');
  assert.equal(lodging.aggregateRating.reviewCount, 2);
  assert.equal(lodging.review.length, 2);
  assert.match(html, /Spotless and quiet\./);
  const none = byType(ldOf(renderEntity({ ...stay }, { review_list: [] })), 'LodgingBusiness');
  assert.equal(none.aggregateRating, undefined, 'a rating with no visible reviews is not marked up');
});

test('the FAQ only asks what the data can answer', () => {
  const stay = items()[0];
  const q = faqFor(stay, {}).map(x => x[0]).join(' | ');
  assert.match(q, /cost/);
  assert.match(q, /Wi-Fi and parking/);
  assert.doesNotMatch(q, /cancellation/, 'no policy set, no policy question');
  assert.match(faqFor(stay, { cancel_policy: 'strict' }).map(x => x[1]).join(' '), /strict cancellation policy/);
});

test('titles and descriptions fit a results page, and lead with the thing', () => {
  for (const it of items()) {
    const t = seoTitle(it), d = metaDescription(it);
    assert.ok(t.length <= 64, `${t} (${t.length})`);
    assert.ok(t.endsWith(' | Cabana'));
    assert.ok(!t.includes('…'));
    assert.ok(d.length <= 158, `${d.length}`);
  }
});

test('events carry Event schema with a date, a place and ticket offers', () => {
  const ev = items().find(i => i.kind === 'event');
  const html = renderEntity(ev, { starts_at: ev.extra.starts_at, ends_at: ev.extra.ends_at });
  const e = byType(ldOf(html), 'Event');
  assert.equal(e.startDate, '2026-11-21T17:00:00.000Z');
  assert.equal(e.location['@type'], 'Place');
  assert.equal(e.offers.availability, 'https://schema.org/InStock');
  assert.equal(e.eventAttendanceMode, 'https://schema.org/OfflineEventAttendanceMode');
});

test('tours and cars get their own schema types', () => {
  const list = items();
  assert.ok(byType(ldOf(renderEntity(list.find(i => i.kind === 'tour'), {})), 'TouristTrip'));
  const car = byType(ldOf(renderEntity(list.find(i => i.kind === 'car'), { car: { make: 'Toyota', seats: 7 } })), 'Car');
  assert.equal(car.brand.name, 'Toyota');
  assert.equal(car.vehicleSeatingCapacity, 7);
});

test('a thin page renders for people but is noindex', () => {
  const bare = items().find(i => i.title === 'Garden cottage');
  assert.match(renderEntity(bare, {}), /<meta name="robots" content="noindex, follow">/);
});

test('host text cannot break out of the page', () => {
  const evil = { ...items()[0], title: '</script><script>alert(1)</script>' };
  const html = renderEntity(evil, { description: '<img src=x onerror=alert(1)>' });
  assert.ok(!html.includes('<script>alert(1)</script>'));
  assert.ok(!html.includes('<img src=x onerror'));
  assert.doesNotThrow(() => ldOf(html));
});

test('breadcrumbs link only to pages that exist', () => {
  const crumbs = crumbsFor(items()[0]);
  assert.deepEqual(crumbs.map(c => c.name), ['Cabana', 'Stays', 'Kenya', 'Nairobi', 'Kilimani', 'Fully furnished Elegant 1 Bedroom in Kileleshwa']);
  assert.equal(crumbs.find(c => c.name === 'Kilimani').href, '/kilimani-apartments');
});

test('images are served resized from storage', () => {
  assert.match(img('https://x.supabase.co/storage/v1/object/public/listings/a.jpg', 480), /\/storage\/v1\/render\/image\/public\/listings\/a\.jpg\?width=480&quality=72$/);
  assert.equal(img('https://elsewhere.com/a.jpg', 480), 'https://elsewhere.com/a.jpg');
});

test('a hub needs two indexable things before it asks to be indexed', () => {
  const list = items();
  const model = B.hubModel('/obama-estate-apartments', list);
  assert.equal(model.items.length, 2);
  assert.equal(hubIndexable(model.items), false, 'one real listing and one empty one is not a hub yet');
  assert.match(renderHub(model), /noindex, follow/);
  const syok = B.hubModel('/syokimau-apartments', list);
  assert.equal(hubIndexable(syok.items), true);
  const html = renderHub(syok);
  assert.match(html, /<h1>Apartments &amp; stays in Syokimau, Nairobi<\/h1>/);
  assert.equal(byType(ldOf(html), 'ItemList').numberOfItems, 2);
});

test('the live sitemap lists indexable pages and live hubs, never static or thin ones', () => {
  const entries = B.sitemapEntries(items());
  const locs = entries.map(e => e.loc);
  assert.ok(locs.includes('https://cabana.africa/stay/fully-furnished-elegant-1-bedroom-in-kileleshwa-kilimani-2d488e1a'));
  assert.ok(!locs.some(l => l.includes('garden-cottage')), 'thin pages stay out');
  assert.ok(!locs.includes('https://cabana.africa/syokimau-apartments'), 'static hubs are in the static sitemap');
  assert.ok(!locs.includes('https://cabana.africa/obama-estate-apartments'), 'a one-listing hub stays out');
  const xml = renderSitemap(entries);
  assert.match(xml, /<image:image><image:loc>https:\/\/gfwgbgdvxtocwhilrtdw/);
  assert.match(xml, /<lastmod>2026-10-01<\/lastmod>/);
});

test('llms-live states what is bookable in plain markdown', () => {
  const text = B.llmsText(items(), new Date('2026-10-09T00:00:00Z'));
  assert.match(text, /^# Cabana — live catalogue/);
  assert.match(text, /\[The Jets Nest\]\(https:\/\/cabana\.africa\/stay\/the-jets-nest-obama-estate-65ef1d11\)/);
  assert.doesNotMatch(text, /Garden cottage/);
});

/* ── Handlers ──────────────────────────────────────────────────────── */

function fakeDb(detail) {
  return async (fn, args) => {
    if (fn === 'beacon_version') return { v: 1 };
    if (fn === 'beacon_catalogue') return rows;
    if (fn === 'cabana_all_in_prices') return args.p_amounts.map(a => a);
    if (fn === 'beacon_entity') return detail(args);
    return null;
  };
}

test('a live page renders, a stale slug 301s, a gone page 410s, a stranger 404s', async () => {
  B.__test.setRpc(fakeDb(({ p_key }) => p_key === '2d488e1a' ? { state: 'live', description: 'A flat.' }
    : p_key === '99999999' ? { state: 'gone', title: 'Old flat', city: 'Nairobi', area: 'Kilimani', kind: 'stay', id: '99999999-0000-4000-8000-000000000000' }
    : { state: 'absent' }));

  let res = fakeRes();
  await B.entityPage({ query: { family: 'stay', slug: 'fully-furnished-elegant-1-bedroom-in-kileleshwa-kilimani-2d488e1a' } }, res);
  assert.equal(res.statusCode, 200);
  assert.match(res.headers['cache-control'], /s-maxage=300/);
  assert.match(res.body, /Fully furnished Elegant/);

  res = fakeRes();
  await B.entityPage({ query: { family: 'stay', slug: 'old-name-2d488e1a' } }, res);
  assert.equal(res.statusCode, 301);
  assert.equal(res.headers.location, '/stay/fully-furnished-elegant-1-bedroom-in-kileleshwa-kilimani-2d488e1a');

  res = fakeRes();
  await B.entityPage({ query: { family: 'stay', slug: 'old-flat-99999999' } }, res);
  assert.equal(res.statusCode, 410);
  assert.match(res.body, /has left Cabana/);
  assert.equal(res.headers['x-robots-tag'], 'noindex');

  res = fakeRes();
  await B.entityPage({ query: { family: 'stay', slug: 'nothing-deadbeef' } }, res);
  assert.equal(res.statusCode, 404);

  res = fakeRes();
  await B.hubPage({ query: { hub: 'nowhere-at-all-apartments' } }, res);
  assert.equal(res.statusCode, 404);

  res = fakeRes();
  await B.hubPage({ query: { hub: 'obama-estate-apartments' } }, res);
  assert.equal(res.statusCode, 200);
});

test('a listing published seconds ago renders before the catalogue catches up', async () => {
  B.__test.setRpc(fakeDb(() => ({ state: 'live', kind: 'stay', id: 'cafe1234-0000-4000-8000-000000000000', title: 'Brand new loft',
    city: 'Nairobi', area: 'Westlands', price: 4000, currency: 'KES', photos: ['https://x/a.jpg', 'https://x/b.jpg', 'https://x/c.jpg'],
    amenities: ['WiFi', 'Parking', 'Gym'], description: 'x'.repeat(200), lat: -1.26, lng: 36.8 })));
  const res = fakeRes();
  await B.entityPage({ query: { family: 'stay', slug: 'brand-new-loft-westlands-cafe1234' } }, res);
  assert.equal(res.statusCode, 200);
  assert.match(res.body, /Brand new loft/);
});

test('the pulse refuses strangers', async () => {
  const res = fakeRes();
  await B.pulse({ headers: {}, query: {} }, res);
  assert.equal(res.statusCode, 401);
});

test('a renamed listing announces both its old and its new address', () => {
  const list = items();
  const urls = B.urlsForChange({ kind: 'stay', entity_id: '2d488e1a-3582-409f-ac3c-5f67adc90c74', change: 'updated',
    snapshot: { title: 'Fully furnished Elegant 1Bedroom in Kileleshwa' }, previous: { title: 'Old name', area: 'Kilimani', city: 'Nairobi' } }, list);
  assert.ok(urls.includes('https://cabana.africa/stay/fully-furnished-elegant-1-bedroom-in-kileleshwa-kilimani-2d488e1a'));
  assert.ok(urls.includes('https://cabana.africa/stay/old-name-kilimani-2d488e1a'));
  const gone = B.urlsForChange({ kind: 'stay', entity_id: '11112222-0000-4000-8000-000000000000', change: 'deleted', snapshot: { title: 'Lost loft', city: 'Nairobi', area: 'Obama estate' } }, list);
  assert.ok(gone.includes('https://cabana.africa/stay/lost-loft-obama-estate-11112222'));
  assert.ok(gone.includes('https://cabana.africa/obama-estate-apartments'), 'its live hub changed too');
});

test('IndexNow gets the cabana.africa URLs, with the key file location', async () => {
  let sent;
  const out = await B.submitIndexNow(['https://cabana.africa/stay/a-12345678', 'https://evil.example/x', 'https://cabana.africa/stay/a-12345678'],
    { fetchImpl: async (url, init) => { sent = { url, body: JSON.parse(init.body) }; return { ok: true, status: 202, text: async () => '' }; } });
  assert.equal(out.ok, true);
  assert.equal(sent.url, 'https://api.indexnow.org/indexnow');
  assert.deepEqual(sent.body.urlList, ['https://cabana.africa/stay/a-12345678']);
  assert.equal(sent.body.keyLocation, `https://cabana.africa/${sent.body.key}.txt`);
});

test('a place gaining or losing all supply asks for a static rebuild', () => {
  const flips = B.staticFlips([{ place: 'diani', service: 'stays', count: 0 }, { place: 'syokimau', service: 'stays', count: 2 }],
    [{ place: 'diani', service: 'stays', count: 1 }, { place: 'syokimau', service: 'stays', count: 3 }, { place: 'obama-estate', service: 'stays', count: 2 }]);
  assert.deepEqual(flips, [{ place: 'diani', service: 'stays', from: 0, to: 1 }]);
  const lost = B.staticFlips([{ place: 'syokimau', service: 'stays', count: 2 }], []);
  assert.deepEqual(lost, [{ place: 'syokimau', service: 'stays', from: 2, to: 0 }]);
});

test('the host badge is a valid, escaped SVG', () => {
  const svg = B.badgeSvg({ ...items()[0], title: 'Fish & <Chips>' });
  assert.match(svg, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
  assert.match(svg, /Fish &amp; &lt;Chips&gt;/);
  assert.match(B.badgeSnippet(items()[0]), /href="https:\/\/cabana\.africa\/stay\/.+\?utm_source=host_badge"/);
});

/* ── Compass ───────────────────────────────────────────────────────── */

const DAY = 86400000;
const NOW = Date.parse('2026-10-09T12:00:00Z');

test('interest halves after thirty quiet days', () => {
  const p = C.fold({}, [{ type: 'entity_view', service: 'stays', place: { area: 'kilimani' }, at: NOW }], {}, NOW);
  const now = C.affinityNow(p.affinity, NOW)['place:kilimani'];
  const later = C.affinityNow(p.affinity, NOW + 30 * DAY)['place:kilimani'];
  assert.ok(Math.abs(later - now / 2) < 1e-6);
});

test('commitment outweighs browsing', () => {
  const look = C.fold({}, [{ type: 'entity_view', service: 'stays', at: NOW }], {}, NOW);
  const save = C.fold({}, [{ type: 'save', service: 'stays', at: NOW }], {}, NOW);
  assert.ok(C.affinityNow(save.affinity, NOW)['svc:stays'] > C.affinityNow(look.affinity, NOW)['svc:stays'] * 2);
  assert.ok(save.intent > look.intent);
});

test('intent rises with checkout and fades with time', () => {
  const p = C.fold({}, [{ type: 'checkout_start', service: 'stays', at: NOW }], {}, NOW);
  assert.ok(p.intent >= 80);
  assert.ok(C.intentOf(p.stats, NOW + 14 * DAY) < 20);
  assert.equal(p.lifecycle, 'ready');
});

test('traits describe the traveller from what they search for', () => {
  const ev = [
    { type: 'search', service: 'stays', place: { area: 'diani', city: 'diani', country: 'kenya' }, guests: 2, lead_days: 2, nights: 3, at: NOW },
    { type: 'entity_view', service: 'stays', place: { area: 'diani', city: 'diani', country: 'kenya' }, price_usd: 120, at: NOW },
    { type: 'entity_view', service: 'stays', place: { area: 'diani', city: 'diani', country: 'kenya' }, price_usd: 140, at: NOW },
  ];
  const p = C.fold({}, ev, { country: 'GB', device: 'mobile', timezone: 'Europe/London' }, NOW);
  assert.equal(p.traits.top_place, 'diani');
  assert.equal(p.traits.origin, 'international');
  assert.equal(p.traits.party, 2);
  assert.equal(p.traits.planner, 'last-minute');
  assert.equal(p.traits.budget_band, '100-200');
  assert.ok(p.segments.includes('international-visitors'));
  assert.ok(p.segments.includes('coast-holidaymakers'));
  assert.ok(p.segments.includes('premium-travellers'));
  assert.ok(p.segments.includes('mobile-first'));
  const local = C.fold({}, ev, { country: 'KE' }, NOW);
  assert.equal(local.traits.origin, 'local');
});

test('someone looking at listing pages is a host prospect, not an advertising audience', () => {
  const p = C.fold({}, [{ type: 'page_view', service: 'hosting', at: NOW }, { type: 'list_start', service: 'hosting', at: NOW }], {}, NOW);
  assert.ok(p.segments.includes('host-prospects'));
  assert.equal(C.SEGMENTS.find(s => s.id === 'host-prospects').internal, true);
});

test('two devices that sign in become one person', () => {
  const phone = C.fold({}, [{ type: 'save', service: 'stays', key: 'aaaa1111', kind: 'stay', title: 'A', at: NOW - DAY }], { session: 's1' }, NOW);
  const laptop = C.fold({}, [{ type: 'entity_view', service: 'tours', key: 'bbbb2222', kind: 'tour', title: 'B', at: NOW }], { session: 's2' }, NOW);
  const merged = C.mergeProfiles({ ...laptop, aliases: ['Vlaptop'] }, { ...phone, visitor_id: 'Vphone' }, NOW);
  const aff = C.affinityNow(merged.affinity, NOW);
  assert.ok(aff['svc:stays'] > 0 && aff['svc:tours'] > 0);
  assert.deepEqual(merged.recent.map(r => r.id), ['tour:bbbb2222', 'stay:aaaa1111']);
  assert.deepEqual(merged.aliases.sort(), ['Vlaptop', 'Vphone']);
  assert.equal(merged.sessions, 2);
});

test('For-you leads with their place and their price', () => {
  const list = items();
  const p = C.fold({}, [
    { type: 'search', service: 'stays', place: { area: 'syokimau', city: 'nairobi', country: 'kenya' }, at: NOW },
    { type: 'entity_view', service: 'stays', place: { area: 'syokimau', city: 'nairobi', country: 'kenya' }, price_usd: 20, at: NOW },
  ], {}, NOW);
  const out = C.rankForYou(p, list, { service: 'stays', limit: 3, now: NOW });
  const picks = out.sections.find(s => s.id === 'picks');
  assert.match(picks.title, /Syokimau/);
  assert.match(picks.items[0].path, /syokimau/);
  assert.match(picks.items[1].path, /syokimau/, 'someone who searched Syokimau sees Syokimau first');
});

test('when interest is broad, equally good picks are spread across places', () => {
  const mk = (id, area) => ({ item: { kind: 'stay', key: id, service: 'stays', place: { area: { id: area } } }, s: 5 });
  const out = C.diversify([mk('a', 'kilimani'), mk('b', 'kilimani'), mk('c', 'westlands')], 2);
  assert.deepEqual(out.map(i => i.key), ['a', 'c']);
});

test('things they already looked at come back as "pick up where you left off"', () => {
  const list = items();
  const p = C.fold({}, [{ type: 'entity_view', kind: 'stay', key: '65ef1d11', service: 'stays', title: 'The Jets Nest', at: NOW }], {}, NOW);
  const out = C.rankForYou(p, list, { now: NOW });
  assert.equal(out.sections[0].id, 'continue');
  assert.match(out.sections[0].items[0].path, /the-jets-nest/);
  assert.ok(!out.sections.find(s => s.id === 'picks').items.some(i => /the-jets-nest/.test(i.path)));
});

test('with no history, For-you is popular-now, not personalised', () => {
  const out = C.rankForYou(null, items(), { now: NOW });
  assert.equal(out.personalised, false);
  assert.match(out.sections.find(s => s.id === 'picks').title, /Popular/);
});

test('an event that only names a listing is made whole from the catalogue', () => {
  const list = items();
  const e = C.enrich({ t: 'entity_view', d: { family: 'stay', key: '2d488e1a' } }, list, '/stay/x');
  assert.equal(e.service, 'stays');
  assert.equal(e.place.area, 'kilimani');
  assert.ok(e.price_usd > 40);
  assert.equal(C.enrich({ t: 'not_a_thing' }, list), null);
  const s = C.enrich({ t: 'search', d: { q: 'Diani', guests: 2, checkin: new Date(NOW + 5 * DAY).toISOString().slice(0, 10), checkout: new Date(NOW + 8 * DAY).toISOString().slice(0, 10) } }, list, '/apartments');
  assert.equal(s.place.city, 'diani');
  assert.equal(s.nights, 3);
  assert.equal(s.guests, 2);
});

test('crawlers are never profiled, and the edge supplies location without an IP', () => {
  assert.equal(C.parseUA('Mozilla/5.0 (compatible; Googlebot/2.1)').bot, true);
  assert.equal(C.parseUA('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) Safari/604.1').device, 'mobile');
  assert.deepEqual(C.geoFromHeaders({ 'x-vercel-ip-country': 'ke', 'x-vercel-ip-city': 'Nair%C3%B3bi', 'x-vercel-ip-timezone': 'Africa/Nairobi' }),
    { country: 'KE', region: null, city: 'Nairóbi', timezone: 'Africa/Nairobi' });
});

test('APA is told what browsing shows, framed so she never recites it', () => {
  const p = C.fold({}, [{ type: 'entity_view', kind: 'stay', key: '2d488e1a', service: 'stays', title: 'Elegant 1BR', path: '/stay/x-2d488e1a', place: { area: 'kilimani', city: 'nairobi' }, price_usd: 46, at: NOW }], { country: 'KE' }, NOW);
  const text = C.profileSummary({ ...p, lifecycle: 'exploring' }, items(), NOW);
  assert.match(text, /never recite it/);
  assert.match(text, /Kilimani/);
  assert.match(text, /Elegant 1BR/);
  assert.equal(C.profileSummary({ ...p, opted_out: true }, items(), NOW), '');
});

test('page paths imply the service someone is looking at', () => {
  assert.equal(C.serviceForPath('/apartments'), 'stays');
  assert.equal(C.serviceForPath('/diani-safaris'), 'tours');
  assert.equal(C.serviceForPath('/become-partner'), 'hosting');
  assert.equal(C.serviceForPath('/terms'), null);
});

test('the growth function is reachable at every public route', () => {
  const vercel = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'));
  const dests = vercel.rewrites.filter(r => r.destination.startsWith('/api/growth')).map(r => r.source);
  for (const s of ['/sitemap-live.xml', '/llms-live.txt']) assert.ok(dests.includes(s), s);
  assert.ok(dests.some(s => s.startsWith('/:family(stay|room|eat|shop|tour|event|car)')));
  assert.ok(dests.some(s => s.startsWith('/:hub(')));
  assert.ok(vercel.functions['api/growth.js'].includeFiles.includes('cabana-world-atlas.json'));
  const events = vercel.rewrites.findIndex(r => r.source === '/events/:path+');
  const page = vercel.rewrites.findIndex(r => r.source.startsWith('/:family('));
  assert.ok(page < events, 'entity pages are matched before the Cabana Live catch-all');
});

test('slugify folds accents the same way as the atlas', () => {
  assert.equal(slugify("Côte d'Ivoire"), 'cote-divoire');
  assert.equal(slugify('Fish & Chips'), 'fish-and-chips');
});
