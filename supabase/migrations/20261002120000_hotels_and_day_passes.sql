-- ═══════════════════════════════════════════════════════════════════════
-- CABANA · HOTELS THAT WORK LIKE HOTELS, AND THE DAY PASS
-- ───────────────────────────────────────────────────────────────────────
-- A flat or a villa is one unit: book the nights, the whole place is
-- yours. A hotel is not. It sells room TYPES, each with a count of
-- identical rooms, nightly rates that move (weekends, events, seasons),
-- meal plans, a cheaper non-refundable rate, minimum stays and stop-sells.
-- One booking can be "two Deluxe Kings with breakfast and a Family Suite
-- room only". Two guests can hold the same type on the same night as long
-- as rooms remain. None of that fits a single daterange per listing.
--
--   listings.booking_model     'unit' (default) or 'hotel'
--   hotel_room_types           what the hotel sells, and how many of each
--   hotel_rate_days            per-night price, allotment, stop-sell, min stay
--   hotel_room_holds           rooms actually held, counted, never overbooked
--
-- Inventory is claimed the same way stays claim dates: when the deposit
-- clears, under a row lock on each room type, all-or-nothing. If the last
-- room went to someone else first, the booking lands on 'dates_unavailable'
-- and the money becomes credit, exactly like a stay.
--
-- THE DAY PASS
-- A host can sell a few daytime hours (rest, work, a shower between
-- flights) at a lower rate than a night. The host sets the window, the
-- rate, the days of the week and how many guests, and switches it on or
-- off from the partner page. A day pass holds the unit for that date, so
-- it can never collide with an overnight guest, and its window always
-- starts at or after the morning checkout so turnover is respected.
-- It is paid in full: it is small, and it is usually for today.
-- ═══════════════════════════════════════════════════════════════════════

-- ── 1 · listings learn two new tricks ─────────────────────────────────
alter table public.listings
  add column if not exists booking_model       text     not null default 'unit',
  add column if not exists day_pass_enabled    boolean  not null default false,
  add column if not exists day_pass_price      numeric,
  add column if not exists day_pass_start      time     not null default '10:00',
  add column if not exists day_pass_end        time     not null default '17:00',
  add column if not exists day_pass_max_guests integer,
  add column if not exists day_pass_days       smallint[] not null default '{0,1,2,3,4,5,6}',
  add column if not exists day_pass_note       text;
do $$ begin
  alter table public.listings add constraint listings_booking_model_chk check (booking_model in ('unit', 'hotel'));
exception when duplicate_object then null; end $$;

create or replace function cabana_private.listing_day_pass_rules()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
declare v_out time; v_problem text; v_changed boolean; v_night numeric;
begin
  if coalesce(new.service, 'stays') <> 'stays' or new.booking_model = 'hotel' then
    new.day_pass_enabled := false;
    return new;
  end if;
  if not new.day_pass_enabled then return new; end if;

  begin
    v_out := substring(coalesce(new.checkout_time, '') from '^\d{1,2}:\d{2}')::time;
  exception when others then v_out := null; end;
  v_out := coalesce(v_out, '10:00'::time);
  if new.day_pass_start < v_out then new.day_pass_start := v_out; end if;
  if new.day_pass_end > '23:00'::time then new.day_pass_end := '23:00'::time; end if;
  if new.day_pass_max_guests is not null then new.day_pass_max_guests := greatest(1, least(new.day_pass_max_guests, 50)); end if;
  new.day_pass_note := nullif(left(btrim(coalesce(new.day_pass_note, '')), 240), '');
  v_night := coalesce(new.price_night, new.price_per_night);

  v_problem := case
    when new.day_pass_price is null or new.day_pass_price <= 0 then 'Set a day pass rate before switching it on.'
    when v_night is not null and new.day_pass_price >= v_night then 'A day pass has to cost less than a night here.'
    when new.day_pass_end - new.day_pass_start < interval '2 hours' then 'A day pass window needs at least two hours after your checkout time.'
    when coalesce(cardinality(new.day_pass_days), 0) = 0 then 'Choose at least one day of the week for day passes.'
  end;
  if v_problem is null then return new; end if;

  v_changed := tg_op = 'INSERT'
    or new.day_pass_enabled is distinct from old.day_pass_enabled
    or new.day_pass_price  is distinct from old.day_pass_price
    or new.day_pass_start  is distinct from old.day_pass_start
    or new.day_pass_end    is distinct from old.day_pass_end
    or new.day_pass_days   is distinct from old.day_pass_days;
  if v_changed then raise exception '%', v_problem using errcode = '22023'; end if;
  -- An unrelated edit (a lower nightly rate, say) quietly pauses day passes.
  new.day_pass_enabled := false;
  return new;
end $$;
revoke all on function cabana_private.listing_day_pass_rules() from public, anon, authenticated;
create or replace trigger trg_listing_day_pass_rules before insert or update on public.listings
  for each row execute function cabana_private.listing_day_pass_rules();

-- ── 2 · bookings know what they are ───────────────────────────────────
alter table public.apartment_bookings
  add column if not exists booking_kind     text not null default 'stay',
  add column if not exists rooms            jsonb,
  add column if not exists day_start        timestamptz,
  add column if not exists day_end          timestamptz,
  add column if not exists arrival_time     text,
  add column if not exists special_requests text;
do $$ begin
  alter table public.apartment_bookings add constraint apartment_bookings_kind_chk
    check (booking_kind in ('stay', 'day_pass', 'hotel'));
exception when duplicate_object then null; end $$;

