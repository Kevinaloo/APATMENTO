/* ═══════════════════════════════════════════════════════════════════════════
   CABANA · LISTING OWNERSHIP
   apa-ownership.js

   The one place the browser knows how a listing belongs to somebody. Loaded
   by the listing form, the partner listings board, the traveller dashboard
   (for the claim inbox) and the ambassador dashboard.

   A listing is one of three things, and it says which:

     sole         one person operates and manages it
     partnership  several people co-own it, with shares that must total 100%
     on_behalf    somebody filled the form in for a named owner, and the
                  listing hands over the moment that owner claims it

   WHAT THIS FILE DOES NOT DO
   ──────────────────────────
   It does not decide anything. Every write is an RPC into a security-definer
   function that re-derives the caller from auth.uid() and re-checks the
   ownership itself. The equity arithmetic below exists to give someone a
   live total as they type — Postgres does it again, and Postgres is right.
   That duplication is deliberate: a share validated only in a browser is a
   share validated by the one participant an interested party controls.

   Design rules, inherited from apa-session.js:
     1. Nothing throws. A failed ownership call must never take a page down.
     2. The token comes from ApaSession. We never hold our own.

   Public API:
     ApaOwnership.TYPES                       the three shapes, with copy
     ApaOwnership.declare(listingId, spec)    → { ok, ownership_type, … }
     ApaOwnership.forListing(listingId)       → ownership row, or null
     ApaOwnership.transfer(listingId, to)     → { ok, transfer_id }
     ApaOwnership.cancelTransfer(id)
     ApaOwnership.inbox()                     → [ listings waiting for you ]
     ApaOwnership.mountInbox(el?)             renders that into #ownership-inbox
     ApaOwnership.accept(transferId)
     ApaOwnership.decline(transferId)
     ApaOwnership.sendInvite(transferId)         emails + returns share link
     ApaOwnership.confirmSeat(partnerId)

     ApaOwnership.splitEqually(n)             → [33.34, 33.33, 33.33]
     ApaOwnership.validate(spec)              → null, or a sentence to show
     ApaOwnership.describe(row)               → 'Partnership · 3 co-owners'
     ApaOwnership.normContact(text)           → the same rule Postgres uses
   ═══════════════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';
  if (global.ApaOwnership) return;

  function warn(label, e) {
    if (global.console) console.warn('[ownership:' + label + ']', e && e.message);
  }

  function client() {
    try {
      if (global.ApaSession && global.ApaSession.client) return global.ApaSession.client();
    } catch (e) { warn('client', e); }
    return global.sb || null;
  }

  /* Every call returns a shape, never a rejection. A dashboard that throws
     because an ownership badge failed to load is a dashboard nobody can use. */
  function rpc(fn, args) {
    var c = client();
    if (!c || !c.rpc) {
      return Promise.resolve({ ok: false, error: 'Not connected. Try again in a moment.' });
    }
    return c.rpc(fn, args || {}).then(function (r) {
      if (r.error) return { ok: false, error: friendly(r.error) };
      var d = r.data;
      if (d && typeof d === 'object' && 'ok' in d) return d;
      return { ok: true, data: d };
    }).catch(function (e) {
      warn(fn, e);
      return { ok: false, error: 'Something went wrong. Try again.' };
    });
  }

  /* Postgres raises with a sentence written for a human, so show it. The
     fallback is for the classes of error that are not written for anyone. */
  function friendly(err) {
    var m = (err && (err.message || err.hint)) || '';
    if (!m) return 'Something went wrong. Try again.';
    if (/duplicate key|violates unique/i.test(m)) {
      return 'That person is already on this listing.';
    }
    if (/permission denied|42501/i.test(m) && !/not your/i.test(m)) {
      return 'You are not allowed to do that.';
    }
    return m.replace(/^ERROR:\s*/i, '');
  }

  /* ── The three shapes, with the copy that describes them ─────────────
     Kept here rather than in each page's markup so the listing form, the
     listings board and the ambassador dashboard cannot describe the same
     choice three different ways. */
  var TYPES = [
    {
      key: 'sole',
      label: 'I operate and manage it myself',
      short: 'Sole operator',
      blurb: 'You own or manage this listing on your own. Bookings, payouts and '
           + 'guest messages all come to you. This is the usual answer.',
      icon: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>'
    },
    {
      key: 'partnership',
      label: 'We own it together',
      short: 'Partnership',
      blurb: 'Several of you co-own this listing. Add the other partners and how '
           + 'the ownership is split. They can see the listing and its earnings '
           + 'once they join, and the split is on the record from day one.',
      icon: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>'
          + '<path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>'
    },
    {
      key: 'on_behalf',
      label: 'I am listing it for someone else',
      short: 'On behalf of someone',
      blurb: 'The property is not yours. Give the owner’s name and contact and '
           + 'the listing is held for them — the moment they claim it, it becomes '
           + 'theirs and leaves your account entirely.',
      icon: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>'
          + '<path d="m17 11 2 2 4-4"/>'
    }
  ];

  function typeFor(key) {
    for (var i = 0; i < TYPES.length; i++) if (TYPES[i].key === key) return TYPES[i];
    return TYPES[0];
  }

  /* ── Contact normalisation ────────────────────────────────────────────
     THE SAME RULE AS public.cabana_norm_contact(). If these two ever
     diverge, the browser will tell someone their partner is already on the
     listing when the database disagrees, or accept a transfer address that
     can never be claimed. Change one, change both. */
  function normContact(text) {
    var s = String(text == null ? '' : text).trim();
    if (!s) return null;
    if (s.indexOf('@') > -1) return s.toLowerCase();
    var digits = s.replace(/[^0-9]/g, '');
    if (digits.length < 9) return null;
    return digits.slice(-9);
  }

  function looksLikeContact(text) { return normContact(text) != null; }

  /* ── Equity ───────────────────────────────────────────────────────────
     An equal split of 100 between three people is not 33.33 three times.
     Postgres works in basis points and gives the remainder to the operator;
     this mirrors that exactly so the preview and the saved result agree. */
  function splitEqually(seats) {
    var n = Math.max(1, Math.round(Number(seats) || 1));
    var each = Math.floor(10000 / n);
    var out = [];
    for (var i = 0; i < n; i++) out.push(each / 100);
    out[0] = (each + (10000 - each * n)) / 100;
    return out;
  }

  function sumPct(partners) {
    return (partners || []).reduce(function (t, p) {
      return t + (Number(p.equity_pct) || 0);
    }, 0);
  }

  /* One validator, used by every screen that collects this, so the listing
     form and the listings board refuse the same things for the same reasons
     and in the same words. Returns null when the spec is fine. */
  function validate(spec) {
    spec = spec || {};
    if (spec.type === 'sole') return null;

    if (spec.type === 'on_behalf') {
      if (!String(spec.holder_name || '').trim()) return 'Who is this listing for? Give their name.';
      if (!looksLikeContact(spec.holder_contact)) {
        return 'Give their email address or phone number, so they can claim the listing.';
      }
      return null;
    }

    if (spec.type === 'partnership') {
      var ps = (spec.partners || []).filter(function (p) {
        return String(p.name || '').trim() || String(p.contact || '').trim();
      });
      if (!ps.length) {
        return 'Add at least one other partner. On your own, this is a sole listing.';
      }
      var seen = {};
      for (var i = 0; i < ps.length; i++) {
        var p = ps[i];
        if (!String(p.name || '').trim()) return 'Every partner needs a name.';
        var norm = normContact(p.contact);
        if (!norm) return 'Every partner needs an email address or a phone number.';
        if (seen[norm]) return 'You have added the same person twice.';
        seen[norm] = 1;
      }
      if (spec.split === 'custom') {
        var total = sumPct(ps);
        if (total <= 0) return 'Give each partner a share.';
        /* Under 100 on purpose: what is left over is the operator's own
           share, and a partnership where the operator holds nothing is a
           giveaway nobody meant to sign. */
        if (total >= 100) {
          return 'Those shares come to ' + round2(total) + '%, leaving nothing for you. '
               + 'They must total less than 100%.';
        }
      }
      return null;
    }
    return 'Choose how this listing is owned.';
  }

  function round2(n) { return Math.round((Number(n) || 0) * 100) / 100; }

  /* What the operator's own share works out to, for the live preview. */
  function operatorShare(spec) {
    if (!spec || spec.type !== 'partnership') return 100;
    var ps = (spec.partners || []).filter(function (p) { return normContact(p.contact); });
    if (spec.split === 'equal') return splitEqually(ps.length + 1)[0];
    return round2(100 - sumPct(ps));
  }

  /* ── Writes ───────────────────────────────────────────────────────── */

  function declare(listingId, spec) {
    spec = spec || {};
    var problem = validate(spec);
    if (problem) return Promise.resolve({ ok: false, error: problem });

    var partners = [];
    if (spec.type === 'partnership') {
      partners = (spec.partners || [])
        .filter(function (p) { return normContact(p.contact); })
        .map(function (p) {
          return {
            name:    String(p.name || '').trim(),
            contact: String(p.contact || '').trim(),
            equity_pct: spec.split === 'custom' ? round2(p.equity_pct) : null
          };
        });
    }

    return rpc('listing_declare_ownership', {
      p_listing_id:     listingId,
      p_type:           spec.type,
      p_split:          spec.type === 'partnership' ? (spec.split || 'equal') : null,
      p_partners:       partners,
      p_holder_name:    spec.type === 'on_behalf' ? String(spec.holder_name || '').trim() : null,
      p_holder_contact: spec.type === 'on_behalf' ? String(spec.holder_contact || '').trim() : null,
      p_note:           spec.note ? String(spec.note).slice(0, 500) : null
    });
  }

  function transfer(listingId, to) {
    to = to || {};
    if (!String(to.name || '').trim()) {
      return Promise.resolve({ ok: false, error: 'Who are you transferring it to?' });
    }
    if (!looksLikeContact(to.contact)) {
      return Promise.resolve({ ok: false, error: 'Give their email address or phone number.' });
    }
    return rpc('listing_transfer_start', {
      p_listing_id: listingId,
      p_to_name:    String(to.name).trim(),
      p_to_contact: String(to.contact).trim(),
      p_note:       to.note ? String(to.note).slice(0, 500) : null
    }).then(function (r) {
      if (!r || !r.ok || !r.transfer_id) return r;
      return sendInvite(r.transfer_id).then(function (mail) {
        return Object.assign({}, r, {
          email_ok: !!(mail && mail.ok),
          emailed: !!(mail && mail.emailed),
          sender_emailed: !!(mail && mail.sender_emailed),
          claim_url: mail && mail.claim_url,
          email_error: mail && !mail.ok ? mail.error : null
        });
      });
    });
  }

  function notifyDecision(id) {
    if (!id || !global.fetch || !global.ApaSession || !global.ApaSession.token) {
      return Promise.resolve({ ok: false, error: 'The email update is delayed.' });
    }
    return global.ApaSession.token().then(function (token) {
      if (!token) return { ok: false, error: 'The email update is delayed.' };
      function attempt() {
        return global.fetch('/api/email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
          body: JSON.stringify({ action: 'listing-transfer-decision', transferId: id })
        }).then(function (r) {
          return r.json().catch(function () { return {}; }).then(function (d) {
            return r.ok ? d : { ok: false, error: d.error || 'The email update is delayed.' };
          });
        }, function () { return { ok: false, error: 'The email update is delayed.' }; });
      }
      return attempt().then(function (out) {
        if (out && out.ok) return out;
        return new Promise(function (resolve) { setTimeout(function () { attempt().then(resolve); }, 900); });
      });
    }).catch(function () { return { ok: false, error: 'The email update is delayed.' }; });
  }

  function accept(id)  {
    return rpc('listing_transfer_accept', { p_transfer_id: id }).then(function (r) {
      if (!r || !r.ok) return r;
      return notifyDecision(id).then(function (mail) {
        return Object.assign({}, r, { email_ok: !!(mail && mail.ok) });
      });
    });
  }
  function decline(id) {
    return rpc('listing_transfer_decline', { p_transfer_id: id }).then(function (r) {
      if (!r || !r.ok) return r;
      return notifyDecision(id).then(function (mail) {
        return Object.assign({}, r, { email_ok: !!(mail && mail.ok) });
      });
    });
  }
  function cancelTransfer(id) { return rpc('listing_transfer_cancel', { p_transfer_id: id }); }
  function confirmSeat(id)    { return rpc('listing_partner_confirm', { p_partner_id: id }); }

  /* The browser sends only the transfer id. The API re-reads the transfer
     with service credentials, checks that auth.uid() is its sender, and
     derives the recipient and listing itself. A caller cannot turn this
     into a send-email-to-anyone endpoint. */
  function sendInvite(id) {
    var fallbackUrl = global.location && global.location.origin
      ? global.location.origin + '/dashboard.html?claim=' + encodeURIComponent(id || '')
      : null;
    if (!id || !global.fetch || !global.ApaSession || !global.ApaSession.token) {
      return Promise.resolve({ ok: false, error: 'The invitation could not be sent.', claim_url: fallbackUrl });
    }
    return global.ApaSession.token().then(function (token) {
      if (!token) return { ok: false, error: 'Sign in again to send the invitation.' };
      function attempt() {
        return global.fetch('/api/email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
          body: JSON.stringify({ action: 'listing-claim', transferId: id })
        }).then(function (r) {
          return r.json().catch(function () { return {}; }).then(function (d) {
            if (!r.ok) return { ok: false, error: d.error || 'The invitation could not be sent.', claim_url: d.claim_url || fallbackUrl };
            return d;
          });
        }, function () {
          return { ok: false, error: 'The invitation could not be sent.', claim_url: fallbackUrl };
        });
      }
      return attempt().then(function (out) {
        if (out && out.ok) return out;
        return new Promise(function (resolve) { setTimeout(function () { attempt().then(resolve); }, 900); });
      });
    }).catch(function (e) {
      warn('sendInvite', e);
      return { ok: false, error: 'The invitation could not be sent.', claim_url: fallbackUrl };
    });
  }

  /* ── Reads ────────────────────────────────────────────────────────── */

  /* Listings waiting for the signed-in person to claim. The caller never
     says who they are — the function reads their own email and phone — so
     this cannot be used to enumerate anybody else's inbox. */
  function inbox() {
    return rpc('listing_transfers_for_me').then(function (r) {
      if (!r || !r.ok) return [];
      return r.transfers || [];
    });
  }

  function forListing(listingId) {
    var c = client();
    if (!c) return Promise.resolve(null);
    return c.from('v_listing_ownership')
      .select('*').eq('listing_id', listingId).maybeSingle()
      .then(function (r) { return (r && r.data) || null; })
      .catch(function (e) { warn('forListing', e); return null; });
  }

  function forListings(ids) {
    var c = client();
    if (!c || !ids || !ids.length) return Promise.resolve({});
    return c.from('v_listing_ownership')
      .select('*').in('listing_id', ids)
      .then(function (r) {
        var by = {};
        ((r && r.data) || []).forEach(function (row) { by[row.listing_id] = row; });
        return by;
      })
      .catch(function (e) { warn('forListings', e); return {}; });
  }

  /* ── Copy ─────────────────────────────────────────────────────────── */

  /* One sentence describing a listing's ownership, for a badge or a row.
     Kept here so "Held for Mama Zawadi" is worded identically everywhere it
     appears rather than being re-invented per screen. */
  function describe(row) {
    if (!row) return '';
    if (row.pending_transfer_id && row.ownership_type !== 'on_behalf') {
      return 'Transfer to ' + (row.pending_transfer_to || 'someone') + ' pending';
    }
    if (row.ownership_type === 'on_behalf') {
      return 'Held for ' + (row.held_for_name || 'someone else');
    }
    if (row.ownership_type === 'partnership') {
      var n = Number(row.partner_count || 0);
      return 'Partnership · ' + n + ' co-owner' + (n === 1 ? '' : 's');
    }
    return 'You operate this listing';
  }

  /* ── The claim inbox, as a component ──────────────────────────────────
     A listing transferred to somebody is worth nothing until they see it,
     and the person receiving one is usually NOT looking at a partner
     dashboard — they are a traveller who has just been handed a building.

     So this mounts itself into any `#ownership-inbox` on the page and
     renders nothing at all when there is nothing waiting. A page opts in
     with one empty div and one script tag, which is the only way this ends
     up on every surface that needs it rather than the two we remembered.

     It brings its own styles for the same reason: a banner that inherits a
     dashboard's CSS is a banner that looks broken on the next dashboard. */
  var CSS_ID = 'apa-ownership-css';
  var CSS = ''
    + '.apa-oi{margin:0 0 18px;display:grid;gap:10px}'
    + '.apa-oi-c{display:flex;gap:14px;align-items:flex-start;padding:15px 17px;border-radius:16px;'
    +   'background:linear-gradient(135deg,rgba(45,212,191,.09),rgba(67,97,255,.07));'
    +   'border:1px solid rgba(67,97,255,.2);font-family:inherit}'
    + '.apa-oi-i{width:38px;height:38px;flex:none;border-radius:12px;display:grid;place-items:center;'
    +   'background:linear-gradient(135deg,#2DD4BF,#4361FF);color:#fff}'
    + '.apa-oi-i svg{width:18px;height:18px}'
    + '.apa-oi-b{flex:1;min-width:0}'
    + '.apa-oi-t{font-weight:800;font-size:14px;line-height:1.35;margin-bottom:3px}'
    + '.apa-oi-d{font-size:12.5px;line-height:1.6;opacity:.72}'
    + '.apa-oi-a{display:flex;gap:8px;margin-top:11px;flex-wrap:wrap}'
    + '.apa-oi-btn{padding:8px 15px;border-radius:10px;border:none;cursor:pointer;'
    +   'font-family:inherit;font-size:12.5px;font-weight:700;transition:opacity .2s}'
    + '.apa-oi-btn:disabled{opacity:.5;cursor:default}'
    + '.apa-oi-yes{background:linear-gradient(135deg,#2DD4BF,#4361FF);color:#fff}'
    + '.apa-oi-no{background:transparent;color:inherit;opacity:.6;'
    +   'border:1.5px solid currentColor}'
    + '.apa-oi-e{margin-top:9px;font-size:12px;font-weight:600;color:#E11D48}'
    + '.apa-claim{border:0;padding:0;width:min(540px,calc(100vw - 28px));border-radius:26px;'
    +   'background:#fff;color:#151528;box-shadow:0 28px 90px rgba(13,13,34,.32);font-family:inherit;overflow:hidden}'
    + '.apa-claim::backdrop{background:rgba(10,10,25,.62);backdrop-filter:blur(8px)}'
    + '.apa-claim-h{height:122px;padding:26px;background:linear-gradient(135deg,#2DD4BF,#4361FF 58%,#7C3AED);color:#fff;display:flex;align-items:flex-end}'
    + '.apa-claim-h span{font-size:12px;font-weight:800;letter-spacing:.13em;text-transform:uppercase;opacity:.8}'
    + '.apa-claim-b{padding:26px}'
    + '.apa-claim-b h2{font-size:25px;line-height:1.15;letter-spacing:-.5px;margin:0 0 10px}'
    + '.apa-claim-b p{font-size:14px;line-height:1.65;margin:0;color:#66677d}'
    + '.apa-claim-meta{margin:18px 0;padding:14px 16px;border-radius:15px;background:#f5f6ff;font-size:13px;line-height:1.55}'
    + '.apa-claim-actions{display:flex;gap:9px;flex-wrap:wrap;margin-top:20px}'
    + '.apa-claim-actions button,.apa-claim-actions a{appearance:none;border:0;border-radius:12px;padding:12px 18px;font:750 13px/1 inherit;cursor:pointer;text-decoration:none;text-align:center}'
    + '.apa-claim-primary{background:linear-gradient(135deg,#2DD4BF,#4361FF);color:#fff;flex:1}'
    + '.apa-claim-later{background:#f1f2f7;color:#414258}'
    + '.apa-claim-decline{background:transparent;color:#a23850}'
    + '@media(max-width:520px){.apa-claim-actions>*{width:100%;flex:auto}.apa-claim-b{padding:22px}}';

  function injectCSS() {
    try {
      if (document.getElementById(CSS_ID)) return;
      var st = document.createElement('style');
      st.id = CSS_ID; st.textContent = CSS;
      document.head.appendChild(st);
    } catch (e) { warn('css', e); }
  }

  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
      return { '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c];
    });
  }

  function claimIdFromUrl() {
    try {
      var id = new URLSearchParams(global.location.search).get('claim') || '';
      return /^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(id) ? id : null;
    } catch (e) { return null; }
  }

  function clearClaimUrl() {
    try {
      var u = new URL(global.location.href);
      u.searchParams.delete('claim');
      global.history.replaceState({}, '', u.pathname + (u.search ? u.search : '') + u.hash);
    } catch (e) {}
  }

  function claimDialog(item, mismatch) {
    injectCSS();
    var old = document.getElementById('apa-claim-dialog');
    if (old) old.remove();
    var d = document.createElement('dialog');
    d.id = 'apa-claim-dialog'; d.className = 'apa-claim';
    if (mismatch) {
      d.innerHTML = '<div class="apa-claim-h"><span>Listing invitation</span></div>'
        + '<div class="apa-claim-b"><h2>This invitation belongs to another account</h2>'
        + '<p>The invitation was sent to a specific email or phone number. To claim it:</p>'
        + '<ul style="font-size:13px;line-height:1.7;color:#66677d;padding-left:18px;margin:10px 0 14px">'
        + '<li><strong>If sent to an email</strong> \u2014 sign in with that exact email address.</li>'
        + '<li><strong>If sent to a phone number</strong> \u2014 make sure your account has that phone number. '
        + 'You can add it during sign-up or update it in your profile.</li></ul>'
        + '<p style="font-size:12px;color:#888">The link itself never grants ownership \u2014 your identity has to match.</p>'
        + '<div class="apa-claim-actions"><a class="apa-claim-primary" href="auth.html?next='
        + encodeURIComponent(global.location.pathname + global.location.search) + '">Use another account</a>'
        + '<button class="apa-claim-later" data-close>Close</button></div></div>';
    } else {
      d.innerHTML = '<div class="apa-claim-h"><span>Ready for your review</span></div>'
        + '<div class="apa-claim-b"><h2>' + esc(item.title || 'A listing was created for you') + '</h2>'
        + '<p>Review the handover before it goes public. Accepting makes you the owner and activates the listing. Declining keeps it private and returns it to the person who prepared it.</p>'
        + '<div class="apa-claim-meta"><strong>' + esc(item.title || 'Listing') + '</strong>'
        + (item.city ? '<br>' + esc(item.city) : '') + '<br>Prepared by ' + esc(item.from_name || 'a Cabana partner') + '</div>'
        + '<div class="apa-claim-actions"><button class="apa-claim-primary" data-claim-act="accept">Accept and claim</button>'
        + '<button class="apa-claim-later" data-close>Decide later</button>'
        + '<button class="apa-claim-decline" data-claim-act="decline">Decline</button></div>'
        + '<div class="apa-oi-e" data-modal-error hidden></div></div>';
    }
    document.body.appendChild(d);
    d.querySelectorAll('[data-close]').forEach(function (b) {
      b.addEventListener('click', function () { d.close(); clearClaimUrl(); });
    });
    d.querySelectorAll('[data-claim-act]').forEach(function (b) {
      b.addEventListener('click', function () {
        var act = b.getAttribute('data-claim-act');
        var err = d.querySelector('[data-modal-error]');
        d.querySelectorAll('button').forEach(function (x) { x.disabled = true; });
        b.textContent = act === 'accept' ? 'Claiming…' : 'Declining…';
        (act === 'accept' ? accept(item.id) : decline(item.id)).then(function (r) {
          if (r && r.ok) {
            clearClaimUrl();
            if (act === 'accept') global.location.href = 'partner-listings.html?claimed=' + encodeURIComponent(r.listing_id || item.listing_id || '1');
            else { d.close(); mountInbox(); }
            return;
          }
          d.querySelectorAll('button').forEach(function (x) { x.disabled = false; });
          b.textContent = act === 'accept' ? 'Accept and claim' : 'Decline';
          if (err) { err.textContent = (r && r.error) || 'That did not work. Try again.'; err.hidden = false; }
        });
      });
    });
    if (d.showModal) d.showModal(); else d.setAttribute('open', '');
  }

  function renderInbox(host, items) {
    if (!host) return;
    if (!items || !items.length) { host.innerHTML = ''; return; }
    injectCSS();

    host.innerHTML = '<div class="apa-oi">' + items.map(function (t) {
      var onBehalf = t.kind === 'on_behalf';
      return '<div class="apa-oi-c" data-t="' + esc(t.id) + '">'
        + '<span class="apa-oi-i"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" '
        +   'stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">'
        +   '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>'
        +   '</svg></span>'
        + '<span class="apa-oi-b">'
        +   '<span class="apa-oi-t">'
        +     (onBehalf ? 'A listing was set up for you' : 'Someone wants to hand you a listing')
        +   '</span>'
        +   '<span class="apa-oi-d">'
        +     '<strong>' + esc(t.title || 'A listing') + '</strong>'
        +     (t.city ? ' in ' + esc(t.city) : '') + ' \u00b7 from ' + esc(t.from_name || 'a Cabana partner') + '. '
        +     (t.note ? '\u201c' + esc(t.note) + '\u201d ' : '')
        +     'Accept it and the listing becomes yours \u2014 its bookings, its payouts and its calendar.'
        +   '</span>'
        +   '<span class="apa-oi-a">'
        +     '<button class="apa-oi-btn apa-oi-yes" data-act="accept">Accept the listing</button>'
        +     '<button class="apa-oi-btn apa-oi-no" data-act="decline">Not mine</button>'
        +   '</span>'
        +   '<span class="apa-oi-e" data-err hidden></span>'
        + '</span>'
        + '</div>';
    }).join('') + '</div>';

    host.querySelectorAll('[data-act]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var card = btn.closest('[data-t]');
        var id   = card && card.getAttribute('data-t');
        var err  = card && card.querySelector('[data-err]');
        var act  = btn.getAttribute('data-act');
        if (!id) return;

        card.querySelectorAll('button').forEach(function (b) { b.disabled = true; });
        if (err) { err.hidden = true; }
        btn.textContent = act === 'accept' ? 'Accepting…' : 'Declining…';

        (act === 'accept' ? accept(id) : decline(id)).then(function (r) {
          if (r && r.ok) {
            /* Reload rather than patch the DOM. Accepting a listing changes
               what half the page is allowed to show, and a dashboard that
               half-updates is worse than one that blinks. */
            if (act === 'accept' && r.listing_id) {
              global.location.href = 'partner-listings.html';
            } else {
              mountInbox(host);
            }
            return;
          }
          card.querySelectorAll('button').forEach(function (b) { b.disabled = false; });
          btn.textContent = act === 'accept' ? 'Accept the listing' : 'Not mine';
          if (err) { err.textContent = (r && r.error) || 'That did not work. Try again.'; err.hidden = false; }
        });
      });
    });
  }

  function mountInbox(host) {
    host = host || document.getElementById('ownership-inbox');
    if (!host) return Promise.resolve([]);
    return inbox().then(function (items) {
      renderInbox(host, items);
      var wanted = claimIdFromUrl();
      if (wanted) {
        var match = items.filter(function (x) { return String(x.id) === wanted; })[0];
        claimDialog(match || null, !match);
      }
      return items;
    });
  }

  /* Self-mount. A page opts in with `<div id="ownership-inbox"></div>` and
     nothing else; with no such div this costs one getElementById. */
  function autoMount() {
    if (document.getElementById('ownership-inbox')) {
      /* After ApaSession has settled, so the first call carries a token
         rather than failing and leaving the div empty. */
      if (global.ApaSession && global.ApaSession.ready) {
        global.ApaSession.ready(function (state) {
          var wanted = claimIdFromUrl();
          if (wanted && (!state || state.status !== 'user')) {
            var next = global.location.pathname + global.location.search;
            try { global.sessionStorage.setItem('auth_next', next); } catch (e) {}
            global.location.replace('auth.html?next=' + encodeURIComponent(next));
            return;
          }
          mountInbox();
        });
      } else {
        setTimeout(function () { mountInbox(); }, 900);
      }
    }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoMount);
  } else { autoMount(); }

  global.ApaOwnership = {
    TYPES: TYPES,
    typeFor: typeFor,

    declare: declare,
    transfer: transfer,
    cancelTransfer: cancelTransfer,
    accept: accept,
    decline: decline,
    confirmSeat: confirmSeat,
    sendInvite: sendInvite,

    inbox: inbox,
    forListing: forListing,
    forListings: forListings,

    validate: validate,
    splitEqually: splitEqually,
    operatorShare: operatorShare,
    sumPct: sumPct,
    normContact: normContact,
    looksLikeContact: looksLikeContact,
    describe: describe,

    mountInbox: mountInbox,
    renderInbox: renderInbox
  };
})(window);
