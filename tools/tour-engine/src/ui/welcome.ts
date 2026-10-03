/* The welcome: the listing's cover photograph, the collection's voice, and a
   real loading bar. The 3D scene builds behind it, so by the time the guest
   has read the copy the apartment is usually ready. */
import type { SharedView } from '../contract';
import { attr, fmtHour, h, pad2, text } from './dom';
import { icon } from './icons';
import type { Ctx } from './types';

export function mountWelcome(ctx: Ctx, cover: string, fallbackCover: string, shared: SharedView | null, enter: () => void): HTMLElement {
  const { def, store } = ctx;
  const L = def.listing;

  /* "An elegant stay. A closer look." sets its second sentence in italics. */
  const split = /^(.+?[.!?])\s+(.+)$/.exec(L.tagline.trim());
  const title = h('h1', { class: 'wtitle', id: 'wtitle' }, split ? [split[1], ' ', h('em', null, split[2])] : L.tagline);

  const img = h('img', { src: cover, alt: '', decoding: 'async', fetchpriority: 'high' });
  img.addEventListener('error', () => { if (img.src !== new URL(fallbackCover, location.href).href) img.src = fallbackCover; }, { once: false });

  const plural = (n: number, one: string) => `${n} ${one}${n === 1 ? '' : 's'}`;
  const facts = [plural(L.guests, 'guest'), plural(L.bedrooms, 'bedroom'), plural(L.bathrooms, 'bath')].join(' · ');

  const loadLabel = h('span', { class: 'll' }, 'Preparing your private viewing');
  const loadPct = h('span', { class: 'lpct' }, '0%');
  const bar = h('i');
  const load = h('div', { class: 'load', role: 'status', 'aria-live': 'polite' },
    h('div', { class: 'lrow' }, loadLabel, loadPct), h('div', { class: 'wbar' }, bar));

  const enterLabel = h('span', null, shared ? 'Step into the shared view' : 'Enter the apartment');
  const enterBtn = h('button', { class: 'btn pri enter', type: 'button', disabled: true, onclick: enter }, enterLabel, icon('arrow'));
  const photosBtn = h('button', { class: 'btn quiet', type: 'button', onclick: () => ctx.openPhotos() }, icon('photos'), 'See the original photographs');

  let sharedNote: HTMLElement | null = null;
  if (shared) {
    const bits = [shared.mode === 'walk' ? ctx.roomName(shared.room) : shared.mode === 'dollhouse' ? 'The dollhouse view' : 'The floor plan'];
    if (shared.hour != null) bits.push(fmtHour(shared.hour));
    if (shared.date) {
      const [y, m, d] = shared.date.split('-').map(Number);
      bits.push(new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' }));
    }
    sharedNote = h('p', { class: 'shared' }, icon('link'), h('span', null, 'A view was shared with you', h('b', null, bits.join(' · '))));
  }

  const index = h('ol', { class: 'windex', 'aria-label': 'Rooms in this tour' },
    def.rooms.map((r, i) => h('li', null, h('span', null, pad2(i + 1)), r.name)));

  const el = h('section', { class: 'welcome', 'aria-labelledby': 'wtitle' },
    h('div', { class: 'wbg', 'aria-hidden': 'true' }, img),
    h('div', { class: 'wshade', 'aria-hidden': 'true' }),
    h('div', { class: 'wbody' },
      h('p', { class: 'k wk' }, h('i', { 'aria-hidden': 'true' }), def.theme.collection),
      title,
      h('p', { class: 'listing' }, L.title, h('span', null, `${L.area}, ${L.city}`)),
      h('p', { class: 'wdesc' }, L.description),
      h('ul', { class: 'chips', 'aria-label': 'In this tour' },
        h('li', null, icon('cube'), 'Walk every room'),
        h('li', null, icon('sunset'), 'Live Light'),
        h('li', null, icon('person'), facts)),
      sharedNote,
      load,
      h('div', { class: 'wact' }, enterBtn, photosBtn)),
    index,
    h('p', { class: 'wfoot' }, h('span', null, 'Photo-based reconstruction · Estimated dimensions · Simulated light'), h('span', null, `${L.city}, ${L.country}`)));

  store.on((s, c) => {
    if (c.has('load') || c.has('ready') || c.has('error')) {
      const pct = Math.round(s.load.progress * 100);
      bar.style.transform = `scaleX(${s.ready ? 1 : s.load.progress})`;
      text(loadPct, s.ready || s.error ? '' : pct + '%');
      text(loadLabel, s.error || (s.ready ? 'Ready when you are' : s.load.label || 'Preparing your private viewing'));
      el.classList.toggle('is-ready', s.ready);
      el.classList.toggle('is-error', !!s.error);
      attr(enterBtn, 'disabled', !s.ready && !s.error);
      text(enterLabel, s.error ? 'Explore the photographs' : shared ? 'Step into the shared view' : 'Enter the apartment');
    }
    if (c.has('phase')) {
      const on = s.phase === 'welcome';
      el.inert = !on;
      el.classList.toggle('is-gone', !on);
    }
  });
  return el;
}
