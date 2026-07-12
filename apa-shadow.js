/* ═══════════════════════════════════════════════════════════════════
   APATMENTO · SHADOW ADS  v1
   ───────────────────────────────────────────────────────────────────
   Non-invasive, behaviourally-targeted creatives that surface BEHIND or
   BESIDE the content a guest is already engaging with — never over it.

   The philosophy: an ad the user feels as convenience, not interruption.
   We watch real behaviour (via ApaSignal), infer what would genuinely
   help right now, and slide in a beautiful, quiet card that:
     · rises from behind the card/section the guest is focused on, or
     · glides in from an edge (side / top / bottom),
     · never covers the thing they're actually looking at,
     · retracts on its own, and can be dismissed with one tap,
     · takes them to the product/service when they choose to engage.

   Intelligence:
     · Eligibility is gated on live intent score, reading mode, dwell,
       scroll depth, device and keyword/context — read from ApaSignal.
     · We deliberately stay silent while intent is very hot (checkout-
       adjacent) so we never distract a converting user.
     · Strict anti-annoyance: session frequency cap, global cooldown,
       auto-retract, and we back off entirely if a user dismisses.
     · Placement adapts to device — edge slide-ins on mobile, rise-behind
       on desktop where there's a clear focal card.

   Privacy & safety:
     · First-party only. Honours ApaSignal opt-out completely.
     · Reads only public creative rows (RLS-guarded). No user PII.
     · Never runs on funnel/auth/admin pages.
   ═══════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';
  if (global.ApaShadow) return;

  var doc = global.document;

  var SUPA_URL = 'https://gfwgbgdvxtocwhilrtdw.supabase.co';
  var SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdmd2diZ2R2eHRvY3doaWxydGR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1MTE2NjMsImV4cCI6MjA5NzA4NzY2M30.U8JClv06YsNAwq9qsPb3lQ4SIPeRPjKMzsYxVfcmujw';

  var PAGE = (global.location.pathname.split('/').pop() || 'index').replace('.html', '') || 'index';

  /* Never on funnel, auth, admin, partner or the assistant's own flows. */
  var BLOCK = ['booking-confirm','auth','add-listing','admin','admin-photos',
               'agent-dashboard','partner-bookings','partner-listings','partner-calendar',
               'partner-earnings','partner-reviews','partner-analytics','partner-agents',
               'partner-settings','dashboard'];
  if (BLOCK.indexOf(PAGE) !== -1) return;

  function safe(fn){ try { return fn(); } catch (e) { return undefined; } }

  /* Respect the platform-wide opt-out. If the signal layer is opted out,
     shadow ads are off entirely — they are an extension of the same
     first-party contract. */
  var OPTED_OUT = safe(function(){
    return localStorage.getItem('apa-no-track') === '1' || global.navigator.doNotTrack === '1';
  }) || false;
  if (OPTED_OUT) return;

  var reduceMotion = safe(function(){ return matchMedia('(prefers-reduced-motion: reduce)').matches; }) || false;

  /* ── Identity (shared with signal/showcase) ── */
  function vid(){ return safe(function(){
    var v = localStorage.getItem('apt_vid');
    if(!v){ v='V'+Date.now().toString(36)+Math.random().toString(36).slice(2,10); localStorage.setItem('apt_vid',v); }
    return v; }) || 'V0'; }
  function sid(){ return safe(function(){
    var s = sessionStorage.getItem('apt_sid');
    if(!s){ s='S'+Date.now().toString(36)+Math.random().toString(36).slice(2,8); sessionStorage.setItem('apt_sid',s); }
    return s; }) || 'S0'; }
  var VID = vid(), SID = sid();

  var device = /Mobi|Android/i.test(navigator.userAgent) ? 'mobile'
             : /Tablet|iPad/i.test(navigator.userAgent) ? 'tablet' : 'desktop';

  /* ── Session memory (per visitor, per session) ── */
  var SEEN_KEY = 'apa_shadow_seen';   // { adId: count }
  function seenMap(){ return safe(function(){ return JSON.parse(sessionStorage.getItem(SEEN_KEY) || '{}'); }) || {}; }
  function bumpSeen(id){ var m = seenMap(); m[id] = (m[id]||0)+1; safe(function(){ sessionStorage.setItem(SEEN_KEY, JSON.stringify(m)); }); }
  var dismissedThisSession = false;   // one dismissal = we go quiet for the session
  var lastShownAt = 0;
  var activeAd = null;

  /* ── Tracking ── */
  function isReal(id){ return typeof id === 'number' || /^\d+$/.test(String(id)); }
  function rpc(fn, id){
    if (!isReal(id)) return;   // preview creatives never write to the DB
    fetch(SUPA_URL+'/rest/v1/rpc/'+fn, {
      method:'POST',
      headers:{'Content-Type':'application/json','apikey':SUPA_KEY,'Authorization':'Bearer '+SUPA_KEY},
      body: JSON.stringify({ p_ad_id: id })
    }).catch(function(){});
  }
  function logEvent(ad, event, dwellMs){
    if (!isReal(ad.id)) return;
    var sig = global.ApaSignal;
    var intent = sig && sig.intent ? sig.intent() : { score:null, mode:null };
    safe(function(){
      fetch(SUPA_URL+'/rest/v1/shadow_ad_events', {
        method:'POST', keepalive:true,
        headers:{'Content-Type':'application/json','apikey':SUPA_KEY,'Authorization':'Bearer '+SUPA_KEY,'Prefer':'return=minimal'},
        body: JSON.stringify([{
          ad_id: ad.id, visitor_id: VID, session_id: SID,
          event: event, surface: PAGE, position: ad._pos || ad.position,
          intent_score: intent.score, reading_mode: intent.mode,
          dwell_ms: dwellMs || null, device: device
        }])
      }).catch(function(){});
    });
    global.gtag && global.gtag('event', 'shadow_'+event, { ad_id: ad.id, advertiser: ad.advertiser, surface: PAGE });
  }

  /* ── Load eligible creatives for this surface ── */
  var POOL = [];
  function load(){
    var c = new AbortController();
    var t = setTimeout(function(){ c.abort(); }, 4000);
    fetch(SUPA_URL+'/rest/v1/shadow_ads?active=eq.true&status=eq.live&order=priority.desc&limit=40',
      { headers:{'apikey':SUPA_KEY,'Authorization':'Bearer '+SUPA_KEY}, signal:c.signal })
      .then(function(r){ return r.ok ? r.json() : []; })
      .then(function(rows){
        clearTimeout(t);
        POOL = (rows||[]).filter(function(ad){
          var surf = Array.isArray(ad.surfaces) ? ad.surfaces : [];
          var onSurface = surf.indexOf('all') !== -1 || surf.indexOf(PAGE) !== -1;
          var onDevice  = !ad.device || ad.device === 'all' || ad.device === device;
          var flightOk  = flightActive(ad);
          return onSurface && onDevice && flightOk;
        });
        if (POOL.length) armEngine();
      })
      .catch(function(){ clearTimeout(t); });
  }

  function flightActive(ad){
    var now = new Date();
    if (ad.start_date && new Date(ad.start_date) > now) return false;
    if (ad.end_date) { var e = new Date(ad.end_date); e.setHours(23,59,59); if (e < now) return false; }
    return true;
  }

  /* ── Context: what is the guest looking at / searching for? ── */
  function pageContext(){
    var terms = [];
    safe(function(){
      var q = new URLSearchParams(location.search).get('q');
      if (q) terms.push(q.toLowerCase());
      var search = doc.querySelector('input[type="search"],input[name="q"],#search,.search-input');
      if (search && search.value) terms.push(String(search.value).toLowerCase());
    });
    return terms.join(' ');
  }
  function keywordMatch(ad, ctx){
    var kws = Array.isArray(ad.keywords) ? ad.keywords : [];
    if (!kws.length) return true;             // no keywords = surface-level match is enough
    if (!ctx) return true;                     // no context yet = don't over-filter
    ctx = ctx.toLowerCase();
    for (var i=0;i<kws.length;i++){ if (ctx.indexOf(String(kws[i]).toLowerCase()) !== -1) return true; }
    return false;
  }

  /* ── Eligibility check for a single ad, right now ── */
  function eligible(ad){
    var sig = global.ApaSignal;
    var intent = sig && sig.intent ? sig.intent() : { score: 30, mode: 'scan' };
    var attn = sig && sig.attention ? sig.attention() : { ms: 8000 };
    var scr  = sig && sig.scroll ? sig.scroll() : { maxDepth: 0 };

    // Never distract a bouncing user, ever.
    if (intent.mode === 'bounce') return false;

    // Intent band gate — includes the deliberate "stay quiet when very
    // hot / converting" upper bound.
    var s = typeof intent.score === 'number' ? intent.score : 30;
    if (s < (ad.intent_min || 0)) return false;
    if (s > (ad.intent_max != null ? ad.intent_max : 100)) return false;

    // Reading-mode gate.
    var modes = Array.isArray(ad.reading_modes) ? ad.reading_modes : [];
    if (modes.length && intent.mode && modes.indexOf(intent.mode) === -1) return false;

    // Dwell + scroll gates.
    if ((attn.ms/1000) < (ad.min_dwell_s || 0)) return false;
    if ((scr.maxDepth||0) < (ad.min_scroll_pct || 0)) return false;

    // Keyword/context relevance.
    if (!keywordMatch(ad, pageContext())) return false;

    // Frequency cap.
    var seen = seenMap()[ad.id] || 0;
    if (seen >= (ad.max_per_session || 1)) return false;

    return true;
  }

  /* ── Choose the best eligible ad (weighted, priority-first) ── */
  function pick(){
    var candidates = POOL.filter(eligible);
    if (!candidates.length) return null;
    // Highest priority tier first.
    var maxP = Math.max.apply(null, candidates.map(function(a){ return a.priority||5; }));
    candidates = candidates.filter(function(a){ return (a.priority||5) === maxP; });
    // Weighted random within the tier.
    var total = candidates.reduce(function(s,a){ return s + (a.weight||1); }, 0);
    var r = Math.random() * total;
    for (var i=0;i<candidates.length;i++){ r -= (candidates[i].weight||1); if (r <= 0) return candidates[i]; }
    return candidates[0];
  }

  /* ── Resolve the position ── */
  function resolvePosition(ad){
    var p = ad.position || 'auto';
    if (p !== 'auto') {
      // On mobile, "rise" behind a card is awkward — prefer bottom.
      if (p === 'rise' && device === 'mobile') return 'bottom';
      return p;
    }
    // Auto: rise-behind on desktop where we can find a focal card, else edge.
    if (device === 'desktop' && focalCard()) return 'rise';
    return device === 'mobile' ? 'bottom' : 'side';
  }

  /* Find the card/section the guest is most focused on (viewport centre). */
  function focalCard(){
    var sels = ['[data-rail-track] > *','.prop-card','.card','.svc-hero','.listing','.tour-card','.event-card','.product','.result'];
    var nodes = doc.querySelectorAll(sels.join(','));
    if (!nodes.length) return null;
    var cy = global.innerHeight/2, best=null, bestD=Infinity;
    for (var i=0;i<nodes.length;i++){
      var r = nodes[i].getBoundingClientRect();
      if (r.width < 120 || r.height < 90) continue;
      if (r.bottom < 0 || r.top > global.innerHeight) continue;
      var d = Math.abs((r.top+r.bottom)/2 - cy);
      if (d < bestD){ bestD = d; best = nodes[i]; }
    }
    return best;
  }

  /* ══ CSS ══ */
  function injectCSS(){
    if (doc.getElementById('apa-shadow-css')) return;
    var s = doc.createElement('style');
    s.id = 'apa-shadow-css';
    s.textContent = [
      '.apa-sa{position:fixed;z-index:7400;pointer-events:none;opacity:0;',
        'transition:transform .7s cubic-bezier(.19,1,.22,1),opacity .55s ease;',
        'font-family:"Inter",system-ui,sans-serif;will-change:transform,opacity;}',
      '.apa-sa.in{opacity:1;pointer-events:auto;}',
      '.apa-sa-card{position:relative;overflow:hidden;border-radius:20px;cursor:pointer;',
        'box-shadow:0 24px 70px rgba(10,10,20,.28),0 6px 20px rgba(10,10,20,.14);',
        'border:1px solid rgba(255,255,255,.12);}',
      '.apa-sa-media{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:.9;}',
      '.apa-sa-scrim{position:absolute;inset:0;background:linear-gradient(180deg,rgba(8,8,16,.05) 0%,rgba(8,8,16,.55) 62%,rgba(8,8,16,.86) 100%);}',
      '.apa-sa-grad{position:absolute;inset:0;opacity:.34;mix-blend-mode:overlay;}',
      '.apa-sa-body{position:relative;z-index:2;display:flex;flex-direction:column;justify-content:flex-end;height:100%;padding:16px 17px;}',
      '.apa-sa-tag{position:absolute;top:12px;left:13px;z-index:3;display:inline-flex;align-items:center;gap:5px;',
        'font-size:9px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:rgba(255,255,255,.82);',
        'background:rgba(0,0,0,.28);backdrop-filter:blur(8px);padding:4px 9px;border-radius:100px;border:1px solid rgba(255,255,255,.14);}',
      '.apa-sa-tag i{width:5px;height:5px;border-radius:50%;background:currentColor;display:inline-block;opacity:.9;}',
      '.apa-sa-close{position:absolute;top:10px;right:10px;z-index:4;width:26px;height:26px;border-radius:50%;',
        'background:rgba(0,0,0,.38);backdrop-filter:blur(8px);border:1px solid rgba(255,255,255,.18);color:#fff;',
        'display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:15px;line-height:1;',
        'transition:background .16s,transform .16s;}',
      '.apa-sa-close:hover{background:rgba(0,0,0,.6);transform:scale(1.08);}',
      '.apa-sa-adv{font-size:10.5px;font-weight:600;color:rgba(255,255,255,.72);margin-bottom:3px;}',
      '.apa-sa-h{font-family:"Geist","Inter",sans-serif;font-weight:500;font-size:17px;line-height:1.15;color:#fff;margin-bottom:4px;letter-spacing:-.01em;}',
      '.apa-sa-sub{font-size:12px;line-height:1.45;color:rgba(255,255,255,.82);margin-bottom:11px;}',
      '.apa-sa-cta{align-self:flex-start;display:inline-flex;align-items:center;gap:6px;background:#fff;color:#0A0A14;',
        'font-size:12px;font-weight:700;padding:8px 15px;border-radius:100px;border:none;cursor:pointer;',
        'transition:transform .18s,box-shadow .18s;box-shadow:0 4px 14px rgba(0,0,0,.2);}',
      '.apa-sa-cta:hover{transform:translateY(-1px) scale(1.02);box-shadow:0 8px 22px rgba(0,0,0,.3);}',
      '.apa-sa-cta svg{width:13px;height:13px;fill:none;stroke:currentColor;stroke-width:2.4;stroke-linecap:round;stroke-linejoin:round;}',
      '.apa-sa-progress{position:absolute;left:0;bottom:0;height:3px;z-index:3;width:100%;transform-origin:left;transform:scaleX(1);transition:transform linear;}',

      /* RISE — behind the focal card. Sized/positioned inline per target. */
      '.apa-sa-rise{transform:translateY(26px) scale(.96);} .apa-sa-rise.in{transform:translateY(0) scale(1);}',

      /* SIDE — from the right edge, vertically centred lower third. */
      '.apa-sa-side{right:20px;bottom:96px;width:300px;transform:translateX(calc(100% + 30px));}',
      '.apa-sa-side.in{transform:translateX(0);}',
      '.apa-sa-side .apa-sa-card{height:190px;}',

      /* BOTTOM — slides up from the bottom (mobile default). */
      '.apa-sa-bottom{left:14px;right:14px;bottom:14px;transform:translateY(calc(100% + 30px));}',
      '.apa-sa-bottom.in{transform:translateY(0);}',
      '.apa-sa-bottom .apa-sa-card{height:150px;}',

      /* TOP — descends from the top. */
      '.apa-sa-top{left:50%;top:14px;width:340px;max-width:calc(100vw - 28px);margin-left:-170px;transform:translateY(calc(-100% - 30px));}',
      '.apa-sa-top.in{transform:translateY(0);}',
      '.apa-sa-top .apa-sa-card{height:130px;}',

      '@media(max-width:520px){',
        '.apa-sa-side{right:12px;left:12px;width:auto;bottom:88px;transform:translateY(calc(100% + 30px));}',
        '.apa-sa-side.in{transform:translateY(0);}',
        '.apa-sa-side .apa-sa-card{height:150px;}',
        '.apa-sa-top{width:auto;left:12px;right:12px;margin-left:0;}',
      '}',
      '@media(prefers-reduced-motion:reduce){.apa-sa{transition:opacity .3s ease;}.apa-sa-rise,.apa-sa-side,.apa-sa-bottom,.apa-sa-top{transform:none;}}'
    ].join('');
    doc.head.appendChild(s);
  }

  /* ══ Render ══ */
  function render(ad, pos){
    injectCSS();
    ad._pos = pos;

    var wrap = doc.createElement('div');
    wrap.className = 'apa-sa apa-sa-' + pos;
    wrap.setAttribute('role','complementary');
    wrap.setAttribute('aria-label','Sponsored suggestion');

    var isVideo = ad.media_type === 'video' && ad.media_url;
    var mediaHTML = ad.media_url
      ? (isVideo
          ? '<video class="apa-sa-media" src="'+esc(ad.media_url)+'" '+(ad.poster_url?'poster="'+esc(ad.poster_url)+'"':'')+' autoplay muted loop playsinline></video>'
          : '<img class="apa-sa-media" src="'+esc(ad.media_url)+'" alt="" onerror="this.remove()"/>')
      : '';

    wrap.innerHTML =
      '<div class="apa-sa-card" style="background:'+esc(ad.theme_gradient||'#222')+'">' +
        mediaHTML +
        '<div class="apa-sa-grad" style="background:'+esc(ad.theme_gradient||'')+'"></div>' +
        '<div class="apa-sa-scrim"></div>' +
        '<div class="apa-sa-tag"><i></i> Sponsored</div>' +
        '<button class="apa-sa-close" aria-label="Dismiss">&times;</button>' +
        '<div class="apa-sa-body">' +
          (ad.advertiser ? '<div class="apa-sa-adv">'+esc(ad.advertiser)+'</div>' : '') +
          (ad.headline ? '<div class="apa-sa-h">'+esc(ad.headline)+'</div>' : '') +
          (ad.sub_text ? '<div class="apa-sa-sub">'+esc(ad.sub_text)+'</div>' : '') +
          '<button class="apa-sa-cta">'+esc(ad.cta_text||'View')+
            ' <svg viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></svg></button>' +
        '</div>' +
        '<div class="apa-sa-progress" style="background:'+esc(ad.accent||'#fff')+'"></div>' +
      '</div>';

    // RISE: position the wrapper behind the focal card, matched to its box.
    if (pos === 'rise') {
      var card = focalCard();
      if (!card) { pos = 'side'; wrap.className = 'apa-sa apa-sa-side'; ad._pos = 'side'; }
      else {
        var r = card.getBoundingClientRect();
        var w = Math.min(Math.max(r.width, 240), 380);
        // Peek out above the focal card so it's visible but not covering it.
        var peek = 66;
        wrap.style.left = Math.round(r.left + (r.width - w)/2) + 'px';
        wrap.style.top  = Math.round(r.top - peek) + 'px';
        wrap.style.width = w + 'px';
        wrap.style.zIndex = '7350';               // behind typical card z-index
        wrap.querySelector('.apa-sa-card').style.height = '150px';
        // Ensure the focal card visually sits above the ad.
        safe(function(){
          var cs = getComputedStyle(card);
          if (cs.position === 'static') card.style.position = 'relative';
          if (!card.style.zIndex) card.style.zIndex = '7360';
        });
      }
    }

    doc.body.appendChild(wrap);
    activeAd = { ad: ad, el: wrap, shownAt: Date.now(), pos: ad._pos };

    // Wire interactions.
    var cardEl = wrap.querySelector('.apa-sa-card');
    var closeEl = wrap.querySelector('.apa-sa-close');
    var ctaEl = wrap.querySelector('.apa-sa-cta');

    function engage(e){ if (e) e.stopPropagation(); click(ad); }
    cardEl.addEventListener('click', engage);
    ctaEl.addEventListener('click', engage);
    closeEl.addEventListener('click', function(e){ e.stopPropagation(); dismiss(ad, true); });

    // Animate in on next frame.
    requestAnimationFrame(function(){ requestAnimationFrame(function(){ wrap.classList.add('in'); }); });

    // Count a viewable impression once it's actually on screen (IAB-ish:
    // it's fixed and animated in, so a short visible delay suffices).
    setTimeout(function(){
      if (activeAd && activeAd.ad.id === ad.id) {
        bumpSeen(ad.id);
        rpc('increment_shadow_impression', ad.id);
        logEvent(ad, 'viewable');
      }
    }, 900);

    // Auto-retract after dwell_show_s. Animate the progress bar to match.
    var showMs = Math.max(4, ad.dwell_show_s || 7) * 1000;
    var prog = wrap.querySelector('.apa-sa-progress');
    if (prog && !reduceMotion) {
      prog.style.transition = 'transform '+showMs+'ms linear';
      requestAnimationFrame(function(){ prog.style.transform = 'scaleX(0)'; });
    }
    activeAd.timer = setTimeout(function(){ retract(ad); }, showMs);

    // Pause the retract timer on hover (desktop) — they're interested.
    wrap.addEventListener('mouseenter', function(){
      if (activeAd && activeAd.timer){ clearTimeout(activeAd.timer); activeAd.timer = null; if (prog) prog.style.transition='none'; }
    });
    wrap.addEventListener('mouseleave', function(){
      if (activeAd && !activeAd.timer){
        if (prog){ prog.style.transition='transform 3000ms linear'; requestAnimationFrame(function(){ prog.style.transform='scaleX(0)'; }); }
        activeAd.timer = setTimeout(function(){ retract(ad); }, 3000);
      }
    });
  }

  function teardown(){
    if (!activeAd) return;
    if (activeAd.timer) clearTimeout(activeAd.timer);
    var el = activeAd.el;
    if (el){ el.classList.remove('in'); setTimeout(function(){ el.remove(); }, 750); }
    activeAd = null;
    lastShownAt = Date.now();
  }

  function retract(ad){
    if (!activeAd || activeAd.ad.id !== ad.id) return;
    var dwell = Date.now() - activeAd.shownAt;
    logEvent(ad, 'ignore', dwell);   // shown, not engaged, timed out
    teardown();
  }

  function dismiss(ad, byUser){
    if (!activeAd || activeAd.ad.id !== ad.id) return;
    var dwell = Date.now() - activeAd.shownAt;
    if (byUser){
      dismissedThisSession = true;   // one "no thanks" and we go quiet
      rpc('increment_shadow_dismiss', ad.id);
      logEvent(ad, 'dismiss', dwell);
    }
    teardown();
  }

  function click(ad){
    var dwell = activeAd ? (Date.now() - activeAd.shownAt) : 0;
    rpc('increment_shadow_click', ad.id);
    logEvent(ad, 'click', dwell);
    var url = ad.cta_url || '/shopping.html';
    teardown();
    // Internal links: navigate in-tab. External: new tab, safely.
    if (/^https?:\/\//i.test(url) && url.indexOf(location.host) === -1) {
      safe(function(){ global.open(url, '_blank', 'noopener'); });
    } else {
      global.location.href = url;
    }
  }

  function esc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

  /* ══ Engine loop ══
     Every few seconds, if nothing is showing, we're past cooldown, and
     the user hasn't dismissed this session, evaluate whether to surface
     something. This is intentionally patient. */
  var engineArmed = false;
  function armEngine(){
    if (engineArmed) return;
    engineArmed = true;

    var GLOBAL_COOLDOWN = 90000;   // default; overridden per-ad below
    function tickEngine(){
      if (activeAd) return;
      if (dismissedThisSession) return;
      if (doc.hidden) return;
      var pool = POOL.filter(eligible);
      if (!pool.length) return;

      // Respect the strictest cooldown among candidates.
      var cd = Math.min.apply(null, pool.map(function(a){ return (a.cooldown_s||90)*1000; }));
      if (Date.now() - lastShownAt < Math.max(cd, 8000)) return;

      var ad = pick();
      if (!ad) return;
      render(ad, resolvePosition(ad));
    }

    // First evaluation a little after load so intent can accumulate.
    setTimeout(tickEngine, 5000);
    var iv = setInterval(function(){ safe(tickEngine); }, 4000);

    // Flush open ad state on unload for accurate dwell.
    global.addEventListener('pagehide', function(){
      if (activeAd){ var d = Date.now()-activeAd.shownAt; logEvent(activeAd.ad, 'ignore', d); }
    });
    doc.addEventListener('visibilitychange', function(){
      // If the tab is hidden while an ad shows, retract quietly.
      if (doc.hidden && activeAd) teardown();
    });
    // Stop when engine no longer needed (SPA-style safety; harmless here).
    global.__apaShadowStop = function(){ clearInterval(iv); teardown(); };
  }

  /* ── Boot ── */
  function boot(){
    // Admin preview: /page.html?shadow_preview={...creative json...}
    var pv = safe(function(){ return new URLSearchParams(location.search).get('shadow_preview'); });
    if (pv) {
      safe(function(){
        var ad = JSON.parse(pv);
        ad.id = ad.id || 'preview';
        ad.dwell_show_s = 20;              // linger longer for review
        ad.max_per_session = 99;
        injectCSS();
        setTimeout(function(){ render(ad, resolvePosition(ad)); }, 1400);
      });
      return;   // preview mode does not run the live engine
    }
    // Give ApaSignal a moment to initialise, then load creatives.
    setTimeout(load, 1200);
  }
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', boot);
  else boot();

  /* ── Public (for admin preview / manual triggers) ── */
  global.ApaShadow = {
    reload: load,
    stop: function(){ if (global.__apaShadowStop) global.__apaShadowStop(); },
    /* Force a specific creative object to render (admin preview). */
    preview: function(ad, pos){ injectCSS(); if (activeAd) teardown(); render(ad, pos || resolvePosition(ad)); },
    _pool: function(){ return POOL.slice(); }
  };

})(window);
