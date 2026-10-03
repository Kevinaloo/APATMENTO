/* Hints and toasts, bottom centre. One at a time: a newer message replaces
   the older, and the engine repeating itself does not restart the clock. */
import { h } from './dom';
import { icon } from './icons';

export function mountToasts(): { el: HTMLElement; show(text: string, tone?: 'ok' | 'warn'): void } {
  const el = h('div', { class: 'toasts', role: 'status', 'aria-live': 'polite' });
  let timer = 0, last = '', lastAt = 0;
  return {
    el,
    show(text, tone) {
      const now = performance.now();
      if (text === last && now - lastAt < 2500) return;
      last = text; lastAt = now;
      const t = h('div', { class: `toast gl${tone ? ' is-' + tone : ''}` }, tone === 'ok' ? icon('check') : tone === 'warn' ? icon('info') : icon('spark'), h('span', null, text));
      el.replaceChildren(t);
      clearTimeout(timer);
      timer = window.setTimeout(() => {
        t.classList.add('is-out');
        setTimeout(() => t.remove(), 400);
      }, Math.min(6000, 2200 + text.length * 45));
    },
  };
}
