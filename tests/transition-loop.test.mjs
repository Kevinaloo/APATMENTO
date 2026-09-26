import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const apartments = readFileSync(new URL('../apartments.html', import.meta.url), 'utf8');
const pwa = readFileSync(new URL('../pwa.js', import.meta.url), 'utf8');
const sw = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');

test('apartments has one service-worker owner and never silently reloads on update', () => {
  assert.doesNotMatch(apartments, /v35-programmes/);
  assert.doesNotMatch(apartments, /onupdatefound[\s\S]{0,500}location\.reload/);
  assert.match(apartments, /pwa\.js\?v=39-people-profiles/);
});

test('the stay-gate escape hatch is armed before its blocking asset request', () => {
  const guard = apartments.indexOf('window.__cabanaStayGateExpired = true');
  const asset = apartments.indexOf('cabana-stay-gate.js?v=37-no-loop');
  const start = apartments.indexOf('CabanaStayGate.play', asset);
  assert.ok(guard >= 0 && asset > guard && start > asset);
  assert.match(apartments.slice(guard, asset), /setTimeout[\s\S]*9500/);
  assert.match(apartments.slice(asset, start), /__cabanaStayGateExpired/);
});

test('the page script and service worker agree on the no-loop release', () => {
  assert.match(pwa, /sw\.js\?v=39-people-profiles/);
  assert.match(sw, /cabana-v39-people-profiles/);
});
