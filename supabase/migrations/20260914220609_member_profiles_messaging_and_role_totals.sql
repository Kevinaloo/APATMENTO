-- Additive member cards: private account records remain private.
create table public.member_public_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (length(display_name) between 1 and 60),
  bio text not null default '' check (length(bio) <= 240),
  published boolean not null default false,
  updated_at timestamptz not null default now()
);
alter table public.member_public_profiles enable row level security;
revoke all on public.member_public_profiles from public, anon, authenticated;
grant select, insert, update, delete on public.member_public_profiles to service_role;
create policy member_profiles_service on public.member_public_profiles
  for all to service_role using (true) with check (true);

-- This service-only projection needs auth.users solely to validate the invited
-- ambassador's confirmed, current email. It never returns that email or KYC data.
create or replace function public.cabana_public_role_badges(p_member uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(role order by priority), '[]'::jsonb) from (
    select 'traveller'::text role, 1 priority
      where exists (select 1 from auth.users where id=p_member and deleted_at is null)
    union all select 'host', 2 where exists (
      select 1 from public.listings where partner_id=p_member and is_active and status='active' and deleted_at is null)
    union all select 'agent', 3 where exists (
      select 1 from public.agents where id=p_member and not suspended)
    union all select 'influencer', 4 where exists (
      select 1 from public.agents where id=p_member and is_creator and not suspended)
    union all select 'ambassador', 5 where exists (
      select 1 from public.ambassadors a
      join auth.users u on u.id=a.id
      join public.ambassador_allowlist invited on invited.email=lower(u.email)
      where a.id=p_member and a.status='active' and invited.revoked_at is null
        and u.email_confirmed_at is not null and u.deleted_at is null)
  ) roles where exists (select 1 from auth.users where id=p_member and deleted_at is null);
$$;
revoke all on function public.cabana_public_role_badges(uuid) from public, anon, authenticated;
grant execute on function public.cabana_public_role_badges(uuid) to service_role;

-- Profile editing must not let an agent verify or unsuspend themselves.
revoke update on public.agents from anon, authenticated;
grant update (full_name, phone, contact_method, contact_value, bio, avatar_url,
  is_creator, social_handle, social_platform, audience_size, updated_at)
  on public.agents to authenticated;

-- All-time totals are separate from the bounded recent-activity feed.
create or replace function public.cabana_agent_totals(p_agent uuid)
returns jsonb language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object(
    'approved',(select count(*) from public.agent_partnerships where agent_id=p_agent and status='approved'),
    'pending',(select count(*) from public.agent_partnerships where agent_id=p_agent and status='pending'),
    'live_leads',count(*) filter(where status='clicked'),
    'bookings',count(*) filter(where status='converted'),
    'earned',coalesce(sum(commission) filter(where status='converted'),0))
  from public.agent_referrals where agent_id=p_agent;
$$;
revoke all on function public.cabana_agent_totals(uuid) from public, anon, authenticated;
grant execute on function public.cabana_agent_totals(uuid) to service_role;

create or replace function public.cabana_ambassador_totals()
returns jsonb language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object(
    'total',coalesce(sum(commission_kes) filter(where status='confirmed'),0),
    'available',coalesce(sum(commission_kes) filter(where status='confirmed' and coalesce(available_at,created_at)<=now()),0),
    'on_hold',coalesce(sum(commission_kes) filter(where status='confirmed' and available_at>now()),0),
    'pending',coalesce(sum(commission_kes) filter(where status='pending_checkin'),0),
    'reversed',coalesce(sum(commission_kes) filter(where status='reversed'),0),
    'bookings',count(*) filter(where status='confirmed'))
  from public.referral_earnings where referrer_id=(select auth.uid());
$$;
revoke all on function public.cabana_ambassador_totals() from public, anon;
grant execute on function public.cabana_ambassador_totals() to authenticated, service_role;

