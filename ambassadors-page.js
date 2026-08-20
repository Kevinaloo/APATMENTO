/* ═══════════════════════════════════════════════════════════════════════════
   CABANA · AMBASSADOR GATEWAY  (ambassadors.html)
   ─────────────────────────────────────────────────────────────────────────
   One panel, six states. The states are the whole design:

     signed out            → sign in
     email unconfirmed     → resend, then come back
     not on the roster     → say so kindly, and say what to check
     suspended             → say so, with the reason
     authorised, new       → enrol
     authorised, enrolled  → straight through to the dashboard

   The verdict always comes from the server, on every load, and is never
   cached. Access can be revoked between two page loads, and a cached "yes"
   is the one answer that must not survive a revocation.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
'use strict';

var A = window.ApaAmbassador;
if (!A) return;

var esc  = A.fmt.esc;
var UI   = A.ui;
var panel = document.getElementById('panel');

/* ── Theme toggle ─────────────────────────────────────────────────────── */
var SUN  = '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M6.3 17.7l-1.4 1.4M19.1 4.9l-1.4 1.4"/>';
var MOON = '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>';
var AUTO = '<circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 0 0 18z" fill="currentColor" stroke="none"/>';

function paintTheme() {
  var icon = document.getElementById('theme-icon');
  if (!icon) return;
  var m = A.theme.get();
  icon.innerHTML = m === 'dark' ? MOON : m === 'light' ? SUN : AUTO;
  var btn = document.getElementById('theme');
  if (btn) btn.setAttribute('title', 'Theme: ' + m + ' — click to change');
}
var themeBtn = document.getElementById('theme');
if (themeBtn) themeBtn.addEventListener('click', function () { A.theme.cycle(); paintTheme(); });
paintTheme();

/* ── Panel renderers ──────────────────────────────────────────────────── */
function icon(kind, path) {
  return '<div class="panel-icon pi-' + kind + '">' +
         '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">' +
         path + '</svg></div>';
}
var I_LOCK = '<rect x="4" y="10" width="16" height="11" rx="2.5"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>';
var I_MAIL = '<rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="m3.5 7 8.5 6 8.5-6"/>';
var I_STOP = '<circle cx="12" cy="12" r="9"/><path d="M8.5 8.5l7 7"/>';
var I_OK   = '<path d="M20 6 9 17l-5-5"/>';

function whoBlock(email) {
  if (!email) return '';
  return '<div class="who">' +
    '<div class="av av-sm">' + esc(A.fmt.initials(email)) + '</div>' +
    '<span class="who-email">' + esc(email) + '</span></div>';
}

function render(html) {
  panel.innerHTML = html;
  panel.classList.add('in');
}

/* Signed out. The `next` param brings them back here after auth rather than
   dropping them on the homepage to find their own way. */
function stateSignedOut() {
  render(
    icon('lock', I_LOCK) +
    '<h2 class="h2">This is a private door.</h2>' +
    '<p class="body" style="margin:9px 0 20px">Sign in with the email address your invitation was sent to. ' +
    'Access is tied to that exact address.</p>' +
    '<a class="btn btn-primary btn-block" href="/auth.html?next=ambassadors.html">Sign in to continue</a>' +
    '<p class="small center" style="margin-top:14px">Not invited yet? ' +
    '<a href="mailto:connect@cabana.africa?subject=Ambassador%20programme" style="color:var(--violet);font-weight:600;text-decoration:none">Ask about the programme</a></p>'
  );
}

/* On the roster, but the address is unproven. Without this check, knowing an
   ambassador's email would be the same as being one. */
function stateUnconfirmed(v) {
  render(
    icon('mail', I_MAIL) +
    '<h2 class="h2">Confirm your email first.</h2>' +
    whoBlock(v.email) +
    '<p class="body" style="margin-bottom:20px">We sent a confirmation link when you signed up. ' +
    'Open it, then come back here. Ambassador access is tied to a confirmed address — ' +
    'it is what stops anyone who knows your email from signing in as you.</p>' +
    '<button class="btn btn-primary btn-block" id="resend" type="button">Resend the confirmation link</button>'
  );
  var b = document.getElementById('resend');
  if (b) b.addEventListener('click', function () { resend(b, v.email); });
}

function resend(btn, email) {
  UI.busy(btn, true);
  var c = window.ApaSession && window.ApaSession.client();
  if (!c || !c.auth || !c.auth.resend) {
    UI.busy(btn, false);
    UI.toast('Could not resend just now. Try signing in again.', 'err');
    return;
  }
  c.auth.resend({ type: 'signup', email: email })
    .then(function (r) {
      UI.busy(btn, false);
      if (r && r.error) UI.toast(r.error.message || 'Could not resend.', 'err');
      else UI.toast('Sent. Check your inbox, and your spam folder.', 'ok');
    })
    .catch(function () {
      UI.busy(btn, false);
      UI.toast('Could not resend just now.', 'err');
    });
}

/* Not on the roster. Deliberately warm, and specific about the one thing
   that is most often actually wrong: signed in with the wrong address. */
