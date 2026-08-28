/* Boots apartments.html under jsdom with a stubbed Supabase and asserts the
   new photo-first card renders, carousels and stays wired. */
const fs = require('fs'), { JSDOM, VirtualConsole } = require('jsdom');

const errs = [], warns = [];
const vc = new VirtualConsole();
vc.on('jsdomError', e => errs.push(e.message));
vc.on('error', (...a) => warns.push(a.join(' ')));

let html = fs.readFileSync('apartments.html', 'utf8')
  .replace(/<script src="https?:\/\/[^"]*"[^>]*><\/script>/g, '');

const SB = 'https://gfwgbgdvxtocwhilrtdw.supabase.co/storage/v1/object/public/listings/';
const L = [
  { id: 'l1', title: 'Shikaz Homes 1 Bedroom', location: 'Syokimau, Nairobi, Kenya', area: 'Syokimau', city: 'Nairobi',
    price_night: 3000, beds: 1, baths: 1, max_guests: 3, service: 'stays', type: 'Apartment', is_active: true,
    photos: [SB + 'a-0.jpg', SB + 'a-1.jpg', SB + 'a-2.jpg', SB + 'a-3.jpg'], latitude: -1.35, longitude: 36.92 },
  { id: 'l2', title: 'The Jets Nest', location: 'Njiru, Nairobi', area: 'Njiru', city: 'Nairobi',
    price_night: 1750, beds: 1, baths: 1, max_guests: 3, service: 'stays', type: 'Apartment', is_active: true,
    photos: [], latitude: -1.26, longitude: 36.93 },
];

const chain = () => {
  const o = {};
  ['select', 'eq', 'order', 'limit', 'gte', 'ilike', 'in', 'neq'].forEach(k => o[k] = () => o);
  o.then = r => Promise.resolve({ data: L, error: null }).then(r);
  return o;
};

const dom = new JSDOM(html, {
  runScripts: 'dangerously', url: 'https://cabana.africa/apartments.html',
  pretendToBeVisual: true, virtualConsole: vc,
  beforeParse(w) {
    w.supabase = { createClient: () => ({
      auth: { getSession: () => Promise.resolve({ data: { session: null } }), onAuthStateChange() {} },
      from: () => chain(),
    }) };
    w.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
    w.IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} };
    w.scrollTo = () => {};
    w.fetch = () => Promise.resolve({ ok: false, json: () => Promise.resolve({}) });
    Object.defineProperty(w.Image.prototype, 'src', {
      set(v) { this._src = v; setTimeout(() => this.onerror && this.onerror(), 0); },
      get() { return this._src; },
    });
  },
});

const w = dom.window;
w.document.dispatchEvent(new w.Event('DOMContentLoaded', { bubbles: true }));

setTimeout(() => {
  const d = w.document;
  const cards = d.querySelectorAll('#grid .card:not(.sk)');
  const c0 = cards[0];
  let pass = true;
  const ok = (n, c, x) => { console.log('  ' + (c ? '\u2713' : '\u2717') + ' ' + n + (c ? '' : '  \u2192 ' + (x || ''))); pass = pass && !!c; };

  ok('no uncaught errors', errs.length === 0, errs.join(' | '));
  ok('cards rendered', cards.length === 2, cards.length);
  if (!c0) { console.log('\n\u274c FAIL (no cards)'); process.exit(1); }

  ok('photo rail present', !!c0.querySelector('.card-media .card-rail'));
  ok('one slide per photo', c0.querySelectorAll('.card-slide').length === 4,
    c0.querySelectorAll('.card-slide').length);
  ok('only the first photo is fetched up front', c0.querySelectorAll('.card-slide img').length === 1,
    c0.querySelectorAll('.card-slide img').length);
  ok('remaining photos deferred', c0.querySelectorAll('.card-slide[data-pending]').length === 3);
  ok('multi-photo card flagged', c0.querySelector('.card-media').classList.contains('has-many'));
  ok('progress rail sized to photo count',
    /width:\s*25\./.test(c0.querySelector('.card-prog-fill').getAttribute('style') || ''),
    c0.querySelector('.card-prog-fill').getAttribute('style'));
  ok('arrows rendered', c0.querySelectorAll('.card-arr').length === 2);
  ok('prev arrow starts disabled', c0.querySelector('.card-arr-prev').disabled);
  ok('single-photo card has no carousel chrome',
    !cards[1].querySelector('.card-media').classList.contains('has-many')
    && cards[1].querySelectorAll('.card-arr').length === 0);

  ok('heart on the photo', !!c0.querySelector('.card-media .card-heart'));
  ok('price is the loud element', /KES\s3,000/.test(c0.querySelector('.card-price .val').textContent));
  ok('no-fee mark present', !!c0.querySelector('.card-price .free'));
  ok('unrated listing reads as New', !!c0.querySelector('.card-new'));
  const link = c0.querySelector('.card-link');
  ok('listing title is a real link', !!link && /\?open=l1$/.test(link.getAttribute('href')),
    link && link.getAttribute('href'));
  ok('link carries a full accessible name',
    (link.getAttribute('aria-label') || '').includes('Shikaz')
    && (link.getAttribute('aria-label') || '').includes('KES 3,000'));

  const head = d.querySelector('.results-count');
  ok('listing count is not visible', d.getElementById('result-num').hasAttribute('hidden'));
  ok('heading reads as a sentence', /^Stays/.test(head.textContent.trim()), head.textContent.trim());
  ok('count element kept for the map', !!d.getElementById('result-num'));

  const css = d.querySelector('style').textContent;
  ok('grid is photo-first, not a thumbnail row', !/flex:0 0 118px/.test(css));
  ok('media reserves space (no layout shift)', /\.card-media\{[\s\S]{0,220}?aspect-ratio:4\/3/.test(css));
  ok('rail uses native scroll snap', /scroll-snap-type:x mandatory/.test(css));
  ok('grid widens to 4 columns on large screens', /min-width:1500px\)\{\.grid\{grid-template-columns:repeat\(4/.test(css));
  ok('reduced motion respected', /prefers-reduced-motion/.test(css));

  console.log('\n' + (pass ? '\u2705 STAYS v4 PASS' : '\u274c FAIL'));
  if (warns.length) console.log('   (console noise: ' + warns.length + ')');
  process.exit(pass ? 0 : 1);
}, 1400);
