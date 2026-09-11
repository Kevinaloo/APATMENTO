import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../apa-location.js', import.meta.url), 'utf8');

function storage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, String(value)); },
  };
}

function loadLocation({ permission = 'granted', cachedFix = null, livePosition = null } = {}) {
  let oneShotCalls = 0;
  const local = storage(cachedFix ? { cabana_last_fix: JSON.stringify(cachedFix) } : {});
  const document = {
    readyState: 'loading',
    addEventListener() {},
    dispatchEvent() {},
  };
  const window = {
    document,
    localStorage: local,
    sessionStorage: storage(),
    navigator: {
      permissions: {
        query: async () => ({ state: permission, onchange: null }),
      },
      geolocation: {
        watchPosition() { return 1; },
        clearWatch() {},
        getCurrentPosition(success) {
          oneShotCalls += 1;
          if (livePosition) success(livePosition);
        },
      },
    },
    CustomEvent: class CustomEvent {
      constructor(type, init) { this.type = type; this.detail = init && init.detail; }
    },
  };
  const context = {
    window,
    document,
    navigator: window.navigator,
    localStorage: local,
    sessionStorage: window.sessionStorage,
    CustomEvent: window.CustomEvent,
    console,
    Date,
    Math,
    Promise,
    setTimeout,
    clearTimeout,
  };
  vm.runInNewContext(source, context, { filename: 'apa-location.js' });
  return { location: window.ApaLocation, oneShotCalls: () => oneShotCalls };
}

test('a fresh device fix replaces a recent cached city even with lower reported accuracy', async () => {
  const cachedNairobi = {
    latitude: -1.2921,
    longitude: 36.8219,
    accuracy: 10,
    fixed_at: new Date().toISOString(),
    source: 'gps',
  };
  const liveMombasa = {
    coords: { latitude: -4.0435, longitude: 39.6682, accuracy: 100 },
    timestamp: Date.now() + 1000,
  };
  const harness = loadLocation({ cachedFix: cachedNairobi, livePosition: liveMombasa });

  const fix = await harness.location.get({ maxAge: 0, timeout: 50 });

  assert.equal(fix.latitude, -4.0435);
  assert.equal(fix.longitude, 39.6682);
  assert.equal(harness.location.current().source, 'gps');
  assert.equal(harness.oneShotCalls(), 1);
});

test('background bootstrap never opens the browser permission prompt', async () => {
  const harness = loadLocation({ permission: 'prompt' });

  const fix = await harness.location.get({ maxAge: 0, timeout: 20 });

  assert.equal(fix, null);
  assert.equal(harness.oneShotCalls(), 0);
});

test('a caller can refuse a persisted location after the user may have travelled', async () => {
  const cachedNairobi = {
    latitude: -1.2921,
    longitude: 36.8219,
    accuracy: 10,
    fixed_at: new Date().toISOString(),
    source: 'gps',
  };
  const harness = loadLocation({ cachedFix: cachedNairobi });

  const fix = await harness.location.get({ maxAge: 5000, timeout: 10, requireLive: true });

  assert.equal(fix, null);
  assert.equal(harness.oneShotCalls(), 1);
});

test('only the standard high-accuracy geolocation option is used', () => {
  assert.match(source, /enableHighAccuracy:\s*true/);
  assert.doesNotMatch(source, /[,{]\s*highAccuracy\s*:/);
});
