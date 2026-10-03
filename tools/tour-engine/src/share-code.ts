/* The "exact view" share code, shared by the tour UI and the listing page.

   A shared view travels in a URL as one opaque, URL-safe token:
     /apartments?open=<listing id>&tour=<token>     (the stays page opens the drawer, then the tour)
     /tours/<slug>/?v=<token>                       (the tour applies it after Enter)
   `tour=1` (no view) just opens the tour at its start.

   Token: fields joined by '~'
     room ~ x ~ z ~ yawDeg ~ pitchDeg ~ mode(w|d|p) ~ hour ~ date(YYYYMMDD)
   Numbers are fixed to 2 decimals (yaw/pitch to whole degrees); hour and date may be empty.
   Example: living~1.25~3.40~-26~-4~w~17.50~20261012 */
import type { Mode, SharedView } from './contract';

const MODE_CODE: Record<Mode, string> = { walk: 'w', dollhouse: 'd', plan: 'p' };
const CODE_MODE: Record<string, Mode> = { w: 'walk', d: 'dollhouse', p: 'plan' };
const ROOM_RE = /^[a-z0-9-]{1,32}$/;

export function encodeView(v: SharedView): string {
  const r = (n: number, d = 2) => (Math.round(n * 10 ** d) / 10 ** d).toFixed(d).replace(/\.?0+$/, '') || '0';
  return [
    ROOM_RE.test(v.room) ? v.room : 'start',
    r(v.x), r(v.z),
    Math.round(v.yaw * 180 / Math.PI), Math.round(v.pitch * 180 / Math.PI),
    MODE_CODE[v.mode] || 'w',
    v.hour == null ? '' : r(v.hour),
    v.date ? v.date.replace(/-/g, '') : '',
  ].join('~');
}

export function decodeView(token: string | null | undefined): SharedView | null {
  if (!token || token === '1' || token.length > 120) return null;
  const p = token.split('~');
  if (p.length < 6) return null;
  const n = (s: string) => (s === '' ? NaN : Number(s));
  const x = n(p[1]), z = n(p[2]), yawDeg = n(p[3]), pitchDeg = n(p[4]);
  if (![x, z, yawDeg, pitchDeg].every(Number.isFinite) || Math.abs(x) > 500 || Math.abs(z) > 500) return null;
  const view: SharedView = {
    room: ROOM_RE.test(p[0]) ? p[0] : 'start',
    x, z,
    yaw: yawDeg * Math.PI / 180,
    pitch: Math.max(-80, Math.min(80, pitchDeg)) * Math.PI / 180,
    mode: CODE_MODE[p[5]] || 'walk',
  };
  const hour = n(p[6] || '');
  if (Number.isFinite(hour) && hour >= 0 && hour <= 24) view.hour = hour;
  if (/^\d{8}$/.test(p[7] || '')) view.date = p[7].slice(0, 4) + '-' + p[7].slice(4, 6) + '-' + p[7].slice(6, 8);
  return view;
}
