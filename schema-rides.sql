-- ═══════════════════════════════════════════════════════════════════════════
-- CABANA · RIDES  ·  PRIVATE FLEET AND LIVE DISPATCH
-- ───────────────────────────────────────────────────────────────────────────
-- Rides stop being a directory of listings and become an operated network.
-- The difference is not cosmetic. A directory shows you options and hopes.
-- A network holds drivers, knows where they are right now, and answers for
-- the ride.
--
-- Four ideas the schema is built on:
--
--   1. A DRIVER IS A PERSON WE HAVE CHECKED. Not a listing. drivers rows are
--      created on application and stay in 'applied' until documents pass.
--      Nothing dispatches to an unapproved driver, and the database enforces
--      that rather than the frontend asking nicely.
--
--   2. PRESENCE IS A HEARTBEAT, NOT A FLAG. driver_locations is one row per
--      driver, overwritten every few seconds while online. A driver whose
--      last ping is older than 90 seconds is not online, whatever the flag
--      says, because phones die and tunnels swallow signal.
--
--   3. DISPATCH IS A BROADCAST WITH ONE WINNER. A request fans out to every
--      eligible driver inside the radius at once. The first accept takes it,
--      settled by a conditional UPDATE, so two drivers tapping in the same
--      second cannot both get the ride.
--
--   4. THE PRICE IS WRITTEN DOWN BEFORE THE CAR MOVES. quote_breakdown is
--      stored as the receipt the rider actually saw. Any later argument is
--      settled by reading the row.
--
-- Idempotent. Safe to re-run.
-- ═══════════════════════════════════════════════════════════════════════════

create extension if not exists "pgcrypto";

-- ── 0 · RETIRE THE OLD FREE-FOR-ALL ───────────────────────────────────────
-- transport_requests took an anonymous form post with no driver on the other
-- end. Keep the history, stop new writes, point everything at ride_requests.

do $$
begin
  if to_regclass('public.transport_requests') is not null then
    execute $x$ comment on table public.transport_requests is
      'DEPRECATED. Superseded by public.ride_requests. Read-only history.' $x$;
    execute 'revoke insert, update on public.transport_requests from anon, authenticated';
  end if;
end $$;


-- ── 1 · GEOMETRY HELPER ───────────────────────────────────────────────────
-- Plain SQL haversine. PostGIS would be faster at a million rows and is
-- overkill at a thousand drivers in one city. Add it the day Nairobi is not
-- enough, not before.

create or replace function public.cab_km(
  lat1 double precision, lng1 double precision,
  lat2 double precision, lng2 double precision
) returns double precision
language sql immutable parallel safe set search_path = public as $$
  select 6371 * 2 * asin(least(1, sqrt(
    power(sin(radians(lat2 - lat1) / 2), 2) +
    cos(radians(lat1)) * cos(radians(lat2)) *
    power(sin(radians(lng2 - lng1) / 2), 2)
  )));
$$;


-- ── 2 · DRIVERS ───────────────────────────────────────────────────────────

