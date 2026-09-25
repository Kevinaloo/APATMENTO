/* ════════════════════════════════════════════════════════════════════
   CABANA RIDES · a marketplace, not a meter
   ────────────────────────────────────────────────────────────────────
   Until now a ride on Cabana was a form. The rider typed a route, the
   request landed in an admin table as "quote pending", and nothing
   told them whether anyone had read it. The live dispatch that existed
   underneath (drivers, presence, offers) was switched off by an insert
   guard that forced every request into the quote queue.

   This turns the request into a live negotiation, the way riders across
   Africa already move with inDrive-style apps, and keeps Cabana's rule:
   the price is set between the rider and the driver, and the driver
   keeps all of it.

     searching ─┬─ assigned ── arriving ── in_progress ── completed
                │     └─ (driver cancels) → searching again
                ├─ cancelled   (by the rider, or the desk)
                └─ unfulfilled (nobody took it inside the window)

   PRICE
   The rider names a fare, or asks for offers. Nearby drivers who fit
   the ride get an invitation; each answers with a price (the rider's,
   or a counter) and an ETA. The rider picks. With auto-accept on, the
   first driver to accept the rider's own fare gets the trip at once.
   A suggested fare comes from an admin-owned guide table that the
   public never reads directly: ride_fare_hint() returns totals only.
   Published price cards (fixed airport transfers) still work — the
   drivers see "fixed price" and can only accept it.

   THE DESK
   Supply is thin while Cabana grows. When no driver answers, the
   request is escalated to the Cabana desk (pricing_status becomes
   'awaiting_quote', which is exactly what the admin inbox already
   counts). The desk can post an offer on behalf of a partner driver
   who is not on the app yet, and progress that ride by hand.

   SAFETY
   · A four digit trip PIN. The driver must enter the rider's PIN to
     start the trip, which proves the rider got into the right car.
   · A separate share token gives family a read-only live view.
   · Riders who are not signed in hold a random token; nobody reads
     ride_requests directly any more except the desk.
   ════════════════════════════════════════════════════════════════════ */

-- ── 0 · shared helpers (also used by car hire) ─────────────────────
create or replace function public.cabana_currency_for(p_country text)
returns text language sql immutable set search_path = pg_catalog as $$
  select case upper(coalesce(p_country, ''))
    when 'DZ' then 'DZD' when 'AO' then 'AOA' when 'BJ' then 'XOF' when 'BW' then 'BWP'
    when 'BF' then 'XOF' when 'BI' then 'BIF' when 'CV' then 'CVE' when 'CM' then 'XAF'
    when 'CF' then 'XAF' when 'TD' then 'XAF' when 'KM' then 'KMF' when 'CD' then 'CDF'
    when 'CG' then 'XAF' when 'CI' then 'XOF' when 'DJ' then 'DJF' when 'EG' then 'EGP'
    when 'GQ' then 'XAF' when 'ER' then 'ERN' when 'SZ' then 'SZL' when 'ET' then 'ETB'
    when 'GA' then 'XAF' when 'GM' then 'GMD' when 'GH' then 'GHS' when 'GN' then 'GNF'
    when 'GW' then 'XOF' when 'KE' then 'KES' when 'LS' then 'LSL' when 'LR' then 'LRD'
    when 'LY' then 'LYD' when 'MG' then 'MGA' when 'MW' then 'MWK' when 'ML' then 'XOF'
    when 'MR' then 'MRU' when 'MU' then 'MUR' when 'MA' then 'MAD' when 'MZ' then 'MZN'
    when 'NA' then 'NAD' when 'NE' then 'XOF' when 'NG' then 'NGN' when 'RW' then 'RWF'
    when 'ST' then 'STN' when 'SN' then 'XOF' when 'SC' then 'SCR' when 'SL' then 'SLE'
    when 'SO' then 'SOS' when 'ZA' then 'ZAR' when 'SS' then 'SSP' when 'SD' then 'SDG'
    when 'TZ' then 'TZS' when 'TG' then 'XOF' when 'TN' then 'TND' when 'UG' then 'UGX'
    when 'ZM' then 'ZMW' when 'ZW' then 'USD'
    else 'USD' end;
$$;

/* Minor units per major unit, following the digits browsers use for
   each currency (Intl), so the page and the database agree. */
create or replace function public.cabana_minor_factor(p_currency text)
returns integer language sql immutable set search_path = pg_catalog as $$
  select case when upper(coalesce(p_currency, '')) in
    ('UGX','RWF','XOF','XAF','KMF','BIF','GNF','DJF','MGA','CVE','CLP','JPY','KRW','VND','PYG','ISK')
    then 1 else 100 end;
$$;

create or replace function public.cabana_is_africa(p_country text)
returns boolean language sql immutable set search_path = pg_catalog as $$
  select upper(coalesce(p_country, '')) = any (array[
    'DZ','AO','BJ','BW','BF','BI','CV','CM','CF','TD','KM','CD','CG','CI','DJ','EG','GQ','ER',
    'SZ','ET','GA','GM','GH','GN','GW','KE','LS','LR','LY','MG','MW','ML','MR','MU','MA','MZ',
    'NA','NE','NG','RW','ST','SN','SC','SL','SO','ZA','SS','SD','TZ','TG','TN','UG','ZM','ZW']);
$$;

/* The clock a rider actually lives on. Used for the night uplift and
   the traffic model; one zone per country is honest enough for both. */
create or replace function public.cabana_tz_for(p_country text)
returns text language sql immutable set search_path = pg_catalog as $$
  select case upper(coalesce(p_country, ''))
    when 'KE' then 'Africa/Nairobi' when 'UG' then 'Africa/Kampala' when 'TZ' then 'Africa/Dar_es_Salaam'
    when 'ET' then 'Africa/Addis_Ababa' when 'SO' then 'Africa/Mogadishu' when 'DJ' then 'Africa/Djibouti'
    when 'ER' then 'Africa/Asmara' when 'KM' then 'Indian/Comoro' when 'MG' then 'Indian/Antananarivo'
    when 'RW' then 'Africa/Kigali' when 'BI' then 'Africa/Bujumbura' when 'SS' then 'Africa/Juba'
    when 'SD' then 'Africa/Khartoum' when 'EG' then 'Africa/Cairo' when 'LY' then 'Africa/Tripoli'
    when 'TN' then 'Africa/Tunis' when 'DZ' then 'Africa/Algiers' when 'MA' then 'Africa/Casablanca'
    when 'MR' then 'Africa/Nouakchott' when 'ML' then 'Africa/Bamako' when 'SN' then 'Africa/Dakar'
    when 'GM' then 'Africa/Banjul' when 'GW' then 'Africa/Bissau' when 'GN' then 'Africa/Conakry'
    when 'SL' then 'Africa/Freetown' when 'LR' then 'Africa/Monrovia' when 'CI' then 'Africa/Abidjan'
    when 'BF' then 'Africa/Ouagadougou' when 'GH' then 'Africa/Accra' when 'TG' then 'Africa/Lome'
    when 'BJ' then 'Africa/Porto-Novo' when 'NE' then 'Africa/Niamey' when 'NG' then 'Africa/Lagos'
    when 'CM' then 'Africa/Douala' when 'TD' then 'Africa/Ndjamena' when 'CF' then 'Africa/Bangui'
    when 'GQ' then 'Africa/Malabo' when 'GA' then 'Africa/Libreville' when 'CG' then 'Africa/Brazzaville'
    when 'CD' then 'Africa/Kinshasa' when 'AO' then 'Africa/Luanda' when 'ZM' then 'Africa/Lusaka'
    when 'MW' then 'Africa/Blantyre' when 'MZ' then 'Africa/Maputo' when 'ZW' then 'Africa/Harare'
    when 'BW' then 'Africa/Gaborone' when 'NA' then 'Africa/Windhoek' when 'ZA' then 'Africa/Johannesburg'
    when 'LS' then 'Africa/Maseru' when 'SZ' then 'Africa/Mbabane' when 'MU' then 'Indian/Mauritius'
    when 'SC' then 'Indian/Mahe' when 'ST' then 'Africa/Sao_Tome' when 'CV' then 'Atlantic/Cape_Verde'
    else 'Africa/Nairobi' end;
$$;

/* One notification, one push. The same shape as food_notify, with the
   kind chosen by the caller so rides and car hire land in the right
   place (push-send mirrors only some kinds to email). */
create or replace function public.cabana_notify(p_user uuid, p_kind text, p_title text, p_body text, p_url text, p_meta jsonb)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, extensions, net, cabana_ops
as $$
declare nid uuid; secret text;
begin
  if p_user is null then return; end if;
  insert into public.notifications (user_id, title, body, url, kind, meta)
  values (p_user, left(p_title, 140), left(coalesce(p_body, ''), 240), p_url,
          coalesce(nullif(p_kind, ''), 'general'), coalesce(p_meta, '{}'::jsonb))
  returning id into nid;
  begin
    select value into secret from cabana_ops.cron_config where key = 'cron_secret';
    if secret is not null and secret <> '' then
      perform net.http_post(
        url := 'https://cabana.africa/api/push-send?action=database-notification',
        headers := jsonb_build_object('Authorization', 'Bearer ' || secret,
          'Content-Type', 'application/json', 'User-Agent', 'Cabana-Move/1.0'),
        body := jsonb_build_object('action', 'database-notification', 'notification_id', nid),
        timeout_milliseconds := 15000);
    end if;
  exception when others then
    raise warning 'cabana_notify push queue failed: %', sqlerrm;
  end;
end $$;

create or replace function public.cabana_admin_ids()
returns setof uuid
language sql
stable
security definer
set search_path = pg_catalog, public, auth
as $$
  select u.id from public.admin_users a join auth.users u on lower(u.email) = lower(a.email);
$$;

-- ── 1 · the request grows the fields a marketplace needs ───────────
alter table public.ride_requests
  add column if not exists guest_token        text,
  add column if not exists share_token        text,
  add column if not exists currency           text,
  add column if not exists rider_offer_minor  bigint,
  add column if not exists fare_hint_minor    bigint,
  add column if not exists agreed_minor       bigint,
  add column if not exists chosen_offer_id    uuid,
  add column if not exists auto_accept        boolean not null default false,
  add column if not exists pay_method         text not null default 'cash',
  add column if not exists trip_pin           text,
  add column if not exists pin_attempts       integer not null default 0,
  add column if not exists pin_verified_at    timestamptz,
  add column if not exists search_until       timestamptz,
  add column if not exists desk_at            timestamptz,
  add column if not exists arrived_at         timestamptz,
  add column if not exists hours              integer,
  add column if not exists luggage            integer not null default 0,
  add column if not exists stay_ref           text,
  add column if not exists assigned_snapshot  jsonb,
  add column if not exists rider_review       text,
  add column if not exists rider_rated_at     timestamptz,
  add column if not exists cancelled_by       text,
  add column if not exists offer_raises       integer not null default 0;

do $$ begin
  alter table public.ride_requests add constraint ride_requests_pay_method_known
    check (pay_method in ('cash','mpesa','card'));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.ride_requests add constraint ride_requests_pin_shape
    check (trip_pin is null or trip_pin ~ '^[0-9]{4}$');
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.ride_requests add constraint ride_requests_money_sane
    check ((rider_offer_minor is null or rider_offer_minor > 0)
       and (agreed_minor is null or agreed_minor > 0)
       and (currency is null or currency ~ '^[A-Z]{3}$'));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.ride_requests add constraint ride_requests_hours_sane
    check (hours is null or hours between 1 and 240);
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.ride_requests add constraint ride_requests_luggage_sane
    check (luggage between 0 and 30);
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.ride_requests add constraint ride_requests_cancelled_by_known
    check (cancelled_by is null or cancelled_by in ('rider','driver','desk','system'));
