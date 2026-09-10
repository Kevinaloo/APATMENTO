/* ═══════════════════════════════════════════════════════════════════
   CABANA TRAVEL & MANEUVER WEATHER INTELLIGENCE
   api/lib/_weather.js
   ───────────────────────────────────────────────────────────────────
   Hyper-local, live weather forecasts & terrain maneuverability engine
   for African destinations and international travelers.
   Uses Open-Meteo (zero API keys needed, high-resolution ECMWF/GFS).
   ═══════════════════════════════════════════════════════════════════ */

const CACHE = new Map();
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes cache
const MAX_CACHE_ENTRIES = 100;

// Default coordinates for key African travel hubs
export const HUBS = {
  nairobi:    { name: 'Nairobi',       country: 'Kenya',        lat: -1.2921, lng: 36.8219, elevation: 1680 },
  mombasa:    { name: 'Mombasa',       country: 'Kenya',        lat: -4.0435, lng: 39.6682, elevation: 16 },
  diani:      { name: 'Diani Beach',   country: 'Kenya',        lat: -4.2796, lng: 39.5947, elevation: 10 },
  naivasha:   { name: 'Naivasha',      country: 'Kenya',        lat: -0.7172, lng: 36.4310, elevation: 1884 },
  nakuru:     { name: 'Nakuru',        country: 'Kenya',        lat: -0.3031, lng: 36.0800, elevation: 1850 },
  mara:       { name: 'Masai Mara',    country: 'Kenya',        lat: -1.4931, lng: 35.1439, elevation: 1550 },
  kisumu:     { name: 'Kisumu',        country: 'Kenya',        lat: -0.0917, lng: 34.7680, elevation: 1131 },
  nanyuki:    { name: 'Nanyuki',       country: 'Kenya',        lat: 0.0167,  lng: 37.0722, elevation: 1947 },
  amboseli:   { name: 'Amboseli',      country: 'Kenya',        lat: -2.6527, lng: 37.2606, elevation: 1150 },
  kampala:    { name: 'Kampala',       country: 'Uganda',       lat: 0.3476,  lng: 32.5825, elevation: 1190 },
  kigali:     { name: 'Kigali',        country: 'Rwanda',       lat: -1.9441, lng: 30.0619, elevation: 1567 },
  zanzibar:   { name: 'Zanzibar',      country: 'Tanzania',     lat: -6.1659, lng: 39.2026, elevation: 12 },
  daressalaam:{ name: 'Dar es Salaam', country: 'Tanzania',     lat: -6.7924, lng: 39.2083, elevation: 14 },
  accra:      { name: 'Accra',         country: 'Ghana',        lat: 5.6037,  lng: -0.1870, elevation: 61 },
  lagos:      { name: 'Lagos',         country: 'Nigeria',      lat: 6.5244,  lng: 3.3792,  elevation: 10 },
  johannesburg:{ name: 'Johannesburg', country: 'South Africa', lat: -26.2041,lng: 28.0473, elevation: 1753 },
  capetown:   { name: 'Cape Town',     country: 'South Africa', lat: -33.9249,lng: 18.4241, elevation: 12 },
  cairo:      { name: 'Cairo',         country: 'Egypt',        lat: 30.0444, lng: 31.2357, elevation: 23 },
};

