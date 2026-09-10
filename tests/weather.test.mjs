import test from 'node:test';
import assert from 'node:assert/strict';
import weatherHandler, { computeManeuverability, currentHourIndex } from '../api/lib/_weather.js';

function response() {
  return {
    statusCode: 200,
    payload: null,
    headers: {},
    setHeader(name, value) { this.headers[name.toLowerCase()] = value; },
    status(code) { this.statusCode = code; return this; },
    json(value) { this.payload = value; return this; },
  };
}

test('hourly forecasts begin at the current forecast hour', () => {
  assert.equal(currentHourIndex({ time: [100, 200, 300, 400] }, 250), 2);
  const result = computeManeuverability({
    current: { time: 300, weather_code: 1, precipitation: 0, wind_speed_10m: 5 },
    hourly: {
      time: [100, 200, 300, 400],
      precipitation: [99, 99, 0, 0],
      precipitation_probability: [100, 100, 5, 5],
    },
  });
  assert.equal(result.score, 'OPTIMAL');
  assert.equal(result.maxRainProb, 5);
});

test('weather handler returns live, time-aligned Open-Meteo data', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({
    ok: true,
    json: async () => ({
      utc_offset_seconds: 10800,
      current: {
        time: 7200, temperature_2m: 23, apparent_temperature: 24,
        relative_humidity_2m: 60, is_day: 1, precipitation: 0,
        weather_code: 1, wind_speed_10m: 8,
      },
      hourly: {
        time: [3600, 7200, 10800],
        temperature_2m: [20, 23, 24],
        precipitation_probability: [90, 10, 20],
        precipitation: [10, 0, 0],
        weather_code: [65, 1, 2],
      },
      daily: {
        time: [0, 86400], weather_code: [1, 2],
        temperature_2m_max: [26, 27], temperature_2m_min: [16, 17],
        precipitation_probability_max: [20, 30],
      },
    }),
  });
  try {
    const res = response();
    await weatherHandler({ query: { city: 'Nairobi', lat: '-1.2921', lng: '36.8219' } }, res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.payload.live, true);
    assert.equal(res.payload.source, 'open-meteo');
    assert.equal(res.payload.hourly[0].time, '05:00');
    assert.equal(res.payload.hourly[0].rainProb, 10);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('weather handler fails honestly when live data is unavailable', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error('offline'); };
  try {
    const res = response();
    await weatherHandler({ query: { city: 'Test', lat: '-31.25', lng: '20.75' } }, res);
    assert.equal(res.statusCode, 503);
    assert.deepEqual(res.payload, {
      ok: false,
      live: false,
      error: 'weather_temporarily_unavailable',
    });
    assert.equal(res.headers['cache-control'], 'no-store');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

