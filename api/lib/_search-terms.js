/* ══════════════════════════════════════════════════════════════════════
   CABANA · THE WORDS PEOPLE SEARCH WITH
   api/lib/_search-terms.js

   Nobody in Nairobi searches for "short-term accommodation". They search
   for an airbnb in Kilimani, a bnb near JKIA, car hire or car rental,
   safari packages, a bedsitter in Rongai, events this weekend. In Lagos
   the same person searches for a shortlet in Lekki. A page that never
   uses the word a person types is a page that person never finds, however
   good it is.

   This module is the one place those words live. The live pages, the
   hubs, APA's search and Compass's reading of a search box all take their
   vocabulary from here, so the site says what people say, and understands
   it when they say it back.

   WHAT THE NUMBERS SAY (monthly searches, estimates)
   ──────────────────────────────────────────────────
   Kenya, Serpstat, Aug 2026 (seo/SERPSTAT-PLAN.md): "airbnb nairobi"
   8,100, as many as "car hire nairobi" and "car rental nairobi". Then
   "accommodation nairobi" 1,000, "apartments in nairobi" 720, "airbnb
   kenya" 590, "serviced apartments nairobi" 260. Nigeria, Semrush, Oct
   2026: "airbnb lagos" 1,000, "shortlet apartment lagos" 880, "short let
   lagos" 20. One word, spelled the local way, is the difference.

   THE RULES
   ─────────
   1. The searcher's word goes where it counts (title, heading, the first
      paragraph, one question) once each, in a sentence a person would
      write. Never a keyword list, never hidden text, never repetition.
   2. "Airbnb" is another company's trademark. It appears only as the word
      people use for a furnished place booked by the night, never as a
      label on a listing, and always beside a plain statement that Cabana
      is independent. Listing titles say "BnB", which is nobody's mark.
      One switch, CABANA_SEO_BRAND_TERMS=off, takes it out everywhere.
   3. A word that makes a claim is used only when the data makes it true:
      "bedsitter" only where one is listed, "with a driver" only where an
      operator prices a driver, "safari" only where a trip is one.
   ══════════════════════════════════════════════════════════════════════ */

import { placeById } from './_places.js';

export function brandTermsOn() {
  const v = typeof process !== 'undefined' && process.env ? process.env.CABANA_SEO_BRAND_TERMS : '';
  return String(v || '').trim().toLowerCase() !== 'off';
}

/* What was measured, so the console can show why each word is used. */
export const EVIDENCE = [
  { q: 'airbnb nairobi', market: 'KE', volume: 8100, service: 'stays', source: 'Serpstat' },
  { q: 'car hire nairobi', market: 'KE', volume: 8100, service: 'carhire', source: 'Serpstat' },
  { q: 'car rental nairobi', market: 'KE', volume: 8100, service: 'carhire', source: 'Serpstat' },
  { q: 'things to do in nairobi', market: 'KE', volume: 2400, service: 'tours', source: 'Serpstat' },
  { q: 'kenya safari', market: 'KE', volume: 1900, service: 'tours', source: 'Serpstat' },
  { q: 'events in nairobi', market: 'KE', volume: 1600, service: 'events', source: 'Serpstat' },
  { q: 'masai mara safari', market: 'KE', volume: 1600, service: 'tours', source: 'Serpstat' },
  { q: 'safari packages kenya', market: 'KE', volume: 1300, service: 'tours', source: 'Serpstat' },
  { q: 'accommodation nairobi', market: 'KE', volume: 1000, service: 'stays', source: 'Serpstat' },
  { q: 'apartments in nairobi', market: 'KE', volume: 720, service: 'stays', source: 'Serpstat' },
  { q: 'airbnb kenya', market: 'KE', volume: 590, service: 'stays', source: 'Serpstat' },
  { q: 'amboseli safari', market: 'KE', volume: 480, service: 'tours', source: 'Serpstat' },
  { q: 'serviced apartments nairobi', market: 'KE', volume: 260, service: 'stays', source: 'Serpstat' },
  { q: 'hotels in lagos', market: 'NG', volume: 2900, service: 'stays', source: 'Semrush' },
  { q: 'car rental lagos', market: 'NG', volume: 2400, service: 'carhire', source: 'Semrush' },
  { q: 'airbnb lagos', market: 'NG', volume: 1000, service: 'stays', source: 'Semrush' },
  { q: 'shortlet apartment lagos', market: 'NG', volume: 880, service: 'stays', source: 'Semrush' },
  { q: 'airbnb abuja', market: 'NG', volume: 720, service: 'stays', source: 'Semrush' },
  { q: 'car hire lagos', market: 'NG', volume: 590, service: 'carhire', source: 'Semrush' },
  { q: 'apartments in lagos', market: 'NG', volume: 40, service: 'stays', source: 'Semrush' },
  { q: 'short let lagos', market: 'NG', volume: 20, service: 'stays', source: 'Semrush' },
];