// Weather WMO Code to description & icon
export function interpretWmo(code, isDay = 1) {
  const c = Number(code) || 0;
  if (c === 0) return { label: 'Clear Sky', icon: isDay ? '☀️' : '🌙', condition: 'clear' };
  if (c === 1) return { label: 'Mainly Clear', icon: isDay ? '🌤️' : '☁️', condition: 'partly_cloudy' };
  if (c === 2) return { label: 'Partly Cloudy', icon: isDay ? '⛅' : '☁️', condition: 'partly_cloudy' };
  if (c === 3) return { label: 'Overcast', icon: '☁️', condition: 'cloudy' };
  if (c === 45 || c === 48) return { label: 'Fog / Mist', icon: '🌫️', condition: 'fog' };
  if (c >= 51 && c <= 55) return { label: 'Light Drizzle', icon: '🌦️', condition: 'drizzle' };
  if (c >= 61 && c <= 65) {
    if (c === 61) return { label: 'Light Rain', icon: '🌧️', condition: 'rain' };
    if (c === 63) return { label: 'Moderate Rain', icon: '🌧️', condition: 'rain' };
    return { label: 'Heavy Rain', icon: '⛈️', condition: 'heavy_rain' };
  }
  if (c >= 80 && c <= 82) return { label: 'Passing Showers', icon: '🌦️', condition: 'showers' };
  if (c >= 95 && c <= 99) return { label: 'Thunderstorm', icon: '⛈️', condition: 'thunderstorm' };
  return { label: 'Fair Weather', icon: '🌤️', condition: 'fair' };
}

export function currentHourIndex(hourly, currentTime = Date.now() / 1000) {
  const times = Array.isArray(hourly?.time) ? hourly.time : [];
  if (!times.length) return 0;
  const target = Number(currentTime) || Date.now() / 1000;
  const index = times.findIndex(value => Number(value) >= target);
  return index === -1 ? times.length - 1 : index;
}

function localHour(unixSeconds, utcOffsetSeconds = 0) {
  return new Date((Number(unixSeconds) + Number(utcOffsetSeconds || 0)) * 1000).getUTCHours();
}

// Compute terrain and vehicle maneuverability rating
export function computeManeuverability(weatherData, cityKey = 'nairobi') {
  const current = weatherData.current || {};
  const temp = current.temperature_2m || 24;
  const precip = current.precipitation || 0;
  const wind = current.wind_speed_10m || 10;
  const wmo = current.weather_code || 0;
  const hourly = weatherData.hourly || { precipitation: [], precipitation_probability: [] };

  // Next 8 hours precipitation analysis
  const nowIdx = currentHourIndex(hourly, current.time);
  const next8Precip = (hourly.precipitation || []).slice(nowIdx, nowIdx + 8);
  const maxNextPrecip = Math.max(0, ...next8Precip);
  const maxRainProb = Math.max(0, ...(hourly.precipitation_probability || []).slice(nowIdx, nowIdx + 8));

  let score = 'OPTIMAL';
  let badgeColor = '#10B981'; // Green
  let vehicleGuidance = 'Safe for all vehicles (2WD, hatchbacks & sedans)';
  let roadAdvisory = 'Tarmac corridors are dry with excellent traction and high visibility.';
  let summary = 'Optimal driving & outdoor conditions';

  if (wmo >= 95 || maxNextPrecip > 15 || precip > 10) {
    score = 'DEMANDING';
    badgeColor = '#EF4444'; // Red
    vehicleGuidance = 'AWD or 4WD strongly advised for unpaved areas';
    roadAdvisory = 'High risk of surface water and underpass flooding in low-lying sections. Unpaved murram / black-cotton dirt roads may become impassable.';
    summary = 'Storm alerts active · Exercise caution';
  } else if (wmo >= 61 || wmo >= 80 || maxNextPrecip > 3 || maxRainProb > 55) {
    score = 'MODERATE';
    badgeColor = '#F59E0B'; // Amber
    vehicleGuidance = '2WD safe on tarmac; watch braking distance';
    roadAdvisory = 'Showers expected. Surface oil on tarmac may cause slick braking; maintain safe following distance.';
    summary = 'Intermittent showers · Slick roads possible';
  }

  // Location-specific intelligence
  const locNote = getLocationSpecificNote(cityKey, score, wmo);

  // Best travel window calculation
  const bestWindow = calculateBestTravelWindow(hourly, current.time, weatherData.utc_offset_seconds);

  return {
    score,
    badgeColor,
    summary,
    vehicleGuidance,
    roadAdvisory,
    locNote,
    bestWindow,
    maxRainProb: Math.round(maxRainProb),
  };
}

