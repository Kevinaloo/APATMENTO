/* Live Light: the real sun over the property, at any hour and date.

   A chip on the HUD tells the time of day at a glance; the panel draws the
   sun's path for the chosen date over the horizon, with the sun riding on it.
   Drag along the arc or the scrubber to move the hour, pick a preset, choose
   a check-in date, or go Live and follow the clock and weather there now. */
import type { LightState } from '../contract';
import { attr, fmtHour, h, text } from './dom';
import { icon } from './icons';
import { panelShell, setSwitch, toggle } from './parts';
import { addDays, dayMarks, phaseIcon, phaseOf, propertyNow, sunAt, type Place } from './sun-path';
import type { Ctx } from './types';

const NS = 'http://www.w3.org/2000/svg';
const H0 = 5, H1 = 22;                       // the scrubber's day: 05:00 → 22:00
const VB_W = 320, HORIZON = 92;
const xOf = (hour: number) => 14 + ((hour - H0) / (H1 - H0)) * (VB_W - 28);
/* Height is sin(elevation): the share of the sun that falls straight down. It
   rounds the equatorial "tent" of a near-overhead sun into a true arch. */
const yOf = (elev: number) => Math.max(8, Math.min(112, HORIZON - Math.sin(elev * Math.PI / 180) * 78));
const hourOfX = (x: number) => H0 + ((x - 14) / (VB_W - 28)) * (H1 - H0);

const svgEl = (tag: string, attrs: Record<string, string | number> = {}) => {
  const el = document.createElementNS(NS, tag);
  for (const k in attrs) el.setAttribute(k, String(attrs[k]));
  return el;
};

const dateLabel = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
};

