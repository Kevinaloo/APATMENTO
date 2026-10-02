-- ═══════════════════════════════════════════════════════════════════════
-- CABANA · CONTACTS STAY PRIVATE, AND THE ROOMS PASS
-- ───────────────────────────────────────────────────────────────────────
-- 1. A host's WhatsApp, phone and email were promised private until a
--    guest pays ("Contact details released after payment"), but the
--    listings table is public and carried them in plain columns, so any
--    visitor could read every host's number from the API and arrange the
--    stay elsewhere. A booking row also stamped those numbers the moment
--    it was created, unpaid, where the guest could read them back.
--
--    Stay and room contacts now live in listing_private_contacts, which
--    only the owner and admins can read. The listings columns are emptied
--    on every write for those services, and a booking receives the host's
--    details only when it is actually confirmed (deposit cleared and the
--    dates or rooms held). Kitchens keep their public order line: a diner
--    is meant to be able to call a restaurant.
--
-- 2. Event organisers' phone, WhatsApp and email were readable by anyone
--    through the approved-organiser policy. Those three columns are no
--    longer granted to the API roles; the owner and admins read them
--    through a function.
--
-- 3. Cabana Rooms (roommates) is a membership: KES 100 (about $1) unlocks
--    every room listing for 30 days. Messaging a room host requires an
--    active pass, enforced where the conversation is opened, not in the
--    page. Renewing early stacks onto the time already paid for.
-- ═══════════════════════════════════════════════════════════════════════

-- ── 1 · stay and room contacts ────────────────────────────────────────
create table if not exists public.listing_private_contacts (
  listing_id       uuid primary key,
  contact_whatsapp text,
  contact_phone    text,
  contact_email    text,
  updated_at       timestamptz not null default now()
);
alter table public.listing_private_contacts enable row level security;
revoke all on public.listing_private_contacts from public, anon, authenticated;
grant select on public.listing_private_contacts to authenticated;
grant all on public.listing_private_contacts to service_role;
do $$ begin
  create policy listing_private_contacts_owner on public.listing_private_contacts for select to authenticated
    using (exists (select 1 from public.listings l where l.id = listing_id
                    and (l.partner_id = (select auth.uid()) or l.host_id = (select auth.uid())))
           or (select public.is_admin()));
exception when duplicate_object then null; end $$;

create or replace function cabana_private.listing_contacts_private()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if coalesce(new.service, 'stays') not in ('stays', 'roommates') then return new; end if;
  if new.contact_whatsapp is not null or new.contact_phone is not null or new.contact_email is not null then
    insert into public.listing_private_contacts (listing_id, contact_whatsapp, contact_phone, contact_email, updated_at)
    values (new.id, nullif(btrim(new.contact_whatsapp), ''), nullif(btrim(new.contact_phone), ''),
            nullif(lower(btrim(new.contact_email)), ''), now())
    on conflict (listing_id) do update set
      contact_whatsapp = coalesce(excluded.contact_whatsapp, listing_private_contacts.contact_whatsapp),
      contact_phone    = coalesce(excluded.contact_phone, listing_private_contacts.contact_phone),
      contact_email    = coalesce(excluded.contact_email, listing_private_contacts.contact_email),
      updated_at       = now();
    new.contact_whatsapp := null;
    new.contact_phone := null;
    new.contact_email := null;
  end if;
  return new;
end $$;
revoke all on function cabana_private.listing_contacts_private() from public, anon, authenticated;
create or replace trigger trg_zzzzz_listing_contacts_private before insert or update on public.listings
  for each row execute function cabana_private.listing_contacts_private();

-- Move what is already there (the trigger does the moving).
update public.listings set contact_whatsapp = contact_whatsapp
 where coalesce(service, 'stays') in ('stays', 'roommates')
   and (contact_whatsapp is not null or contact_phone is not null or contact_email is not null);

