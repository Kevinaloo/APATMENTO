/* ══════════════════════════════════════════════════════════════════════
   CABANA · BEACON PAGES
   api/lib/_seo-render.js

   The HTML a search engine reads for every live thing on Cabana. Pure
   functions: data in, a complete document out. No network, no globals,
   so every rule below is tested directly.

   WHAT A PAGE MUST DO TO RANK, AND WHAT IT MUST NEVER DO
   ──────────────────────────────────────────────────────
   It must answer the query on the page itself, in HTML, without running
   a line of script: what this is, where, for how many, what it costs, what
   it has, how to book it. It must say that in the title and the first
   paragraph, carry the schema that turns a blue link into a rich result,
   and link to the places around it so authority flows both ways.

   It must never claim what the data does not say. No rating without real
   reviews on the page. No "free cancellation" the host did not set. No
   amenity the host did not list. No street address, ever: the area is
   public, the door is not. Structured data that disagrees with the page,
   or with the price the visitor lands on, is how sites lose rich results
   for good.
   ══════════════════════════════════════════════════════════════════════ */
import { SITE, FAMILY, KIND_SERVICE, priceUsd } from './_catalogue.js';
import { hubFor, placeById } from './_places.js';

export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const json = v => JSON.stringify(v).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
const clip = (s, n) => { s = String(s ?? '').replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n - 1).replace(/[\s,.;:–-]+\S*$/, '') + '…' : s; };
const plural = (n, one, many) => `${n} ${n === 1 ? one : (many || one + 's')}`;

export const SERVICE = {
  stays:     { noun: 'Apartments & stays', short: 'Stays',       one: 'stay',       hub: '/apartments', hubLabel: 'All stays',      verb: 'Check dates & book' },
  roommates: { noun: 'Rooms to rent',      short: 'Rooms',       one: 'room',       hub: '/roommates',  hubLabel: 'All rooms',      verb: 'Message the host' },
  tours:     { noun: 'Tours & safaris',    short: 'Tours',       one: 'tour',       hub: '/tours',      hubLabel: 'All tours',      verb: 'Choose a date & book' },
  events:    { noun: 'Events',             short: 'Events',      one: 'event',      hub: '/events',     hubLabel: 'All events',     verb: 'Get tickets' },
  carhire:   { noun: 'Car hire',           short: 'Car hire',    one: 'car',        hub: '/carhire',    hubLabel: 'All car hire',   verb: 'Check dates & book' },
  food:      { noun: 'Restaurants & food', short: 'Food',        one: 'restaurant', hub: '/food',       hubLabel: 'All food',       verb: 'Order now' },
  shopping:  { noun: 'Shopping',           short: 'Shopping',    one: 'item',       hub: '/shopping',   hubLabel: 'All shopping',   verb: 'Buy on Cabana' },
};

const UNIT_LABEL = { night: 'night', month: 'month', meal: 'meal', item: 'item', person: 'person', group: 'group', ticket: 'ticket', day: 'day' };

export function money(amount, currency) {
  if (!(Number(amount) > 0)) return '';
  const n = Math.round(Number(amount));
  return `${currency || 'KES'} ${n.toLocaleString('en-KE')}`;
}

export function priceLine(item) {
  if (!(item.price > 0)) return '';
  return `${money(item.price, item.currency)} / ${UNIT_LABEL[item.unit] || item.unit}`;
}

/* Supabase serves resized images from the same object path. A phone on a
   3G connection should download 40 KB, not the host's 6 MB original. */
