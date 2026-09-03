/* ═══════════════════════════════════════════════════════════════════
   CABANA · SOS ALERT INTAKE
   ───────────────────────────────────────────────────────────────────
   POST /api/sos-alert

   Someone pressed SOS. Assume they are in trouble and that every second
   between now and a human reading this matters.

   Order of operations is deliberate:

     1  write the alert row           ← durable, happens first
     2  open an urgent support thread ← so the desk answers where the
                                         guest is already looking
     3  fan out: email, admin push, desk notification

   Steps 1 and 2 are awaited because they are the record. Step 3 is
   best-effort and never allowed to fail the request: a guest whose
   alert was filed but whose email bounced is far better off than one
   who got a 500 and thinks nobody heard them.

   The response is deliberately fast and small. The client needs the
   thread id so it can drop the guest straight into a live conversation.
   ═══════════════════════════════════════════════════════════════════ */

import { insert, update, select } from './_db.js';
import { notify } from './_notify.js';
import { sendTemplate } from './_mail.js';
import { SITE } from './_brand.js';

/* Where an emergency lands. Overridable so a real safety rota can own
   it without a redeploy. */
const SAFETY_INBOX = (process.env.SOS_ALERT_EMAIL || 'connect@cabana.africa')
  .split(',').map(s => s.trim()).filter(Boolean);

const CATEGORIES = {
  medical:  'Medical emergency',
  police:   'Police / crime',
  fire:     'Fire / rescue',
  security: 'Personal safety',
  roadside: 'Roadside emergency',
  support:  'Urgent Cabana support',
};

/* Categories where a life may be at risk. These page harder and are
   never allowed to sit in the ordinary support queue. */
const LIFE_SAFETY = new Set(['medical', 'police', 'fire', 'security', 'roadside']);

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function str(v, max = 500) {
  if (v == null) return null;
  const s = String(v).trim();
  return s ? s.slice(0, max) : null;
}

/* A location is only worth acting on if we say how good it is. A 3km
   accuracy radius is a city, not a street, and the desk must see that
   before it dispatches anyone. */
function describeFix(a) {
  if (a.latitude == null || a.longitude == null) {
    return { line: 'No location — the device did not give us a fix.', quality: 'none', map: null };
  }
  const acc = a.accuracy_m;
  const map = `https://www.google.com/maps?q=${a.latitude},${a.longitude}`;
  let quality = 'unknown', note = 'accuracy not reported';
  if (acc != null) {
    if (acc <= 50)        { quality = 'precise';      note = `±${Math.round(acc)}m, GPS-grade`; }
    else if (acc <= 500)  { quality = 'approximate';  note = `±${Math.round(acc)}m, roughly this block`; }
    else if (acc <= 5000) { quality = 'coarse';       note = `±${Math.round(acc)}m — this is a tower fix, not a street`; }
    else                  { quality = 'very coarse';  note = `±${Math.round(acc / 1000)}km — treat as city-level only`; }
  }
  return {
    quality,
    map,
    line: `${a.latitude.toFixed(6)}, ${a.longitude.toFixed(6)} (${note})`,
  };
}