-- An unpaid booking learns nothing about how to reach the host.
do $$
declare d text; p text;
begin
  d := pg_get_functiondef('public.cabana_secure_apartment_booking()'::regprocedure);
  if position('contacts arrive on confirmation' in d) > 0 then return; end if;
  p := replace(d,
    $x$  new.contact_whatsapp := v_listing.contact_whatsapp;
  new.contact_phone    := v_listing.contact_phone;
  new.contact_email    := v_listing.contact_email;$x$,
    $x$  -- contacts arrive on confirmation, in cabana_settle_booking
  new.contact_whatsapp := null;
  new.contact_phone    := null;
  new.contact_email    := null;$x$);
  if p = d then raise exception 'cabana_secure_apartment_booking changed shape'; end if;
  execute p;
end $$;

-- A confirmed booking does.
do $$
declare d text; p text;
begin
  d := pg_get_functiondef('public.cabana_settle_booking(text)'::regprocedure);
  if position('listing_private_contacts' in d) > 0 then return; end if;
  p := replace(d,
    $x$  return jsonb_build_object(
    'ok', true,
    'kind', b.booking_kind,$x$,
    $x$  if not v_lost and v_status in ('confirmed_balance_due', 'paid_pending_checkin') then
    update public.apartment_bookings x
       set contact_whatsapp = coalesce(x.contact_whatsapp, pc.contact_whatsapp, l.contact_whatsapp),
           contact_phone    = coalesce(x.contact_phone, pc.contact_phone, l.contact_phone),
           contact_email    = coalesce(x.contact_email, pc.contact_email, l.contact_email)
      from public.listings l
      left join public.listing_private_contacts pc on pc.listing_id = l.id
     where x.id = b.id and l.id = b.listing_id;
  end if;

  return jsonb_build_object(
    'ok', true,
    'kind', b.booking_kind,$x$);
  if p = d then raise exception 'cabana_settle_booking changed shape'; end if;
  execute p;
end $$;

-- Paid bookings made before this change still hold their numbers; unpaid
-- ones made before it do not keep them.
update public.apartment_bookings
   set contact_whatsapp = null, contact_phone = null, contact_email = null
 where status in ('pending_payment', 'part_paid') and cancelled_at is null
   and (contact_whatsapp is not null or contact_phone is not null or contact_email is not null);

do $$
declare d text; p text;
begin
  d := pg_get_functiondef('public.ambassador_claim_lead(text, text, text, text, text, text, text, text)'::regprocedure);
  if position('listing_private_contacts' in d) = 0 then
    p := replace(d,
      $x$         or public.normalise_contact(l.contact_whatsapp,'phone')=v_key) then$x$,
      $x$         or public.normalise_contact(l.contact_whatsapp,'phone')=v_key)
       or exists(select 1 from public.listing_private_contacts pc
                  where public.normalise_contact(pc.contact_phone,'phone')=v_key
                     or public.normalise_contact(pc.contact_whatsapp,'phone')=v_key) then$x$);
    if p <> d then execute p; end if;
  end if;

  d := pg_get_functiondef('public.admin_booking(uuid)'::regprocedure);
  if position('listing_private_contacts' in d) = 0 then
    p := replace(d, $x$'contact_phone',l.contact_phone)$x$,
      $x$'contact_phone',coalesce((select pc.contact_phone from public.listing_private_contacts pc where pc.listing_id = l.id), l.contact_phone))$x$);
    if p <> d then execute p; end if;
  end if;
exception when undefined_function then null;
end $$;

-- ── 2 · organisers' contacts ──────────────────────────────────────────
revoke select on public.event_organisers from anon, authenticated;
grant select (id, owner_id, slug, name, tagline, bio, logo_url, instagram, city, kind, status, verified,
              verified_at, review_note, created_at, updated_at) on public.event_organisers to anon, authenticated;

create or replace function public.event_organiser_contacts(p_ids bigint[] default null)
returns table (id bigint, phone text, whatsapp text, email text)
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select o.id, o.phone, o.whatsapp, o.email from public.event_organisers o
   where (p_ids is null or o.id = any (p_ids))
     and (o.owner_id = auth.uid() or coalesce(public.is_admin(), false));
