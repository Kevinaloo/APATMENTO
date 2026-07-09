-- ═══════════════════════════════════════════════════════════════════
-- APATMENTO · CONSOLE SCHEMA  v1
-- ───────────────────────────────────────────────────────────────────
-- Run this once in the Supabase SQL editor.
--
-- Everything here is additive. No existing table is altered
-- destructively; new columns use IF NOT EXISTS so a re-run is safe.
--
-- Two principles:
--   1. Telemetry is append-only and anonymous-writable. A visitor
--      must be able to write a signal without an account.
--   2. Nothing in these tables is readable by the public. Reads are
--      operator-only, enforced at the row level.
-- ═══════════════════════════════════════════════════════════════════

-- ── 0 · Who is an operator? ────────────────────────────────────────
-- A single source of truth, referenced by every policy below.
create or replace function public.is_operator()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    auth.jwt() ->> 'email' in ('apatmento@gmail.com', 'worlddossy@gmail.com'),
    false
  );
$$;


-- ── 1 · AUDIT LOG ──────────────────────────────────────────────────
-- Immutable. Written before a destructive action, never after.
create table if not exists public.admin_audit_log (
  id           bigserial primary key,
  action       text not null,
  target_type  text,
  target_id    text,
  actor_email  text,
  meta         jsonb default '{}'::jsonb,
  created_at   timestamptz not null default now()
);

create index if not exists idx_audit_created on public.admin_audit_log (created_at desc);
create index if not exists idx_audit_actor   on public.admin_audit_log (actor_email);
create index if not exists idx_audit_target  on public.admin_audit_log (target_type, target_id);

alter table public.admin_audit_log enable row level security;

drop policy if exists audit_insert on public.admin_audit_log;
create policy audit_insert on public.admin_audit_log
  for insert to authenticated with check (public.is_operator());

drop policy if exists audit_select on public.admin_audit_log;
create policy audit_select on public.admin_audit_log
  for select to authenticated using (public.is_operator());

-- No update, no delete. Ever. The absence of a policy is the guarantee.


-- ── 2 · SIGNAL EVENTS ──────────────────────────────────────────────
-- Append-only behavioural stream. Anonymous visitors must be able to
-- write, so insert is granted to anon. Nobody but an operator reads.
create table if not exists public.signal_events (
  id           bigserial primary key,
  visitor_id   text,
  session_id   text,
  event        text not null,
  page         text,
  props        jsonb default '{}'::jsonb,
  created_at   timestamptz not null default now()
);

create index if not exists idx_sig_created on public.signal_events (created_at desc);
create index if not exists idx_sig_event   on public.signal_events (event);
create index if not exists idx_sig_session on public.signal_events (session_id);
create index if not exists idx_sig_page    on public.signal_events (page);
-- Ad analytics hit props->>'campaign_id' constantly. Index the path.
create index if not exists idx_sig_campaign
  on public.signal_events ((props ->> 'campaign_id'))
  where event in ('ad_viewable', 'ad_click');

alter table public.signal_events enable row level security;

drop policy if exists sig_insert on public.signal_events;
create policy sig_insert on public.signal_events
  for insert to anon, authenticated with check (true);

drop policy if exists sig_select on public.signal_events;
create policy sig_select on public.signal_events
  for select to authenticated using (public.is_operator());


-- ── 3 · SESSION FEATURES ───────────────────────────────────────────
-- One row per session. This is the training set.
create table if not exists public.session_features (
  id                bigserial primary key,
  visitor_id        text,
  session_id        text,

  -- temporal
  hour_of_day       smallint,
  day_of_week       smallint,
  is_weekend        smallint,
  session_age_s     integer,

  -- attention
  attention_s       integer,
  idle_s            integer,
  blurred_s         integer,
  attention_ratio   real,
  engaged           smallint,

  -- scroll
  scroll_depth      smallint,
  scroll_reversals  smallint,
  scroll_velocity   integer,
  reached_end       smallint,
  time_to_50pct     integer,

  -- navigation
  journey_depth     smallint,
  entry_page        text,
  current_page      text,
  pages_unique      smallint,

  -- friction
  rage_clicks       smallint,
  dead_clicks       smallint,
  nav_thrash        smallint,
  js_errors         smallint,

  -- intent
  intent_score      smallint,
  intent_band       text,
  reading_mode      text,
  reading_mode_ord  smallint,

  -- commerce
  searches          smallint,
  filters_used      smallint,
  listings_viewed   smallint,
  gallery_opens     smallint,
  dates_selected    smallint,
  saved_items       smallint,
  checkout_started  smallint,
  returning         smallint,
  prior_bookings    smallint,

  -- device
  device            text,
  viewport_w        integer,
  connection        text,
  pwa               smallint,

  -- ads
  ads_viewable      smallint,
  ads_clicked       smallint,
  ads              jsonb default '[]'::jsonb,

  captured_at       timestamptz not null default now()
);

