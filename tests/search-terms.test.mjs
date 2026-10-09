/* ═══════════════════════════════════════════════════════════════════
   Search vocabulary · the words people actually type
   ─────────────────────────────────────────────────────────────────
   People search for an airbnb in Kilimani, a bnb near JKIA, car hire or
   car rental, safari packages, a bedsitter in Rongai, a shortlet in
   Lekki. These tests pin that the pages say those words, that search
   understands them, and that the words only ever make claims the data
   supports: no listing is labelled an Airbnb, no car is offered with a
   driver its operator does not price, and one switch removes the brand
   word everywhere.
   ═══════════════════════════════════════════════════════════════════ */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as T from '../api/lib/_search-terms.js';
import { normalise, search } from '../api/lib/_catalogue.js';
import { seoTitle, metaDescription, faqFor, summarise, renderEntity, renderHub } from '../api/lib/_seo-render.js';
import * as B from '../api/lib/_beacon.js';
import * as S from '../api/lib/_support.js';

function items() {
  const rows = JSON.parse(readFileSync(new URL('./fixtures/growth-catalogue.json', import.meta.url), 'utf8'));
  const list = rows.map(normalise).filter(Boolean);
  list.forEach(i => { i.price = i.base_price; });
  return list;
}
const one = (list, re) => list.find(i => re.test(i.title));
function withBrandTerms(value, fn) {
  const before = process.env.CABANA_SEO_BRAND_TERMS;
  if (value == null) delete process.env.CABANA_SEO_BRAND_TERMS; else process.env.CABANA_SEO_BRAND_TERMS = value;
  try { return fn(); } finally { if (before == null) delete process.env.CABANA_SEO_BRAND_TERMS; else process.env.CABANA_SEO_BRAND_TERMS = before; }
}

test('a search is read the way it was meant', () => {
  const cases = {
    'airbnb in kilimani': { service: 'stays', words: ['kilimani'] },
    '2 bedroom airbnb in kilimani under 5k for 4': { service: 'stays', words: ['kilimani'], beds: 2, guests: 4, maxPrice: 5000 },
    'show me bnbs near jkia': { service: 'stays', words: ['jkia'] },
    'shortlet lekki': { service: 'stays', words: ['lekki'] },
    'where to stay in Diani for 3 people': { service: 'stays', words: ['diani'], guests: 3 },
    'car hire nairobi': { service: 'carhire', words: ['nairobi'] },
    'rent a car in mombasa with driver': { service: 'carhire', words: ['mombasa'], driver: true },
    'safari packages kenya': { service: 'tours', words: ['kenya'] },
    'things to do in nairobi': { service: 'tours', words: ['nairobi'] },
    'sauti sol tickets': { service: 'events', words: ['sauti', 'sol'] },
    'bedsitter in rongai': { service: 'roommates', words: ['rongai'], beds: 0 },
    'food delivery westlands': { service: 'food', words: ['westlands'] },
    'taxi to jkia': { service: 'rides', words: ['jkia'] },
    'air tickets to mombasa': { service: 'flights', words: ['mombasa'] },
  };
  for (const [q, want] of Object.entries(cases)) {
    const got = T.parseQuery(q);
    for (const [k, v] of Object.entries(want)) assert.deepEqual(got[k], v, `${q} → ${k}`);
  }
  assert.equal(T.parseQuery('for 2 nights in diani').guests, null, 'nights are not people');
  assert.equal(T.parseQuery('cheap bnb syokimau').price, 'low');
  assert.equal(T.parseQuery('luxury villa watamu').price, 'high');
  assert.deepEqual(T.parseQuery('cottage in obama estate').prefer, ['cottage'], 'a kind word is a preference, not a requirement');
  assert.equal(T.parseQuery('airbnb with car hire').service, 'stays', 'the first thing asked for leads');
});

