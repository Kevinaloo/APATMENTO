-- ════════════════════════════════════════════════════════════════════════════
-- CABANA MESSENGER v6 · CORE
-- ────────────────────────────────────────────────────────────────────────────
-- What this closes (each was live in production on 20 Sep 2026):
--   1. No server-side contact scrubbing existed. Everything the browser
--      checked could be skipped by posting to the REST API directly, and the
--      browser's own patterns missed "07then 16then 206then 494" (the exact
--      message a host sent a guest). → cabana_private.chat_before_insert
--   2. Numbers split across several messages ("0716" / "206" / "494") were
--      never looked at together. → fragment check + retroactive withholding
--   3. Anyone, even signed out, could write a notification into any user's
--      bell with any title and any link — a phishing channel wearing Cabana's
--      name. → notifications hardening
--   4. Any member could set their own profiles.verified, banned,
--      suspended_until, host_status and trust_score. The chat shows a
--      verified badge; that badge was self-service. → profile guard
--   5. A guest chose the conversation's listing_title when starting a chat,
--      so a host could be shown "Cabana Support – verify your payout" as a
--      thread name. → titles come from the listing row
--   6. No rate limits: one account could open a conversation with every host
--      on the platform and send without pause. → per-sender limits
--   7. last_message previews and unread counters had no notion of a message
--      meant for one person only. → visible_to, private previews
--
-- What it adds, all written only through SECURITY DEFINER functions so the
-- browser can never forge an offer, a suggestion, a case or a system line:
--   private host offers (priced by the same stay_quote the booking trigger
--   trusts), "suggest another stay" for hosts who cannot host, escalation to
--   the Cabana team, block / archive, read receipts, trip details, saved
--   replies, a proper inbox with names, and host response times.
-- ════════════════════════════════════════════════════════════════════════════

-- ── 0. Shared helpers ───────────────────────────────────────────────────────
-- A booking between these two people that money has actually moved on.
create or replace function cabana_private.chat_contact_allowed(p_host uuid, p_guest uuid)
returns boolean language sql stable security definer set search_path = pg_catalog, public as $$
  select exists (
    select 1 from public.apartment_bookings b
     where b.guest_id = p_guest and b.host_id = p_host and b.cancelled_at is null
       and b.status in ('paid_pending_checkin','deposit_paid','part_paid','checked_in','confirmed')
       and b.checkout_date >= (now() at time zone 'Africa/Nairobi')::date - 1)
$$;

create or replace function cabana_private.member_name(p_user uuid)
returns text language sql stable security definer set search_path = pg_catalog, public as $$
  select coalesce(
    (select display_name from public.member_public_profiles where user_id = p_user and published),
    (select nullif(trim(initcap(split_part(coalesce(first_name, ''), ' ', 1)) ||
            case when coalesce(last_name, '') <> '' then ' ' || upper(left(last_name, 1)) || '.' else '' end), '')
       from public.profiles where id = p_user),
    'Cabana member')
$$;

create or replace function cabana_private.fmt_range(p_in date, p_out date)
returns text language sql immutable set search_path = pg_catalog as $$
  select case when p_in is null then null
    when to_char(p_in, 'Mon') = to_char(p_out, 'Mon')
      then to_char(p_in, 'FMDD') || '–' || to_char(p_out, 'FMDD Mon')
    else to_char(p_in, 'FMDD Mon') || ' – ' || to_char(p_out, 'FMDD Mon') end
$$;

create or replace function cabana_private.int_or_null(p text)
returns integer language sql immutable set search_path = pg_catalog as $$
  select case when p ~ '^\s*\d{1,6}\s*$' then trim(p)::integer end
$$;

-- ── 1. Schema ───────────────────────────────────────────────────────────────
alter table public.chat_conversations
  add column if not exists checkin            date,
  add column if not exists checkout           date,
  add column if not exists guests             integer,
  add column if not exists host_archived_at   timestamptz,
  add column if not exists guest_archived_at  timestamptz,
  add column if not exists blocked_by         uuid,
  add column if not exists blocked_at         timestamptz,
  add column if not exists flagged_at         timestamptz,
  add column if not exists flag_reason        text,
  add column if not exists host_last_read_at  timestamptz,
  add column if not exists guest_last_read_at timestamptz,
  add column if not exists updated_at         timestamptz not null default now();

alter table public.chat_messages
  add column if not exists kind       text not null default 'text',
  add column if not exists payload    jsonb,
  add column if not exists visible_to uuid,
  add column if not exists client_id  uuid,
  add column if not exists flags      text[] not null default '{}';

do $$ begin
  alter table public.chat_messages add constraint chat_messages_kind_check
    check (kind in ('text','system','offer','suggestion','case','booking','notice','withheld'));
exception when duplicate_object then null; end $$;

create unique index if not exists chat_messages_client_once
  on public.chat_messages (sender_id, client_id) where client_id is not null;
create index if not exists chat_messages_sender_recent on public.chat_messages (sender_id, created_at desc);
create index if not exists chat_messages_conv_time on public.chat_messages (conversation_id, created_at desc);
create index if not exists chat_conversations_guest_recent on public.chat_conversations (guest_id, created_at desc);

create table if not exists public.chat_violations (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null,
  conversation_id uuid references public.chat_conversations(id) on delete cascade,
  message_id      uuid,
  categories      text[] not null,
  excerpt         text,
  created_at      timestamptz not null default now()
);
create index if not exists chat_violations_user_recent on public.chat_violations (user_id, created_at desc);
alter table public.chat_violations enable row level security;
revoke all on public.chat_violations from anon, authenticated;
drop policy if exists chat_violations_operator on public.chat_violations;
create policy chat_violations_operator on public.chat_violations for select to authenticated using (public.is_operator());
grant select on public.chat_violations to authenticated;

create table if not exists public.chat_offers (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.chat_conversations(id) on delete cascade,
  listing_id      uuid not null,
  host_id         uuid not null,
  guest_id        uuid not null,
  checkin         date not null,
  checkout        date not null,
  guests          integer not null check (guests between 1 and 50),
  nightly         numeric(12,2) not null check (nightly > 0),
  list_nightly    numeric(12,2) not null,
  stay_total      numeric(12,2) not null,
  note            text check (length(note) <= 500),
  status          text not null default 'sent'
                  check (status in ('sent','accepted','declined','withdrawn','expired','superseded')),
  expires_at      timestamptz not null,
  message_id      uuid,
  booking_id      uuid,
  created_at      timestamptz not null default now(),
  resolved_at     timestamptz,
  check (checkout > checkin)
);
create index if not exists chat_offers_lookup on public.chat_offers (listing_id, guest_id, status, checkin, checkout);
create index if not exists chat_offers_conv on public.chat_offers (conversation_id, created_at desc);
alter table public.chat_offers enable row level security;
revoke all on public.chat_offers from anon, authenticated;
drop policy if exists chat_offers_parties on public.chat_offers;
create policy chat_offers_parties on public.chat_offers for select to authenticated
  using (host_id = (select auth.uid()) or guest_id = (select auth.uid()) or public.is_operator());
grant select on public.chat_offers to authenticated;

create table if not exists public.chat_saved_replies (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid(),
  title      text not null check (length(trim(title)) between 1 and 40),
  body       text not null check (length(trim(body)) between 1 and 1000),
  created_at timestamptz not null default now()
);
create index if not exists chat_saved_replies_user on public.chat_saved_replies (user_id, created_at);
alter table public.chat_saved_replies enable row level security;
revoke all on public.chat_saved_replies from anon, authenticated;
drop policy if exists chat_saved_replies_own on public.chat_saved_replies;
create policy chat_saved_replies_own on public.chat_saved_replies for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
grant select, insert, delete on public.chat_saved_replies to authenticated;
grant update (title, body) on public.chat_saved_replies to authenticated;

create or replace function cabana_private.chat_saved_reply_limit()
returns trigger language plpgsql security definer set search_path = pg_catalog, public as $$
begin
  if (select count(*) from public.chat_saved_replies where user_id = new.user_id) >= 30 then
    raise exception 'You can keep up to 30 saved replies. Delete one to add another.' using errcode = 'P0001';
  end if;
  return new;
end $$;
drop trigger if exists chat_saved_reply_limit on public.chat_saved_replies;
create trigger chat_saved_reply_limit before insert on public.chat_saved_replies
  for each row execute function cabana_private.chat_saved_reply_limit();

