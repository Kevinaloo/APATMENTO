-- Cabana: make stay price, ownership and payment gates authoritative.
-- Client-supplied values are treated as proposals; this trigger derives
-- every financial and security-sensitive field from trusted rows.

create or replace function public.cabana_secure_apartment_booking()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_listing public.listings%rowtype;
  v_listing_id uuid;
  v_price numeric;
  v_nights integer;
  v_stay_total numeric;
  v_service_fee numeric;
  v_credit numeric := 0;
  v_uid uuid := auth.uid();
begin
  if tg_op = 'UPDATE' then
    -- Direct authenticated table updates may change non-sensitive guest
    -- preferences, but never money, identity, codes, or payment state.
    if auth.uid() is not null and not public.is_operator() then
      new.guest_id        := old.guest_id;
      new.host_id         := old.host_id;
      new.apartment_id    := old.apartment_id;
      new.listing_id      := old.listing_id;
      new.checkin_date    := old.checkin_date;
      new.checkout_date   := old.checkout_date;
      new.nights          := old.nights;
      new.stay_total      := old.stay_total;
      new.service_fee     := old.service_fee;
      new.grand_total     := old.grand_total;
      new.credit_applied  := old.credit_applied;
      new.payment_reference := old.payment_reference;
      new.guest_code      := old.guest_code;
      new.host_code       := old.host_code;
      new.status          := old.status;
      new.amount_paid     := old.amount_paid;
      new.deposit_required := old.deposit_required;
      new.balance_amount  := old.balance_amount;
      new.balance_paid    := old.balance_paid;
      new.fully_paid_at   := old.fully_paid_at;
      new.checked_in_at   := old.checked_in_at;
      new.guest_verified  := old.guest_verified;
      new.host_verified   := old.host_verified;
    end if;
    return new;
  end if;

  if new.listing_id is not null then
    v_listing_id := new.listing_id;
  elsif coalesce(new.apartment_id, '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
    v_listing_id := new.apartment_id::uuid;
  else
    raise exception 'A valid listing is required' using errcode = '22023';
  end if;

  select * into v_listing
    from public.listings
   where id = v_listing_id
     and coalesce(is_active, true)
     and coalesce(status, 'active') = 'active'
     and coalesce(service, 'stays') = 'stays';
  if not found then
    raise exception 'Listing is not available' using errcode = '22023';
  end if;

  if v_uid is not null then new.guest_id := v_uid; end if;
  if new.guest_id is null then
    raise exception 'Authentication is required' using errcode = '42501';
  end if;
  if new.checkin_date is null or new.checkout_date is null
     or new.checkin_date < (now() at time zone 'Africa/Nairobi')::date
     or new.checkout_date <= new.checkin_date then
    raise exception 'Invalid stay dates' using errcode = '22023';
  end if;

  v_nights := new.checkout_date - new.checkin_date;
  if v_nights < greatest(coalesce(v_listing.min_nights, 1), 1) or v_nights > 365 then
    raise exception 'Stay length is not allowed' using errcode = '22023';
  end if;
  if coalesce(new.num_guests, 1) < 1
     or coalesce(new.num_guests, 1) > coalesce(nullif(v_listing.max_guests, '')::integer, 50) then
    raise exception 'Guest count exceeds listing capacity' using errcode = '22023';
  end if;

  v_price := coalesce(v_listing.price_night, v_listing.price_per_night);
  if coalesce(v_price, 0) <= 0 then
    raise exception 'Listing has no valid price' using errcode = '22023';
  end if;
  v_stay_total := round(v_price * v_nights, 2);
  v_service_fee := case when v_stay_total < 5000 then 300 else 800 end;

  if coalesce(new.payment_reference, '')
      !~ ('^APT-' || v_listing_id::text || '-[0-9]{10,16}$') then
    raise exception 'Invalid payment reference' using errcode = '22023';
  end if;

  select coalesce(sum(amount_kes), 0) into v_credit
    from public.point_transactions
   where user_id = new.guest_id
     and booking_ref = new.payment_reference
     and type = 'redeem'
     and service_type = 'stays';
  v_credit := least(greatest(v_credit, 0), greatest(v_stay_total + v_service_fee - 10, 0));

  new.listing_id       := v_listing.id;
  new.apartment_id     := v_listing.id::text;
  new.host_id          := coalesce(v_listing.host_id, v_listing.partner_id);
  new.apartment_name   := v_listing.title;
  new.listing_name     := v_listing.title;
  new.location         := coalesce(v_listing.location,
                           concat_ws(', ', v_listing.area, v_listing.city, v_listing.country));
  new.contact_whatsapp := v_listing.contact_whatsapp;
  new.contact_phone    := v_listing.contact_phone;
  new.contact_email    := v_listing.contact_email;
  new.nights           := v_nights;
  new.stay_total       := v_stay_total;
  new.service_fee      := v_service_fee;
  new.credit_applied   := v_credit;
  new.grand_total      := v_stay_total + v_service_fee - v_credit;
  new.amount_paid      := 0;
  new.deposit_required := round(new.grand_total * 0.25);
  new.balance_amount   := new.grand_total;
  new.balance_paid     := false;
  new.status           := 'pending_payment';
  new.fully_paid_at    := null;
  new.checked_in_at    := null;
  new.guest_verified   := false;
  new.host_verified    := false;
  new.guest_code       := 'GUEST-' || upper(substr(encode(extensions.gen_random_bytes(8), 'hex'), 1, 8));
  new.host_code        := 'HOST-'  || upper(substr(encode(extensions.gen_random_bytes(8), 'hex'), 1, 8));
  new.payment_mode     := case when new.payment_mode = 'full' then 'full' else 'deposit' end;
  return new;
end;
$$;

revoke all on function public.cabana_secure_apartment_booking() from public, anon, authenticated;

drop trigger if exists cabana_secure_apartment_booking_trigger on public.apartment_bookings;
create trigger cabana_secure_apartment_booking_trigger
before insert or update on public.apartment_bookings
for each row execute function public.cabana_secure_apartment_booking();

create unique index if not exists apartment_bookings_payment_reference_uidx
  on public.apartment_bookings (payment_reference);
-- booking_payments.reference already has a UNIQUE constraint, whose backing
-- index is booking_payments_reference_key. Do not duplicate it here.
create unique index if not exists booking_payments_mpesa_receipt_uidx
  on public.booking_payments (mpesa_receipt)
  where mpesa_receipt is not null;

-- Tours and events were using client-calculated totals and reference
-- prefixes the payment API did not recognise. Add host ownership and
-- derive their payable amounts from the published catalogue rows.
alter table public.tour_bookings add column if not exists host_id uuid;
alter table public.event_tickets add column if not exists host_id uuid;

create or replace function public.cabana_secure_tour_booking()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_tour public.tours%rowtype;
  v_total numeric;
  v_due numeric;
begin
  if tg_op = 'UPDATE' then
    if auth.uid() is not null and not public.is_operator() then
      new.guest_id := old.guest_id; new.host_id := old.host_id;
      new.tour_id := old.tour_id; new.tour_total := old.tour_total;
      new.service_fee := old.service_fee; new.grand_total := old.grand_total;
      new.payment_reference := old.payment_reference; new.status := old.status;
      new.amount_paid := old.amount_paid; new.guest_code := old.guest_code;
      new.host_code := old.host_code; new.guest_verified := old.guest_verified;
      new.host_verified := old.host_verified; new.checked_in_at := old.checked_in_at;
    end if;
    return new;
  end if;

  select * into v_tour from public.tours where id = new.tour_id
    and status in ('active', 'approved', 'published') for share;
  if not found then raise exception 'Tour is not available' using errcode='22023'; end if;
  if auth.uid() is not null then new.guest_id := auth.uid(); end if;
  if new.guest_id is null then raise exception 'Authentication is required' using errcode='42501'; end if;
  if new.tour_date is null or new.tour_date < (now() at time zone 'Africa/Nairobi')::date then
    raise exception 'Invalid tour date' using errcode='22023';
  end if;
  new.num_people := greatest(coalesce(new.num_people, 1), 1);
  if new.num_people < greatest(coalesce(v_tour.group_min, 1), 1)
     or new.num_people > coalesce(v_tour.group_max, 20) then
    raise exception 'Group size is not allowed' using errcode='22023';
  end if;
  v_total := case when v_tour.price_basis = 'per_group' then v_tour.price_kes
                  else v_tour.price_kes * new.num_people end;
  v_due := case when coalesce(v_tour.deposit_pct, 0) between 1 and 99
                then round(v_total * v_tour.deposit_pct / 100.0) else v_total end;
  if coalesce(new.payment_reference, '') !~ ('^TOUR-' || v_tour.id || '-[0-9]{10,16}$') then
    raise exception 'Invalid payment reference' using errcode='22023';
  end if;
  new.host_id := v_tour.owner_id; new.tour_name := v_tour.title;
  new.tour_total := v_total; new.service_fee := 0; new.grand_total := v_due;
  new.amount_paid := 0; new.status := case when v_due = 0 then 'reserved' else 'pending_payment' end;
  new.guest_code := 'GUEST-' || upper(substr(encode(extensions.gen_random_bytes(8), 'hex'), 1, 8));
  new.host_code := 'HOST-' || upper(substr(encode(extensions.gen_random_bytes(8), 'hex'), 1, 8));
  new.guest_verified := false; new.host_verified := false; new.checked_in_at := null;
  return new;
end;
$$;

create or replace function public.cabana_secure_event_booking()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_event public.events%rowtype;
  v_tier jsonb;
  v_price numeric;
begin
  if tg_op = 'UPDATE' then
    if auth.uid() is not null and not public.is_operator() then
      new.guest_id := old.guest_id; new.host_id := old.host_id;
      new.event_id := old.event_id; new.tier_name := old.tier_name;
      new.quantity := old.quantity; new.ticket_total := old.ticket_total;
      new.service_fee := old.service_fee; new.grand_total := old.grand_total;
      new.payment_reference := old.payment_reference; new.status := old.status;
      new.amount_paid := old.amount_paid; new.confirmation_code := old.confirmation_code;
      new.guest_code := old.guest_code; new.host_code := old.host_code;
      new.guest_verified := old.guest_verified; new.host_verified := old.host_verified;
      new.checked_in_at := old.checked_in_at;
    end if;
    return new;
  end if;

  select * into v_event from public.events where id = new.event_id
    and status in ('active', 'approved', 'published') for update;
  if not found then raise exception 'Event is not available' using errcode='22023'; end if;
  if auth.uid() is not null then new.guest_id := auth.uid(); end if;
  if new.guest_id is null then raise exception 'Authentication is required' using errcode='42501'; end if;
  new.quantity := greatest(coalesce(new.quantity, 1), 1);
  if new.quantity > 10 then raise exception 'Ticket limit exceeded' using errcode='22023'; end if;

  select value into v_tier from jsonb_array_elements(coalesce(v_event.tiers, '[]'::jsonb))
   where lower(value->>'name') = lower(coalesce(new.tier_name, '')) limit 1;
  v_price := coalesce(nullif(v_tier->>'price_kes', '')::numeric, v_event.price_from, 0);
  if v_tier is not null and (v_tier->>'qty') is not null
     and new.quantity > greatest((v_tier->>'qty')::integer - coalesce((v_tier->>'sold')::integer, 0), 0) then
    raise exception 'Not enough tickets remain' using errcode='22023';
  end if;
  if coalesce(new.payment_reference, '') !~ ('^EVENT-' || v_event.id || '-[0-9]{10,16}$') then
    raise exception 'Invalid payment reference' using errcode='22023';
  end if;
  new.host_id := v_event.owner_id; new.event_name := v_event.title;
  new.ticket_total := v_price * new.quantity; new.service_fee := 0;
  new.grand_total := new.ticket_total; new.amount_paid := 0;
  new.status := case when new.grand_total = 0 then 'reserved' else 'pending_payment' end;
  new.confirmation_code := 'CBN-' || upper(substr(encode(extensions.gen_random_bytes(8), 'hex'), 1, 8));
  new.guest_code := 'GUEST-' || upper(substr(encode(extensions.gen_random_bytes(8), 'hex'), 1, 8));
  new.host_code := 'HOST-' || upper(substr(encode(extensions.gen_random_bytes(8), 'hex'), 1, 8));
  new.guest_verified := false; new.host_verified := false; new.checked_in_at := null;
  return new;
end;
$$;

revoke all on function public.cabana_secure_tour_booking() from public, anon, authenticated;
revoke all on function public.cabana_secure_event_booking() from public, anon, authenticated;
drop trigger if exists cabana_secure_tour_booking_trigger on public.tour_bookings;
create trigger cabana_secure_tour_booking_trigger before insert or update on public.tour_bookings
for each row execute function public.cabana_secure_tour_booking();
drop trigger if exists cabana_secure_event_booking_trigger on public.event_tickets;
create trigger cabana_secure_event_booking_trigger before insert or update on public.event_tickets
for each row execute function public.cabana_secure_event_booking();

create index if not exists tour_bookings_host_idx on public.tour_bookings (host_id, created_at desc);
create index if not exists event_tickets_host_idx on public.event_tickets (host_id, created_at desc);
