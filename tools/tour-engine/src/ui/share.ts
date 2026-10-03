/* Share this exact view: a postcard of what the guest is looking at, and a
   link that opens the listing, then the tour, at this spot and this hour.
   The link goes through the stays page (not the bare tour) so whoever opens
   it lands on the listing with its prices and booking, not a lone 3D page. */
import { encodeView } from '../share-code';
import { attr, fmtHour, h, text } from './dom';
import { icon } from './icons';
import { panelShell } from './parts';
import type { Ctx } from './types';

const MODE_NAME = { walk: 'Walk', dollhouse: 'Dollhouse', plan: 'Floor plan' } as const;

export function mountShare(ctx: Ctx): HTMLElement {
  const { def, store } = ctx;
  const L = def.listing;
  let objectUrl = '', file: File | null = null, url = '', generation = 0;

  const img = h('img', { alt: '' });
  /* Whatever shape the engine renders, the postcard frame follows it. */
  img.addEventListener('load', () => {
    const w = img.naturalWidth, h = img.naturalHeight;
    if (!w) return;
    postcard.style.aspectRatio = `${w} / ${h}`;
    /* A phone renders a portrait postcard; keep it short enough to leave the buttons in view. */
    postcard.style.width = h > w ? `min(100%, calc(36vh * ${(w / h).toFixed(3)}))` : '';
  });
  const postcard = h('figure', { class: 'card is-loading' }, img, h('figcaption'));
  const caption = postcard.lastElementChild as HTMLElement;
  const link = h('input', { class: 'lf', type: 'text', readonly: true, 'aria-label': 'Link to this view', onfocus: (e: FocusEvent) => (e.target as HTMLInputElement).select() });
  const copyLabel = h('span', null, 'Copy link');
  const copyBtn = h('button', { class: 'btn line', 'data-autofocus': true, type: 'button', onclick: copy }, icon('copy'), copyLabel);
  const shareBtn = h('button', { class: 'btn pri', type: 'button', onclick: nativeShare }, icon('share'), 'Share');
  if (typeof navigator.share !== 'function') shareBtn.hidden = true;
  const wa = h('a', { class: 'btn line', target: '_blank', rel: 'noopener', href: '#' }, icon('chat'), 'WhatsApp');
  const download = h('a', { class: 'btn line', href: '#', download: `${def.slug}-view.jpg`, 'aria-disabled': 'true' }, icon('download'), 'Postcard');
  download.addEventListener('click', e => { if (!objectUrl) e.preventDefault(); });

  const el = panelShell(ctx, 'share', 'Share', 'Share this exact view',
    postcard,
    h('div', { class: 'link' }, icon('link'), link),
    h('div', { class: 'sact' }, shareBtn, wa, copyBtn, download),
    h('p', { class: 'fine' }, 'Whoever opens the link steps in right here, at this hour.'));

  ctx.registerPanel('share', { el, onOpen: prepare, onClose: () => { generation++; } });

  async function prepare() {
    const api = ctx.api();
    const gen = ++generation;
    const roomPhoto = def.rooms.find(r => r.id === store.get().room)?.image ?? def.rooms[0].image;
    let label = L.title;
    if (api) {
      const view = api.getView();
      url = `${location.origin}/apartments?open=${encodeURIComponent(L.id)}&tour=${encodeView(view)}`;
      const light = store.get().light;
      label = [view.mode === 'walk' ? ctx.roomName(view.room) : MODE_NAME[view.mode], view.hour != null ? fmtHour(view.hour) : light?.live ? 'Live' : ''].filter(Boolean).join(' · ');
    } else {
      /* Photo-first: there is no view to keep, so share the tour itself. */
      url = `${location.origin}/apartments?open=${encodeURIComponent(L.id)}&tour=1`;
    }
    link.value = url;
    text(caption, label);
    const message = `Step inside ${L.title} in ${L.area} — a Cabana 3D tour.`;
    wa.href = 'https://wa.me/?text=' + encodeURIComponent(`${message} ${url}`);
    postcard.classList.add('is-loading');
    attr(download, 'aria-disabled', 'true');
    let blob: Blob | null = null;
    try { blob = api ? await api.snapshot() : null; } catch { blob = null; }
    if (gen !== generation) return;
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    objectUrl = '';
    file = null;
    if (blob) {
      objectUrl = URL.createObjectURL(blob);
      file = new File([blob], `${def.slug}-view.jpg`, { type: blob.type || 'image/jpeg' });
      img.src = objectUrl;
      download.href = objectUrl;
      attr(download, 'aria-disabled', false);
    } else {
      img.src = def.photoUrl(roomPhoto);
    }
    img.decode?.().catch(() => undefined).finally(() => { if (gen === generation) postcard.classList.remove('is-loading'); });
  }

  async function nativeShare() {
    const data: ShareData = { title: `${L.title} · Cabana 3D tour`, text: `Step inside ${L.title} in ${L.area}.`, url };
    if (file && navigator.canShare?.({ files: [file] })) data.files = [file];
    try { await navigator.share(data); }
    catch (e) { if ((e as Error)?.name !== 'AbortError') ctx.toast('Sharing is not available here. Copy the link instead.', 'warn'); }
  }

  async function copy() {
    let ok = false;
    try { await navigator.clipboard.writeText(url); ok = true; }
    catch {
      /* Clipboard API is blocked in some embeds; the selected field still copies. */
      link.focus(); link.select();
      try { ok = document.execCommand('copy'); } catch { ok = false; }
    }
    if (ok) {
      text(copyLabel, 'Copied');
      copyBtn.classList.add('is-done');
      ctx.toast('Link copied', 'ok');
      setTimeout(() => { text(copyLabel, 'Copy link'); copyBtn.classList.remove('is-done'); }, 2200);
    } else ctx.toast('Select the link and copy it', 'warn');
  }

  return el;
}
