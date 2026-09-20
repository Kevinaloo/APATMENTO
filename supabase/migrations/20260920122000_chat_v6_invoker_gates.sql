-- Production follow-up to chat_v6_core. The first version of these triggers
-- was SECURITY DEFINER and branched on current_user — which, inside a definer
-- function, is always the owner. Every insert looked "trusted" and the guard
-- never ran. Caught by tests/chat-v6.sql before any member sent a message
-- through it. The core file now contains the corrected versions; this file
-- records the production step.

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

create or replace function cabana_private.chat_message_immutable()
returns trigger language plpgsql security invoker set search_path = pg_catalog, public as $$
begin
  if current_user in ('authenticated', 'anon') then
    raise exception 'Messages cannot be edited.' using errcode = '42501';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end $$;

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
grant execute on function cabana_private.chat_conv_before_insert(), cabana_private.chat_message_immutable(), cabana_private.profile_guard() to authenticated;
