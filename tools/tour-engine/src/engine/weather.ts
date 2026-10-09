/* Current weather at the property, from Cabana's own weather endpoint
   (same origin; it caches Open-Meteo for 15 minutes). The tour only needs
   enough to colour the light: how much cloud dims the direct sun, and
   whether it is raining. */
import type { Weather } from '../contract';

/** Cloud cover 0..1 implied by a WMO weather code: the endpoint gives the code, not a percentage. */
function cloudFor(code: number, condition: string) {
  if (code === 0) return 0;
  if (code === 1) return 0.2;
  if (code === 2) return 0.45;
  if (code === 3) return 0.85;
  if (code === 45 || code === 48) return 0.8;
  if (code >= 51 && code <= 57) return 0.75;
  if (code >= 61 && code <= 67) return 0.88;
  if (code >= 71 && code <= 77) return 0.88;
  if (code >= 80 && code <= 82) return 0.7;
  if (code >= 95) return 0.95;
  return /cloud|overcast|fog/.test(condition) ? 0.6 : 0.25;
}

function rainFor(code: number, condition: string) {
  return (code >= 51 && code <= 67) || (code >= 80 && code <= 82) || code >= 95 || /rain|drizzle|shower|thunder/.test(condition);
}

/** "Partly Cloudy" → "Partly cloudy": the UI sets it in a sentence. */
function sentenceCase(label: string) {
  const s = label.trim().toLowerCase();
  return s ? s[0].toUpperCase() + s.slice(1) : '';
}

export async function fetchWeather(lat: number, lng: number, signal: AbortSignal): Promise<Weather | null> {
  const url = `/api/utilities?action=weather&lat=${lat.toFixed(5)}&lng=${lng.toFixed(5)}`;
  const response = await fetch(url, { signal, credentials: 'same-origin', headers: { accept: 'application/json' } });
  if (!response.ok) return null;
  const data = await response.json() as { current?: Record<string, unknown> };
  const current = data && data.current;
  if (!current || !Number.isFinite(Number(current.temp))) return null;
  const code = Number(current.wmoCode) || 0;
  const condition = String(current.condition || '').toLowerCase();
  return {
    temp: Math.round(Number(current.temp)),
    label: sentenceCase(String(current.label || '')),
    cloud: cloudFor(code, condition),
    rain: rainFor(code, condition),
    isDay: current.isDay !== false && current.isDay !== 0,
  };
}
