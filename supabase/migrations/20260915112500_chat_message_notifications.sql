-- Create the in-app notification in the same transaction as the message.
create or replace function public.cabana_notify_chat_recipient()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  conversation public.chat_conversations%rowtype;
  recipient uuid;
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
  return new;
end;
$$;

revoke all on function public.cabana_notify_chat_recipient() from public, anon, authenticated;
drop trigger if exists cabana_chat_message_notification on public.chat_messages;
create trigger cabana_chat_message_notification
after insert on public.chat_messages
for each row execute function public.cabana_notify_chat_recipient();
