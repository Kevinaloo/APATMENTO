/* Pins the fixes from the guest/provider audit follow-up. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { JSDOM } from 'jsdom';

const read = f => readFileSync(new URL('../' + f, import.meta.url), 'utf8');
const pick = read('cabana-datepick.js');

function dom(html) {
  const d = new JSDOM('<!doctype html><body>' + html + '</body>', { url: 'https://cabana.africa/flights', runScripts: 'outside-only', pretendToBeVisual: true });
  d.window.eval(pick);
  d.window.CabanaDatePick.scan();
  return d;
}
const tomorrow = () => { const t = new Date(); t.setDate(t.getDate() + 1); return t.toISOString().slice(0, 10); };

test('date pick upgrades a date input in place and keeps an ISO .value', () => {
  const d = dom('<input id="a" type="date" data-cdp="Departing" value="2031-03-09">');
  const a = d.window.document.getElementById('a');
  assert.equal(a.type, 'text'); assert.equal(a.readOnly, true);
  assert.equal(a.value, '2031-03-09');                         // page code still reads ISO
  const shown = Object.getOwnPropertyDescriptor(d.window.HTMLInputElement.prototype, 'value').get.call(a);
  assert.equal(shown, 'Sun 9 Mar 2031');                        // guests read a date, not mm/dd/yyyy
  a.value = '';                                                 // code clears it
  assert.equal(a.value, ''); assert.equal(a.classList.contains('cdp-empty'), true);
  d.window.close();
});

test('choosing a day sets the ISO value, fires input and change, and closes the sheet', () => {
  const d = dom('<input id="a" type="date" data-cdp="Departing">');
  const { document } = d.window, a = document.getElementById('a');
  const seen = []; a.addEventListener('change', () => seen.push(a.value));
  a.min = tomorrow();
  a.click();
  const days = [...document.querySelectorAll('.cdp-day:not(:disabled)')];
  assert.ok(days.length > 0);
  assert.equal(document.querySelector(`.cdp-day[data-d="${new Date().toISOString().slice(0, 10)}"]`)?.disabled ?? true, true, 'days before min are disabled');
  days[0].click();
  assert.deepEqual(seen, [tomorrow()]); assert.equal(a.value, tomorrow());
  d.window.close();
});

test('a return date is anchored to its departure and cannot precede the minimum', () => {
  const d = dom('<input id="dep" type="date" data-cdp="Departing"><input id="ret" type="date" data-cdp="Returning" data-cdp-after="dep">');
  const { document } = d.window, dep = document.getElementById('dep'), ret = document.getElementById('ret');
  const t = new Date(); t.setDate(t.getDate() + 3); const depIso = t.toISOString().slice(0, 10);
  dep.value = depIso; ret.min = depIso; ret.click();
  assert.equal(document.querySelector('.cdp-day.anchor')?.getAttribute('data-d'), depIso);
  const before = [...document.querySelectorAll('.cdp-day:disabled')].map(b => b.getAttribute('data-d'));
  assert.ok(before.every(x => x < depIso)); d.window.close();
});

test('flights and roommates use the shared picker instead of native date inputs', () => {
  for (const [file, id] of [['flights.html', 'fd-depart'], ['flights.html', 'fd-return'], ['roommates.html', 'f-from']]) {
    const html = read(file);
    assert.match(html, new RegExp(`id="${id}"[^>]*data-cdp`), `${file} #${id}`);
    assert.match(html, /cabana-datepick\.js/);
  }
});

test('shopping no longer queries the retired scraped catalogue', () => {
  assert.doesNotMatch(read('shopping.html'), /from\('scraped_shopping'\)/);
  assert.doesNotMatch(read('apa-categories.js'), /get\('scraped_shopping/);
});

test('only one overlay at a time: the APA greeting waits for, claims and releases the shared slot', () => {
  const s = read('cabana-support.js');
  assert.match(s, /global\.__cabanaOverlay \|\| doc\.querySelector\('dialog\[open\]/);
  assert.match(s, /global\.__cabanaOverlay = 'apa-welcome'/);
  assert.match(s, /if \(global\.__cabanaOverlay === 'apa-welcome'\) global\.__cabanaOverlay = null/);
  assert.match(s, /setTimeout\(dismissWelcome, 15000\)/);
});

test('the support orb tucks away on phones after a quiet moment', () => {
  const s = read('cabana-support.js');
  assert.match(s, /global\.innerWidth <= 720 && !open && !dock\.drag/);
  assert.match(s, /\}, 6000\);\n    \}\n    \['touchstart', 'scroll', 'keydown'\]/);
});

test('icon-only back links and the shopping search button have accessible names', () => {
  const missing = readdirSync(new URL('..', import.meta.url)).filter(f => f.endsWith('.html')).flatMap(f => {
    const h = read(f);
    return (h.match(/<a\b[^>]*class="tb-back"[^>]*>/g) || []).filter(t => !/aria-label=/.test(t)).map(() => f);
  });
  assert.deepEqual(missing, []);
  assert.match(read('shopping.html'), /class="sb-btn" type="button" aria-label="Search products"/);
});
