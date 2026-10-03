/* Turns def.theme into CSS variables on the shell.

   Every tour brings its own four colours, so the stylesheet never names a
   colour of its own. Some derived tones are computed here rather than with
   color-mix(), which older Safari (still common on Nairobi phones) lacks. */
import type { TourDefinition } from '../contract';

type RGB = [number, number, number];

function parse(c: string, fallback: RGB): RGB {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(c || '').trim());
  if (!m) return fallback;
  const s = m[1].length === 3 ? m[1].replace(/./g, ch => ch + ch) : m[1];
  return [0, 2, 4].map(i => parseInt(s.slice(i, i + 2), 16)) as RGB;
}

const mix = (a: RGB, b: RGB, t: number) => a.map((v, i) => Math.round(v + (b[i] - v) * t)) as RGB;

function luminance(c: RGB): number {
  const f = (v: number) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]);
}

export function applyTheme(el: HTMLElement, theme: TourDefinition['theme']): void {
  const night = parse(theme.night, [20, 35, 29]);
  const paper = parse(theme.paper, [246, 242, 233]);
  const accent = parse(theme.accent, [196, 164, 107]);
  const ink = parse(theme.accentInk, luminance(accent) > 0.4 ? night : [255, 255, 255]);
  /* The HUD is smoked glass. A deep signature colour (a forest green, say) would
     vanish on it, so lift it toward the paper tone until it reads as a line or a dot. */
  let hi = accent;
  for (let i = 0; i < 8 && luminance(hi) < 0.32; i++) hi = mix(hi, paper, 0.22);
  /* On paper the opposite: a champagne gold is too pale for text. */
  let lo = accent;
  for (let i = 0; i < 8 && luminance(lo) > 0.16; i++) lo = mix(lo, night, 0.22);
  const rgb = (c: RGB) => c.join(',');
  const vars: Record<string, string> = {
    /* Short names: the stylesheet uses them as rgba(var(--nr), a) dozens of times. */
    '--accent': `rgb(${rgb(accent)})`, '--ink': `rgb(${rgb(ink)})`,
    '--hi': `rgb(${rgb(hi)})`, '--hr': rgb(hi), '--lo': `rgb(${rgb(lo)})`,
    '--night': `rgb(${rgb(night)})`, '--nr': rgb(night), '--paper': `rgb(${rgb(paper)})`,
  };
  for (const k in vars) el.style.setProperty(k, vars[k]);
}