-- ── 3 · the hotel ─────────────────────────────────────────────────────
create table if not exists public.hotel_room_types (
  id                  uuid primary key default gen_random_uuid(),
  listing_id          uuid not null references public.listings(id) on delete cascade,
  name                text not null check (length(btrim(name)) between 2 and 80),
  description         text check (description is null or length(description) <= 1200),
  bed_setup           text check (bed_setup is null or length(bed_setup) <= 80),
  view                text check (view is null or length(view) <= 60),
  size_sqm            numeric check (size_sqm is null or size_sqm between 4 and 2000),
  max_adults          integer not null default 2 check (max_adults between 1 and 12),
  max_children        integer not null default 0 check (max_children between 0 and 8),
  units               integer not null default 1 check (units between 1 and 500),
  base_rate           numeric not null check (base_rate > 0 and base_rate < 10000000),
  weekend_rate        numeric check (weekend_rate is null or (weekend_rate > 0 and weekend_rate < 10000000)),
  breakfast_pp        numeric check (breakfast_pp is null or breakfast_pp >= 0),
  half_board_pp       numeric check (half_board_pp is null or half_board_pp >= 0),
  full_board_pp       numeric check (full_board_pp is null or full_board_pp >= 0),
  nonref_discount_pct numeric not null default 0 check (nonref_discount_pct between 0 and 50),
  min_nights          integer not null default 1 check (min_nights between 1 and 30),
  amenities           text[] not null default '{}',
  photos              text[] not null default '{}',
  sort                integer not null default 0,
  active              boolean not null default true,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index if not exists hotel_room_types_listing_idx on public.hotel_room_types (listing_id, sort) where active;

create table if not exists public.hotel_rate_days (
  room_type_id   uuid not null references public.hotel_room_types(id) on delete cascade,
  day            date not null,
  rate           numeric check (rate is null or (rate > 0 and rate < 10000000)),
  closed         boolean not null default false,
  units_override integer check (units_override is null or units_override >= 0),
  min_nights     integer check (min_nights is null or min_nights between 1 and 30),
  updated_at     timestamptz not null default now(),
  primary key (room_type_id, day)
);

create table if not exists public.hotel_room_holds (
  id             uuid primary key default gen_random_uuid(),
  room_type_id   uuid not null references public.hotel_room_types(id) on delete restrict,
  listing_id     uuid not null references public.listings(id) on delete cascade,
  booking_ref    text not null,
  booking_id     uuid,
  units          integer not null check (units > 0),
  stay           daterange not null,
  claimed_at     timestamptz not null default now(),
  released_at    timestamptz,
  release_reason text
);
create index if not exists hotel_room_holds_live_idx on public.hotel_room_holds using gist (room_type_id, stay) where released_at is null;
create index if not exists hotel_room_holds_ref_idx on public.hotel_room_holds (booking_ref);

alter table public.hotel_room_types enable row level security;
alter table public.hotel_rate_days enable row level security;
alter table public.hotel_room_holds enable row level security;
revoke all on public.hotel_room_types, public.hotel_rate_days, public.hotel_room_holds from public, anon, authenticated;
grant select on public.hotel_room_types to anon, authenticated;
do $$ begin
  create policy hotel_room_types_public_read on public.hotel_room_types for select to anon, authenticated
    using (active and exists (select 1 from public.listings l where l.id = listing_id
                               and l.is_active and l.status = 'active' and l.deleted_at is null));
exception when duplicate_object then null; end $$;

create or replace function cabana_private.can_manage_listing(p_listing uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select auth.uid() is not null and (
    exists (select 1 from public.listings l where l.id = p_listing and l.deleted_at is null
              and (l.partner_id = auth.uid() or l.host_id = auth.uid()))
    or coalesce(public.is_admin(), false));
$$;
revoke all on function cabana_private.can_manage_listing(uuid) from public, anon, authenticated;

-- One night's sellable price and allotment for a room type.
create or replace function cabana_private.hotel_night(p_type uuid, p_day date)
returns table (rate numeric, closed boolean, units integer, min_nights integer)
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select coalesce(o.rate, case when extract(dow from p_day) in (5, 6) and t.weekend_rate is not null
                               then t.weekend_rate else t.base_rate end),
         coalesce(o.closed, false),
         least(t.units, coalesce(o.units_override, t.units)),
         coalesce(o.min_nights, t.min_nights, 1)
    from public.hotel_room_types t
    left join public.hotel_rate_days o on o.room_type_id = t.id and o.day = p_day
   where t.id = p_type;
$$;
revoke all on function cabana_private.hotel_night(uuid, date) from public, anon, authenticated;

-- The fewest rooms of a type free on any night of a stay.
create or replace function cabana_private.hotel_free_units(p_type uuid, p_in date, p_out date, p_exclude text default null)
returns integer
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select coalesce(min(case when n.closed then 0 else greatest(0, n.units - coalesce((
            select sum(h.units) from public.hotel_room_holds h
             where h.room_type_id = p_type and h.released_at is null and h.stay @> g.day
               and (p_exclude is null or h.booking_ref <> p_exclude)), 0)) end), 0)::integer
    from (select d::date as day from generate_series(p_in, p_out - 1, interval '1 day') d) g
    cross join lateral cabana_private.hotel_night(p_type, g.day) n
   where exists (select 1 from public.hotel_room_types t where t.id = p_type and t.active);
$$;
revoke all on function cabana_private.hotel_free_units(uuid, date, date, text) from public, anon, authenticated;

-- ── 4 · quotes: what the guest will pay, decided here ─────────────────
create or replace function cabana_private.hotel_quote(p_listing uuid, p_checkin date, p_checkout date, p_rooms jsonb, p_exclude text default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  l public.listings%rowtype; t public.hotel_room_types%rowtype; line jsonb; nt record;
  n integer; v_qty integer; v_plan text; v_ref boolean; v_adults integer; v_children integer;
  v_free integer; v_room numeric; v_supp numeric; v_disc numeric; v_line numeric; v_min integer;
  lines jsonb := '[]'::jsonb; per_type jsonb := '{}'::jsonb; total numeric := 0;
  rooms_n integer := 0; guests_n integer := 0; all_ref boolean := true; fee numeric; k text;
begin
  select * into l from public.listings where id = p_listing and is_active and status = 'active'
     and deleted_at is null and coalesce(service, 'stays') = 'stays';
  if not found then raise exception 'This hotel is not available'; end if;
  if l.booking_model <> 'hotel' then raise exception 'This stay is booked as a whole, not by room'; end if;
  if coalesce(nullif(l.currency, ''), 'KES') <> 'KES' then raise exception 'Online checkout currently supports KES prices only'; end if;
  if p_checkin is null or p_checkout is null or p_checkin < (now() at time zone 'Africa/Nairobi')::date or p_checkout <= p_checkin then
    raise exception 'Choose valid dates';
  end if;
  n := p_checkout - p_checkin;
  if n > 60 then raise exception 'Hotel stays can be booked online for up to 60 nights'; end if;
  if jsonb_typeof(p_rooms) is distinct from 'array' or jsonb_array_length(p_rooms) = 0 then raise exception 'Choose at least one room'; end if;
  if jsonb_array_length(p_rooms) > 6 then raise exception 'Up to six room choices per booking'; end if;

  for line in select value from jsonb_array_elements(p_rooms) loop
    begin
      select * into t from public.hotel_room_types
       where id = nullif(line->>'room_type_id', '')::uuid and listing_id = l.id and active;
    exception when invalid_text_representation then t := null; end;
    if t.id is null then raise exception 'One of those rooms is no longer offered'; end if;
    v_qty := coalesce(nullif(line->>'qty', '')::integer, 1);
    if v_qty < 1 or v_qty > 20 then raise exception 'Choose between 1 and 20 rooms of a type'; end if;
    v_plan := coalesce(nullif(line->>'plan', ''), 'room_only');
    if v_plan not in ('room_only', 'breakfast', 'half_board', 'full_board') then raise exception 'Unknown meal plan'; end if;
    if v_plan = 'breakfast' and t.breakfast_pp is null then raise exception '% is not offered with breakfast', t.name; end if;
    if v_plan = 'half_board' and t.half_board_pp is null then raise exception '% is not offered half board', t.name; end if;
    if v_plan = 'full_board' and t.full_board_pp is null then raise exception '% is not offered full board', t.name; end if;
    v_ref := coalesce((line->>'refundable')::boolean, true) or coalesce(t.nonref_discount_pct, 0) <= 0;
    v_adults := greatest(1, coalesce(nullif(line->>'adults', '')::integer, least(2, t.max_adults)));
    v_children := greatest(0, coalesce(nullif(line->>'children', '')::integer, 0));
    if v_adults > t.max_adults then raise exception '% sleeps up to % adults', t.name, t.max_adults; end if;
    if v_children > t.max_children then raise exception '% takes up to % children', t.name, t.max_children; end if;

    k := t.id::text;
    per_type := jsonb_set(per_type, array[k], to_jsonb(coalesce((per_type->>k)::integer, 0) + v_qty));
    v_free := cabana_private.hotel_free_units(t.id, p_checkin, p_checkout, p_exclude);
    if v_free < (per_type->>k)::integer then
      raise exception 'Only % % left for those dates', v_free, t.name using errcode = '23P01';
    end if;

    v_room := 0; v_min := t.min_nights;
    for nt in select g.day, x.* from (select d::date as day from generate_series(p_checkin, p_checkout - 1, interval '1 day') d) g
              cross join lateral cabana_private.hotel_night(t.id, g.day) x loop
      v_room := v_room + nt.rate;
      if nt.day = p_checkin then v_min := greatest(v_min, nt.min_nights); end if;
    end loop;
    if n < v_min then raise exception '% needs at least % nights from that date', t.name, v_min; end if;

    v_supp := coalesce(case v_plan when 'breakfast' then t.breakfast_pp when 'half_board' then t.half_board_pp
                                   when 'full_board' then t.full_board_pp else 0 end, 0) * v_adults * n;
    v_disc := case when v_ref then 0 else coalesce(t.nonref_discount_pct, 0) end;
    v_line := round((v_room + v_supp) * v_qty * (1 - v_disc / 100.0));
    lines := lines || jsonb_build_object('room_type_id', t.id, 'name', t.name, 'bed_setup', t.bed_setup,
      'qty', v_qty, 'plan', v_plan, 'refundable', v_ref, 'adults', v_adults, 'children', v_children,
      'nights', n, 'avg_nightly', round(v_room / n), 'meal_total', v_supp * v_qty, 'discount_pct', v_disc,
      'line_total', v_line, 'rooms_left', v_free, 'photo', t.photos[1]);
    total := total + v_line;
    rooms_n := rooms_n + v_qty;
    guests_n := guests_n + (v_adults + v_children) * v_qty;
    all_ref := all_ref and v_ref;
  end loop;

  if rooms_n > 20 then raise exception 'Up to 20 rooms per online booking. Message the hotel for groups.'; end if;
  fee := cabana_private.facilitation_fee('stays', total);
  return jsonb_build_object('kind', 'hotel', 'listing_id', l.id, 'title', l.title, 'currency', 'KES',
    'checkin', p_checkin, 'checkout', p_checkout, 'nights', n, 'rooms', rooms_n, 'guests', guests_n,
    'lines', lines, 'refundable', all_ref, 'stay_total', total, 'service_fee', fee, 'grand_total', total + fee,
    'checkin_time', l.checkin_time, 'checkout_time', l.checkout_time, 'quoted_at', now(),
    'fingerprint', md5(jsonb_build_array('hotel', l.id, p_checkin, p_checkout, total, fee,
       (select jsonb_agg(jsonb_build_array(x->>'room_type_id', x->>'qty', x->>'plan', x->>'refundable', x->>'adults', x->>'children', x->>'line_total'))
          from jsonb_array_elements(lines) x))::text));
end $$;
revoke all on function cabana_private.hotel_quote(uuid, date, date, jsonb, text) from public, anon, authenticated;

create or replace function cabana_private.day_pass_quote(p_listing uuid, p_date date, p_guests integer)
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  l public.listings%rowtype; v_today date := (now() at time zone 'Africa/Nairobi')::date;
  v_now time := (now() at time zone 'Africa/Nairobi')::time; v_max integer; v_fee numeric;
begin
  select * into l from public.listings where id = p_listing and is_active and status = 'active'
     and deleted_at is null and coalesce(service, 'stays') = 'stays' and coalesce(ownership_type, 'sole') <> 'held';
  if not found then raise exception 'This stay is not available'; end if;
  if not l.day_pass_enabled or coalesce(l.day_pass_price, 0) <= 0 then raise exception 'This stay is not offering day passes right now'; end if;
  if coalesce(nullif(l.currency, ''), 'KES') <> 'KES' then raise exception 'Online checkout currently supports KES prices only'; end if;
  if p_date is null or p_date < v_today or p_date > v_today + 180 then raise exception 'Choose a day within the next six months'; end if;
  if not (extract(dow from p_date)::smallint = any (l.day_pass_days)) then raise exception 'Day passes are not offered on that day of the week'; end if;
  if p_date = v_today and v_now > l.day_pass_end - interval '2 hours' then
    raise exception 'Today''s window has closed. Pick another day.';
  end if;
  v_max := coalesce(l.day_pass_max_guests, nullif(l.max_guests, '')::integer, 4);
  if p_guests is null or p_guests < 1 or p_guests > v_max then raise exception 'Up to % guests on a day pass here', v_max; end if;
  if not public.cabana_dates_available(l.id, p_date, p_date + 1, null) then
    raise exception 'That day is already taken. Try another day.' using errcode = '23P01';
  end if;
  v_fee := cabana_private.facilitation_fee('stays', l.day_pass_price);
  return jsonb_build_object('kind', 'day_pass', 'listing_id', l.id, 'title', l.title, 'currency', 'KES',
    'date', p_date, 'start', to_char(l.day_pass_start, 'HH24:MI'), 'end', to_char(l.day_pass_end, 'HH24:MI'),
    'starts_at', (p_date + l.day_pass_start) at time zone 'Africa/Nairobi',
    'ends_at', (p_date + l.day_pass_end) at time zone 'Africa/Nairobi',
    'hours', round(extract(epoch from (l.day_pass_end - l.day_pass_start)) / 3600.0, 1),
    'guests', p_guests, 'max_guests', v_max, 'note', l.day_pass_note,
    'nightly', coalesce(l.price_night, l.price_per_night),
    'stay_total', l.day_pass_price, 'service_fee', v_fee, 'grand_total', l.day_pass_price + v_fee,
    'quoted_at', now(),
    'fingerprint', md5(jsonb_build_array('day_pass', l.id, p_date, p_guests, l.day_pass_price, v_fee,
                       l.day_pass_start, l.day_pass_end)::text));
end $$;
revoke all on function cabana_private.day_pass_quote(uuid, date, integer) from public, anon, authenticated;

create or replace function public.cabana_day_pass_quote(p_listing_id uuid, p_date date, p_guests integer default 1)
returns jsonb language sql stable security definer set search_path = pg_catalog as $$
  select cabana_private.day_pass_quote(p_listing_id, p_date, p_guests)
$$;
revoke all on function public.cabana_day_pass_quote(uuid, date, integer) from public;
grant execute on function public.cabana_day_pass_quote(uuid, date, integer) to anon, authenticated;

create or replace function public.cabana_hotel_quote(p_listing_id uuid, p_checkin date, p_checkout date, p_rooms jsonb)
returns jsonb language sql stable security definer set search_path = pg_catalog as $$
  select cabana_private.hotel_quote(p_listing_id, p_checkin, p_checkout, p_rooms, null)
$$;
revoke all on function public.cabana_hotel_quote(uuid, date, date, jsonb) from public;
grant execute on function public.cabana_hotel_quote(uuid, date, date, jsonb) to anon, authenticated;

-- The room picker: every type, what it offers, and (with dates) what is left.
create or replace function public.cabana_hotel_rooms(p_listing_id uuid, p_checkin date default null, p_checkout date default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare l public.listings%rowtype; out jsonb := '[]'::jsonb; t public.hotel_room_types%rowtype;
  v_free integer; v_total numeric; nt record; dated boolean;
begin
  select * into l from public.listings where id = p_listing_id and is_active and status = 'active' and deleted_at is null;
  if not found then raise exception 'This hotel is not available'; end if;
  dated := p_checkin is not null and p_checkout is not null and p_checkout > p_checkin
           and p_checkin >= (now() at time zone 'Africa/Nairobi')::date and p_checkout - p_checkin <= 60;
  for t in select * from public.hotel_room_types where listing_id = l.id and active order by sort, base_rate loop
    v_free := null; v_total := null;
    if dated then
      v_free := cabana_private.hotel_free_units(t.id, p_checkin, p_checkout, null);
      v_total := 0;
      for nt in select x.* from (select d::date as day from generate_series(p_checkin, p_checkout - 1, interval '1 day') d) g
                cross join lateral cabana_private.hotel_night(t.id, g.day) x loop
        v_total := v_total + nt.rate;
      end loop;
    end if;
    out := out || jsonb_strip_nulls(jsonb_build_object('id', t.id, 'name', t.name, 'description', t.description,
      'bed_setup', t.bed_setup, 'view', t.view, 'size_sqm', t.size_sqm, 'max_adults', t.max_adults,
      'max_children', t.max_children, 'amenities', t.amenities, 'photos', t.photos, 'min_nights', t.min_nights,
      'from_rate', least(t.base_rate, coalesce(t.weekend_rate, t.base_rate)),
      'plans', jsonb_strip_nulls(jsonb_build_object('room_only', 0, 'breakfast', t.breakfast_pp,
                 'half_board', t.half_board_pp, 'full_board', t.full_board_pp)),
      'nonref_discount_pct', nullif(t.nonref_discount_pct, 0),
      'rooms_left', v_free, 'stay_rate', v_total,
      'avg_nightly', case when dated then round(v_total / (p_checkout - p_checkin)) end));
  end loop;
  return jsonb_build_object('listing_id', l.id, 'title', l.title, 'booking_model', l.booking_model,
    'checkin_time', l.checkin_time, 'checkout_time', l.checkout_time, 'rooms', out);
end $$;
revoke all on function public.cabana_hotel_rooms(uuid, date, date) from public;
grant execute on function public.cabana_hotel_rooms(uuid, date, date) to anon, authenticated;

-- ── 5 · one booking trigger, three kinds ──────────────────────────────
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
  v_kind text;
begin
  if tg_op = 'UPDATE' then
    new.offer_id := old.offer_id;
    new.offer_snapshot := old.offer_snapshot;
    new.quote_fingerprint := old.quote_fingerprint;
    new.booking_kind := old.booking_kind;
    new.rooms := old.rooms;
    new.day_start := old.day_start;
    new.day_end := old.day_end;
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
      new.payment_mode    := old.payment_mode;
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

  v_kind := coalesce(nullif(new.booking_kind, ''), 'stay');
  if v_kind not in ('stay', 'day_pass', 'hotel') then
    raise exception 'Unknown booking kind' using errcode = '22023';
  end if;
  perform set_config('cabana.quote_guest', new.guest_id::text, true);

  if v_kind = 'day_pass' then
    if new.checkin_date is null then raise exception 'Choose the day for your pass' using errcode = '22023'; end if;
    new.checkout_date := new.checkin_date + 1;
    v_quote := cabana_private.day_pass_quote(v_listing_id, new.checkin_date, coalesce(new.num_guests, 1));
    v_nights := 0;
    new.day_start := (v_quote->>'starts_at')::timestamptz;
    new.day_end := (v_quote->>'ends_at')::timestamptz;
    new.rooms := null;
  elsif v_kind = 'hotel' then
    if v_listing.booking_model <> 'hotel' then raise exception 'This stay is booked as a whole, not by room' using errcode = '22023'; end if;
    if new.checkin_date is null or new.checkout_date is null
       or new.checkin_date < (now() at time zone 'Africa/Nairobi')::date
       or new.checkout_date <= new.checkin_date then
      raise exception 'Invalid stay dates' using errcode = '22023';
    end if;
    v_quote := cabana_private.hotel_quote(v_listing_id, new.checkin_date, new.checkout_date, coalesce(new.rooms, '[]'::jsonb), null);
    v_nights := new.checkout_date - new.checkin_date;
    new.rooms := v_quote->'lines';
    new.num_guests := (v_quote->>'guests')::integer;
    new.day_start := null; new.day_end := null;
  else
    if v_listing.booking_model = 'hotel' then
      raise exception 'Choose your room at this hotel before booking.' using errcode = '22023';
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
    v_quote := cabana_private.stay_quote(v_listing_id, new.checkin_date, new.checkout_date, coalesce(new.num_guests, 1));
    new.rooms := null; new.day_start := null; new.day_end := null;
  end if;

  if new.quote_fingerprint is not null and new.quote_fingerprint <> v_quote->>'fingerprint' then
    raise exception 'The price or offer changed. Review the refreshed total before paying.' using errcode = '22023';
  end if;
  if new.quote_fingerprint is null and new.stay_total is distinct from (v_quote->>'stay_total')::numeric then
    raise exception 'Please refresh to review the current price.' using errcode = '22023';
  end if;
  v_stay_total := (v_quote->>'stay_total')::numeric;
  v_service_fee := (v_quote->>'service_fee')::numeric;
  new.offer_id := case when v_kind = 'stay' then (v_quote->'offer'->>'id')::uuid end;
  new.offer_snapshot := case when v_kind = 'stay' then nullif(v_quote->'offer', 'null'::jsonb) end;
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

  new.booking_kind     := v_kind;
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
  new.arrival_time     := nullif(left(btrim(coalesce(new.arrival_time, '')), 20), '');
  new.special_requests := nullif(left(btrim(coalesce(new.special_requests, '')), 600), '');
  new.guest_code       := 'GUEST-' || upper(substr(encode(extensions.gen_random_bytes(8), 'hex'), 1, 8));
  new.host_code        := 'HOST-'  || upper(substr(encode(extensions.gen_random_bytes(8), 'hex'), 1, 8));
  new.payment_mode     := case when v_kind = 'day_pass' then 'full'
                               when new.payment_mode = 'full' then 'full' else 'deposit' end;
  return new;
end;
$$;

-- Claim a hotel booking's rooms, all of them or none.
create or replace function cabana_private.hotel_claim(p_booking_ref text)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare b public.apartment_bookings%rowtype; agg record; v_first uuid; v_id uuid;
begin
  select * into b from public.apartment_bookings where payment_reference = p_booking_ref;
  if not found or b.booking_kind <> 'hotel' or jsonb_typeof(b.rooms) <> 'array' then return null; end if;
  -- Lock each room type in id order, so two claims can never deadlock.
  perform 1 from public.hotel_room_types
   where id in (select (x->>'room_type_id')::uuid from jsonb_array_elements(b.rooms) x)
   order by id for update;
  for agg in select (x->>'room_type_id')::uuid as tid, sum((x->>'qty')::integer) as qty
               from jsonb_array_elements(b.rooms) x group by 1 loop
    if cabana_private.hotel_free_units(agg.tid, b.checkin_date, b.checkout_date, p_booking_ref) < agg.qty then
      return null;
    end if;
  end loop;
  for agg in select (x->>'room_type_id')::uuid as tid, sum((x->>'qty')::integer) as qty
               from jsonb_array_elements(b.rooms) x group by 1 loop
    insert into public.hotel_room_holds (room_type_id, listing_id, booking_ref, booking_id, units, stay)
    values (agg.tid, b.listing_id, p_booking_ref, b.id, agg.qty, daterange(b.checkin_date, b.checkout_date, '[)'))
    returning id into v_id;
    v_first := coalesce(v_first, v_id);
  end loop;
  return v_first;
end $$;
revoke all on function cabana_private.hotel_claim(text) from public, anon, authenticated;

create or replace function public.cabana_settle_booking(p_booking_ref text)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  b           public.apartment_bookings%rowtype;
  v_paid      numeric := 0;
  v_total     numeric := 0;
  v_deposit   numeric := 0;
  v_status    text;
  v_hold_id   uuid;
  v_lost      boolean := false;
  v_credited  numeric := 0;
  v_did       integer := 0;
begin
  select * into b from public.apartment_bookings
   where payment_reference = p_booking_ref for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'unknown_booking');
  end if;

  select coalesce(sum(amount), 0) into v_paid
    from public.booking_payments
   where booking_ref = p_booking_ref and status = 'paid';

  v_total   := coalesce(b.grand_total, 0);
  v_deposit := case when b.payment_mode = 'full' and b.booking_kind = 'day_pass' then v_total
                    else round(v_total * 0.25) end;

  if b.booking_kind = 'hotel' then
    select id into v_hold_id from public.hotel_room_holds
     where booking_ref = p_booking_ref and released_at is null limit 1;
  else
    select id into v_hold_id from public.listing_holds
     where booking_ref = p_booking_ref and released_at is null;
  end if;

  if v_total > 0 and v_paid >= v_deposit and v_hold_id is null
     and b.cancelled_at is null and b.listing_id is not null
     and b.checkin_date is not null and b.checkout_date > b.checkin_date
  then
    if b.booking_kind = 'hotel' then
      v_hold_id := cabana_private.hotel_claim(p_booking_ref);
      v_lost := v_hold_id is null;
    else
      begin
        insert into public.listing_holds
               (listing_id, booking_ref, booking_id, guest_id, stay)
        values (b.listing_id, p_booking_ref, b.id, b.guest_id,
                daterange(b.checkin_date, b.checkout_date, '[)'))
        returning id into v_hold_id;
      exception when exclusion_violation then
        v_lost := true;
      end;
    end if;
  end if;

  if v_lost then                              v_status := 'dates_unavailable';
  elsif v_total <= 0 or v_paid <= 0 then      v_status := 'pending_payment';
  elsif v_paid >= v_total then                v_status := 'paid_pending_checkin';
  elsif v_paid >= v_deposit then              v_status := 'confirmed_balance_due';
  else                                        v_status := 'part_paid';
  end if;

  if v_lost and v_paid > 0 and b.guest_id is not null then
    with ins as (
      insert into public.point_transactions
             (user_id, type, points, amount_kes, service_type, booking_ref, description)
      values (b.guest_id, 'earn', round(v_paid)::int, v_paid, 'stays', p_booking_ref,
              case when b.booking_kind = 'hotel'
                   then 'The last of those rooms went before your deposit cleared. Your payment is now credit and does not expire.'
                   else 'These dates were taken before your deposit cleared. Your payment is now credit and does not expire.' end)
      on conflict do nothing
      returning 1
    )
    select count(*) into v_did from ins;

    if v_did > 0 then
      v_credited := v_paid;
      update public.user_points
         set available_points = available_points + round(v_paid)::int,
             lifetime_points  = lifetime_points  + round(v_paid)::int,
             updated_at       = now()
       where user_id = b.guest_id;
      if not found then
        insert into public.user_points (user_id, available_points, lifetime_points)
        values (b.guest_id, round(v_paid)::int, round(v_paid)::int);
      end if;
    end if;
  end if;

  update public.apartment_bookings
     set amount_paid      = v_paid,
         deposit_required = round(v_total * 0.25),
         balance_amount   = greatest(0, round(v_total - v_paid)),
         balance_paid     = (v_total > 0 and v_paid >= v_total and not v_lost),
         status           = v_status,
         fully_paid_at    = case when v_total > 0 and v_paid >= v_total and not v_lost
                                 then coalesce(fully_paid_at, now()) else fully_paid_at end,
         refund_reason    = case when v_lost then 'dates_taken_converted_to_credit'
                                 else refund_reason end
   where id = b.id;

  return jsonb_build_object(
    'ok', true,
    'kind', b.booking_kind,
    'status', v_status,
    'amount_paid', v_paid,
    'grand_total', v_total,
    'outstanding', greatest(0, round(v_total - v_paid)),
    'deposit_required', v_deposit,
    'shortfall_to_confirm', greatest(0, v_deposit - v_paid),
    'percent_paid', case when v_total > 0 then least(100, round(v_paid / v_total * 100)) else 0 end,
    'confirmed', (v_total > 0 and v_paid >= v_deposit and not v_lost),
    'fully_paid', (v_total > 0 and v_paid >= v_total and not v_lost),
    'holds_dates', (v_hold_id is not null and not v_lost),
    'dates_lost', v_lost,
    'credited', v_credited
  );
end;
$$;

create or replace function public.cabana_claim_hold_on_deposit()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare v_ledger numeric;
begin
  if pg_trigger_depth() > 1 then return null; end if;
  if new.cancelled_at is not null or coalesce(new.grand_total, 0) <= 0
     or new.status in ('dates_unavailable', 'rehomed', 'checked_in', 'completed') then
    return null;
  end if;
  if exists (select 1 from public.listing_holds
              where booking_ref = new.payment_reference and released_at is null)
     or exists (select 1 from public.hotel_room_holds
              where booking_ref = new.payment_reference and released_at is null) then
    return null;
  end if;
  select coalesce(sum(amount), 0) into v_ledger
    from public.booking_payments
   where booking_ref = new.payment_reference and status = 'paid';
  if v_ledger >= round(new.grand_total * 0.25) then
    perform public.cabana_settle_booking(new.payment_reference);
  end if;
  return null;
end;
$$;

create or replace function public.cabana_release_hold_on_cancel()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if (new.cancelled_at is not null and old.cancelled_at is null)
     or (new.status in ('cancelled', 'refunded', 'rehomed', 'dates_unavailable') and old.status is distinct from new.status) then
    update public.listing_holds
       set released_at = now(), release_reason = coalesce(release_reason, 'booking_' || coalesce(new.status, 'cancelled'))
     where booking_ref = new.payment_reference and released_at is null
       and (new.cancelled_at is not null or new.status <> 'dates_unavailable');
    update public.hotel_room_holds
       set released_at = now(), release_reason = 'booking_' || coalesce(new.status, 'cancelled')
     where booking_ref = new.payment_reference and released_at is null;
  end if;
  return new;
end;
$$;
-- The existing trigger only watches cancelled_at; rooms are also given back
-- when a booking is refunded, rehomed or loses its dates.
create or replace trigger cabana_release_hold_on_status after update of status on public.apartment_bookings
  for each row execute function public.cabana_release_hold_on_cancel();

-- ── 6 · the host's desk for rooms and rates ───────────────────────────
create or replace function public.hotel_room_type_save(p jsonb)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare v_listing uuid; v_id uuid; t public.hotel_room_types%rowtype;
begin
  v_id := nullif(p->>'id', '')::uuid;
  if v_id is not null then
    select * into t from public.hotel_room_types where id = v_id;
    if not found then raise exception 'Room type not found' using errcode = 'P0002'; end if;
    v_listing := t.listing_id;
  else
    v_listing := nullif(p->>'listing_id', '')::uuid;
  end if;
  if v_listing is null or not cabana_private.can_manage_listing(v_listing) then
    raise exception 'You can only manage rooms on your own hotel' using errcode = '42501';
  end if;
  if (select coalesce(service, 'stays') from public.listings where id = v_listing) <> 'stays' then
    raise exception 'Rooms and rates are for stays only' using errcode = '22023';
  end if;
  if v_id is null and (select count(*) from public.hotel_room_types where listing_id = v_listing) >= 40 then
    raise exception 'Up to 40 room types per hotel' using errcode = '22023';
  end if;

  if v_id is null then
    insert into public.hotel_room_types (listing_id, name, base_rate)
    values (v_listing, coalesce(nullif(btrim(p->>'name'), ''), 'Room'), greatest(1, coalesce(nullif(p->>'base_rate', '')::numeric, 1)))
    returning * into t;
  end if;

  update public.hotel_room_types set
    name                = coalesce(nullif(left(btrim(p->>'name'), 80), ''), name),
    description         = case when p ? 'description' then nullif(left(btrim(p->>'description'), 1200), '') else description end,
    bed_setup           = case when p ? 'bed_setup' then nullif(left(btrim(p->>'bed_setup'), 80), '') else bed_setup end,
    view                = case when p ? 'view' then nullif(left(btrim(p->>'view'), 60), '') else view end,
    size_sqm            = case when p ? 'size_sqm' then nullif(p->>'size_sqm', '')::numeric else size_sqm end,
    max_adults          = coalesce(nullif(p->>'max_adults', '')::integer, max_adults),
    max_children        = coalesce(nullif(p->>'max_children', '')::integer, max_children),
    units               = coalesce(nullif(p->>'units', '')::integer, units),
    base_rate           = coalesce(nullif(p->>'base_rate', '')::numeric, base_rate),
    weekend_rate        = case when p ? 'weekend_rate' then nullif(p->>'weekend_rate', '')::numeric else weekend_rate end,
    breakfast_pp        = case when p ? 'breakfast_pp' then nullif(p->>'breakfast_pp', '')::numeric else breakfast_pp end,
    half_board_pp       = case when p ? 'half_board_pp' then nullif(p->>'half_board_pp', '')::numeric else half_board_pp end,
    full_board_pp       = case when p ? 'full_board_pp' then nullif(p->>'full_board_pp', '')::numeric else full_board_pp end,
    nonref_discount_pct = coalesce(nullif(p->>'nonref_discount_pct', '')::numeric, nonref_discount_pct),
    min_nights          = coalesce(nullif(p->>'min_nights', '')::integer, min_nights),
    amenities           = case when jsonb_typeof(p->'amenities') = 'array'
                               then (select coalesce(array_agg(left(btrim(x), 40)), '{}') from jsonb_array_elements_text(p->'amenities') x where btrim(x) <> '')
                               else amenities end,
    photos              = case when jsonb_typeof(p->'photos') = 'array'
                               then (select coalesce(array_agg(x), '{}') from jsonb_array_elements_text(p->'photos') x
                                      where x ~ '^https://[a-z0-9.-]+\.supabase\.co/storage/v1/object/public/listings/')
                               else photos end,
    sort                = coalesce(nullif(p->>'sort', '')::integer, sort),
    active              = coalesce((p->>'active')::boolean, active),
    updated_at          = now()
  where id = t.id
  returning * into t;

  -- The listing's headline price is the cheapest room, and it books by room.
  update public.listings l set booking_model = 'hotel', day_pass_enabled = false,
         price_night = (select min(least(base_rate, coalesce(weekend_rate, base_rate))) from public.hotel_room_types
                         where listing_id = l.id and active),
         updated_at = now()
   where l.id = t.listing_id
     and exists (select 1 from public.hotel_room_types where listing_id = l.id and active);
  return to_jsonb(t);
end $$;
revoke all on function public.hotel_room_type_save(jsonb) from public, anon;
grant execute on function public.hotel_room_type_save(jsonb) to authenticated;

create or replace function public.hotel_rate_days_set(p_room_type uuid, p_from date, p_to date, p jsonb)
returns integer
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare t public.hotel_room_types%rowtype; n integer;
  v_days smallint[];
begin
  select * into t from public.hotel_room_types where id = p_room_type;
  if not found or not cabana_private.can_manage_listing(t.listing_id) then
    raise exception 'You can only manage rates on your own hotel' using errcode = '42501';
  end if;
  if p_from is null or p_to is null or p_to < p_from or p_to - p_from > 366 then
    raise exception 'Choose a range of up to a year' using errcode = '22023';
  end if;
  if p_from < (now() at time zone 'Africa/Nairobi')::date - 1 then
    raise exception 'Past nights cannot be changed' using errcode = '22023';
  end if;
  v_days := case when jsonb_typeof(p->'weekdays') = 'array'
                 then (select array_agg(x::smallint) from jsonb_array_elements_text(p->'weekdays') x) end;

  if coalesce((p->>'clear')::boolean, false) then
    -- Back to the room's standing rate and full allotment.
    update public.hotel_rate_days set rate = null, closed = false, units_override = null, min_nights = null, updated_at = now()
     where room_type_id = t.id and day between p_from and p_to
       and (v_days is null or extract(dow from day)::smallint = any (v_days));
    get diagnostics n = row_count;
    return n;
  end if;

  insert into public.hotel_rate_days (room_type_id, day, rate, closed, units_override, min_nights, updated_at)
  select t.id, d::date,
         nullif(p->>'rate', '')::numeric,
         coalesce((p->>'closed')::boolean, false),
         case when nullif(p->>'units', '') is null then null else least(t.units, greatest(0, (p->>'units')::integer)) end,
         nullif(p->>'min_nights', '')::integer, now()
    from generate_series(p_from, p_to, interval '1 day') d
   where v_days is null or extract(dow from d)::smallint = any (v_days)
  on conflict (room_type_id, day) do update set
    rate = case when p ? 'rate' then excluded.rate else hotel_rate_days.rate end,
    closed = case when p ? 'closed' then excluded.closed else hotel_rate_days.closed end,
    units_override = case when p ? 'units' then excluded.units_override else hotel_rate_days.units_override end,
    min_nights = case when p ? 'min_nights' then excluded.min_nights else hotel_rate_days.min_nights end,
    updated_at = now();
  get diagnostics n = row_count;
  return n;
end $$;
revoke all on function public.hotel_rate_days_set(uuid, date, date, jsonb) from public, anon;
grant execute on function public.hotel_rate_days_set(uuid, date, date, jsonb) to authenticated;

-- The host's grid: every type, every night, what sells and what is left.
create or replace function public.hotel_inventory(p_listing uuid, p_from date default null, p_days integer default 21)
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare v_from date := coalesce(p_from, (now() at time zone 'Africa/Nairobi')::date);
  v_n integer := least(greatest(coalesce(p_days, 21), 1), 62); out jsonb := '[]'::jsonb; t public.hotel_room_types%rowtype;
  days jsonb;
begin
  if not cabana_private.can_manage_listing(p_listing) then
    raise exception 'You can only see inventory for your own hotel' using errcode = '42501';
  end if;
  for t in select * from public.hotel_room_types where listing_id = p_listing order by active desc, sort, base_rate loop
    select coalesce(jsonb_agg(jsonb_build_object('day', g.day, 'rate', n.rate, 'closed', n.closed,
             'units', n.units, 'min_nights', n.min_nights,
             'held', coalesce((select sum(h.units) from public.hotel_room_holds h
                                where h.room_type_id = t.id and h.released_at is null and h.stay @> g.day), 0),
             'override', exists (select 1 from public.hotel_rate_days o where o.room_type_id = t.id and o.day = g.day
                                   and (o.rate is not null or o.closed or o.units_override is not null or o.min_nights is not null)))
             order by g.day), '[]'::jsonb)
      into days
      from (select d::date as day from generate_series(v_from, v_from + v_n - 1, interval '1 day') d) g
      cross join lateral cabana_private.hotel_night(t.id, g.day) n;
    out := out || jsonb_build_object('type', to_jsonb(t), 'days', days);
  end loop;
  return jsonb_build_object('listing_id', p_listing, 'from', v_from, 'days', v_n, 'types', out,
    'bookings', coalesce((select jsonb_agg(jsonb_build_object('ref', b.payment_reference, 'guest', b.guest_name,
        'checkin', b.checkin_date, 'checkout', b.checkout_date, 'rooms', b.rooms, 'status', b.status,
        'arrival_time', b.arrival_time, 'requests', b.special_requests, 'total', b.stay_total) order by b.checkin_date)
      from public.apartment_bookings b
     where b.listing_id = p_listing and b.booking_kind = 'hotel' and b.cancelled_at is null
       and b.status in ('confirmed_balance_due', 'paid_pending_checkin', 'checked_in')
       and b.checkout_date >= v_from and b.checkin_date < v_from + v_n), '[]'::jsonb));
end $$;
revoke all on function public.hotel_inventory(uuid, date, integer) from public, anon;
grant execute on function public.hotel_inventory(uuid, date, integer) to authenticated;

-- Switching a stay back to a whole-unit listing is the host's call, but
-- never while hotel bookings are still ahead.
create or replace function public.hotel_set_booking_model(p_listing uuid, p_model text)
returns text
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if not cabana_private.can_manage_listing(p_listing) then raise exception 'Not your listing' using errcode = '42501'; end if;
  if p_model not in ('unit', 'hotel') then raise exception 'Unknown booking model' using errcode = '22023'; end if;
  if p_model = 'unit' and exists (select 1 from public.hotel_room_holds h where h.listing_id = p_listing
        and h.released_at is null and upper(h.stay) > (now() at time zone 'Africa/Nairobi')::date) then
    raise exception 'This hotel has room bookings ahead. Finish them before switching.' using errcode = '22023';
  end if;
  update public.listings set booking_model = p_model, updated_at = now() where id = p_listing;
  return p_model;
end $$;
revoke all on function public.hotel_set_booking_model(uuid, text) from public, anon;
grant execute on function public.hotel_set_booking_model(uuid, text) to authenticated;
