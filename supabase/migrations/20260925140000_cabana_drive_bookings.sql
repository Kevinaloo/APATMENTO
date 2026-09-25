/* ════════════════════════════════════════════════════════════════════
   CABANA DRIVE · car hire that ends in keys, not a form
   ────────────────────────────────────────────────────────────────────
   Before this, a hire was an insert anyone could make with any total
   and any status (the insert policy was `with check (true)`, so a
   stranger could write a "confirmed" booking and black out a car), the
   price was whatever the browser said, the guest could never read the
   booking back, and no operator screen existed to answer it.

   Now a hire has a life, the same way a food order does:

     requested ─┬─ confirmed ── active ── completed
                │     (keys handed over     (car returned)
                │      against a code)
                ├─ declined   (with a reason)
                ├─ cancelled  (by the guest, or the operator)
                └─ expired    (no answer inside the response window)

   MONEY
   Cabana prices nothing and holds nothing. The server rebuilds every
   line from the operator's own rates (day rate × days, their weekly or
   monthly discount, their driver rate, their delivery fee, their
   extras) so the total cannot be edited on the way, and the guest pays
   the operator directly — M-Pesa till or paybill, cash, or card at the
   counter. The refundable deposit is the operator's and is shown up
   front. Cabana's line on every quote is zero.

   THE HANDOVER
   The guest holds a four digit code. At collection the operator enters
   it, which proves the keys went to the person who booked and starts
   the hire. Return closes it.

   WHEN THERE IS NO FLEET YET
   A guest can post what they need (where, when, what kind of car) as a
   car request. Verified operators in range see it and answer with a
   priced offer; the Cabana desk can answer on behalf of a partner who
   is not on Cabana yet. Accepting an offer creates a confirmed hire.
   ════════════════════════════════════════════════════════════════════ */

-- ── 1 · operators: how to pay them, how fast they answer ───────────
alter table public.car_operators
  add column if not exists mpesa_till            text,
  add column if not exists mpesa_paybill         text,
  add column if not exists mpesa_account         text,
  add column if not exists accepts_cash          boolean not null default true,
  add column if not exists accepts_card          boolean not null default false,
  add column if not exists respond_window_mins   integer not null default 120,
  add column if not exists delivers              boolean not null default false,
  add column if not exists delivery_fee_minor    bigint  not null default 0,
  add column if not exists delivery_per_km_minor bigint  not null default 0,
  add column if not exists pickup_address        text,
  add column if not exists about                 text,
  add column if not exists logo_url              text,
  add column if not exists instant_confirm       boolean not null default false,
  add column if not exists paused_until          timestamptz;

do $$ begin
  alter table public.car_operators add constraint car_operators_respond_window_sane
    check (respond_window_mins between 10 and 1440);
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.car_operators add constraint car_operators_delivery_money_sane
    check (delivery_fee_minor >= 0 and delivery_per_km_minor >= 0);
exception when duplicate_object then null; end $$;

drop policy if exists car_operators_admin_all on public.car_operators;
create policy car_operators_admin_all on public.car_operators for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
drop policy if exists car_operators_owner_read on public.car_operators;
create policy car_operators_owner_read on public.car_operators for select to authenticated
  using (owner_id = (select auth.uid()));

/* What a guest may know about an operator before booking. The depot is
   rounded to about a kilometre; the exact pickup address is shared only
   once a hire is confirmed. */
drop view if exists public.car_operators_public;
create view public.car_operators_public with (security_invoker = true) as
select id, name, slug, city, country_code, verified, fleet_size, response_mins, on_time_pct,
       completed_hires, rating, currency_code, service_radius_km,
       delivers, delivery_fee_minor, delivery_per_km_minor, accepts_cash, accepts_card,
       instant_confirm, respond_window_mins, about, logo_url,
       round(extensions.st_y(location::extensions.geometry)::numeric, 2) as lat,
       round(extensions.st_x(location::extensions.geometry)::numeric, 2) as lng
  from public.car_operators
 where verified = true;
grant select on public.car_operators_public to anon, authenticated;

-- ── 2 · the fleet row learns discounts, extras and a status ────────
alter table public.car_fleet
  add column if not exists weekly_discount_pct  integer not null default 0,
  add column if not exists monthly_discount_pct integer not null default 0,
  add column if not exists excess_km_minor      bigint,
  add column if not exists colour               text,
  add column if not exists description          text,
  add column if not exists features             text[] not null default '{}',
  add column if not exists instant_book         boolean not null default false,
  add column if not exists delivery_ok          boolean not null default true,
  add column if not exists updated_at           timestamptz not null default now();

do $$ begin
  alter table public.car_fleet add constraint car_fleet_discounts_sane
    check (weekly_discount_pct between 0 and 60 and monthly_discount_pct between 0 and 70);
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.car_fleet add constraint car_fleet_status_known
    check (status in ('review','active','paused','retired','rejected'));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.car_fleet add constraint car_fleet_money_sane
    check (day_rate >= 0 and deposit >= 0 and chauffeur_uplift_metro >= 0 and chauffeur_uplift_upcountry >= 0);
exception when duplicate_object then null; end $$;

drop trigger if exists trg_car_fleet_touch on public.car_fleet;
create trigger trg_car_fleet_touch before update on public.car_fleet
  for each row execute function public.touch_updated_at();

/* Owners write through car_operator_vehicle_save now, which is the only
   place that knows a new or re-identified car must go back to review. */
drop policy if exists car_fleet_owner_write on public.car_fleet;
drop policy if exists car_fleet_owner_read on public.car_fleet;
create policy car_fleet_owner_read on public.car_fleet for select to authenticated
  using (exists (select 1 from public.car_operators o where o.id = car_fleet.operator_id and o.owner_id = (select auth.uid())));

-- ── 3 · the hire itself ─────────────────────────────────────────────
alter table public.car_bookings
  add column if not exists guest_token      text,
  add column if not exists currency         text,
  add column if not exists pickup_at        timestamptz,
  add column if not exists return_at        timestamptz,
  add column if not exists delivery         boolean not null default false,
  add column if not exists delivery_label   text,
  add column if not exists delivery_lat     double precision,
  add column if not exists delivery_lng     double precision,
  add column if not exists base_minor       bigint,
  add column if not exists discount_minor   bigint not null default 0,
  add column if not exists chauffeur_minor  bigint not null default 0,
  add column if not exists delivery_minor   bigint not null default 0,
  add column if not exists extras_minor     bigint not null default 0,
  add column if not exists total_minor      bigint,
  add column if not exists deposit_minor    bigint not null default 0,
  add column if not exists driver_age       integer,
  add column if not exists licence_years    integer,
  add column if not exists trip_label       text,
  add column if not exists trip_km          numeric,
  add column if not exists cross_border     boolean not null default false,
  add column if not exists expires_at       timestamptz,
  add column if not exists responded_at     timestamptz,
  add column if not exists decline_reason   text,
  add column if not exists handover_code    text,
  add column if not exists code_attempts    integer not null default 0,
  add column if not exists collected_at     timestamptz,
  add column if not exists returned_at      timestamptz,
  add column if not exists cancelled_at     timestamptz,
  add column if not exists cancelled_by     text,
  add column if not exists cancel_reason    text,
  add column if not exists rating           integer,
  add column if not exists review           text,
  add column if not exists rated_at         timestamptz,
  add column if not exists request_id       uuid,
  add column if not exists vehicle_snapshot jsonb,
  add column if not exists operator_snapshot jsonb,
  add column if not exists pay_method       text not null default 'mpesa',
  add column if not exists paid_at          timestamptz,
  add column if not exists updated_at       timestamptz not null default now();

do $$ begin
  alter table public.car_bookings add constraint car_bookings_status_known check (status in
    ('pending','requested','confirmed','active','completed','declined','cancelled','expired','no_show'));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.car_bookings add constraint car_bookings_window_sane
    check (pickup_at is null or return_at is null or return_at > pickup_at);
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.car_bookings add constraint car_bookings_rating_sane check (rating is null or rating between 1 and 5);
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.car_bookings add constraint car_bookings_pay_known check (pay_method in ('mpesa','cash','card'));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.car_bookings add constraint car_bookings_cancelled_by_known
    check (cancelled_by is null or cancelled_by in ('guest','operator','desk','system'));
exception when duplicate_object then null; end $$;

/* The same car can never be out twice. Requests may overlap (the
   operator chooses); confirmed and active hires may not. */
do $$ begin
  alter table public.car_bookings add constraint car_bookings_no_double_hire
    exclude using gist (vehicle_id with =, tstzrange(pickup_at, return_at, '[)') with &&)
    where (status in ('confirmed','active') and vehicle_id is not null and pickup_at is not null and return_at is not null);
exception when duplicate_object then null; end $$;

create index if not exists car_bookings_operator_status_idx on public.car_bookings (operator_id, status, pickup_at);
create index if not exists car_bookings_user_idx on public.car_bookings (user_id, created_at desc) where user_id is not null;
create index if not exists car_bookings_expiring_idx on public.car_bookings (expires_at) where status = 'requested';

drop trigger if exists trg_car_bookings_touch on public.car_bookings;
create trigger trg_car_bookings_touch before update on public.car_bookings
  for each row execute function public.touch_updated_at();

-- Nobody writes a hire directly any more; the functions below do.
drop policy if exists car_bookings_insert on public.car_bookings;
drop policy if exists car_bookings_operator_update on public.car_bookings;
drop policy if exists car_bookings_read on public.car_bookings;
drop policy if exists car_bookings_admin_all on public.car_bookings;
create policy car_bookings_admin_all on public.car_bookings for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
revoke insert, update, delete on public.car_bookings from anon, authenticated;

-- blackouts remember which hire made them, so a cancellation frees the car
alter table public.car_blackouts add column if not exists booking_id uuid;
create index if not exists car_blackouts_booking_idx on public.car_blackouts (booking_id) where booking_id is not null;
drop policy if exists car_blackouts_admin_all on public.car_blackouts;
create policy car_blackouts_admin_all on public.car_blackouts for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

create or replace function public.car_booking_blackout()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.vehicle_id is null then return new; end if;
  if new.status in ('confirmed','active') then
    insert into public.car_blackouts (vehicle_id, starts_on, ends_on, reason, booking_id)
    values (new.vehicle_id, new.starts_on, greatest(new.ends_on, new.starts_on), 'booked', new.id)
    on conflict (vehicle_id, starts_on, ends_on, reason) do update set booking_id = excluded.booking_id;
  elsif new.status in ('cancelled','declined','expired','no_show') then
    delete from public.car_blackouts where booking_id = new.id;
  end if;
  return new;
end $$;

-- ── 4 · events ─────────────────────────────────────────────────────
create table if not exists public.car_booking_events (
  id         bigint generated always as identity primary key,
  booking_id uuid not null references public.car_bookings(id) on delete cascade,
  kind       text not null,
  actor      text not null default 'system',
  note       text,
  created_at timestamptz not null default now()
);
create index if not exists car_booking_events_booking_idx on public.car_booking_events (booking_id, id);
alter table public.car_booking_events enable row level security;
revoke all on public.car_booking_events from anon, authenticated;
drop policy if exists car_booking_events_admin_read on public.car_booking_events;
create policy car_booking_events_admin_read on public.car_booking_events for select to authenticated
  using ((select public.is_admin()));
grant select on public.car_booking_events to authenticated;

-- ── 5 · car requests: when the right car is not listed yet ─────────
create table if not exists public.car_requests (
  id               uuid primary key default gen_random_uuid(),
  ref              text not null unique,
  user_id          uuid references auth.users(id) on delete set null,
  guest_token      text not null,
  status           text not null default 'open',
  country_code     text not null check (public.cabana_is_africa(country_code)),
  city             text,
  pickup_label     text not null,
  pickup_lat       double precision not null,
  pickup_lng       double precision not null,
  pickup_at        timestamptz not null,
  return_at        timestamptz not null,
  days             integer not null,
  class            text,
  seats_min        integer not null default 1,
  transmission     text not null default 'any',
  with_chauffeur   boolean not null default false,
  delivery         boolean not null default false,
  budget_day_minor bigint,
  currency         text not null,
  trip_label       text,
  notes            text,
  customer_name    text not null,
  phone            text not null,
  email            text,
  driver_age       integer,
  licence_years    integer,
  expires_at       timestamptz not null,
  desk_at          timestamptz,
  chosen_offer_id  uuid,
  booking_id       uuid,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint car_requests_status_known check (status in ('open','matched','cancelled','expired')),
  constraint car_requests_window_sane check (return_at > pickup_at),
  constraint car_requests_transmission_known check (transmission in ('any','automatic','manual')),
  constraint car_requests_class_known check (class is null or class in
    ('economy','compact','crossover','suv4x4','safari','luxury','van','pickup'))
);
create index if not exists car_requests_open_idx on public.car_requests (status, country_code, pickup_at) where status = 'open';
drop trigger if exists trg_car_requests_touch on public.car_requests;
create trigger trg_car_requests_touch before update on public.car_requests
  for each row execute function public.touch_updated_at();

