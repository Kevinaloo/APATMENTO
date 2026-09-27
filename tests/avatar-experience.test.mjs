import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { AVATAR_RANGES, cleanAvatar } from '../api/lib/_avatar-spec.js';

const source = readFileSync(new URL('../cabana-avatars.js', import.meta.url), 'utf8');
const json = value => JSON.parse(JSON.stringify(value));
function engine() {
  const context = { console };
  context.window = context;
  vm.createContext(context);
  vm.runInContext(source, context);
  return context.CabanaAvatars;
}

// Stored v1 examples deliberately use the original indices. Appending new
// characters must never invalidate or silently reinterpret an existing choice.
const legacy = [
  { v: 1, k: 'p', s: 9, h: 15, hc: 8, fc: 8, e: 4, m: 5, f: 3, x: 8, w: 3, o: 9, b: 11, mo: 2, n: 'amani' },
  { v: 1, k: 'a', a: 11, t: 3, x: 5, b: 11, mo: 0, n: 'milia' },
  { v: 1, k: 'e', sh: 5, pt: 5, c: 7, g: 12, mo: 1, n: 'e-kente' },
];

test('saved v1 characters retain every choice and original animal index', () => {
  const AV = engine();
  for (const spec of legacy) {
    assert.deepEqual(json(AV.validate(spec)), spec);
    assert.deepEqual(cleanAvatar(spec), spec);
  }
  const C = AV.catalogue();
  assert.equal(C.spirits.find(item => item.id === 'simba').spec.a, 0);
  assert.equal(C.spirits.find(item => item.id === 'twiga').spec.a, 2);
  assert.equal(C.spirits.find(item => item.id === 'milia').spec.a, 3);
});

test('every customization value has the same server and browser contract', () => {
  const AV = engine();
  assert.deepEqual(json(AV.RANGES), AVATAR_RANGES);
  for (const [kind, fields] of Object.entries(AVATAR_RANGES)) {
    const base = Object.fromEntries(Object.keys(fields).map(key => [key, 0]));
    base.k = kind;
    for (const [key, limit] of Object.entries(fields)) {
      for (let value = 0; value < limit; value++) {
        const spec = { ...base, [key]: value };
        assert.deepEqual(json(AV.validate(spec)), cleanAvatar(spec), `${kind}.${key}=${value}`);
        assert.ok(cleanAvatar(spec));
        assert.doesNotMatch(AV.render(spec), /NaN|undefined|Infinity/);
      }
      for (const value of [-1, limit, 0.5, 'garbage', Infinity, NaN]) {
        const spec = { ...base, [key]: value };
        assert.equal(AV.validate(spec), null, `${kind}.${key} rejects ${value}`);
        assert.equal(cleanAvatar(spec), null, `${kind}.${key} server rejects ${value}`);
      }
    }
  }
});

test('catalogue provides distinct people, animals and emblems with valid labels', () => {
  const AV = engine(), C = AV.catalogue();
  assert.ok(C.people.length >= 48);
  assert.ok(C.spirits.length >= 20);
  assert.ok(C.emblems.length >= 8);
  const all = Object.values(C).flat();
  assert.equal(new Set(all.map(item => item.id)).size, all.length, 'unique character ids');
  assert.equal(new Set(C.spirits.map(item => item.spec.a)).size, AV.RANGES.a.a, 'every animal can be chosen');
  for (const group of Object.values(C)) {
    const appearances = group.map(({ spec }) => JSON.stringify(Object.fromEntries(Object.entries(spec).filter(([key]) => !['n', 'mo', 'v'].includes(key)))));
    assert.equal(new Set(appearances).size, appearances.length, 'catalogue entries have distinct appearances');
  }
  for (const item of all) {
    assert.ok(item.name.trim() && item.trait.trim(), item.id);
    assert.deepEqual(json(AV.validate(item.spec)), cleanAvatar(item.spec), item.id);
    assert.equal(AV.describe(item.spec).name, item.name);
  }
});

test('renders are self-contained and their SVG references cannot collide', () => {
  const AV = engine(), all = Object.values(AV.catalogue()).flat();
  const documentIds = new Set();
  for (const item of all) for (const size of [28, 40, 180]) {
    const svg = AV.render(item.spec, { size, name: 'Cabana & Company' });
    const ids = [...svg.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
    assert.equal(new Set(ids).size, ids.length, item.id + ' has no duplicate internal ids');
    for (const id of ids) {
      assert.ok(!documentIds.has(id), 'multiple instances have isolated SVG definitions');
      documentIds.add(id);
    }
    for (const [, ref] of svg.matchAll(/url\(#([^\)]+)\)/g)) assert.ok(ids.includes(ref), `${item.id}: missing definition ${ref}`);
    assert.doesNotMatch(svg, /<(?:script|iframe|foreignObject|image)\b|\b(?:href|onload|onclick)=|\b(?:NaN|undefined|Infinity)\b/i, item.id);
    assert.match(svg, /role="img"/);
    assert.match(svg, /aria-label="[^"<>]+"/);
  }
});

test('untrusted specs and render labels cannot become executable markup', () => {
  const AV = engine();
  for (const spec of [null, [], '<svg>', { k: '__proto__' }, { k: 'constructor' }, { k: 'toString' }, { k: 'unknown' }]) {
    assert.equal(AV.validate(spec), null);
    assert.equal(cleanAvatar(spec), null);
  }
  const spec = { ...legacy[2], n: '<img onerror=alert(1)>', onclick: 'alert(1)', href: 'javascript:alert(1)' };
  const clean = cleanAvatar(spec);
  assert.ok(clean);
  assert.ok(!('n' in clean) && !('onclick' in clean) && !('href' in clean));
  const svg = AV.render(spec, { name: '<svg/onload=alert(1)>', label: '"><script>alert(1)</script>', motion: '2" onload="alert(1)' });
  assert.doesNotMatch(svg, /<script|<img|\sonload="|\sonerror="|\shref="/i);
  assert.match(svg, /&lt;script&gt;/);
});

test('defaults are deterministic and surprise generates valid new options', () => {
  const AV = engine();
  const seenAnimals = new Set();
  for (let seed = 0; seed < 500; seed++) {
    const id = 'member-' + seed;
    assert.deepEqual(json(AV.defaultFor(id, 'individual')), json(engine().defaultFor(id, 'individual')));
    assert.equal(AV.defaultFor(id, 'individual').k, 'a');
    assert.equal(AV.defaultFor(id, 'organization').k, 'e');
    for (const kind of ['p', 'a', 'e']) {
      const spec = AV.surprise(kind, seed);
      assert.ok(cleanAvatar(spec), `${kind}, seed ${seed}`);
      if (kind === 'a') seenAnimals.add(spec.a);
    }
  }
  assert.equal(seenAnimals.size, AV.RANGES.a.a, 'surprise can reach every animal');
});
