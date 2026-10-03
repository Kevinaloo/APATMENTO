/* About: what this is, how to move, and the honest limits of a model built
   from photographs. */
import { h } from './dom';
import { icon, type IconName } from './icons';
import type { Ctx } from './types';

export function aboutContent(ctx: Ctx): HTMLElement {
  const { def } = ctx;
  const L = def.listing;
  const cover = def.photoUrl((def.rooms.find(r => r.id === def.start) || def.rooms[0]).image);
  const WORDS = ['', 'one', 'two', 'three', 'four', 'five', 'six'];
  const home = L.bedrooms === 0 ? 'studio' : `${WORDS[L.bedrooms] || L.bedrooms}-bedroom home`;
  const how = (ico: IconName, title: string, body: string) => h('li', null, icon(ico), h('div', null, h('b', null, title), h('span', null, body)));
  return h('div', { class: 'about' },
    h('figure', { class: 'a-img' }, h('img', { src: cover, alt: `${L.title}, from the original listing photographs`, loading: 'lazy' }), h('figcaption', { class: 'k' }, def.theme.collection)),
    h('div', { class: 'a-body' },
      h('header', { class: 'ghead' },
        h('div', null, h('span', { class: 'k' }, 'About this view'), h('h2', { id: 'a-title' }, 'A home, rebuilt from its photographs.')),
        h('button', { class: 'round gclose', type: 'button', 'aria-label': 'Close', onclick: () => ctx.closeDialog() }, icon('close'))),
      h('p', { class: 'lede' }, `An interactive interpretation of this ${home} in ${L.area}, ${L.city}, modelled by hand from the original listing photographs. Walk through it, step back into the dollhouse, or watch the sun move across the rooms.`),
      h('h3', { class: 'k' }, 'How to move'),
      h('ul', { class: 'howto' },
        how('walk', 'Walk', 'W A S D or the arrow keys. On a phone, hold the lower left of the screen and steer with your thumb.'),
        how('mouse', 'Look', 'Drag anywhere. Mouse look follows the mouse until you press Esc. On a phone, swipe, or turn on motion look.'),
        how('feet', 'Go somewhere', 'Click or tap the floor, choose a room below, or use the map.'),
        how('sunset', 'Live Light', `The real sun over ${L.area} at any hour, on any date, or live with today’s weather.`)),
      h('div', { class: 'note' }, icon('info'), h('p', null, h('b', null, 'Honest limits. '), def.accuracyNote)),
      h('p', { class: 'fine' }, 'Lighting is a simulation of the sun’s position at the property, not a photograph. The original photographs show the actual apartment.'),
      h('div', { class: 'a-act' },
        h('a', { class: 'btn pri', href: ctx.listingUrl, target: '_top' }, 'View the listing', icon('out')),
        h('button', { class: 'btn quiet', type: 'button', onclick: () => { ctx.closeDialog(); ctx.openPhotos(); } }, icon('photos'), 'See the original photographs'))));
}