-- ── 2. Read access: private lines stay private ─────────────────────────────
drop policy if exists chat_messages_read on public.chat_messages;
create policy chat_messages_read on public.chat_messages for select to authenticated
using ((visible_to is null or visible_to = (select auth.uid()))
  and exists (select 1 from public.chat_conversations c where c.id = conversation_id
    and (c.host_id = (select auth.uid()) or c.guest_id = (select auth.uid()))));

revoke all on public.chat_messages from anon, authenticated;
grant select (id, conversation_id, sender_id, content, was_scrubbed, is_system, read_at, created_at,
              kind, payload, visible_to, client_id)
  on public.chat_messages to authenticated;
grant insert (conversation_id, sender_id, content, client_id, was_scrubbed, is_system)
  on public.chat_messages to authenticated;

-- The guard trigger owns every protected column now (it stores the original
-- of a withheld message in content_raw), so the policy only checks identity.
drop policy if exists chat_messages_send on public.chat_messages;
create policy chat_messages_send on public.chat_messages for insert to authenticated
with check (sender_id = (select auth.uid())
  and exists (select 1 from public.chat_conversations c where c.id = conversation_id
    and c.status in ('active', 'open') and (c.host_id = (select auth.uid()) or c.guest_id = (select auth.uid()))));

-- ── 3. Conversations start from the listing row, not from the browser ──────
create or replace function cabana_private.chat_conv_before_insert()
returns trigger language plpgsql security invoker set search_path = pg_catalog, public as $$
declare l public.listings%rowtype;
begin
  if current_user in ('authenticated', 'anon') then
    select * into l from public.listings where id = new.listing_id;
    if not found then raise exception 'This listing is not available to message.' using errcode = '22023'; end if;
    new.host_id := l.partner_id;
    new.listing_title := left(coalesce(l.title, 'Listing'), 140);
    new.listing_type := case coalesce(l.service, 'stays') when 'stays' then 'apartment' else l.service end;
    new.status := 'active';
    new.host_unread := 0; new.guest_unread := 0;
    new.last_message := null; new.last_sender_id := null;
    if (select count(*) from public.chat_conversations
         where guest_id = new.guest_id and created_at > now() - interval '24 hours') >= 25 then
      raise exception 'You have started a lot of conversations today. Please continue in your existing chats or try again tomorrow.'
        using errcode = 'P0001', hint = 'rate_limited';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists chat_conv_before_insert on public.chat_conversations;
create trigger chat_conv_before_insert before insert on public.chat_conversations
  for each row execute function cabana_private.chat_conv_before_insert();

-- ── 4. Every message passes the guard ──────────────────────────────────────
create or replace function cabana_private.chat_guard_row(m public.chat_messages)
returns public.chat_messages language plpgsql security definer set search_path = pg_catalog, public as $$
declare
  c public.chat_conversations%rowtype;
  allowed boolean; g jsonb; hard text[]; prev text[]; prev_ids uuid[]; spans boolean := false;
  strikes int; withheld text :=
    'Message withheld. It looked like it contained contact or payment details, which can only be shared once a booking is paid on Cabana.';
begin
  -- Runs as the table owner so it can record violations and write the
  -- private notice, but only ever for the person actually sending.
  if m.sender_id is distinct from auth.uid() then
    raise exception 'Conversation not found' using errcode = '42501';
  end if;

  m.kind := 'text'; m.payload := null; m.visible_to := null; m.is_system := false;
  m.content_raw := null; m.was_scrubbed := false; m.flags := '{}';
  m.read_at := null; m.created_at := clock_timestamp();
  m.content := btrim(regexp_replace(coalesce(m.content, ''), '[\u0001-\u0008\u000B\u000C\u000E-\u001F\u007F]', '', 'g'));
  if length(m.content) = 0 then raise exception 'Write a message first.' using errcode = '22023'; end if;
  if length(m.content) > 2000 then raise exception 'Messages can be up to 2,000 characters.' using errcode = '22023'; end if;

  select * into c from public.chat_conversations where id = m.conversation_id;
  if not found or m.sender_id not in (c.host_id, c.guest_id) then
    raise exception 'Conversation not found' using errcode = '42501';
  end if;
  if c.blocked_by is not null or c.status = 'blocked' then
    raise exception 'This conversation is closed.' using errcode = '42501';
  end if;

  if (select count(*) from public.chat_messages
       where sender_id = m.sender_id and created_at > now() - interval '1 minute') >= 20
     or (select count(*) from public.chat_messages
       where sender_id = m.sender_id and created_at > now() - interval '1 day') >= 500 then
    raise exception 'You are sending messages very quickly. Please wait a moment and try again.'
      using errcode = 'P0001', hint = 'rate_limited';
  end if;
  if (select count(*) from public.chat_violations
       where user_id = m.sender_id and created_at > now() - interval '24 hours') >= 5 then
    raise exception 'Messaging is paused for a few hours after repeated attempts to share contact details. Our Trust team has been notified.'
      using errcode = 'P0001', hint = 'cooldown';
  end if;

  allowed := cabana_private.chat_contact_allowed(c.host_id, c.guest_id);
  g := cabana_private.chat_guard(m.content, allowed);
  hard := array(select jsonb_array_elements_text(g->'hard'));

  select array_agg(content order by created_at), array_agg(id order by created_at)
    into prev, prev_ids
    from (select content, id, created_at from public.chat_messages
           where conversation_id = c.id and sender_id = m.sender_id and kind = 'text'
             and created_at > now() - interval '30 minutes'
           order by created_at desc limit 6) recent;
  if cardinality(hard) = 0 then
    spans := cabana_private.chat_guard_spans(prev, m.content, allowed);
    if spans then hard := array['phone']; end if;
  end if;

  if cardinality(hard) > 0 then
    m.content_raw := m.content;
    m.content := withheld;
    m.kind := 'withheld';
    m.was_scrubbed := true;
    m.flags := hard;
    if spans then
      -- The earlier fragments were only harmless until this one arrived.
      update public.chat_messages
         set content_raw = coalesce(content_raw, content), content = withheld, kind = 'withheld',
             was_scrubbed = true, flags = array['phone']
       where id = any(prev_ids) and cabana_private.chat_guard_fragment(content) <> '';
    end if;
    insert into public.chat_violations (user_id, conversation_id, message_id, categories, excerpt)
    values (m.sender_id, c.id, m.id, hard, left(m.content_raw, 500));

    select count(*) into strikes from public.chat_violations
     where user_id = m.sender_id and created_at > now() - interval '30 days';
    insert into public.chat_messages (conversation_id, sender_id, content, kind, visible_to, is_system, created_at, payload)
    values (c.id, m.sender_id,
      case when strikes >= 3
        then 'Your messages keep including contact or payment details, so this conversation has been sent to our Trust team for review. Everything you need can be arranged here, and once a booking is paid you can share a phone number for arrival.'
        else 'We withheld that message: ' || coalesce((select string_agg(r, ' ') from (select
            case x when 'phone' then 'phone numbers' when 'email' then 'email addresses' when 'link' then 'outside links'
                   when 'social' then 'social handles and messaging apps' when 'payment' then 'payment details'
                   else 'arranging payment outside Cabana' end r from unnest(hard) x limit 1) s), 'contact details')
          || ' can''t be shared before a booking is paid. It keeps both of you protected: payments made outside Cabana aren''t covered.' end,
      'notice', m.sender_id, true, clock_timestamp() + interval '1 millisecond',
      jsonb_build_object('tone', case when strikes >= 3 then 'serious' else 'info' end, 'categories', to_jsonb(hard)));

    if strikes >= 3 then
      update public.chat_conversations
         set flagged_at = coalesce(flagged_at, now()), flag_reason = 'repeated_contact_attempts'
       where id = c.id;
      if strikes = 3 then
        insert into public.ops_alerts (kind, severity, title, body, meta)
        values ('chat_contact_attempts', 'warning',
          'Repeated off-platform attempts in chat',
          cabana_private.member_name(m.sender_id) || ' has had ' || strikes || ' messages withheld in 30 days.',
          jsonb_build_object('user_id', m.sender_id, 'conversation_id', c.id, 'categories', to_jsonb(hard)));
      end if;
    end if;
  else
    m.flags := array(select jsonb_array_elements_text(g->'soft'));
  end if;
  return m;
