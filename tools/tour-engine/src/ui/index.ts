/* ═══════════════════════════════════════════════════════════════════
   CABANA TOUR UI · the shell around every tour
   ───────────────────────────────────────────────────────────────────
   Plain DOM over the engine's canvas. Glass at the edges, nothing in
   the middle of the view. The shell knows the tour only through its
   TourDefinition and talks to the engine only through TourController,
   so the same UI serves every apartment.

   Phases: welcome (the scene builds behind the cover photograph)
           → tour (the HUD)
           → fallback (photo-first) whenever 3D cannot run.
   ═══════════════════════════════════════════════════════════════════ */
import type { CreateTour, Mode, TourCallbacks, TourController, TourDefinition } from '../contract';
import { decodeView } from '../share-code';
import { aboutContent } from './about';
import { mountCaption } from './caption';
import { mountDock } from './dock';
import { focusables, h, isTyping, trapTab } from './dom';
import { icon } from './icons';
import { mountLight } from './light';
import { mountMinimap } from './minimap';
import { mountMovement } from './movement';
import { createGallery, type Gallery } from './photos';
import { mountSettings } from './settings';
import { mountShare } from './share';
import { createStore } from './store';
import { applyTheme } from './theme';
import { mountToasts } from './toasts';
import { mountMore, mountTopBar } from './topbar';
import type { Ctx, Dialog, Panel, PanelSpec, UIState } from './types';
import { mountWelcome } from './welcome';

const NO_WEBGL = 'This device can’t show the 3D view, so here is the apartment in its original photographs.';
const BROKE = 'The 3D view stopped on this device. Here is the apartment in its original photographs.';

function webglAvailable(): boolean {
  try {
    const c = document.createElement('canvas');
    const gl = (c.getContext('webgl2') || c.getContext('webgl')) as WebGLRenderingContext | null;
    /* Hand the probe context straight back; browsers cap how many can live at once. */
    gl?.getExtension('WEBGL_lose_context')?.loseContext();
    return !!gl;
  } catch { return false; }
}

const titleCase = (s: string) => s.toLowerCase().replace(/(^|\s)\S/g, c => c.toUpperCase());

