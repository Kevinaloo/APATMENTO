/* ════════════════════════════════════════════════════════════════════════════
   CABANA MESSENGER v5 — Database Schema
   schema-chat.sql
   Run in Supabase SQL Editor for project gfwgbgdvxtocwhilrtdw
   ════════════════════════════════════════════════════════════════════════════ */

-- ─── Tables ─────────────────────────────────────────────────────────────────
create table if not exists public.chat_conversations (
  id              uuid        primary key default gen_random_uuid(),
  listing_id      text        not null,
  listing_type    text        not null default 'apartment',
  listing_title   text,
  host_id         uuid        not null references auth.users(id) on delete cascade,
  guest_id        uuid        not null references auth.users(id) on delete cascade,
  host_unread     integer     not null default 0,
  guest_unread    integer     not null default 0,
  last_message    text,
  last_message_at timestamptz,
  last_sender_id  uuid,
  status          text        not null default 'open',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (listing_id, guest_id)
);

create index if not exists conv_host_idx   on public.chat_conversations (host_id, last_message_at desc);
create index if not exists conv_guest_idx  on public.chat_conversations (guest_id, last_message_at desc);

create table if not exists public.chat_messages (
  id               uuid        primary key default gen_random_uuid(),
  conversation_id  uuid        not null references public.chat_conversations(id) on delete cascade,
  sender_id        uuid        not null references auth.users(id) on delete cascade,
  content          text        not null,
  content_raw      text,         -- pre-scrub content (admin audit only)
  was_scrubbed     boolean     not null default false,
  is_system        boolean     not null default false,
  is_read          boolean     not null default false,
  created_at       timestamptz not null default now()
);

create index if not exists msg_conv_idx on public.chat_messages (conversation_id, created_at asc);

-- ─── updated_at trigger ─────────────────────────────────────────────────────
create or replace function public.touch_conv_updated()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;
drop trigger if exists trg_touch_conv on public.chat_conversations;
create trigger trg_touch_conv
  before update on public.chat_conversations
  for each row execute function public.touch_conv_updated();

-- ─── RLS ────────────────────────────────────────────────────────────────────
alter table public.chat_conversations enable row level security;
alter table public.chat_messages       enable row level security;

drop policy if exists "conv_sel"    on public.chat_conversations;
drop policy if exists "conv_ins"    on public.chat_conversations;
drop policy if exists "conv_upd"    on public.chat_conversations;
drop policy if exists "msg_sel"     on public.chat_messages;
drop policy if exists "msg_ins"     on public.chat_messages;

create policy "conv_sel" on public.chat_conversations for select
  using (auth.uid() = host_id or auth.uid() = guest_id);
create policy "conv_ins" on public.chat_conversations for insert
  with check (auth.uid() = guest_id);
create policy "conv_upd" on public.chat_conversations for update
  using (auth.uid() = host_id or auth.uid() = guest_id);

create policy "msg_sel" on public.chat_messages for select
  using (exists (
    select 1 from public.chat_conversations c
    where c.id = conversation_id
      and (auth.uid() = c.host_id or auth.uid() = c.guest_id)
  ));
create policy "msg_ins" on public.chat_messages for insert
  with check (
    auth.uid() = sender_id
    and exists (
      select 1 from public.chat_conversations c
      where c.id = conversation_id
        and (auth.uid() = c.host_id or auth.uid() = c.guest_id)
    )
  );

-- ─── Server-side fortress scrubber (additive to client-side) ────────────────
create or replace function public.scrub_chat_message()
returns trigger language plpgsql security definer as $$
declare v text := new.content; s boolean := false;
begin
  -- Kenyan phone numbers
  if v ~ '(\+?254|0)[\s\-._()]*[17][\s\-._()0-9]{7,}' then
    v := regexp_replace(v, '(\+?254|0)[\s\-._()]*[17][\s\-._()0-9]{7,}', '[phone removed]', 'gi'); s := true;
  end if;
  -- Generic phone digit runs
  if v ~ '\b\d{10,}\b' then
    v := regexp_replace(v, '\b\d{10,}\b', '[phone removed]', 'g'); s := true;
  end if;
  -- Spaced-out digit sequences (6+ digits with gaps)
  if v ~ '\b(\d[\s._\-]{1,3}){5,}\d\b' then
    v := regexp_replace(v, '\b(\d[\s._\-]{1,3}){5,}\d\b', '[phone removed]', 'g'); s := true;
  end if;
  -- Email
  if v ~ '[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}' then
    v := regexp_replace(v, '[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}', '[email removed]', 'gi'); s := true;
  end if;
  -- obfuscated email: name [at] domain [dot] com
  if v ~* '\bat\b.{1,30}\bdot\b' then
    v := regexp_replace(v, '\w[\w.+\-]*\s+at\s+\w[\w.\-]*\s+dot\s+\w{2,}', '[email removed]', 'gi'); s := true;
  end if;
  -- WhatsApp
  if v ~* 'wh?a?ts?[\s._\-]*a?pp?' then
    v := regexp_replace(v, 'wh?a?ts?[\s._\-]*a?pp?', '[WhatsApp removed]', 'gi'); s := true;
  end if;
  -- URLs
  if v ~ 'https?://' then
    v := regexp_replace(v, 'https?://[^\s]+', '[link removed]', 'gi'); s := true;
  end if;
  -- Social platforms
  if v ~* '(instagram|facebook|telegram|tiktok|snapchat|discord|twitter|linkedin|viber|signal|skype)\s*[:/]' then
    v := regexp_replace(v, '(instagram|facebook|telegram|tiktok|snapchat|discord|twitter|linkedin|viber|signal|skype)[\s:/_]+\S+', '[social removed]', 'gi'); s := true;
  end if;
  -- "my number is / my phone is"
  if v ~* 'my\s+(number|num|no\.?|phone|mobile|cell|line)\s+(is|:)' then
    v := regexp_replace(v, 'my\s+(number|num|no\.?|phone|mobile|cell|line)\s+(is|:)\s*\S+', '[phone removed]', 'gi'); s := true;
  end if;
  -- Direct contact requests
  if v ~* '(text|call|ring|dm|ping|hit)\s+me\b' then
    v := regexp_replace(v, '(text|call|ring|dm|ping|hit)\s+me\b', '[direct contact removed]', 'gi'); s := true;
  end if;

  if s then
    new.content     := v;
    new.was_scrubbed := true;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_scrub_msg on public.chat_messages;
create trigger trg_scrub_msg
  before insert on public.chat_messages
  for each row execute function public.scrub_chat_message();

-- ─── Enable Realtime ─────────────────────────────────────────────────────────
-- Run these in the Supabase Dashboard → Database → Replication:
-- alter publication supabase_realtime add table public.chat_conversations;
-- alter publication supabase_realtime add table public.chat_messages;
