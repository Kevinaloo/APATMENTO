/* Plain DOM, built once and then updated in place. These helpers keep the
   widget code short without pulling in a framework. */

export type Kid = Node | string | number | null | undefined | false | Kid[];
type Attr = string | number | boolean | null | undefined | ((event: any) => void);

/** h('button', { class: 'x', onclick: fn, 'aria-label': 'Close' }, icon('close'), 'Close') */
export function h<K extends keyof HTMLElementTagNameMap>(tag: K, attrs?: Record<string, Attr> | null, ...kids: Kid[]): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  if (attrs) for (const key in attrs) {
    const v = attrs[key];
    if (v == null || v === false) continue;
    if (typeof v === 'function') el.addEventListener(key.slice(2), v);
    else el.setAttribute(key, v === true ? '' : String(v));
  }
  add(el, kids);
  return el;
}

function add(el: Node, kids: Kid[]): void {
  for (const k of kids) {
    if (k == null || k === false) continue;
    if (Array.isArray(k)) add(el, k);
    else el.appendChild(typeof k === 'object' ? k : document.createTextNode(String(k)));
  }
}

/** Writes text only when it changed: pose updates arrive ten times a second. */
export function text(el: Element, value: string): void {
  if (el.textContent !== value) el.textContent = value;
}

export function attr(el: Element, name: string, value: string | boolean | null): void {
  if (value === false || value == null) { if (el.hasAttribute(name)) el.removeAttribute(name); return; }
  const v = value === true ? '' : value;
  if (el.getAttribute(name) !== v) el.setAttribute(name, v);
}

export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
export const pad2 = (n: number) => String(n).padStart(2, '0');

/** 17.75 → '17:45' */
export function fmtHour(hour: number): string {
  const m = ((Math.round(hour * 60) % 1440) + 1440) % 1440;
  return pad2(Math.floor(m / 60)) + ':' + pad2(m % 60);
}

let uid = 0;
export const nextId = (p: string) => `ct-${p}-${++uid}`;

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select,textarea,[tabindex]:not([tabindex="-1"])';
export function focusables(root: Element): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(el => !el.closest('[hidden]') && el.getClientRects().length > 0);
}

/** Keeps Tab inside a dialog: the native modal already makes the page inert,
    this stops focus wandering out to the browser chrome and back in at the top. */
export function trapTab(event: KeyboardEvent, root: Element): void {
  if (event.key !== 'Tab') return;
  const items = focusables(root);
  if (!items.length) return;
  const first = items[0], last = items[items.length - 1];
  const active = document.activeElement;
  if (event.shiftKey && (active === first || !root.contains(active))) { event.preventDefault(); last.focus(); }
  else if (!event.shiftKey && active === last) { event.preventDefault(); first.focus(); }
}

/** Typing in a field must never walk the camera. */
export const isTyping = (t: EventTarget | null) =>
  t instanceof HTMLElement && (t.isContentEditable || (t instanceof HTMLInputElement && !['button', 'checkbox', 'radio', 'range'].includes(t.type)) || t instanceof HTMLTextAreaElement || t instanceof HTMLSelectElement);
