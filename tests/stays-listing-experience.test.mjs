import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const [stays, form, chrome] = await Promise.all([
  readFile(new URL('../apartments.html', import.meta.url), 'utf8'),
  readFile(new URL('../add-listing.html', import.meta.url), 'utf8'),
  readFile(new URL('../apa-chrome.js', import.meta.url), 'utf8'),
]);

test('stay cards match the dashboard with an edge-to-edge cover by default', () => {
  assert.match(stays, /\.card-slide img\{[\s\S]*?object-fit:cover;object-position:center 30%/);
  assert.match(stays, /\.card-slide img\.fit-contain\{object-fit:contain;\}/);
  assert.match(stays, /const fit=pos\.fit==='contain'\?'contain':'cover'/);
  assert.match(stays, /photoPositions: Array\.isArray\(l\.extras\?\.photo_positions\)/);
});

test('stays use the shared dashboard favourites store and migrate older saves', () => {
  assert.match(stays, /localStorage\.setItem\('apa_favorites'/);
  assert.match(stays, /<script src="\/apa-chrome\.js"><\/script>/);
  assert.match(stays, /new CustomEvent\('apa:favorites-changed'/);
  assert.match(stays, /migrateLegacyStayWishlist\(\)/);
  assert.match(chrome, /var FAV_KEY = 'apa_favorites'/);
});

test('hosts can order, cover and position every listing photo', () => {
  assert.match(form, /Drag photos to change their order/);
  assert.match(form, /function movePhoto\(/);
  assert.match(form, /function setCov\(i\)\{movePhoto\(i,0\);\}/);
  assert.match(form, /fit:value&&value\.fit==='contain'\?'contain':'cover'/);
  assert.match(form, /photo_positions:F\.photoPositions\.map\(normalPhotoPosition\)/);
  assert.match(form, /Write with APA/);
});
