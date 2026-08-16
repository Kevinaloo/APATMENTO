/* apa-verify.js — partner-facing identity verification.
 *
 * Design decision that drives everything here: verification gates
 * PUBLISHING, not STARTING. A partner builds the whole listing first and
 * is asked for ID only at the final step.
 *
 * The reason is behavioural, not technical. Asking a stranger to photograph
 * their passport before they have invested anything is the single most
 * expensive thing you can put at the top of a funnel — they have no sunk
 * cost, no sense of what they are getting, and every reason to close the
 * tab. Asked at the end, after they have written a description and picked
 * photos, the same request reads as the last step of something nearly
 * finished. Same check, very different completion rate.
 *
 * Exposed as window.APA_VERIFY.
 */
(function () {
  'use strict';

  /* Mirrors required_tier() in the migration and CONTEXT_KIND in api/verify.js.
     All three must agree; the database is the one that actually enforces. */
  var TIERS = {
    rides: 3, carhire: 2, agent: 2, payout: 2,
    stays: 1, roommates: 1, tours: 1,
    events: 0, shopping: 0, food: 0
  };

  var _cache = null;

  function tierFor(service) {
    return Object.prototype.hasOwnProperty.call(TIERS, service) ? TIERS[service] : 0;
  }

  async function token() {
    try {
      var client = window.sb || window.supabase;
      if (!client) return null;
      var r = await client.auth.getSession();
      return r && r.data && r.data.session ? r.data.session.access_token : null;
    } catch (e) { return null; }
  }

  /* Current status. Cached for the page load — the wizard asks more than
     once and this does not change mid-session without a redirect. */
  async function status(force) {
    if (_cache && !force) return _cache;
    var t = await token();
    if (!t) return { cleared_tier: 0, identity_state: 'not_started' };
    try {
      var r = await fetch('/api/verify?action=status', { headers: { Authorization: 'Bearer ' + t } });
      if (!r.ok) return { cleared_tier: 0, identity_state: 'not_started' };
      _cache = await r.json();
      return _cache;
    } catch (e) {
      return { cleared_tier: 0, identity_state: 'not_started' };
    }
  }

  async function required(service) {
    var need = tierFor(service);
    if (need === 0) return { required: false, ok: true };
    var s = await status();
    return {
      required: true,
      ok: (s.cleared_tier || 0) >= need,
      need: need,
      have: s.cleared_tier || 0,
      state: s.identity_state,
      status: s
    };
  }

  async function start(context, country) {
    var t = await token();
    if (!t) { location.href = 'auth.html'; return null; }
    var r = await fetch('/api/verify?action=start', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + t, 'Content-Type': 'application/json' },
      body: JSON.stringify({ context: context, country: country || null })
    });
    if (!r.ok) return null;
    return r.json();
  }

  /* ---------- prompt ---------- */

  var COPY = {
    1: {
      why: 'Guests are letting a stranger into their trip. A verified badge on your listing is the single biggest reason they pick one host over another.',
      time: 'Takes about 90 seconds'
    },
    2: {
      why: 'You will be handling vehicles and payouts, so we confirm who you are before money moves. It protects your account as much as anyone else\u2019s.',
      time: 'Takes about two minutes'
    },
    3: {
      why: 'You will be carrying passengers, often at night. Riders see that every Cabana driver has been identity-checked, and that is why they get in the car.',
      time: 'Takes about two minutes'
    }
  };

  function prompt(opts) {
    var need = opts.need || 1;
    var copy = COPY[need] || COPY[1];
    var svcLabel = opts.serviceLabel || 'listing';

    var el = document.createElement('div');
    el.className = 'vfy-wrap';
    el.id = 'vfy-wrap';
    el.innerHTML =
      '<div class="vfy-card">' +
        '<div class="vfy-badge">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' +
            '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>' +
        '</div>' +
        '<div class="vfy-eyebrow">Last step</div>' +
        '<h2 class="vfy-title">Your ' + svcLabel + ' is ready. Let\u2019s verify it\u2019s you.</h2>' +
        '<p class="vfy-sub">' + copy.why + '</p>' +
        '<ul class="vfy-list">' +
          '<li>Photograph your ID, passport or driving licence</li>' +
          '<li>A quick selfie to match it</li>' +
          '<li>' + copy.time + '</li>' +
        '</ul>' +
        '<div class="vfy-priv">Your documents go straight to our verification partner. Cabana stores the result, never the images or your ID number.</div>' +
        '<div class="vfy-actions">' +
          '<button class="vfy-go" id="vfy-go">Verify and publish</button>' +
          '<button class="vfy-later" id="vfy-later">Save as draft, verify later</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(el);
    requestAnimationFrame(function () { el.classList.add('in'); });

    document.getElementById('vfy-go').addEventListener('click', async function () {
      var btn = this;
      btn.disabled = true; btn.textContent = 'Opening secure check\u2026';
      var s = await start(opts.context, opts.country);
      if (s && s.already_verified) { close(); if (opts.onVerified) opts.onVerified(); return; }
      if (s && s.url) { location.href = s.url; return; }
      btn.disabled = false; btn.textContent = 'Verify and publish';
      var w = document.querySelector('.vfy-priv');
      if (w) { w.textContent = 'We could not open the check just now. Please try again, or contact support if it keeps happening.'; w.style.color = '#c0392b'; }
    });

    document.getElementById('vfy-later').addEventListener('click', function () {
      close();
      if (opts.onLater) opts.onLater();
    });
  }

  function close() {
    var el = document.getElementById('vfy-wrap');
    if (el) { el.classList.remove('in'); setTimeout(function () { el.remove(); }, 240); }
  }

  /* Badge markup for listing cards and partner profiles. */
  function badgeHTML(s) {
    if (!s || (s.cleared_tier || 0) < 1) return '';
    var name = s.display_name ? (' \u00b7 ' + s.display_name) : '';
    return '<span class="vfy-chip" title="Identity verified by Cabana">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">' +
      '<polyline points="20 6 9 17 4 12"/></svg>ID verified' + name + '</span>';
  }

  window.APA_VERIFY = {
    tierFor: tierFor,
    status: status,
    required: required,
    start: start,
    prompt: prompt,
    close: close,
    badgeHTML: badgeHTML,
    TIERS: TIERS
  };
})();