export function img(url, width, height) {
  const m = /^(https:\/\/[^/]+\/storage\/v1\/)object\/(public\/.+?)(\?.*)?$/.exec(url || '');
  if (!m) return url;
  return `${m[1]}render/image/${m[2]}?width=${width}${height ? `&height=${height}&resize=cover` : ''}&quality=72`;
}
function srcset(url, widths = [480, 800, 1200]) {
  if (!/\/storage\/v1\/object\//.test(url || '')) return '';
  return widths.map(w => `${img(url, w)} ${w}w`).join(', ');
}

function iso(d) { try { return new Date(d).toISOString(); } catch { return null; } }
function day(d) { const s = iso(d); return s ? s.slice(0, 10) : null; }

/* ── Copy that is true by construction ──────────────────────────────── */

function placePhrase(item) {
  const p = item.place || {};
  return [p.area?.name, p.city?.name].filter(Boolean).join(', ') || p.country?.name || item.city_raw || '';
}

function facts(item, d = {}) {
  const out = [];
  if (item.kind === 'stay' || item.kind === 'room') {
    if (item.bedrooms > 0) out.push(plural(item.bedrooms, 'bedroom'));
    else if (item.bedrooms === 0) out.push('Studio');
    if (item.baths > 0) out.push(plural(item.baths, 'bathroom'));
    if (item.guests > 0) out.push(`Sleeps ${item.guests}`);
  } else if (item.kind === 'tour') {
    if (d.duration || item.extra?.duration) out.push(d.duration || item.extra.duration);
    if (item.guests > 0) out.push(`Up to ${item.guests} people`);
  } else if (item.kind === 'car') {
    const c = d.car || item.extra || {};
    if (c.seats) out.push(`${c.seats} seats`);
    if (c.transmission) out.push(String(c.transmission).replace(/^./, x => x.toUpperCase()));
    if (c.fuel) out.push(String(c.fuel).replace(/^./, x => x.toUpperCase()));
    if (c.year) out.push(String(c.year));
  } else if (item.kind === 'event') {
    const s = d.starts_at || item.extra?.starts_at;
    if (s) out.push(eventDate(s));
    if (item.venue) out.push(item.venue);
  } else if (item.kind === 'food') {
    const cz = (d.restaurant?.cuisines || item.extra?.cuisines || []).slice(0, 2);
    if (cz.length) out.push(cz.join(' · '));
  }
  return out;
}

function eventDate(s) {
  try {
    return new Date(s).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Nairobi' });
  } catch { return ''; }
}

export function seoTitle(item) {
  const where = item.place?.area?.name || item.place?.city?.name || '';
  const has = where && item.title.toLowerCase().includes(where.toLowerCase());
  let core = item.title + (where && !has ? `, ${where}` : '');
  if (item.kind === 'event') {
    const s = item.extra?.starts_at;
    if (s) core += ` · ${new Date(s).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'Africa/Nairobi' })}`;
  }
  const brand = ' | Cabana';
  /* Too long with the place appended: drop the place before cutting the
     name. A cut title is cut at a word, never with an ellipsis; search
     engines add their own. */
  if (core.length + brand.length > 64) core = item.title + (item.kind === 'event' && core.includes(' · ') ? core.slice(core.lastIndexOf(' · ')) : '');
  if (core.length + brand.length > 64) core = core.slice(0, 64 - brand.length).replace(/[\s,.;:@·–-]+\S*$/, '');
  return core + brand;
}

export function metaDescription(item, d = {}) {
  const where = placePhrase(item);
  const f = facts(item, d);
  const amen = (item.amenities || []).slice(0, 3).join(', ');
  const price = item.price > 0 ? `${priceLine(item)}, all-in` : '';
  const who = item.host ? ` with ${item.host}` : '';
  const lead = {
    stay: `${item.type || 'Stay'} in ${where}`,
    room: `Room to rent in ${where}`,
    tour: `${item.type || 'Tour'} from ${where}`,
    event: `${item.type || 'Event'} in ${where}`,
    car: `${item.type || 'Car'} for hire in ${where}`,
    food: `Order from ${item.title} in ${where}`,
    shop: `${item.title}, ${where}`,
  }[item.kind] || item.title;
  const parts = [lead + (f.length ? ` · ${f.join(' · ')}` : '') + '.', amen ? `${amen}.` : '', price ? `${price}.` : '',
                 `Book direct${who} on Cabana. Zero commission.`];
  return clip(parts.filter(Boolean).join(' '), 158);
}

/* Questions people actually type, answered only from what the data says.
   A question whose answer we do not know is not asked. */
export function faqFor(item, d = {}) {
  const q = [];
  const name = item.title;
  const where = placePhrase(item);
  const amen = (item.amenities || []).map(a => a.toLowerCase());
  const lists = re => (item.amenities || []).filter(a => re.test(a));

  if (item.price > 0) {
    const unit = UNIT_LABEL[item.unit] || item.unit;
    const min = d.min_nights > 1 ? ` The minimum stay is ${plural(d.min_nights, 'night')}.` : '';
    q.push([`How much does ${name} cost?`, `${money(item.price, item.currency)} per ${unit} on Cabana. That is the all-in price: what you see is what you pay, with nothing added at checkout.${min}`]);
  }
  if ((item.kind === 'stay' || item.kind === 'room') && item.guests > 0) {
    const rooms = item.bedrooms > 0 ? ` across ${plural(item.bedrooms, 'bedroom')}` : '';
    const baths = item.baths > 0 ? ` and ${plural(item.baths, 'bathroom')}` : '';
    q.push([`How many guests can stay at ${name}?`, `Up to ${item.guests}${rooms}${baths}.`]);
  }
  const wifi = lists(/wi-?fi|internet/i), parking = lists(/parking/i);
  if (wifi.length || parking.length) {
    const both = [...wifi, ...parking].slice(0, 2).join(' and ');
    q.push([`Does ${name} have ${wifi.length && parking.length ? 'Wi-Fi and parking' : wifi.length ? 'Wi-Fi' : 'parking'}?`,
            `Yes. The host lists ${both} among ${plural(amen.length, 'amenity', 'amenities')}.`]);
  }
  if (d.checkin_time || d.checkout_time) {
    q.push([`What are the check-in and check-out times?`,
            [d.checkin_time && `Check-in from ${d.checkin_time}`, d.checkout_time && `check-out by ${d.checkout_time}`].filter(Boolean).join(', ') + '.']);
  }
  if (d.cancel_policy) {
    q.push([`What is the cancellation policy?`, `The host has set a ${String(d.cancel_policy).replace(/[_-]/g, ' ')} cancellation policy. The exact refund terms are shown before you pay, and a host cancellation is always refunded in full.`]);
  }
  if (item.kind === 'event' && (d.starts_at || item.extra?.starts_at)) {
    q.push([`When and where is ${name}?`, `${eventDate(d.starts_at || item.extra.starts_at)} (Nairobi time)${item.venue ? ` at ${item.venue}` : ''}${where ? `, ${where}` : ''}.`]);
  }
  if (item.kind === 'tour' && (d.meeting_point || d.start_point)) {
    q.push([`Where does ${name} start?`, `${d.meeting_point || d.start_point}.`]);
  }
  if (where && item.kind !== 'event') {
    q.push([`Where is ${name}?`, `In ${where}${item.place?.country?.name && !where.includes(item.place.country.name) ? `, ${item.place.country.name}` : ''}. The exact location is shared once you have booked.`]);
  }
  q.push([`How do I book ${name}?`, `Choose your dates on Cabana and pay by M-Pesa or card. Cabana takes no commission from ${item.host || 'the host'}, so you pay their own price, and APA, Cabana's assistant, is in the chat if you need anything.`]);
  return q;
}

/* ── Structured data ────────────────────────────────────────────────── */

const ORG = { '@type': 'Organization', '@id': `${SITE}/#organization`, name: 'Cabana', url: `${SITE}/`, logo: `${SITE}/cabana-icon-512.png` };
const WEBSITE = { '@type': 'WebSite', '@id': `${SITE}/#website`, url: `${SITE}/`, name: 'Cabana', publisher: { '@id': `${SITE}/#organization` } };

function address(item) {
  const p = item.place || {};
  return {
    '@type': 'PostalAddress',
    ...(p.city?.name ? { addressLocality: p.city.name } : item.city_raw ? { addressLocality: item.city_raw } : {}),
    ...(p.area?.name ? { addressRegion: p.area.name } : {}),
    ...(p.country?.iso ? { addressCountry: p.country.iso } : p.country?.name ? { addressCountry: p.country.name } : {}),
  };
}
function geo(item) {
  return item.lat != null && item.lng != null ? { '@type': 'GeoCoordinates', latitude: item.lat, longitude: item.lng } : undefined;
}
function offer(item, extra = {}) {
  if (!(item.price > 0)) return undefined;
  return {
    '@type': 'Offer', url: item.url, price: Math.round(item.price), priceCurrency: item.currency,
    availability: extra.soldOut ? 'https://schema.org/SoldOut' : 'https://schema.org/InStock',
    priceSpecification: { '@type': 'UnitPriceSpecification', price: Math.round(item.price), priceCurrency: item.currency, unitText: UNIT_LABEL[item.unit] || item.unit },
    ...(extra.validFrom ? { validFrom: extra.validFrom } : {}),
    ...(extra.businessFunction ? { businessFunction: extra.businessFunction } : {}),
  };
}

/* Ratings appear only when there are real reviews, and only alongside
   the reviews themselves, which are also printed on the page. */
function ratings(item, d) {
  const list = (d.review_list || []).filter(r => r.rating >= 1 && r.rating <= 5);
  if (!list.length || !(item.reviews >= 1) || !(item.rating > 0)) return {};
  return {
    aggregateRating: { '@type': 'AggregateRating', ratingValue: Number(item.rating).toFixed(1), reviewCount: item.reviews, bestRating: 5, worstRating: 1 },
    review: list.slice(0, 5).map(r => ({
      '@type': 'Review', reviewRating: { '@type': 'Rating', ratingValue: r.rating, bestRating: 5 },
      author: { '@type': 'Person', name: r.name || 'Guest' }, ...(r.text ? { reviewBody: r.text } : {}), ...(r.at ? { datePublished: day(r.at) } : {}),
    })),
  };
}

export function entitySchema(item, d = {}, crumbs = [], faq = []) {
  const images = (d.photos || item.photos || []).slice(0, 10);
  const id = `${item.url}#${item.kind}`;
  let main;
  if (item.kind === 'stay' || item.kind === 'room') {
    const unitType = /house|villa|bungalow|cottage|maisonette/i.test(item.type || '') ? 'House' : /room/i.test(item.type || '') || item.kind === 'room' ? 'Room' : 'Apartment';
    main = {
      '@type': 'LodgingBusiness', '@id': id, name: item.title, url: item.url,
      description: clip(d.description || metaDescription(item, d), 600), image: images,
      address: address(item), geo: geo(item),
      priceRange: priceLine(item) || undefined,
      amenityFeature: (d.amenities || item.amenities).slice(0, 30).map(name => ({ '@type': 'LocationFeatureSpecification', name, value: true })),
      ...(item.bedrooms > 0 ? { numberOfRooms: item.bedrooms } : {}),
      ...(typeof d.pets === 'boolean' ? { petsAllowed: d.pets } : {}),
      ...(typeof d.smoking === 'boolean' ? { smokingAllowed: d.smoking } : {}),
      ...(d.checkin_time ? { checkinTime: d.checkin_time } : {}),
      ...(d.checkout_time ? { checkoutTime: d.checkout_time } : {}),
      containsPlace: {
        '@type': unitType,
        ...(item.guests > 0 ? { occupancy: { '@type': 'QuantitativeValue', maxValue: item.guests } } : {}),
        ...(item.bedrooms > 0 ? { numberOfBedrooms: item.bedrooms } : {}),
        ...(item.baths > 0 ? { numberOfBathroomsTotal: item.baths } : {}),
        ...(d.size_sqm > 0 ? { floorSize: { '@type': 'QuantitativeValue', value: Number(d.size_sqm), unitCode: 'MTK' } } : {}),
      },
      makesOffer: offer(item),
      brand: { '@id': ORG['@id'] },
      ...ratings(item, d),
    };
  } else if (item.kind === 'tour') {
    const stops = Array.isArray(d.itinerary) ? d.itinerary.map(s => typeof s === 'string' ? s : (s && (s.title || s.name || s.place))).filter(Boolean).slice(0, 12) : [];
    main = {
      '@type': 'TouristTrip', '@id': id, name: item.title, url: item.url,
      description: clip(d.summary || d.description || metaDescription(item, d), 600), image: images,
      ...(stops.length ? { itinerary: { '@type': 'ItemList', itemListElement: stops.map((name, i) => ({ '@type': 'ListItem', position: i + 1, item: { '@type': 'Place', name } })) } } : {}),
      ...(item.host ? { provider: { '@type': 'Organization', name: d.host || item.host } } : {}),
      touristType: (item.amenities || []).slice(0, 3),
      offers: offer(item),
      ...ratings(item, d),
    };
  } else if (item.kind === 'event') {
    const start = d.starts_at || item.extra?.starts_at;
    const end = d.ends_at || item.extra?.ends_at;
    const lineup = Array.isArray(d.lineup) ? d.lineup.map(x => typeof x === 'string' ? x : (x && (x.name || x.title))).filter(Boolean).slice(0, 10) : [];
    main = {
      '@type': 'Event', '@id': id, name: item.title, url: item.url,
      description: clip(d.summary || d.description || metaDescription(item, d), 600), image: images,
      startDate: iso(start), ...(end ? { endDate: iso(end) } : {}),
      eventStatus: 'https://schema.org/EventScheduled',
      eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
      location: { '@type': 'Place', name: item.venue || placePhrase(item), address: address(item), ...(geo(item) ? { geo: geo(item) } : {}) },
      ...(item.host ? { organizer: { '@type': 'Organization', name: d.host || item.host } } : {}),
      ...(lineup.length ? { performer: lineup.map(name => ({ '@type': 'PerformingGroup', name })) } : {}),
      offers: offer(item, { soldOut: !!(d.sold_out || item.extra?.sold_out), validFrom: day(item.created_at) }),
    };
  } else if (item.kind === 'car') {
    const c = d.car || item.extra || {};
    main = {
      '@type': 'Car', '@id': id, name: item.title, url: item.url,
      description: clip(d.description || metaDescription(item, d), 600), image: images,
      ...(c.make ? { brand: { '@type': 'Brand', name: c.make } } : {}),
      ...(c.model ? { model: c.model } : {}),
      ...(c.year ? { vehicleModelDate: String(c.year) } : {}),
      ...(c.seats ? { vehicleSeatingCapacity: c.seats } : {}),
      ...(c.transmission ? { vehicleTransmission: c.transmission } : {}),
      ...(c.fuel ? { fuelType: c.fuel } : {}),
      ...(c.body ? { bodyType: c.body } : {}),
      offers: offer(item, { businessFunction: 'http://purl.org/goodrelations/v1#LeaseOut' }),
      ...ratings(item, d),
    };
  } else if (item.kind === 'food') {
    const r = d.restaurant || {};
    main = {
      '@type': 'Restaurant', '@id': id, name: item.title, url: item.url,
      description: clip(r.tagline || d.description || metaDescription(item, d), 600), image: images,
      address: address(item), geo: geo(item),
      ...(r.cuisines?.length ? { servesCuisine: r.cuisines } : {}),
      ...(item.price > 0 ? { priceRange: `${item.currency} ${Math.round(item.price).toLocaleString('en-KE')} average` } : {}),
      hasMenu: `${SITE}${item.app}`,
      ...ratings(item, d),
    };
  } else {
    main = {
      '@type': 'Product', '@id': id, name: item.title, url: item.url,
      description: clip(d.description || metaDescription(item, d), 600), image: images, offers: offer(item),
    };
  }

  const page = {
    '@type': 'WebPage', '@id': `${item.url}#webpage`, url: item.url, name: seoTitle(item), description: metaDescription(item, d),
    isPartOf: { '@id': WEBSITE['@id'] }, about: { '@id': id }, mainEntity: { '@id': id },
    breadcrumb: { '@id': `${item.url}#breadcrumb` }, inLanguage: 'en',
    ...(images[0] ? { primaryImageOfPage: { '@type': 'ImageObject', url: images[0] } } : {}),
    ...(item.created_at ? { datePublished: iso(item.created_at) } : {}),
    ...(item.updated_at ? { dateModified: iso(item.updated_at) } : {}),
  };
  const graph = [ORG, WEBSITE, page, breadcrumbSchema(item.url, crumbs), strip(main)];
  if (faq.length) {
    graph.push({ '@type': 'FAQPage', '@id': `${item.url}#faq`, mainEntity: faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) });
  }
  return { '@context': 'https://schema.org', '@graph': graph };
}

