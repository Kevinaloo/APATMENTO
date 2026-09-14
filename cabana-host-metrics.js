(function (global) {
  'use strict';
  if (global.CabanaHostMetrics) return;
  var seen = new Set(), pending = new Set();
  var key;
  try {
    key = sessionStorage.getItem('cabana-host-metric-session');
    if (!/^[a-f0-9]{32}$/.test(key || '')) {
      key = Array.from(crypto.getRandomValues(new Uint8Array(16)), function (n) { return n.toString(16).padStart(2, '0'); }).join('');
      sessionStorage.setItem('cabana-host-metric-session', key);
    }
  } catch (_) { return; }
  async function track(id, event) {
    if (!/^[a-f0-9-]{36}$/i.test(id || '') || !['impression', 'view', 'checkout'].includes(event)) return;
    if (navigator.doNotTrack === '1' || navigator.globalPrivacyControl) return;
    var dedupe = new Date().toISOString().slice(0, 10) + ':' + id + ':' + event;
    if (seen.has(dedupe) || pending.has(dedupe)) return;
    pending.add(dedupe);
    try {
      var token = global.ApaSession && await global.ApaSession.token();
      var response = await fetch('/api/support', { method: 'POST', keepalive: true,
        headers: Object.assign({ 'Content-Type': 'application/json' }, token ? { Authorization: 'Bearer ' + token } : {}),
        body: JSON.stringify({ op: 'host.event', guestKey: key, listing_id: id, event: event }) });
      if (response.ok) { var result = await response.json(); if (result.ok) seen.add(dedupe); }
    } catch (_) {} finally { pending.delete(dedupe); }
  }
  global.CabanaHostMetrics = { track: track };
  if (!global.IntersectionObserver) return;
  var observed = new WeakSet();
  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting && entry.intersectionRatio >= 0.5) track(entry.target.dataset.cardId, 'impression');
    });
  }, { threshold: 0.5 });
  function scan() {
    document.querySelectorAll('[data-card-id]').forEach(function (card) {
      if (!observed.has(card)) { observed.add(card); observer.observe(card); }
    });
  }
  var queued = false;
  new MutationObserver(function () {
    if (queued) return;
    queued = true;
    requestAnimationFrame(function () { queued = false; scan(); });
  }).observe(document.body, { childList: true, subtree: true });
  scan();
})(window);
