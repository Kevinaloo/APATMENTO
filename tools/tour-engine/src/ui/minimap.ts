/* The minimap: def.plan drawn in world coordinates (x to the right, z down),
   a live dot with a view cone from onPose, rooms you can click. On phones it
   folds into a corner button. */
import { h } from './dom';
import { icon } from './icons';
import type { Ctx } from './types';

const NS = 'http://www.w3.org/2000/svg';
const s = <K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number> = {}) => {
  const el = document.createElementNS(NS, tag);
  for (const k in attrs) el.setAttribute(k, String(attrs[k]));
  return el;
};

export function mountMinimap(ctx: Ctx): { card: HTMLElement; button: HTMLElement } {
  const { def, store } = ctx;
  const b = def.plan.bounds;
  const W = b.maxX - b.minX, D = b.maxZ - b.minZ, size = Math.max(W, D);
  const pad = size * 0.04;
  const svg = s('svg', { viewBox: `${b.minX - pad} ${b.minZ - pad} ${W + pad * 2} ${D + pad * 2}`, class: 'plan', role: 'group', 'aria-label': 'Floor plan. Choose a room to walk there.' });
  svg.style.setProperty('--u', String(size / 100));

  const roomEls = new Map<string, SVGGElement>();
  for (const r of def.plan.rooms) {
    const quiet = r.hall || !def.views[r.id];
    const g = s('g', { class: quiet ? 'pr is-hall' : 'pr' });
    /* Drawing styles live here as presentation attributes; tour.css only adds states. */
    g.append(s('rect', { x: r.x, y: r.z, width: r.w, height: r.d, rx: size * 0.006, fill: quiet ? '#ffffff06' : '#ffffff12', stroke: '#ffffff6b', 'stroke-width': 1, 'vector-effect': 'non-scaling-stroke', ...(quiet ? { 'stroke-dasharray': '3 3' } : {}) }));
    const cx = r.x + r.w / 2, cz = r.z + r.d / 2;
    const t = s('text', { x: cx, y: cz, 'text-anchor': 'middle', 'dominant-baseline': 'central', 'font-size': size * 0.035, 'font-weight': 600, 'letter-spacing': size * 0.002, fill: '#ffffff94' });
    /* Corridors are tall and thin: their label runs along them. */
    if (r.d > r.w * 1.6 && r.w < size * 0.18) t.setAttribute('transform', `rotate(-90 ${cx} ${cz})`);
    t.textContent = r.label;
    g.append(t);
    /* Only rooms the tour can stand in are doors; the rest are drawn for context. */
    if (!r.hall && def.views[r.id]) {
      const go = () => { ctx.chooseRoom(r.id); if (store.get().panel === 'map') ctx.closePanel(); };
      g.setAttribute('role', 'button');
      g.setAttribute('tabindex', '0');
      g.setAttribute('aria-label', `Walk to the ${ctx.roomName(r.id).toLowerCase()}`);
      g.addEventListener('click', go);
      g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
    }
    roomEls.set(r.id, g);
    svg.append(g);
  }

  /* The cone points up (−z) before rotation; yaw = atan2(dx, dz), so rotating by
     180° − yaw turns (0, −1) into (sin yaw, cos yaw). */
  const R = size * 0.085;
  const defs = s('defs');
  const grad = s('radialGradient', { id: 'cone', cx: 0, cy: 0, r: R, gradientUnits: 'userSpaceOnUse' });
  /* Presentation attributes cannot read CSS variables; inline style can. */
  grad.append(s('stop', { offset: 0, style: 'stop-color:var(--hi);stop-opacity:.6' }), s('stop', { offset: 1, style: 'stop-color:var(--hi);stop-opacity:0' }));
  defs.append(grad);
  svg.prepend(defs);
  const me = s('g', { class: 'me', 'aria-hidden': 'true' });
  const cone = s('path', { d: `M0 0L${-R * 0.66} ${-R}Q0 ${-R * 1.28} ${R * 0.66} ${-R}Z`, fill: 'url(#cone)' });
  me.append(cone, s('circle', { r: size * 0.03, class: 'mehalo', style: 'fill:rgba(var(--hr),.28)' }),
    s('circle', { r: size * 0.016, style: 'fill:var(--hi)', stroke: '#fff', 'stroke-width': 1.5, 'vector-effect': 'non-scaling-stroke' }));
  svg.append(me);

  const expand = h('button', { class: 'x', type: 'button', 'aria-label': 'Open the floor plan', onclick: () => { ctx.setMode(store.get().mode === 'plan' ? 'walk' : 'plan'); ctx.closePanel(); } }, icon('out'));
  const card = h('aside', { class: 'map gl', 'aria-label': 'Map of the apartment' },
    h('header', null, h('span', { class: 'k' }, icon('compass'), 'The residence'), expand),
    svg,
    h('footer', null, h('span', null, h('i'), 'You are here'), h('small', null, 'Illustrative plan')));
  const button = h('button', { class: 'round gl mapbtn', type: 'button', 'aria-label': 'Show the map', 'data-panel': 'map', 'aria-expanded': 'false', onclick: e => ctx.togglePanel('map', e.currentTarget as HTMLElement) }, icon('map'));
  ctx.registerPanel('map', { el: card, cssOnly: true });

  store.on((st, c) => {
    if (c.has('pose') && st.pose) {
      const p = st.pose;
      me.setAttribute('transform', `translate(${p.x.toFixed(3)} ${p.z.toFixed(3)})`);
      cone.setAttribute('transform', `rotate(${(180 - p.yaw * 180 / Math.PI).toFixed(1)})`);
    }
    if (c.has('room') || c.has('mode')) roomEls.forEach((g, id) => g.classList.toggle('is-here', id === st.room));
    if (c.has('mode')) card.classList.toggle('is-away', st.mode !== 'walk');
  });
  return { card, button };
}