create table if not exists public.car_request_offers (
  id              uuid primary key default gen_random_uuid(),
  request_id      uuid not null references public.car_requests(id) on delete cascade,
  operator_id     uuid references public.car_operators(id) on delete cascade,
  source          text not null default 'operator',
  vehicle_id      uuid references public.car_fleet(id) on delete set null,
  vehicle_label   text not null,
  class           text,
  seats           integer,
  transmission    text,
  year            integer,
  photo_url       text,
  day_rate_minor  bigint not null check (day_rate_minor > 0),
  total_minor     bigint not null check (total_minor > 0),
  deposit_minor   bigint not null default 0 check (deposit_minor >= 0),
  currency        text not null,
  note            text,
  operator_name   text not null,
  operator_phone  text,
  status          text not null default 'offered',
  created_at      timestamptz not null default now(),
  expires_at      timestamptz,
  constraint car_request_offers_status_known check (status in ('offered','accepted','lost','withdrawn','expired')),
  constraint car_request_offers_source_known check (source in ('operator','desk')),
  constraint car_request_offers_shape check ((source = 'operator' and operator_id is not null) or source = 'desk')
);
create index if not exists car_request_offers_request_idx on public.car_request_offers (request_id, status);
create unique index if not exists car_request_offers_one_live_per_operator
  on public.car_request_offers (request_id, operator_id) where status = 'offered' and operator_id is not null;

alter table public.car_requests enable row level security;
alter table public.car_request_offers enable row level security;
revoke all on public.car_requests, public.car_request_offers from anon, authenticated;
drop policy if exists car_requests_admin_all on public.car_requests;
create policy car_requests_admin_all on public.car_requests for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
drop policy if exists car_request_offers_admin_all on public.car_request_offers;
create policy car_request_offers_admin_all on public.car_request_offers for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
grant select, insert, update, delete on public.car_requests, public.car_request_offers to authenticated;

/* Guests read operators through a column list: the business, not its
   phone book or payout details. Owners and the desk use functions. */
revoke select on public.car_operators from anon, authenticated;
grant select (id, name, slug, city, country_code, verified, verified_at, fleet_size, response_mins,
              on_time_pct, completed_hires, rating, currency_code, location, service_radius_km,
              delivers, delivery_fee_minor, delivery_per_km_minor, accepts_cash, accepts_card,
              instant_confirm, respond_window_mins, about, logo_url, created_at)
  on public.car_operators to anon, authenticated;

-- ── 6 · helpers ─────────────────────────────────────────────────────
create or replace function public.car_err(p_code text, p_detail text default null)
returns void language plpgsql volatile set search_path = pg_catalog as $$
begin
  raise exception '%', p_code using errcode = 'P0001', detail = coalesce(p_detail, p_code);
end $$;

create or replace function public.car_new_ref(p_prefix text)
returns text language plpgsql volatile set search_path = public, extensions as $$
declare
  abc constant text := 'ACDEFGHJKLMNPQRTUVWXY34679';
  r text; b bytea; i int;
begin
  loop
    b := extensions.gen_random_bytes(6);
    r := p_prefix;
    for i in 0..5 loop
      r := r || substr(abc, (get_byte(b, i) % length(abc)) + 1, 1);
    end loop;
    exit when not exists (select 1 from public.car_bookings where ref = r)
          and not exists (select 1 from public.car_requests where ref = r);
  end loop;
  return r;
end $$;

create or replace function public.car_log(p_booking uuid, p_kind text, p_actor text, p_note text default null)
returns void language sql security definer set search_path = public as $$
  insert into public.car_booking_events (booking_id, kind, actor, note)
  values (p_booking, p_kind, p_actor, left(p_note, 400));
$$;

/* Car hire money is stored as hundredths of the operator's currency,
   the convention car_operator_apply has always used. */
create or replace function public.car_money(p_minor bigint, p_currency text)
returns text language sql immutable set search_path = pg_catalog as $$
  select case when p_minor is null then '' else coalesce(p_currency, 'KES') || ' ' ||
    to_char(p_minor / 100.0, 'FM999,999,999,990') end;
$$;

/* Hire days: every started 24 hours, after a one-hour grace. */
create or replace function public.car_days(p_pickup timestamptz, p_return timestamptz)
returns integer language sql immutable set search_path = pg_catalog as $$
  select greatest(1, ceil((extract(epoch from (p_return - p_pickup)) - 3600) / 86400.0))::int;
$$;

create or replace function public.car_vehicle_available(p_vehicle uuid, p_pickup timestamptz, p_return timestamptz, p_ignore uuid default null)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select not exists (
      select 1 from public.car_bookings b
       where b.vehicle_id = p_vehicle and b.status in ('confirmed','active')
         and (p_ignore is null or b.id <> p_ignore)
         and b.pickup_at is not null and b.return_at is not null
         and tstzrange(b.pickup_at, b.return_at, '[)') && tstzrange(p_pickup, p_return, '[)'))
     and not exists (
      select 1 from public.car_blackouts x
        join public.car_fleet f on f.id = x.vehicle_id
        join public.car_operators o on o.id = f.operator_id
       where x.vehicle_id = p_vehicle and x.booking_id is null
         and x.starts_on <= (p_return at time zone public.cabana_tz_for(o.country_code))::date
         and x.ends_on >= (p_pickup at time zone public.cabana_tz_for(o.country_code))::date);
$$;

/* Every line of a hire, rebuilt from the operator's own numbers. */
create or replace function public.car_price(v public.car_fleet, o public.car_operators,
                                            p_pickup timestamptz, p_return timestamptz, p jsonb)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, extensions
as $$
declare
  v_days int := public.car_days(p_pickup, p_return);
  v_base bigint; v_disc bigint := 0; v_disc_label text; v_pct int := 0;
  v_chauf bigint := 0; v_deliv bigint := 0; v_extras bigint := 0;
  v_lines jsonb := '[]'::jsonb; v_sel jsonb := '[]'::jsonb;
  e jsonb; x jsonb; v_qty int; v_unit bigint; v_per text; v_amount bigint;
  v_km numeric; v_up boolean; v_dlat double precision; v_dlng double precision; v_rate bigint;
  v_label text := nullif(btrim(concat_ws(' ', v.make, v.model)), '');
begin
  if v_days < coalesce(v.min_hire_days, 1) then perform public.car_err('min_days', coalesce(v.min_hire_days, 1)::text); end if;
  v_base := v.day_rate::bigint * v_days;
  v_lines := v_lines || jsonb_build_object('key', 'base', 'label', coalesce(v_label, 'Vehicle hire'),
    'detail', v_days || case when v_days = 1 then ' day × ' else ' days × ' end || public.car_money(v.day_rate, o.currency_code),
    'amount', v_base);

  if v_days >= 28 and coalesce(v.monthly_discount_pct, 0) > 0 then
    v_pct := v.monthly_discount_pct; v_disc_label := 'Monthly rate';
  elsif v_days >= 7 and coalesce(v.weekly_discount_pct, 0) > 0 then
    v_pct := v.weekly_discount_pct; v_disc_label := 'Weekly rate';
  end if;
  if v_pct > 0 then
    v_disc := round(v_base * v_pct / 100.0)::bigint;
    v_lines := v_lines || jsonb_build_object('key', 'discount', 'label', v_disc_label,
      'detail', v_pct || '% off, set by the operator', 'amount', -v_disc, 'good', true);
  end if;

  if coalesce((p->>'chauffeur')::boolean, false) then
    v_up := coalesce((p->>'upcountry')::boolean, false) or coalesce(nullif(p->>'trip_km', '')::numeric, 0) > 80;
    v_rate := case when v_up then v.chauffeur_uplift_upcountry else v.chauffeur_uplift_metro end;
    if coalesce(v_rate, 0) <= 0 then perform public.car_err('chauffeur_unavailable'); end if;
    v_chauf := v_rate * v_days;
    v_lines := v_lines || jsonb_build_object('key', 'chauffeur', 'label', 'Professional driver',
      'detail', case when v_up then 'Out-of-town rate · ' else '' end || public.car_money(v_rate, o.currency_code) || ' a day',
      'amount', v_chauf);
  end if;

  if coalesce((p->>'delivery')::boolean, false) then
    if not coalesce(o.delivers, false) or not coalesce(v.delivery_ok, true) then perform public.car_err('delivery_unavailable'); end if;
    begin
      v_dlat := nullif(p->>'delivery_lat', '')::double precision;
      v_dlng := nullif(p->>'delivery_lng', '')::double precision;
    exception when others then perform public.car_err('delivery_address_required'); end;
    if v_dlat is null or v_dlng is null then perform public.car_err('delivery_address_required'); end if;
    if o.location is not null then
      v_km := round((extensions.st_distance(o.location,
                extensions.st_setsrid(extensions.st_makepoint(v_dlng, v_dlat), 4326)::extensions.geography) / 1000 * 1.3)::numeric, 1);
      if v_km > coalesce(o.service_radius_km, 150) then perform public.car_err('delivery_too_far', v_km::text); end if;
    end if;
    v_deliv := coalesce(o.delivery_fee_minor, 0) + round(coalesce(o.delivery_per_km_minor, 0) * coalesce(v_km, 0))::bigint;
    v_lines := v_lines || jsonb_build_object('key', 'delivery', 'label', 'Delivery and collection',
      'detail', coalesce(v_km || ' km from the depot', 'To your address'), 'amount', v_deliv);
  end if;

  if jsonb_typeof(p->'extras') = 'array' then
    for e in select * from jsonb_array_elements(p->'extras') loop
      select value into x from jsonb_array_elements(coalesce(v.extras, '[]'::jsonb)) value
       where value->>'key' = e->>'key' limit 1;
      if x is null then perform public.car_err('extra_unknown', e->>'key'); end if;
      v_qty := greatest(1, least(coalesce(nullif(e->>'qty', '')::int, 1), coalesce(nullif(x->>'max', '')::int, 1)));
      v_unit := greatest(0, coalesce(nullif(x->>'price_minor', '')::bigint, 0));
      v_per := coalesce(nullif(x->>'per', ''), 'day');
      v_amount := v_unit * v_qty * case when v_per = 'hire' then 1 else v_days end;
      v_extras := v_extras + v_amount;
      v_sel := v_sel || jsonb_build_object('key', x->>'key', 'label', x->>'label', 'qty', v_qty,
        'unit', v_unit, 'per', v_per, 'amount', v_amount);
      v_lines := v_lines || jsonb_build_object('key', 'extra:' || (x->>'key'),
        'label', coalesce(x->>'label', x->>'key') || case when v_qty > 1 then ' × ' || v_qty else '' end,
        'detail', public.car_money(v_unit, o.currency_code) || case when v_per = 'hire' then ' per hire' else ' a day' end,
        'amount', v_amount);
      x := null;
    end loop;
  end if;

  if coalesce((p->>'cross_border')::boolean, false) and not coalesce(v.cross_border_ok, false) then
    perform public.car_err('cross_border_unavailable');
  end if;

  v_lines := v_lines || jsonb_build_object('key', 'commission', 'label', 'Cabana fee',
    'detail', 'The operator keeps every shilling', 'amount', 0, 'good', true);

  return jsonb_build_object('days', v_days, 'currency', coalesce(o.currency_code, 'KES'),
    'base', v_base, 'discount', v_disc, 'chauffeur', v_chauf, 'delivery', v_deliv, 'extras', v_extras,
    'total', v_base - v_disc + v_chauf + v_deliv + v_extras, 'deposit', coalesce(v.deposit, 0),
    'lines', v_lines, 'extras_selected', v_sel, 'delivery_km', v_km, 'upcountry', coalesce(v_up, false));
end $$;

create or replace function public.car_vehicle_snapshot(v public.car_fleet)
returns jsonb language sql stable set search_path = public as $$
  select jsonb_strip_nulls(jsonb_build_object('id', v.id, 'make', v.make, 'model', v.model, 'variant', v.variant,
    'year', v.year, 'class', v.class, 'body', v.body, 'seats', v.seats, 'transmission', v.transmission,
    'fuel', v.fuel, 'drive', v.drive, 'colour', v.colour, 'clearance_mm', v.ground_clearance_mm,
    'photo', case when jsonb_typeof(v.photos) = 'array' then v.photos->>0 end,
    'mileage_cap_km', v.mileage_cap_km, 'fuel_policy', v.fuel_policy));
