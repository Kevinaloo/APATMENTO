/* ═══════════════════════════════════════════════════════════════════
   CABANA · AD PLACEMENT REGISTRY
   ───────────────────────────────────────────────────────────────────
   The one list of where ads can live on Cabana, what each spot accepts,
   and the rules that keep them out of the way of the real service.

   The site engine (showcase.js), the secret-ad engine (apa-shadow.js),
   the welcome poster (apa-interstitial.js) and the operations console
   all read THIS file. That is the whole point: the console can only
   offer a placement that the site really has, and the site can only
   fill a placement the console knows about. When a page is redesigned
   and an anchor below disappears, the page reports it and the console
   shows the slot as missing within minutes, instead of the ad silently
   vanishing while the console still says "live".

   Editing guide
   · A slot id is `<page>.<name>` and is stable forever: stats, health
     and campaign targeting are keyed on it. Rename = new slot.
   · `anchor` is a list of selectors tried in order. The first match
     wins; `fallback` is used (and reported) when none match.
   · `locked: true` surfaces are never re-arranged by the engine. The
     dashboard is locked: its placements are exactly where they are.
   ═══════════════════════════════════════════════════════════════════ */
(function (root, factory) {
  var reg = factory();
  if (typeof module === 'object' && module.exports) module.exports = reg;
  if (root) root.CabanaAdRegistry = reg;
})(typeof window !== 'undefined' ? window : null, function () {
  'use strict';

  var VERSION = '2026.09.26';

  /* ── FORMATS ─────────────────────────────────────────────────────
     How a creative is presented. `spec` is what the console shows the
     person uploading, so the upload is right the first time.        */
  var FORMATS = {
    window:   { label: 'Window',        icon: 'video',     media: 'image or video', ratio: 16 / 9,
                spec: 'Landscape 16:9 · 1920×1080 · MP4 up to 30 MB or JPG/WebP',
                desc: 'A cinematic 16:9 unit that sits between sections, after the service content.' },
    video:    { label: 'Video banner',  icon: 'play',     media: 'video preferred', ratio: 21 / 9,
                spec: 'Wide 21:9 (crops to 4:3 on phones) · keep the subject centred · MP4 up to 30 MB',
                desc: 'A wide autoplaying banner. Plays muted, only while on screen.' },
    carousel: { label: 'Carousel',      icon: 'layers',   media: 'image', ratio: 4 / 1,
                spec: 'Wide image 1600×400 or larger · text is added by Cabana, keep the image clean',
                desc: 'Rotating slides, one per advertiser. Swipeable on phones.' },
    split:    { label: 'Split banner',  icon: 'sliders',  media: 'image', ratio: 2 / 1,
                spec: 'Square or 4:3 image for the right half · 1200×900',
                desc: 'Copy on the left, picture on the right. Home page and long pages.' },
    native:   { label: 'Native card',   icon: 'grid',     media: 'image or video', ratio: 4 / 3,
                spec: '4:3 image 1200×900 or a short MP4 · reads like a listing card',
                desc: 'Sits inside the results like one more card. The least intrusive format.' },
    ticker:   { label: 'Ticker',        icon: 'activity', media: 'none', ratio: 0,
                spec: 'Text only. Separate messages with ·',
                desc: 'A slim scrolling line of text.' },
    sticky:   { label: 'Corner card',   icon: 'bell',     media: 'none', ratio: 0,
                spec: 'Text only: headline, one line and a button',
                desc: 'A small card in the corner after the visitor has settled in. One per visit.' },
    poster:   { label: 'Welcome poster', icon: 'image',   media: 'image or video', ratio: 9 / 16,
                spec: 'Portrait 9:16 · 1080×1920 · MP4 up to 30 MB (about 8 s) or JPG/WebP',
                desc: 'Full screen, the moment a member lands on their dashboard. Skippable.' }
  };

  /* Formats that can stand in for each other when a slot has no
     campaign in its own format. A slot never goes dark just because
     nobody bought that exact shape. */
  var ADAPTS = {
    window: ['video', 'split', 'native', 'carousel'],
    video: ['window', 'native'],
    native: ['window', 'video', 'carousel', 'split'],
    carousel: ['native', 'split', 'window'],
    split: ['window', 'native', 'carousel'],
    ticker: [], sticky: [], poster: []
  };

  /* ── SURFACES ────────────────────────────────────────────────────
     kind: infeed  → woven into the results list, never above it
           section → its own band after the service content
           fixed   → an element that already exists in the page HTML
           overlay → corner card, one per visit
           takeover→ full screen welcome poster
           managed → rendered by the page itself, reported here only  */
  var SURFACES = [
    { page: 'dashboard', label: 'Dashboard', locked: true, service: false,
      note: 'Placements on the dashboard are fixed by design. Only what runs in them is managed here.',
      slots: [
        { id: 'dashboard.welcome', label: 'Welcome poster', kind: 'takeover', formats: ['poster'],
          note: 'Full screen for a few seconds when a member lands. Off unless a poster is live.' },
        { id: 'dashboard.hero', label: 'Hero stage', kind: 'managed', formats: ['video'], probe: '#hero-stage',
          note: 'The big stage at the top of the dashboard. Plays every live video campaign in turn.' },
        { id: 'dashboard.window', label: 'Lower window', kind: 'fixed', formats: ['window', 'video'],
          anchor: ['[data-showcase="window"]'], house: true },
        { id: 'dashboard.sticky', label: 'Corner card', kind: 'overlay', formats: ['sticky'] }
      ] },

    { page: 'index', label: 'Home', service: false,
      note: 'Visitors are sent straight on to the dashboard, so this page is mostly seen by search engines and shared links.',
      slots: [
        { id: 'index.split', label: 'Home banner', kind: 'fixed', formats: ['split', 'window', 'carousel'],
          anchor: ['[data-showcase="split"]'], house: true },
        { id: 'index.sticky', label: 'Corner card', kind: 'overlay', formats: ['sticky'] }
      ], shadow: true },

    { page: 'apartments', label: 'Stays', service: true,
      feed: { grid: ['#grid'], label: 'stay results' },
      slots: [
        { id: 'apartments.feed', label: 'In results', kind: 'infeed', formats: ['native', 'carousel'] },
        { id: 'apartments.end', label: 'After results', kind: 'section', formats: ['window', 'video', 'split', 'carousel'],
          anchor: ['.stay-guide'], mode: 'before', fallback: 'footer.site-footer', house: true },
        { id: 'apartments.sticky', label: 'Corner card', kind: 'overlay', formats: ['sticky'] }
      ], shadow: true },

    { page: 'tours', label: 'Tours & Safaris', service: true,
      feed: { grid: ['#ct-grid'], label: 'tour cards' },
      slots: [
        { id: 'tours.feed', label: 'In results', kind: 'infeed', formats: ['native', 'carousel'] },
        { id: 'tours.end', label: 'After tours', kind: 'section', formats: ['window', 'video', 'split', 'carousel'],
          anchor: ['.ct-invite', 'section.seo-content'], mode: 'before', fallback: 'footer.site-footer', house: true },
        { id: 'tours.sticky', label: 'Corner card', kind: 'overlay', formats: ['sticky'] }
      ], shadow: true },

    { page: 'events', label: 'Events', service: true,
      feed: { grid: ['#ev-grid'], label: 'event cards' },
      slots: [
        { id: 'events.feed', label: 'In results', kind: 'infeed', formats: ['native', 'carousel'] },
        { id: 'events.end', label: 'After events', kind: 'section', formats: ['window', 'video', 'split', 'carousel'],
          anchor: ['.ev-invite', 'section.seo-content'], mode: 'before', fallback: 'footer.site-footer', house: true },
        { id: 'events.sticky', label: 'Corner card', kind: 'overlay', formats: ['sticky'] }
      ], shadow: true },

    { page: 'food', label: 'Food', service: true,
      feed: { grid: ['#grid'], label: 'restaurants' },
      slots: [
        { id: 'food.feed', label: 'In results', kind: 'infeed', formats: ['native', 'carousel'] },
        { id: 'food.end', label: 'After restaurants', kind: 'section', formats: ['window', 'video', 'carousel', 'split'],
          anchor: ['section.pitch', 'section.prose'], mode: 'before', fallback: 'footer.site-footer', house: true }
      ], shadow: true },

    { page: 'shopping', label: 'Shopping', service: true,
      slots: [
        { id: 'shopping.end', label: 'Before the guide', kind: 'section', formats: ['window', 'video', 'carousel', 'split'],
          anchor: ['section.seo-content'], mode: 'before', fallback: 'footer.site-footer', house: true }
      ], shadow: true },

    { page: 'flights', label: 'Flights', service: true,
      slots: [
        { id: 'flights.mid', label: 'In the flight guide', kind: 'fixed', formats: ['video', 'window', 'carousel'],
          anchor: ['[data-showcase="video"]', 'section.seo-content h3:last-of-type'], mode: 'use', fallback: 'footer.site-footer', house: true }
      ], shadow: true },

    { page: 'roommates', label: 'Roommates', service: true,
      feed: { grid: ['#grid'], label: 'rooms' },
      slots: [
        { id: 'roommates.feed', label: 'In results', kind: 'infeed', formats: ['native', 'carousel'] },
        { id: 'roommates.end', label: 'After rooms', kind: 'section', formats: ['window', 'video', 'carousel', 'split'],
          anchor: ['section.band'], mode: 'before', fallback: 'footer.site-footer', house: true }
      ], shadow: true },

    { page: 'carhire', label: 'Car hire', service: true,
      feed: { grid: ['#dv-grid'], label: 'cars' },
      slots: [
        { id: 'carhire.feed', label: 'In results', kind: 'infeed', formats: ['native', 'carousel'] },
        { id: 'carhire.end', label: 'After the fleet', kind: 'section', formats: ['window', 'video', 'carousel', 'split'],
          anchor: ['.dv-faq'], mode: 'before', fallback: 'footer.site-footer', house: true }
      ], shadow: true },

    { page: 'rides', label: 'Rides', service: true,
      slots: [
        { id: 'rides.plan', label: 'In the trip panel', kind: 'section', formats: ['native', 'carousel'],
          anchor: ['.mv-faq'], mode: 'before', width: 'inherit' }
      ], shadow: true },

    { page: 'my-bookings', label: 'My bookings', service: false,
      slots: [
        { id: 'my-bookings.end', label: 'Below bookings', kind: 'fixed', formats: ['video', 'window', 'carousel'],
          anchor: ['[data-showcase="video"]'], house: true },
        { id: 'my-bookings.sticky', label: 'Corner card', kind: 'overlay', formats: ['sticky'] }
      ] }
  ];

  /* Pages that must never carry an ad: money, identity and forms. */
  var NEVER = ['admin', 'auth', 'add-listing', 'booking-confirm', 'checkout', 'order', 'support-console',
    'delete-account', 'unsubscribe', 'offline', '404', 'partner-bookings', 'partner-listings', 'partner-calendar',
    'partner-earnings', 'partner-reviews', 'partner-analytics', 'partner-agents', 'partner-settings',
    'partner-orders', 'partner-menu', 'partner-fleet', 'partner-cabana', 'agent-dashboard', 'ambassador-dashboard',
    'driver', 'rider', 'list-your-event', 'list-your-tour', 'list-your-fleet'];

  /* ── POLICY ──────────────────────────────────────────────────────
     Defaults. The console overrides these live (ad_settings).       */
  var POLICY = {
    enabled: true,          // kill switch for every ad on the site
    house_ads: true,        // fill empty end-of-page slots with Cabana's own promos
    max_units: 3,           // inline units on one page view (overlays not counted)
    min_gap: 900,           // px of real content between any two units
    fold_guard: true,       // never show an ad in the first screen of a service page
    infeed: { first: 6, every: 12, max: 2 },
    sticky: { enabled: true, delay_s: 20 },
    shadow: { enabled: true },
    poster: { enabled: true },
    disabled_slots: []
  };

  /* ── LOOKUPS ─────────────────────────────────────────────────── */
  var BY_PAGE = {}, BY_SLOT = {};
  SURFACES.forEach(function (s) {
    BY_PAGE[s.page] = s;
    s.slots.forEach(function (sl) { sl.page = s.page; BY_SLOT[sl.id] = sl; });
  });

  function pageFromPath(pathname) {
    var p = String(pathname || '/').split('?')[0].split('#')[0].replace(/\/+$/, '');
    p = p.split('/').pop() || 'index';
    p = p.replace(/\.html?$/i, '').toLowerCase();
    return p || 'index';
  }

  function surface(page) { return BY_PAGE[page] || null; }
  function slot(id) { return BY_SLOT[id] || null; }
  function never(page) { return NEVER.indexOf(page) !== -1; }

  function mergePolicy(over) {
    var out = JSON.parse(JSON.stringify(POLICY));
    if (!over || typeof over !== 'object') return out;
    Object.keys(over).forEach(function (k) {
      var v = over[k];
      if (v && typeof v === 'object' && !Array.isArray(v) && out[k] && typeof out[k] === 'object' && !Array.isArray(out[k])) {
        Object.keys(v).forEach(function (kk) { out[k][kk] = v[kk]; });
      } else if (v !== undefined && v !== null) out[k] = v;
    });
    return out;
  }

  function today() {
    try { return new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Nairobi' }).format(new Date()); }
    catch (e) { return new Date().toISOString().slice(0, 10); }
  }

  /* Is a campaign allowed to run right now, anywhere? */
  function running(c, onDate) {
    if (!c) return false;
    var st = c.status || (c.active === false ? 'paused' : 'live');
    if (st !== 'live' || c.active === false) return false;
    var d = onDate || today();
    if (c.start_date && String(c.start_date).slice(0, 10) > d) return false;
    if (c.end_date && String(c.end_date).slice(0, 10) < d) return false;
    return true;
  }

  /* Does this campaign target this slot? Explicit slot picks win; with
     none picked, page targeting ('all' or the page) decides. */
  function targets(c, sl) {
    if (!c || !sl) return false;
    var picked = Array.isArray(c.slots) ? c.slots.filter(Boolean) : [];
    if (picked.length) return picked.indexOf(sl.id) !== -1;
    var pages = Array.isArray(c.page_targets) && c.page_targets.length ? c.page_targets : ['all'];
    if (pages.indexOf('all') === -1 && pages.indexOf(sl.page) === -1) return false;
    return true;
  }

  function hasMedia(c) { return !!(c && c.media_url); }

  /* Everything that may fill a slot, best first, with how it fits:
     'exact' (the slot's own format) or 'adapted' (another format that
     reads well in this slot). Used by the site AND the console. */
  function candidates(campaigns, sl, onDate) {
    if (!sl) return [];
    var own = sl.formats || [];
    var ok = (campaigns || []).filter(function (c) { return running(c, onDate) && targets(c, sl); });
    var exact = ok.filter(function (c) { return own.indexOf(c.format) !== -1; });
    var adapted = [];
    if (sl.kind !== 'overlay' && sl.kind !== 'takeover' && sl.kind !== 'managed') {
      var alt = {};
      own.forEach(function (f) { (ADAPTS[f] || []).forEach(function (a) { alt[a] = 1; }); });
      adapted = ok.filter(function (c) {
        return own.indexOf(c.format) === -1 && alt[c.format] && hasMedia(c) &&
          c.format !== 'poster' && c.format !== 'sticky' && c.format !== 'ticker';
      });
    }
    function byPri(a, b) { return (b.priority || 0) - (a.priority || 0); }
    return exact.sort(byPri).map(function (c) { return { c: c, fit: 'exact' }; })
      .concat(adapted.sort(byPri).map(function (c) { return { c: c, fit: 'adapted' }; }));
  }

  /* Slots a format can appear in, for the console's slot picker. */
  function slotsForFormat(fmt) {
    var out = [];
    SURFACES.forEach(function (s) {
      s.slots.forEach(function (sl) {
        if (sl.formats.indexOf(fmt) !== -1) out.push({ slot: sl, surface: s, fit: 'exact' });
        else if (sl.kind !== 'overlay' && sl.kind !== 'takeover' && sl.kind !== 'managed' &&
          sl.formats.some(function (f) { return (ADAPTS[f] || []).indexOf(fmt) !== -1; })) out.push({ slot: sl, surface: s, fit: 'adapted' });
      });
    });
    return out;
  }

  /* A URL an ad may send someone to. Anything else becomes no link. */
  function safeHref(u) {
    u = String(u == null ? '' : u).trim();
    if (!u || u === '#') return '';
    if (/^(https?:)?\/\//i.test(u)) return /^\/\//.test(u) ? 'https:' + u : u;
    if (/^[a-z][a-z0-9+.-]*:/i.test(u)) return /^(mailto|tel):/i.test(u) ? u : '';
    return u.charAt(0) === '/' ? u : '/' + u.replace(/^\.\//, '');
  }

  function isVideo(c) {
    if (!c) return false;
    if (c.media_kind) return c.media_kind === 'video';
    return /\.(mp4|webm|mov|m4v|ogv)(\?|#|$)/i.test(String(c.media_url || ''));
  }

  return {
    VERSION: VERSION,
    FORMATS: FORMATS,
    ADAPTS: ADAPTS,
    SURFACES: SURFACES,
    NEVER: NEVER,
    POLICY: POLICY,
    pageFromPath: pageFromPath,
    surface: surface,
    slot: slot,
    never: never,
    mergePolicy: mergePolicy,
    today: today,
    running: running,
    targets: targets,
    candidates: candidates,
    slotsForFormat: slotsForFormat,
    safeHref: safeHref,
    isVideo: isVideo
  };
});
