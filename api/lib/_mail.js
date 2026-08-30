/* ══════════════════════════════════════════════════════════════════════
   CABANA · MAIL
   api/lib/_mail.js

   The whole outbound email surface: one design system, two senders, and
   a log that makes a send idempotent.

   WHY IT LOOKS LIKE THIS
   ──────────────────────
   Email is the one place where the modern web does not apply. Outlook
   renders with Word. Gmail strips what it dislikes. So the layout is
   tables, the widths are attributes, and the colour is inline. On top of
   that floor we add the things that DO land where they are supported and
   vanish silently where they are not: a shimmer across the header, cards
   that rise on load, buttons that lift under the cursor, and a full dark
   palette under prefers-color-scheme. A client that ignores every one of
   them still receives a correct, legible, branded email.

   TWO SENDERS, ON PURPOSE
   ───────────────────────
     connect@cabana.africa      guests. Sign-in, receipts, support,
                                notifications, offers.
     partnership@cabana.africa  hosts, operators, providers. Onboarding,
                                payouts, performance, partnership news.

   A host who books a stay is a guest in that moment and hears from
   connect@; the same person hearing about their listing hears from
   partnership@. The address follows the subject, never the person.

   CONSENT AND IDEMPOTENCY
   ───────────────────────
   Every send declares a `category`. Transactional mail always goes.
   'product' and 'promotions' are checked against email_preferences and
   skipped silently when withdrawn, with the skip logged so nobody has to
   guess later why an offer did not arrive.

   Every send may declare a `dedupeKey`. email_log holds a unique index
   on it, so a retried lambda, a double-fired webhook and a user who
   refreshes checkout twice all produce exactly one email.
   ══════════════════════════════════════════════════════════════════════ */

import { BRAND, LOGO, MAIL, SITE, CONTACT, TAGLINE, PROMISE, money, prettyDate } from './_brand.js';

const RESEND_KEY = process.env.RESEND_API_KEY;
const SUPA_URL   = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const B = BRAND;

