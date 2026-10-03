/* The top bar: who and where on the left, the three ways of seeing in the
   middle, the actions on the right. On phones the actions fold into "More"
   (Share and Close stay out), and the mode switch drops to its own row. */
import type { Mode } from '../contract';
import { attr, h } from './dom';
import { brandMark, icon, type IconName } from './icons';
import { panelShell } from './parts';
import type { Ctx, Panel } from './types';

const MODES: { id: Mode; label: string; icon: IconName }[] = [
  { id: 'walk', label: 'Walk', icon: 'walk' },
  { id: 'dollhouse', label: 'Dollhouse', icon: 'dollhouse' },
  { id: 'plan', label: 'Floor plan', icon: 'plan' },
];

const canFullscreen = () => !!(document.fullscreenEnabled && document.documentElement.requestFullscreen);

export function mountTopBar(ctx: Ctx): HTMLElement {
  const { def, store } = ctx;

  const modeButtons = MODES.map(m => h('button', { type: 'button', 'data-mode': m.id, 'aria-label': m.label, 'data-tip': m.label, 'aria-pressed': 'false', onclick: () => ctx.setMode(m.id) }, icon(m.icon), h('span', null, m.label)));
  const modes = h('nav', { class: 'modes gl', 'aria-label': 'How to view the apartment' }, h('span', { class: 'thumb', 'aria-hidden': 'true' }), modeButtons);

  const tool = (name: string, label: string, ico: IconName, onclick: (e: MouseEvent) => void, panel?: Panel) =>
    h('button', { class: 'tool', type: 'button', 'data-act': name, 'data-tip': label, 'aria-label': label, 'data-panel': panel, 'aria-expanded': panel ? 'false' : null, onclick }, icon(ico));
  const trigger = (p: Panel) => (e: MouseEvent) => ctx.togglePanel(p, e.currentTarget as HTMLElement);

  const sound = tool('sound', 'Neighbourhood sound', 'mute', () => ctx.toggleAmbience());
  const full = tool('fullscreen', 'Full screen', 'expand', () => ctx.toggleFullscreen());
  if (!canFullscreen()) full.hidden = true;
  const tools = h('div', { class: 'tools gl' },
    tool('share', 'Share this view', 'share', trigger('share'), 'share'),
    tool('photos', 'Original photographs', 'photos', () => ctx.openPhotos()),
    tool('light', 'Live Light', 'sunset', trigger('light'), 'light'),
    sound,
    tool('settings', 'Settings', 'sliders', trigger('settings'), 'settings'),
    tool('about', 'About this view', 'info', () => ctx.openDialog('about')),
    full);
  const more = h('button', { class: 'round gl more', type: 'button', 'aria-label': 'More', 'data-panel': 'more', 'aria-expanded': 'false', onclick: trigger('more') }, icon('more'));
  const close = h('button', { class: 'round gl close', type: 'button', 'aria-label': 'Close the 3D tour', 'data-tip': 'Close', onclick: () => ctx.requestClose() }, icon('close'));

  const bar = h('header', { class: 'top' },
    h('div', { class: 'brand' },
      brandMark(),
      h('div', { class: 'btext' },
        h('span', { class: 'k' }, 'Cabana', h('i', { 'aria-hidden': 'true' }), '3D residence'),
        h('strong', { class: 'btitle', title: def.listing.title }, def.listing.title),
        h('a', { class: 'area', href: ctx.listingUrl, target: '_top' }, `${def.listing.area}, ${def.listing.city}`, h('span', null, 'View listing', icon('out'))))),
    modes,
    h('div', { class: 'acts' }, tools, more, close));

  store.on((s, c) => {
    if (c.has('mode')) {
      modeButtons.forEach(b => attr(b, 'aria-pressed', b.dataset.mode === s.mode ? 'true' : 'false'));
      modes.dataset.at = String(MODES.findIndex(m => m.id === s.mode));
    }
    if (c.has('ready') || c.has('error')) modeButtons.forEach(b => attr(b, 'disabled', !s.ready || !!s.error));
    if (c.has('ambience')) {
      sound.replaceChildren(icon(s.ambience ? 'sound' : 'mute'));
      attr(sound, 'aria-pressed', s.ambience ? 'true' : 'false');
      sound.dataset.tip = s.ambience ? 'Sound on' : 'Neighbourhood sound';
    }
    if (c.has('fullscreen')) {
      full.replaceChildren(icon(s.fullscreen ? 'shrink' : 'expand'));
      attr(full, 'aria-label', s.fullscreen ? 'Leave full screen' : 'Full screen');
      full.dataset.tip = s.fullscreen ? 'Leave full screen' : 'Full screen';
    }
  });
  return bar;
}

/** Phones: everything the top bar could not fit. */
export function mountMore(ctx: Ctx): HTMLElement {
  const { store } = ctx;
  const item = (label: string, ico: IconName, onclick: (e: MouseEvent) => void, extra?: HTMLElement) =>
    h('button', { class: 'mi', type: 'button', onclick }, icon(ico), h('span', null, label), extra);
  /* The sheet closes as the next one opens, so focus returns to the More button. */
  const go = (p: Panel) => () => { ctx.closePanel(); ctx.togglePanel(p, ctx.el.querySelector<HTMLElement>('.more')); };
  const soundState = h('small');
  const sound = item('Neighbourhood sound', 'sound', () => ctx.toggleAmbience(), soundState);
  const full = item('Full screen', 'expand', () => { ctx.closePanel(); ctx.toggleFullscreen(); });
  if (!canFullscreen()) full.hidden = true;
  const el = panelShell(ctx, 'more', 'Cabana 3D', 'More',
    h('div', { class: 'menu' },
      item('Original photographs', 'photos', () => { ctx.closePanel(); ctx.openPhotos(); }),
      item('Live Light', 'sunset', go('light')),
      sound,
      item('Settings', 'sliders', go('settings')),
      full,
      item('About this view', 'info', () => { ctx.closePanel(); ctx.openDialog('about'); }),
      item('Back to the start', 'reset', () => { ctx.closePanel(); ctx.api()?.reset(); }),
      h('a', { class: 'mi', href: ctx.listingUrl, target: '_top' }, icon('out'), h('span', null, 'View the listing'))));
  ctx.registerPanel('more', { el });
  store.on((s, c) => {
    if (c.has('ambience')) { soundState.textContent = s.ambience ? 'On' : 'Off'; attr(sound, 'aria-pressed', s.ambience ? 'true' : 'false'); }
  });
  return el;
}