export function mountLight(ctx: Ctx): { chip: HTMLElement; panel: HTMLElement } {
  const { def, store } = ctx;
  const L = def.listing;
  const place: Place = { lat: L.lat, lng: L.lng, tz: L.tzOffsetHours };
  const api = () => ctx.api();
  const leaveLive = () => { if (store.get().light?.live) api()?.setLive(false); };

  /* ── HUD chip ── */
  const chipIcon = h('span', { class: 'lci' }, icon('sun'));
  const chipTime = h('span', { class: 'lctm' }, '—');
  const chipPhase = h('span', { class: 'lcp' }, 'Live Light');
  const chipLive = h('span', { class: 'live' }, h('i'), 'Live');
  const chip = h('button', { class: 'lc gl', type: 'button', 'data-panel': 'light', 'aria-expanded': 'false', 'aria-label': 'Live Light: change the time of day', onclick: e => ctx.togglePanel('light', e.currentTarget as HTMLElement) },
    chipIcon, h('span', { class: 'lct' }, chipTime, chipPhase), chipLive);

  /* ── Sun arc ── */
  /* The range input below is the accessible control; the arc is its picture. */
  const arc = svgEl('svg', { viewBox: `0 0 ${VB_W} 132`, class: 'arc', 'aria-hidden': 'true' }) as SVGSVGElement;
  arc.innerHTML =
    '<defs><linearGradient id="arc-f" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--hi);stop-opacity:.28"/><stop offset="1" style="stop-color:var(--hi);stop-opacity:0"/></linearGradient>' +
    `<clipPath id="arc-d"><rect x="0" y="0" width="${VB_W}" height="${HORIZON}"/></clipPath><clipPath id="arc-n"><rect x="0" y="${HORIZON}" width="${VB_W}" height="60"/></clipPath>` +
    '<radialGradient id="sun-glow"><stop offset="0" style="stop-color:var(--hi);stop-opacity:.55"/><stop offset="1" style="stop-color:var(--hi);stop-opacity:0"/></radialGradient></defs>';
  /* Drawing styles are presentation attributes; tour.css only styles the sun's states. */
  const area = svgEl('path', { 'clip-path': 'url(#arc-d)', fill: 'url(#arc-f)' });
  const dayLine = svgEl('path', { 'clip-path': 'url(#arc-d)', fill: 'none', style: 'stroke:var(--hi)', 'stroke-width': 1.7 });
  const nightLine = svgEl('path', { 'clip-path': 'url(#arc-n)', fill: 'none', stroke: '#ffffff4d', 'stroke-width': 1.2, 'stroke-dasharray': '1 4', 'stroke-linecap': 'round' });
  const horizon = svgEl('line', { stroke: '#ffffff47', x1: 6, x2: VB_W - 6, y1: HORIZON, y2: HORIZON });
  const ticks = svgEl('g', { stroke: '#ffffff47', fill: '#ffffff6b', 'font-size': 10 });
  for (const t of [6, 9, 12, 15, 18, 21]) {
    ticks.append(svgEl('line', { x1: xOf(t), x2: xOf(t), y1: HORIZON - 3, y2: HORIZON + 3 }));
    const label = svgEl('text', { x: xOf(t), y: 126, 'text-anchor': 'middle', stroke: 'none' });
    label.textContent = String(t).padStart(2, '0');
    ticks.append(label);
  }
  const mark = { fill: '#ffffff9e', 'font-size': 9.5, 'font-weight': 600 };
  const riseLabel = svgEl('text', { ...mark, 'text-anchor': 'end' });
  const setLabel = svgEl('text', { ...mark, 'text-anchor': 'start' });
  const stem = svgEl('line', { style: 'stroke:rgba(var(--hr),.55)', 'stroke-dasharray': '2 3' });
  const glow = svgEl('circle', { r: 18, fill: 'url(#sun-glow)' });
  const sun = svgEl('circle', { r: 6.5, class: 'sun' });
  arc.append(area, horizon, ticks, nightLine, dayLine, riseLabel, setLabel, stem, glow, sun);

  /* Drag along the arc to move the hour. While a finger is on it, the engine's
     echo of the hour must not yank the scrubber back. */
  let raf = 0, pendingHour = -1, scrubbing = false;
  const pushHour = (hour: number) => {
    pendingHour = Math.round(Math.max(H0, Math.min(H1, hour)) * 12) / 12;
    if (raf) return;
    raf = requestAnimationFrame(() => { raf = 0; leaveLive(); api()?.setHour(pendingHour); });
  };
  const fromPointer = (e: PointerEvent) => {
    const r = arc.getBoundingClientRect();
    pushHour(hourOfX(((e.clientX - r.left) / r.width) * VB_W));
  };
  arc.addEventListener('pointerdown', e => { arc.setPointerCapture(e.pointerId); scrubbing = true; fromPointer(e); });
  arc.addEventListener('pointermove', e => { if (arc.hasPointerCapture(e.pointerId)) fromPointer(e); });
  const endArc = () => { scrubbing = false; };
  arc.addEventListener('pointerup', endArc);
  arc.addEventListener('pointercancel', endArc);

  /* ── Readout, scrubber, presets ── */
  const time = h('span', { class: 'ltime' }, '—');
  const phase = h('span', { class: 'lph' });
  const day = h('span', { class: 'lday' });
  const range = h('input', { class: 'range', 'data-autofocus': true, type: 'range', min: H0, max: H1, step: 1 / 12, value: 12, 'aria-label': 'Time of day at the property' });
  range.addEventListener('input', () => pushHour(Number(range.value)));
  range.addEventListener('pointerdown', () => { scrubbing = true; });
  range.addEventListener('pointerup', () => { scrubbing = false; });
  range.addEventListener('blur', () => { scrubbing = false; });

  const presetDefs = [
    { key: 'morning', label: 'Morning', ico: 'sun' as const },
    { key: 'golden', label: 'Golden hour', ico: 'sunset' as const },
    { key: 'evening', label: 'Evening', ico: 'moon' as const },
  ];
  let marks = dayMarks(place, propertyNow(place.tz).date);
  const presetTimes: HTMLElement[] = [];
  const presetButtons: HTMLButtonElement[] = [];
  const presets = h('div', { class: 'presets', role: 'group', 'aria-label': 'Moments' },
    presetDefs.map(p => {
      const t = h('small');
      presetTimes.push(t);
      const b = h('button', { type: 'button', 'data-preset': p.key, 'aria-pressed': 'false', onclick: () => { leaveLive(); api()?.setHour(marks[p.key as 'morning' | 'golden' | 'evening']); } }, icon(p.ico), h('span', null, p.label, t));
      presetButtons.push(b);
      return b;
    }));

  /* ── Dates ── */
  const todayBtn = h('button', { class: 'chip', type: 'button', 'aria-pressed': 'false', onclick: () => pickDate(propertyNow(place.tz).date) }, 'Today');
  const tomorrowBtn = h('button', { class: 'chip', type: 'button', 'aria-pressed': 'false', onclick: () => pickDate(addDays(propertyNow(place.tz).date, 1)) }, 'Tomorrow');
  const dateText = h('span', null, 'Check-in day');
  const dateInput = h('input', { type: 'date', 'aria-label': 'See it on your check-in day' });
  dateInput.addEventListener('change', () => { if (/^\d{4}-\d{2}-\d{2}$/.test(dateInput.value)) pickDate(dateInput.value); });
  /* The input covers the chip (so iOS opens its wheel); desktop browsers need asking. */
  dateInput.addEventListener('click', () => { try { dateInput.showPicker?.(); } catch { /* not from this gesture */ } });
  const dateChip = h('label', { class: 'chip cdate' }, icon('calendar'), dateText, dateInput);
  function pickDate(iso: string) { leaveLive(); api()?.setDate(iso); }

  /* ── Live ── */
  const liveSub = h('small');
  const liveSwitch = toggle([h('b', null, h('span', { class: 'live' }, h('i')), 'Live'), liveSub], () => {
    const on = !store.get().light?.live;
    api()?.setLive(on);
  }, 'lsw');

  const playLabel = h('span', null, 'Play the day');
  const playIcon = h('span', null, icon('play'));
  const play = h('button', { class: 'btn line play', type: 'button', 'aria-pressed': 'false', onclick: () => api()?.playDay(!store.get().light?.playing) }, playIcon, playLabel);

  const panel = panelShell(ctx, 'light', 'Live Light', 'The light here',
    h('div', { class: 'lread' }, time, h('span', { class: 'lmeta' }, phase, day)),
    arc,
    range,
    presets,
    h('div', { class: 'dates', role: 'group', 'aria-label': 'Date' }, todayBtn, tomorrowBtn, dateChip),
    liveSwitch,
    play,
    h('p', { class: 'fine' }, `A simulation of the real sun over ${L.area}. Not a photograph.`));
  ctx.registerPanel('light', { el: panel, keepOnScene: true, onOpen: () => render(store.get().light, true) });

  let drawnDate = '';
  function drawArc(date: string) {
    if (date === drawnDate) return;
    drawnDate = date;
    marks = dayMarks(place, date);
    const pts: string[] = [];
    for (let t = H0; t <= H1 + 1e-6; t += 1 / 6) pts.push(`${xOf(t).toFixed(1)} ${yOf(sunAt(place, date, t).elevationDeg).toFixed(1)}`);
    const d = 'M' + pts.join('L');
    dayLine.setAttribute('d', d);
    nightLine.setAttribute('d', d);
    area.setAttribute('d', `${d}L${xOf(H1)} ${HORIZON}L${xOf(H0)} ${HORIZON}Z`);
    const mark = (el: SVGElement, hour: number | null, dx: number) => {
      if (hour == null || hour < H0 || hour > H1) { el.textContent = ''; return; }
      el.setAttribute('x', String(xOf(hour) + dx));
      el.setAttribute('y', String(HORIZON - 7));
      el.textContent = fmtHour(hour);
    };
    /* Sunrise and sunset sit outside the arch, where the line is below the horizon. */
    mark(riseLabel, marks.rise, -6);
    mark(setLabel, marks.set, 6);
    presetTimes.forEach((t, i) => text(t, fmtHour(marks[presetDefs[i].key as 'morning' | 'golden' | 'evening'])));
  }

  function render(l: LightState | null, force = false) {
    const now = propertyNow(place.tz);
    if (!l) { drawArc(now.date); return; }
    if (!panel.hidden || force) {
      drawArc(l.date);
      const x = xOf(Math.max(H0, Math.min(H1, l.hour)));
      const y = yOf(sunAt(place, l.date, l.hour).elevationDeg);
      sun.setAttribute('cx', x.toFixed(1)); sun.setAttribute('cy', y.toFixed(1));
      glow.setAttribute('cx', x.toFixed(1)); glow.setAttribute('cy', y.toFixed(1));
      stem.setAttribute('x1', x.toFixed(1)); stem.setAttribute('x2', x.toFixed(1));
      stem.setAttribute('y1', y.toFixed(1)); stem.setAttribute('y2', String(HORIZON));
      arc.classList.toggle('is-night', l.sun.elevationDeg < 0);
    }
    const ph = phaseOf(l.hour, l.sun.elevationDeg);
    text(time, fmtHour(l.hour));
    text(phase, ph);
    const tomorrow = addDays(now.date, 1);
    text(day, l.date === now.date ? 'Today' : l.date === tomorrow ? 'Tomorrow' : dateLabel(l.date));
    if (!scrubbing) range.value = String(Math.max(H0, Math.min(H1, l.hour)));
    presetButtons.forEach((b, i) => attr(b, 'aria-pressed', !l.live && !l.playing && Math.abs(marks[presetDefs[i].key as 'morning' | 'golden' | 'evening'] - l.hour) < 0.05 ? 'true' : 'false'));
    attr(range, 'aria-valuetext', `${fmtHour(l.hour)}, ${ph}`);
    attr(todayBtn, 'aria-pressed', l.date === now.date ? 'true' : 'false');
    attr(tomorrowBtn, 'aria-pressed', l.date === tomorrow ? 'true' : 'false');
    const other = l.date !== now.date && l.date !== tomorrow;
    dateChip.classList.toggle('is-on', other);
    text(dateText, other ? dateLabel(l.date) : 'Check-in day');
    attr(dateInput, 'min', now.date);
    if (other && dateInput.value !== l.date) dateInput.value = l.date;

    setSwitch(liveSwitch, l.live);
    const w = l.weather;
    text(liveSub, l.live
      ? [`Now in ${L.area}`, fmtHour(l.hour), w ? `${Math.round(w.temp)}°` : '', w ? w.label : ''].filter(Boolean).join(' · ')
      : 'Follow the real time and weather there');
    attr(play, 'aria-pressed', l.playing ? 'true' : 'false');
    text(playLabel, l.playing ? 'Pause the day' : 'Play the day');
    playIcon.replaceChildren(icon(l.playing ? 'pause' : 'play'));

    /* The chip: a watch complication for the light. */
    const ico = phaseIcon(ph);
    if (chipIcon.dataset.ico !== ico) { chipIcon.dataset.ico = ico; chipIcon.replaceChildren(icon(ico)); }
    text(chipTime, fmtHour(l.hour));
    text(chipPhase, l.playing ? 'Playing the day' : ph);
    chip.classList.toggle('is-live', l.live);
    chip.classList.toggle('is-night', l.sun.elevationDeg < -2);
    attr(chip, 'aria-label', `Live Light: ${fmtHour(l.hour)}, ${ph}${l.live ? ', live' : ''}. Change the time of day`);
  }

  store.on((s, c) => { if (c.has('light')) render(s.light); });
  return { chip, panel };
}
