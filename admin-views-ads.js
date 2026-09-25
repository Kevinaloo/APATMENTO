/* ═══════════════════════════════════════════════════════════════════
   CABANA · OPERATIONS CONSOLE · ADVERTISING ROOM
   ───────────────────────────────────────────────────────────────────
   Everything ads, in one room, built on the same placement registry
   the site uses (apa-ad-registry.js):

     Overview    health of every placement, delivery, what needs you
     Placements  every slot on every page, live status reported by the
                 pages themselves, what runs there, on/off per slot
     Campaigns   create in one screen: drop a file, pick a format, see
                 the exact live render, choose where, schedule
     Secret ads  the behavioural edge cards, with targeting and preview
     Welcome     the optional full-screen poster on dashboard arrival
     Rules       the anti-clutter rules the site enforces
     Rate card · Visitors   inventory pricing and audience

   The console never guesses: what it shows as running is computed by
   the same `candidates()` function the site calls, and what it shows
   as healthy is what visitors' browsers reported.
   ═══════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';
  var CX = global.CX; if (!CX || !CX.ops) return;
  var REG = global.CabanaAdRegistry;
  var html = CX.html, raw = CX.raw, set = CX.set, icon = CX.icon, $ = CX.$, $$ = CX.$$;
  var n = CX.n, num = CX.num, money = CX.money, moneyC = CX.moneyC, compact = CX.compact, ago = CX.ago, fdate = CX.fdate, fshort = CX.fshort, human = CX.human;
  var rpc = CX.rpc, toast = CX.toast, confirm = CX.confirm;
  var O = CX.ops, on = O.on, pageHd = O.pageHd;
  var BUCKET = 'ads-media';

  function wireTabs(v, fallback) {
    on(v.el, '[data-tab]', 'click', function (el) { var t = el.getAttribute('data-tab'); v.setQ({ tab: t === fallback ? null : t }); v.refresh(); });
  }
  function load(fresh) { return rpc('admin_ads_overview', { p_days: 30 }, fresh ? { fresh: true } : undefined); }
  function today() { return REG ? REG.today() : new Date().toISOString().slice(0, 10); }
  function daysBetween(a, b) { return Math.round((new Date(b) - new Date(a)) / 864e5); }

  /* ── campaign state, as a visitor would experience it ─────────── */
  function stateOf(c) {
    var st = c.status || (c.active === false ? 'paused' : 'live'), d = today();
    if (st === 'draft') return { k: 'draft', label: 'Draft', tone: 'p-mute' };
    if (st === 'paused') return { k: 'paused', label: 'Paused', tone: 'p-mute' };
    if (c.end_date && String(c.end_date).slice(0, 10) < d) return { k: 'ended', label: 'Ended', tone: 'p-mute' };
    if (c.start_date && String(c.start_date).slice(0, 10) > d) return { k: 'scheduled', label: 'Starts ' + fshort(c.start_date), tone: 'p-info' };
    return { k: 'live', label: 'Live', tone: 'p-ok' };
  }
  function slotsFor(c, campaigns) {
    if (!REG) return [];
    var out = [];
    REG.SURFACES.forEach(function (s) {
      s.slots.forEach(function (sl) {
        var cands = REG.candidates([Object.assign({}, c, { status: 'live', active: true, start_date: null, end_date: null })], sl);
        if (cands.length) out.push({ slot: sl, surface: s, fit: cands[0].fit });
      });
    });
    void campaigns;
    return out;
  }
  function issuesOf(c) {
    var out = [], s = stateOf(c), places = slotsFor(c);
    if (!places.length) out.push({ tone: 'bad', t: 'Has nowhere to run: no placement accepts this format with its targeting.' });
    (c.slots || []).forEach(function (id) { if (REG && !REG.slot(id)) out.push({ tone: 'warn', t: 'Targets a placement that no longer exists (' + id + ').' }); });
    if (c.format !== 'ticker' && c.format !== 'sticky' && !c.media_url) out.push({ tone: 'warn', t: 'No image or video: it will show as a colour block.' });
    if (!REG || !REG.safeHref(c.cta_url)) out.push({ tone: 'warn', t: 'No working link: clicks go nowhere.' });
    if (s.k === 'live' && c.end_date && daysBetween(today(), c.end_date) <= 3) out.push({ tone: 'info', t: 'Ends ' + fdate(c.end_date) + '.' });
    return out;
  }

  /* ── slot health, from what visitors' browsers reported ────────── */
  var STATE = {
    live: ['Live', 'p-ok'], house: ['House promo', 'p-brand'], empty: ['Empty', 'p-warn'], missing: ['Broken', 'p-bad'],
    blocked: ['Held by rules', 'p-warn'], deferred: ['Waiting', 'p-info'], error: ['Error', 'p-bad'], off: ['Off', 'p-mute']
  };
  function healthOf(sl, d) {
    var S = REG.mergePolicy(d.settings);
    var off = S.enabled === false || (S.disabled_slots || []).indexOf(sl.id) !== -1;
    var h = (d.health || []).filter(function (x) { return x.page === sl.page && x.slot === sl.id; })[0];
    var cands = REG.candidates(d.campaigns || [], sl);
    var res = { h: h, cands: cands, off: off };
    if (off) { res.label = 'Off'; res.tone = 'p-mute'; res.detail = S.enabled === false ? 'All ads are switched off.' : 'Switched off in Rules.'; res.level = 0; return res; }
    if (!h) { res.label = 'No report yet'; res.tone = 'p-mute'; res.detail = 'Reports arrive as visitors open the page.'; res.level = 0; return res; }
    var age = (Date.now() - new Date(h.last_seen)) / 864e5;
    var m = STATE[h.state] || [human(h.state), 'p-mute'];
    res.label = m[0]; res.tone = m[1]; res.detail = h.detail || ''; res.level = h.state === 'missing' || h.state === 'error' ? 2 : 0;
    if (h.state === 'empty' && cands.length) { res.detail = (res.detail ? res.detail + ' ' : '') + 'Campaigns now target it; it fills on the next visit.'; }
    if (age > 3) { res.label = 'Silent'; res.tone = 'p-warn'; res.level = Math.max(res.level, 1); res.detail = 'No visitor has reported this slot for ' + Math.round(age) + ' days. ' + (h.detail || ''); }
    return res;
  }
  function problems(d) {
    var out = [];
    if (!REG) return out;
    REG.SURFACES.forEach(function (s) {
      s.slots.forEach(function (sl) { var hh = healthOf(sl, d); if (hh.level) out.push({ surface: s, slot: sl, health: hh }); });
    });
    (d.campaigns || []).forEach(function (c) {
      if (stateOf(c).k !== 'live') return;
      issuesOf(c).filter(function (i) { return i.tone === 'bad'; }).forEach(function (i) { out.push({ campaign: c, text: i.t }); });
    });
    return out;
  }

  /* ── creative preview, rendered by the site's own engine ──────── */
  function paintPreview(host, c, fmt, opts) {
    if (!host) return;
    if (global.CabanaAds && global.CabanaAds.preview) {
      global.CabanaAds.preview(host, c, fmt || c.format, opts).catch(function () {});
    } else set(host, html`<div class="note">Preview engine did not load.</div>`);
  }
  function thumb(c) {
    var u = CX.safeUrl(c.poster_url || c.media_url);
    var vid = c.media_kind === 'video' || /\.(mp4|webm|mov|m4v)(\?|$)/i.test(String(c.media_url || ''));
    return html`<span class="ads-thumb" style="background:${raw(CX.esc(cssBg(c.theme_gradient || c.theme)))}">${u && (!vid || c.poster_url) ? html`<img src="${u}" alt="" loading="lazy"/>` : vid && u ? html`<video src="${u}" muted preload="metadata"></video>` : ''}${vid ? html`<i>${icon('play')}</i>` : ''}</span>`;
  }
  function cssBg(v) { v = String(v || ''); return /^(linear|radial)-gradient\([#(),.%\sa-z0-9-]+\)$/i.test(v) || /^#[0-9a-f]{3,8}$/i.test(v) ? v : 'linear-gradient(135deg,#7A3BFF,#4C7DFF)'; }

  /* ── MEDIA: drop, optimise, upload with progress, auto poster ──── */
  function keyFor(prefix, name, ext) {
    var d = new Date(), ym = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
    var slug = String(name || 'media').toLowerCase().replace(/\.[a-z0-9]+$/, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'media';
    return prefix + '/' + ym + '/' + slug + '-' + Date.now().toString(36) + CX.uid().slice(0, 4) + '.' + ext;
  }
  function inspect(file) {
    return new Promise(function (resolve) {
      var url = URL.createObjectURL(file), kind = /^video\//.test(file.type) ? 'video' : 'image';
      var done = function (info) { resolve(Object.assign({ kind: kind, size: file.size, url: url }, info)); };
      if (kind === 'image') { var im = new Image(); im.onload = function () { done({ w: im.naturalWidth, h: im.naturalHeight, img: im }); }; im.onerror = function () { done({}); }; im.src = url; }
      else {
        var v = document.createElement('video'); v.muted = true; v.preload = 'metadata'; v.playsInline = true;
        var t = setTimeout(function () { done({}); }, 8000);
        v.onloadedmetadata = function () { clearTimeout(t); done({ w: v.videoWidth, h: v.videoHeight, duration: v.duration, video: v }); };
        v.onerror = function () { clearTimeout(t); done({}); };
        v.src = url;
      }
    });
  }
  function canvasBlob(c) {
    return new Promise(function (res) {
      c.toBlob(function (b) {
        if (b && b.type === 'image/webp') return res(b);
        c.toBlob(function (j) { res(j); }, 'image/jpeg', 0.88);
      }, 'image/webp', 0.88);
    });
  }
  function optimise(file, info) {
    if (info.kind !== 'image' || /gif|svg/i.test(file.type) || !info.img || file.size < 350 * 1024) return Promise.resolve(file);
    var max = 2400, w = info.w, h = info.h, s = Math.min(1, max / Math.max(w, h));
    var c = document.createElement('canvas'); c.width = Math.round(w * s); c.height = Math.round(h * s);
    c.getContext('2d').drawImage(info.img, 0, 0, c.width, c.height);
    return canvasBlob(c).then(function (b) { return b && b.size < file.size ? new File([b], file.name.replace(/\.[^.]+$/, '') + (b.type === 'image/webp' ? '.webp' : '.jpg'), { type: b.type }) : file; });
  }
  function posterFrame(info) {
    return new Promise(function (resolve) {
      var v = info.video; if (!v || !info.w) return resolve(null);
      var to = setTimeout(function () { resolve(null); }, 6000);
      v.onseeked = function () {
        clearTimeout(to);
        try {
          var s = Math.min(1, 1600 / Math.max(info.w, info.h)), c = document.createElement('canvas');
          c.width = Math.round(info.w * s); c.height = Math.round(info.h * s);
          c.getContext('2d').drawImage(v, 0, 0, c.width, c.height);
          canvasBlob(c).then(resolve);
        } catch (e) { resolve(null); }
      };
      try { v.currentTime = Math.min(1.2, (info.duration || 2) * 0.15); } catch (e) { clearTimeout(to); resolve(null); }
    });
  }
  /* XHR so the operator sees real progress; falls back to the SDK. */
  function upload(blob, key, onProgress) {
    var sb = CX.client();
    return CX.token().then(function (tok) {
      var base = sb && (sb.supabaseUrl || (sb.storageUrl || '').replace(/\/storage\/v1\/?$/, ''));
      var apikey = sb && (sb.supabaseKey || (sb.rest && sb.rest.headers && sb.rest.headers.apikey));
      if (!tok || !base || !apikey || !global.XMLHttpRequest) {
        return sb.storage.from(BUCKET).upload(key, blob, { upsert: false, contentType: blob.type, cacheControl: '31536000' }).then(function (r) { if (r.error) throw r.error; });
      }
      return new Promise(function (resolve, reject) {
        var x = new XMLHttpRequest();
        x.open('POST', base.replace(/\/$/, '') + '/storage/v1/object/' + BUCKET + '/' + key.split('/').map(encodeURIComponent).join('/'));
        x.setRequestHeader('Authorization', 'Bearer ' + tok);
        x.setRequestHeader('apikey', apikey);
        x.setRequestHeader('Content-Type', blob.type || 'application/octet-stream');
        x.setRequestHeader('cache-control', 'max-age=31536000');
        x.setRequestHeader('x-upsert', 'false');
        x.upload.onprogress = function (e) { if (e.lengthComputable && onProgress) onProgress(e.loaded / e.total); };
        x.onload = function () { if (x.status >= 200 && x.status < 300) resolve(); else { var m = 'Upload failed (' + x.status + ')'; try { m = JSON.parse(x.responseText).message || m; } catch (e) {} reject(new Error(m)); } };
        x.onerror = function () { reject(new Error('Network error while uploading')); };
        x.send(blob);
      });
    }).then(function () { return sb.storage.from(BUCKET).getPublicUrl(key).data.publicUrl; });
  }
  function checks(info, fmt) {
    var out = [], F = REG && REG.FORMATS[fmt];
    if (!info) return out;
    if (info.kind === 'video' && info.size > 60 * 1048576) out.push({ tone: 'warn', t: 'The video is ' + CX.bytes(info.size) + '. Under 30 MB starts much faster on phones.' });
    if (info.kind === 'video' && info.duration > (fmt === 'poster' ? 15 : 45)) out.push({ tone: 'warn', t: 'It runs ' + Math.round(info.duration) + 's. ' + (fmt === 'poster' ? 'Posters work best around 6 to 10 seconds.' : 'Shorter loops hold attention better.') });
    if (info.w && info.w < 800) out.push({ tone: 'warn', t: 'Only ' + info.w + 'px wide: it will look soft on large screens.' });
    if (F && F.ratio && info.w && info.h) {
      var r = info.w / info.h, off = Math.abs(r / F.ratio - 1);
      if (off > 0.28) out.push({ tone: 'info', t: 'This is ' + info.w + '×' + info.h + '. ' + F.label + ' is ' + ratioName(F.ratio) + ', so the edges will be cropped. ' + suggest(r) });
    }
    return out;
  }
  function ratioName(r) { return r > 3 ? '4:1' : r > 2.2 ? '21:9' : r > 1.9 ? '2:1' : r > 1.5 ? '16:9' : r > 1.2 ? '4:3' : r > 0.9 ? 'square' : '9:16'; }
  function suggest(r) { return r < 0.8 ? 'Portrait media fits the Welcome poster or a Native card best.' : r > 1.6 ? 'Wide media fits Window or Video banner best.' : 'Near-square media fits a Native card or Split banner best.'; }

  function mediaField(host, st, opts) {
    // st: { media_url, poster_url, info } — mutated in place; opts.onChange()
    opts = opts || {};
    function paint(stage, pct) {
      var u = CX.safeUrl(st.media_url), isVid = st.info ? st.info.kind === 'video' : /\.(mp4|webm|mov|m4v)(\?|$)/i.test(String(st.media_url || ''));
      set(host, html`<div class="ads-drop ${u ? 'has' : ''} ${stage === 'up' ? 'busy' : ''}" data-drop tabindex="0" role="button" aria-label="Upload an image or video">
          ${u ? html`<div class="ads-drop-m">${isVid ? html`<video src="${u}" ${st.poster_url ? raw('poster="' + CX.esc(st.poster_url) + '"') : ''} muted playsinline loop autoplay></video>` : html`<img src="${u}" alt=""/>`}</div>` : ''}
          <div class="ads-drop-c">${stage === 'up'
            ? html`<b>Uploading… ${Math.round((pct || 0) * 100)}%</b><div class="meter mt-s" style="width:220px"><i style="width:${Math.round((pct || 0) * 100)}%"></i></div>`
            : u ? html`<span class="ads-drop-k">${isVid ? 'Video' : 'Image'}${st.info && st.info.w ? ' · ' + st.info.w + '×' + st.info.h : ''}${st.info && st.info.duration ? ' · ' + Math.round(st.info.duration) + 's' : ''}${st.info && st.info.size ? ' · ' + CX.bytes(st.info.size) : ''}</span><span class="ads-drop-a"><button type="button" class="btn btn-sm btn-g" data-pickf>${icon('upload')}Replace</button><button type="button" class="btn btn-sm btn-q" data-clear>Remove</button></span>`
            : html`${icon('upload')}<b>Drop an image or video here</b><span>or <u>choose a file</u> · paste works too · JPG, PNG, WebP, MP4, WebM</span>`}</div>
          <input type="file" accept="image/*,video/mp4,video/webm,video/quicktime" hidden data-file/></div>
        <div class="ads-url"><input class="inp" data-url placeholder="…or paste a link to media already online" value="${st.media_url || ''}"/></div>
        <div data-checks class="col mt-s" style="gap:6px"></div>`);
      var drop = $('[data-drop]', host), file = $('[data-file]', host);
      drop.onclick = function (e) { if (e.target.closest('button')) return; if (stage !== 'up') file.click(); };
      drop.onkeydown = function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); file.click(); } };
      var pf = $('[data-pickf]', host); if (pf) pf.onclick = function (e) { e.stopPropagation(); file.click(); };
      var cl = $('[data-clear]', host); if (cl) cl.onclick = function (e) { e.stopPropagation(); st.media_url = ''; st.poster_url = ''; st.info = null; paint(); if (opts.onChange) opts.onChange(); };
      file.onchange = function () { if (file.files[0]) take(file.files[0]); };
      drop.ondragover = function (e) { e.preventDefault(); drop.classList.add('over'); };
      drop.ondragleave = function () { drop.classList.remove('over'); };
      drop.ondrop = function (e) { e.preventDefault(); drop.classList.remove('over'); if (e.dataTransfer.files[0]) take(e.dataTransfer.files[0]); };
      $('[data-url]', host).onchange = function () { var v = this.value.trim(); if (v && !CX.safeUrl(v)) { toast('That link is not usable', 'warn'); return; } st.media_url = v; st.info = null; if (!v) st.poster_url = ''; paint(); if (opts.onChange) opts.onChange(); };
      paintChecks();
    }
    function paintChecks() {
      var box = $('[data-checks]', host); if (!box) return;
      var list = checks(st.info, opts.format ? opts.format() : null);
      set(box, html`${list.map(function (c) { return html`<div class="note ${c.tone}" style="padding:8px 11px">${c.t}</div>`; })}`);
    }
    function take(f) {
      var kind = /^video\//.test(f.type) ? 'video' : /^image\//.test(f.type) ? 'image' : null;
      if (!kind) { toast('Choose an image or a video', 'warn'); return; }
      if (f.size > 200 * 1048576) { toast('That file is ' + CX.bytes(f.size) + '. The limit is 200 MB.', 'bad'); return; }
      paint('up', 0);
      inspect(f).then(function (info) {
        st.info = info;
        return optimise(f, info).then(function (blob) {
          var ext = (blob.name && blob.name.split('.').pop() || (kind === 'video' ? 'mp4' : 'jpg')).toLowerCase().replace(/[^a-z0-9]/g, '');
          var key = keyFor(opts.prefix || 'campaign', f.name, ext);
          return upload(blob, key, function (p) { paint('up', p * (kind === 'video' ? 0.94 : 1)); }).then(function (url) {
            st.media_url = url; st.info.size = blob.size;
            if (kind !== 'video') { st.poster_url = ''; return; }
            return posterFrame(info).then(function (pb) {
              if (!pb) return;
              return upload(pb, keyFor(opts.prefix || 'campaign', f.name + '-poster', pb.type === 'image/webp' ? 'webp' : 'jpg')).then(function (pu) { st.poster_url = pu; });
            });
          });
        });
      }).then(function () {
        paint(); toast('Uploaded', 'ok'); if (opts.onChange) opts.onChange(st.info);
      }, function (e) { paint(); toast('Upload failed: ' + CX.friendly(e), 'bad'); });
    }
    host.addEventListener('paste', function (e) {
      var it = e.clipboardData && [].slice.call(e.clipboardData.items || []).filter(function (i) { return i.kind === 'file'; })[0];
      if (it) { e.preventDefault(); take(it.getAsFile()); }
    });
    paint();
    return { refreshChecks: paintChecks, take: take };
  }

  /* ════════════════════════════════════════════════════════════════
     CAMPAIGN EDITOR
     ════════════════════════════════════════════════════════════════ */
  var FORMAT_ORDER = ['window', 'video', 'native', 'carousel', 'split', 'sticky', 'ticker', 'poster'];
  function campaignEditor(c0, all, done, preset) {
    var c = Object.assign({ format: 'window', status: 'live', priority: 5, cta_text: 'Learn more', theme_gradient: 'linear-gradient(135deg,#7A3BFF,#4C7DFF)' }, preset || {}, c0 || {});
    var isNew = !c.id, posterOnly = c.format === 'poster' && (!c0 || !c0.id) && preset && preset.format === 'poster';
    var media = { media_url: c.media_url || '', poster_url: c.poster_url || '', info: null };
    var chosen = {};
    (c.slots || []).forEach(function (id) { chosen[id] = 1; });
    var pages = Array.isArray(c.page_targets) ? c.page_targets : ['all'];
    var mode = (c.slots || []).length || (pages.indexOf('all') === -1 && c.format !== 'poster') ? 'pick' : 'auto';
    if (mode === 'pick' && !(c.slots || []).length && REG) {
      REG.slotsForFormat(c.format).forEach(function (x) { if (pages.indexOf(x.slot.page) !== -1) chosen[x.slot.id] = 1; });
    }
    var view = 'desktop';

    var body = html`<div class="ads-ed">
      <div class="ads-ed-l">
        <div class="form-sec" style="margin-top:0">1 · Creative</div>
        <div data-media></div>
        ${posterOnly ? '' : html`<div class="form-sec">2 · Format</div><div class="ads-fmts" data-fmts>${FORMAT_ORDER.filter(function (f) { return f !== 'poster' || c.format === 'poster'; }).map(function (f) { var F = REG.FORMATS[f]; return html`
          <button type="button" class="ads-fmt ${f === c.format ? 'on' : ''}" data-fmt="${f}" title="${F.spec}"><span>${icon(F.icon || 'layers')}</span><b>${F.label}</b><small>${F.desc}</small></button>`; })}</div>
          <div class="fld-h mt-s" data-spec></div>`}
        <div class="form-sec">${posterOnly ? '2' : '3'} · Words and link</div>
        <form class="form-grid" onsubmit="return false" data-copy>
          ${CX.fieldHTML({ name: 'advertiser', label: 'Advertiser', required: true, value: c.advertiser, placeholder: 'Who is paying' })}
          ${CX.fieldHTML({ name: 'tag', label: 'Label', value: c.tag && c.tag !== 'Sponsored' ? c.tag : '', placeholder: 'Sponsored', help: 'Shown on the badge. Leave empty for “Sponsored”.' })}
          ${CX.fieldHTML({ name: 'headline', label: 'Headline', value: c.headline, full: true, placeholder: 'Fly Nairobi to Dubai from KES 38,000' })}
          ${CX.fieldHTML({ name: 'sub_text', label: 'Supporting line', value: c.sub_text || c.sub, full: true, placeholder: 'One short sentence' })}
          ${CX.fieldHTML({ name: 'cta_text', label: 'Button', value: c.cta_text, placeholder: 'Book now' })}
          ${CX.fieldHTML({ name: 'cta_url', label: 'Link', value: c.cta_url === '#' ? '' : c.cta_url, placeholder: 'https://… or /tours', help: 'Outside links open in a new tab.' })}
          ${CX.fieldHTML({ name: 'price_display', label: 'Price tag', value: c.price_display, placeholder: 'From KES 4,500', help: 'Shown on native cards.' })}
          ${CX.fieldHTML({ name: 'theme_gradient', label: 'Background colour', value: c.theme_gradient, placeholder: 'linear-gradient(135deg,#7A3BFF,#4C7DFF) or #0A0A14', help: 'Behind the media and while it loads.' })}
        </form>
        <div data-poster-opts></div>
        <div class="form-sec">${posterOnly ? '3' : '4'} · Where it runs</div>
        <div data-where></div>
        <div class="form-sec">${posterOnly ? '4' : '5'} · When and how often</div>
        <form class="form-grid" onsubmit="return false" data-sched>
          ${CX.fieldHTML({ name: 'status', label: 'Status', type: 'select', value: c.status || 'live', options: [['live', 'Live'], ['paused', 'Paused'], ['draft', 'Draft']] })}
          ${CX.fieldHTML({ name: 'priority', label: 'Priority (1–10)', type: 'number', min: 1, max: 10, value: c.priority || 5, help: 'Higher shows more often when several share a slot.' })}
          ${CX.fieldHTML({ name: 'start_date', label: 'Starts', type: 'date', value: c.start_date })}
          ${CX.fieldHTML({ name: 'end_date', label: 'Ends', type: 'date', value: c.end_date })}
          ${CX.fieldHTML({ name: 'budget', label: 'Budget (KES)', type: 'number', min: 0, value: c.budget })}
          ${CX.fieldHTML({ name: 'notes', label: 'Internal notes', value: c.notes, placeholder: 'Invoice, contact, deal terms' })}
        </form>
      </div>
      <div class="ads-ed-r">
        <div class="row between"><div class="dr-sec-t" style="margin:0">Live preview</div>${CX.seg([['desktop', 'Desktop', 'monitor'], ['mobile', 'Phone', 'phone']], 'desktop', 'data-dev')}</div>
        <div class="ads-pv-frame" data-frame><div data-pv></div></div>
        <div class="muted mt-s" style="font-size:11.5px">Rendered by the same code visitors run. Clicks are disabled here.</div>
        <div class="dr-sec-t mt">Before you publish</div>
        <div data-ready class="col" style="gap:6px"></div>
      </div>
    </div>`;

    return CX.modal({
      title: isNew ? (c.format === 'poster' ? 'New welcome poster' : 'New campaign') : 'Edit · ' + (c.advertiser || 'campaign'),
      sub: c.format === 'poster' ? 'A full-screen poster that greets members as their dashboard opens.' : 'Drop the creative, pick how it appears and where, and publish. What you see on the right is exactly what visitors get.',
      icon: c.format === 'poster' ? 'image' : 'megaphone', wide: 'x', body: body,
      actions: [{ label: 'Cancel', kind: 'btn-q' },
        !isNew ? { label: 'Preview on site', kind: 'btn-g', icon: 'external', onClick: function () { previewOnSite(Object.assign({}, c, current()), null); return false; } } : null,
        { label: isNew ? 'Publish' : 'Save changes', kind: 'btn-p', icon: 'check', onClick: function (wrap) { return save(wrap); } }].filter(Boolean),
      onOpen: function (wrap) {
        var mf = mediaField($('[data-media]', wrap), media, { prefix: c.format === 'poster' ? 'poster' : 'campaign', format: function () { return c.format; }, onChange: function (info) { if (info && isNew && !c._fmtTouched && !posterOnly) autoFormat(info); refresh(); } });
        function autoFormat(info) {
          if (!info || !info.w) return;
          var r = info.w / info.h, f = r < 0.8 ? 'native' : r > 1.9 ? 'video' : r > 1.3 ? 'window' : 'native';
          if (f !== c.format) { c.format = f; $$('[data-fmt]', wrap).forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-fmt') === f); }); toast('Format set to ' + REG.FORMATS[f].label + ' to match the media', 'info'); paintWhere(); }
        }
        $$('[data-fmt]', wrap).forEach(function (b) { b.onclick = function () { c.format = b.getAttribute('data-fmt'); c._fmtTouched = true; $$('[data-fmt]', wrap).forEach(function (x) { x.classList.toggle('on', x === b); }); paintWhere(); paintPosterOpts(); mf.refreshChecks(); refresh(); }; });
        $$('[data-dev]', wrap).forEach(function (b) { b.onclick = function () { view = b.getAttribute('data-dev'); $$('[data-dev]', wrap).forEach(function (x) { x.classList.toggle('on', x === b); }); $('[data-frame]', wrap).classList.toggle('m', view === 'mobile'); refresh(); }; });
        $$('input,select,textarea', $('[data-copy]', wrap)).forEach(function (el) { el.addEventListener('input', CX.debounce(refresh, 180)); });
        $$('input,select', $('[data-sched]', wrap)).forEach(function (el) { el.addEventListener('input', CX.debounce(readyList, 180)); });

        function paintPosterOpts() {
          var box = $('[data-poster-opts]', wrap);
          if (c.format !== 'poster') { set(box, ''); return; }
          set(box, html`<div class="form-sec">Poster behaviour</div><form class="form-grid" onsubmit="return false" data-popts>
            ${CX.fieldHTML({ name: 'frequency', label: 'Show it', type: 'select', value: c.frequency || 'daily', options: [['once', 'Once per device'], ['daily', 'Once a day'], ['session', 'Once per visit'], ['always', 'Every time the dashboard opens']] })}
            ${CX.fieldHTML({ name: 'duration_s', label: 'Stays up for (seconds)', type: 'number', min: 3, max: 60, value: c.duration_s || 8, help: 'Videos end sooner if they are shorter.' })}
            ${CX.fieldHTML({ name: 'skip_after_s', label: 'Skip allowed after (seconds)', type: 'number', min: 0, max: 30, value: c.skip_after_s == null ? 3 : c.skip_after_s })}
          </form><div class="btn-row mt-s"><button type="button" class="btn btn-g btn-sm" data-fullpv>${icon('eye')}Play it full screen</button></div>`);
          $('[data-fullpv]', box).onclick = function () { if (global.CabanaPoster) global.CabanaPoster.preview(Object.assign({}, c, current())); else toast('Poster preview did not load', 'warn'); };
        }
        function paintWhere() {
          var box = $('[data-where]', wrap);
          if (c.format === 'poster') { set(box, html`<div class="note">Dashboard · Welcome poster. It is the only place a poster runs.</div>`); return; }
          var list = REG.slotsForFormat(c.format);
          set(box, html`${CX.seg([['auto', 'Everywhere it fits'], ['pick', 'Choose placements']], mode, 'data-mode')}
            <div class="ads-where mt-s">${mode === 'auto'
              ? html`<div class="note">Runs in <b>${num(list.length)}</b> placements across <b>${num(uniq(list.map(function (x) { return x.surface.page; })).length)}</b> pages: ${list.map(function (x) { return x.surface.label + ' · ' + x.slot.label; }).join(', ')}.</div>`
              : html`<div class="slot-grid">${list.map(function (x) { return html`
                  <div class="slot ${chosen[x.slot.id] ? 'on' : ''}" data-sl="${x.slot.id}" role="button" tabindex="0"><div class="slot-p">${x.surface.label}</div><div class="slot-f">${x.slot.label}${x.fit === 'adapted' ? ' · adapted' : ''}${x.surface.locked ? ' · fixed' : ''}</div></div>`; })}</div>`}</div>`);
          $$('[data-mode]', box).forEach(function (b) { b.onclick = function () { mode = b.getAttribute('data-mode'); paintWhere(); readyList(); }; });
          $$('[data-sl]', box).forEach(function (el) {
            function t() { var id = el.getAttribute('data-sl'); if (chosen[id]) delete chosen[id]; else chosen[id] = 1; el.classList.toggle('on'); readyList(); }
            el.onclick = t; el.onkeydown = function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); t(); } };
          });
          var sp = $('[data-spec]', wrap); if (sp) set(sp, html`<b>${REG.FORMATS[c.format].label}:</b> ${REG.FORMATS[c.format].spec}`);
        }
        function uniq(a) { return a.filter(function (x, i) { return a.indexOf(x) === i; }); }
        function refresh() {
          var cur = Object.assign({}, c, current());
          var host = $('[data-pv]', wrap);
          if (c.format === 'poster') set(host, html`<div class="ads-poster-pv">${thumbPoster(cur)}</div>`);
          else if (c.format === 'sticky' || c.format === 'ticker') set(host, html`<div class="note">${REG.FORMATS[c.format].label}: ${cur.headline || 'Your headline'} — ${cur.sub_text || ''}</div>`);
          else paintPreview(host, cur, c.format);
          readyList();
        }
        function readyList() {
          var cur = Object.assign({}, c, current());
          var places = c.format === 'poster' ? 1 : mode === 'auto' ? REG.slotsForFormat(c.format).length : Object.keys(chosen).length;
          var items = [
            [!!cur.advertiser, 'Advertiser named'],
            [!!cur.media_url || c.format === 'ticker' || c.format === 'sticky', cur.media_url ? 'Media attached' : 'No media yet (a colour block shows instead)'],
            [!!REG.safeHref(cur.cta_url), REG.safeHref(cur.cta_url) ? 'Link works: ' + REG.safeHref(cur.cta_url) : 'No link: clicks go nowhere'],
            [places > 0, places ? 'Runs in ' + places + ' placement' + (places === 1 ? '' : 's') : 'Choose at least one placement'],
            [!(cur.end_date && cur.start_date && cur.end_date < cur.start_date), cur.end_date && cur.start_date && cur.end_date < cur.start_date ? 'End date is before the start date' : cur.start_date || cur.end_date ? 'Scheduled ' + (cur.start_date ? 'from ' + fdate(cur.start_date) : '') + (cur.end_date ? ' until ' + fdate(cur.end_date) : '') : 'Runs until you pause it']
          ];
          set($('[data-ready]', wrap), html`${items.map(function (x) { return html`<div class="ads-ck ${x[0] ? 'ok' : 'no'}">${icon(x[0] ? 'check' : 'alert')}<span>${x[1]}</span></div>`; })}`);
        }
        function current() {
          var f = {};
          $$('[name]', wrap).forEach(function (el) { if (el.type !== 'file' && el.name) f[el.name] = el.value; });
          f.media_url = media.media_url; f.poster_url = media.poster_url;
          return f;
        }
        wrap._current = current;
        paintPosterOpts(); paintWhere(); refresh();
      }
    });

    function thumbPoster(cur) {
      var u = CX.safeUrl(cur.poster_url || cur.media_url), vid = /\.(mp4|webm|mov|m4v)(\?|$)/i.test(String(cur.media_url || ''));
      return html`<div class="ads-phone"><div class="ads-phone-s" style="background:${raw(CX.esc(cssBg(cur.theme_gradient)))}">
        ${vid && CX.safeUrl(cur.media_url) ? html`<video src="${CX.safeUrl(cur.media_url)}" muted autoplay loop playsinline></video>` : u ? html`<img src="${u}" alt=""/>` : ''}
        <span class="ads-phone-l">Sponsored${cur.advertiser ? ' · ' + cur.advertiser : ''}</span><span class="ads-phone-k">Skip</span>
        <div class="ads-phone-b"><b>${cur.headline || 'Your headline'}</b>${cur.sub_text ? html`<small>${cur.sub_text}</small>` : ''}${cur.cta_text ? html`<em>${cur.cta_text} →</em>` : ''}</div></div></div>`;
    }

    function save(wrap) {
      var f = wrap._current();
      if (!f.advertiser) { toast('Name the advertiser', 'warn'); var a = $('[name="advertiser"]', wrap); if (a) a.focus(); return false; }
      if (f.cta_url && !REG.safeHref(f.cta_url)) { toast('That link is not usable', 'warn'); return false; }
      if (f.start_date && f.end_date && f.end_date < f.start_date) { toast('The end date is before the start date', 'warn'); return false; }
      var slots = c.format === 'poster' ? ['dashboard.welcome'] : mode === 'pick' ? Object.keys(chosen) : [];
      if (c.format !== 'poster' && mode === 'pick' && !slots.length) { toast('Choose at least one placement', 'warn'); return false; }
      var pagesT = c.format === 'poster' ? ['dashboard'] : mode === 'auto' ? ['all'] : slots.map(function (id) { return REG.slot(id).page; }).filter(function (p, i, a) { return a.indexOf(p) === i; });
      var row = {
        advertiser: f.advertiser, format: c.format, headline: f.headline || null, sub_text: f.sub_text || null,
        cta_text: f.cta_text || 'Learn more', cta_url: REG.safeHref(f.cta_url) || '#', tag: f.tag || 'Sponsored', price_display: f.price_display || null,
        media_url: f.media_url || null, poster_url: f.poster_url || null, theme_gradient: f.theme_gradient || null,
        status: f.status || 'live', priority: n(f.priority) || 5, start_date: f.start_date || null, end_date: f.end_date || null,
        budget: f.budget === '' || f.budget == null ? null : n(f.budget), notes: f.notes || null,
        slots: slots, page_targets: pagesT
      };
      if (c.format === 'poster') { row.frequency = f.frequency || 'daily'; row.duration_s = n(f.duration_s) || 8; row.skip_after_s = f.skip_after_s === '' ? 3 : n(f.skip_after_s); }
      var qy = isNew
        ? CX.q('ad_campaigns').insert(Object.assign({ campaign_id: 'camp_' + Date.now().toString(36) + '_' + CX.uid().slice(0, 5) }, row)).select('id')
        : CX.q('ad_campaigns').update(row).eq('id', c.id).select('id');
      return CX.rows(qy).then(function (r) {
        CX.log(isNew ? 'campaign.create' : 'campaign.update', 'campaign', (r[0] || {}).id || c.id, { advertiser: row.advertiser, format: row.format, slots: row.slots, status: row.status });
        toast(isNew ? (row.status === 'live' ? 'Published. It reaches visitors within about three minutes.' : 'Saved as ' + row.status) : 'Saved', 'ok', { ms: 5000 });
        if (done) done();
      });
    }
  }

  function previewOnSite(c, slotId) {
    var places = slotsFor(c);
    var pick = slotId ? places.filter(function (x) { return x.slot.id === slotId; })[0] : places.filter(function (x) { return x.slot.kind !== 'managed'; })[0];
    if (!pick) { toast('This campaign has nowhere to run yet', 'warn'); return; }
    if (!c.id) { toast('Save first, then preview on the site', 'warn'); return; }
    var path = pick.surface.page === 'index' ? '/' : '/' + pick.surface.page;
    global.open(path + '?ad_preview=' + encodeURIComponent(c.id) + '&ad_slot=' + encodeURIComponent(pick.slot.id), '_blank', 'noopener');
  }

  function duplicate(c, done) {
    var copy = {};
    ['advertiser', 'format', 'headline', 'sub_text', 'cta_text', 'cta_url', 'tag', 'price_display', 'media_url', 'poster_url', 'theme_gradient', 'accent_color', 'priority', 'page_targets', 'slots', 'start_date', 'end_date', 'budget', 'notes', 'frequency', 'duration_s', 'skip_after_s']
      .forEach(function (k) { if (c[k] !== undefined) copy[k] = c[k]; });
    copy.status = 'draft'; copy.campaign_id = 'camp_' + Date.now().toString(36) + '_' + CX.uid().slice(0, 5);
    copy.headline = copy.headline ? copy.headline : null;
    return CX.rows(CX.q('ad_campaigns').insert(copy).select('id')).then(function (r) { CX.log('campaign.duplicate', 'campaign', (r[0] || {}).id, { from: c.id }); toast('Duplicated as a draft', 'ok'); if (done) done(); });
  }
  function setStatus(c, st, done) {
    return CX.rows(CX.q('ad_campaigns').update({ status: st }).eq('id', c.id).select('id')).then(function () { CX.log('campaign.' + st, 'campaign', c.id); toast(st === 'live' ? 'Live. Reaches visitors within about three minutes.' : 'Paused', 'ok'); if (done) done(); });
  }
  function remove(c, done) {
    return confirm({ title: 'Delete “' + (c.advertiser || 'campaign') + '”?', tone: 'danger', confirm: 'Delete', icon: 'trash', body: 'It leaves every placement at once. Its statistics stay in the audit trail. Pausing keeps it for later.',
      onConfirm: function () { return CX.rows(CX.q('ad_campaigns').delete().eq('id', c.id).select('id')).then(function () { CX.log('campaign.delete', 'campaign', c.id, { advertiser: c.advertiser }); toast('Deleted', 'ok'); if (done) done(); }); } });
  }

  /* ════════════════════════════════════════════════════════════════
     SECRET AD EDITOR
     ════════════════════════════════════════════════════════════════ */
  var AREAS = ['Westlands', 'Parklands', 'Kilimani', 'Lavington', 'Kileleshwa', 'Hurlingham', 'Upper Hill', 'CBD', 'Karen', 'Langata', 'Runda', 'Gigiri', 'Muthaiga', 'Ruaka', 'Kasarani', 'Thika Road', 'Nairobi', 'Mombasa', 'Diani', 'Naivasha', 'Nakuru', 'Kisumu', 'Kampala', 'Kigali', 'Dar es Salaam', 'Zanzibar', 'Lagos', 'Accra'];
  function secretSurfaces() { return (REG ? REG.SURFACES : []).filter(function (s) { return s.shadow; }); }
  function secretEditor(a0, done) {
    var a = Object.assign({ status: 'live', position: 'auto', style: 'glass', device: 'all', intent_min: 10, intent_max: 90, min_dwell_s: 8, min_scroll_pct: 15, max_per_session: 1, cooldown_s: 120, dwell_show_s: 8, priority: 5, cta_text: 'View', theme_gradient: 'linear-gradient(135deg,#7C3AFF,#4F6DFF)', accent: '#FFFFFF' }, a0 || {});
    var isNew = !a.id, media = { media_url: a.media_url || '', poster_url: a.poster_url || '', info: null };
    var surfs = secretSurfaces(), labelOf = {}, pageOf = {};
    surfs.forEach(function (s) { labelOf[s.page] = s.label; pageOf[s.label] = s.page; });
    var chosenS = (a.surfaces || ['all']).indexOf('all') !== -1 ? ['All service pages'] : (a.surfaces || []).map(function (p) { return labelOf[p] || p; });
    var fields = [
      { name: 'advertiser', label: 'Advertiser', required: true, value: a.advertiser },
      { name: 'title', label: 'Internal name', value: a.title, placeholder: 'e.g. Java House · lunch push' },
      { name: 'headline', label: 'Headline', value: a.headline, full: true },
      { name: 'sub_text', label: 'Supporting line', value: a.sub_text, full: true },
      { name: 'cta_text', label: 'Button', value: a.cta_text },
      { name: 'cta_url', label: 'Link', value: a.cta_url, placeholder: 'https://… or /food' },
      { name: 'theme_gradient', label: 'Background', value: a.theme_gradient },
      { name: 'accent', label: 'Timer bar colour', value: a.accent, placeholder: '#FFFFFF' }
    ];
    var targeting = [
      { name: 'surfaces', label: 'Pages', type: 'chips', full: true, options: ['All service pages'].concat(surfs.map(function (s) { return s.label; })), value: chosenS },
      { name: 'position', label: 'Entrance', type: 'select', value: a.position, options: [['auto', 'Automatic (least intrusive per device)'], ['rise', 'Rise from the bottom corner'], ['side', 'Slide in from the side'], ['bottom', 'Slide up from the bottom'], ['top', 'Drop from the top']] },
      { name: 'device', label: 'Devices', type: 'select', value: a.device, options: [['all', 'All devices'], ['mobile', 'Phones'], ['desktop', 'Computers'], ['tablet', 'Tablets']] },
      { name: 'min_dwell_s', label: 'After seconds on page', type: 'number', min: 0, value: a.min_dwell_s },
      { name: 'min_scroll_pct', label: 'After scrolling (%)', type: 'number', min: 0, max: 100, value: a.min_scroll_pct },
      { name: 'intent_min', label: 'Intent from', type: 'number', min: 0, max: 100, value: a.intent_min, help: '0 = just looking, 100 = about to book' },
      { name: 'intent_max', label: 'Intent up to', type: 'number', min: 0, max: 100, value: a.intent_max, help: 'Keep below 100 to stay out of the way of people booking.' },
      { name: 'reading_modes', label: 'Reading modes', type: 'chips', full: true, options: ['skim', 'scan', 'browse', 'read'], value: a.reading_modes || ['skim', 'scan', 'browse', 'read'] },
      { name: 'areas', label: 'Areas', type: 'chips', full: true, options: ['All areas'].concat(AREAS), value: (a.areas || ['all']).map(function (x) { return x === 'all' ? 'All areas' : x; }) },
      { name: 'keywords', label: 'Only when the page mentions', value: (a.keywords || []).join(', '), full: true, placeholder: 'comma, separated (optional)' }
    ];
    var pacing = [
      { name: 'dwell_show_s', label: 'Stays for (seconds)', type: 'number', min: 4, max: 30, value: a.dwell_show_s },
      { name: 'max_per_session', label: 'Times per visit', type: 'number', min: 1, max: 10, value: a.max_per_session },
      { name: 'cooldown_s', label: 'Gap between secret ads (s)', type: 'number', min: 20, value: a.cooldown_s },
      { name: 'priority', label: 'Priority', type: 'number', min: 1, max: 10, value: a.priority },
      { name: 'status', label: 'Status', type: 'select', value: a.status, options: [['live', 'Live'], ['paused', 'Paused'], ['draft', 'Draft']] },
      { name: 'budget', label: 'Budget (KES)', type: 'number', value: a.budget },
      { name: 'start_date', label: 'Starts', type: 'date', value: a.start_date },
      { name: 'end_date', label: 'Ends', type: 'date', value: a.end_date },
      { name: 'apa_enabled', type: 'switch', label: 'Let the Cabana assistant mention it', value: !!a.apa_enabled, full: true, help: 'When a guest asks the assistant something related, it may bring this up once.' },
      { name: 'apa_message', label: 'What the assistant may say', type: 'textarea', rows: 2, value: a.apa_message }
    ];
    var all = fields.concat(targeting, pacing);
    var style = a.style;
    return CX.modal({ title: isNew ? 'New secret ad' : 'Edit secret ad', sub: 'It stays hidden until a visitor has settled in, slides in at the edge for a few seconds, and never covers what they are using.', icon: 'layers', wide: 'x',
      body: html`<div class="ads-ed"><div class="ads-ed-l">
          <div class="form-sec" style="margin-top:0">1 · Creative</div><div data-media></div>
          <div class="form-sec">2 · Look</div>${CX.seg([['glass', 'Glass card'], ['photo', 'Full photo'], ['minimal', 'Minimal']], style, 'data-style')}
          <div class="form-sec">3 · Words and link</div><form class="form-grid" onsubmit="return false">${fields.map(CX.fieldHTML)}</form>
          <div class="form-sec">4 · Who sees it, and when</div><form class="form-grid" onsubmit="return false">${targeting.map(CX.fieldHTML)}</form>
          <div class="form-sec">5 · Pacing and schedule</div><form class="form-grid" onsubmit="return false">${pacing.map(CX.fieldHTML)}</form>
        </div><div class="ads-ed-r">
          <div class="dr-sec-t" style="margin-top:0">Preview</div>
          <div class="ads-secret-pv" data-pv></div>
          <div class="btn-row mt"><button type="button" class="btn btn-g btn-sm" data-here>${icon('eye')}Play it here</button><button type="button" class="btn btn-g btn-sm" data-site>${icon('external')}On the site</button></div>
          <div class="note mt">Secret ads obey the page rules: never on checkout or sign-in, never over an open dialog or while someone types, never at the same time as another overlay, and one dismissal silences them for the visit.</div>
        </div></div>`,
      actions: [{ label: 'Cancel', kind: 'btn-q' }, { label: isNew ? 'Publish' : 'Save changes', kind: 'btn-p', icon: 'check', onClick: function (wrap) {
        var f = CX.readForm(wrap, all); if (!f) return false;
        if (f.cta_url && !(REG && REG.safeHref(f.cta_url))) { toast('That link is not usable', 'warn'); return false; }
        var sp = (f.surfaces || []);
        var surfaces = !sp.length || sp.indexOf('All service pages') !== -1 ? ['all'] : sp.map(function (l) { return pageOf[l] || l; });
        var areas = (f.areas || []).map(function (x) { return x === 'All areas' ? 'all' : x; });
        var row = {
          advertiser: f.advertiser, title: f.title || f.advertiser, headline: f.headline || null, sub_text: f.sub_text || null, cta_text: f.cta_text || 'View', cta_url: REG.safeHref(f.cta_url) || null,
          theme_gradient: f.theme_gradient || null, accent: f.accent || null, media_url: media.media_url || null, poster_url: media.poster_url || null, style: style,
          surfaces: surfaces, position: f.position, device: f.device, min_dwell_s: n(f.min_dwell_s), min_scroll_pct: n(f.min_scroll_pct),
          intent_min: n(f.intent_min), intent_max: f.intent_max === '' ? 100 : n(f.intent_max), reading_modes: (f.reading_modes || []).length ? f.reading_modes : ['skim', 'scan', 'browse', 'read'],
          areas: areas.length && areas.indexOf('all') === -1 ? areas : ['all'], keywords: String(f.keywords || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean),
          dwell_show_s: n(f.dwell_show_s) || 8, max_per_session: n(f.max_per_session) || 1, cooldown_s: n(f.cooldown_s) || 120, priority: n(f.priority) || 5,
          status: f.status, budget: f.budget === '' ? null : n(f.budget), start_date: f.start_date || null, end_date: f.end_date || null,
          apa_enabled: !!f.apa_enabled, apa_message: f.apa_message || null
        };
        var qy = isNew ? CX.q('shadow_ads').insert(row).select('id') : CX.q('shadow_ads').update(row).eq('id', a.id).select('id');
        return CX.rows(qy).then(function (r) { CX.log(isNew ? 'shadow.create' : 'shadow.update', 'shadow_ad', (r[0] || {}).id || a.id, { advertiser: row.advertiser, surfaces: row.surfaces }); toast(isNew ? 'Secret ad published' : 'Saved', 'ok'); if (done) done(); });
      } }],
      onOpen: function (wrap) {
        CX.wireChips(wrap);
        mediaField($('[data-media]', wrap), media, { prefix: 'secret', format: function () { return null; }, onChange: pv });
        $$('[data-style]', wrap).forEach(function (b) { b.onclick = function () { style = b.getAttribute('data-style'); $$('[data-style]', wrap).forEach(function (x) { x.classList.toggle('on', x === b); }); pv(); }; });
        function cur() { var f = {}; $$('[name]', wrap).forEach(function (el) { if (el.name && el.type !== 'file') f[el.name] = el.value; }); f.media_url = media.media_url; f.poster_url = media.poster_url; f.style = style; f.media_type = /\.(mp4|webm|mov|m4v)(\?|$)/i.test(media.media_url || '') ? 'video' : 'image'; return f; }
        function pv() {
          var x = cur(), u = CX.safeUrl(x.media_url), vid = x.media_type === 'video';
          var m = u ? (vid ? html`<video src="${u}" muted autoplay loop playsinline></video>` : html`<img src="${u}" alt=""/>`) : '';
          set($('[data-pv]', wrap), html`<div class="ads-sa ${'ads-sa-' + style}" style="--bg:${raw(CX.esc(cssBg(x.theme_gradient)))}">${style === 'glass' ? html`<div class="ads-sa-t">${m}</div>` : style === 'photo' ? html`<div class="ads-sa-m">${m}</div>` : ''}
            <div class="ads-sa-b"><div class="ads-sa-k">Sponsored${x.advertiser ? ' · ' + x.advertiser : ''}</div><b>${x.headline || 'Your headline'}</b>${x.sub_text ? html`<small>${x.sub_text}</small>` : ''}<span class="ads-sa-c">${x.cta_text || 'View'} →</span></div></div>`);
        }
        $$('input,select,textarea', wrap).forEach(function (el) { el.addEventListener('input', CX.debounce(pv, 160)); });
        $('[data-here]', wrap).onclick = function () {
          if (!global.ApaShadow || !global.ApaShadow.preview) { toast('Secret ad preview did not load', 'warn'); return; }
          var x = cur(); global.ApaShadow.preview(Object.assign({}, x, { dwell_show_s: 12 }), x.position === 'auto' ? null : x.position);
        };
        $('[data-site]', wrap).onclick = function () {
          var x = cur(), sp = $$('[data-chips="surfaces"] .chip.on', wrap).map(function (c) { return c.getAttribute('data-v'); });
          var page = sp.length && sp.indexOf('All service pages') === -1 ? (pageOf[sp[0]] || 'apartments') : 'apartments';
          var keep = { advertiser: x.advertiser, headline: x.headline, sub_text: x.sub_text, cta_text: x.cta_text, cta_url: x.cta_url, media_url: x.media_url, poster_url: x.poster_url, media_type: x.media_type, theme_gradient: x.theme_gradient, accent: x.accent, style: x.style, position: x.position };
          global.open('/' + (page === 'index' ? '' : page) + '?shadow_preview=' + encodeURIComponent(JSON.stringify(keep)), '_blank', 'noopener');
        };
        pv();
      } });
  }

  /* ════════════════════════════════════════════════════════════════
     VIEW
     ════════════════════════════════════════════════════════════════ */
  var AUD = null, AUD_AT = 0;
  function audience(force) {
    if (!global.ApaAudience) return Promise.reject(new Error('The audience module did not load.'));
    if (AUD && !force && Date.now() - AUD_AT < 5 * 60000) return Promise.resolve(AUD);
    return global.ApaAudience.build(30).then(function (a) { AUD = a; AUD_AT = Date.now(); return a; });
  }

  var TABS = [['overview', 'Overview'], ['placements', 'Placements'], ['campaigns', 'Campaigns'], ['secret', 'Secret ads'], ['poster', 'Welcome poster'], ['rules', 'Rules'], ['rate', 'Rate card'], ['visitors', 'Visitors']];
  var LEDE = 'Every ad placement on Cabana, what runs in it, and whether it is working right now.';

  CX.view('ads', {
    title: 'Advertising',
    render: function (v) {
      var tab = v.q.tab || 'overview';
      if (!REG) { set(v.el, html`${pageHd('Growth', 'Advertising', LEDE)}${CX.errorBox(new Error('The placement registry (apa-ad-registry.js) did not load.'))}`); return; }
      set(v.el, html`${pageHd('Growth', 'Advertising', LEDE)}${CX.skeleton(tab === 'overview' ? 'kpis' : 'list')}`);
      var needAud = tab === 'rate' || tab === 'visitors';
      return Promise.all([load(v.q.fresh), needAud ? audience() : Promise.resolve(null)]).then(function (r) {
        if (!v.alive()) return;
        var d = r[0] || {}, a = r[1];
        d.campaigns = d.campaigns || []; d.shadow = d.shadow || []; d.health = d.health || [];
        var probs = problems(d);
        var reload = function () { CX.freshen(); v.refresh(); };
        var heads = {
          overview: html`<button class="btn btn-g" data-new-secret>${icon('layers')}Secret ad</button><button class="btn btn-p" data-new>${icon('plus')}New campaign</button>`,
          placements: html`<button class="btn btn-g" data-refresh>${icon('refresh')}Refresh</button>`,
          campaigns: html`<button class="btn btn-p" data-new>${icon('plus')}New campaign</button>`,
          secret: html`<button class="btn btn-p" data-new-secret>${icon('plus')}New secret ad</button>`,
          poster: html`<button class="btn btn-p" data-new-poster>${icon('plus')}New welcome poster</button>`,
          rate: html`<button class="btn btn-g" data-exp>${icon('download')}Rate card CSV</button>`
        };
        var tabs = CX.tabs(TABS.map(function (t) {
          var cnt = t[0] === 'placements' ? (probs.filter(function (p) { return p.slot; }).length || null) : t[0] === 'campaigns' ? d.campaigns.filter(function (c) { return c.format !== 'poster'; }).length : t[0] === 'secret' ? d.shadow.length : null;
          return [t[0], t[1], cnt, t[0] === 'placements'];
        }), tab);
        var head = pageHd('Growth', 'Advertising', LEDE, heads[tab] || '');
        var body = '';
        if (tab === 'overview') body = overview(d, probs);
        else if (tab === 'placements') body = placements(d, v.q);
        else if (tab === 'campaigns') body = campaigns(d, v.q, false);
        else if (tab === 'poster') body = campaigns(d, v.q, true);
        else if (tab === 'secret') body = secrets(d);
        else if (tab === 'rules') body = rules(d);
        else if (tab === 'rate') body = rateCard(a);
        else body = visitors(a);
        set(v.el, html`${head}${tabs}${body}`);
        wireTabs(v, 'overview');
        wire(v, d, a, reload);
        if (tab === 'overview') chart(v, d);
      });
    }
  });

  function overview(d, probs) {
    var S = REG.mergePolicy(d.settings);
    var live = d.campaigns.filter(function (c) { return c.format !== 'poster' && stateOf(c).k === 'live'; });
    var tot = d.campaigns.reduce(function (s, c) { var t = c.stats || {}; s.served += n(t.served); s.viewable += n(t.viewable); s.clicks += n(t.clicks); return s; }, { served: 0, viewable: 0, clicks: 0 });
    var posters = d.campaigns.filter(function (c) { return c.format === 'poster' && stateOf(c).k === 'live'; });
    var secretsLive = d.shadow.filter(function (x) { return x.status === 'live' && x.active; });
    var slotsAll = []; REG.SURFACES.forEach(function (s) { s.slots.forEach(function (sl) { slotsAll.push(sl); }); });
    var liveSlots = slotsAll.filter(function (sl) { var h = healthOf(sl, d); return h.h && (h.h.state === 'live' || h.h.state === 'house') && h.tone !== 'p-warn'; }).length;
    var attention = d.campaigns.map(function (c) { return { c: c, iss: issuesOf(c) }; }).filter(function (x) { return stateOf(x.c).k === 'live' && x.iss.length; });
    var top = d.campaigns.filter(function (c) { return n((c.stats || {}).served); }).sort(function (x, y) { return n((y.stats || {}).viewable) - n((x.stats || {}).viewable); }).slice(0, 6);
    return html`
      <div class="ads-switchbar ${S.enabled === false ? 'off' : ''}">
        <div class="row" style="gap:12px"><span class="ads-orb"></span><div><div class="strong">${S.enabled === false ? 'Ads are OFF across Cabana' : 'Ads are running across Cabana'}</div>
        <div class="muted" style="font-size:12.5px">${S.enabled === false ? 'Nothing sponsored shows anywhere. Placements stay reserved.' : num(live.length) + ' live campaign' + (live.length === 1 ? '' : 's') + ' · ' + num(liveSlots) + ' of ' + num(slotsAll.length) + ' placements filling · max ' + S.max_units + ' units a page, ' + S.min_gap + 'px apart'}</div></div></div>
        <label class="switch" title="Master switch"><input type="checkbox" data-master ${S.enabled === false ? '' : raw('checked')}/><span></span></label>
      </div>
      ${probs.length ? html`<div class="callout bad mb">${icon('alert')}<div class="grow"><div class="strong">${num(probs.length)} thing${probs.length === 1 ? '' : 's'} need${probs.length === 1 ? 's' : ''} you</div>
          <div class="col mt-s" style="gap:4px;font-size:12.5px">${probs.slice(0, 6).map(function (p) { return p.slot ? html`<div><b>${p.surface.label} · ${p.slot.label}</b> — ${p.health.label}. ${p.health.detail}</div>` : html`<div><b>${p.campaign.advertiser}</b> — ${p.text}</div>`; })}</div>
          <button class="btn btn-sm btn-g mt-s" data-go="placements">Open placements</button></div></div>`
        : html`<div class="callout ok mb">${icon('check')}<div><div class="strong">Every placement is reporting normally</div><div class="muted" style="font-size:12.5px">Pages report what they mount. A slot that disappears in a redesign shows up here the same day.</div></div></div>`}
      <div class="grid g4 mb">
        <div class="mini"><div class="mini-l">Live campaigns</div><div class="mini-v">${num(live.length)}</div><div class="mini-s">${num(d.campaigns.filter(function (c) { return c.format !== 'poster'; }).length)} in total</div></div>
        <div class="mini"><div class="mini-l">Served · 30 days</div><div class="mini-v">${compact(tot.served)}</div><div class="mini-s">${compact(tot.viewable)} viewable · ${CX.pct(CX.ratio(tot.viewable, tot.served))}</div></div>
        <div class="mini"><div class="mini-l">Clicks · 30 days</div><div class="mini-v">${num(tot.clicks)}</div><div class="mini-s">${CX.pct(CX.ratio(tot.clicks, tot.viewable))} of viewable</div></div>
        <div class="mini"><div class="mini-l">Secret ads · Poster</div><div class="mini-v">${num(secretsLive.length)} · ${posters.length ? 'On' : 'Off'}</div><div class="mini-s">${posters.length ? posters[0].advertiser + ' greets arrivals' : 'No welcome poster live'}</div></div>
      </div>
      <div class="split">
        <div class="card"><div class="card-hd"><div><div class="card-t">Delivery · last 30 days</div><div class="card-s">Served, viewable (50% on screen for 1s, 2s for video) and clicks.</div></div></div><div id="ads-chart" class="chart"></div><div id="ads-legend" class="legend mt-s"></div></div>
        <div class="card"><div class="card-hd"><div><div class="card-t">Needs a look</div><div class="card-s">Live campaigns with something off.</div></div></div>
          ${attention.length ? html`<div class="col" style="gap:10px">${attention.slice(0, 7).map(function (x) { return html`<div class="ads-att">${thumb(x.c)}<div class="grow"><div class="strong">${x.c.advertiser}</div>${x.iss.map(function (i) { return html`<div class="t-sub ${i.tone === 'bad' ? 'bad-t' : ''}">${i.t}</div>`; })}</div><button class="btn btn-sm btn-g" data-edit="${x.c.id}">Fix</button></div>`; })}</div>`
            : CX.empty('Nothing needs you', 'Every live campaign has media, a working link and somewhere to run.', 'check', true)}
        </div>
      </div>
      <div class="card flush mt"><div class="card-hd" style="padding:16px 18px 0"><div><div class="card-t">Top campaigns</div><div class="card-s">By viewable impressions, last 30 days.</div></div></div>
        ${top.length ? html`<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Campaign</th><th>Format</th><th class="num">Served</th><th class="num">Viewable</th><th class="num">Clicks</th><th class="num">CTR</th></tr></thead><tbody>${top.map(function (c) { var t = c.stats || {}; return html`
          <tr><td><div class="cell">${thumb(c)}<div><div class="t-main">${c.advertiser}</div><div class="t-sub">${c.headline || ''}</div></div></div></td><td>${REG.FORMATS[c.format] ? REG.FORMATS[c.format].label : c.format}</td><td class="num">${num(t.served)}</td><td class="num">${num(t.viewable)}</td><td class="num">${num(t.clicks)}</td><td class="num">${CX.pct(CX.ratio(t.clicks, t.viewable))}</td></tr>`; })}</tbody></table></div>`
          : html`<div style="padding:18px">${CX.empty('No delivery recorded yet', 'Numbers appear as visitors see ads.', 'chart')}</div>`}</div>`;
  }
  function chart(v, d) {
    var days = [], idx = {}; for (var i = 29; i >= 0; i--) { var dd = new Date(Date.now() - i * 864e5); var k = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Nairobi' }).format(dd); idx[k] = days.length; days.push({ d: k, served: 0, viewable: 0, clicks: 0 }); }
    (d.daily || []).forEach(function (x) { var k = String(x.d).slice(0, 10); if (idx[k] != null) { days[idx[k]].served = n(x.served); days[idx[k]].viewable = n(x.viewable); days[idx[k]].clicks = n(x.clicks); } });
    var sets = [{ name: 'Served', color: 'var(--c1)', values: days.map(function (x) { return x.served; }) }, { name: 'Viewable', color: 'var(--ok)', values: days.map(function (x) { return x.viewable; }), fill: false }, { name: 'Clicks', color: 'var(--warn)', values: days.map(function (x) { return x.clicks; }), fill: false }];
    CX.lineChart($('#ads-chart', v.el), { labels: days.map(function (x) { return x.d; }), series: sets, height: 230, tickFmt: fshort, tipLabel: fdate, axis: compact, label: 'Ad delivery' });
    set($('#ads-legend', v.el), html`${sets.map(function (s) { return html`<span><i style="background:${raw(s.color)}"></i>${s.name} · <b class="tnum">${num(s.values.reduce(function (a, b) { return a + b; }, 0))}</b></span>`; })}`);
  }

  function slotStats(d, id) { return (d.slots || []).filter(function (x) { return x.slot === id; })[0] || { served: 0, viewable: 0, clicks: 0 }; }
  var KIND = { infeed: 'In results', section: 'After content', fixed: 'Fixed spot', overlay: 'Corner card', takeover: 'Full screen', managed: 'Page-managed' };
  function placements(d) {
    return html`<div class="note mb">Each page reports every placement it mounts — or fails to — straight from visitors’ browsers. <b>Broken</b> means the page no longer has the spot the slot hangs on (usually a redesign): tell the developer the slot id. <b>Waiting</b> is normal: the visitor had not scrolled that far. <b>Held by rules</b> means the anti-clutter rules kept it out that visit.</div>
      <div class="ads-surfaces">${REG.SURFACES.map(function (s) {
        var secretH = (d.health || []).filter(function (x) { return x.page === s.page && x.slot === s.page + '.secret'; })[0];
        var secretN = d.shadow.filter(function (x) { return x.status === 'live' && ((x.surfaces || ['all']).indexOf('all') !== -1 || (x.surfaces || []).indexOf(s.page) !== -1); }).length;
        return html`<div class="card ads-surface"><div class="card-hd"><div><div class="card-t">${s.label} ${s.locked ? html`<span class="tag">Fixed layout</span>` : ''}</div><div class="card-s"><a href="${s.page === 'index' ? '/' : '/' + s.page}" target="_blank" rel="noopener">cabana.africa${s.page === 'index' ? '/' : '/' + s.page}</a>${s.note ? ' · ' + s.note : ''}</div></div></div>
          <div class="col" style="gap:8px">${s.slots.map(function (sl) {
            var hh = healthOf(sl, d), st = slotStats(d, sl.id);
            var names = hh.cands.slice(0, 4).map(function (x) { return x.c.advertiser + (x.fit === 'adapted' ? '*' : ''); });
            return html`<div class="ads-slot ${hh.level === 2 ? 'bad' : hh.level === 1 ? 'warn' : ''}">
              <div class="ads-slot-hd"><span class="pill dot ${hh.tone}">${hh.label}</span><b>${sl.label}</b><span class="tag">${KIND[sl.kind] || sl.kind}</span><span class="mono t-sub">${sl.id}</span>
                <span class="grow"></span>${sl.kind !== 'managed' ? html`<label class="switch" title="${hh.off ? 'Switch on' : 'Switch off'}"><input type="checkbox" data-slot-toggle="${sl.id}" ${hh.off ? '' : raw('checked')}/><span></span></label>` : ''}</div>
              <div class="ads-slot-b"><div class="grow"><div class="t-sub">Accepts ${sl.formats.map(function (f) { return REG.FORMATS[f].label; }).join(', ')}${sl.house ? ' · Cabana promo when unsold' : ''}</div>
                <div class="mt-s" style="font-size:12.5px">${sl.kind === 'takeover' ? (hh.cands.length ? html`Poster: <b>${names.join(', ')}</b>` : html`<span class="muted">No poster live. The Cabana splash plays.</span>`)
                  : names.length ? html`Running: <b>${names.join(', ')}</b>${hh.cands.length > 4 ? ' +' + (hh.cands.length - 4) : ''}` : html`<span class="muted">${sl.house ? 'Nothing sold. A Cabana promo fills it.' : 'Nothing targets it.'}</span>`}</div>
                ${hh.detail ? html`<div class="t-sub mt-s">${hh.detail}${hh.h ? ' · reported ' + ago(hh.h.last_seen) : ''}</div>` : ''}</div>
                <div class="ads-slot-n"><span><b>${compact(st.served)}</b>served</span><span><b>${compact(st.viewable)}</b>viewable</span><span><b>${num(st.clicks)}</b>clicks</span></div>
                ${hh.cands.length && sl.kind !== 'managed' && sl.kind !== 'takeover' ? html`<button class="btn btn-sm btn-g" data-pv-slot="${sl.id}" data-pv-c="${hh.cands[0].c.id}" title="Open the page with this placement filled">${icon('external')}</button>` : ''}
              </div></div>`; })}
            ${s.shadow ? html`<div class="ads-slot"><div class="ads-slot-hd"><span class="pill dot ${secretH ? (STATE[secretH.state] || ['', 'p-mute'])[1] : 'p-mute'}">${secretH ? (STATE[secretH.state] || [human(secretH.state)])[0] : 'No report yet'}</span><b>Secret ads</b><span class="tag">Edge card</span><span class="mono t-sub">${s.page}.secret</span></div>
              <div class="ads-slot-b"><div class="grow t-sub">${num(secretN)} live secret ad${secretN === 1 ? '' : 's'} may appear here${secretH && secretH.detail ? ' · ' + secretH.detail + ' · ' + ago(secretH.last_seen) : ''}</div></div></div>` : ''}
          </div></div>`; })}</div>
      <div class="muted mt" style="font-size:12px">* adapted: a campaign in another format that the slot can present well.</div>`;
  }

  function campaigns(d, q, posterMode) {
    var list = d.campaigns.filter(function (c) { return posterMode ? c.format === 'poster' : c.format !== 'poster'; });
    var f = q.f || 'all', term = String(q.s || '').toLowerCase();
    var counts = { all: list.length }; list.forEach(function (c) { var k = stateOf(c).k; counts[k] = (counts[k] || 0) + 1; });
    var shown = list.filter(function (c) { return (f === 'all' || stateOf(c).k === f) && (!term || (String(c.advertiser) + ' ' + String(c.headline || '')).toLowerCase().indexOf(term) !== -1); });
    var intro = posterMode ? html`<div class="callout info mb">${icon('image')}<div><div class="strong">The welcome poster</div><div class="muted" style="font-size:12.5px">When a poster is live, it greets members full screen as their dashboard opens, instead of the Cabana splash — once per device, per day, per visit or every time, as you choose. It is skippable, never shows to someone returning from a service page, and steps aside for reduced motion. With no poster live, the dashboard is exactly as it was.</div></div></div>` : '';
    return html`${intro}
      <div class="row between mb" style="gap:10px;flex-wrap:wrap">${CX.seg([['all', 'All · ' + (counts.all || 0)], ['live', 'Live · ' + (counts.live || 0)], ['scheduled', 'Scheduled · ' + (counts.scheduled || 0)], ['paused', 'Paused · ' + (counts.paused || 0)], ['draft', 'Drafts · ' + (counts.draft || 0)], ['ended', 'Ended · ' + (counts.ended || 0)]], f, 'data-filter')}
        <input class="inp" style="max-width:260px" placeholder="Search advertisers" data-search value="${q.s || ''}"/></div>
      ${shown.length ? html`<div class="card flush"><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Campaign</th><th>Format · where</th><th>Schedule</th><th class="num">Served</th><th class="num">Viewable</th><th class="num">CTR</th><th>Status</th><th></th></tr></thead><tbody>${shown.map(function (c) {
        var s = stateOf(c), t = c.stats || {}, places = slotsFor(c), iss = issuesOf(c);
        return html`<tr>
          <td><div class="cell">${thumb(c)}<div><div class="t-main">${c.advertiser || 'Untitled'}</div><div class="t-sub trunc" style="max-width:280px">${c.headline || '—'}</div>${iss.filter(function (i) { return i.tone !== 'info'; }).length ? html`<div class="t-sub ${iss.some(function (i) { return i.tone === 'bad'; }) ? 'bad-t' : 'warn-t'}">${icon('alert')} ${iss.filter(function (i) { return i.tone !== 'info'; })[0].t}</div>` : ''}</div></div></td>
          <td><div class="t-main">${REG.FORMATS[c.format] ? REG.FORMATS[c.format].label : c.format}</div><div class="t-sub">${(c.slots || []).length ? num(places.length) + ' chosen placement' + (places.length === 1 ? '' : 's') : num(places.length) + ' placements (everywhere it fits)'}</div></td>
          <td class="t-sub">${c.start_date ? fdate(c.start_date) : 'Now'} → ${c.end_date ? fdate(c.end_date) : 'open'}</td>
          <td class="num">${num(t.served)}</td><td class="num">${num(t.viewable)}</td><td class="num">${CX.pct(CX.ratio(t.clicks, t.viewable))}</td>
          <td><span class="pill dot ${s.tone}">${s.label}</span></td>
          <td><div class="t-act"><button class="btn btn-sm btn-g" data-edit="${c.id}">${icon('edit')}Edit</button>
            <button class="btn btn-sm btn-g" data-status="${c.id}" data-to="${c.status === 'live' ? 'paused' : 'live'}">${c.status === 'live' ? 'Pause' : 'Go live'}</button>
            <button class="btn btn-sm btn-q btn-icon" data-more="${c.id}" title="More">${icon('more')}</button></div></td></tr>`; })}</tbody></table></div></div>`
        : html`<div class="card">${CX.empty(posterMode ? 'No welcome poster yet' : list.length ? 'Nothing matches' : 'No campaigns yet', posterMode ? 'Create one and it greets members the moment their dashboard opens.' : 'Create one: drop the creative, pick a format, publish.', posterMode ? 'image' : 'megaphone')}</div>`}`;
  }

  function secrets(d) {
    var list = d.shadow;
    var imp = list.reduce(function (s, x) { return s + n(x.impressions); }, 0), clk = list.reduce(function (s, x) { return s + n(x.clicks); }, 0), dis = list.reduce(function (s, x) { return s + n(x.dismissals); }, 0);
    return html`<div class="grid g4 mb">
        <div class="mini"><div class="mini-l">Live secret ads</div><div class="mini-v">${num(list.filter(function (x) { return x.status === 'live' && x.active; }).length)}</div><div class="mini-s">${num(list.length)} in total</div></div>
        <div class="mini"><div class="mini-l">Shown</div><div class="mini-v">${num(imp)}</div><div class="mini-s">all time</div></div>
        <div class="mini"><div class="mini-l">Click-through</div><div class="mini-v">${CX.pct(CX.ratio(clk, imp))}</div><div class="mini-s">${num(clk)} clicks</div></div>
        <div class="mini"><div class="mini-l">Dismissed</div><div class="mini-v">${CX.pct(CX.ratio(dis, imp))}</div><div class="mini-s">lower is better</div></div></div>
      ${list.length ? html`<div class="card flush"><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Secret ad</th><th>Pages · entrance</th><th>Trigger</th><th class="num">Shown</th><th class="num">CTR</th><th class="num">Dismissed</th><th>Status</th><th></th></tr></thead><tbody>${list.map(function (x) {
        var s = stateOf(x);
        return html`<tr><td><div class="cell">${thumb({ media_url: x.media_url, poster_url: x.poster_url, theme_gradient: x.theme_gradient, media_kind: x.media_type })}<div><div class="t-main">${x.advertiser}</div><div class="t-sub trunc" style="max-width:260px">${x.headline || x.title || ''}</div></div></div></td>
          <td class="t-sub">${(x.surfaces || ['all']).indexOf('all') !== -1 ? 'All service pages' : (x.surfaces || []).map(function (p) { var sf = REG.surface(p); return sf ? sf.label : p; }).join(', ')} · ${human(x.position || 'auto')}</td>
          <td class="t-sub">${num(x.min_dwell_s)}s · ${num(x.min_scroll_pct)}% scroll · intent ${num(x.intent_min)}–${num(x.intent_max)}${(x.areas || ['all']).indexOf('all') === -1 ? ' · ' + (x.areas || []).join(', ') : ''}</td>
          <td class="num">${num(x.impressions)}</td><td class="num">${CX.pct(CX.ratio(x.clicks, x.impressions))}</td><td class="num">${CX.pct(CX.ratio(x.dismissals, x.impressions))}</td>
          <td><span class="pill dot ${s.tone}">${s.label}</span></td>
          <td><div class="t-act"><button class="btn btn-sm btn-g" data-sedit="${x.id}">${icon('edit')}Edit</button><button class="btn btn-sm btn-g" data-sstatus="${x.id}" data-to="${x.status === 'live' ? 'paused' : 'live'}">${x.status === 'live' ? 'Pause' : 'Go live'}</button><button class="btn btn-sm btn-q btn-icon" data-sdel="${x.id}" title="Delete">${icon('trash')}</button></div></td></tr>`; })}</tbody></table></div></div>`
        : html`<div class="card">${CX.empty('No secret ads yet', 'They stay hidden until a visitor has settled in, then slide in at the edge for a few seconds.', 'layers')}</div>`}`;
  }

  function rules(d) {
    var S = REG.mergePolicy(d.settings);
    return html`<div class="split"><div class="card pad-l"><div class="card-hd"><div><div class="card-t">How ads behave on the site</div><div class="card-s">The rules that keep the service first. Visitors get the change within about three minutes.${d.settings_at ? ' Last changed ' + ago(d.settings_at) + '.' : ''}</div></div></div>
        <form class="form-grid" onsubmit="return false" data-rules>
          ${CX.fieldHTML({ name: 'enabled', type: 'switch', label: 'Ads are on', value: S.enabled !== false, full: true, help: 'The master switch. Off hides every ad, poster and secret ad at once.' })}
          ${CX.fieldHTML({ name: 'fold_guard', type: 'switch', label: 'Keep the first screen of service pages ad-free', value: S.fold_guard !== false, full: true, help: 'Nobody has to scroll past an ad to reach the service. Strongly recommended.' })}
          ${CX.fieldHTML({ name: 'max_units', label: 'Most ad units on one page', type: 'number', min: 0, max: 6, value: S.max_units, help: 'Corner cards and secret ads are counted separately.' })}
          ${CX.fieldHTML({ name: 'min_gap', label: 'Real content between two units (px)', type: 'number', min: 300, max: 3000, step: 50, value: S.min_gap, help: 'About one phone screen is 700px.' })}
          <div class="form-sec full">Inside results</div>
          ${CX.fieldHTML({ name: 'infeed_first', label: 'First after this many results', type: 'number', min: 3, max: 30, value: S.infeed.first, help: 'Rounded up to a full row.' })}
          ${CX.fieldHTML({ name: 'infeed_every', label: 'Then every', type: 'number', min: 6, max: 60, value: S.infeed.every })}
          ${CX.fieldHTML({ name: 'infeed_max', label: 'At most', type: 'number', min: 0, max: 4, value: S.infeed.max, help: '0 turns in-results ads off.' })}
          <div class="form-sec full">Overlays</div>
          ${CX.fieldHTML({ name: 'sticky_enabled', type: 'switch', label: 'Corner cards', value: S.sticky.enabled !== false })}
          ${CX.fieldHTML({ name: 'sticky_delay', label: 'Corner card appears after (s)', type: 'number', min: 8, max: 120, value: S.sticky.delay_s })}
          ${CX.fieldHTML({ name: 'shadow_enabled', type: 'switch', label: 'Secret ads', value: S.shadow.enabled !== false })}
          ${CX.fieldHTML({ name: 'poster_enabled', type: 'switch', label: 'Welcome poster', value: S.poster.enabled !== false })}
          ${CX.fieldHTML({ name: 'house_ads', type: 'switch', label: 'Fill unsold end-of-page spots with Cabana promos', value: S.house_ads !== false, full: true, help: 'Never inside results. Off leaves unsold spots empty (they collapse to nothing).' })}
        </form>
        <div class="btn-row mt"><button class="btn btn-p" data-save-rules>${icon('check')}Save rules</button><button class="btn btn-q" data-reset-rules>Back to recommended</button></div></div>
      <div class="card"><div class="card-t mb">What the site guarantees</div><div class="col" style="gap:10px;font-size:12.8px;color:var(--ink-2)">
        <div>${icon('check')} Units open below the fold and below what the visitor is reading — nothing on screen jumps.</div>
        <div>${icon('check')} Two units never sit closer than the gap above; a page never carries more than the maximum.</div>
        <div>${icon('check')} In-results ads start after whole rows and never interrupt the first results.</div>
        <div>${icon('check')} Money, sign-in and form pages never carry ads.</div>
        <div>${icon('check')} Only one overlay at a time: corner card, secret ad and poster share one lock.</div>
        <div>${icon('check')} If the database cannot be reached, pages use the last good answer for up to three days.</div>
        <div>${icon('check')} Every placement reports its state here, so a broken one is visible the same day.</div></div></div></div>`;
  }

  function rateCard(a) {
    var inv = (a && a.inventory) || [];
    return html`<div class="grid g4 mb"><div class="mini"><div class="mini-l">Sellable surfaces</div><div class="mini-v">${num(inv.length)}</div></div><div class="mini"><div class="mini-l">Hot-intent slots</div><div class="mini-v">${num(inv.filter(function (i) { return i.intentBand === 'hot'; }).length)}</div></div>
        <div class="mini"><div class="mini-l">Impressions / month</div><div class="mini-v">${compact(inv.reduce(function (s, i) { return s + i.monthlyImpressions; }, 0))}</div></div><div class="mini"><div class="mini-l">Rate card value</div><div class="mini-v">${moneyC(a && a.monthlyInventoryValue)}</div></div></div>
      <div class="card flush">${inv.length ? html`<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Surface</th><th>Slot</th><th class="num">Pageviews</th><th class="num">Viewable</th><th class="num">CTR</th><th>Intent</th><th class="num">CPM</th><th class="num">Monthly value</th></tr></thead><tbody>${inv.map(function (i) { return html`
        <tr><td class="t-main">${i.pageLabel}</td><td><div class="t-main">${i.slotLabel}</div><div class="t-sub">${i.desc}</div></td><td class="num">${num(i.pageviews)}</td><td class="num">${num(i.viewable)}<div class="t-sub">${i.viewRate}%</div></td><td class="num">${i.ctr}%</td>
        <td>${CX.pill(i.intentBand, i.intentBand === 'hot' ? 'p-hot' : i.intentBand === 'warm' ? 'p-warn' : 'p-info')}</td><td class="num">KES ${num(i.cpm)}</td><td class="num"><b>${money(i.monthlyValue)}</b></td></tr>`; })}</tbody></table></div>` : CX.empty('No inventory measured yet', 'It fills in as visitors browse.', 'chart')}</div>`;
  }
  function visitors(a) {
    var byV = {};
    ((a && a.sessions) || []).forEach(function (s) { var id = s.visitor_id || 'unknown'; var o = byV[id] = byV[id] || { id: id, sessions: 0, intent: 0, mode: '', device: s.device || '', seen: 0, last: null };
      o.sessions++; o.intent = Math.max(o.intent, n(s.intent_score)); if (s.reading_mode) o.mode = s.reading_mode; o.seen += n(s.ads_viewable); var t = s.captured_at || s.created_at; if (t && (!o.last || t > o.last)) o.last = t; });
    var vis = Object.keys(byV).map(function (k) { return byV[k]; }).sort(function (x, y) { return y.intent - x.intent; });
    return html`<div class="grid g4 mb"><div class="mini"><div class="mini-l">Known visitors · 30d</div><div class="mini-v">${num(vis.length)}</div></div><div class="mini"><div class="mini-l">Hot intent (72+)</div><div class="mini-v">${num(vis.filter(function (x) { return x.intent >= 72; }).length)}</div></div>
        <div class="mini"><div class="mini-l">Average intent</div><div class="mini-v">${num(vis.length ? vis.reduce(function (s, x) { return s + x.intent; }, 0) / vis.length : 0)}</div></div><div class="mini"><div class="mini-l">Reached by ads</div><div class="mini-v">${num(vis.filter(function (x) { return x.seen; }).length)}</div></div></div>
      <div class="card flush">${vis.length ? html`<div class="tbl-wrap"><table class="tbl compact"><thead><tr><th>Visitor</th><th>Device</th><th class="num">Sessions</th><th class="num">Intent</th><th>Mode</th><th class="num">Ads seen</th><th class="num">Last seen</th></tr></thead><tbody>${vis.slice(0, 200).map(function (x) { return html`
        <tr><td class="mono t-sub">${String(x.id).slice(0, 14)}</td><td>${human(x.device || '—')}</td><td class="num">${num(x.sessions)}</td><td class="num">${CX.pill(String(x.intent), x.intent >= 72 ? 'p-hot' : x.intent >= 45 ? 'p-info' : 'p-mute', false)}</td><td>${human(x.mode || '—')}</td><td class="num">${num(x.seen)}</td><td class="num t-sub">${x.last ? ago(x.last) : '—'}</td></tr>`; })}</tbody></table></div>` : CX.empty('No visitor sessions recorded yet', '', 'users')}</div>`;
  }

  function wire(v, d, a, reload) {
    var byId = {}; d.campaigns.forEach(function (c) { byId[c.id] = c; });
    var sById = {}; d.shadow.forEach(function (x) { sById[x.id] = x; });
    on(v.el, '[data-new]', 'click', function () { campaignEditor(null, d.campaigns, reload); });
    on(v.el, '[data-new-poster]', 'click', function () { campaignEditor(null, d.campaigns, reload, { format: 'poster', frequency: 'daily', duration_s: 8, skip_after_s: 3, cta_text: 'Learn more' }); });
    on(v.el, '[data-new-secret]', 'click', function () { secretEditor(null, reload); });
    on(v.el, '[data-edit]', 'click', function (el) { var c = byId[el.getAttribute('data-edit')]; if (c) campaignEditor(c, d.campaigns, reload); });
    on(v.el, '[data-status]', 'click', function (el) { var c = byId[el.getAttribute('data-status')]; CX.busy(el, function () { return setStatus(c, el.getAttribute('data-to'), reload); }); });
    on(v.el, '[data-more]', 'click', function (el) {
      var c = byId[el.getAttribute('data-more')];
      CX.menu(el, [{ label: 'Preview on the site', icon: 'external', fn: function () { previewOnSite(c); } },
        { label: 'Duplicate as draft', icon: 'copy', fn: function () { duplicate(c, reload); } },
        { label: 'Copy link to its slot report', icon: 'link', fn: function () { CX.copy(location.origin + location.pathname + '#/ads?tab=placements', 'Link'); } },
        { label: 'Delete', icon: 'trash', danger: true, fn: function () { remove(c, reload); } }]);
    });
    on(v.el, '[data-sedit]', 'click', function (el) { secretEditor(sById[el.getAttribute('data-sedit')], reload); });
    on(v.el, '[data-sstatus]', 'click', function (el) { var id = el.getAttribute('data-sstatus'), to = el.getAttribute('data-to'); CX.busy(el, function () { return CX.rows(CX.q('shadow_ads').update({ status: to }).eq('id', id).select('id')).then(function () { CX.log('shadow.' + to, 'shadow_ad', id); toast(to === 'live' ? 'Live' : 'Paused', 'ok'); reload(); }); }); });
    on(v.el, '[data-sdel]', 'click', function (el) { var id = el.getAttribute('data-sdel'); confirm({ title: 'Delete this secret ad?', tone: 'danger', confirm: 'Delete', icon: 'trash', onConfirm: function () { return CX.rows(CX.q('shadow_ads').delete().eq('id', id).select('id')).then(function () { CX.log('shadow.delete', 'shadow_ad', id); toast('Deleted', 'ok'); reload(); }); } }); });
    on(v.el, '[data-go]', 'click', function (el) { v.setQ({ tab: el.getAttribute('data-go') }); v.refresh(); });
    on(v.el, '[data-refresh]', 'click', function () { reload(); });
    on(v.el, '[data-exp]', 'click', function () { CX.csv((a && a.inventory) || [], null, 'cabana-rate-card.csv'); });
    on(v.el, '[data-filter]', 'click', function (el) { v.setQ({ f: el.getAttribute('data-filter') === 'all' ? null : el.getAttribute('data-filter') }); v.refresh(); });
    var srch = $('[data-search]', v.el); if (srch) srch.addEventListener('input', CX.debounce(function () { v.setQ({ s: srch.value.trim() || null }); v.refresh(); setTimeout(function () { var s2 = $('[data-search]', v.el); if (s2) { s2.focus(); s2.setSelectionRange(s2.value.length, s2.value.length); } }, 30); }, 350));
    on(v.el, '[data-pv-slot]', 'click', function (el) { var c = byId[el.getAttribute('data-pv-c')]; if (c) previewOnSite(c, el.getAttribute('data-pv-slot')); });
    on(v.el, '[data-slot-toggle]', 'change', function (el) {
      var id = el.getAttribute('data-slot-toggle'), S = REG.mergePolicy(d.settings), offs = (S.disabled_slots || []).slice();
      if (el.checked) offs = offs.filter(function (x) { return x !== id; }); else if (offs.indexOf(id) === -1) offs.push(id);
      rpc('admin_ads_settings_save', { p_settings: { disabled_slots: offs } }).then(function () { toast(el.checked ? 'Placement on' : 'Placement off', 'ok'); reload(); }, function (e) { el.checked = !el.checked; toast(CX.friendly(e), 'bad'); });
    });
    var master = $('[data-master]', v.el);
    if (master) master.onchange = function () {
      var want = master.checked;
      if (!want) { master.checked = true; confirm({ title: 'Switch every ad off?', tone: 'warn', confirm: 'Switch off', body: 'Campaigns, secret ads and the welcome poster stop showing across Cabana within about three minutes. Nothing is deleted.', onConfirm: function () { return rpc('admin_ads_settings_save', { p_settings: { enabled: false } }).then(function () { toast('All ads switched off', 'ok'); reload(); }); } }); return; }
      rpc('admin_ads_settings_save', { p_settings: { enabled: true } }).then(function () { toast('Ads are back on', 'ok'); reload(); }, function (e) { master.checked = false; toast(CX.friendly(e), 'bad'); });
    };
    var sr = $('[data-save-rules]', v.el);
    if (sr) sr.onclick = function () {
      var f = {}; $$('[data-rules] [name]', v.el).forEach(function (el) { f[el.name] = el.type === 'checkbox' ? el.checked : el.value; });
      var p = { enabled: !!f.enabled, fold_guard: !!f.fold_guard, house_ads: !!f.house_ads, max_units: Math.max(0, Math.min(6, n(f.max_units))), min_gap: Math.max(300, Math.min(3000, n(f.min_gap))),
        infeed: { first: Math.max(3, n(f.infeed_first) || 6), every: Math.max(6, n(f.infeed_every) || 12), max: Math.max(0, Math.min(4, n(f.infeed_max))) },
        sticky: { enabled: !!f.sticky_enabled, delay_s: Math.max(8, n(f.sticky_delay) || 20) }, shadow: { enabled: !!f.shadow_enabled }, poster: { enabled: !!f.poster_enabled } };
      CX.busy(sr, function () { return rpc('admin_ads_settings_save', { p_settings: p }).then(function () { toast('Rules saved. Visitors get them within about three minutes.', 'ok'); reload(); }); });
    };
    var rr = $('[data-reset-rules]', v.el);
    if (rr) rr.onclick = function () {
      confirm({ title: 'Restore the recommended rules?', confirm: 'Restore', body: 'Placements you switched off stay off.', onConfirm: function () {
        var P = JSON.parse(JSON.stringify(REG.POLICY)); delete P.disabled_slots;
        return rpc('admin_ads_settings_save', { p_settings: P }).then(function () { toast('Recommended rules restored', 'ok'); reload(); });
      } });
    };
  }
})(window);