$$;
revoke all on function public.event_organiser_contacts(bigint[]) from public, anon;
grant execute on function public.event_organiser_contacts(bigint[]) to authenticated;

-- ── 3 · the Rooms pass ────────────────────────────────────────────────
insert into cabana_private.policy (key, num, note) values
  ('rooms_pass_kes', 100, 'Price of 30 days of Cabana Rooms access'),
  ('rooms_pass_days', 30, 'Days one pass unlocks')
on conflict (key) do nothing;

create table if not exists public.roommate_passes (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  payment_reference text not null unique,
  currency          text not null default 'KES',
  grand_total       numeric not null check (grand_total > 0),
  amount_paid       numeric not null default 0,
  payment_mode      text not null default 'full',
  status            text not null default 'pending_payment'
                    check (status in ('pending_payment', 'active', 'expired', 'cancelled')),
  starts_at         timestamptz,
  ends_at           timestamptz,
  created_at        timestamptz not null default now(),
  paid_at           timestamptz
);
create index if not exists roommate_passes_user_idx on public.roommate_passes (user_id, ends_at desc);
alter table public.roommate_passes enable row level security;
revoke all on public.roommate_passes from public, anon, authenticated;
grant select on public.roommate_passes to authenticated;
grant all on public.roommate_passes to service_role;
do $$ begin
  create policy roommate_passes_own on public.roommate_passes for select to authenticated
    using (user_id = (select auth.uid()) or (select public.is_admin()));
exception when duplicate_object then null; end $$;