function stateNotAuthorised(v) {
  render(
    icon('lock', I_LOCK) +
    '<h2 class="h2">This area is for ambassadors.</h2>' +
    whoBlock(v.email) +
    '<p class="body" style="margin-bottom:20px">This address is not on the roster. If you have been ' +
    'invited, check you are signed in with the <strong>exact</strong> address the invitation went to — ' +
    'a different one will not match, even if it is also yours.</p>' +
    '<div class="row" style="gap:10px">' +
    '<a class="btn btn-primary" href="/auth.html?next=ambassadors.html">Sign in as someone else</a>' +
    '<a class="btn btn-ghost" href="mailto:connect@cabana.africa?subject=Ambassador%20programme">Ask about joining</a>' +
    '</div>'
  );
}

function stateSuspended(v) {
  render(
    icon('stop', I_STOP) +
    '<h2 class="h2">Your access is paused.</h2>' +
    whoBlock(v.email) +
    '<p class="body" style="margin-bottom:8px">' + esc(v.detail || 'Your ambassador account is under review.') + '</p>' +
    '<p class="small" style="margin-bottom:20px">Nothing you have earned has been removed. ' +
    'Leads and commission already recorded stay exactly as they are.</p>' +
    '<a class="btn btn-ghost btn-block" href="mailto:connect@cabana.africa?subject=Ambassador%20access">Get in touch</a>'
  );
}

/* Through the gate, first time. Ask only for what the dashboard genuinely
   needs; anything else can be filled in later from settings. */
function stateEnrol(v) {
  render(
    icon('ok', I_OK) +
    '<span class="badge b-ok">You are on the roster</span>' +
    '<h2 class="h2" style="margin:12px 0 6px">Welcome. Let us set you up.</h2>' +
    '<p class="body" style="margin-bottom:18px">Two details and your ambassador link is live.</p>' +
    '<form id="enrol-form" class="stack" style="gap:15px">' +
      '<div class="field">' +
        '<label class="label" for="e-name">Your full name</label>' +
        '<input class="input" id="e-name" type="text" required maxlength="120" ' +
        'value="' + esc(v.full_name || '') + '" placeholder="Amara Otieno"/>' +
        '<span class="hint">Hosts will see this when you reach out to them.</span>' +
      '</div>' +
      '<div class="grid g2" style="gap:14px">' +
        '<div class="field">' +
          '<label class="label" for="e-phone">Phone <span class="muted">(optional)</span></label>' +
          '<input class="input" id="e-phone" type="tel" maxlength="32" placeholder="0712 345 678"/>' +
        '</div>' +
        '<div class="field">' +
          '<label class="label" for="e-region">Where you work</label>' +
          '<input class="input" id="e-region" type="text" maxlength="80" ' +
          'value="' + esc(v.region || '') + '" placeholder="Nairobi"/>' +
        '</div>' +
      '</div>' +
      '<button class="btn btn-primary btn-block" type="submit" id="e-submit" style="margin-top:4px">' +
        'Activate my ambassador account</button>' +
    '</form>'
  );

  var form = document.getElementById('enrol-form');
  form.addEventListener('submit', function (ev) {
    ev.preventDefault();
    var btn = document.getElementById('e-submit');
    UI.busy(btn, true);
    A.api.enrol({
      full_name: document.getElementById('e-name').value,
      phone:     document.getElementById('e-phone').value,
      region:    document.getElementById('e-region').value,
    }).then(function (r) {
      UI.busy(btn, false);
      if (!r || !r.ok) {
        UI.toast((r && (r.message || r.error)) || 'Could not activate.', 'err');
        return;
      }
      UI.toast('You are in. Taking you to your dashboard…', 'ok');
      setTimeout(function () { location.href = '/ambassador-dashboard.html'; }, 700);
    });
  });
}

/* ── Admin ────────────────────────────────────────────────────────────
   Roster management lives in the admin console, next to every other
   operator control. This page only says so — keeping a second copy of
   invite/revoke here would be two implementations of the decision about
   who gets paid, and they would drift. */
function showAdminPointer() {
  var el = document.getElementById('admin-wrap');
  if (el) el.removeAttribute('hidden');
}

/* ── Boot ─────────────────────────────────────────────────────────────── */
var ADMINS = ['apatmento@gmail.com', 'worlddossy@gmail.com'];

A.session().then(function (s) {
  var signedIn = s && s.status === 'user';
  var email = signedIn && s.user ? String(s.user.email || '').toLowerCase() : '';

  /* Admins are allowed onto this page by the guard so they can check the
     gateway actually works. The roster itself is managed in the console. */
  if (email && ADMINS.indexOf(email) !== -1) showAdminPointer();

  if (!signedIn) { UI.boot(true); stateSignedOut(); UI.reveals(); return; }

  return A.api.gate().then(function (v) {
    UI.boot(true);
    v = v || {};

    if (v.ok && v.enrolled) { location.replace('/ambassador-dashboard.html'); return; }
    if (v.ok)                          stateEnrol(v);
    else if (v.reason === 'email_unconfirmed') stateUnconfirmed(v);
    else if (v.reason === 'suspended')         stateSuspended(v);
    else if (v.reason === 'not_signed_in')     stateSignedOut();
    else                                       stateNotAuthorised(v);

    UI.reveals();
  });
}).catch(function (e) {
  UI.boot(true);
  render('<h2 class="h2">Something went wrong.</h2>' +
         '<p class="body" style="margin:9px 0 18px">We could not check your access just now. ' +
         'Reload the page, and if it keeps happening let us know.</p>' +
         '<button class="btn btn-primary" onclick="location.reload()" type="button">Reload</button>');
  if (window.console) console.warn('[gateway]', e && e.message);
});

})();
