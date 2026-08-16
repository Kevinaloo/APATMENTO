/* apa-listing-draft.js — "pick up where you left off" for the partner
 * listing wizard.
 *
 * Storage strategy: localStorage is the source of truth and works with
 * no network and no schema change. If the `listing_drafts` table exists
 * (see supabase-migrations/), we mirror to it so a draft survives a
 * device switch. The mirror is strictly best-effort — every remote call
 * is wrapped, and a failure never blocks the local save. The wizard must
 * keep working whether or not the migration has been applied.
 *
 * Photos are deliberately NOT persisted. F.photoFiles holds File handles
 * (not serialisable) and F.photos holds base64 data URLs (10 images would
 * exceed the ~5MB localStorage quota and throw QuotaExceededError, taking
 * the whole draft with it). We store the count instead and tell the host
 * honestly that photos need re-adding.
 *
 * Exposed as window.APA_DRAFT.
 */
(function () {
  'use strict';

  var KEY_PREFIX = 'apa-listing-draft:';
  var SCHEMA_VERSION = 1;
  var SAVE_DEBOUNCE_MS = 700;
  var MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

  var _timer = null;
  var _remoteOk = null;   // null = untested, true/false once known
  var _uid = null;

  function key(uid) { return KEY_PREFIX + (uid || 'anon'); }

  function now() { return Date.now(); }

  /* ---------- serialisation ---------- */

  // Strip anything unserialisable or too large before writing.
  function slim(F, meta) {
    var out = {};
    Object.keys(F).forEach(function (k) {
      if (k === 'photos' || k === 'photoFiles') return;
      var v = F[k];
      if (typeof v === 'function') return;
      out[k] = v;
    });
    return {
      v: SCHEMA_VERSION,
      savedAt: now(),
      step: meta.step || 0,
      photoCount: (F.photoFiles || []).length,
      form: out
    };
  }

  /* ---------- local ---------- */

  function readLocal(uid) {
    try {
      var raw = localStorage.getItem(key(uid));
      if (!raw) return null;
      var d = JSON.parse(raw);
      if (!d || d.v !== SCHEMA_VERSION) return null;
      if (now() - (d.savedAt || 0) > MAX_AGE_MS) { clearLocal(uid); return null; }
      return d;
    } catch (e) { return null; }
  }

  function writeLocal(uid, payload) {
    try {
      localStorage.setItem(key(uid), JSON.stringify(payload));
      return true;
    } catch (e) {
      // Quota or private-mode failure. Don't let it break the wizard.
      console.warn('[apa-draft] local save failed:', e && e.name);
      return false;
    }
  }

  function clearLocal(uid) {
    try { localStorage.removeItem(key(uid)); } catch (e) {}
  }

  /* ---------- remote (best effort) ---------- */

  function sb() {
    return window.sb || window.supabase || null;
  }

  async function writeRemote(payload) {
    if (_remoteOk === false) return;
    var client = sb();
    if (!client || !_uid) return;
    try {
      var res = await client.from('listing_drafts').upsert({
        owner_id: _uid,
        service: payload.form.svc || 'unknown',
        data: payload,
        current_step: String(payload.step),
        display_title: payload.form.title || null,
        completion_pct: Math.round((payload.step / 7) * 100)
      }, { onConflict: 'owner_id,service' });
      // A missing table surfaces as a PostgREST error; note it and stop trying.
      if (res && res.error) { _remoteOk = false; return; }
      _remoteOk = true;
    } catch (e) { _remoteOk = false; }
  }

  async function clearRemote(service) {
    if (_remoteOk === false) return;
    var client = sb();
    if (!client || !_uid) return;
    try {
      await client.from('listing_drafts').delete()
        .eq('owner_id', _uid).eq('service', service || 'unknown');
    } catch (e) {}
  }

  /* ---------- public ---------- */

  function init(uid) { _uid = uid || null; }

  // Debounced so typing in a text field doesn't hammer storage.
  function save(F, step) {
    if (!F || !F.svc) return;           // nothing meaningful to resume into yet
    clearTimeout(_timer);
    _timer = setTimeout(function () {
      var payload = slim(F, { step: step });
      writeLocal(_uid, payload);
      writeRemote(payload);
    }, SAVE_DEBOUNCE_MS);
  }

  // Immediate write, for beforeunload where a debounce would never fire.
  function saveNow(F, step) {
    if (!F || !F.svc) return;
    clearTimeout(_timer);
    writeLocal(_uid, slim(F, { step: step }));
  }

  function load() { return readLocal(_uid); }

  function discard(service) {
    clearTimeout(_timer);
    clearLocal(_uid);
    clearRemote(service);
  }

  /* Human phrasing for the resume card. "3 days ago" reads as abandoned;
   * "just now" reads as a glitch they can shrug off. The wording changes
   * how willing someone is to pick the draft back up.
   */
  function ago(ts) {
    var s = Math.max(0, Math.floor((now() - ts) / 1000));
    if (s < 90) return 'a moment ago';
    var m = Math.floor(s / 60);
    if (m < 60) return m + (m === 1 ? ' minute ago' : ' minutes ago');
    var h = Math.floor(m / 60);
    if (h < 24) return h + (h === 1 ? ' hour ago' : ' hours ago');
    var d = Math.floor(h / 24);
    if (d === 1) return 'yesterday';
    if (d < 7) return d + ' days ago';
    var w = Math.floor(d / 7);
    return w === 1 ? 'last week' : w + ' weeks ago';
  }

  window.APA_DRAFT = {
    init: init,
    save: save,
    saveNow: saveNow,
    load: load,
    discard: discard,
    ago: ago,
    STEP_LABELS: ['Service', 'Type', 'Location', 'Details', 'Features', 'Pricing', 'Photos', 'Review']
  };
})();
