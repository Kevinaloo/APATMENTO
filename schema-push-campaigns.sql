-- ═══════════════════════════════════════════════════════════════════
-- APATMENTO · PUSH CAMPAIGNS SCHEMA
-- Stores scheduled and recurring push notification campaigns.
-- Admin creates campaigns via the admin panel; a cron job or
-- serverless function fires them at send_at time.
-- ═══════════════════════════════════════════════════════════════════

create table if not exists push_campaigns (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  body         text not null,
  url          text default '/',
  kind         text not null default 'general',   -- general | booking | promo
  audience     text not null default 'all',        -- all | guests | partners
  repeat       text not null default 'none',       -- none | daily | weekly | monthly
  send_at      timestamptz not null,
  last_sent_at timestamptz,
  active       boolean not null default true,
  created_by   uuid references auth.users(id),
  created_at   timestamptz not null default now()
);

create index if not exists idx_push_campaigns_send_at
  on push_campaigns(send_at) where active = true;

alter table push_campaigns enable row level security;

-- Only service role (admin) can read/write campaigns.
-- No client-side RLS policy needed — admin panel uses service role key.
-- Prevent direct client access entirely:
drop policy if exists "no direct client access" on push_campaigns;
create policy "no direct client access" on push_campaigns
  for all using (false);

-- ── CRON TRIGGER NOTE ──────────────────────────────────────────────
-- To fire scheduled campaigns automatically, set up a pg_cron job
-- in Supabase (Database > Extensions > pg_cron):
--
-- select cron.schedule(
--   'fire-push-campaigns',
--   '* * * * *',   -- every minute
--   $$
--   select net.http_post(
--     url := 'https://www.apatmento.space/api/push-cron',
--     headers := '{"x-admin-secret": "<YOUR_PUSH_ADMIN_SECRET>"}'::jsonb,
--     body := '{}'::jsonb
--   );
--   $$
-- );
--
-- The /api/push-cron endpoint queries push_campaigns where
-- send_at <= now() and active = true and (last_sent_at is null
-- or (repeat='daily' and last_sent_at < now()-interval '23 hours')
-- etc.), fires the broadcast, and updates last_sent_at.
