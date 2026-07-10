-- ═══════════════════════════════════════════════════════════════════
-- APATMENTO · TRUST & MATCH SCHEMA  v1
-- ───────────────────────────────────────────────────────────────────
-- Additive only. Safe to re-run.
--
-- Covers:
--   1. Split payments  (deposit now, balance before check-in)
--   2. Match Guest     (host re-homes a guest, earns 30% of our fee)
--   3. Check-in issues (live-photo evidence, smart triage)
--   4. Cancellation    (24h rule, half-night penalty, auto refunds)
--   5. Discipline      (yellow cards → red card → review)
--   6. Private reviews (two-way, never public, feeds ranking)
--   7. Rescue rides    (platform float covers redirect transport)
-- ═══════════════════════════════════════════════════════════════════

-- ── 0 · Shared helpers ─────────────────────────────────────────────
create or replace function public.is_operator()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(auth.jwt() ->> 'email' in ('apatmento@gmail.com','worlddossy@gmail.com'), false);
$$;

-- Hours until a booking's check-in. Negative = check-in has passed.
create or replace function public.hours_to_checkin(p_booking uuid)
returns numeric language sql stable security definer set search_path = public as $$
  select extract(epoch from (b.checkin_date::timestamptz - now())) / 3600.0
  from public.apartment_bookings b where b.id = p_booking;
$$;


-- ═══ 1 · SPLIT PAYMENTS ════════════════════════════════════════════
-- A guest may secure a stay with a deposit and settle the balance
-- before check-in. The host acceptance code is inert until paid in full.

alter table public.apartment_bookings add column if not exists payment_mode      text    default 'full';   -- 'full' | 'deposit'
alter table public.apartment_bookings add column if not exists deposit_amount    numeric default 0;
alter table public.apartment_bookings add column if not exists balance_amount    numeric default 0;
alter table public.apartment_bookings add column if not exists balance_paid      boolean default true;
alter table public.apartment_bookings add column if not exists balance_reference text;
alter table public.apartment_bookings add column if not exists balance_paid_at   timestamptz;
alter table public.apartment_bookings add column if not exists host_id           uuid;
alter table public.apartment_bookings add column if not exists checked_in_at     timestamptz;
alter table public.apartment_bookings add column if not exists cancelled_at      timestamptz;
alter table public.apartment_bookings add column if not exists cancel_reason     text;
alter table public.apartment_bookings add column if not exists refund_amount     numeric default 0;
alter table public.apartment_bookings add column if not exists host_penalty      numeric default 0;
alter table public.apartment_bookings add column if not exists rehomed_from      uuid;   -- prior booking this replaced
alter table public.apartment_bookings add column if not exists rehomed_to        uuid;   -- replacement booking

create index if not exists idx_apt_book_host    on public.apartment_bookings (host_id);
create index if not exists idx_apt_book_checkin on public.apartment_bookings (checkin_date);
create index if not exists idx_apt_book_status  on public.apartment_bookings (status);

