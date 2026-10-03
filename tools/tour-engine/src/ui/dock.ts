/* The room dock: a contact sheet of the rooms, with the guided tour at its
   head. On phones it is a strip that folds into a pill naming the room. */
import { attr, h, pad2, text } from './dom';
import { icon } from './icons';
import type { Ctx } from './types';

const RING = 2 * Math.PI * 16;

export function mountDock(ctx: Ctx): HTMLElement {
  const { def, store } = ctx;
  const n = def.rooms.length;

  const ring = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  ring.setAttribute('viewBox', '0 0 36 36');
  ring.setAttribute('class', 'ring');
  ring.setAttribute('aria-hidden', 'true');
  ring.innerHTML = `<g fill="none" stroke-width="1.6"><circle cx="18" cy="18" r="16" stroke="#ffffff38"/><circle class="ringp" cx="18" cy="18" r="16" style="stroke:var(--hi)" stroke-linecap="round" stroke-dasharray="${RING}" stroke-dashoffset="${RING}"/></g>`;
  const ringP = ring.lastElementChild as SVGCircleElement;
  const playIcon = h('span', { class: 'tico' }, icon('play'));
  const tourSub = h('small', null, `${n} rooms`);
  const tourBtn = h('button', { class: 'tourb', type: 'button', 'aria-pressed': 'false', onclick: () => ctx.toggleTour() },
    h('span', { class: 'dial' }, ring, playIcon),
    h('span', { class: 'tourt' }, h('b', null, 'Guided tour'), tourSub));

  const roomButtons = def.rooms.map((r, i) =>
    h('button', { class: 'room', type: 'button', 'data-room': r.id, 'aria-label': `${r.name}. ${r.detail}`, onclick: () => ctx.chooseRoom(r.id) },
      h('span', { class: 'rimg' }, h('img', { src: def.photoUrl(r.image), alt: '', loading: 'lazy', decoding: 'async' })),
      h('span', { class: 'rname' }, h('i', null, pad2(i + 1)), r.name)));
  const rooms = h('div', { class: 'rooms' }, roomButtons);

  const pillKicker = h('span', { class: 'k' });
  const pillName = h('b');
  const pillChevron = h('span', { class: 'chev' }, icon('up'));
  const pill = h('button', { class: 'pill', type: 'button', 'aria-expanded': 'true', 'aria-label': 'Show or hide the rooms', onclick: () => store.set({ dockOpen: !store.get().dockOpen }) },
    h('span', { class: 'pt' }, pillKicker, pillName), pillChevron);

  const el = h('nav', { class: 'dock', 'aria-label': 'Rooms' }, h('div', { class: 'dbar' }, tourBtn, pill), rooms);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');

  store.on((s, c) => {
    if (c.has('room') || c.has('mode')) {
      const i = def.rooms.findIndex(r => r.id === s.room);
      roomButtons.forEach(b => {
        const here = b.dataset.room === s.room;
        attr(b, 'aria-current', here ? 'location' : false);
        b.classList.toggle('is-here', here && s.mode === 'walk');
      });
      text(pillKicker, i >= 0 ? `${pad2(i + 1)} / ${pad2(n)}` : 'Rooms');
      text(pillName, s.mode === 'walk' ? ctx.roomName(s.room) : s.mode === 'plan' ? 'Floor plan' : 'Dollhouse');
      const b = roomButtons[i];
      /* Keep the current room in view without asking the page to scroll. */
      if (b && rooms.scrollWidth > rooms.clientWidth) {
        rooms.scrollTo({ left: b.offsetLeft - (rooms.clientWidth - b.offsetWidth) / 2, behavior: reduced.matches ? 'auto' : 'smooth' });
      }
    }
    if (c.has('tour')) {
      const { playing, index, progress } = s.tour;
      attr(tourBtn, 'aria-pressed', playing ? 'true' : 'false');
      attr(tourBtn, 'aria-label', playing ? 'Pause the guided tour' : 'Start the guided tour');
      playIcon.replaceChildren(icon(playing ? 'pause' : 'play'));
      ringP.setAttribute('stroke-dashoffset', String(RING * (1 - Math.max(0, Math.min(1, playing ? progress : 0)))));
      text(tourSub, playing ? `${pad2(index + 1)} of ${pad2(n)} · ${def.rooms[Math.min(n - 1, index)]?.name ?? ''}` : `${n} rooms`);
      el.classList.toggle('is-touring', playing);
    }
    if (c.has('dockOpen')) {
      el.classList.toggle('is-folded', !s.dockOpen);
      attr(pill, 'aria-expanded', s.dockOpen ? 'true' : 'false');
      pillChevron.replaceChildren(icon(s.dockOpen ? 'down' : 'up'));
    }
  });
  return el;
}
