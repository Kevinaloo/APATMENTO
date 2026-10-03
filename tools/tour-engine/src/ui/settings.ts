/* Settings: picture quality (with the governor's live numbers), eye height,
   field of view and sound. Desktop also gets mouse look here. */
import type { Tier } from '../contract';
import { attr, h, text } from './dom';
import { icon } from './icons';
import { panelShell, row, segmented, setSwitch, toggle } from './parts';
import type { Ctx } from './types';

const TIER_NAME: Record<Tier, string> = { ultra: 'Ultra', high: 'High', balanced: 'Balanced', battery: 'Battery' };

export function mountSettings(ctx: Ctx): HTMLElement {
  const { store } = ctx;
  const api = () => ctx.api();

  const quality = segmented<Tier | 'auto'>('Picture quality', [
    { value: 'auto', label: 'Auto', hint: 'Adjusts to keep movement smooth' },
    { value: 'ultra', label: 'Ultra' },
    { value: 'high', label: 'High' },
    { value: 'balanced', label: 'Balanced' },
    { value: 'battery', label: 'Battery', hint: 'Lighter on your battery' },
  ], v => api()?.setQuality(v));
  const stats = h('p', { class: 'stats', 'aria-live': 'off' });

  const eye = segmented<number>('Eye height', [
    { value: 1.1, label: [h('b', null, 'Child'), h('small', null, '1.1 m')] },
    { value: 1.6, label: [h('b', null, 'Adult'), h('small', null, '1.6 m')] },
    { value: 1.8, label: [h('b', null, 'Tall'), h('small', null, '1.8 m')] },
  ], v => { api()?.setEyeHeight(v); store.set({ eye: v }); });

  const fovOut = h('output', { class: 'out' });
  const fov = h('input', { class: 'range', type: 'range', min: 35, max: 80, step: 1, 'aria-label': 'Field of view in degrees' });
  fov.addEventListener('input', () => { const v = Number(fov.value); api()?.setFov(v); store.set({ fov: v }); });

  const sound = toggle([h('b', null, 'Neighbourhood sound'), h('small', null, 'Birdsong, the city, evening crickets')], () => ctx.toggleAmbience());
  const look = toggle([h('b', null, 'Mouse look'), h('small', null, 'Move the mouse to look. Esc releases it.')], () => ctx.toggleMouseLook(), 'om');

  const el = panelShell(ctx, 'settings', 'Settings', 'Your view',
    row('Picture quality', quality.el, stats),
    row('Eye height', eye.el),
    row('Field of view', h('div', { class: 'fov' }, h('small', null, 'Narrow'), fov, h('small', null, 'Wide'), fovOut)),
    h('div', { class: 'sws' }, sound, look),
    h('button', { class: 'btn quiet reset', type: 'button', onclick: () => { api()?.reset(); ctx.closePanel(); } }, icon('reset'), 'Back to the start'));

  ctx.registerPanel('settings', { el, keepOnScene: true, onOpen: () => { const q = api()?.quality(); if (q) store.set({ quality: q }); } });

  store.on((s, c) => {
    if (c.has('quality') && s.quality) {
      const q = s.quality;
      quality.set(q.auto ? 'auto' : q.tier);
      text(stats, `${Math.round(q.fps)} fps · ${q.dpr.toFixed(2)}× pixels · ${TIER_NAME[q.tier]}${q.auto ? ' (auto)' : ''}${q.ao ? ' · soft shadows' : ''}`);
    }
    if (c.has('eye')) eye.set(s.eye);
    if (c.has('fov')) { if (document.activeElement !== fov) fov.value = String(s.fov); text(fovOut, `${Math.round(s.fov)}°`); }
    if (c.has('ambience')) setSwitch(sound, s.ambience);
    if (c.has('pointerLock')) setSwitch(look, s.pointerLock);
    if (c.has('ready') || c.has('error')) attr(el, 'data-off', !s.ready || !!s.error);
  });
  return el;
}