end $$;

-- SECURITY DEFINER functions run as their owner, so a definer trigger cannot
-- tell a person's insert from one of our own functions: current_user is the
-- owner in both. The gates below are SECURITY INVOKER — they see the real
-- role — and hand the privileged work to a definer worker.
create or replace function cabana_private.chat_before_insert()
returns trigger language plpgsql security invoker set search_path = pg_catalog, public as $$
begin
  if current_user not in ('authenticated', 'anon') then return new; end if;
  return cabana_private.chat_guard_row(new);
end $$;
revoke all on function cabana_private.chat_guard_row(public.chat_messages) from public, anon;
grant execute on function cabana_private.chat_guard_row(public.chat_messages) to authenticated;
grant execute on function cabana_private.chat_before_insert() to authenticated;

drop trigger if exists chat_before_insert on public.chat_messages;
create trigger chat_before_insert before insert on public.chat_messages
  for each row execute function cabana_private.chat_before_insert();

-- Messages are append-only for people. Only our functions may rewrite one
-- (withholding fragments, stamping read receipts).
create or replace function cabana_private.chat_message_immutable()
returns trigger language plpgsql security invoker set search_path = pg_catalog, public as $$
begin
  if current_user in ('authenticated', 'anon') then
    raise exception 'Messages cannot be edited.' using errcode = '42501';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end $$;
drop trigger if exists chat_message_immutable on public.chat_messages;
create trigger chat_message_immutable before update or delete on public.chat_messages
  for each row execute function cabana_private.chat_message_immutable();

-- ── 5. Summary + notification understand kinds and private lines ───────────
create or replace function public.cabana_chat_message_summary()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  to_host boolean; to_guest boolean; c record; preview text;
begin
  select host_id, guest_id into c from public.chat_conversations where id = new.conversation_id;
  if new.kind in ('notice', 'case') then
    to_host := false; to_guest := false;
  else
    to_host := (new.visible_to is null or new.visible_to = c.host_id)
      and (new.kind in ('system', 'booking') or new.sender_id <> c.host_id);
    to_guest := (new.visible_to is null or new.visible_to = c.guest_id)
      and (new.kind in ('system', 'booking') or new.sender_id <> c.guest_id);
  end if;
  preview := case new.kind
    when 'withheld' then 'Message withheld'
    else left(regexp_replace(new.content, '\s+', ' ', 'g'), 90) end;
  update public.chat_conversations set
    last_message    = case when new.visible_to is null then preview else last_message end,
    last_message_at = case when new.visible_to is null then new.created_at else last_message_at end,
    last_sender_id  = case when new.visible_to is null then new.sender_id else last_sender_id end,
    host_unread     = coalesce(host_unread, 0) + case when to_host then 1 else 0 end,
    guest_unread    = coalesce(guest_unread, 0) + case when to_guest then 1 else 0 end,
    host_archived_at  = case when to_host then null else host_archived_at end,
    guest_archived_at = case when to_guest then null else guest_archived_at end,
    updated_at = now()
  where id = new.conversation_id;
  return new;
end $$;
revoke all on function public.cabana_chat_message_summary() from public, anon, authenticated;

create or replace function public.cabana_notify_chat_recipient()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, extensions, net, cabana_ops
as $$
declare
  conversation public.chat_conversations%rowtype;
  recipient uuid;
  delivery_url text := 'https://cabana.africa/api/push-send?action=database-message';
  delivery_secret text;
  title text;
begin
  if new.is_system is true or new.visible_to is not null
     or new.kind not in ('text', 'offer', 'suggestion') then return new; end if;
  select * into conversation from public.chat_conversations where id = new.conversation_id;
  if not found then return new; end if;
  recipient := case when new.sender_id = conversation.host_id then conversation.guest_id else conversation.host_id end;
  if recipient is null or recipient = new.sender_id then return new; end if;

  title := case new.kind
    when 'offer' then 'A special offer for ' || left(coalesce(conversation.listing_title, 'your stay'), 80)
    when 'suggestion' then 'Your host suggested other stays'
    else cabana_private.member_name(new.sender_id) || ' · ' || left(coalesce(conversation.listing_title, 'Cabana'), 70) end;

  insert into public.notifications (user_id, title, body, url, kind, meta)
  select recipient, title,
         left(regexp_replace(coalesce(new.content, ''), '\s+', ' ', 'g'), 140),
         '/dashboard.html?inbox=1&c=' || conversation.id, 'message',
         jsonb_build_object('message_id', new.id, 'conversation_id', conversation.id)
  where not exists (
    select 1 from public.notifications n
    where n.user_id = recipient and n.meta->>'message_id' = new.id::text
  );

  select value into delivery_secret from cabana_ops.cron_config where key = 'cron_secret';
  if delivery_secret is not null and delivery_secret <> '' then
    perform net.http_post(
      url := delivery_url,
      headers := jsonb_build_object('Authorization', 'Bearer ' || delivery_secret,
        'Content-Type', 'application/json', 'User-Agent', 'Cabana-Messaging/1.0'),
      body := jsonb_build_object('action', 'database-message', 'message_id', new.id),
      timeout_milliseconds := 15000
    );
  end if;
  return new;
end;
$$;
revoke all on function public.cabana_notify_chat_recipient() from public, anon, authenticated;

-- ── 6. Posting from our own functions ──────────────────────────────────────
create or replace function cabana_private.chat_post(
  p_conversation uuid, p_sender uuid, p_kind text, p_content text,
  p_payload jsonb default null, p_visible_to uuid default null)
returns uuid language plpgsql security definer set search_path = pg_catalog, public as $$
declare mid uuid;
begin
  insert into public.chat_messages (conversation_id, sender_id, content, kind, payload, visible_to, is_system, created_at)
  values (p_conversation, p_sender, p_content, p_kind, p_payload, p_visible_to, p_kind in ('system', 'booking', 'notice'), clock_timestamp())
  returning id into mid;
  return mid;
end $$;
revoke all on function cabana_private.chat_post(uuid, uuid, text, text, jsonb, uuid) from public, anon, authenticated;

-- The API's door for escalations and for the Cabana team answering in a chat.
create or replace function public.cabana_chat_service_post(
  p_conversation uuid, p_sender uuid, p_kind text, p_content text,
  p_payload jsonb default null, p_visible_to uuid default null)
returns uuid language plpgsql security definer set search_path = pg_catalog, public as $$
begin
  if p_kind not in ('system', 'case', 'notice') then raise exception 'Unsupported kind'; end if;
  return cabana_private.chat_post(p_conversation, p_sender, p_kind, left(p_content, 2000), p_payload, p_visible_to);
end $$;
revoke all on function public.cabana_chat_service_post(uuid, uuid, text, text, jsonb, uuid) from public, anon, authenticated;
grant execute on function public.cabana_chat_service_post(uuid, uuid, text, text, jsonb, uuid) to service_role;

-- ── 7. Participant helpers ──────────────────────────────────────────────────
create or replace function cabana_private.chat_mine(p_conversation uuid)
returns public.chat_conversations language plpgsql stable security definer set search_path = pg_catalog, public as $$
declare c public.chat_conversations%rowtype;
begin
  select * into c from public.chat_conversations where id = p_conversation;
  if not found or auth.uid() is null or auth.uid() not in (c.host_id, c.guest_id) then
    raise exception 'Conversation not found' using errcode = '42501';
  end if;
  return c;
end $$;
revoke all on function cabana_private.chat_mine(uuid) from public, anon, authenticated;

create or replace function cabana_private.chat_text_ok(p_text text, p_host uuid, p_guest uuid)
returns void language plpgsql stable security definer set search_path = pg_catalog, public as $$
declare g jsonb;
begin
  if coalesce(trim(p_text), '') = '' then return; end if;
  g := cabana_private.chat_guard(p_text, cabana_private.chat_contact_allowed(p_host, p_guest));
  if jsonb_array_length(g->'hard') > 0 then
    raise exception 'Your note includes contact or payment details, which can''t be shared before a booking is paid.'
      using errcode = '22023', hint = 'guard';
  end if;
end $$;
revoke all on function cabana_private.chat_text_ok(text, uuid, uuid) from public, anon, authenticated;

-- ── 8. Starting and opening conversations ──────────────────────────────────
create or replace function public.cabana_chat_start(
  p_listing uuid, p_checkin date default null, p_checkout date default null, p_guests integer default null)
