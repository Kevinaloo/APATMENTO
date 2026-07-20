/* ═══════════════════════════════════════════════════════════════════
   APATMENTO · PUSH CRON
   GET or POST /api/push-cron

   Called every minute by Supabase pg_cron (or any external cron).
   Finds due push_campaigns and fires them as broadcasts.

   Auth: x-admin-secret header required.
   ═══════════════════════════════════════════════════════════════════ */

const SUPA_URL    = process.env.SUPABASE_URL || 'https://gfwgbgdvxtocwhilrtdw.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ADMIN_SECRET = process.env.PUSH_ADMIN_SECRET;
const PUSH_URL    = process.env.PUSH_SEND_URL || 'https://www.apatmento.space/api/push-send';

async function supa(path, opts = {}) {
  const res = await fetch(`${SUPA_URL}/rest/v1/${path}`, {
    ...opts,
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
      ...(opts.headers || {}),
    },
  });
  if (!res.ok && res.status !== 204) {
    throw new Error(`supabase ${res.status}: ${await res.text()}`);
  }
  return res.status === 204 ? null : res.json().catch(() => null);
}

function isDue(campaign) {
  const now = new Date();
  const sendAt = new Date(campaign.send_at);
  if (!campaign.last_sent_at) return sendAt <= now;

  const last = new Date(campaign.last_sent_at);
  switch (campaign.repeat) {
    case 'daily':   return (now - last) >= 23 * 3600 * 1000 && sendAt.getHours() === now.getHours();
    case 'weekly':  return (now - last) >= 6.5 * 86400 * 1000 && sendAt.getDay() === now.getDay();
    case 'monthly': return (now - last) >= 27 * 86400 * 1000 && sendAt.getDate() === now.getDate();
    default:        return false; // 'none' — already sent
  }
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(204).end();

  if (ADMIN_SECRET && req.headers['x-admin-secret'] !== ADMIN_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Fetch all active campaigns
    const campaigns = await supa('push_campaigns?active=eq.true&select=*') || [];
    const due = campaigns.filter(isDue);

    if (!due.length) {
      return res.status(200).json({ fired: 0, checked: campaigns.length });
    }

    const fired = [];
    for (const camp of due) {
      try {
        // Get all subscriber user_ids
        const subs = await supa('push_subscriptions?select=user_id') || [];
        let userIds = [...new Set(subs.map(s => s.user_id).filter(Boolean))];

        // Filter by audience
        if (camp.audience === 'partners') {
          const partners = await supa('listings?select=user_id') || [];
          const partnerIds = new Set(partners.map(p => p.user_id));
          userIds = userIds.filter(id => partnerIds.has(id));
        }

        // Send in batches
        let sent = 0;
        const BATCH = 20;
        for (let i = 0; i < userIds.length; i += BATCH) {
          const batch = userIds.slice(i, i + BATCH);
          await Promise.allSettled(batch.map(uid =>
            fetch(PUSH_URL, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'x-admin-secret': ADMIN_SECRET },
              body: JSON.stringify({
                user_id: uid,
                title: camp.title,
                body: camp.body,
                url: camp.url || '/',
                kind: camp.kind || 'general',
                persist: true,
              }),
            }).then(r => r.json()).then(d => { if (d.sent > 0) sent++; })
          ));
        }

        // Update last_sent_at (and deactivate if one-time)
        const update = { last_sent_at: new Date().toISOString() };
        if (camp.repeat === 'none') update.active = false;
        await supa(`push_campaigns?id=eq.${camp.id}`, {
          method: 'PATCH',
          body: JSON.stringify(update),
        });

        fired.push({ id: camp.id, title: camp.title, sent });
      } catch (e) {
        console.error(`[push-cron] campaign ${camp.id} failed:`, e.message);
      }
    }

    return res.status(200).json({ fired: fired.length, campaigns: fired });
  } catch (e) {
    console.error('[push-cron]', e);
    return res.status(500).json({ error: e.message });
  }
}
