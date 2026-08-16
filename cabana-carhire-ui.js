/* ═══════════════════════════════════════════════════════════════════
   CABANA · CAR HIRE · UI
   ───────────────────────────────────────────────────────────────────
   Binds the core engine to the page. One state object, one render
   pass, no framework. Every visible number comes from CabanaCarHire
   so the ledger and the cards can never disagree.
   ═══════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  const E = window.CabanaCarHire;
  const $ = s => document.querySelector(s);
  const el = id => document.getElementById(id);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g,
    c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* ── STATE ───────────────────────────────────────────────────── */
  const iso = d => d.toISOString().slice(0, 10);
  const t0 = new Date(); t0.setDate(t0.getDate() + 2);
  const t1 = new Date(); t1.setDate(t1.getDate() + 6);

  const S = {
    route: 'metro',
    start: iso(t0),
    end: iso(t1),
    cls: 'all',
    sort: 'fit',
    chauffeur: false,
    insurance: 'basic',
    delivery: 'depot',
    extras: [],
    selected: null,
    pinned: [],
    fleet: [],
    operators: [],
    source: 'catalogue'
  };

  const days = () => Math.max(1,
    Math.round((new Date(S.end) - new Date(S.start)) / 86400000) || 1);
  const startDate = () => new Date(S.start + 'T12:00:00');
  const opOf = v => S.operators.find(o => o.id === v.operator_id) || {};
  const gradeOf = v => E.grade(v, S.route, startDate());
  const quoteOf = v => E.quote({
    vehicle: v, days: days(), date: startDate(), routeKey: S.route,
    chauffeur: S.chauffeur, insurance: S.insurance, delivery: S.delivery, extras: S.extras
  });

  /* ── TOAST ───────────────────────────────────────────────────── */
  let toastT;
  function toast(msg) {
    const t = el('ch-toast'); if (!t) return;
    t.textContent = msg; t.classList.add('show');
    clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 3000);
  }

  /* ═══ BRIEF ═══════════════════════════════════════════════════ */
  function renderBrief() {
    const r = E.ROUTE_BY_KEY[S.route];
    const season = E.seasonFor(startDate());
    const wet = Math.min(season.wet, r.wet_penalty);
    const needClear = r.clearance_mm + wet * 10;
    const needDrive = (wet >= 2 && r.wet_penalty >= 2)
      ? (['4wd', '4wd_low'].includes(r.drive) ? r.drive : '4wd') : r.drive;

    el('ch-days-n').textContent = days();
    el('ch-days-u').textContent = days() === 1 ? 'day' : 'days';

    el('ch-demands').innerHTML = `
      <div class="ch-demand">
        <span class="ch-lbl">Season</span>
        <span class="v ${season.wet >= 3 ? 'bad' : season.wet >= 2 ? 'warn' : ''}">${esc(season.label)}</span>
      </div>
      <div class="ch-demand">
        <span class="ch-lbl">Distance</span><span class="v">${r.km} km</span>
      </div>
      <div class="ch-demand">
        <span class="ch-lbl">Clearance needed</span>
        <span class="v ${wet ? 'warn' : ''}">${needClear} mm</span>
      </div>
      <div class="ch-demand">
        <span class="ch-lbl">Drivetrain</span>
        <span class="v ${needDrive !== r.drive ? 'warn' : ''}">${esc((E.DRIVE_LABEL[needDrive] || needDrive).replace('four-wheel drive', '4WD').replace('all-wheel drive', 'AWD').replace('two-wheel drive', '2WD').replace('low-range 4×4', 'Low-range'))}</span>
      </div>
      <div class="ch-demand">
        <span class="ch-lbl">Longest fuel gap</span><span class="v">${r.range_km} km</span>
      </div>`;

    const escalated = needDrive !== r.drive || wet > 0;
    el('ch-note').innerHTML = escalated
      ? `<b>${esc(season.label)}.</b> ${esc(r.note)} ${wet ? `Wet ground raises the bar to ${needClear}mm and ${esc(E.DRIVE_LABEL[needDrive])}.` : ''}`
      : `<b>${esc(r.surface)}.</b> ${esc(r.note)}`;
  }

  /* ═══ FLEET ═══════════════════════════════════════════════════ */
  const VERDICT_ORDER = { cleared: 0, caution: 1, blocked: 2 };

  function visibleFleet() {
    let list = S.fleet.filter(v => S.cls === 'all' || v.class === S.cls);
    const withMeta = list.map(v => ({ v, g: gradeOf(v), q: quoteOf(v) }));
    if (S.sort === 'fit') withMeta.sort((a, b) =>
      (VERDICT_ORDER[a.g.verdict] - VERDICT_ORDER[b.g.verdict]) || (b.g.score - a.g.score) || (a.q.total - b.q.total));
    if (S.sort === 'price') withMeta.sort((a, b) => a.q.total - b.q.total);
    if (S.sort === 'price_desc') withMeta.sort((a, b) => b.q.total - a.q.total);
    if (S.sort === 'seats') withMeta.sort((a, b) => b.v.seats - a.v.seats);
    return withMeta;
  }

  function renderFleet() {
    const list = visibleFleet();
    const grid = el('ch-grid');
    el('ch-count-n').textContent = list.length;

    const cleared = list.filter(x => x.g.verdict === 'cleared').length;
    el('ch-count-fit').textContent = S.route === 'metro'
      ? '' : ` · ${cleared} cleared for ${E.ROUTE_BY_KEY[S.route].label}`;

    if (!list.length) {
      grid.innerHTML = `<div class="ch-empty">No vehicles in this class.
        Choose another class, or widen your dates.</div>`;
      return;
    }

    grid.innerHTML = list.map(({ v, g, q }) => {
      const op = opOf(v);
      const why = g.blockers[0] || g.reasons[0] || '';
      const pinned = S.pinned.includes(v.id);
      return `
      <button class="ch-car" data-verdict="${g.verdict}" data-id="${esc(v.id)}" type="button"
              aria-label="${esc(v.make + ' ' + v.model)}, ${g.verdict} for this route">
        <div class="ch-bay">
          <span class="ch-verdict" data-v="${g.verdict}"><i class="dot"></i>${g.verdict}</span>
          ${op.verified ? `<span class="ch-op"><svg width="10" height="10" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="3"><path d="M20 6 9 17l-5-5"/></svg>${esc(op.name || '')}</span>` : ''}
          ${E.silhouette(v.body)}
          <span class="ch-dim">${v.clearance_mm}mm clearance</span>
        </div>
        <div class="ch-body-c">
          <div class="ch-name">${esc(v.make)} ${esc(v.model)}
            <small>${esc(v.variant || '')} ${v.year}</small></div>
          <div class="ch-spec">
            <div><span>Drive</span><b>${esc((E.DRIVE_LABEL[v.drive] || '').replace('four-wheel drive', '4WD').replace('all-wheel drive', 'AWD').replace('two-wheel drive', '2WD').replace('low-range 4×4', '4WD low'))}</b></div>
            <div><span>Seats</span><b>${v.seats}</b></div>
            <div><span>Range</span><b>${g.range ? g.range + 'km' : '—'}</b></div>
            <div><span>Gearbox</span><b>${v.transmission === 'automatic' ? 'Auto' : 'Manual'}</b></div>
          </div>
          ${why ? `<p class="ch-why">${esc(why)}</p>` : ''}
          <div class="ch-foot">
            <div class="ch-price">
              <span class="amt">${E.KES(q.total)}</span>
              <span class="per">${days()} ${days() === 1 ? 'day' : 'days'} · all in</span>
            </div>
            <span class="ch-pin" role="button" tabindex="0" data-pin="${esc(v.id)}"
                  aria-pressed="${pinned}" aria-label="Compare this vehicle">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                stroke-width="2" stroke-linecap="round"><path d="M4 20V10M12 20V4M20 20v-6"/></svg>
            </span>
          </div>
        </div>
      </button>`;
    }).join('');

    requestAnimationFrame(() => {
      grid.querySelectorAll('.ch-car').forEach((c, i) =>
        setTimeout(() => c.classList.add('in'), Math.min(i * 40, 400)));
    });
  }

  /* ═══ LEDGER ══════════════════════════════════════════════════ */
  function renderLedger() {
    const body = el('ch-ledger-body'), foot = el('ch-ledger-foot');
    if (!S.selected) {
      body.innerHTML = `<div class="ch-empty">Pick a vehicle and every shilling of the
        hire appears here — before you commit to anything.</div>`;
      foot.innerHTML = '';
      return;
    }
    const v = S.fleet.find(x => x.id === S.selected);
    if (!v) { S.selected = null; return renderLedger(); }
    const q = quoteOf(v), g = gradeOf(v);

    body.innerHTML = q.lines.map(l => `
      <div class="ch-line" ${l.good ? 'data-good' : ''} ${l.amount === 0 ? 'data-zero' : ''}>
        <div><div class="l">${esc(l.label)}</div><div class="d">${esc(l.detail)}</div></div>
        <div class="a">${l.amount < 0 ? '−' : ''}${E.KES(Math.abs(l.amount))}</div>
      </div>`).join('');

    foot.innerHTML = `
      <div class="ch-total">
        <div class="ch-total-row">
          <span class="ch-lbl">Total for ${q.days} ${q.days === 1 ? 'day' : 'days'}</span>
          <span class="big">${E.KES(q.total)}</span>
        </div>
        <div class="ch-deposit"><span>Works out at</span><b>${E.KES(q.perDayEffective)}/day</b></div>
        <div class="ch-counter">
          <span class="l">Payable at the counter<br/>on collection</span>
          <span class="v">KES 0</span>
        </div>
        <div class="ch-deposit" style="margin-top:10px">
          <span>Refundable deposit held</span><b>${q.deposit ? E.KES(q.deposit) : 'None'}</b>
        </div>
        <div class="ch-deposit">
          <span>Fuel</span><b>Full to full</b>
        </div>
      </div>
      <button class="ch-cta" id="ch-book" ${g.verdict === 'blocked' ? 'disabled' : ''}>
        ${g.verdict === 'blocked' ? 'Not suitable for this route' : 'Review and book'}
      </button>`;

    el('ch-book')?.addEventListener('click', () => openSheet(v.id, 'book'));
  }

  /* ═══ COMPARE TRAY ════════════════════════════════════════════ */
  function renderTray() {
    const tray = el('ch-tray');
    tray.classList.toggle('open', S.pinned.length > 0);
    el('ch-tray-cars').innerHTML = S.pinned.map(id => {
      const v = S.fleet.find(x => x.id === id); if (!v) return '';
      return `<span class="ch-tray-car">${esc(v.make)} ${esc(v.model)}
        <button data-unpin="${esc(id)}" aria-label="Remove from comparison">✕</button></span>`;
    }).join('');
    el('ch-tray-go').disabled = S.pinned.length < 2;
    el('ch-tray-go').textContent = S.pinned.length < 2
      ? 'Pin two to compare' : `Compare ${S.pinned.length}`;
  }

  function openCompare() {
    const rows = S.pinned.map(id => {
      const v = S.fleet.find(x => x.id === id);
      return { v, g: gradeOf(v), q: quoteOf(v) };
    }).filter(r => r.v);
    if (rows.length < 2) return;

    const best = k => Math.min(...rows.map(r => r.q.total));
    const body = `
      <table class="ch-cmp">
        <thead><tr><th>Against ${esc(E.ROUTE_BY_KEY[S.route].label)}</th>
          ${rows.map(r => `<th>${esc(r.v.make)}<br/>${esc(r.v.model)}</th>`).join('')}</tr></thead>
        <tbody>
          <tr><td>Verdict</td>${rows.map(r =>
            `<td><b style="color:var(--ch-${r.g.verdict})">${r.g.verdict}</b></td>`).join('')}</tr>
          <tr><td>Total, ${days()} days</td>${rows.map(r =>
            `<td><b class="${r.q.total === best() ? 'win' : ''}">${E.KES(r.q.total)}</b></td>`).join('')}</tr>
          <tr><td>Per day, effective</td>${rows.map(r =>
            `<td><b>${E.KES(r.q.perDayEffective)}</b></td>`).join('')}</tr>
          <tr><td>Deposit held</td>${rows.map(r =>
            `<td><b>${r.q.deposit ? E.KES(r.q.deposit) : 'None'}</b></td>`).join('')}</tr>
          <tr><td>Ground clearance</td>${rows.map(r =>
            `<td><b>${r.v.clearance_mm}mm</b></td>`).join('')}</tr>
          <tr><td>Drivetrain</td>${rows.map(r =>
            `<td><b>${esc(E.DRIVE_LABEL[r.v.drive])}</b></td>`).join('')}</tr>
          <tr><td>Fuel range</td>${rows.map(r =>
            `<td><b>${r.g.range ? r.g.range + 'km' : '—'}</b></td>`).join('')}</tr>
          <tr><td>Seats</td>${rows.map(r => `<td><b>${r.v.seats}</b></td>`).join('')}</tr>
          <tr><td>Cross-border</td>${rows.map(r =>
            `<td><b>${r.v.cross_border_ok ? 'Permitted' : 'Not permitted'}</b></td>`).join('')}</tr>
        </tbody>
      </table>`;
    showSheet('Side by side', `${days()} days · ${E.ROUTE_BY_KEY[S.route].label}`, body);
  }

  /* ═══ SHEET ═══════════════════════════════════════════════════ */
  function showSheet(title, meta, html) {
    el('ch-sheet-title').textContent = title;
    el('ch-sheet-meta').textContent = meta;
    el('ch-sheet-body').innerHTML = html;
    el('ch-sheet').classList.add('open');
    el('ch-scrim').classList.add('open');
    document.body.style.overflow = 'hidden';
    el('ch-sheet').scrollTop = 0;
  }
  function closeSheet() {
    el('ch-sheet').classList.remove('open');
    el('ch-scrim').classList.remove('open');
    document.body.style.overflow = '';
  }

  function openSheet(id, mode) {
    const v = S.fleet.find(x => x.id === id); if (!v) return;
    S.selected = id;
    const g = gradeOf(v), q = quoteOf(v), op = opOf(v);
    const allExtras = E.EXTRAS.filter(e => !e.classes || e.classes.includes(v.class));

    const verdictBlock = `
      <div class="ch-why" style="border-left-color:var(--ch-${g.verdict});margin-bottom:16px">
        <b style="font-family:var(--ch-inst);letter-spacing:.14em;text-transform:uppercase;
           font-size:11px;color:var(--ch-${g.verdict})">${g.verdict}</b><br/>
        ${[...g.blockers, ...g.reasons].map(esc).join('<br/>')}
      </div>`;

    const body = `
      ${verdictBlock}
      <div class="ch-sec-t">Driver</div>
      ${[[false, 'Self drive', 'You drive. Licence held ' + (v.min_licence_years || 2) + '+ years, minimum age ' + (v.min_driver_age || 23) + '.'],
         [true, 'With a professional driver', 'Local driver who knows the route. Meals and lodging covered upcountry.']]
        .map(([val, t, d]) => `
        <div class="ch-opt" role="radio" tabindex="0" aria-checked="${S.chauffeur === val}" data-set="chauffeur" data-val="${val}">
          <span class="mark"></span><span class="txt"><b>${t}</b><span>${d}</span></span>
        </div>`).join('')}

      <div class="ch-sec-t">Insurance and deposit</div>
      ${Object.entries(E.INSURANCE).map(([k, i]) => `
        <div class="ch-opt" role="radio" tabindex="0" aria-checked="${S.insurance === k}" data-set="insurance" data-val="${k}">
          <span class="mark"></span>
          <span class="txt"><b>${esc(i.label)}</b><span>${esc(i.blurb)}</span></span>
          <span class="cost">${i.perDay ? '+' + E.KES(i.perDay) + '/d' : 'Included'}</span>
        </div>`).join('')}

      <div class="ch-sec-t">Where you collect it</div>
      ${Object.entries(E.DELIVERY).map(([k, d]) => `
        <div class="ch-opt" role="radio" tabindex="0" aria-checked="${S.delivery === k}" data-set="delivery" data-val="${k}">
          <span class="mark"></span><span class="txt"><b>${esc(d.label)}</b></span>
          <span class="cost">${d.fee ? '+' + E.KES(d.fee) : 'Free'}</span>
        </div>`).join('')}

      <div class="ch-sec-t">Add to the hire</div>
      ${allExtras.map(e => `
        <div class="ch-opt" role="checkbox" tabindex="0" aria-checked="${S.extras.includes(e.key)}" data-toggle="${e.key}">
          <span class="mark"></span><span class="txt"><b>${esc(e.label)}</b></span>
          <span class="cost">+${E.KES(e.once ? e.flat : e.perDay)}${e.once ? '' : '/d'}</span>
        </div>`).join('')}

      <div class="ch-sec-t">What the operator requires</div>
      <p style="font-size:13px;line-height:1.7;color:var(--ch-read-2)">
        Valid driving licence or International Driving Permit, held at least
        ${v.min_licence_years || 2} years. Minimum age ${v.min_driver_age || 23}. Passport or national ID.
        Fuel is full to full and never charged by us.
        ${v.cross_border_ok
          ? 'Cross-border travel into Tanzania or Uganda is permitted with the COMESA permit added above.'
          : 'This vehicle may not be taken across a border.'}
        ${v.mileage_cap_km ? `Mileage is capped at ${v.mileage_cap_km}km per day.` : 'Mileage is unlimited.'}
      </p>

      <div class="ch-sec-t">Booked through</div>
      <p style="font-size:13px;line-height:1.7;color:var(--ch-read-2)">
        <b style="color:var(--ch-read)">${esc(op.name || 'Verified operator')}</b>${op.city ? ', ' + esc(op.city) : ''}.
        ${op.completed_hires ? `${op.completed_hires} completed hires, ` : ''}
        ${op.on_time_pct ? `${op.on_time_pct}% handed over on time, ` : ''}
        ${op.response_mins ? `typically replies in ${op.response_mins} minutes.` : ''}
      </p>

      <div class="ch-sec-t">Your details</div>
      <input class="ch-inp" id="bk-name" placeholder="Full name" autocomplete="name"/>
      <input class="ch-inp" id="bk-phone" type="tel" placeholder="Phone, e.g. 07XX XXX XXX" autocomplete="tel"/>
      <input class="ch-inp" id="bk-email" type="email" placeholder="Email" autocomplete="email"/>
      <input class="ch-inp" id="bk-pickup" placeholder="Collection point or delivery address"/>
      <textarea class="ch-inp" id="bk-notes" rows="2" style="resize:none"
        placeholder="Flight number, child seat sizes, anything the operator should know"></textarea>

      <div id="bk-ledger"></div>
      <button class="ch-cta" style="width:100%;margin:14px 0 6px" id="bk-submit"
        ${g.verdict === 'blocked' ? 'disabled' : ''}>
        ${g.verdict === 'blocked' ? 'Not suitable for this route' : `Confirm · ${E.KES(q.total)}`}
      </button>
      <p style="font-size:11.5px;color:var(--ch-read-3);text-align:center;line-height:1.6">
        No card charged now. The operator confirms availability, then you pay.
      </p>`;

    showSheet(`${v.make} ${v.model}`, `${v.variant ? v.variant + ' · ' : ''}${v.year} · ${op.name || ''}`, body);
    refreshSheetLedger();
  }

  function refreshSheetLedger() {
    const host = el('bk-ledger'); if (!host || !S.selected) return;
    const v = S.fleet.find(x => x.id === S.selected); if (!v) return;
    const q = quoteOf(v);
    host.innerHTML = `<div class="ch-sec-t">The full price</div>` +
      q.lines.map(l => `
        <div class="ch-line" ${l.good ? 'data-good' : ''} ${l.amount === 0 ? 'data-zero' : ''}>
          <div><div class="l">${esc(l.label)}</div><div class="d">${esc(l.detail)}</div></div>
          <div class="a">${l.amount < 0 ? '−' : ''}${E.KES(Math.abs(l.amount))}</div>
        </div>`).join('') +
      `<div class="ch-line"><div><div class="l"><b>Total</b></div>
         <div class="d">Payable at the counter: KES 0 · Refundable deposit ${q.deposit ? E.KES(q.deposit) : 'none'}</div></div>
       <div class="a" style="color:var(--ch-brass);font-size:19px">${E.KES(q.total)}</div></div>`;
    const b = el('bk-submit');
    if (b && !b.disabled) b.textContent = `Confirm · ${E.KES(q.total)}`;
  }

  /* ═══ SUBMIT ══════════════════════════════════════════════════ */
  async function submitBooking() {
    const v = S.fleet.find(x => x.id === S.selected); if (!v) return;
    const name = el('bk-name').value.trim();
    const phone = el('bk-phone').value.trim();
    if (!name) { toast('Add your name so the operator knows who is collecting.'); el('bk-name').focus(); return; }
    if (phone.replace(/\D/g, '').length < 9) { toast('Add a phone number the operator can reach.'); el('bk-phone').focus(); return; }

    const q = quoteOf(v), g = gradeOf(v), op = opOf(v);
    const ref = 'CH-' + Date.now().toString(36).toUpperCase().slice(-6);
    const btn = el('bk-submit');
    btn.disabled = true; btn.textContent = 'Sending…';

    const payload = {
      ref, vehicle_id: String(v.id), operator_id: String(v.operator_id),
      starts_on: S.start, ends_on: S.end, days: q.days,
      with_chauffeur: S.chauffeur, route_key: S.route, route_verdict: g.verdict,
      pickup_mode: S.delivery, pickup_detail: el('bk-pickup').value.trim() || null,
      insurance_tier: S.insurance, extras: S.extras,
      price_breakdown: q.lines, total: E.toMinor(q.total),
      deposit_held: E.toMinor(q.deposit), pay_at_counter: 0,
      customer_name: name, phone, email: el('bk-email').value.trim() || null,
      notes: el('bk-notes').value.trim() || null, status: 'pending'
    };

    let saved = false;
    try {
      if (window.__chSb) {
        const { error } = await window.__chSb.from('car_bookings').insert(payload);
        if (!error) saved = true;
        else {
          /* Fall back to the existing transport table so a hire is never
             lost just because the new schema has not been applied yet. */
          await window.__chSb.from('transport_requests').insert({
            ref, type: 'carhire', ride_name: `${v.make} ${v.model}`, ride_type: v.class,
            pickup: payload.pickup_detail, ride_date: S.start, dropoff: S.end,
            notes: `${payload.notes || ''} [${S.chauffeur ? 'chauffeur' : 'self drive'}] [${S.insurance}] [route:${S.route}/${g.verdict}]`,
            customer_name: name, phone, email: payload.email,
            estimated_fare: q.total, status: 'pending', created_at: new Date().toISOString()
          });
          saved = true;
        }
      }
    } catch (_) { /* keep going — the guest still gets their reference */ }

    const wa = encodeURIComponent(
      `Cabana car hire ${ref}\n${v.make} ${v.model} ${v.year}\n` +
      `${S.start} to ${S.end} (${q.days} days)\n` +
      `${S.chauffeur ? 'With driver' : 'Self drive'} · ${E.ROUTE_BY_KEY[S.route].label}\n` +
      `Total ${E.KES(q.total)} · deposit ${q.deposit ? E.KES(q.deposit) : 'none'}\n` +
      `Name: ${name}`);

    el('ch-sheet-body').innerHTML = `
      <div style="text-align:center;padding:12px 0 4px">
        <div style="font-family:var(--ch-inst);font-size:11px;letter-spacing:.22em;
          text-transform:uppercase;color:var(--ch-read-3);margin-bottom:8px">Reference</div>
        <div style="font-family:var(--ch-inst);font-size:38px;font-weight:600;
          color:var(--ch-brass);letter-spacing:.04em">${esc(ref)}</div>
        <p style="font-size:14px;color:var(--ch-read-2);line-height:1.65;margin:14px auto 0;max-width:40ch">
          ${esc(op.name || 'The operator')} has your request and typically replies in
          ${op.response_mins || 30} minutes. Nothing is charged until they confirm the vehicle is free.
        </p>
      </div>
      <div class="ch-sec-t">What you agreed</div>
      <div class="ch-line"><div><div class="l">${esc(v.make)} ${esc(v.model)}</div>
        <div class="d">${S.start} → ${S.end} · ${q.days} days · ${S.chauffeur ? 'with driver' : 'self drive'}</div></div>
        <div class="a">${E.KES(q.total)}</div></div>
      <div class="ch-line"><div><div class="l">At the counter</div>
        <div class="d">Deposit ${q.deposit ? E.KES(q.deposit) + ', refunded on return' : 'not required'}</div></div>
        <div class="a" style="color:var(--ch-cleared)">KES 0</div></div>
      <a class="ch-cta" style="width:100%;margin:16px 0 6px;text-align:center;text-decoration:none;
         display:block;background:#25D366;color:#062012"
         href="https://wa.me/254716206494?text=${wa}" target="_blank" rel="noopener">
        Send to the operator on WhatsApp</a>
      <button class="ch-cta" style="width:100%;background:var(--ch-panel-2);color:var(--ch-read)"
        onclick="document.getElementById('ch-scrim').click()">Keep browsing</button>
      ${saved ? '' : `<p style="font-size:11.5px;color:var(--ch-caution);text-align:center;margin-top:10px">
        Save your reference. We could not reach the booking service, so send the WhatsApp message to confirm.</p>`}`;
    el('ch-sheet').scrollTop = 0;
  }

  /* ═══ RENDER ══════════════════════════════════════════════════ */
  function render() { renderBrief(); renderFleet(); renderLedger(); renderTray(); }

  /* ═══ EVENTS ══════════════════════════════════════════════════ */
  function wire() {
    /* Route rail */
    el('ch-routes').innerHTML = E.ROUTES.map(r =>
      `<button class="ch-chip" type="button" data-route="${r.key}"
        aria-pressed="${r.key === S.route}">${esc(r.label)}</button>`).join('');

    el('ch-routes').addEventListener('click', e => {
      const b = e.target.closest('[data-route]'); if (!b) return;
      S.route = b.dataset.route;
      el('ch-routes').querySelectorAll('[data-route]').forEach(x =>
        x.setAttribute('aria-pressed', x.dataset.route === S.route));
      render();
    });

    /* Class filter */
    el('ch-classes').innerHTML = E.CLASSES.map(c =>
      `<button class="ch-chip" type="button" data-cls="${c.key}"
        aria-pressed="${c.key === S.cls}">${esc(c.label)}</button>`).join('');
    el('ch-classes').addEventListener('click', e => {
      const b = e.target.closest('[data-cls]'); if (!b) return;
      S.cls = b.dataset.cls;
      el('ch-classes').querySelectorAll('[data-cls]').forEach(x =>
        x.setAttribute('aria-pressed', x.dataset.cls === S.cls));
      renderFleet();
    });

    /* Dates */
    const si = el('ch-start'), ei = el('ch-end');
    si.value = S.start; ei.value = S.end; si.min = iso(new Date());
    si.addEventListener('change', () => {
      S.start = si.value;
      if (new Date(S.end) <= new Date(S.start)) {
        const n = new Date(S.start); n.setDate(n.getDate() + 3);
        S.end = iso(n); ei.value = S.end;
      }
      ei.min = S.start; render();
    });
    ei.addEventListener('change', () => { S.end = ei.value; render(); });

    /* Sort */
    el('ch-sort').addEventListener('change', e => { S.sort = e.target.value; renderFleet(); });

    /* Cards + pins */
    el('ch-grid').addEventListener('click', e => {
      const pin = e.target.closest('[data-pin]');
      if (pin) {
        e.stopPropagation(); e.preventDefault();
        const id = pin.dataset.pin;
        if (S.pinned.includes(id)) S.pinned = S.pinned.filter(x => x !== id);
        else if (S.pinned.length >= 3) return toast('Compare up to three at a time.');
        else S.pinned.push(id);
        /* Update this control in place. Re-rendering the whole grid here
           would throw away scroll position and the element under the
           user's finger mid-tap. */
        pin.setAttribute('aria-pressed', S.pinned.includes(id));
        renderTray(); return;
      }
      const card = e.target.closest('.ch-car');
      if (card) { S.selected = card.dataset.id; renderLedger(); openSheet(card.dataset.id); }
    });

    /* Tray */
    el('ch-tray-cars').addEventListener('click', e => {
      const b = e.target.closest('[data-unpin]'); if (!b) return;
      S.pinned = S.pinned.filter(x => x !== b.dataset.unpin);
      const btn = el('ch-grid').querySelector(`[data-pin="${b.dataset.unpin}"]`);
      if (btn) btn.setAttribute('aria-pressed', 'false');
      renderTray();
    });
    el('ch-tray-go').addEventListener('click', openCompare);
    el('ch-tray-clear').addEventListener('click', () => {
      S.pinned = [];
      el('ch-grid').querySelectorAll('[data-pin]').forEach(x => x.setAttribute('aria-pressed','false'));
      renderTray();
    });

    /* Sheet interactions, delegated */
    el('ch-sheet-body').addEventListener('click', e => {
      const set = e.target.closest('[data-set]');
      if (set) {
        const k = set.dataset.set;
        let val = set.dataset.val;
        if (val === 'true') val = true; if (val === 'false') val = false;
        S[k] = val;
        set.parentElement.querySelectorAll(`[data-set="${k}"]`).forEach(x =>
          x.setAttribute('aria-checked', String(x.dataset.val) === String(set.dataset.val)));
        refreshSheetLedger(); renderFleet(); renderLedger(); return;
      }
      const tog = e.target.closest('[data-toggle]');
      if (tog) {
        const k = tog.dataset.toggle;
        S.extras = S.extras.includes(k) ? S.extras.filter(x => x !== k) : [...S.extras, k];
        tog.setAttribute('aria-checked', S.extras.includes(k));
        refreshSheetLedger(); renderFleet(); renderLedger(); return;
      }
      if (e.target.closest('#bk-submit')) submitBooking();
    });
    el('ch-sheet-body').addEventListener('keydown', e => {
      if (e.key === ' ' || e.key === 'Enter') {
        const t = e.target.closest('[data-set],[data-toggle]');
        if (t) { e.preventDefault(); t.click(); }
      }
    });

    el('ch-scrim').addEventListener('click', closeSheet);
    el('ch-sheet-close').addEventListener('click', closeSheet);
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeSheet(); });
  }

  /* ═══ BOOT ════════════════════════════════════════════════════ */
  async function boot() {
    wire();
    const { fleet, operators, source } = await E.loadFleet(window.__chSb);
    S.fleet = fleet; S.operators = operators; S.source = source;
    render();
    el('ch-src').textContent = source === 'live'
      ? `${fleet.length} vehicles from ${operators.length} verified operators`
      : `${fleet.length} vehicles · launch fleet`;
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
