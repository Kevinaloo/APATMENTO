-- ═══════════════════════════════════════════════════════════════════
--  CABANA · CAR HIRE  ·  schema v1
--  ───────────────────────────────────────────────────────────────────
--  Replaces the hardcoded CARS[] array in carhire.html with real,
--  operator-owned inventory. Four tables:
--
--    car_operators   who owns the fleet, and whether we verified them
--    car_fleet       individual vehicles with true engineering specs
--    car_blackouts   date ranges a vehicle is already committed
--    car_bookings    confirmed hires, with the full price breakdown
--
--  Design notes
--  ‑ Specs are stored as real measurements (clearance in mm, tank in L)
--    because the route-suitability engine grades on them. They are not
--    marketing copy and must not be rounded for looks.
--  ‑ Prices are stored in minor units (cents) to avoid float drift.
--  ‑ Availability is modelled as blackouts, not as a bookings join, so
--    an operator can block a vehicle for service without a fake booking.
-- ═══════════════════════════════════════════════════════════════════

create extension if not exists "pgcrypto";

-- ── OPERATORS ──────────────────────────────────────────────────────
create table if not exists public.car_operators (
  id                uuid primary key default gen_random_uuid(),
  owner_id          uuid references auth.users(id) on delete set null,
  name              text not null,
  slug              text unique not null,
  city              text not null,
  country_code      char(2) not null default 'KE',

  -- Verification. Never default these to true.
  verified          boolean not null default false,
  verified_at       timestamptz,
  kra_pin_seen      boolean not null default false,   -- tax registration sighted
  insurance_seen    boolean not null default false,   -- comprehensive cover sighted
  psv_licence_seen  boolean not null default false,   -- required for chauffeur hire

  -- Performance, computed by a nightly job from car_bookings.
  fleet_size        int     not null default 0,
  response_mins     int,                              -- median first reply
  on_time_pct       numeric(5,2),
  completed_hires   int     not null default 0,
  rating            numeric(3,2),

  phone             text,
  whatsapp          text,
  email             text,
  payout_method     text default 'mpesa',
  created_at        timestamptz not null default now()
);

-- ── FLEET ──────────────────────────────────────────────────────────
create table if not exists public.car_fleet (
  id                uuid primary key default gen_random_uuid(),
  operator_id       uuid not null references public.car_operators(id) on delete cascade,

  make              text not null,
  model             text not null,
  variant           text,
  year              int  not null,
  plate             text,                             -- never exposed to public API
  class             text not null,                    -- economy|compact|crossover|suv4x4|safari|luxury|van|pickup
  body              text not null,                    -- hatchback|sedan|wagon|suv|minivan|pickup

  -- Engineering specs. The route engine reads these directly.
  seats             int  not null,
  ground_clearance_mm int not null,
  drive             text not null,                    -- 2wd|awd|4wd|4wd_low
  transmission      text not null,                    -- manual|automatic
  fuel              text not null,                    -- petrol|diesel|hybrid|electric
  tank_litres       int,
  consumption_kmpl  numeric(4,1),
  aircon            boolean not null default true,

  -- Rates, minor units (KES cents).
  day_rate          int  not null,
  chauffeur_uplift_metro   int not null default 250000,   -- KES 2,500
  chauffeur_uplift_upcountry int not null default 500000, -- KES 5,000
  deposit           int  not null default 2000000,        -- KES 20,000
  peak_uplift       int  not null default 200000,         -- KES 2,000/day in season

  -- Policy, surfaced verbatim in the price ledger.
  fuel_policy       text not null default 'full_to_full',
  mileage_cap_km    int,                              -- null = unlimited
  min_hire_days     int  not null default 1,
  min_driver_age    int  not null default 23,
  min_licence_years int  not null default 2,
  cross_border_ok   boolean not null default false,

  extras            jsonb not null default '[]'::jsonb,
  photos            jsonb not null default '[]'::jsonb,
  status            text not null default 'active',   -- active|service|retired
  created_at        timestamptz not null default now()
);

create index if not exists car_fleet_lookup
  on public.car_fleet (status, class, day_rate);
create index if not exists car_fleet_operator
  on public.car_fleet (operator_id);

-- ── AVAILABILITY ───────────────────────────────────────────────────
create table if not exists public.car_blackouts (
  id          uuid primary key default gen_random_uuid(),
  vehicle_id  uuid not null references public.car_fleet(id) on delete cascade,
  starts_on   date not null,
  ends_on     date not null,
  reason      text not null default 'booked',         -- booked|service|owner_use
  constraint  blackout_order check (ends_on >= starts_on)
);