function strip(o) {
  if (Array.isArray(o)) return o.map(strip).filter(v => v !== undefined);
  if (o && typeof o === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(o)) {
      const s = strip(v);
      if (s === undefined || s === null || s === '' || (Array.isArray(s) && !s.length)) continue;
      out[k] = s;
    }
    return out;
  }
  return o;
}

function breadcrumbSchema(url, crumbs) {
  return {
    '@type': 'BreadcrumbList', '@id': `${url}#breadcrumb`,
    itemListElement: crumbs.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, ...(c.href ? { item: SITE + c.href } : {}) })),
  };
}

/* Home › Stays › Kenya › Nairobi › Kilimani › The page. Each step links to
   a page that exists: the static hub when there is one, the live hub
   otherwise. */
export function crumbsFor(item) {
  const svc = SERVICE[item.service] || SERVICE.stays;
  const out = [{ name: 'Cabana', href: '/' }, { name: svc.short, href: svc.hub }];
  const p = item.place || {};
  for (const level of [p.country, p.city, p.area]) {
    if (!level) continue;
    const hub = hubFor(level, item.service) || (level.kind === 'country' && level.pages?.travel ? { path: level.pages.travel } : null);
    out.push({ name: level.name, href: hub?.path || null });
  }
  out.push({ name: item.title, href: item.path });
  return out;
}

/* ── Shared chrome ──────────────────────────────────────────────────── */