/* ── Understanding a search ─────────────────────────────────────────── */

/* Words that say which service someone wants. INTENT words carry no
   other meaning and are removed from the query ("airbnb in kilimani" is
   a stay in Kilimani). KIND words also describe the thing ("cottage",
   "land cruiser"), so they stay in the query as a preference. Rides and
   flights are understood so APA can point the way, even though they are
   not in the catalogue. Brand names here are for understanding only;
   they never appear on a page. */
const INTENT = {
  stays: ['airbnb', 'airbnbs', 'air bnb', 'air bnbs', 'airbnb s', 'bnb', 'bnbs', 'b and b', 'bed and breakfast', 'shortlet', 'shortlets',
          'short let', 'short lets', 'short stay', 'short stays', 'short term rental', 'short term rentals', 'holiday home', 'holiday homes',
          'holiday let', 'holiday lets', 'vacation rental', 'vacation rentals', 'accommodation', 'accommodations', 'accomodation',
          'lodging', 'place to stay', 'places to stay', 'where to stay', 'somewhere to stay', 'staycation', 'self catering', 'homestay',
          'stay', 'stays'],
  roommates: ['room for rent', 'rooms for rent', 'room to rent', 'rooms to rent', 'room to let', 'rooms to let', 'roommate', 'roommates',
              'flatmate', 'flatmates', 'house share', 'shared house', 'monthly rent', 'to let'],
  tours: ['safari package', 'safari packages', 'holiday package', 'holiday packages', 'things to do', 'what to do', 'activities',
          'experiences', 'excursion', 'excursions', 'tour', 'tours'],
  events: ["what's on", 'whats on', 'event', 'events', 'tickets', 'ticket', 'nightlife'],
  carhire: ['car hire', 'car rental', 'car rentals', 'rent a car', 'hire a car', 'rental car', 'rental cars', 'car for hire', 'cars for hire',
            'vehicle hire', 'car hire services'],
  rides: ['airport transfer', 'airport transfers', 'airport pickup', 'airport taxi', 'taxi', 'cab', 'uber', 'bolt', 'ride', 'rides'],
  food: ['food delivery', 'order food', 'where to eat', 'takeaway', 'take away', 'delivery', 'restaurant', 'restaurants', 'food'],
  shopping: ['shopping', 'souvenirs', 'curios'],
  flights: ['air ticket', 'air tickets', 'plane ticket', 'plane tickets', 'flight', 'flights', 'cheap flights'],
};
const KIND = {
  stays: ['serviced apartment', 'serviced apartments', 'furnished apartment', 'furnished apartments', 'apartment', 'apartments',
          'appartment', 'appartments', 'flat', 'flats', 'studio', 'studios', 'cottage', 'cottages', 'villa', 'villas', 'guest house',
          'guesthouse', 'hotel', 'hotels', 'lodge', 'lodges', 'maisonette', 'bungalow', 'penthouse', 'cabin', 'beach house', 'mansion'],
  roommates: ['bedsitter', 'bedsitters', 'bed sitter', 'single room', 'single rooms', 'self contain', 'self contained', 'hostel', 'hostels'],
  tours: ['safari', 'safaris', 'game drive', 'game drives', 'day trip', 'day trips', 'city tour', 'walking tour', 'boat ride', 'dhow',
          'snorkeling', 'snorkelling', 'hike', 'hiking', 'road trip', 'getaway', 'getaways', 'balloon'],
  events: ['concert', 'concerts', 'festival', 'festivals', 'party', 'parties', 'gig', 'gigs', 'live music', 'comedy', 'shows'],
  carhire: ['self drive', 'chauffeur', 'with driver', 'with a driver', 'land cruiser', 'prado', '4x4', 'suv', 'suvs', 'van hire',
            'pickup truck', 'saloon', 'minibus'],
  food: ['nyama choma', 'pizza', 'burger', 'burgers', 'brunch', 'breakfast', 'lunch', 'dinner', 'sushi', 'swahili food'],
};