function getLocationSpecificNote(cityKey, score, wmo) {
  const key = String(cityKey || '').toLowerCase();
  if (key.includes('nairobi')) {
    if (score === 'DEMANDING') return 'Nairobi Expressway, Uhuru Highway and Westlands roundabouts experience flash pooling during heavy rains. Allow +25 mins commute buffer.';
    if (score === 'MODERATE') return 'CBD and Upper Hill traffic tends to slow down with light drizzle. Best to move before the 17:00 rush.';
    return 'Nairobi Expressway, Waiyaki Way and Southern Bypass operating with optimal speed and flow.';
  }
  if (key.includes('mara')) {
    if (score === 'DEMANDING') return 'Black cotton soil around Sekenani and Talek gates becomes extremely slick. 4WD with high clearance strictly required.';
    return 'Game tracks in good shape. Morning game drive conditions ideal.';
  }
  if (key.includes('mombasa') || key.includes('diani')) {
    if (score === 'DEMANDING') return 'Likoni Ferry queues may lengthen during storm swells. High sea breezes on open beaches.';
    return 'Coastal breeze pleasant; ideal conditions for Diani beach and water activities.';
  }
  if (key.includes('naivasha') || key.includes('nakuru')) {
    return 'Park access tracks along Lake Naivasha are currently dry. Scenic views over the Great Rift Valley escarpment are clear.';
  }
  return 'Standard highway driving conditions. Daylight travel recommended.';
}

function calculateBestTravelWindow(hourly, currentTime, utcOffsetSeconds = 0) {
  if (!hourly || !hourly.time || !hourly.precipitation_probability) {
    return '08:00 – 16:00 (Favorable throughout the day)';
  }

  const start = currentHourIndex(hourly, currentTime);
  const times = hourly.time.slice(start, start + 14);
  const probs = hourly.precipitation_probability.slice(start, start + 14);
  let bestStart = null;
  let bestEnd = null;

  for (let i = 0; i < times.length; i++) {
    const prob = probs[i] || 0;
    const hour = localHour(times[i], utcOffsetSeconds);
    if (prob < 35 && (hour >= 7 && hour <= 19)) {
      if (bestStart === null) bestStart = hour;
      bestEnd = hour + 1;
    }
  }

  if (bestStart !== null && bestEnd !== null) {
    const s = String(bestStart).padStart(2, '0') + ':00';
    const e = String(Math.min(20, bestEnd)).padStart(2, '0') + ':00';
    return `${s} – ${e} (Lowest rain probability)`;
  }
  return 'Morning hours (07:30 – 12:00) offer best movement window';
}

