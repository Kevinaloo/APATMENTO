/* The sun's path over the property, for drawing the Live Light arc and naming
   the presets. The engine owns the real lighting; this is the same NOAA
   approximation, evaluated cheaply for a whole day so the arc and the
   "Golden hour" preset follow the date and the address. */

const RAD = Math.PI / 180;

export type Place = { lat: number; lng: number; tz: number };

export function sunAt(p: Place, isoDate: string, hour: number): { elevationDeg: number; azimuthDeg: number } {
  const [y, m, d] = isoDate.split('-').map(Number);
  const day = Math.round((Date.UTC(y, m - 1, d) - Date.UTC(y, 0, 1)) / 864e5) + 1;
  const leap = (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
  const g = (2 * Math.PI / (leap ? 366 : 365)) * (day - 1 + (hour - p.tz - 12) / 24);
  const eqTime = 229.18 * (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g) - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g));
  const decl = 0.006918 - 0.399912 * Math.cos(g) + 0.070257 * Math.sin(g) - 0.006758 * Math.cos(2 * g)
    + 0.000907 * Math.sin(2 * g) - 0.002697 * Math.cos(3 * g) + 0.00148 * Math.sin(3 * g);
  const trueSolarMinutes = hour * 60 + eqTime + 4 * p.lng - 60 * p.tz;
  const ha = (trueSolarMinutes / 4 - 180) * RAD;
  const lat = p.lat * RAD;
  const cosZ = Math.sin(lat) * Math.sin(decl) + Math.cos(lat) * Math.cos(decl) * Math.cos(ha);
  const zenith = Math.acos(Math.max(-1, Math.min(1, cosZ)));
  const az = Math.atan2(Math.sin(ha), Math.cos(ha) * Math.sin(lat) - Math.tan(decl) * Math.cos(lat)) / RAD + 180;
  return { elevationDeg: 90 - zenith / RAD, azimuthDeg: (az + 360) % 360 };
}

/** First hour in [from, to) where the elevation crosses `deg` in the given direction. */
function crossing(p: Place, date: string, deg: number, rising: boolean, from: number, to: number): number | null {
  let prev = sunAt(p, date, from).elevationDeg;
  for (let h = from + 1 / 30; h < to; h += 1 / 30) {
    const e = sunAt(p, date, h).elevationDeg;
    if (rising ? prev < deg && e >= deg : prev > deg && e <= deg) return h;
    prev = e;
  }
  return null;
}

const roundTo5 = (h: number) => Math.round(h * 12) / 12;

export type DayMarks = { rise: number | null; set: number | null; morning: number; golden: number; evening: number };

export function dayMarks(p: Place, date: string): DayMarks {
  const rise = crossing(p, date, -0.833, true, 0, 12);
  const set = crossing(p, date, -0.833, false, 12, 24);
  const golden = crossing(p, date, 7, false, 12, 24);
  return {
    rise, set,
    morning: roundTo5(rise == null ? 8 : Math.max(7, rise + 1.5)),
    golden: roundTo5(golden ?? (set == null ? 17.5 : set - 0.7)),
    evening: roundTo5(Math.min(21.5, set == null ? 19.5 : set + 1.1)),
  };
}

/** Today's date and the decimal hour at the property, from its fixed UTC offset. */
export function propertyNow(tz: number, at = Date.now()): { date: string; hour: number } {
  const d = new Date(at + tz * 3600e3);
  return { date: d.toISOString().slice(0, 10), hour: d.getUTCHours() + d.getUTCMinutes() / 60 };
}

export function addDays(iso: string, n: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

/** What a guest would call this light. */
export function phaseOf(hour: number, elevation: number): string {
  if (elevation < -6) return 'Night';
  if (elevation < 0) return hour < 12 ? 'Dawn' : 'Blue hour';
  if (elevation < 10) return hour < 12 ? 'Early light' : 'Golden hour';
  if (hour < 11) return 'Morning';
  if (hour < 14.5) return 'Midday';
  return 'Afternoon';
}

export function phaseIcon(phase: string): 'sun' | 'sunset' | 'moon' {
  return phase === 'Night' || phase === 'Blue hour' || phase === 'Dawn' ? 'moon' : phase === 'Early light' || phase === 'Golden hour' ? 'sunset' : 'sun';
}