const STOP = new Set(('a an the in at near nearby around close by to for of on with and or me my i im we us our you find show looking look ' +
  'want need get some any best good nice top please available book booking books cheap cheapest affordable budget luxury luxurious ' +
  'per night nights day days week weekly month monthly from within inside area areas side around near me can is are there what which ' +
  'where how much price prices cost costs rate rates kes ksh kshs sh usd under below less than max maximum up upto ' +
  'this next weekend tonight today tomorrow now soon asap urgent urgently').split(' '));

const NUMBER_WORD = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, single: 1, double: 2 };

function phraseIndex() {
  const out = [];
  for (const [service, list] of Object.entries(INTENT)) for (const p of list) out.push({ p, service, intent: true });
  for (const [service, list] of Object.entries(KIND)) for (const p of list) out.push({ p, service, intent: false });
  return out.sort((a, b) => b.p.length - a.p.length);
}
const PHRASES = phraseIndex();

function norm(q) {
  return ` ${String(q || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/[‘’`]/g, "'").replace(/&/g, ' and ').replace(/[^a-z0-9' .,]+/g, ' ').replace(/[.,]+(?!\d)/g, ' ')
    .replace(/\s+/g, ' ').trim()} `;
}

/**
 * What a search box or a chat message is asking for, in catalogue terms.
 *   "2 bedroom airbnb in kilimani under 5k for 4"
 *   → { service: 'stays', words: ['kilimani'], beds: 2, guests: 4, maxPrice: 5000 }
 * `words` must match; `prefer` are kind words that rank a match higher;
 * `driver` means a car that comes with one.
 */
export function parseQuery(q) {
  let s = norm(q);
  const found = [];
  const prefer = [];
  let beds = null, guests = null, maxPrice = null, price = null;

  const money = (m, k) => Math.round(Number(String(m).replace(/,/g, '')) * (k ? 1000 : 1));
  s = s.replace(/ (?:under|below|less than|max(?:imum)?|up ?to|not more than|within) (?:kes |ksh |kshs |sh |usd |\$)?([\d,]+(?:\.\d+)?)( ?k)?\b/g, (_, m, k) => { maxPrice = money(m, k); return ' '; });
  s = s.replace(/ (?:show|find|get|give|send) (?:me|us) /g, ' ');
  s = s.replace(/ (?:for|sleeps?|fits?) (\d{1,2}|one|two|three|four|five|six|seven|eight|nine|ten)(?! ?(?:nights?|days?|weeks?|months?|hours?|hrs?|bed))(?: ?(?:people|persons?|guests?|pax|adults?|of us))?\b/g, (_, n) => { guests = NUMBER_WORD[n] || Number(n); return ' '; });
  s = s.replace(/ (\d{1,2}) ?(?:people|persons|guests|pax|adults)\b/g, (_, n) => { guests = Number(n); return ' '; });
  s = s.replace(/ (\d|one|two|three|four|five|six|single|double) ?-?(?:bed(?:room)?s?|br|bdr|bdrm|bhk)\b/g, (_, n) => { beds = NUMBER_WORD[n] || Number(n); return ' '; });
  if (/ (?:cheap|cheapest|affordable|budget|low cost|lowest price) /.test(s)) price = 'low';
  else if (/ (?:luxury|luxurious|high end|premium|exclusive) /.test(s)) price = 'high';

  /* Longest phrase first, so "city tour" is a tour before "tour" is.
     The service is the first one the person named, and a word that only
     means a service ("airbnb") outranks one that also describes a thing
     ("cottage"). */
  const said = s;
  for (const { p, service, intent } of PHRASES) {
    const needle = ` ${p} `;
    if (!s.includes(needle)) continue;
    found.push({ service, intent, at: said.indexOf(needle) });
    if (!intent) prefer.push(p);
    s = s.split(needle).join(' ');
  }
  if (beds == null && /\b(studio|bedsitter|bed sitter|self contain)/.test(prefer.join(' '))) beds = 0;
  const driver = prefer.some(p => /chauffeur|driver/.test(p)) || null;

  const words = s.trim().split(/\s+/).map(w => w.replace(/^'+|'+$/g, '').replace(/'s$/, ''))
    .filter(w => w.length > 1 && !STOP.has(w) && !/^\d+$/.test(w));
  const services = [...new Set(found.sort((a, b) => (b.intent - a.intent) || (a.at - b.at)).map(f => f.service))];
  return { service: services[0] || null, services, words, prefer, beds, guests, maxPrice, price, driver };
}

/* ── Saying it the way people search ────────────────────────────────── */

/* The local word for a furnished place booked by the night, by country.
   Measured where we have numbers (Kenya says BnB and airbnb, Nigeria says
   shortlet), the international default everywhere else. */
const STYLE_OF = { kenya: 'bnb', nigeria: 'shortlet', 'south-africa': 'selfcatering' };
const ROOM_WORD = { kenya: 'bedsitter', nigeria: 'self contain' };

const STAY_STYLE = {
  bnb: {
    adj: 'BnB', term: 'BnB',
    brand: { title: ['Airbnbs, BnBs & Apartments', 'Airbnbs & BnBs'], h1: 'Airbnbs, BnBs & short stays', spoken: 'Airbnbs or BnBs', plural: 'Airbnbs and BnBs', one: 'an Airbnb',
             aka: 'It is what most people here would call a BnB or an Airbnb: a furnished place booked by the night, direct with the host.' },
    plain: { title: ['BnBs & Short-Stay Apartments', 'BnBs & Short Stays'], h1: 'BnBs & short stays', spoken: 'BnBs', plural: 'BnBs', one: 'a BnB',
             aka: 'It is what most people here would call a BnB: a furnished place booked by the night, direct with the host.' },
  },
  shortlet: {
    adj: 'Shortlet', term: 'Shortlet',
    brand: { title: ['Shortlet Apartments & Airbnbs', 'Shortlets & Airbnbs'], h1: 'Shortlet apartments & Airbnbs', spoken: 'shortlets or Airbnbs', plural: 'shortlet apartments', one: 'a shortlet',
             aka: 'It is a shortlet, what many people call an Airbnb: a furnished place booked by the night, direct with the host.' },
    plain: { title: ['Shortlet Apartments', 'Shortlets'], h1: 'Shortlet apartments', spoken: 'shortlets', plural: 'shortlet apartments', one: 'a shortlet',
             aka: 'It is a shortlet: a furnished place booked by the night, direct with the host.' },
  },
  selfcatering: {
    adj: 'Self-catering', term: 'Self-catering',
    brand: { title: ['Airbnbs & Self-Catering Stays', 'Airbnbs & Self-Catering'], h1: 'Airbnbs & self-catering stays', spoken: 'Airbnbs or self-catering', plural: 'self-catering stays', one: 'a self-catering stay',
             aka: 'It is a self-catering stay, booked by the night the way you would book an Airbnb, direct with the host.' },
    plain: { title: ['Self-Catering Stays'], h1: 'Self-catering stays', spoken: 'self-catering stays', plural: 'self-catering stays', one: 'a self-catering stay',
             aka: 'It is a self-catering stay, booked by the night, direct with the host.' },
  },
  short: {
    adj: 'Short-stay', term: 'Short stay',
    brand: { title: ['Airbnbs, Short Stays & Apartments', 'Airbnbs & Short Stays'], h1: 'Airbnbs & short stays', spoken: 'Airbnbs', plural: 'short stays', one: 'a short stay',
             aka: 'It is a furnished short stay, booked by the night the way you would book an Airbnb, direct with the host.' },
    plain: { title: ['Apartments & Short Stays'], h1: 'Apartments & short stays', spoken: 'short stays', plural: 'short stays', one: 'a short stay',
             aka: 'It is a furnished short stay, booked by the night, direct with the host.' },
  },
};

/** The stay wording for a country, with or without the brand term. */
export function stayWords(countrySlug) {
  const style = STAY_STYLE[STYLE_OF[countrySlug] || 'short'];
  return { adj: style.adj, term: style.term, room: ROOM_WORD[countrySlug] || null, ...(brandTermsOn() ? style.brand : style.plain) };
}

const cap = s => String(s || '').replace(/^./, c => c.toUpperCase());
const RESIDENTIAL = /^(apartment|apartments|studio|flat|house|home|cottage|maisonette|bungalow|townhouse|penthouse|loft|cabin|room|condo|duplex|bedsitter|serviced apartment)$/i;
const SAFARI = /safari|game ?drive|national park|reserve|conservancy|mara|amboseli|tsavo|samburu|nakuru|naivasha|serengeti|ngorongoro|bwindi|gorilla|big five/i;
const BEDSITTER = /bed-?sitter|studio|single room|self[- ]contain/i;

/** The country a place sits in, by its slug ("kenya"), however deep it is. */
export function countrySlugOf(place) {
  let p = place, guard = 0;
  while (p && guard++ < 6) {
    if (p.kind === 'country') return p.id;
    if (p.countrySlug) return p.countrySlug;
    p = p.parent ? placeById(p.parent) : null;
  }
  return '';
}

export function countryOf(item) {
  const p = item?.place || {};
  return countrySlugOf(p.area || p.city || p.country);
}

/* A stay is "a BnB" only when it is the kind of place people mean by the
   word: an apartment, a studio, a house. A lodge or a hotel is not. */
export function isHomeStay(item) {
  return item.kind === 'stay' && (!item.type || RESIDENTIAL.test(String(item.type).trim()));
}

export function isSafari(item, d = {}) {
  return item.kind === 'tour' && SAFARI.test([item.type, item.title, item.location, d.summary].filter(Boolean).join(' '));
}

export function isDayTrip(item) {
  return item.kind === 'tour' && (/day/i.test(item.type || '') || /^(1 day|one day|full day|half day|\d+ ?h)/i.test(String(item.extra?.duration || '')) || Number(item.extra?.days) === 1);
}

export function offersDriver(item, d = {}) {
  return item.kind === 'car' && !!(d.car?.chauffeur ?? item.extra?.chauffeur);
}

/* Already says what it is in the searcher's own word? Then a title needs
   no help. */
const SAYS = {
  stay: /\b(bnb|airbnb|shortlet|short[- ]?stay|self[- ]catering)\b/i,
  room: /\b(room|bedsitter|self[- ]contain|hostel)\b/i,
  tour: /\b(safari|tour|trip|excursion|drive|walk|hike|cruise|expedition)\b/i,
  event: /\bticket/i,
  car: /\b(hire|rental|rent)\b/i,
  food: /\bmenu\b/i,
};

/** The word a listing's title borrows when there is room: "· BnB". */
export function titleTerm(item, d = {}) {
  if (SAYS[item.kind]?.test(item.title)) return '';
  const w = stayWords(countryOf(item));
  switch (item.kind) {
    case 'stay': return isHomeStay(item) ? w.term : '';
    case 'room': return w.room && BEDSITTER.test(`${item.type} ${item.title}`) ? cap(w.room) : 'Room to rent';
    case 'tour': return isSafari(item, d) ? 'Safari' : isDayTrip(item) ? 'Day trip' : 'Tour';
    case 'event': return 'Tickets';
    case 'car': return 'Car hire';
    case 'food': return 'Menu';
    default: return '';
  }
}

/** How a meta description opens: "BnB apartment in Obama Estate, Nairobi". */
export function descriptionLead(item, where, d = {}) {
  const w = stayWords(countryOf(item));
  const type = String(item.type || '').trim();
  switch (item.kind) {
    case 'stay': return isHomeStay(item) ? `${w.adj} ${type ? type.toLowerCase() : 'apartment'} in ${where}` : `${type || 'Stay'} in ${where}`;
    case 'room': return w.room && BEDSITTER.test(`${type} ${item.title}`) ? `${cap(w.room)} to rent in ${where}` : `Room to rent in ${where}`;
    case 'tour': {
      const days = Number(d.days || item.extra?.days) || 0;
      if (isSafari(item, d) && days > 1) return `${days}-day safari package from ${where}`;
      return `${type || 'Tour'} from ${where}`;
    }
    case 'event': return `${type || 'Event'} in ${where}`;
    case 'car': return `${type || 'Car'} for hire in ${where}`;
    case 'food': return `Order from ${item.title} in ${where}`;
    default: return item.title;
  }
}

/** How a meta description closes: the call to book, in the searcher's words. */
export function descriptionClose(item, d = {}) {
  const who = ` with ${item.host || 'the host'}`;
  switch (item.kind) {
    case 'stay':
      return isHomeStay(item) && brandTermsOn() ? `Book it like an Airbnb, direct${who}: zero commission.` : `Book direct${who} on Cabana: zero commission.`;
    case 'car':
      return `Car rental direct${item.host ? ` from ${item.host}` : ''}, self-drive${offersDriver(item, d) ? ' or with a driver' : ''}: zero commission.`;
    case 'event': return 'Get tickets on Cabana: zero commission.';
    case 'food': return 'See the menu and order on Cabana.';
    default: return `Book direct${who} on Cabana: zero commission.`;
  }
}

/** One sentence for the summary that names the thing the way people do. */
export function summaryAka(item, d = {}) {
  if (item.kind === 'stay' && isHomeStay(item)) return stayWords(countryOf(item)).aka;
  if (item.kind === 'car') return `Hire it self-drive${offersDriver(item, d) ? ' or with a driver' : ''}, by the day.`;
  if (item.kind === 'tour') {
    const days = Number(d.days || item.extra?.days) || 0;
    if (isSafari(item, d) && days > 1) return `It is a ${days}-day safari package, booked direct with the operator.`;
  }
  return '';
}

/** The question people ask about this kind of thing, answered from the data. */
export function entityQuestion(item, d = {}) {
  const name = item.title;
  const host = item.host || 'the host';
  if (item.kind === 'stay' && isHomeStay(item)) {
    if (brandTermsOn()) {
      return [`Can I book ${name} like an Airbnb?`,
        `Yes. It is a furnished place you book by the night, the way you would an Airbnb or a BnB, direct with ${host}. The price shown is all-in, you can pay by M-Pesa or card, and the host pays Cabana no commission. Cabana is independent and not affiliated with Airbnb.`];
    }
    return [`Is ${name} a BnB?`, `It is a furnished place you book by the night, direct with ${host}. The price shown is all-in, you can pay by M-Pesa or card, and the host pays Cabana no commission.`];
  }
  if (item.kind === 'car') {
    return offersDriver(item, d)
      ? [`Can I hire ${name} with a driver?`, `Yes. ${cap(host)} offers a driver for a daily rate, shown when you choose your dates. You can also hire it self-drive.`]
      : [`Can I hire ${name} with a driver?`, `It is offered self-drive. If you would rather be driven, Cabana Rides has drivers by the hour.`];
  }
  return null;
}

/* ── Hubs: the page for "airbnb in kilimani" ────────────────────────── */

function fit(options, max) {
  for (const o of options) if (o && o.length <= max) return o;
  return options[options.length - 1].slice(0, max).replace(/[\s,.;:&–-]+\S*$/, '');
}
const listed = parts => parts.length > 2 ? `${parts.slice(0, -1).join(', ')} & ${parts[parts.length - 1]}` : parts.join(' & ');

/**
 * Title, heading and opening for a place hub, in the words people search
 * with there, and only claiming what the items on it support.
 */
export function hubCopy(service, { name, full, countrySlug, items = [] }) {
  const n = items.length;
  const max = 54;
  switch (service) {
    case 'stays': {
      const w = stayWords(countrySlug);
      return {
        title: fit([...w.title.map(t => `${t} in ${full}`), ...w.title.map(t => `${t} in ${name}`)], max),
        h1: `${w.h1} in ${full}`,
        plural: w.plural, one: w.one,
        count: n === 1 ? `1 ${w.term === 'BnB' ? 'BnB' : 'short stay'}` : `${n} ${w.title[w.title.length - 1]}`,
        lead: `${n} furnished ${n === 1 ? 'place' : 'places'} to stay in ${full} you can book right now: the apartments, studios and homes people search for as ${w.spoken}.`,
      };
    }
    case 'roommates': {
      const room = ROOM_WORD[countrySlug];
      const sitter = room && items.some(i => BEDSITTER.test(`${i.type} ${i.title}`));
      const pair = sitter ? `${cap(room)}s & Rooms to Rent` : 'Rooms to Rent';
      return {
        title: fit([`${pair} in ${full}`, `${pair} in ${name}`, `Rooms to Rent in ${name}`], max),
        h1: `${sitter ? `${cap(room)}s and rooms` : 'Rooms'} to rent in ${full}`,
        plural: sitter ? `${room}s and rooms to rent` : 'rooms to rent', one: 'a room',
        count: `${n} ${n === 1 ? 'room' : 'rooms'} to rent`,
        lead: `${n} ${n === 1 ? 'room' : 'rooms'} to rent in ${full} right now${sitter ? `, ${room}s included` : ''}, in shared homes with verified flatmates.`,
      };
    }
    case 'tours': {
      const safari = items.some(i => isSafari(i));
      const day = items.some(i => isDayTrip(i));
      const parts = [safari && 'Safaris', 'Tours', day && 'Day Trips'].filter(Boolean);
      const lower = parts.map(p => p.toLowerCase());
      return {
        title: fit([`${listed(parts)} in ${full}`, `${listed(parts)} in ${name}`, `${parts.slice(0, 2).join(' & ')} in ${name}`], max),
        h1: cap(`${listed(lower)} in ${full}`),
        plural: safari ? 'safaris and tours' : 'tours', one: safari ? 'a safari or tour' : 'a tour',
        count: n === 1 ? `1 ${safari ? 'safari' : 'tour'}` : `${n} ${safari ? 'safaris & tours' : 'tours'}`,
        lead: `${n === 1 ? `One ${safari ? 'safari' : 'tour'}` : `${n} ${listed(lower).replace(' & ', ' and ')}`} from ${full} you can book right now, straight from the operator: things to do here, with real departures and real prices.`,
      };
    }
    case 'events':
      return {
        title: fit([`Events in ${full}: Tickets & What's On`, `Events in ${name}: Tickets & What's On`, `Events in ${name}`], max),
        h1: `Events in ${full}`,
        plural: 'events', one: 'a ticket',
        count: `${n} ${n === 1 ? 'event' : 'events'} with tickets`,
        lead: `What's on in ${full}: ${n} ${n === 1 ? 'event' : 'events'} with tickets on sale now, at the organiser's own price.`,
      };
    case 'carhire': {
      const driver = items.some(i => offersDriver(i));
      return {
        title: fit([...(driver ? [`Car Hire & Car Rental in ${full}: Self-Drive & Driver`] : []), `Car Hire & Car Rental in ${full}`, `Car Hire & Car Rental in ${name}`, `Car Hire in ${name}`], max),
        h1: `Car hire in ${full}`,
        plural: 'cars for hire', one: 'car hire',
        count: `${n} ${n === 1 ? 'car' : 'cars'} for hire`,
        lead: `${n} ${n === 1 ? 'car' : 'cars'} for hire in ${full}, self-drive${driver ? ' or with a driver' : ''}, rented by the day straight from local operators.`,
      };
    }
    case 'food':
      return {
        title: fit([`Restaurants in ${full}: Order Food Online`, `Restaurants in ${name}: Order Food Online`, `Restaurants in ${name}`], max),
        h1: `Restaurants and food to order in ${full}`,
        plural: 'restaurants', one: 'a meal',
        count: `${n} ${n === 1 ? 'restaurant' : 'restaurants'}`,
        lead: `${n} ${n === 1 ? 'kitchen' : 'kitchens'} in ${full} taking orders on Cabana right now. See the menu, order, and pay the kitchen its own price.`,
      };
    default:
      return { title: fit([`${cap(service)} in ${full}`, `${cap(service)} in ${name}`], max), h1: `${cap(service)} in ${full}`, plural: service, one: service, count: `${n} ${service}`, lead: '' };
  }
}

/** Link text for a hub, in the short form people search: "Airbnbs & BnBs
    in Kilimani". Anchor text is how a search engine learns what the page
    it points to is about. */
export function hubAnchor(service, place) {
  const name = place?.name || '';
  switch (service) {
    case 'stays': { const w = stayWords(countrySlugOf(place)); return `${w.title[w.title.length - 1]} in ${name}`; }
    case 'carhire': return `Car hire in ${name}`;
    case 'tours': return `Tours & safaris in ${name}`;
    case 'events': return `Events in ${name}`;
    case 'food': return `Restaurants in ${name}`;
    case 'roommates': return `Rooms to rent in ${name}`;
    default: return `${cap(service)} in ${name}`;
  }
}

/** The questions a hub answers, in the words people put them. */
export function hubQuestions(service, { name, full, countrySlug, items = [], band, unit, copy }) {
  const brand = brandTermsOn();
  const n = items.length;
  const c = copy || hubCopy(service, { name, full, countrySlug, items });
  const live = `${n} ${n === 1 ? 'is' : 'are'} live right now. This page updates itself as they are published, so it only ever shows what you can actually book.`;
  const priceQ = {
    stays: `How much is ${c.one} in ${name} per night?`,
    roommates: `How much is a room to rent in ${name}?`,
    tours: `How much is ${c.one} from ${name}?`,
    events: `How much are tickets for events in ${name}?`,
    carhire: `How much is car hire in ${name} per day?`,
    food: `How much is a meal in ${name}?`,
  }[service];
  const out = [[`How many ${c.plural} are there in ${full} on Cabana?`, live]];
  if (band && priceQ) out.push([priceQ, `From ${band} per ${unit} on Cabana, all-in: what you see is what you pay. ${service === 'events' ? 'Organisers' : service === 'food' ? 'Kitchens' : 'Hosts and operators'} set their own prices and keep all of them.`]);
  if (service === 'stays') {
    if (brand) out.push([`Is Cabana the same as Airbnb?`, `No. Cabana is independent and not affiliated with Airbnb. It works the same way, a furnished place booked by the night, but hosts pay no commission, the price you see is the full price, and you can pay by M-Pesa or card.`]);
    if (countrySlug === 'kenya') out.push([`Can I pay for a ${stayWords(countrySlug).term} in ${name} with M-Pesa?`, `Yes. Every stay on this page can be paid for by M-Pesa or card, at the all-in price shown.`]);
  }
  if (service === 'carhire') {
    const driver = items.filter(i => offersDriver(i)).length;
    out.push([`Can I hire a car in ${name} with a driver?`, driver
      ? `Yes. ${driver === n ? 'Every car here' : `${driver} of the ${n} cars here`} can come with a driver for a daily rate, or you can drive yourself.`
      : `The cars here are self-drive. If you would rather be driven, Cabana Rides has drivers by the hour.`]);
  }
  if (service === 'events') {
    const soon = items.filter(i => i.extra?.starts_at).sort((a, b) => Date.parse(a.extra.starts_at) - Date.parse(b.extra.starts_at)).slice(0, 3);
    if (soon.length) out.push([`What's on in ${name}?`, `Coming up: ${soon.map(i => i.title).join('; ')}. Every event on this page has tickets on sale now.`]);
  }
  if (service === 'tours' && n) {
    out.push([`What are some things to do in ${name}?`, `Here is what local operators run right now: ${items.slice(0, 3).map(i => i.title).join('; ')}. Each has real departures and prices on Cabana.`]);
  }
  out.push([`How do I book in ${full}?`, `Open any listing above, choose your ${service === 'events' ? 'tickets' : 'dates'} and pay by M-Pesa or card. APA, Cabana's assistant, can also find and book one for you in the chat.`]);
  return out;
}

/* ── For the console: what each service is found by ─────────────────── */

export function vocabulary() {
  const brand = brandTermsOn();
  return {
    brand_terms: brand,
    services: Object.keys(INTENT).map(service => ({
      service,
      intent: INTENT[service],
      kinds: KIND[service] || [],
      measured: EVIDENCE.filter(e => e.service === service),
    })),
    local: Object.entries(STYLE_OF).map(([country]) => ({ country, ...stayWords(country) })).concat([{ country: 'everywhere else', ...stayWords('') }]),
  };
}

export const __test = { INTENT, KIND, STOP, norm, fit, STAY_STYLE };
