/* ══════════════════════════════════════════════════════════════════════
   CABANA · SMS (Africa's Talking)
   One sender for every server route. SMS is the channel of last resort:
   it reaches a phone with no data, no app and no push permission, which
   is exactly the host who would otherwise miss a guest who is waiting.
   ══════════════════════════════════════════════════════════════════════ */

const AT_SMS_URL = 'https://api.africastalking.com/version1/messaging';

export function smsConfigured() {
  return !!process.env.AT_API_KEY;
}

/* Kenyan numbers arrive in every shape: 0712…, 712…, 254712…, +254 712….
   Anything already in international form is left alone. */
export function normalisePhone(raw, defaultCountry = '254') {
  let s = String(raw || '').trim();
  if (!s) return null;
  if (s.startsWith('+')) {
    const digits = s.slice(1).replace(/\D/g, '');
    return digits.length >= 9 ? '+' + digits : null;
  }
  const digits = s.replace(/\D/g, '');
  if (!digits) return null;
  if (digits.startsWith(defaultCountry) && digits.length >= 11) return '+' + digits;
  if (digits.startsWith('0')) return '+' + defaultCountry + digits.slice(1);
  if (digits.length === 9) return '+' + defaultCountry + digits;
  return digits.length >= 10 ? '+' + digits : null;
}

export async function sendSMS({ to, message, from = 'CABANA' }) {
  const key = process.env.AT_API_KEY;
  if (!key) throw new Error('AT_API_KEY not set');
  const phone = normalisePhone(to);
  if (!phone) throw new Error('InvalidPhoneNumber');
  const params = new URLSearchParams({
    username: process.env.AT_USERNAME || 'Cabana',
    to: phone,
    message: String(message || '').slice(0, 459),
    from,
  });
  const r = await fetch(AT_SMS_URL, {
    method: 'POST',
    headers: { apiKey: key, 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body: params.toString(),
  });
  const data = await r.json().catch(() => ({}));
  const entry = data?.SMSMessageData?.Recipients?.[0];
  if (!r.ok || entry?.status === 'InvalidPhoneNumber') throw new Error(entry?.status || `AT ${r.status}`);
  return { id: entry?.messageId, status: entry?.status, cost: entry?.cost };
}
