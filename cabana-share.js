/* ══════════════════════════════════════════════════════════════════════
   CABANA · SHARE
   cabana-share.js

   One share button for every listing, and one sheet behind it. On a phone
   the system share sheet opens straight away (WhatsApp, Messages, anything
   installed). Everywhere else a small sheet offers the same choices.

   The link people pass on is https://cabana.africa/s/<id>. It unfolds as a
   real card (title, photo, price) in chats and feeds, and whoever taps it
   lands on that exact listing.

     CabanaShare.open({ id, title, text, url, image })
     CabanaShare.url(id)                  → the short link
     <button data-cbn-share data-share-id="…" data-share-title="…">

   Any element with data-cbn-share works without further code; clicks are
   delegated, so cards drawn later work too.
   ══════════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';
  if (global.CabanaShare) return;
  var doc = global.document;
  var ORIGIN = 'https://cabana.africa';
  var sheet = null, lastFocus = null;

  function shortUrl(id) { return ORIGIN + '/s/' + encodeURIComponent(id); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  function track(method, id) {
    try { if (global.gtag) global.gtag('event', 'share', { method: method, content_type: 'listing', item_id: id || '' }); } catch (e) { /* analytics never blocks sharing */ }
  }

  function css() {
    if (doc.getElementById('cbn-share-css')) return;
    var st = doc.createElement('style'); st.id = 'cbn-share-css';
    st.textContent =
      '.cbn-share-btn{display:inline-grid;place-items:center;width:38px;height:38px;border-radius:50%;border:0;background:rgba(255,255,255,.92);color:#2a2540;cursor:pointer;box-shadow:0 2px 10px rgba(10,10,20,.18);-webkit-tap-highlight-color:transparent;transition:transform .2s}'
      + '.cbn-share-btn:hover{transform:scale(1.06)}.cbn-share-btn:active{transform:scale(.94)}.cbn-share-btn:focus-visible{outline:3px solid #6d28ff;outline-offset:2px}.cbn-share-btn svg{width:18px;height:18px}'
      + '#cbn-share{position:fixed;inset:0;z-index:2147483000;display:flex;align-items:flex-end;justify-content:center;visibility:hidden;pointer-events:none}'
      + '#cbn-share.on{visibility:visible;pointer-events:auto}'
      + '#cbn-share .bg{position:absolute;inset:0;background:rgba(10,10,20,.55);opacity:0;transition:opacity .25s}#cbn-share.on .bg{opacity:1}'
      + '#cbn-share .card{position:relative;width:min(440px,100%);background:#fff;color:#1c1830;border-radius:24px 24px 0 0;padding:18px 18px calc(18px + env(safe-area-inset-bottom,0px));transform:translateY(100%);transition:transform .32s cubic-bezier(.22,1,.36,1);box-shadow:0 -20px 60px rgba(10,10,20,.3);font:14px/1.45 system-ui,-apple-system,"Segoe UI",sans-serif}'
      + '#cbn-share.on .card{transform:none}'
      + '@media(min-width:561px){#cbn-share{align-items:center}#cbn-share .card{border-radius:24px;transform:translateY(16px) scale(.97);opacity:0;transition:transform .3s cubic-bezier(.22,1,.36,1),opacity .2s}#cbn-share.on .card{transform:none;opacity:1}}'
      + '#cbn-share h2{margin:0 28px 2px 0;font-size:17px;font-weight:800}#cbn-share .sub{margin:0 0 14px;color:#6b6788;font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}'
      + '#cbn-share .x{position:absolute;top:12px;right:12px;width:34px;height:34px;border:0;border-radius:50%;background:#f1eff8;color:#2a2540;font-size:20px;cursor:pointer}'
      + '#cbn-share .grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:14px}'
      + '#cbn-share .opt{display:flex;flex-direction:column;align-items:center;gap:6px;padding:10px 4px;border:0;border-radius:14px;background:#f7f5fd;color:#2a2540;font:600 12px system-ui;cursor:pointer;text-decoration:none}'
      + '#cbn-share .opt:hover{background:#efeafd}#cbn-share .opt:focus-visible{outline:3px solid #6d28ff}#cbn-share .opt svg{width:24px;height:24px}'
      + '#cbn-share .copy{display:flex;gap:8px;align-items:center;padding:6px 6px 6px 12px;border:1px solid #e3def3;border-radius:14px}'
      + '#cbn-share .copy input{flex:1;min-width:0;border:0;background:none;font:13px ui-monospace,Menlo,monospace;color:#4a4668;outline:none}'
      + '#cbn-share .copy button{border:0;border-radius:10px;padding:9px 14px;background:#6d28ff;color:#fff;font:700 13px system-ui;cursor:pointer}'
      + '@media(prefers-color-scheme:dark){#cbn-share .card{background:#17162b;color:#f4f4fb}#cbn-share .sub{color:#a9acc8}#cbn-share .opt,#cbn-share .x{background:#23223d;color:#f4f4fb}#cbn-share .copy{border-color:#34325a}#cbn-share .copy input{color:#cfd0e6}}'
      + '@media(prefers-reduced-motion:reduce){#cbn-share *{transition:none!important}}';
    doc.head.appendChild(st);
  }

  var ICON = {
    share: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7"/><path d="m16 6-4-4-4 4"/><path d="M12 2v13"/></svg>',
    wa: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm5.2 14.2c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .2-3.3-.7-2.8-1.2-4.6-4-4.7-4.2-.1-.2-1.1-1.5-1.1-2.8s.7-2 1-2.3c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 2c.1.2.1.4 0 .5l-.4.6c-.1.2-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.300 2.4 1.500.3.1.5.1.6-.1l.9-1.100c.2-.2.4-.2.600-.1l1.900.9c.3.1.5.2.5.3.1.100.1.600-.1 1.200Z"/></svg>',
    tg: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M21.5 3.5 2.7 10.8c-.8.3-.8 1.400 0 1.700l4.600 1.500 1.800 5.600c.2.600.9.8 1.400.4l2.600-2.200 4.700 3.500c.5.400 1.200.1 1.400-.5l3-15.200c.2-.800-.600-1.400-1.300-1.100ZM9.500 13.700l8.100-5-6.300 6.200-.3 3.400-1.500-4.600Z"/></svg>',
    x: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.800 3h3.100l-6.800 7.700L22 21h-6.200l-4.900-6.300L5.300 21H2.200l7.300-8.300L2 3h6.300l4.400 5.800L17.800 3Zm-1.100 16.200h1.700L7.300 4.700H5.500l11.200 14.500Z"/></svg>',
    fb: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M13.500 22v-8.200h2.800l.5-3.300h-3.300V8.400c0-1 .4-1.700 1.800-1.700h1.600V3.800c-.3 0-1.300-.1-2.400-.1-2.500 0-4.100 1.500-4.100 4.200v2.600H7.600v3.300h2.800V22h3.100Z"/></svg>',
    mail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>',
    sms: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a8 8 0 0 1-11.6 7.1L3 21l1.900-5.400A8 8 0 1 1 21 12Z"/></svg>',
    link: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1"/><path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/></svg>'
  };

  function copy(text) {
    if (global.navigator.clipboard && global.isSecureContext) return global.navigator.clipboard.writeText(text);
    return new Promise(function (ok, no) {
      try {
        var t = doc.createElement('textarea'); t.value = text; t.setAttribute('readonly', ''); t.style.cssText = 'position:fixed;opacity:0';
        doc.body.appendChild(t); t.select(); var done = doc.execCommand('copy'); t.remove(); done ? ok() : no();
      } catch (e) { no(e); }
    });
  }

  function close() {
    if (!sheet) return;
    sheet.classList.remove('on');
    doc.removeEventListener('keydown', onKey, true);
    if (lastFocus && lastFocus.focus) { try { lastFocus.focus(); } catch (e) { /* element gone */ } }
  }
  function onKey(e) { if (e.key === 'Escape') { e.stopPropagation(); close(); } }

  function panel(o) {
    css();
    if (!sheet) {
      sheet = doc.createElement('div'); sheet.id = 'cbn-share'; sheet.setAttribute('role', 'dialog'); sheet.setAttribute('aria-modal', 'true'); sheet.setAttribute('aria-label', 'Share this listing');
      doc.body.appendChild(sheet);
    }
    var url = o.url, text = o.text || o.title || 'Have a look at this on Cabana';
    var enc = encodeURIComponent, both = enc(text + ' ' + url);
    var links = [
      ['wa', 'WhatsApp', 'https://wa.me/?text=' + both],
      ['tg', 'Telegram', 'https://t.me/share/url?url=' + enc(url) + '&text=' + enc(text)],
      ['x', 'X', 'https://twitter.com/intent/tweet?text=' + enc(text) + '&url=' + enc(url)],
      ['fb', 'Facebook', 'https://www.facebook.com/sharer/sharer.php?u=' + enc(url)],
      ['sms', 'Message', 'sms:?&body=' + both],
      ['mail', 'Email', 'mailto:?subject=' + enc(o.title || 'Cabana') + '&body=' + both]
    ];
    sheet.innerHTML = '<div class="bg" data-x></div><div class="card"><button class="x" type="button" data-x aria-label="Close">×</button>'
      + '<h2>Share this listing</h2><p class="sub">' + esc(o.title || '') + '</p><div class="grid">'
      + links.map(function (l) { return '<a class="opt" data-m="' + l[0] + '" href="' + esc(l[2]) + '" target="_blank" rel="noopener noreferrer">' + ICON[l[0]] + l[1] + '</a>'; }).join('')
      + '<button class="opt" type="button" data-copy>' + ICON.link + 'Copy link</button></div>'
      + '<div class="copy"><input type="text" readonly value="' + esc(url) + '" aria-label="Link to this listing"><button type="button" data-copy>Copy</button></div></div>';
    sheet.querySelectorAll('[data-x]').forEach(function (n) { n.addEventListener('click', close); });
    sheet.querySelectorAll('[data-m]').forEach(function (n) { n.addEventListener('click', function () { track(n.getAttribute('data-m'), o.id); setTimeout(close, 150); }); });
    sheet.querySelectorAll('[data-copy]').forEach(function (n) {
      n.addEventListener('click', function () {
        copy(url).then(function () { track('copy', o.id); n.textContent = n.classList.contains('opt') ? 'Copied ✓' : 'Copied'; setTimeout(close, 700); },
          function () { var i = sheet.querySelector('.copy input'); i.focus(); i.select(); });
      });
    });
    lastFocus = doc.activeElement;
    doc.addEventListener('keydown', onKey, true);
    requestAnimationFrame(function () { sheet.classList.add('on'); var f = sheet.querySelector('.opt'); if (f) f.focus(); });
  }

  function open(o) {
    o = o || {};
    var url = o.url || (o.id ? shortUrl(o.id) : global.location.href);
    var data = { title: o.title || 'Cabana', text: o.text || ((o.title ? o.title + ' on Cabana' : 'Have a look at this on Cabana')), url: url };
    var mobile = /Android|iPhone|iPad|iPod/i.test(global.navigator.userAgent || '') || (global.matchMedia && global.matchMedia('(pointer:coarse)').matches);
    if (mobile && global.navigator.share) {
      return global.navigator.share(data).then(function () { track('native', o.id); }, function (e) {
        if (e && e.name === 'AbortError') return;   // they closed the sheet; that is their answer
        panel({ id: o.id, title: data.title, text: data.text, url: url });
      });
    }
    panel({ id: o.id, title: data.title, text: data.text, url: url });
    return Promise.resolve();
  }

  /* HTML for a ready-made round button, for pages that draw their own cards. */
  function button(o, cls) {
    o = o || {};
    return '<button type="button" class="cbn-share-btn ' + esc(cls || '') + '" data-cbn-share data-share-id="' + esc(o.id) + '" data-share-title="' + esc(o.title || '') + '"'
      + (o.url ? ' data-share-url="' + esc(o.url) + '"' : '') + ' aria-label="Share ' + esc(o.title || 'this listing') + '">' + ICON.share + '</button>';
  }

  doc.addEventListener('click', function (e) {
    var t = e.target && e.target.closest ? e.target.closest('[data-cbn-share]') : null;
    if (!t) return;
    e.preventDefault(); e.stopPropagation();   // a share button on a card must not open the card
    open({ id: t.getAttribute('data-share-id'), title: t.getAttribute('data-share-title'), url: t.getAttribute('data-share-url') || undefined });
  }, true);

  global.CabanaShare = { open: open, url: shortUrl, button: button, icon: ICON.share, close: close };
})(window);
