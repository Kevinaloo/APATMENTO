/* ═══════════════════════════════════════════════════════════════════
   CABANA · OPERATIONS CONSOLE · clearance and ride money
   Clearance  — driver licences waiting for a person, and listings held
                in 'pending_verification' until their owner clears.
   Ride money — Cabana's share of completed rides: what is due, what is
                overdue (drivers are paused automatically), and the leak
                cases the location scanner raised on "cancelled" rides.
   Reads: admin_clearance_queue, admin_ride_money.
   Writes: admin_driver_document_decide, admin_ride_commission_set.
   ═══════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';
  var CX = global.CX; if (!CX) return;
  var html = CX.html, set = CX.set, icon = CX.icon, $$ = CX.$$;
  var num = CX.num, money = CX.money, ago = CX.ago, fdt = CX.fdt;
  var rpc = CX.rpc, toast = CX.toast, confirm = CX.confirm;

  function on(root, sel, ev, fn) { $$(sel, root).forEach(function (el) { el.addEventListener(ev, function (e) { fn(el, e); }); }); }
  function pageHd(eyebrow, title, lede) {
    return html`<div class="page-hd"><div><div class="eyebrow">${eyebrow}</div><h1>${title}</h1>${lede ? html`<p class="lede">${lede}</p>` : ''}</div></div>`;
  }
  function wireTabs(v, fallback) {
    on(v.el, '[data-tab]', 'click', function (el) { var t = el.getAttribute('data-tab'); v.setQ({ tab: t === fallback ? null : t }); v.refresh(); });
  }
  function minor(m, cur) { return money(Number(m || 0) / 100, cur || 'KES'); }

  /* ── CLEARANCE ─────────────────────────────────────────────────── */
  var LEDE_C = 'One identity check covers every role. Here a person approves what software cannot: driver licences, and listings held until their owner is verified. Approving the last missing piece activates the driver or listing on its own.';
  CX.view('clearance', {
    title: 'Clearance',
    render: function (v) {
      var tab = v.q.tab || 'licences';
      set(v.el, html`${pageHd('People', 'Clearance', LEDE_C)}${CX.skeleton('list')}`);
      return rpc('admin_clearance_queue').then(function (q) {
        if (!v.alive()) return;
        q = q || {};
        var docs = q.driver_documents || [], waiting = q.waiting_listings || [];
        var body;
        if (tab === 'licences') {
          body = docs.length ? html`<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Driver</th><th>Document</th><th>Identity</th><th>Sent</th><th></th></tr></thead><tbody>${docs.map(function (d) {
            return html`<tr><td><div class="cell">${CX.avatar(d.name, 'sm')}<div><button class="link-btn t-main" data-person="${d.user_id}">${d.name || 'Driver'}</button><div class="t-sub">${d.phone || ''} · ${d.driver_status || ''}</div></div></div></td>
              <td><div class="t-main">${String(d.kind || '').replace(/_/g, ' ')}</div><div class="t-sub">${d.licence_no || 'No number'}${d.expires_on ? ' · expires ' + d.expires_on : ''}</div></td>
              <td>${d.identity_verified ? html`<span class="pill p-ok">${icon('check')}Verified</span>` : html`<span class="pill p-warn">Not yet</span>`}</td>
              <td><span class="t-sub">${ago(d.created_at)}</span></td>
              <td><div class="t-act"><button class="btn btn-sm btn-g" data-view-doc="${d.path}" data-doc-id="${d.id}">${icon('eye')}View</button>
                <button class="btn btn-sm btn-ok" data-decide="${d.id}" data-ok="1">Approve</button>
                <button class="btn btn-sm btn-d" data-decide="${d.id}" data-ok="0">Reject</button></div></td></tr>`;
          })}</tbody></table></div>` : CX.empty('No licences waiting', 'Drivers who upload a licence from their console appear here.', 'idcard', true);
        } else {
          body = waiting.length ? html`<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Listing</th><th>Service</th><th>Owner identity</th><th>Waiting</th></tr></thead><tbody>${waiting.map(function (l) {
            return html`<tr><td><button class="link-btn t-main" data-listing="${l.id}">${l.title || 'Listing'}</button></td>
              <td>${CX.pill(l.service || 'stays')}</td>
              <td>${l.identity_verified ? html`<span class="pill p-info">Verified, other step pending</span>` : html`<button class="link-btn" data-person="${l.partner_id}">Not verified</button>`}</td>
              <td><span class="t-sub">${ago(l.updated_at)}</span></td></tr>`;
          })}</tbody></table></div>` : CX.empty('Nothing held', 'Listings wait here only while their owner is not yet verified. They go live by themselves the moment the owner clears.', 'building', true);
        }
        set(v.el, html`${pageHd('People', 'Clearance', LEDE_C)}
          ${CX.tabs([['licences', 'Driver licences', docs.length, true], ['listings', 'Held listings', waiting.length]], tab)}
          <div class="card flush">${body}</div>`);
        wireTabs(v, 'licences');
        on(v.el, '[data-person]', 'click', function (el) { CX.open.person(el.getAttribute('data-person')); });
        on(v.el, '[data-listing]', 'click', function (el) { CX.open.listing(el.getAttribute('data-listing')); });
        on(v.el, '[data-view-doc]', 'click', function (el) {
          CX.busy(el, function () {
            return CX.client().storage.from('kyc-documents').createSignedUrl(el.getAttribute('data-view-doc'), 120).then(function (r) {
              if (r.error) throw r.error;
              CX.log('driver.document_viewed', 'driver_document', el.getAttribute('data-doc-id'), {});
              global.open(r.data.signedUrl, '_blank', 'noopener');
            });
          });
        });
        on(v.el, '[data-decide]', 'click', function (el) {
          var id = el.getAttribute('data-decide'), ok = el.getAttribute('data-ok') === '1';
          if (ok) return CX.busy(el, function () {
            return rpc('admin_driver_document_decide', { p_document: id, p_approve: true, p_note: null }).then(function (c) {
              toast(c && c.cleared ? 'Approved. The driver is cleared and can take trips.' : 'Approved. The driver still has a step left.', 'ok');
              CX.pulseNow && CX.pulseNow(true); v.refresh();
            });
          });
          confirm({ title: 'Reject this document?', tone: 'danger', confirm: 'Reject', icon: 'x',
            body: 'The driver is told your reason in their notifications and can upload again.',
            reason: { label: 'Reason they will read', required: true, placeholder: 'The licence photo is cut off at the expiry date.' },
            onConfirm: function (f) { return rpc('admin_driver_document_decide', { p_document: id, p_approve: false, p_note: f.reason }).then(function () { toast('Rejected. They have been told why.', 'ok'); v.refresh(); }); } });
        });
      });
    }
  });

  /* ── RIDE MONEY ────────────────────────────────────────────────── */
  var LEDE_R = 'Cabana’s share of every completed ride, owed by the driver within the remittance window. Overdue drivers are paused automatically and come back the moment they pay. Leak cases are rides marked cancelled where location data says the trip still happened.';
  var SIG = { co_travel: 'Rider and driver moved together', pickup_then_dropoff: 'Driver went pickup → drop-off', reappeared_at_drop: 'Driver reappeared at the drop-off', went_dark: 'Driver went dark after cancelling', repeat_pair: 'Same rider and driver, again' };
  CX.view('ride-money', {
    title: 'Ride money',
    render: function (v) {
      var tab = v.q.tab || 'due';
      set(v.el, html`${pageHd('Money', 'Ride money', LEDE_R)}${CX.skeleton('list')}`);
      return rpc('admin_ride_money').then(function (m) {
        if (!v.alive()) return;
        m = m || {};
        var due = m.due || [], cases = m.cases || [];
        var owed = due.filter(function (x) { return x.status === 'due'; }).reduce(function (s, x) { return s + Number(x.amount || 0); }, 0);
        var over = due.filter(function (x) { return x.overdue && x.status === 'due'; });
        var open = cases.filter(function (k) { return k.status === 'open' || !k.status; });
        var kpis = html`<div class="kpis" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:10px;margin-bottom:14px">
          <div class="card"><div class="eyebrow">Owed now</div><div style="font-size:24px;font-weight:700">${minor(owed)}</div></div>
          <div class="card"><div class="eyebrow">Overdue</div><div style="font-size:24px;font-weight:700">${num(over.length)}</div></div>
          <div class="card"><div class="eyebrow">Collected · 30d</div><div style="font-size:24px;font-weight:700">${minor(m.collected_30d)}</div></div>
          <div class="card"><div class="eyebrow">Open leak cases</div><div style="font-size:24px;font-weight:700">${num(open.length)}</div></div></div>`;
        var body;
        if (tab === 'due') {
          body = due.length ? html`<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Ride</th><th>Driver</th><th>Share</th><th>Due</th><th></th></tr></thead><tbody>${due.map(function (c) {
            return html`<tr><td><div class="t-main">${c.ref}</div><div class="t-sub">fare ${minor(c.fare, c.currency)}${c.source && c.source !== 'completed' ? ' · ' + String(c.source).replace(/_/g, ' ') : ''}</div></td>
              <td><div class="t-main">${c.driver || 'Driver'}</div><div class="t-sub">${c.phone || ''}</div></td>
              <td><b>${minor(c.amount, c.currency)}</b></td>
              <td>${c.status === 'disputed' ? html`<span class="pill p-info">Disputed</span>` : c.overdue ? html`<span class="pill p-bad">Overdue</span>` : html`<span class="t-sub">${fdt(c.due_at)}</span>`}</td>
              <td><div class="t-act"><button class="btn btn-sm btn-ok" data-set="${c.id}" data-s="paid">Mark paid</button>
                <button class="btn btn-sm btn-g" data-set="${c.id}" data-s="waived">Waive</button>
                ${c.status !== 'disputed' ? html`<button class="btn btn-sm btn-q" data-set="${c.id}" data-s="disputed">Disputed</button>` : html`<button class="btn btn-sm btn-q" data-set="${c.id}" data-s="due">Back to due</button>`}</div></td></tr>`;
          })}</tbody></table></div>` : CX.empty('Nothing owed', 'Every completed ride’s share has been remitted.', 'coins', true);
        } else {
          body = cases.length ? html`<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Ride</th><th>Driver</th><th>Signals</th><th>Strength</th><th>Raised</th></tr></thead><tbody>${cases.map(function (k) {
            var sig = k.signals || {};
            var lines = Object.keys(SIG).filter(function (x) { return sig[x]; }).map(function (x) { return SIG[x]; });
            return html`<tr><td><div class="t-main">${k.ref}</div><div class="t-sub" style="white-space:normal;max-width:260px">${k.route || ''}</div></td>
              <td>${k.driver || '—'}</td>
              <td><div class="t-sub" style="white-space:normal;max-width:280px">${lines.join(' · ') || 'Weak signals'}</div></td>
              <td>${k.strength === 'strong' ? html`<span class="pill p-bad">Strong · charged</span>` : html`<span class="pill p-warn">${k.strength || 'weak'}</span>`}${k.status && k.status !== 'open' ? html` <span class="pill">${k.status}</span>` : ''}</td>
              <td><span class="t-sub">${ago(k.created_at)}</span></td></tr>`;
          })}</tbody></table></div>` : CX.empty('No leak cases', 'Rides cancelled after a driver was assigned are watched for a few hours. Anything suspicious lands here.', 'shield', true);
        }
        set(v.el, html`${pageHd('Money', 'Ride money', LEDE_R)}${kpis}
          ${CX.tabs([['due', 'Owed by drivers', due.length, true], ['cases', 'Leak cases', open.length]], tab)}
          <div class="card flush">${body}</div>`);
        wireTabs(v, 'due');
        on(v.el, '[data-set]', 'click', function (el) {
          var id = el.getAttribute('data-set'), s = el.getAttribute('data-s');
          var words = { paid: ['Mark this share paid?', 'Use this for a payment received outside M-Pesa STK. The driver is reinstated if nothing else is overdue.'],
                        waived: ['Waive this share?', 'The driver owes nothing for this ride. If it came from a leak case, the case is dismissed.'],
                        disputed: ['Mark as disputed?', 'Keeps it out of enforcement while you look into it.'],
                        due: ['Put it back to due?', 'It counts toward their deadline again.'] }[s];
          confirm({ title: words[0], confirm: 'Confirm', icon: 'coins', body: words[1],
            reason: { label: 'Note (internal)', required: s !== 'paid', placeholder: s === 'waived' ? 'Rider confirmed the trip never happened.' : '' },
            onConfirm: function (f) { return rpc('admin_ride_commission_set', { p_commission: id, p_status: s, p_note: f.reason || null }).then(function () { toast('Updated', 'ok'); v.refresh(); }); } });
        });
      });
    }
  });
})(window);
