import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const read = file => readFileSync(join(ROOT, file), 'utf8');

const FORM = read('add-listing.html');
const IMPORT = read('api/import-listing.js');
const MIGRATION = read('supabase/migrations/20260828142947_normalize_stay_property_types.sql');
const STAYS = FORM.match(/stays:\{[\s\S]*?\n\s*roommates:/)?.[0] || '';

const EXPECTED = [
  'Apartment',
  'House',
  'Villa',
  'Cottage or Cabin',
  'Guesthouse or B&B',
  'Hotel or Resort',
  'Lodge or Safari Camp',
  'Hostel',
  'Unique Stay'
];

test('stay form presents one concise set of real property families', () => {
  const names = [...STAYS.matchAll(/\{n:'([^']+)',d:/g)].map(match => match[1]);
  assert.deepEqual(names, EXPECTED);
  for (const confusing of ['Studio', 'Penthouse', 'Serviced unit', 'Airbnb unit', 'Beach house']) {
    assert.ok(!names.includes(confusing), `${confusing} is guidance, not a category`);
  }
});

test('every stay choice explains what belongs inside it', () => {
  const descriptions = [...STAYS.matchAll(/\{n:'[^']+',d:'([^']+)'/g)].map(match => match[1]);
  assert.equal(descriptions.length, EXPECTED.length);
  assert.ok(descriptions.every(description => description.length >= 45));
  assert.match(FORM, /<button type="button" class="type-card/);
  assert.match(FORM, /aria-pressed=/);
});

test('legacy listings and AI imports resolve to the same canonical values', () => {
  assert.match(FORM, /'studio':'Apartment'/);
  assert.match(FORM, /'penthouse':'Apartment'/);
  assert.match(FORM, /'beach house':'House'/);
  assert.match(FORM, /'airbnb unit':'Apartment'/);
  assert.match(FORM, /const rawListingType=l\.listing_type\|\|l\.property_type\|\|l\.type/);
  for (const category of EXPECTED) assert.ok(IMPORT.includes(category));
});

test('database normalization updates only recognised stay values', () => {
  assert.match(MIGRATION, /where lower\(coalesce\(service, ''\)\) = 'stays'/);
  assert.match(MIGRATION, /else null/);
  assert.match(MIGRATION, /c\.property_family is not null/);
  assert.match(MIGRATION, /listing_type = c\.property_family/);
  assert.match(MIGRATION, /property_type = c\.property_family/);
});