const CSS = `*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{--bg:#FCFCFE;--card:#fff;--soft:#F5F5FC;--ink:#08080F;--ink2:#474A66;--ink3:#8B8EAC;--line:rgba(8,8,15,.08);--v:#6D28FF;--e:#4F6DFF;--m:#4EE0C8;--ok:#0E9F6E;
--fd:'Geist','Inter',system-ui,sans-serif;--fb:'Inter',system-ui,-apple-system,'Segoe UI',sans-serif;--r:18px;--ease:cubic-bezier(.22,1,.36,1)}
html{-webkit-text-size-adjust:100%}body{font-family:var(--fb);background:var(--bg);color:var(--ink);-webkit-font-smoothing:antialiased;line-height:1.55}
a{color:inherit;text-decoration:none}img{display:block;max-width:100%}:focus-visible{outline:2px solid var(--v);outline-offset:2px;border-radius:6px}
.nav{position:sticky;top:0;z-index:20;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px clamp(16px,4vw,32px);background:rgba(252,252,254,.88);backdrop-filter:blur(14px);border-bottom:1px solid var(--line)}
.nav-b{display:flex;align-items:center;gap:6px;font-size:13.5px;font-weight:600;color:var(--ink2)}.nav-logo{height:22px;width:auto}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;font-weight:700;font-size:14.5px;border-radius:999px;padding:13px 22px;transition:transform .25s var(--ease),box-shadow .25s}
.btn-p{color:#fff;background:linear-gradient(135deg,var(--v),var(--e));box-shadow:0 10px 26px rgba(109,40,255,.25)}.btn-p:hover{transform:translateY(-1px);box-shadow:0 14px 32px rgba(109,40,255,.32)}
.btn-g{background:var(--soft);color:var(--ink);border:1px solid var(--line)}.btn-s{padding:9px 16px;font-size:13px}
.wrap{max-width:1120px;margin:0 auto;padding:0 clamp(16px,4vw,32px)}
.crumbs{display:flex;flex-wrap:wrap;gap:6px;font-size:12.5px;color:var(--ink3);padding:16px 0 10px}.crumbs a{color:var(--ink2)}.crumbs a:hover{color:var(--v)}.crumbs span[aria-hidden]{opacity:.5}
.eyebrow{font-size:12px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:var(--v);margin-bottom:10px}
h1{font-family:var(--fd);font-weight:500;font-size:clamp(28px,4.4vw,44px);line-height:1.08;letter-spacing:-.02em}
.meta{display:flex;flex-wrap:wrap;gap:8px 14px;align-items:center;margin-top:12px;color:var(--ink2);font-size:14px}.meta b{color:var(--ink)}
.tick{display:inline-flex;align-items:center;gap:5px;color:var(--ok);font-weight:600}
.gal{display:grid;gap:8px;margin:22px 0 0;border-radius:var(--r);overflow:hidden;grid-template-columns:2fr 1fr 1fr;grid-template-rows:200px 200px;position:relative}
.gal img{width:100%;height:100%;object-fit:cover;background:var(--soft)}.gal .g0{grid-row:1/3}
.gal.n1{grid-template-columns:1fr;grid-template-rows:420px}.gal.n1 .g0{grid-row:auto}
.gal.n2{grid-template-columns:3fr 2fr;grid-template-rows:408px}.gal.n2 .g0{grid-row:auto}
.gal.n3{grid-template-columns:2fr 1fr}.gal.n4 .g3{grid-column:2/4}
.gal-n{position:absolute;right:12px;bottom:12px;background:rgba(8,8,15,.72);color:#fff;font-size:12.5px;font-weight:600;padding:7px 12px;border-radius:999px}
@media(max-width:760px){.gal{display:flex;overflow-x:auto;scroll-snap-type:x mandatory;grid-template-rows:none;border-radius:14px}.gal img{flex:0 0 86%;height:260px;scroll-snap-align:start;border-radius:14px}.gal .g0{grid-row:auto}}
.cols{display:grid;grid-template-columns:minmax(0,1fr) 340px;gap:40px;margin-top:28px;align-items:start}@media(max-width:900px){.cols{grid-template-columns:1fr;gap:24px}}
.sec{padding:26px 0;border-top:1px solid var(--line)}.sec:first-child{border-top:0;padding-top:0}
.sec h2{font-family:var(--fd);font-weight:500;font-size:clamp(19px,2.4vw,23px);letter-spacing:-.01em;margin-bottom:12px}
.sec p{color:var(--ink2);font-size:15.5px;margin-bottom:10px;white-space:pre-line}
.am{display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:10px}.am li{list-style:none;display:flex;gap:9px;align-items:center;font-size:14.5px;color:var(--ink2)}
.am li::before{content:'';width:7px;height:7px;border-radius:50%;background:linear-gradient(135deg,var(--v),var(--m));flex:none}
.facts{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));background:var(--card);border:1px solid var(--line);border-radius:14px;overflow:hidden}
.facts div{padding:13px 15px;border-right:1px solid var(--line);border-bottom:1px solid var(--line);margin:0 -1px -1px 0}.facts dt{font-size:12px;color:var(--ink3);font-weight:600;letter-spacing:.02em}.facts dd{font-size:15px;font-weight:600;margin-top:2px}
.book{position:sticky;top:78px;background:var(--card);border:1px solid var(--line);border-radius:22px;padding:22px;box-shadow:0 18px 50px rgba(8,8,15,.06)}
.price{font-family:var(--fd);font-size:28px;font-weight:600;letter-spacing:-.02em}.price small{font-size:14px;font-weight:500;color:var(--ink2)}
.allin{display:inline-block;margin-top:4px;font-size:12px;font-weight:600;color:var(--ok);background:rgba(14,159,110,.08);padding:3px 9px;border-radius:999px}
.book .btn{width:100%;margin-top:16px}.book ul{margin-top:16px;display:grid;gap:8px}.book li{list-style:none;font-size:13.5px;color:var(--ink2);display:flex;gap:8px}
.book li::before{content:'✓';color:var(--ok);font-weight:700}
.host{display:flex;gap:14px;align-items:center}.av{width:52px;height:52px;border-radius:50%;display:grid;place-items:center;font-family:var(--fd);font-weight:600;font-size:20px;color:#fff;background:linear-gradient(135deg,var(--v),var(--e));flex:none}
.rev{display:grid;gap:14px}.rev article{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:14px 16px}.rev b{font-size:14px}.rev p{font-size:14.5px;margin:6px 0 0}
.stars{color:#F5A524;letter-spacing:1px}
.faq details{border:1px solid var(--line);border-radius:14px;background:var(--card);margin-bottom:9px}.faq summary{cursor:pointer;list-style:none;padding:14px 16px;font-weight:600;font-size:15px;display:flex;justify-content:space-between;gap:12px}
.faq summary::-webkit-details-marker{display:none}.faq summary::after{content:'+';color:var(--v);font-size:20px;line-height:1}.faq details[open] summary::after{content:'–'}.faq details p{padding:0 16px 14px;margin:0;color:var(--ink2);font-size:14.5px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:16px}
.card{background:var(--card);border:1px solid var(--line);border-radius:18px;overflow:hidden;transition:transform .3s var(--ease),box-shadow .3s}.card:hover{transform:translateY(-3px);box-shadow:0 16px 40px rgba(8,8,15,.08)}
.card img,.card .ph{width:100%;height:auto;aspect-ratio:4/3;object-fit:cover;background:var(--soft)}
.card .ph{display:grid;place-items:center;font-family:var(--fd);font-size:34px;font-weight:600;color:rgba(109,40,255,.35);background:linear-gradient(135deg,#F1ECFF,#E8F9F6)}.card-b{padding:12px 14px 14px}.card-t{font-weight:600;font-size:15px;line-height:1.3}.card-s{font-size:13px;color:var(--ink3);margin-top:3px}.card-p{font-weight:700;font-size:14px;margin-top:8px}
.links{display:flex;flex-wrap:wrap;gap:8px}.links a{font-size:13.5px;font-weight:600;padding:8px 14px;border-radius:999px;background:var(--soft);border:1px solid var(--line);color:var(--ink2)}.links a:hover{color:var(--v);border-color:rgba(109,40,255,.3)}
.hero{padding:26px 0 8px}.hero p.sub{color:var(--ink2);font-size:16.5px;max-width:720px;margin-top:12px}
.chips{display:flex;flex-wrap:wrap;gap:10px;margin-top:18px}.chip{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:11px 16px}.chip b{display:block;font-family:var(--fd);font-size:17px}.chip span{font-size:12px;color:var(--ink3)}
.note{background:var(--soft);border:1px solid var(--line);border-radius:16px;padding:18px 20px;color:var(--ink2);font-size:15px}
.foot{margin-top:56px;background:#0B0B1A;color:rgba(255,255,255,.7);padding:40px 0 28px;font-size:13.5px}.foot .wrap{display:grid;gap:22px}.foot h3{color:#fff;font-size:14px;margin-bottom:8px}.foot nav{display:flex;flex-wrap:wrap;gap:8px 18px}.foot a:hover{color:#fff}.foot small{color:rgba(255,255,255,.45)}
.mbar{display:none}@media(max-width:900px){.book{position:static}.mbar{display:flex;position:fixed;left:0;right:0;bottom:0;z-index:30;gap:12px;align-items:center;justify-content:space-between;padding:10px 16px calc(10px + env(safe-area-inset-bottom));background:rgba(255,255,255,.96);backdrop-filter:blur(12px);border-top:1px solid var(--line)}.mbar .btn{padding:12px 18px}body{padding-bottom:76px}}
@media(prefers-reduced-motion:reduce){*{transition:none!important;animation:none!important}}`;

