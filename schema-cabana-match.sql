/* ════════════════════════════════════════════════════════════════════════════
   CABANA MATCH — Database Schema
   schema-cabana-match.sql
   ────────────────────────────────────────────────────────────────────────────
   The world's first reverse short-stay marketplace.
   Guests broadcast a request. Opted-in hosts in the area respond.
   Hosts chase guests — not the other way around.

   Tables:
     cabana_match_requests  — live guest requests (20-min TTL)
     cabana_match_responses — host responses (accepts) per request
     cabana_host_opt_ins    — hosts who have opted into Cabana Match

   Referral: any booking originating from a Cabana Match engagement
   records cabana_request_id on the apartment_bookings row (5% referral fee).
   ════════════════════════════════════════════════════════════════════════════ */

-- ─── cabana_host_opt_ins ────────────────────────────────────────────────────
-- Hosts opt in once. They stay opted in until they toggle off.
create table if not exists public.cabana_host_opt_ins (
  id            uuid        primary key default gen_random_uuid(),
  host_id       uuid        not null references auth.users(id) on delete cascade,
  opted_in      boolean     not null default true,
  opted_in_at   timestamptz not null default now(),
  opted_out_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique(host_id)
);

create index if not exists cabana_opt_host_idx on public.cabana_host_opt_ins (host_id) where opted_in = true;

-- ─── cabana_match_requests ──────────────────────────────────────────────────
-- One row per guest request. Expires after 20 minutes (enforced in app + DB).
create table if not exists public.cabana_match_requests (
  id              uuid        primary key default gen_random_uuid(),
  guest_id        uuid        not null references auth.users(id) on delete cascade,
  guest_name      text,

  -- Search criteria broadcast to hosts
  location        text        not null,
  location_lat    float,
  location_lng    float,
  checkin_date    date        not null,
  checkout_date   date        not null,
  nights          integer     not null generated always as (checkout_date - checkin_date) stored,
  guests          integer     not null default 1,
  bedrooms        integer,                -- null = any
  min_price       integer,                -- null = any, KES per night (budget floor)
  max_price       integer,                -- null = any, KES per night (budget ceiling)
  notes           text,                   -- optional guest message to host

  -- Lifecycle
  status          text        not null default 'live'
                              check (status in ('live','closed','booked','expired')),
  expires_at      timestamptz not null default (now() + interval '20 minutes'),
  closed_at       timestamptz,
  booked_at       timestamptz,

  -- If booked via Cabana, which booking and host got the referral
  booked_via_response_id uuid,
  referred_host_id        uuid references auth.users(id),
  referral_fee_pct        numeric(5,2) default 5.00,  -- 5% of booking value

  created_at      timestamptz not null default now()
);

create index if not exists cmr_guest_idx    on public.cabana_match_requests (guest_id, created_at desc);
create index if not exists cmr_status_idx   on public.cabana_match_requests (status, expires_at);
create index if not exists cmr_location_idx on public.cabana_match_requests (location);

-- ─── cabana_match_responses ─────────────────────────────────────────────────
-- One row per host response per request. A host can only respond once per request.
create table if not exists public.cabana_match_responses (
  id              uuid        primary key default gen_random_uuid(),
  request_id      uuid        not null references public.cabana_match_requests(id) on delete cascade,
  host_id         uuid        not null references auth.users(id) on delete cascade,

  -- Host's offer details
  listing_id      text        not null,   -- references listings table
  listing_title   text,
  listing_image   text,
  price_per_night integer     not null,   -- KES
  host_name       text,
  host_avatar     text,

  -- Status from guest side
  status          text        not null default 'pending'
                              check (status in ('pending','engaged','booked','declined')),
  -- Guest engages (not "accepts") — opens the conversation
  engaged_at      timestamptz,
  -- Conversation thread (links to chat_conversations)
  conversation_id uuid,       -- references chat_conversations(id) once created

  created_at      timestamptz not null default now(),
  unique(request_id, host_id)
);

create index if not exists cresponse_req_idx  on public.cabana_match_responses (request_id, created_at asc);
create index if not exists cresponse_host_idx on public.cabana_match_responses (host_id, created_at desc);

-- ─── Auto-expire requests ────────────────────────────────────────────────────
-- Run this as a Supabase Edge Function cron job or pg_cron:
-- UPDATE public.cabana_match_requests
--   SET status = 'expired', closed_at = now()
--   WHERE status = 'live' AND expires_at < now();

-- ─── RLS ─────────────────────────────────────────────────────────────────────
alter table public.cabana_host_opt_ins      enable row level security;
alter table public.cabana_match_requests    enable row level security;
alter table public.cabana_match_responses   enable row level security;

-- Opt-ins: host can read/write their own row
drop policy if exists "opt_select" on public.cabana_host_opt_ins;
create policy "opt_select" on public.cabana_host_opt_ins
  for select using (auth.uid() = host_id);

drop policy if exists "opt_insert" on public.cabana_host_opt_ins;
create policy "opt_insert" on public.cabana_host_opt_ins
  for insert with check (auth.uid() = host_id);

drop policy if exists "opt_update" on public.cabana_host_opt_ins;
create policy "opt_update" on public.cabana_host_opt_ins
  for update using (auth.uid() = host_id);

-- Requests: guest sees their own; opted-in hosts see live requests
drop policy if exists "req_select_guest" on public.cabana_match_requests;
create policy "req_select_guest" on public.cabana_match_requests
  for select using (auth.uid() = guest_id);

drop policy if exists "req_select_host" on public.cabana_match_requests;
create policy "req_select_host" on public.cabana_match_requests
  for select using (
    status = 'live'
    and exists (
      select 1 from public.cabana_host_opt_ins o
      where o.host_id = auth.uid() and o.opted_in = true
    )
  );

drop policy if exists "req_insert" on public.cabana_match_requests;
create policy "req_insert" on public.cabana_match_requests
  for insert with check (auth.uid() = guest_id);

drop policy if exists "req_update" on public.cabana_match_requests;
create policy "req_update" on public.cabana_match_requests
  for update using (auth.uid() = guest_id);

-- Responses: host sees their own; guest sees responses to their request
drop policy if exists "res_select_host" on public.cabana_match_responses;
create policy "res_select_host" on public.cabana_match_responses
  for select using (auth.uid() = host_id);

drop policy if exists "res_select_guest" on public.cabana_match_responses;
create policy "res_select_guest" on public.cabana_match_responses
  for select using (
    exists (
      select 1 from public.cabana_match_requests r
      where r.id = request_id and r.guest_id = auth.uid()
    )
  );

drop policy if exists "res_insert" on public.cabana_match_responses;
create policy "res_insert" on public.cabana_match_responses
  for insert with check (
    auth.uid() = host_id
    and exists (
      select 1 from public.cabana_host_opt_ins o
      where o.host_id = auth.uid() and o.opted_in = true
    )
  );

drop policy if exists "res_update" on public.cabana_match_responses;
create policy "res_update" on public.cabana_match_responses
  for update using (auth.uid() = host_id);

-- ─── Realtime ────────────────────────────────────────────────────────────────
-- Enable in Supabase Dashboard → Realtime → Tables
-- alter publication supabase_realtime add table public.cabana_match_requests;
-- alter publication supabase_realtime add table public.cabana_match_responses;
