/* The original photographs. The same gallery serves as a dialog over the 3D
   view and, when 3D cannot run, as the page itself. */
import { attr, h, pad2, text } from './dom';
import { icon } from './icons';
import type { Ctx } from './types';

type Group = { id: string; name: string; detail: string; room: boolean; photos: { id: number; name: string }[] };

export type Gallery = { el: HTMLElement; show(groupId?: string): void; step(n: number): void };

export function createGallery(ctx: Ctx, asPage: boolean): Gallery {
  const { def } = ctx;
  const groups: Group[] = def.rooms.map(r => ({ id: r.id, name: r.name, detail: r.detail, room: true, photos: r.photos.map(id => ({ id, name: r.name })) }));
  if (def.extraPhotos?.photos.length) groups.push({ ...def.extraPhotos, room: false });
  let gi = 0, pi = 0;

  const titleId = asPage ? 'fb-title' : 'ph-title';
  const kicker = h('span', { class: 'k' }, asPage ? 'The residence in photographs' : 'The original photographs');
  const title = h('h2', { id: titleId });
  const detail = h('p', { class: 'gdet' });
  const tabs = groups.map((g, i) => h('button', { type: 'button', 'aria-pressed': 'false', onclick: () => { gi = i; pi = 0; render(); } }, g.name));

  const img = h('img', { alt: '', decoding: 'async' });
  img.addEventListener('load', () => img.classList.remove('is-loading'));
  const count = h('span', { class: 'count' });
  const prev = h('button', { class: 'arrow is-prev', type: 'button', 'aria-label': 'Previous photograph', onclick: () => step(-1) }, icon('left'));
  const next = h('button', { class: 'arrow is-next', type: 'button', 'aria-label': 'Next photograph', onclick: () => step(1) }, icon('right'));
  const stage = h('div', { class: 'stage' }, img, prev, next, count);
  const thumbs = h('div', { class: 'thumbs', role: 'group', 'aria-label': 'Choose a photograph' });
  const caption = h('p', { class: 'gcap' });
  const walk = h('button', { class: 'btn line gwalk', type: 'button', onclick: () => { const g = groups[gi]; ctx.closeDialog(); ctx.chooseRoom(g.id); } }, icon('walk'), h('span'));

  /* Swipe the photograph on touch screens. */
  let sx = 0, sy = 0, sid = -1;
  stage.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse') { sid = e.pointerId; sx = e.clientX; sy = e.clientY; } });
  stage.addEventListener('pointerup', e => {
    if (e.pointerId !== sid) return;
    sid = -1;
    const dx = e.clientX - sx, dy = e.clientY - sy;
    if (Math.abs(dx) > 44 && Math.abs(dx) > Math.abs(dy) * 1.4) step(dx < 0 ? 1 : -1);
  });

  const el = h('div', { class: asPage ? 'gal is-page' : 'gal' },
    h('header', { class: 'ghead' },
      h('div', null, kicker, title, detail),
      asPage ? null : h('button', { class: 'round gclose', type: 'button', 'aria-label': 'Close the photographs', onclick: () => ctx.closeDialog() }, icon('close'))),
    h('div', { class: 'tabs', role: 'group', 'aria-label': 'Rooms' }, tabs),
    stage,
    h('div', { class: 'gfoot' }, caption, thumbs, asPage ? null : walk));

  function step(n: number) {
    const g = groups[gi];
    pi = (pi + n + g.photos.length) % g.photos.length;
    render();
  }

  function render() {
    const g = groups[gi], p = g.photos[pi];
    text(title, g.name);
    text(detail, g.detail);
    tabs.forEach((t, i) => attr(t, 'aria-pressed', i === gi ? 'true' : 'false'));
    const src = def.photoUrl(p.id);
    if (img.getAttribute('src') !== src) { img.classList.add('is-loading'); img.src = src; }
    img.alt = `${p.name}: original listing photograph ${pi + 1} of ${g.photos.length}`;
    text(count, `${pad2(pi + 1)} / ${pad2(g.photos.length)}`);
    text(caption, g.room ? `Photograph ${pi + 1} of ${g.photos.length}` : p.name);
    const single = g.photos.length < 2;
    prev.hidden = single; next.hidden = single;
    thumbs.replaceChildren(...g.photos.map((ph, i) => h('button', { type: 'button', 'aria-label': `${ph.name}, photograph ${i + 1}`, 'aria-pressed': i === pi ? 'true' : 'false', onclick: () => { pi = i; render(); } },
      h('img', { src: def.photoUrl(ph.id), alt: '', loading: 'lazy', decoding: 'async' }))));
    walk.hidden = !g.room || !!ctx.store.get().error;
    text(walk.lastElementChild!, `Walk into the ${g.name.toLowerCase()}`);
    /* Warm the neighbours so the arrows feel instant. */
    for (const k of [1, -1]) { const q = g.photos[(pi + k + g.photos.length) % g.photos.length]; if (q) new Image().src = def.photoUrl(q.id); }
  }

  return {
    el,
    step,
    show(groupId) {
      const i = groupId ? groups.findIndex(g => g.id === groupId) : -1;
      if (i >= 0) { gi = i; pi = 0; }
      render();
    },
  };
}