function head({ title, description, canonical, robots, image, imageAlt, schema, preload, extra = '' }) {
  return `<!doctype html><html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta name="robots" content="${robots}">
${canonical ? `<link rel="canonical" href="${esc(canonical)}">
<link rel="alternate" hreflang="en" href="${esc(canonical)}"><link rel="alternate" hreflang="x-default" href="${esc(canonical)}">` : ''}
<meta name="theme-color" content="#6D28FF"><meta name="application-name" content="Cabana">
<link rel="icon" href="/favicon.ico" sizes="any"><link rel="apple-touch-icon" href="/cabana-apple-touch-icon.png"><link rel="manifest" href="/manifest.json">
<meta property="og:site_name" content="Cabana"><meta property="og:type" content="website"><meta property="og:locale" content="en_KE">
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(description)}">
${canonical ? `<meta property="og:url" content="${esc(canonical)}">` : ''}
<meta property="og:image" content="${esc(image || SITE + '/og-home.jpg')}"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${esc(imageAlt || title)}">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:site" content="@apatmento"><meta name="twitter:title" content="${esc(title)}"><meta name="twitter:description" content="${esc(description)}"><meta name="twitter:image" content="${esc(image || SITE + '/og-home.jpg')}">
<link rel="preconnect" href="https://gfwgbgdvxtocwhilrtdw.supabase.co" crossorigin>
${preload || ''}${extra}
<style>${CSS}</style>
${schema ? `<script type="application/ld+json">${json(schema)}</script>` : ''}
</head>`;
}

function nav(svc, cta) {
  return `<header class="nav"><a class="nav-b" href="${svc.hub}"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>${esc(svc.hubLabel)}</a>
<a href="/" aria-label="Cabana home"><img class="nav-logo" src="/cabana-wordmark-color.png" alt="Cabana" width="96" height="22"></a>
${cta}</header>`;
}

function crumbsHtml(crumbs) {
  return `<nav class="crumbs" aria-label="Breadcrumb">${crumbs.map((c, i) => {
    const last = i === crumbs.length - 1;
    const label = esc(c.name);
    return (i ? '<span aria-hidden="true">›</span>' : '') + (c.href && !last ? `<a href="${esc(c.href)}">${label}</a>` : `<span${last ? ' aria-current="page"' : ''}>${label}</span>`);
  }).join('')}</nav>`;
}

function footer() {
  const svc = [['Stays', '/apartments'], ['Tours & safaris', '/tours'], ['Car hire', '/carhire'], ['Events', '/events'], ['Rides', '/rides'], ['Food', '/food'], ['Flights', '/flights'], ['Rooms', '/roommates']];
  const more = [['Destinations', '/destinations'], ['List your property', '/become-partner'], ['Become a driver', '/become-driver'], ['About Cabana', '/cabana'], ['Help', '/help'], ['Terms', '/terms'], ['Privacy', '/privacy']];
  return `<footer class="foot"><div class="wrap">
<div><h3>Book on Cabana</h3><nav>${svc.map(([t, h]) => `<a href="${h}">${t}</a>`).join('')}</nav></div>
<div><h3>Cabana</h3><nav>${more.map(([t, h]) => `<a href="${h}">${t}</a>`).join('')}</nav></div>
<small>Cabana is Africa's zero-commission travel platform. Hosts and operators keep 100% of their price; guests see one all-in price before they pay.</small>
</div></footer>`;
}

const SCRIPTS = `<script src="/cabana-support.js" defer></script><script src="/cabana-compass.js" defer></script>`;

function cardHtml(it) {
  const ph = it.photos[0];
  return `<a class="card" href="${esc(it.path)}">${ph ? `<img src="${esc(img(ph, 520, 390))}" alt="${esc(it.title)}" loading="lazy" decoding="async" width="520" height="390">` : `<div class="ph" aria-hidden="true">${esc(it.title.charAt(0))}</div>`}
<div class="card-b"><div class="card-t">${esc(it.title)}</div><div class="card-s">${esc([it.type, it.location].filter(Boolean).join(' · '))}</div>${it.price > 0 ? `<div class="card-p">${esc(priceLine(it))}</div>` : ''}</div></a>`;
}

/* A factual paragraph written from the data, so a page whose host wrote
   one line still says what it is, where, for whom and for how much. */
export function summarise(item, d = {}, where = placePhrase(item), unit = UNIT_LABEL[item.unit] || item.unit) {
  const soft = x => /^[A-Z][a-z]/.test(x) ? x.charAt(0).toLowerCase() + x.slice(1) : x;
  const f = facts(item, d).map(soft);
  const price = item.price > 0 ? ` It is ${money(item.price, item.currency)} per ${unit}, all-in.` : '';
  const verified = item.host_verified ? ', a verified Cabana partner' : '';
  const acronym = /^(suv|mpv|bnb|4x4)$/i.test(item.type || '');
  const type = acronym ? String(item.type).toUpperCase() : (item.type || '').toLowerCase();
  const a = /^[aeiou]/i.test(type) || /^(SUV|MPV)$/.test(type) ? 'an' : 'a';
  switch (item.kind) {
    case 'event': {
      const when = d.starts_at || item.extra?.starts_at;
      return `${item.title} is on ${when ? eventDate(when) : 'a date shown on Cabana'}${item.venue ? ` at ${item.venue}` : ''}${where ? `, ${where}` : ''}.` +
        (item.price > 0 ? ` Tickets are from ${money(item.price, item.currency)}, all-in.` : '') +
        (item.host ? ` Organised by ${item.host}${verified}.` : '');
    }
    case 'tour':
      return `${item.title} is ${type ? `${a} ${type.replace(/-/g, ' ')}` : 'a tour'}${where ? ` from ${where}` : ''}${f.length ? `: ${f.join(', ')}` : ''}.${price}` +
        (item.host ? ` Run by ${item.host}${verified}.` : '');
    case 'car':
      return `${item.title} is ${type ? `${a} ${type}` : 'a car'} for hire${where ? ` in ${where}` : ''}${f.length ? `: ${f.join(', ')}` : ''}.${price}` +
        (item.host ? ` Offered by ${item.host}${verified}.` : '');
    case 'food':
      return `${item.title} serves ${f.length ? f.join(', ') : 'food'}${where ? ` in ${where}` : ''}. Order on Cabana and pay the kitchen its own price.`;
    default:
      return `${item.title} is ${type ? `${a} ${type}` : 'a place to stay'}${where ? ` in ${where}` : ''}${f.length ? `: ${f.join(', ')}` : ''}.${price}` +
        (item.host ? ` Hosted by ${item.host}${verified}.` : '');
  }
}

