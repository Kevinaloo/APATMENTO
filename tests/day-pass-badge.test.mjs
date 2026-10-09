import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../apartments.html', import.meta.url), 'utf8');

test('a listing with a day pass carries the Day Pass ticket, with price and hours', () => {
  const m = html.match(/\$\{apt\.dayPass && apt\.bookingModel !== 'hotel' \? `<span class="card-dp[\s\S]*?` : ''\}/);
  assert.ok(m, 'the card template renders the ticket');
  const t = m[0];
  assert.match(t, /Day Pass/);
  assert.match(t, /fxMain\(apt\.dayPass\.price\)/, 'shows the all-in price in the guest\'s currency');
  assert.match(t, /apt\.dayPass\.start\}–\$\{apt\.dayPass\.end/, 'shows the hours');
  assert.match(t, /aria-label="Day pass available/, 'screen readers get one clear label');
  assert.match(t, /is-low/, 'steps below Featured / In demand rather than covering it');
});

test('the ticket no longer sits where the 3D Tour badge and photo progress bar are', () => {
  const css = html.match(/\.card-dp\{position:absolute;([^}]*)\}/)[1];
  assert.match(css, /top:11px/);
  assert.doesNotMatch(css, /bottom:/);
  assert.match(html, /\.card-dp\.is-low\{top:44px/);
});

test('it respects reduced motion', () => {
  assert.match(html, /prefers-reduced-motion:no-preference\)\{\.card-dp-txt::after\{animation/);
  assert.match(html, /prefers-reduced-motion:reduce\)\{\.card-dp,\.card-dp-disc\{animation:none/);
});
