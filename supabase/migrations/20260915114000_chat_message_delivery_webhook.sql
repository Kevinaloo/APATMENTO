-- Send push/email from the database event, so delivery does not depend on
-- a guest keeping the page open or having the newest cached JavaScript.
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
begin
  if new.is_system is true then return new; end if;
  select * into conversation from public.chat_conversations where id = new.conversation_id;
  if not found then return new; end if;
  recipient := case when new.sender_id = conversation.host_id then conversation.guest_id else conversation.host_id end;
  if recipient is null or recipient = new.sender_id then return new; end if;

  insert into public.notifications (user_id, title, body, url, kind, meta)
  select recipient,
         case when coalesce(conversation.listing_title, '') <> ''
           then 'New message about ' || left(conversation.listing_title, 80)
           else 'New Cabana message' end,
         left(regexp_replace(coalesce(new.content, ''), '\\s+', ' ', 'g'), 140),
         '/dashboard.html?inbox=1', 'message',
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