-- Messages are append-only for participants. A sender cannot impersonate the
-- other participant or manufacture a system message, even via direct REST.
drop policy if exists message_participants on public.chat_messages;
drop policy if exists msg_sel on public.chat_messages;
drop policy if exists msg_ins on public.chat_messages;
create policy chat_messages_read on public.chat_messages for select to authenticated
using (exists (select 1 from public.chat_conversations c where c.id=conversation_id
  and (c.host_id=(select auth.uid()) or c.guest_id=(select auth.uid()))));
create policy chat_messages_send on public.chat_messages for insert to authenticated
with check (sender_id=(select auth.uid()) and not coalesce(is_system,false) and content_raw is null
  and length(trim(content)) between 1 and 8000
  and exists (select 1 from public.chat_conversations c where c.id=conversation_id
    and c.status in ('active','open') and (c.host_id=(select auth.uid()) or c.guest_id=(select auth.uid()))));
revoke all on public.chat_messages from anon, authenticated;
grant select(id,conversation_id,sender_id,content,was_scrubbed,is_system,read_at,created_at),
  insert(conversation_id,sender_id,content,was_scrubbed,is_system)
  on public.chat_messages to authenticated;

-- The row lock and single database transaction avoid lost unread increments.
-- Trigger execution is internal; no client can call this to manufacture activity.
create or replace function public.cabana_chat_message_summary()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.chat_conversations set
    last_message=left(new.content,60), last_message_at=new.created_at,
    last_sender_id=new.sender_id,
    host_unread=coalesce(host_unread,0)+case when new.sender_id<>host_id then 1 else 0 end,
    guest_unread=coalesce(guest_unread,0)+case when new.sender_id<>guest_id then 1 else 0 end
  where id=new.conversation_id;
  return new;
end;
$$;
revoke all on function public.cabana_chat_message_summary() from public, anon, authenticated;
create trigger cabana_chat_message_summary after insert on public.chat_messages
  for each row execute function public.cabana_chat_message_summary();

-- Participants may only reset their own unread count; changing ownership or
-- status is reserved for the server's booking lifecycle.
drop policy if exists conversation_participants on public.chat_conversations;
drop policy if exists conv_sel on public.chat_conversations;
drop policy if exists conv_ins on public.chat_conversations;
drop policy if exists conv_upd on public.chat_conversations;
create policy chat_conversations_read on public.chat_conversations for select to authenticated
  using (host_id=(select auth.uid()) or guest_id=(select auth.uid()));
create policy chat_conversations_start on public.chat_conversations for insert to authenticated
  with check (guest_id=(select auth.uid()) and host_id<>guest_id
    and exists (select 1 from public.listings l where l.id=chat_conversations.listing_id
      and l.partner_id=chat_conversations.host_id and l.is_active and l.deleted_at is null));
create policy chat_conversations_mark_read on public.chat_conversations for update to authenticated
  using (host_id=(select auth.uid()) or guest_id=(select auth.uid()))
  with check (host_id=(select auth.uid()) or guest_id=(select auth.uid()));
revoke all on public.chat_conversations from anon, authenticated;
grant select, insert(listing_id,listing_type,listing_title,host_id,guest_id),
  update(host_unread,guest_unread) on public.chat_conversations to authenticated;
create or replace function public.cabana_chat_read_guard()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if current_user='authenticated' then
    if (auth.uid()=new.host_id and (new.host_unread is distinct from 0 or new.guest_unread is distinct from old.guest_unread))
      or (auth.uid()=new.guest_id and (new.guest_unread is distinct from 0 or new.host_unread is distinct from old.host_unread)) then
      raise exception 'You may only mark your own messages as read' using errcode='42501';
    end if;
  end if;
  return new;
end;
$$;
revoke all on function public.cabana_chat_read_guard() from public, anon, authenticated;
create trigger cabana_chat_read_guard before update on public.chat_conversations
  for each row execute function public.cabana_chat_read_guard();