/* ── The entity page ────────────────────────────────────────────────── */

export function renderEntity(item, detail = {}, { related = [], nearbyHubs = [] } = {}) {
  const d = { ...detail };
  const svc = SERVICE[item.service] || SERVICE.stays;
  const crumbs = crumbsFor(item);
  const faq = faqFor(item, d);
  const photos = (d.photos?.length ? d.photos : item.photos).filter(u => /^https:\/\//.test(u));
  const title = seoTitle(item);
  const description = metaDescription(item, d);
  const robots = item.quality.indexable ? 'index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1' : 'noindex, follow';
  const og = photos[0] ? img(photos[0], 1200, 630) : null;
  const hero = photos[0];
  const preload = hero ? `<link rel="preload" as="image" href="${esc(img(hero, 1200))}"${srcset(hero) ? ` imagesrcset="${esc(srcset(hero))}" imagesizes="(max-width:760px) 86vw, 60vw"` : ''} fetchpriority="high">\n` : '';
  const book = `${SITE}${item.app}${item.app.includes('?') ? '&' : '?'}utm_source=beacon&utm_medium=organic&utm_campaign=${item.kind}`;
  const where = placePhrase(item);
  const f = facts(item, d);
  const amenities = (d.amenities?.length ? d.amenities : item.amenities).map(a => typeof a === 'string' ? a : (a && (a.name || a.title))).filter(Boolean);
  const reviews = (d.review_list || []).filter(r => r.rating >= 1);
  const unit = UNIT_LABEL[item.unit] || item.unit;

  const detailRows = [];
  const push = (k, v) => { if (v != null && v !== '' && v !== false) detailRows.push([k, v]); };
  if (item.kind === 'stay' || item.kind === 'room') {
    push('Property type', item.type);
    push('Bedrooms', item.bedrooms === 0 ? 'Studio' : item.bedrooms);
    push('Bathrooms', item.baths);
    push('Guests', item.guests);
    push('Size', d.size_sqm > 0 ? `${Math.round(d.size_sqm)} m²` : null);
    push('Check-in', d.checkin_time ? `From ${d.checkin_time}` : null);
    push('Check-out', d.checkout_time ? `By ${d.checkout_time}` : null);
    push('Minimum stay', d.min_nights > 1 ? plural(d.min_nights, 'night') : d.min_nights === 1 ? '1 night' : null);
    push('Cancellation', d.cancel_policy ? String(d.cancel_policy).replace(/[_-]/g, ' ').replace(/^./, x => x.toUpperCase()) : null);
    push('Pets', typeof d.pets === 'boolean' ? (d.pets ? 'Allowed' : 'Not allowed') : null);
    push('Smoking', typeof d.smoking === 'boolean' ? (d.smoking ? 'Allowed' : 'Not allowed') : null);
    push('Children', typeof d.children === 'boolean' ? (d.children ? 'Welcome' : 'Not suitable') : null);
    push('Instant booking', d.instant_book ? 'Yes' : null);
    push('Weekly rate', d.price_week > 0 ? money(d.price_week, item.currency) + ' (host rate)' : null);
  } else if (item.kind === 'tour') {
    push('Duration', d.duration || item.extra?.duration);
    push('Group size', d.group_min || item.guests ? `${d.group_min || 1}–${item.guests || '?'} people` : null);
    push('Schedule', d.schedule ? String(d.schedule).replace(/_/g, ' ') : null);
    push('Next departure', d.next_departure || item.extra?.next_departure);
    push('Departs', d.departure_time);
    push('Meeting point', d.meeting_point);
    push('Languages', Array.isArray(d.languages) ? d.languages.join(', ') : null);
    push('Child price', d.child_price > 0 ? money(d.child_price, item.currency) : null);
  } else if (item.kind === 'event') {
    push('Starts', d.starts_at ? eventDate(d.starts_at) : null);
    push('Ends', d.ends_at ? eventDate(d.ends_at) : null);
    push('Doors', d.doors_at ? eventDate(d.doors_at) : null);
    push('Venue', item.venue);
    push('Age', d.age_limit);
    push('Dress code', d.dress_code);
  } else if (item.kind === 'car') {
    const c = d.car || {};
    push('Make & model', [c.make, c.model, c.variant].filter(Boolean).join(' '));
    push('Year', c.year); push('Seats', c.seats); push('Transmission', c.transmission); push('Fuel', c.fuel);
    push('Drive', c.drive); push('Body', c.body); push('Air conditioning', c.aircon ? 'Yes' : null);
    push('Ground clearance', c.clearance_mm ? `${c.clearance_mm} mm` : null);
    push('Minimum hire', c.min_days > 1 ? plural(c.min_days, 'day') : null);
    push('Minimum driver age', c.min_age);
    push('Cross-border', c.cross_border ? 'Allowed' : null);
    push('Delivery', c.delivery ? 'Available' : null);
  } else if (item.kind === 'food') {
    const r = d.restaurant || {};
    push('Cuisine', (r.cuisines || []).join(', '));
    push('Opens', r.opens_at && r.closes_at ? `${r.opens_at}–${r.closes_at}` : r.opens_at);
    push('Days', (r.open_days || []).join(', '));
    push('Delivery', r.delivery ? (r.delivery_mins ? `About ${r.delivery_mins} min` : 'Yes') : null);
    push('Pickup', r.pickup ? 'Yes' : null);
    push('Dine-in', r.dine_in ? 'Yes' : null);
    push('Halal', r.halal ? 'Yes' : null);
  }

  const about = String(d.description || '').trim();
  const autoAbout = summarise(item, d, where, unit);

  const listOf = (title, arr) => Array.isArray(arr) && arr.length ? `<section class="sec"><h2>${title}</h2><ul class="am">${arr.map(x => `<li>${esc(typeof x === 'string' ? x : (x && (x.title || x.name || x.text)) || '')}</li>`).join('')}</ul></section>` : '';

  const entityJson = {
    kind: item.kind, id: item.id, key: item.key, service: item.service, title: item.title,
    place: { area: item.place?.area?.id || null, city: item.place?.city?.id || null, country: item.place?.country?.id || null },
    price: item.price, currency: item.currency, price_usd: priceUsd(item), unit: item.unit,
    bedrooms: item.bedrooms, guests: item.guests, type: item.type, amenities: amenities.slice(0, 12),
  };

  const body = `<body>
${nav(svc, `<a class="btn btn-p btn-s" href="${esc(book)}" rel="nofollow">${esc(svc.verb)}</a>`)}
<main class="wrap">
${crumbsHtml(crumbs)}
<div class="eyebrow">${esc([item.type || svc.one, where].filter(Boolean).join(' · '))}</div>
<h1>${esc(item.title)}</h1>
<div class="meta">${f.map(x => `<span>${esc(x)}</span>`).join('')}${item.rating > 0 && item.reviews > 0 && reviews.length ? `<span><span class="stars" aria-hidden="true">★</span> <b>${Number(item.rating).toFixed(1)}</b> · ${plural(item.reviews, 'review')}</span>` : ''}${item.host_verified ? '<span class="tick">✓ Verified partner</span>' : ''}</div>
${photos.length ? `<div class="gal n${Math.min(photos.length, 5)}">${photos.slice(0, 5).map((u, i) => `<img class="g${i}" src="${esc(img(u, i ? 600 : 1200))}"${i === 0 && srcset(u) ? ` srcset="${esc(srcset(u))}" sizes="(max-width:760px) 86vw, 60vw"` : ''} alt="${esc(`${item.title}${where ? ', ' + where : ''} — photo ${i + 1}`)}" ${i ? 'loading="lazy"' : 'fetchpriority="high"'} decoding="async" width="${i ? 600 : 1200}" height="${i ? 400 : 800}">`).join('')}${photos.length > 5 ? `<a class="gal-n" href="${esc(book)}" rel="nofollow">+${photos.length - 5} photos</a>` : ''}</div>` : ''}
<div class="cols"><div>
<section class="sec"><h2>About ${esc(item.kind === 'event' ? 'this event' : item.kind === 'tour' ? 'this tour' : item.kind === 'car' ? 'this car' : 'this place')}</h2>
${d.summary ? `<p><b>${esc(d.summary)}</b></p>` : ''}<p>${esc(about.length >= 40 ? about : autoAbout)}</p>${about.length >= 40 ? `<p>${esc(autoAbout)}</p>` : ''}</section>
${amenities.length ? `<section class="sec"><h2>${item.kind === 'tour' ? 'Highlights' : item.kind === 'car' ? 'Features' : item.kind === 'event' ? 'Good to know' : 'What this place offers'}</h2><ul class="am">${amenities.slice(0, 40).map(a => `<li>${esc(a)}</li>`).join('')}</ul></section>` : ''}
${listOf('Included', d.includes)}${listOf('Not included', d.excludes)}${listOf('Itinerary', d.itinerary)}${listOf('What to bring', d.what_to_bring)}
${Array.isArray(d.tiers) && d.tiers.length ? `<section class="sec"><h2>Tickets</h2><dl class="facts">${d.tiers.map(t => `<div><dt>${esc(t.name || 'Ticket')}</dt><dd>${esc(Number(t.price) > 0 ? money(t.price, item.currency) + ' (organiser price)' : 'See price')}</dd></div>`).join('')}</dl></section>` : ''}
${detailRows.length ? `<section class="sec"><h2>The details</h2><dl class="facts">${detailRows.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl></section>` : ''}
${d.house_rules ? `<section class="sec"><h2>House rules</h2><p>${esc(d.house_rules)}</p></section>` : ''}
${where ? `<section class="sec"><h2>Where you'll be</h2><p>${esc(item.kind === 'event' && item.venue ? `${item.venue}, ${where}.` : `${where}${item.place?.country?.name && !where.includes(item.place.country.name) ? ', ' + item.place.country.name : ''}.`)} ${item.kind === 'event' ? '' : 'The exact location is shared once you have booked, so the address is only ever seen by guests.'}</p>${nearbyHubs.length ? `<div class="links">${nearbyHubs.map(h => `<a href="${esc(h.path)}">${esc(h.label)}</a>`).join('')}</div>` : ''}</section>` : ''}
${reviews.length ? `<section class="sec"><h2>${plural(reviews.length, 'review')} from guests</h2><div class="rev">${reviews.map(r => `<article><b>${esc(r.name || 'Guest')}</b> <span class="stars" aria-label="${r.rating} out of 5">${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}</span>${r.text ? `<p>${esc(r.text)}</p>` : ''}${r.reply ? `<p><b>Host reply:</b> ${esc(r.reply)}</p>` : ''}</article>`).join('')}</div></section>` : ''}
${item.host ? `<section class="sec"><h2>${item.kind === 'stay' || item.kind === 'room' ? 'Your host' : 'Who runs it'}</h2><div class="host"><div class="av" aria-hidden="true">${esc(item.host[0])}</div><div><b>${esc(d.host || item.host)}</b>${item.host_verified ? ' <span class="tick">✓ Verified</span>' : ''}<p style="margin:4px 0 0">${esc(d.host_tagline || `Booked direct through Cabana. ${item.host} keeps 100% of the price; Cabana takes no commission.`)}</p></div></div></section>` : ''}
<section class="sec faq"><h2>Questions people ask</h2>${faq.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('')}</section>
</div>
<aside class="book" aria-label="Book">
${item.price > 0 ? `<div class="price">${esc(money(item.price, item.currency))} <small>/ ${esc(unit)}</small></div><span class="allin">All-in price · nothing added at checkout</span>` : `<div class="price" style="font-size:20px">${item.kind === 'event' ? 'Tickets on Cabana' : 'See price on Cabana'}</div>`}
<a class="btn btn-p" href="${esc(book)}" rel="nofollow">${esc(svc.verb)}</a>
<button class="btn btn-g" type="button" data-cbn-support data-cbn-prefill="${esc(`I'm looking at ${item.title}${where ? ' in ' + where : ''}. `)}" style="width:100%;margin-top:10px">Ask APA about it</button>
<ul><li>Pay by M-Pesa or card</li><li>Zero commission: the host's own price</li><li>APA and a real team on hand, 24/7</li></ul>
</aside></div>
${related.length ? `<section class="sec" style="margin-top:20px"><h2>More ${esc((SERVICE[item.service] || svc).noun.toLowerCase())}${item.place?.city ? ` in ${esc(item.place.city.name)}` : ''}</h2><div class="grid">${related.map(cardHtml).join('')}</div></section>` : ''}
</main>
<div class="mbar">${item.price > 0 ? `<div><b>${esc(money(item.price, item.currency))}</b> <small style="color:var(--ink2)">/ ${esc(unit)} · all-in</small></div>` : '<div></div>'}<a class="btn btn-p" href="${esc(book)}" rel="nofollow">${esc(svc.verb)}</a></div>
${footer()}
<script type="application/json" id="cbn-entity">${json(entityJson)}</script>
${SCRIPTS}
</body></html>`;

  return head({
    title, description, canonical: item.url, robots, image: og, imageAlt: `${item.title}${where ? ', ' + where : ''}`,
    schema: entitySchema(item, { ...d, photos }, crumbs, faq), preload,
    extra: item.lat != null ? `<meta name="geo.placename" content="${esc(where)}"><meta name="geo.position" content="${item.lat};${item.lng}">\n` : '',
  }) + body;
}

/* ── A place hub: every live thing of one kind in one place ─────────── */

export function hubIndexable(items) {
  return items.filter(i => i.quality.indexable).length >= 2;
}

export function renderHub({ place, service, items, siblings = [], parentHub = null, canonicalPath }) {
  const svc = SERVICE[service] || SERVICE.stays;
  const name = place.name;
  const parent = place.parent ? placeById(place.parent) : null;
  const full = parent && parent.kind !== 'country' && parent.kind !== 'continent' ? `${name}, ${parent.name}` : name;
  const url = SITE + canonicalPath;
  const prices = items.map(i => i.price).filter(p => p > 0).sort((a, b) => a - b);
  const cur = items[0]?.currency || 'KES';
  const unit = UNIT_LABEL[items[0]?.unit] || 'night';
  const band = prices.length ? (prices[0] === prices[prices.length - 1] ? money(prices[0], cur) : `${money(prices[0], cur)}–${money(prices[prices.length - 1], cur)}`) : '';
  const nounLower = svc.noun.toLowerCase();
  const title = clip(`${svc.noun} in ${full}`, 54) + ' | Cabana';
  const count = items.length;
  const description = clip(`${plural(count, svc.one)} live on Cabana in ${full}${band ? `, from ${money(prices[0], cur)} per ${unit} all-in` : ''}. Book direct with local hosts and operators. Zero commission, M-Pesa and card.`, 158);
  const robots = hubIndexable(items) ? 'index, follow, max-snippet:-1, max-image-preview:large' : 'noindex, follow';
  const amen = new Map();
  for (const it of items) for (const a of it.amenities) amen.set(a, (amen.get(a) || 0) + 1);
  const topAmen = [...amen.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([a]) => a);
  const crumbs = [{ name: 'Cabana', href: '/' }, { name: svc.short, href: svc.hub }];
  if (parentHub) crumbs.push({ name: parentHub.name, href: parentHub.path });
  crumbs.push({ name: full, href: canonicalPath });

  const faq = [
    [`How many ${nounLower} are there in ${full} on Cabana?`, `${plural(count, svc.one)} ${count === 1 ? 'is' : 'are'} live right now. This page updates itself as hosts publish, so it always shows what you can actually book.`],
    ...(band ? [[`How much do ${nounLower} in ${full} cost?`, `From ${band} per ${unit} on Cabana, all-in. Hosts set their own prices and keep all of them.`]] : []),
    [`How do I book in ${full}?`, `Open any listing above, pick your dates and pay by M-Pesa or card. APA, Cabana's assistant, can also find and book one for you in the chat.`],
  ];
  const schema = {
    '@context': 'https://schema.org', '@graph': [ORG, WEBSITE,
      { '@type': 'CollectionPage', '@id': `${url}#webpage`, url, name: title, description, isPartOf: { '@id': WEBSITE['@id'] }, inLanguage: 'en',
        breadcrumb: { '@id': `${url}#breadcrumb` }, mainEntity: { '@id': `${url}#list` } },
      { '@type': 'ItemList', '@id': `${url}#list`, numberOfItems: count, itemListElement: items.slice(0, 50).map((it, i) => ({ '@type': 'ListItem', position: i + 1, url: it.url, name: it.title })) },
      breadcrumbSchema(url, crumbs),
      { '@type': 'FAQPage', '@id': `${url}#faq`, mainEntity: faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) }],
  };
  const ogPhoto = items.find(i => i.photos[0])?.photos[0];

  const body = `<body>
${nav(svc, `<a class="btn btn-p btn-s" href="${esc(svc.hub)}?q=${encodeURIComponent(name)}">Search ${esc(name)}</a>`)}
<main class="wrap">
${crumbsHtml(crumbs)}
<header class="hero"><div class="eyebrow">${esc(svc.noun)} · Live on Cabana</div>
<h1>${esc(svc.noun)} in ${esc(full)}</h1>
<p class="sub">${esc(`${plural(count, svc.one)} you can book right now in ${full}${band ? `, from ${band} per ${unit}, all-in` : ''}. Every one is booked direct with the host or operator, who keeps 100% of the price.`)}</p>
<div class="chips"><div class="chip"><b>${count}</b><span>live now</span></div>${band ? `<div class="chip"><b>${esc(band)}</b><span>per ${esc(unit)}, all-in</span></div>` : ''}<div class="chip"><b>0%</b><span>commission</span></div></div></header>
<section class="sec" style="border:0"><div class="grid">${items.map(cardHtml).join('')}</div></section>
${topAmen.length ? `<section class="sec"><h2>What places here commonly offer</h2><ul class="am">${topAmen.map(a => `<li>${esc(a)}</li>`).join('')}</ul></section>` : ''}
${siblings.length ? `<section class="sec"><h2>Nearby on Cabana</h2><div class="links">${siblings.map(s => `<a href="${esc(s.path)}">${esc(s.label)}</a>`).join('')}</div></section>` : ''}
<section class="sec faq"><h2>Questions people ask</h2>${faq.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('')}</section>
<section class="sec"><div class="note">Have a place or a service in ${esc(name)}? <a href="/become-partner" style="color:var(--v);font-weight:700">List it on Cabana</a>. It is free, you keep 100% of every booking, and it appears on this page the moment it goes live.</div></section>
</main>
${footer()}
<script type="application/json" id="cbn-entity">${json({ kind: 'hub', service, place: place.id, count })}</script>
${SCRIPTS}
</body></html>`;
  return head({ title, description, canonical: url, robots, image: ogPhoto ? img(ogPhoto, 1200, 630) : null, imageAlt: title, schema }) + body;
}