-- Server-side truth: a booking is check-in-eligible only when settled.
create or replace function public.checkin_eligible(p_booking uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(b.balance_paid, true)
     and b.status in ('paid_pending_checkin','deposit_paid')
     and b.cancelled_at is null
  from public.apartment_bookings b where b.id = p_booking;
$$;


-- ═══ 2 · MATCH GUEST ═══════════════════════════════════════════════
-- Host cannot honour a booking → we find a comparable listing.
-- If the guest accepts, the original host keeps 30% of our service fee.

create table if not exists public.match_offers (
  id                 uuid primary key default gen_random_uuid(),
  booking_id         uuid not null references public.apartment_bookings(id) on delete cascade,
  origin_host_id     uuid,
  origin_listing_id  text,
  guest_id           uuid,
  candidates         jsonb not null default '[]'::jsonb,  -- ranked [{listing_id,score,delta_price,...}]
  chosen_listing_id  text,
  replacement_booking_id uuid,
  status             text not null default 'offered',     -- offered|accepted|declined|expired|blocked
  block_reason       text,                                -- e.g. 'within_24h'
  hours_to_checkin   numeric,
  price_delta        numeric default 0,                   -- who owes what after swap
  service_fee        numeric default 0,
  host_commission    numeric default 0,                   -- 30% of service_fee
  commission_paid    boolean default false,
  expires_at         timestamptz default now() + interval '6 hours',
  created_at         timestamptz not null default now(),
  resolved_at        timestamptz
);

create index if not exists idx_match_booking on public.match_offers (booking_id);
create index if not exists idx_match_guest   on public.match_offers (guest_id, status);
create index if not exists idx_match_host    on public.match_offers (origin_host_id, status);

alter table public.match_offers enable row level security;

drop policy if exists match_read on public.match_offers;
create policy match_read on public.match_offers for select to authenticated
  using (guest_id = auth.uid() or origin_host_id = auth.uid() or public.is_operator());

drop policy if exists match_write on public.match_offers;
create policy match_write on public.match_offers for insert to authenticated
  with check (origin_host_id = auth.uid() or public.is_operator());

drop policy if exists match_update on public.match_offers;
create policy match_update on public.match_offers for update to authenticated
  using (guest_id = auth.uid() or origin_host_id = auth.uid() or public.is_operator());

-- Hard gate. A host inside the 24-hour window forfeits the Match tool.
create or replace function public.match_allowed(p_booking uuid)
returns table (allowed boolean, reason text, hours numeric)
language plpgsql stable security definer set search_path = public as $$
declare h numeric;
begin
  select public.hours_to_checkin(p_booking) into h;
  if h is null then
    return query select false, 'booking_not_found', null::numeric;
  elsif h < 24 then
    return query select false, 'within_24h', h;
  else
    return query select true, 'ok', h;
  end if;
end; $$;


-- ═══ 3 · CHECK-IN ISSUES ═══════════════════════════════════════════
-- Guest arrives, something is wrong. Live photo required. We triage.

create table if not exists public.issue_taxonomy (
  code         text primary key,
  label        text not null,
  category     text not null,          -- property | safety | access | fraud | guest
  fault        text not null,          -- host | guest | platform | unclear
  severity     int  not null default 2,-- 1 minor … 5 critical
  auto_redirect boolean default false, -- immediately re-home the guest
  requires_photo boolean default true,
  keywords     text[] default '{}'
);

insert into public.issue_taxonomy (code,label,category,fault,severity,auto_redirect,requires_photo,keywords) values
  ('not_as_listed',    'Not what you booked',              'property','host',4,true, true,  '{different,not as described,photos,misleading,smaller,wrong room}'),
  ('hygiene',          'Hygiene / cleanliness',            'property','host',4,true, true,  '{dirty,filthy,smell,mould,mold,bedbugs,roaches,stained,unclean}'),
  ('no_access',        'Cannot get in / host unreachable', 'access', 'host',5,true, false, '{locked,no key,no answer,unreachable,nobody,no one here}'),
  ('wrong_address',    'Wrong or non-existent address',    'fraud',  'host',5,true, false, '{does not exist,wrong place,no such,empty lot,fake address}'),
  ('fake_listing',     'Listing appears fake',             'fraud',  'host',5,true, true,  '{fake,scam,fraud,not real,does not exist}'),
  ('occupied',         'Property already occupied',        'access', 'host',5,true, true,  '{someone inside,occupied,double booked,another guest}'),
  ('unsafe',           'Safety concern',                   'safety', 'host',5,true, true,  '{unsafe,dangerous,no lock,broken door,gas,exposed wiring}'),
  ('utilities',        'No power / water / internet',      'property','host',3,false,true, '{no power,no water,blackout,no wifi,no internet,no electricity}'),
  ('amenity_missing',  'Promised amenity missing',         'property','host',2,false,true, '{no ac,no kitchen,no parking,missing,not provided}'),
  ('noise',            'Noise or disturbance',             'property','host',2,false,false,'{noise,loud,construction,music}'),
  ('changed_plans',    'My plans changed',                 'guest',  'guest',1,false,false,'{changed my mind,plans changed,cannot make it}'),
  ('arrived_late',     'I arrived outside check-in hours', 'guest',  'guest',1,false,false,'{late,missed,flight delayed}'),
  ('other',            'Something else',                   'property','unclear',3,false,true,'{}')
on conflict (code) do nothing;

alter table public.issue_taxonomy enable row level security;
drop policy if exists taxonomy_read on public.issue_taxonomy;
create policy taxonomy_read on public.issue_taxonomy for select to public using (true);


create table if not exists public.checkin_issues (
  id               uuid primary key default gen_random_uuid(),
  booking_id       uuid not null references public.apartment_bookings(id) on delete cascade,
  guest_id         uuid,
  host_id          uuid,
  listing_id       text,
  issue_code       text references public.issue_taxonomy(code),
  free_text        text,                     -- guest's own words
  inferred_codes   jsonb default '[]'::jsonb,-- what the classifier suggested
  confidence       numeric default 0,
  photo_url        text,                     -- live capture, storage path
  photo_live       boolean default false,    -- captured in-app, not uploaded
  photo_taken_at   timestamptz,
  geo_lat          numeric,
  geo_lng          numeric,
  geo_distance_m   numeric,                  -- distance from listing coords
  window_phase     text,                     -- 'pre_24h' | 'within_24h' | 'at_checkin' | 'post_checkin'
  hours_to_checkin numeric,
  fault            text,                     -- resolved: host|guest|platform|unclear
  resolution       text,                     -- full_refund|half_night_to_host|redirect|rejected|pending
  refund_amount    numeric default 0,
  host_payout      numeric default 0,
  redirect_booking_id uuid,
  rescue_ride_id   uuid,
  status           text default 'open',      -- open|resolved|disputed|escalated
  created_at       timestamptz not null default now(),
  resolved_at      timestamptz
);

create index if not exists idx_issue_booking on public.checkin_issues (booking_id);
create index if not exists idx_issue_host    on public.checkin_issues (host_id, created_at desc);
create index if not exists idx_issue_status  on public.checkin_issues (status);

alter table public.checkin_issues enable row level security;

drop policy if exists issue_insert on public.checkin_issues;
create policy issue_insert on public.checkin_issues for insert to authenticated
  with check (guest_id = auth.uid());

drop policy if exists issue_read on public.checkin_issues;
create policy issue_read on public.checkin_issues for select to authenticated
  using (guest_id = auth.uid() or host_id = auth.uid() or public.is_operator());

drop policy if exists issue_update on public.checkin_issues;
create policy issue_update on public.checkin_issues for update to authenticated
  using (public.is_operator());


-- ═══ 4 · CANCELLATION ENGINE ═══════════════════════════════════════
-- Platform policy for stays:
--   ≥24h before check-in  → guest full refund, no penalty
--   <24h, guest at fault  → host receives half of one night; guest refunded rest
--   <24h, host at fault   → guest full refund + immediate redirect; host penalised
--
-- Pure function. Callers decide whether to act on it.
create or replace function public.compute_settlement(
  p_booking uuid, p_fault text, p_hours numeric default null
) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  b        public.apartment_bookings%rowtype;
  h        numeric;
  nightly  numeric;
  paid     numeric;
  refund   numeric;
  penalty  numeric;
  hostcut  numeric := 0;
begin
  select * into b from public.apartment_bookings where id = p_booking;
  if not found then return jsonb_build_object('error','booking_not_found'); end if;

  h       := coalesce(p_hours, public.hours_to_checkin(p_booking));
  nightly := coalesce(b.stay_total,0) / greatest(coalesce(b.nights,1),1);
  paid    := coalesce(b.deposit_amount,0) + case when coalesce(b.balance_paid,true)
               then coalesce(b.grand_total,0) - coalesce(b.deposit_amount,0) else 0 end;
  if b.payment_mode = 'full' then paid := coalesce(b.grand_total,0); end if;

  if h >= 24 then
    refund := paid; penalty := 0;

  elsif p_fault = 'guest' then
    hostcut := round(nightly / 2.0, 2);
    refund  := greatest(paid - hostcut, 0);
    penalty := 0;

  elsif p_fault = 'host' then
    refund  := paid;
    penalty := round(nightly / 2.0, 2);   -- charged back against host earnings
    hostcut := 0;

  else -- unclear → hold for operator, refund provisionally in full
    refund := paid; penalty := 0;
  end if;

  return jsonb_build_object(
    'hours_to_checkin', round(h,2),
    'window',           case when h >= 24 then 'pre_24h' when h >= 0 then 'within_24h' else 'post_checkin' end,
    'fault',            p_fault,
    'paid',             paid,
    'nightly_rate',     round(nightly,2),
    'refund_amount',    refund,
    'host_payout',      hostcut,
    'host_penalty',     penalty,
    'auto_redirect',    (p_fault = 'host' and h < 24),
    'match_allowed',    (h >= 24)
  );
end; $$;


-- ═══ 5 · HOST DISCIPLINE — cards ═══════════════════════════════════
-- 3 yellow = 1 red. Red means listings hidden, account under review.

create table if not exists public.host_cards (
  id          uuid primary key default gen_random_uuid(),
  host_id     uuid not null,
  card        text not null check (card in ('yellow','red')),
  reason      text not null,
  booking_id  uuid,
  issue_id    uuid,
  listing_id  text,
  issued_by   text default 'system',
  expires_at  timestamptz,             -- yellows may age out (12 months)
  voided      boolean default false,
  void_reason text,
  created_at  timestamptz not null default now()
);

create index if not exists idx_cards_host on public.host_cards (host_id, card, voided);

alter table public.host_cards enable row level security;
drop policy if exists cards_read on public.host_cards;
create policy cards_read on public.host_cards for select to authenticated
  using (host_id = auth.uid() or public.is_operator());
drop policy if exists cards_write on public.host_cards;
create policy cards_write on public.host_cards for all to authenticated
  using (public.is_operator()) with check (public.is_operator());

create or replace function public.active_yellow_count(p_host uuid)
returns int language sql stable security definer set search_path = public as $$
  select count(*)::int from public.host_cards
   where host_id = p_host and card='yellow' and not voided
     and (expires_at is null or expires_at > now());
$$;

-- Issue a yellow; auto-escalate to red at the third.
create or replace function public.issue_yellow_card(
  p_host uuid, p_reason text, p_booking uuid default null, p_issue uuid default null, p_listing text default null
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  insert into public.host_cards (host_id, card, reason, booking_id, issue_id, listing_id, expires_at)
  values (p_host, 'yellow', p_reason, p_booking, p_issue, p_listing, now() + interval '12 months');

  n := public.active_yellow_count(p_host);

  if n >= 3 then
    insert into public.host_cards (host_id, card, reason, booking_id, issue_id)
    values (p_host, 'red', 'Three yellow cards — account under review', p_booking, p_issue);

    update public.profiles
       set host_status = 'under_review', host_suspended_at = now()
     where id = p_host;

    update public.listings set status = 'under_review' where host_id = p_host and status = 'active';

    return jsonb_build_object('card','red','yellow_count',n,'suspended',true);
  end if;

  return jsonb_build_object('card','yellow','yellow_count',n,'suspended',false);
end; $$;

alter table public.profiles add column if not exists host_status       text default 'active';
alter table public.profiles add column if not exists host_suspended_at timestamptz;
alter table public.profiles add column if not exists trust_score       numeric default 70;


-- ═══ 6 · PRIVATE TWO-WAY REVIEWS ═══════════════════════════════════
-- Never public. Visible to the counterparty and to us. Feeds ranking.

create table if not exists public.private_reviews (
  id             uuid primary key default gen_random_uuid(),
  booking_id     uuid not null references public.apartment_bookings(id) on delete cascade,
  listing_id     text,
  author_id      uuid not null,
  subject_id     uuid not null,
  direction      text not null check (direction in ('guest_to_host','host_to_guest')),
  rating         int  not null check (rating between 1 and 5),
  cleanliness    int check (cleanliness between 1 and 5),
  accuracy       int check (accuracy between 1 and 5),
  communication  int check (communication between 1 and 5),
  value_rating   int check (value_rating between 1 and 5),
  body           text,
  sentiment      numeric,          -- -1..1, filled by classifier
  visible_at     timestamptz,      -- both sides submitted, or 14d elapsed
  created_at     timestamptz not null default now(),
  unique (booking_id, direction)
);

create index if not exists idx_prev_listing on public.private_reviews (listing_id);
create index if not exists idx_prev_subject on public.private_reviews (subject_id);

alter table public.private_reviews enable row level security;

drop policy if exists prev_insert on public.private_reviews;
create policy prev_insert on public.private_reviews for insert to authenticated
  with check (author_id = auth.uid());

-- The privacy guarantee: nobody but the two parties and us.
drop policy if exists prev_read on public.private_reviews;
create policy prev_read on public.private_reviews for select to authenticated
  using (
    public.is_operator()
    or author_id = auth.uid()
    or (subject_id = auth.uid() and visible_at is not null and visible_at <= now())
  );

-- Simultaneous reveal: unlock both once both have written.
create or replace function public.try_reveal_reviews(p_booking uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.private_reviews where booking_id = p_booking) = 2 then
    update public.private_reviews set visible_at = now()
     where booking_id = p_booking and visible_at is null;
  end if;
end; $$;

create or replace function public.reveal_stale_reviews()
returns int language sql security definer set search_path = public as $$
  with u as (
    update public.private_reviews set visible_at = now()
     where visible_at is null and created_at < now() - interval '14 days'
    returning 1
  ) select count(*)::int from u;
$$;


-- ── Ranking signal ─────────────────────────────────────────────────
-- Private reviews never surface, but they move a listing up or down.
alter table public.listings add column if not exists internal_score numeric default 50;
alter table public.listings add column if not exists host_id        uuid;
alter table public.listings add column if not exists lat            numeric;
alter table public.listings add column if not exists lng            numeric;
alter table public.listings add column if not exists size_sqm       numeric;

create or replace function public.recompute_internal_score(p_listing text)
returns numeric
language plpgsql security definer set search_path = public as $$
declare
  avg_r      numeric;
  n_r        int;
  n_issue    int;
  n_serious  int;
  n_yellow   int;
  n_book     int;
  bayes      numeric;
  score      numeric;
  h          uuid;
begin
  select host_id into h from public.listings where id = p_listing;

  select coalesce(avg(rating),0), count(*) into avg_r, n_r
    from public.private_reviews
   where listing_id = p_listing and direction = 'guest_to_host';

  select count(*) filter (where true),
         count(*) filter (where fault = 'host' and coalesce((select severity from public.issue_taxonomy t where t.code = i.issue_code),0) >= 4)
    into n_issue, n_serious
    from public.checkin_issues i where i.listing_id = p_listing;

  select public.active_yellow_count(h) into n_yellow;
  select count(*) into n_book from public.apartment_bookings where apartment_id = p_listing;

  -- Bayesian shrink toward the platform mean (3.9) until a listing earns its rating.
  bayes := ((avg_r * n_r) + (3.9 * 6)) / (n_r + 6);

  score := 50
         + (bayes - 3.9) * 14            -- ratings dominate
         + least(n_book, 40) * 0.35      -- proven demand, capped
         - n_issue   * 4
         - n_serious * 9
         - n_yellow  * 12;

  score := greatest(0, least(100, round(score, 2)));
  update public.listings set internal_score = score where id = p_listing;
  return score;
end; $$;

create or replace function public.trg_review_score() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform public.try_reveal_reviews(new.booking_id);
  if new.listing_id is not null then perform public.recompute_internal_score(new.listing_id); end if;
  return new;
end; $$;

drop trigger if exists on_private_review on public.private_reviews;
create trigger on_private_review after insert on public.private_reviews
  for each row execute function public.trg_review_score();


-- ═══ 7 · RESCUE RIDES & PLATFORM FLOAT ═════════════════════════════
-- A misled guest is moved at our cost, not theirs.

create table if not exists public.platform_float (
  id          bigserial primary key,
  direction   text not null check (direction in ('credit','debit')),
  amount      numeric not null check (amount > 0),
  purpose     text not null,           -- rescue_ride | refund | commission | topup
  ref_type    text,
  ref_id      text,
  balance_after numeric,
  created_at  timestamptz not null default now()
);

alter table public.platform_float enable row level security;
drop policy if exists float_ops on public.platform_float;
create policy float_ops on public.platform_float for all to authenticated
  using (public.is_operator()) with check (public.is_operator());

create or replace function public.float_balance()
returns numeric language sql stable security definer set search_path = public as $$
  select coalesce(sum(case when direction='credit' then amount else -amount end),0)
  from public.platform_float;
$$;


create table if not exists public.rescue_rides (
  id              uuid primary key default gen_random_uuid(),
  issue_id        uuid references public.checkin_issues(id) on delete set null,
  booking_id      uuid,
  guest_id        uuid,
  from_label      text,
  from_lat        numeric, from_lng numeric,
  to_label        text,
  to_lat          numeric, to_lng   numeric,
  distance_km     numeric,
  estimated_fare  numeric,
  actual_fare     numeric,
  covered_by      text default 'platform_float',
  charged_to_host boolean default false,
  ride_reference  text,
  status          text default 'requested',  -- requested|assigned|completed|failed
  created_at      timestamptz not null default now(),
  completed_at    timestamptz
);

create index if not exists idx_rescue_guest on public.rescue_rides (guest_id);

alter table public.rescue_rides enable row level security;
drop policy if exists rescue_read on public.rescue_rides;
create policy rescue_read on public.rescue_rides for select to authenticated
  using (guest_id = auth.uid() or public.is_operator());
drop policy if exists rescue_write on public.rescue_rides;
create policy rescue_write on public.rescue_rides for all to authenticated
  using (public.is_operator()) with check (public.is_operator());

-- Book a rescue ride, debit the float atomically. Falls back if float is dry.
create or replace function public.dispatch_rescue_ride(
  p_issue uuid, p_booking uuid, p_guest uuid,
  p_from text, p_from_lat numeric, p_from_lng numeric,
  p_to   text, p_to_lat   numeric, p_to_lng   numeric,
  p_distance_km numeric, p_fare numeric, p_charge_host boolean default true
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  bal numeric;
  rid uuid;
begin
  select public.float_balance() into bal;

  insert into public.rescue_rides (issue_id,booking_id,guest_id,from_label,from_lat,from_lng,
                                   to_label,to_lat,to_lng,distance_km,estimated_fare,
                                   charged_to_host,status,ride_reference)
  values (p_issue,p_booking,p_guest,p_from,p_from_lat,p_from_lng,
          p_to,p_to_lat,p_to_lng,p_distance_km,p_fare,
          p_charge_host, case when bal >= p_fare then 'assigned' else 'requested' end,
          'RESCUE-' || substr(replace(gen_random_uuid()::text,'-',''),1,10))
  returning id into rid;

  if bal >= p_fare then
    insert into public.platform_float (direction,amount,purpose,ref_type,ref_id,balance_after)
    values ('debit', p_fare, 'rescue_ride', 'rescue_ride', rid::text, bal - p_fare);
  end if;

  if p_issue is not null then
    update public.checkin_issues set rescue_ride_id = rid where id = p_issue;
  end if;

  return jsonb_build_object(
    'ride_id', rid,
    'covered', bal >= p_fare,
    'float_before', bal,
    'fare', p_fare,
    'status', case when bal >= p_fare then 'assigned' else 'awaiting_float' end
  );
end; $$;


-- ═══ 8 · MATCH CANDIDATE SEARCH (server side) ══════════════════════
-- The ranking that Match Guest surfaces. Scored, not merely filtered.
create or replace function public.find_match_candidates(
  p_booking uuid, p_limit int default 6
) returns table (
  listing_id text, title text, location text, price_night numeric,
  beds int, max_guests int, property_type text, photos jsonb,
  internal_score numeric, distance_km numeric, price_delta numeric, score numeric
)
language plpgsql stable security definer set search_path = public as $$
declare b public.apartment_bookings%rowtype; src public.listings%rowtype;
begin
  select * into b from public.apartment_bookings where id = p_booking;
  select * into src from public.listings where id = b.apartment_id;

  return query
  select l.id, l.title, l.location, l.price_night, l.beds, l.max_guests,
         l.property_type, coalesce(l.photos,'[]'::jsonb), l.internal_score,
         case when src.lat is null or l.lat is null then null
              else round((6371 * acos(least(1, greatest(-1,
                     cos(radians(src.lat))*cos(radians(l.lat))*cos(radians(l.lng)-radians(src.lng))
                   + sin(radians(src.lat))*sin(radians(l.lat)))))) ::numeric, 2) end as distance_km,
         round(l.price_night - src.price_night, 2) as price_delta,
         round((
             -- price proximity (35)
             35 * greatest(0, 1 - abs(l.price_night - src.price_night) / nullif(src.price_night,0))
             -- location (25): same city, then distance decay
           + 25 * (case when l.city is not distinct from src.city then 1 else 0.35 end)
             -- capacity fit (15): must fit the party, prefer close match
           + 15 * (case when l.max_guests >= b.num_guests
                        then greatest(0, 1 - (l.max_guests - b.num_guests)::numeric / 6) else 0 end)
             -- same type (13)
           + 13 * (case when l.property_type is not distinct from src.property_type then 1 else 0 end)
             -- size / beds (7)
           + 7  * (case when src.beds is null or l.beds is null then 0.5
                        else greatest(0, 1 - abs(l.beds - src.beds)::numeric / 4) end)
             -- quality (5)
           + 5  * (coalesce(l.internal_score,50) / 100)
         )::numeric, 2) as score
    from public.listings l
   where l.id <> b.apartment_id
     and l.status = 'active'
     and l.max_guests >= b.num_guests
     and l.price_night between src.price_night * 0.75 and src.price_night * 1.25
     and not exists (
       select 1 from public.apartment_bookings ob
        where ob.apartment_id = l.id
          and ob.cancelled_at is null
          and ob.status in ('paid_pending_checkin','deposit_paid','checked_in')
          and daterange(ob.checkin_date, ob.checkout_date, '[)')
              && daterange(b.checkin_date, b.checkout_date, '[)')
     )
     and coalesce((select p.host_status from public.profiles p where p.id = l.host_id),'active') = 'active'
   order by score desc, coalesce(l.internal_score,50) desc
   limit p_limit;
end; $$;


-- ═══ 9 · NOTIFICATIONS hook ════════════════════════════════════════
alter table public.notifications add column if not exists kind text;
alter table public.notifications add column if not exists meta jsonb default '{}'::jsonb;

-- ═══════════════════════════════════════════════════════════════════
-- End. Every function above is security definer and search_path-pinned.
-- ═══════════════════════════════════════════════════════════════════
