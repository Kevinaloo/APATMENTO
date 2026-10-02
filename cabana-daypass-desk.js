/* ═══════════════════════════════════════════════════════════════════
   CABANA · DAY PASS DESK (partner side)
   ───────────────────────────────────────────────────────────────────
   One sheet, opened from a listing card, to switch a stay's day pass
   on or off and tune its window, rate and days.

     CabanaDayPassDesk.open({ sb, listing, onSaved })

   Every rule is enforced again by the listings trigger (window after
   checkout, at least two hours, cheaper than a night, at least one
   day). The sheet says the same things first so the host never meets
   a database error.
   ═══════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window.CabanaDayPassDesk) return;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const ORDER = [1, 2, 3, 4, 5, 6, 0];
  const mins = v => { const m = /^(\d{1,2}):(\d{2})/.exec(v || ''); return m ? (+m[1]) * 60 + (+m[2]) : null; };
  const hhmm = v => String(v || '').slice(0, 5);

  const CSS = `
.dpd-scrim{position:fixed;inset:0;background:rgba(10,11,24,.46);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);z-index:9998;opacity:0;transition:opacity .3s}
.dpd-scrim.on{opacity:1}
.dpd{position:fixed;left:50%;bottom:0;transform:translate(-50%,100%);width:min(520px,100%);max-height:92vh;overflow:auto;background:#FFFCF5;color:#1B1408;border-radius:26px 26px 0 0;z-index:9999;box-shadow:0 -30px 80px rgba(60,35,0,.28);transition:transform .5s cubic-bezier(.2,.9,.2,1);font-family:'Hanken Grotesk',system-ui,sans-serif}
.dpd.on{transform:translate(-50%,0)}
@media(min-width:640px){.dpd{bottom:auto;top:50%;border-radius:26px;transform:translate(-50%,-40%) scale(.96);opacity:0;transition:transform .45s cubic-bezier(.2,.9,.2,1),opacity .3s}.dpd.on{transform:translate(-50%,-50%) scale(1);opacity:1}}
.dpd-hero{position:relative;padding:26px 24px 20px;background:radial-gradient(120% 140% at 85% -10%,#FFD27A 0,#FFB547 28%,#F2803A 58%,#4B1F0E 100%);color:#FFF8EA;overflow:hidden;border-radius:inherit;border-bottom-left-radius:0;border-bottom-right-radius:0}
.dpd-sun{position:absolute;right:-30px;top:-30px;width:150px;height:150px;border-radius:50%;background:radial-gradient(circle,#FFF2C6 0 22%,rgba(255,242,198,0) 23%),repeating-conic-gradient(from 0deg,rgba(255,242,198,.55) 0 4deg,transparent 4deg 22.5deg);animation:dpdSpin 30s linear infinite;opacity:.9}
@keyframes dpdSpin{to{transform:rotate(360deg)}}
.dpd-k{font:600 10.5px/1 'JetBrains Mono',ui-monospace,monospace;letter-spacing:.2em;text-transform:uppercase;opacity:.85}
.dpd-h{font:400 30px/1.05 'Fraunces',Georgia,serif;margin:10px 0 6px;letter-spacing:-.01em}
.dpd-h em{font-style:italic}
.dpd-s{font-size:13px;opacity:.9;max-width:34ch;line-height:1.45}
.dpd-x{position:absolute;right:14px;top:14px;width:34px;height:34px;border-radius:50%;border:0;background:rgba(255,255,255,.2);color:#fff;font-size:18px;cursor:pointer;z-index:2}
.dpd-body{padding:20px 24px 24px}
.dpd-sw{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 16px;border-radius:16px;background:#fff;border:1px solid rgba(120,80,0,.14)}
.dpd-sw b{font-size:15px}
.dpd-sw small{display:block;font-size:12px;color:#7A6748;margin-top:2px}
.dpd-tg{width:52px;height:30px;border-radius:99px;border:0;background:#E6DCCB;position:relative;cursor:pointer;transition:background .25s;flex:none}
.dpd-tg::after{content:'';position:absolute;left:3px;top:3px;width:24px;height:24px;border-radius:50%;background:#fff;box-shadow:0 2px 6px rgba(0,0,0,.2);transition:transform .3s cubic-bezier(.3,1.4,.5,1)}
.dpd-tg[aria-checked="true"]{background:linear-gradient(135deg,#FFB000,#F2803A)}
.dpd-tg[aria-checked="true"]::after{transform:translateX(22px)}
.dpd-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:16px}
.dpd-f{display:flex;flex-direction:column;gap:6px}
.dpd-f.full{grid-column:1/-1}
.dpd-f label,.dpd-l{font:600 10.5px/1 'JetBrains Mono',ui-monospace,monospace;letter-spacing:.14em;text-transform:uppercase;color:#7A6748}
.dpd-f input{font:500 16px 'Hanken Grotesk',system-ui,sans-serif;padding:12px 14px;border-radius:12px;border:1px solid rgba(120,80,0,.18);background:#fff;color:#1B1408;outline:none;transition:border-color .2s,box-shadow .2s;width:100%;box-sizing:border-box}
.dpd-f input:focus{border-color:#F2803A;box-shadow:0 0 0 4px rgba(242,128,58,.14)}
.dpd-days{display:flex;flex-wrap:wrap;gap:6px}
.dpd-d{min-width:46px;padding:9px 0;border-radius:11px;border:1px solid rgba(120,80,0,.18);background:#fff;font:600 12.5px 'Hanken Grotesk',system-ui,sans-serif;cursor:pointer;transition:all .18s;color:#1B1408}
.dpd-d[aria-pressed="true"]{background:#1B1408;color:#FFD27A;border-color:#1B1408}
.dpd-arc{margin-top:16px;padding:14px 16px;border-radius:16px;background:#1B1408;color:#FFF3D6;display:flex;align-items:center;gap:14px}
.dpd-arc svg{flex:none}
.dpd-arc b{font:400 20px 'Fraunces',Georgia,serif;display:block}
.dpd-arc small{font-size:12px;opacity:.75}
.dpd-warn{margin-top:12px;font-size:12.5px;color:#A1360A;min-height:1em}
.dpd-go{margin-top:14px;width:100%;padding:16px;border:0;border-radius:16px;background:linear-gradient(135deg,#1B1408,#4B1F0E);color:#FFE3A6;font:700 15px 'Hanken Grotesk',system-ui,sans-serif;cursor:pointer;position:relative;overflow:hidden}
.dpd-go::after{content:'';position:absolute;inset:0;background:linear-gradient(110deg,transparent 30%,rgba(255,226,166,.25) 50%,transparent 70%);transform:translateX(-100%);animation:dpdSweep 3.2s ease-in-out infinite}
@keyframes dpdSweep{to{transform:translateX(100%)}}
.dpd-go[disabled]{opacity:.6;cursor:progress}
.dpd-off[hidden]{display:none}
@media(prefers-reduced-motion:reduce){.dpd-sun,.dpd-go::after{animation:none}.dpd,.dpd-scrim{transition:none}}`;

  function ensureCss() {
    if (document.getElementById('dpd-css')) return;
    const st = document.createElement('style'); st.id = 'dpd-css'; st.textContent = CSS; document.head.appendChild(st);
    if (!document.querySelector('link[href*="cabana-checkout.css"]')) {
      const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = '/cabana-checkout.css'; document.head.appendChild(l);
    }
  }

  /* A semicircle "sky" with the window drawn as an arc of daylight. */
  function arc(start, end) {
    const a = mins(start) ?? 600, b = mins(end) ?? 1020;
    const ang = m => Math.PI * (1 - Math.max(0, Math.min(1440, m)) / 1440);
    const pt = m => [40 + 32 * Math.cos(ang(m)), 40 - 32 * Math.sin(ang(m))];
    const [x1, y1] = pt(a), [x2, y2] = pt(b);
    return `<svg width="80" height="46" viewBox="0 0 80 46" aria-hidden="true"><path d="M8 40a32 32 0 0 1 64 0" fill="none" stroke="rgba(255,243,214,.2)" stroke-width="3" stroke-linecap="round"/><path d="M${x1.toFixed(1)} ${y1.toFixed(1)}A32 32 0 0 1 ${x2.toFixed(1)} ${y2.toFixed(1)}" fill="none" stroke="#FFB547" stroke-width="4" stroke-linecap="round"/><circle cx="${x1.toFixed(1)}" cy="${y1.toFixed(1)}" r="3.5" fill="#FFD27A"/><circle cx="${x2.toFixed(1)}" cy="${y2.toFixed(1)}" r="3.5" fill="#F2803A"/></svg>`;
  }

  function open({ sb, listing, onSaved }) {
    if (!sb || !listing) return;
    ensureCss();
    const l = listing;
    const nightly = Number(l.price_night || l.price_per_night) || 0;
    const cur = l.currency || 'KES';
    const checkout = hhmm(l.checkout_time) || '10:00';
    const st = {
      on: l.day_pass_enabled === true,
      price: l.day_pass_price != null ? String(l.day_pass_price) : (nightly ? String(Math.round(nightly * 0.55 / 50) * 50) : ''),
      start: hhmm(l.day_pass_start) || (mins(checkout) > 600 ? checkout : '10:00'),
      end: hhmm(l.day_pass_end) || '17:00',
      days: Array.isArray(l.day_pass_days) && l.day_pass_days.length ? l.day_pass_days.map(Number) : [0, 1, 2, 3, 4, 5, 6],
      guests: l.day_pass_max_guests ? String(l.day_pass_max_guests) : String(l.max_guests || 2),
      note: l.day_pass_note || '',
    };

    const scrim = document.createElement('div'); scrim.className = 'dpd-scrim';
    const el = document.createElement('div'); el.className = 'dpd'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', 'Day pass');
    el.innerHTML = `
      <div class="dpd-hero"><div class="dpd-sun"></div><button class="dpd-x" type="button" aria-label="Close">×</button>
        <div class="dpd-k">Day Pass · ${esc(l.title || 'Your stay')}</div>
        <div class="dpd-h">Sell the <em>daylight</em>.</div>
        <div class="dpd-s">A lower rate for a few hours between checkout and check-in. The night stays yours to sell.</div></div>
      <div class="dpd-body">
        <div class="dpd-sw"><div><b>Offer day passes</b><small data-sw-sub></small></div><button type="button" class="dpd-tg" role="switch" aria-checked="${st.on}" aria-label="Offer day passes"></button></div>
        <div class="dpd-off" data-fields>
          <div class="dpd-grid">
            <div class="dpd-f full"><label for="dpd-price">Rate per pass (${esc(cur)})</label><input id="dpd-price" type="number" inputmode="numeric" min="1" value="${esc(st.price)}"/></div>
            <div class="dpd-f"><label for="dpd-start">From</label><input id="dpd-start" type="time" value="${esc(st.start)}"/></div>
            <div class="dpd-f"><label for="dpd-end">Until</label><input id="dpd-end" type="time" value="${esc(st.end)}"/></div>
            <div class="dpd-f full"><span class="dpd-l">Days</span><div class="dpd-days" data-days></div></div>
            <div class="dpd-f"><label for="dpd-guests">Guests per pass</label><input id="dpd-guests" type="number" min="1" max="50" value="${esc(st.guests)}"/></div>
            <div class="dpd-f"><label for="dpd-note">Note to guests</label><input id="dpd-note" maxlength="240" value="${esc(st.note)}" placeholder="Desk, fast Wi-Fi"/></div>
          </div>
          <div class="dpd-arc" data-arc></div>
        </div>
        <div class="dpd-warn" data-warn role="alert"></div>
        <button type="button" class="dpd-go">Save</button>
      </div>`;
    document.body.append(scrim, el);
    requestAnimationFrame(() => { scrim.classList.add('on'); el.classList.add('on'); });
    const $ = s => el.querySelector(s);
    const prevFocus = document.activeElement;

    function paint() {
      const tg = $('.dpd-tg'); tg.setAttribute('aria-checked', String(st.on));
      $('[data-fields]').hidden = !st.on;
      $('[data-sw-sub]').textContent = st.on ? 'Live on your listing' : 'Off · guests only see nightly stays';
      $('[data-days]').innerHTML = ORDER.map(d => `<button type="button" class="dpd-d" data-d="${d}" aria-pressed="${st.days.includes(d)}">${DAYS[d]}</button>`).join('');
      const a = mins(st.start), b = mins(st.end), hrs = a != null && b != null ? Math.max(0, (b - a) / 60) : 0;
      const p = parseFloat(st.price) || 0;
      $('[data-arc]').innerHTML = arc(st.start, st.end) + `<div><b>${esc(st.start)} – ${esc(st.end)}</b><small>${hrs ? hrs.toFixed(hrs % 1 ? 1 : 0) + ' hours' : ''}${p && nightly ? ' · ' + Math.round(p / nightly * 100) + '% of a night' : ''}</small></div>`;
      $('.dpd-go').textContent = st.on ? 'Save day pass' : (l.day_pass_enabled ? 'Switch day passes off' : 'Save');
    }
    function problem() {
      if (!st.on) return '';
      const p = parseFloat(st.price), a = mins(st.start), b = mins(st.end);
      if (!(p > 0)) return 'Set a rate for the pass.';
      if (nightly && p >= nightly) return `A pass has to cost less than a night (${cur} ${nightly.toLocaleString()}).`;
      if (a == null || b == null || b - a < 120) return 'Give guests a window of at least two hours.';
      if (a < mins(checkout)) return `Start at ${checkout} or later, after your checkout time, so day guests never overlap night guests.`;
      if (!st.days.length) return 'Choose at least one day.';
      return '';
    }
    function close() {
      scrim.classList.remove('on'); el.classList.remove('on');
      document.removeEventListener('keydown', onKey);
      setTimeout(() => { scrim.remove(); el.remove(); prevFocus?.focus?.(); }, 450);
    }
    const onKey = e => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', onKey);
    scrim.onclick = close; $('.dpd-x').onclick = close;
    $('.dpd-tg').onclick = () => { st.on = !st.on; $('[data-warn]').textContent = ''; paint(); };
    el.addEventListener('input', e => {
      const id = e.target.id;
      if (id === 'dpd-price') st.price = e.target.value;
      if (id === 'dpd-start') st.start = e.target.value;
      if (id === 'dpd-end') st.end = e.target.value;
      if (id === 'dpd-guests') st.guests = e.target.value;
      if (id === 'dpd-note') st.note = e.target.value;
      if (id === 'dpd-start' || id === 'dpd-end' || id === 'dpd-price') paint();
    });
    el.addEventListener('click', e => {
      const d = e.target.closest('.dpd-d'); if (!d) return;
      const v = +d.dataset.d; st.days = st.days.includes(v) ? st.days.filter(x => x !== v) : [...st.days, v].sort();
      paint();
    });
    $('.dpd-go').onclick = async () => {
      const why = problem(); $('[data-warn]').textContent = why; if (why) return;
      const btn = $('.dpd-go'); btn.disabled = true; btn.textContent = 'Saving…';
      const patch = st.on ? {
        day_pass_enabled: true, day_pass_price: parseFloat(st.price), day_pass_start: st.start, day_pass_end: st.end,
        day_pass_days: st.days, day_pass_max_guests: parseInt(st.guests, 10) || null, day_pass_note: st.note.trim() || null,
      } : { day_pass_enabled: false };
      const { data, error } = await sb.from('listings').update(patch).eq('id', l.id).select('day_pass_enabled,day_pass_price,day_pass_start,day_pass_end,day_pass_days,day_pass_max_guests,day_pass_note').maybeSingle();
      btn.disabled = false;
      if (error || !data) { $('[data-warn]').textContent = (error && error.message) || 'Could not save. Please try again.'; paint(); return; }
      Object.assign(l, data);
      onSaved && onSaved(l);
      close();
    };
    paint();
    setTimeout(() => $('.dpd-tg').focus(), 60);
  }

  window.CabanaDayPassDesk = { open };
})();
