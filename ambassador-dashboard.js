/* ═══════════════════════════════════════════════════════════════════════════
   CABANA · AMBASSADOR DASHBOARD  (ambassador-dashboard.html)
   ─────────────────────────────────────────────────────────────────────────
   Loads once, paints everything, then stays quiet. No polling: an ambassador
   checking their earnings does not need them to tick upward in real time,
   and a dashboard that refetches every few seconds on a Kenyan mobile
   connection is a dashboard that eats someone's bundle.

   The gate runs here too, on every load, even though ambassadors.html
   already ran it. Anyone can navigate straight to this URL, and access can
   be revoked between two page loads.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
'use strict';

var A = window.ApaAmbassador;
if (!A) return;

var esc = A.fmt.esc, kes = A.fmt.kes, ago = A.fmt.ago, UI = A.ui;
var $ = function (id) { return document.getElementById(id); };

var STATE = { me: null, leads: [], earnings: [], filter: 'all' };

/* ── Theme ────────────────────────────────────────────────────────────── */
var SUN  = '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M6.3 17.7l-1.4 1.4M19.1 4.9l-1.4 1.4"/>';
var MOON = '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>';
var AUTO = '<circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 0 0 18z" fill="currentColor" stroke="none"/>';

function paintTheme() {
  var icon = $('theme-icon'); if (!icon) return;
  var m = A.theme.get();
  icon.innerHTML = m === 'dark' ? MOON : m === 'light' ? SUN : AUTO;
  var b = $('theme'); if (b) b.setAttribute('title', 'Theme: ' + m + ' — click to change');
}
if ($('theme')) $('theme').addEventListener('click', function () { A.theme.cycle(); paintTheme(); });
paintTheme();

/* ── Lead presentation ────────────────────────────────────────────────── */
var STATUS = {
  claimed:   { label: 'Claimed',   colour: 'var(--electric)',  badge: 'b-mute' },
  signed_up: { label: 'Signed up', colour: 'var(--violet)',    badge: 'b-tier' },
  listed:    { label: 'Listed',    colour: 'var(--gold)',      badge: 'b-warn' },
  earning:   { label: 'Earning',   colour: 'var(--mint-deep)', badge: 'b-ok'   },
  expired:   { label: 'Lapsed',    colour: 'var(--ink-faint)', badge: 'b-mute' },
  rejected:  { label: 'Rejected',  colour: 'var(--err)',       badge: 'b-err'  },
};

var TYPE_LABEL = { host: 'Host', service_provider: 'Service provider', traveller: 'Traveller' };

/* ── Header ───────────────────────────────────────────────────────────── */
function paintHeader(me) {
  $('av').textContent   = A.fmt.initials(me.full_name);
  $('name').textContent = me.full_name || 'Ambassador';

  var bits = ['<span class="badge b-tier">Ambassador</span>'];
  if (me.region) bits.push(esc(me.region));
  bits.push('joined ' + ago(me.enrolled_at));
  $('sub').innerHTML = bits.join('<span style="opacity:.4">·</span>');
}

/* ── Earnings ─────────────────────────────────────────────────────────── */
function paintEarnings(me, entries) {
  var now = Date.now();
  var live = (entries || []).filter(function (e) { return e.status !== 'reversed'; });
  var avail = 0, hold = 0;
  live.forEach(function (e) {
    var v = Number(e.commission_kes || 0);
    if (!e.available_at || new Date(e.available_at).getTime() <= now) avail += v; else hold += v;
  });

  var fmt = function (v) { return kes(v); };
  UI.countUp($('earn-total'), Number(me.earned_total || 0), { format: fmt, duration: 1300 });
  UI.countUp($('earn-avail'), avail, { format: fmt });
  UI.countUp($('earn-hold'),  hold,  { format: fmt });
  UI.countUp($('earn-count'), live.length);
}

/* ── Funnel ───────────────────────────────────────────────────────────── */
function paintFunnel(leads) {
  var order = ['claimed', 'signed_up', 'listed', 'earning'];
  var counts = {};
  order.forEach(function (k) { counts[k] = 0; });
  leads.forEach(function (l) { if (counts[l.status] != null) counts[l.status]++; });

  var top = Math.max(1, Math.max.apply(null, order.map(function (k) { return counts[k]; })));

  $('funnel').innerHTML = order.map(function (k) {
    var s = STATUS[k];
    return '<div class="fn">' +
      '<div class="fn-v" data-count="' + counts[k] + '">0</div>' +
      '<div class="fn-l">' + s.label + '</div>' +
      '<div class="fn-bar"><span data-w="' + Math.round((counts[k] / top) * 100) + '" ' +
        'style="background:' + s.colour + '"></span></div>' +
    '</div>';
  }).join('');

  $('funnel').querySelectorAll('.fn-v').forEach(function (el) {
    UI.countUp(el, Number(el.getAttribute('data-count')), { duration: 850 });
  });
  /* Next frame, so the width transition has a 0 to start from. */
  requestAnimationFrame(function () {
    $('funnel').querySelectorAll('.fn-bar span').forEach(function (el) {
      el.style.width = el.getAttribute('data-w') + '%';
    });
  });
}

