-- Applied to production as a follow-up to chat_v6_core: messages written in the
-- same transaction (a withheld message and its private notice) need distinct,
-- ordered timestamps, so both writers use clock_timestamp(). The core file
-- already contains this; this file records the production step.

create or replace function cabana_private.chat_before_insert()
returns trigger language plpgsql security definer set search_path = pg_catalog, public as $$
declare
  c public.chat_conversations%rowtype;
  allowed boolean; g jsonb; hard text[]; prev text[]; prev_ids uuid[]; spans boolean := false;
  strikes int; withheld text :=
    'Message withheld. It looked like it contained contact or payment details, which can only be shared once a booking is paid on Cabana.';
begin
  if current_user not in ('authenticated', 'anon') then return new; end if;

  new.kind := 'text'; new.payload := null; new.visible_to := null; new.is_system := false;
  new.content_raw := null; new.was_scrubbed := false; new.flags := '{}';
  new.read_at := null; new.created_at := clock_timestamp();
  new.content := btrim(regexp_replace(coalesce(new.content, ''), '[\u0001-\u0008\u000B\u000C\u000E-\u001F\u007F]', '', 'g'));
  if length(new.content) = 0 then raise exception 'Write a message first.' using errcode = '22023'; end if;
  if length(new.content) > 2000 then raise exception 'Messages can be up to 2,000 characters.' using errcode = '22023'; end if;

  select * into c from public.chat_conversations where id = new.conversation_id;
  if not found or new.sender_id not in (c.host_id, c.guest_id) then
    raise exception 'Conversation not found' using errcode = '42501';
  end if;
  if c.blocked_by is not null or c.status = 'blocked' then
    raise exception 'This conversation is closed.' using errcode = '42501';
  end if;

  if (select count(*) from public.chat_messages
       where sender_id = new.sender_id and created_at > now() - interval '1 minute') >= 20
     or (select count(*) from public.chat_messages
       where sender_id = new.sender_id and created_at > now() - interval '1 day') >= 500 then
    raise exception 'You are sending messages very quickly. Please wait a moment and try again.'
      using errcode = 'P0001', hint = 'rate_limited';
  end if;
  if (select count(*) from public.chat_violations
       where user_id = new.sender_id and created_at > now() - interval '24 hours') >= 5 then
    raise exception 'Messaging is paused for a few hours after repeated attempts to share contact details. Our Trust team has been notified.'
      using errcode = 'P0001', hint = 'cooldown';
  end if;

  allowed := cabana_private.chat_contact_allowed(c.host_id, c.guest_id);
  g := cabana_private.chat_guard(new.content, allowed);
  hard := array(select jsonb_array_elements_text(g->'hard'));

  select array_agg(content order by created_at), array_agg(id order by created_at)
    into prev, prev_ids
    from (select content, id, created_at from public.chat_messages
           where conversation_id = c.id and sender_id = new.sender_id and kind = 'text'
             and created_at > now() - interval '30 minutes'
           order by created_at desc limit 6) recent;
  if cardinality(hard) = 0 then
    spans := cabana_private.chat_guard_spans(prev, new.content, allowed);
    if spans then hard := array['phone']; end if;
  end if;

  if cardinality(hard) > 0 then
    new.content_raw := new.content;
    new.content := withheld;
    new.kind := 'withheld';
    new.was_scrubbed := true;
    new.flags := hard;
    if spans then
      update public.chat_messages
         set content_raw = coalesce(content_raw, content), content = withheld, kind = 'withheld',
             was_scrubbed = true, flags = array['phone']
       where id = any(prev_ids) and cabana_private.chat_guard_fragment(content) <> '';
    end if;
    insert into public.chat_violations (user_id, conversation_id, message_id, categories, excerpt)
    values (new.sender_id, c.id, new.id, hard, left(new.content_raw, 500));

    select count(*) into strikes from public.chat_violations
     where user_id = new.sender_id and created_at > now() - interval '30 days';
    insert into public.chat_messages (conversation_id, sender_id, content, kind, visible_to, is_system, created_at, payload)
    values (c.id, new.sender_id,
      case when strikes >= 3
        then 'Your messages keep including contact or payment details, so this conversation has been sent to our Trust team for review. Everything you need can be arranged here, and once a booking is paid you can share a phone number for arrival.'
        else 'We withheld that message: ' || coalesce((select string_agg(r, ' ') from (select
            case x when 'phone' then 'phone numbers' when 'email' then 'email addresses' when 'link' then 'outside links'
                   when 'social' then 'social handles and messaging apps' when 'payment' then 'payment details'
                   else 'arranging payment outside Cabana' end r from unnest(hard) x limit 1) s), 'contact details')
          || ' can''t be shared before a booking is paid. It keeps both of you protected: payments made outside Cabana aren''t covered.' end,
      'notice', new.sender_id, true, clock_timestamp() + interval '1 millisecond',
      jsonb_build_object('tone', case when strikes >= 3 then 'serious' else 'info' end, 'categories', to_jsonb(hard)));

    if strikes >= 3 then
      update public.chat_conversations
         set flagged_at = coalesce(flagged_at, now()), flag_reason = 'repeated_contact_attempts'
       where id = c.id;
      if strikes = 3 then
        insert into public.ops_alerts (kind, severity, title, body, meta)
        values ('chat_contact_attempts', 'warning',
          'Repeated off-platform attempts in chat',
          cabana_private.member_name(new.sender_id) || ' has had ' || strikes || ' messages withheld in 30 days.',
          jsonb_build_object('user_id', new.sender_id, 'conversation_id', c.id, 'categories', to_jsonb(hard)));
      end if;
    end if;
  else
    new.flags := array(select jsonb_array_elements_text(g->'soft'));
  end if;
  return new;
end $$;
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
