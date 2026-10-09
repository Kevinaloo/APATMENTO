/* Small building blocks shared by the panels. */
import { attr, h, nextId, type Kid } from './dom';
import { icon } from './icons';
import type { Ctx, Panel } from './types';

/** A glass panel: popover on desktop, bottom sheet on phones. */
export function panelShell(ctx: Ctx, name: Panel, kicker: string, title: string, ...body: Kid[]): HTMLElement {
  const id = nextId(name);
  return h('section', { class: `panel gd p-${name}`, role: 'dialog', 'aria-modal': 'false', 'aria-labelledby': id, hidden: true },
    h('header', { class: 'ph' },
      h('div', null, h('span', { class: 'k' }, kicker), h('h2', { id }, title)),
      h('button', { class: 'x', type: 'button', 'aria-label': `Close ${title}`, onclick: () => ctx.closePanel() }, icon('close'))),
    ...body);
}

/** An on/off switch with a visible label. */
export function toggle(label: Kid, onchange: () => void, cls = ''): HTMLButtonElement {
  return h('button', { class: 'sw ' + cls, type: 'button', role: 'switch', 'aria-checked': 'false', onclick: onchange },
    h('span', { class: 'swl' }, label), h('span', { class: 'trk', 'aria-hidden': 'true' }, h('i')));
}

export const setSwitch = (b: Element, on: boolean) => attr(b, 'aria-checked', on ? 'true' : 'false');

/** A row of mutually exclusive choices. */
export function segmented<T extends string | number>(label: string, options: { value: T; label: Kid; hint?: string }[], onpick: (v: T) => void): { el: HTMLElement; set(v: T | null): void } {
  const buttons = options.map(o => h('button', { type: 'button', 'aria-pressed': 'false', title: o.hint, onclick: () => onpick(o.value) }, o.label));
  return {
    el: h('div', { class: 'seg', role: 'group', 'aria-label': label }, buttons),
    set(v) { buttons.forEach((b, i) => attr(b, 'aria-pressed', options[i].value === v ? 'true' : 'false')); },
  };
}

/** A labelled row inside a panel. */
export const row = (label: string, ...kids: Kid[]) => h('div', { class: 'row' }, h('span', { class: 'rl' }, label), ...kids);