export function mountTourUI(root: HTMLElement, def: TourDefinition, createTour: CreateTour): void {
  const shared = decodeView(new URLSearchParams(location.search).get('v'));
  const coarse = matchMedia('(pointer: coarse)').matches;
  const embedded = window.parent !== window;
  const listingUrl = '/apartments?open=' + encodeURIComponent(def.listing.id);

  const store = createStore<UIState>({
    phase: 'welcome', ready: false, load: { progress: 0, label: '' }, error: null,
    mode: 'walk', room: def.start, pose: null,
    tour: { playing: false, index: 0, progress: 0 }, light: null, quality: null,
    ambience: false, gyro: false, pointerLock: false, fullscreen: !!document.fullscreenElement,
    /* 61° is the field of view the previous viewers walked at. */
    eye: 1.6, fov: 61, input: coarse ? 'touch' : 'mouse', dockOpen: true, panel: null, dialog: null,
  });

  const el = h('div', { class: 'ct' });
  applyTheme(el, def.theme);
  const scene = h('div', {
    class: 'scene', tabindex: '0', role: 'application', 'aria-roledescription': '3D view',
    'aria-label': `${def.listing.title} in 3D. Drag to look around. W A S D or the arrow keys walk; Q and E turn.`,
  });

  let api: TourController | null = null;
  const panels: Partial<Record<Panel, PanelSpec>> = {};
  let panelReturn: HTMLElement | null = null;
  const toasts = mountToasts();
  const live = h('div', { class: 'sr', 'aria-live': 'polite' });

  function roomName(id: string): string {
    const r = def.rooms.find(x => x.id === id);
    if (r) return r.name;
    const p = def.plan.rooms.find(x => x.id === id);
    return p ? titleCase(p.label) : id === 'hall' ? 'Hallway' : 'The apartment';
  }

  /* ── Panels: one open at a time; Escape and outside clicks close them ── */
  function openPanel(name: Panel, trigger?: HTMLElement | null) {
    closePanel(false);
    const spec = panels[name];
    if (!spec) return;
    panelReturn = trigger || (document.activeElement as HTMLElement | null);
    if (!spec.cssOnly) spec.el.hidden = false;
    store.set({ panel: name });
    spec.onOpen?.();
    const items = focusables(spec.el);
    const first = items.find(f => f.hasAttribute('data-autofocus')) || items.find(f => !f.classList.contains('x')) || items[0];
    first?.focus({ preventScroll: true });
  }
  function closePanel(restore = true) {
    const name = store.get().panel;
    if (!name) return;
    const spec = panels[name]!;
    const hadFocus = spec.el.contains(document.activeElement);
    if (!spec.cssOnly) spec.el.hidden = true;
    store.set({ panel: null });
    spec.onClose?.();
    if (restore && hadFocus && panelReturn?.isConnected) panelReturn.focus({ preventScroll: true });
  }

  /* ── Dialogs (native, modal) ── */
  const dialogs = {} as Record<Dialog, HTMLDialogElement>;
  function openDialog(name: Dialog) {
    closePanel(false);
    const d = dialogs[name];
    if (store.get().dialog && store.get().dialog !== name) dialogs[store.get().dialog!].close();
    if (!d.open) d.showModal();
    store.set({ dialog: name });
  }
  function closeDialog() {
    const name = store.get().dialog;
    if (!name) return;
    if (dialogs[name].open) dialogs[name].close();
    store.set({ dialog: null });
  }

  let gallery: Gallery;
  let pageGallery: Gallery | null = null;

  const ctx: Ctx = {
    def, el, scene, store, listingUrl, roomName,
    api: () => api,
    toast: (t, tone) => toasts.show(t, tone),
    announce: t => { live.textContent = ''; requestAnimationFrame(() => { live.textContent = t; }); },
    registerPanel(name, spec) {
      panels[name] = spec;
      /* Keys typed inside a panel (arrows on a slider) are not walking. */
      spec.el.addEventListener('keydown', e => { if (e.key !== 'Escape') e.stopPropagation(); });
    },
    togglePanel: (name, trigger) => (store.get().panel === name ? closePanel() : openPanel(name, trigger)),
    closePanel: () => closePanel(),
    openDialog, closeDialog,
    openPhotos(room) {
      if (store.get().phase === 'fallback') { pageGallery?.show(room); return; }
      gallery.show(room || store.get().room);
      openDialog('photos');
    },
    chooseRoom(id) {
      const s = store.get();
      if (s.error || !api) { ctx.openPhotos(id); return; }
      if (s.tour.playing) api.setTour(false);
      if (s.mode !== 'walk') { api.setMode('walk'); store.set({ mode: 'walk' }); }
      api.goRoom(id);
    },
    setMode(mode: Mode) {
      if (!api) return;
      if (store.get().tour.playing) api.setTour(false);
      api.setMode(mode);
      store.set({ mode });
    },
    toggleTour() {
      if (!api) return;
      const s = store.get();
      if (s.tour.playing) { api.setTour(false); return; }
      if (s.mode !== 'walk') { api.setMode('walk'); store.set({ mode: 'walk' }); }
      api.setTour(true);
    },
    toggleAmbience() {
      const on = !store.get().ambience;
      api?.setAmbience(on);
      store.set({ ambience: on });
      if (on) toasts.show('The sound follows the hour and the weather', 'ok');
    },
    async toggleFullscreen() {
      try {
        if (document.fullscreenElement) await document.exitFullscreen();
        else await document.documentElement.requestFullscreen();
      } catch { /* The embedding page may own full screen. */ }
    },
    toggleMouseLook() {
      if (!api) return;
      const on = !store.get().pointerLock;
      api.setPointerLock(on);
      if (on) scene.focus({ preventScroll: true });
    },
    requestClose() {
      if (embedded) window.parent.postMessage({ type: 'cabana-tour-close' }, location.origin);
      else location.href = listingUrl;
    },
  };

  /* ── Engine ── */
  function fail(message: string, friendly: string) {
    console.error('Cabana tour:', message);
    if (store.get().error) return;
    const old = api;
    api = null;
    try { old?.dispose(); } catch { /* already gone */ }
    closePanel(false);
    store.set({ error: friendly, ready: false });
    if (store.get().phase === 'tour') goFallback(true);
  }

  const callbacks: TourCallbacks = {
    onLoad: (progress, label) => store.set({ load: { progress: Math.max(0, Math.min(1, progress || 0)), label } }),
    onReady: () => { store.set({ ready: true }); syncPause(); },
    onPose: pose => store.set({ pose }),
    onRoom: room => store.set({ room }),
    onMode: mode => store.set({ mode }),
    onTour: tour => store.set({ tour }),
    onLight: light => store.set({ light }),
    onQuality: quality => store.set({ quality }),
    onHint: hint => toasts.show(hint),
    onError: message => fail(message, BROKE),
  };

  /* Nothing renders behind the welcome or under a full-screen dialog. Waits for
     onReady so the engine finishes compiling before it is ever paused. */
  function syncPause() {
    const s = store.get();
    if (api && s.ready) api.setPaused(s.phase !== 'tour' || s.dialog !== null);
  }

  function enter() {
    const s = store.get();
    if (s.error || !api) { goFallback(false); return; }
    if (!s.ready) return;
    store.set({ phase: 'tour' });
    syncPause();
    if (shared) { try { api.setView(shared); } catch (e) { console.warn('Shared view could not be applied', e); } }
    requestAnimationFrame(() => scene.focus({ preventScroll: true }));
  }

  function goFallback(announce: boolean) {
    closePanel(false);
    closeDialog();
    if (!pageGallery) {
      pageGallery = createGallery(ctx, true);
      fallbackPage.insertBefore(pageGallery.el, fallbackFoot);
    }
    store.set({ phase: 'fallback' });
    pageGallery.show(store.get().room);
    /* The page's own banner explains; screen readers hear it once. */
    if (announce) ctx.announce(store.get().error || BROKE);
    requestAnimationFrame(() => fallbackPage.focus({ preventScroll: true }));
  }

  /* ── Build the shell ── */
  const startRoom = def.rooms.find(r => r.id === def.start) || def.rooms[0];
  const fallbackCover = def.photoUrl(startRoom.image);
  /* The page's boot screen already shows the tour's cover; reuse it so the
     hand-off from boot to welcome does not flash a different photograph. */
  const boot = root.querySelector<HTMLElement>('[data-boot]');
  const bootUrl = boot ? /url\(["']?([^"')]+)["']?\)/.exec(getComputedStyle(boot).backgroundImage)?.[1] : null;
  const welcome = mountWelcome(ctx, bootUrl || fallbackCover, fallbackCover, shared, enter);

  const topbar = mountTopBar(ctx);
  const caption = mountCaption(ctx);
  const dock = mountDock(ctx);
  const map = mountMinimap(ctx);
  const light = mountLight(ctx);
  const [keys, zone, stick, ghost, touchCol] = mountMovement(ctx);
  const footer = h('p', { class: 'foot' },
    h('span', null, 'Photo-based reconstruction · Estimated dimensions · Simulated light'),
    h('button', { type: 'button', onclick: () => openDialog('about') }, 'About this view', icon('info')));

  const hud = h('div', { class: 'hud' },
    caption, map.card, map.button, dock,
    h('div', { class: 'br' }, touchCol, keys, light.chip),
    footer);
  const panelLayer = h('div', { class: 'panels' }, light.panel, mountShare(ctx), mountSettings(ctx), mountMore(ctx));

  gallery = createGallery(ctx, false);
  dialogs.photos = h('dialog', { class: 'dlg d-photos', 'aria-labelledby': 'ph-title' }, gallery.el);
  dialogs.about = h('dialog', { class: 'dlg d-about', 'aria-labelledby': 'a-title' }, aboutContent(ctx));
  for (const d of Object.values(dialogs)) {
    d.addEventListener('cancel', e => { e.preventDefault(); closeDialog(); });
    d.addEventListener('close', () => { if (store.get().dialog && !Object.values(dialogs).some(x => x.open)) store.set({ dialog: null }); });
    d.addEventListener('keydown', e => { trapTab(e, d); if (e.key !== 'Escape') e.stopPropagation(); });
    /* A click on the backdrop lands on the dialog element itself. */
    d.addEventListener('click', e => { if (e.target === d) closeDialog(); });
  }

  const fallbackFoot = h('p', { class: 'foot is-page' }, h('span', null, 'Photo-based reconstruction · Estimated dimensions'),
    h('button', { type: 'button', onclick: () => openDialog('about') }, 'About this view', icon('info')));
  const fallbackNote = h('p', { class: 'fbn' }, icon('info'), h('span'));
  const fallbackPage = h('main', { class: 'fb', tabindex: '-1', 'aria-labelledby': 'fb-title' }, fallbackNote, fallbackFoot);

  el.append(scene, h('div', { class: 'shade', 'aria-hidden': 'true' }), zone, stick, ghost, hud, fallbackPage, welcome, topbar, panelLayer, toasts.el, live, dialogs.photos, dialogs.about);
  root.replaceChildren(el);

  /* ── State → shell attributes the stylesheet keys off ── */
  let announceTimer = 0;
  store.on((s, c) => {
    if (c.has('phase')) {
      el.dataset.phase = s.phase;
      hud.inert = s.phase !== 'tour';
      fallbackPage.inert = s.phase !== 'fallback';
      syncPause();
    }
    if (c.has('mode')) el.dataset.mode = s.mode;
    if (c.has('input')) el.dataset.input = s.input;
    if (c.has('panel')) {
      el.dataset.panel = s.panel || '';
      el.querySelectorAll<HTMLElement>('[data-panel]').forEach(b => b.setAttribute('aria-expanded', b.dataset.panel === s.panel ? 'true' : 'false'));
    }
    if (c.has('dockOpen')) el.dataset.dock = s.dockOpen ? 'open' : 'folded';
    if (c.has('tour')) el.classList.toggle('is-touring', s.tour.playing);
    if (c.has('dialog')) syncPause();
    if (c.has('error') && s.error) (fallbackNote.lastElementChild as HTMLElement).textContent = s.error;
    if (c.has('room') && s.phase === 'tour' && s.mode === 'walk' && def.rooms.some(r => r.id === s.room)) {
      clearTimeout(announceTimer);
      announceTimer = window.setTimeout(() => ctx.announce(roomName(store.get().room)), 700);
    }
  });

  /* ── Global input ── */
  window.addEventListener('pointerdown', e => {
    const kind = e.pointerType === 'mouse' ? 'mouse' : 'touch';
    if (store.get().input !== kind) store.set({ input: kind });
  }, true);

  document.addEventListener('pointerdown', e => {
    const name = store.get().panel;
    if (!name) return;
    const spec = panels[name]!;
    const t = e.target as Element;
    if (spec.el.contains(t) || t.closest?.(`[data-panel="${name}"]`)) return;
    /* Light and settings stay open while you look around, so you can see the change. */
    if (spec.keepOnScene && scene.contains(t)) return;
    closePanel(false);
  }, true);

  document.addEventListener('keydown', e => {
    const s = store.get();
    if (e.key === 'Escape') {
      if (s.dialog) { e.preventDefault(); e.stopPropagation(); closeDialog(); return; }
      if (s.panel) { e.preventDefault(); e.stopPropagation(); closePanel(); return; }
      /* Esc that the browser spends leaving pointer lock or full screen is not "close". */
      if (document.pointerLockElement || document.fullscreenElement) return;
      if (embedded) { e.preventDefault(); ctx.requestClose(); }
      return;
    }
    if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && !isTyping(e.target) && (s.dialog === 'photos' || s.phase === 'fallback')) {
      /* The photographs own the arrows while they are on screen. */
      e.preventDefault(); e.stopImmediatePropagation();
      (s.dialog === 'photos' ? gallery : pageGallery)?.step(e.key === 'ArrowLeft' ? -1 : 1);
    }
  }, true);

  document.addEventListener('pointerlockchange', () => store.set({ pointerLock: !!document.pointerLockElement }));
  document.addEventListener('fullscreenchange', () => store.set({ fullscreen: !!document.fullscreenElement }));

  /* ── Start the engine behind the welcome ── */
  if (!webglAvailable()) {
    store.set({ error: NO_WEBGL });
  } else {
    try {
      const made = createTour(scene, def, callbacks);
      /* onError may already have fired from inside createTour. */
      if (store.get().error) { try { made.dispose(); } catch { /* already gone */ } }
      else api = made;
    } catch (e) { fail(e instanceof Error ? e.message : String(e), BROKE); }
    if (api && store.get().ready) syncPause();
  }
}
