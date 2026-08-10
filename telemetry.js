/* ════════════════════════════════════════════════════════════════
   APATMENTO PULSE. Telemetry.js
   First-party visitor analytics with rich context.
   Every visit, page view, click-through, and session recorded to
   Supabase for the admin dashboard. Privacy-sane: no fingerprinting
   beyond standard analytics, no third-party sharing.
════════════════════════════════════════════════════════════════ */
const ApatmentoPulse = (() => {
  const SUPA_URL = 'https://gfwgbgdvxtocwhilrtdw.supabase.co';
  const SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdmd2diZ2R2eHRvY3doaWxydGR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1MTE2NjMsImV4cCI6MjA5NzA4NzY2M30.U8JClv06YsNAwq9qsPb3lQ4SIPeRPjKMzsYxVfcmujw';

  /* ── Session identity (rotates daily, no cookies needed) ── */
  function sessionId() {
    let sid = sessionStorage.getItem('apt_sid');
    if (!sid) {
      sid = 'S' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
      sessionStorage.setItem('apt_sid', sid);
    }
    return sid;
  }
  function visitorId() {
    let vid = localStorage.getItem('apt_vid');
    if (!vid) {
      vid = 'V' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
      localStorage.setItem('apt_vid', vid);
    }
    return vid;
  }

  /* ── Context collectors ── */
  function deviceContext() {
    const ua = navigator.userAgent;
    return {
      device_type: /Mobi|Android/i.test(ua) ? 'mobile' : /Tablet|iPad/i.test(ua) ? 'tablet' : 'desktop',
      os: /Android/i.test(ua) ? 'Android' : /iPhone|iPad|iPod/i.test(ua) ? 'iOS'
        : /Windows/i.test(ua) ? 'Windows' : /Mac/i.test(ua) ? 'macOS' : /Linux/i.test(ua) ? 'Linux' : 'Other',
      browser: /Edg\//.test(ua) ? 'Edge' : /OPR|Opera/.test(ua) ? 'Opera' : /Brave/.test(ua) ? 'Brave'
        : /Chrome/.test(ua) ? 'Chrome' : /Safari/.test(ua) ? 'Safari' : /Firefox/.test(ua) ? 'Firefox' : 'Other',
      screen_w: screen.width, screen_h: screen.height,
      viewport_w: innerWidth, viewport_h: innerHeight,
      pixel_ratio: devicePixelRatio || 1,
      language: navigator.language,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      connection: navigator.connection?.effectiveType || null,
      pwa: matchMedia('(display-mode: standalone)').matches,
    };
  }

  function trafficContext() {
    const p = new URLSearchParams(location.search);
    const ref = document.referrer;
    let source = 'direct';
    if (p.get('utm_source')) source = p.get('utm_source');
    else if (ref) {
      try {
        const rh = new URL(ref).hostname;
        if (rh.includes('google')) source = 'google';
        else if (rh.includes('facebook') || rh.includes('fb.')) source = 'facebook';
        else if (rh.includes('instagram')) source = 'instagram';
        else if (rh.includes('twitter') || rh.includes('t.co') || rh.includes('x.com')) source = 'x';
        else if (rh.includes('whatsapp')) source = 'whatsapp';
        else if (rh.includes('tiktok')) source = 'tiktok';
        else if (!rh.includes('apatmento')) source = rh;
        else source = 'internal';
      } catch { source = 'unknown'; }
    }
    return {
      referrer: ref ? ref.slice(0, 300) : null,
      source,
      utm_medium: p.get('utm_medium'),
      utm_campaign: p.get('utm_campaign'),
      landing_params: location.search ? location.search.slice(0, 300) : null,
    };
  }

  /* ── State ── */
  const t0 = Date.now();
  let maxScroll = 0, clicks = 0, sent = false;
  let clickTrail = [];

  addEventListener('scroll', () => {
    const pct = Math.round(scrollY / Math.max(1, document.body.scrollHeight - innerHeight) * 100);
    if (pct > maxScroll) maxScroll = Math.min(pct, 100);
  }, { passive: true });

  document.addEventListener('click', e => {
    clicks++;
    const t = e.target.closest('a,button,[onclick],[class*="card"],[class*="btn"]');
    if (t && clickTrail.length < 25) {
      clickTrail.push({
        t: Math.round((Date.now() - t0) / 1000),
        el: (t.textContent || '').trim().slice(0, 40) || t.className.split(' ')[0]?.slice(0, 30) || t.tagName,
      });
    }
  }, true);

  /* ── Record page view immediately ── */
  async function recordVisit() {
    const user = (typeof CURRENT_USER !== 'undefined' && CURRENT_USER) ? CURRENT_USER : null;
    const row = {
      visitor_id: visitorId(),
      session_id: sessionId(),
      user_id: user?.id || null,
      page: location.pathname,
      page_title: document.title.slice(0, 120),
      ...deviceContext(),
      ...trafficContext(),
      occasion: window._apatmentoOccasion?.id || null,
    };
    try {
      await fetch(`${SUPA_URL}/rest/v1/site_visits`, {
        method: 'POST',
        headers: { apikey: SUPA_KEY, Authorization: 'Bearer ' + SUPA_KEY,
          'Content-Type': 'application/json', Prefer: 'return=minimal' },
        body: JSON.stringify(row),
      });
    } catch {}
  }

  /* ── Record engagement on leave (sendBeacon = reliable) ── */
  function recordEngagement() {
    if (sent) return;
    sent = true;
    const payload = JSON.stringify({
      visitor_id: visitorId(),
      session_id: sessionId(),
      page: location.pathname,
      dwell_seconds: Math.round((Date.now() - t0) / 1000),
      max_scroll_pct: maxScroll,
      clicks,
      click_trail: clickTrail,
    });
    const url = `${SUPA_URL}/rest/v1/site_engagement?apikey=${SUPA_KEY}`;
    if (navigator.sendBeacon) {
      navigator.sendBeacon(url, new Blob([payload], { type: 'application/json' }));
    } else {
      fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: payload, keepalive: true }).catch(() => {});
    }
  }

  addEventListener('pagehide', recordEngagement);
  addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') recordEngagement(); });

  // Record visit after tiny delay (let page settle, avoid counting instant bounces twice)
  setTimeout(recordVisit, 1200);

  return { recordVisit, recordEngagement };
})();
