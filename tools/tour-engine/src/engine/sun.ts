/* Where the real sun is, for a place, a date and a local hour.

   The NOAA solar calculator (Meeus' low-precision formulae): good to a
   fraction of a degree between 1800 and 2100, which is far below what a
   guest could see in a shadow. Includes the equation of time and
   atmospheric refraction, so sunrise lands on the published minute.

   The date is passed as a Julian day number so the per-frame call during a
   time-lapse never parses strings or allocates. */
import { clamp, mod } from './util';

export type SunPosition = { azimuthDeg: number; elevationDeg: number };

const RAD = Math.PI / 180;

/** Julian day at 00:00 UT of a calendar date 'YYYY-MM-DD'. */
export function julianDay(isoDate: string) {
  const [y, m, d] = isoDate.split('-').map(Number);
  return Date.UTC(y, m - 1, d) / 86400000 + 2440587.5;
}

/**
 * @param jd0  julianDay() of the local calendar date at the property
 * @param hour local decimal hour at the property (0–24)
 * @param tz   property UTC offset in hours (3 for Nairobi)
 * @param out  receives azimuth (degrees clockwise from true north) and elevation (degrees above the horizon)
 */
export function solarPosition(jd0: number, hour: number, tz: number, lat: number, lng: number, out: SunPosition): SunPosition {
  const jd = jd0 + (hour - tz) / 24;
  const t = (jd - 2451545) / 36525;
  const l0 = mod(280.46646 + t * (36000.76983 + t * 0.0003032), 360);
  const m = (357.52911 + t * (35999.05029 - 0.0001537 * t)) * RAD;
  const e = 0.016708634 - t * (0.000042037 + 0.0000001267 * t);
  const c = Math.sin(m) * (1.914602 - t * (0.004817 + 0.000014 * t)) + Math.sin(2 * m) * (0.019993 - 0.000101 * t) + Math.sin(3 * m) * 0.000289;
  const omega = (125.04 - 1934.136 * t) * RAD;
  const lambda = (l0 + c - 0.00569 - 0.00478 * Math.sin(omega)) * RAD;
  const eps0 = 23 + (26 + (21.448 - t * (46.815 + t * (0.00059 - t * 0.001813))) / 60) / 60;
  const eps = (eps0 + 0.00256 * Math.cos(omega)) * RAD;
  const decl = Math.asin(Math.sin(eps) * Math.sin(lambda));

  // Equation of time, minutes: the sundial runs up to ±16 min off the clock.
  const y = Math.tan(eps / 2) ** 2, l0r = l0 * RAD;
  const eot = (4 / RAD) * (y * Math.sin(2 * l0r) - 2 * e * Math.sin(m) + 4 * e * y * Math.sin(m) * Math.cos(2 * l0r)
    - 0.5 * y * y * Math.sin(4 * l0r) - 1.25 * e * e * Math.sin(2 * m));

  const trueSolar = mod(hour * 60 + eot + 4 * lng - 60 * tz, 1440);
  const ha = (trueSolar / 4 - 180) * RAD;
  const latr = lat * RAD;
  const cosZenith = clamp(Math.sin(latr) * Math.sin(decl) + Math.cos(latr) * Math.cos(decl) * Math.cos(ha), -1, 1);
  const zenith = Math.acos(cosZenith);

  const denom = Math.cos(latr) * Math.sin(zenith);
  let azimuth = lat > 0 ? 180 : 0;
  if (Math.abs(denom) > 1e-9) {
    const a = Math.acos(clamp((Math.sin(latr) * cosZenith - Math.sin(decl)) / denom, -1, 1)) / RAD;
    azimuth = ha > 0 ? mod(a + 180, 360) : mod(540 - a, 360);
  }

  const elevation = 90 - zenith / RAD;
  let refraction = 0;
  if (elevation <= 85) {
    const te = Math.tan(elevation * RAD);
    if (elevation > 5) refraction = 58.1 / te - 0.07 / te ** 3 + 0.000086 / te ** 5;
    else if (elevation > -0.575) refraction = 1735 + elevation * (-518.2 + elevation * (103.4 + elevation * (-12.79 + elevation * 0.711)));
    else refraction = -20.772 / te;
    refraction /= 3600;
  }
  out.azimuthDeg = azimuth;
  out.elevationDeg = elevation + refraction;
  return out;
}

/**
 * Black-body colour of a temperature in kelvin, as sRGB 0..1 (Tanner Helland's fit).
 * Written into `out` so it can run per frame without allocating.
 */
export function kelvinToRGB(kelvin: number, out: { r: number; g: number; b: number }) {
  const t = clamp(kelvin, 1000, 40000) / 100;
  let r: number, g: number, b: number;
  if (t <= 66) {
    r = 255;
    g = 99.4708025861 * Math.log(t) - 161.1195681661;
    b = t <= 19 ? 0 : 138.5177312231 * Math.log(t - 10) - 305.0447927307;
  } else {
    r = 329.698727446 * Math.pow(t - 60, -0.1332047592);
    g = 288.1221695283 * Math.pow(t - 60, -0.0755148492);
    b = 255;
  }
  out.r = clamp(r, 0, 255) / 255;
  out.g = clamp(g, 0, 255) / 255;
  out.b = clamp(b, 0, 255) / 255;
  return out;
}
