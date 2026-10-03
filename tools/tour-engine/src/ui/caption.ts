/* The editorial caption at the top left: where you are, in the collection's
   voice. During the guided tour it becomes the tour card, with progress. */
import { attr, h, pad2, text } from './dom';
import type { Ctx } from './types';

export function mountCaption(ctx: Ctx): HTMLElement {
  const { def, store } = ctx;
  const kicker = h('span', { class: 'k' });
  const title = h('h2', { class: 'ctitle' });
  const detail = h('p', { class: 'cdet' });
  const fill = h('i');
  const progress = h('div', { class: 'cbar', role: 'progressbar', 'aria-label': 'Guided tour progress', 'aria-valuemin': '0', 'aria-valuemax': '100' }, fill);
  const el = h('section', { class: 'caption', 'aria-label': 'Where you are' }, kicker, title, detail, progress);
  const n = def.rooms.length;

  store.on((s, c) => {
    if (!(c.has('room') || c.has('mode') || c.has('tour') || c.has('phase'))) return;
    let k: string, t: string, d: string;
    const touring = s.tour.playing && s.mode === 'walk';
    if (touring) {
      const r = def.rooms[Math.min(n - 1, Math.max(0, s.tour.index))];
      k = `Guided tour · ${pad2(s.tour.index + 1)} / ${pad2(n)}`; t = r.name; d = r.detail;
    } else if (s.mode === 'dollhouse') {
      k = 'The whole residence'; t = 'The whole picture.'; d = 'Turn it in your hands. Choose a room to step inside.';
    } else if (s.mode === 'plan') {
      k = 'Floor plan'; t = 'Room to explore.'; d = 'A view from above. Choose a room to walk there.';
    } else {
      const i = def.rooms.findIndex(r => r.id === s.room);
      const r = def.rooms[i];
      k = r ? `Room ${pad2(i + 1)} of ${pad2(n)}` : 'Between the rooms';
      t = r ? r.name : ctx.roomName(s.room);
      d = r ? r.detail : 'A quiet passage from one room to the next.';
    }
    if (title.textContent !== t) {
      /* Restart the fade so each new room arrives like a turned page. */
      el.classList.remove('is-new'); void el.offsetWidth; el.classList.add('is-new');
    }
    text(kicker, k); text(title, t); text(detail, d);
    el.classList.toggle('is-touring', touring);
    const pct = Math.round(Math.max(0, Math.min(1, s.tour.progress)) * 100);
    fill.style.transform = `scaleX(${pct / 100})`;
    attr(progress, 'aria-valuenow', String(pct));
  });
  return el;
}
