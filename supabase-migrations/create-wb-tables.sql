-- ══════════════════════════════════════════════════════════════
--  WILDBOSSES TABLES — run once in Supabase SQL Editor
--  Dashboard → SQL Editor → New query → paste → Run
-- ══════════════════════════════════════════════════════════════

-- ── 1. wb_tours: every tour Kevin posts on list-tour.html ────
create table if not exists wb_tours (
  id                text primary key,
  slug              text unique,
  name              text not null,
  subtitle          text,
  category          text default 'safari',
  destination       text,
  country           text default 'Kenya',
  duration          text,
  group_max         int  default 999,
  group_min         int  default 1,
  price_kes         int  default 0,
  deposit_kes       int  default 0,
  deposit_pct       int  default 30,
  spots_total       int  default 999,
  spots_left        int  default 999,
  rating            numeric(3,2) default 0,
  reviews           int  default 0,
  departure_date    date,
  return_date       date,
  booking_deadline  timestamptz,
  status            text default 'open',    -- open | full | closed | cancelled
  urgency           text default 'normal',  -- critical | high | normal
  featured          boolean default true,
  photos            jsonb default '[]',     -- array of URLs (or base64 on first post)
  image             text,                   -- first photo, convenience field
  tags              jsonb default '[]',
  guide             text,
  guide_email       text,
  guide_phone       text,
  guide_bio         text,
  guide_experience  text,
  guide_rating      numeric(3,2) default 0,
  description       text,
  meeting_point     text,
  notes             text,
  includes_list     jsonb default '[]',
  excludes_list     jsonb default '[]',
  itinerary         jsonb default '[]',
  is_active         boolean default true,
  source            text default 'wildbosses-list-tour',
  created_at        timestamptz default now(),
  updated_at        timestamptz default now()
);

-- auto-update updated_at
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists wb_tours_updated_at on wb_tours;
create trigger wb_tours_updated_at
  before update on wb_tours
  for each row execute procedure update_updated_at();

-- ── 2. wb_bookings: every booking made via Cabana ────────────
create table if not exists wb_bookings (
  id                uuid primary key default gen_random_uuid(),
  booking_ref       text unique not null,
  tour_id           text references wb_tours(id),
  tour_name         text,
  guest_name        text,
  guest_phone       text,
  guest_email       text,
  guests            int default 1,
  travel_date       text,
  payment_reference text,
  payment_type      text default 'deposit',  -- deposit | full
  context           text default 'cabana',   -- cabana | direct
  partner_label     text default 'Cabana',
  cabana_user_id    text,
  pricing_json      jsonb,
  notes             text,
  status            text default 'confirmed',
  wildbosses_payout int  default 0,
  cabana_revenue    int  default 0,
  payout_status     text default 'pending',  -- pending | paid | reconciled
  created_at        timestamptz default now()
);

-- ── 3. Row Level Security (public read, anon insert) ─────────
alter table wb_tours    enable row level security;
alter table wb_bookings enable row level security;

-- Anyone can read active tours
create policy "Public can read active tours"
  on wb_tours for select
  using (is_active = true);

-- Anon key can insert new tours (from list-tour.html)
create policy "Anon can insert tours"
  on wb_tours for insert
  with check (true);

-- Anon key can insert bookings (from Cabana checkout)
create policy "Anon can insert bookings"
  on wb_bookings for insert
  with check (true);

-- Anon key can read their own booking by ref (for confirmation screen)
create policy "Public can read bookings by ref"
  on wb_bookings for select
  using (true);

-- Done
select 'wb_tours and wb_bookings created ✓' as result;
