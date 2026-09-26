/* ═══════════════════════════════════════════════════════════════════
   CABANA · OPERATIONS CONSOLE · Immersive
   ───────────────────────────────────────────────────────────────────
   The studio behind the VR / 360° section on /tours.

     Worlds    every experience, its status, how it is doing, and the
               studio to build one: scenes, uploads, hotspots, poster
     Access    the free trial, the switch to paid, the banner, passes
               and the people asking for one
     Insights  plays, watch time, completion, how people watch

   Uploads go to the private `immersive` bucket through Supabase's
   resumable (TUS) endpoint in 6 MB chunks, so a 3 GB 8K master can
   survive a dropped connection, a pause, or a closed laptop lid.
   Posters go to the public `immersive-public` bucket.

   The database checks every scene and hotspot again on save
   (immersive_scenes_valid, the normalise trigger). The checks here
   exist to say what is wrong in words, before a round trip.
   ═══════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';
  var CX = global.CX; if (!CX || !CX.ops) return;
  var html = CX.html, raw = CX.raw, set = CX.set, icon = CX.icon, $ = CX.$, $$ = CX.$$;
  var n = CX.n, num = CX.num, ago = CX.ago, fdate = CX.fdate, esc = CX.esc;
  var rpc = CX.rpc, toast = CX.toast, confirm = CX.confirm, form = CX.form;
  var O = CX.ops, on = O.on, pageHd = O.pageHd;
  var Eng = global.CabanaImmersiveEngine;

  var SB_URL = 'https://gfwgbgdvxtocwhilrtdw.supabase.co';
  var ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdmd2diZ2R2eHRvY3doaWxydGR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1MTE2NjMsImV4cCI6MjA5NzA4NzY2M30.U8JClv06YsNAwq9qsPb3lQ4SIPeRPjKMzsYxVfcmujw';
  var PRIV = 'immersive', PUB = 'immersive-public';
  var CHUNK = 6 * 1024 * 1024;            // Supabase requires exactly 6 MB TUS chunks
  var PHONE_EDGE = 4096;                   // widest texture most phones will decode
  var SLUG_RX = /^[a-z0-9][a-z0-9-]{1,78}[a-z0-9]$/;
  var HTTPS_RX = /^https:\/\/[^\s"'<>\\]+$/i;

  var PROJ = [
    ['equirect', '360° · mono', '2:1 equirectangular. Most 360 cameras export this.'],
    ['equirect_tb', '360° · 3D top-bottom', 'Left eye on top, right eye below. 1:1 frame.'],
    ['equirect_sbs', '360° · 3D side-by-side', 'Left eye left, right eye right. 4:1 frame.'],
    ['vr180', '180° · mono', 'Half-sphere, 1:1 frame.'],
    ['vr180_sbs', '180° · 3D side-by-side', 'VR180 cameras. Two 1:1 halves, 2:1 frame.'],
    ['flat', 'Flat film · cinema', 'Ordinary video on a big virtual screen.']
  ];
  var PROJ_SHORT = { equirect: '360°', equirect_tb: '360° 3D', equirect_sbs: '360° 3D', vr180: '180°', vr180_sbs: '180° 3D', flat: 'Cinema' };
  var HOT_TYPES = [['info', 'Info card'], ['scene', 'Walk to a scene'], ['tour', 'Book the tour'], ['seek', 'Jump in the film'], ['link', 'Open a link']];
  var EXT_MIME = { mp4: 'video/mp4', m4v: 'video/mp4', webm: 'video/webm', mov: 'video/quicktime', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', avif: 'image/avif',
    mp3: 'audio/mpeg', m4a: 'audio/mp4', aac: 'audio/aac', ogg: 'audio/ogg', oga: 'audio/ogg', wav: 'audio/wav' };

  function sb() { return CX.client(); }
  function noop() {}
  function uuid() {
    if (global.crypto && crypto.randomUUID) return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) { var r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 3 | 8)).toString(16); });
  }
  function slugify(s) { return String(s || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || ''; }
  function extOf(name) { var m = String(name || '').toLowerCase().match(/\.([a-z0-9]{2,5})$/); return m ? m[1] : ''; }
  function mimeOf(file) { return file.type || EXT_MIME[extOf(file.name)] || 'application/octet-stream'; }
  function mb(b) { return b >= 1073741824 ? (b / 1073741824).toFixed(2) + ' GB' : (b / 1048576).toFixed(1) + ' MB'; }
  function fmtT(s) { s = Math.max(0, Math.round(n(s))); var m = Math.floor(s / 60); return m + ':' + String(s % 60).padStart(2, '0'); }
  function durLabel(s) { s = n(s); if (!s) return '—'; if (s < 60) return Math.round(s) + 's'; var m = Math.round(s / 60); return m < 60 ? m + ' min' : Math.floor(m / 60) + 'h ' + (m % 60) + 'm'; }
  function pubUrl(path) { return SB_URL + '/storage/v1/object/public/' + PUB + '/' + path; }
  function store(k, v) { try { if (arguments.length > 1) { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } return localStorage.getItem(k); } catch (e) { return null; } }
  function friendlySave(e) {
    var m = String((e && e.message) || e || '');
    if (/immersive_experiences_slug_key|duplicate key/i.test(m)) return 'That web address is already used by another world. Change the slug.';
    if (/immersive_scenes_valid|scenes_check/i.test(m)) return 'A scene has a link, marker or setting the database rejected. Check every scene has a file, and markers point at real scenes.';
    if (/immersive_needs_a_scene/i.test(m)) return 'Add at least one scene before publishing.';
    if (/immersive_media_outside_folder/i.test(m)) return 'A scene points at media from another world. Upload it to this one instead.';
    if (/slug_check/i.test(m)) return 'The web address can only use lowercase letters, numbers and dashes.';
    if (/title_check/i.test(m)) return 'The title needs 2 to 120 characters.';
    return CX.friendly ? CX.friendly(e) : m;
  }

  /* ════════════════════════════════════════════════════════════════
     1 · RESUMABLE UPLOADS (TUS)
     ════════════════════════════════════════════════════════════════ */
  function httpErr(x) {
    var msg = '';
    try { msg = JSON.parse(x.responseText).message || ''; } catch (e) { msg = x.responseText || ''; }
    var e = new Error(
      x.status === 413 ? 'This file is bigger than storage allows. Raise the upload limit under Storage settings in Supabase, or export a smaller file.' :
      x.status === 401 || x.status === 403 ? 'Your session cannot write to storage. Sign in again.' :
      /mime|content type/i.test(msg) ? 'Storage does not accept this file type. Use MP4, WebM, MOV, JPEG, PNG, WebP or an audio file.' :
      msg || ('Upload failed (' + x.status + ')'));
    e.status = x.status;
    e.retry = x.status >= 500 || x.status === 409 || x.status === 423 || x.status === 0;
    return e;
  }
  function tus(o) {
    var endpoint = SB_URL + '/storage/v1/upload/resumable';
    var fp = 'imx-tus:' + [o.bucket, o.path, o.file.name, o.file.size, o.file.lastModified].join('|');
    var url = store(fp);
    var ctl = { paused: false, cancelled: false, xhr: null, loaded: 0, total: o.file.size, waiting: null };
    var tries = 0, BACK = [0, 1000, 3000, 6000, 12000, 20000, 30000];
    function b64(s) { return btoa(unescape(encodeURIComponent(s))); }
    function send(method, u, headers, body, onUp) {
      return CX.token().then(function (t) {
        return new Promise(function (resolve, reject) {
          var x = new XMLHttpRequest(); ctl.xhr = x;
          x.open(method, u, true);
          x.setRequestHeader('Authorization', 'Bearer ' + t);
          x.setRequestHeader('apikey', ANON);
          x.setRequestHeader('Tus-Resumable', '1.0.0');
          Object.keys(headers || {}).forEach(function (k) { x.setRequestHeader(k, headers[k]); });
          if (onUp && x.upload) x.upload.onprogress = function (e) { onUp(e.loaded); };
          x.onload = function () { resolve(x); };
          x.onerror = function () { var e = new Error('The connection dropped.'); e.retry = true; reject(e); };
          x.onabort = function () { var e = new Error('aborted'); e.aborted = true; reject(e); };
          x.timeout = 180000;
          x.ontimeout = function () { var e = new Error('The upload stalled.'); e.retry = true; reject(e); };
          x.send(body || null);
        });
      });
    }
    function create() {
      return send('POST', endpoint, {
        'Upload-Length': String(o.file.size),
        'Upload-Metadata': ['bucketName ' + b64(o.bucket), 'objectName ' + b64(o.path), 'contentType ' + b64(o.contentType), 'cacheControl ' + b64('31536000')].join(','),
        'x-upsert': 'true'
      }).then(function (x) {
        if (x.status !== 201) throw httpErr(x);
        var loc = x.getResponseHeader('Location');
        if (!loc) throw new Error('Storage did not return an upload address.');
        url = /^https?:/i.test(loc) ? loc : new URL(loc, endpoint).toString();
        store(fp, url);
        return 0;
      });
    }
    function head() {
      return send('HEAD', url).then(function (x) {
        if (x.status === 404 || x.status === 410 || x.status === 403) { url = null; store(fp, null); return null; }
        if (x.status >= 300) throw httpErr(x);
        return n(x.getResponseHeader('Upload-Offset'));
      });
    }
    function patch(off) {
      var chunk = o.file.slice(off, Math.min(off + CHUNK, o.file.size));
      return send('PATCH', url, { 'Upload-Offset': String(off), 'Content-Type': 'application/offset+octet-stream' }, chunk, function (l) {
        ctl.loaded = off + l; if (o.onProgress) o.onProgress(ctl.loaded, ctl.total);
      }).then(function (x) {
        if (x.status !== 204) throw httpErr(x);
        return n(x.getResponseHeader('Upload-Offset'));
      });
    }
    function waitResume() { return new Promise(function (r) { ctl.waiting = r; }); }
    function step(off) {
      if (ctl.cancelled) return Promise.reject(Object.assign(new Error('cancelled'), { cancelled: true }));
      if (off == null) return create().then(step);
      ctl.loaded = off; if (o.onProgress) o.onProgress(off, ctl.total);
      if (off >= o.file.size) { store(fp, null); return Promise.resolve(); }
      if (ctl.paused) return waitResume().then(head).then(step);
      return patch(off).then(function (next) { tries = 0; return step(next); }, function (e) {
        if (ctl.cancelled) throw Object.assign(new Error('cancelled'), { cancelled: true });
        if (ctl.paused) return waitResume().then(head).then(step);
        if (!e.retry || ++tries >= BACK.length) throw e;
        if (o.onState) o.onState('retrying');
        return new Promise(function (r) { setTimeout(r, BACK[tries]); }).then(head).then(step);
      });
    }
    ctl.promise = (url ? head().catch(function () { return null; }) : Promise.resolve(null)).then(step);
    ctl.pause = function () { ctl.paused = true; if (ctl.xhr) try { ctl.xhr.abort(); } catch (e) {} };
    ctl.resume = function () { ctl.paused = false; if (ctl.waiting) { var w = ctl.waiting; ctl.waiting = null; w(); } };
    ctl.cancel = function () {
      ctl.cancelled = true;
      if (ctl.xhr) try { ctl.xhr.abort(); } catch (e) {}
      if (ctl.waiting) { var w = ctl.waiting; ctl.waiting = null; w(); }
      if (url) send('DELETE', url).catch(noop);
      store(fp, null);
    };
    return ctl;
  }
  // Small files (posters, phone stills) go up in one request.
  function putSmall(bucket, path, blob, type) {
    return sb().storage.from(bucket).upload(path, blob, { upsert: true, contentType: type || blob.type, cacheControl: '31536000' })
      .then(function (r) { if (r.error) throw new Error(r.error.message || 'Upload failed'); return path; });
  }

  /* ════════════════════════════════════════════════════════════════
     2 · LOOKING AT A FILE BEFORE IT GOES UP
     ════════════════════════════════════════════════════════════════ */
  function analyze(file) {
    var mime = mimeOf(file), url = URL.createObjectURL(file);
    if (/^image\//.test(mime)) {
      return new Promise(function (resolve) {
        var img = new Image();
        img.onload = function () { resolve({ kind: 'image', mime: mime, w: img.naturalWidth, h: img.naturalHeight, url: url, playable: true, el: img }); };
        img.onerror = function () { resolve({ kind: 'image', mime: mime, w: 0, h: 0, url: url, playable: false }); };
        img.src = url;
      });
    }
    if (/^audio\//.test(mime)) return Promise.resolve({ kind: 'audio', mime: mime, url: url, playable: true });
    return new Promise(function (resolve) {
      var v = document.createElement('video'), done = false, meta = null;
      v.muted = true; v.playsInline = true; v.preload = 'auto';
      function finish(playable) { if (done) return; done = true; clearTimeout(t); resolve({ kind: 'video', mime: mime, w: v.videoWidth, h: v.videoHeight, dur: v.duration || 0, url: url, playable: playable, el: v }); }
      v.addEventListener('loadedmetadata', function () { meta = true; });
      v.addEventListener('loadeddata', function () { finish(v.videoWidth > 0); });
      v.addEventListener('error', function () { finish(false); });
      var t = setTimeout(function () { finish(!!meta && v.videoWidth > 0); }, 15000);
      v.src = url;
    });
  }
  function guessProjection(info, name) {
    var nm = String(name || '').toLowerCase(), r = info.w && info.h ? info.w / info.h : 2;
    var near = function (x) { return Math.abs(r - x) / x < 0.04; };
    if (/180/.test(nm)) return near(1) ? 'vr180' : 'vr180_sbs';
    if (/(_|-|\b)(tb|ou|topbottom|top-bottom|overunder)(_|-|\b)/.test(nm) || (near(1) && info.kind === 'video')) return 'equirect_tb';
    if (/(_|-|\b)(sbs|lr|sidebyside|side-by-side)(_|-|\b)/.test(nm)) return near(4) ? 'equirect_sbs' : 'vr180_sbs';
    if (near(4)) return 'equirect_sbs';
    if (near(2)) return 'equirect';
    if (near(1)) return 'vr180';
    return 'flat';
  }
  function warnings(info, proj) {
    var out = [];
    if (info.kind === 'video' && !info.playable) out.push(['bad', 'This browser could not decode the file. It is probably HEVC, ProRes or 10-bit. Most guests will see an error. Export H.264 MP4 (or add a phone version below) before publishing.']);
    if (info.kind === 'video' && info.w > PHONE_EDGE) out.push(['warn', info.w + ' px wide. Desktops and headsets can play it, most phones cannot. Add a phone version at 3840×1920 or 4096×2048.']);
    if (info.kind === 'image' && info.w > PHONE_EDGE) out.push(['ok', 'A phone-sized copy will be made automatically, so phones do not download the full ' + info.w + ' px panorama.']);
    var r = info.w && info.h ? info.w / info.h : 0;
    if (proj === 'equirect' && r && Math.abs(r - 2) > 0.1) out.push(['warn', 'This is not 2:1, so it will look stretched as a 360° sphere. Check the projection.']);
    if (/mov|quicktime/.test(info.mime || '')) out.push(['warn', 'MOV files play in Safari but often not in Chrome or Android. MP4 is safer.']);
    return out;
  }
  // A still from the file: the left eye for stereo, downscaled.
  function frameOf(info, proj, maxW) {
    return new Promise(function (resolve) {
      var src = info.el; if (!src) { resolve(null); return; }
      function draw() {
        var w = info.w, h = info.h, sx = 0, sy = 0, sw = w, sh = h;
        if (proj === 'equirect_tb') sh = h / 2;
        if (proj === 'equirect_sbs' || proj === 'vr180_sbs') sw = w / 2;
        var scale = Math.min(1, maxW / sw);
        var c = document.createElement('canvas'); c.width = Math.round(sw * scale); c.height = Math.round(sh * scale);
        try { c.getContext('2d').drawImage(src, sx, sy, sw, sh, 0, 0, c.width, c.height); } catch (e) { resolve(null); return; }
        c.toBlob(function (b) { resolve(b); }, 'image/jpeg', 0.86);
      }
      if (info.kind === 'image') { draw(); return; }
      var t = Math.min(3, (info.dur || 1) * 0.15);
      var done = false;
      var go = function () { if (done) return; done = true; draw(); };
      src.addEventListener('seeked', go, { once: true });
      setTimeout(go, 4000);
      try { src.currentTime = t; } catch (e) { go(); }
    });
  }
  function phoneCopy(info) {
    return new Promise(function (resolve) {
      var s = Math.min(1, PHONE_EDGE / info.w);
      var c = document.createElement('canvas'); c.width = Math.round(info.w * s); c.height = Math.round(info.h * s);
      try { c.getContext('2d').drawImage(info.el, 0, 0, c.width, c.height); } catch (e) { resolve(null); return; }
      c.toBlob(function (b) { resolve(b); }, 'image/jpeg', 0.88);
    });
  }

  /* ════════════════════════════════════════════════════════════════
     3 · DATA
     ════════════════════════════════════════════════════════════════ */
  function worlds() { return CX.rows(CX.q('immersive_experiences').select('*').order('featured', { ascending: false }).order('sort_order', { ascending: false }).order('updated_at', { ascending: false })); }
  function settings() { return CX.rows(CX.q('immersive_settings').select('*').eq('id', 1)).then(function (r) { return r[0] || {}; }); }
  var toursCache = null;
  function tours() {
    if (toursCache) return Promise.resolve(toursCache);
    return CX.rows(CX.q('tours').select('id,title,status,destination').neq('status', 'archived').order('title')).then(function (r) { toursCache = r; return r; }, function () { return []; });
  }
  function refsOf(row) {
    var out = [];
    (row && row.scenes || []).forEach(function (s) { ['src', 'src_mobile', 'audio'].forEach(function (k) { if (typeof s[k] === 'string' && s[k].indexOf('sb:') === 0) out.push(s[k].slice(3)); }); });
    return out;
  }

  /* ════════════════════════════════════════════════════════════════
     4 · THE VIEW
     ════════════════════════════════════════════════════════════════ */
  var TABS = [['worlds', 'Worlds'], ['access', 'Access & trial'], ['insights', 'Insights']];
  CX.view('immersive', {
    title: 'Immersive',
    render: function (v) {
      var tab = v.q.tab || 'worlds';
      set(v.el, html`${pageHd('Operations', 'Immersive', 'VR and 360° worlds on /tours. Build them, decide who gets in, and see how they are watched.')}${CX.skeleton('cards')}`);
      return Promise.all([worlds(), rpc('admin_immersive_overview', null, { fresh: true }), settings()]).then(function (r) {
        if (!v.alive()) return;
        var list = r[0], ov = r[1] || {}, st = r[2] || {};
        var reqs = n(ov.requests_open);
        set(v.el, html`${pageHd('Operations', 'Immersive', html`VR and 360° worlds on <a href="/tours#immersive" target="_blank" rel="noopener">/tours</a>. ${modeLine(st)}`,
            html`<button class="btn btn-g" data-see>${icon('eye')}See it live</button><button class="btn btn-p" data-new>${icon('plus')}New world</button>`)}
          ${CX.tabs(TABS.map(function (t) { return [t[0], t[1], t[0] === 'access' ? reqs : t[0] === 'worlds' ? list.length : null, t[0] === 'access']; }), tab)}
          <div data-body></div>`);
        on(v.el, '[data-tab]', 'click', function (el) { var t = el.getAttribute('data-tab'); v.setQ({ tab: t === 'worlds' ? null : t }); v.refresh(); });
        on(v.el, '[data-new]', 'click', function () { openStudio(null, v); });
        on(v.el, '[data-see]', 'click', function () { CX.preview('/tours'); });
        var body = $('[data-body]', v.el);
        if (tab === 'access') return renderAccess(body, v, st, ov);
        if (tab === 'insights') return renderInsights(body, v, list, ov);
        renderWorlds(body, v, list, ov, st);
        if (v.q.edit) { var w = list.filter(function (x) { return x.id === v.q.edit; })[0]; if (w) openStudio(w, v); }
      });
    },
    leave: function () { closeStudio(true); }
  });

  function modeLine(st) {
    if (st.mode === 'open') return html`<b>Open to everyone</b>, no pass needed.`;
    if (st.mode === 'pass') return html`<b>Pass holders only</b> for pass worlds. Free worlds stay open.`;
    var ends = st.trial_ends_at ? new Date(st.trial_ends_at) : null;
    if (ends && ends < new Date()) return html`<span class="bad-t"><b>The free trial ended ${fdate(st.trial_ends_at)}.</b></span> Pass worlds are locked.`;
    return html`<b>Free trial</b> ${ends ? 'until ' + fdate(st.trial_ends_at) : 'with no end date'}. Every world is open.`;
  }

  /* ── worlds ── */
  function renderWorlds(body, v, list, ov, st) {
    var by = ov.by_experience || {}, c = ov.counts || {};
    var hrs = n(ov.seconds_30) / 3600;
    set(body, html`
      <div class="grid g4 imx-kpis">
        <div class="mini"><div class="mini-l">Live worlds</div><div class="mini-v">${num(c.published)}</div><div class="mini-s">${num(c.draft)} draft${n(c.draft) === 1 ? '' : 's'} · ${num(c.featured)} featured</div></div>
        <div class="mini"><div class="mini-l">Plays · 30 days</div><div class="mini-v">${num(ov.plays_30)}</div><div class="mini-s">${num(ov.viewers_30)} signed-in viewers</div></div>
        <div class="mini"><div class="mini-l">Time inside · 30 days</div><div class="mini-v">${hrs >= 10 ? num(hrs) + ' h' : (hrs).toFixed(1) + ' h'}</div><div class="mini-s">${n(ov.plays_30) ? durLabel(n(ov.seconds_30) / n(ov.plays_30)) + ' per play' : 'No plays yet'}</div></div>
        <div class="mini"><div class="mini-l">Pass requests</div><div class="mini-v">${num(ov.requests_open)}</div><div class="mini-s">${num(ov.passes_active)} active pass${n(ov.passes_active) === 1 ? '' : 'es'}</div></div>
      </div>
      ${n(ov.requests_open) ? html`<div class="callout warn mb">${icon('user')}<div class="grow"><div class="strong">${num(ov.requests_open)} guest${n(ov.requests_open) === 1 ? ' is' : 's are'} waiting on a pass</div><div class="muted" style="font-size:12.5px">Reply from Access &amp; trial.</div></div><button class="btn btn-sm btn-p" data-go-access>Open</button></div>` : ''}
      <div class="imx-worlds">
        ${list.map(function (w, i) {
          var s = by[w.id] || {};
          var tone = w.status === 'published' ? 'ok' : w.status === 'draft' ? 'warn' : '';
          return html`<div class="imx-w" data-id="${w.id}">
            <div class="imx-w-img" data-edit="${w.id}">${w.poster_url ? html`<img src="${CX.safeUrl(w.poster_url)}" alt="" loading="lazy"/>` : html`<div class="ph">${icon('vr')}</div>`}
              <div class="imx-w-tags"><span class="imx-chip ${tone}">${w.status}</span><span class="imx-chip">${w.format === 'flat' ? 'Cinema' : w.format === 'mixed' ? 'Mixed' : w.format + '°'}${w.stereo ? ' 3D' : ''}</span>
                ${w.featured ? html`<span class="imx-chip brand">${icon('star')}Featured</span>` : ''}${w.access === 'pass' ? html`<span class="imx-chip">${icon('lock')}Pass</span>` : ''}</div></div>
            <div class="imx-w-b"><div class="imx-w-t">${w.title}</div>
              <div class="imx-w-s">${[w.destination, w.country].filter(Boolean).join(', ') || 'No place set'} · ${num(w.scene_count)} scene${w.scene_count === 1 ? '' : 's'}${w.interactive ? ' · interactive' : ''}</div>
              <div class="imx-w-stats"><span>${num(s.plays)} plays</span><span>${durLabel(n(s.seconds) / Math.max(1, n(s.plays)))} avg</span><span>${n(s.plays) ? Math.round(n(s.completed) / n(s.plays) * 100) + '% finish' : '—'}</span></div></div>
            <div class="imx-w-f">
              <button class="btn btn-sm btn-p" data-edit="${w.id}">${icon('edit')}Edit</button>
              ${w.status === 'published' ? html`<button class="btn btn-sm btn-g" data-status="draft" data-id="${w.id}">Unpublish</button>` : html`<button class="btn btn-sm btn-ok" data-status="published" data-id="${w.id}">Publish</button>`}
              <span class="grow"></span>
              <button class="icon-btn" title="Move earlier" data-mv="1" data-id="${w.id}"${i === 0 ? raw(' disabled') : ''}>${icon('chevL')}</button>
              <button class="icon-btn" title="Move later" data-mv="-1" data-id="${w.id}"${i === list.length - 1 ? raw(' disabled') : ''}>${icon('chevR')}</button>
              <button class="icon-btn" title="More" data-more="${w.id}">${icon('more')}</button>
            </div></div>`;
        })}
        <button class="imx-new" type="button" data-new2>${icon('plus')}<b>New world</b><span>Upload 360° or 180° video, a panorama, or a flat film. Link scenes together and add markers.</span></button>
      </div>`);
    var find = function (id) { return list.filter(function (x) { return x.id === id; })[0]; };
    on(body, '[data-edit]', 'click', function (el) { openStudio(find(el.getAttribute('data-edit')), v); });
    on(body, '[data-new2]', 'click', function () { openStudio(null, v); });
    on(body, '[data-go-access]', 'click', function () { v.setQ({ tab: 'access' }); v.refresh(); });
    on(body, '[data-status]', 'click', function (el) {
      var w = find(el.getAttribute('data-id')), to = el.getAttribute('data-status');
      CX.busy(el, function () {
        return CX.q('immersive_experiences').update({ status: to }).eq('id', w.id).then(function (r) {
          if (r.error) throw new Error(friendlySave(r.error));
          CX.log('immersive_' + (to === 'published' ? 'publish' : 'unpublish'), 'immersive', w.id, { title: w.title });
          toast(to === 'published' ? 'Live on /tours' : 'Taken down', 'ok'); v.refresh();
        });
      }).catch(noop);
    });
    on(body, '[data-mv]', 'click', function (el) {
      var i = list.indexOf(find(el.getAttribute('data-id'))), j = i - Number(el.getAttribute('data-mv'));
      if (i < 0 || j < 0 || j >= list.length) return;
      var a = list[i], b = list[j], ra = n(a.sort_order), rb = n(b.sort_order);
      if (ra === rb) ra = rb + (j < i ? 1 : -1);
      Promise.all([CX.q('immersive_experiences').update({ sort_order: rb }).eq('id', a.id), CX.q('immersive_experiences').update({ sort_order: ra }).eq('id', b.id)])
        .then(function () { v.refresh(); }, function () { toast('Could not reorder', 'bad'); });
    });
    on(body, '[data-more]', 'click', function (el) {
      var w = find(el.getAttribute('data-more'));
      CX.menu(el, [
        { label: w.featured ? 'Stop featuring' : 'Feature (shows in the headset)', icon: 'star', fn: function () { CX.q('immersive_experiences').update({ featured: !w.featured }).eq('id', w.id).then(function () { v.refresh(); }); } },
        { label: 'Open on /tours', icon: 'external', fn: function () { global.open('/tours?vr=' + encodeURIComponent(w.slug), '_blank', 'noopener'); } },
        { label: 'Copy share link', icon: 'copy', fn: function () { CX.copy('https://cabana.africa/tours?vr=' + w.slug, 'Link'); } },
        { label: w.status === 'archived' ? 'Restore as draft' : 'Archive', icon: 'scroll', fn: function () { CX.q('immersive_experiences').update({ status: w.status === 'archived' ? 'draft' : 'archived' }).eq('id', w.id).then(function () { v.refresh(); }); } },
        '-',
        { label: 'Delete for good', icon: 'trash', danger: true, fn: function () { deleteWorld(w, v); } }
      ]);
    });
  }

  function deleteWorld(w, v) {
    confirm({ title: 'Delete ' + w.title + '?', body: 'The world and every file uploaded for it are removed. This cannot be undone. To take it down for now, unpublish or archive it instead.', tone: 'danger', confirm: 'Delete for good', icon: 'trash',
      onConfirm: function () {
        return CX.q('immersive_experiences').delete().eq('id', w.id).then(function (r) {
          if (r.error) throw new Error(friendlySave(r.error));
          return Promise.all([PRIV, PUB].map(function (b) {
            return sb().storage.from(b).list('exp/' + w.id, { limit: 1000 }).then(function (l) {
              var paths = (l.data || []).map(function (f) { return 'exp/' + w.id + '/' + f.name; });
              return paths.length ? sb().storage.from(b).remove(paths) : null;
            }).catch(noop);
          }));
        }).then(function () { CX.log('immersive_delete', 'immersive', w.id, { title: w.title }); toast('Deleted', 'ok'); v.refresh(); });
      } });
  }

  /* ── access & trial ── */
  function renderAccess(body, v, st, ov) {
    var draft = Object.assign({}, st);
    function localDT(iso) { if (!iso) return ''; var d = new Date(iso); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 16); }
    set(body, html`
      <div class="split">
        <div class="col" style="gap:14px">
          <div class="card"><div class="card-hd"><div><div class="card-t">Who gets in</div><div class="card-s">One switch. Changing it takes effect on the next play; nothing needs a deploy.</div></div></div>
            <div class="imx-modes">
              ${[['trial', 'Free trial', 'Every published world is open until the end date. The banner invites people in.'],
                 ['open', 'Open to all', 'Every world is open. No banner, no end date.'],
                 ['pass', 'Pass holders', 'Worlds marked Pass need an active pass. Worlds marked Free stay open.']].map(function (m) {
                return html`<button type="button" class="imx-mode ${draft.mode === m[0] ? 'on' : ''}" data-mode="${m[0]}"><b>${m[1]}</b><span>${m[2]}</span></button>`; })}
            </div>
            <div class="imx-grid mt" style="margin-top:14px">
              <div class="imx-f"><label for="imx-te">Trial ends</label><input class="inp" id="imx-te" type="datetime-local" value="${localDT(draft.trial_ends_at)}"/><div class="hint">Leave empty for no end date. When it passes, pass worlds lock on their own.</div></div>
              <div class="imx-f"><label>Motion</label><label class="check"><input type="checkbox" id="imx-pm"${draft.presence_motion !== false ? raw(' checked') : ''}/><span>Presence motion<small>A slow breath in the view and a drift on stills, so it feels like standing there. Off for anyone who asks their device for reduced motion.</small></span></label></div>
            </div>
          </div>
          <div class="card"><div class="card-hd"><div><div class="card-t">The free-trial banner</div><div class="card-s">Drops in on /tours once every 12 hours per visitor, only while the trial is running. It dismisses itself.</div></div>
            <label class="check" style="margin:0"><input type="checkbox" id="imx-be"${draft.banner_enabled !== false ? raw(' checked') : ''}/><span>Show it</span></label></div>
            <div class="imx-grid">
              <div class="imx-f"><label for="imx-bt">Headline</label><input class="inp" id="imx-bt" maxlength="60" value="${draft.banner_title || 'Enjoy a free trial'}"/></div>
              <div class="imx-f full"><label for="imx-bx">Line</label><textarea class="inp" id="imx-bx" maxlength="240" rows="2">${draft.banner_text || ''}</textarea></div>
            </div>
            <div class="imx-banner-prev" style="margin-top:12px"><span class="i">${icon('vr')}</span><div><div class="t" data-bt>${draft.banner_title || 'Enjoy a free trial'}</div><div class="s" data-bx>${draft.banner_text || ''}</div></div></div>
          </div>
          <div class="card"><div class="card-hd"><div><div class="card-t">The pass</div><div class="card-s">Shown on the lock screen once you switch to Pass holders. Payment is arranged by the team; nothing is charged on the page.</div></div></div>
            <div class="imx-grid">
              <div class="imx-f"><label for="imx-pp">Price (KES)</label><input class="inp" id="imx-pp" type="number" min="0" step="50" value="${draft.pass_price_kes != null ? draft.pass_price_kes : ''}" placeholder="Not shown"/></div>
              <div class="imx-f"><label for="imx-pd">Lasts (days)</label><input class="inp" id="imx-pd" type="number" min="1" max="3650" value="${draft.pass_days || 30}"/></div>
            </div>
          </div>
          <div class="row" style="justify-content:flex-end"><button class="btn btn-p" data-save-settings>${icon('check')}Save access settings</button></div>
        </div>
        <div class="col" style="gap:14px">
          <div class="card"><div class="card-hd"><div><div class="card-t">Pass requests</div><div class="card-s">People who asked for a pass from a locked world.</div></div><button class="btn btn-sm btn-g" data-grant>${icon('plus')}Grant a pass</button></div><div data-reqs>${CX.skeleton()}</div></div>
          <div class="card"><div class="card-hd"><div><div class="card-t">Passes</div><div class="card-s">${num(ov.passes_active)} active</div></div></div><div data-passes></div></div>
        </div>
      </div>`);
    on(body, '[data-mode]', 'click', function (el) {
      draft.mode = el.getAttribute('data-mode');
      $$('[data-mode]', body).forEach(function (b) { b.classList.toggle('on', b === el); });
    });
    ['#imx-bt', '#imx-bx'].forEach(function (s) {
      $(s, body).addEventListener('input', function () { $('[data-bt]', body).textContent = $('#imx-bt', body).value; $('[data-bx]', body).textContent = $('#imx-bx', body).value; });
    });
    on(body, '[data-save-settings]', 'click', function (el) {
      var te = $('#imx-te', body).value;
      var patch = {
        mode: draft.mode || 'trial',
        trial_ends_at: te ? new Date(te).toISOString() : null,
        presence_motion: $('#imx-pm', body).checked,
        banner_enabled: $('#imx-be', body).checked,
        banner_title: $('#imx-bt', body).value.trim() || 'Enjoy a free trial',
        banner_text: $('#imx-bx', body).value.trim(),
        pass_price_kes: $('#imx-pp', body).value === '' ? null : Math.max(0, Math.round(n($('#imx-pp', body).value))),
        pass_days: Math.max(1, Math.min(3650, Math.round(n($('#imx-pd', body).value) || 30)))
      };
      var go = function () {
        return CX.busy(el, function () {
          return CX.q('immersive_settings').update(patch).eq('id', 1).then(function (r) {
            if (r.error) throw new Error(CX.friendly(r.error));
            CX.log('immersive_settings', 'immersive', 'settings', { mode: patch.mode, trial_ends_at: patch.trial_ends_at });
            toast('Access settings saved', 'ok'); v.refresh();
          });
        });
      };
      if (patch.mode === 'pass' && st.mode !== 'pass') {
        confirm({ title: 'Lock pass worlds now?', body: 'Anyone without an active pass loses access to worlds marked Pass the next time they press play. Worlds marked Free stay open.', tone: 'warn', confirm: 'Switch to passes', icon: 'lock', onConfirm: go });
      } else go().catch(noop);
    });
    on(body, '[data-grant]', 'click', function () { grantPass(null, st, v); });
    rpc('admin_immersive_passes', null, { fresh: true }).then(function (d) {
      if (!v.alive()) return;
      var reqs = d.requests || [], passes = d.passes || [];
      set($('[data-reqs]', body), reqs.length ? html`<div class="list">${reqs.map(function (r) {
        return html`<div class="li"><span class="li-ic ${r.status === 'open' ? 'warn' : ''}">${icon('user')}</span><div class="li-b"><div class="li-t">${r.email || 'Member'}${r.phone ? ' · ' + r.phone : ''}</div>
          <div class="li-s">${r.experience ? 'From ' + r.experience + ' · ' : ''}${ago(r.created_at)}${r.status !== 'open' ? ' · ' + r.status : ''}</div></div>
          ${r.status === 'open' ? html`<div class="t-act"><button class="btn btn-sm btn-ok" data-req-grant="${r.id}">Grant</button><button class="btn btn-sm btn-q" data-req-close="${r.id}">Close</button></div>` : ''}</div>`; })}</div>`
        : CX.empty('No requests', 'When someone asks for a pass from a locked world, they land here.', 'inbox', true));
      set($('[data-passes]', body), passes.length ? html`<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Member</th><th>Until</th><th>State</th><th></th></tr></thead><tbody>${passes.map(function (p) {
        return html`<tr><td><div class="t-main">${p.email || p.user_id}</div><div class="t-sub">${p.source}${p.note ? ' · ' + p.note : ''}${p.granted_by ? ' · by ' + p.granted_by : ''}</div></td>
          <td class="t-sub">${p.expires_at ? fdate(p.expires_at) : 'No end'}</td>
          <td>${p.revoked_at ? CX.pill('revoked', 'p-bad') : p.active ? CX.pill('active', 'p-ok') : CX.pill('expired', 'p-mute')}</td>
          <td><div class="t-act">${p.active ? html`<button class="btn btn-sm btn-q" data-revoke="${p.id}">Revoke</button>` : ''}</div></td></tr>`; })}</tbody></table></div>`
        : CX.empty('No passes yet', 'Grant one by email, or from a request.', 'key'));
      on(body, '[data-req-grant]', 'click', function (el) { var r = reqs.filter(function (x) { return x.id === el.getAttribute('data-req-grant'); })[0]; grantPass(r, st, v); });
      on(body, '[data-req-close]', 'click', function (el) {
        CX.busy(el, function () { return rpc('admin_immersive_pass_action', { p_action: 'close_request', p_request: el.getAttribute('data-req-close') }).then(function () { toast('Closed', 'ok'); CX.pulseNow(true); v.refresh(); }); }).catch(noop);
      });
      on(body, '[data-revoke]', 'click', function (el) {
        confirm({ title: 'Revoke this pass?', body: 'Pass worlds lock for this member straight away.', tone: 'warn', confirm: 'Revoke',
          onConfirm: function () { return rpc('admin_immersive_pass_action', { p_action: 'revoke', p_pass: el.getAttribute('data-revoke') }).then(function () { toast('Revoked', 'ok'); v.refresh(); }); } });
      });
    }).catch(function (e) { set($('[data-reqs]', body), CX.errorBox(e)); });
  }

  function grantPass(req, st, v) {
    form({ title: 'Grant an Immersive Pass', sub: req ? 'For ' + (req.email || 'this member') : 'The member must already have a Cabana account.', icon: 'key',
      fields: [
        { name: 'email', label: 'Member email', type: 'email', value: req && req.email || '', required: true, full: true },
        { name: 'days', label: 'Days', type: 'number', value: st.pass_days || 30, min: 0, help: '0 means it never expires.' },
        { name: 'note', label: 'Note', value: req ? 'From request' : '', placeholder: 'Paid by M-Pesa, promo, press…' }
      ], submit: 'Grant pass',
      onSubmit: function (x) {
        return rpc('admin_immersive_pass_action', { p_action: 'grant', p_email: x.email, p_days: n(x.days), p_note: x.note || null, p_request: req ? req.id : null })
          .then(function () { toast('Pass granted to ' + x.email, 'ok'); CX.pulseNow(true); v.refresh(); });
      } });
  }

  /* ── insights ── */
  function renderInsights(body, v, list, ov) {
    var byMode = ov.by_mode || {}, by = ov.by_experience || {};
    var plays = n(ov.plays_30);
    var days = [], vals = [], map = {};
    (ov.daily || []).forEach(function (d) { map[d.d] = n(d.n); });
    for (var i = 29; i >= 0; i--) { var d = new Date(Date.now() - i * 864e5); var k = d.toISOString().slice(0, 10); days.push(k); vals.push(map[k] || 0); }
    var names = { window: 'On a screen', fullscreen: 'Fullscreen', visor: 'Phone in a VR viewer', xr: 'Headset (WebXR)' };
    set(body, html`
      <div class="grid g4 imx-kpis">
        <div class="mini"><div class="mini-l">Plays · 30 days</div><div class="mini-v">${num(plays)}</div></div>
        <div class="mini"><div class="mini-l">Average time inside</div><div class="mini-v">${plays ? durLabel(n(ov.seconds_30) / plays) : '—'}</div></div>
        <div class="mini"><div class="mini-l">Finished</div><div class="mini-v">${plays ? Math.round(n(ov.completed_30) / plays * 100) + '%' : '—'}</div><div class="mini-s">watched 90% or more</div></div>
        <div class="mini"><div class="mini-l">Signed-in viewers</div><div class="mini-v">${num(ov.viewers_30)}</div><div class="mini-s">guests are counted as plays only</div></div>
      </div>
      <div class="split">
        <div class="card"><div class="card-hd"><div><div class="card-t">Plays per day</div><div class="card-s">Last 30 days, Nairobi time. A play is two seconds or more inside a world.</div></div></div><div data-chart class="chart"></div></div>
        <div class="card"><div class="card-hd"><div><div class="card-t">How people watch</div><div class="card-s">The most immersive mode used in each play.</div></div></div>
          ${CX.hbars(['window', 'fullscreen', 'visor', 'xr'].map(function (k) { return { label: names[k], value: n(byMode[k]) }; }).filter(function (x) { return plays ? true : false; }))}</div>
      </div>
      <div class="card flush" style="margin-top:14px">${list.length ? html`<div class="tbl-wrap"><table class="tbl"><thead><tr><th>World</th><th class="num">Plays</th><th class="num">Avg time</th><th class="num">Finished</th><th class="num">Last played</th></tr></thead><tbody>${list.map(function (w) {
          var s = by[w.id] || {};
          return html`<tr><td><div class="t-main">${w.title}</div><div class="t-sub">${w.status}</div></td><td class="num">${num(s.plays)}</td><td class="num">${n(s.plays) ? durLabel(n(s.seconds) / n(s.plays)) : '—'}</td>
            <td class="num">${n(s.plays) ? Math.round(n(s.completed) / n(s.plays) * 100) + '%' : '—'}</td><td class="num t-sub">${s.last ? ago(s.last) : '—'}</td></tr>`; })}</tbody></table></div>`
        : CX.empty('No worlds yet', 'Numbers arrive once a world is live and watched.', 'chart')}</div>`);
    CX.lineChart($('[data-chart]', body), { labels: days, series: [{ name: 'Plays', values: vals, color: 'var(--c2)' }], height: 220, tickFmt: function (s) { return s.slice(5); }, label: 'Plays per day' });
  }

  /* ════════════════════════════════════════════════════════════════
     5 · THE STUDIO
     ════════════════════════════════════════════════════════════════ */
  var ED = null;

  function blankScene(i) { return { id: 's' + Date.now().toString(36).slice(-5) + (i || ''), name: 'Scene ' + ((i || 0) + 1), kind: 'video', projection: 'equirect', src: null, src_mobile: null, stream: null, poster: null, audio: null, yaw: 0, pitch: 0, fov: 75, loop: true, hotspots: [] }; }

  function openStudio(w, v) {
    if (!Eng) { toast('The 3D engine did not load. Refresh the console.', 'bad'); return; }
    closeStudio(true);
    var isNew = !w;
    var row = isNew
      ? { id: uuid(), slug: '', title: '', tagline: '', description: '', destination: '', country: 'Kenya', credits: '', tour_id: null, poster_url: null, duration_s: null, access: 'free', status: 'draft', featured: false, sort_order: 0, scenes: [], start_scene: null }
      : JSON.parse(JSON.stringify(w));
    row.scenes = (row.scenes || []).map(function (s) { return Object.assign({ hotspots: [] }, s); });
    ED = { row: row, saved: JSON.parse(JSON.stringify(row)), isNew: isNew, dirty: false, sc: 0, hot: -1, tab: 'details', placing: false,
      eng: null, local: {}, signed: {}, ups: {}, uploadedThisSession: [], infos: {}, v: v, slugTouched: !isNew };
    var el = document.createElement('div');
    el.className = 'imx-studio';
    el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', 'Immersive studio');
    document.body.appendChild(el);
    ED.el = el;
    paintShell();
    requestAnimationFrame(function () { el.classList.add('on'); });
    if (v && v.setQ && !isNew) v.setQ({ edit: row.id });
    tours().then(function () { if (ED && ED.tab === 'details') paintPane(); });
    signRefs().then(function () { showScene(); });
    document.addEventListener('keydown', studioKey, true);
    global.addEventListener('beforeunload', guardUnload);
  }
  function guardUnload(e) { if (ED && (ED.dirty || busyUploads())) { e.preventDefault(); e.returnValue = ''; } }
  function studioKey(e) {
    if (!ED) return;
    if (e.key === 'Escape' && !document.querySelector('.modal-wrap.on')) { e.preventDefault(); e.stopPropagation(); if (ED.placing) { setPlacing(false); return; } askClose(); }
    if ((e.metaKey || e.ctrlKey) && e.key === 's') { e.preventDefault(); save(); }
  }
  function busyUploads() { return Object.keys(ED ? ED.ups : {}).some(function (k) { return ED.ups[k].state === 'up' || ED.ups[k].state === 'paused' || ED.ups[k].state === 'retrying'; }); }
  function askClose() {
    if (!ED) return;
    if (busyUploads()) { toast('Uploads are still running. Pause or cancel them first.', 'warn'); return; }
    if (!ED.dirty) { closeStudio(); return; }
    confirm({ title: 'Leave without saving?', body: 'Your changes to this world will be lost.' + (ED.isNew ? ' Files uploaded for it are deleted.' : ''), tone: 'warn', confirm: 'Discard changes' })
      .then(function (ok) { if (ok) closeStudio(); });
  }
  function closeStudio(silent) {
    if (!ED) return;
    var ed = ED; ED = null;
    Object.keys(ed.ups).forEach(function (k) { var u = ed.ups[k]; if (u.ctl && u.state !== 'done') u.ctl.cancel(); });
    // A brand new world that was never saved leaves nothing behind.
    if (ed.isNew && !ed.everSaved && ed.uploadedThisSession.length) {
      var priv = ed.uploadedThisSession.filter(function (p) { return p.b === PRIV; }).map(function (p) { return p.path; });
      var pub = ed.uploadedThisSession.filter(function (p) { return p.b === PUB; }).map(function (p) { return p.path; });
      if (priv.length) sb().storage.from(PRIV).remove(priv).catch(noop);
      if (pub.length) sb().storage.from(PUB).remove(pub).catch(noop);
    }
    if (ed.eng) try { ed.eng.destroy(); } catch (e) {}
    Object.keys(ed.local).forEach(function (k) { try { URL.revokeObjectURL(ed.local[k]); } catch (e) {} });
    document.removeEventListener('keydown', studioKey, true);
    global.removeEventListener('beforeunload', guardUnload);
    ed.el.classList.remove('on');
    setTimeout(function () { ed.el.remove(); }, 260);
    if (!silent && ed.v && ed.v.alive && ed.v.alive()) { ed.v.setQ({ edit: null }); ed.v.refresh(); }
  }
  function dirty() {
    if (!ED) return;
    ED.dirty = true;
    var s = $('.imx-save', ED.el); if (s) { s.textContent = 'Unsaved changes'; s.classList.add('dirty'); }
  }
  function scene() { return ED.row.scenes[ED.sc] || null; }

  function paintBar(savedNote) {
    var r = ED.row, bar = $('.imx-bar', ED.el);
    set(bar, html`
        <button class="icon-btn" data-x aria-label="Close studio">${icon('arrowL')}</button>
        <div class="imx-bar-t"><div class="imx-bar-k">Immersive studio · ${ED.isNew ? 'New world' : r.status}</div><div class="imx-bar-n" data-bar-title>${r.title || 'Untitled world'}</div></div>
        <span class="imx-save">${savedNote || (ED.isNew ? 'Not saved yet' : 'Saved')}</span>
        ${r.status === 'published' ? html`<a class="btn btn-g" href="/tours?vr=${encodeURIComponent(r.slug)}" target="_blank" rel="noopener">${icon('external')}Open on /tours</a>` : ''}
        <button class="btn btn-g" data-save>${icon('check')}Save</button>
        <button class="btn ${r.status === 'published' ? 'btn-q' : 'btn-ok'}" data-publish>${r.status === 'published' ? 'Unpublish' : 'Save & publish'}</button>`);
    $('[data-x]', bar).onclick = askClose;
    $('[data-save]', bar).onclick = function () { save(); };
    $('[data-publish]', bar).onclick = function () { save(ED.row.status === 'published' ? 'draft' : 'published'); };
  }
  function paintShell() {
    set(ED.el, html`
      <div class="imx-bar"></div>
      <div class="imx-body">
        <div class="imx-left">
          <div class="imx-prev" data-prev>
            <div class="imx-hots" data-hots></div>
            <div class="imx-cross" hidden></div>
            <div class="imx-ptools">
              <button class="btn btn-sm" data-place>${icon('plus')}Add marker</button>
              <button class="btn btn-sm" data-startview title="Guests arrive facing this way">${icon('crosshair')}Set start view</button>
              <span class="imx-readout" data-readout>—</span>
            </div>
            <div class="imx-vbar" data-vbar hidden>
              <button class="icon-btn" data-vplay aria-label="Play">${icon('play')}</button>
              <input type="range" min="0" max="1000" value="0" data-vseek aria-label="Seek"/>
              <span class="t" data-vtime>0:00</span>
            </div>
            <div class="imx-prev-empty" data-empty>${icon('vr')}<b>Add a scene to begin</b><span>Upload a 360° or 180° video, a panorama, or a flat film. The preview here is the same engine guests use.</span></div>
          </div>
          <div class="imx-scenes" data-scenes></div>
        </div>
        <div class="imx-right">
          <div class="imx-tabs">${CX.tabs([['details', 'World'], ['scene', 'Scene'], ['hotspots', 'Markers']], ED.tab, 'data-ptab')}</div>
          <div data-pane></div>
        </div>
      </div>`);
    var el = ED.el;
    paintBar();
    $('[data-place]', el).onclick = function () { setPlacing(!ED.placing); };
    $('[data-startview]', el).onclick = function () {
      var s = scene(); if (!s || !ED.eng) return;
      var vw = ED.eng.view(); s.yaw = Math.round(vw.sceneYaw * 10) / 10; s.pitch = Math.round(vw.pitch * 10) / 10; s.fov = Math.round(vw.fov);
      dirty(); toast('Guests will arrive facing this way', 'ok', { ms: 1800 }); if (ED.tab === 'scene') paintPane();
    };
    $$('[data-ptab]', el).forEach(function (b) { b.onclick = function () { ED.tab = b.getAttribute('data-ptab'); $$('[data-ptab]', el).forEach(function (x) { x.classList.toggle('on', x === b); }); paintPane(); }; });
    var vplay = $('[data-vplay]', el), vseek = $('[data-vseek]', el);
    vplay.onclick = function () { if (ED.eng) ED.eng.toggle(); };
    vseek.oninput = function () { var vid = ED.eng && ED.eng.video(); if (vid && vid.duration) ED.eng.seek(vseek.value / 1000 * vid.duration); };
    paintScenes();
    paintPane();
  }

  function setPlacing(on) {
    ED.placing = !!on;
    var p = $('[data-prev]', ED.el); p.classList.toggle('placing', ED.placing);
    $('[data-place]', ED.el).classList.toggle('on', ED.placing);
    $('.imx-cross', ED.el).hidden = true;
    if (ED.placing) toast('Click where the marker should go', 'info', { ms: 2200 });
  }

  /* ── preview ── */
  function ensureEngine() {
    if (ED.eng) return ED.eng;
    var prev = $('[data-prev]', ED.el);
    try {
      ED.eng = Eng.create(prev, {
        presence: false,
        onFrame: onFrame,
        onState: function (s) {
          if (!ED) return;
          var b = $('[data-vplay]', ED.el); if (b) set(b, icon(s.playing ? 'pause' : 'play'));
        },
        onError: function (e) { toast(e.message, 'bad'); },
        onTap: function (pick) {
          if (!ED || !ED.placing || !scene()) return;
          var s = scene(), vid = ED.eng.video();
          var h = { id: 'h' + Date.now().toString(36).slice(-6), type: 'info', yaw: Math.round(pick.yaw * 10) / 10, pitch: Math.round(pick.pitch * 10) / 10, label: 'New marker', text: '' };
          if (vid && vid.duration) { h.t0 = Math.max(0, Math.round(vid.currentTime * 10) / 10); }
          s.hotspots = (s.hotspots || []).concat([h]);
          ED.hot = s.hotspots.length - 1;
          setPlacing(false);
          dirty(); syncHots(); paintScenes(); ED.tab = 'hotspots';
          $$('[data-ptab]', ED.el).forEach(function (x) { x.classList.toggle('on', x.getAttribute('data-ptab') === 'hotspots'); });
          paintPane();
        }
      });
      // The canvas must sit under the tools and markers.
      prev.insertBefore(ED.eng.canvas, prev.firstChild);
    } catch (e) { toast('This browser cannot draw 3D, so the preview is off.', 'warn'); ED.eng = null; }
    return ED.eng;
  }
  function onFrame(view) {
    if (!ED || !view) return;
    var ro = $('[data-readout]', ED.el);
    if (ro) ro.textContent = 'yaw ' + view.sceneYaw.toFixed(0) + '°  pitch ' + view.pitch.toFixed(0) + '°  fov ' + Math.round(view.fov) + '°';
    var vid = ED.eng && ED.eng.video();
    var bar = $('[data-vbar]', ED.el);
    if (bar) bar.hidden = !vid;
    if (vid && vid.duration) {
      var sk = $('[data-vseek]', ED.el); if (sk && document.activeElement !== sk) sk.value = Math.round(vid.currentTime / vid.duration * 1000);
      var t = $('[data-vtime]', ED.el); if (t) t.textContent = fmtT(vid.currentTime) + ' / ' + fmtT(vid.duration);
    }
    placeHots();
  }
  function resolve(ref) {
    if (!ref) return null;
    if (ED.local[ref]) return ED.local[ref];
    if (ref.indexOf('sb:') === 0) return ED.signed[ref.slice(3)] || null;
    return HTTPS_RX.test(ref) ? ref : null;
  }
  function signRefs() {
    var paths = refsOf(ED.row).filter(function (p) { return !ED.signed[p] && !ED.local['sb:' + p]; });
    if (!paths.length) return Promise.resolve();
    return sb().storage.from(PRIV).createSignedUrls(paths, 6 * 3600).then(function (r) {
      (r.data || []).forEach(function (d) { var u = d.signedUrl || d.signedURL; if (u && !d.error) ED.signed[d.path] = /^https?:/.test(u) ? u : SB_URL + '/storage/v1' + u; });
    }).catch(noop);
  }
  function showScene() {
    if (!ED) return;
    var s = scene();
    var empty = $('[data-empty]', ED.el);
    if (!s || (!s.src && !s.stream)) {
      if (empty) { empty.hidden = false; set(empty, html`${icon('vr')}<b>${s ? 'Upload this scene’s file' : 'Add a scene to begin'}</b><span>${s ? 'Use the Scene panel on the right: drop a file, or paste a link.' : 'Upload a 360° or 180° video, a panorama, or a flat film. The preview here is the same engine guests use.'}</span>`); }
      syncHots();
      return;
    }
    if (empty) empty.hidden = true;
    var eng = ensureEngine(); if (!eng) return;
    var src = { url: resolve(s.src), fallback: resolve(s.src_mobile), stream: s.stream || null, audio: null, muted: true };
    if (!src.url && !src.fallback && !src.stream) { signRefs().then(function () { if (ED && scene() === s) showScene(); }); return; }
    eng.show(s, src, {}).then(function () { if (ED) { eng.setHotspots([]); syncHots(); } }).catch(noop);
  }
  function syncHots() {
    if (!ED) return;
    var host = $('[data-hots]', ED.el), s = scene();
    var list = (s && s.hotspots) || [];
    set(host, html`${list.map(function (h, i) {
      return html`<button class="imx-hot ${i === ED.hot ? 'sel' : ''}" type="button" data-hi="${i}" data-type="${h.type}" title="${h.label || ''}">${i + 1}${i === ED.hot ? html`<span class="imx-hot-l">${h.label || HOT_TYPES.filter(function (t) { return t[0] === h.type; })[0][1]}</span>` : ''}</button>`; })}`);
    $$('[data-hi]', host).forEach(function (b) {
      var i = +b.getAttribute('data-hi'), dragging = false, moved = false;
      b.addEventListener('pointerdown', function (e) { e.stopPropagation(); dragging = true; moved = false; b.setPointerCapture(e.pointerId); });
      b.addEventListener('pointermove', function (e) {
        if (!dragging || !ED.eng) return;
        var p = ED.eng.pick(e.clientX, e.clientY), h = scene().hotspots[i];
        h.yaw = Math.round(p.yaw * 10) / 10; h.pitch = Math.round(p.pitch * 10) / 10; moved = true;
      });
      b.addEventListener('pointerup', function () {
        dragging = false;
        if (moved) { dirty(); if (ED.tab === 'hotspots') paintPane(); }
        else { ED.hot = i; syncHots(); ED.tab = 'hotspots'; $$('[data-ptab]', ED.el).forEach(function (x) { x.classList.toggle('on', x.getAttribute('data-ptab') === 'hotspots'); }); paintPane(); }
      });
    });
    placeHots();
  }
  function placeHots() {
    if (!ED || !ED.eng) return;
    var s = scene(); if (!s) return;
    var vid = ED.eng.video(), t = vid ? vid.currentTime : null;
    $$('[data-hi]', ED.el).forEach(function (b) {
      var h = s.hotspots[+b.getAttribute('data-hi')]; if (!h) return;
      var p = ED.eng.project(h.yaw || 0, h.pitch || 0);
      b.hidden = !p.visible;
      if (!p.visible) return;
      b.style.setProperty('--x', p.x.toFixed(1) + 'px'); b.style.setProperty('--y', p.y.toFixed(1) + 'px');
      var live = t == null || ((h.t0 == null || t >= h.t0) && (h.t1 == null || t <= h.t1));
      b.classList.toggle('off', !live);
    });
  }

  /* ── scene strip ── */
  function paintScenes() {
    var host = $('[data-scenes]', ED.el), r = ED.row;
    set(host, html`${r.scenes.map(function (s, i) {
      var up = ED.ups[s.id + ':main'];
      var th = s.poster && HTTPS_RX.test(s.poster) ? s.poster : (i === 0 && r.poster_url ? r.poster_url : '');
      return html`<button class="imx-sc ${i === ED.sc ? 'on' : ''}" type="button" data-sc="${i}">
        <div class="imx-sc-img">${th ? html`<img src="${CX.safeUrl(th)}" alt=""/>` : ''}<span class="n">${i + 1}</span>${(r.start_scene || (r.scenes[0] && r.scenes[0].id)) === s.id ? html`<span class="st">START</span>` : ''}</div>
        ${up && up.state !== 'done' ? html`<div class="imx-sc-bar"><i style="width:${Math.round((up.pct || 0) * 100)}%"></i></div>` : ''}
        <div class="imx-sc-b"><div class="imx-sc-t">${s.name || 'Scene ' + (i + 1)}</div><div class="imx-sc-s">${s.kind} · ${PROJ_SHORT[s.projection] || s.projection} · ${num((s.hotspots || []).length)} marker${(s.hotspots || []).length === 1 ? '' : 's'}</div></div>
      </button>`; })}
      <button class="imx-sc imx-sc-add" type="button" data-add-scene>${icon('plus')}<span>Add scene</span></button>`);
    $$('[data-sc]', host).forEach(function (b) { b.onclick = function () { ED.sc = +b.getAttribute('data-sc'); ED.hot = -1; paintScenes(); if (ED.tab === 'details') ED.tab = 'scene'; $$('[data-ptab]', ED.el).forEach(function (x) { x.classList.toggle('on', x.getAttribute('data-ptab') === ED.tab); }); paintPane(); showScene(); }; });
    $('[data-add-scene]', host).onclick = function () {
      if (ED.row.scenes.length >= 40) { toast('A world can hold up to 40 scenes.', 'warn'); return; }
      ED.row.scenes.push(blankScene(ED.row.scenes.length));
      ED.sc = ED.row.scenes.length - 1; ED.hot = -1; ED.tab = 'scene';
      dirty(); paintScenes();
      $$('[data-ptab]', ED.el).forEach(function (x) { x.classList.toggle('on', x.getAttribute('data-ptab') === 'scene'); });
      paintPane(); showScene();
    };
  }

  /* ── the right-hand panes ── */
  function fld(label, ctrl, hint, cls) { return html`<div class="imx-f ${cls || ''}"><label>${label}</label>${ctrl}${hint ? html`<div class="hint">${hint}</div>` : ''}</div>`; }
  function inp(key, val, attrs) { return raw('<input class="inp" data-k="' + esc(key) + '" value="' + esc(val == null ? '' : val) + '"' + (attrs || '') + '/>'); }
  function paintPane() {
    if (!ED) return;
    var pane = $('[data-pane]', ED.el);
    if (ED.tab === 'details') paneDetails(pane);
    else if (ED.tab === 'scene') paneScene(pane);
    else paneHots(pane);
  }

  function paneDetails(pane) {
    var r = ED.row, ts = toursCache || [];
    set(pane, html`<div class="imx-pane">
      <div class="imx-sec"><div class="imx-sec-h"><b>The world</b></div><div class="imx-grid">
        ${fld('Title', inp('title', r.title, ' maxlength="120" placeholder="Mara River at first light"'), null, 'full')}
        ${fld('Web address', inp('slug', r.slug, ' maxlength="80" placeholder="mara-river-first-light"'), html`cabana.africa/tours?vr=<b data-slugp>${r.slug || '…'}</b>`, 'full')}
        ${fld('One line', inp('tagline', r.tagline, ' maxlength="160" placeholder="Stand on the bank as the herds cross"'), null, 'full')}
        ${fld('Description', raw('<textarea class="inp" data-k="description" maxlength="4000" rows="4">' + esc(r.description || '') + '</textarea>'), null, 'full')}
        ${fld('Place', inp('destination', r.destination, ' placeholder="Maasai Mara"'))}
        ${fld('Country', inp('country', r.country, ' placeholder="Kenya"'))}
        ${fld('Filmed by', inp('credits', r.credits, ' maxlength="160" placeholder="Operator or crew credit"'), null, 'full')}
      </div></div>
      <div class="imx-sec"><div class="imx-sec-h"><b>Selling it</b></div><div class="imx-grid">
        ${fld('Book the real tour', raw('<select class="inp" data-k="tour_id"><option value="">No linked tour</option>' + ts.map(function (t) { return '<option value="' + t.id + '"' + (String(r.tour_id) === String(t.id) ? ' selected' : '') + '>' + esc(t.title) + (t.status !== 'published' ? ' (' + esc(t.status) + ')' : '') + '</option>'; }).join('') + '</select>'), 'Guests get a Book it button inside, and the tour card on /tours gets a 360° badge.', 'full')}
        ${fld('Access', raw('<select class="inp" data-k="access"><option value="free"' + (r.access === 'free' ? ' selected' : '') + '>Free · always open</option><option value="pass"' + (r.access === 'pass' ? ' selected' : '') + '>Pass · open during the trial, then pass holders</option></select>'), null, 'full')}
        ${fld('Order', inp('sort_order', r.sort_order, ' type="number"'), 'Higher shows first.')}
        ${fld('Length', inp('duration_s', r.duration_s, ' type="number" min="0" placeholder="seconds"'), 'Filled in from the film. Shown on the card.')}
        <div class="imx-f full"><label class="check"><input type="checkbox" data-k="featured"${r.featured ? raw(' checked') : ''}/><span>Feature it<small>The top featured world plays inside the headset on /tours and opens from Step inside.</small></span></label></div>
      </div></div>
      <div class="imx-sec"><div class="imx-sec-h"><b>Poster</b><span class="grow"></span><span>2:1 works best</span></div>
        ${r.poster_url ? html`<img src="${CX.safeUrl(r.poster_url)}" alt="" style="width:100%;border-radius:10px;display:block;margin-bottom:10px;aspect-ratio:2/1;object-fit:cover"/>` : html`<div class="imx-warn" style="margin-bottom:10px">No poster yet. One is made from the first scene when its file uploads, or capture one below.</div>`}
        <div class="row" style="gap:8px;flex-wrap:wrap"><button class="btn btn-sm btn-g" data-cap-poster>${icon('image')}Use the current view</button><label class="btn btn-sm btn-g" style="cursor:pointer">${icon('upload')}Upload an image<input type="file" accept="image/*" data-poster-file hidden/></label></div>
      </div>
    </div>`);
    on(pane, '[data-k]', 'input', function (el) {
      var k = el.getAttribute('data-k'), val = el.type === 'checkbox' ? el.checked : el.value;
      if (k === 'tour_id') val = val === '' ? null : Number(val);
      else if (k === 'sort_order' || k === 'duration_s') val = val === '' ? (k === 'sort_order' ? 0 : null) : Math.round(n(val));
      r[k] = val;
      if (k === 'title') {
        $('[data-bar-title]', ED.el).textContent = val || 'Untitled world';
        if (!ED.slugTouched) { r.slug = slugify(val); var si = $('[data-k="slug"]', pane); if (si) si.value = r.slug; }
      }
      if (k === 'slug') { ED.slugTouched = true; r.slug = slugify(val); }
      var sp = $('[data-slugp]', pane); if (sp) sp.textContent = r.slug || '…';
      dirty();
    });
    on(pane, '[data-cap-poster]', 'click', function (el) { CX.busy(el, capturePoster).catch(noop); });
    on(pane, '[data-poster-file]', 'change', function (el) {
      var f = el.files && el.files[0]; if (!f) return;
      var path = 'exp/' + r.id + '/poster-' + Date.now().toString(36) + '.' + (extOf(f.name) || 'jpg');
      putSmall(PUB, path, f, mimeOf(f)).then(function () { ED.uploadedThisSession.push({ b: PUB, path: path }); r.poster_url = pubUrl(path); dirty(); paintPane(); paintScenes(); toast('Poster uploaded', 'ok'); }, function (e) { toast(e.message, 'bad'); });
    });
  }

  function capturePoster() {
    var cv = ED.eng && ED.eng.canvas;
    if (!cv) return Promise.reject(new Error('Nothing in the preview yet.'));
    // Read the preview back through a fresh frame into a 2:1 still.
    return new Promise(function (resolveP, reject) {
      requestAnimationFrame(function () {
        try {
          var c = document.createElement('canvas'); c.width = 1600; c.height = 800;
          var g = c.getContext('2d'), sw = cv.width, sh = Math.min(cv.height, sw / 2);
          g.drawImage(cv, 0, (cv.height - sh) / 2, sw, sh, 0, 0, 1600, 800);
          c.toBlob(function (b) {
            if (!b) { reject(new Error('Could not read the preview.')); return; }
            var path = 'exp/' + ED.row.id + '/poster-' + Date.now().toString(36) + '.jpg';
            putSmall(PUB, path, b, 'image/jpeg').then(function () {
              ED.uploadedThisSession.push({ b: PUB, path: path });
              ED.row.poster_url = pubUrl(path); dirty(); paintPane(); paintScenes(); toast('Poster set from the view', 'ok'); resolveP();
            }, reject);
          }, 'image/jpeg', 0.88);
        } catch (e) { reject(e); }
      });
    });
  }

  function fileRow(role, s) {
    var key = s.id + ':' + role, up = ED.ups[key], ref = s[role === 'main' ? 'src' : role === 'mobile' ? 'src_mobile' : 'audio'];
    var info = ED.infos[key];
    if (up && up.state !== 'done') {
      var eta = up.speed ? Math.max(0, (up.total - up.loaded) / up.speed) : null;
      return html`<div class="imx-file">${icon(role === 'audio' ? 'music' : 'upload')}<div class="grow"><div class="imx-file-n">${up.name}</div>
        <div class="imx-file-s">${up.state === 'failed' ? 'Failed: ' + up.error : up.state === 'paused' ? 'Paused at ' + Math.round(up.pct * 100) + '%' : up.state === 'retrying' ? 'Connection lost, retrying…' : Math.round(up.pct * 100) + '% of ' + mb(up.total) + (up.speed ? ' · ' + mb(up.speed) + '/s' : '') + (eta != null && up.speed ? ' · ' + fmtT(eta) + ' left' : '')}</div>
        <div class="imx-prog ${up.state === 'failed' ? 'bad' : ''}"><i style="width:${Math.round(up.pct * 100)}%"></i></div></div>
        ${up.state === 'failed' ? html`<button class="btn btn-sm btn-p" data-up-retry="${key}">Retry</button>` : up.state === 'paused' ? html`<button class="btn btn-sm btn-g" data-up-resume="${key}">Resume</button>` : html`<button class="btn btn-sm btn-g" data-up-pause="${key}">Pause</button>`}
        <button class="icon-btn" data-up-cancel="${key}" title="Cancel">${icon('x')}</button></div>`;
    }
    if (ref) {
      var nm = ref.indexOf('sb:') === 0 ? ref.split('/').pop() : ref;
      return html`<div class="imx-file">${icon(role === 'audio' ? 'music' : s.kind === 'image' ? 'image' : 'video')}<div class="grow"><div class="imx-file-n" title="${nm}">${nm}</div>
        <div class="imx-file-s">${ref.indexOf('sb:') === 0 ? 'Cabana storage' : 'External link'}${info ? ' · ' + (info.w ? info.w + '×' + info.h : '') + (info.dur ? ' · ' + fmtT(info.dur) : '') : ''}</div></div>
        <label class="btn btn-sm btn-g" style="cursor:pointer">Replace<input type="file" hidden data-file="${role}" accept="${role === 'audio' ? 'audio/*' : role === 'mobile' ? 'video/*,image/*' : 'video/*,image/*'}"/></label>
        <button class="icon-btn" data-clear="${role}" title="Remove">${icon('trash')}</button></div>`;
    }
    return html`<label class="imx-drop" data-drop="${role}">${icon(role === 'audio' ? 'music' : 'upload')}<b>${role === 'main' ? 'Drop the 360° file here' : role === 'mobile' ? 'Drop the phone version' : 'Drop an ambient track'}</b><br/>${role === 'main' ? 'Video (MP4, WebM, MOV) or panorama (JPEG, PNG, WebP). Big files are fine: uploads resume if the connection drops.' : role === 'mobile' ? 'Optional. 3840×1920 or 4096×2048 H.264 MP4, so phones get a file they can play.' : 'Optional. Birdsong, wind, a river. Loops under a still panorama.'}
      <input type="file" hidden data-file="${role}" accept="${role === 'audio' ? 'audio/*' : 'video/*,image/*'}"/></label>`;
  }

  function paneScene(pane) {
    var s = scene();
    if (!s) { set(pane, html`<div class="imx-pane">${CX.empty('No scene selected', 'Add a scene from the strip under the preview.', 'vr')}</div>`); return; }
    var r = ED.row, key = s.id + ':main', warns = ED.infos[key] ? warnings(ED.infos[key], s.projection) : [];
    var isStart = (r.start_scene || (r.scenes[0] && r.scenes[0].id)) === s.id;
    set(pane, html`<div class="imx-pane">
      <div class="imx-sec"><div class="imx-sec-h"><b>Scene ${ED.sc + 1}</b><span class="grow"></span>
          ${isStart ? html`<span class="pill p-ok">Start scene</span>` : html`<button class="btn btn-sm btn-g" data-mkstart>Make it the start</button>`}
          <button class="icon-btn" data-sc-mv="-1" title="Move earlier"${ED.sc === 0 ? raw(' disabled') : ''}>${icon('chevL')}</button>
          <button class="icon-btn" data-sc-mv="1" title="Move later"${ED.sc === r.scenes.length - 1 ? raw(' disabled') : ''}>${icon('chevR')}</button>
          <button class="icon-btn" data-sc-del title="Delete scene">${icon('trash')}</button></div>
        <div class="imx-grid">${fld('Name', inp('name', s.name, ' maxlength="120" placeholder="The river bank"'), 'Guests see it in the player header and on the scene picker.', 'full')}</div>
      </div>
      <div class="imx-sec"><div class="imx-sec-h"><b>The footage</b><span class="grow"></span><span>${s.kind === 'image' ? 'Panorama' : 'Video'}</span></div>
        ${fileRow('main', s)}
        ${warns.map(function (w) { return html`<div class="imx-warn ${w[0]}" style="margin-top:8px">${w[1]}</div>`; })}
        <div class="imx-grid" style="margin-top:10px">
          ${fld('Projection', raw('<select class="inp" data-sk="projection">' + PROJ.map(function (p) { return '<option value="' + p[0] + '"' + (s.projection === p[0] ? ' selected' : '') + '>' + esc(p[1]) + '</option>'; }).join('') + '</select>'), (PROJ.filter(function (p) { return p[0] === s.projection; })[0] || [])[2], 'full')}
          ${s.kind === 'video' ? html`<div class="imx-f full"><label class="check"><input type="checkbox" data-sk="loop"${s.loop !== false ? raw(' checked') : ''}/><span>Loop<small>Off for a story with an ending: guests get an end card with Book it and Next world.</small></span></label></div>` : ''}
        </div>
      </div>
      ${s.kind === 'video' || !s.src ? html`<div class="imx-sec"><div class="imx-sec-h"><b>Phone version</b><span class="grow"></span><span>recommended above 4K</span></div>${fileRow('mobile', s)}</div>` : ''}
      <div class="imx-sec"><div class="imx-sec-h"><b>Or stream it</b></div>
        ${fld('HLS link (.m3u8)', raw('<input class="inp" data-sk="stream" value="' + esc(s.stream || '') + '" placeholder="https://…/master.m3u8"/>'), 'For very long or live footage hosted on Mux, Cloudflare Stream or Bunny. The host must allow cabana.africa (CORS).')}
        ${fld('Or a direct link', raw('<input class="inp" data-sk="srclink" value="' + esc(s.src && s.src.indexOf('sb:') !== 0 ? s.src : '') + '" placeholder="https://cdn…/scene.mp4"/>'), 'Instead of uploading. Links are never paywalled: anyone with the link can watch.')}
      </div>
      ${s.kind === 'image' ? html`<div class="imx-sec"><div class="imx-sec-h"><b>Ambient sound</b></div>${fileRow('audio', s)}</div>` : ''}
      <div class="imx-sec"><div class="imx-sec-h"><b>Arrival</b><span class="grow"></span><span>where guests first look</span></div>
        <div class="imx-grid three">${fld('Yaw', raw('<input class="inp" type="number" step="0.1" data-sk="yaw" value="' + n(s.yaw) + '"/>'))}${fld('Pitch', raw('<input class="inp" type="number" step="0.1" data-sk="pitch" value="' + n(s.pitch) + '"/>'))}${fld('Field of view', raw('<input class="inp" type="number" min="30" max="110" data-sk="fov" value="' + (s.fov || 75) + '"/>'))}</div>
        <div class="row" style="gap:8px;margin-top:8px"><button class="btn btn-sm btn-g" data-use-view>${icon('crosshair')}Use the preview’s view</button><button class="btn btn-sm btn-g" data-goto-start>${icon('eye')}Look there</button><button class="btn btn-sm btn-g" data-sc-poster>${icon('image')}Scene thumbnail from view</button></div>
      </div>
    </div>`);
    on(pane, '[data-sk]', 'change', function (el) {
      var k = el.getAttribute('data-sk'), val = el.type === 'checkbox' ? el.checked : el.value.trim();
      if (k === 'yaw') s.yaw = Math.max(-360, Math.min(360, n(val)));
      else if (k === 'pitch') s.pitch = Math.max(-89, Math.min(89, n(val)));
      else if (k === 'fov') s.fov = Math.max(30, Math.min(110, n(val) || 75));
      else if (k === 'stream') { if (val && !HTTPS_RX.test(val)) { toast('Stream links must start with https://', 'bad'); el.value = s.stream || ''; return; } s.stream = val || null; showScene(); }
      else if (k === 'srclink') {
        if (val && !HTTPS_RX.test(val)) { toast('Links must start with https://', 'bad'); return; }
        if (val) { forget(s.src); s.src = val; s.kind = /\.(jpe?g|png|webp|avif)(\?|$)/i.test(val) ? 'image' : 'video'; showScene(); paintPane(); paintScenes(); }
      }
      else if (k === 'projection') { s.projection = val; s._projTouched = true; showScene(); paintPane(); paintScenes(); }
      else if (k === 'loop') s.loop = !!val;
      dirty();
    });
    on(pane, '[data-k="name"]', 'input', function (el) { s.name = el.value; dirty(); paintScenesSoon(); });
    on(pane, '[data-mkstart]', 'click', function () { r.start_scene = s.id; dirty(); paintPane(); paintScenes(); });
    on(pane, '[data-sc-mv]', 'click', function (el) {
      var j = ED.sc + Number(el.getAttribute('data-sc-mv')); if (j < 0 || j >= r.scenes.length) return;
      var t = r.scenes[ED.sc]; r.scenes[ED.sc] = r.scenes[j]; r.scenes[j] = t; ED.sc = j; dirty(); paintScenes(); paintPane();
    });
    on(pane, '[data-sc-del]', 'click', function () {
      var used = r.scenes.some(function (o) { return o !== s && (o.hotspots || []).some(function (h) { return h.type === 'scene' && h.target === s.id; }); });
      confirm({ title: 'Delete ' + (s.name || 'this scene') + '?', body: used ? 'Markers in other scenes walk here. They will be removed too.' : 'Its file is deleted when you save.', tone: 'danger', confirm: 'Delete scene',
        onConfirm: function () {
          ['src', 'src_mobile', 'audio'].forEach(function (k) { forget(s[k]); });
          Object.keys(ED.ups).forEach(function (k) { if (k.indexOf(s.id + ':') === 0 && ED.ups[k].ctl && ED.ups[k].state !== 'done') ED.ups[k].ctl.cancel(); });
          r.scenes.splice(ED.sc, 1);
          r.scenes.forEach(function (o) { o.hotspots = (o.hotspots || []).filter(function (h) { return !(h.type === 'scene' && h.target === s.id); }); });
          if (r.start_scene === s.id) r.start_scene = r.scenes[0] ? r.scenes[0].id : null;
          ED.sc = Math.max(0, ED.sc - 1); ED.hot = -1;
          dirty(); paintScenes(); paintPane(); showScene();
        } });
    });
    on(pane, '[data-use-view]', 'click', function () { $('[data-startview]', ED.el).click(); });
    on(pane, '[data-goto-start]', 'click', function () { if (ED.eng) ED.eng.look(n(s.yaw), n(s.pitch), true); });
    on(pane, '[data-sc-poster]', 'click', function (el) {
      CX.busy(el, function () {
        var prev = ED.row.poster_url;
        return capturePoster().then(function () { s.poster = ED.row.poster_url; if (prev && ED.sc !== 0) ED.row.poster_url = prev; paintScenes(); paintPane(); });
      }).catch(noop);
    });
    wireFiles(pane, s);
  }
  var paintScenesT = 0;
  function paintScenesSoon() { clearTimeout(paintScenesT); paintScenesT = setTimeout(function () { if (ED) paintScenes(); }, 250); }

  // A file taken off a scene is deleted from storage after the next save,
  // never before: a slip of the mouse should be undoable by not saving.
  function forget(ref) {
    if (!ref || ref.indexOf('sb:') !== 0) return;
    ED.forgotten = ED.forgotten || [];
    ED.forgotten.push(ref.slice(3));
  }

  function wireFiles(pane, s) {
    $$('[data-drop]', pane).forEach(function (d) {
      ['dragenter', 'dragover'].forEach(function (ev) { d.addEventListener(ev, function (e) { e.preventDefault(); d.classList.add('over'); }); });
      ['dragleave', 'drop'].forEach(function (ev) { d.addEventListener(ev, function (e) { e.preventDefault(); d.classList.remove('over'); }); });
      d.addEventListener('drop', function (e) { var f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]; if (f) take(s, d.getAttribute('data-drop'), f); });
    });
    on(pane, '[data-file]', 'change', function (el) { var f = el.files && el.files[0]; if (f) take(s, el.getAttribute('data-file'), f); el.value = ''; });
    on(pane, '[data-clear]', 'click', function (el) {
      var role = el.getAttribute('data-clear'), k = role === 'main' ? 'src' : role === 'mobile' ? 'src_mobile' : 'audio';
      forget(s[k]); s[k] = null; delete ED.infos[s.id + ':' + role]; dirty(); paintPane(); paintScenes(); if (role === 'main') showScene();
    });
    on(pane, '[data-up-pause]', 'click', function (el) { var u = ED.ups[el.getAttribute('data-up-pause')]; if (u) { u.ctl.pause(); u.state = 'paused'; paintPane(); } });
    on(pane, '[data-up-resume]', 'click', function (el) { var u = ED.ups[el.getAttribute('data-up-resume')]; if (u) { u.state = 'up'; u.ctl.resume(); paintPane(); } });
    on(pane, '[data-up-cancel]', 'click', function (el) { var k = el.getAttribute('data-up-cancel'), u = ED.ups[k]; if (u) { u.ctl.cancel(); u.revert(); delete ED.ups[k]; paintPane(); paintScenes(); showScene(); } });
    on(pane, '[data-up-retry]', 'click', function (el) { var u = ED.ups[el.getAttribute('data-up-retry')]; if (u) take(u.scene, u.role, u.file); });
  }

  /* A file arrives for a scene: look at it, preview it locally at once,
     and send it up in the background. */
  function take(s, role, file) {
    var r = ED.row, mime = mimeOf(file), key = s.id + ':' + role;
    var wantKind = role === 'audio' ? /^audio\//.test(mime) : /^(video|image)\//.test(mime);
    if (!wantKind) { toast(role === 'audio' ? 'That is not an audio file.' : 'Use a video or an image.', 'bad'); return; }
    if (ED.ups[key] && ED.ups[key].ctl && ED.ups[key].state !== 'done' && ED.ups[key].state !== 'failed') { toast('Wait for the current upload, or cancel it.', 'warn'); return; }
    analyze(file).then(function (info) {
      if (!ED) return;
      var field = role === 'main' ? 'src' : role === 'mobile' ? 'src_mobile' : 'audio';
      var prevRef = s[field], prevKind = s.kind, prevProj = s.projection;
      var ext = extOf(file.name) || (/image/.test(mime) ? 'jpg' : /audio/.test(mime) ? 'mp3' : 'mp4');
      var path = 'exp/' + r.id + '/' + s.id + '-' + role + '-' + Date.now().toString(36) + '.' + ext;
      var ref = 'sb:' + path;
      ED.infos[key] = info;
      if (role === 'main') {
        s.kind = info.kind === 'image' ? 'image' : 'video';
        if (!s._projTouched) s.projection = guessProjection(info, file.name);
        if (!s.name || /^Scene \d+$/.test(s.name)) s.name = file.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').slice(0, 60);
        if (s.kind === 'video' && info.dur) {
          var total = r.scenes.reduce(function (a, o) { return a + (o === s ? info.dur : n((ED.infos[o.id + ':main'] || {}).dur)); }, 0);
          if (total) r.duration_s = Math.round(total);
        }
      }
      ED.local[ref] = info.url;
      s[field] = ref;
      dirty(); paintPane(); paintScenes();
      if (role === 'main') showScene();

      var up = ED.ups[key] = { name: file.name, file: file, scene: s, role: role, pct: 0, loaded: 0, total: file.size, state: 'up', speed: 0, t0: Date.now(), last: [Date.now(), 0] };
      up.revert = function () { s[field] = prevRef; if (role === 'main') { s.kind = prevKind; s.projection = prevProj; } delete ED.local[ref]; };
      var paint = throttle(function () { if (ED && ED.tab === 'scene' && scene() === s) paintPane(); paintScenes(); }, 400);
      up.ctl = tus({ bucket: PRIV, path: path, file: file, contentType: mime,
        onProgress: function (l, t) {
          var now = Date.now(), dt = (now - up.last[0]) / 1000;
          if (dt > 1) { var sp = (l - up.last[1]) / dt; up.speed = up.speed ? up.speed * 0.7 + sp * 0.3 : sp; up.last = [now, l]; }
          up.loaded = l; up.pct = t ? l / t : 0; if (up.state === 'retrying') up.state = 'up'; paint();
        },
        onState: function (x) { up.state = x; paint(); } });
      up.ctl.promise.then(function () {
        if (!ED) return;
        up.state = 'done'; up.pct = 1;
        ED.uploadedThisSession.push({ b: PRIV, path: path });
        if (prevRef && prevRef !== ref) forget(prevRef);
        toast(file.name + ' uploaded', 'ok');
        paintPane(); paintScenes();
      }, function (e) {
        if (!ED || e.cancelled) return;
        up.state = 'failed'; up.error = e.message || 'Upload failed';
        toast(up.error, 'bad'); paintPane(); paintScenes();
      });

      // Work that makes the guest side better, done now while the file is here.
      if (role === 'main') {
        var needPoster = !r.poster_url || !s.poster;
        if (needPoster) frameOf(info, s.projection, 1600).then(function (blob) {
          if (!blob || !ED) return;
          var pp = 'exp/' + r.id + '/' + s.id + '-poster-' + Date.now().toString(36) + '.jpg';
          return putSmall(PUB, pp, blob, 'image/jpeg').then(function () {
            if (!ED) return;
            ED.uploadedThisSession.push({ b: PUB, path: pp });
            s.poster = pubUrl(pp);
            if (!r.poster_url) r.poster_url = s.poster;
            dirty(); paintScenes(); if (ED.tab === 'details') paintPane();
          });
        }).catch(noop);
        if (info.kind === 'image' && info.w > PHONE_EDGE) phoneCopy(info).then(function (blob) {
          if (!blob || !ED) return;
          var mp = 'exp/' + r.id + '/' + s.id + '-mobile-' + Date.now().toString(36) + '.jpg';
          return putSmall(PRIV, mp, blob, 'image/jpeg').then(function () {
            if (!ED) return;
            ED.uploadedThisSession.push({ b: PRIV, path: mp });
            forget(s.src_mobile);
            s.src_mobile = 'sb:' + mp;
            ED.local[s.src_mobile] = URL.createObjectURL(blob);
            dirty(); toast('Phone copy made (' + mb(blob.size) + ')', 'ok');
          });
        }).catch(function (e) { toast('Could not make the phone copy: ' + e.message, 'warn'); });
      }
    });
  }
  function throttle(fn, ms) { var t = 0, pending = false; return function () { var now = Date.now(); if (now - t > ms) { t = now; fn(); } else if (!pending) { pending = true; setTimeout(function () { pending = false; t = Date.now(); fn(); }, ms); } }; }

  function paneHots(pane) {
    var s = scene();
    if (!s) { set(pane, html`<div class="imx-pane">${CX.empty('No scene selected', 'Markers belong to a scene.', 'pin')}</div>`); return; }
    var others = ED.row.scenes.filter(function (o) { return o !== s; });
    var list = s.hotspots || [];
    set(pane, html`<div class="imx-pane">
      <div class="callout">${icon('info')}<div class="grow" style="font-size:12.5px;line-height:1.55">Press <b>Add marker</b> on the preview, then click where it should sit. Drag a marker to move it. On video, a marker can appear only between two moments.</div></div>
      <div class="imx-hl">${list.length ? list.map(function (h, i) {
        var t = HOT_TYPES.filter(function (x) { return x[0] === h.type; })[0];
        return html`<div class="imx-h ${i === ED.hot ? 'on' : ''}" data-h="${i}">
          <div class="imx-h-hd" data-hsel="${i}"><span class="imx-h-n">${i + 1}</span><span class="imx-h-t">${h.label || (t && t[1])}</span><span class="tag">${t ? t[1] : h.type}</span></div>
          <div class="imx-h-b"><div class="imx-grid">
            ${fld('Does', raw('<select class="inp" data-hk="type">' + HOT_TYPES.map(function (x) { return '<option value="' + x[0] + '"' + (h.type === x[0] ? ' selected' : '') + (x[0] === 'scene' && !others.length ? ' disabled' : '') + (x[0] === 'tour' && ED.row.tour_id == null ? ' disabled' : '') + (x[0] === 'seek' && s.kind !== 'video' ? ' disabled' : '') + '>' + esc(x[1]) + '</option>'; }).join('') + '</select>'), null, 'full')}
            ${fld('Label', raw('<input class="inp" data-hk="label" maxlength="80" value="' + esc(h.label || '') + '" placeholder="' + (h.type === 'scene' ? 'Walk to the river' : 'What is this?') + '"/>'), null, 'full')}
            ${h.type === 'info' ? fld('Card text', raw('<textarea class="inp" data-hk="text" maxlength="1200" rows="3">' + esc(h.text || '') + '</textarea>'), 'Read on screen as a card, and in a headset as a panel in the world.', 'full') : ''}
            ${h.type === 'scene' ? fld('Walks to', raw('<select class="inp" data-hk="target">' + others.map(function (o) { return '<option value="' + esc(o.id) + '"' + (h.target === o.id ? ' selected' : '') + '>' + esc(o.name || o.id) + '</option>'; }).join('') + '</select>'), 'Guests turn toward the marker and walk through.', 'full') : ''}
            ${h.type === 'seek' ? fld('Jumps to (seconds)', raw('<input class="inp" type="number" min="0" step="0.1" data-hk="target" value="' + (h.target != null ? h.target : '') + '"/>'), null, 'full') : ''}
            ${h.type === 'link' ? fld('Opens', raw('<input class="inp" data-hk="target" value="' + esc(h.target || '') + '" placeholder="https://"/>'), 'Opens in a new tab. In a headset, it waits until they come out.', 'full') : ''}
            ${h.type === 'tour' ? html`<div class="imx-f full"><div class="hint">Takes the guest out of the world and straight to the linked tour’s booking sheet.</div></div>` : ''}
            ${fld('Yaw', raw('<input class="inp" type="number" step="0.1" data-hk="yaw" value="' + n(h.yaw) + '"/>'))}
            ${fld('Pitch', raw('<input class="inp" type="number" step="0.1" data-hk="pitch" value="' + n(h.pitch) + '"/>'))}
            ${s.kind === 'video' ? html`${fld('Shows from (s)', raw('<input class="inp" type="number" min="0" step="0.1" data-hk="t0" value="' + (h.t0 != null ? h.t0 : '') + '" placeholder="start"/>'))}${fld('Until (s)', raw('<input class="inp" type="number" min="0" step="0.1" data-hk="t1" value="' + (h.t1 != null ? h.t1 : '') + '" placeholder="end"/>'))}
              <div class="row full" style="gap:6px;grid-column:1/-1"><button class="btn btn-sm btn-g" data-hnow="t0">From now</button><button class="btn btn-sm btn-g" data-hnow="t1">Until now</button><button class="btn btn-sm btn-q" data-hclr>Always show</button></div>` : ''}
          </div>
          <div class="row" style="gap:6px;margin-top:10px"><button class="btn btn-sm btn-g" data-hlook>${icon('eye')}Look at it</button><button class="btn btn-sm btn-g" data-haim>${icon('crosshair')}Move to view centre</button><span class="grow"></span><button class="btn btn-sm btn-d" data-hdel>${icon('trash')}Delete</button></div></div>
        </div>`; }) : CX.empty('No markers in this scene', 'Markers explain what guests are looking at, walk them to the next scene, or take them to booking.', 'pin')}</div>
      <button class="btn btn-p" data-hadd>${icon('plus')}Add marker on the preview</button>
    </div>`);
    on(pane, '[data-hsel]', 'click', function (el) { var i = +el.getAttribute('data-hsel'); ED.hot = ED.hot === i ? -1 : i; syncHots(); paintPane(); });
    on(pane, '[data-hadd]', 'click', function () { setPlacing(true); });
    $$('[data-h]', pane).forEach(function (card) {
      var i = +card.getAttribute('data-h'), h = list[i];
      on(card, '[data-hk]', 'change', function (el) {
        var k = el.getAttribute('data-hk'), val = el.value.trim();
        if (k === 'type') { h.type = val; if (val === 'scene') h.target = others[0] && others[0].id; else if (val === 'seek') h.target = 0; else if (val === 'link') h.target = ''; else delete h.target; if (val !== 'info') delete h.text; paintPane(); }
        else if (k === 'yaw') h.yaw = Math.max(-360, Math.min(360, n(val)));
        else if (k === 'pitch') h.pitch = Math.max(-90, Math.min(90, n(val)));
        else if (k === 't0' || k === 't1') { if (val === '') delete h[k]; else h[k] = Math.max(0, n(val)); }
        else if (k === 'target') { h.target = h.type === 'seek' ? Math.max(0, n(val)) : val; if (h.type === 'link' && val && !HTTPS_RX.test(val)) toast('Links must start with https://', 'warn'); }
        else h[k] = val;
        dirty(); syncHots();
        var t = card.querySelector('.imx-h-t'); if (t && k === 'label') t.textContent = val || 'Marker';
      });
      on(card, '[data-hk="label"], [data-hk="text"]', 'input', function (el) { h[el.getAttribute('data-hk')] = el.value; dirty(); });
      on(card, '[data-hnow]', 'click', function (el) { var vid = ED.eng && ED.eng.video(); if (!vid) return; h[el.getAttribute('data-hnow')] = Math.round(vid.currentTime * 10) / 10; dirty(); paintPane(); });
      on(card, '[data-hclr]', 'click', function () { delete h.t0; delete h.t1; dirty(); paintPane(); });
      on(card, '[data-hlook]', 'click', function () { if (ED.eng) ED.eng.look(n(h.yaw), n(h.pitch), true); });
      on(card, '[data-haim]', 'click', function () { if (!ED.eng) return; var vw = ED.eng.view(); h.yaw = Math.round(vw.sceneYaw * 10) / 10; h.pitch = Math.round(vw.pitch * 10) / 10; dirty(); syncHots(); paintPane(); });
      on(card, '[data-hdel]', 'click', function () { s.hotspots.splice(i, 1); ED.hot = -1; dirty(); syncHots(); paintPane(); paintScenes(); });
    });
  }

  /* ── save ── */
  function problems(r, publishing) {
    var out = [];
    if (!r.title || r.title.trim().length < 2) out.push('Give the world a title.');
    if (!SLUG_RX.test(r.slug || '')) out.push('The web address needs 3 to 80 lowercase letters, numbers or dashes.');
    if (publishing && !r.scenes.length) out.push('Add at least one scene before publishing.');
    if (publishing && !r.poster_url) out.push('Add a poster before publishing. Guests see it on the card.');
    var ids = r.scenes.map(function (s) { return s.id; });
    r.scenes.forEach(function (s, i) {
      var nm = s.name || 'Scene ' + (i + 1);
      if (!s.src && !s.stream) out.push(nm + ' has no footage.');
      (s.hotspots || []).forEach(function (h, j) {
        var hn = nm + ', marker ' + (j + 1);
        if (h.type === 'scene' && ids.indexOf(h.target) < 0) out.push(hn + ' walks to a scene that no longer exists.');
        if (h.type === 'link' && !HTTPS_RX.test(h.target || '')) out.push(hn + ' needs an https:// link.');
        if (h.type === 'tour' && r.tour_id == null) out.push(hn + ' books a tour, but no tour is linked on the World tab.');
        if ((h.label || '').length > 80) out.push(hn + ' has a label over 80 characters.');
      });
    });
    return out;
  }
  function payload(r, status) {
    var clean = function (s) {
      var o = { id: s.id, name: (s.name || '').slice(0, 120), kind: s.kind, projection: s.projection, src: s.src || null, src_mobile: s.src_mobile || null,
        stream: s.stream || null, poster: s.poster || null, audio: s.audio || null, yaw: n(s.yaw), pitch: n(s.pitch), fov: n(s.fov) || 75, loop: s.loop !== false,
        hotspots: (s.hotspots || []).map(function (h) {
          var x = { id: h.id, type: h.type, yaw: n(h.yaw), pitch: n(h.pitch), label: (h.label || '').slice(0, 80) };
          if (h.type === 'info' && h.text) x.text = String(h.text).slice(0, 1200);
          if (h.type === 'scene' || h.type === 'link') x.target = h.target;
          if (h.type === 'seek') x.target = n(h.target);
          if (h.t0 != null) x.t0 = n(h.t0);
          if (h.t1 != null) x.t1 = n(h.t1);
          return x;
        })
      };
      Object.keys(o).forEach(function (k) { if (o[k] === null) delete o[k]; });
      return o;
    };
    return {
      id: r.id, slug: r.slug, title: r.title.trim(), tagline: r.tagline || null, description: r.description || null,
      destination: r.destination || null, country: r.country || null, credits: r.credits || null, tour_id: r.tour_id == null ? null : r.tour_id,
      poster_url: r.poster_url || null, duration_s: r.duration_s == null ? null : Math.round(n(r.duration_s)), access: r.access || 'free', status: status || r.status || 'draft',
      featured: !!r.featured, sort_order: Math.round(n(r.sort_order)), scenes: r.scenes.map(clean), start_scene: r.start_scene || (r.scenes[0] && r.scenes[0].id) || null
    };
  }
  function save(status) {
    if (!ED) return Promise.resolve();
    var r = ED.row, publishing = (status || r.status) === 'published';
    if (busyUploads()) { toast('Uploads are still running. Save when they finish.', 'warn'); return Promise.resolve(); }
    var failed = Object.keys(ED.ups).filter(function (k) { return ED.ups[k].state === 'failed'; });
    if (failed.length) { toast('An upload failed. Retry or remove it first.', 'bad'); return Promise.resolve(); }
    var bad = problems(r, publishing && status !== 'draft');
    if (bad.length) {
      CX.modal({ title: 'Not ready yet', sub: 'Fix these and try again.', icon: 'alert', tone: 'warn', body: html`<ul style="margin:0;padding-left:18px;display:grid;gap:6px;font-size:13.5px">${bad.map(function (b) { return html`<li>${b}</li>`; })}</ul>`, actions: [{ label: 'OK', kind: 'btn-p' }] });
      return Promise.resolve();
    }
    var body = payload(r, status);
    var btn = $(status ? '[data-publish]' : '[data-save]', ED.el);
    return CX.busy(btn, function () {
      return CX.q('immersive_experiences').upsert(body).select().single().then(function (res) {
        if (res.error) throw new Error(friendlySave(res.error));
        if (!ED) return;
        var saved = res.data;
        // Files taken off scenes are deleted now that the new version is safe.
        var keep = refsOf(saved);
        var gone = (ED.forgotten || []).filter(function (p) { return keep.indexOf(p) < 0 && p.indexOf('exp/' + saved.id + '/') === 0; });
        if (gone.length) sb().storage.from(PRIV).remove(gone).catch(noop);
        ED.forgotten = [];
        CX.log(ED.isNew ? 'immersive_create' : 'immersive_save', 'immersive', saved.id, { title: saved.title, status: saved.status });
        var wasNew = ED.isNew;
        ED.isNew = false; ED.everSaved = true; ED.dirty = false;
        ED.row.status = saved.status; ED.row.start_scene = saved.start_scene;
        ED.saved = JSON.parse(JSON.stringify(ED.row));
        toast(saved.status === 'published' ? (status ? 'Live on /tours' : 'Saved · live on /tours') : 'Saved as draft', 'ok');
        paintBar('Saved ' + new Date().toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' }));
        paintScenes(); paintPane(); syncHots();
        if (wasNew && ED.v && ED.v.setQ) ED.v.setQ({ edit: saved.id });
      });
    }).catch(noop);
  }

  CX.immersive = { open: function (w) { openStudio(w, null); } };
})(window);
