// Execute the shipped page functions against DOM/storage, not source regexes.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

const stays = readFileSync(new URL('../apartments.html', import.meta.url), 'utf8');
const form = readFileSync(new URL('../add-listing.html', import.meta.url), 'utf8');
function section(source, from, to) {
  const start = source.indexOf(from), end = source.indexOf(to, start);
  assert.ok(start >= 0 && end > start, 'Shipped interaction code could not be located');
  return source.slice(start, end);
}
function savedPage(storage = {}) {
  const dom = new JSDOM('<div data-card-id="qa-stay"><button class="card-heart" aria-pressed="false"></button></div>', { url: 'https://cabana.test/apartments', runScripts: 'outside-only' });
  const w = dom.window;
  w.currentListings = [{ id: 'qa-stay', _dbId: 'qa-db-id', name: 'QA stay', city: 'Nairobi', price: 4000, photos: ['cover.jpg'] }];
  w.showToast = () => {};
  for (const [key, value] of Object.entries(storage)) w.localStorage.setItem(key, value);
  w.eval(section(stays, 'function _getWishlist()', '/* ── Lightweight toast notification'));
  return dom;
}

test('saving a stay persists its exact deep link, updates the heart and survives reload before removal', () => {
  let dom = savedPage();
  try {
    const w = dom.window, heart = w.document.querySelector('.card-heart');
    let eventCount; w.addEventListener('apa:favorites-changed', e => { eventCount = e.detail.count; });
    w.toggleWishlist('qa-stay', heart);
    const serialized = w.localStorage.getItem('apa_favorites');
    assert.equal(JSON.parse(serialized)[0].url, '/apartments?open=qa-db-id');
    assert.equal(heart.getAttribute('aria-pressed'), 'true');
    assert.equal(eventCount, 1);
    dom.window.close(); dom = savedPage({ apa_favorites: serialized });
    assert.equal(dom.window.isWishlisted('qa-stay'), true);
    dom.window.toggleWishlist('qa-stay', dom.window.document.querySelector('.card-heart'));
    assert.deepEqual(JSON.parse(dom.window.localStorage.getItem('apa_favorites')), []);
    assert.equal(dom.window.isWishlisted('qa-stay'), false);
  } finally { dom.window.close(); }
});
test('legacy wishlist migration is idempotent and does not duplicate saved stays', () => {
  const dom = savedPage({ apa_wishlist: JSON.stringify(['qa-stay', 'qa-stay']) });
  try {
    dom.window.migrateLegacyStayWishlist(); dom.window.migrateLegacyStayWishlist();
    assert.equal(JSON.parse(dom.window.localStorage.getItem('apa_favorites')).length, 1);
    assert.equal(dom.window.localStorage.getItem('apa_wishlist'), null);
  } finally { dom.window.close(); }
});
function photoPage() {
  const dom = new JSDOM('<div id="photo-grid"></div><div id="ul-sub"></div>', { url: 'https://cabana.test/add-listing', runScripts: 'outside-only' });
  dom.window.F = { photos: ['one.jpg', 'two.jpg', 'three.jpg'], photoFiles: ['file-one', 'file-two', 'file-three'], photoPositions: [{ x: 10, y: 20 }, { x: 30, y: 40 }, { x: 50, y: 60 }] };
  dom.window.cov = 0;
  dom.window.al = () => {};
  dom.window.eval(section(form, 'function handlePh(files)', 'function gv(id)'));
  return dom;
}
test('photo reordering and cover selection preserve each file and crop, including after removal', () => {
  const dom = photoPage();
  try {
    const w = dom.window;
    w.movePhoto(2, 0);
    assert.deepEqual(Array.from(w.F.photos), ['three.jpg', 'one.jpg', 'two.jpg']);
    assert.equal(w.F.photoFiles[0], 'file-three');
    assert.equal(w.F.photoPositions[0].y, 60);
    assert.equal(w.document.querySelector('.photo-item img').getAttribute('src'), 'three.jpg');
    w.setCov(2);
    assert.equal(w.F.photos[0], 'two.jpg'); assert.equal(w.F.photoFiles[0], 'file-two');
    assert.equal(w.F.photoPositions[0].y, 40);
    w.rmPh(1);
    assert.deepEqual(Array.from(w.F.photos), ['two.jpg', 'one.jpg']);
    assert.deepEqual(Array.from(w.F.photoFiles), ['file-two', 'file-one']);
    assert.equal(w.document.querySelectorAll('.ph-cover').length, 1);
  } finally { dom.window.close(); }
});
test('invalid photo types and oversized uploads are rejected without changing the gallery', () => {
  const dom = photoPage();
  try {
    let warnings = 0; dom.window.al = () => warnings++;
    dom.window.handlePh([{ type: 'application/pdf', size: 20, name: 'file.pdf' }, { type: 'image/jpeg', size: 11 * 1024 * 1024, name: 'large.jpg' }]);
    assert.equal(warnings, 1); assert.equal(dom.window.F.photos.length, 3);
    dom.window.movePhoto(-1, 0); dom.window.movePhoto(0, 99);
    assert.equal(dom.window.F.photos[0], 'one.jpg');
  } finally { dom.window.close(); }
});