/* ── Ring ─────────────────────────────────────────────────────────────── */
function paintRing(me) {
  var target = Number(me.monthly_target || 10);
  var done   = Number(me.converted_this_month || 0);
  $('ring-sub').textContent = 'of ' + target;
  UI.ring($('ring'), done, target);
  $('ring').setAttribute('aria-label',
    done + ' of ' + target + ' people onboarded this month');
}

/* ── Leads ────────────────────────────────────────────────────────────── */
function paintLeads() {
  var host = $('leads');
  var rows = STATE.filter === 'all'
    ? STATE.leads
    : STATE.leads.filter(function (l) { return l.status === STATE.filter; });

  if (!rows.length) {
    host.innerHTML = STATE.leads.length ? emptyFiltered() : emptyPipeline();
    var b = host.querySelector('[data-open-claim]');
    if (b) b.addEventListener('click', openClaim);
    return;
  }

  host.innerHTML = '<div class="leads-list">' + rows.map(function (l) {
    var s = STATUS[l.status] || STATUS.claimed;
    var meta = [];
    meta.push(TYPE_LABEL[l.lead_type] || 'Host');
    if (l.city) meta.push(esc(l.city));
    if (l.category) meta.push(esc(l.category));
    meta.push(ago(l.created_at));

    /* A claim that is about to lapse is the single most actionable thing on
       this page, so it gets its own line rather than a colour nobody reads. */
    var warn = '';
    if (l.status === 'claimed') {
      var d = A.fmt.daysUntil(l.claim_expires_at);
      if (d != null && d <= 10) {
        warn = '<div class="small" style="color:var(--ember);font-weight:600;margin-top:4px">' +
               (d <= 0 ? 'Lapsing today' : 'Lapses in ' + d + ' day' + (d === 1 ? '' : 's')) + '</div>';
      }
    }

    /* The whole job of this programme is onboarding, so the button that
       DOES the onboarding belongs on the lead, not three screens away.

       It opens the ordinary listing form — the same seven steps every host
       sees — with the ownership step locked to "on behalf of" and filled in
       from the claim. The listing is built complete and stays unpublished
       until this person accepts it, so an ambassador can do all the work
       without putting somebody's property on a public website before they
       have agreed to it.

       Only for a lead that is actually still in play. Offering to build a
       listing for a rejected lead is offering to waste an afternoon. */
    var canList = l.status === 'claimed' || l.status === 'signed_up';
    var act = canList
      ? '<button class="btn btn-ghost btn-sm lead-act" type="button" ' +
          'data-onboard="' + esc(l.id) + '" ' +
          'title="Build their listing with them, on their behalf">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" ' +
          'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
          '<path d="M12 5v14M5 12h14"/></svg>Build their listing</button>'
      : '';

    return '<div class="lead">' +
      '<span class="lead-dot" style="background:' + s.colour + '"></span>' +
      '<div class="lead-main">' +
        '<div class="lead-name">' + esc(l.full_name) + '</div>' +
        '<div class="lead-meta">' + meta.join(' · ') + '</div>' + warn +
      '</div>' +
      act +
      '<span class="badge ' + s.badge + '">' + s.label + '</span>' +
    '</div>';
  }).join('') + '</div>';

  host.querySelectorAll('[data-onboard]').forEach(function (b) {
    b.addEventListener('click', function () { onboard(b.getAttribute('data-onboard')); });
  });
}

/* ── Onboarding somebody ──────────────────────────────────────────────────
   Hand the lead to the ordinary listing form rather than building a second
   one here. The parallel draft form this replaces meant every field added to
   listings had to be added twice, and the second copy was always behind.

   Everything the form needs travels in the URL, and none of it is trusted:
   `as=ambassador` and the holder's details only prefill inputs. What the
   listing ACTUALLY becomes is decided by listing_declare_ownership(), which
   re-derives the caller and re-checks their claim on this lead. */
