/* ═══════════════════════════════════════════════════════════════════
   CABANA · ONE IDENTITY (client)
   ───────────────────────────────────────────────────────────────────
   Verify once, recognised everywhere.

     await CabanaIdentity.ensure('roommate')  → true if already verified,
                                                otherwise explains why and
                                                offers a 2-minute check that
                                                returns to this exact page.
     await CabanaIdentity.status('agent')     → summary + what this context needs
     CabanaIdentity.nudge()                   → the quiet partner-page prompt

   The nudge is deliberately small: one line under the page title, never
   a modal, never over a button. Dismissed, it stays away for 14 days.
   ═══════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window.CabanaIdentity) return;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const here = () => location.pathname + location.search + location.hash;

  async function headers() {
    const h = { 'Content-Type': 'application/json' };
    try {
      const client = window.ApaSession?.client?.() || window.sb;
      const session = client ? (await client.auth.getSession()).data?.session : null;
      if (session?.access_token) h.Authorization = 'Bearer ' + session.access_token;
    } catch (_) { /* signed out */ }
    return h;
  }
  async function call(op, params, body) {
    const h = await headers();
    if (!h.Authorization) throw Object.assign(new Error('Please sign in.'), { status: 401 });
    const r = await fetch('/api/people?' + new URLSearchParams(Object.assign({ op }, params || {})), { method: body ? 'POST' : 'GET', headers: h, ...(body ? { body: JSON.stringify(body) } : {}) });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw Object.assign(new Error(d.error || 'Something went wrong.'), { status: r.status, data: d });
    return d;
  }
  let cached = null;
  async function status(ctx) {
    if (cached && cached.ctx === ctx && Date.now() - cached.at < 30000) return cached.data;
    const data = await call('identity', { for: ctx || 'host', next: here() });
    cached = { ctx, at: Date.now(), data };
    return data;
  }
  async function start(ctx, next) {
    const r = await call('verify-start', null, { context: ctx, next: next || here() });
    if (r.state === 'approved') return 'approved';
    if (r.state === 'review') return 'review';
    location.href = r.url;
    return 'redirect';
  }

  /* ── the explainer sheet ─────────────────────────────────────────── */
  const TICK = '<svg width="40" height="40" viewBox="0 0 24 24" aria-hidden="true"><defs><linearGradient id="cid-g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#A78BFA"/><stop offset=".55" stop-color="#7C3AED"/><stop offset="1" stop-color="#5B21B6"/></linearGradient></defs><path d="M12 1l2.2 1.9 2.9-.4 1 2.7 2.7 1-.4 2.9L22.3 12l-1.9 2.2.4 2.9-2.7 1-1 2.7-2.9-.4L12 22.3l-2.2-1.9-2.9.4-1-2.7-2.7-1 .4-2.9L1.7 12l1.9-2.2-.4-2.9 2.7-1 1-2.7 2.9.4z" fill="url(#cid-g)"/><path d="M7.6 12.3l3 3 5.8-6.2" fill="none" stroke="#fff" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  function sheet({ title, why, required, onGo }) {
    const d = document.createElement('dialog');
    d.className = 'cid-sheet';
    d.innerHTML = `<div class="cid-in">${TICK}<h2>${esc(title || 'Verify once, use everywhere')}</h2><p>${esc(why || '')}</p>
      <ul><li>Two minutes with your ID and a live selfie, run by our partner Didit.</li><li>Cabana keeps only the result. Your document is never shown to anyone.</li><li>It counts everywhere: rooms, agent work, driving, payouts and your profile.</li></ul>
      <button type="button" class="cid-go">Verify my identity</button><button type="button" class="cid-no">${required ? 'Not now' : 'Maybe later'}</button><p class="cid-err" role="alert"></p></div>`;
    document.body.appendChild(d);
    const close = () => { try { d.close(); } catch (_) {} d.remove(); };
    d.querySelector('.cid-no').onclick = close;
    d.addEventListener('cancel', e => { e.preventDefault(); close(); });
    d.addEventListener('click', e => { if (e.target === d) close(); });
    d.querySelector('.cid-go').onclick = async e => {
      e.target.disabled = true; e.target.textContent = 'Opening secure check…';
      try { const r = await onGo(); if (r !== 'redirect') { close(); } }
      catch (err) {
        if (err.status === 401) { location.href = '/auth.html?next=' + encodeURIComponent(here()); return; }
        d.querySelector('.cid-err').textContent = err.message; e.target.disabled = false; e.target.textContent = 'Verify my identity';
      }
    };
    d.showModal();
    return d;
  }

  async function ensure(ctx, opts) {
    opts = opts || {};
    let s;
    try { s = await status(ctx); }
    catch (e) { if (e.status === 401) { location.href = '/auth.html?next=' + encodeURIComponent(here()); return false; } throw e; }
    if (s.identity.verified) return true;
    if (s.identity.pending === 'review') { toast('Your ID check is being reviewed. We will let you know shortly.'); return false; }
    if (s.identity.declined === 'duplicate_identity') { location.href = '/profile#verification'; return false; }
    sheet({ title: opts.title, why: opts.why || s.needs?.why, required: s.needs?.required, onGo: () => start(ctx, opts.next) });
    return false;
  }

  function toast(msg) {
    if (window.CabanaPeople?.toast) return window.CabanaPeople.toast(msg);
    alert(msg);
  }

  /* ── partner nudge ───────────────────────────────────────────────── */
  const NUDGE_KEY = 'cabana_verify_nudge_until';
  async function nudge(opts) {
    opts = opts || {};
    const sticky = !!opts.sticky;
    try { if (!sticky && Number(localStorage.getItem(NUDGE_KEY) || 0) > Date.now()) return; } catch (_) {}
    if (document.getElementById('cid-nudge')) return;
    let s;
    try { s = await status(opts.context || 'host'); } catch (_) { return; }
    if (s.identity.verified) return;
    const host = document.querySelector(opts.mount || '.pg-hd-left') || document.querySelector('.page-hd') || document.querySelector('main');
    if (!host) return;
    const review = s.identity.pending === 'review', inProg = s.identity.pending === 'in_progress';
    const dup = s.identity.declined === 'duplicate_identity';
    const el = document.createElement('div');
    el.id = 'cid-nudge'; el.setAttribute('role', 'note');
    el.innerHTML = `<span class="cid-n-ic">${TICK.replace('width="40" height="40"', 'width="18" height="18"').replace(/cid-g/g, 'cid-gn')}</span>
      <span class="cid-n-t">${review ? 'Your ID check is being reviewed. Nothing is paused meanwhile.'
        : dup ? 'This ID is verified on another account. <a href="/profile#verification">See options</a>'
        : inProg ? 'You started an ID check. Finish it to get your purple tick.'
        : '<b>Get your purple tick.</b> Guests see it on every listing, and it counts everywhere on Cabana.'}</span>
      ${review || dup ? '' : `<button type="button" class="cid-n-go">${inProg ? 'Continue' : 'Verify · 2 min'}</button>`}
      ${sticky ? '' : '<button type="button" class="cid-n-x" aria-label="Hide for two weeks">×</button>'}`;
    if (host.tagName === 'MAIN') host.insertAdjacentElement('afterbegin', el); else host.appendChild(el);
    el.querySelector('.cid-n-go')?.addEventListener('click', async e => {
      e.target.disabled = true; e.target.textContent = 'Opening…';
      try { const r = await start(opts.context || 'host'); if (r !== 'redirect') { el.remove(); } }
      catch (err) { toast(err.message); e.target.disabled = false; e.target.textContent = 'Verify · 2 min'; }
    });
    el.querySelector('.cid-n-x')?.addEventListener('click', () => {
      try { localStorage.setItem(NUDGE_KEY, String(Date.now() + 14 * 864e5)); } catch (_) {}
      el.classList.add('out'); setTimeout(() => el.remove(), 220);
    });
  }

  const css = document.createElement('style');
  css.textContent = `
.cid-sheet{border:0;border-radius:26px;padding:0;width:min(420px,calc(100vw - 24px));margin:auto;inset:0;box-shadow:0 30px 90px rgba(32,18,46,.3);font:14px/1.55 Inter,system-ui,sans-serif;color:#1D1830;background:#fff}
.cid-sheet::backdrop{background:rgba(23,17,37,.45);backdrop-filter:blur(5px)}
.cid-in{padding:26px 24px 20px;text-align:center}.cid-in h2{margin:10px 0 6px;font:700 20px Geist,Inter,system-ui,sans-serif}
.cid-in p{margin:0;color:#5C566E}.cid-in ul{text-align:left;margin:14px 0 16px;padding-left:18px;color:#3A3450;font-size:13px}.cid-in li{margin:5px 0}
.cid-go,.cid-no{display:block;width:100%;border:0;border-radius:14px;padding:13px;font:700 14px Inter,system-ui,sans-serif;cursor:pointer}
.cid-go{background:linear-gradient(135deg,#8B5CF6,#6D28FF);color:#fff}.cid-go:disabled{opacity:.6}.cid-no{background:transparent;color:#6E6880;margin-top:6px}
.cid-err{color:#B91C1C;font-size:12.5px;margin-top:8px}
#cid-nudge{display:flex;align-items:center;gap:10px;margin-top:12px;padding:8px 8px 8px 12px;border-radius:14px;background:linear-gradient(90deg,rgba(124,58,237,.08),rgba(124,58,237,.02));border:1px solid rgba(124,58,237,.14);font:13px/1.4 Inter,system-ui,sans-serif;color:#3B2D5E;max-width:620px;animation:cid-in .35s ease}
#cid-nudge.out{opacity:0;transform:translateY(-4px);transition:.2s}
@keyframes cid-in{from{opacity:0;transform:translateY(-4px)}}
.cid-n-ic{display:inline-flex;flex-shrink:0}.cid-n-t{flex:1;min-width:0}.cid-n-t a{color:#6D28D9}
.cid-n-go{flex-shrink:0;border:0;border-radius:10px;padding:7px 12px;background:#6D28FF;color:#fff;font:600 12.5px Inter,system-ui,sans-serif;cursor:pointer;white-space:nowrap}
.cid-n-x{flex-shrink:0;border:0;background:transparent;color:#8B84A0;font-size:18px;line-height:1;padding:4px 6px;cursor:pointer;border-radius:8px}
@media (max-width:520px){#cid-nudge{font-size:12.5px}}
@media (prefers-color-scheme:dark){.cid-sheet{background:#1E1A28;color:#EEE8F5}.cid-in p,.cid-in ul{color:#CFC6D9}#cid-nudge{color:#E1D6F7;background:rgba(124,58,237,.14)}}`;
  document.head.appendChild(css);

  window.CabanaIdentity = { status, ensure, start, nudge };

  // Partner pages get the quiet prompt automatically.
  const boot = () => { if (/^\/partner-/.test(location.pathname) && !/partner-cabana/.test(location.pathname)) setTimeout(() => nudge({ sticky: /partner-settings/.test(location.pathname) }), 900); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