/* ── Gone, and not found ───────────────────────────────────────────── */

export function renderGone({ detail = {}, kind, hubs = [], related = [] }) {
  const svc = SERVICE[KIND_SERVICE[kind]] || SERVICE.stays;
  const name = detail.title || `This ${svc.one}`;
  return head({ title: `${clip(name, 50)} is no longer on Cabana`, description: `${name} is no longer available on Cabana. Here is what is live nearby.`, robots: 'noindex, follow' }) + `<body>
${nav(svc, `<a class="btn btn-p btn-s" href="${svc.hub}">Browse ${esc(svc.short.toLowerCase())}</a>`)}
<main class="wrap"><header class="hero"><div class="eyebrow">No longer available</div><h1>${esc(name)} has left Cabana</h1>
<p class="sub">The ${esc(svc.one)} you followed a link to is not taking bookings any more. Everything below is live right now.</p></header>
${hubs.length ? `<div class="links">${hubs.map(h => `<a href="${esc(h.path)}">${esc(h.label)}</a>`).join('')}</div>` : ''}
${related.length ? `<section class="sec" style="border:0;margin-top:18px"><div class="grid">${related.map(cardHtml).join('')}</div></section>` : ''}
</main>${footer()}${SCRIPTS}</body></html>`;
}

export function renderMissing(kind) {
  const svc = SERVICE[KIND_SERVICE[kind]] || SERVICE.stays;
  return head({ title: 'Not found | Cabana', description: 'This page does not exist on Cabana.', robots: 'noindex, follow' }) + `<body>
${nav(svc, `<a class="btn btn-p btn-s" href="${svc.hub}">Browse ${esc(svc.short.toLowerCase())}</a>`)}
<main class="wrap"><header class="hero"><div class="eyebrow">404</div><h1>We could not find that page</h1>
<p class="sub">It may have been mistyped, or it may never have existed. <a href="${svc.hub}" style="color:var(--v);font-weight:700">See everything live in ${esc(svc.short.toLowerCase())}</a>, or ask APA in the corner.</p></header></main>
${footer()}${SCRIPTS}</body></html>`;
}

/* ── The live sitemap ──────────────────────────────────────────────── */

export function renderSitemap(entries) {
  const xmlEsc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]));
  return '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n' +
    entries.map(e => `  <url>\n    <loc>${xmlEsc(e.loc)}</loc>${e.lastmod ? `\n    <lastmod>${xmlEsc(e.lastmod)}</lastmod>` : ''}` +
      (e.images || []).slice(0, 8).map(i => `\n    <image:image><image:loc>${xmlEsc(i.loc)}</image:loc>${i.title ? `<image:title>${xmlEsc(i.title)}</image:title>` : ''}</image:image>`).join('') +
      '\n  </url>').join('\n') + '\n</urlset>\n';
}

export const __test = { facts, placePhrase, strip, CSS };
