/* ═══════════════════════════════════════════════════════════════════════════
   CABANA · LISTING OWNERSHIP  (v2)
   apa-ownership.js

   The one place the browser knows how a listing belongs to somebody.

   A listing is one of three SHAPES:

     sole         one person operates and manages it
     partnership  several people co-own it, with shares that must total 100%
     on_behalf    somebody filled the form in for a named owner; the listing
                  transfers the moment that owner claims it

   Within a partnership (and on any listing), there are now four ROLES:

     operator     the primary account holder (one per listing, always)
     partner      co-owner with a declared equity share
     manager      operational access only — zero equity. For property
                  management companies, Airbnb co-hosts, caretakers, anyone
                  who runs the listing day-to-day but does not own it.
                  A manager may hold manages_payouts, delegating payout
                  approval from the operator to that manager.
     viewer       read-only access — zero equity. For accountants, investors,
                  silent supervisors who need visibility but must change nothing.

   Payout routing (partnerships only):

     consolidated  every booking payout goes to one nominated account
                   (the operator by default, or any other partner nominated
                   explicitly). They split it offline however they like.
     split         the platform credits each partner's wallet at settlement,
                   in the ratio of their equity_bps. The money never passes
                   through anyone else's hands.

   WHAT THIS FILE DOES NOT DO
   ──────────────────────────
   It does not decide anything. Every write is an RPC into a security-definer
   function that re-derives the caller from auth.uid() and re-checks ownership.
   The equity arithmetic below gives someone a live total as they type —
   Postgres does it again, and Postgres is right. That duplication is
   deliberate: a share validated only in a browser is a share validated by
   the one participant an interested party controls.

   Public API:
     ApaOwnership.TYPES                          the three shapes, with copy
     ApaOwnership.ROLES                          all four roles, with copy
     ApaOwnership.PAYOUT_ROUTINGS               'consolidated' | 'split', with copy

     ApaOwnership.declare(listingId, spec)       → { ok, ownership_type, … }
     ApaOwnership.addSeat(listingId, seat)       → { ok, seat_id, … }
     ApaOwnership.removeSeat(seatId)             → { ok }
     ApaOwnership.setPayoutRouting(listingId, routing, toId?)
                                                 → { ok, routing, to_name }

     ApaOwnership.forListing(listingId)          → ownership row, or null
     ApaOwnership.forListings(ids)               → { id → row }
     ApaOwnership.myPayoutSplits(listingId?)     → [ split rows ]

     ApaOwnership.transfer(listingId, to)        → { ok, transfer_id }
     ApaOwnership.cancelTransfer(id)
     ApaOwnership.inbox()                        → [ listings waiting for you ]
     ApaOwnership.mountInbox(el?)
     ApaOwnership.accept(transferId)
     ApaOwnership.decline(transferId)
     ApaOwnership.sendInvite(transferId)
     ApaOwnership.confirmSeat(partnerId)

     ApaOwnership.splitEqually(n)                → [33.34, 33.33, 33.33]
     ApaOwnership.validate(spec)                 → null, or a sentence to show
     ApaOwnership.validateSeat(seat)             → null, or a sentence to show
     ApaOwnership.describe(row)                  → 'Partnership · 3 co-owners'
     ApaOwnership.describePayoutRouting(row)     → human sentence about routing
     ApaOwnership.normContact(text)
     ApaOwnership.looksLikeEmail(text)
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

  function rpc(fn, args) {
    var c = client();
    if (!c || !c.rpc) {
      return Promise.resolve({ ok: false, error: 'Not connected. Try again in a moment.' });
    }
    function doRpc() {
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
    if (global.ApaSession && global.ApaSession.token) {
      return global.ApaSession.token().then(function (tok) {
        if (tok && c.auth && c.auth.setSession) {
          try {
            var headers = { Authorization: 'Bearer ' + tok };
            return c.rpc(fn, args || {}, { headers: headers }).then(function (r) {
              if (r.error) return { ok: false, error: friendly(r.error) };
              var d = r.data;
              if (d && typeof d === 'object' && 'ok' in d) return d;
              return { ok: true, data: d };
            }).catch(function () { return doRpc(); });
          } catch (e) { return doRpc(); }
        }
        return doRpc();
      }).catch(function () { return doRpc(); });
    }
    return doRpc();
  }

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

  /* ── The three ownership shapes ────────────────────────────────────── */
  var TYPES = [
    {
      key:   'sole',
      label: 'I operate and manage it myself',
      short: 'Sole operator',
      blurb: 'You own or manage this listing on your own. Bookings, payouts and '
           + 'guest messages all come to you. You can still add a manager or viewer '
           + 'later if you need someone to help run it.',
      icon: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>'
    },
    {
      key:   'partnership',
      label: 'We own it together',
      short: 'Partnership',
      blurb: 'Several of you co-own this listing. Add the other partners and how '
           + 'the ownership is split. Choose whether the platform pays out to one '
           + 'nominated account or splits directly to each partner\'s wallet.',
      icon: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>'
          + '<path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>'
    },
    {
      key:   'on_behalf',
      label: 'I am listing it for someone else',
      short: 'On behalf of someone',
      blurb: 'The property is not yours. Give the owner\'s name and email and the '
           + 'listing is held for them — the moment they claim it, it becomes theirs '
           + 'and leaves your account entirely.',
      icon: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>'
          + '<path d="m17 11 2 2 4-4"/>'
    }
  ];

  /* ── The four seat roles ─────────────────────────────────────────────── */
  var ROLES = [
    {
      key:         'partner',
      label:       'Co-owner (partner)',
      short:       'Partner',
      hasEquity:   true,
      blurb:       'Owns a share of this listing. Gets paid according to their equity '
                 + 'when payouts are split, or shares the payout offline under '
                 + 'consolidated routing. They can see earnings, bookings and reviews.',
      icon: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>'
    },
    {
      key:         'manager',
      label:       'Manager / Co-host',
      short:       'Manager',
      hasEquity:   false,
      blurb:       'Runs the listing operationally — updates prices, manages the '
                 + 'calendar, handles guests — but does not own any part of it. '
                 + 'Right for a property management company, a caretaker, or a '
                 + 'full-time co-host who is paid a fee rather than a share. '
                 + 'A manager can optionally be granted payout-approval rights so '
                 + 'they can release payouts without the owner stepping in.',
      icon: '<rect x="2" y="7" width="20" height="14" rx="2"/>'
          + '<path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>'
    },
    {
      key:         'viewer',
      label:       'Viewer (read-only)',
      short:       'Viewer',
      hasEquity:   false,
      blurb:       'Can see the listing\'s bookings, earnings and calendar but cannot '
                 + 'change anything. Right for a silent investor, an accountant, or a '
                 + 'supervisor who needs visibility but should not operate the listing.',
      icon: '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>'
          + '<circle cx="12" cy="12" r="3"/>'
    }
  ];

  /* ── Payout routing options ──────────────────────────────────────────── */
  var PAYOUT_ROUTINGS = [
    {
      key:    'consolidated',
      label:  'Pay one account',
      short:  'Consolidated',
      blurb:  'Every booking payout goes to one nominated account — the operator '
            + 'by default, or any other partner you choose. That person is responsible '
            + 'for dividing the money with their partners however they have agreed. '
            + 'Simple, and the right choice when partners trust each other and prefer '
            + 'to handle splits themselves.',
      icon: '<circle cx="12" cy="12" r="10"/>'
          + '<path d="M12 6v6l4 2"/>'
    },
    {
      key:    'split',
      label:  'Split to each partner automatically',
      short:  'Automatic split',
      blurb:  'The platform divides every payout the moment a booking settles, '
            + 'crediting each partner\'s wallet in proportion to their equity share. '
            + 'No money passes through any partner\'s hands on the way to another. '
            + 'Every partner sees their own cut, dated, with the booking it came from. '
            + 'The right choice when partners want transparency and certainty without '
            + 'having to trust anyone to forward their share.',
      icon: '<line x1="8" y1="6" x2="21" y2="6"/>'
          + '<line x1="8" y1="12" x2="21" y2="12"/>'
          + '<line x1="8" y1="18" x2="21" y2="18"/>'
          + '<line x1="3" y1="6" x2="3.01" y2="6"/>'
          + '<line x1="3" y1="12" x2="3.01" y2="12"/>'
          + '<line x1="3" y1="18" x2="3.01" y2="18"/>'
    }
  ];

  function typeFor(key)    { return TYPES.filter(function(t){ return t.key===key; })[0] || TYPES[0]; }
  function roleFor(key)    { return ROLES.filter(function(r){ return r.key===key; })[0] || ROLES[0]; }
  function routingFor(key) { return PAYOUT_ROUTINGS.filter(function(r){ return r.key===key; })[0] || PAYOUT_ROUTINGS[0]; }

  /* ── Contact helpers ─────────────────────────────────────────────────── */
  function normContact(text) {
    var s = String(text == null ? '' : text).trim();
    if (!s) return null;
    if (s.indexOf('@') > -1) return s.toLowerCase();
    var digits = s.replace(/[^0-9]/g, '');
    if (digits.length < 9) return null;
    return digits.slice(-9);
  }

  function looksLikeEmail(text) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(text == null ? '' : text).trim());
  }

  /* ── Equity helpers ──────────────────────────────────────────────────── */
  function splitEqually(seats) {
    var n = Math.max(1, Math.round(Number(seats) || 1));
    var each = Math.floor(10000 / n);
    var out  = [];
    for (var i = 0; i < n; i++) out.push(each / 100);
    out[0] = (each + (10000 - each * n)) / 100;
    return out;
  }

  function sumPct(partners) {
    return (partners || []).reduce(function (t, p) {
      return t + (Number(p.equity_pct) || 0);
    }, 0);
  }

  function round2(n) { return Math.round((Number(n) || 0) * 100) / 100; }

  function operatorShare(spec) {
    if (!spec || spec.type !== 'partnership') return 100;
    var ps = (spec.partners || []).filter(function (p) { return normContact(p.contact); });
    if (spec.split === 'equal') return splitEqually(ps.length + 1)[0];
    return round2(100 - sumPct(ps));
  }

  /* ── Validation ─────────────────────────────────────────────────────── */
  function validate(spec) {
    spec = spec || {};
    if (spec.type === 'sole') return null;

    if (spec.type === 'on_behalf') {
      if (!String(spec.holder_name || '').trim()) return 'Who is this listing for? Give their name.';
      if (!looksLikeEmail(spec.holder_contact)) {
        return 'Give their email address, so they can claim the listing.';
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
        if (!looksLikeEmail(p.contact)) return 'Every partner needs an email address.';
        var norm = normContact(p.contact);
        if (seen[norm]) return 'You have added the same person twice.';
        seen[norm] = 1;
      }
      if (spec.split === 'custom') {
        var total = sumPct(ps);
        if (total <= 0) return 'Give each partner a share.';
        if (total >= 100) {
          return 'Those shares come to ' + round2(total) + '%, leaving nothing for you. '
               + 'They must total less than 100%.';
        }
      }
      return null;
    }
    return 'Choose how this listing is owned.';
  }

  /* Validate a single non-owner seat before adding it. */
  function validateSeat(seat) {
    seat = seat || {};
    if (!String(seat.name || '').trim()) return 'Give this person\'s name.';
    if (!looksLikeEmail(seat.contact)) return 'Give their email address.';
    if (!seat.role || ['manager', 'viewer', 'partner'].indexOf(seat.role) === -1) {
      return 'Choose a role for this person.';
    }
    if (seat.role === 'manager' && seat.manages_payouts) {
      /* Valid — no extra validation needed; the DB enforces one per listing. */
    }
    if ((seat.role === 'manager' || seat.role === 'viewer') && Number(seat.equity_pct) > 0) {
      return 'Managers and viewers do not hold an equity share. '
           + 'Use the "partner" role if they co-own the listing.';
    }
    if (seat.role === 'partner') {
      var pct = Number(seat.equity_pct) || 0;
      if (pct < 0 || pct >= 100) return 'Equity must be between 0% and 99.99%.';
    }
    return null;
  }

  /* ── Descriptions ───────────────────────────────────────────────────── */
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
      var m = Number(row.manager_count || 0);
      var base = 'Partnership \u00b7 ' + n + ' co-owner' + (n === 1 ? '' : 's');
      if (m > 0) base += ' \u00b7 ' + m + ' manager' + (m === 1 ? '' : 's');
      return base;
    }
    return 'You operate this listing';
  }

  function describePayoutRouting(row) {
    if (!row || row.ownership_type !== 'partnership') return '';
    if (row.payout_routing === 'split') {
      return 'Payouts split automatically to each partner\'s wallet';
    }
    var name = row.payout_to_name || 'the operator';
    return 'Payouts consolidated to ' + name;
  }

  /* ── Writes: ownership declaration ────────────────────────────────── */
  function declare(listingId, spec) {
    spec = spec || {};
    var problem = validate(spec);
    if (problem) return Promise.resolve({ ok: false, error: problem });

    var partners = [];
    if (spec.type === 'partnership') {
      partners = (spec.partners || [])
        .filter(function (p) { return looksLikeEmail(p.contact); })
        .map(function (p) {
          return {
            name:       String(p.name || '').trim(),
            contact:    String(p.contact || '').trim().toLowerCase(),
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
      p_holder_contact: spec.type === 'on_behalf' ? String(spec.holder_contact || '').trim().toLowerCase() : null,
      p_note:           spec.note ? String(spec.note).slice(0, 500) : null
    });
  }

  /* ── Writes: add a single seat (manager / viewer / extra partner) ── */
  function addSeat(listingId, seat) {
    seat = seat || {};
    var problem = validateSeat(seat);
    if (problem) return Promise.resolve({ ok: false, error: problem });

    return rpc('listing_add_seat', {
      p_listing_id:      listingId,
      p_name:            String(seat.name || '').trim(),
      p_contact:         String(seat.contact || '').trim().toLowerCase(),
      p_role:            seat.role,
      p_equity_pct:      seat.role === 'partner' ? round2(seat.equity_pct) : 0,
      p_manages_payouts: !!(seat.role === 'manager' && seat.manages_payouts),
      p_note:            seat.note ? String(seat.note).slice(0, 500) : null
    });
  }

  function removeSeat(seatId) {
    return rpc('listing_partner_remove', { p_partner_id: seatId });
  }

  /* ── Writes: payout routing ─────────────────────────────────────── */
  function setPayoutRouting(listingId, routing, toId) {
    if (routing !== 'consolidated' && routing !== 'split') {
      return Promise.resolve({ ok: false, error: 'Routing must be "consolidated" or "split".' });
    }
    return rpc('listing_set_payout_routing', {
      p_listing_id: listingId,
      p_routing:    routing,
      p_to_id:      routing === 'consolidated' ? (toId || null) : null
    });
  }

  /* ── Writes: transfers ──────────────────────────────────────────── */
  function transfer(listingId, to) {
    to = to || {};
    if (!String(to.name || '').trim()) {
      return Promise.resolve({ ok: false, error: 'Who are you transferring it to?' });
    }
    if (!looksLikeEmail(to.contact)) {
      return Promise.resolve({ ok: false, error: 'Give their email address. Claims are verified by email, so a phone number cannot be used here.' });
    }
    return rpc('listing_transfer_start', {
      p_listing_id: listingId,
      p_to_name:    String(to.name).trim(),
      p_to_contact: String(to.contact).trim().toLowerCase(),
      p_note:       to.note ? String(to.note).slice(0, 500) : null
    }).then(function (r) {
      if (!r || !r.ok || !r.transfer_id) return r;
      return sendInvite(r.transfer_id).then(function (mail) {
        return Object.assign({}, r, {
          email_ok:       !!(mail && mail.ok),
          emailed:        !!(mail && mail.emailed),
          sender_emailed: !!(mail && mail.sender_emailed),
          claim_url:      mail && mail.claim_url,
          email_error:    mail && !mail.ok ? mail.error : null
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

  function accept(id) {
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

  /* ── Reads ──────────────────────────────────────────────────────── */
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

  /* Per-partner payout split rows for the signed-in user. */
  function myPayoutSplits(listingId) {
    var c = client();
    if (!c) return Promise.resolve([]);
    var q = c.from('listing_payout_splits').select('*').order('created_at', { ascending: false });
    if (listingId) q = q.eq('listing_id', listingId);
    return q.then(function (r) { return (r && r.data) || []; })
            .catch(function (e) { warn('myPayoutSplits', e); return []; });
  }

  /* ── Copy helpers ───────────────────────────────────────────────── */
  function describe2(row) {
    if (!row) return '';
    if (row.pending_transfer_id && row.ownership_type !== 'on_behalf') {
      return 'Transfer to ' + (row.pending_transfer_to || 'someone') + ' pending';
    }
    if (row.ownership_type === 'on_behalf') {
      return 'Held for ' + (row.held_for_name || 'someone else');
    }
    if (row.ownership_type === 'partnership') {
      var n = Number(row.partner_count || 0);
      var m = Number(row.manager_count || 0);
      var base = 'Partnership \u00b7 ' + n + ' co-owner' + (n === 1 ? '' : 's');
      if (m > 0) base += ' \u00b7 ' + m + ' manager' + (m === 1 ? '' : 's');
      return base;
    }
    return 'You operate this listing';
  }

  /* ── Inbox UI (unchanged logic, updated for new roles) ──────────── */
  var CSS_ID = 'apa-ownership-css';
  var CSS = ''
    + '.apa-oi{margin:0 0 18px;display:grid;gap:10px}'
    + '.apa-oi-c{display:flex;gap:14px;align-items:flex-start;padding:15px 17px;border-radius:16px;'
    +   'background:linear-gradient(135deg,rgba(45,212,191,.11),rgba(67,97,255,.09));'
    +   'border:1.5px solid rgba(67,97,255,.25);font-family:inherit}'
    + '.apa-oi-i{width:52px;height:52px;flex:none;border-radius:14px;display:grid;place-items:center;'
    +   'background:linear-gradient(135deg,#2DD4BF,#4361FF);color:#fff;overflow:hidden}'
    + '.apa-oi-i svg{width:22px;height:22px}'
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
      var nextUrl = global.location.pathname + global.location.search;
      var authUrl = 'auth.html?next=' + encodeURIComponent(nextUrl);
      d.innerHTML = '<div class="apa-claim-h"><span>Listing invitation</span></div>'
        + '<div class="apa-claim-b"><h2>This invitation belongs to another account</h2>'
        + '<p>The invitation was sent to a specific email address. Sign in with that exact email to claim it.</p>'
        + '<p style="margin-top:12px;font-size:12px;color:#9ca3af">The link itself never grants ownership — your identity has to match.</p>'
        + '<div class="apa-claim-actions">'
        + '<a class="apa-claim-primary" href="' + authUrl + '">Use another account</a>'
        + '<button class="apa-claim-later" data-close>Close</button>'
        + '</div></div>';
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
        b.textContent = act === 'accept' ? 'Claiming\u2026' : 'Declining\u2026';
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
      var photo = t.photo ? 'style="background-image:url(' + esc(t.photo) + ');background-size:cover;background-position:center"' : '';
      return '<div class="apa-oi-c" data-t="' + esc(t.id) + '">'
        + '<span class="apa-oi-i" ' + photo + '>'
        + (t.photo ? '' : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" '
        +   'stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">'
        +   '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>'
        +   '</svg>')
        + '</span>'
        + '<span class="apa-oi-b">'
        +   '<span class="apa-oi-t">'
        +     (onBehalf ? '\uD83C\uDFE0 A listing was set up for you' : '\uD83D\uDCEC A listing is waiting for you')
        +   '</span>'
        +   '<span class="apa-oi-d">'
        +     '<strong>' + esc(t.title || 'A listing') + '</strong>'
        +     (t.city ? ' \u00b7 ' + esc(t.city) : '') + ' \u00b7 from ' + esc(t.from_name || 'a Cabana partner') + '. '
        +     (t.note ? '\u201c' + esc(t.note) + '\u201d ' : '')
        +     'Accept it and the listing becomes yours \u2014 its bookings, payouts and calendar.'
        +   '</span>'
        +   '<span class="apa-oi-a">'
        +     '<button class="apa-oi-btn apa-oi-yes" data-act="review">Review &amp; claim \u2192</button>'
        +     '<button class="apa-oi-btn apa-oi-no" data-act="decline">Decline</button>'
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

        if (act === 'review') {
          var item = items.filter(function (x) { return String(x.id) === id; })[0];
          if (item) claimDialog(item, false);
          return;
        }

        card.querySelectorAll('button').forEach(function (b) { b.disabled = true; });
        if (err) { err.hidden = true; }
        btn.textContent = 'Declining\u2026';

        decline(id).then(function (r) {
          if (r && r.ok) {
            mountInbox(host);
            return;
          }
          card.querySelectorAll('button').forEach(function (b) { b.disabled = false; });
          btn.textContent = 'Decline';
          if (err) { err.textContent = (r && r.error) || 'That did not work. Try again.'; err.hidden = false; }
        });
      });
    });
  }

  function mountInbox(host) {
    host = host || document.getElementById('ownership-inbox');
    if (!host) return Promise.resolve([]);

    var wanted = claimIdFromUrl();

    function tryMount(attempts) {
      return inbox().then(function (items) {
        renderInbox(host, items);

        if (!wanted) return items;

        var match = items.filter(function (x) { return String(x.id) === wanted; })[0];

        if (!match && attempts > 0) {
          return new Promise(function (resolve) {
            setTimeout(function () {
              tryMount(attempts - 1).then(resolve);
            }, 800);
          });
        }

        claimDialog(match || null, !match);
        return items;
      });
    }

    return tryMount(2);
  }

  function autoMount() {
    if (document.getElementById('ownership-inbox')) {
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
    /* Constants */
    TYPES:           TYPES,
    ROLES:           ROLES,
    PAYOUT_ROUTINGS: PAYOUT_ROUTINGS,
    typeFor:         typeFor,
    roleFor:         roleFor,
    routingFor:      routingFor,

    /* Ownership declaration */
    declare:         declare,

    /* Seat management */
    addSeat:         addSeat,
    removeSeat:      removeSeat,
    confirmSeat:     confirmSeat,

    /* Payout routing */
    setPayoutRouting:        setPayoutRouting,
    describePayoutRouting:   describePayoutRouting,

    /* Transfers / inbox */
    transfer:        transfer,
    cancelTransfer:  cancelTransfer,
    accept:          accept,
    decline:         decline,
    sendInvite:      sendInvite,
    inbox:           inbox,
    mountInbox:      mountInbox,
    renderInbox:     renderInbox,

    /* Data reads */
    forListing:      forListing,
    forListings:     forListings,
    myPayoutSplits:  myPayoutSplits,

    /* Validation & formatting */
    validate:        validate,
    validateSeat:    validateSeat,
    splitEqually:    splitEqually,
    operatorShare:   operatorShare,
    sumPct:          sumPct,
    describe:        describe2,
    normContact:     normContact,
    looksLikeEmail:  looksLikeEmail
  };
})(window);
