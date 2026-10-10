/* ═══════════════════════════════════════════════════════════════════
   CABANA · R2 MEDIA  (cabana-r2.js)
   ───────────────────────────────────────────────────────────────────
   Public photos and clips live on Cloudflare R2; Supabase storage is
   kept for private files (ids, selfies, receipts, contracts) and for
   anything that fails over. This is the one browser client for it.

     CabanaR2.put(file, { kind, sb | token, onProgress })  → Promise<publicUrl>
     CabanaR2.putOrNull(...)  same, but resolves null if R2 is off or
                              anything fails, so the caller falls back
     CabanaR2.remove(url, { sb | token })  best-effort delete of an R2 url
     CabanaR2.isR2(url)                    is this one of ours?

   kind: listing · tour · event · food · shop · car · place · ad · avatar
   Never route anything private through here; the server refuses kinds it
   does not know, and there is no kind for documents.
   ═══════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';
  if (global.CabanaR2) return;

  var state = null;            // null unknown · {enabled, base} once asked
  var asking = null;

  function status() {
    if (state) return Promise.resolve(state);
    if (asking) return asking;
    asking = fetch('/api/media-sign', { method: 'GET' })
      .then(function (r) { return r.ok ? r.json() : { enabled: false }; })
      .catch(function () { return { enabled: false }; })
      .then(function (j) { state = { enabled: !!(j && j.enabled), base: (j && j.base) || '' }; return state; });
    return asking;
  }

  function tokenOf(opts) {
    if (opts.token) return Promise.resolve(opts.token);
    var sb = opts.sb;
    if (!sb || !sb.auth) return Promise.reject(new Error('no_session'));
    return sb.auth.getSession().then(function (r) {
      var s = r && r.data && r.data.session;
      if (!s || !s.access_token) throw new Error('no_session');
      return s.access_token;
    });
  }

  var OK_TYPE = /^(?:image\/(?:jpeg|png|webp|avif)|video\/(?:mp4|webm|quicktime))$/;

  function put(file, opts) {
    opts = opts || {};
    var type = String(file && file.type || '').toLowerCase();
    if (!file || !OK_TYPE.test(type)) return Promise.reject(new Error('unsupported_type'));
    return status().then(function (st) {
      if (!st.enabled) throw new Error('r2_off');
      return tokenOf(opts);
    }).then(function (token) {
      return fetch('/api/media-sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({ kind: opts.kind || 'listing', contentType: type, size: file.size }),
      }).then(function (r) {
        if (!r.ok) throw new Error('sign_' + r.status);
        return r.json();
      });
    }).then(function (sig) {
      return new Promise(function (resolve, reject) {
        var xhr = new XMLHttpRequest();
        xhr.open('PUT', sig.uploadUrl, true);
        Object.keys(sig.headers || {}).forEach(function (h) { xhr.setRequestHeader(h, sig.headers[h]); });
        xhr.upload.onprogress = function (e) {
          if (e.lengthComputable && opts.onProgress) opts.onProgress(e.loaded / e.total);
        };
        xhr.onload = function () {
          if (xhr.status >= 200 && xhr.status < 300) resolve(sig.publicUrl);
          else reject(new Error('r2_' + xhr.status));
        };
        xhr.onerror = function () { reject(new Error('r2_network')); };
        xhr.ontimeout = function () { reject(new Error('r2_timeout')); };
        xhr.timeout = /^video\//.test(type) ? 600000 : 120000;
        xhr.send(file);
      });
    });
  }

  function putOrNull(file, opts) {
    return put(file, opts).catch(function (e) {
      if (e && e.message !== 'r2_off') { try { console.warn('[media] R2 unavailable, falling back:', e.message); } catch (x) { /* quiet */ } }
      return null;
    });
  }

  function isR2(url) {
    return !!(state && state.base && String(url || '').indexOf(state.base + '/') === 0);
  }

  function remove(url, opts) {
    return status().then(function () {
      if (!isR2(url)) return false;
      return tokenOf(opts || {}).then(function (token) {
      return fetch('/api/media-sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({ op: 'delete', url: url }),
      }).then(function (r) { return r.ok; });
      });
    }).catch(function () { return false; });
  }

  global.CabanaR2 = { put: put, putOrNull: putOrNull, remove: remove, isR2: isR2, status: status };
})(window);
