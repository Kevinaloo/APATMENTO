/* ════════════════════════════════════════════════════════════════════════════
   CABANA MESSENGER — Database Schema
   schema-chat.sql
   ────────────────────────────────────────────────────────────────────────────
   Tables:
     chat_conversations  — one row per guest↔host↔listing thread
     chat_messages       — messages within a conversation

   Run this against the Supabase project:
     https://gfwgbgdvxtocwhilrtdw.supabase.co

   RLS: guests and hosts can only see their own conversations.
   ════════════════════════════════════════════════════════════════════════════ */

-- ─── chat_conversations ────────────────────────────────────────────────────
create table if not exists public.chat_conversations (
  id              uuid        primary key default gen_random_uuid(),
  listing_id      text        not null,
  listing_type    text        not null default 'apartment',
  listing_title   text,
  host_id         uuid        not null references auth.users(id) on delete cascade,
  guest_id        uuid        not null references auth.users(id) on delete cascade,

  -- Unread counters (incremented on send, zeroed on read)
  host_unread     integer     not null default 0,
  guest_unread    integer     not null default 0,

  -- Last-message preview (for conversation list)
  last_message    text,
  last_message_at timestamptz,
  last_sender_id  uuid,

  -- Status: open / archived / blocked
  status          text        not null default 'open',

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  -- One conversation per guest-listing pair
  unique (listing_id, guest_id)
);

-- Indexes for common queries
create index if not exists conv_host_idx   on public.chat_conversations (host_id, last_message_at desc);
create index if not exists conv_guest_idx  on public.chat_conversations (guest_id, last_message_at desc);
create index if not exists conv_status_idx on public.chat_conversations (status);

-- ─── chat_messages ─────────────────────────────────────────────────────────
create table if not exists public.chat_messages (
  id               uuid        primary key default gen_random_uuid(),
  conversation_id  uuid        not null references public.chat_conversations(id) on delete cascade,
  sender_id        uuid        not null references auth.users(id) on delete cascade,

  -- Stored content (post-scrub)
  content          text        not null,
  -- Original pre-scrub content (stored for admin audit only)
  content_raw      text,
  -- Was contact info scrubbed out?
  was_scrubbed     boolean     not null default false,
  -- Is this a system/automated message?
  is_system        boolean     not null default false,
  -- Has the recipient read this message?
  is_read          boolean     not null default false,

  created_at       timestamptz not null default now()
);

create index if not exists msg_conv_idx  on public.chat_messages (conversation_id, created_at asc);
create index if not exists msg_sender_idx on public.chat_messages (sender_id);

-- ─── auto-update updated_at ────────────────────────────────────────────────
create or replace function public.touch_conversation_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists touch_conv_updated on public.chat_conversations;
create trigger touch_conv_updated
  before update on public.chat_conversations
  for each row execute function public.touch_conversation_updated_at();

-- ─── RLS ───────────────────────────────────────────────────────────────────
alter table public.chat_conversations enable row level security;
alter table public.chat_messages       enable row level security;

-- chat_conversations: only host or guest can see
drop policy if exists "conv_select" on public.chat_conversations;
create policy "conv_select" on public.chat_conversations
  for select using (
    auth.uid() = host_id or auth.uid() = guest_id
  );

drop policy if exists "conv_insert" on public.chat_conversations;
create policy "conv_insert" on public.chat_conversations
  for insert with check (
    auth.uid() = guest_id
  );

drop policy if exists "conv_update" on public.chat_conversations;
create policy "conv_update" on public.chat_conversations
  for update using (
    auth.uid() = host_id or auth.uid() = guest_id
  );

-- chat_messages: only participants of the conversation can see / insert
drop policy if exists "msg_select" on public.chat_messages;
create policy "msg_select" on public.chat_messages
  for select using (
    exists (
      select 1 from public.chat_conversations c
      where c.id = conversation_id
        and (auth.uid() = c.host_id or auth.uid() = c.guest_id)
    )
  );

drop policy if exists "msg_insert" on public.chat_messages;
create policy "msg_insert" on public.chat_messages
  for insert with check (
    auth.uid() = sender_id
    and exists (
      select 1 from public.chat_conversations c
      where c.id = conversation_id
        and (auth.uid() = c.host_id or auth.uid() = c.guest_id)
    )
  );

-- ─── Realtime ──────────────────────────────────────────────────────────────
-- Enable realtime for both tables (run in Supabase dashboard → Realtime)
-- alter publication supabase_realtime add table public.chat_conversations;
-- alter publication supabase_realtime add table public.chat_messages;

-- ─── Content scrubbing function (server-side, additive to client scrub) ────
create or replace function public.scrub_chat_message()
returns trigger language plpgsql security definer as $$
declare
  v text := new.content;
  scrubbed boolean := false;
begin
  -- Phone numbers (Kenyan)
  if v ~ '(?:(?:\+?254|0)[- .]?[17]\d{2}[- .]?\d{3}[- .]?\d{3})' then
    v := regexp_replace(v, '(?:(?:\+?254|0)[- .]?[17]\d{2}[- .]?\d{3}[- .]?\d{3})', '[phone removed]', 'g');
    scrubbed := true;
  end if;
  -- Email
  if v ~ '[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}' then
    v := regexp_replace(v, '[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}', '[email removed]', 'g');
    scrubbed := true;
  end if;
  -- URLs
  if v ~ 'https?://' then
    v := regexp_replace(v, 'https?://[^\s]+', '[link removed]', 'g');
    scrubbed := true;
  end if;

  if scrubbed then
    new.content     := v;
    new.was_scrubbed := true;
  end if;
  return new;
end;
$$;

drop trigger if exists scrub_msg on public.chat_messages;
create trigger scrub_msg
  before insert on public.chat_messages
  for each row execute function public.scrub_chat_message();