export default async function weatherHandler(req, res) {
  try {
    const query = req.query || {};
    let lat = parseFloat(query.lat);
    let lng = parseFloat(query.lng);
    let city = String(query.city || '').trim().slice(0, 120);
    let country = '';

    const cityLower = city.toLowerCase();
    const namedHub = Object.entries(HUBS).find(([k, h]) =>
      cityLower && (k.includes(cityLower) || h.name.toLowerCase().includes(cityLower))
    );
    if (namedHub) country = namedHub[1].country;

    // Default to Nairobi if no coords supplied
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
      if (namedHub) {
        lat = namedHub[1].lat;
        lng = namedHub[1].lng;
        city = namedHub[1].name;
        country = namedHub[1].country;
      } else {
        lat = HUBS.nairobi.lat;
        lng = HUBS.nairobi.lng;
        city = HUBS.nairobi.name;
        country = HUBS.nairobi.country;
      }
    }

    const cacheKey = `${lat.toFixed(2)},${lng.toFixed(2)}`;
    const cached = CACHE.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp < CACHE_TTL_MS)) {
      res.setHeader('Cache-Control', 'public, max-age=600, s-maxage=900');
      return res.status(200).json(cached.data);
    }

    // Call Open-Meteo API
    const openMeteoUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}`
      + `&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m,wind_gusts_10m`
      + `&hourly=temperature_2m,precipitation_probability,precipitation,weather_code`
      + `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,uv_index_max`
      + `&timezone=auto&timeformat=unixtime`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4500);

    let rawData = null;
    try {
      const resp = await fetch(openMeteoUrl, { signal: controller.signal });
      if (resp.ok) {
        rawData = await resp.json();
      }
    } catch (e) {
      console.warn('[weather] Open-Meteo fetch failed or timed out:', e.message);
    } finally {
      clearTimeout(timeout);
    }

    // Road guidance must be based on live data. Never invent favorable
    // conditions when the upstream forecast is unavailable.
    if (!rawData || !rawData.current) {
      res.setHeader('Cache-Control', 'no-store');
      return res.status(503).json({
        ok: false,
        live: false,
        error: 'weather_temporarily_unavailable',
      });
    }

    const curr = rawData.current;
    const wmo = interpretWmo(curr.weather_code, curr.is_day);
    const maneuver = computeManeuverability(rawData, city);

    // Format hourly 12-hour forecast
    const hourlyItems = [];
    const nowIdx = currentHourIndex(rawData.hourly, curr.time);
    for (let i = nowIdx; i < Math.min(nowIdx + 12, (rawData.hourly?.time || []).length); i++) {
      const t = rawData.hourly.time[i];
      const hour = localHour(t, rawData.utc_offset_seconds);
      const hourStr = String(hour).padStart(2, '0') + ':00';
      const tempVal = Math.round(rawData.hourly.temperature_2m[i]);
      const rainProb = rawData.hourly.precipitation_probability[i] || 0;
      const codeVal = rawData.hourly.weather_code[i] || 0;
      const interp = interpretWmo(codeVal, hour >= 6 && hour < 18 ? 1 : 0);
      hourlyItems.push({
        time: hourStr,
        temp: tempVal,
        rainProb,
        icon: interp.icon,
        label: interp.label,
      });
    }

    const payload = {
      ok: true,
      live: true,
      source: 'open-meteo',
      city: city || 'Nairobi',
      country,
      coordinates: { lat, lng },
      current: {
        temp: Math.round(curr.temperature_2m),
        feelsLike: Math.round(curr.apparent_temperature || curr.temperature_2m),
        humidity: Math.round(curr.relative_humidity_2m || 55),
        windKmH: Math.round(curr.wind_speed_10m || 10),
        isDay: Boolean(curr.is_day),
        wmoCode: curr.weather_code,
        label: wmo.label,
        icon: wmo.icon,
        condition: wmo.condition,
      },
      maneuver,
      hourly: hourlyItems,
      daily: (rawData.daily?.time || [1, 2, 3, 4, 5]).map((_, i) => ({
        day: i === 0 ? 'Today' : new Date((Number(rawData.daily.time?.[i]) + Number(rawData.utc_offset_seconds || 0)) * 1000)
          .toLocaleDateString('en', { weekday: 'short', timeZone: 'UTC' }),
        maxTemp: Math.round(rawData.daily.temperature_2m_max[i] || 25),
        minTemp: Math.round(rawData.daily.temperature_2m_min[i] || 16),
        rainProb: Math.round(rawData.daily.precipitation_probability_max[i] || 20),
        icon: interpretWmo(rawData.daily.weather_code[i] || 1, 1).icon,
      })),
      updatedAt: new Date().toISOString(),
    };

    if (CACHE.size >= MAX_CACHE_ENTRIES) CACHE.delete(CACHE.keys().next().value);
    CACHE.set(cacheKey, { timestamp: Date.now(), data: payload });
    res.setHeader('Cache-Control', 'public, max-age=600, s-maxage=900');
    return res.status(200).json(payload);
  } catch (err) {
    console.error('[weather] handler fatal:', err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