function onboard(leadId) {
  var lead = null;
  for (var i = 0; i < STATE.leads.length; i++) {
    if (String(STATE.leads[i].id) === String(leadId)) { lead = STATE.leads[i]; break; }
  }
  if (!lead) return;

  var q = new URLSearchParams({
    from: 'ambassador',
    as: 'ambassador',
    lead: lead.id,
    behalf_name: lead.full_name || '',
    behalf_contact: lead.contact_raw || ''
  });
  if (lead.city) q.set('city', lead.city);
  location.href = 'add-listing.html?' + q.toString();
}

function emptyPipeline() {
  return '<div class="empty">' +
    '<div class="empty-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">' +
    '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 8v6M22 11h-6"/></svg></div>' +
    '<h3>Nobody claimed yet</h3>' +
    '<p>Claim someone before you go and talk to them. The claim is what reserves ' +
    'them as yours across the whole team.</p>' +
    '<button class="btn btn-primary" type="button" data-open-claim>Claim your first lead</button>' +
  '</div>';
}

function emptyFiltered() {
  return '<div class="empty">' +
    '<div class="empty-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">' +
    '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg></div>' +
    '<h3>Nothing here yet</h3><p>No leads at this stage. Try another tab.</p></div>';
}

/* ── Leaderboard ──────────────────────────────────────────────────────── */
function paintBoard(board, myId) {
  var host = $('board');
  if (!board || !board.length) {
    host.innerHTML = '<p class="small muted center" style="padding:22px 0">The team board appears once ambassadors start onboarding.</p>';
    return;
  }
  host.innerHTML = board.map(function (a) {
    var me = a.id === myId;
    return '<div class="lb-row' + (me ? ' is-me' : '') + '">' +
      '<div class="lb-rank">' + a.rank + '</div>' +
      '<div class="av av-sm">' + esc(A.fmt.initials(a.name)) + '</div>' +
      '<div style="flex:1;min-width:0">' +
        '<div style="font-weight:640;font-size:.92rem">' + esc(a.name) + (me ? ' <span class="muted">· you</span>' : '') + '</div>' +
        (a.region ? '<div class="small">' + esc(a.region) + '</div>' : '') +
      '</div>' +
      '<div style="text-align:right">' +
        '<div style="font-family:var(--font-d);font-weight:700;font-size:1.05rem" class="tnum">' + a.onboarded + '</div>' +
        '<div class="small">onboarded</div>' +
      '</div>' +
    '</div>';
  }).join('');
}

/* ── Link sharing ─────────────────────────────────────────────────────── */
function wireLink(link) {
  $('link').textContent = link;

  $('copy').addEventListener('click', function () {
    UI.copy(link).then(function (ok) {
      if (!ok) { UI.toast('Could not copy. Select the link and copy it manually.', 'err'); return; }
      UI.toast('Link copied', 'ok');
      var b = $('copy'); var was = b.textContent;
      b.textContent = 'Copied'; setTimeout(function () { b.textContent = was; }, 1600);
    });
  });

  var pitch = 'I am a Cabana ambassador. Cabana is Africa\'s zero-commission travel ' +
              'platform — hosts keep 100% of what they charge. Join through my link: ' + link;

  $('share-wa').addEventListener('click', function () {
    window.open('https://wa.me/?text=' + encodeURIComponent(pitch), '_blank', 'noopener');
  });

  $('share-sys').addEventListener('click', function () {
    if (navigator.share) {
      navigator.share({ title: 'Join Cabana', text: pitch, url: link }).catch(function () {});
    } else {
      UI.copy(pitch).then(function () { UI.toast('Message copied — paste it anywhere', 'ok'); });
    }
  });
}

/* ── Tabs ─────────────────────────────────────────────────────────────── */
function wireTabs() {
  $('tabs').querySelectorAll('button').forEach(function (b) {
    b.addEventListener('click', function () {
      $('tabs').querySelectorAll('button').forEach(function (x) {
        x.setAttribute('aria-selected', String(x === b));
      });
      STATE.filter = b.getAttribute('data-filter');
      paintLeads();
    });
  });
}

/* ── Claim ────────────────────────────────────────────────────────────── */
function openClaim() { UI.modal('claim-modal', true); }