exception when duplicate_object then null; end $$;

-- 'market' = the price is being agreed between rider and drivers.
alter table public.ride_requests drop constraint if exists ride_requests_pricing_status_check;
alter table public.ride_requests add constraint ride_requests_pricing_status_check
  check (pricing_status in ('awaiting_quote','published_price','manual_quote','confirmed','market'));

create index if not exists ride_requests_searching_idx on public.ride_requests (status, search_until) where status = 'searching';
create index if not exists ride_requests_driver_active_idx on public.ride_requests (driver_id, status) where driver_id is not null;
create index if not exists ride_requests_rider_idx on public.ride_requests (rider_id, created_at desc) where rider_id is not null;
create index if not exists ride_requests_created_idx on public.ride_requests (created_at desc);

drop trigger if exists trg_ride_requests_touch on public.ride_requests;
create trigger trg_ride_requests_touch before update on public.ride_requests
  for each row execute function public.touch_updated_at();

-- ── 2 · an offer is a price, an ETA and a person ───────────────────
alter table public.ride_offers alter column driver_id drop not null;
alter table public.ride_offers
  add column if not exists price_minor    bigint,
  add column if not exists currency       text,
  add column if not exists note           text,
  add column if not exists source         text not null default 'driver',
  add column if not exists driver_name    text,
  add column if not exists driver_phone   text,
  add column if not exists vehicle_label  text,
  add column if not exists vehicle_colour text,
  add column if not exists plate          text,
  add column if not exists rating         numeric,
  add column if not exists trips          integer,
  add column if not exists photo_url      text,
  add column if not exists counter        boolean not null default false,
  add column if not exists offered_at     timestamptz,
  add column if not exists expires_at     timestamptz;

alter table public.ride_offers drop constraint if exists ride_offers_status_check;
alter table public.ride_offers add constraint ride_offers_status_check
  check (status in ('sent','offered','accepted','declined','expired','lost','withdrawn'));
do $$ begin
  alter table public.ride_offers add constraint ride_offers_source_known check (source in ('driver','desk'));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.ride_offers add constraint ride_offers_shape
    check ((source = 'driver' and driver_id is not null) or (source = 'desk' and driver_id is null));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.ride_offers add constraint ride_offers_price_sane
    check (price_minor is null or price_minor > 0);
exception when duplicate_object then null; end $$;

create index if not exists ride_offers_request_status_idx on public.ride_offers (request_id, status);
create index if not exists ride_offers_driver_status_idx on public.ride_offers (driver_id, status) where driver_id is not null;

drop policy if exists ride_offers_admin_all on public.ride_offers;
create policy ride_offers_admin_all on public.ride_offers for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- ── 3 · what happened, in order ────────────────────────────────────
create table if not exists public.ride_request_events (
  id         bigint generated always as identity primary key,
  request_id uuid not null references public.ride_requests(id) on delete cascade,
  kind       text not null,
  actor      text not null default 'system',
  note       text,
  created_at timestamptz not null default now()
);
create index if not exists ride_request_events_request_idx on public.ride_request_events (request_id, id);
alter table public.ride_request_events enable row level security;
revoke all on public.ride_request_events from anon, authenticated;
drop policy if exists ride_request_events_admin_read on public.ride_request_events;
create policy ride_request_events_admin_read on public.ride_request_events for select to authenticated
  using ((select public.is_admin()));
grant select on public.ride_request_events to authenticated;