$$;

-- ── 7 · the guest ───────────────────────────────────────────────────
create or replace function public.car_quote(p jsonb)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare v public.car_fleet%rowtype; o public.car_operators%rowtype; v_pick timestamptz; v_ret timestamptz; q jsonb;
begin
  select * into v from public.car_fleet where id = nullif(p->>'vehicle_id', '')::uuid and status = 'active';
  if not found then perform public.car_err('vehicle_unavailable'); end if;
  select * into o from public.car_operators where id = v.operator_id and verified;
  if not found then perform public.car_err('operator_unavailable'); end if;
  begin
    v_pick := (p->>'pickup_at')::timestamptz; v_ret := (p->>'return_at')::timestamptz;
  exception when others then perform public.car_err('dates_invalid'); end;
  if v_pick is null or v_ret is null or v_ret <= v_pick then perform public.car_err('dates_invalid'); end if;
  q := public.car_price(v, o, v_pick, v_ret, p);
  return q || jsonb_build_object('available', public.car_vehicle_available(v.id, v_pick, v_ret),
    'min_driver_age', v.min_driver_age, 'min_licence_years', v.min_licence_years,
    'instant', coalesce(o.instant_confirm, false) or coalesce(v.instant_book, false),
    'respond_window_mins', o.respond_window_mins);
end $$;

