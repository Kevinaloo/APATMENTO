import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const [stays, form, chrome] = await Promise.all([
  readFile(new URL('../apartments.html', import.meta.url), 'utf8'),
  readFile(new URL('../add-listing.html', import.meta.url), 'utf8'),
  readFile(new URL('../apa-chrome.js', import.meta.url), 'utf8'),
]);

test('stay cards show the full photo unless the host explicitly chooses a crop', () => {
  assert.match(stays, /\.card-slide img\{[\s\S]*?object-fit:contain/);
  assert.match(stays, /\.card-slide img\.fit-cover\{object-fit:cover;\}/);
  assert.match(stays, /photoPositions: Array\.isArray\(l\.extras\?\.photo_positions\)/);
});

test('stays use the shared dashboard favourites store and migrate older saves', () => {
  assert.match(stays, /ApaChrome\.toggleFavorite\(/);
  assert.match(stays, /migrateLegacyStayWishlist\(\)/);
  assert.match(chrome, /var FAV_KEY = 'apa_favorites'/);
});

test('hosts can order, cover and position every listing photo', () => {
  assert.match(form, /Drag photos to change their order/);
  assert.match(form, /function movePhoto\(/);
  assert.match(form, /function setCov\(i\)\{movePhoto\(i,0\);\}/);
  assert.match(form, /photo_positions:F\.photoPositions\.map\(normalPhotoPosition\)/);
  assert.match(form, /Write with APA/);
});
