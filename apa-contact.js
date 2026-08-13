/* ═══════════════════════════════════════════════════════════════════
   APA CONTACT. Global contact widget & footer injection
   +254 716 206 494 | connect@cabana.africa
   Injected on every page: floating FAB, footer contact strip,
   and contact bar in strategic page locations.
═══════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  const PHONE     = '+254716206494';
  const PHONE_RAW = '254716206494';
  const EMAIL     = 'connect@cabana.africa';
  const WA_MSG    = encodeURIComponent('Hi Cabana support! I need help with:');
  const WA_URL    = `https://wa.me/${PHONE_RAW}?text=${WA_MSG}`;
  const CALL_URL  = `tel:${PHONE}`;
  const SMS_URL   = `sms:${PHONE}`;
  const MAIL_URL  = `mailto:${EMAIL}`;

  /* ─── 1. Inject styles ──────────────────────────────────────────── */
  const css = `
/* ── CONTACT FAB (floating action button) ── */
#apa-contact-fab {
  position: fixed;
  bottom: 88px;
  right: 20px;
  z-index: 8000;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 10px;
  pointer-events: none;
}
@media (display-mode: standalone) { #apa-contact-fab { bottom: calc(88px + env(safe-area-inset-bottom, 0px)); } }
@media (max-width: 768px) { #apa-contact-fab { bottom: 80px; right: 14px; } }

#apa-fab-toggle {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: linear-gradient(135deg, #25D366, #128C7E);
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 6px 24px rgba(37, 211, 102, .45), 0 2px 8px rgba(0,0,0,.18);
  transition: transform .28s cubic-bezier(.34,1.4,.44,1), box-shadow .28s;
  pointer-events: all;
  flex-shrink: 0;
  position: relative;
}
#apa-fab-toggle:hover {
  transform: scale(1.08) translateY(-2px);
  box-shadow: 0 10px 36px rgba(37, 211, 102, .55), 0 4px 12px rgba(0,0,0,.22);
}
#apa-fab-toggle:active { transform: scale(.97); }
#apa-fab-toggle svg { width: 26px; height: 26px; color: #fff; flex-shrink: 0; }

/* Pulse ring */
#apa-fab-toggle::before {
  content: '';
  position: absolute;
  inset: -4px;
  border-radius: 50%;
  border: 2px solid rgba(37,211,102,.45);
  animation: fabPulse 2.8s ease-in-out infinite;
}
@keyframes fabPulse {
  0%, 100% { opacity: .5; transform: scale(1); }
  50% { opacity: 0; transform: scale(1.28); }
}

/* Badge */
#apa-fab-badge {
  position: absolute;
  top: -3px;
  right: -3px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #FF3B30;
  border: 2px solid #fff;
  font-size: 9px;
  font-weight: 700;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: -apple-system, 'Inter', sans-serif;
}

/* Menu */
#apa-contact-menu {
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: flex-end;
  pointer-events: none;
  opacity: 0;
  transform: translateY(12px) scale(.96);
  transition: opacity .28s cubic-bezier(.22,1,.36,1), transform .28s cubic-bezier(.22,1,.36,1);
}
#apa-contact-fab.open #apa-contact-menu {
  pointer-events: all;
  opacity: 1;
  transform: none;
}
#apa-contact-fab.open #apa-fab-toggle::before { animation: none; }
#apa-contact-fab.open #apa-fab-toggle {
  background: linear-gradient(135deg, #6D28FF, #4F6DFF);
  box-shadow: 0 6px 24px rgba(109,40,255,.4);
}

.apa-contact-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 14px 0 0;
  text-decoration: none;
  pointer-events: all;
  cursor: pointer;
  border: none;
  background: none;
}
.apa-contact-item:nth-child(1) { transition-delay: .03s; }
.apa-contact-item:nth-child(2) { transition-delay: .06s; }
.apa-contact-item:nth-child(3) { transition-delay: .09s; }
.apa-contact-item:nth-child(4) { transition-delay: .12s; }

.apa-ci-label {
  font-family: 'Geist', 'Inter', system-ui, sans-serif;
  font-size: 13px;
  font-weight: 600;
  color: #fff;
  background: rgba(8,8,15,.82);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  padding: 7px 13px;
  border-radius: 100px;
  white-space: nowrap;
  box-shadow: 0 4px 16px rgba(0,0,0,.22);
  border: 1px solid rgba(255,255,255,.1);
}
.apa-ci-icon {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 16px rgba(0,0,0,.22);
  flex-shrink: 0;
  transition: transform .22s cubic-bezier(.34,1.4,.44,1);
}
.apa-contact-item:hover .apa-ci-icon { transform: scale(1.1); }
.apa-ci-icon svg { width: 20px; height: 20px; color: #fff; }

.aci-whatsapp .apa-ci-icon { background: linear-gradient(135deg, #25D366, #128C7E); }
.aci-call    .apa-ci-icon { background: linear-gradient(135deg, #4F6DFF, #6D28FF); }
.aci-sms     .apa-ci-icon { background: linear-gradient(135deg, #FF9500, #FF6B2C); }
.aci-email   .apa-ci-icon { background: linear-gradient(135deg, #C3AEFA, #8B5CF6); }

/* ── CONTACT STRIP (inline, in page sections) ── */
.apa-contact-strip {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: center;
  padding: 18px 24px;
  border-radius: 18px;
  background: rgba(109,40,255,.06);
  border: 1px solid rgba(109,40,255,.14);
  margin: 0 auto;
}
.apa-cs-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--ink-soft, #474A66);
  flex-shrink: 0;
}
.apa-cs-btn {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 9px 16px;
  border-radius: 100px;
  font-family: 'Geist', 'Inter', system-ui, sans-serif;
  font-size: 13px;
  font-weight: 600;
  text-decoration: none;
  transition: transform .22s, box-shadow .22s;
  white-space: nowrap;
}
.apa-cs-btn svg { width: 15px; height: 15px; flex-shrink: 0; }
.apa-cs-btn:hover { transform: translateY(-1px); }
.apa-cs-btn-wa  { background: #25D366; color: #fff; box-shadow: 0 4px 14px rgba(37,211,102,.3); }
.apa-cs-btn-call { background: linear-gradient(135deg, #4F6DFF, #6D28FF); color: #fff; box-shadow: 0 4px 14px rgba(79,109,255,.3); }
.apa-cs-btn-mail { background: var(--glass-2, #F5F5FC); color: var(--ink, #08080F); border: 1px solid var(--line, rgba(8,8,15,.07)); box-shadow: 0 2px 8px rgba(8,8,15,.06); }

/* ── FOOTER CONTACT SECTION ── */
.apa-footer-contact {
  padding: 32px 40px;
  border-top: 1px solid rgba(255,255,255,.08);
  background: #05060F;
}
.apa-footer-contact-inner {
  max-width: 1180px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  flex-wrap: wrap;
}
.apa-fc-left h3 {
  font-family: 'Geist', 'Inter', sans-serif;
  font-size: 16px;
  font-weight: 600;
  color: #fff;
  margin-bottom: 4px;
}
.apa-fc-left p {
  font-size: 13px;
  color: rgba(255,255,255,.5);
  line-height: 1.5;
}
.apa-fc-channels {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.apa-fc-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 11px 18px;
  border-radius: 100px;
  font-family: 'Geist', 'Inter', system-ui, sans-serif;
  font-size: 13px;
  font-weight: 600;
  text-decoration: none;
  transition: transform .22s cubic-bezier(.22,1,.36,1), box-shadow .22s;
  white-space: nowrap;
}
.apa-fc-btn svg { width: 16px; height: 16px; flex-shrink: 0; }
.apa-fc-btn:hover { transform: translateY(-2px); }
.apa-fc-btn-wa   { background: #25D366; color: #fff; box-shadow: 0 4px 16px rgba(37,211,102,.35); }
.apa-fc-btn-call { background: linear-gradient(135deg,#4F6DFF,#6D28FF); color: #fff; box-shadow: 0 4px 16px rgba(79,109,255,.32); }
.apa-fc-btn-sms  { background: rgba(255,255,255,.08); color: #fff; border: 1px solid rgba(255,255,255,.14); }
.apa-fc-btn-mail { background: rgba(255,255,255,.06); color: rgba(255,255,255,.82); border: 1px solid rgba(255,255,255,.1); }

.apa-fc-info {
  display: flex;
  flex-direction: column;
  gap: 5px;
  align-items: flex-end;
}
.apa-fc-info a {
  font-size: 12.5px;
  color: rgba(255,255,255,.45);
  text-decoration: none;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: color .2s;
}
.apa-fc-info a:hover { color: rgba(255,255,255,.85); }
.apa-fc-info svg { width: 13px; height: 13px; opacity: .6; }

@media (max-width: 768px) {
  .apa-footer-contact { padding: 28px 20px; }
  .apa-footer-contact-inner { flex-direction: column; align-items: flex-start; gap: 18px; }
  .apa-fc-info { align-items: flex-start; }
  .apa-fc-channels { gap: 8px; }
}
`;

  const styleEl = document.createElement('style');
  styleEl.id = 'apa-contact-styles';
  styleEl.textContent = css;
  document.head.appendChild(styleEl);

  /* ─── 2. SVG Icons ─────────────────────────────────────────────── */
  const SVG = {
    whatsapp: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>`,
    phone: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.4 2 2 0 0 1 3.6 1.21h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 8.37a16 16 0 0 0 7.72 7.72l1.72-.86a2 2 0 0 1 2.11.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 24 18.18v2.74"/></svg>`,
    sms: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`,
    email: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>`,
    close: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>`,
    menuOpen: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>`,
  };

  /* ─── 3. Build the FAB ─────────────────────────────────────────── */
  function buildFAB() {
    const fab = document.createElement('div');
    fab.id = 'apa-contact-fab';
    fab.setAttribute('role', 'complementary');
    fab.setAttribute('aria-label', 'Contact support');
    fab.innerHTML = `
      <div id="apa-contact-menu" role="menu">
        <a href="${WA_URL}" class="apa-contact-item aci-whatsapp" target="_blank" rel="noopener noreferrer" role="menuitem" aria-label="WhatsApp us">
          <span class="apa-ci-label">WhatsApp</span>
          <span class="apa-ci-icon">${SVG.whatsapp}</span>
        </a>
        <a href="${CALL_URL}" class="apa-contact-item aci-call" role="menuitem" aria-label="Call us">
          <span class="apa-ci-label">Call ${PHONE}</span>
          <span class="apa-ci-icon">${SVG.phone}</span>
        </a>
        <a href="${SMS_URL}" class="apa-contact-item aci-sms" role="menuitem" aria-label="SMS us">
          <span class="apa-ci-label">SMS us</span>
          <span class="apa-ci-icon">${SVG.sms}</span>
        </a>
        <a href="${MAIL_URL}" class="apa-contact-item aci-email" role="menuitem" aria-label="Email us">
          <span class="apa-ci-label">${EMAIL}</span>
          <span class="apa-ci-icon">${SVG.email}</span>
        </a>
      </div>
      <button id="apa-fab-toggle" aria-haspopup="true" aria-expanded="false" aria-label="Contact Cabana support">
        <span id="apa-fab-badge" aria-hidden="true">?</span>
        <span id="apa-fab-icon">${SVG.menuOpen}</span>
      </button>
    `;
    document.body.appendChild(fab);

    const toggle = document.getElementById('apa-fab-toggle');
    const badge  = document.getElementById('apa-fab-badge');
    const icon   = document.getElementById('apa-fab-icon');
    let open = false;

    toggle.addEventListener('click', function (e) {
      e.stopPropagation();
      open = !open;
      fab.classList.toggle('open', open);
      toggle.setAttribute('aria-expanded', String(open));
      icon.innerHTML = open ? SVG.close : SVG.menuOpen;
      badge.style.display = open ? 'none' : 'flex';
    });

    document.addEventListener('click', function (e) {
      if (open && !fab.contains(e.target)) {
        open = false;
        fab.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
        icon.innerHTML = SVG.menuOpen;
        badge.style.display = 'flex';
      }
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && open) {
        open = false;
        fab.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
        icon.innerHTML = SVG.menuOpen;
        badge.style.display = 'flex';
        toggle.focus();
      }
    });
  }

  /* ─── 4. Build footer contact section ──────────────────────────── */
  function buildFooterContact(footer) {
    // Don't duplicate
    if (footer.querySelector('.apa-footer-contact')) return;

    const div = document.createElement('div');
    div.className = 'apa-footer-contact';
    div.setAttribute('aria-label', 'Contact Cabana support');
    div.innerHTML = `
      <div class="apa-footer-contact-inner">
        <div class="apa-fc-left">
          <h3>Need help? We're here.</h3>
          <p>Support is available 24/7. Reach us on WhatsApp for the fastest response.</p>
        </div>
        <div class="apa-fc-channels">
          <a href="${WA_URL}" class="apa-fc-btn apa-fc-btn-wa" target="_blank" rel="noopener noreferrer" aria-label="WhatsApp Cabana support">
            ${SVG.whatsapp} WhatsApp
          </a>
          <a href="${CALL_URL}" class="apa-fc-btn apa-fc-btn-call" aria-label="Call Cabana support">
            ${SVG.phone} Call
          </a>
          <a href="${SMS_URL}" class="apa-fc-btn apa-fc-btn-sms" aria-label="SMS Cabana support">
            ${SVG.sms} SMS
          </a>
          <a href="${MAIL_URL}" class="apa-fc-btn apa-fc-btn-mail" aria-label="Email Cabana support">
            ${SVG.email} Email
          </a>
        </div>
        <div class="apa-fc-info">
          <a href="${CALL_URL}">${SVG.phone} ${PHONE}</a>
          <a href="${MAIL_URL}">${SVG.email} ${EMAIL}</a>
        </div>
      </div>
    `;
    footer.insertBefore(div, footer.firstChild);
  }

  /* ─── 5. Upgrade existing footer contact lines ─────────────────── */
  function upgradeFooterCopy() {
    const footerCopy = document.querySelector('.footer-copy');
    if (!footerCopy) return;

    // Replace old number (254745802200) with new (254716206494) if present
    footerCopy.innerHTML = footerCopy.innerHTML.replace(/254745802200/g, PHONE_RAW);

    // If no WhatsApp link at all, inject our contact row
    if (!footerCopy.querySelector('[href*="wa.me"]')) {
      const row = document.createElement('div');
      row.style.cssText = 'display:flex;align-items:center;justify-content:center;gap:16px;flex-wrap:wrap;margin-bottom:8px;';
      row.innerHTML = `
        <a href="${WA_URL}" style="display:inline-flex;align-items:center;gap:6px;color:rgba(255,255,255,.7);text-decoration:none;font-size:13px;font-weight:600;" target="_blank" rel="noopener noreferrer">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style="color:#25D366"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
          WhatsApp
        </a>
        <a href="${CALL_URL}" style="display:inline-flex;align-items:center;gap:6px;color:rgba(255,255,255,.7);text-decoration:none;font-size:13px;font-weight:600;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.4 2 2 0 0 1 3.6 1.21h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 8.37a16 16 0 0 0 7.72 7.72l1.72-.86a2 2 0 0 1 2.11.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 24 18.18v2.74"/></svg>
          ${PHONE}
        </a>
        <a href="${MAIL_URL}" style="display:inline-flex;align-items:center;gap:6px;color:rgba(255,255,255,.7);text-decoration:none;font-size:13px;font-weight:600;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
          ${EMAIL}
        </a>
      `;
      footerCopy.insertBefore(row, footerCopy.firstChild);
    }
  }

  /* ─── 6. Update Schema.org contact ─────────────────────────────── */
  function updateSchema() {
    const schemas = document.querySelectorAll('script[type="application/ld+json"]');
    schemas.forEach(function(s) {
      try {
        const d = JSON.parse(s.textContent);
        const graph = d['@graph'] || [d];
        graph.forEach(function(node) {
          if (node['@type'] === 'Organization' && node.contactPoint) {
            node.contactPoint.telephone = PHONE;
            node.contactPoint.email = EMAIL;
            node.contactPoint.contactType = 'customer support';
            node.contactPoint.availableLanguage = ['English', 'Swahili'];
            node.telephone = PHONE;
            node.email = EMAIL;
          }
        });
        s.textContent = JSON.stringify(d);
      } catch(e) {}
    });
  }

  /* ─── 7. Init ───────────────────────────────────────────────────── */
  function init() {
    // FAB removed. Floating WhatsApp button disabled site-wide

    const footer = document.querySelector('footer.footer, footer');
    if (footer) {
      buildFooterContact(footer);
      upgradeFooterCopy();
    }

    updateSchema();

    // Fix any stale WhatsApp numbers on the page
    document.querySelectorAll('a[href*="wa.me/254745802200"]').forEach(function(a) {
      a.href = a.href.replace('254745802200', PHONE_RAW);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