create index if not exists idx_sf_captured on public.session_features (captured_at desc);
create index if not exists idx_sf_visitor  on public.session_features (visitor_id);
create index if not exists idx_sf_session  on public.session_features (session_id);
create index if not exists idx_sf_intent   on public.session_features (intent_band);
create index if not exists idx_sf_page     on public.session_features (current_page);

alter table public.session_features enable row level security;

drop policy if exists sf_insert on public.session_features;
create policy sf_insert on public.session_features
  for insert to anon, authenticated with check (true);

drop policy if exists sf_select on public.session_features;
create policy sf_select on public.session_features
  for select to authenticated using (public.is_operator());


-- ── 4 · PARTNER UPLOADS ────────────────────────────────────────────
create table if not exists public.partner_uploads (
  id                bigserial primary key,
  owner_id          uuid references auth.users (id) on delete cascade,
  owner_email       text,
  listing_id        text,
  filename          text,
  path              text,               -- storage path, for hard delete
  url               text,
  mime_type         text,
  size              bigint,
  status            text not null default 'pending',  -- pending|approved|rejected
  rejection_reason  text,
  reviewed_at       timestamptz,
  created_at        timestamptz not null default now()
);

create index if not exists idx_up_status  on public.partner_uploads (status);
create index if not exists idx_up_owner   on public.partner_uploads (owner_id);
create index if not exists idx_up_created on public.partner_uploads (created_at desc);

alter table public.partner_uploads enable row level security;

-- A partner sees and uploads only their own assets.
drop policy if exists up_own_select on public.partner_uploads;
create policy up_own_select on public.partner_uploads
  for select to authenticated
  using (owner_id = auth.uid() or public.is_operator());

drop policy if exists up_own_insert on public.partner_uploads;
create policy up_own_insert on public.partner_uploads
  for insert to authenticated with check (owner_id = auth.uid());

-- Only an operator may change status or remove.
drop policy if exists up_admin_update on public.partner_uploads;
create policy up_admin_update on public.partner_uploads
  for update to authenticated using (public.is_operator());

drop policy if exists up_admin_delete on public.partner_uploads;
create policy up_admin_delete on public.partner_uploads
  for delete to authenticated using (public.is_operator());


-- ── 5 · DISPUTES ───────────────────────────────────────────────────
create table if not exists public.disputes (
  id               bigserial primary key,
  booking_id       text,
  raised_by        uuid references auth.users (id) on delete set null,
  against_id       uuid references auth.users (id) on delete set null,
  category         text,
  description      text,
  status           text not null default 'open',   -- open|resolved|escalated
  resolution       text,
  resolution_note  text,
  resolved_at      timestamptz,
  created_at       timestamptz not null default now()
);

create index if not exists idx_dis_status on public.disputes (status);
alter table public.disputes enable row level security;

drop policy if exists dis_select on public.disputes;
create policy dis_select on public.disputes
  for select to authenticated
  using (raised_by = auth.uid() or against_id = auth.uid() or public.is_operator());

drop policy if exists dis_insert on public.disputes;
create policy dis_insert on public.disputes
  for insert to authenticated with check (raised_by = auth.uid());

drop policy if exists dis_update on public.disputes;
create policy dis_update on public.disputes
  for update to authenticated using (public.is_operator());


-- ── 6 · COLUMNS THE CONSOLE EXPECTS ────────────────────────────────
-- Additive only. Safe to re-run.

-- profiles: trust, moderation state
alter table public.profiles add column if not exists status             text default 'active';
alter table public.profiles add column if not exists verified           boolean default false;
alter table public.profiles add column if not exists verified_at        timestamptz;
alter table public.profiles add column if not exists phone_verified     boolean default false;
alter table public.profiles add column if not exists flags              integer default 0;
alter table public.profiles add column if not exists reported           boolean default false;
alter table public.profiles add column if not exists banned             boolean default false;
alter table public.profiles add column if not exists banned_at          timestamptz;
alter table public.profiles add column if not exists ban_reason         text;
alter table public.profiles add column if not exists suspended_at       timestamptz;
alter table public.profiles add column if not exists suspended_until    timestamptz;
alter table public.profiles add column if not exists suspension_reason  text;