function wireClaim() {
  $('claim-open').addEventListener('click', openClaim);
  document.querySelectorAll('#claim-modal [data-close]').forEach(function (el) {
    el.addEventListener('click', function () { UI.modal('claim-modal', false); });
  });

  /* Phone / email switch. The hint changes too, because the phone one
     explains the normalisation and would be nonsense over an email field. */
  var kind = 'phone';
  $('c-kind').querySelectorAll('button').forEach(function (b) {
    b.addEventListener('click', function () {
      kind = b.getAttribute('data-kind');
      $('c-kind').querySelectorAll('button').forEach(function (x) {
        x.setAttribute('aria-pressed', String(x === b));
      });
      var input = $('c-contact');
      input.type = kind === 'email' ? 'email' : 'tel';
      input.placeholder = kind === 'email' ? 'name@example.com' : '0712 345 678';
      $('c-hint').textContent = kind === 'email'
        ? 'We match on the address, so capitals do not matter.'
        : 'We match on the number, so +254, 254 and 0 all count as the same person.';
    });
  });

  $('claim-form').addEventListener('submit', function (ev) {
    ev.preventDefault();
    var btn = $('c-submit');
    UI.busy(btn, true);

    A.api.claimLead({
      full_name:    $('c-name').value,
      contact:      $('c-contact').value,
      contact_kind: kind,
      lead_type:    $('c-type').value,
      category:     $('c-cat').value,
      city:         $('c-city').value,
      country:      $('c-country').value,
      notes:        $('c-notes').value,
    }).then(function (r) {
      UI.busy(btn, false);
      if (!r || !r.ok) {
        UI.toast((r && (r.message || r.error)) || 'Could not claim that lead.', 'err');
        return;
      }
      UI.toast('Claimed. ' + ($('c-name').value || 'They') + ' is yours for 45 days.', 'ok');
      $('claim-form').reset();
      $('c-country').value = 'Kenya';
      UI.modal('claim-modal', false);

      STATE.leads.unshift(r.lead);
      paintLeads();
      paintFunnel(STATE.leads);
    });
  });
}

/* ── Listings this ambassador has built for other people ─────────────────
   Read straight from `listings` rather than through /api/ambassadors,
   because the answer is "rows RLS already lets you see": a listing you
   built is yours until the person you built it for accepts it, and the
   moment they do, it stops being yours and correctly disappears from here.

   Failure is silent and the section stays hidden. Nobody's earnings depend
   on seeing this, and an error box where a list should be is worse than
   nothing. */
function paintBuilt() {
  var host = $('built'), sec = $('built-sec');
  if (!host || !sec) return;

  var sb = window.ApaSession && window.ApaSession.client && window.ApaSession.client();
  if (!sb) return;

  sb.from('listings')
    .select('id,title,city,service,is_active,status,held_for_name,held_for_contact,ownership_type,created_at')
    .eq('ownership_type', 'on_behalf')
    .order('created_at', { ascending: false })
    .limit(40)
    .then(function (r) {
      var rows = (r && r.data) || [];
      if (!rows.length) return;

      sec.removeAttribute('hidden');
      host.innerHTML = '<div class="leads-list">' + rows.map(function (l) {
        var waiting = l.is_active === false;
        var where = [l.city, l.service].filter(Boolean).join(' · ');
        return '<div class="lead">' +
          '<span class="lead-dot" style="background:' +
            (waiting ? 'var(--ember)' : 'var(--mint-deep)') + '"></span>' +
          '<div class="lead-main">' +
            '<div class="lead-name">' + esc(l.title || 'Untitled listing') + '</div>' +
            '<div class="lead-meta">' +
              'For ' + esc(l.held_for_name || 'someone') +
              (where ? ' · ' + esc(where) : '') + ' · ' + ago(l.created_at) +
            '</div>' +
            (waiting
              ? '<div class="small" style="color:var(--ember);font-weight:600;margin-top:4px">' +
                'Waiting for them to sign in with ' + esc(l.held_for_contact || 'their contact') +
                ' and accept it</div>'
              : '') +
          '</div>' +
          '<span class="badge ' + (waiting ? 'b-mute' : 'b-ok') + '">' +
            (waiting ? 'Not yet claimed' : 'Live') + '</span>' +
        '</div>';
      }).join('') + '</div>';
    }, function () { /* silent: see the note above */ });
}

/* ── The fee ladder ───────────────────────────────────────────────────────
   Every screen that explains the commission has to explain the fee it is a
   share of, and this is the only screen allowed to show the rate. So the
   ladder is rendered from ApaFees — the same table the rest of the site
   reads — with the ambassador's own cut worked out beside each band.

   Typed sums are how "our fee is 10% of the booking" survived on four
   screens for months after it stopped being true. A rendered sum cannot
   outlive the number it was computed from. */