test('search answers everyday wording from the live catalogue', () => {
  const list = items();
  const titles = q => search(list, { q }).map(i => i.title);
  assert.deepEqual(titles('airbnb in syokimau'), ['Shikaz Homes 2 Br @ JKIA Syokimau', 'Shikaz Homes 1 Bedroom @ JKIA Syokimau']);
  assert.deepEqual(titles('2 bedroom bnb jkia'), ['Shikaz Homes 2 Br @ JKIA Syokimau']);
  assert.equal(titles('cottage obama')[0], 'Garden cottage', 'the kind they asked for comes first');
  assert.deepEqual(titles('car rental nairobi'), ['Toyota Land Cruiser Prado TX']);
  assert.deepEqual(titles('things to do nairobi'), ['Private Nairobi Tour Experince']);
  assert.deepEqual(titles('sauti sol tickets'), ['Sauti Sol live at KICC']);
  assert.deepEqual(titles('taxi to jkia'), [], 'a stay near the airport is not a ride to it');
  assert.deepEqual(titles('car rental nairobi with driver'), [], 'no operator here prices a driver');
  const withDriver = list.map(i => i.kind === 'car' ? { ...i, extra: { ...i.extra, chauffeur: true } } : i);
  assert.deepEqual(search(withDriver, { q: 'car rental nairobi with driver' }).map(i => i.title), ['Toyota Land Cruiser Prado TX']);
  assert.equal(search(list, { q: 'cheap airbnb nairobi' })[0].title, 'The Jets Nest', 'cheap leans to the lowest price');
});

test('listing titles borrow the searcher\'s word when there is room, and never say Airbnb', () => {
  const list = items();
  assert.equal(seoTitle(one(list, /Jets Nest/)), 'The Jets Nest, Obama Estate · BnB | Cabana');
  assert.equal(seoTitle(one(list, /Prado/)), 'Toyota Land Cruiser Prado TX, Nairobi · Car hire | Cabana');
  assert.match(seoTitle(one(list, /Sauti Sol/)), /^Sauti Sol live at KICC, Nairobi · \d{1,2} \w{3} · Tickets \| Cabana$/);
  assert.equal(seoTitle(one(list, /Private Nairobi Tour/)), 'Private Nairobi Tour Experince, Nairobi National Park | Cabana', 'a title that already says "tour" needs no help');
  for (const it of list) {
    assert.ok(seoTitle(it).length <= 64, seoTitle(it));
    assert.doesNotMatch(seoTitle(it), /airbnb/i, 'a listing is never labelled with another company\'s name');
  }
  const lodge = { ...one(list, /Jets Nest/), type: 'Lodge', title: 'Mara Ridge' };
  assert.doesNotMatch(seoTitle(lodge), /BnB/, 'a lodge is not a BnB');
  const lagos = { ...one(list, /Jets Nest/), place: { country: { id: 'nigeria', name: 'Nigeria', kind: 'country' }, city: { id: 'lagos', name: 'Lagos', kind: 'city', countrySlug: 'nigeria' }, area: { id: 'lekki', name: 'Lekki', kind: 'district', countrySlug: 'nigeria' } } };
  assert.equal(seoTitle(lagos), 'The Jets Nest, Lekki · Shortlet | Cabana', 'Lagos says shortlet');
  assert.match(metaDescription(lagos), /^Shortlet apartment in Lekki, Lagos/);
});

test('descriptions open with the search phrase and always keep the price and the call to book', () => {
  const list = items();
  for (const it of list) {
    const d = metaDescription(it);
    assert.ok(d.length <= 158, d);
    if (it.price > 0) assert.match(d, /all-in/, d);
    assert.match(d, /zero commission\.$/i, d);
  }
  assert.match(metaDescription(one(list, /Jets Nest/)), /^BnB apartment in Obama Estate, Nairobi · 1 bedroom · Sleeps 2\. KES 1,500 \/ night, all-in\. Book it like an Airbnb, direct with Jets: zero commission\.$/);
  assert.match(metaDescription(one(list, /Prado/)), /Car rental direct from Drive KE, self-drive: zero commission\./);
  assert.doesNotMatch(metaDescription(one(list, /Prado/)), /driver/, 'no driver is promised that the operator has not priced');
});

