/* ═══════════════════════════════════════════════════════════════════
   CABANA · MEDIA UPLOAD
   ───────────────────────────────────────────────────────────────────
   Photos and video straight off an operator's phone, into the
   'tours' bucket at  <uid>/<folder>/<file>  — a path storage RLS can
   verify ownership from without consulting another table.

   Two decisions worth stating, both about the person uploading:

   · Images are resized and re-encoded in the browser before a single
     byte leaves the device. A modern phone photo is 4–8 MB; most of
     that is resolution no card will ever show. Sending it whole would
     spend an operator's mobile bundle to move pixels we then throw
     away. Typical result is 4 MB → ~250 KB.

   · Upload goes through XHR rather than supabase-js .upload(), purely
     because XHR reports progress. On a slow connection a bar that
     moves is the difference between waiting and giving up.
   ═══════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var SB_URL = 'https://gfwgbgdvxtocwhilrtdw.supabase.co';
  var BUCKET = 'tours';

  var MAX_EDGE     = 1920;          // px on the long side
  var JPEG_Q       = 0.82;
  var MAX_PHOTOS   = 10;
  var MAX_VIDEOS   = 2;
  var MAX_VIDEO_MB = 50;

  var IMG_RE = /^image\/(jpeg|jpg|png|webp|heic|heif)$/i;
  var VID_RE = /^video\/(mp4|webm|quicktime)$/i;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function mb(bytes) { return (bytes / 1048576).toFixed(1) + ' MB'; }
  function uid4() { return Math.random().toString(36).slice(2, 8); }

  /* ── styles, injected once ───────────────────────────────────────── */

  function styles() {
    if (document.getElementById('cmu-css')) return;
    var s = document.createElement('style');
    s.id = 'cmu-css';
    s.textContent =
      '.cmu{display:block;}' +
      '.cmu-drop{border:1.5px dashed rgba(10,10,20,.18);border-radius:16px;padding:22px 18px;' +
        'text-align:center;background:rgba(255,255,255,.6);transition:border-color .2s,background .2s;}' +
      '.cmu-drop.over{border-color:#2DD4BF;background:rgba(45,212,191,.07);}' +
      '.cmu-ic{width:36px;height:36px;margin:0 auto 10px;border-radius:11px;display:flex;' +
        'align-items:center;justify-content:center;background:rgba(45,212,191,.12);color:#0E9384;}' +
      '.cmu-ic svg{width:19px;height:19px;}' +
      '.cmu-t{font-family:Geist,Inter,sans-serif;font-size:14px;font-weight:600;color:#0A0A14;margin-bottom:4px;}' +
      '.cmu-s{font-size:12.5px;color:#8E90AD;line-height:1.5;}' +
      '.cmu-btns{display:flex;gap:8px;justify-content:center;margin-top:14px;flex-wrap:wrap;}' +
      '.cmu-b{display:inline-flex;align-items:center;gap:7px;font-family:Geist,Inter,sans-serif;' +
        'font-size:13px;font-weight:600;padding:9px 16px;border-radius:99px;cursor:pointer;' +
        'border:1px solid rgba(10,10,20,.14);background:#fff;color:#4A4C66;transition:border-color .2s,color .2s;}' +
      '.cmu-b:hover{border-color:#2DD4BF;color:#0E9384;}' +
      '.cmu-b svg{width:14px;height:14px;}' +
      '.cmu-b[disabled]{opacity:.45;cursor:not-allowed;}' +
      '.cmu-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(104px,1fr));gap:9px;margin-top:14px;}' +
      '.cmu-it{position:relative;aspect-ratio:1;border-radius:12px;overflow:hidden;' +
        'background:#EEF0F6;border:1px solid rgba(10,10,20,.08);}' +
      '.cmu-it img,.cmu-it video{width:100%;height:100%;object-fit:cover;display:block;}' +
      '.cmu-it .bar{position:absolute;left:0;right:0;bottom:0;height:3px;background:rgba(10,10,20,.1);}' +
      '.cmu-it .bar i{display:block;height:100%;width:0;background:linear-gradient(90deg,#5EEAD4,#2DD4BF);' +
        'transition:width .25s;}' +
      '.cmu-it .rm{position:absolute;top:5px;right:5px;width:23px;height:23px;border:0;border-radius:7px;' +
        'background:rgba(6,43,49,.82);color:#fff;cursor:pointer;font-size:14px;line-height:1;' +
        'display:flex;align-items:center;justify-content:center;}' +
      '.cmu-it .rm:hover{background:#E0522C;}' +
      '.cmu-it .tag{position:absolute;left:5px;top:5px;font-size:9.5px;font-weight:700;letter-spacing:.05em;' +
        'padding:3px 7px;border-radius:99px;background:linear-gradient(135deg,#5EEAD4,#2DD4BF);color:#04312C;}' +
      '.cmu-it .vtag{position:absolute;left:5px;bottom:8px;font-size:9.5px;font-weight:700;' +
        'padding:3px 7px;border-radius:99px;background:rgba(6,43,49,.85);color:#fff;}' +
      '.cmu-it.err{border-color:#E0522C;}' +
      '.cmu-it .emsg{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;' +
        'padding:8px;font-size:10.5px;text-align:center;color:#C2410C;background:rgba(255,240,236,.95);line-height:1.35;}' +
      '.cmu-note{font-size:12px;color:#8E90AD;margin-top:9px;line-height:1.5;}' +
      '.cmu-hide{position:absolute;width:1px;height:1px;opacity:0;pointer-events:none;}';
    document.head.appendChild(s);
  }

  /* ── image compression ───────────────────────────────────────────── */

  function shrink(file) {
    return new Promise(function (resolve) {
      // Nothing to gain on a small file; skip the re-encode entirely.
      if (file.size < 320 * 1024 && !/hei[cf]/i.test(file.type)) { resolve(file); return; }

      var done = false;
      var bail = setTimeout(function () {
        // HEIC on a browser that cannot decode it, or a corrupt file.
        // Send the original and let the bucket's MIME list decide.
        if (!done) { done = true; resolve(file); }
      }, 12000);

      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () {
        if (done) return;
        try {
          var w = img.naturalWidth, h = img.naturalHeight;
          var scale = Math.min(1, MAX_EDGE / Math.max(w, h));
          var cw = Math.max(1, Math.round(w * scale));
          var ch = Math.max(1, Math.round(h * scale));

          var c = document.createElement('canvas');
          c.width = cw; c.height = ch;
          var ctx = c.getContext('2d');
          ctx.drawImage(img, 0, 0, cw, ch);

          c.toBlob(function (blob) {
            done = true; clearTimeout(bail); URL.revokeObjectURL(url);
            // If the re-encode somehow grew the file, keep the original.
            if (!blob || blob.size >= file.size) { resolve(file); return; }
            var name = file.name.replace(/\.[^.]+$/, '') + '.jpg';
            resolve(new File([blob], name, { type: 'image/jpeg' }));
          }, 'image/jpeg', JPEG_Q);
        } catch (e) {
          done = true; clearTimeout(bail); URL.revokeObjectURL(url); resolve(file);
        }
      };
      img.onerror = function () {
        done = true; clearTimeout(bail); URL.revokeObjectURL(url); resolve(file);
      };
      img.src = url;
    });
  }

  /* ── upload with progress ────────────────────────────────────────── */

  function put(file, path, token, onProgress) {
    return new Promise(function (resolve, reject) {
      var xhr = new XMLHttpRequest();
      xhr.open('POST', SB_URL + '/storage/v1/object/' + BUCKET + '/' + path, true);
      xhr.setRequestHeader('Authorization', 'Bearer ' + token);
      xhr.setRequestHeader('x-upsert', 'true');
      if (file.type) xhr.setRequestHeader('Content-Type', file.type);

      xhr.upload.onprogress = function (e) {
        if (e.lengthComputable && onProgress) onProgress(e.loaded / e.total);
      };
      xhr.onload = function () {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(SB_URL + '/storage/v1/object/public/' + BUCKET + '/' + path);
        } else {
          var msg = 'Upload failed';
          try { msg = (JSON.parse(xhr.responseText).message) || msg; } catch (e) {}
          reject(new Error(msg));
        }
      };
      xhr.onerror = function () { reject(new Error('Network error')); };
      xhr.ontimeout = function () { reject(new Error('Timed out')); };
      xhr.timeout = 180000;
      xhr.send(file);
    });
  }

  /* ── the component ───────────────────────────────────────────────── */

  function mount(host, opts) {
    styles();
    opts = opts || {};
    var sb = opts.client;
    var folder = opts.folder || 'draft';
    var maxPhotos = opts.maxPhotos || MAX_PHOTOS;
    var maxVideos = opts.maxVideos || MAX_VIDEOS;
    var onChange = opts.onChange || function () {};

    var items = [];   // {id,kind,url,preview,pct,error,busy}
    var uid = null, token = null;

    host.className = 'cmu';
    host.innerHTML =
      '<div class="cmu-drop" id="cmu-drop">' +
        '<div class="cmu-ic">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">' +
          '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M17 8l-5-5-5 5"/><path d="M12 3v13"/></svg>' +
        '</div>' +
        '<div class="cmu-t">Add photos and video</div>' +
        '<div class="cmu-s">Straight from your phone. Up to ' + maxPhotos + ' photos and ' +
          maxVideos + ' short clips.<br/>Photos are shrunk on your device first, so this uses very little data.</div>' +
        '<div class="cmu-btns">' +
          '<button class="cmu-b" type="button" data-pick="camera">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>' +
            'Take a photo</button>' +
          '<button class="cmu-b" type="button" data-pick="photo">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>' +
            'Choose photos</button>' +
          '<button class="cmu-b" type="button" data-pick="video">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m23 7-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>' +
            'Add a clip</button>' +
        '</div>' +
      '</div>' +
      '<div class="cmu-grid" id="cmu-grid"></div>' +
      '<div class="cmu-note" id="cmu-note"></div>' +
      '<input class="cmu-hide" type="file" id="cmu-f-camera" accept="image/*" capture="environment"/>' +
      '<input class="cmu-hide" type="file" id="cmu-f-photo" accept="image/*" multiple/>' +
      '<input class="cmu-hide" type="file" id="cmu-f-video" accept="video/*" multiple/>';

    var grid = host.querySelector('#cmu-grid');
    var note = host.querySelector('#cmu-note');
    var drop = host.querySelector('#cmu-drop');

    function counts() {
      var p = 0, v = 0;
      items.forEach(function (i) { if (!i.error) { i.kind === 'video' ? v++ : p++; } });
      return { p: p, v: v };
    }

    function emit() {
      var c = counts();
      var photos = items.filter(function (i) { return i.kind === 'photo' && i.url; })
                        .map(function (i) { return i.url; });
      var videos = items.filter(function (i) { return i.kind === 'video' && i.url; })
                        .map(function (i) { return i.url; });
      note.textContent = c.p + ' of ' + maxPhotos + ' photos' +
        (maxVideos ? ' · ' + c.v + ' of ' + maxVideos + ' clips' : '') +
        (photos.length ? ' · the first photo is used as the cover' : '');
      onChange({ photos: photos, videos: videos, cover: photos[0] || null,
                 busy: items.some(function (i) { return i.busy; }) });
    }

    function paint() {
      grid.innerHTML = items.map(function (i, idx) {
        if (i.error) {
          return '<div class="cmu-it err" data-i="' + i.id + '">' +
                 '<div class="emsg">' + esc(i.error) + '</div>' +
                 '<button class="rm" type="button" data-rm="' + i.id + '" aria-label="Remove">&times;</button></div>';
        }
        var media = i.kind === 'video'
          ? '<video src="' + esc(i.preview || i.url) + '" muted playsinline preload="metadata"></video>' +
            '<span class="vtag">CLIP</span>'
          : '<img src="' + esc(i.preview || i.url) + '" alt=""/>';
        var cover = (i.kind === 'photo' && idx === firstPhoto()) ? '<span class="tag">COVER</span>' : '';
        var bar = i.busy ? '<div class="bar"><i style="width:' + Math.round((i.pct || 0) * 100) + '%"></i></div>' : '';
        return '<div class="cmu-it" data-i="' + i.id + '">' + media + cover + bar +
               '<button class="rm" type="button" data-rm="' + i.id + '" aria-label="Remove">&times;</button></div>';
      }).join('');

      Array.prototype.forEach.call(grid.querySelectorAll('[data-rm]'), function (b) {
        b.addEventListener('click', function () { remove(b.getAttribute('data-rm')); });
      });
      emit();
    }

    function firstPhoto() {
      for (var i = 0; i < items.length; i++) if (items[i].kind === 'photo' && !items[i].error) return i;
      return -1;
    }

    function remove(id) {
      var it = items.filter(function (i) { return i.id === id; })[0];
      if (it && it.url && sb) {
        // Best effort: drop the object too, so an abandoned draft does
        // not leave orphans in the bucket.
        var path = it.url.split('/public/' + BUCKET + '/')[1];
        if (path) { try { sb.storage.from(BUCKET).remove([path]); } catch (e) {} }
      }
      if (it && it.preview) { try { URL.revokeObjectURL(it.preview); } catch (e) {} }
      items = items.filter(function (i) { return i.id !== id; });
      paint();
    }

    function reject(name, why) {
      items.push({ id: uid4(), kind: 'photo', error: why, busy: false });
      paint();
    }

    function accept(files) {
      if (!files || !files.length) return;
      Array.prototype.forEach.call(files, function (f) { queue(f); });
    }

    function queue(file) {
      var isVid = VID_RE.test(file.type) || /^video\//.test(file.type);
      var isImg = IMG_RE.test(file.type) || /^image\//.test(file.type);
      var c = counts();

      if (!isVid && !isImg) { reject(file.name, 'Not a photo or video'); return; }
      if (isVid && c.v >= maxVideos) { reject(file.name, 'Clip limit reached'); return; }
      if (!isVid && c.p >= maxPhotos) { reject(file.name, 'Photo limit reached'); return; }
      if (isVid && file.size > MAX_VIDEO_MB * 1048576) {
        reject(file.name, 'Clip is ' + mb(file.size) + '. Max ' + MAX_VIDEO_MB + ' MB.');
        return;
      }

      var item = { id: uid4(), kind: isVid ? 'video' : 'photo', busy: true, pct: 0,
                   preview: URL.createObjectURL(file) };
      items.push(item);
      paint();

      auth().then(function () {
        return isVid ? file : shrink(file);
      }).then(function (out) {
        var ext = (out.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
        var path = uid + '/' + folder + '/' + Date.now() + '-' + uid4() + '.' + ext;
        return put(out, path, token, function (p) {
          item.pct = p;
          var bar = grid.querySelector('[data-i="' + item.id + '"] .bar i');
          if (bar) bar.style.width = Math.round(p * 100) + '%';
        });
      }).then(function (url) {
        item.url = url; item.busy = false; item.pct = 1;
        paint();
      }).catch(function (e) {
        item.busy = false;
        item.error = (e && e.message) || 'Upload failed';
        paint();
      });
    }

    function auth() {
      if (uid && token) return Promise.resolve();
      if (!sb) return Promise.reject(new Error('Sign in to upload'));
      return sb.auth.getSession().then(function (r) {
        var s = r && r.data && r.data.session;
        if (!s || !s.user) throw new Error('Sign in to upload');
        uid = s.user.id; token = s.access_token;
      });
    }

    // pickers
    ['camera', 'photo', 'video'].forEach(function (k) {
      var btn = host.querySelector('[data-pick="' + k + '"]');
      var inp = host.querySelector('#cmu-f-' + k);
      if (!btn || !inp) return;
      btn.addEventListener('click', function () { inp.click(); });
      inp.addEventListener('change', function () { accept(inp.files); inp.value = ''; });
    });

    // drag and drop
    ['dragenter', 'dragover'].forEach(function (ev) {
      drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.add('over'); });
    });
    ['dragleave', 'drop'].forEach(function (ev) {
      drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.remove('over'); });
    });
    drop.addEventListener('drop', function (e) {
      if (e.dataTransfer && e.dataTransfer.files) accept(e.dataTransfer.files);
    });

    emit();

    return {
      value: function () {
        var photos = items.filter(function (i) { return i.kind === 'photo' && i.url; })
                          .map(function (i) { return i.url; });
        var videos = items.filter(function (i) { return i.kind === 'video' && i.url; })
                          .map(function (i) { return i.url; });
        return { photos: photos, videos: videos, cover: photos[0] || null };
      },
      busy: function () { return items.some(function (i) { return i.busy; }); },
      setFolder: function (f) { folder = f; },
      clear: function () { items = []; paint(); }
    };
  }

  window.CabanaUploader = { mount: mount, shrink: shrink, BUCKET: BUCKET };
})();
