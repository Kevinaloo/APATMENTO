/* Lightweight tour registry: scene assets load only after the guest opens a tour. */
(function () {
  'use strict';
  const JETS_NEST = '65ef1d11-a4e3-4250-bbac-f826c0cd10d2';
  const TOURS = Object.freeze({
    [JETS_NEST]: { name: 'The Jets Nest', url: '/tours/jets-nest/index.html', rooms: 'Living room, kitchen, bedroom & bathroom' },
    '20b22953-2c13-4e6c-a5c4-3cbefcc20cae': { name: 'Shikaz Homes', url: '/tours/shikaz-homes/index.html', rooms: 'Two bedrooms, lounge, dining & more' }
  });
  const cube = '<svg viewBox="0 0 28 28" fill="none" aria-hidden="true"><path d="m14 3 10 5.7v10.6L14 25 4 19.3V8.7L14 3Z" stroke="currentColor" stroke-width="1.4"/><path d="m4 8.7 10 5.8 10-5.8M14 14.5V25M9 5.8l10 5.8" stroke="currentColor" stroke-width="1.2"/><path d="m22 1 .8 2.2L25 4l-2.2.8L22 7l-.8-2.2L19 4l2.2-.8Z" fill="currentColor" stroke="none"/></svg>';
  let dialog, returnFocus, previousOverflow;
  function idFor(apt) { return String(apt?._dbId || apt?.id || ''); }
  function badge(apt) {
    if (!TOURS[idFor(apt)]) return '';
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
    dialog.innerHTML = '<header class="cabana-tour-bar"><div class="cabana-tour-bar-brand">'+cube+'<div><strong id="cabana-tour-title">'+tour.name+'</strong><span>Cabana 3D Tour · Estimated dimensions</span></div></div><button type="button" class="cabana-tour-close" aria-label="Close 3D walkthrough">Close <span aria-hidden="true">×</span></button></header><iframe title="Walk through '+tour.name+' in 3D" allow="fullscreen" src="'+tour.url+'"></iframe>';
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
      const id=idFor(apt),tour=TOURS[id];if(!tour)return '';
      return '<section class="cabana-tour-entry" aria-label="Explore this apartment in 3D"><div class="cabana-tour-emblem" aria-hidden="true">'+cube+'</div><div class="cabana-tour-copy"><span class="cabana-tour-kicker">A NEW WAY TO EXPLORE</span><strong>See yourself here.</strong><span>'+tour.rooms+'. Walk through '+tour.name+' before you arrive.</span></div><button type="button" onclick="CabanaPropertyTour.open(\''+id+'\')">Explore in 3D <span aria-hidden="true">↗</span></button></section>';
    },open,close
  };
})();
