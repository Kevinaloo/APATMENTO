-- Owner-only preview basis. Historical rows remain private to the owner/admin.
create function cabana_private.stay_offer_basis(p_listing_id uuid) returns jsonb
language plpgsql stable security definer set search_path=pg_catalog,public as $$
declare l public.listings%rowtype; r jsonb;
begin
  select * into l from public.listings where id=p_listing_id;
  if not found or auth.uid() is null or (l.partner_id is distinct from auth.uid() and not public.is_admin()) then
    raise exception 'Only the listing owner may preview offers' using errcode='42501'; end if;
  r:=cabana_private.stay_reference(l.id,cabana_private.stay_terms(l),coalesce(nullif(l.currency,''),'KES'));
  return jsonb_build_object('reference_nightly',least(coalesce(l.price_night,l.price_per_night),coalesce((r->>'nightly')::numeric,coalesce(l.price_night,l.price_per_night))),
    'verified',(r->>'verified')::boolean,'terms_key',cabana_private.stay_terms(l));
end $$;
revoke all on function cabana_private.stay_offer_basis(uuid) from public,anon;
grant execute on function cabana_private.stay_offer_basis(uuid) to authenticated;
create function public.cabana_stay_offer_basis(p_listing_id uuid) returns jsonb language sql stable security invoker set search_path=pg_catalog as $$
  select cabana_private.stay_offer_basis(p_listing_id)
$$;
revoke all on function public.cabana_stay_offer_basis(uuid) from public,anon;
grant execute on function public.cabana_stay_offer_basis(uuid) to authenticated;

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
  v_quote jsonb;
  v_nights integer;
  v_stay_total numeric;
  v_service_fee numeric;
  v_credit numeric := 0;
  v_uid uuid := auth.uid();
begin
  if tg_op = 'UPDATE' then
    new.offer_id:=old.offer_id;
    new.offer_snapshot:=old.offer_snapshot;
    new.quote_fingerprint:=old.quote_fingerprint;
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
  v_quote := cabana_private.stay_quote(v_listing_id,new.checkin_date,new.checkout_date,coalesce(new.num_guests,1));
  if new.quote_fingerprint is not null and new.quote_fingerprint<>v_quote->>'fingerprint' then
    raise exception 'The price or offer changed. Review the refreshed total before paying.' using errcode='22023';
  end if;
  -- Old pages must refresh before paying a different price. Client-supplied
  -- offers and savings are always replaced with the authoritative quote.
  if new.quote_fingerprint is null and new.stay_total is distinct from (v_quote->>'stay_total')::numeric then
    raise exception 'Please refresh to review the current stay price and offers.' using errcode='22023';
  end if;
  v_stay_total := (v_quote->>'stay_total')::numeric;
  v_service_fee := (v_quote->>'service_fee')::numeric;
  new.offer_id := (v_quote->'offer'->>'id')::uuid;
  new.offer_snapshot := nullif(v_quote->'offer','null'::jsonb);
  new.quote_fingerprint := v_quote->>'fingerprint';

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


revoke all on function public.cabana_secure_apartment_booking() from public,anon,authenticated;
