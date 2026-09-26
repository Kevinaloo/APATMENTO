/* ═══════════════════════════════════════════════════════════════════
   CABANA · OPERATIONS CONSOLE · Profiles & ticks
   Photo reviews the AI was unsure about, gold (organisation) checks,
   profile reports, and the register of verified people.
   Every decision goes through /api/people, which writes the audit log.
   ═══════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';
  var CX = global.CX; if (!CX || !CX.ops) return;
  var html = CX.html, raw = CX.raw, set = CX.set, icon = CX.icon;
  var num = CX.num, ago = CX.ago, fdate = CX.fdate, human = CX.human, toast = CX.toast, confirm = CX.confirm;
  var O = CX.ops, on = O.on, pageHd = O.pageHd;
  var P = function () { return global.CabanaPeople; };

  function api(q, body) { return CX.api('/api/people?' + q, body ? { body: body } : undefined); }
  function face(card, size) {
    var p = P();
    if (!p || !card) return raw(CX.avatar ? '' : '');
    return raw(p.avatarHTML(card, size || 40));
  }
  function tick(b) { var p = P(); return b && p ? raw(p.tick(b, { size: 15 })) : ''; }
  function who(card) {
    card = card || {};
    return html`<div class="cell">${face(card, 40)}<div><div class="t-main">${card.name || 'Member'} ${tick(card.badge)}</div><div class="t-sub">${card.handle ? '@' + card.handle : card.type === 'organization' ? 'Organisation' : 'Member'}</div></div></div>`;
  }
  var LEDE = 'The AI checks every photo first and only sends you the ones it is unsure about. Gold ticks need a verified person plus a registration you have checked. Reports from three different members hide a photo until you decide.';

  CX.view('profiles', {
    title: 'Profiles & ticks',
    render: function (v) {
      var tab = v.q.tab || 'photos';
      set(v.el, html`${pageHd('People', 'Profiles & ticks', LEDE)}${CX.skeleton('list')}`);
      var kind = tab === 'orgs' ? 'orgs' + (v.q.status ? '&status=' + encodeURIComponent(v.q.status) : '') : tab;
      return api('op=admin-queue&kind=' + kind).then(function (j) {
        if (!v.alive()) return;
        var items = j.items || [];
        var bar = CX.tabs([['photos', 'Photos', tab === 'photos' ? items.length : null, true], ['orgs', 'Gold checks', tab === 'orgs' && !v.q.status ? items.length : null, true], ['reports', 'Reports', tab === 'reports' ? items.length : null, true], ['links', 'Linked accounts', tab === 'links' ? items.length : null, true], ['verified', 'Verified people']], tab);
        var body;
        if (tab === 'photos') body = photos(items);
        else if (tab === 'orgs') body = orgs(items, v.q.status || 'submitted');
        else if (tab === 'reports') body = reports(items);
        else if (tab === 'links') body = linksView(items);
        else body = verified(items);
        set(v.el, html`${pageHd('People', 'Profiles & ticks', LEDE)}${bar}${body}`);
        on(v.el, '[data-tab]', 'click', function (el) { var t = el.getAttribute('data-tab'); v.setQ({ tab: t === 'photos' ? null : t, status: null }); v.refresh(); });
        on(v.el, '[data-ostatus]', 'click', function (el) { v.setQ({ status: el.getAttribute('data-ostatus') === 'submitted' ? null : el.getAttribute('data-ostatus') }); v.refresh(); });
        on(v.el, '[data-open]', 'click', function (el) { P() && P().open(el.getAttribute('data-open')); });
        wire(v);
        if (tab === 'photos') items.forEach(function (it) {
          api('op=admin-file&kind=photo&id=' + it.id).then(function (r) {
            var img = v.el.querySelector('[data-img="' + it.id + '"]'); if (img) img.src = r.url;
          }).catch(function () {});
        });
        global.CabanaAvatars && global.CabanaAvatars.observeAll(v.el);
      });
    }
  });

  function photos(items) {
    if (!items.length) return html`<div class="card">${CX.empty('No photos waiting', 'Photos the automatic check was unsure about appear here.', 'image', true)}</div>`;
    return html`<div class="grid-cards" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:14px">${items.map(function (it) {
      var vd = it.verdict || {}, sc = vd.scores || {};
      var top = Object.keys(sc).filter(function (k) { return sc[k] >= 0.15; }).sort(function (a, b) { return sc[b] - sc[a]; }).slice(0, 3);
      return html`<div class="card" style="padding:14px">
        <div style="aspect-ratio:1;border-radius:14px;overflow:hidden;background:#111;margin-bottom:10px;position:relative">
          <img data-img="${it.id}" alt="Photo awaiting review" style="width:100%;height:100%;object-fit:cover;filter:blur(18px);transition:filter .2s" onmouseenter="this.style.filter='none'" onfocus="this.style.filter='none'" tabindex="0">
          <span style="position:absolute;left:8px;bottom:8px;background:rgba(0,0,0,.6);color:#fff;font-size:11px;padding:3px 8px;border-radius:99px">Hover to unblur</span></div>
        ${who(it.person)}
        <div class="t-sub" style="margin:8px 0">${it.reason || 'Unsure'} · ${ago(it.created_at)}${top.length ? ' · ' + top.map(function (k) { return human(k) + ' ' + Math.round(sc[k] * 100) + '%'; }).join(', ') : ''}</div>
        <div class="t-act"><button class="btn btn-sm btn-ok" data-ph="${it.id}" data-d="approve">${icon('check')}Approve</button><button class="btn btn-sm btn-d" data-ph="${it.id}" data-d="reject">${icon('x')}Reject</button></div></div>`;
    })}</div>`;
  }
  function orgs(items, status) {
    var sub = html`<div class="chips" style="display:flex;gap:6px;margin:0 0 12px">${[['submitted', 'Waiting'], ['approved', 'Approved'], ['rejected', 'Rejected'], ['revoked', 'Revoked']].map(function (s) { return html`<button class="btn btn-sm ${s[0] === status ? 'btn-p' : 'btn-g'}" data-ostatus="${s[0]}">${s[1]}</button>`; })}</div>`;
    if (!items.length) return html`${sub}<div class="card">${CX.empty(status === 'submitted' ? 'No organisations waiting' : 'Nothing here', status === 'submitted' ? 'Organisations that apply for a gold tick appear here.' : '', 'award', status === 'submitted')}</div>`;
    return html`${sub}<div class="card flush"><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Account</th><th>Registration</th><th class="hide-s">Checks</th><th></th></tr></thead><tbody>${items.map(function (o) {
      return html`<tr><td><button class="link-btn" data-open="${o.user_id}" style="text-align:left">${who(o.person)}</button></td>
        <td><div class="t-main">${o.legal_name}</div><div class="t-sub">${o.country_code} · ${human(o.org_kind)} · No. ${o.registration_number}</div>${o.website ? html`<div class="t-sub"><a href="${o.website}" target="_blank" rel="noopener noreferrer">${o.website.replace(/^https:\/\//, '')}</a></div>` : ''}</td>
        <td class="hide-s">${o.representative_verified ? html`<span class="pill p-ok">${icon('check')}Representative ID verified</span>` : html`<span class="pill p-bad">Representative not verified</span>`}
          ${(o.operators || []).map(function (x) { return html`<div class="t-sub">${human(x.kind)}: ${x.name}${x.verified ? ' ✓' : ''}</div>`; })}
          <div class="t-sub">${o.status === 'submitted' ? 'Submitted ' + ago(o.created_at) : human(o.status) + ' ' + fdate(o.reviewed_at)}</div>${o.review_note ? html`<div class="t-sub" style="white-space:normal">${o.review_note}</div>` : ''}</td>
        <td><div class="t-act"><button class="btn btn-sm btn-g" data-doc="${o.id}">${icon('eye')}Document</button>
          ${o.status === 'submitted' ? html`<button class="btn btn-sm btn-ok" data-org="${o.id}" data-d="approve">${icon('award')}Approve gold</button><button class="btn btn-sm btn-d" data-org="${o.id}" data-d="reject">Reject</button>` : ''}
          ${o.status === 'approved' ? html`<button class="btn btn-sm btn-q" data-org="${o.id}" data-d="revoke">Revoke</button>` : ''}</div></td></tr>`;
    })}</tbody></table></div></div>`;
  }
  function reports(items) {
    if (!items.length) return html`<div class="card">${CX.empty('No open reports', 'Profiles members report appear here, grouped by person.', 'flag', true)}</div>`;
    return html`<div style="display:grid;gap:12px">${items.map(function (g) {
      return html`<div class="card"><div style="display:flex;gap:12px;align-items:flex-start;justify-content:space-between;flex-wrap:wrap">
        <button class="link-btn" data-open="${g.target_id}" style="text-align:left">${who(g.person)}</button>
        <div class="t-act"><button class="btn btn-sm btn-g" data-rep="${g.target_id}" data-d="dismiss">Dismiss</button><button class="btn btn-sm btn-q" data-rep="${g.target_id}" data-d="reset_profile">Hide profile text</button><button class="btn btn-sm btn-d" data-rep="${g.target_id}" data-d="remove_photo">Remove photo</button>
        ${g.person && g.person.photo === null ? html`<button class="btn btn-sm btn-ok" data-rep="${g.target_id}" data-d="restore_photo">Restore photo</button>` : ''}</div></div>
        <div style="margin-top:10px">${g.reports.map(function (r) { return html`<div class="t-sub" style="white-space:normal;margin-top:4px"><strong>${human(r.reason)}</strong> · ${ago(r.at)}${r.detail ? ' · “' + r.detail + '”' : ''}</div>`; })}</div></div>`;
    })}</div>`;
  }
  var REASON = { same_document: 'Same ID document', same_id_number: 'Same ID number', same_name_dob: 'Same name and birth date', same_face: 'Same face (Didit)', same_device: 'Same device', same_phone: 'Same phone number', same_email_alias: 'Email alias', same_payout: 'Same payout number' };
  function person(pp) {
    pp = pp || {};
    return html`<div class="cell">${face(pp, 36)}<div><div class="t-main">${pp.name || 'Member'} ${tick(pp.badge)} ${pp.restricted ? html`<span class="pill p-bad">Restricted</span>` : ''}</div><div class="t-sub">${pp.email || ''}${pp.joined ? ' · joined ' + fdate(pp.joined) : ''}${pp.identity_verified ? ' · ID verified' : ''}</div></div></div>`;
  }
  function linksView(items) {
    if (!items.length) return html`<div class="card">${CX.empty('No linked accounts to review', 'When the same person appears behind two accounts, it shows up here. Shared phones and devices alone never do.', 'users', true)}</div>`;
    return html`<div style="display:grid;gap:12px">${items.map(function (g) {
      return html`<div class="card"><div style="display:flex;gap:10px;align-items:center;justify-content:space-between;flex-wrap:wrap;margin-bottom:10px">
          <div>${g.severity === 'critical' ? html`<span class="pill p-bad">${icon('alert')}Possible return of a restricted member</span>` : g.status === 'move_requested' ? html`<span class="pill p-info">Member asked to move their verification</span>` : html`<span class="pill p-warn">Same person, two accounts?</span>`}
            <span class="t-sub" style="margin-left:6px">${g.reasons.map(function (r) { return REASON[r] || human(r); }).join(' · ')} · ${ago(g.detected_at)}</span></div>
          <div class="t-act">
            <button class="btn btn-sm btn-ok" data-lk="${g.id}" data-d="allow" title="Both accounts may keep a verified identity">Allow both</button>
            <button class="btn btn-sm btn-g" data-lk="${g.id}" data-d="same_person" title="Record that this is one person; nothing changes for them">Same person, noted</button>
            <button class="btn btn-sm btn-q" data-lk="${g.id}" data-d="dismiss" title="Not the same person">Not related</button></div></div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
          <button class="link-btn" data-open="${g.a.id}" style="text-align:left">${person(g.a)}</button>
          <button class="link-btn" data-open="${g.b.id}" style="text-align:left">${person(g.b)}</button></div>
        <div class="t-sub" style="margin-top:10px;white-space:normal">Allow both re-runs any identity check this link was holding back. To act on an account (ban, suspend), open it from Members.</div></div>`;
    })}</div>`;
  }
  function verified(items) {
    if (!items.length) return html`<div class="card">${CX.empty('Nobody verified yet', 'Members who pass the Didit identity check appear here.', 'shieldCheck', false)}</div>`;
    return html`<div class="card flush"><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Member</th><th>Document</th><th>Verified</th></tr></thead><tbody>${items.map(function (r) {
      return html`<tr><td><button class="link-btn" data-open="${r.user_id}" style="text-align:left">${who(r.person)}</button></td><td class="t-sub">${human(r.document_type || 'ID')} · ${r.document_country || '—'}</td><td class="t-sub">${fdate(r.identity_at)}</td></tr>`;
    })}</tbody></table></div></div>`;
  }

  /* ── identity panel inside a member's drawer ─────────────────────── */
  var SOURCE = { didit: 'Didit ID + live selfie', agent_document: 'Agent document reviewed by Cabana', cabana_operator: 'Verified by a Cabana operator', legacy: 'Earlier ID check' };
  CX.identityPanel = function (root, id) {
    if (!root) return;
    var box = document.createElement('div'); box.className = 'dr-sec'; box.innerHTML = '<div class="dr-sec-t">Identity</div><div class="muted" style="font-size:12.5px">Loading…</div>';
    root.insertBefore(box, root.firstChild ? root.firstChild.nextSibling : null);
    api('op=admin-identity&id=' + encodeURIComponent(id)).then(function (x) {
      var i = x.identity || {}, r = x.roles || {};
      set(box, html`<div class="dr-sec-t">Identity ${tick(x.badge)}</div>
        ${x.links && x.links.some(function (l) { return l.severity === 'critical' && l.status === 'open'; }) ? html`<div class="callout bad mb">${icon('alert')}<div><div class="strong">Linked to a restricted account</div><div class="muted" style="font-size:12.5px">Strong identity match with an account that is banned or suspended. Review below.</div></div></div>` : ''}
        ${CX.kv([
          ['Status', i.verified ? html`<span class="pill p-ok">${icon('check')}Verified</span>` : i.pending === 'review' ? html`<span class="pill p-warn">Held for review</span>` : i.declined ? html`<span class="pill p-bad">${human(i.declined)}</span>` : html`<span class="pill p-mute">${human(i.state || 'not started')}</span>`],
          ['How', i.source ? SOURCE[i.source] || human(i.source) : '—'],
          ['Since', i.since ? fdate(i.since) : '—'],
          ['Document', i.document_type ? human(i.document_type) + ' · ' + (i.document_country || '') : '—'],
          ['Didit warnings', x.session && x.session.warnings && x.session.warnings.length ? x.session.warnings.map(human).join(', ') : '—'],
          ['Agent KYC', r.agent ? human(r.agent.kyc_status) + (r.agent.satisfied_by_identity ? ' · via identity' : '') : '—'],
          ['Driver', r.driver ? human(r.driver.status) + (r.driver.id_number_matches_verified_id === true ? ' · ID number matches verified ID ✓' : r.driver.id_number_matches_verified_id === false ? ' · ID number does NOT match' : '') : '—'],
          ['Fingerprints', Object.keys(x.fingerprints || {}).length ? Object.keys(x.fingerprints).map(function (k) { return human(k); }).join(', ') : 'None yet']])}
        ${(x.links || []).length ? html`<div class="dr-sec-t" style="margin-top:12px">Linked accounts</div>${x.links.map(function (l) {
          return html`<div class="kv"><span><button class="link-btn" data-open-person="${l.other}">${l.person.name}</button> ${l.restricted ? html`<span class="pill p-bad">Restricted</span>` : ''}${l.identity_verified ? html` <span class="pill p-ok">ID verified</span>` : ''}
            <div class="t-sub">${l.email || ''} · ${l.reasons.map(function (r) { var k = r.split(':')[0]; return REASON[k] || human(k); }).join(', ')}</div></span>
            <span>${l.status === 'open' || l.status === 'move_requested' ? html`<button class="btn btn-sm btn-ok" data-plk="${l.link_id}" data-d="allow">Allow</button> <button class="btn btn-sm btn-g" data-plk="${l.link_id}" data-d="dismiss">Not related</button>` : CX.pill(l.status)}</span></div>`;
        })}` : ''}`);
      box.querySelectorAll('[data-plk]').forEach(function (b) { b.addEventListener('click', function () { CX.busy(b, function () { return linkDecide(b.getAttribute('data-plk'), b.getAttribute('data-d')).then(function () { toast('Saved', 'ok'); CX.identityPanel(root, id); box.remove(); }); }); }); });
      box.querySelectorAll('[data-open-person]').forEach(function (b) { b.addEventListener('click', function () { location.hash = '#/people/' + b.getAttribute('data-open-person'); }); });
    }).catch(function (e) { set(box, html`<div class="dr-sec-t">Identity</div><div class="muted" style="font-size:12.5px">${e.message}</div>`); });
  };

  function decide(body) { return api('op=admin-decide', body); }
  function linkDecide(id, d) { return api('op=admin-link', { id: id, decision: d }); }
  function wire(v) {
    on(v.el, '[data-ph]', 'click', function (el) {
      var id = el.getAttribute('data-ph'), d = el.getAttribute('data-d');
      if (d === 'approve') return CX.busy(el, function () { return decide({ kind: 'photo', id: id, decision: 'approve' }).then(function () { toast('Photo approved and live', 'ok'); CX.pulseNow(true); v.refresh(); }); });
      confirm({ title: 'Reject this photo?', tone: 'danger', confirm: 'Reject', icon: 'x', body: 'The file is deleted and its fingerprint blocked. The member is told it does not meet community standards.',
        reason: { label: 'Note to the member (optional)', required: false, placeholder: 'Please choose a photo without text or phone numbers.' },
        onConfirm: function (f) { return decide({ kind: 'photo', id: id, decision: 'reject', note: f.reason }).then(function () { toast('Rejected', 'ok'); CX.pulseNow(true); v.refresh(); }); } });
    });
    on(v.el, '[data-lk]', 'click', function (el) {
      var id = el.getAttribute('data-lk'), d = el.getAttribute('data-d');
      CX.busy(el, function () { return linkDecide(id, d).then(function (r) { toast({ allow: 'Allowed' + (r.rechecked ? ' · identity re-checked' : ''), same_person: 'Noted as the same person', dismiss: 'Marked as not related' }[d], 'ok'); CX.pulseNow(true); v.refresh(); }); });
    });
    on(v.el, '[data-doc]', 'click', function (el) {
      CX.busy(el, function () { return api('op=admin-file&kind=org&id=' + el.getAttribute('data-doc')).then(function (r) { global.open(r.url, '_blank', 'noopener'); }); });
    });
    on(v.el, '[data-org]', 'click', function (el) {
      var id = el.getAttribute('data-org'), d = el.getAttribute('data-d');
      if (d === 'approve') return confirm({ title: 'Approve the gold tick?', confirm: 'Approve gold', icon: 'award', body: 'Only approve after the registration document matches the name, number and country, and the representative’s own ID is verified. The organisation name becomes protected on Cabana.',
        onConfirm: function () { return decide({ kind: 'org', id: id, decision: 'approve' }).then(function () { toast('Gold tick issued', 'ok'); CX.pulseNow(true); v.refresh(); }); } });
      confirm({ title: d === 'revoke' ? 'Revoke the gold tick?' : 'Reject this application?', tone: 'danger', confirm: d === 'revoke' ? 'Revoke' : 'Reject', icon: 'x',
        reason: { label: 'Reason they will read', required: true, placeholder: 'The registration number does not match the certificate you uploaded.' },
        onConfirm: function (f) { return decide({ kind: 'org', id: id, decision: d, note: f.reason }).then(function () { toast(d === 'revoke' ? 'Revoked' : 'Rejected — they have been told why', 'ok'); CX.pulseNow(true); v.refresh(); }); } });
    });
    on(v.el, '[data-rep]', 'click', function (el) {
      var id = el.getAttribute('data-rep'), d = el.getAttribute('data-d');
      if (d === 'dismiss' || d === 'restore_photo') return CX.busy(el, function () { return decide({ kind: 'report', id: id, decision: d }).then(function () { toast(d === 'dismiss' ? 'Reports dismissed' : 'Photo restored', 'ok'); CX.pulseNow(true); v.refresh(); }); });
      confirm({ title: d === 'remove_photo' ? 'Remove their photo?' : 'Hide their profile text?', tone: 'danger', confirm: 'Confirm', icon: 'flag',
        reason: { label: 'Note to the member (optional)', required: false },
        onConfirm: function (f) { return decide({ kind: 'report', id: id, decision: d, note: f.reason }).then(function () { toast('Done — the member has been notified', 'ok'); CX.pulseNow(true); v.refresh(); }); } });
    });
  }
})(window);