/* ══════════════════════════════════════════════════════════════════════
   ESCAPING
   Every value that reaches a template goes through this. A guest whose
   display name contains a '<' must not be able to close our markup.
══════════════════════════════════════════════════════════════════════ */
export function esc(v) {
  return String(v == null ? '' : v)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/* A URL we are willing to put behind a button. Anything that is not
   http(s) or a site-relative path becomes the home page rather than a
   javascript: handler wearing a Cabana button. */
function safeUrl(u) {
  const s = String(u || '').trim();
  if (/^https?:\/\//i.test(s)) return esc(s);
  if (s.startsWith('/')) return esc(SITE + s);
  return esc(SITE);
}

const firstName = (name, email) =>
  String(name || '').trim().split(/\s+/)[0]
  || String(email || '').split('@')[0]
  || 'there';

/* ══════════════════════════════════════════════════════════════════════
   THE DESIGN SYSTEM
══════════════════════════════════════════════════════════════════════ */

/* Motion and dark mode live in one <style> block. Both are progressive:
   strip the block entirely and the email is still correct, just still. */
const HEAD_STYLE = `
  :root { color-scheme: light dark; supported-color-schemes: light dark; }
  body, table, td, a { -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%; }
  table, td { mso-table-lspace:0pt; mso-table-rspace:0pt; }
  img { -ms-interpolation-mode:bicubic; border:0; outline:none; text-decoration:none; }
  a { text-decoration:none; }

  /* ── Entrance. Cards arrive a beat after the header, in order. ── */
  @keyframes cbnRise {
    from { opacity:0; transform:translateY(14px); }
    to   { opacity:1; transform:translateY(0); }
  }
  @keyframes cbnSheen {
    0%   { transform:translateX(-120%); }
    55%  { transform:translateX(220%); }
    100% { transform:translateX(220%); }
  }
  @keyframes cbnGlow {
    0%,100% { box-shadow:0 10px 30px rgba(109,40,255,.22); }
    50%     { box-shadow:0 14px 44px rgba(109,40,255,.38); }
  }
  @media (prefers-reduced-motion: no-preference) {
    .cbn-rise  { animation: cbnRise .62s cubic-bezier(.22,1,.36,1) both; }
    .cbn-d1 { animation-delay:.06s } .cbn-d2 { animation-delay:.14s }
    .cbn-d3 { animation-delay:.22s } .cbn-d4 { animation-delay:.30s }
    .cbn-sheen { animation: cbnSheen 3.4s ease-in-out 1.1s infinite; }
    .cbn-cta   { animation: cbnGlow 3.6s ease-in-out infinite; }
  }

  /* ── Pointer affordance where a client honours :hover. ── */
  .cbn-btn { transition: transform .22s cubic-bezier(.34,1.4,.44,1), box-shadow .22s ease, filter .22s ease; }
  .cbn-btn:hover { transform: translateY(-2px) scale(1.015); filter: brightness(1.06); }
  .cbn-row { transition: background .2s ease; }
  .cbn-row:hover { background: rgba(109,40,255,.045) !important; }
  .cbn-link:hover { color:${B.violet} !important; }

  /* ── Dark mode. Tokens only; structure is untouched. ── */
  @media (prefers-color-scheme: dark) {
    .cbn-bg    { background:#08080F !important; }
    .cbn-card  { background:#14152B !important; border-color:rgba(255,255,255,.09) !important; }
    .cbn-ink   { color:#F4F4FB !important; }
    .cbn-soft  { color:#A9ACC8 !important; }
    .cbn-faint { color:#787B9B !important; }
    .cbn-hair  { border-color:rgba(255,255,255,.09) !important; }
    .cbn-quiet { background:#0F1022 !important; }
  }

  /* ── Small screens. ── */
  @media only screen and (max-width:620px) {
    .cbn-pad   { padding-left:20px !important; padding-right:20px !important; }
    .cbn-h1    { font-size:25px !important; line-height:1.22 !important; }
    .cbn-stack { display:block !important; width:100% !important; }
    .cbn-btn   { display:block !important; width:100% !important; box-sizing:border-box; }
  }
`;

/* The invisible first line of the email, which is what a phone shows in
   the list under the subject. Left to chance it shows raw markup. */
const preheader = (text) => `
  <div style="display:none;font-size:1px;color:#FCFCFE;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">${esc(text)}</div>
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>`;

/* ── Header. Gradient, real logo, a sheen that crosses it once in a
   while. The <img> carries alt text because a third of inboxes will
   never load it. ── */
function header({ eyebrow, title, subtitle, gradient = B.gradEquator, emoji = '' }) {
  return `
  <tr><td style="padding:0 0 22px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
           style="background:${gradient};background-color:${B.violet};border-radius:26px;overflow:hidden;">
      <tr><td class="cbn-pad" style="padding:34px 34px 30px;position:relative;">

        <div style="position:absolute;top:0;bottom:0;left:0;width:34%;pointer-events:none;
                    background:linear-gradient(100deg,rgba(255,255,255,0) 0%,rgba(255,255,255,.30) 50%,rgba(255,255,255,0) 100%);"
             class="cbn-sheen"></div>

        <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
          <td style="padding-bottom:20px;">
            <img src="${LOGO.wordmarkWhite}" width="132" alt="Cabana"
                 style="display:block;width:132px;max-width:132px;height:auto;">
          </td>
        </tr></table>

        ${eyebrow ? `<div style="font:700 11px/1 -apple-system,BlinkMacSystemFont,'Segoe UI',Inter,sans-serif;
             letter-spacing:.18em;text-transform:uppercase;color:rgba(255,255,255,.78);margin:0 0 12px;">${esc(eyebrow)}</div>` : ''}

        ${emoji ? `<div style="font-size:34px;line-height:1;margin:0 0 12px;">${emoji}</div>` : ''}

        <h1 class="cbn-h1" style="margin:0;font:800 30px/1.16 -apple-system,BlinkMacSystemFont,'Segoe UI',Inter,sans-serif;
            color:#FFFFFF;letter-spacing:-.7px;">${esc(title)}</h1>

        ${subtitle ? `<p style="margin:12px 0 0;font:400 15px/1.6 -apple-system,BlinkMacSystemFont,'Segoe UI',Inter,sans-serif;
             color:rgba(255,255,255,.88);max-width:440px;">${esc(subtitle)}</p>` : ''}
      </td></tr>
    </table>
  </td></tr>`;
}

/* ── Card. The unit everything else sits in. ── */
function card(inner, { delay = 1, quiet = false } = {}) {
  return `
  <tr><td style="padding:0 0 16px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
           class="cbn-card cbn-rise cbn-d${delay}"
           style="background:${quiet ? B.paper2 : '#FFFFFF'};border:1px solid ${B.line};border-radius:22px;">
      <tr><td class="cbn-pad" style="padding:26px 28px;">${inner}</td></tr>
    </table>
  </td></tr>`;
}

const h2 = (t) => `<h2 class="cbn-ink" style="margin:0 0 14px;font:700 17px/1.35 -apple-system,BlinkMacSystemFont,'Segoe UI',Inter,sans-serif;color:${B.ink};letter-spacing:-.3px;">${esc(t)}</h2>`;

const p = (t, { small = false, center = false } = {}) =>
  `<p class="cbn-soft" style="margin:0 0 14px;font:400 ${small ? '13px/1.65' : '15px/1.68'} -apple-system,BlinkMacSystemFont,'Segoe UI',Inter,sans-serif;color:${B.inkSoft};${center ? 'text-align:center;' : ''}">${t}</p>`;

/* Buttons are anchors wrapped in a table so Outlook gives them a box.
   The gradient is a background-image with a solid background-color under
   it, because Word renders the colour and ignores the image. */
function button(href, label, { gradient = B.gradDusk, solid = B.violet, glow = true } = {}) {
  return `
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:22px 0 6px;"><tr>
    <td align="center" bgcolor="${solid}" style="border-radius:100px;background:${gradient};background-color:${solid};">
      <a class="cbn-btn${glow ? ' cbn-cta' : ''}" href="${safeUrl(href)}"
         style="display:inline-block;padding:15px 34px;border-radius:100px;color:#FFFFFF;
                font:700 15px/1 -apple-system,BlinkMacSystemFont,'Segoe UI',Inter,sans-serif;
                letter-spacing:-.1px;">${esc(label)} &nbsp;&rarr;</a>
    </td>
  </tr></table>`;
}

function ghostButton(href, label) {
  return `
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:10px 0 0;"><tr>
    <td align="center" style="border-radius:100px;border:1.5px solid ${B.line};">
      <a class="cbn-btn cbn-link" href="${safeUrl(href)}"
         style="display:inline-block;padding:13px 28px;border-radius:100px;color:${B.ink2};
                font:700 14px/1 -apple-system,BlinkMacSystemFont,'Segoe UI',Inter,sans-serif;">${esc(label)}</a>
    </td>
  </tr></table>`;
}

/* A label/value ledger. The shape a receipt wants. */
function rows(pairs) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
    ${pairs.filter(Boolean).map(([k, v, strong], i) => `
    <tr class="cbn-row">
      <td class="cbn-hair" style="padding:11px 0;border-top:${i === 0 ? '0' : `1px solid ${B.line}`};
          font:500 14px/1.5 -apple-system,BlinkMacSystemFont,'Segoe UI',Inter,sans-serif;color:${B.inkFaint};">${esc(k)}</td>
      <td class="cbn-hair cbn-ink" align="right" style="padding:11px 0;border-top:${i === 0 ? '0' : `1px solid ${B.line}`};
          font:${strong ? '800 16px' : '600 14px'}/1.5 -apple-system,BlinkMacSystemFont,'Segoe UI',Inter,sans-serif;
          color:${strong ? B.ink : B.ink2};">${esc(v)}</td>
    </tr>`).join('')}
  </table>`;
}

/* Icon + copy, stacked. Used wherever we are explaining rather than
   reporting. Emoji instead of images so nothing depends on image load. */
function features(items) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
    ${items.map(([icon, title, body]) => `
    <tr><td style="padding:9px 0;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
        <td width="42" valign="top" style="width:42px;">
          <div style="width:34px;height:34px;border-radius:11px;background:${B.paper2};
                      text-align:center;line-height:34px;font-size:17px;">${icon}</div>
        </td>
        <td valign="top" style="padding-left:12px;">
          <div class="cbn-ink" style="font:700 14.5px/1.4 -apple-system,BlinkMacSystemFont,'Segoe UI',Inter,sans-serif;color:${B.ink};">${esc(title)}</div>
          <div class="cbn-soft" style="font:400 13.5px/1.6 -apple-system,BlinkMacSystemFont,'Segoe UI',Inter,sans-serif;color:${B.inkSoft};margin-top:2px;">${esc(body)}</div>
        </td>
      </tr></table>
    </td></tr>`).join('')}
  </table>`;
}

/* A quoted message — what a guest wrote, what an agent replied. */
function quote(body, who) {
  return `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
         class="cbn-quiet" style="background:${B.paper2};border-radius:16px;">
    <tr><td style="padding:18px 20px;border-left:3px solid ${B.violet};border-radius:16px;">
      ${who ? `<div class="cbn-faint" style="font:700 11px/1 -apple-system,BlinkMacSystemFont,'Segoe UI',Inter,sans-serif;letter-spacing:.13em;text-transform:uppercase;color:${B.inkFaint};margin-bottom:9px;">${esc(who)}</div>` : ''}
      <div class="cbn-ink" style="font:400 14.5px/1.68 -apple-system,BlinkMacSystemFont,'Segoe UI',Inter,sans-serif;color:${B.ink2};white-space:pre-wrap;">${esc(body)}</div>
    </td></tr>
  </table>`;
}

/* A single large number. Points balance, payout, nights. */
function statTile(value, label, { gradient = B.gradReef, solid = B.electric } = {}) {
  return `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
         style="border-radius:18px;background:${gradient};background-color:${solid};">
    <tr><td align="center" style="padding:24px 18px;">
      <div style="font:800 34px/1 -apple-system,BlinkMacSystemFont,'Segoe UI',Inter,sans-serif;color:#FFFFFF;letter-spacing:-1px;">${esc(value)}</div>
      <div style="font:600 12px/1 -apple-system,BlinkMacSystemFont,'Segoe UI',Inter,sans-serif;letter-spacing:.14em;text-transform:uppercase;color:rgba(255,255,255,.82);margin-top:9px;">${esc(label)}</div>
    </td></tr>
  </table>`;
}

/* ── Footer. Contact lines here are the only ones in the product, so
   they are the ones that must not mention a phone or WhatsApp. ── */
function footer({ audience = 'guest', unsubscribeUrl = null, reason = '' } = {}) {
  const inbox = audience === 'partner' ? CONTACT.partnership : CONTACT.support;
  return `
  <tr><td style="padding:14px 4px 0;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr><td class="cbn-hair" style="border-top:1px solid ${B.line};padding-top:22px;" align="center">

        <img src="${LOGO.mark}" width="34" alt=""
             style="display:block;width:34px;height:34px;margin:0 auto 12px;border-radius:9px;">

        <div class="cbn-ink" style="font:800 13px/1 -apple-system,BlinkMacSystemFont,'Segoe UI',Inter,sans-serif;color:${B.ink};letter-spacing:-.2px;">Cabana</div>
        <div class="cbn-faint" style="font:500 12px/1.6 -apple-system,BlinkMacSystemFont,'Segoe UI',Inter,sans-serif;color:${B.inkFaint};margin-top:5px;">${esc(TAGLINE)} &nbsp;·&nbsp; ${esc(PROMISE)}</div>

        <div style="margin:16px 0 0;font:500 12.5px/1.8 -apple-system,BlinkMacSystemFont,'Segoe UI',Inter,sans-serif;color:${B.inkFaint};">
          <a class="cbn-link" href="${safeUrl('/')}"  style="color:${B.electric};">cabana.africa</a>
          &nbsp;·&nbsp;
          <a class="cbn-link" href="mailto:${inbox}" style="color:${B.electric};">${inbox}</a>
        </div>

        <div class="cbn-faint" style="margin:14px 0 0;font:400 11.5px/1.7 -apple-system,BlinkMacSystemFont,'Segoe UI',Inter,sans-serif;color:${B.inkFaint};max-width:430px;">
          Need a person? Open Cabana and use the support chat &mdash; or call the team from inside the app. We answer there, with your booking already in front of us.
        </div>

        ${reason ? `<div class="cbn-faint" style="margin:12px 0 0;font:400 11px/1.6 -apple-system,BlinkMacSystemFont,'Segoe UI',Inter,sans-serif;color:${B.inkFaint};">${esc(reason)}</div>` : ''}

        ${unsubscribeUrl ? `<div style="margin:10px 0 0;font:400 11px/1.6 -apple-system,BlinkMacSystemFont,'Segoe UI',Inter,sans-serif;">
          <a class="cbn-link" href="${safeUrl(unsubscribeUrl)}" style="color:${B.inkFaint};text-decoration:underline;">Unsubscribe from these</a>
        </div>` : ''}

        <div style="height:22px;line-height:22px;">&nbsp;</div>
      </td></tr>
    </table>
  </td></tr>`;
}

/* ── Shell. Everything above, assembled. ── */
function shell({ title, preview, body, audience = 'guest', unsubscribeUrl = null, reason = '' }) {
  return `<!DOCTYPE html>
<html lang="en" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>${esc(title)}</title>
<!--[if mso]><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml><![endif]-->
<style>${HEAD_STYLE}</style>
</head>
<body class="cbn-bg" style="margin:0;padding:0;background:${B.paper2};">
${preheader(preview || '')}
<table role="presentation" class="cbn-bg" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${B.paper2};">
  <tr><td align="center" style="padding:28px 14px 34px;">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;">
      ${body}
      ${footer({ audience, unsubscribeUrl, reason })}
    </table>
  </td></tr>
</table>
</body></html>`;
}

/* ══════════════════════════════════════════════════════════════════════
   TEMPLATES
   Each returns { subject, html, preview, audience, category }.
   `category` decides which consent flag gates the send.
══════════════════════════════════════════════════════════════════════ */
export const TEMPLATES = {

  /* ── Guest · welcome ────────────────────────────────────────────── */
  welcome({ name, email }) {
    const who = firstName(name, email);
    return {
      audience: 'guest', category: 'transactional',
      subject: `Karibu ${who} — your Cabana account is live`,
      preview: 'Zero commission, everywhere in Africa. Here is where to start.',
      html: shell({
        title: 'Welcome to Cabana', preview: 'Zero commission, everywhere in Africa.',
        body: header({ eyebrow: 'Welcome aboard', title: `Karibu, ${who}.`,
          subtitle: 'One app for stays, safaris, rides, food and everything between — across Africa, at face value.' })
        + card(h2('Start here') + features([
            ['🏠', 'Stays that cost what they say', 'Fixed platform fee, never a percentage. Hosts keep 100%.'],
            ['🦁', 'Tours and safaris at zero fee', 'The operator’s fare is the whole price.'],
            ['✦',  'APA, in the app', 'Ask her anything. She books, checks and answers in seconds.'],
            ['🛡️', 'Money held until check-in', 'Your payment reaches the host after you are safely in.'],
          ]) + button('/apartments.html', 'Find your first stay'), { delay: 1 })
        + card(h2('One thing worth knowing')
            + p('Cabana has no phone line and no WhatsApp, and that is deliberate. Support lives inside the app, so whoever answers already has your booking, your payment and your history in front of them. Open the chat and you will see what we mean.')
            + ghostButton('/help.html', 'Open support'), { delay: 2, quiet: true }),
        audience: 'guest',
      }),
    };
  },

  /* ── Guest · sign-in from a new device ──────────────────────────── */
  signinAlert({ name, email, device, when, place }) {
    const who = firstName(name, email);
    return {
      audience: 'guest', category: 'transactional',
      subject: 'New sign-in to your Cabana account',
      preview: `${device || 'A new device'} signed in${place ? ` from ${place}` : ''}.`,
      html: shell({
        title: 'New sign-in', preview: 'A new device signed in to your account.',
        body: header({ eyebrow: 'Security', title: `Welcome back, ${who}.`,
          subtitle: 'A new sign-in just happened on your account. If it was you, nothing to do.',
          gradient: B.gradReef, emoji: '🔐' })
        + card(rows([
            ['Device', device || 'Unknown device'],
            ['When',   when ? prettyDate(when) : prettyDate(new Date())],
            place ? ['Where', place] : null,
            ['Account', email || ''],
          ])
          + p('Not you? Change your password now and we will end every other session on the account.', { small: true })
          + button('/profile.html', 'Review account security', { gradient: B.gradReef, solid: B.electric })),
        audience: 'guest',
      }),
    };
  },

  /* ── Guest · password reset ─────────────────────────────────────── */
  reset({ email, resetUrl, name }) {
    const who = firstName(name, email);
    return {
      audience: 'guest', category: 'transactional',
      subject: 'Reset your Cabana password',
      preview: 'The link is good for one hour.',
      html: shell({
        title: 'Reset your password', preview: 'The link is good for one hour.',
        body: header({ eyebrow: 'Account', title: 'Set a new password',
          subtitle: `Hi ${who} — tap below and pick a new one. The link works once, for an hour.`,
          gradient: B.gradReef, emoji: '🔑' })
        + card(button(resetUrl, 'Choose a new password', { gradient: B.gradReef, solid: B.electric })
          + p('If you did not ask for this you can ignore it. Your password stays as it is, and nobody can use this link without your inbox.', { small: true })),
        audience: 'guest',
      }),
    };
  },

  /* ── Guest · booking receipt ────────────────────────────────────── */
  bookingReceipt({ booking, listing, user }) {
    const who = firstName(user?.name || user?.first_name, user?.email);
    const paid = Number(booking?.amountPaid ?? booking?.amount_paid ?? booking?.total ?? 0);
    const total = Number(booking?.total ?? booking?.grand_total ?? paid);
    const due = Math.max(0, total - paid);
    return {
      audience: 'guest', category: 'transactional',
      subject: `Booking confirmed · ${listing?.name || listing?.title || 'your stay'}`,
      preview: `Ref ${booking?.reference || ''} — ${money(paid)} received.`,
      html: shell({
        title: 'Booking confirmed', preview: `Ref ${booking?.reference || ''}`,
        body: header({ eyebrow: 'Confirmed', title: `You’re booked, ${who}.`,
          subtitle: listing?.name || listing?.title || '', emoji: '✅' })
        + card(rows([
            ['Reference',  booking?.reference || '—'],
            booking?.checkIn  ? ['Check in',  prettyDate(booking.checkIn)]  : null,
            booking?.checkOut ? ['Check out', prettyDate(booking.checkOut)] : null,
            booking?.guests   ? ['Guests', String(booking.guests)] : null,
            ['Paid so far', money(paid), true],
            due > 0 ? ['Balance due', money(due)] : null,
          ])
          + (due > 0
              ? p(`Your dates are held. The check-in code is released once the balance of <strong>${money(due)}</strong> is paid — you can do that in instalments from My Bookings.`, { small: true })
              : p('Paid in full. Your check-in code is on the booking in My Bookings.', { small: true }))
          + button('/my-bookings.html', due > 0 ? 'Pay the balance' : 'View your check-in code'))
        + card(h2('If anything is off when you arrive')
            + p('Open the booking and tap “Can’t stay here”. We re-home you to a comparable place, cover the transport, and sort the money with the host. Do it from the app — the record is what gets you refunded.'), { delay: 2, quiet: true }),
        audience: 'guest',
      }),
    };
  },

  /* ── Guest · cancellation ───────────────────────────────────────── */
  bookingCancelled({ booking, listing, user, refund }) {
    const who = firstName(user?.name, user?.email);
    return {
      audience: 'guest', category: 'transactional',
      subject: `Cancelled · ${listing?.name || listing?.title || 'your booking'}`,
      preview: refund ? `${money(refund)} is on its way back.` : 'Your booking has been cancelled.',
      html: shell({
        title: 'Booking cancelled', preview: 'Your booking has been cancelled.',
        body: header({ eyebrow: 'Cancelled', title: 'That booking is cancelled',
          subtitle: `Sorry it did not work out, ${who}.`,
          gradient: 'linear-gradient(135deg,#8B8EAC,#474A66)', emoji: '↩️' })
        + card(rows([
            ['Reference', booking?.reference || '—'],
            ['Listing',   listing?.name || listing?.title || '—'],
            refund ? ['Refund', money(refund), true] : null,
          ])
          + (refund
             ? p('Refunds land back on your M-Pesa in 3 to 7 business days. The platform fee is not refundable.', { small: true })
             : p('Under this listing’s cancellation policy no refund is due. If you think that is wrong, open the support chat and we will look at it properly.', { small: true }))
          + button('/apartments.html', 'Find somewhere else', { gradient: B.gradReef, solid: B.electric })),
        audience: 'guest',
      }),
    };
  },

  /* ── Guest · a support conversation was opened ──────────────────── */
  supportOpened({ name, email, threadId, subject, firstMessage }) {
    const who = firstName(name, email);
    return {
      audience: 'guest', category: 'transactional',
      subject: `We have your message — Cabana support`,
      preview: 'A person on the team is picking this up.',
      html: shell({
        title: 'Cabana support', preview: 'A person is picking this up.',
        body: header({ eyebrow: 'Support', title: `We’re on it, ${who}.`,
          subtitle: 'Your conversation is open and someone on the team is reading it now.',
          gradient: B.gradReef, emoji: '💬' })
        + card((subject ? h2(subject) : '')
          + (firstMessage ? quote(firstMessage, 'What you told us') : '')
          + p('Reply right in the app — the whole conversation is there, including everything APA already worked out, so you never repeat yourself.', { small: true })
          + button(`/help.html?thread=${encodeURIComponent(threadId || '')}`, 'Open the conversation', { gradient: B.gradReef, solid: B.electric })),
        audience: 'guest',
      }),
    };
  },

  /* ── Guest · a human replied ────────────────────────────────────── */
  supportReply({ name, email, threadId, agentName, body }) {
    const who = firstName(name, email);
    return {
      audience: 'guest', category: 'transactional',
      subject: `${agentName || 'Cabana'} replied to you`,
      preview: String(body || '').slice(0, 110),
      html: shell({
        title: 'A reply from Cabana', preview: String(body || '').slice(0, 110),
        body: header({ eyebrow: 'Support', title: 'You have a reply',
          subtitle: `${agentName || 'The Cabana team'} answered your message, ${who}.`,
          gradient: B.gradReef, emoji: '📨' })
        + card(quote(body || '', agentName || 'Cabana support')
          + button(`/help.html?thread=${encodeURIComponent(threadId || '')}`, 'Reply in the app', { gradient: B.gradReef, solid: B.electric })
          + p('Replying in the app keeps everything in one thread — and lets you switch to a voice call with the same person if it is faster to just talk.', { small: true })),
        audience: 'guest',
      }),
    };
  },

  /* ── Guest · thread resolved, ask for a score ───────────────────── */
  supportResolved({ name, email, threadId, summary }) {
    const who = firstName(name, email);
    const link = (n) => `${SITE}/help.html?thread=${encodeURIComponent(threadId || '')}&csat=${n}`;
    const face = ['😞', '🙁', '😐', '🙂', '😄'];
    return {
      audience: 'guest', category: 'transactional',
      subject: 'Sorted — how did we do?',
      preview: 'One tap, and it helps more than you would think.',
      html: shell({
        title: 'Support resolved', preview: 'How did we do?',
        body: header({ eyebrow: 'Resolved', title: 'That one’s sorted',
          subtitle: `Thanks for your patience, ${who}.`, emoji: '✨' })
        + card((summary ? p(esc(summary)) : p('Your support conversation has been closed. Reopen it any time by replying in the app.'))
          + `<div style="text-align:center;margin:22px 0 4px;">
               <div class="cbn-faint" style="font:700 11px/1 -apple-system,BlinkMacSystemFont,'Segoe UI',Inter,sans-serif;letter-spacing:.15em;text-transform:uppercase;color:${B.inkFaint};margin-bottom:14px;">How did we do?</div>
               ${[1, 2, 3, 4, 5].map(n => `<a class="cbn-btn" href="${safeUrl(link(n))}" style="display:inline-block;width:46px;height:46px;line-height:46px;margin:0 4px;border-radius:14px;background:${B.paper2};font-size:22px;text-align:center;">${face[n - 1]}</a>`).join('')}
             </div>`),
        audience: 'guest',
      }),
    };
  },

  /* ── Guest · a call we could not connect ────────────────────────── */
  missedCall({ name, email, threadId, when }) {
    const who = firstName(name, email);
    return {
      audience: 'guest', category: 'transactional',
      subject: 'We tried to call you in the app',
      preview: 'Your conversation is still open — pick it up whenever.',
      html: shell({
        title: 'Missed call', preview: 'Your conversation is still open.',
        body: header({ eyebrow: 'Support', title: 'We missed you',
          subtitle: `We rang you inside Cabana${when ? ` at ${prettyDate(when)}` : ''} and did not catch you, ${who}.`,
          gradient: B.gradDusk, emoji: '📞' })
        + card(p('Nothing is lost. Open the conversation and either type or hit call — it is the same thread and the same person, with all the context already there.')
          + button(`/help.html?thread=${encodeURIComponent(threadId || '')}`, 'Pick it back up')),
        audience: 'guest',
      }),
    };
  },

  /* ── Guest · a generic in-app notification, mailed ──────────────── */
  notification({ name, email, title, body, url, label, emoji }) {
    const who = firstName(name, email);
    return {
      audience: 'guest', category: 'product',
      subject: title || 'An update from Cabana',
      preview: String(body || '').slice(0, 110),
      html: shell({
        title: title || 'Cabana', preview: String(body || '').slice(0, 110),
        body: header({ eyebrow: 'Update', title: title || 'An update for you',
          subtitle: `Hi ${who},`, gradient: B.gradReef, emoji: emoji || '🔔' })
        + card(p(esc(body || '')) + (url ? button(url, label || 'Take a look', { gradient: B.gradReef, solid: B.electric }) : '')),
        audience: 'guest',
      }),
    };
  },

  /* ── Ownership · a private listing is waiting to be claimed ────── */
  listingClaim({ recipientName, listingTitle, city, fromName, claimUrl, expiresAt }) {
    const title = listingTitle || 'A Cabana listing';
    return {
      audience: 'partner', category: 'transactional',
      subject: `${fromName || 'Someone'} created a Cabana listing for you`,
      preview: `${title} is private until you review and accept it.`,
      html: shell({
        title: 'Claim your Cabana listing', preview: `${title} is waiting for your review.`,
        body: header({ eyebrow: 'Ownership invitation', title: 'A listing is waiting for you',
          subtitle: `${recipientName || 'Hi'} — ${fromName || 'someone'} prepared this on your behalf.`,
          gradient: B.gradDusk, emoji: '🏡' })
        + card(h2(title) + rows([
            city ? ['Location', city] : null,
            ['Prepared by', fromName || 'A Cabana partner'],
            expiresAt ? ['Invitation expires', prettyDate(expiresAt)] : null,
            ['Public now?', 'No — it stays private until you accept', true],
          ])
          + button(claimUrl || '/dashboard.html', 'Review and claim', { gradient: B.gradDusk, solid: B.violet })
          + p('The link identifies the invitation but never grants ownership by itself. Sign in or create Cabana using the exact email address this message reached; Cabana verifies that identity again before accepting.', { small: true }))
        + card(h2('Not yours?')
          + p('Open the invitation and choose Decline. It will remain private and return to the person who prepared it. Ignoring this email will never publish it.'), { delay: 2, quiet: true }),
        audience: 'partner',
        reason: 'You received this transactional email because a private Cabana listing was prepared for this address.',
      }),
    };
  },

  /* ── Ownership · the current holder has sent a transfer ────────── */
  listingTransferSent({ host, listing, recipient, claimUrl, expiresAt }) {
    const who = firstName(host?.name, host?.email);
    const title = listing?.title || listing?.name || 'Your Cabana listing';
    return {
      audience: 'partner', category: 'transactional',
      subject: `Ownership transfer sent · ${title}`,
      preview: `${recipient?.name || 'The new owner'} has been invited to review the handover.`,
      html: shell({
        title: 'Ownership transfer sent', preview: 'Your handover is safely waiting for their decision.',
        body: header({ eyebrow: 'Ownership transfer', title: 'The handover is on its way',
          subtitle: `${who}, ${title} is still yours until ${recipient?.name || 'the recipient'} accepts.`,
          gradient: B.gradDusk, emoji: '🔑' })
        + card(h2('What happens next') + rows([
            ['Listing', title],
            recipient?.name ? ['Sent to', recipient.name] : null,
            recipient?.contact ? ['Contact', recipient.contact] : null,
            expiresAt ? ['Invitation expires', prettyDate(expiresAt)] : null,
            ['Ownership now', 'Still yours', true],
          ])
          + p('Cabana will verify the recipient’s signed-in email or phone before the handover can complete. Reviews, ranking, calendar and listing history move only after they accept.', { small: true })
          + button('/partner-listings.html', 'Track the transfer', { gradient: B.gradDusk, solid: B.violet })
          + (claimUrl ? ghostButton(claimUrl, 'Open the invitation') : '')),
        audience: 'partner',
        reason: 'This is a transactional record of an ownership transfer you started on Cabana.',
      }),
    };
  },

  /* ── Ownership · accepted or declined, sent to both sides ──────── */
  listingTransferDecision({ name, listingTitle, status, perspective, otherName }) {
    const who = firstName(name);
    const accepted = status === 'accepted';
    const incoming = perspective === 'recipient';
    const title = listingTitle || 'the Cabana listing';
    const heading = accepted
      ? (incoming ? 'It’s officially yours' : 'The handover is complete')
      : (incoming ? 'Your decision is recorded' : 'The transfer was declined');
    const subtitle = accepted
      ? (incoming
          ? `${who}, you now manage ${title} on Cabana.`
          : `${who}, ${otherName || 'the new owner'} now manages ${title}.`)
      : (incoming
          ? `${who}, ${title} has not been transferred to you.`
          : `${who}, ${otherName || 'the recipient'} chose not to take over ${title}.`);
    return {
      audience: 'partner', category: 'transactional',
      subject: accepted ? `Ownership transferred · ${title}` : `Ownership transfer declined · ${title}`,
      preview: subtitle,
      html: shell({
        title: heading, preview: subtitle,
        body: header({ eyebrow: 'Ownership update', title: heading, subtitle,
          gradient: accepted ? B.gradReef : B.gradDusk, emoji: accepted ? '✅' : '↩️' })
        + card(h2(accepted ? 'Everything moved together' : 'Nothing was moved')
          + p(accepted
              ? 'The listing’s reviews, ranking, calendar and history stay intact. Cabana changed the managing account without creating a duplicate listing.'
              : 'The listing, reviews, calendar and history remain with the current owner. No public details were changed.')
          + button(incoming && accepted ? '/dashboard.html' : '/partner-listings.html',
              incoming && accepted ? 'Manage the listing' : 'Open your listings',
              { gradient: accepted ? B.gradReef : B.gradDusk, solid: accepted ? B.electric : B.violet })),
        audience: 'partner',
        reason: 'This is a transactional update about a Cabana ownership transfer involving your account.',
      }),
    };
  },

  /* ── Guest · an offer. Consent-gated, always unsubscribable. ────── */
  offer({ name, email, headline, body, code, expires, url, label, stat, statLabel }) {
    const who = firstName(name, email);
    return {
      audience: 'guest', category: 'promotions',
      subject: headline || 'Something good, from Cabana',
      preview: String(body || '').slice(0, 110),
      html: shell({
        title: headline || 'A Cabana offer', preview: String(body || '').slice(0, 110),
        body: header({ eyebrow: 'For you', title: headline || 'Something good',
          subtitle: `${who}, this one is worth a look.`, gradient: B.gradDusk, emoji: '🎁' })
        + card((stat ? statTile(stat, statLabel || 'off', { gradient: B.gradDusk, solid: B.violet }) + '<div style="height:18px"></div>' : '')
          + p(esc(body || ''))
          + (code ? `<div style="text-align:center;margin:20px 0 6px;">
                <div class="cbn-faint" style="font:700 11px/1 -apple-system,BlinkMacSystemFont,'Segoe UI',Inter,sans-serif;letter-spacing:.15em;text-transform:uppercase;color:${B.inkFaint};margin-bottom:9px;">Your code</div>
                <div class="cbn-ink" style="display:inline-block;padding:14px 26px;border:2px dashed ${B.violet};border-radius:14px;font:800 22px/1 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:5px;color:${B.violet};">${esc(code)}</div>
                ${expires ? `<div class="cbn-faint" style="font:500 12px/1.6 -apple-system,BlinkMacSystemFont,'Segoe UI',Inter,sans-serif;color:${B.inkFaint};margin-top:10px;">Good until ${esc(prettyDate(expires))}</div>` : ''}
              </div>` : '')
          + button(url || '/apartments.html', label || 'Claim it')),
        audience: 'guest',
        reason: 'You are getting this because you opted in to Cabana offers.',
        unsubscribeUrl: null, // filled by send() once the token is known
      }),
    };
  },

  /* ══ PARTNER SIDE. partnership@cabana.africa. ══════════════════════ */

  /* ── Partner · welcome ──────────────────────────────────────────── */
  partnerWelcome({ name, email, businessName }) {
    const who = firstName(name, email);
    return {
      audience: 'partner', category: 'transactional',
      subject: `${businessName || who}, welcome to Cabana Partners`,
      preview: 'Zero commission. You keep 100% of what you charge.',
      html: shell({
        title: 'Welcome to Cabana Partners', preview: 'You keep 100% of what you charge.',
        body: header({ eyebrow: 'Cabana Partners', title: `Welcome, ${who}.`,
          subtitle: 'You keep 100% of what you charge. Cabana never takes a percentage of your earnings — not now, not later.',
          gradient: B.gradDusk, emoji: '🤝' })
        + card(h2('What that means in practice') + features([
            ['💯', 'Zero commission', 'The listing price is yours. The platform fee is charged to the guest, separately.'],
            ['🛡️', 'Paid after check-in', 'The guest’s money is held until they are safely in. That hold is why new listings get booked.'],
            ['⚡', 'Import in one paste', 'Have a listing elsewhere? Paste the URL and we build it for you.'],
            ['📊', 'Real numbers', 'Views, enquiries and conversion on your dashboard, not a monthly PDF.'],
          ]) + button('/add-listing.html', 'Publish your first listing', { gradient: B.gradDusk, solid: B.violet }))
        + card(h2('Your line to us')
            + p(`Partnership questions go to <a class="cbn-link" href="mailto:${CONTACT.partnership}" style="color:${B.electric};font-weight:600;">${CONTACT.partnership}</a>, and anything urgent is faster in the app — open support and you can message or call the team straight from your dashboard.`), { delay: 2, quiet: true }),
        audience: 'partner',
      }),
    };
  },

  /* ── Partner · a booking landed ─────────────────────────────────── */
  partnerBooking({ host, listing, booking }) {
    const who = firstName(host?.name, host?.email);
    const payout = Number(booking?.hostPayout ?? booking?.host_payout ?? booking?.subtotal ?? 0);
    return {
      audience: 'partner', category: 'transactional',
      subject: `New booking · ${listing?.name || listing?.title || 'your listing'} · ${money(payout)}`,
      preview: `${booking?.guestName || 'A guest'} just booked.`,
      html: shell({
        title: 'New booking', preview: 'You have a new booking.',
        body: header({ eyebrow: 'New booking', title: `Cha-ching, ${who}.`,
          subtitle: listing?.name || listing?.title || '', gradient: B.gradDusk, emoji: '💰' })
        + card(statTile(money(payout), 'yours, in full', { gradient: B.gradDusk, solid: B.violet })
          + '<div style="height:18px"></div>'
          + rows([
              ['Reference', booking?.reference || '—'],
              booking?.guestName ? ['Guest', booking.guestName] : null,
              booking?.checkIn  ? ['Check in',  prettyDate(booking.checkIn)]  : null,
              booking?.checkOut ? ['Check out', prettyDate(booking.checkOut)] : null,
            ])
          + p('Message the guest from your dashboard to confirm arrival details. Keep it in the thread — it is the record if anything is ever queried.', { small: true })
          + button('/dashboard.html', 'Open the booking', { gradient: B.gradDusk, solid: B.violet })),
        audience: 'partner',
      }),
    };
  },

  /* ── Partner · payout ───────────────────────────────────────────── */
  partnerPayout({ host, amount, reference }) {
    const who = firstName(host?.name, host?.email);
    return {
      audience: 'partner', category: 'transactional',
      subject: `${money(amount)} sent to your M-Pesa`,
      preview: 'Your payout is on the way.',
      html: shell({
        title: 'Payout sent', preview: 'Your payout is on the way.',
        body: header({ eyebrow: 'Payout', title: 'Money’s moving',
          subtitle: `${who}, your payout has been released.`, gradient: B.gradDusk, emoji: '💸' })
        + card(statTile(money(amount), 'to your M-Pesa', { gradient: B.gradDusk, solid: B.violet })
          + '<div style="height:18px"></div>'
          + rows([reference ? ['Reference', reference] : null, ['Commission taken', 'KES 0', true]])
          + p('Zero commission is not a promotion. It is the model.', { small: true })
          + button('/dashboard.html', 'See your earnings', { gradient: B.gradDusk, solid: B.violet })),
        audience: 'partner',
      }),
    };
  },

  /* ── Partner · listing is live ──────────────────────────────────── */
  partnerListingLive({ host, listing }) {
    const who = firstName(host?.name, host?.email);
    return {
      audience: 'partner', category: 'transactional',
      subject: `${listing?.title || listing?.name || 'Your listing'} is live`,
      preview: 'It is on Cabana and taking bookings.',
      html: shell({
        title: 'Your listing is live', preview: 'It is taking bookings.',
        body: header({ eyebrow: 'Published', title: 'You’re live',
          subtitle: `${who} — ${listing?.title || listing?.name || 'your listing'} is on Cabana and open for bookings.`,
          gradient: B.gradDusk, emoji: '🚀' })
        + card(h2('Three things that move the needle') + features([
            ['📸', 'Lead with the real room', 'The listings that convert are the ones whose first photo matches the front door.'],
            ['⏱️', 'Answer inside an hour', 'Response time is the strongest single predictor of a booking.'],
            ['📅', 'Keep the calendar true', 'A blocked date you forgot to unblock is a booking you never see.'],
          ]) + button('/dashboard.html', 'Open your dashboard', { gradient: B.gradDusk, solid: B.violet })),
        audience: 'partner',
      }),
    };
  },

  /* ── Partner · a listing or service application was received ───── */
  partnerListingSubmitted({ host, submission }) {
    const who = firstName(host?.name, host?.email);
    const title = submission?.title || 'Your new Cabana listing';
    const live = submission?.state === 'live';
    const service = submission?.serviceLabel || 'Listing';
    return {
      audience: 'partner', category: 'transactional',
      subject: live ? `${title} is now on Cabana` : `Received for review · ${title}`,
      preview: live
        ? `${service} published successfully. Here is what to do next.`
        : `${service} submitted successfully. Cabana’s team will review it next.`,
      html: shell({
        title: live ? 'Your listing is on Cabana' : 'Your submission is safely in',
        preview: live ? 'Published successfully.' : 'Received and queued for review.',
        body: header({
          eyebrow: live ? 'Published' : 'Submission received',
          title: live ? `You’re live, ${who}` : `Beautiful work, ${who}`,
          subtitle: live
            ? `${title} is ready to be discovered.`
            : `${title} is now with Cabana’s review team. Nothing else is needed right now.`,
          gradient: live ? B.gradReef : B.gradDusk,
          emoji: live ? '✨' : '📝',
        })
        + card(h2('Your submission at a glance') + rows([
            ['Name', title],
            ['Service', service],
            submission?.location ? ['Location', submission.location] : null,
            ['Status', live ? 'Published' : 'In review', true],
          ])
          + button(submission?.manageUrl || '/partner-listings.html',
              live ? 'View and manage it' : 'Open partner dashboard',
              { gradient: live ? B.gradReef : B.gradDusk, solid: live ? B.electric : B.violet }))
        + card(h2(live ? 'A strong first week' : 'What happens now') + features(live ? [
            ['📸', 'Keep the first photo honest', 'The strongest cover image is the one guests recognise when they arrive.'],
            ['💬', 'Reply while interest is warm', 'Fast, thoughtful answers turn views into real conversations.'],
            ['📅', 'Keep availability current', 'Accurate dates and stock protect trust and prevent missed bookings.'],
          ] : [
            ['🔍', 'A human review', 'We check clarity, trust details and whether guests have everything they need.'],
            ['✉️', 'A clear outcome', 'We will email you when it is approved or if one detail needs your attention.'],
            ['🤝', 'A direct partner line', `Questions about this submission belong at ${CONTACT.partnership}.`],
          ]), { delay: 2, quiet: true }),
        audience: 'partner',
        reason: 'You received this transactional confirmation because you submitted a listing or service to Cabana.',
      }),
    };
  },

  /* ── Partner · a guest is waiting on them ───────────────────────── */
  partnerNudge({ host, listing, waitingHours, threadUrl }) {
    const who = firstName(host?.name, host?.email);
    return {
      audience: 'partner', category: 'transactional',
      subject: 'A guest is waiting on you',
      preview: `${waitingHours || 'A few'} hours and counting.`,
      html: shell({
        title: 'A guest is waiting', preview: 'A guest is waiting on your reply.',
        body: header({ eyebrow: 'Needs you', title: 'Someone is waiting',
          subtitle: `${who}, a guest messaged about ${listing?.title || listing?.name || 'your listing'} and has not heard back.`,
          gradient: 'linear-gradient(135deg,#FF6A3C,#F5B12E)', solid: B.ember, emoji: '⏳' })
        + card(p(`Enquiries answered within the hour convert several times better than ones answered the next day. It has been about <strong>${esc(String(waitingHours || 'a few'))} hours</strong>.`)
          + button(threadUrl || '/dashboard.html', 'Reply now', { gradient: 'linear-gradient(135deg,#FF6A3C,#F5B12E)', solid: B.ember })),
        audience: 'partner',
      }),
    };
  },

  /* ── Partner · monthly performance ──────────────────────────────── */
  partnerDigest({ host, period, stats, url }) {
    const who = firstName(host?.name, host?.email);
    const s = stats || {};
    return {
      audience: 'partner', category: 'product',
      subject: `Your ${period || 'month'} on Cabana`,
      preview: `${s.bookings || 0} bookings · ${money(s.earnings || 0)} earned.`,
      html: shell({
        title: 'Your month on Cabana', preview: 'Here is how it went.',
        body: header({ eyebrow: period || 'This month', title: 'Here’s how it went',
          subtitle: `${who}, the numbers on your listings.`, gradient: B.gradDusk, emoji: '📊' })
        + card(statTile(money(s.earnings || 0), 'earned, commission-free', { gradient: B.gradDusk, solid: B.violet })
          + '<div style="height:18px"></div>'
          + rows([
              ['Bookings',   String(s.bookings ?? 0)],
              ['Views',      String(s.views ?? 0)],
              ['Enquiries',  String(s.enquiries ?? 0)],
              s.conversion != null ? ['Enquiry → booking', `${s.conversion}%`] : null,
              ['Commission Cabana took', 'KES 0', true],
            ])
          + button(url || '/dashboard.html', 'Full breakdown', { gradient: B.gradDusk, solid: B.violet })),
        audience: 'partner',
        reason: 'You get this because you have listings on Cabana.',
      }),
    };
  },

  /* ── Partner · partnership outreach / news ──────────────────────── */
  partnerUpdate({ name, email, title, body, url, label }) {
    const who = firstName(name, email);
    return {
      audience: 'partner', category: 'partner_updates',
      subject: title || 'From Cabana Partnerships',
      preview: String(body || '').slice(0, 110),
      html: shell({
        title: title || 'Cabana Partnerships', preview: String(body || '').slice(0, 110),
        body: header({ eyebrow: 'Cabana Partnerships', title: title || 'A note from the team',
          subtitle: `Hi ${who},`, gradient: B.gradDusk, emoji: '🤝' })
        + card(p(esc(body || '')) + (url ? button(url, label || 'Read more', { gradient: B.gradDusk, solid: B.violet }) : '')),
        audience: 'partner',
        reason: 'You get this because you are a Cabana partner.',
      }),
    };
  },

  /* ── Desk · a thread needs a human. Internal, to the team. ─────── */
  agentEscalation({ threadId, category, priority, reason, guest, lastMessage, apaSummary, consoleUrl }) {
    return {
      audience: 'partner', category: 'transactional',
      subject: `[${String(priority || 'normal').toUpperCase()}] Support needs you · ${category || 'general'}`,
      preview: String(lastMessage || '').slice(0, 110),
      html: shell({
        title: 'Support escalation', preview: 'A conversation needs a human.',
        body: header({ eyebrow: `Priority: ${priority || 'normal'}`, title: 'A guest needs a person',
          subtitle: reason || 'APA handed this over.',
          gradient: priority === 'urgent'
            ? 'linear-gradient(135deg,#FF3B5C,#FF6A3C)'
            : B.gradDusk,
          emoji: priority === 'urgent' ? '🚨' : '🔔' })
        + card(rows([
            ['Thread',   String(threadId || '').slice(0, 8)],
            ['Category', category || 'general'],
            ['Guest',    guest || 'Anonymous visitor'],
          ])
          + (apaSummary ? '<div style="height:14px"></div>' + quote(apaSummary, 'What APA established') : '')
          + (lastMessage ? '<div style="height:12px"></div>' + quote(lastMessage, 'Their last message') : '')
          + button(consoleUrl || `/support-console.html?thread=${encodeURIComponent(threadId || '')}`, 'Open in the console',
                   { gradient: B.gradDusk, solid: B.violet })),
        audience: 'partner',
      }),
    };
  },

  /* ── Flight desk · we have your request ─────────────────────────── */
  flightRequested({ name, email, ref, route, dates, pax, cabin, trackUrl, dueBy }) {
    const who = firstName(name, email);
    return {
      audience: 'guest', category: 'transactional',
      subject: `We have your flight request (${ref})`,
      preview: `${route} — someone is pricing it now.`,
      html: shell({
        title: 'Your flight request', preview: `${route} — someone is pricing it now.`,
        body: header({ eyebrow: 'Flight desk', title: `We have it, ${who}.`,
          subtitle: 'Someone is pricing your trip now. You do not need to do anything.',
          gradient: B.gradDusk, emoji: '\u2708\uFE0F' })
        + card(rows([
            ['Reference', ref],
            ['Route', route],
            ['Dates', dates],
            ['Travellers', pax],
            ['Cabin', cabin],
            dueBy ? ['Options by', dueBy] : null,
          ])
          + p('Keep your reference. The link below opens this request from any device \u2014 no account, no password.', { small: true })
          + button(trackUrl, 'Track this request')),
        audience: 'guest',
      }),
    };
  },

  /* ── Flight desk · options are ready ────────────────────────────── */
  flightQuoted({ name, email, ref, route, optionsHtml, fromPrice, trackUrl, count }) {
    const who = firstName(name, email);
    return {
      audience: 'guest', category: 'transactional',
      subject: `Your ${route} options are ready (from ${fromPrice})`,
      preview: `${count} option${count === 1 ? '' : 's'} priced and held for you.`,
      html: shell({
        title: 'Your flight options', preview: `${count} option${count === 1 ? '' : 's'} priced and held.`,
        body: header({ eyebrow: 'Flight desk', title: `Ready when you are, ${who}.`,
          subtitle: `We priced ${route} and found ${count} option${count === 1 ? '' : 's'} worth your time.`,
          gradient: B.gradDusk, emoji: '\u2708\uFE0F' })
        + card(optionsHtml
          + p('Every price is the total for your whole party with taxes included. Nothing is added at checkout.', { small: true })
          + button(trackUrl, 'Choose your flight'))
        + card(p('Fares move, so these are held for a limited time. If a hold lapses before you decide, tell us and we will price it again.')
          + p(`Your reference is ${esc(ref)}.`, { small: true }), { delay: 2, quiet: true }),
        audience: 'guest',
      }),
    };
  },

  /* ── Flight desk · ticketed ─────────────────────────────────────── */
  flightTicketed({ name, email, ref, pnr, airline, route, departDate, etickets, ticketUrl, trackUrl }) {
    const who = firstName(name, email);
    return {
      audience: 'guest', category: 'transactional',
      subject: `Ticketed: ${route} (${pnr})`,
      preview: `Booking reference ${pnr}. You are confirmed.`,
      html: shell({
        title: 'You are ticketed', preview: `Booking reference ${pnr}.`,
        body: header({ eyebrow: 'Flight desk', title: `You are ticketed, ${who}.`,
          subtitle: 'Your flight is booked and the ticket is issued.',
          gradient: B.gradReef, emoji: '\uD83C\uDFAB' })
        + card(rows([
            ['Airline', airline || ''],
            ['Booking reference', pnr || ''],
            ['Route', route],
            ['Departing', departDate || ''],
            etickets ? ['E-ticket', etickets] : null,
            ['Request', ref],
          ])
          + p('Check in with the airline using the booking reference above.', { small: true })
          + button(ticketUrl || trackUrl, ticketUrl ? 'Download your e-ticket' : 'View your booking',
                   { gradient: B.gradReef, solid: B.electric }))
        + card(p('If anything changes before you fly, reply to this email. A person picks it up, and they already have your booking in front of them.'),
               { delay: 2, quiet: true }),
        audience: 'guest',
      }),
    };
  },

  /* ── Flight desk · internal, a request landed ───────────────────── */
  flightDeskAlert({ ref, route, dates, pax, cabin, flex, contactName, contactPhone,
                    contactEmail, channel, notes, ceiling, dueBy, consoleUrl }) {
    return {
      audience: 'partner', category: 'transactional',
      subject: `Flight request ${ref}: ${route}`,
      preview: `${contactName} \u00B7 ${dates} \u00B7 ${pax}`,
      html: shell({
        title: `Flight request ${ref}`, preview: `${contactName} \u00B7 ${dates}`,
        body: header({ eyebrow: 'Flight desk', title: `New request: ${route}`,
          subtitle: dueBy ? `Due back by ${dueBy}.` : 'Waiting to be priced.',
          gradient: B.gradDusk, emoji: '\u2708\uFE0F' })
        + card(rows([
            ['Reference', ref],
            ['Route', route],
            ['Dates', dates],
            ['Travellers', pax],
            ['Cabin', cabin],
            ['Flexibility', flex],
            ceiling ? ['Ceiling', ceiling] : null,
          ]))
        + card(rows([
            ['Name', contactName],
            contactPhone ? ['Phone', contactPhone] : null,
            contactEmail ? ['Email', contactEmail] : null,
            ['Prefers', channel],
          ])
          + (notes ? '<div style="height:12px"></div>' + quote(notes, 'What they told us') : '')
          + button(consoleUrl, 'Open in the console', { gradient: B.gradDusk, solid: B.violet }),
          { delay: 2 }),
        audience: 'partner',
      }),
    };
  },

  /* ── Flight desk · internal, the traveller chose ────────────────── */
  flightChosen({ ref, route, contactName, airline, price, netLine, consoleUrl }) {
    return {
      audience: 'partner', category: 'transactional',
      subject: `${ref} chose ${airline} \u2014 ready to ticket`,
      preview: `${contactName} picked ${airline} at ${price}.`,
      html: shell({
        title: `${ref} chose an option`, preview: `${contactName} picked ${airline}.`,
        body: header({ eyebrow: 'Flight desk', title: 'A traveller has chosen',
          subtitle: 'Collect documents, take payment, issue.',
          gradient: B.gradReef, emoji: '\u2705' })
        + card(rows([
            ['Reference', ref],
            ['Route', route],
            ['Traveller', contactName],
            ['Chose', airline],
            ['Price', price],
            netLine ? ['Commercial', netLine] : null,
          ])
          + button(consoleUrl, 'Open in the console', { gradient: B.gradReef, solid: B.electric })),
        audience: 'partner',
      }),
    };
  },
};

/* ══════════════════════════════════════════════════════════════════════
   SUPABASE HELPERS. Service role. Never reachable from a browser.
══════════════════════════════════════════════════════════════════════ */
function svcHeaders(extra = {}) {
  return {
    apikey: SERVICE_KEY,
    Authorization: `Bearer ${SERVICE_KEY}`,
    'Content-Type': 'application/json',
    ...extra,
  };
}

async function restGet(path) {
  if (!SUPA_URL || !SERVICE_KEY) return null;
  try {
    const r = await fetch(`${SUPA_URL}/rest/v1/${path}`, { headers: svcHeaders() });
    return r.ok ? r.json() : null;
  } catch { return null; }
}

async function restPost(path, body, prefer = 'return=minimal') {
  if (!SUPA_URL || !SERVICE_KEY) return { ok: false };
  try {
    const r = await fetch(`${SUPA_URL}/rest/v1/${path}`, {
      method: 'POST', headers: svcHeaders({ Prefer: prefer }), body: JSON.stringify(body),
    });
    const text = await r.text();
    return { ok: r.ok, status: r.status, body: text };
  } catch (e) { return { ok: false, error: e.message }; }
}

async function restPatch(path, body, prefer = 'return=minimal') {
  if (!SUPA_URL || !SERVICE_KEY) return { ok: false };
  try {
    const r = await fetch(`${SUPA_URL}/rest/v1/${path}`, {
      method: 'PATCH', headers: svcHeaders({ Prefer: prefer }), body: JSON.stringify(body),
    });
    const text = await r.text();
    return { ok: r.ok, status: r.status, body: text };
  } catch (e) { return { ok: false, error: e.message }; }
}

/* Consent, plus the token that lets someone withdraw it. A row is
   created on first contact so the unsubscribe link in the very first
   promotional email already resolves. */
async function preferences(email) {
  const addr = String(email || '').toLowerCase().trim();
  if (!addr) return null;
  const found = await restGet(`email_preferences?email=eq.${encodeURIComponent(addr)}&select=*&limit=1`);
  if (found && found[0]) return found[0];
  const created = await restPost('email_preferences', { email: addr }, 'return=representation');
  if (created.ok && created.body) {
    try { return JSON.parse(created.body)[0] || null; } catch { /* fall through */ }
  }
  return await restGet(`email_preferences?email=eq.${encodeURIComponent(addr)}&select=*&limit=1`)
    .then(r => (r && r[0]) || null);
}

async function logEmail(row) {
  const res = await restPost('email_log', row);
  /* 23505 is the dedupe index doing its job. That is a successful
     outcome for this function, not an error worth surfacing. */
  if (!res.ok && String(res.body || '').includes('23505')) return { duplicate: true };
  return { duplicate: false, ok: res.ok };
}

/* ══════════════════════════════════════════════════════════════════════
   SEND
══════════════════════════════════════════════════════════════════════ */

const CATEGORY_FLAG = {
  transactional:   null,          // never gated
  product:         'product',
  promotions:      'promotions',
  partner_updates: 'partner_updates',
};

/**
 * Render a template and send it.
 *
 *   template   key of TEMPLATES
 *   to         recipient address
 *   data       template payload
 *   dedupeKey  optional. Unique across all time; a second send is skipped.
 *   userId     optional, for the log
 *   force      bypass the consent check. For transactional mail only.
 *
 * Returns { ok, skipped?, reason?, id? }. Never throws: a failed email
 * must not roll back the booking, sign-up or reply that triggered it.
 */
export async function sendTemplate({ template, to, data = {}, dedupeKey = null, userId = null, force = false }) {
  const build = TEMPLATES[template];
  if (!build) return { ok: false, error: `unknown_template:${template}` };

  const addr = String(to || '').toLowerCase().trim();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(addr)) return { ok: false, error: 'invalid_recipient' };

  let built;
  try { built = build(data); }
  catch (e) { return { ok: false, error: `template_error:${e.message}` }; }

  const category = built.category || 'transactional';
  const audience = built.audience || 'guest';
  const from = audience === 'partner' ? MAIL.partnership : MAIL.connect;
  const replyTo = audience === 'partner' ? MAIL.replyToPartner : MAIL.replyToGuest;

  /* ── Consent ── */
  let prefs = null;
  const flag = CATEGORY_FLAG[category];
  if (flag && !force) {
    prefs = await preferences(addr);
    if (prefs && (prefs.unsubscribed_at || prefs[flag] === false)) {
      await logEmail({
        user_id: userId, recipient: addr, template, sender: from,
        subject: built.subject, dedupe_key: dedupeKey, status: 'suppressed',
        meta: { category, reason: 'consent_withdrawn' },
      });
      return { ok: true, skipped: true, reason: 'consent_withdrawn' };
    }
  }

  /* ── Idempotency. Claim the key BEFORE the send, so two lambdas racing
     the same trigger produce one email rather than two. The loser of the
     race exits here. ── */
  if (dedupeKey) {
    const claim = await logEmail({
      user_id: userId, recipient: addr, template, sender: from,
      subject: built.subject, dedupe_key: dedupeKey, status: 'sent',
      meta: { category, claimed_at: new Date().toISOString() },
    });
    if (claim.duplicate) {
      const prior = await restGet(`email_log?dedupe_key=eq.${encodeURIComponent(dedupeKey)}&select=status&limit=1`);
      if (!prior || prior[0]?.status !== 'failed') {
        return { ok: true, skipped: true, reason: 'already_sent' };
      }
      /* Failed provider requests are retryable. Resend receives the same
         idempotency key below, so two recovery attempts still produce one
         message at most. */
      await restPatch(`email_log?dedupe_key=eq.${encodeURIComponent(dedupeKey)}`, {
        status: 'sent', error: null,
        meta: { category, retried_at: new Date().toISOString() },
      });
    }
  }

  /* ── Unsubscribe. Promotional and product mail must carry a working
     one-click path out, both in the body and in the headers. ── */
  let html = built.html;
  let headers;
  if (flag) {
    prefs = prefs || await preferences(addr);
    if (prefs?.unsubscribe_token) {
      const url = `${SITE}/unsubscribe.html?t=${encodeURIComponent(prefs.unsubscribe_token)}&c=${encodeURIComponent(flag)}`;
      html = html.replace(
        /<!--UNSUB-->|(?=<div style="height:22px;line-height:22px;">)/,
        `<div style="margin:10px 0 0;font:400 11px/1.6 -apple-system,BlinkMacSystemFont,'Segoe UI',Inter,sans-serif;">
           <a href="${url}" style="color:${B.inkFaint};text-decoration:underline;">Unsubscribe from these</a>
         </div>`
      );
      headers = {
        'List-Unsubscribe': `<${url}>, <mailto:${replyTo}?subject=unsubscribe>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      };
    }
  }

  if (!RESEND_KEY) {
    if (dedupeKey) await restPatch(`email_log?dedupe_key=eq.${encodeURIComponent(dedupeKey)}`, {
      status: 'failed', error: 'RESEND_API_KEY not set', meta: { category },
    });
    return { ok: false, error: 'RESEND_API_KEY not set' };
  }

  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_KEY}`,
        'Content-Type': 'application/json',
        ...(dedupeKey ? { 'Idempotency-Key': String(dedupeKey).slice(0, 256) } : {}),
      },
      body: JSON.stringify({
        from, to: [addr], subject: built.subject, html,
        reply_to: replyTo, ...(headers ? { headers } : {}),
      }),
    });
    const out = await r.json().catch(() => ({}));
    if (!r.ok) {
      console.error('[mail] resend', r.status, JSON.stringify(out).slice(0, 300));
      if (dedupeKey) {
        await restPatch(`email_log?dedupe_key=eq.${encodeURIComponent(dedupeKey)}`, {
          status: 'failed', error: String(out?.message || r.status).slice(0, 300), meta: { category },
        });
      } else {
        await restPost('email_log', {
          user_id: userId, recipient: addr, template, sender: from, subject: built.subject,
          status: 'failed', error: String(out?.message || r.status).slice(0, 300), meta: { category },
        });
      }
      return { ok: false, error: out?.message || `resend_${r.status}` };
    }

    if (dedupeKey) {
      /* Attach the provider id to the row we already claimed. */
      await restPatch(`email_log?dedupe_key=eq.${encodeURIComponent(dedupeKey)}`, {
        provider_id: out.id, status: 'sent', error: null,
      });
    } else {
      await restPost('email_log', {
        user_id: userId, recipient: addr, template, sender: from,
        subject: built.subject, provider_id: out.id, status: 'sent', meta: { category },
      });
    }
    return { ok: true, id: out.id };
  } catch (e) {
    console.error('[mail]', e.message);
    if (dedupeKey) {
      await restPatch(`email_log?dedupe_key=eq.${encodeURIComponent(dedupeKey)}`, {
        status: 'failed', error: String(e.message || 'network_error').slice(0, 300), meta: { category },
      });
    }
    return { ok: false, error: e.message };
  }
}

/** Fire and forget. For paths where mail must never block or throw. */
export function sendTemplateAsync(args) {
  return sendTemplate(args).catch(e => {
    console.warn('[mail:async]', e?.message);
    return { ok: false, error: e?.message };
  });
}

export { preferences as emailPreferences };