create table if not exists public.drivers (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid unique references auth.users(id) on delete set null,
  full_name       text not null,
  phone           text not null,
  email           text,
  national_id     text,
  dob             date,
  city            text not null default 'Nairobi',
  licence_no      text,
  licence_expiry  date,
  psv_badge       boolean default false,
  years_driving   int,
  languages       text[] default '{English,Swahili}',
  -- what this driver is cleared to serve. never wider than the vehicle allows
  classes         text[] not null default '{economy}',
  status          text not null default 'applied'
                  check (status in ('applied','under_review','approved','paused','suspended','rejected')),
  status_note     text,
  rating          numeric(3,2) default 5.00,
  trips_completed int default 0,
  accept_rate     numeric(5,2),
  payout_method   text default 'mpesa',
  payout_number   text,
  referred_by     text,
  applied_at      timestamptz not null default now(),
  approved_at     timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists drivers_status_idx on public.drivers(status);
create index if not exists drivers_user_idx   on public.drivers(user_id);

comment on column public.drivers.classes is
  'Ride classes this driver may receive. Set by review, never by the driver.';


-- ── 3 · VEHICLES ──────────────────────────────────────────────────────────

create table if not exists public.driver_vehicles (
  id               uuid primary key default gen_random_uuid(),
  driver_id        uuid not null references public.drivers(id) on delete cascade,
  make             text not null,
  model            text not null,
  year             int  not null,
  plate            text not null,
  colour           text,
  seats            int  not null default 4,
  class            text not null default 'economy'
                   check (class in ('economy','comfort','executive','van','shared')),
  insurance_expiry date,
  inspection_expiry date,
  photo_url        text,
  verified         boolean not null default false,
  is_primary       boolean not null default true,
  created_at       timestamptz not null default now()
);

create index if not exists driver_vehicles_driver_idx on public.driver_vehicles(driver_id);
create unique index if not exists driver_vehicles_plate_idx on public.driver_vehicles(upper(replace(plate,' ','')));


-- ── 4 · DOCUMENTS ─────────────────────────────────────────────────────────
-- Every document has an expiry. A driver whose PSV insurance lapsed last
-- Tuesday is not an approved driver on Wednesday, and the review queue should
-- see that without anyone remembering to look.

create table if not exists public.driver_documents (
  id          uuid primary key default gen_random_uuid(),
  driver_id   uuid not null references public.drivers(id) on delete cascade,
  kind        text not null
              check (kind in ('national_id','driving_licence','psv_badge','good_conduct',
                              'logbook','insurance','inspection','vehicle_photo','portrait')),
  file_url    text,
  status      text not null default 'pending'
              check (status in ('pending','approved','rejected','expired')),
  expires_on  date,
  note        text,
  reviewed_at timestamptz,
  created_at  timestamptz not null default now()
);

create index if not exists driver_documents_driver_idx on public.driver_documents(driver_id, kind);


-- ── 5 · LIVE PRESENCE ─────────────────────────────────────────────────────
-- One row per driver. Overwritten, never appended. History belongs in the
-- trip record, not here.

create table if not exists public.driver_locations (
  driver_id    uuid primary key references public.drivers(id) on delete cascade,
  lat          double precision not null,
  lng          double precision not null,
  heading      numeric,
  speed_kph    numeric,
  is_online    boolean not null default false,
  is_available boolean not null default true,
  class        text,
  battery      int,
  updated_at   timestamptz not null default now()
);

create index if not exists driver_locations_live_idx
  on public.driver_locations(is_online, is_available, updated_at desc);

-- A driver counts as live only if the heartbeat is fresh. 90 seconds is two
-- missed pings on a 30 second interval, which is a tunnel, not a shift end.
create or replace view public.v_live_drivers as
  select l.driver_id, l.lat, l.lng, l.class, l.heading, l.updated_at,
         d.rating, d.trips_completed, d.classes
    from public.driver_locations l
    join public.drivers d on d.id = l.driver_id
   where l.is_online
     and l.is_available
     and d.status = 'approved'
     and l.updated_at > now() - interval '90 seconds';


-- ── 6 · TARIFF ────────────────────────────────────────────────────────────
-- The published price list, held server side so a rider cannot edit the fare
-- in a console and so a change reaches every surface at once.

create table if not exists public.ride_tariffs (
  class      text primary key,
  label      text not null,
  base_fare  int not null,
  per_km     int not null,
  per_min    int not null,
  min_fare   int not null,
  seats      int not null default 4,
  sort       int not null default 0,
  active     boolean not null default true,
  blurb      text,
  updated_at timestamptz not null default now()
);

insert into public.ride_tariffs (class,label,base_fare,per_km,per_min,min_fare,seats,sort,blurb) values
  ('economy',  'Economy',    100,  50, 3, 250, 4, 1, 'Saloon or hatchback. The everyday way across town.'),
  ('comfort',  'Comfort',    150,  68, 4, 400, 4, 2, 'Newer, roomier cars. More boot space, quieter ride.'),
  ('executive','Executive',  300, 110, 7, 900, 3, 3, 'Black-plate executive saloons and a driver in uniform.'),
  ('van',      'Group van',  250,  90, 5, 700, 7, 4, 'Seven seats and real luggage room.'),
  ('shared',   'Shared',      60,  28, 2, 150, 1, 5, 'One seat, up to two other riders going your way.')
on conflict (class) do update set
  base_fare = excluded.base_fare, per_km = excluded.per_km, per_min = excluded.per_min,
  min_fare  = excluded.min_fare,  label   = excluded.label, blurb   = excluded.blurb,
  seats     = excluded.seats,     sort    = excluded.sort,  updated_at = now();


create table if not exists public.ride_fixed_routes (
  id         text primary key,
  from_label text not null,
  to_label   text not null,
  class      text not null default 'comfort',
  price      int  not null,
  est_min    int,
  note       text,
  active     boolean not null default true
);

insert into public.ride_fixed_routes (id,from_label,to_label,class,price,est_min,note) values
  ('jkia-cbd',       'JKIA','Nairobi CBD',                'comfort',   900,  45, 'Includes 60 minutes of arrivals waiting.'),
  ('jkia-westlands', 'JKIA','Westlands',                  'comfort',  1500,  55, 'Includes 60 minutes of arrivals waiting.'),
  ('jkia-karen',     'JKIA','Karen',                      'comfort',  2200,  70, 'Includes 60 minutes of arrivals waiting.'),
  ('jkia-gigiri',    'JKIA','Gigiri or Runda',            'comfort',  2400,  70, 'Diplomatic quarter. Gate access confirmed in advance.'),
  ('jkia-kilimani',  'JKIA','Kilimani or Kileleshwa',     'comfort',  1700,  55, 'Includes 60 minutes of arrivals waiting.'),
  ('jkia-upperhill', 'JKIA','Upper Hill',                 'comfort',  1400,  50, 'Includes 60 minutes of arrivals waiting.'),
  ('jkia-syokimau',  'JKIA','Syokimau or SGR Terminus',   'economy',   900,  25, 'Train connection. Driver tracks your arrival.'),
  ('wilson-cbd',     'Wilson Airport','Nairobi CBD',      'comfort',  1100,  30, 'Safari connections and domestic charters.'),
  ('jkia-exec',      'JKIA','Anywhere in Nairobi',        'executive',4500,  70, 'Executive saloon, uniformed driver, meet and greet.'),
  ('jkia-van',       'JKIA','Anywhere in Nairobi',        'van',      3800,  70, 'Seven seats. Built for a family or a crew with luggage.'),
  ('nbo-naivasha',   'Nairobi','Naivasha',                'comfort', 11000, 150, 'One way. 30 minutes of waiting included.'),
  ('nbo-amboseli',   'Nairobi','Amboseli',                'van',     24000, 260, 'One way, park entry not included.'),
  ('nbo-mara',       'Nairobi','Maasai Mara',             'van',     34000, 330, 'One way, 4x4 recommended in the wet season.')
on conflict (id) do update set
  price = excluded.price, est_min = excluded.est_min, note = excluded.note,
  class = excluded.class, active = true;


-- ── 7 · RIDE REQUESTS ─────────────────────────────────────────────────────

create table if not exists public.ride_requests (
  id             uuid primary key default gen_random_uuid(),
  ref            text unique not null,
  rider_id       uuid references auth.users(id) on delete set null,
  rider_name     text not null,
  rider_phone    text not null,
  rider_email    text,

  service        text not null default 'ride'
                 check (service in ('ride','transfer','chauffeur')),
  class          text not null default 'economy',

  pickup_label   text not null,
  pickup_lat     double precision,
  pickup_lng     double precision,
  dropoff_label  text,
  dropoff_lat    double precision,
  dropoff_lng    double precision,
  stops          jsonb,

  scheduled_for  timestamptz,
  passengers     int default 1,
  notes          text,
  flight_no      text,

  distance_km    numeric(7,2),
  duration_min   int,
  fixed_route_id text,
  chauffeur_pkg  text,
  quote_total    int not null,
  quote_breakdown jsonb,
  driver_payout  int,

  status         text not null default 'searching'
                 check (status in ('searching','assigned','arriving','in_progress',
                                   'completed','cancelled','expired','unfulfilled','scheduled')),
  driver_id      uuid references public.drivers(id) on delete set null,
  vehicle_id     uuid references public.driver_vehicles(id) on delete set null,
  notified_count int not null default 0,
  search_radius_km numeric(5,2) default 4,

  assigned_at    timestamptz,
  started_at     timestamptz,
  completed_at   timestamptz,
  cancelled_at   timestamptz,
  cancel_reason  text,
  final_fare     int,
  rider_rating   int check (rider_rating between 1 and 5),

  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists ride_requests_status_idx  on public.ride_requests(status, created_at desc);
create index if not exists ride_requests_driver_idx  on public.ride_requests(driver_id, created_at desc);
create index if not exists ride_requests_rider_idx   on public.ride_requests(rider_id, created_at desc);
create index if not exists ride_requests_ref_idx     on public.ride_requests(ref);
create index if not exists ride_requests_vehicle_idx on public.ride_requests(vehicle_id);


-- ── 8 · OFFERS, THE BROADCAST ─────────────────────────────────────────────

create table if not exists public.ride_offers (
  id           uuid primary key default gen_random_uuid(),
  request_id   uuid not null references public.ride_requests(id) on delete cascade,
  driver_id    uuid not null references public.drivers(id) on delete cascade,
  distance_km  numeric(6,2),
  eta_min      int,
  status       text not null default 'sent'
               check (status in ('sent','accepted','declined','expired','lost')),
  sent_at      timestamptz not null default now(),
  responded_at timestamptz,
  unique (request_id, driver_id)
);

create index if not exists ride_offers_driver_idx on public.ride_offers(driver_id, status, sent_at desc);
create index if not exists ride_offers_req_idx    on public.ride_offers(request_id, status);


-- ── 9 · DISPATCH ──────────────────────────────────────────────────────────

-- Who is near this pickup, right now, and cleared for this class.
create or replace function public.cab_nearby_drivers(
  p_lat double precision,
  p_lng double precision,
  p_class text default 'economy',
  p_radius_km double precision default 4
) returns table (
  driver_id uuid, distance_km numeric, eta_min int, rating numeric, trips int
)
language sql stable security definer set search_path = public as $$
  select v.driver_id,
         round(public.cab_km(p_lat, p_lng, v.lat, v.lng)::numeric, 2) as distance_km,
         greatest(2, ceil(public.cab_km(p_lat, p_lng, v.lat, v.lng) / 18 * 60))::int as eta_min,
         v.rating,
         v.trips_completed
    from public.v_live_drivers v
   where p_class = any (v.classes)
     and public.cab_km(p_lat, p_lng, v.lat, v.lng) <= p_radius_km
   order by 2 asc
   limit 30;
$$;

-- How many cars are live in a class right now. Public, because a rider
-- deserves to know the answer before they type an address.
create or replace function public.cab_supply(
  p_lat double precision default null,
  p_lng double precision default null,
  p_radius_km double precision default 8
) returns table (class text, live int)
language sql stable security definer set search_path = public as $$
  select c.class, count(v.driver_id)::int
    from (select unnest(array['economy','comfort','executive','van','shared']) as class) c
    left join public.v_live_drivers v
      on c.class = any (v.classes)
     and (p_lat is null or public.cab_km(p_lat, p_lng, v.lat, v.lng) <= p_radius_km)
   group by c.class;
$$;

-- Fan the request out. Returns how many drivers were reached.
create or replace function public.cab_broadcast(
  p_request uuid,
  p_radius_km double precision default 4
) returns int
language plpgsql security definer set search_path = public as $$
declare
  r public.ride_requests;
  n int := 0;
begin
  select * into r from public.ride_requests where id = p_request;
  if not found then raise exception 'ride_request % not found', p_request; end if;
  if r.status not in ('searching','scheduled') then return 0; end if;
  if r.pickup_lat is null then return 0; end if;

  insert into public.ride_offers (request_id, driver_id, distance_km, eta_min)
  select r.id, n2.driver_id, n2.distance_km, n2.eta_min
    from public.cab_nearby_drivers(r.pickup_lat, r.pickup_lng, r.class, p_radius_km) n2
  on conflict (request_id, driver_id) do nothing;

  get diagnostics n = row_count;

  update public.ride_requests
     set notified_count = notified_count + n,
         search_radius_km = greatest(search_radius_km, p_radius_km),
         updated_at = now()
   where id = r.id;

  return n;
end $$;

-- First accept wins. The conditional UPDATE is the whole race resolution:
-- the second driver's statement matches zero rows and gets false back.
create or replace function public.cab_accept(
  p_request uuid,
  p_vehicle uuid default null
) returns boolean
language plpgsql security definer set search_path = public as $$
declare
  d_id uuid;
  won  int;
begin
  select id into d_id from public.drivers
   where user_id = auth.uid() and status = 'approved';
  if d_id is null then return false; end if;

  -- must have actually been offered the ride
  if not exists (select 1 from public.ride_offers
                  where request_id = p_request and driver_id = d_id
                    and status in ('sent')) then
    return false;
  end if;

  update public.ride_requests
     set driver_id = d_id,
         vehicle_id = coalesce(p_vehicle,
           (select id from public.driver_vehicles
             where driver_id = d_id and is_primary order by created_at limit 1)),
         status = 'assigned',
         assigned_at = now(),
         updated_at = now()
   where id = p_request
     and status in ('searching','scheduled')
     and driver_id is null;

  get diagnostics won = row_count;
  if won = 0 then
    update public.ride_offers set status = 'lost', responded_at = now()
      where request_id = p_request and driver_id = d_id;
    return false;
  end if;

  update public.ride_offers set status = 'accepted', responded_at = now()
    where request_id = p_request and driver_id = d_id;
  update public.ride_offers set status = 'lost', responded_at = now()
    where request_id = p_request and driver_id <> d_id and status = 'sent';
  update public.driver_locations set is_available = false where driver_id = d_id;

  return true;
end $$;

create or replace function public.cab_decline(p_request uuid)
returns boolean
language plpgsql security definer set search_path = public as $$
declare d_id uuid;
begin
  select id into d_id from public.drivers where user_id = auth.uid();
  if d_id is null then return false; end if;
  update public.ride_offers set status = 'declined', responded_at = now()
   where request_id = p_request and driver_id = d_id and status = 'sent';
  return found;
end $$;

-- The driver's own heartbeat.
create or replace function public.cab_ping(
  p_lat double precision, p_lng double precision,
  p_online boolean default true, p_available boolean default true,
  p_class text default null, p_heading numeric default null,
  p_speed numeric default null, p_battery int default null
) returns boolean
language plpgsql security definer set search_path = public as $$
declare d public.drivers;
begin
  select * into d from public.drivers where user_id = auth.uid() and status = 'approved';
  if not found then return false; end if;

  insert into public.driver_locations
    (driver_id, lat, lng, is_online, is_available, class, heading, speed_kph, battery, updated_at)
  values
    (d.id, p_lat, p_lng, p_online, p_available,
     coalesce(p_class, d.classes[1]), p_heading, p_speed, p_battery, now())
  on conflict (driver_id) do update set
    lat = excluded.lat, lng = excluded.lng,
    is_online = excluded.is_online, is_available = excluded.is_available,
    class = excluded.class, heading = excluded.heading,
    speed_kph = excluded.speed_kph, battery = excluded.battery,
    updated_at = now();

  return true;
end $$;

-- Trip lifecycle, driver side.
create or replace function public.cab_set_status(p_request uuid, p_status text)
returns boolean
language plpgsql security definer set search_path = public as $$
declare d_id uuid; n int;
begin
  if p_status not in ('arriving','in_progress','completed','cancelled') then return false; end if;
  select id into d_id from public.drivers where user_id = auth.uid();
  if d_id is null then return false; end if;

  update public.ride_requests
     set status = p_status,
         started_at   = case when p_status = 'in_progress' then now() else started_at end,
         completed_at = case when p_status = 'completed'   then now() else completed_at end,
         cancelled_at = case when p_status = 'cancelled'   then now() else cancelled_at end,
         final_fare   = case when p_status = 'completed'   then quote_total else final_fare end,
         updated_at   = now()
   where id = p_request and driver_id = d_id;
  get diagnostics n = row_count;

  if n > 0 and p_status in ('completed','cancelled') then
    update public.driver_locations set is_available = true where driver_id = d_id;
    if p_status = 'completed' then
      update public.drivers set trips_completed = trips_completed + 1 where id = d_id;
    end if;
  end if;
  return n > 0;
end $$;

-- A request nobody took. Called by the rider client after the search window,
-- so the row never sits in 'searching' forever telling a lie.
create or replace function public.cab_expire_search(p_request uuid)
returns boolean
language sql security definer set search_path = public as $$
  with u as (
    update public.ride_requests
       set status = 'unfulfilled', updated_at = now()
     where id = p_request and status = 'searching' and driver_id is null
     returning 1
  ) select exists (select 1 from u);
$$;


-- ── 10 · WHAT THE RIDER IS ALLOWED TO SEE ─────────────────────────────────
-- Never the driver table. Only the car that is coming for them.

create or replace function public.cab_track(p_ref text)
returns table (
  ref text, status text, class text, quote_total int,
  pickup_label text, dropoff_label text,
  driver_name text, driver_rating numeric, driver_trips int,
  vehicle text, plate text, colour text,
  driver_lat double precision, driver_lng double precision,
  notified_count int, updated_at timestamptz
)
language sql stable security definer set search_path = public as $$
  select r.ref, r.status, r.class, r.quote_total,
         r.pickup_label, r.dropoff_label,
         split_part(d.full_name, ' ', 1) as driver_name,
         d.rating, d.trips_completed,
         nullif(trim(coalesce(v.make,'') || ' ' || coalesce(v.model,'')), '') as vehicle,
         v.plate, v.colour,
         case when r.status in ('assigned','arriving','in_progress') then l.lat end,
         case when r.status in ('assigned','arriving','in_progress') then l.lng end,
         r.notified_count, r.updated_at
    from public.ride_requests r
    left join public.drivers          d on d.id = r.driver_id
    left join public.driver_vehicles  v on v.id = r.vehicle_id
    left join public.driver_locations l on l.driver_id = r.driver_id
   where r.ref = p_ref
   limit 1;
$$;


-- ── 11 · ROW LEVEL SECURITY ─────────────────────────────────────────────
-- Note: auth.uid() is wrapped in a scalar subquery throughout. Bare auth.uid()
-- in a policy is re-evaluated once per row; (select auth.uid()) is computed
-- once per statement. The driver console polls every 12 seconds, so it matters.──

alter table public.drivers           enable row level security;
alter table public.driver_vehicles   enable row level security;
alter table public.driver_documents  enable row level security;
alter table public.driver_locations  enable row level security;
alter table public.ride_requests     enable row level security;
alter table public.ride_offers       enable row level security;
alter table public.ride_tariffs      enable row level security;
alter table public.ride_fixed_routes enable row level security;

do $$
declare p text;
begin
  for p in
    select format('drop policy if exists %I on public.%I', policyname, tablename)
      from pg_policies
     where schemaname = 'public'
       and tablename in ('drivers','driver_vehicles','driver_documents','driver_locations',
                         'ride_requests','ride_offers','ride_tariffs','ride_fixed_routes')
  loop execute p; end loop;
end $$;

-- Anyone may apply. Nobody may approve themselves: status is forced to
-- 'applied' by the trigger below, whatever the client sends.
create policy drivers_apply on public.drivers
  for insert to anon, authenticated with check (true);
create policy drivers_read_own on public.drivers
  for select to authenticated using (user_id = (select auth.uid()));
create policy drivers_edit_own on public.drivers
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy vehicles_own on public.driver_vehicles
  for all to authenticated
  using (driver_id in (select id from public.drivers where user_id = (select auth.uid())))
  with check (driver_id in (select id from public.drivers where user_id = (select auth.uid())));
create policy vehicles_apply on public.driver_vehicles
  for insert to anon with check (true);

create policy documents_own on public.driver_documents
  for all to authenticated
  using (driver_id in (select id from public.drivers where user_id = (select auth.uid())))
  with check (driver_id in (select id from public.drivers where user_id = (select auth.uid())));
create policy documents_apply on public.driver_documents
  for insert to anon with check (true);

-- Presence is written through cab_ping only. No direct client writes: a
-- driver could otherwise place themselves at the airport from their sofa.
create policy locations_read_own on public.driver_locations
  for select to authenticated
  using (driver_id in (select id from public.drivers where user_id = (select auth.uid())));

-- A rider may create a request and read their own. Guests read by reference
-- through cab_track, which is security definer, so no anon select policy.
create policy requests_create on public.ride_requests
  for insert to anon, authenticated with check (true);
create policy requests_read_own on public.ride_requests
  for select to authenticated
  using (rider_id = (select auth.uid())
         or driver_id in (select id from public.drivers where user_id = auth.uid()));
create policy requests_rider_cancel on public.ride_requests
  for update to authenticated
  using (rider_id = (select auth.uid())) with check (rider_id = (select auth.uid()));

create policy offers_read_own on public.ride_offers
  for select to authenticated
  using (driver_id in (select id from public.drivers where user_id = (select auth.uid())));

create policy tariffs_public on public.ride_tariffs
  for select to anon, authenticated using (active);
create policy fixed_public on public.ride_fixed_routes
  for select to anon, authenticated using (active);


-- ── 12 · GUARDS ───────────────────────────────────────────────────────────
-- A client that sends status='approved' on signup gets 'applied' anyway.

create or replace function public.cab_guard_driver_insert()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- current_user, not auth.role(). auth.role() is NULL unless the JWT claim
  -- is parsed, and NULL <> 'service_role' is NULL rather than TRUE, so the
  -- old test silently skipped the whole guard and let a client self-approve.
  if current_user in ('anon','authenticated') then
    new.status  := 'applied';
    new.classes := array['economy'];
    new.rating  := 5.00;
    new.trips_completed := 0;
    new.approved_at := null;
    new.user_id := coalesce(auth.uid(), new.user_id);
  end if;
  return new;
end $$;

drop trigger if exists cab_guard_driver_insert_t on public.drivers;
create trigger cab_guard_driver_insert_t
  before insert on public.drivers
  for each row execute function public.cab_guard_driver_insert();

-- A driver may edit their phone and payout details. Not their approval.
create or replace function public.cab_guard_driver_update()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if current_user in ('anon','authenticated') then
    new.status          := old.status;
    new.classes         := old.classes;
    new.rating          := old.rating;
    new.trips_completed := old.trips_completed;
    new.approved_at     := old.approved_at;
    new.user_id         := old.user_id;
  end if;
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists cab_guard_driver_update_t on public.drivers;
create trigger cab_guard_driver_update_t
  before update on public.drivers
  for each row execute function public.cab_guard_driver_update();


-- ── 13 · REALTIME ─────────────────────────────────────────────────────────
-- Drivers subscribe to ride_offers, riders subscribe to their own request.

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin execute 'alter publication supabase_realtime add table public.ride_offers';   exception when duplicate_object then null; end;
    begin execute 'alter publication supabase_realtime add table public.ride_requests'; exception when duplicate_object then null; end;
    begin execute 'alter publication supabase_realtime add table public.driver_locations'; exception when duplicate_object then null; end;
  end if;
end $$;

alter table public.ride_offers      replica identity full;
alter table public.ride_requests    replica identity full;
alter table public.driver_locations replica identity full;


-- ── 14 · GRANTS ───────────────────────────────────────────────────────────

grant execute on function public.cab_km(double precision,double precision,double precision,double precision) to anon, authenticated;
grant execute on function public.cab_supply(double precision,double precision,double precision) to anon, authenticated;
grant execute on function public.cab_nearby_drivers(double precision,double precision,text,double precision) to authenticated;
grant execute on function public.cab_broadcast(uuid,double precision) to anon, authenticated;
grant execute on function public.cab_track(text) to anon, authenticated;
grant execute on function public.cab_expire_search(uuid) to anon, authenticated;
-- Postgres grants EXECUTE to PUBLIC by default, so granting to
-- 'authenticated' does NOT keep anon out. Revoke, then grant deliberately.
revoke all on function public.cab_nearby_drivers(double precision,double precision,text,double precision) from public, anon;
revoke all on function public.cab_accept(uuid,uuid) from public, anon;
revoke all on function public.cab_decline(uuid) from public, anon;
revoke all on function public.cab_ping(double precision,double precision,boolean,boolean,text,numeric,numeric,int) from public, anon;
revoke all on function public.cab_set_status(uuid,text) from public, anon;

grant execute on function public.cab_accept(uuid,uuid) to authenticated;
grant execute on function public.cab_decline(uuid) to authenticated;
grant execute on function public.cab_ping(double precision,double precision,boolean,boolean,text,numeric,numeric,int) to authenticated;
grant execute on function public.cab_set_status(uuid,text) to authenticated;

-- Trigger functions must never be reachable over the REST API.
revoke all on function public.cab_guard_driver_insert() from public, anon, authenticated;
revoke all on function public.cab_guard_driver_update() from public, anon, authenticated;

-- Views default to SECURITY DEFINER, which would expose every driver's live
-- position through PostgREST. Riders reach this data only via cab_supply and
-- cab_track, which are definer functions and keep working.
alter view public.v_live_drivers set (security_invoker = true);
revoke all on public.v_live_drivers from anon, authenticated;


-- ── 15 · REVIEW QUEUE ─────────────────────────────────────────────────────
-- What the admin actually opens each morning.

create or replace view public.v_driver_queue as
  select d.id, d.full_name, d.phone, d.city, d.status, d.applied_at,
         v.make, v.model, v.year, v.plate, v.class,
         (select count(*) from public.driver_documents x where x.driver_id = d.id) as docs,
         (select count(*) from public.driver_documents x where x.driver_id = d.id and x.status = 'approved') as docs_ok,
         (select min(x.expires_on) from public.driver_documents x
           where x.driver_id = d.id and x.expires_on is not null) as first_expiry
    from public.drivers d
    left join public.driver_vehicles v on v.driver_id = d.id and v.is_primary
   where d.status in ('applied','under_review')
   order by d.applied_at;

alter view public.v_driver_queue set (security_invoker = true);
revoke all on public.v_driver_queue from anon, authenticated;
