/* Inline icons, drawn on a 24-unit grid with a 1.6 stroke so they sit with the
   hairline type. Filled shapes say so with fill="currentColor". */

const ICONS = {
  walk: '<circle cx="13.2" cy="4.4" r="1.7"/><path d="M10.6 21l1.9-5.4-2.4-2.6.9-4.6 3.6 3.2 3 .7M11 8.4 8 9.7l-1.4 3M14.2 15.4l2.3 2.5L17 21"/>',
  dollhouse: '<path d="M3 10.6 12 4l9 6.6"/><path d="M5 9.2V20h14V9.2M5 14.6h14M12 9.6V20"/>',
  plan: '<rect x="3.5" y="3.5" width="17" height="17" rx="1.6"/><path d="M3.5 12.5h6.5v8M10 3.5v5M14 12.5h6.5M14 12.5v3.5"/>',
  share: '<path d="M12 3.5v11.5M7.8 7.6 12 3.5l4.2 4.1"/><path d="M8.5 10.5H6.4A1.4 1.4 0 0 0 5 11.9v7.2a1.4 1.4 0 0 0 1.4 1.4h11.2a1.4 1.4 0 0 0 1.4-1.4v-7.2a1.4 1.4 0 0 0-1.4-1.4h-2.1"/>',
  photos: '<rect x="3" y="6" width="14.5" height="12.5" rx="1.8"/><path d="m3.4 16 3.9-3.9 3.6 3.6 2.4-2.4 3.8 3.8"/><circle cx="12.6" cy="10" r="1.2"/><path d="M6.5 3.5h11.7A2.3 2.3 0 0 1 20.5 5.8V15"/>',
  sun: '<circle cx="12" cy="12" r="3.8"/><path d="M12 2.8v2M12 19.2v2M5.5 5.5l1.4 1.4M17.1 17.1l1.4 1.4M2.8 12h2M19.2 12h2M5.5 18.5l1.4-1.4M17.1 6.9l1.4-1.4"/>',
  sunset: '<path d="M7 16.5a5 5 0 0 1 10 0"/><path d="M3 16.5h18M6.5 20h11M12 4.5V8M4.9 9.4l1.9 1.5M19.1 9.4l-1.9 1.5"/>',
  moon: '<path d="M19.5 14.6A7.8 7.8 0 1 1 9.4 4.5a6.2 6.2 0 0 0 10.1 10.1Z"/>',
  sound: '<path d="M4 9.6v4.8h3.4l4.6 4.1V5.5L7.4 9.6Z"/><path d="M15.4 9.2a4 4 0 0 1 0 5.6M18 6.6a7.6 7.6 0 0 1 0 10.8"/>',
  mute: '<path d="M4 9.6v4.8h3.4l4.6 4.1V5.5L7.4 9.6Z"/><path d="m15.8 9.8 4.4 4.4M20.2 9.8l-4.4 4.4"/>',
  sliders: '<path d="M4 7.5h9.5M18.5 7.5H20M4 16.5h1.5M10.5 16.5H20"/><circle cx="16" cy="7.5" r="2.2"/><circle cx="8" cy="16.5" r="2.2"/>',
  expand: '<path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5"/>',
  shrink: '<path d="M9 4v5H4M20 9h-5V4M15 20v-5h5M4 15h5v5"/>',
  close: '<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>',
  info: '<circle cx="12" cy="12" r="8.6"/><path d="M12 11v5.4M12 7.7v.2"/>',
  play: '<path d="M8.5 5.8v12.4a.6.6 0 0 0 .9.5l9.7-6.2a.6.6 0 0 0 0-1L9.4 5.3a.6.6 0 0 0-.9.5Z" fill="currentColor" stroke="none"/>',
  pause: '<rect x="7" y="5.5" width="3.4" height="13" rx="1" fill="currentColor" stroke="none"/><rect x="13.6" y="5.5" width="3.4" height="13" rx="1" fill="currentColor" stroke="none"/>',
  left: '<path d="m14.5 6-6 6 6 6"/>',
  right: '<path d="m9.5 6 6 6-6 6"/>',
  up: '<path d="m6 14.5 6-6 6 6"/>',
  down: '<path d="m6 9.5 6 6 6-6"/>',
  out: '<path d="M7.5 16.5l9-9M9 7.5h7.5V15"/>',
  arrow: '<path d="M4.5 12h14.5M13.5 6.5 19 12l-5.5 5.5"/>',
  check: '<path d="m5 12.6 4.4 4.4L19 7.4"/>',
  link: '<path d="M10.2 13.8a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M13.8 10.2a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  chat: '<path d="M4.2 20.2 5.4 16.6A8.3 8.3 0 1 1 8 19.1Z"/><path d="M9.2 8.6c0 3.4 2.8 6.2 6.2 6.2l1-1.7-2-1-1 .9a5 5 0 0 1-2.4-2.4l.9-1-1-2Z" fill="currentColor" stroke="none"/>',
  download: '<path d="M12 3.5v11.5M7.2 10.4 12 15.2l4.8-4.8M4.5 20.5h15"/>',
  gyro: '<rect x="8.2" y="3.5" width="7.6" height="17" rx="2"/><path d="M4.6 7.6a8.8 8.8 0 0 0 0 8.8M19.4 7.6a8.8 8.8 0 0 1 0 8.8M11 17.6h2"/>',
  run: '<circle cx="15" cy="4.3" r="1.8"/><path d="M4.5 20.5 8 16l3.4 1.6 1.6-4.9M7.6 10.4l3-2.6c.7-.6 1.7-.7 2.4-.2l2.2 1.8 1.4 3 3 .9M13 12.7l3.4 2.6-.7 5.2"/>',
  mouse: '<rect x="6.5" y="3" width="11" height="18" rx="5.5"/><path d="M12 6.8v3.4"/>',
  map: '<path d="M9 4.6 3.6 6.4v13l5.4-1.8 6 2 5.4-1.8v-13L15 6.6Z"/><path d="M9 4.6v13M15 6.6v13"/>',
  more: '<circle cx="5.5" cy="12" r="1.5" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none"/><circle cx="18.5" cy="12" r="1.5" fill="currentColor" stroke="none"/>',
  reset: '<path d="M4.4 12.5a7.6 7.6 0 1 0 2.2-5.9L4.4 8.8"/><path d="M4.4 4.4v4.4h4.4"/>',
  calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
  spark: '<path d="M12 3.5c.6 4 2.5 5.9 6.5 6.5-4 .6-5.9 2.5-6.5 6.5-.6-4-2.5-5.9-6.5-6.5 4-.6 5.9-2.5 6.5-6.5Z"/><path d="M18.5 15.5c.2 1.4.9 2.1 2.3 2.3-1.4.2-2.1.9-2.3 2.3-.2-1.4-.9-2.1-2.3-2.3 1.4-.2 2.1-.9 2.3-2.3Z"/>',
  cube: '<path d="M12 3 3.8 7.5v9L12 21l8.2-4.5v-9Z"/><path d="M3.8 7.5 12 12l8.2-4.5M12 12v9"/>',
  person: '<circle cx="12" cy="4.6" r="2"/><path d="M12 8.2v6.6M12 14.8l-2.8 5.8M12 14.8l2.8 5.8M7.4 10.8h9.2"/>',
  compass: '<circle cx="12" cy="12" r="8.6"/><path d="m14.9 9.1-1.6 4.2-4.2 1.6 1.6-4.2Z"/>',
  feet: '<path d="M8.6 3.4c-2 0-3 2.2-3 4.7 0 2.2.9 3.5 1.1 5.4h3.8c.2-1.9 1.1-3.2 1.1-5.4 0-2.5-1-4.7-3-4.7ZM6.8 16h3.8v1.2a1.9 1.9 0 0 1-3.8 0Z"/><path d="M15.4 7.4c2 0 3 2.2 3 4.7 0 2.2-.9 3.5-1.1 5.4h-3.8c-.2-1.9-1.1-3.2-1.1-5.4 0-2.5 1-4.7 3-4.7ZM13.5 20.1h3.8v.4a1.9 1.9 0 0 1-3.8 0Z"/>',
  copy: '<rect x="8.5" y="8.5" width="11.5" height="11.5" rx="2"/><path d="M15.5 8.5V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7.5a2 2 0 0 0 2 2h2.5"/>',
} as const;

export type IconName = keyof typeof ICONS;

export function icon(name: IconName, cls = ''): SVGSVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  svg.setAttribute('class', cls ? 'ic ' + cls : 'ic');
  svg.innerHTML = ICONS[name];
  return svg;
}

/** The Cabana leaf, from the brand mark. */
export function brandMark(): SVGSVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 32 38');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('class', 'mark');
  svg.innerHTML = '<path d="M25 10C22 3 9 3 6 11C1 24 12 36 25 28M9 24L24 9M14 21C11 13 16 8 24 9C25 16 22 21 14 21Z"/>';
  return svg;
}

export const ICON_NAMES = Object.keys(ICONS) as IconName[];