returns jsonb language plpgsql security definer set search_path = pg_catalog, public as $$
declare me uuid := auth.uid(); l public.listings%rowtype; c public.chat_conversations%rowtype;
begin
  if me is null then raise exception 'Sign in to message a host.' using errcode = '42501'; end if;
  select * into l from public.listings where id = p_listing and coalesce(is_active, true) and deleted_at is null;
  if not found or l.partner_id is null then raise exception 'This listing does not have a host available to message yet.' using errcode = '22023'; end if;
  if l.partner_id = me then raise exception 'This is your own listing.' using errcode = '22023'; end if;

  select * into c from public.chat_conversations where listing_id = p_listing and guest_id = me;
  if not found then
    if (select count(*) from public.chat_conversations where guest_id = me and created_at > now() - interval '24 hours') >= 25 then
      raise exception 'You have started a lot of conversations today. Please continue in your existing chats or try again tomorrow.'
        using errcode = 'P0001', hint = 'rate_limited';
    end if;
    insert into public.chat_conversations (listing_id, listing_type, listing_title, host_id, guest_id, status)
    values (l.id, case coalesce(l.service, 'stays') when 'stays' then 'apartment' else l.service end,
            left(coalesce(l.title, 'Listing'), 140), l.partner_id, me, 'active')
    on conflict (listing_id, guest_id) do nothing;
    select * into c from public.chat_conversations where listing_id = p_listing and guest_id = me;
  end if;

  if p_checkin is not null and p_checkout is not null and p_checkout > p_checkin
     and p_checkin >= (now() at time zone 'Africa/Nairobi')::date and p_checkout - p_checkin <= 365 then
    update public.chat_conversations
       set checkin = p_checkin, checkout = p_checkout,
           guests = least(greatest(coalesce(p_guests, guests, 1), 1), 50), guest_archived_at = null
     where id = c.id returning * into c;
  end if;
  return to_jsonb(c);
end $$;
revoke all on function public.cabana_chat_start(uuid, date, date, integer) from public, anon;
grant execute on function public.cabana_chat_start(uuid, date, date, integer) to authenticated;

create or replace function public.cabana_chat_for_booking(p_booking uuid)
returns uuid language plpgsql security definer set search_path = pg_catalog, public as $$
declare me uuid := auth.uid(); b public.apartment_bookings%rowtype; lid uuid; cid uuid; l public.listings%rowtype;
begin
  select * into b from public.apartment_bookings where id = p_booking;
  if not found or me is null or me not in (b.guest_id, b.host_id) then raise exception 'Booking not found' using errcode = '42501'; end if;
  lid := coalesce(b.listing_id, case when b.apartment_id ~* '^[0-9a-f-]{36}$' then b.apartment_id::uuid end);
  select * into l from public.listings where id = lid;
  if not found then raise exception 'This listing is no longer available.' using errcode = '22023'; end if;
  select id into cid from public.chat_conversations where listing_id = lid and guest_id = b.guest_id;
  if cid is null then
    insert into public.chat_conversations (listing_id, listing_type, listing_title, host_id, guest_id, status, checkin, checkout, guests)
    values (lid, 'apartment', left(coalesce(l.title, b.listing_name, 'Stay'), 140), coalesce(b.host_id, l.partner_id), b.guest_id, 'active',
            b.checkin_date, b.checkout_date, b.num_guests)
    on conflict (listing_id, guest_id) do nothing
    returning id into cid;
    if cid is null then select id into cid from public.chat_conversations where listing_id = lid and guest_id = b.guest_id; end if;
  else
    update public.chat_conversations set checkin = b.checkin_date, checkout = b.checkout_date, guests = b.num_guests
     where id = cid and checkin is distinct from b.checkin_date;
  end if;
  return cid;
end $$;
revoke all on function public.cabana_chat_for_booking(uuid) from public, anon;
grant execute on function public.cabana_chat_for_booking(uuid) to authenticated;

create or replace function public.cabana_chat_set_trip(p_conversation uuid, p_checkin date, p_checkout date, p_guests integer)
returns void language plpgsql security definer set search_path = pg_catalog, public as $$
declare c public.chat_conversations := cabana_private.chat_mine(p_conversation);
begin
  if auth.uid() <> c.guest_id then raise exception 'Only the guest can change the trip details.' using errcode = '42501'; end if;
  if p_checkin is null or p_checkout is null or p_checkout <= p_checkin
     or p_checkin < (now() at time zone 'Africa/Nairobi')::date or p_checkout - p_checkin > 365
     or p_guests is null or p_guests not between 1 and 50 then
    raise exception 'Choose valid dates and guests.' using errcode = '22023';
  end if;
  if c.checkin is not distinct from p_checkin and c.checkout is not distinct from p_checkout and c.guests is not distinct from p_guests then return; end if;
  update public.chat_conversations set checkin = p_checkin, checkout = p_checkout, guests = p_guests where id = c.id;
  perform cabana_private.chat_post(c.id, c.guest_id, 'system',
    'Trip details: ' || cabana_private.fmt_range(p_checkin, p_checkout) || ' · ' || p_guests || case when p_guests = 1 then ' guest' else ' guests' end,
    jsonb_build_object('event', 'trip', 'checkin', p_checkin, 'checkout', p_checkout, 'guests', p_guests));
end $$;
revoke all on function public.cabana_chat_set_trip(uuid, date, date, integer) from public, anon;
grant execute on function public.cabana_chat_set_trip(uuid, date, date, integer) to authenticated;

-- ── 9. Read receipts ────────────────────────────────────────────────────────
create or replace function public.cabana_chat_mark_read(p_conversation uuid)
returns void language plpgsql security definer set search_path = pg_catalog, public as $$
declare c public.chat_conversations := cabana_private.chat_mine(p_conversation); me uuid := auth.uid();
begin
  if me = c.host_id then
    update public.chat_conversations set host_unread = 0, host_last_read_at = now() where id = c.id;
  else
    update public.chat_conversations set guest_unread = 0, guest_last_read_at = now() where id = c.id;
  end if;
  update public.chat_messages set read_at = now()
   where conversation_id = c.id and read_at is null and sender_id <> me
     and kind in ('text', 'offer', 'suggestion') and (visible_to is null or visible_to = me);
end $$;
revoke all on function public.cabana_chat_mark_read(uuid) from public, anon;
grant execute on function public.cabana_chat_mark_read(uuid) to authenticated;

-- ── 10. Archive and block ──────────────────────────────────────────────────
create or replace function public.cabana_chat_set_state(p_conversation uuid, p_action text)
returns jsonb language plpgsql security definer set search_path = pg_catalog, public as $$
declare c public.chat_conversations := cabana_private.chat_mine(p_conversation); me uuid := auth.uid();
  host boolean := auth.uid() = c.host_id;
begin
  if p_action = 'archive' then
    update public.chat_conversations set host_archived_at = case when host then now() else host_archived_at end,
      guest_archived_at = case when host then guest_archived_at else now() end where id = c.id;
  elsif p_action = 'unarchive' then
    update public.chat_conversations set host_archived_at = case when host then null else host_archived_at end,
      guest_archived_at = case when host then guest_archived_at else null end where id = c.id;
  elsif p_action = 'block' then
    if c.blocked_by is not null then return jsonb_build_object('ok', true); end if;
    if cabana_private.chat_contact_allowed(c.host_id, c.guest_id) then
      raise exception 'You have a paid booking together. Report the conversation instead, and our team will step in and keep the stay safe.'
        using errcode = 'P0001', hint = 'use_report';
    end if;
    update public.chat_conversations set blocked_by = me, blocked_at = now() where id = c.id;
    perform cabana_private.chat_post(c.id, me, 'notice',
      'You blocked this conversation. Neither of you can send messages here. You can unblock it at any time.',
      jsonb_build_object('event', 'blocked'), me);
  elsif p_action = 'unblock' then
    if c.blocked_by is distinct from me then raise exception 'Only the person who blocked this conversation can unblock it.' using errcode = '42501'; end if;
    update public.chat_conversations set blocked_by = null, blocked_at = null where id = c.id;
    perform cabana_private.chat_post(c.id, me, 'notice', 'You unblocked this conversation.', jsonb_build_object('event', 'unblocked'), me);
  else
    raise exception 'Unknown action' using errcode = '22023';
  end if;
  return jsonb_build_object('ok', true);
