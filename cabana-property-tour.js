/* Lightweight tour registry: scene assets load only after the guest opens a tour. */
(function () {
  'use strict';
  if (window.CabanaPropertyTour) return;
  const JETS_NEST = '65ef1d11-a4e3-4250-bbac-f826c0cd10d2';
  /* Hand-curated copy for the first tours. Every other live tour comes
     from the listing row itself (tour_3d_status = 'live', tour_3d_url),
     which only the Cabana team can set. */
  const TOURS = {
    [JETS_NEST]: { name: 'The Jets Nest', url: '/tours/jets-nest/index.html', rooms: 'Living room, kitchen, bedroom & bathroom' },
    '20b22953-2c13-4e6c-a5c4-3cbefcc20cae': { name: 'Shikaz Homes', url: '/tours/shikaz-homes/index.html', rooms: 'Two bedrooms, lounge, dining & more' }
  };
  /* The same allow-list the database enforces: our own /tours/ viewer or a
     known 3D host. Anything else never reaches an iframe. */
  const SAFE_URL = /^(?:\/tours\/[a-z0-9-]+\/(?:index\.html)?|https:\/\/(?:my\.matterport\.com|kuula\.co|app\.cloudpano\.com)\/[^\s"'<>]*)$/;
  function register(id, tour) {
    id = String(id || '');
    if (!id || !tour || !SAFE_URL.test(String(tour.url || ''))) return null;
    if (!TOURS[id]) TOURS[id] = { name: String(tour.name || 'This stay').slice(0, 80), url: String(tour.url), rooms: tour.rooms || 'Every room' };
    return TOURS[id];
  }
  function tourFor(apt) {
    const id = idFor(apt);
    if (TOURS[id]) return TOURS[id];
    const url = apt && (apt.tour3dUrl || apt.tour_3d_url);
    const status = apt && (apt.tour3dStatus || apt.tour_3d_status);
    return status === 'live' && url ? register(id, { name: apt.name || apt.title, url }) : null;
  }
  function escText(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
  const cube = '<svg viewBox="0 0 28 28" fill="none" aria-hidden="true"><path d="m14 3 10 5.7v10.6L14 25 4 19.3V8.7L14 3Z" stroke="currentColor" stroke-width="1.4"/><path d="m4 8.7 10 5.8 10-5.8M14 14.5V25M9 5.8l10 5.8" stroke="currentColor" stroke-width="1.2"/><path d="m22 1 .8 2.2L25 4l-2.2.8L22 7l-.8-2.2L19 4l2.2-.8Z" fill="currentColor" stroke="none"/></svg>';
  let dialog, returnFocus, previousOverflow;
  function idFor(apt) { return String(apt?._dbId || apt?.id || ''); }
  function badge(apt) {
    if (!tourFor(apt)) return '';
    return '<span class="cabana-3d-badge" title="Explore this stay with an interactive 3D walkthrough">'+cube+'<span><b>3D TOUR</b><small>STEP INSIDE</small></span><span class="cabana-3d-spark" aria-hidden="true">✦</span></span>';
  }
  function close() {
    if (!dialog) return;
    const current = dialog;dialog = null;
    current.querySelector('iframe')?.remove();current.close();current.remove();
    document.body.style.overflow = previousOverflow;
    if (returnFocus?.isConnected) returnFocus.focus({ preventScroll: true });
  }
  function open(id = JETS_NEST) {
    const tour = TOURS[id];if (!tour || dialog) return;
    returnFocus = document.activeElement;previousOverflow = document.body.style.overflow;
    dialog = document.createElement('dialog');dialog.className = 'cabana-tour-dialog';dialog.setAttribute('aria-labelledby', 'cabana-tour-title');
    dialog.innerHTML = '<header class="cabana-tour-bar"><div class="cabana-tour-bar-brand">'+cube+'<div><strong id="cabana-tour-title">'+escText(tour.name)+'</strong><span>Cabana 3D Tour · Estimated dimensions</span></div></div><button type="button" class="cabana-tour-close" aria-label="Close 3D walkthrough">Close <span aria-hidden="true">×</span></button></header><iframe title="Walk through '+escText(tour.name)+' in 3D" allow="fullscreen; xr-spatial-tracking" src="'+escText(tour.url)+'"></iframe>';
    dialog.querySelector('button').addEventListener('click',close);
    dialog.addEventListener('cancel',event=>{event.preventDefault();close();});
    document.body.appendChild(dialog);document.body.style.overflow='hidden';dialog.showModal();
  }
  window.addEventListener('message',event=>{
    if(event.origin===location.origin&&event.source===dialog?.querySelector('iframe')?.contentWindow&&event.data?.type==='cabana-tour-close')close();
  });
  window.CabanaPropertyTour = {
    badge,
    section(apt) {
      const id=idFor(apt),tour=tourFor(apt);if(!tour||!/^[0-9a-z-]+$/i.test(id))return '';
      return '<section class="cabana-tour-entry" aria-label="Explore this apartment in 3D"><div class="cabana-tour-emblem" aria-hidden="true">'+cube+'</div><div class="cabana-tour-copy"><span class="cabana-tour-kicker">A NEW WAY TO EXPLORE</span><strong>See yourself here.</strong><span>'+escText(tour.rooms)+'. Walk through '+escText(tour.name)+' before you arrive.</span></div><button type="button" onclick="CabanaPropertyTour.open(\''+id+'\')">Explore in 3D <span aria-hidden="true">↗</span></button></section>';
    },open,close,register,has:id=>!!TOURS[String(id||'')]
  };
  // Shared by dashboard shelves, saved stays and any later listing cards.
  if (!document.querySelector('link[href="/cabana-property-tour.css"]')) {
    const link = document.createElement('link'); link.rel = 'stylesheet'; link.href = '/cabana-property-tour.css'; document.head.appendChild(link);
  }
  function annotate(root) {
    root.querySelectorAll('[data-listing-id],a[href*="apartments"]').forEach(card => {
      let id = card.dataset.listingId;
      if (!id && card.href) {
        const params = new URL(card.href, location.href).searchParams;
        id = params.get('open') || params.get('listing') || params.get('id');
      }
      if (!TOURS[id] || card.querySelector('.cabana-3d-badge')) return;
      const photo = card.querySelector('.prop-thumb,.ac-thumb,.fav-img,.card-img,[data-listing-photo]') || card.querySelector('img')?.parentElement;
      if (!photo) return;
      photo.style.position = 'relative';
      photo.insertAdjacentHTML('beforeend', badge({id}));
      const added = photo.querySelector('.cabana-3d-badge');
      // Existing category and price labels keep their lower edge.
      added.style.top = '10px'; added.style.bottom = 'auto';
    });
  }
  let queued = false;
  const scan = () => {
    if (queued || !window.document) return; queued = true;
    setTimeout(() => { queued = false; if (window.document) annotate(document); }, 0);
  };
  window.CabanaPropertyTour.scan = scan;
  scan();
  new MutationObserver(scan).observe(document.documentElement, {childList:true,subtree:true});
})();
