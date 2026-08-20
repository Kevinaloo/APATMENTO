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
    });
  }

  function accept(id)  { return rpc('listing_transfer_accept',  { p_transfer_id: id }); }
  function decline(id) { return rpc('listing_transfer_decline', { p_transfer_id: id }); }
  function cancelTransfer(id) { return rpc('listing_transfer_cancel', { p_transfer_id: id }); }
  function confirmSeat(id)    { return rpc('listing_partner_confirm', { p_partner_id: id }); }

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
    + '.apa-oi-e{margin-top:9px;font-size:12px;font-weight:600;color:#E11D48}';

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
        global.ApaSession.ready(function () { mountInbox(); });
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