end $$;
revoke all on function public.cabana_chat_set_state(uuid, text) from public, anon;
grant execute on function public.cabana_chat_set_state(uuid, text) to authenticated;

-- ── 11. Private offers ─────────────────────────────────────────────────────
create or replace function public.cabana_chat_send_offer(
  p_conversation uuid, p_checkin date, p_checkout date, p_guests integer,
  p_nightly numeric, p_note text default null, p_valid_hours integer default 48)
returns jsonb language plpgsql security definer set search_path = pg_catalog, public as $$
declare
  c public.chat_conversations := cabana_private.chat_mine(p_conversation);
  l public.listings%rowtype; n int; rate numeric; nightly numeric; total numeric; fee numeric;
  o public.chat_offers%rowtype; mid uuid; exp timestamptz;
begin
  if auth.uid() <> c.host_id then raise exception 'Only the host can send an offer.' using errcode = '42501'; end if;
  if c.blocked_by is not null then raise exception 'This conversation is closed.' using errcode = '42501'; end if;
  select * into l from public.listings where id = c.listing_id and partner_id = c.host_id
     and is_active and status = 'active' and deleted_at is null and coalesce(service, 'stays') = 'stays'
     and coalesce(ownership_type, 'sole') <> 'held';
  if not found then raise exception 'This listing must be live to send an offer.' using errcode = '22023'; end if;
  if coalesce(nullif(l.currency, ''), 'KES') <> 'KES' then raise exception 'Offers currently support KES-priced stays.' using errcode = '22023'; end if;
  if p_checkin is null or p_checkout is null or p_checkout <= p_checkin
     or p_checkin < (now() at time zone 'Africa/Nairobi')::date then
    raise exception 'Choose valid dates for the offer.' using errcode = '22023';
  end if;
  n := p_checkout - p_checkin;
  if n < greatest(coalesce(l.min_nights, 1), 1) or n > 365 then
    raise exception 'This listing needs at least % nights. Lower the minimum stay on the listing to offer a shorter one.', greatest(coalesce(l.min_nights, 1), 1)
      using errcode = '22023';
  end if;
  if p_guests is null or p_guests < 1 or p_guests > coalesce(cabana_private.int_or_null(l.max_guests), 50) then
    raise exception 'Guest count is above this listing''s capacity.' using errcode = '22023';
  end if;
  rate := coalesce(l.price_night, l.price_per_night);
  nightly := round(coalesce(p_nightly, 0));
  if rate is null or rate <= 0 then raise exception 'Set a nightly price on the listing first.' using errcode = '22023'; end if;
  if nightly >= rate then raise exception 'An offer must be below your listed price of KES %.', to_char(rate, 'FM999,999,990') using errcode = '22023'; end if;
  if nightly < ceil(rate * 0.2) then raise exception 'That is more than 80%% off. Check the amount — the lowest you can offer is KES %.', to_char(ceil(rate * 0.2), 'FM999,999,990') using errcode = '22023'; end if;
  if not public.cabana_dates_available(l.id, p_checkin, p_checkout)
     or exists (select 1 from public.apartment_bookings b
                 where (b.listing_id = l.id or b.apartment_id = l.id::text) and b.cancelled_at is null
                   and b.status in ('paid_pending_checkin','deposit_paid','part_paid','checked_in','confirmed')
                   and b.checkin_date < p_checkout and b.checkout_date > p_checkin) then
    raise exception 'Those dates are already taken on your calendar.' using errcode = '22023';
  end if;
  perform cabana_private.chat_text_ok(p_note, c.host_id, c.guest_id);

  total := nightly * n;
  fee := case when total < 5000 then 300 else 800 end;
  exp := now() + make_interval(hours => least(greatest(coalesce(p_valid_hours, 48), 1), 168));

  update public.chat_offers set status = 'superseded', resolved_at = now()
   where conversation_id = c.id and status = 'sent';

  insert into public.chat_offers (conversation_id, listing_id, host_id, guest_id, checkin, checkout, guests,
    nightly, list_nightly, stay_total, note, expires_at)
  values (c.id, l.id, c.host_id, c.guest_id, p_checkin, p_checkout, p_guests, nightly, rate, total,
    nullif(left(trim(coalesce(p_note, '')), 500), ''), exp)
  returning * into o;

  mid := cabana_private.chat_post(c.id, c.host_id, 'offer',
    'Special offer: KES ' || to_char(nightly, 'FM999,999,990') || ' a night for ' || cabana_private.fmt_range(p_checkin, p_checkout)
      || ' (' || n || case when n = 1 then ' night' else ' nights' end || ')',
    jsonb_build_object('offer_id', o.id, 'listing_id', l.id, 'title', l.title, 'photo', l.photos[1],
      'checkin', p_checkin, 'checkout', p_checkout, 'guests', p_guests, 'nights', n,
      'nightly', nightly, 'list_nightly', rate, 'stay_total', total, 'service_fee', fee, 'grand_total', total + fee,
      'expires_at', exp, 'note', o.note));
  update public.chat_offers set message_id = mid where id = o.id;
  update public.chat_conversations set checkin = p_checkin, checkout = p_checkout, guests = p_guests where id = c.id;
  return jsonb_build_object('offer_id', o.id, 'message_id', mid);
end $$;
revoke all on function public.cabana_chat_send_offer(uuid, date, date, integer, numeric, text, integer) from public, anon;
grant execute on function public.cabana_chat_send_offer(uuid, date, date, integer, numeric, text, integer) to authenticated;

create or replace function public.cabana_chat_offer_respond(p_offer uuid, p_action text)
returns jsonb language plpgsql security definer set search_path = pg_catalog, public as $$
declare o public.chat_offers%rowtype; me uuid := auth.uid();
begin
  select * into o from public.chat_offers where id = p_offer for update;
  if not found or me not in (o.host_id, o.guest_id) then raise exception 'Offer not found' using errcode = '42501'; end if;
  if o.status <> 'sent' then return jsonb_build_object('status', o.status); end if;
  if p_action = 'withdraw' and me = o.host_id then
    update public.chat_offers set status = 'withdrawn', resolved_at = now() where id = o.id;
    perform cabana_private.chat_post(o.conversation_id, me, 'system', 'The host withdrew the special offer.', jsonb_build_object('event', 'offer_withdrawn', 'offer_id', o.id));
    return jsonb_build_object('status', 'withdrawn');
  elsif p_action = 'decline' and me = o.guest_id then
    update public.chat_offers set status = 'declined', resolved_at = now() where id = o.id;
    perform cabana_private.chat_post(o.conversation_id, me, 'system', 'The guest declined the special offer.', jsonb_build_object('event', 'offer_declined', 'offer_id', o.id));
    return jsonb_build_object('status', 'declined');
  end if;
  raise exception 'That action is not available.' using errcode = '42501';
end $$;
revoke all on function public.cabana_chat_offer_respond(uuid, text) from public, anon;
grant execute on function public.cabana_chat_offer_respond(uuid, text) to authenticated;

-- ── 12. "I can't host you — try these instead" ─────────────────────────────
-- Before anyone has paid, a host who cannot take a guest may point them at
-- other live Cabana stays: their own, a friend's, anyone's. No money moves
-- here, so there is no commission to game. Once a booking is PAID the same
-- need goes through the rehoming engine (/api/match-guest) instead, because
-- only that path carries the 24-hour law, the equal-price promise and the
-- refund guarantee. This function refuses a paid pair on purpose.
create or replace function cabana_private.chat_candidate(p_listing uuid, p_checkin date, p_checkout date, p_guests int, p_host uuid)
returns jsonb language sql stable security definer set search_path = pg_catalog, public as $$
  select jsonb_build_object('id', l.id, 'title', l.title, 'area', coalesce(nullif(l.area, ''), l.location), 'city', l.city,
    'price', coalesce(l.price_night, l.price_per_night), 'photo', l.photos[1], 'rating', l.avg_rating, 'reviews', l.review_count,
    'max_guests', cabana_private.int_or_null(l.max_guests), 'own', l.partner_id = p_host,
    'available', case when p_checkin is null then null else public.cabana_dates_available(l.id, p_checkin, p_checkout)
      and not exists (select 1 from public.apartment_bookings b where (b.listing_id = l.id or b.apartment_id = l.id::text)
        and b.cancelled_at is null and b.status in ('paid_pending_checkin','deposit_paid','part_paid','checked_in','confirmed')
        and b.checkin_date < p_checkout and b.checkout_date > p_checkin) end)
  from public.listings l where l.id = p_listing
