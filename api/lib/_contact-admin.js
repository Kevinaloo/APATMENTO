/* ══════════════════════════════════════════════════════════════════════
   CABANA · CONTACT THE ADMIN TEAM
   api/lib/_contact-admin.js      →  /api/contact-admin   (via api/trust.js)

   A person who hits a door that is not open to them — the invitation-only
   Ambassador programme is the first — gets a text box instead of a dead
   end. What they write is emailed, through Resend, to the admin inbox with
   the sender as the reply-to, so answering is just "reply".

   The signed-in account (id and email) is read from the bearer token and
   attached to the message; it is never trusted from the request body.
   Anonymous senders are allowed — the point is to be reachable — but
   rate-limited harder, and must give an email to be answered at.

   Recipient: ADMIN_NOTIFY_EMAIL, else ADMIN_EMAIL, else the support
   address in _brand.js.
   ══════════════════════════════════════════════════════════════════════ */

import { Resend } from 'resend';
import { setCors, authenticatedUser, consumeRateLimit } from './_security.js';
import { MAIL, CONTACT, SITE } from './_brand.js';
import { esc } from './_mail.js';

const TOPICS = {
  'ambassador-access': 'Ambassador access',
  general: 'General',
};
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const clamp = (v, n) => String(v == null ? '' : v).slice(0, n);

export function adminRecipient() {
  const to = process.env.ADMIN_NOTIFY_EMAIL || process.env.ADMIN_EMAIL || CONTACT.support;
  return String(to).split(',').map(s => s.trim()).filter(s => EMAIL_RE.test(s));
}

export function buildMessage({ topic, message, email, user, page, ip, ua }) {
  const label = TOPICS[topic] || TOPICS.general;
  const who = user?.email || email;
  const rows = [
    ['From', who],
    ['Account', user ? `${user.email || ''} (${user.id})` : 'Not signed in'],
    ['Topic', label],
    ['Page', page || '—'],
    ['IP', ip || '—'],
    ['Device', ua || '—'],
  ];
  const html = `<!doctype html><html><body style="margin:0;background:#F4F5FB;padding:24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,sans-serif;color:#0A0B18">
<div style="max-width:560px;margin:0 auto;background:#fff;border-radius:18px;padding:26px;border:1px solid #E6E8F3">
<div style="font-size:11px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:#6D28FF;margin-bottom:8px">Cabana · ${esc(label)}</div>
<h1 style="margin:0 0 14px;font-size:20px;line-height:1.3">New message from ${esc(who)}</h1>
<div style="white-space:pre-wrap;font-size:15px;line-height:1.7;background:#F7F8FD;border-radius:14px;padding:16px;margin-bottom:18px">${esc(message)}</div>
<table role="presentation" cellspacing="0" cellpadding="0" style="font-size:12.5px;color:#4C4E6A;width:100%">
${rows.map(([k, v]) => `<tr><td style="padding:4px 12px 4px 0;font-weight:700;white-space:nowrap;vertical-align:top">${esc(k)}</td><td style="padding:4px 0;word-break:break-word">${esc(v)}</td></tr>`).join('')}
</table>
<p style="margin:18px 0 0;font-size:12px;color:#8E90AD">Reply to this email to answer ${esc(who)} directly. · <a href="${esc(SITE)}/admin.html" style="color:#4361FF">Admin console</a></p>
</div></body></html>`;
  const text = `${message}\n\n— ${who}\nTopic: ${label}\nAccount: ${user ? user.id : 'not signed in'}\nPage: ${page || '—'}`;
  return { subject: `[Cabana · ${label}] ${clamp(message.replace(/\s+/g, ' '), 60)}`, html, text };
}

export default async function handler(req, res) {
  setCors(req, res, 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'method_not_allowed' });

  /* Anonymous mail to an inbox is abuse bait; keep the burst small. */
  if (!consumeRateLimit(req, res, 'contact-admin', 5, 10 * 60_000)) return;

  const body = typeof req.body === 'string' ? safeJson(req.body) : (req.body || {});
  const message = clamp(body.message, 2000).trim();
  if (message.length < 10) return res.status(400).json({ ok: false, error: 'message_too_short' });

  const user = await authenticatedUser(req);
  const email = clamp(user?.email || body.email, 200).trim().toLowerCase();
  if (!EMAIL_RE.test(email)) return res.status(400).json({ ok: false, error: 'valid_email_required' });
  if (!consumeRateLimit(req, res, 'contact-admin-email', 3, 10 * 60_000, email)) return;

  const key = process.env.RESEND_API_KEY;
  const to = adminRecipient();
  if (!key || !to.length) return res.status(503).json({ ok: false, error: 'mail_unavailable' });

  const topic = TOPICS[body.topic] ? body.topic : 'general';
  const built = buildMessage({
    topic, message, email, user,
    page: clamp(body.page, 200),
    ip: String(req.headers?.['x-forwarded-for'] || '').split(',')[0].trim(),
    ua: clamp(req.headers?.['user-agent'], 200),
  });

  try {
    const { error } = await new Resend(key).emails.send({
      from: MAIL.connect, to, replyTo: email,
      subject: built.subject, html: built.html, text: built.text,
      tags: [{ name: 'template', value: 'contact-admin' }, { name: 'topic', value: topic }],
    });
    if (error) {
      console.error('[contact-admin] resend', error.message || error);
      return res.status(502).json({ ok: false, error: 'send_failed' });
    }
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('[contact-admin]', e.message);
    return res.status(502).json({ ok: false, error: 'send_failed' });
  }
}

function safeJson(s) { try { return JSON.parse(s); } catch { return {}; } }
