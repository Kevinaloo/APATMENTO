/* ═══════════════════════════════════════════════════════════════════════
   CABANA · PARTNER NAVIGATION  (partner-nav.js)

   Every Partner Hub page used to carry its own copy of the bottom bar,
   and the copies drifted: Listings had six cramped tabs with no Cabana
   Match, Match had a different six with no Messages, and chat.js bolted a
   seventh on afterwards. Seven icons across a 360px phone is a row of
   nine-pixel labels nobody can tap or read.

   One bar now, five slots, the same everywhere:

       Listings · Bookings · Match · Messages · More

   Match sits in the middle because it is the feature that moves money
   while the host is asleep. Everything else a host needs weekly lives one
   tap away in the More sheet. The page's own bar is removed rather than
   hidden, so there is a single source of truth and nothing for chat.js to
   inject a duplicate into.
   ═══════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window.__apaPartnerNav) return;
  window.__apaPartnerNav = true;

  var doc = document;
  var path = (location.pathname || '').replace(/\.html$/, '').replace(/^\//, '');

  var I = {
    listings: '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
    bookings: '<path d="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"/>',
    match: '<path d="M12 21s-7-4.4-9.3-9A5.4 5.4 0 0 1 12 6a5.4 5.4 0 0 1 9.3 6c-2.3 4.6-9.3 9-9.3 9z"/>',
    msg: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
    more: '<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>',
    earnings: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
    calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
    analytics: '<path d="M3 3v18h18"/><path d="M18 9l-5 5-4-4-4 4"/>',
    reviews: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
    agents: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
    add: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
    gift: '<path d="M20 12v10H4V12M2 7h20v5H2zM12 22V7M12 7H7.5a2.5 2.5 0 1 1 0-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 1 0 0-5C13 2 12 7 12 7z"/>',
    out: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>'
  };
  function svg(k) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + I[k] + '</svg>';
  }

  /* Which slot is this page? Sub-pages of a listing (menu, rooms, orders)
     belong to Listings; anything that is not a main slot belongs to More. */
  function slot() {
    if (/partner-(listings|menu|rooms|orders)$/.test(path)) return 'listings';
    if (/partner-bookings$/.test(path)) return 'bookings';
    if (/partner-cabana$/.test(path)) return 'match';
    return 'more';
  }

  var CSS = ''
    + '.pn-bar{display:none;position:fixed;left:0;right:0;bottom:0;z-index:300;'
    +   'padding:6px 8px calc(6px + env(safe-area-inset-bottom,0px));'
    +   'background:rgba(252,252,254,.94);-webkit-backdrop-filter:blur(22px) saturate(1.6);backdrop-filter:blur(22px) saturate(1.6);'
    +   'border-top:1px solid rgba(10,11,24,.08);box-shadow:0 -10px 30px -18px rgba(10,11,24,.25);'
    +   'font-family:Inter,system-ui,-apple-system,"Segoe UI",sans-serif}'
    + '@media(max-width:860px){.pn-bar{display:grid;grid-template-columns:repeat(5,1fr);gap:2px}'
    +   'body{padding-bottom:calc(76px + env(safe-area-inset-bottom,0px))!important}.mobile-nav{display:none!important}}'
    + '.pn-item{position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;'
    +   'min-height:54px;padding:6px 2px;border:0;background:none;border-radius:14px;color:#7b7e9a;text-decoration:none;'
    +   'font-family:inherit;font-weight:600;font-size:10.5px;line-height:1.1;letter-spacing:.01em;cursor:pointer;-webkit-tap-highlight-color:transparent;'
    +   'transition:color .18s,background .18s,transform .18s}'
    + '.pn-item svg{width:23px;height:23px;transition:transform .25s cubic-bezier(.34,1.4,.44,1)}'
    + '.pn-item:active{transform:scale(.94)}'
    + '.pn-item.on{color:#4361FF}.pn-item.on svg{transform:translateY(-1px) scale(1.06)}'
    + '.pn-item.on::after{content:"";position:absolute;top:2px;width:22px;height:3px;border-radius:3px;background:linear-gradient(90deg,#2DD4BF,#4361FF)}'
    + '.pn-item:focus-visible{outline:2px solid #4361FF;outline-offset:-2px}'
    /* Match is the headline slot: a raised gradient disc, not another icon. */
    + '.pn-match .pn-disc{width:46px;height:46px;margin-top:-20px;border-radius:50%;display:grid;place-items:center;color:#fff;'
    +   'background:linear-gradient(135deg,#C77DFF,#4361FF 60%,#2DD4BF);box-shadow:0 10px 22px -8px rgba(99,60,255,.7),0 0 0 4px rgba(252,252,254,.96)}'
    + '.pn-match .pn-disc svg{width:22px;height:22px}'
    + '.pn-match.on{color:#6D28FF}.pn-match.on::after{display:none}'
    + '.pn-item .cbx-nav-badge{position:absolute;top:3px;left:calc(50% + 6px);right:auto;margin:0}'

    + '.pn-scrim{position:fixed;inset:0;z-index:2300;background:rgba(9,10,20,.5);-webkit-backdrop-filter:blur(3px);backdrop-filter:blur(3px);opacity:0;pointer-events:none;transition:opacity .24s}'
    + '.pn-scrim.on{opacity:1;pointer-events:auto}'
    + '.pn-sheet{position:fixed;z-index:2301;left:0;right:0;bottom:0;max-height:88vh;overflow:auto;background:#fff;color:#0A0B18;'
    +   'border-radius:26px 26px 0 0;padding:10px 16px calc(18px + env(safe-area-inset-bottom,0px));box-shadow:0 -24px 80px rgba(9,10,20,.28);'
    +   'transform:translateY(105%);transition:transform .34s cubic-bezier(.22,1,.36,1);font-family:Inter,system-ui,sans-serif;overscroll-behavior:contain}'
    + '.pn-sheet.on{transform:none}'
    + '@media(min-width:861px){.pn-sheet{display:none}}'
    + '.pn-grip{width:38px;height:4px;border-radius:4px;background:rgba(10,11,24,.16);margin:0 auto 14px}'
    + '.pn-h{font:800 17px/1.2 Manrope,Inter,sans-serif;letter-spacing:-.02em;margin:0 4px 12px}'
    + '.pn-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}'
    + '.pn-tile{display:flex;flex-direction:column;align-items:center;gap:8px;padding:16px 6px 13px;border-radius:18px;border:1px solid rgba(10,11,24,.08);'
    +   'background:#F6F7FC;color:#14152E;text-decoration:none;font:700 12px/1.2 Inter,sans-serif;text-align:center;cursor:pointer;transition:transform .16s,background .16s}'
    + '.pn-tile:active{transform:scale(.96)}'
    + '.pn-tile i{width:40px;height:40px;border-radius:13px;display:grid;place-items:center;color:#fff;background:linear-gradient(135deg,#2DD4BF,#4361FF)}'
    + '.pn-tile i svg{width:19px;height:19px}'
    + '.pn-sec{font:800 10px/1 Inter,sans-serif;letter-spacing:.12em;text-transform:uppercase;color:#8E90AD;margin:18px 4px 8px}'
    + '.pn-roles .apa-rm-i{font-size:14px;padding:12px 10px}'
    + '.pn-out{display:flex;align-items:center;gap:12px;width:100%;margin-top:6px;padding:13px 10px;border:0;border-radius:14px;background:none;color:#E11D48;font:700 14px Inter,sans-serif;cursor:pointer;text-align:left}'
    + '.pn-out svg{width:20px;height:20px}'
    + '@media(prefers-reduced-motion:reduce){.pn-sheet,.pn-scrim,.pn-item svg{transition:none}}';

  function item(href, key, label, extra) {
    var on = slot() === key ? ' on' : '';
    return '<a class="pn-item' + (key === 'match' ? ' pn-match' : '') + on + '" href="' + href + '"' + (extra || '')
      + (on ? ' aria-current="page"' : '') + '>'
      + (key === 'match' ? '<span class="pn-disc">' + svg('match') + '</span>' : svg(key === 'messages' ? 'msg' : key))
      + '<span>' + label + '</span></a>';
  }

  function build() {
    var old = doc.querySelector('nav.mobile-nav');
    if (old) old.remove();

    var st = doc.createElement('style');
    st.textContent = CSS;
    doc.head.appendChild(st);

    var bar = doc.createElement('nav');
    bar.className = 'pn-bar';
    bar.setAttribute('aria-label', 'Partner Hub');
    bar.innerHTML =
        item('partner-listings.html', 'listings', 'Listings')
      + item('partner-bookings.html', 'bookings', 'Bookings')
      + item('partner-cabana.html', 'match', 'Match')
      + '<a class="pn-item" href="#messages" data-cbx-nav aria-label="Messages">' + svg('msg')
      +   '<span>Messages</span><span class="cbx-nav-badge"></span></a>'
      + '<button type="button" class="pn-item' + (slot() === 'more' ? ' on' : '') + '" data-pn-more aria-haspopup="dialog">' + svg('more') + '<span>More</span></button>';
    doc.body.appendChild(bar);

    var scrim = doc.createElement('div');
    scrim.className = 'pn-scrim';
    var sheet = doc.createElement('div');
    sheet.className = 'pn-sheet';
    sheet.setAttribute('role', 'dialog');
    sheet.setAttribute('aria-modal', 'true');
    sheet.setAttribute('aria-label', 'More');
    function tile(href, k, label) { return '<a class="pn-tile" href="' + href + '"><i>' + svg(k) + '</i>' + label + '</a>'; }
    sheet.innerHTML =
        '<div class="pn-grip"></div><h2 class="pn-h">Your Partner Hub</h2>'
      + '<div class="pn-grid">'
      +   tile('add-listing.html?from=dashboard', 'add', 'Add listing')
      +   tile('partner-earnings.html', 'earnings', 'Earnings')
      +   tile('partner-calendar.html', 'calendar', 'Calendar')
      +   tile('partner-analytics.html', 'analytics', 'Analytics')
      +   tile('partner-reviews.html', 'reviews', 'Reviews')
      +   tile('partner-agents.html', 'agents', 'My agents')
      +   tile('rewards.html', 'gift', 'Rewards')
      +   tile('partner-settings.html', 'settings', 'Settings')
      + '</div>'
      + '<div class="pn-sec">Switch side</div><div class="pn-roles" data-apa-roles="menu"></div>'
      + '<button class="pn-out" type="button" data-pn-out>' + svg('out') + 'Sign out</button>';
    doc.body.appendChild(scrim);
    doc.body.appendChild(sheet);

    function close() { scrim.classList.remove('on'); sheet.classList.remove('on'); doc.documentElement.style.overflow = ''; }
    function open() {
      scrim.classList.add('on'); sheet.classList.add('on'); doc.documentElement.style.overflow = 'hidden';
      var roles = sheet.querySelector('[data-apa-roles]');
      if (window.ApaRoles && roles && !roles.__done) { roles.__done = 1; try { ApaRoles.mount(roles, { as: 'menu' }); } catch (e) {} }
    }
    bar.querySelector('[data-pn-more]').addEventListener('click', open);
    scrim.addEventListener('click', close);
    doc.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
    sheet.addEventListener('click', function (e) {
      if (e.target.closest && e.target.closest('[data-role]')) close();
    });
    sheet.querySelector('[data-pn-out]').addEventListener('click', function () {
      if (window.ApaSession && ApaSession.signOut) return ApaSession.signOut();
      if (typeof signOut === 'function') return signOut();
      location.href = 'index.html';
    });

    /* The sidebar: Cabana Match belongs there too. */
    var side = doc.querySelector('.sidebar');
    if (side && !side.querySelector('a[href="partner-cabana.html"]')) {
      var ref = side.querySelector('a[href="partner-bookings.html"]');
      if (ref) {
        var a = doc.createElement('a');
        a.className = ref.className.replace(/\bactive\b/, '').trim();
        a.href = 'partner-cabana.html';
        a.innerHTML = svg('match') + 'Cabana Match';
        ref.after(a);
      }
    }
    if (side && !side.querySelector('[data-cbx-nav]')) {
      var ref2 = side.querySelector('a[href="partner-cabana.html"]') || side.querySelector('a[href="partner-bookings.html"]');
      if (ref2) {
        var m = doc.createElement('a');
        m.className = ref2.className.replace(/\bactive\b/, '').trim();
        m.href = '#messages'; m.setAttribute('data-cbx-nav', '');
        m.innerHTML = svg('msg') + 'Messages<span class="cbx-nav-badge"></span>';
        ref2.after(m);
      }
    }
  }

  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', build);
  else build();
})();