$$;
revoke all on function cabana_private.chat_candidate(uuid, date, date, int, uuid) from public, anon, authenticated;

create or replace function cabana_private.listing_bookable(p_listing uuid)
returns boolean language sql stable security definer set search_path = pg_catalog, public as $$
  select exists (select 1 from public.listings l
    left join public.profiles p on p.id = l.partner_id
    where l.id = p_listing and l.is_active and l.status = 'active' and l.deleted_at is null
      and coalesce(l.service, 'stays') = 'stays' and coalesce(l.ownership_type, 'sole') <> 'held'
      and not coalesce(p.banned, false) and (p.suspended_until is null or p.suspended_until < now())
      and coalesce(p.host_status, 'active') not in ('suspended', 'banned'))
$$;
revoke all on function cabana_private.listing_bookable(uuid) from public, anon, authenticated;

create or replace function public.cabana_chat_suggest_candidates(p_conversation uuid, p_query text default null)
returns jsonb language plpgsql stable security definer set search_path = pg_catalog, public as $$
declare c public.chat_conversations := cabana_private.chat_mine(p_conversation); base public.listings%rowtype;
  q text := nullif(trim(coalesce(p_query, '')), '');
begin
  if auth.uid() <> c.host_id then raise exception 'Only the host can suggest stays.' using errcode = '42501'; end if;
  select * into base from public.listings where id = c.listing_id;
  return coalesce((select jsonb_agg(cabana_private.chat_candidate(x.id, c.checkin, c.checkout, c.guests, c.host_id) order by x.rank)
    from (select l.id, row_number() over (order by (l.partner_id = c.host_id) desc,
                   (l.city is not distinct from base.city) desc,
                   abs(coalesce(l.price_night, l.price_per_night, 0) - coalesce(base.price_night, base.price_per_night, 0)),
                   l.avg_rating desc nulls last) rank
            from public.listings l
           where l.id <> c.listing_id and cabana_private.listing_bookable(l.id)
             and (c.guests is null or coalesce(cabana_private.int_or_null(l.max_guests), 50) >= c.guests)
             and (case when q is not null
                    then (l.title || ' ' || coalesce(l.area, '') || ' ' || coalesce(l.city, '') || ' ' || coalesce(l.location, '')) ilike '%' || q || '%'
                    else (l.partner_id = c.host_id or l.city is not distinct from base.city or l.country is not distinct from base.country) end)
           order by rank limit 12) x), '[]'::jsonb);
end $$;
revoke all on function public.cabana_chat_suggest_candidates(uuid, text) from public, anon;
grant execute on function public.cabana_chat_suggest_candidates(uuid, text) to authenticated;

create or replace function public.cabana_chat_suggest(p_conversation uuid, p_listings uuid[], p_reason text, p_note text default null)
returns jsonb language plpgsql security definer set search_path = pg_catalog, public as $$
declare c public.chat_conversations := cabana_private.chat_mine(p_conversation); items jsonb; mid uuid; n int;
begin
  if auth.uid() <> c.host_id then raise exception 'Only the host can suggest stays.' using errcode = '42501'; end if;
  if c.blocked_by is not null then raise exception 'This conversation is closed.' using errcode = '42501'; end if;
  if cabana_private.chat_contact_allowed(c.host_id, c.guest_id) then
    raise exception 'This guest has a paid booking with you. Use "Can''t host this booking" so the rehoming protections apply.'
      using errcode = 'P0001', hint = 'use_rehome';
  end if;
  n := coalesce(cardinality(p_listings), 0);
  if n = 0 or n > 3 then raise exception 'Choose one to three stays.' using errcode = '22023'; end if;
  if c.listing_id = any(p_listings) then raise exception 'Choose stays other than this one.' using errcode = '22023'; end if;
  if exists (select 1 from unnest(p_listings) x where not cabana_private.listing_bookable(x)) then
    raise exception 'One of those stays is no longer bookable.' using errcode = '22023';
  end if;
  if p_reason not in ('dates_unavailable', 'better_fit', 'cannot_host') then p_reason := 'cannot_host'; end if;
  perform cabana_private.chat_text_ok(p_note, c.host_id, c.guest_id);
  select jsonb_agg(cabana_private.chat_candidate(x, c.checkin, c.checkout, c.guests, c.host_id)) into items from unnest(p_listings) x;
  mid := cabana_private.chat_post(c.id, c.host_id, 'suggestion',
    case p_reason when 'dates_unavailable' then 'Those dates aren''t available here. ' when 'better_fit' then 'This might suit you better. ' else 'I can''t host you this time. ' end
      || 'Suggested ' || n || case when n = 1 then ' other stay' else ' other stays' end || ' on Cabana.',
    jsonb_build_object('reason', p_reason, 'note', nullif(left(trim(coalesce(p_note, '')), 500), ''), 'listings', items,
      'checkin', c.checkin, 'checkout', c.checkout, 'guests', c.guests));
  return jsonb_build_object('message_id', mid);
end $$;
revoke all on function public.cabana_chat_suggest(uuid, uuid[], text, text) from public, anon;
grant execute on function public.cabana_chat_suggest(uuid, uuid[], text, text) to authenticated;

-- ── 13. Host response time (shown to guests, earned by hosts) ──────────────
create or replace function cabana_private.host_response(p_host uuid)
returns jsonb language sql stable security definer set search_path = pg_catalog, public as $$
  with m as (
    select cm.conversation_id, cm.sender_id, cm.created_at,
           lag(cm.sender_id) over (partition by cm.conversation_id order by cm.created_at) prev_sender
      from public.chat_messages cm join public.chat_conversations c on c.id = cm.conversation_id
     where c.host_id = p_host and cm.kind in ('text', 'offer', 'suggestion') and cm.visible_to is null
       and cm.created_at > now() - interval '90 days'),
  asks as (select conversation_id, created_at from m where sender_id <> p_host and (prev_sender is null or prev_sender = p_host)),
  answered as (select a.created_at asked,
      (select min(x.created_at) from m x where x.conversation_id = a.conversation_id and x.sender_id = p_host and x.created_at > a.created_at) replied
    from asks a where a.created_at < now() - interval '1 hour')
  select jsonb_build_object('samples', count(*), 'replied', count(replied),
    'median_minutes', round((percentile_cont(0.5) within group (order by extract(epoch from replied - asked) / 60))::numeric))
  from answered
$$;
revoke all on function cabana_private.host_response(uuid) from public, anon, authenticated;

-- ── 14. Inbox and thread, in one round trip each ───────────────────────────
create or replace function public.cabana_chat_inbox(p_limit integer default 150)
returns jsonb language sql stable security definer set search_path = pg_catalog, public as $$
  select coalesce(jsonb_agg(row order by (row->>'sort_at') desc nulls last), '[]'::jsonb) from (
    select jsonb_build_object(
      'id', c.id, 'listing_id', c.listing_id, 'listing_title', c.listing_title, 'listing_type', c.listing_type,
      'photo', l.photos[1],
      'role', case when c.host_id = auth.uid() then 'host' else 'guest' end,
      'counterpart', jsonb_build_object(
        'id', case when c.host_id = auth.uid() then c.guest_id else c.host_id end,
        'name', cabana_private.member_name(case when c.host_id = auth.uid() then c.guest_id else c.host_id end),
        'verified', coalesce((select verified from public.profiles where id = case when c.host_id = auth.uid() then c.guest_id else c.host_id end), false)),
      'last_message', c.last_message, 'last_message_at', c.last_message_at,
      'last_from_me', c.last_sender_id = auth.uid(),
      'unread', case when c.host_id = auth.uid() then c.host_unread else c.guest_unread end,
      'archived', case when c.host_id = auth.uid() then c.host_archived_at else c.guest_archived_at end is not null,
      'blocked', c.blocked_by is not null,
      'checkin', c.checkin, 'checkout', c.checkout, 'guests', c.guests,
      'booked', cabana_private.chat_contact_allowed(c.host_id, c.guest_id),
      'offer', (select o.status from public.chat_offers o where o.conversation_id = c.id order by o.created_at desc limit 1),
      'sort_at', coalesce(c.last_message_at, c.created_at)) row
    from public.chat_conversations c
    left join public.listings l on l.id = c.listing_id
    where auth.uid() in (c.host_id, c.guest_id)
      and (c.last_message is not null or c.guest_id = auth.uid())
    order by coalesce(c.last_message_at, c.created_at) desc
    limit least(greatest(coalesce(p_limit, 150), 1), 300)) t