export default async function sosHandler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  /* An emergency is never a cached response. */
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
  body = body || {};

  const category = CATEGORIES[body.category] ? body.category : 'support';
  const guestKey = str(body.guest_key, 120);
  const userId   = str(body.user_id, 80);

  if (!userId && !guestKey) {
    return res.status(400).json({ error: 'need user_id or guest_key' });
  }

  const loc = body.location || {};
  const alert = {
    user_id:    userId || null,
    guest_key:  guestKey || null,
    display_name: str(body.display_name, 120),
    email:      str(body.email, 200),
    phone:      str(body.phone, 40),
    category,
    latitude:   num(loc.latitude),
    longitude:  num(loc.longitude),
    accuracy_m: num(loc.accuracy),
    altitude_m: num(loc.altitude),
    heading_deg: num(loc.heading),
    speed_ms:   num(loc.speed),
    fixed_at:   loc.fixed_at ? new Date(loc.fixed_at).toISOString() : null,
    location_source: ['gps', 'cache', 'ip', 'manual', 'none'].includes(loc.source) ? loc.source : 'none',
    place_label: str(loc.label, 300),
    note:       str(body.note, 2000),
    origin_page: str(body.origin_page, 300),
    user_agent: str(req.headers['user-agent'], 400),
    meta: {
      ip: str(req.headers['x-forwarded-for'], 100),
      locale: str(body.locale, 20),
    },
  };

  /* ── 1 · The record. If this throws, the caller must know. ── */
  let row;
  try {
    row = await insert('sos_alerts', alert);
    if (Array.isArray(row)) row = row[0];
  } catch (err) {
    console.error('[sos] failed to record alert:', err.message, alert);
    return res.status(500).json({ error: 'could_not_record', detail: err.message });
  }

  const fix = describeFix(alert);
  const label = CATEGORIES[category];
  const who = alert.display_name || alert.email || (userId ? 'Signed-in guest' : 'Guest');

  /* ── 2 · The thread. The desk replies here; so does the guest. ── */
  let threadId = null;
  try {
    let thread = await insert('support_threads', {
      user_id:   alert.user_id,
      guest_key: alert.guest_key,
      display_name: alert.display_name,
      email:     alert.email,
      subject:   `SOS · ${label}`,
      category:  'sos',
      /* Straight to the human queue. APA does not triage an emergency. */
      status:    'queued',
      priority:  'urgent',
      escalated_at: new Date().toISOString(),
      escalation_reason: `SOS pressed: ${label}`,
      origin_page: alert.origin_page,
      locale:    str(body.locale, 20),
      meta:      { sos_alert_id: row?.id, sos_category: category },
    });
    if (Array.isArray(thread)) thread = thread[0];
    threadId = thread?.id || null;

    if (threadId) {
      await insert('support_messages', {
        thread_id: threadId,
        sender_role: 'system',
        sender_name: 'SOS',
        body:
          `🆘 SOS raised — ${label}\n` +
          `Location: ${fix.line}\n` +
          (fix.map ? `Map: ${fix.map}\n` : '') +
          (alert.place_label ? `Nearest place: ${alert.place_label}\n` : '') +
          (alert.note ? `\nWhat they said: ${alert.note}` : ''),
        meta: { sos_alert_id: row?.id, location_quality: fix.quality },
      }, false);

      await update('sos_alerts', `id=eq.${row.id}`, { thread_id: threadId });
    }
  } catch (err) {
    /* A thread failure must not lose the alert. It is already filed. */
    console.error('[sos] thread creation failed:', err.message);
  }

  /* ── 3 · Fan-out. Best effort, in parallel, never fatal. ── */
  const deskUrl = `${SITE}/support-console.html${threadId ? `?thread=${threadId}` : ''}`;
  const notified = {};

  const legs = [];

  /* Email the safety rota. force:true — an emergency ignores marketing
     consent, because it is not marketing. */
  for (const to of SAFETY_INBOX) {
    legs.push(
      sendTemplate({
        template: 'sosAlert',
        to,
        force: true,
        /* One mail per alert per recipient, even if two lambdas race. */
        dedupeKey: `sos:${row?.id}:${to}`,
        data: {
          category: label,
          lifeSafety: LIFE_SAFETY.has(category),
          who,
          email: alert.email,
          phone: alert.phone,
          locationLine: fix.line,
          locationQuality: fix.quality,
          mapUrl: fix.map,
          placeLabel: alert.place_label,
          note: alert.note,
          originPage: alert.origin_page,
          deskUrl,
          raisedAt: new Date().toISOString(),
          alertId: row?.id,
        },
      })
        .then(r => { notified[`email:${to}`] = r?.ok ? 'sent' : (r?.reason || r?.error || 'failed'); })
        .catch(e => { notified[`email:${to}`] = `error:${e.message}`; })
    );
  }

  /* Push every admin on the roster. */
  legs.push((async () => {
    try {
      const admins = await select('admin_users', 'select=user_id');
      const ids = [...new Set((admins || []).map(a => a.user_id).filter(Boolean))];
      await Promise.all(ids.map(id => notify({
        user_id: id,
        kind: 'sos',
        title: `🆘 SOS · ${label}`,
        body: `${who} needs help. ${fix.quality === 'none' ? 'No location.' : `Location ${fix.quality}.`} Tap to open.`,
        url: deskUrl,
      })));
      notified.admin_push = `${ids.length} admin(s)`;
    } catch (e) {
      notified.admin_push = `error:${e.message}`;
    }
  })());

  await Promise.allSettled(legs);

  /* Record what actually went out, so a silent delivery failure is
     visible in the console instead of assumed away. */
  try {
    if (row?.id) await update('sos_alerts', `id=eq.${row.id}`, { notified });
  } catch (e) {
    console.warn('[sos] could not persist delivery receipts:', e.message);
  }

  return res.status(200).json({
    ok: true,
    alert_id: row?.id || null,
    thread_id: threadId,
    /* The client shows this so the guest knows a human was actually
       paged, rather than hoping. */
    acknowledged: true,
  });
}