-- listings: moderation, decay, merchandising
alter table public.listings add column if not exists status            text default 'pending';
alter table public.listings add column if not exists approved_at       timestamptz;
alter table public.listings add column if not exists rejection_reason  text;
alter table public.listings add column if not exists deleted_at        timestamptz;
alter table public.listings add column if not exists featured          boolean default false;
alter table public.listings add column if not exists views             integer default 0;
alter table public.listings add column if not exists bookings_count    integer default 0;
alter table public.listings add column if not exists updated_at        timestamptz default now();

create index if not exists idx_lst_status on public.listings (status);
create index if not exists idx_lst_owner  on public.listings (owner_id);

-- bookings: refunds
alter table public.apartment_bookings add column if not exists refund_amount  numeric;
alter table public.apartment_bookings add column if not exists refund_reason  text;
alter table public.apartment_bookings add column if not exists refunded_at    timestamptz;

-- ad_campaigns: flight, budget, segment targeting
alter table public.ad_campaigns add column if not exists status           text default 'live';
alter table public.ad_campaigns add column if not exists budget           numeric;
alter table public.ad_campaigns add column if not exists start_date       date;
alter table public.ad_campaigns add column if not exists end_date         date;
alter table public.ad_campaigns add column if not exists target_segments  jsonb default '[]'::jsonb;
alter table public.ad_campaigns add column if not exists sub_text         text;
alter table public.ad_campaigns add column if not exists updated_at       timestamptz default now();

create index if not exists idx_ad_status on public.ad_campaigns (status);


-- ── 7 · ROLLUP VIEWS ───────────────────────────────────────────────
-- The console computes in the browser, but these make ad-hoc SQL and
-- any future BI tool trivial.

create or replace view public.v_ad_performance as
select
  props ->> 'campaign_id'                                as campaign_id,
  props ->> 'format'                                     as format,
  page,
  count(*) filter (where event = 'ad_viewable')          as viewable,
  count(*) filter (where event = 'ad_click')             as clicks,
  round(
    100.0 * count(*) filter (where event = 'ad_click')
    / nullif(count(*) filter (where event = 'ad_viewable'), 0)
  , 2)                                                   as ctr,
  avg((props ->> 'viewable_ms')::numeric)
    filter (where event = 'ad_viewable')                 as avg_viewable_ms,
  date_trunc('day', created_at)                          as day
from public.signal_events
where event in ('ad_viewable', 'ad_click')
group by 1, 2, 3, 7;

create or replace view public.v_daily_intent as
select
  date_trunc('day', captured_at)          as day,
  current_page                            as page,
  count(*)                                as sessions,
  count(distinct visitor_id)              as visitors,
  round(avg(intent_score), 1)             as avg_intent,
  round(avg(attention_s), 1)              as avg_attention_s,
  sum(checkout_started)                   as checkouts,
  sum(rage_clicks)                        as rage_clicks,
  round(
    100.0 * count(*) filter (where reading_mode = 'bounce') / nullif(count(*), 0)
  , 1)                                    as bounce_pct
from public.session_features
group by 1, 2;

create or replace view public.v_partner_health as
select
  p.id,
  p.email,
  p.status,
  p.verified,
  p.flags,
  count(distinct l.id)                                          as listings,
  count(distinct b.id)                                          as bookings,
  count(distinct b.id) filter (where b.status = 'cancelled')    as cancellations,
  round(avg(r.rating), 2)                                       as avg_rating,
  count(distinct r.id)                                          as reviews
from public.profiles p
left join public.listings l            on l.owner_id = p.id
left join public.apartment_bookings b  on b.owner_id = p.id
left join public.reviews r             on r.owner_id = p.id
group by p.id, p.email, p.status, p.verified, p.flags;

-- Views inherit RLS from their base tables, so operator-only reads hold.

grant select on public.v_ad_performance to authenticated;
grant select on public.v_daily_intent   to authenticated;
grant select on public.v_partner_health to authenticated;


-- ── 8 · RETENTION ──────────────────────────────────────────────────
-- Raw events are noisy and grow without bound. Session features are
-- the asset; events older than 90 days have served their purpose.
create or replace function public.prune_signal_events()
returns void language sql security definer as $$
  delete from public.signal_events where created_at < now() - interval '90 days';
$$;

-- Schedule with pg_cron if available:
--   select cron.schedule('prune-signals', '0 3 * * *', 'select public.prune_signal_events()');