$$;
revoke all on function public.cabana_chat_inbox(integer) from public, anon;
grant execute on function public.cabana_chat_inbox(integer) to authenticated;

create or replace function public.cabana_chat_thread(p_conversation uuid)
returns jsonb language plpgsql stable security definer set search_path = pg_catalog, public as $$
declare
  c public.chat_conversations := cabana_private.chat_mine(p_conversation);
  me uuid := auth.uid(); host boolean := auth.uid() = c.host_id; other uuid;
  l public.listings%rowtype; p public.profiles%rowtype; b public.apartment_bookings%rowtype; resp jsonb;
  stays int; hours numeric;
begin
  other := case when host then c.guest_id else c.host_id end;
  select * into l from public.listings where id = c.listing_id;
  select * into p from public.profiles where id = other;
  select * into b from public.apartment_bookings
   where guest_id = c.guest_id and (host_id = c.host_id or listing_id = c.listing_id) and cancelled_at is null
     and status in ('pending_payment','paid_pending_checkin','deposit_paid','part_paid','checked_in','confirmed')
     and checkout_date >= (now() at time zone 'Africa/Nairobi')::date - 1
   order by (status <> 'pending_payment') desc, checkin_date limit 1;
  if b.id is not null then
    hours := extract(epoch from ((b.checkin_date + coalesce(nullif(substring(l.checkin_time from '^\d{1,2}:\d{2}'), '')::time, time '14:00'))
               - (now() at time zone 'Africa/Nairobi'))) / 3600;
  end if;
  if not host then resp := cabana_private.host_response(c.host_id); end if;
  select count(*) into stays from public.apartment_bookings where guest_id = other and status = 'checked_in';

  return jsonb_build_object(
    'conversation', to_jsonb(c) - 'flag_reason',
    'role', case when host then 'host' else 'guest' end,
    'counterpart', jsonb_build_object('id', other, 'name', cabana_private.member_name(other),
      'verified', coalesce(p.verified, false), 'member_since', to_char(coalesce(p.created_at, now()), 'YYYY'),
      'stays', stays,
      'listings', (select count(*) from public.listings where partner_id = other and is_active and deleted_at is null)),
    'listing', case when l.id is null then null else jsonb_build_object('id', l.id, 'title', l.title, 'photo', l.photos[1],
      'area', coalesce(nullif(l.area, ''), l.location), 'city', l.city, 'price', coalesce(l.price_night, l.price_per_night),
      'currency', coalesce(nullif(l.currency, ''), 'KES'), 'rating', l.avg_rating, 'reviews', l.review_count,
      'checkin_time', l.checkin_time, 'checkout_time', l.checkout_time, 'min_nights', l.min_nights,
      'max_guests', cabana_private.int_or_null(l.max_guests), 'instant_book', l.instant_book, 'live', cabana_private.listing_bookable(l.id)) end,
    'booking', case when b.id is null then null else jsonb_build_object('id', b.id, 'status', b.status,
      'checkin', b.checkin_date, 'checkout', b.checkout_date, 'guests', b.num_guests, 'grand_total', b.grand_total,
      'amount_paid', b.amount_paid, 'hours_to_checkin', round(hours, 1),
      'paid', b.status <> 'pending_payment') end,
    'offers', coalesce((select jsonb_agg(jsonb_build_object('id', o.id, 'status',
        case when o.status = 'sent' and o.expires_at < now() then 'expired' else o.status end,
        'expires_at', o.expires_at, 'booking_id', o.booking_id) order by o.created_at)
      from public.chat_offers o where o.conversation_id = c.id), '[]'::jsonb),
    'contact_allowed', cabana_private.chat_contact_allowed(c.host_id, c.guest_id),
    'response', resp,
    'blocked_by_me', c.blocked_by = me,
    'blocked', c.blocked_by is not null);
end $$;
revoke all on function public.cabana_chat_thread(uuid) from public, anon;
grant execute on function public.cabana_chat_thread(uuid) to authenticated;

-- ── 15. Bookings speak into the conversation ───────────────────────────────
create or replace function cabana_private.chat_booking_events()
returns trigger language plpgsql security definer set search_path = pg_catalog, public as $$
declare
  paid text[] := array['paid_pending_checkin','deposit_paid','part_paid','checked_in','confirmed'];
  cid uuid; lid uuid; po uuid;
  was_paid boolean := tg_op = 'UPDATE' and old.status = any(paid);
  is_paid boolean := new.status = any(paid);
begin
  lid := coalesce(new.listing_id, case when new.apartment_id ~* '^[0-9a-f-]{36}$' then new.apartment_id::uuid end);
  select id into cid from public.chat_conversations where listing_id = lid and guest_id = new.guest_id;
  po := nullif(new.offer_snapshot->>'private_offer_id', '')::uuid;

  if is_paid and not was_paid then
    if po is not null then
      update public.chat_offers set status = 'accepted', booking_id = new.id, resolved_at = now()
       where id = po and status in ('sent', 'expired');
    end if;
    if cid is not null and new.status <> 'checked_in' then
      perform cabana_private.chat_post(cid, new.guest_id, 'booking',
        'Booking confirmed · ' || cabana_private.fmt_range(new.checkin_date, new.checkout_date) || ' · '
          || coalesce(new.num_guests, 1) || case when coalesce(new.num_guests, 1) = 1 then ' guest' else ' guests' end,
        jsonb_build_object('event', 'confirmed', 'booking_id', new.id, 'checkin', new.checkin_date, 'checkout', new.checkout_date,
          'guests', new.num_guests, 'private_offer_id', po));
    end if;
  elsif tg_op = 'UPDATE' and new.cancelled_at is not null and old.cancelled_at is null and was_paid and cid is not null then
    perform cabana_private.chat_post(cid, new.guest_id, 'booking',
      'Booking cancelled · ' || cabana_private.fmt_range(new.checkin_date, new.checkout_date),
      jsonb_build_object('event', 'cancelled', 'booking_id', new.id));
  end if;
  return new;
exception when others then
  -- A chat line must never be the reason a payment fails to record.
  raise warning 'chat_booking_events: %', sqlerrm;
  return new;
end $$;
drop trigger if exists chat_booking_events on public.apartment_bookings;
create trigger chat_booking_events after insert or update of status, cancelled_at on public.apartment_bookings
  for each row execute function cabana_private.chat_booking_events();

-- ── 16. Private offers are priced by the one quote everyone trusts ─────────
-- Same function body as before, plus: when the person asking is the guest a
-- host made a private offer to, for exactly those dates, that price competes
-- with public offers and the lowest wins. The booking trigger calls this same
-- function, so checkout, the booking row and the receipt cannot disagree.
create or replace function cabana_private.stay_quote(p_listing_id uuid, p_checkin date, p_checkout date, p_guests integer default 1)
 returns jsonb
 language plpgsql
 stable security definer
 set search_path to 'pg_catalog', 'public'
as $function$
declare l public.listings%rowtype; o record; n integer; rate numeric; baseline numeric; candidate numeric;
  best numeric; chosen jsonb; r jsonb; fee numeric; original_fee numeric; lead integer; terms text;
  who uuid; po public.chat_offers%rowtype;