test('the page names the thing the way people do, and asks the question they ask', () => {
  const list = items();
  const nest = one(list, /Jets Nest/);
  assert.match(summarise(nest), /what most people here would call a BnB or an Airbnb/);
  const qs = faqFor(nest).map(([q]) => q);
  assert.ok(qs.includes('Can I book The Jets Nest like an Airbnb?'));
  assert.match(faqFor(nest).find(([q]) => /like an Airbnb/.test(q))[1], /not affiliated with Airbnb/);
  const html = renderEntity(nest, { description: 'A calm flat near the airport with fast Wi-Fi and a balcony.' });
  assert.match(html, /Airbnb is a trademark of Airbnb, Inc\. Cabana is independent/, 'the page that uses the word says whose word it is');

  const car = one(list, /Prado/);
  assert.match(faqFor(car).find(([q]) => /with a driver/.test(q))[1], /self-drive/);
  const driven = { ...car, extra: { ...car.extra, chauffeur: true } };
  assert.match(faqFor(driven).find(([q]) => /with a driver/.test(q))[1], /^Yes\. Drive KE offers a driver/);
  assert.doesNotMatch(renderEntity(car, {}), /trademark of Airbnb/, 'a car page does not mention Airbnb at all');

  const gig = one(list, /Sauti Sol/);
  assert.ok(faqFor(gig).some(([q]) => q === 'How do I get tickets for Sauti Sol live at KICC?'));
});

test('hubs are titled the way each country searches, and only claim what is on them', () => {
  const ke = T.hubCopy('stays', { name: 'Kilimani', full: 'Kilimani, Nairobi', countrySlug: 'kenya', items: [] });
  assert.equal(ke.title, 'Airbnbs, BnBs & Apartments in Kilimani, Nairobi');
  assert.equal(ke.h1, 'Airbnbs, BnBs & short stays in Kilimani, Nairobi');
  assert.equal(T.hubCopy('stays', { name: 'Lekki', full: 'Lekki, Lagos', countrySlug: 'nigeria', items: [] }).title, 'Shortlet Apartments & Airbnbs in Lekki, Lagos');
  assert.match(T.hubCopy('stays', { name: 'Sea Point', full: 'Sea Point, Cape Town', countrySlug: 'south-africa', items: [] }).title, /Self-Catering/);
  assert.equal(T.hubCopy('stays', { name: 'Very Long Neighbourhood Name', full: 'Very Long Neighbourhood Name, Somewhere Far', countrySlug: 'kenya', items: [] }).title.length <= 54, true);

  const car = { kind: 'car', extra: {} };
  assert.equal(T.hubCopy('carhire', { name: 'Westlands', full: 'Westlands, Nairobi', countrySlug: 'kenya', items: [car] }).title, 'Car Hire & Car Rental in Westlands, Nairobi');
  assert.match(T.hubCopy('carhire', { name: 'X', full: 'X', countrySlug: 'kenya', items: [{ kind: 'car', extra: { chauffeur: true } }] }).title, /With Driver|Self-Drive & Driver/);

  const tours = [{ kind: 'tour', type: 'Day Trip', title: 'Nairobi National Park game drive', extra: {} }];
  assert.equal(T.hubCopy('tours', { name: 'Nairobi', full: 'Nairobi', countrySlug: 'kenya', items: tours }).title, 'Safaris, Tours & Day Trips in Nairobi');
  assert.equal(T.hubCopy('tours', { name: 'Nairobi', full: 'Nairobi', countrySlug: 'kenya', items: [{ kind: 'tour', type: 'City Tour', title: 'Old town walk', extra: {} }] }).title, 'Tours in Nairobi', 'no safari is claimed without one');
  assert.match(T.hubCopy('tours', { name: 'Nairobi', full: 'Nairobi', countrySlug: 'kenya', items: tours }).lead, /^One safari from Nairobi/);

  const rooms = [{ kind: 'room', type: 'Bedsitter', title: 'Quiet bedsitter' }];
  assert.equal(T.hubCopy('roommates', { name: 'Rongai', full: 'Rongai', countrySlug: 'kenya', items: rooms }).title, 'Bedsitters & Rooms to Rent in Rongai');
  assert.equal(T.hubCopy('roommates', { name: 'Rongai', full: 'Rongai', countrySlug: 'kenya', items: [{ kind: 'room', type: 'Shared room', title: 'Room in a flat' }] }).title, 'Rooms to Rent in Rongai');

  const faq = T.hubQuestions('stays', { name: 'Kilimani', full: 'Kilimani, Nairobi', countrySlug: 'kenya', items: [1, 2], band: 'KES 1,500', unit: 'night' }).map(([q]) => q);
  assert.deepEqual(faq, [
    'How many Airbnbs and BnBs are there in Kilimani, Nairobi on Cabana?',
    'How much is an Airbnb in Kilimani per night?',
    'Is Cabana the same as Airbnb?',
    'Can I pay for a BnB in Kilimani with M-Pesa?',
    'How do I book in Kilimani, Nairobi?',
  ]);
  const carFaq = T.hubQuestions('carhire', { name: 'Westlands', full: 'Westlands', countrySlug: 'kenya', items: [car], band: 'KES 5,000', unit: 'day' }).map(([q]) => q);
  assert.ok(carFaq.includes('How much is car hire in Westlands per day?'), 'the question reads as people ask it');
});

