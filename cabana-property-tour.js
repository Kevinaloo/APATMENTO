/* Property-specific 3D tours. No scene code or photos load before activation. */
(function () {
  'use strict';
  const JETS_NEST = '65ef1d11-a4e3-4250-bbac-f826c0cd10d2';
  const TOUR_URL = '/tours/jets-nest';
  let dialog, returnFocus, previousOverflow;
  function close() {
    if (!dialog) return;
    const current = dialog;
    dialog = null;
    current.querySelector('iframe')?.remove();
    current.close();
    current.remove();
    document.body.style.overflow = previousOverflow;
    returnFocus?.focus({ preventScroll: true });
  }
  function open() {
    if (dialog) return;
    returnFocus = document.activeElement;
    previousOverflow = document.body.style.overflow;
    dialog = document.createElement('dialog');
    dialog.className = 'cabana-tour-dialog';
    dialog.setAttribute('aria-labelledby', 'cabana-tour-title');
    dialog.innerHTML = '<header class="cabana-tour-bar"><div><strong id="cabana-tour-title">The Jets Nest</strong><span>Interactive 3D walkthrough · estimated dimensions</span></div><button type="button" class="cabana-tour-close" aria-label="Close 3D walkthrough">Close <span aria-hidden="true">×</span></button></header><iframe title="Walk through The Jets Nest apartment in 3D" allow="fullscreen" src="' + TOUR_URL + '"></iframe>';
    dialog.querySelector('button').addEventListener('click', close);
    dialog.addEventListener('cancel', event => { event.preventDefault(); close(); });
    document.body.appendChild(dialog);
    document.body.style.overflow = 'hidden';
    dialog.showModal();
  }
  window.addEventListener('message', event => {
    if (event.origin === location.origin && event.source === dialog?.querySelector('iframe')?.contentWindow && event.data?.type === 'cabana-tour-close') close();
  });
  window.CabanaPropertyTour = {
    section(apt) {
      if (String(apt._dbId || apt.id) !== JETS_NEST) return '';
      return '<section class="cabana-tour-entry" aria-label="Explore this apartment in 3D"><div class="cabana-tour-icon" aria-hidden="true">3D</div><div class="cabana-tour-copy"><strong>Step inside The Jets Nest</strong><span>Explore every room, walk around, or view the floor plan.</span></div><button type="button" onclick="CabanaPropertyTour.open()">Explore in 3D <span aria-hidden="true">↗</span></button></section>';
    }, open, close
  };
})();