create or replace function public.cabana_rooms_pass_active(p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select p_user is not null and exists (
    select 1 from public.roommate_passes p
     where p.user_id = p_user and p.status = 'active' and p.starts_at <= now() and p.ends_at > now());
$$;
revoke all on function public.cabana_rooms_pass_active(uuid) from public, anon;
grant execute on function public.cabana_rooms_pass_active(uuid) to authenticated, service_role;

create or replace function public.rooms_pass_status()
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare me uuid := auth.uid(); v_end timestamptz; v_pending text;
begin
  if me is not null then
    select max(ends_at) into v_end from public.roommate_passes
     where user_id = me and status = 'active' and ends_at > now();
    select payment_reference into v_pending from public.roommate_passes
     where user_id = me and status = 'pending_payment' and created_at > now() - interval '30 minutes'
     order by created_at desc limit 1;
  end if;
  return jsonb_build_object('signed_in', me is not null, 'active', v_end is not null, 'ends_at', v_end,
    'days_left', case when v_end is not null then greatest(0, ceil(extract(epoch from (v_end - now())) / 86400)) end,
    'price_kes', cabana_private.policy_num('rooms_pass_kes', 100), 'price_usd', 1,
    'days', cabana_private.policy_num('rooms_pass_days', 30), 'pending_reference', v_pending);
end $$;
revoke all on function public.rooms_pass_status() from public;
grant execute on function public.rooms_pass_status() to anon, authenticated;

create or replace function public.rooms_pass_start()
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare me uuid := auth.uid(); p public.roommate_passes%rowtype; v_price numeric := cabana_private.policy_num('rooms_pass_kes', 100);
begin
  if me is null then raise exception 'Sign in to unlock Cabana Rooms' using errcode = '42501'; end if;
  select * into p from public.roommate_passes
   where user_id = me and status = 'pending_payment' and created_at > now() - interval '30 minutes' and grand_total = v_price
   order by created_at desc limit 1;
  if not found then
    insert into public.roommate_passes (user_id, payment_reference, grand_total)
    values (me, 'RPASS-' || replace(me::text, '-', '') || '-' || (extract(epoch from clock_timestamp()) * 1000)::bigint, v_price)
    returning * into p;
  end if;
  return jsonb_build_object('reference', p.payment_reference, 'amount', p.grand_total, 'currency', 'KES',
    'days', cabana_private.policy_num('rooms_pass_days', 30));
end $$;
revoke all on function public.rooms_pass_start() from public, anon;
grant execute on function public.rooms_pass_start() to authenticated;

create or replace function cabana_private.settle_rooms_pass(p_ref text)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare p public.roommate_passes%rowtype; v_paid numeric; v_from timestamptz;
  v_days integer := cabana_private.policy_num('rooms_pass_days', 30)::integer;
begin
  select * into p from public.roommate_passes where payment_reference = p_ref for update;
  if not found then return; end if;
  select coalesce(sum(amount), 0) into v_paid from public.booking_payments where booking_ref = p_ref and status = 'paid';
  update public.roommate_passes set amount_paid = v_paid where id = p.id;
  if v_paid < p.grand_total or p.status = 'active' then return; end if;
  -- Renewing early adds to the time already bought.
  select greatest(now(), coalesce(max(ends_at), now())) into v_from from public.roommate_passes
   where user_id = p.user_id and status = 'active' and ends_at > now() and id <> p.id;
  update public.roommate_passes set status = 'active', paid_at = now(), starts_at = v_from,
         ends_at = v_from + make_interval(days => v_days)
   where id = p.id;
  insert into public.notifications (user_id, title, body, url, kind, meta)
  values (p.user_id, 'Cabana Rooms unlocked',
          'Every room on Cabana is open to you until ' || to_char((v_from + make_interval(days => v_days)) at time zone 'Africa/Nairobi', 'FMDD Mon') ||
          '. Message hosts, book viewings and move in.', '/roommates', 'payment', jsonb_build_object('event', 'rooms_pass_active'));
end $$;
revoke all on function cabana_private.settle_rooms_pass(text) from public, anon, authenticated;

create or replace function cabana_private.booking_payment_settle_rooms()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if new.booking_table = 'roommate_passes' and new.status = 'paid'
     and (tg_op = 'INSERT' or old.status is distinct from 'paid') then
    perform cabana_private.settle_rooms_pass(new.booking_ref);
  end if;
  return new;
exception when others then
  raise warning 'booking_payment_settle_rooms: %', sqlerrm;
  return new;
end $$;
revoke all on function cabana_private.booking_payment_settle_rooms() from public, anon, authenticated;
create or replace trigger booking_payment_settle_rooms after insert or update of status on public.booking_payments
  for each row execute function cabana_private.booking_payment_settle_rooms();

-- Passes that ran out read as expired.
create or replace function public.rooms_pass_tick()
returns integer
language sql
security definer
set search_path = pg_catalog, public
as $$
  with x as (update public.roommate_passes set status = 'expired'
              where status = 'active' and ends_at <= now() returning 1)
  select count(*)::integer from x;
$$;
revoke all on function public.rooms_pass_tick() from public, anon, authenticated;
select cron.schedule('cabana-rooms-pass-tick', '17 * * * *', $$select public.rooms_pass_tick()$$);

-- Messaging a room host needs the pass.
do $$
declare d text; p text;
begin
  d := pg_get_functiondef('public.cabana_chat_start(uuid, date, date, integer)'::regprocedure);
  if position('rooms_pass_required' in d) > 0 then return; end if;
  p := replace(d,
    $x$  if l.partner_id = me then raise exception 'This is your own listing.' using errcode = '22023'; end if;$x$,
    $x$  if l.partner_id = me then raise exception 'This is your own listing.' using errcode = '22023'; end if;
  if (coalesce(l.service, '') = 'roommates' or coalesce(l.type, '') = 'room')
     and not public.cabana_rooms_pass_active(me) and not coalesce(public.is_admin(), false) then
    raise exception 'Unlock Cabana Rooms to message room hosts.' using errcode = 'P0001', hint = 'rooms_pass_required';
  end if;$x$);
  if p = d then raise exception 'cabana_chat_start changed shape'; end if;
  execute p;
end $$;
