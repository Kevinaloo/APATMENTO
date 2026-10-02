-- The Rooms Pass is checked where a room conversation starts. A guest who
-- opened one before the pass existed (or whose pass ran out) could keep
-- writing to the host, so the check also runs on every guest message in a
-- room conversation. Hosts always reply freely; system messages pass.
create or replace function cabana_private.rooms_pass_on_send()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare c public.chat_conversations%rowtype; v_room boolean;
begin
  if coalesce(new.is_system, false) or new.sender_id is null then return new; end if;
  select * into c from public.chat_conversations where id = new.conversation_id;
  if not found or new.sender_id is distinct from c.guest_id then return new; end if;
  select exists (select 1 from public.listings l where l.id::text = c.listing_id::text
                   and (coalesce(l.service, '') = 'roommates' or coalesce(l.type, '') = 'room'))
    into v_room;
  if v_room and not public.cabana_rooms_pass_active(new.sender_id) and not coalesce(public.is_admin(), false) then
    raise exception 'Unlock Cabana Rooms to message room hosts.' using errcode = 'P0001', hint = 'rooms_pass_required';
  end if;
  return new;
end $$;
revoke all on function cabana_private.rooms_pass_on_send() from public, anon, authenticated;
create or replace trigger cabana_aa_rooms_pass_on_send before insert on public.chat_messages
  for each row execute function cabana_private.rooms_pass_on_send();