create index if not exists car_blackouts_window
  on public.car_blackouts (vehicle_id, starts_on, ends_on);

-- ── BOOKINGS ───────────────────────────────────────────────────────
create table if not exists public.car_bookings (
  id                uuid primary key default gen_random_uuid(),
  ref               text unique not null,
  vehicle_id        uuid references public.car_fleet(id) on delete set null,
  operator_id       uuid references public.car_operators(id) on delete set null,
  user_id           uuid references auth.users(id) on delete set null,

  starts_on         date not null,
  ends_on           date not null,
  days              int  not null,
  with_chauffeur    boolean not null default false,

  route_key         text,                             -- which route was graded
  route_verdict     text,                             -- cleared|caution|blocked
  pickup_mode       text not null default 'depot',    -- depot|delivery|airport
  pickup_detail     text,

  insurance_tier    text not null default 'basic',    -- basic|standard|zero_excess
  extras            jsonb not null default '[]'::jsonb,

  -- Full breakdown, stored so a quote can always be reconstructed
  -- exactly as the guest saw it. Minor units.
  price_breakdown   jsonb not null default '{}'::jsonb,
  total             int  not null,
  deposit_held      int  not null default 0,
  pay_at_counter    int  not null default 0,

  customer_name     text not null,
  phone             text not null,
  email             text,
  licence_country   text,
  notes             text,

  status            text not null default 'pending',  -- pending|confirmed|active|returned|cancelled
  created_at        timestamptz not null default now()
);

create index if not exists car_bookings_window
  on public.car_bookings (vehicle_id, starts_on, ends_on);

-- ── ROW LEVEL SECURITY ─────────────────────────────────────────────
alter table public.car_operators enable row level security;
alter table public.car_fleet     enable row level security;
alter table public.car_blackouts enable row level security;
alter table public.car_bookings  enable row level security;

-- Public may browse active inventory from verified operators only.
drop policy if exists car_fleet_public_read on public.car_fleet;
create policy car_fleet_public_read on public.car_fleet
  for select using (
    status = 'active'
    and exists (
      select 1 from public.car_operators o
      where o.id = car_fleet.operator_id and o.verified = true
    )
  );

drop policy if exists car_operators_public_read on public.car_operators;
create policy car_operators_public_read on public.car_operators
  for select using (verified = true);

drop policy if exists car_blackouts_public_read on public.car_blackouts;
create policy car_blackouts_public_read on public.car_blackouts
  for select using (true);

-- Operators manage their own fleet.
drop policy if exists car_fleet_owner_write on public.car_fleet;
create policy car_fleet_owner_write on public.car_fleet
  for all using (
    exists (
      select 1 from public.car_operators o
      where o.id = car_fleet.operator_id and o.owner_id = auth.uid()
    )
  );

-- Anyone may request a hire; only the requester and the operator read it.
drop policy if exists car_bookings_insert on public.car_bookings;
create policy car_bookings_insert on public.car_bookings
  for insert with check (true);

drop policy if exists car_bookings_read on public.car_bookings;
create policy car_bookings_read on public.car_bookings
  for select using (
    user_id = auth.uid()
    or exists (
      select 1 from public.car_operators o
      where o.id = car_bookings.operator_id and o.owner_id = auth.uid()
    )
  );

-- ── AVAILABILITY HELPER ────────────────────────────────────────────
-- Returns vehicle ids free across the whole requested window.
create or replace function public.cars_available(p_start date, p_end date)
returns table (vehicle_id uuid)
language sql stable as $$
  select f.id
  from public.car_fleet f
  where f.status = 'active'
    and not exists (
      select 1 from public.car_blackouts b
      where b.vehicle_id = f.id
        and b.starts_on <= p_end
        and b.ends_on   >= p_start
    );
$$;

-- Block the vehicle the moment a booking is confirmed, so the same car
-- cannot be sold twice while an operator is still replying.
create or replace function public.car_booking_blackout()
returns trigger language plpgsql as $$
begin
  if new.status in ('confirmed','active') then
    insert into public.car_blackouts (vehicle_id, starts_on, ends_on, reason)
    values (new.vehicle_id, new.starts_on, new.ends_on, 'booked')
    on conflict do nothing;
  end if;
  return new;
end $$;

drop trigger if exists car_booking_blackout_t on public.car_bookings;
create trigger car_booking_blackout_t
  after insert or update of status on public.car_bookings
  for each row execute function public.car_booking_blackout();
