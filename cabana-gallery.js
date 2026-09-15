/* The listing's existing gallery remains in charge of photos and navigation. */
(function () {
  'use strict';
  let dispose = () => {};
  window.CabanaGallery = {
    stop() { dispose(); dispose = () => {}; },
    start(root, count, advance) {
      this.stop();
      if (!root || count < 2) return;
      const motion = matchMedia('(prefers-reduced-motion: reduce)');
      let playing = !motion.matches, hovering = false, lastAction = Date.now();
      const toggle = document.createElement('button');
      toggle.type = 'button'; toggle.className = 'dl-gal-play';
      toggle.style.cssText = 'position:absolute;top:16px;right:16px;z-index:4;border:1px solid #ffffff66;border-radius:100px;background:#171728b8;color:white;padding:8px 12px;font:600 12px system-ui;cursor:pointer;backdrop-filter:blur(8px)';
      const paint = () => {
        toggle.textContent = playing ? 'Ⅱ Pause slideshow' : '▶ Play slideshow';
        toggle.setAttribute('aria-label', playing ? 'Pause photo slideshow' : 'Play photo slideshow');
        toggle.setAttribute('aria-pressed', String(playing));
      };
      toggle.addEventListener('click', e => { e.stopPropagation(); playing = !playing; lastAction = Date.now(); paint(); });
      root.appendChild(toggle); paint();
      const reset = () => { lastAction = Date.now(); };
      const enter = e => { if (e.pointerType === 'mouse') hovering = true; };
      const leave = () => { hovering = false; reset(); };
      const changeMotion = () => { if (motion.matches) { playing = false; paint(); } };
      root.addEventListener('pointerenter', enter);
      root.addEventListener('pointerleave', leave);
      root.addEventListener('pointerdown', reset);
      root.addEventListener('keydown', reset);
      document.addEventListener('visibilitychange', reset);
      motion.addEventListener?.('change', changeMotion);
      const timer = setInterval(() => {
        if (!root.isConnected) { window.CabanaGallery.stop(); return; }
        const lb = document.getElementById('lightbox');
        if (!playing || hovering || document.hidden || (lb && !lb.hidden)
            || document.querySelector('.cabana-tour-dialog[open]')
            || root.contains(document.activeElement)) { reset(); return; }
        if (Date.now() - lastAction >= 4500) { advance(); reset(); }
      }, 500);
      dispose = () => {
        clearInterval(timer); toggle.remove();
        root.removeEventListener('pointerenter', enter); root.removeEventListener('pointerleave', leave);
        root.removeEventListener('pointerdown', reset); root.removeEventListener('keydown', reset);
        document.removeEventListener('visibilitychange', reset); motion.removeEventListener?.('change', changeMotion);
      };
    }
  };
  window.addEventListener('pagehide', () => window.CabanaGallery.stop());
})();
