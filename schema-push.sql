-- ═══════════════════════════════════════════════════════════════════
-- APATMENTO · WEB PUSH SCHEMA
-- Stores push subscriptions and provides a realtime notifications
-- table that the client subscribes to for in-app live updates.
-- ═══════════════════════════════════════════════════════════════════

-- ── 1 · PUSH SUBSCRIPTIONS ──────────────────────────────────────────
create table if not exists push_subscriptions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users(id) on delete cascade,
  endpoint     text not null unique,
  p256dh       text not null,
  auth         text not null,
  user_agent   text,
  created_at   timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create index if not exists idx_push_sub_user on push_subscriptions(user_id);

alter table push_subscriptions enable row level security;

-- A user manages only their own subscriptions.
-- Anonymous (guest) subscriptions carry user_id = null and are
-- inserted with the anon key; they can never be read back by a client.
drop policy if exists "own subs insert" on push_subscriptions;
create policy "own subs insert" on push_subscriptions
  for insert with check (
    user_id is null or auth.uid() = user_id
  );

drop policy if exists "own subs select" on push_subscriptions;
create policy "own subs select" on push_subscriptions
  for select using (auth.uid() = user_id);

drop policy if exists "own subs update" on push_subscriptions;
create policy "own subs update" on push_subscriptions
  for update using (auth.uid() = user_id or user_id is null);

drop policy if exists "own subs delete" on push_subscriptions;
create policy "own subs delete" on push_subscriptions
  for delete using (auth.uid() = user_id);


-- ── 2 · NOTIFICATIONS (realtime in-app feed) ────────────────────────
create table if not exists notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  title      text not null,
  body       text,
  url        text,
  kind       text not null default 'general',   -- booking | payment | message | general
  read       boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_notif_user_created
  on notifications(user_id, created_at desc);
create index if not exists idx_notif_unread
  on notifications(user_id) where read = false;

alter table notifications enable row level security;

drop policy if exists "own notifications" on notifications;
create policy "own notifications" on notifications
  for select using (auth.uid() = user_id);

drop policy if exists "mark own read" on notifications;
create policy "mark own read" on notifications
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Realtime: clients listen to INSERTs on this table for their own rows.
-- RLS above ensures a user only ever receives their own notifications.
alter publication supabase_realtime add table notifications;