-- ── 4 · the fare guide the public never reads directly ─────────────
create table if not exists public.ride_fare_guides (
  id             uuid primary key default gen_random_uuid(),
  country_code   text not null check (public.cabana_is_africa(country_code)),
  city           text,
  mode_key       text not null references public.ride_modes(key) on update cascade on delete cascade,
  class          text,
  currency       text not null check (currency ~ '^[A-Z]{3}$'),
  base_minor     bigint not null default 0 check (base_minor >= 0),
  per_km_minor   bigint not null default 0 check (per_km_minor >= 0),
  per_min_minor  bigint not null default 0 check (per_min_minor >= 0),
  min_minor      bigint not null default 0 check (min_minor >= 0),
  airport_minor  bigint not null default 0 check (airport_minor >= 0),
  per_hour_minor bigint check (per_hour_minor is null or per_hour_minor > 0),
  night_pct      integer not null default 0 check (night_pct between 0 and 100),
  spread_pct     integer not null default 12 check (spread_pct between 0 and 60),
  round_minor    bigint not null default 1000 check (round_minor > 0),
  active         boolean not null default true,
  note           text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create unique index if not exists ride_fare_guides_scope_uidx
  on public.ride_fare_guides (country_code, coalesce(lower(city), ''), mode_key, coalesce(class, ''));
alter table public.ride_fare_guides enable row level security;
revoke all on public.ride_fare_guides from anon, authenticated;
drop policy if exists ride_fare_guides_admin_all on public.ride_fare_guides;
create policy ride_fare_guides_admin_all on public.ride_fare_guides for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
grant select, insert, update, delete on public.ride_fare_guides to authenticated;
drop trigger if exists trg_ride_fare_guides_touch on public.ride_fare_guides;
create trigger trg_ride_fare_guides_touch before update on public.ride_fare_guides
  for each row execute function public.touch_updated_at();

/* Kenya first. These are guides for a rider naming a fare, never a
   meter: a driver answers with their own price. Minor units (cents).
   Economy, comfort, executive and van follow the Nairobi reference
   tariff Cabana published in August; boda, tuk-tuk, electric and
   accessible are set relative to it. The desk can change or switch
   off any row without a deploy. */
insert into public.ride_fare_guides
  (country_code, city, mode_key, class, currency, base_minor, per_km_minor, per_min_minor, min_minor, airport_minor, per_hour_minor, night_pct, spread_pct, round_minor, note)
values
  ('KE', null, 'car',        'economy',   'KES', 10000,  5000, 300,  25000, 20000, 180000, 18, 12, 1000, 'Saloon or hatchback'),
  ('KE', null, 'car',        'comfort',   'KES', 15000,  6800, 400,  40000, 20000, 260000, 18, 12, 1000, 'Newer, roomier cars'),
  ('KE', null, 'car',        'executive', 'KES', 30000, 11000, 700,  90000, 20000, 440000, 18, 12, 5000, 'Executive saloons'),
  ('KE', null, 'car',        'van',       'KES', 25000,  9000, 500,  70000, 20000, 340000, 18, 12, 5000, 'Seven seats'),
  ('KE', null, 'motorcycle', null,        'KES',  5000,  2500, 100,  10000,     0,   null, 15, 15, 1000, 'Boda boda'),
  ('KE', null, 'tuk_tuk',    null,        'KES',  7000,  3500, 200,  15000,     0,   null, 15, 15, 1000, 'Tuk-tuk'),
  ('KE', null, 'electric',   null,        'KES', 11000,  5500, 300,  28000, 20000,   null, 18, 12, 1000, 'Electric car'),
  ('KE', null, 'accessible', null,        'KES', 20000,  8000, 500,  60000, 20000,   null, 18, 12, 5000, 'Wheelchair-accessible vehicle'),
  ('KE', null, 'minibus',    null,        'KES', 40000, 12000, 600, 120000, 30000, 450000, 15, 15, 5000, 'Shuttle or minibus')
on conflict do nothing;

-- ── 5 · internal helpers ───────────────────────────────────────────
create or replace function public.ride_err(p_code text, p_detail text default null)
returns void language plpgsql volatile set search_path = pg_catalog as $$
begin
  raise exception '%', p_code using errcode = 'P0001', detail = coalesce(p_detail, p_code);
end $$;

create or replace function public.ride_new_ref()
returns text language plpgsql volatile set search_path = public, extensions as $$
declare
  abc constant text := 'ACDEFGHJKLMNPQRTUVWXY34679';
  r text; b bytea; i int;
begin
  loop
    b := extensions.gen_random_bytes(6);
    r := 'CR-';
    for i in 0..5 loop
      r := r || substr(abc, (get_byte(b, i) % length(abc)) + 1, 1);
    end loop;
    exit when not exists (select 1 from public.ride_requests where ref = r);
  end loop;
  return r;
end $$;

create or replace function public.ride_log(p_request uuid, p_kind text, p_actor text, p_note text default null)
returns void language sql security definer set search_path = public as $$
  insert into public.ride_request_events (request_id, kind, actor, note)
  values (p_request, p_kind, p_actor, left(p_note, 400));
$$;

/* Minutes for a distance at the hour the ride starts. Two hard peaks,
   a slow midday and a quick night — how East African cities behave,
   and a conservative stand-in everywhere else. Long trips spend the
   first 20 km in the city and the rest on the highway. */
create or replace function public.ride_estimate_minutes(p_km numeric, p_when timestamptz, p_country text)
returns integer
language plpgsql
stable
set search_path = pg_catalog, public
as $$
declare
  t timestamp := coalesce(p_when, now()) at time zone public.cabana_tz_for(p_country);
  h int := extract(hour from t)::int;
  wk boolean := extract(isodow from t)::int in (6, 7);
  spd numeric;
  cityk numeric;
begin
  if p_km is null or p_km <= 0 then return null; end if;
  if wk then
    spd := case when h >= 23 or h < 7 then 45 when h >= 11 and h < 19 then 26 else 34 end;
  else
    spd := case when h >= 23 or h < 6 then 44 when h = 6 then 30 when h >= 7 and h < 10 then 14
                when h >= 10 and h < 16 then 24 when h >= 16 and h < 20 then 13 else 32 end;
  end if;
  if p_km > 45 then
    cityk := least(p_km, 20);
    return greatest(1, round(cityk / spd * 60 + (p_km - cityk) / 78 * 60))::int;
  end if;
  return greatest(1, round(p_km / spd * 60))::int;
end $$;

/* Distance and time the fare is built on. A client that measured the
   road (the route API) is believed inside sane bounds of the straight
   line; anything else falls back to the straight line times a road
   factor, so a doctored payload cannot move the suggestion far. */
create or replace function public.ride_measure(p jsonb)
returns jsonb
language plpgsql
stable
set search_path = pg_catalog, public
as $$
declare
  plat double precision; plng double precision; dlat double precision; dlng double precision;
  hv numeric; km numeric; mins numeric;
  ckm numeric; cmin numeric;
  v_when timestamptz;
begin
  begin
    plat := nullif(p->>'pickup_lat', '')::double precision;
    plng := nullif(p->>'pickup_lng', '')::double precision;
    dlat := nullif(p->>'dropoff_lat', '')::double precision;
    dlng := nullif(p->>'dropoff_lng', '')::double precision;
    ckm := nullif(p->>'distance_km', '')::numeric;
    cmin := nullif(p->>'duration_min', '')::numeric;
    v_when := nullif(p->>'scheduled_for', '')::timestamptz;
  exception when others then
    return jsonb_build_object('km', null, 'min', null);
  end;
  if plat is null or plng is null or dlat is null or dlng is null then
    return jsonb_build_object('km', null, 'min', null);
  end if;
  hv := public.cab_km(plat, plng, dlat, dlng)::numeric;
  if ckm is not null and ckm >= hv * 0.95 and ckm <= hv * 2.8 + 3 then km := ckm;
  else km := hv * case when hv > 45 then 1.18 else 1.32 end;
  end if;
  km := greatest(km, 0.3);
  mins := public.ride_estimate_minutes(km, v_when, p->>'country_code');
  if cmin is not null and cmin >= km / 120 * 60 and cmin <= km / 4 * 60 + 10 then
    mins := greatest(cmin, mins * 0.7);
  end if;
  return jsonb_build_object('km', round(km, 1), 'min', round(mins)::int, 'straight_km', round(hv, 1));
end $$;

create or replace function public.ride_guide_for(p_country text, p_city text, p_mode text, p_class text)
returns public.ride_fare_guides
language sql
stable
security definer
set search_path = public
as $$
  select g.* from public.ride_fare_guides g
   where g.active and g.country_code = upper(p_country) and g.mode_key = lower(p_mode)
     and (g.class is null or g.class = lower(coalesce(p_class, '')))
     and (g.city is null or lower(g.city) = lower(coalesce(p_city, '')))
   order by (g.city is not null) desc, (g.class is not null) desc
   limit 1;
$$;

create or replace function public.ride_fare_calc(g public.ride_fare_guides, p_km numeric, p_min numeric,
                                                  p_airport boolean, p_night boolean, p_hours numeric)
returns bigint
language plpgsql
immutable
set search_path = pg_catalog, public
as $$
declare v numeric;
begin
  if p_hours is not null and g.per_hour_minor is not null then
    v := g.per_hour_minor * greatest(p_hours, 2);
  else
    v := g.base_minor + g.per_km_minor * coalesce(p_km, 0) + g.per_min_minor * coalesce(p_min, 0);
  end if;
  if p_night then v := v * (1 + g.night_pct / 100.0); end if;
  if p_airport then v := v + g.airport_minor; end if;
  v := greatest(v, g.min_minor);
  return greatest(g.round_minor, round(v / g.round_minor) * g.round_minor)::bigint;
end $$;

-- ── 6 · the suggestion a rider starts from ─────────────────────────
create or replace function public.ride_fare_hint(p jsonb)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_country text := upper(btrim(coalesce(p->>'country_code', '')));
  v_mode    text := lower(btrim(coalesce(p->>'mode_key', 'car')));
  v_class   text := nullif(lower(btrim(coalesce(p->>'class', ''))), '');
  v_city    text := nullif(btrim(coalesce(p->>'city', '')), '');
  v_hours   numeric := nullif(p->>'hours', '')::numeric;
  v_airport boolean := coalesce((p->>'airport')::boolean, false);
  v_when    timestamptz;
  m jsonb; g public.ride_fare_guides; h int;
  v_night boolean; v_fare bigint; v_low bigint; v_high bigint;
begin
  begin v_when := coalesce(nullif(p->>'scheduled_for', '')::timestamptz, now());
  exception when others then v_when := now(); end;
  if not public.cabana_is_africa(v_country) then
    return jsonb_build_object('available', false, 'reason', 'country');
  end if;
  m := public.ride_measure(p);
  g := public.ride_guide_for(v_country, v_city, v_mode, v_class);
  if g.id is null then
    return jsonb_build_object('available', false, 'reason', 'no_guide',
      'distance_km', m->'km', 'duration_min', m->'min', 'currency', public.cabana_currency_for(v_country));
  end if;
  if v_hours is null and (m->>'km') is null then
    return jsonb_build_object('available', false, 'reason', 'route',
      'currency', g.currency, 'distance_km', null, 'duration_min', null);
  end if;
  if v_hours is not null and g.per_hour_minor is null then
    return jsonb_build_object('available', false, 'reason', 'no_hourly_guide',
      'currency', g.currency, 'distance_km', m->'km', 'duration_min', m->'min');
  end if;
  h := extract(hour from v_when at time zone public.cabana_tz_for(v_country))::int;
  v_night := h >= 22 or h < 5;
  v_fare := public.ride_fare_calc(g, (m->>'km')::numeric, (m->>'min')::numeric, v_airport, v_night, v_hours);
  v_low  := greatest(g.round_minor, round(v_fare * (1 - g.spread_pct / 100.0) / g.round_minor) * g.round_minor)::bigint;
  v_high := (round(v_fare * (1 + g.spread_pct / 100.0) / g.round_minor) * g.round_minor)::bigint;
  return jsonb_build_object('available', true, 'basis', 'guide', 'currency', g.currency,
    'suggested', v_fare, 'low', v_low, 'high', v_high, 'round', g.round_minor,
    'distance_km', m->'km', 'duration_min', m->'min', 'night', v_night, 'airport', v_airport,
    'hourly', v_hours is not null and g.per_hour_minor is not null);
end $$;

-- ── 7 · which drivers can take which ride ──────────────────────────
create or replace function public.ride_driver_fits(p_driver uuid, p_request uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from public.drivers d
      join public.ride_requests r on r.id = p_request
      left join lateral (
        select v.seats from public.driver_vehicles v
         where v.driver_id = d.id and v.is_primary order by v.created_at limit 1
      ) pv on true
     where d.id = p_driver
       and d.status = 'approved'
       and coalesce(d.country_code, 'KE') = coalesce(r.country_code, 'KE')
       and case
             when r.mode_key = 'car' then
               'car' = any (coalesce(d.mode_keys, array['car']))
               and (r.class is null
                    or r.class = any (d.classes)
                    or (r.class = 'economy' and d.classes && array['comfort','executive'])
                    or (r.class = 'comfort' and 'executive' = any (d.classes)))
               and coalesce(pv.seats, 4) >= r.passengers
             else coalesce(r.mode_key, 'car') = any (coalesce(d.mode_keys, array['car']))
           end
  );
$$;

/* Invite every fitting driver inside the radius who has not been asked.
   On demand: drivers online now. Scheduled: anyone approved who has
   been seen in the area this week — they answer when they next open
   the app. */
create or replace function public.ride_broadcast_v2(p_request uuid, p_radius_km double precision)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare r public.ride_requests; n int := 0;
begin
  select * into r from public.ride_requests where id = p_request;
  if not found or r.status <> 'searching' or r.pickup_lat is null then return 0; end if;

  insert into public.ride_offers (request_id, driver_id, distance_km, eta_min, status, sent_at, source)
  select r.id, x.driver_id, x.km, greatest(2, ceil(x.km / 22 * 60))::int, 'sent', now(), 'driver'
    from (
      select l.driver_id, round(public.cab_km(r.pickup_lat, r.pickup_lng, l.lat, l.lng)::numeric, 2) km
        from public.driver_locations l
       where l.lat is not null
         and ((r.scheduled_for is null and l.is_online and l.is_available
               and l.updated_at > now() - interval '90 seconds')
           or (r.scheduled_for is not null and l.updated_at > now() - interval '7 days'))
         and public.cab_km(r.pickup_lat, r.pickup_lng, l.lat, l.lng) <= p_radius_km
         and public.ride_driver_fits(l.driver_id, r.id)
         and not exists (select 1 from public.ride_offers o where o.request_id = r.id and o.driver_id = l.driver_id)
         and not exists (select 1 from public.ride_requests a
                          where a.driver_id = l.driver_id and a.status in ('assigned','arriving','in_progress')
                            and a.scheduled_for is null and r.scheduled_for is null)
       order by 2
       limit 25
    ) x
  on conflict (request_id, driver_id) do nothing;
  get diagnostics n = row_count;

  if n > 0 or coalesce(r.search_radius_km, 0) < p_radius_km then
    update public.ride_requests
       set notified_count = notified_count + n,
           search_radius_km = greatest(coalesce(search_radius_km, 0), p_radius_km)
     where id = r.id;
  end if;
  return n;
end $$;

-- ── 8 · the shapes of one ride ─────────────────────────────────────
create or replace function public.ride_vehicle_json(p_vehicle uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_strip_nulls(jsonb_build_object(
    'label', nullif(btrim(concat_ws(' ', v.make, v.model)), ''),
    'year', v.year, 'colour', v.colour, 'plate', v.plate, 'class', v.class,
    'seats', v.seats, 'photo', v.photo_url))
    from public.driver_vehicles v where v.id = p_vehicle;
$$;

create or replace function public.ride_json(r public.ride_requests, p_view text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  d public.drivers%rowtype;
  l public.driver_locations%rowtype;
  v_live boolean := r.status in ('assigned','arriving','in_progress');
  v_driver jsonb := null;
  v_offers jsonb := '[]'::jsonb;
  v_events jsonb;
  v_mode jsonb;
  v_out jsonb;
begin
  if r.driver_id is not null then
    select * into d from public.drivers where id = r.driver_id;
    select * into l from public.driver_locations where driver_id = r.driver_id;
  end if;

  if r.driver_id is not null or r.assigned_snapshot is not null then
    v_driver := coalesce(r.assigned_snapshot, '{}'::jsonb) || jsonb_strip_nulls(jsonb_build_object(
      'name', coalesce(nullif(split_part(btrim(d.full_name), ' ', 1), ''), r.assigned_snapshot->>'name'),
      'rating', coalesce(round(d.rating, 2), (r.assigned_snapshot->>'rating')::numeric),
      'trips', coalesce(d.trips_completed, (r.assigned_snapshot->>'trips')::int),
      'vehicle', coalesce(public.ride_vehicle_json(r.vehicle_id), r.assigned_snapshot->'vehicle'),
      'lat', case when v_live and l.updated_at > now() - interval '5 minutes' then l.lat end,
      'lng', case when v_live and l.updated_at > now() - interval '5 minutes' then l.lng end,
      'heading', case when v_live then l.heading end,
      'located_at', case when v_live then l.updated_at end));
    v_driver := v_driver - 'phone' - 'mpesa';
    if p_view in ('rider','desk') then
      if v_live or (r.status = 'completed' and r.completed_at > now() - interval '3 hours') then
        v_driver := v_driver || jsonb_strip_nulls(jsonb_build_object(
          'phone', coalesce(d.phone, r.assigned_snapshot->>'phone')));
      end if;
      if r.pay_method = 'mpesa' and r.status in ('arriving','in_progress','completed') then
        v_driver := v_driver || jsonb_strip_nulls(jsonb_build_object(
          'mpesa', coalesce(nullif(d.payout_number, ''), d.phone, r.assigned_snapshot->>'phone')));
      end if;
    end if;
  end if;

  if p_view in ('rider','desk') and r.status = 'searching' then
    select coalesce(jsonb_agg(x.j order by x.price, x.eta), '[]'::jsonb) into v_offers from (
      select o.price_minor price, coalesce(o.eta_min, 99) eta, jsonb_strip_nulls(jsonb_build_object(
        'id', o.id, 'price', o.price_minor, 'currency', o.currency, 'eta_min', o.eta_min,
        'distance_km', o.distance_km, 'counter', o.counter, 'note', o.note, 'source', o.source,
        'expires_at', o.expires_at, 'offered_at', o.offered_at,
        'driver', jsonb_strip_nulls(jsonb_build_object(
          'name', coalesce(o.driver_name, nullif(split_part(btrim(od.full_name), ' ', 1), '')),
          'rating', coalesce(o.rating, round(od.rating, 2)), 'trips', coalesce(o.trips, od.trips_completed),
          'photo', o.photo_url)),
        'vehicle', jsonb_strip_nulls(jsonb_build_object('label', o.vehicle_label, 'colour', o.vehicle_colour,
          'plate', o.plate)))) j
        from public.ride_offers o
        left join public.drivers od on od.id = o.driver_id
       where o.request_id = r.id and o.status = 'offered'
         and (o.expires_at is null or o.expires_at > now())
    ) x;
  end if;

  select coalesce(jsonb_agg(jsonb_build_object('kind', e.kind, 'actor', e.actor, 'at', e.created_at) order by e.id), '[]'::jsonb)
    into v_events from public.ride_request_events e where e.request_id = r.id;

  select jsonb_build_object('key', m.key, 'label', m.label, 'family', m.family) into v_mode
    from public.ride_modes m where m.key = r.mode_key;

  v_out := jsonb_build_object(
    'ref', r.ref, 'status', r.status, 'service', r.service, 'mode_key', r.mode_key,
    'class', r.class, 'mode', v_mode, 'request_kind', r.request_kind,
    'scheduled_for', r.scheduled_for, 'created_at', r.created_at, 'updated_at', r.updated_at,
    'country_code', r.country_code, 'city', r.city,
    'pickup', jsonb_build_object('label', r.pickup_label, 'lat', r.pickup_lat, 'lng', r.pickup_lng),
    'dropoff', jsonb_build_object('label', r.dropoff_label, 'lat', r.dropoff_lat, 'lng', r.dropoff_lng),
    'distance_km', r.distance_km, 'duration_min', r.duration_min,
    'passengers', r.passengers, 'luggage', r.luggage, 'hours', r.hours,
    'currency', r.currency, 'agreed', r.agreed_minor, 'pay_method', r.pay_method,
    'driver', v_driver,
    'assigned_at', r.assigned_at, 'arrived_at', r.arrived_at, 'started_at', r.started_at,
    'completed_at', r.completed_at, 'cancelled_at', r.cancelled_at,
    'timeline', v_events);

  if p_view in ('rider','desk') then
    v_out := v_out || jsonb_build_object(
      'pin', r.trip_pin, 'pin_verified', r.pin_verified_at is not null, 'share', r.share_token,
      'offers', v_offers, 'invited', r.notified_count, 'search_until', r.search_until,
      'desk', r.desk_at is not null, 'rider_offer', r.rider_offer_minor, 'fare_hint', r.fare_hint_minor,
      'fixed_price', r.pricing_status = 'published_price', 'auto_accept', r.auto_accept,
      'rider_name', r.rider_name, 'rider_phone', r.rider_phone, 'notes', r.notes, 'needs', r.ride_needs,
      'flight_no', r.flight_no, 'stay_ref', r.stay_ref, 'offer_raises', r.offer_raises,
      'rating', r.rider_rating, 'review', r.rider_review,
      'cancel_reason', r.cancel_reason, 'cancelled_by', r.cancelled_by);
  end if;
  if p_view = 'desk' then
    v_out := v_out || jsonb_build_object('id', r.id, 'desk_at', r.desk_at, 'pin_attempts', r.pin_attempts,
      'rider_email', r.rider_email, 'pricing_status', r.pricing_status);
  end if;
  return v_out;
end $$;

create or replace function public.ride_guest_request(p_ref text, p_token text)
returns public.ride_requests
language plpgsql
security definer
set search_path = public
as $$
declare r public.ride_requests%rowtype;
begin
  select * into r from public.ride_requests where ref = upper(btrim(coalesce(p_ref, '')));
  if not found then perform public.ride_err('ride_not_found'); end if;
  if not ((p_token is not null and p_token <> '' and r.guest_token = p_token)
          or (r.rider_id is not null and r.rider_id = auth.uid())
          or public.is_admin()) then
    perform public.ride_err('ride_not_found');
  end if;
  return r;
end $$;

-- ── 9 · the clock: stale offers, wider circles, the desk, lapses ───
create or replace function public.ride_requests_tick()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  n_off int := 0; n_desk int := 0; n_lapse int := 0; n_inv int := 0;
  r record; v_radius double precision; v_age interval;
begin
  update public.ride_offers set status = 'expired', responded_at = coalesce(responded_at, now())
   where status = 'offered' and expires_at is not null and expires_at < now();
  get diagnostics n_off = row_count;

  update public.ride_offers o set status = 'expired'
   where o.status = 'sent'
     and exists (select 1 from public.ride_requests q where q.id = o.request_id and q.status <> 'searching');

  update public.ride_requests
     set status = 'unfulfilled', pricing_status = 'market', updated_at = now()
   where status = 'searching'
     and ((scheduled_for is null and search_until < now())
       or (scheduled_for is not null and scheduled_for < now() - interval '10 minutes'));
  get diagnostics n_lapse = row_count;

  for r in select id, created_at, scheduled_for from public.ride_requests where status = 'searching' loop
    v_age := now() - r.created_at;
    v_radius := case
      when r.scheduled_for is not null then 30
      when v_age < interval '1 minute' then 4
      when v_age < interval '2 minutes' then 7
      when v_age < interval '4 minutes' then 12
      else 20 end;
    n_inv := n_inv + public.ride_broadcast_v2(r.id, v_radius);
  end loop;

  with esc as (
    update public.ride_requests q
       set desk_at = now(), pricing_status = 'awaiting_quote'
     where q.status = 'searching' and q.desk_at is null
       and not exists (select 1 from public.ride_offers o
                        where o.request_id = q.id and o.status = 'offered'
                          and (o.expires_at is null or o.expires_at > now()))
       and ((q.scheduled_for is null and q.created_at < now() - interval '2 minutes')
         or (q.scheduled_for is not null
             and (q.created_at < now() - interval '15 minutes' or q.scheduled_for < now() + interval '2 hours')))
     returning q.id
  )
  select count(*) into n_desk from esc;

  return jsonb_build_object('offers_expired', n_off, 'escalated', n_desk, 'lapsed', n_lapse, 'invited', n_inv);
end $$;

/* Assign one offer. Callers hold the request row lock. */
create or replace function public.ride_assign(p_request uuid, p_offer uuid, p_actor text)
returns public.ride_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.ride_requests%rowtype;
  o public.ride_offers%rowtype;
  d public.drivers%rowtype;
  v_vehicle uuid;
  v_snap jsonb;
begin
  select * into r from public.ride_requests where id = p_request for update;
  if not found then perform public.ride_err('ride_not_found'); end if;
  if r.status <> 'searching' then perform public.ride_err('ride_not_open', r.status); end if;
  select * into o from public.ride_offers where id = p_offer and request_id = r.id for update;
  if not found or o.status <> 'offered' then perform public.ride_err('offer_gone'); end if;
  if o.expires_at is not null and o.expires_at < now() then perform public.ride_err('offer_expired'); end if;

  if o.source = 'driver' then
    select * into d from public.drivers where id = o.driver_id;
    if not found or d.status <> 'approved' then perform public.ride_err('driver_unavailable'); end if;
    if r.scheduled_for is null and exists (
        select 1 from public.ride_requests a
         where a.driver_id = d.id and a.status in ('assigned','arriving','in_progress') and a.scheduled_for is null) then
      update public.ride_offers set status = 'expired', responded_at = now() where id = o.id;
      perform public.ride_err('driver_busy');
    end if;
    select v.id into v_vehicle from public.driver_vehicles v
     where v.driver_id = d.id and v.is_primary order by v.created_at limit 1;
    v_snap := jsonb_strip_nulls(jsonb_build_object('source', 'driver',
      'name', nullif(split_part(btrim(d.full_name), ' ', 1), ''),
      'rating', round(d.rating, 2), 'trips', d.trips_completed,
      'vehicle', public.ride_vehicle_json(v_vehicle)));
  else
    v_snap := jsonb_strip_nulls(jsonb_build_object('source', 'desk',
      'name', o.driver_name, 'phone', o.driver_phone, 'rating', o.rating, 'trips', o.trips,
      'photo', o.photo_url,
      'vehicle', jsonb_strip_nulls(jsonb_build_object('label', o.vehicle_label, 'colour', o.vehicle_colour, 'plate', o.plate))));
  end if;

  update public.ride_requests
     set status = 'assigned', driver_id = o.driver_id, vehicle_id = v_vehicle,
         assigned_at = now(), chosen_offer_id = o.id, agreed_minor = o.price_minor,
         currency = coalesce(o.currency, currency),
         quote_total = round(o.price_minor::numeric / public.cabana_minor_factor(coalesce(o.currency, currency)))::int,
         pricing_status = 'confirmed', assigned_snapshot = v_snap, quote_confirmed_at = now()
   where id = r.id
   returning * into r;

  update public.ride_offers set status = 'accepted', responded_at = now() where id = o.id;
  update public.ride_offers set status = 'lost', responded_at = now()
   where request_id = r.id and id <> o.id and status in ('sent','offered');
  if o.driver_id is not null and r.scheduled_for is null then
    update public.driver_locations set is_available = false where driver_id = o.driver_id;
  end if;
  perform public.ride_log(r.id, 'assigned', p_actor, coalesce(v_snap->>'name', 'driver'));
  return r;
end $$;

-- ── 10 · the rider ────────────────────────────────────────────────
create or replace function public.ride_request_place(p jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_country text := upper(btrim(coalesce(p->>'country_code', '')));
  v_mode    text := lower(btrim(coalesce(p->>'mode_key', 'car')));
  v_class   text := nullif(lower(btrim(coalesce(p->>'class', ''))), '');
  v_service text := lower(btrim(coalesce(nullif(p->>'service', ''), 'ride')));
  v_name    text := btrim(coalesce(p->>'name', ''));
  v_phone   text := btrim(coalesce(p->>'phone', ''));
  v_email   text := nullif(lower(btrim(coalesce(p->>'email', ''))), '');
  v_plabel  text := left(btrim(coalesce(p->>'pickup_label', '')), 200);
  v_dlabel  text := left(btrim(coalesce(p->>'dropoff_label', '')), 200);
  v_city    text := nullif(left(btrim(coalesce(p->>'city', '')), 100), '');
  v_notes   text := nullif(left(btrim(coalesce(p->>'notes', '')), 400), '');
  v_flight  text := nullif(upper(regexp_replace(coalesce(p->>'flight_no', ''), '[^A-Za-z0-9]', '', 'g')), '');
  v_stay    text := nullif(left(btrim(coalesce(p->>'stay_ref', '')), 40), '');
  v_pay     text := lower(coalesce(nullif(p->>'pay_method', ''), 'cash'));
  v_auto    boolean := coalesce((p->>'auto_accept')::boolean, true);
  plat double precision; plng double precision; dlat double precision; dlng double precision;
  v_when timestamptz; v_pass int; v_lug int; v_hours int; v_offer bigint; v_card uuid;
  v_needs text[]; v_currency text; v_hint jsonb; v_meas jsonb; v_pricing text := 'market';
  card public.ride_price_cards%rowtype; market public.ride_markets%rowtype;
  r public.ride_requests%rowtype;
  v_invited int;
begin
  if not public.cabana_is_africa(v_country) then perform public.ride_err('country_invalid'); end if;
  if not exists (select 1 from public.ride_modes m where m.key = v_mode and m.active and m.requestable) then
    perform public.ride_err('mode_unavailable');
  end if;
  if v_mode = 'car' then
    v_class := coalesce(v_class, 'economy');
    if v_class not in ('economy','comfort','executive','van') then perform public.ride_err('class_invalid'); end if;
  else
    v_class := v_mode;
  end if;
  if v_service not in ('ride','transfer','chauffeur') then perform public.ride_err('service_invalid'); end if;

  if length(v_name) < 2 or length(v_name) > 80 then perform public.ride_err('name_required'); end if;
  if length(public.food_digits(v_phone)) < 9 or length(public.food_digits(v_phone)) > 15 then
    perform public.ride_err('phone_required');
  end if;
  if v_email is not null and v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then perform public.ride_err('email_invalid'); end if;

  begin
    plat := nullif(p->>'pickup_lat', '')::double precision;
    plng := nullif(p->>'pickup_lng', '')::double precision;
    dlat := nullif(p->>'dropoff_lat', '')::double precision;
    dlng := nullif(p->>'dropoff_lng', '')::double precision;
    v_when := nullif(p->>'scheduled_for', '')::timestamptz;
    v_pass := coalesce(nullif(p->>'passengers', '')::int, 1);
    v_lug := coalesce(nullif(p->>'luggage', '')::int, 0);
    v_hours := nullif(p->>'hours', '')::int;
    v_offer := nullif(p->>'rider_offer_minor', '')::bigint;
    v_card := nullif(p->>'price_card_id', '')::uuid;
  exception when others then
    perform public.ride_err('request_malformed');
  end;

  if length(v_plabel) < 2 then perform public.ride_err('pickup_required'); end if;
  if plat is null or plng is null or plat not between -40 and 40 or plng not between -30 and 65 then
    perform public.ride_err('pickup_pin_required');
  end if;
  if v_service <> 'chauffeur' and length(v_dlabel) < 2 then perform public.ride_err('destination_required'); end if;
  if (dlat is null) <> (dlng is null) or (dlat is not null and (dlat not between -40 and 40 or dlng not between -30 and 65)) then
    perform public.ride_err('destination_invalid');
  end if;
  if v_when is not null and (v_when < now() + interval '15 minutes' or v_when > now() + interval '60 days') then
    perform public.ride_err('schedule_invalid');
  end if;
  if v_service = 'chauffeur' and (v_hours is null or v_hours < 2 or v_hours > 240) then
    perform public.ride_err('hours_invalid');
  end if;
  if v_service <> 'chauffeur' then v_hours := null; end if;
  if v_pass < 1 or v_pass > 60 then perform public.ride_err('passengers_invalid'); end if;
  if v_lug < 0 or v_lug > 30 then perform public.ride_err('luggage_invalid'); end if;
  if v_pay not in ('cash','mpesa','card') then v_pay := 'cash'; end if;

  select coalesce(array_agg(distinct need), '{}'::text[]) into v_needs
    from jsonb_array_elements_text(case when jsonb_typeof(p->'needs') = 'array' then p->'needs' else '[]'::jsonb end) need
   where need = any (array['luggage','wheelchair','child-seat','pet','bike-carry','quiet','meet-greet','english','french','swahili']);

  if (select count(*) from public.ride_requests
       where public.food_digits(rider_phone) = public.food_digits(v_phone)
         and status in ('searching','assigned','arriving','in_progress')) >= 3 then
    perform public.ride_err('too_many_open');
  end if;
  if (select count(*) from public.ride_requests
       where public.food_digits(rider_phone) = public.food_digits(v_phone)
         and created_at > now() - interval '1 hour') >= 12 then
    perform public.ride_err('too_many_requests');
  end if;

  select * into market from public.ride_markets
   where country_code = v_country and active
   order by (city is not null and v_city is not null and lower(city) = lower(v_city)) desc, (city is null) desc
   limit 1;
  if market.status = 'paused' then perform public.ride_err('market_paused'); end if;
  v_currency := coalesce(market.currency, public.cabana_currency_for(v_country));

  if v_card is not null then
    select * into card from public.ride_price_cards pc
     where pc.id = v_card and pc.mode_key = v_mode and pc.published and pc.active
       and (pc.effective_from is null or pc.effective_from <= now())
       and (pc.effective_to is null or pc.effective_to > now());
    if not found then perform public.ride_err('price_card_unavailable'); end if;
    select * into market from public.ride_markets where id = card.market_id and active;
    if not found or market.country_code <> v_country then perform public.ride_err('price_card_market'); end if;
    if market.city is not null and position(lower(market.city) in lower(v_plabel || ' ' || coalesce(v_city, ''))) = 0 then
      perform public.ride_err('price_card_market');
    end if;
    if card.unit = 'trip' and not (
         (position(lower(card.route_from) in lower(v_plabel)) > 0 and position(lower(card.route_to) in lower(v_dlabel)) > 0)
      or (card.bidirectional and position(lower(card.route_to) in lower(v_plabel)) > 0
          and position(lower(card.route_from) in lower(v_dlabel)) > 0)) then
      perform public.ride_err('price_card_route');
    end if;
    v_offer := card.amount_minor;
    v_currency := card.currency;
    v_pricing := 'published_price';
  end if;

  v_meas := public.ride_measure(p || jsonb_build_object('country_code', v_country));
  v_hint := public.ride_fare_hint(p || jsonb_build_object('country_code', v_country, 'mode_key', v_mode,
                                                          'class', v_class, 'hours', v_hours));
  if v_offer is not null then
    if v_offer <= 0 or v_offer > 100000000000 then perform public.ride_err('offer_invalid'); end if;
    if v_card is null and coalesce((v_hint->>'available')::boolean, false)
       and v_offer < round((v_hint->>'low')::numeric * 0.6) then
      perform public.ride_err('offer_too_low', v_hint->>'low');
    end if;
  end if;
  /* Auto-accept needs a price to accept at, and only makes sense for a
     car wanted now; a booking for later is always the rider's choice. */
  if v_offer is null or v_when is not null then v_auto := false; end if;

  insert into public.ride_requests (
    ref, rider_id, rider_name, rider_phone, rider_email, service, class, mode_key,
    country_code, city, pickup_label, pickup_lat, pickup_lng, dropoff_label, dropoff_lat, dropoff_lng,
    scheduled_for, passengers, luggage, hours, notes, flight_no, stay_ref,
    distance_km, duration_min, status, request_kind, pricing_status,
    approved_price_card_id, approved_quote_minor, approved_quote_currency,
    ride_needs, guest_token, share_token, currency, rider_offer_minor, fare_hint_minor,
    pay_method, auto_accept, trip_pin, search_until, search_radius_km, notified_count)
  values (
    public.ride_new_ref(), auth.uid(), v_name, v_phone, v_email, v_service, v_class, v_mode,
    v_country, coalesce(v_city, market.city), v_plabel, plat, plng,
    case when length(v_dlabel) >= 2 then v_dlabel end, dlat, dlng,
    v_when, v_pass, v_lug, v_hours, v_notes, v_flight, v_stay,
    (v_meas->>'km')::numeric, (v_meas->>'min')::int, 'searching',
    case when v_when is null then 'on_demand' else 'scheduled' end, v_pricing,
    case when v_card is not null then card.id end,
    case when v_card is not null then card.amount_minor end,
    case when v_card is not null then card.currency end,
    v_needs, public.food_secret(), public.food_secret(10), v_currency, v_offer,
    case when coalesce((v_hint->>'available')::boolean, false) then (v_hint->>'suggested')::bigint end,
    v_pay, v_auto, public.food_code(),
    case when v_when is null then now() + interval '20 minutes' else v_when - interval '5 minutes' end,
    0, 0)
  returning * into r;

  perform public.ride_log(r.id, 'requested', 'rider',
    case when v_offer is not null then 'offer ' || v_offer || ' ' || v_currency else 'asked for offers' end);
  v_invited := public.ride_broadcast_v2(r.id, case when v_when is null then 4 else 30 end);

  return jsonb_build_object('ref', r.ref, 'token', r.guest_token, 'share', r.share_token,
    'status', r.status, 'invited', v_invited, 'search_until', r.search_until,
    'currency', r.currency, 'pin', r.trip_pin);
end $$;

create or replace function public.ride_track(p_ref text, p_token text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare r public.ride_requests%rowtype; v_id uuid;
begin
  r := public.ride_guest_request(p_ref, p_token);
  v_id := r.id;
  if r.status = 'searching' then
    update public.ride_offers set status = 'expired', responded_at = coalesce(responded_at, now())
     where request_id = v_id and status = 'offered' and expires_at < now();
    if (r.scheduled_for is null and r.search_until < now())
       or (r.scheduled_for is not null and r.scheduled_for < now() - interval '10 minutes') then
      update public.ride_requests set status = 'unfulfilled', pricing_status = 'market'
       where id = v_id and status = 'searching';
    end if;
    select * into r from public.ride_requests where id = v_id;
  end if;
  return public.ride_json(r, case when public.is_admin() and (p_token is null or p_token <> r.guest_token)
                                  then 'desk' else 'rider' end);
end $$;

create or replace function public.ride_share_view(p_ref text, p_share text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare r public.ride_requests%rowtype;
begin
  select * into r from public.ride_requests where ref = upper(btrim(coalesce(p_ref, '')));
  if not found or p_share is null or p_share = '' or r.share_token is distinct from p_share then
    perform public.ride_err('ride_not_found');
  end if;
  if r.status in ('completed','cancelled','unfulfilled','expired') and r.updated_at < now() - interval '6 hours' then
    perform public.ride_err('share_expired');
  end if;
  return public.ride_json(r, 'share') || jsonb_build_object('rider_first_name', split_part(btrim(r.rider_name), ' ', 1));
end $$;

create or replace function public.ride_requests_list(p_pairs jsonb default '[]'::jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_out jsonb;
begin
  select coalesce(jsonb_agg(x.j order by x.at desc), '[]'::jsonb) into v_out from (
    select r.created_at at, jsonb_build_object('ref', r.ref, 'status', r.status, 'service', r.service,
      'mode_key', r.mode_key, 'class', r.class, 'scheduled_for', r.scheduled_for, 'created_at', r.created_at,
      'pickup', r.pickup_label, 'dropoff', r.dropoff_label, 'currency', r.currency,
      'agreed', r.agreed_minor, 'rider_offer', r.rider_offer_minor, 'rating', r.rider_rating,
      'driver', r.assigned_snapshot->>'name',
      'token', case when r.rider_id = auth.uid() then r.guest_token end) j
      from public.ride_requests r
     where r.created_at > now() - interval '120 days'
       and ((r.rider_id is not null and r.rider_id = auth.uid())
         or exists (select 1 from jsonb_array_elements(coalesce(p_pairs, '[]'::jsonb)) e
                     where upper(e->>'ref') = r.ref and e->>'token' = r.guest_token))
     order by r.created_at desc
     limit 40
  ) x;
  return v_out;
end $$;

create or replace function public.ride_choose_offer(p_ref text, p_token text, p_offer uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare r public.ride_requests%rowtype;
begin
  r := public.ride_guest_request(p_ref, p_token);
  r := public.ride_assign(r.id, p_offer, 'rider');
  return public.ride_json(r, 'rider');
end $$;

create or replace function public.ride_raise_offer(p_ref text, p_token text, p_amount bigint)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare r public.ride_requests%rowtype;
begin
  r := public.ride_guest_request(p_ref, p_token);
  select * into r from public.ride_requests where id = r.id for update;
  if r.status <> 'searching' then perform public.ride_err('ride_not_open', r.status); end if;
  if r.pricing_status = 'published_price' then perform public.ride_err('fixed_price'); end if;
  if p_amount is null or p_amount <= coalesce(r.rider_offer_minor, 0) then perform public.ride_err('raise_too_small'); end if;
  if r.rider_offer_minor is not null and p_amount > r.rider_offer_minor * 3 then perform public.ride_err('raise_too_large'); end if;
  if r.offer_raises >= 8 then perform public.ride_err('too_many_raises'); end if;
  update public.ride_requests
     set rider_offer_minor = p_amount, offer_raises = offer_raises + 1,
         desk_at = null, pricing_status = 'market',
         search_until = greatest(search_until, now() + interval '10 minutes')
   where id = r.id returning * into r;
  perform public.ride_log(r.id, 'offer_raised', 'rider', p_amount::text || ' ' || coalesce(r.currency, ''));
  perform public.ride_broadcast_v2(r.id, greatest(coalesce(r.search_radius_km, 4) * 1.5, 6));
  return public.ride_json(r, 'rider');
end $$;

create or replace function public.ride_cancel(p_ref text, p_token text, p_reason text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare r public.ride_requests%rowtype;
begin
  r := public.ride_guest_request(p_ref, p_token);
  select * into r from public.ride_requests where id = r.id for update;
  if r.status not in ('searching','assigned','arriving','quote_pending','quoted','scheduled') then
    perform public.ride_err('too_late_to_cancel', r.status);
  end if;
  if r.driver_id is not null then
    update public.driver_locations set is_available = true where driver_id = r.driver_id;
  end if;
  update public.ride_offers set status = 'expired', responded_at = coalesce(responded_at, now())
   where request_id = r.id and status in ('sent','offered');
  update public.ride_requests
     set status = 'cancelled', cancelled_at = now(), cancelled_by = 'rider',
         cancel_reason = nullif(left(btrim(coalesce(p_reason, '')), 200), ''),
         pricing_status = case when pricing_status = 'awaiting_quote' then 'market' else pricing_status end
   where id = r.id returning * into r;
  perform public.ride_log(r.id, 'cancelled', 'rider', r.cancel_reason);
  return public.ride_json(r, 'rider');
end $$;

/* The rider closes a trip the desk arranged (no driver app to do it),
   or one the driver forgot to end. */
create or replace function public.ride_rider_complete(p_ref text, p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare r public.ride_requests%rowtype;
begin
  r := public.ride_guest_request(p_ref, p_token);
  select * into r from public.ride_requests where id = r.id for update;
  if not (r.status = 'in_progress'
          or (r.status in ('assigned','arriving') and r.assigned_snapshot->>'source' = 'desk'
              and coalesce(r.scheduled_for, r.assigned_at) < now() - interval '10 minutes')) then
    perform public.ride_err('cannot_complete_yet', r.status);
  end if;
  update public.ride_requests
     set status = 'completed', completed_at = now(),
         started_at = coalesce(started_at, now()),
         final_fare = coalesce(final_fare, round(coalesce(agreed_minor, 0)::numeric / public.cabana_minor_factor(currency))::int)
   where id = r.id returning * into r;
  if r.driver_id is not null then
    update public.driver_locations set is_available = true where driver_id = r.driver_id;
    update public.drivers set trips_completed = trips_completed + 1 where id = r.driver_id;
  end if;
  perform public.ride_log(r.id, 'completed', 'rider', null);
  return public.ride_json(r, 'rider');
end $$;

create or replace function public.ride_rate(p_ref text, p_token text, p_rating int, p_review text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare r public.ride_requests%rowtype; v_n int; v_avg numeric;
begin
  r := public.ride_guest_request(p_ref, p_token);
  if r.status <> 'completed' then perform public.ride_err('rate_after_trip'); end if;
  if r.rider_rated_at is not null then perform public.ride_err('already_rated'); end if;
  if p_rating is null or p_rating < 1 or p_rating > 5 then perform public.ride_err('rating_invalid'); end if;
  update public.ride_requests
     set rider_rating = p_rating, rider_review = nullif(left(btrim(coalesce(p_review, '')), 400), ''),
         rider_rated_at = now()
   where id = r.id returning * into r;
  if r.driver_id is not null then
    select count(*), avg(rider_rating) into v_n, v_avg from public.ride_requests
     where driver_id = r.driver_id and rider_rating is not null;
    /* Start every driver from a prior of five 5-star trips, so one bad
       night does not define a new driver. */
    update public.drivers set rating = round(((v_avg * v_n) + 25) / (v_n + 5), 2) where id = r.driver_id;
  end if;
  perform public.ride_log(r.id, 'rated', 'rider', p_rating::text);
  return public.ride_json(r, 'rider');
end $$;

/* Upcoming stays for the signed-in guest, so a ride to (or from) the
   apartment is one tap. Paid bookings only: that is when an exact pin
   is theirs to know. */
create or replace function public.ride_my_stays()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(jsonb_agg(x order by (x->>'checkin')), '[]'::jsonb) from (
    select jsonb_strip_nulls(jsonb_build_object(
      'ref', b.payment_reference, 'title', coalesce(nullif(b.listing_name, ''), l.title, b.apartment_name),
      'area', l.area, 'city', l.city, 'country', l.country,
      'checkin', b.checkin_date, 'checkout', b.checkout_date,
      'checkin_time', l.checkin_time, 'checkout_time', l.checkout_time, 'guests', b.num_guests,
      'lat', coalesce(l.latitude, l.lat), 'lng', coalesce(l.longitude, l.lng))) x
      from public.apartment_bookings b
      left join public.listings l on l.id = b.listing_id
     where auth.uid() is not null and b.guest_id = auth.uid()
       and b.checkout_date >= current_date - 1 and b.checkin_date <= current_date + 90
       and b.status in ('confirmed','confirmed_balance_due','deposit_paid','paid','paid_pending_checkin','checked_in')
     limit 6
  ) q;
$$;

-- ── 11 · the driver ───────────────────────────────────────────────
create or replace function public.ride_me_driver()
returns public.drivers
language plpgsql
stable
security definer
set search_path = public
as $$
declare d public.drivers%rowtype;
begin
  select * into d from public.drivers where user_id = auth.uid();
  if not found then perform public.ride_err('not_a_driver'); end if;
  return d;
end $$;

create or replace function public.ride_driver_board()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  d public.drivers%rowtype;
  l public.driver_locations%rowtype;
  v_vehicle jsonb; v_inv jsonb; v_active jsonb; v_up jsonb; v_recent jsonb; v_today jsonb;
begin
  d := public.ride_me_driver();
  select * into l from public.driver_locations where driver_id = d.id;
  /* A driver who has just come online should see the rides already
     waiting nearby, not only the ones placed after they arrived. */
  if d.status = 'approved' and l.is_online and l.is_available and l.updated_at > now() - interval '90 seconds' then
    /* They are looking at the board already: no push for these. */
    perform set_config('cabana.quiet_invites', '1', true);
    insert into public.ride_offers (request_id, driver_id, distance_km, eta_min, status, sent_at, source)
    select r.id, d.id, round(public.cab_km(r.pickup_lat, r.pickup_lng, l.lat, l.lng)::numeric, 2),
           greatest(2, ceil(public.cab_km(r.pickup_lat, r.pickup_lng, l.lat, l.lng) / 22 * 60))::int,
           'sent', now(), 'driver'
      from public.ride_requests r
     where r.status = 'searching' and r.pickup_lat is not null
       and r.created_at > now() - interval '2 hours'
       and public.cab_km(r.pickup_lat, r.pickup_lng, l.lat, l.lng)
           <= greatest(coalesce(r.search_radius_km, 4), case when r.scheduled_for is null then 4 else 30 end)
       and not exists (select 1 from public.ride_offers o where o.request_id = r.id and o.driver_id = d.id)
       and public.ride_driver_fits(d.id, r.id)
     limit 10
    on conflict (request_id, driver_id) do nothing;
  end if;
  select public.ride_vehicle_json(v.id) into v_vehicle from public.driver_vehicles v
   where v.driver_id = d.id and v.is_primary order by v.created_at limit 1;

  select coalesce(jsonb_agg(x.j order by x.at), '[]'::jsonb) into v_inv from (
    select coalesce(r.scheduled_for, r.created_at) at, jsonb_strip_nulls(jsonb_build_object(
      'request_id', r.id, 'ref', r.ref, 'offer_status', o.status, 'my_price', o.price_minor, 'my_eta', o.eta_min,
      'offer_expires_at', o.expires_at, 'pickup_km', o.distance_km,
      'service', r.service, 'mode_key', r.mode_key, 'class', r.class, 'request_kind', r.request_kind,
      'scheduled_for', r.scheduled_for, 'created_at', r.created_at,
      'pickup', jsonb_build_object('label', r.pickup_label, 'lat', r.pickup_lat, 'lng', r.pickup_lng),
      'dropoff', jsonb_build_object('label', r.dropoff_label, 'lat', r.dropoff_lat, 'lng', r.dropoff_lng),
      'distance_km', r.distance_km, 'duration_min', r.duration_min, 'passengers', r.passengers,
      'luggage', r.luggage, 'hours', r.hours, 'needs', r.ride_needs, 'notes', r.notes, 'flight_no', r.flight_no,
      'rider_offer', r.rider_offer_minor, 'fare_hint', r.fare_hint_minor, 'currency', r.currency,
      'fixed_price', r.pricing_status = 'published_price', 'pay_method', r.pay_method,
      'rider', split_part(btrim(r.rider_name), ' ', 1))) j
      from public.ride_offers o
      join public.ride_requests r on r.id = o.request_id
     where o.driver_id = d.id and o.status in ('sent','offered')
       and r.status = 'searching'
       and (o.expires_at is null or o.expires_at > now())
     order by coalesce(r.scheduled_for, r.created_at)
     limit 20
  ) x;

  select public.ride_json(r, 'driver') || jsonb_build_object('id', r.id,
           'rider_name', r.rider_name, 'rider_phone', r.rider_phone, 'notes', r.notes, 'needs', r.ride_needs,
           'flight_no', r.flight_no, 'pin_needed', r.pin_verified_at is null, 'pin_attempts', r.pin_attempts)
    into v_active
    from public.ride_requests r
   where r.driver_id = d.id and r.status in ('assigned','arriving','in_progress')
     and (r.scheduled_for is null or r.scheduled_for < now() + interval '90 minutes')
   order by case r.status when 'in_progress' then 0 when 'arriving' then 1 else 2 end, r.assigned_at
   limit 1;

  select coalesce(jsonb_agg(public.ride_json(r, 'driver') || jsonb_build_object('id', r.id,
           'rider_name', r.rider_name, 'rider_phone', r.rider_phone) order by r.scheduled_for), '[]'::jsonb)
    into v_up
    from public.ride_requests r
   where r.driver_id = d.id and r.status = 'assigned' and r.scheduled_for >= now() + interval '90 minutes';

  select jsonb_build_object('trips', count(*), 'earned', coalesce(sum(agreed_minor), 0),
           'currency', coalesce(max(currency), public.cabana_currency_for(d.country_code)))
    into v_today
    from public.ride_requests
   where driver_id = d.id and status = 'completed'
     and completed_at >= date_trunc('day', now() at time zone public.cabana_tz_for(d.country_code))
                          at time zone public.cabana_tz_for(d.country_code);

  select coalesce(jsonb_agg(x.j order by x.at desc), '[]'::jsonb) into v_recent from (
    select r.completed_at at, jsonb_build_object('ref', r.ref, 'pickup', r.pickup_label, 'dropoff', r.dropoff_label,
      'agreed', r.agreed_minor, 'currency', r.currency, 'completed_at', r.completed_at, 'rating', r.rider_rating) j
      from public.ride_requests r
     where r.driver_id = d.id and r.status = 'completed'
     order by r.completed_at desc limit 8
  ) x;

  return jsonb_build_object(
    'driver', jsonb_strip_nulls(jsonb_build_object('id', d.id, 'name', d.full_name, 'status', d.status,
      'status_note', d.status_note, 'city', d.city, 'country_code', d.country_code,
      'rating', round(d.rating, 2), 'trips', d.trips_completed, 'classes', d.classes, 'mode_keys', d.mode_keys,
      'phone', d.phone, 'payout_number', d.payout_number, 'vehicle', v_vehicle,
      'online', coalesce(l.is_online, false) and l.updated_at > now() - interval '90 seconds',
      'available', coalesce(l.is_available, true))),
    'invitations', v_inv, 'active', v_active, 'upcoming', v_up, 'today', v_today, 'recent', v_recent);
end $$;

create or replace function public.ride_driver_offer(p_request uuid, p_price bigint, p_eta int default null, p_note text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  d public.drivers%rowtype;
  r public.ride_requests%rowtype;
  o public.ride_offers%rowtype;
  v_vehicle public.driver_vehicles%rowtype;
  v_price bigint := p_price;
  v_ref bigint;
begin
  d := public.ride_me_driver();
  if d.status <> 'approved' then perform public.ride_err('driver_not_approved'); end if;
  select * into r from public.ride_requests where id = p_request for update;
  if not found or r.status <> 'searching' then perform public.ride_err('ride_not_open'); end if;
  select * into o from public.ride_offers where request_id = r.id and driver_id = d.id for update;
  if not found then
    if not public.ride_driver_fits(d.id, r.id) then perform public.ride_err('ride_not_for_you'); end if;
    insert into public.ride_offers (request_id, driver_id, status, source, sent_at)
    values (r.id, d.id, 'sent', 'driver', now()) returning * into o;
  end if;
  if o.status not in ('sent','offered','expired') then perform public.ride_err('offer_closed', o.status); end if;
  if r.scheduled_for is null and exists (select 1 from public.ride_requests a
       where a.driver_id = d.id and a.status in ('assigned','arriving','in_progress') and a.scheduled_for is null) then
    perform public.ride_err('finish_current_trip');
  end if;

  if r.pricing_status = 'published_price' then
    v_price := r.rider_offer_minor;
  end if;
  v_ref := coalesce(r.rider_offer_minor, r.fare_hint_minor);
  if v_price is null or v_price <= 0 then perform public.ride_err('price_required'); end if;
  if v_ref is not null and (v_price < round(v_ref * 0.4) or v_price > v_ref * 4) then
    perform public.ride_err('price_out_of_range');
  end if;

  select * into v_vehicle from public.driver_vehicles
   where driver_id = d.id and is_primary order by created_at limit 1;

  update public.ride_offers set
    status = 'offered', price_minor = v_price, currency = r.currency,
    eta_min = greatest(1, least(coalesce(p_eta, eta_min, 10), 240)),
    note = nullif(left(btrim(coalesce(p_note, '')), 140), ''),
    counter = r.rider_offer_minor is null or v_price <> r.rider_offer_minor,
    offered_at = now(), responded_at = now(),
    expires_at = case when r.scheduled_for is null then now() + interval '100 seconds'
                      else least(r.search_until, now() + interval '12 hours') end,
    driver_name = nullif(split_part(btrim(d.full_name), ' ', 1), ''),
    rating = round(d.rating, 2), trips = d.trips_completed,
    vehicle_label = nullif(btrim(concat_ws(' ', v_vehicle.make, v_vehicle.model)), ''),
    vehicle_colour = v_vehicle.colour, plate = v_vehicle.plate, photo_url = v_vehicle.photo_url
  where id = o.id returning * into o;
  perform public.ride_log(r.id, case when o.counter then 'countered' else 'accepted_fare' end, 'driver',
                          v_price::text || ' ' || coalesce(r.currency, ''));

  /* The rider asked for the first driver at their own fare. */
  if r.auto_accept and r.scheduled_for is null and r.rider_offer_minor is not null
     and v_price <= r.rider_offer_minor then
    r := public.ride_assign(r.id, o.id, 'auto');
    return jsonb_build_object('status', 'assigned', 'ref', r.ref);
  end if;
  return jsonb_build_object('status', 'offered', 'ref', r.ref, 'expires_at', o.expires_at);
end $$;

create or replace function public.ride_driver_pass(p_request uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare d public.drivers%rowtype;
begin
  d := public.ride_me_driver();
  update public.ride_offers set status = 'declined', responded_at = now()
   where request_id = p_request and driver_id = d.id and status in ('sent','offered','expired');
  return found;
end $$;

create or replace function public.ride_driver_progress(p_request uuid, p_action text, p_pin text default null, p_reason text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  d public.drivers%rowtype;
  r public.ride_requests%rowtype;
begin
  d := public.ride_me_driver();
  select * into r from public.ride_requests where id = p_request and driver_id = d.id for update;
  if not found then perform public.ride_err('ride_not_found'); end if;

  if p_action = 'arrived' then
    if r.status <> 'assigned' then perform public.ride_err('bad_step', r.status); end if;
    update public.ride_requests set status = 'arriving', arrived_at = now() where id = r.id returning * into r;
    perform public.ride_log(r.id, 'arrived', 'driver', null);

  elsif p_action = 'start' then
    if r.status not in ('assigned','arriving') then perform public.ride_err('bad_step', r.status); end if;
    if r.pin_attempts >= 6 then perform public.ride_err('pin_locked'); end if;
    /* A wrong PIN is an answer, not an exception: raising would roll back
       the attempt counter and make guessing free. */
    if public.food_digits(p_pin) is distinct from r.trip_pin then
      update public.ride_requests set pin_attempts = pin_attempts + 1 where id = r.id returning * into r;
      perform public.ride_log(r.id, 'pin_wrong', 'driver', null);
      return public.ride_json(r, 'driver') || jsonb_build_object('id', r.id, 'error', 'pin_wrong',
        'attempts_left', greatest(0, 6 - r.pin_attempts));
    end if;
    update public.ride_requests
       set status = 'in_progress', started_at = now(), pin_verified_at = now(),
           arrived_at = coalesce(arrived_at, now())
     where id = r.id returning * into r;
    perform public.ride_log(r.id, 'started', 'driver', null);

  elsif p_action = 'complete' then
    if r.status <> 'in_progress' then perform public.ride_err('bad_step', r.status); end if;
    update public.ride_requests
       set status = 'completed', completed_at = now(),
           final_fare = round(coalesce(agreed_minor, 0)::numeric / public.cabana_minor_factor(currency))::int
     where id = r.id returning * into r;
    update public.drivers set trips_completed = trips_completed + 1 where id = d.id;
    update public.driver_locations set is_available = true where driver_id = d.id;
    perform public.ride_log(r.id, 'completed', 'driver', null);

  elsif p_action = 'cancel' then
    if r.status not in ('assigned','arriving') then perform public.ride_err('bad_step', r.status); end if;
    update public.ride_offers set status = 'withdrawn', responded_at = now()
     where request_id = r.id and driver_id = d.id;
    update public.ride_requests
       set status = 'searching', driver_id = null, vehicle_id = null, assigned_at = null, arrived_at = null,
           chosen_offer_id = null, agreed_minor = null, assigned_snapshot = null, pricing_status = 'market',
           desk_at = null, pin_attempts = 0,
           search_until = greatest(coalesce(search_until, now()), now() + interval '15 minutes')
     where id = r.id returning * into r;
    update public.driver_locations set is_available = true where driver_id = d.id;
    perform public.ride_log(r.id, 'driver_cancelled', 'driver', nullif(left(btrim(coalesce(p_reason, '')), 200), ''));
    perform public.ride_broadcast_v2(r.id, greatest(coalesce(r.search_radius_km, 4), 7));
  else
    perform public.ride_err('bad_action');
  end if;
  return public.ride_json(r, 'driver') || jsonb_build_object('id', r.id);
end $$;

/* Old consoles called cab_accept to take a trip at the metered price.
   There is no metered price now: accepting means offering the rider's
   own fare, which auto-accept may turn straight into the trip. */
create or replace function public.cab_accept(p_request uuid, p_vehicle uuid default null)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare r public.ride_requests%rowtype; v jsonb;
begin
  select * into r from public.ride_requests where id = p_request;
  if not found or r.status <> 'searching' or coalesce(r.rider_offer_minor, r.fare_hint_minor) is null then return false; end if;
  v := public.ride_driver_offer(p_request, coalesce(r.rider_offer_minor, r.fare_hint_minor), null, null);
  return v->>'status' = 'assigned';
exception when others then
  return false;
end $$;

-- ── 12 · the desk ─────────────────────────────────────────────────
create or replace function public.ride_desk_offer(p_request uuid, p jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare r public.ride_requests%rowtype; o public.ride_offers%rowtype; v_price bigint;
begin
  if not public.is_admin() then perform public.ride_err('forbidden'); end if;
  select * into r from public.ride_requests where id = p_request for update;
  if not found or r.status <> 'searching' then perform public.ride_err('ride_not_open'); end if;
  v_price := nullif(p->>'price_minor', '')::bigint;
  if r.pricing_status = 'published_price' then v_price := r.rider_offer_minor; end if;
  if v_price is null or v_price <= 0 then perform public.ride_err('price_required'); end if;
  if length(btrim(coalesce(p->>'driver_name', ''))) < 2 or length(public.food_digits(p->>'driver_phone')) < 9 then
    perform public.ride_err('driver_details_required');
  end if;
  insert into public.ride_offers (request_id, driver_id, source, status, price_minor, currency, eta_min, note,
    driver_name, driver_phone, vehicle_label, vehicle_colour, plate, rating, trips, offered_at, responded_at, expires_at,
    counter, sent_at)
  values (r.id, null, 'desk', 'offered', v_price, r.currency,
    greatest(1, least(coalesce(nullif(p->>'eta_min', '')::int, 15), 600)),
    nullif(left(btrim(coalesce(p->>'note', '')), 140), ''),
    left(btrim(p->>'driver_name'), 60), left(btrim(p->>'driver_phone'), 20),
    nullif(left(btrim(coalesce(p->>'vehicle_label', '')), 60), ''),
    nullif(left(btrim(coalesce(p->>'vehicle_colour', '')), 30), ''),
    nullif(upper(left(btrim(coalesce(p->>'plate', '')), 16)), ''),
    nullif(p->>'rating', '')::numeric, nullif(p->>'trips', '')::int,
    now(), now(), greatest(r.search_until, now() + interval '20 minutes'),
    r.rider_offer_minor is null or v_price <> r.rider_offer_minor, now())
  returning * into o;
  update public.ride_requests set search_until = greatest(search_until, now() + interval '20 minutes') where id = r.id;
  perform public.ride_log(r.id, 'desk_offer', 'desk', o.driver_name || ' ' || v_price::text);
  return public.ride_json((select x from public.ride_requests x where x.id = r.id), 'desk');
end $$;

create or replace function public.ride_desk_progress(p_request uuid, p_action text, p_note text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare r public.ride_requests%rowtype;
begin
  if not public.is_admin() then perform public.ride_err('forbidden'); end if;
  select * into r from public.ride_requests where id = p_request for update;
  if not found then perform public.ride_err('ride_not_found'); end if;
  if p_action = 'arrived' and r.status = 'assigned' then
    update public.ride_requests set status = 'arriving', arrived_at = now() where id = r.id returning * into r;
  elsif p_action = 'start' and r.status in ('assigned','arriving') then
    update public.ride_requests set status = 'in_progress', started_at = now(), arrived_at = coalesce(arrived_at, now())
     where id = r.id returning * into r;
  elsif p_action = 'complete' and r.status in ('assigned','arriving','in_progress') then
    update public.ride_requests set status = 'completed', completed_at = now(), started_at = coalesce(started_at, now()),
           final_fare = round(coalesce(agreed_minor, 0)::numeric / public.cabana_minor_factor(currency))::int
     where id = r.id returning * into r;
    if r.driver_id is not null then
      update public.driver_locations set is_available = true where driver_id = r.driver_id;
    end if;
  elsif p_action = 'cancel' and r.status in ('searching','assigned','arriving','quote_pending','quoted','scheduled') then
    update public.ride_offers set status = 'expired', responded_at = now()
     where request_id = r.id and status in ('sent','offered');
    if r.driver_id is not null then
      update public.driver_locations set is_available = true where driver_id = r.driver_id;
    end if;
    update public.ride_requests set status = 'cancelled', cancelled_at = now(), cancelled_by = 'desk',
           cancel_reason = nullif(left(btrim(coalesce(p_note, '')), 200), ''), pricing_status = 'market'
     where id = r.id returning * into r;
  elsif p_action = 'reopen' and r.status in ('unfulfilled','expired') then
    update public.ride_requests set status = 'searching', desk_at = now(), pricing_status = 'awaiting_quote',
           search_until = now() + interval '30 minutes'
     where id = r.id returning * into r;
  else
    perform public.ride_err('bad_step', r.status);
  end if;
  perform public.ride_log(r.id, 'desk_' || p_action, 'desk', p_note);
  return public.ride_json(r, 'desk');
end $$;

-- ── 13 · who hears about what ─────────────────────────────────────
create or replace function public.ride_money(p_minor bigint, p_currency text)
returns text language sql immutable set search_path = pg_catalog as $$
  select case when p_minor is null then '' else
    coalesce(p_currency, 'KES') || ' ' ||
    to_char(p_minor::numeric / public.cabana_minor_factor(coalesce(p_currency, 'KES')), 'FM999,999,999,990') end;
$$;

create or replace function public.ride_requests_after()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  url_r text; url_d text; meta jsonb; v_driver_user uuid; v_old_driver_user uuid;
  v_name text; v_car text; a uuid;
begin
  if tg_op <> 'UPDATE' then return new; end if;
  url_r := '/rides?trip=' || new.ref;
  url_d := '/driver';
  meta := jsonb_build_object('order_ref', new.ref, 'ride_id', new.id, 'status', new.status);
  select user_id into v_driver_user from public.drivers where id = new.driver_id;
  select user_id into v_old_driver_user from public.drivers where id = old.driver_id;
  v_name := coalesce(new.assigned_snapshot->>'name', 'Your driver');
  v_car := nullif(btrim(concat_ws(' · ', new.assigned_snapshot->'vehicle'->>'label',
                                   new.assigned_snapshot->'vehicle'->>'plate')), '');

  if new.desk_at is not null and old.desk_at is null and new.status = 'searching' then
    for a in select * from public.cabana_admin_ids() loop
      perform public.cabana_notify(a, case when new.scheduled_for is null then 'urgent' else 'booking' end,
        'Rider waiting · ' || new.ref,
        coalesce(new.pickup_label, '?') || ' → ' || coalesce(new.dropoff_label, 'by the hour') || ' · '
          || coalesce(nullif(public.ride_money(new.rider_offer_minor, new.currency), ''), 'asking for offers')
          || case when new.scheduled_for is not null
                  then ' · ' || to_char(new.scheduled_for at time zone public.cabana_tz_for(new.country_code), 'DD Mon HH24:MI')
                  else ' · now' end,
        '/admin#/move', meta);
    end loop;
  end if;

  if new.status is not distinct from old.status then return new; end if;

  if new.status = 'assigned' then
    perform public.cabana_notify(new.rider_id, 'ride', v_name || ' is on the way',
      coalesce(v_car || '. ', '') || 'Agreed fare ' || public.ride_money(new.agreed_minor, new.currency)
        || '. Your trip PIN is in the app.', url_r, meta);
    perform public.cabana_notify(v_driver_user, 'ride',
      case when new.scheduled_for is null then 'Trip confirmed · head to pick-up'
           else 'Trip booked for ' || to_char(new.scheduled_for at time zone public.cabana_tz_for(new.country_code), 'DD Mon HH24:MI') end,
      coalesce(new.pickup_label, '') || ' · ' || public.ride_money(new.agreed_minor, new.currency), url_d, meta);
  elsif new.status = 'arriving' then
    perform public.cabana_notify(new.rider_id, 'ride', v_name || ' is outside',
      coalesce(v_car || '. ', '') || 'Give your PIN ' || new.trip_pin || ' when you get in.', url_r, meta);
  elsif new.status = 'in_progress' then
    perform public.cabana_notify(new.rider_id, 'ride', 'Trip started',
      'Share your live trip with someone from the app. Safe travels.', url_r, meta);
  elsif new.status = 'completed' then
    perform public.cabana_notify(new.rider_id, 'ride', 'You have arrived',
      'Pay ' || public.ride_money(new.agreed_minor, new.currency) || ' to ' || v_name
        || case new.pay_method when 'mpesa' then ' by M-Pesa' when 'card' then ' by card' else ' in cash' end
        || '. Cabana takes nothing. Rate your ride.', url_r, meta);
  elsif new.status = 'searching' and old.status in ('assigned','arriving') then
    perform public.cabana_notify(new.rider_id, 'ride', 'Your driver cancelled',
      'We are finding you another driver now. Ref ' || new.ref || '.', url_r, meta);
  elsif new.status = 'cancelled' and new.cancelled_by = 'rider' and old.driver_id is not null then
    perform public.cabana_notify(v_old_driver_user, 'ride', 'Rider cancelled ' || new.ref,
      coalesce(new.cancel_reason, 'The trip is off. You are available for the next one.'), url_d, meta);
  elsif new.status = 'cancelled' and new.cancelled_by = 'desk' then
    perform public.cabana_notify(new.rider_id, 'ride', 'Your ride request was closed',
      coalesce(new.cancel_reason, 'The Cabana desk closed this request.') , url_r, meta);
    perform public.cabana_notify(v_old_driver_user, 'ride', 'Trip ' || new.ref || ' was cancelled',
      'The Cabana desk cancelled this trip.', url_d, meta);
  elsif new.status = 'unfulfilled' then
    perform public.cabana_notify(new.rider_id, 'ride', 'No driver took your ride',
      'Nothing was charged. Raise your fare or schedule it and we will try again.', url_r, meta);
  end if;
  return new;
end $$;

drop trigger if exists trg_ride_requests_after on public.ride_requests;
create trigger trg_ride_requests_after after update on public.ride_requests
  for each row execute function public.ride_requests_after();

create or replace function public.ride_offers_after()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare r public.ride_requests%rowtype; v_user uuid; meta jsonb;
begin
  select * into r from public.ride_requests where id = new.request_id;
  if not found then return new; end if;
  meta := jsonb_build_object('order_ref', r.ref, 'ride_id', r.id, 'status', 'offer');

  if tg_op = 'INSERT' and new.status = 'sent' and new.driver_id is not null
     and coalesce(current_setting('cabana.quiet_invites', true), '') <> '1' then
    select user_id into v_user from public.drivers where id = new.driver_id;
    perform public.cabana_notify(v_user, 'ride',
      case when r.scheduled_for is null then 'New trip nearby' else 'New booking request' end
        || coalesce(' · ' || nullif(public.ride_money(r.rider_offer_minor, r.currency), ''), ''),
      coalesce(r.pickup_label, '') || ' → ' || coalesce(r.dropoff_label, 'by the hour')
        || coalesce(' · ' || new.distance_km || ' km away', ''),
      '/driver', meta);
  end if;

  if new.status = 'offered' and (tg_op = 'INSERT' or old.status is distinct from 'offered') and r.status = 'searching' then
    perform public.cabana_notify(r.rider_id, 'ride',
      'New offer · ' || public.ride_money(new.price_minor, new.currency),
      coalesce(new.driver_name, 'A driver') || coalesce(' ★' || to_char(new.rating, 'FM0.0'), '')
        || coalesce(' · ' || new.eta_min || ' min away', '') || '. Tap to choose.',
      '/rides?trip=' || r.ref, meta);
  end if;
  return new;
end $$;

drop trigger if exists trg_ride_offers_after on public.ride_offers;
create trigger trg_ride_offers_after after insert or update of status on public.ride_offers
  for each row execute function public.ride_offers_after();

-- ── 14 · the old doors close ──────────────────────────────────────
-- Requests are created and changed only through the functions above.
drop trigger if exists cabana_guard_ride_request_insert_t on public.ride_requests;
drop trigger if exists cabana_guard_ride_request_update_t on public.ride_requests;
drop policy if exists requests_create on public.ride_requests;
drop policy if exists requests_rider_cancel on public.ride_requests;
/* Riders and drivers used to read rows directly. The row now carries the
   trip PIN and the rider's token, so reading goes through ride_track and
   ride_driver_board, which shape what each side may see. */
drop policy if exists requests_read_own on public.ride_requests;
revoke insert, update, delete on public.ride_requests from anon;

revoke all on function public.cab_track(text) from public, anon, authenticated;

-- ── 15 · grants ───────────────────────────────────────────────────
revoke all on function public.cabana_notify(uuid, text, text, text, text, jsonb) from public, anon, authenticated;
revoke all on function public.cabana_admin_ids() from public, anon, authenticated;
revoke all on function public.ride_err(text, text) from public, anon, authenticated;
revoke all on function public.ride_new_ref() from public, anon, authenticated;
revoke all on function public.ride_log(uuid, text, text, text) from public, anon, authenticated;
revoke all on function public.ride_measure(jsonb) from public, anon, authenticated;
revoke all on function public.ride_guide_for(text, text, text, text) from public, anon, authenticated;
revoke all on function public.ride_fare_calc(public.ride_fare_guides, numeric, numeric, boolean, boolean, numeric) from public, anon, authenticated;
revoke all on function public.ride_driver_fits(uuid, uuid) from public, anon, authenticated;
revoke all on function public.ride_broadcast_v2(uuid, double precision) from public, anon, authenticated;
revoke all on function public.ride_vehicle_json(uuid) from public, anon, authenticated;
revoke all on function public.ride_json(public.ride_requests, text) from public, anon, authenticated;
revoke all on function public.ride_guest_request(text, text) from public, anon, authenticated;
revoke all on function public.ride_requests_tick() from public, anon, authenticated;
revoke all on function public.ride_assign(uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.ride_me_driver() from public, anon, authenticated;
revoke all on function public.ride_requests_after() from public, anon, authenticated;
revoke all on function public.ride_offers_after() from public, anon, authenticated;

revoke all on function public.ride_fare_hint(jsonb) from public;
revoke all on function public.ride_request_place(jsonb) from public;
revoke all on function public.ride_track(text, text) from public;
revoke all on function public.ride_share_view(text, text) from public;
revoke all on function public.ride_requests_list(jsonb) from public;
revoke all on function public.ride_choose_offer(text, text, uuid) from public;
revoke all on function public.ride_raise_offer(text, text, bigint) from public;
revoke all on function public.ride_cancel(text, text, text) from public;
revoke all on function public.ride_rider_complete(text, text) from public;
revoke all on function public.ride_rate(text, text, int, text) from public;
grant execute on function public.ride_fare_hint(jsonb) to anon, authenticated;
grant execute on function public.ride_request_place(jsonb) to anon, authenticated;
grant execute on function public.ride_track(text, text) to anon, authenticated;
grant execute on function public.ride_share_view(text, text) to anon, authenticated;
grant execute on function public.ride_requests_list(jsonb) to anon, authenticated;
grant execute on function public.ride_choose_offer(text, text, uuid) to anon, authenticated;
grant execute on function public.ride_raise_offer(text, text, bigint) to anon, authenticated;
grant execute on function public.ride_cancel(text, text, text) to anon, authenticated;
grant execute on function public.ride_rider_complete(text, text) to anon, authenticated;
grant execute on function public.ride_rate(text, text, int, text) to anon, authenticated;

revoke all on function public.ride_my_stays() from public, anon;
revoke all on function public.ride_driver_board() from public, anon;
revoke all on function public.ride_driver_offer(uuid, bigint, int, text) from public, anon;
revoke all on function public.ride_driver_pass(uuid) from public, anon;
revoke all on function public.ride_driver_progress(uuid, text, text, text) from public, anon;
revoke all on function public.ride_desk_offer(uuid, jsonb) from public, anon;
revoke all on function public.ride_desk_progress(uuid, text, text) from public, anon;
grant execute on function public.ride_my_stays() to authenticated;
grant execute on function public.ride_driver_board() to authenticated;
grant execute on function public.ride_driver_offer(uuid, bigint, int, text) to authenticated;
grant execute on function public.ride_driver_pass(uuid) to authenticated;
grant execute on function public.ride_driver_progress(uuid, text, text, text) to authenticated;
grant execute on function public.ride_desk_offer(uuid, jsonb) to authenticated;
grant execute on function public.ride_desk_progress(uuid, text, text) to authenticated;

revoke all on function public.cab_accept(uuid, uuid) from public, anon;
grant execute on function public.cab_accept(uuid, uuid) to authenticated;

-- ── 16 · the clock that runs when no page is open ─────────────────
do $$
begin
  perform cron.unschedule('cabana-rides-tick')
  where exists (select 1 from cron.job where jobname = 'cabana-rides-tick');
  perform cron.schedule('cabana-rides-tick', '* * * * *', 'select public.ride_requests_tick()');
end $$;