test('one switch takes the brand word out of every page', () => {
  withBrandTerms('off', () => {
    const list = items();
    const nest = one(list, /Jets Nest/);
    const html = renderEntity(nest, {});
    assert.doesNotMatch(html, /airbnb/i);
    assert.equal(seoTitle(nest), 'The Jets Nest, Obama Estate · BnB | Cabana', 'BnB is nobody\'s trademark');
    const hub = renderHub(B.hubModel('/syokimau-apartments', list));
    assert.doesNotMatch(hub, /airbnb/i);
    assert.match(hub, /<h1>BnBs &amp; short stays in Syokimau, Nairobi<\/h1>/);
  });
  withBrandTerms(null, () => assert.match(renderHub(B.hubModel('/syokimau-apartments', items())), /Airbnbs/));
});

test('links between hubs use the words people search with', () => {
  assert.equal(T.hubAnchor('stays', { id: 'kilimani', name: 'Kilimani', kind: 'district', countrySlug: 'kenya' }), 'Airbnbs & BnBs in Kilimani');
  assert.equal(T.hubAnchor('stays', { id: 'lekki', name: 'Lekki', kind: 'district', countrySlug: 'nigeria' }), 'Shortlets & Airbnbs in Lekki');
  assert.equal(T.hubAnchor('carhire', { name: 'Westlands' }), 'Car hire in Westlands');
});

test('APA hears an airbnb as a stay and goes looking', () => {
  assert.equal(S.__test.normaliseService('airbnb'), 'stays');
  assert.equal(S.__test.normaliseService('bnb'), 'stays');
  assert.equal(S.__test.normaliseService('car rental'), 'carhire');
  assert.equal(S.__test.normaliseService('safari package'), 'tours');
  assert.equal(S.__test.normaliseService('bedsitter'), 'roommates');
  for (const text of ['any airbnb in kilimani?', 'bnb near jkia for tonight', 'shortlet in lekki', 'self drive prado this weekend']) {
    const names = S.__test.selectApaTools({ mode: 'task', text, history: [], agent: '' }).map(t => t.function.name);
    assert.ok(names.includes('search_stays'), `"${text}" should search`);
  }
  const p = S.__test.systemPrompt({ grounding: '', page: 'home', caller: {}, threadAge: 'brand new', apaTurns: 0, ads: [], mode: 'task' });
  assert.match(p, /"Airbnb", "BnB", "shortlet"/);
  assert.match(p, /Cabana is not Airbnb/);
});

test('the console can show which words each service is found by, and why', () => {
  const v = T.vocabulary();
  const stays = v.services.find(s => s.service === 'stays');
  assert.ok(stays.intent.includes('airbnb') && stays.intent.includes('shortlet'));
  assert.ok(stays.measured.some(m => m.q === 'airbnb nairobi' && m.volume === 8100));
  assert.ok(v.local.some(l => l.country === 'nigeria' && l.term === 'Shortlet'));
});