create or replace function public.car_booking_json(b public.car_bookings, p_view text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, extensions
as $$
declare
  o public.car_operators%rowtype; v public.car_fleet%rowtype;
  v_live boolean := b.status in ('confirmed','active','completed');
  v_op jsonb; v_events jsonb; v_out jsonb;
begin
  select * into o from public.car_operators where id = b.operator_id;
  select * into v from public.car_fleet where id = b.vehicle_id;
  v_op := coalesce(b.operator_snapshot, '{}'::jsonb) || jsonb_strip_nulls(jsonb_build_object(
    'name', coalesce(o.name, b.operator_snapshot->>'name'), 'city', o.city, 'verified', o.verified,
    'rating', o.rating, 'response_mins', o.response_mins, 'logo', o.logo_url,
    'respond_window_mins', o.respond_window_mins));
  v_op := v_op - 'phone' - 'whatsapp' - 'email' - 'pickup_address' - 'mpesa_till' - 'mpesa_paybill' - 'mpesa_account';
  if v_live or p_view in ('operator','desk') then
    v_op := v_op || jsonb_strip_nulls(jsonb_build_object(
      'phone', coalesce(o.phone, b.operator_snapshot->>'phone'), 'whatsapp', o.whatsapp, 'email', o.email,
      'pickup_address', coalesce(o.pickup_address, b.operator_snapshot->>'pickup_address'),
      'mpesa_till', o.mpesa_till, 'mpesa_paybill', o.mpesa_paybill, 'mpesa_account', o.mpesa_account,
      'accepts_cash', o.accepts_cash, 'accepts_card', o.accepts_card,
      'lat', case when o.location is not null then extensions.st_y(o.location::extensions.geometry) end,
      'lng', case when o.location is not null then extensions.st_x(o.location::extensions.geometry) end));
  end if;
  select coalesce(jsonb_agg(jsonb_build_object('kind', e.kind, 'actor', e.actor, 'at', e.created_at) order by e.id), '[]'::jsonb)
    into v_events from public.car_booking_events e where e.booking_id = b.id;

  v_out := jsonb_build_object(
    'ref', b.ref, 'status', b.status, 'created_at', b.created_at, 'updated_at', b.updated_at,
    'pickup_at', b.pickup_at, 'return_at', b.return_at, 'starts_on', b.starts_on, 'ends_on', b.ends_on, 'days', b.days,
    'currency', coalesce(b.currency, o.currency_code, 'KES'),
    'lines', coalesce(b.price_breakdown->'lines', '[]'::jsonb),
    'total', coalesce(b.total_minor, b.total), 'deposit', coalesce(b.deposit_minor, b.deposit_held),
    'with_chauffeur', b.with_chauffeur, 'delivery', b.delivery, 'delivery_label', b.delivery_label,
    'pickup_mode', b.pickup_mode, 'extras', b.extras, 'trip_label', b.trip_label, 'cross_border', b.cross_border,
    'vehicle', coalesce(b.vehicle_snapshot, case when v.id is not null then public.car_vehicle_snapshot(v) end)
               || jsonb_strip_nulls(jsonb_build_object('photos', v.photos)),
    'operator', v_op, 'pay_method', b.pay_method, 'paid_at', b.paid_at,
    'expires_at', b.expires_at, 'responded_at', b.responded_at, 'decline_reason', b.decline_reason,
    'collected_at', b.collected_at, 'returned_at', b.returned_at,
    'cancelled_at', b.cancelled_at, 'cancelled_by', b.cancelled_by, 'cancel_reason', b.cancel_reason,
    'rating', b.rating, 'review', b.review, 'timeline', v_events,
    'from_request', b.request_id is not null);
  if p_view = 'guest' then
    v_out := v_out || jsonb_build_object('handover_code', b.handover_code, 'customer_name', b.customer_name, 'phone', b.phone);
  elsif p_view in ('operator','desk') then
    v_out := v_out || jsonb_build_object('id', b.id, 'customer_name', b.customer_name, 'phone', b.phone,
      'email', b.email, 'driver_age', b.driver_age, 'licence_years', b.licence_years,
      'licence_country', b.licence_country, 'notes', b.notes, 'code_attempts', b.code_attempts,
      'delivery_lat', b.delivery_lat, 'delivery_lng', b.delivery_lng, 'vehicle_id', b.vehicle_id);
  end if;
  if p_view = 'desk' then v_out := v_out || jsonb_build_object('handover_code', b.handover_code); end if;
  return v_out;
end $$;

create or replace function public.car_guest_booking(p_ref text, p_token text)
returns public.car_bookings
language plpgsql
security definer
set search_path = public
as $$
declare b public.car_bookings%rowtype;
begin
  select * into b from public.car_bookings where ref = upper(btrim(coalesce(p_ref, '')));
  if not found then perform public.car_err('booking_not_found'); end if;
  if not ((p_token is not null and p_token <> '' and b.guest_token = p_token)
          or (b.user_id is not null and b.user_id = auth.uid())
          or public.is_admin()) then
    perform public.car_err('booking_not_found');
  end if;
  return b;
end $$;

create or replace function public.car_booking_place(p jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v public.car_fleet%rowtype; o public.car_operators%rowtype; b public.car_bookings%rowtype;
  v_pick timestamptz; v_ret timestamptz; v_price jsonb; v_tz text; v_status text; v_exp timestamptz;
  v_name  text := btrim(coalesce(p->>'name', ''));
  v_phone text := btrim(coalesce(p->>'phone', ''));
  v_email text := nullif(lower(btrim(coalesce(p->>'email', ''))), '');
  v_chauf boolean := coalesce((p->>'chauffeur')::boolean, false);
  v_deliv boolean := coalesce((p->>'delivery')::boolean, false);
  v_pay   text := lower(coalesce(nullif(p->>'pay_method', ''), 'mpesa'));
  v_age int; v_lic int;
begin
  select * into v from public.car_fleet where id = nullif(p->>'vehicle_id', '')::uuid;
  if not found or v.status <> 'active' then perform public.car_err('vehicle_unavailable'); end if;
  select * into o from public.car_operators where id = v.operator_id;
  if not found or not coalesce(o.verified, false) then perform public.car_err('operator_unavailable'); end if;
  if o.paused_until is not null and o.paused_until > now() then perform public.car_err('operator_paused'); end if;

  begin
    v_pick := (p->>'pickup_at')::timestamptz; v_ret := (p->>'return_at')::timestamptz;
    v_age := nullif(p->>'driver_age', '')::int; v_lic := nullif(p->>'licence_years', '')::int;
  exception when others then perform public.car_err('request_malformed'); end;
  if v_pick is null or v_ret is null then perform public.car_err('dates_invalid'); end if;
  if v_pick < now() + interval '2 hours' then perform public.car_err('pickup_too_soon'); end if;
  if v_pick > now() + interval '365 days' then perform public.car_err('pickup_too_far'); end if;
  if v_ret < v_pick + interval '4 hours' then perform public.car_err('return_too_soon'); end if;
  if v_ret > v_pick + interval '90 days' then perform public.car_err('hire_too_long'); end if;

  if length(v_name) < 2 or length(v_name) > 80 then perform public.car_err('name_required'); end if;
  if length(public.food_digits(v_phone)) < 9 or length(public.food_digits(v_phone)) > 15 then perform public.car_err('phone_required'); end if;
  if v_email is not null and v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then perform public.car_err('email_invalid'); end if;
  if v_pay not in ('mpesa','cash','card') then v_pay := 'mpesa'; end if;
  if v_pay = 'cash' and not coalesce(o.accepts_cash, true) then v_pay := 'mpesa'; end if;
  if v_pay = 'card' and not coalesce(o.accepts_card, false) then v_pay := 'mpesa'; end if;

  if not v_chauf then
    if v_age is null or v_age < coalesce(v.min_driver_age, 23) then
      perform public.car_err('driver_too_young', coalesce(v.min_driver_age, 23)::text);
    end if;
    if coalesce(v_lic, 0) < coalesce(v.min_licence_years, 0) then
      perform public.car_err('licence_too_new', coalesce(v.min_licence_years, 0)::text);
    end if;
  end if;

  if not public.car_vehicle_available(v.id, v_pick, v_ret) then perform public.car_err('vehicle_booked'); end if;

  if (select count(*) from public.car_bookings where public.food_digits(phone) = public.food_digits(v_phone)
        and status = 'requested') >= 4 then perform public.car_err('too_many_open'); end if;
  if (select count(*) from public.car_bookings where public.food_digits(phone) = public.food_digits(v_phone)
        and created_at > now() - interval '1 hour') >= 10 then perform public.car_err('too_many_requests'); end if;

  v_price := public.car_price(v, o, v_pick, v_ret, p);
  v_tz := public.cabana_tz_for(o.country_code);
  v_status := case when coalesce(o.instant_confirm, false) or coalesce(v.instant_book, false) then 'confirmed' else 'requested' end;
  v_exp := greatest(now() + interval '15 minutes',
                    least(now() + make_interval(mins => coalesce(o.respond_window_mins, 120)), v_pick - interval '1 hour'));

  begin
    insert into public.car_bookings (
      ref, vehicle_id, operator_id, user_id, starts_on, ends_on, days, with_chauffeur,
      route_key, route_verdict, pickup_mode, pickup_detail, insurance_tier, extras, price_breakdown,
      total, deposit_held, pay_at_counter, customer_name, phone, email, licence_country, notes, status,
      guest_token, currency, pickup_at, return_at, delivery, delivery_label, delivery_lat, delivery_lng,
      base_minor, discount_minor, chauffeur_minor, delivery_minor, extras_minor, total_minor, deposit_minor,
      driver_age, licence_years, trip_label, trip_km, cross_border, expires_at, handover_code,
      vehicle_snapshot, operator_snapshot, pay_method, responded_at)
    values (
      public.car_new_ref('CD-'), v.id, o.id, auth.uid(),
      (v_pick at time zone v_tz)::date, (v_ret at time zone v_tz)::date, (v_price->>'days')::int, v_chauf,
      nullif(left(p->>'route_key', 60), ''), nullif(left(p->>'route_verdict', 20), ''),
      case when v_deliv then 'delivery' else 'depot' end,
      case when v_deliv then left(btrim(coalesce(p->>'delivery_label', '')), 200) else o.city end,
      'operator', coalesce(v_price->'extras_selected', '[]'::jsonb), v_price,
      least((v_price->>'total')::bigint, 2147483647)::int, least(coalesce(v.deposit, 0), 2147483647)::int, 0,
      v_name, v_phone, v_email, nullif(left(btrim(coalesce(p->>'licence_country', '')), 60), ''),
      nullif(left(btrim(coalesce(p->>'notes', '')), 600), ''), v_status,
      public.food_secret(), coalesce(o.currency_code, 'KES'), v_pick, v_ret, v_deliv,
      case when v_deliv then left(btrim(coalesce(p->>'delivery_label', '')), 200) end,
      case when v_deliv then nullif(p->>'delivery_lat', '')::double precision end,
      case when v_deliv then nullif(p->>'delivery_lng', '')::double precision end,
      (v_price->>'base')::bigint, (v_price->>'discount')::bigint, (v_price->>'chauffeur')::bigint,
      (v_price->>'delivery')::bigint, (v_price->>'extras')::bigint, (v_price->>'total')::bigint, coalesce(v.deposit, 0),
      v_age, v_lic, nullif(left(btrim(coalesce(p->>'trip_label', '')), 160), ''),
      nullif(p->>'trip_km', '')::numeric, coalesce((p->>'cross_border')::boolean, false), v_exp, public.food_code(),
      public.car_vehicle_snapshot(v),
      jsonb_strip_nulls(jsonb_build_object('name', o.name, 'city', o.city)),
      v_pay, case when v_status = 'confirmed' then now() end)
    returning * into b;
  exception when exclusion_violation then
    perform public.car_err('vehicle_booked');
  end;

  perform public.car_log(b.id, 'requested', 'guest', null);
  if b.status = 'confirmed' then perform public.car_log(b.id, 'confirmed', 'operator', 'instant confirmation'); end if;
  return jsonb_build_object('ref', b.ref, 'token', b.guest_token, 'status', b.status,
    'total', b.total_minor, 'currency', b.currency, 'expires_at', b.expires_at);
end $$;

create or replace function public.car_bookings_expire()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare n int := 0; x record;
begin
  for x in update public.car_bookings set status = 'expired'
            where status = 'requested' and expires_at is not null and expires_at < now()
            returning id loop
    perform public.car_log(x.id, 'expired', 'system', 'The operator did not answer in time');
    n := n + 1;
  end loop;
  return n;
end $$;

create or replace function public.car_booking_track(p_ref text, p_token text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare b public.car_bookings%rowtype;
begin
  perform public.car_bookings_expire();
  b := public.car_guest_booking(p_ref, p_token);
  return public.car_booking_json(b, case when public.is_admin() and (p_token is null or p_token <> b.guest_token)
                                         then 'desk' else 'guest' end);
end $$;

create or replace function public.car_booking_cancel(p_ref text, p_token text, p_reason text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare b public.car_bookings%rowtype;
begin
  b := public.car_guest_booking(p_ref, p_token);
  select * into b from public.car_bookings where id = b.id for update;
  if b.status not in ('requested','confirmed','pending') then perform public.car_err('too_late_to_cancel', b.status); end if;
  update public.car_bookings set status = 'cancelled', cancelled_at = now(), cancelled_by = 'guest',
         cancel_reason = nullif(left(btrim(coalesce(p_reason, '')), 200), '')
   where id = b.id returning * into b;
  perform public.car_log(b.id, 'cancelled', 'guest', b.cancel_reason);
  return public.car_booking_json(b, 'guest');
end $$;

create or replace function public.car_booking_rate(p_ref text, p_token text, p_rating int, p_review text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare b public.car_bookings%rowtype; v_n int; v_avg numeric;
begin
  b := public.car_guest_booking(p_ref, p_token);
  if b.status <> 'completed' then perform public.car_err('rate_after_hire'); end if;
  if b.rated_at is not null then perform public.car_err('already_rated'); end if;
  if p_rating is null or p_rating < 1 or p_rating > 5 then perform public.car_err('rating_invalid'); end if;
  update public.car_bookings set rating = p_rating, review = nullif(left(btrim(coalesce(p_review, '')), 600), ''),
         rated_at = now() where id = b.id returning * into b;
  if b.operator_id is not null then
    select count(*), avg(rating) into v_n, v_avg from public.car_bookings where operator_id = b.operator_id and rating is not null;
    update public.car_operators set rating = round(((v_avg * v_n) + 25) / (v_n + 5), 2) where id = b.operator_id;
  end if;
  perform public.car_log(b.id, 'rated', 'guest', p_rating::text);
  return public.car_booking_json(b, 'guest');
end $$;

-- ── 8 · car requests (the reverse marketplace) ─────────────────────
create or replace function public.car_request_json(q public.car_requests, p_view text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare v_offers jsonb; b public.car_bookings%rowtype;
begin
  select coalesce(jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
      'id', f.id, 'source', f.source, 'vehicle_label', f.vehicle_label, 'class', f.class, 'seats', f.seats,
      'transmission', f.transmission, 'year', f.year, 'photo', f.photo_url,
      'day_rate', f.day_rate_minor, 'total', f.total_minor, 'deposit', f.deposit_minor, 'currency', f.currency,
      'note', f.note, 'operator', f.operator_name, 'verified', coalesce(o.verified, false), 'rating', o.rating,
      'status', f.status, 'created_at', f.created_at, 'expires_at', f.expires_at,
      'mine', p_view = 'operator' and o.owner_id = auth.uid())) order by f.total_minor), '[]'::jsonb)
    into v_offers
    from public.car_request_offers f
    left join public.car_operators o on o.id = f.operator_id
   where f.request_id = q.id and (f.status = 'offered' or (f.status = 'accepted'));
  if q.booking_id is not null then select * into b from public.car_bookings where id = q.booking_id; end if;
  return jsonb_strip_nulls(jsonb_build_object(
    'ref', q.ref, 'status', q.status, 'created_at', q.created_at, 'country_code', q.country_code, 'city', q.city,
    'pickup_label', q.pickup_label, 'pickup_lat', case when p_view <> 'operator' then q.pickup_lat end,
    'pickup_lng', case when p_view <> 'operator' then q.pickup_lng end,
    'pickup_at', q.pickup_at, 'return_at', q.return_at, 'days', q.days, 'class', q.class, 'seats_min', q.seats_min,
    'transmission', q.transmission, 'with_chauffeur', q.with_chauffeur, 'delivery', q.delivery,
    'budget_day', q.budget_day_minor, 'currency', q.currency, 'trip_label', q.trip_label, 'notes', q.notes,
    'expires_at', q.expires_at, 'desk', q.desk_at is not null,
    'customer_first_name', split_part(btrim(q.customer_name), ' ', 1),
    'offers', v_offers,
    'booking', case when b.id is not null then jsonb_build_object('ref', b.ref, 'status', b.status) end,
    'id', case when p_view in ('operator','desk') then q.id end,
    'phone', case when p_view = 'desk' then q.phone end,
    'email', case when p_view = 'desk' then q.email end,
    'customer_name', case when p_view in ('guest','desk') then q.customer_name end));
end $$;

create or replace function public.car_guest_request(p_ref text, p_token text)
returns public.car_requests
language plpgsql
security definer
set search_path = public
as $$
declare q public.car_requests%rowtype;
begin
  select * into q from public.car_requests where ref = upper(btrim(coalesce(p_ref, '')));
  if not found then perform public.car_err('request_not_found'); end if;
  if not ((p_token is not null and p_token <> '' and q.guest_token = p_token)
          or (q.user_id is not null and q.user_id = auth.uid())
          or public.is_admin()) then
    perform public.car_err('request_not_found');
  end if;
  return q;
end $$;

create or replace function public.car_request_place(p jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  q public.car_requests%rowtype;
  v_country text := upper(btrim(coalesce(p->>'country_code', '')));
  v_name  text := btrim(coalesce(p->>'name', ''));
  v_phone text := btrim(coalesce(p->>'phone', ''));
  v_email text := nullif(lower(btrim(coalesce(p->>'email', ''))), '');
  v_label text := left(btrim(coalesce(p->>'pickup_label', '')), 200);
  v_class text := nullif(lower(btrim(coalesce(p->>'class', ''))), '');
  v_trans text := lower(coalesce(nullif(p->>'transmission', ''), 'any'));
  v_lat double precision; v_lng double precision; v_pick timestamptz; v_ret timestamptz;
  v_seats int; v_budget bigint; v_age int; v_lic int;
begin
  if not public.cabana_is_africa(v_country) then perform public.car_err('country_invalid'); end if;
  begin
    v_lat := (p->>'pickup_lat')::double precision; v_lng := (p->>'pickup_lng')::double precision;
    v_pick := (p->>'pickup_at')::timestamptz; v_ret := (p->>'return_at')::timestamptz;
    v_seats := coalesce(nullif(p->>'seats_min', '')::int, 1);
    v_budget := nullif(p->>'budget_day_minor', '')::bigint;
    v_age := nullif(p->>'driver_age', '')::int; v_lic := nullif(p->>'licence_years', '')::int;
  exception when others then perform public.car_err('request_malformed'); end;
  if length(v_label) < 2 or v_lat is null or v_lng is null or v_lat not between -40 and 40 or v_lng not between -30 and 65 then
    perform public.car_err('pickup_required');
  end if;
  if v_pick is null or v_ret is null or v_pick < now() + interval '2 hours' or v_pick > now() + interval '365 days'
     or v_ret < v_pick + interval '4 hours' or v_ret > v_pick + interval '90 days' then
    perform public.car_err('dates_invalid');
  end if;
  if length(v_name) < 2 or length(v_name) > 80 then perform public.car_err('name_required'); end if;
  if length(public.food_digits(v_phone)) < 9 or length(public.food_digits(v_phone)) > 15 then perform public.car_err('phone_required'); end if;
  if v_email is not null and v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then perform public.car_err('email_invalid'); end if;
  if v_class is not null and v_class not in ('economy','compact','crossover','suv4x4','safari','luxury','van','pickup') then v_class := null; end if;
  if v_trans not in ('any','automatic','manual') then v_trans := 'any'; end if;
  if v_seats < 1 or v_seats > 60 then v_seats := 1; end if;
  if (select count(*) from public.car_requests where public.food_digits(phone) = public.food_digits(v_phone)
        and status = 'open') >= 3 then perform public.car_err('too_many_open'); end if;

  insert into public.car_requests (ref, user_id, guest_token, country_code, city, pickup_label, pickup_lat, pickup_lng,
    pickup_at, return_at, days, class, seats_min, transmission, with_chauffeur, delivery, budget_day_minor, currency,
    trip_label, notes, customer_name, phone, email, driver_age, licence_years, expires_at)
  values (public.car_new_ref('CQ-'), auth.uid(), public.food_secret(), v_country,
    nullif(left(btrim(coalesce(p->>'city', '')), 100), ''), v_label, v_lat, v_lng, v_pick, v_ret,
    public.car_days(v_pick, v_ret), v_class, v_seats, v_trans,
    coalesce((p->>'chauffeur')::boolean, false), coalesce((p->>'delivery')::boolean, false),
    case when v_budget > 0 then v_budget end, public.cabana_currency_for(v_country),
    nullif(left(btrim(coalesce(p->>'trip_label', '')), 160), ''), nullif(left(btrim(coalesce(p->>'notes', '')), 600), ''),
    v_name, v_phone, v_email, v_age, v_lic, v_pick - interval '1 hour')
  returning * into q;
  return jsonb_build_object('ref', q.ref, 'token', q.guest_token, 'status', q.status, 'expires_at', q.expires_at,
    'operators_notified', (select count(*) from public.car_operators o
      where o.verified and o.country_code = q.country_code
        and (o.location is null or extensions.st_dwithin(o.location,
             extensions.st_setsrid(extensions.st_makepoint(q.pickup_lng, q.pickup_lat), 4326)::extensions.geography,
             coalesce(o.service_radius_km, 150) * 1000))));
end $$;

create or replace function public.car_request_track(p_ref text, p_token text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare q public.car_requests%rowtype;
begin
  q := public.car_guest_request(p_ref, p_token);
  if q.status = 'open' and q.expires_at < now() then
    update public.car_requests set status = 'expired' where id = q.id and status = 'open';
    select * into q from public.car_requests where id = q.id;
  end if;
  return public.car_request_json(q, case when public.is_admin() and (p_token is null or p_token <> q.guest_token) then 'desk' else 'guest' end)
         || jsonb_build_object('booking_token', case when q.booking_id is not null then
              (select guest_token from public.car_bookings where id = q.booking_id) end);
end $$;

create or replace function public.car_request_cancel(p_ref text, p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare q public.car_requests%rowtype;
begin
  q := public.car_guest_request(p_ref, p_token);
  if q.status <> 'open' then perform public.car_err('request_closed', q.status); end if;
  update public.car_requests set status = 'cancelled' where id = q.id returning * into q;
  update public.car_request_offers set status = 'expired' where request_id = q.id and status = 'offered';
  return public.car_request_json(q, 'guest');
end $$;

/* Accepting an offer turns it into a confirmed hire, with the same
   handover code and tracking as a booking made from the fleet. */
create or replace function public.car_request_accept(p_ref text, p_token text, p_offer uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  q public.car_requests%rowtype; f public.car_request_offers%rowtype; o public.car_operators%rowtype;
  v public.car_fleet%rowtype; b public.car_bookings%rowtype; v_tz text;
begin
  q := public.car_guest_request(p_ref, p_token);
  select * into q from public.car_requests where id = q.id for update;
  if q.status <> 'open' then perform public.car_err('request_closed', q.status); end if;
  select * into f from public.car_request_offers where id = p_offer and request_id = q.id for update;
  if not found or f.status <> 'offered' then perform public.car_err('offer_gone'); end if;
  if f.expires_at is not null and f.expires_at < now() then perform public.car_err('offer_expired'); end if;
  if f.operator_id is not null then select * into o from public.car_operators where id = f.operator_id; end if;
  if f.vehicle_id is not null then select * into v from public.car_fleet where id = f.vehicle_id; end if;
  v_tz := public.cabana_tz_for(q.country_code);

  begin
    insert into public.car_bookings (
      ref, vehicle_id, operator_id, user_id, starts_on, ends_on, days, with_chauffeur,
      pickup_mode, pickup_detail, insurance_tier, extras, price_breakdown, total, deposit_held, pay_at_counter,
      customer_name, phone, email, notes, status, guest_token, currency, pickup_at, return_at, delivery, delivery_label,
      delivery_lat, delivery_lng, base_minor, total_minor, deposit_minor, driver_age, licence_years, trip_label,
      expires_at, responded_at, handover_code, vehicle_snapshot, operator_snapshot, pay_method, request_id)
    values (
      public.car_new_ref('CD-'), f.vehicle_id, f.operator_id, q.user_id,
      (q.pickup_at at time zone v_tz)::date, (q.return_at at time zone v_tz)::date, q.days, q.with_chauffeur,
      case when q.delivery then 'delivery' else 'depot' end,
      case when q.delivery then q.pickup_label else coalesce(o.city, q.city) end,
      'operator', '[]'::jsonb,
      jsonb_build_object('lines', jsonb_build_array(
        jsonb_build_object('key', 'base', 'label', f.vehicle_label, 'detail',
          q.days || case when q.days = 1 then ' day' else ' days' end || ' · offer from ' || f.operator_name,
          'amount', f.total_minor),
        jsonb_build_object('key', 'commission', 'label', 'Cabana fee', 'detail', 'The operator keeps every shilling',
          'amount', 0, 'good', true)), 'offer_id', f.id, 'day_rate', f.day_rate_minor),
      least(f.total_minor, 2147483647)::int, least(f.deposit_minor, 2147483647)::int, 0,
      q.customer_name, q.phone, q.email, q.notes, 'confirmed', q.guest_token, f.currency, q.pickup_at, q.return_at,
      q.delivery, case when q.delivery then q.pickup_label end,
      case when q.delivery then q.pickup_lat end, case when q.delivery then q.pickup_lng end,
      f.total_minor, f.total_minor, f.deposit_minor, q.driver_age, q.licence_years, q.trip_label,
      null, now(), public.food_code(),
      coalesce(case when v.id is not null then public.car_vehicle_snapshot(v) end,
        jsonb_strip_nulls(jsonb_build_object('make', f.vehicle_label, 'class', f.class, 'seats', f.seats,
          'transmission', f.transmission, 'year', f.year, 'photo', f.photo_url))),
      jsonb_strip_nulls(jsonb_build_object('name', f.operator_name, 'phone', f.operator_phone,
        'city', coalesce(o.city, q.city), 'source', f.source)),
      'mpesa', q.id)
    returning * into b;
  exception when exclusion_violation then
    update public.car_request_offers set status = 'expired' where id = f.id;
    perform public.car_err('vehicle_booked');
  end;

  update public.car_request_offers set status = 'accepted' where id = f.id;
  update public.car_request_offers set status = 'lost' where request_id = q.id and id <> f.id and status = 'offered';
  update public.car_requests set status = 'matched', chosen_offer_id = f.id, booking_id = b.id where id = q.id;
  perform public.car_log(b.id, 'confirmed', 'guest', 'accepted an offer from ' || f.operator_name);
  return jsonb_build_object('booking_ref', b.ref, 'token', b.guest_token, 'status', b.status);
end $$;

create or replace function public.car_hires_list(p_pairs jsonb default '[]'::jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_b jsonb; v_q jsonb;
begin
  perform public.car_bookings_expire();
  select coalesce(jsonb_agg(x.j order by x.at desc), '[]'::jsonb) into v_b from (
    select b.created_at at, jsonb_strip_nulls(jsonb_build_object('ref', b.ref, 'status', b.status,
      'pickup_at', b.pickup_at, 'return_at', b.return_at, 'days', b.days,
      'total', coalesce(b.total_minor, b.total), 'currency', b.currency,
      'vehicle', coalesce(b.vehicle_snapshot->>'make', '') || ' ' || coalesce(b.vehicle_snapshot->>'model', ''),
      'photo', b.vehicle_snapshot->>'photo', 'operator', b.operator_snapshot->>'name', 'rating', b.rating,
      'token', case when b.user_id = auth.uid() then b.guest_token end)) j
      from public.car_bookings b
     where b.created_at > now() - interval '365 days'
       and ((b.user_id is not null and b.user_id = auth.uid())
         or exists (select 1 from jsonb_array_elements(coalesce(p_pairs, '[]'::jsonb)) e
                     where upper(e->>'ref') = b.ref and e->>'token' = b.guest_token))
     order by b.created_at desc limit 40) x;
  select coalesce(jsonb_agg(x.j order by x.at desc), '[]'::jsonb) into v_q from (
    select q.created_at at, jsonb_strip_nulls(jsonb_build_object('ref', q.ref, 'status', q.status,
      'pickup_at', q.pickup_at, 'return_at', q.return_at, 'days', q.days, 'class', q.class,
      'pickup_label', q.pickup_label,
      'offers', (select count(*) from public.car_request_offers f where f.request_id = q.id and f.status = 'offered'),
      'token', case when q.user_id = auth.uid() then q.guest_token end)) j
      from public.car_requests q
     where q.created_at > now() - interval '120 days'
       and ((q.user_id is not null and q.user_id = auth.uid())
         or exists (select 1 from jsonb_array_elements(coalesce(p_pairs, '[]'::jsonb)) e
                     where upper(e->>'ref') = q.ref and e->>'token' = q.guest_token))
     order by q.created_at desc limit 20) x;
  return jsonb_build_object('bookings', v_b, 'requests', v_q);
end $$;

-- ── 9 · the operator ────────────────────────────────────────────────
create or replace function public.car_me_operator()
returns public.car_operators
language plpgsql
stable
security definer
set search_path = public
as $$
declare o public.car_operators%rowtype;
begin
  select * into o from public.car_operators where owner_id = auth.uid();
  if not found then perform public.car_err('not_an_operator'); end if;
  return o;
end $$;

create or replace function public.car_operator_board()
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  o public.car_operators%rowtype;
  v_fleet jsonb; v_req jsonb; v_up jsonb; v_active jsonb; v_recent jsonb; v_asks jsonb; v_stats jsonb;
begin
  o := public.car_me_operator();
  perform public.car_bookings_expire();

  select coalesce(jsonb_agg(to_jsonb(f) - 'operator_id' order by f.created_at), '[]'::jsonb) into v_fleet
    from public.car_fleet f where f.operator_id = o.id and f.status <> 'retired';

  select coalesce(jsonb_agg(public.car_booking_json(b, 'operator') order by b.expires_at), '[]'::jsonb) into v_req
    from public.car_bookings b where b.operator_id = o.id and b.status = 'requested';
  select coalesce(jsonb_agg(public.car_booking_json(b, 'operator') order by b.pickup_at), '[]'::jsonb) into v_up
    from public.car_bookings b where b.operator_id = o.id and b.status = 'confirmed';
  select coalesce(jsonb_agg(public.car_booking_json(b, 'operator') order by b.return_at), '[]'::jsonb) into v_active
    from public.car_bookings b where b.operator_id = o.id and b.status = 'active';
  select coalesce(jsonb_agg(x.j order by x.at desc), '[]'::jsonb) into v_recent from (
    select b.updated_at at, public.car_booking_json(b, 'operator') j from public.car_bookings b
     where b.operator_id = o.id and b.status in ('completed','cancelled','declined','expired','no_show')
     order by b.updated_at desc limit 15) x;

  select coalesce(jsonb_agg(public.car_request_json(q, 'operator') order by q.pickup_at), '[]'::jsonb) into v_asks
    from public.car_requests q
   where q.status = 'open' and q.expires_at > now() and q.country_code = o.country_code and o.verified
     and (o.location is null or extensions.st_dwithin(o.location,
          extensions.st_setsrid(extensions.st_makepoint(q.pickup_lng, q.pickup_lat), 4326)::extensions.geography,
          coalesce(o.service_radius_km, 150) * 1000));

  select jsonb_build_object(
    'completed', count(*) filter (where status = 'completed'),
    'earned', coalesce(sum(coalesce(total_minor, total)) filter (where status = 'completed'), 0),
    'upcoming_value', coalesce(sum(coalesce(total_minor, total)) filter (where status in ('confirmed','active')), 0),
    'answered', count(*) filter (where responded_at is not null),
    'missed', count(*) filter (where status = 'expired'))
    into v_stats from public.car_bookings where operator_id = o.id;

  return jsonb_build_object(
    'operator', (to_jsonb(o) - 'location' - 'owner_id') || jsonb_strip_nulls(jsonb_build_object(
      'lat', case when o.location is not null then extensions.st_y(o.location::extensions.geometry) end,
      'lng', case when o.location is not null then extensions.st_x(o.location::extensions.geometry) end)),
    'fleet', v_fleet, 'requested', v_req, 'upcoming', v_up, 'active', v_active, 'recent', v_recent,
    'requests', v_asks, 'stats', v_stats);
end $$;

create or replace function public.car_operator_respond(p_booking uuid, p_accept boolean, p_reason text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare o public.car_operators%rowtype; b public.car_bookings%rowtype;
begin
  o := public.car_me_operator();
  perform public.car_bookings_expire();
  select * into b from public.car_bookings where id = p_booking and operator_id = o.id for update;
  if not found then perform public.car_err('booking_not_found'); end if;
  if b.status <> 'requested' then perform public.car_err('already_answered', b.status); end if;
  if p_accept then
    if not public.car_vehicle_available(b.vehicle_id, b.pickup_at, b.return_at, b.id) then
      perform public.car_err('vehicle_booked');
    end if;
    begin
      update public.car_bookings set status = 'confirmed', responded_at = now() where id = b.id returning * into b;
    exception when exclusion_violation then perform public.car_err('vehicle_booked'); end;
    perform public.car_log(b.id, 'confirmed', 'operator', null);
  else
    update public.car_bookings set status = 'declined', responded_at = now(),
           decline_reason = nullif(left(btrim(coalesce(p_reason, '')), 240), '')
     where id = b.id returning * into b;
    perform public.car_log(b.id, 'declined', 'operator', b.decline_reason);
  end if;
  update public.car_operators set response_mins = coalesce(round((coalesce(response_mins, 0) * 0.7)
         + extract(epoch from (now() - b.created_at)) / 60 * 0.3)::int, response_mins) where id = o.id;
  return public.car_booking_json(b, 'operator');
end $$;

create or replace function public.car_operator_booking_update(p_booking uuid, p_action text, p jsonb default '{}'::jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare o public.car_operators%rowtype; b public.car_bookings%rowtype;
begin
  o := public.car_me_operator();
  select * into b from public.car_bookings where id = p_booking and operator_id = o.id for update;
  if not found then perform public.car_err('booking_not_found'); end if;

  if p_action = 'collected' then
    if b.status <> 'confirmed' then perform public.car_err('bad_step', b.status); end if;
    if b.code_attempts >= 8 then perform public.car_err('code_locked'); end if;
    if public.food_digits(p->>'code') is distinct from b.handover_code then
      update public.car_bookings set code_attempts = code_attempts + 1 where id = b.id returning * into b;
      perform public.car_log(b.id, 'code_wrong', 'operator', null);
      return public.car_booking_json(b, 'operator') || jsonb_build_object('error', 'code_wrong',
        'attempts_left', greatest(0, 8 - b.code_attempts));
    end if;
    update public.car_bookings set status = 'active', collected_at = now() where id = b.id returning * into b;
    perform public.car_log(b.id, 'collected', 'operator', null);
  elsif p_action = 'returned' then
    if b.status <> 'active' then perform public.car_err('bad_step', b.status); end if;
    update public.car_bookings set status = 'completed', returned_at = now(),
           notes = case when nullif(btrim(coalesce(p->>'note', '')), '') is null then notes
                        else left(concat_ws(E'\n', notes, 'Return: ' || btrim(p->>'note')), 1200) end
     where id = b.id returning * into b;
    update public.car_operators set completed_hires = completed_hires + 1 where id = o.id;
    perform public.car_log(b.id, 'returned', 'operator', nullif(btrim(coalesce(p->>'note', '')), ''));
  elsif p_action = 'paid' then
    if b.status not in ('confirmed','active','completed') then perform public.car_err('bad_step', b.status); end if;
    update public.car_bookings set paid_at = coalesce(paid_at, now()) where id = b.id returning * into b;
    perform public.car_log(b.id, 'paid', 'operator', null);
  elsif p_action = 'no_show' then
    if b.status <> 'confirmed' or b.pickup_at > now() - interval '2 hours' then perform public.car_err('bad_step', b.status); end if;
    update public.car_bookings set status = 'no_show' where id = b.id returning * into b;
    perform public.car_log(b.id, 'no_show', 'operator', null);
  elsif p_action = 'cancel' then
    if b.status not in ('confirmed') then perform public.car_err('bad_step', b.status); end if;
    update public.car_bookings set status = 'cancelled', cancelled_at = now(), cancelled_by = 'operator',
           cancel_reason = nullif(left(btrim(coalesce(p->>'reason', '')), 240), '')
     where id = b.id returning * into b;
    perform public.car_log(b.id, 'cancelled', 'operator', b.cancel_reason);
  else
    perform public.car_err('bad_action');
  end if;
  return public.car_booking_json(b, 'operator');
end $$;

create or replace function public.car_operator_settings(p jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare o public.car_operators%rowtype;
begin
  o := public.car_me_operator();
  update public.car_operators set
    mpesa_till = case when p ? 'mpesa_till' then nullif(left(public.food_digits(p->>'mpesa_till'), 12), '') else mpesa_till end,
    mpesa_paybill = case when p ? 'mpesa_paybill' then nullif(left(public.food_digits(p->>'mpesa_paybill'), 12), '') else mpesa_paybill end,
    mpesa_account = case when p ? 'mpesa_account' then nullif(left(btrim(p->>'mpesa_account'), 40), '') else mpesa_account end,
    accepts_cash = coalesce((p->>'accepts_cash')::boolean, accepts_cash),
    accepts_card = coalesce((p->>'accepts_card')::boolean, accepts_card),
    respond_window_mins = greatest(10, least(coalesce(nullif(p->>'respond_window_mins', '')::int, respond_window_mins), 1440)),
    delivers = coalesce((p->>'delivers')::boolean, delivers),
    delivery_fee_minor = greatest(0, coalesce(nullif(p->>'delivery_fee_minor', '')::bigint, delivery_fee_minor)),
    delivery_per_km_minor = greatest(0, coalesce(nullif(p->>'delivery_per_km_minor', '')::bigint, delivery_per_km_minor)),
    pickup_address = case when p ? 'pickup_address' then nullif(left(btrim(p->>'pickup_address'), 240), '') else pickup_address end,
    about = case when p ? 'about' then nullif(left(btrim(p->>'about'), 600), '') else about end,
    logo_url = case when p ? 'logo_url' then nullif(left(btrim(p->>'logo_url'), 500), '') else logo_url end,
    instant_confirm = coalesce((p->>'instant_confirm')::boolean, instant_confirm),
    phone = coalesce(nullif(left(btrim(p->>'phone'), 30), ''), phone),
    whatsapp = case when p ? 'whatsapp' then nullif(left(btrim(p->>'whatsapp'), 30), '') else whatsapp end,
    paused_until = case when p ? 'paused_until' then nullif(p->>'paused_until', '')::timestamptz else paused_until end
  where id = o.id returning * into o;
  return (to_jsonb(o) - 'location' - 'owner_id');
end $$;

create or replace function public.car_operator_vehicle_save(p jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  o public.car_operators%rowtype; v public.car_fleet%rowtype; v_id uuid := nullif(p->>'id', '')::uuid;
  v_identity_changed boolean := false; v_status text; e jsonb; v_extras jsonb := '[]'::jsonb;
begin
  o := public.car_me_operator();
  if v_id is not null then
    select * into v from public.car_fleet where id = v_id and operator_id = o.id for update;
    if not found then perform public.car_err('vehicle_not_found'); end if;
  end if;
  if jsonb_typeof(p->'extras') = 'array' then
    for e in select * from jsonb_array_elements(p->'extras') loop
      if length(btrim(coalesce(e->>'label', ''))) >= 2 and coalesce(nullif(e->>'price_minor', '')::bigint, -1) >= 0 then
        v_extras := v_extras || jsonb_build_object(
          'key', coalesce(nullif(regexp_replace(lower(coalesce(e->>'key', e->>'label')), '[^a-z0-9]+', '_', 'g'), ''), 'extra'),
          'label', left(btrim(e->>'label'), 40), 'price_minor', (e->>'price_minor')::bigint,
          'per', case when e->>'per' = 'hire' then 'hire' else 'day' end,
          'max', greatest(1, least(coalesce(nullif(e->>'max', '')::int, 1), 6)));
      end if;
    end loop;
  end if;

  if v_id is null then
    if coalesce(btrim(p->>'make'), '') = '' or coalesce(btrim(p->>'model'), '') = '' or nullif(p->>'day_rate', '') is null then
      perform public.car_err('vehicle_incomplete');
    end if;
    insert into public.car_fleet (operator_id, make, model, variant, year, plate, class, body, seats, ground_clearance_mm,
      drive, transmission, fuel, tank_litres, consumption_kmpl, aircon, day_rate, chauffeur_uplift_metro,
      chauffeur_uplift_upcountry, deposit, min_hire_days, min_driver_age, min_licence_years, cross_border_ok,
      photos, status, weekly_discount_pct, monthly_discount_pct, colour, description, features, instant_book,
      delivery_ok, mileage_cap_km, excess_km_minor, extras, fuel_policy)
    values (o.id, left(btrim(p->>'make'), 40), left(btrim(p->>'model'), 60), nullif(left(btrim(coalesce(p->>'variant', '')), 60), ''),
      greatest(1990, least(coalesce(nullif(p->>'year', '')::int, extract(year from now())::int), extract(year from now())::int + 1)),
      nullif(upper(left(btrim(coalesce(p->>'plate', '')), 16)), ''),
      coalesce(nullif(p->>'class', ''), 'economy'), coalesce(nullif(p->>'body', ''), 'sedan'),
      greatest(1, least(coalesce(nullif(p->>'seats', '')::int, 5), 60)),
      greatest(80, least(coalesce(nullif(p->>'ground_clearance_mm', '')::int, 160), 600)),
      coalesce(nullif(p->>'drive', ''), '2wd'), coalesce(nullif(p->>'transmission', ''), 'automatic'),
      coalesce(nullif(p->>'fuel', ''), 'petrol'), nullif(p->>'tank_litres', '')::int, nullif(p->>'consumption_kmpl', '')::numeric,
      coalesce((p->>'aircon')::boolean, true),
      greatest(0, (p->>'day_rate')::bigint)::int, greatest(0, coalesce(nullif(p->>'chauffeur_uplift_metro', '')::bigint, 0))::int,
      greatest(0, coalesce(nullif(p->>'chauffeur_uplift_upcountry', '')::bigint, 0))::int, greatest(0, coalesce(nullif(p->>'deposit', '')::bigint, 0))::int,
      greatest(1, coalesce(nullif(p->>'min_hire_days', '')::int, 1)), greatest(18, coalesce(nullif(p->>'min_driver_age', '')::int, 23)),
      greatest(0, coalesce(nullif(p->>'min_licence_years', '')::int, 2)), coalesce((p->>'cross_border_ok')::boolean, false),
      case when jsonb_typeof(p->'photos') = 'array' then p->'photos' else '[]'::jsonb end, 'review',
      greatest(0, least(coalesce(nullif(p->>'weekly_discount_pct', '')::int, 0), 60)),
      greatest(0, least(coalesce(nullif(p->>'monthly_discount_pct', '')::int, 0), 70)),
      nullif(left(btrim(coalesce(p->>'colour', '')), 30), ''), nullif(left(btrim(coalesce(p->>'description', '')), 600), ''),
      coalesce((select array_agg(left(btrim(x), 40)) from jsonb_array_elements_text(case when jsonb_typeof(p->'features') = 'array' then p->'features' else '[]'::jsonb end) x where btrim(x) <> ''), '{}'),
      coalesce((p->>'instant_book')::boolean, false), coalesce((p->>'delivery_ok')::boolean, true),
      nullif(p->>'mileage_cap_km', '')::int, nullif(p->>'excess_km_minor', '')::bigint, v_extras,
      coalesce(nullif(p->>'fuel_policy', ''), 'full_to_full'))
    returning * into v;
    update public.car_operators set fleet_size = (select count(*) from public.car_fleet where operator_id = o.id and status <> 'retired') where id = o.id;
    return to_jsonb(v);
  end if;

  v_identity_changed := (p ? 'make' and p->>'make' is distinct from v.make)
    or (p ? 'model' and p->>'model' is distinct from v.model)
    or (p ? 'plate' and upper(btrim(coalesce(p->>'plate', ''))) is distinct from coalesce(v.plate, ''));
  v_status := case
    when v.status in ('review','rejected') then v.status
    when v_identity_changed then 'review'
    when p->>'status' in ('active','paused','retired') then p->>'status'
    else v.status end;

  update public.car_fleet set
    make = coalesce(nullif(left(btrim(p->>'make'), 40), ''), make),
    model = coalesce(nullif(left(btrim(p->>'model'), 60), ''), model),
    variant = case when p ? 'variant' then nullif(left(btrim(p->>'variant'), 60), '') else variant end,
    year = coalesce(nullif(p->>'year', '')::int, year),
    plate = case when p ? 'plate' then nullif(upper(left(btrim(p->>'plate'), 16)), '') else plate end,
    class = coalesce(nullif(p->>'class', ''), class), body = coalesce(nullif(p->>'body', ''), body),
    seats = coalesce(nullif(p->>'seats', '')::int, seats),
    ground_clearance_mm = coalesce(nullif(p->>'ground_clearance_mm', '')::int, ground_clearance_mm),
    drive = coalesce(nullif(p->>'drive', ''), drive), transmission = coalesce(nullif(p->>'transmission', ''), transmission),
    fuel = coalesce(nullif(p->>'fuel', ''), fuel),
    tank_litres = coalesce(nullif(p->>'tank_litres', '')::int, tank_litres),
    consumption_kmpl = coalesce(nullif(p->>'consumption_kmpl', '')::numeric, consumption_kmpl),
    aircon = coalesce((p->>'aircon')::boolean, aircon),
    day_rate = coalesce(greatest(0, nullif(p->>'day_rate', '')::bigint)::int, day_rate),
    chauffeur_uplift_metro = coalesce(greatest(0, nullif(p->>'chauffeur_uplift_metro', '')::bigint)::int, chauffeur_uplift_metro),
    chauffeur_uplift_upcountry = coalesce(greatest(0, nullif(p->>'chauffeur_uplift_upcountry', '')::bigint)::int, chauffeur_uplift_upcountry),
    deposit = coalesce(greatest(0, nullif(p->>'deposit', '')::bigint)::int, deposit),
    min_hire_days = coalesce(greatest(1, nullif(p->>'min_hire_days', '')::int), min_hire_days),
    min_driver_age = coalesce(greatest(18, nullif(p->>'min_driver_age', '')::int), min_driver_age),
    min_licence_years = coalesce(greatest(0, nullif(p->>'min_licence_years', '')::int), min_licence_years),
    cross_border_ok = coalesce((p->>'cross_border_ok')::boolean, cross_border_ok),
    photos = case when jsonb_typeof(p->'photos') = 'array' then p->'photos' else photos end,
    weekly_discount_pct = coalesce(greatest(0, least(nullif(p->>'weekly_discount_pct', '')::int, 60)), weekly_discount_pct),
    monthly_discount_pct = coalesce(greatest(0, least(nullif(p->>'monthly_discount_pct', '')::int, 70)), monthly_discount_pct),
    colour = case when p ? 'colour' then nullif(left(btrim(p->>'colour'), 30), '') else colour end,
    description = case when p ? 'description' then nullif(left(btrim(p->>'description'), 600), '') else description end,
    features = case when jsonb_typeof(p->'features') = 'array' then coalesce((select array_agg(left(btrim(x), 40))
                 from jsonb_array_elements_text(p->'features') x where btrim(x) <> ''), '{}') else features end,
    instant_book = coalesce((p->>'instant_book')::boolean, instant_book),
    delivery_ok = coalesce((p->>'delivery_ok')::boolean, delivery_ok),
    mileage_cap_km = case when p ? 'mileage_cap_km' then nullif(p->>'mileage_cap_km', '')::int else mileage_cap_km end,
    excess_km_minor = case when p ? 'excess_km_minor' then nullif(p->>'excess_km_minor', '')::bigint else excess_km_minor end,
    extras = case when jsonb_typeof(p->'extras') = 'array' then v_extras else extras end,
    fuel_policy = coalesce(nullif(p->>'fuel_policy', ''), fuel_policy),
    status = v_status
  where id = v.id returning * into v;
  update public.car_operators set fleet_size = (select count(*) from public.car_fleet where operator_id = o.id and status <> 'retired') where id = o.id;
  return to_jsonb(v);
end $$;

create or replace function public.car_operator_blackout(p_vehicle uuid, p_start date, p_end date, p_remove boolean default false)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare o public.car_operators%rowtype;
begin
  o := public.car_me_operator();
  if not exists (select 1 from public.car_fleet where id = p_vehicle and operator_id = o.id) then perform public.car_err('vehicle_not_found'); end if;
  if p_start is null or p_end is null or p_end < p_start then perform public.car_err('dates_invalid'); end if;
  if p_remove then
    delete from public.car_blackouts where vehicle_id = p_vehicle and starts_on = p_start and ends_on = p_end and booking_id is null;
  else
    insert into public.car_blackouts (vehicle_id, starts_on, ends_on, reason)
    values (p_vehicle, p_start, p_end, 'operator') on conflict (vehicle_id, starts_on, ends_on, reason) do nothing;
  end if;
  return coalesce((select jsonb_agg(jsonb_build_object('starts_on', starts_on, 'ends_on', ends_on, 'reason', reason) order by starts_on)
                     from public.car_blackouts where vehicle_id = p_vehicle and ends_on >= current_date), '[]'::jsonb);
end $$;

create or replace function public.car_operator_request_offer(p_request uuid, p jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  o public.car_operators%rowtype; q public.car_requests%rowtype; v public.car_fleet%rowtype; f public.car_request_offers%rowtype;
  v_rate bigint; v_total bigint;
begin
  o := public.car_me_operator();
  if not coalesce(o.verified, false) then perform public.car_err('operator_not_verified'); end if;
  select * into q from public.car_requests where id = p_request for update;
  if not found or q.status <> 'open' or q.expires_at < now() then perform public.car_err('request_closed'); end if;
  if q.country_code <> o.country_code then perform public.car_err('request_out_of_area'); end if;
  if nullif(p->>'vehicle_id', '') is not null then
    select * into v from public.car_fleet where id = (p->>'vehicle_id')::uuid and operator_id = o.id and status = 'active';
    if not found then perform public.car_err('vehicle_unavailable'); end if;
    if not public.car_vehicle_available(v.id, q.pickup_at, q.return_at) then perform public.car_err('vehicle_booked'); end if;
  end if;
  v_rate := coalesce(nullif(p->>'day_rate_minor', '')::bigint, v.day_rate::bigint);
  if v_rate is null or v_rate <= 0 then perform public.car_err('price_required'); end if;
  v_total := coalesce(nullif(p->>'total_minor', '')::bigint, v_rate * q.days);
  if v_total < v_rate or v_total > v_rate * q.days * 3 then perform public.car_err('total_out_of_range'); end if;

  update public.car_request_offers set status = 'withdrawn'
   where request_id = q.id and operator_id = o.id and status = 'offered';
  insert into public.car_request_offers (request_id, operator_id, source, vehicle_id, vehicle_label, class, seats, transmission,
    year, photo_url, day_rate_minor, total_minor, deposit_minor, currency, note, operator_name, operator_phone, expires_at)
  values (q.id, o.id, 'operator', v.id,
    coalesce(nullif(btrim(concat_ws(' ', v.make, v.model)), ''), nullif(left(btrim(coalesce(p->>'vehicle_label', '')), 80), ''), 'Vehicle'),
    coalesce(v.class, nullif(p->>'class', '')), coalesce(v.seats, nullif(p->>'seats', '')::int),
    coalesce(v.transmission, nullif(p->>'transmission', '')), coalesce(v.year, nullif(p->>'year', '')::int),
    coalesce(case when jsonb_typeof(v.photos) = 'array' then v.photos->>0 end, nullif(p->>'photo_url', '')),
    v_rate, v_total, greatest(0, coalesce(nullif(p->>'deposit_minor', '')::bigint, v.deposit::bigint, 0)),
    coalesce(o.currency_code, q.currency), nullif(left(btrim(coalesce(p->>'note', '')), 240), ''),
    o.name, o.phone, q.expires_at)
  returning * into f;
  return public.car_request_json(q, 'operator');
end $$;

-- ── 10 · the desk ───────────────────────────────────────────────────
create or replace function public.car_desk_board()
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if not public.is_admin() then perform public.car_err('forbidden'); end if;
  perform public.car_bookings_expire();
  return jsonb_build_object(
    'operators', coalesce((select jsonb_agg((to_jsonb(o) - 'location') || jsonb_build_object(
        'vehicles', (select count(*) from public.car_fleet f where f.operator_id = o.id),
        'in_review', (select count(*) from public.car_fleet f where f.operator_id = o.id and f.status = 'review'))
        order by o.verified, o.created_at desc) from public.car_operators o), '[]'::jsonb),
    'vehicles', coalesce((select jsonb_agg(to_jsonb(f) || jsonb_build_object('operator_name', o.name, 'operator_verified', o.verified)
        order by f.status = 'review' desc, f.created_at desc)
        from public.car_fleet f join public.car_operators o on o.id = f.operator_id where f.status <> 'retired'), '[]'::jsonb),
    'requests', coalesce((select jsonb_agg(public.car_request_json(q, 'desk') order by q.pickup_at)
        from public.car_requests q where q.status = 'open'), '[]'::jsonb),
    'bookings', coalesce((select jsonb_agg(x.j order by x.at desc) from (
        select b.created_at at, public.car_booking_json(b, 'desk') j from public.car_bookings b
         order by b.created_at desc limit 60) x), '[]'::jsonb));
end $$;

create or replace function public.car_desk_operator_verify(p_operator uuid, p_verified boolean)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare o public.car_operators%rowtype;
begin
  if not public.is_admin() then perform public.car_err('forbidden'); end if;
  update public.car_operators set verified = p_verified, verified_at = case when p_verified then now() end
   where id = p_operator returning * into o;
  if not found then perform public.car_err('operator_not_found'); end if;
  insert into public.admin_audit_log (action, target_type, target_id, actor_email, meta)
  values (case when p_verified then 'carhire.operator.verify' else 'carhire.operator.unverify' end, 'car_operator', p_operator::text,
          lower(coalesce(auth.jwt() ->> 'email', 'unknown')), '{}'::jsonb);
  perform public.cabana_notify(o.owner_id, 'booking',
    case when p_verified then 'Your fleet is verified on Cabana' else 'Your fleet verification was paused' end,
    case when p_verified then 'Approved cars now appear to guests. Keep your rates and calendar current.'
         else 'Guests cannot book your cars until the Cabana team re-verifies them.' end,
    '/partner-fleet', jsonb_build_object('operator_id', o.id));
  return to_jsonb(o) - 'location';
end $$;

create or replace function public.car_desk_vehicle_status(p_vehicle uuid, p_status text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v public.car_fleet%rowtype; o public.car_operators%rowtype;
begin
  if not public.is_admin() then perform public.car_err('forbidden'); end if;
  if p_status not in ('active','paused','rejected','review','retired') then perform public.car_err('status_invalid'); end if;
  update public.car_fleet set status = p_status where id = p_vehicle returning * into v;
  if not found then perform public.car_err('vehicle_not_found'); end if;
  select * into o from public.car_operators where id = v.operator_id;
  insert into public.admin_audit_log (action, target_type, target_id, actor_email, meta)
  values ('carhire.vehicle.' || p_status, 'car_fleet', p_vehicle::text,
          lower(coalesce(auth.jwt() ->> 'email', 'unknown')), jsonb_build_object('operator', v.operator_id));
  if p_status in ('active','rejected') then
    perform public.cabana_notify(o.owner_id, 'booking',
      case when p_status = 'active' then v.make || ' ' || v.model || ' is live' else v.make || ' ' || v.model || ' was not approved' end,
      case when p_status = 'active' then 'Guests can now book it on Cabana Drive.' else 'Open your fleet desk to see what to fix.' end,
      '/partner-fleet', jsonb_build_object('vehicle_id', v.id));
  end if;
  return to_jsonb(v);
end $$;

create or replace function public.car_desk_request_offer(p_request uuid, p jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare q public.car_requests%rowtype; v_rate bigint; v_total bigint;
begin
  if not public.is_admin() then perform public.car_err('forbidden'); end if;
  select * into q from public.car_requests where id = p_request for update;
  if not found or q.status <> 'open' then perform public.car_err('request_closed'); end if;
  v_rate := nullif(p->>'day_rate_minor', '')::bigint;
  if v_rate is null or v_rate <= 0 then perform public.car_err('price_required'); end if;
  v_total := coalesce(nullif(p->>'total_minor', '')::bigint, v_rate * q.days);
  if length(btrim(coalesce(p->>'operator_name', ''))) < 2 or length(btrim(coalesce(p->>'vehicle_label', ''))) < 2 then
    perform public.car_err('offer_details_required');
  end if;
  insert into public.car_request_offers (request_id, operator_id, source, vehicle_label, class, seats, transmission, year,
    photo_url, day_rate_minor, total_minor, deposit_minor, currency, note, operator_name, operator_phone, expires_at)
  values (q.id, null, 'desk', left(btrim(p->>'vehicle_label'), 80), nullif(p->>'class', ''), nullif(p->>'seats', '')::int,
    nullif(p->>'transmission', ''), nullif(p->>'year', '')::int, nullif(p->>'photo_url', ''),
    v_rate, v_total, greatest(0, coalesce(nullif(p->>'deposit_minor', '')::bigint, 0)), q.currency,
    nullif(left(btrim(coalesce(p->>'note', '')), 240), ''), left(btrim(p->>'operator_name'), 80),
    nullif(left(btrim(coalesce(p->>'operator_phone', '')), 30), ''), q.expires_at);
  return public.car_request_json(q, 'desk');
end $$;

create or replace function public.car_desk_booking_update(p_booking uuid, p_action text, p_note text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare b public.car_bookings%rowtype;
begin
  if not public.is_admin() then perform public.car_err('forbidden'); end if;
  select * into b from public.car_bookings where id = p_booking for update;
  if not found then perform public.car_err('booking_not_found'); end if;
  if p_action = 'confirm' and b.status = 'requested' then
    update public.car_bookings set status = 'confirmed', responded_at = now() where id = b.id returning * into b;
  elsif p_action = 'collected' and b.status = 'confirmed' then
    update public.car_bookings set status = 'active', collected_at = now() where id = b.id returning * into b;
  elsif p_action = 'returned' and b.status = 'active' then
    update public.car_bookings set status = 'completed', returned_at = now() where id = b.id returning * into b;
  elsif p_action = 'paid' and b.status in ('confirmed','active','completed') then
    update public.car_bookings set paid_at = coalesce(paid_at, now()) where id = b.id returning * into b;
  elsif p_action = 'cancel' and b.status in ('requested','confirmed','pending') then
    update public.car_bookings set status = 'cancelled', cancelled_at = now(), cancelled_by = 'desk',
           cancel_reason = nullif(left(btrim(coalesce(p_note, '')), 240), '') where id = b.id returning * into b;
  else
    perform public.car_err('bad_step', b.status);
  end if;
  perform public.car_log(b.id, 'desk_' || p_action, 'desk', p_note);
  return public.car_booking_json(b, 'desk');
end $$;

-- ── 11 · the clock ─────────────────────────────────────────────────
create or replace function public.car_hire_tick()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare n_b int; n_q int := 0; n_d int := 0;
begin
  n_b := public.car_bookings_expire();
  with gone as (
    update public.car_requests set status = 'expired' where status = 'open' and expires_at < now() returning id
  ) select count(*) into n_q from gone;
  update public.car_request_offers f set status = 'expired'
   where f.status = 'offered' and exists (select 1 from public.car_requests q where q.id = f.request_id and q.status <> 'open');
  with esc as (
    update public.car_requests q set desk_at = now()
     where q.status = 'open' and q.desk_at is null
       and not exists (select 1 from public.car_request_offers f where f.request_id = q.id and f.status = 'offered')
       and (q.created_at < now() - interval '20 minutes' or q.pickup_at < now() + interval '6 hours')
     returning q.id
  ) select count(*) into n_d from esc;
  return jsonb_build_object('bookings_expired', n_b, 'requests_expired', n_q, 'escalated', n_d);
end $$;

-- ── 12 · who hears about what ──────────────────────────────────────
create or replace function public.car_bookings_after()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid; v_car text; v_when text; url_g text; url_o text; meta jsonb; v_tz text;
begin
  select owner_id into v_owner from public.car_operators where id = new.operator_id;
  v_car := coalesce(nullif(btrim(concat_ws(' ', new.vehicle_snapshot->>'make', new.vehicle_snapshot->>'model')), ''), 'your car');
  v_tz := public.cabana_tz_for(coalesce((select country_code from public.car_operators where id = new.operator_id), 'KE'));
  v_when := to_char(new.pickup_at at time zone v_tz, 'DD Mon HH24:MI') || ' → ' || to_char(new.return_at at time zone v_tz, 'DD Mon HH24:MI');
  url_g := '/carhire?booking=' || new.ref;
  url_o := '/partner-fleet?booking=' || new.ref;
  meta := jsonb_build_object('order_ref', new.ref, 'booking_id', new.id, 'status', new.status);

  if tg_op = 'INSERT' then
    if new.status = 'requested' then
      perform public.cabana_notify(v_owner, 'booking', 'New hire request · ' || v_car,
        new.customer_name || ' · ' || coalesce(v_when, '') || ' · ' || public.car_money(new.total_minor, new.currency)
          || '. Answer before ' || to_char(new.expires_at at time zone v_tz, 'HH24:MI') || '.', url_o, meta);
    elsif new.status = 'confirmed' then
      perform public.cabana_notify(v_owner, 'booking', 'New confirmed hire · ' || v_car,
        new.customer_name || ' · ' || coalesce(v_when, '') || ' · ' || public.car_money(new.total_minor, new.currency), url_o, meta);
      perform public.cabana_notify(new.user_id, 'booking', 'Your ' || v_car || ' is confirmed',
        coalesce(v_when, '') || '. Pay the operator directly; your handover code is in the booking.', url_g, meta);
    end if;
    return new;
  end if;
  if new.status is not distinct from old.status then return new; end if;

  if new.status = 'confirmed' then
    perform public.cabana_notify(new.user_id, 'booking', 'Your ' || v_car || ' is confirmed',
      coalesce(v_when, '') || '. Pay the operator directly; your handover code is in the booking.', url_g, meta);
  elsif new.status = 'declined' then
    perform public.cabana_notify(new.user_id, 'booking', 'The operator could not take your hire',
      coalesce(new.decline_reason, 'Choose another car for the same dates in one tap.'), url_g, meta);
  elsif new.status = 'expired' then
    perform public.cabana_notify(new.user_id, 'booking', 'Your hire request lapsed',
      'The operator did not answer in time. Nothing was charged.', url_g, meta);
    perform public.cabana_notify(v_owner, 'booking', 'Missed hire request ' || new.ref,
      'It expired before you answered. Set a longer response window or pause bookings when you are away.', url_o, meta);
  elsif new.status = 'cancelled' and new.cancelled_by = 'guest' then
    perform public.cabana_notify(v_owner, 'booking', 'Hire ' || new.ref || ' was cancelled',
      new.customer_name || ' cancelled. The car is free for those dates again.', url_o, meta);
  elsif new.status = 'cancelled' and new.cancelled_by in ('operator','desk') then
    perform public.cabana_notify(new.user_id, 'booking', 'Your hire was cancelled',
      coalesce(new.cancel_reason, 'The operator cancelled this hire.') || ' Nothing is owed to Cabana.', url_g, meta);
  elsif new.status = 'active' then
    perform public.cabana_notify(new.user_id, 'car', 'Keys handed over · enjoy the drive',
      'Return by ' || to_char(new.return_at at time zone v_tz, 'DD Mon HH24:MI') || '. Ref ' || new.ref || '.', url_g, meta);
  elsif new.status = 'completed' then
    perform public.cabana_notify(new.user_id, 'car', 'Hire complete',
      'Thanks for driving with Cabana. Tell others how ' || coalesce(new.operator_snapshot->>'name', 'the operator') || ' did.', url_g, meta);
  end if;
  return new;
end $$;

drop trigger if exists trg_car_bookings_after on public.car_bookings;
create trigger trg_car_bookings_after after insert or update of status on public.car_bookings
  for each row execute function public.car_bookings_after();

create or replace function public.car_requests_after()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare o record; a uuid; meta jsonb; v_tz text;
begin
  meta := jsonb_build_object('order_ref', new.ref, 'request_id', new.id, 'status', new.status);
  v_tz := public.cabana_tz_for(new.country_code);
  if tg_op = 'INSERT' then
    for o in select c.owner_id from public.car_operators c
              where c.verified and c.country_code = new.country_code and c.owner_id is not null
                and (c.location is null or extensions.st_dwithin(c.location,
                     extensions.st_setsrid(extensions.st_makepoint(new.pickup_lng, new.pickup_lat), 4326)::extensions.geography,
                     coalesce(c.service_radius_km, 150) * 1000)) loop
      perform public.cabana_notify(o.owner_id, 'booking', 'A guest needs a car · ' || coalesce(new.city, new.pickup_label),
        to_char(new.pickup_at at time zone v_tz, 'DD Mon') || ' → ' || to_char(new.return_at at time zone v_tz, 'DD Mon')
          || ' · ' || new.days || case when new.days = 1 then ' day' else ' days' end
          || coalesce(' · ' || new.class, '') || '. Send your offer.', '/partner-fleet?request=' || new.ref, meta);
    end loop;
    return new;
  end if;
  if new.desk_at is not null and old.desk_at is null and new.status = 'open' then
    for a in select * from public.cabana_admin_ids() loop
      perform public.cabana_notify(a, 'booking', 'Car request needs the desk · ' || new.ref,
        new.pickup_label || ' · ' || to_char(new.pickup_at at time zone v_tz, 'DD Mon HH24:MI') || ' · '
          || new.days || ' days · no operator offer yet', '/admin#/move', meta);
    end loop;
  end if;
  return new;
end $$;

drop trigger if exists trg_car_requests_after on public.car_requests;
create trigger trg_car_requests_after after insert or update of desk_at on public.car_requests
  for each row execute function public.car_requests_after();

create or replace function public.car_request_offers_after()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare q public.car_requests%rowtype; v_owner uuid;
begin
  select * into q from public.car_requests where id = new.request_id;
  if tg_op = 'INSERT' and new.status = 'offered' then
    perform public.cabana_notify(q.user_id, 'booking', 'New car offer · ' || public.car_money(new.total_minor, new.currency),
      new.vehicle_label || ' from ' || new.operator_name || '. Tap to compare and choose.',
      '/carhire?request=' || q.ref, jsonb_build_object('order_ref', q.ref, 'status', 'offer'));
  elsif tg_op = 'UPDATE' and new.status = 'accepted' and old.status is distinct from 'accepted' and new.operator_id is not null then
    select owner_id into v_owner from public.car_operators where id = new.operator_id;
    perform public.cabana_notify(v_owner, 'booking', 'Your offer was accepted · ' || q.ref,
      q.customer_name || ' chose your ' || new.vehicle_label || '. It is a confirmed hire now.',
      '/partner-fleet', jsonb_build_object('order_ref', q.ref, 'status', 'accepted'));
  end if;
  return new;
end $$;

drop trigger if exists trg_car_request_offers_after on public.car_request_offers;
create trigger trg_car_request_offers_after after insert or update of status on public.car_request_offers
  for each row execute function public.car_request_offers_after();

-- ── 13 · grants ─────────────────────────────────────────────────────
revoke all on function public.car_err(text, text) from public, anon, authenticated;
revoke all on function public.car_new_ref(text) from public, anon, authenticated;
revoke all on function public.car_log(uuid, text, text, text) from public, anon, authenticated;
revoke all on function public.car_vehicle_available(uuid, timestamptz, timestamptz, uuid) from public, anon, authenticated;
revoke all on function public.car_price(public.car_fleet, public.car_operators, timestamptz, timestamptz, jsonb) from public, anon, authenticated;
revoke all on function public.car_vehicle_snapshot(public.car_fleet) from public, anon, authenticated;
revoke all on function public.car_booking_json(public.car_bookings, text) from public, anon, authenticated;
revoke all on function public.car_guest_booking(text, text) from public, anon, authenticated;
revoke all on function public.car_bookings_expire() from public, anon, authenticated;
revoke all on function public.car_request_json(public.car_requests, text) from public, anon, authenticated;
revoke all on function public.car_guest_request(text, text) from public, anon, authenticated;
revoke all on function public.car_me_operator() from public, anon, authenticated;
revoke all on function public.car_hire_tick() from public, anon, authenticated;
revoke all on function public.car_bookings_after() from public, anon, authenticated;
revoke all on function public.car_requests_after() from public, anon, authenticated;
revoke all on function public.car_request_offers_after() from public, anon, authenticated;
revoke all on function public.car_booking_blackout() from public, anon, authenticated;

revoke all on function public.car_quote(jsonb) from public;
revoke all on function public.car_booking_place(jsonb) from public;
revoke all on function public.car_booking_track(text, text) from public;
revoke all on function public.car_booking_cancel(text, text, text) from public;
revoke all on function public.car_booking_rate(text, text, int, text) from public;
revoke all on function public.car_request_place(jsonb) from public;
revoke all on function public.car_request_track(text, text) from public;
revoke all on function public.car_request_cancel(text, text) from public;
revoke all on function public.car_request_accept(text, text, uuid) from public;
revoke all on function public.car_hires_list(jsonb) from public;
grant execute on function public.car_quote(jsonb) to anon, authenticated;
grant execute on function public.car_booking_place(jsonb) to anon, authenticated;
grant execute on function public.car_booking_track(text, text) to anon, authenticated;
grant execute on function public.car_booking_cancel(text, text, text) to anon, authenticated;
grant execute on function public.car_booking_rate(text, text, int, text) to anon, authenticated;
grant execute on function public.car_request_place(jsonb) to anon, authenticated;
grant execute on function public.car_request_track(text, text) to anon, authenticated;
grant execute on function public.car_request_cancel(text, text) to anon, authenticated;
grant execute on function public.car_request_accept(text, text, uuid) to anon, authenticated;
grant execute on function public.car_hires_list(jsonb) to anon, authenticated;

revoke all on function public.car_operator_board() from public, anon;
revoke all on function public.car_operator_respond(uuid, boolean, text) from public, anon;
revoke all on function public.car_operator_booking_update(uuid, text, jsonb) from public, anon;
revoke all on function public.car_operator_settings(jsonb) from public, anon;
revoke all on function public.car_operator_vehicle_save(jsonb) from public, anon;
revoke all on function public.car_operator_blackout(uuid, date, date, boolean) from public, anon;
revoke all on function public.car_operator_request_offer(uuid, jsonb) from public, anon;
revoke all on function public.car_desk_board() from public, anon;
revoke all on function public.car_desk_operator_verify(uuid, boolean) from public, anon;
revoke all on function public.car_desk_vehicle_status(uuid, text) from public, anon;
revoke all on function public.car_desk_request_offer(uuid, jsonb) from public, anon;
revoke all on function public.car_desk_booking_update(uuid, text, text) from public, anon;
grant execute on function public.car_operator_board() to authenticated;
grant execute on function public.car_operator_respond(uuid, boolean, text) to authenticated;
grant execute on function public.car_operator_booking_update(uuid, text, jsonb) to authenticated;
grant execute on function public.car_operator_settings(jsonb) to authenticated;
grant execute on function public.car_operator_vehicle_save(jsonb) to authenticated;
grant execute on function public.car_operator_blackout(uuid, date, date, boolean) to authenticated;
grant execute on function public.car_operator_request_offer(uuid, jsonb) to authenticated;
grant execute on function public.car_desk_board() to authenticated;
grant execute on function public.car_desk_operator_verify(uuid, boolean) to authenticated;
grant execute on function public.car_desk_vehicle_status(uuid, text) to authenticated;
grant execute on function public.car_desk_request_offer(uuid, jsonb) to authenticated;
grant execute on function public.car_desk_booking_update(uuid, text, text) to authenticated;

do $$
begin
  perform cron.unschedule('cabana-car-hire-tick')
  where exists (select 1 from cron.job where jobname = 'cabana-car-hire-tick');
  perform cron.schedule('cabana-car-hire-tick', '* * * * *', 'select public.car_hire_tick()');
end $$;