function paintFeeLadder(rates) {
  const box = $('fee-ladder');
  if (!box) return;

  const travellerRate = (rates && rates.traveller) || 0.15;
  const fees = (window.ApaFees && window.ApaFees.bands('stays')) || [];
  const money = (window.ApaFees && window.ApaFees.money)
    || function (n) { return 'KES ' + Math.round(Number(n) || 0).toLocaleString(); };

  if (!fees.length) { box.remove(); return; }

  const rows = fees.map(function (band, i) {
    const label = band.under != null
      ? 'A stay under ' + money(band.under)
      : 'A stay from ' + money(fees[i - 1].under);
    /* Rounded down: never quote someone a shilling they will not receive. */
    const cut = Math.floor(band.fee * travellerRate);
    return '<div class="fl-row">'
         +   '<span class="fl-k">' + esc(label) + '</span>'
         +   '<span class="fl-v">' + esc(money(band.fee)) + ' fee '
         +     '<em>&rarr; ' + esc(money(cut)) + ' to you</em></span>'
         + '</div>';
  });

  rows.push(
    '<div class="fl-row">'
    + '<span class="fl-k">A tour or an event, at any price</span>'
    + '<span class="fl-v">no fee <em>&rarr; ' + esc(money(0)) + '</em></span>'
    + '</div>'
  );

  box.innerHTML = rows.join('');
}

/* ── Sign out ─────────────────────────────────────────────────────────── */
function wireSignOut() {
  $('signout').addEventListener('click', function () {
    /* Leaving entirely clears the view preference. Otherwise a stint in the
       traveller view would outlive the session and quietly change where the
       NEXT sign-in lands, which is not what "switch view" promised. */
    try { localStorage.removeItem('apa-amb-view'); } catch (e) {}
    if (window.ApaSession && window.ApaSession.signOut) window.ApaSession.signOut();
    setTimeout(function () { location.href = '/'; }, 240);
  });
}

/* ── Switch to the traveller view ─────────────────────────────────────────
   An ambassador is also a customer — they book stays, they take rides. The
   flag makes the choice stick across sign-ins, so someone who prefers to
   land on the traveller side is not re-routed here every time. Coming back
   is one tap from the traveller dashboard, which clears the same flag. */
function wireViewSwitch() {
  const b = $('to-guest');
  if (!b) return;
  b.addEventListener('click', function () {
    /* Through ApaRoles where it is loaded, so the view preference is written
       in one place rather than by each dashboard's own idea of it. The
       fallback is the same two lines it always was. */
    if (window.ApaRoles) { window.ApaRoles.go('traveller'); return; }
    try { localStorage.setItem('apa-amb-view', 'guest'); } catch (e) {}
    location.href = '/dashboard.html';
  });
}

/* ── Boot ─────────────────────────────────────────────────────────────── */
function refuse(message, href, cta) {
  UI.boot(true);
  document.body.innerHTML =
    '<div class="aurora" aria-hidden="true"><i></i></div>' +
    '<div class="page"><div class="wrap" style="max-width:520px;padding-top:16vh">' +
      '<div class="card card-crest">' +
        '<h1 class="h2">' + esc(message) + '</h1>' +
        '<a class="btn btn-primary btn-block" style="margin-top:20px" href="' + href + '">' + esc(cta) + '</a>' +
      '</div>' +
    '</div></div>';
}

A.api.me().then(function (r) {
  /* Not through the gate. Bounce to the gateway, which owns every refusal
     state and can explain this one properly. */
  if (!r || !r.ok) {
    if (r && (r.reason === 'not_signed_in' || r.httpStatus === 401)) {
      location.replace('/auth.html?next=ambassador-dashboard.html');
      return;
    }
    location.replace('/ambassadors.html');
    return;
  }

  if (!r.enrolled) { location.replace('/ambassadors.html'); return; }

  STATE.me       = r.me;
  STATE.leads    = r.leads || [];
  STATE.earnings = r.earnings || [];

  paintHeader(STATE.me);
  paintBuilt();
  paintFeeLadder(r.rates);
  paintEarnings(STATE.me, STATE.earnings);
  paintFunnel(STATE.leads);
  paintRing(STATE.me);
  paintLeads();
  wireLink(r.link);
  wireTabs();
  wireClaim();
  wireSignOut();
  wireViewSwitch();

  $('app').removeAttribute('hidden');
  UI.boot(true);
  UI.reveals();

  /* The board is a nice-to-have, so it loads after the page is usable and
     its failure is silent. Nobody's earnings depend on seeing a ranking. */
  A.api.leaderboard().then(function (b) {
    if (b && b.ok) paintBoard(b.board, STATE.me.id);
    else paintBoard([], null);
  });
}).catch(function (e) {
  refuse('We could not open your dashboard just now.', '/ambassador-dashboard.html', 'Try again');
  if (window.console) console.warn('[dashboard]', e && e.message);
});

})();
