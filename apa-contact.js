/* ══════════════════════════════════════════════════════════════════════
   CABANA · CONTACT
   apa-contact.js

   This file used to inject a phone number and a WhatsApp button into
   every footer on the site. Cabana no longer publishes either, so it
   does the opposite job now: it makes sure every page offers the two
   channels that DO exist, and cleans up any older markup that still
   points at a line nobody answers.

   Three jobs, all idempotent:

     1. Load the support console if the page has not already loaded it,
        so the widget is genuinely site-wide rather than site-mostly.
     2. Put a contact strip in the footer — chat, in-app call, and the
        two addresses — on pages whose footer has none.
     3. Sweep. Any surviving tel:, sms: or wa.me link that points at
        Cabana becomes a support link, and any telephone left in a
        structured-data block is removed. A cached page, a stale CDN
        copy or an old template cannot reintroduce a dead number.

   Data attributes anywhere on the site are honoured by the console:
     data-cbn-support              open support
     data-cbn-support + prefill    open support and send that message
     data-cbn-call                 start an in-app voice call
   ══════════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';
  if (global.__cbnContact) return;
  global.__cbnContact = true;

  var doc = global.document;

  var EMAIL_SUPPORT = 'connect@cabana.africa';
  var EMAIL_PARTNER = 'partnership@cabana.africa';

  /* Numbers Cabana used to publish. Kept only so the sweep can
     recognise and remove them wherever they survive. */
  var RETIRED = ['254716206494', '254745802200', '254796818671'];

  var ICON = {
    chat: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 9 9 0 0 1-3.7-.8L3 21l1.9-5.1A8.4 8.4 0 0 1 4 11.5 8.4 8.4 0 0 1 12.5 3 8.4 8.4 0 0 1 21 11.5z"/></svg>',
    call: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1A19.5 19.5 0 0 1 4.7 12a19.8 19.8 0 0 1-3.1-8.6A2 2 0 0 1 3.6 1.2h3a2 2 0 0 1 2 1.7 12.8 12.8 0 0 0 .7 2.8 2 2 0 0 1-.5 2.1L7.9 8.4a16 16 0 0 0 7.7 7.7l1.7-.9a2 2 0 0 1 2.1.5 12.8 12.8 0 0 0 2.8.7 2 2 0 0 1 1.8 2z"/></svg>',
    mail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>',
  };

  /* ── 1 · the console itself ──────────────────────────────────────
     A page that forgot the script tag still gets support. */
  function ensureConsole() {
    if (global.CabanaSupport) return;
    if (doc.querySelector('script[src^="/cabana-support.js"]')) return;
    ['/cabana-call.js', '/cabana-support.js'].forEach(function (src) {
      if (doc.querySelector('script[src^="' + src + '"]')) return;
      var s = doc.createElement('script');
      s.src = src; s.defer = true;
      doc.head.appendChild(s);
    });
  }

  /* ── 2 · the footer strip ────────────────────────────────────────
     Only where the footer does not already carry contact markup of its
     own. Two contact strips is worse than one. */
  var CSS = ''
    + '.cbn-fc{padding:26px 24px;border-top:1px solid rgba(255,255,255,.08);}'
    + '.cbn-fc-in{max-width:1180px;margin:0 auto;display:flex;align-items:center;'
    + 'justify-content:space-between;gap:20px;flex-wrap:wrap;}'
    + '.cbn-fc-l h3{margin:0 0 4px;font:700 16px/1.3 var(--font-display,var(--font-body,Inter,system-ui,sans-serif));'
    + 'color:var(--fc-ink,#fff);letter-spacing:-.2px;}'
    + '.cbn-fc-l p{margin:0;font:400 13px/1.55 var(--font-body,Inter,system-ui,sans-serif);'
    + 'color:var(--fc-soft,rgba(255,255,255,.52));max-width:46ch;}'
    + '.cbn-fc-acts{display:flex;gap:9px;flex-wrap:wrap;}'
    + '.cbn-fc-b{display:inline-flex;align-items:center;gap:8px;padding:11px 18px;border-radius:100px;'
    + 'font:600 13.5px/1 var(--font-body,Inter,system-ui,sans-serif);text-decoration:none;cursor:pointer;'
    + 'border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.06);color:var(--fc-ink,#fff);'
    + 'transition:transform .2s cubic-bezier(.34,1.4,.44,1),background .2s,border-color .2s;}'
    + '.cbn-fc-b:hover{transform:translateY(-2px);background:rgba(255,255,255,.13);border-color:rgba(255,255,255,.26);}'
    + '.cbn-fc-b svg{width:15px;height:15px;flex:none;}'
    + '.cbn-fc-b.is-primary{background:linear-gradient(135deg,#6D28FF,#4F6DFF 58%,#4EE0C8);border-color:transparent;'
    + 'box-shadow:0 8px 24px rgba(109,40,255,.32);}'
    + '.cbn-fc-b.is-primary:hover{box-shadow:0 12px 32px rgba(109,40,255,.44);}'
    + '.cbn-fc-mails{display:flex;flex-direction:column;gap:4px;align-items:flex-end;}'
    + '.cbn-fc-mails a{font:500 12.5px/1.5 var(--font-body,Inter,system-ui,sans-serif);'
    + 'color:var(--fc-soft,rgba(255,255,255,.46));text-decoration:none;transition:color .2s;}'
    + '.cbn-fc-mails a:hover{color:var(--fc-ink,#fff);}'
    + '@media(max-width:760px){.cbn-fc-in{flex-direction:column;align-items:flex-start;}'
    + '.cbn-fc-mails{align-items:flex-start;}}';

  function styles() {
    if (doc.getElementById('cbn-contact-css')) return;
    var st = doc.createElement('style');
    st.id = 'cbn-contact-css';
    st.textContent = CSS;
    doc.head.appendChild(st);
  }

  function footerStrip(footer) {
    if (footer.querySelector('.cbn-fc, .sf-contact, .apa-footer-contact')) return;
    styles();
    var div = doc.createElement('div');
    div.className = 'cbn-fc';
    div.setAttribute('aria-label', 'Contact Cabana');
    div.innerHTML =
      '<div class="cbn-fc-in">'
      + '<div class="cbn-fc-l">'
      +   '<h3>Need a hand?</h3>'
      +   '<p>Support lives inside Cabana, so whoever answers can already see your booking. Chat with APA, or ask for a person.</p>'
      + '</div>'
      + '<div class="cbn-fc-acts">'
      +   '<a class="cbn-fc-b is-primary" href="/help.html" data-cbn-support>' + ICON.chat + 'Chat with us</a>'
      +   '<a class="cbn-fc-b" href="/help.html" data-cbn-call>' + ICON.call + 'Call us in the app</a>'
      + '</div>'
      + '<div class="cbn-fc-mails">'
      +   '<a href="mailto:' + EMAIL_SUPPORT + '">' + ICON.mail + ' ' + EMAIL_SUPPORT + '</a>'
      +   '<a href="mailto:' + EMAIL_PARTNER + '">Hosts &amp; partners: ' + EMAIL_PARTNER + '</a>'
      + '</div>'
      + '</div>';
    footer.insertBefore(div, footer.firstChild);
  }

  /* ── 3 · the sweep ───────────────────────────────────────────────
     Belt and braces over the source edits. A page served from a cache,
     a partial rendered by an older script, or a third-party embed can
     all still be carrying a retired number; none of them should be able
     to hand a guest a dead channel. */
  function sweepLinks() {
    var links = doc.querySelectorAll('a[href^="tel:"],a[href^="sms:"],a[href*="wa.me"],a[href*="api.whatsapp.com"]');
    Array.prototype.forEach.call(links, function (a) {
      var href = a.getAttribute('href') || '';
      var digits = href.replace(/\D/g, '');
      var ours = RETIRED.some(function (n) { return digits.indexOf(n) >= 0; });
      /* A host's own number stays: it belongs to them, not to us. */
      if (!ours) return;
      a.setAttribute('href', '/help.html');
      a.setAttribute(href.indexOf('tel:') === 0 || href.indexOf('sms:') === 0 ? 'data-cbn-call' : 'data-cbn-support', '');
      a.removeAttribute('target');
      a.removeAttribute('rel');
      var label = (a.textContent || '').trim();
      if (!label || /^\+?[\d\s()+-]{7,}$/.test(label) || /whats\s?app/i.test(label)) {
        a.textContent = href.indexOf('tel:') === 0 ? 'Call us in the app' : 'Chat with us';
      }
    });
  }

  function sweepSchema() {
    var blocks = doc.querySelectorAll('script[type="application/ld+json"]');
    Array.prototype.forEach.call(blocks, function (node) {
      var raw = node.textContent || '';
      if (!/"telephone"/.test(raw)) return;
      var changed = false;
      try {
        var data = JSON.parse(raw);
        (function walk(v) {
          if (!v || typeof v !== 'object') return;
          if (Array.isArray(v)) { v.forEach(walk); return; }
          if (typeof v.telephone === 'string') {
            var d = v.telephone.replace(/\D/g, '');
            if (RETIRED.some(function (n) { return d.indexOf(n) >= 0; })) { delete v.telephone; changed = true; }
          }
          Object.keys(v).forEach(function (k) { walk(v[k]); });
        })(data);
        if (changed) node.textContent = JSON.stringify(data);
      } catch (e) { /* malformed JSON-LD is not ours to repair */ }
    });
  }

  /* The delegated click handler for data-cbn-support / data-cbn-call
     lives in cabana-support.js, which loads on every page. Binding it
     here as well would fire a prefilled message twice on the pages that
     have both files. */

  function init() {
    ensureConsole();
    sweepLinks();
    sweepSchema();
    var footer = doc.querySelector('footer.site-footer, footer.footer, footer');
    if (footer) footerStrip(footer);
  }

  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', init);
  else init();
})(window);