begin
  select * into l from public.listings where id=p_listing_id and is_active=true and status='active'
    and deleted_at is null and coalesce(service,'stays')='stays' and coalesce(ownership_type,'sole')<>'held';
  if not found then raise exception 'This stay is not available'; end if;
  if p_checkin is null or p_checkout is null or p_checkin<(now() at time zone 'Africa/Nairobi')::date or p_checkout<=p_checkin then raise exception 'Choose valid stay dates'; end if;
  n:=p_checkout-p_checkin;
  if n<greatest(coalesce(l.min_nights,1),1) or n>365 then raise exception 'These dates do not meet the stay length rules'; end if;
  if p_guests is null or p_guests<1 or p_guests>coalesce(nullif(l.max_guests,'')::integer,50) then raise exception 'Guest count exceeds this stay capacity'; end if;
  if coalesce(nullif(l.currency,''),'KES')<>'KES' then raise exception 'Online stay checkout currently supports KES prices only'; end if;
  rate:=coalesce(l.price_night,l.price_per_night);
  if rate is null or rate<=0 or rate>=100000000 or rate::text='NaN' then raise exception 'This stay has no valid nightly price'; end if;
  terms:=cabana_private.stay_terms(l);
  r:=cabana_private.stay_reference(l.id,terms,'KES');
  best:=round(rate*n,2);
  for o in select s.*,c.title as campaign_title from public.stay_offers s
    left join public.stay_offer_campaigns c on c.id=s.campaign_id
    where s.listing_id=l.id and s.host_id=l.partner_id and s.status='active'
      and now()>=s.booking_start and now()<s.booking_end
      and p_checkin>=s.stay_start and p_checkout<=s.stay_end
      and n between s.min_nights and s.max_nights and s.currency='KES' and s.terms_key=terms
      and (s.campaign_id is null or (c.status='published' and now()>=c.booking_start and now()<c.booking_end
        and p_checkin>=c.stay_start and p_checkout<=c.stay_end
        and (cardinality(c.countries)=0 or l.country=any(c.countries))))
    order by s.created_at,s.id
  loop
    lead:=p_checkin-(now() at time zone o.timezone)::date;
    if lead<o.min_lead_days or lead>o.max_lead_days then continue; end if;
    if exists(select 1 from generate_series(0,n-1) d where not (extract(dow from p_checkin+d)::integer=any(o.weekdays)) or (p_checkin+d)=any(o.excluded_dates)) then continue; end if;
    baseline:=least(rate,o.reference_nightly,coalesce((r->>'nightly')::numeric,rate));
    candidate:=round(greatest(o.floor_nightly,round(baseline*(1-o.discount_pct/100),2))*n,2);
    -- A rate floor can reduce the effective discount, but never invent a saving.
    if candidate<best and candidate<round(baseline*n,2) then
      best:=candidate;
      chosen:=jsonb_build_object('id',o.id,'title',coalesce(o.campaign_title,o.title),'host_title',o.title,
        'campaign_id',o.campaign_id,'reference_total',round(baseline*n,2),'verified',((r->>'verified')::boolean
          and o.created_at>=now()-interval '30 days'
          and o.booking_end-o.booking_start<=interval '30 days'
          and not exists(select 1 from public.stay_offers prior
            where prior.listing_id=l.id and prior.id<>o.id and prior.created_at<=o.created_at
              and prior.booking_start<o.booking_end and prior.booking_end>o.booking_start-interval '30 days'
              and (prior.status<>'draft' or exists(select 1 from public.stay_offer_audit a
                where a.entity_id=prior.id and a.entity='stay_offers'
                  and (a.before_value->>'status'='active' or a.after_value->>'status'='active'))))),
        'stay_saving',round(baseline*n,2)-candidate,'effective_pct',round(100*(1-candidate/(baseline*n)),1),
        'booking_end',o.booking_end,'timezone',o.timezone);
    end if;
  end loop;

  -- A host's private offer from chat, for this guest and exactly these dates.
  who := coalesce(auth.uid(), nullif(current_setting('cabana.quote_guest', true), '')::uuid);
  if who is not null then
    select * into po from public.chat_offers
     where listing_id=l.id and guest_id=who and host_id=l.partner_id and status='sent' and expires_at>now()
       and checkin=p_checkin and checkout=p_checkout and p_guests<=guests
     order by nightly, created_at desc limit 1;
    if found then
      candidate:=round(least(po.nightly,rate)*n,2);
      if candidate<best then
        best:=candidate;
        chosen:=jsonb_build_object('id',null,'private_offer_id',po.id,'private',true,
          'title','Special offer from your host','host_title','Special offer','campaign_id',null,
          'reference_total',round(rate*n,2),'verified',false,
          'stay_saving',round(rate*n,2)-candidate,'effective_pct',round(100*(1-candidate/(rate*n)),1),
          'booking_end',po.expires_at,'timezone','Africa/Nairobi');
      end if;
    end if;
  end if;

  fee:=case when best<5000 then 300 else 800 end;
  if chosen is not null then
    original_fee:=case when (chosen->>'reference_total')::numeric<5000 then 300 else 800 end;
    chosen:=chosen||jsonb_build_object('total_saving',(chosen->>'reference_total')::numeric+original_fee-best-fee);
  end if;
  return jsonb_build_object('listing_id',l.id,'title',l.title,'currency','KES','checkin',p_checkin,'checkout',p_checkout,
    'guests',p_guests,'nights',n,'nightly',round(best/n,2),'stay_total',best,'service_fee',fee,'grand_total',best+fee,
    'offer',chosen,'quoted_at',now(),'terms_key',terms,'max_guests',coalesce(nullif(l.max_guests,'')::integer,50),
    'fingerprint',md5(jsonb_build_array(l.id,p_checkin,p_checkout,p_guests,best,fee,terms,coalesce(chosen->>'id',chosen->>'private_offer_id'))::text));
end $function$;

-- The booking trigger quotes for the guest on the row, so a booking written
-- by our server for a guest (not only by the guest's own browser) sees the
-- same private offer the guest was shown.
do $$
declare d text; patched text;
begin
  d := pg_get_functiondef('public.cabana_secure_apartment_booking()'::regprocedure);
  if position('cabana.quote_guest' in d) > 0 then return; end if;
  patched := replace(d, '  v_quote := cabana_private.stay_quote(',
    '  perform set_config(''cabana.quote_guest'', new.guest_id::text, true);' || chr(10) || '  v_quote := cabana_private.stay_quote(');
  if patched = d then raise exception 'cabana_secure_apartment_booking changed shape; patch by hand'; end if;
  execute patched;
end $$;

-- Offers lapse on their own; the quote already ignores expired ones.
do $$ begin
  perform cron.unschedule('cabana-chat-offer-expiry');
exception when others then null; end $$;
select cron.schedule('cabana-chat-offer-expiry', '*/30 * * * *',
  $$update public.chat_offers set status = 'expired', resolved_at = now() where status = 'sent' and expires_at < now()$$);

-- ── 17. Notifications are written by the server only ───────────────────────
drop policy if exists "op_notifications_insert" on public.notifications;
drop policy if exists "service insert notifications" on public.notifications;
drop policy if exists "service_insert_notif" on public.notifications;
revoke all on public.notifications from anon;
revoke insert, update, delete, truncate, references, trigger on public.notifications from authenticated;
grant select on public.notifications to authenticated;
grant update (read) on public.notifications to authenticated;

-- ── 18. Trust fields on a profile are not self-service ─────────────────────
create or replace function cabana_private.profile_guard()
returns trigger language plpgsql security invoker set search_path = pg_catalog, public as $$
begin
  if current_user not in ('authenticated', 'anon') or public.is_operator() then return new; end if;
  if tg_op = 'INSERT' then
    new.verified := false; new.verified_at := null; new.banned := false; new.banned_at := null; new.ban_reason := null;
    new.suspended_at := null; new.suspended_until := null; new.suspension_reason := null;
    new.host_suspended_at := null; new.trust_score := 70; new.flags := 0; new.reported := false;
    new.phone_verified := false; new.id_verification_status := 'not_started'; new.host_status := 'active';
    new.status := 'active';
  else
    new.id := old.id;
    new.verified := old.verified; new.verified_at := old.verified_at;
    new.banned := old.banned; new.banned_at := old.banned_at; new.ban_reason := old.ban_reason;
    new.suspended_at := old.suspended_at; new.suspended_until := old.suspended_until; new.suspension_reason := old.suspension_reason;
    new.host_status := old.host_status; new.host_suspended_at := old.host_suspended_at;
    new.trust_score := old.trust_score; new.flags := old.flags; new.reported := old.reported;
    new.phone_verified := old.phone_verified; new.id_verification_status := old.id_verification_status;
    new.status := old.status; new.created_at := old.created_at;
  end if;
  return new;
end $$;
drop trigger if exists profile_guard on public.profiles;
create trigger profile_guard before insert or update on public.profiles
  for each row execute function cabana_private.profile_guard();

grant execute on function cabana_private.chat_conv_before_insert(), cabana_private.chat_message_immutable(), cabana_private.profile_guard() to authenticated;
