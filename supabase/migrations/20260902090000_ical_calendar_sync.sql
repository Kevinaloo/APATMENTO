-- ══════════════════════════════════════════════════════════════════════
-- CABANA · CHANNEL CALENDAR · iCalendar sync that actually syncs
--
-- WHAT WAS WRONG
-- ──────────────
-- The calendar "integration" that shipped before this migration could not
-- have worked, for two independent reasons, and both are the kind that
-- look fine in a demo and lose a booking in production.
--
--  1. THE EXPORT WAS BEHIND A LOGIN.
--     /api/calendar-sync?action=export called requireUser() and answered
--     401 without a Supabase JWT. Airbnb, Booking.com and Vrbo fetch an
--     iCal URL anonymously from a datacentre with no cookie and no header
--     we control. Every feed a host pasted into Airbnb returned 401
--     forever. Nothing was ever exported to anybody.
--
--  2. THE IMPORT WAS NEVER READ.
--     Imported ranges landed in calendar_blocks, and no availability path
--     in the system so much as selected from that table.
--     cabana_dates_available() consulted listing_holds alone. So a host
--     could connect Airbnb, watch the blocks arrive, and still take a
--     Cabana booking straight on top of an Airbnb guest. The import
--     existed as a display artefact.
--
--  Plus a smaller one that would have surfaced on the second host:
--  calendar_blocks.external_uid carried a GLOBAL unique constraint.
--  Two listings importing feeds from the same platform collide on a
--  shared UID and one host's dates silently overwrite another's.
--
-- WHAT THIS BUILDS
-- ────────────────
--   listing_calendar_settings    per-listing sync policy + the public export
--                        token that platforms fetch anonymously
--   calendar_feeds       one row per subscribed external feed, with the
--                        HTTP cache validators and health that make
--                        hourly polling cheap and failure visible
--   calendar_blocks      upgraded: scoped per feed, range-typed, soft
--                        deleted, and now genuinely authoritative
--   calendar_sync_runs   an audit row per attempt. "It didn't sync" is
--                        answerable
--   calendar_conflicts   an overlap between an external reservation and
--                        a Cabana booking is a fact to escalate, never a
--                        thing to silently resolve
--
-- THE RULE THAT MATTERS
-- ─────────────────────
-- listing_holds stays the money-backed truth: Postgres refuses the second
-- overlapping paid claim at the storage layer and that does not change.
-- calendar_blocks is the second, softer source: it cannot refuse anything,
-- because a foreign platform's word is not money in our ledger, but it
-- CLOSES availability before a booking can be created. Two layers, one
-- answer, and the answer now includes the other platforms.
--
-- Idempotent. Additive. Safe to re-run.
-- ══════════════════════════════════════════════════════════════════════

set search_path = public, extensions, pg_catalog;

create extension if not exists btree_gist;
create extension if not exists pgcrypto;


-- ── 1 · WHO MAY TOUCH A LISTING'S CALENDAR ───────────────────────────
-- Ownership lived as a copy-pasted `partner_id = auth.uid()` in a dozen
-- places, each with a slightly different idea of it. One definition, so a
-- co-owner confirmed in listing_partners is not locked out of the
-- calendar of a building they own half of.

create or replace function public.cabana_calendar_operator(p_listing_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, extensions
as $$
  select exists (
    select 1 from public.listings l
     where l.id = p_listing_id
       and (l.partner_id = auth.uid() or l.host_id = auth.uid())
  )
  or exists (
    select 1 from public.listing_partners lp
     where lp.listing_id = p_listing_id
       and lp.user_id    = auth.uid()
       and lp.status     = 'active'
  )
  or public.is_operator();
$$;

comment on function public.cabana_calendar_operator(uuid) is
  'One definition of who may read and change a listing calendar: the operating account, the host, a confirmed co-owner, or an operator.';


-- ── 2 · PER-LISTING SYNC POLICY AND THE PUBLIC TOKEN ─────────────────
-- The export token is a capability URL, which is exactly what every
-- platform in this industry uses, because the fetcher cannot authenticate.
-- It is long, random, per listing, revocable and rotatable, it reveals
-- occupied date ranges and nothing else by default, and every fetch is
-- counted so a host can see whether Airbnb is actually reading it.

create table if not exists public.listing_calendar_settings (
  id                 uuid primary key default gen_random_uuid(),
  listing_id         uuid not null unique
                     references public.listings (id) on delete cascade,

  -- 48 hex characters. Unguessable, and cheap to rotate the moment a
  -- host suspects a URL leaked.
  export_token       text not null unique
                     default encode(extensions.gen_random_bytes(24), 'hex'),
  export_enabled     boolean not null default true,

  -- What the outside world is allowed to see in the feed.
  --   bookings  · paid Cabana holds only
  --   all       · holds + the host's own manual blocks
  -- Imported ranges are NEVER re-exported. Sending Airbnb's own
  -- reservations back to Airbnb is how a two-platform host ends up with a
  -- calendar that grows blocks it cannot explain.
  export_scope       text not null default 'all'
                     check (export_scope in ('bookings','all')),

  -- Guest names are personal data and no channel needs them to block a
  -- night. Off unless a host deliberately turns it on.
  show_guest_names   boolean not null default false,

  timezone           text not null default 'Africa/Nairobi',

  -- Nights held either side of every busy range for cleaning and
  -- turnover. The feature every serious host asks for on day two.
  turnover_days      integer not null default 0
                     check (turnover_days between 0 and 7),

  -- How far forward the feed publishes, and how much history it keeps.
  -- Airbnb reads ~2 years; past nights are noise in every reader.
  horizon_days       integer not null default 540
                     check (horizon_days between 30 and 1095),
  history_days       integer not null default 30
                     check (history_days between 0 and 365),

  -- The switch that makes an import mean something. On by default,
  -- because a host who connects a channel is telling us those nights are
  -- gone. Off is a deliberate "show me, don't stop me".
  block_on_import    boolean not null default true,
  alert_on_conflict  boolean not null default true,

  -- Evidence that the other side is really reading us.
  export_fetch_count   bigint not null default 0,
  export_last_fetched_at timestamptz,
  export_last_agent    text,
  token_rotated_at     timestamptz,

  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index if not exists idx_listing_calendar_settings_token
  on public.listing_calendar_settings (export_token) where export_enabled;

comment on table public.listing_calendar_settings is
  'Per-listing calendar policy and the anonymous export token external platforms fetch. One row per listing, created on demand.';
comment on column public.listing_calendar_settings.export_token is
  'Capability token in the public .ics URL. Platforms cannot authenticate, so the URL is the credential: long, random, revocable, and it discloses busy ranges only.';
comment on column public.listing_calendar_settings.turnover_days is
  'Nights held either side of every busy range for cleaning. Applied to both the exported feed and to availability.';


-- ── 3 · SUBSCRIBED FEEDS ─────────────────────────────────────────────
-- Polling an unchanged calendar every hour for a year is 8,760 pointless
-- megabyte transfers per feed. ETag and Last-Modified are stored so the
-- overwhelming majority of polls cost one 304 and no parsing, and a
-- content hash catches the platforms that send neither validator.

create table if not exists public.calendar_feeds (
  id                    uuid primary key default gen_random_uuid(),
  listing_id            uuid not null references public.listings (id) on delete cascade,

  -- Registry key from api/lib/_calendar-platforms.js. Free text rather
  -- than an enum so a new channel is a deploy, not a migration.
  platform              text not null default 'other',
  label                 text,
  url                   text not null,

  -- Feed URLs run to 300+ characters with signed query strings, which is
  -- past the comfortable limit for a btree unique. Hash and index that.
  url_hash              text not null,

  is_active             boolean not null default true,
  sync_interval_minutes integer not null default 60
                        check (sync_interval_minutes between 15 and 1440),

  -- When two feeds disagree, the lower number is believed first. A
  -- direct channel outranks an aggregator.
  priority              integer not null default 100,

  last_synced_at        timestamptz,
  last_success_at       timestamptz,
  next_sync_at          timestamptz not null default now(),

  etag                  text,
  last_modified         text,
  content_hash          text,

  consecutive_failures  integer not null default 0,
  last_status           text not null default 'never'
                        check (last_status in ('never','ok','unchanged','error','skipped')),
  last_error            text,
  last_event_count      integer,
  last_block_count      integer,

  created_by            uuid references auth.users (id) on delete set null,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),

  constraint calendar_feeds_url_https check (url ~* '^https://')
);

create unique index if not exists calendar_feeds_unique_per_listing
  on public.calendar_feeds (listing_id, url_hash);
create index if not exists idx_calendar_feeds_due
  on public.calendar_feeds (next_sync_at) where is_active;
create index if not exists idx_calendar_feeds_listing
  on public.calendar_feeds (listing_id);

comment on table public.calendar_feeds is
  'External iCal feeds subscribed per listing, with the HTTP cache validators that keep hourly polling nearly free and the failure counters that make a dead feed visible before it costs a booking.';

-- An earlier schema left a `listing_calendars` table behind: listing_id,
-- source, calendar_url, is_active. That is a feed subscription under a
-- name this migration needs for something else, and nothing in the
-- codebase has ever read it. Its rows ARE feeds, so they become feeds,
-- and the empty shell is retired rather than left to confuse the next
-- person who greps for a calendar table.
do $legacy$
begin
  if exists (
    select 1 from information_schema.columns
     where table_schema = 'public' and table_name = 'listing_calendars'
       and column_name = 'calendar_url'
  ) then
    execute $adopt$
      insert into public.calendar_feeds
             (listing_id, platform, url, url_hash, is_active, created_at)
      select lc.listing_id,
             coalesce(nullif(lc.source, ''), 'other'),
             lc.calendar_url,
             encode(extensions.digest(lc.calendar_url, 'sha256'), 'hex'),
             coalesce(lc.is_active, true),
             coalesce(lc.created_at, now())
        from public.listing_calendars lc
       where lc.listing_id is not null
         and lc.calendar_url ~* '^https://'
      on conflict (listing_id, url_hash) do nothing
    $adopt$;

    drop table public.listing_calendars;
  end if;
end $legacy$;



-- ── 4 · BLOCKS · scoped, ranged, soft-deleted ────────────────────────

alter table public.calendar_blocks
  add column if not exists feed_id      uuid references public.calendar_feeds (id) on delete cascade,
  add column if not exists platform     text,
  add column if not exists kind         text not null default 'reservation',
  add column if not exists summary      text,
  add column if not exists description  text,
  add column if not exists guest_label  text,
  add column if not exists stay         daterange,
  add column if not exists is_active    boolean not null default true,
  add column if not exists first_seen_at timestamptz not null default now(),
  add column if not exists last_seen_at timestamptz not null default now(),
  add column if not exists dropped_at   timestamptz,
  add column if not exists created_by   uuid references auth.users (id) on delete set null,
  add column if not exists note         text,
  add column if not exists checksum     text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'calendar_blocks_kind_chk') then
    alter table public.calendar_blocks
      add constraint calendar_blocks_kind_chk check (kind in (
        'reservation',   -- a real guest on another platform
        'blocked',       -- the other platform's own unavailability
        'manual',        -- our host, blocking their own nights here
        'maintenance',   -- ours, but not sellable
        'echo'           -- our own export, read back in. Never a conflict.
      ));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'calendar_blocks_range_chk') then
    alter table public.calendar_blocks
      add constraint calendar_blocks_range_chk check (end_date > start_date);
  end if;
end $$;

-- The dangerous one. `unique (external_uid)` is global: Booking.com hands
-- every property a UID built from the reservation number, and two Cabana
-- listings importing two Booking.com feeds WILL eventually present the
-- same string. Under the old constraint the second listing's block was
-- rejected, or worse, merged onto the first listing's row. A UID is only
-- ever unique within the feed that issued it, so that is the scope.
alter table public.calendar_blocks
  drop constraint if exists calendar_blocks_external_uid_key;
drop index if exists public.calendar_blocks_external_uid_key;

create unique index if not exists calendar_blocks_uid_per_feed
  on public.calendar_blocks (feed_id, external_uid)
  where feed_id is not null;

-- Manual blocks have no feed. They are still unique per listing.
create unique index if not exists calendar_blocks_uid_manual
  on public.calendar_blocks (listing_id, external_uid)
  where feed_id is null;

-- `stay` is derived, always, so nothing can write a range that disagrees
-- with the two date columns the rest of the codebase reads.
create or replace function public.cabana_calendar_block_range()
returns trigger
language plpgsql
set search_path = pg_catalog, public, extensions
as $$
begin
  new.stay := daterange(new.start_date, new.end_date, '[)');
  if new.is_active = false and new.dropped_at is null then
    new.dropped_at := now();
  elsif new.is_active then
    new.dropped_at := null;
  end if;
  return new;
end;
$$;

drop trigger if exists calendar_blocks_range_trigger on public.calendar_blocks;
create trigger calendar_blocks_range_trigger
  before insert or update of start_date, end_date, is_active
  on public.calendar_blocks
  for each row execute function public.cabana_calendar_block_range();

update public.calendar_blocks
   set stay = daterange(start_date, end_date, '[)')
 where stay is null and end_date > start_date;

-- The index every availability question in the system now runs through.
create index if not exists calendar_blocks_active_range
  on public.calendar_blocks using gist (listing_id, stay)
  where is_active;
create index if not exists idx_calendar_blocks_feed
  on public.calendar_blocks (feed_id) where is_active;

comment on column public.calendar_blocks.kind is
  'reservation | blocked | manual | maintenance | echo. An echo is our own exported booking arriving back through another platform: recorded so it is visible, never counted as a conflict, never re-exported.';


-- ── 5 · AUDIT · one row per attempt ──────────────────────────────────
-- "The calendar did not update" is the single most common host support
-- ticket in this industry, and it is unanswerable without this table.

create table if not exists public.calendar_sync_runs (
  id                 uuid primary key default gen_random_uuid(),
  feed_id            uuid references public.calendar_feeds (id) on delete cascade,
  listing_id         uuid references public.listings (id) on delete cascade,
  trigger_source     text not null default 'cron'
                     check (trigger_source in ('cron','manual','test','webhook','import')),
  started_at         timestamptz not null default now(),
  finished_at        timestamptz,
  duration_ms        integer,
  http_status        integer,
  outcome            text not null default 'error'
                     check (outcome in ('ok','unchanged','error','skipped')),
  events_parsed      integer not null default 0,
  blocks_created     integer not null default 0,
  blocks_updated     integer not null default 0,
  blocks_dropped     integer not null default 0,
  conflicts_detected integer not null default 0,
  bytes              integer,
  error              text
);

create index if not exists idx_sync_runs_feed
  on public.calendar_sync_runs (feed_id, started_at desc);
create index if not exists idx_sync_runs_listing
  on public.calendar_sync_runs (listing_id, started_at desc);


-- ── 6 · CONFLICTS · never resolved silently ──────────────────────────
-- A paid Cabana guest and an Airbnb guest on the same night is not a data
-- problem to clean up. Somebody is about to arrive at a door that is
-- already occupied, and a human has to choose which. We detect it the
-- moment the feed lands, we tell the host, and we refuse to guess.

create table if not exists public.calendar_conflicts (
  id           uuid primary key default gen_random_uuid(),
  listing_id   uuid not null references public.listings (id) on delete cascade,
  feed_id      uuid references public.calendar_feeds (id) on delete set null,
  block_id     uuid references public.calendar_blocks (id) on delete cascade,
  booking_ref  text,
  booking_id   uuid,
  platform     text,
  overlap      daterange not null,
  severity     text not null default 'critical'
               check (severity in ('critical','warning')),
  status       text not null default 'open'
               check (status in ('open','resolved','ignored')),
  detected_at  timestamptz not null default now(),
  notified_at  timestamptz,
  resolved_at  timestamptz,
  resolved_by  uuid references auth.users (id) on delete set null,
  resolution   text
);

create unique index if not exists calendar_conflicts_open_unique
  on public.calendar_conflicts (listing_id, block_id, coalesce(booking_ref, ''))
  where status = 'open';
create index if not exists idx_calendar_conflicts_listing
  on public.calendar_conflicts (listing_id, status, detected_at desc);


-- ── 7 · AVAILABILITY · the fix that makes an import matter ───────────
-- Same signature, same callers, one more source of truth. Everything that
-- already asked this question now gets an answer that includes the other
-- platforms, with no caller changed.

create or replace function public.cabana_dates_available(
  p_listing_id  uuid,
  p_checkin     date,
  p_checkout    date,
  p_exclude_ref text default null
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, extensions
as $$
  with policy as (
    select coalesce(lc.turnover_days, 0)      as turnover_days,
           coalesce(lc.block_on_import, true) as block_on_import
      from (select 1) _
      left join public.listing_calendar_settings lc on lc.listing_id = p_listing_id
  ),
  -- The requested stay, widened by the turnover buffer, so a same-day
  -- flip against a cleaning window is refused rather than sold.
  want as (
    select daterange(
             p_checkin  - (select turnover_days from policy),
             p_checkout + (select turnover_days from policy),
             '[)') as span
  )
  select
    -- Money-backed holds. Unchanged, and still the hard guarantee.
    not exists (
      select 1 from public.listing_holds h, want
       where h.listing_id  = p_listing_id
         and h.released_at is null
         and h.stay && want.span
         and (p_exclude_ref is null or h.booking_ref <> p_exclude_ref)
    )
    -- Everything the channels and the host told us. An echo of our own
    -- booking is excluded: it is already counted above, and counting it
    -- twice would block the very guest who paid for it.
    and not exists (
      select 1 from public.calendar_blocks b, want, policy
       where b.listing_id = p_listing_id
         and b.is_active
         and b.kind <> 'echo'
         and policy.block_on_import
         and b.stay && want.span
    );
$$;

comment on function public.cabana_dates_available(uuid,date,date,text) is
  'The single availability question. Answers from money-backed holds AND live channel blocks AND the host manual calendar, widened by the turnover buffer. Before this, imported blocks were invisible here and a Cabana guest could be sold a night an Airbnb guest had already taken.';


-- The merged calendar, labelled by where each range came from. This is
-- what a host sees, and what the exporter reads.
create or replace function public.cabana_calendar_ranges(
  p_listing_id uuid,
  p_from       date default (current_date - 30),
  p_to         date default (current_date + 540)
)
returns table (
  source      text,
  kind        text,
  platform    text,
  start_date  date,
  end_date    date,
  label       text,
  ref         text,
  block_id    uuid
)
language sql
stable
security definer
set search_path = pg_catalog, public, extensions
as $$
  select 'cabana'::text,
         'reservation'::text,
         'cabana'::text,
         lower(h.stay),
         upper(h.stay),
         'Cabana booking'::text,
         h.booking_ref,
         null::uuid
    from public.listing_holds h
   where h.listing_id = p_listing_id
     and h.released_at is null
     and h.stay && daterange(p_from, p_to, '[)')
  union all
  select case when b.feed_id is null then 'host' else 'channel' end,
         b.kind,
         coalesce(b.platform, b.source, 'other'),
         lower(b.stay),
         upper(b.stay),
         coalesce(b.summary, initcap(b.kind)),
         b.external_uid,
         b.id
    from public.calendar_blocks b
   where b.listing_id = p_listing_id
     and b.is_active
     and b.stay && daterange(p_from, p_to, '[)')
   order by 4;
$$;

-- The public read used by listing pages. Now channel-aware, so a
-- traveller is never shown a night another platform already sold.
create or replace function public.cabana_listing_calendar(
  p_listing_id uuid,
  p_from       date default current_date,
  p_to         date default (current_date + interval '180 days')::date
)
returns table (checkin date, checkout date)
language sql
stable
security definer
set search_path = pg_catalog, public, extensions
as $$
  select r.start_date, r.end_date
    from public.cabana_calendar_ranges(p_listing_id, p_from, p_to) r
   where r.kind <> 'echo'
   order by r.start_date;
$$;


-- ── 8 · SETTINGS · created on demand, never missing ──────────────────
-- A listing without a calendar row is not an error state, it is a listing
-- whose host has not opened the page yet. Asking for the settings creates
-- them, so no code path anywhere has to handle "no row".

create or replace function public.cabana_calendar_settings(p_listing_id uuid)
returns public.listing_calendar_settings
language plpgsql
security definer
set search_path = pg_catalog, public, extensions
as $$
declare v_row public.listing_calendar_settings%rowtype;
begin
  if not public.cabana_calendar_operator(p_listing_id) then
    raise exception 'not_your_listing' using errcode = '42501';
  end if;

  insert into public.listing_calendar_settings (listing_id)
  values (p_listing_id)
  on conflict (listing_id) do nothing;

  select * into v_row from public.listing_calendar_settings where listing_id = p_listing_id;
  return v_row;
end;
$$;


create or replace function public.cabana_calendar_update_settings(
  p_listing_id uuid,
  p_patch      jsonb
)
returns public.listing_calendar_settings
language plpgsql
security definer
set search_path = pg_catalog, public, extensions
as $$
declare v_row public.listing_calendar_settings%rowtype;
begin
  if not public.cabana_calendar_operator(p_listing_id) then
    raise exception 'not_your_listing' using errcode = '42501';
  end if;

  perform public.cabana_calendar_settings(p_listing_id);

  -- Named columns only. A jsonb patch that could reach export_token would
  -- let a caller choose their own capability URL.
  update public.listing_calendar_settings set
    export_enabled    = coalesce((p_patch->>'export_enabled')::boolean,    export_enabled),
    export_scope      = coalesce( p_patch->>'export_scope',                export_scope),
    show_guest_names  = coalesce((p_patch->>'show_guest_names')::boolean,  show_guest_names),
    timezone          = coalesce( p_patch->>'timezone',                    timezone),
    turnover_days     = coalesce((p_patch->>'turnover_days')::integer,     turnover_days),
    horizon_days      = coalesce((p_patch->>'horizon_days')::integer,      horizon_days),
    history_days      = coalesce((p_patch->>'history_days')::integer,      history_days),
    block_on_import   = coalesce((p_patch->>'block_on_import')::boolean,   block_on_import),
    alert_on_conflict = coalesce((p_patch->>'alert_on_conflict')::boolean, alert_on_conflict),
    updated_at        = now()
  where listing_id = p_listing_id
  returning * into v_row;

  return v_row;
end;
$$;


-- Rotation is the answer to a leaked URL, and it must be instant: the old
-- token stops working the moment this returns.
create or replace function public.cabana_calendar_rotate_token(p_listing_id uuid)
returns text
language plpgsql
security definer
set search_path = pg_catalog, public, extensions
as $$
declare v_token text;
begin
  if not public.cabana_calendar_operator(p_listing_id) then
    raise exception 'not_your_listing' using errcode = '42501';
  end if;

  perform public.cabana_calendar_settings(p_listing_id);

  update public.listing_calendar_settings
     set export_token          = encode(extensions.gen_random_bytes(24), 'hex'),
         token_rotated_at      = now(),
         export_fetch_count    = 0,
         export_last_fetched_at = null,
         updated_at            = now()
   where listing_id = p_listing_id
  returning export_token into v_token;

  return v_token;
end;
$$;


-- ── 9 · THE PUBLIC EXPORT ────────────────────────────────────────────
-- Anonymous by construction: the token IS the authorisation, because the
-- fetcher is a datacentre robot that cannot log in. Returns data, not
-- text, so the serialiser lives in JavaScript where it can be tested and
-- tuned per platform without a migration.
--
-- Imported ranges are deliberately absent. Echoing Airbnb's calendar back
-- to Airbnb is the classic channel-manager feedback loop: every poll the
-- block is re-imported, re-exported and re-confirmed, and after a few
-- rounds neither side can say who blocked what.

create or replace function public.cabana_calendar_export(
  p_token text,
  p_agent text default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, extensions
as $$
declare
  v_cal     public.listing_calendar_settings%rowtype;
  v_listing record;
  v_events  jsonb;
  v_from    date;
  v_to      date;
begin
  select * into v_cal
    from public.listing_calendar_settings
   where export_token = p_token
     and export_enabled;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'unknown_token');
  end if;

  select l.id, l.title, l.city, l.country, l.checkin_time, l.checkout_time
    into v_listing
    from public.listings l
   where l.id = v_cal.listing_id;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'listing_gone');
  end if;

  v_from := current_date - v_cal.history_days;
  v_to   := current_date + v_cal.horizon_days;

  select coalesce(jsonb_agg(e order by e->>'start'), '[]'::jsonb)
    into v_events
    from (
      -- Paid Cabana stays, widened by the turnover buffer so the other
      -- platform cannot sell the cleaning day.
      select jsonb_build_object(
               'uid',    h.booking_ref,
               'start',  (lower(h.stay) - v_cal.turnover_days)::text,
               'end',    (upper(h.stay) + v_cal.turnover_days)::text,
               'kind',   'reservation',
               'ref',    h.booking_ref,
               'guest',  case when v_cal.show_guest_names
                              then nullif(b.guest_name, '') end,
               'nights', upper(h.stay) - lower(h.stay),
               'made',   h.claimed_at
             ) as e
        from public.listing_holds h
        left join public.apartment_bookings b
               on b.payment_reference = h.booking_ref
       where h.listing_id  = v_cal.listing_id
         and h.released_at is null
         and h.stay && daterange(v_from, v_to, '[)')

      union all

      -- The host's own blocks. Never anything that arrived from a feed.
      select jsonb_build_object(
               'uid',    'block-' || cb.id::text,
               'start',  (lower(cb.stay) - v_cal.turnover_days)::text,
               'end',    (upper(cb.stay) + v_cal.turnover_days)::text,
               'kind',   cb.kind,
               'ref',    cb.external_uid,
               'guest',  null,
               'nights', upper(cb.stay) - lower(cb.stay),
               'made',   cb.first_seen_at
             )
        from public.calendar_blocks cb
       where cb.listing_id = v_cal.listing_id
         and cb.is_active
         and cb.feed_id is null
         and cb.kind in ('manual','maintenance')
         and v_cal.export_scope = 'all'
         and cb.stay && daterange(v_from, v_to, '[)')
    ) src;

  update public.listing_calendar_settings
     set export_fetch_count     = export_fetch_count + 1,
         export_last_fetched_at = now(),
         export_last_agent      = left(coalesce(p_agent, export_last_agent), 200)
   where id = v_cal.id;

  return jsonb_build_object(
    'ok',            true,
    'listing_id',    v_cal.listing_id,
    'title',         coalesce(v_listing.title, 'Cabana stay'),
    'city',          v_listing.city,
    'country',       v_listing.country,
    'timezone',      v_cal.timezone,
    'checkin_time',  v_listing.checkin_time,
    'checkout_time', v_listing.checkout_time,
    'turnover_days', v_cal.turnover_days,
    'events',        v_events
  );
end;
$$;


-- ── 10 · APPLYING A SYNC · one transaction, or none of it ────────────
-- A feed is a full statement of the truth at a moment, not a stream of
-- changes: a reservation that disappears from the feed was cancelled on
-- the other platform, and those nights must open again. So the whole run
-- is a diff, and it commits atomically. A half-applied calendar is worse
-- than a stale one, because a stale one is at least consistent.

create or replace function public.cabana_calendar_apply_sync(
  p_feed_id uuid,
  p_events  jsonb,
  p_meta    jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, extensions
as $$
declare
  v_feed      public.calendar_feeds%rowtype;
  v_created   integer := 0;
  v_updated   integer := 0;
  v_dropped   integer := 0;
  v_conflicts integer := 0;
  v_seen      text[];
  v_outcome   text := coalesce(p_meta->>'outcome', 'ok');
  v_owner     uuid;
  v_title     text;
begin
  select * into v_feed from public.calendar_feeds where id = p_feed_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'unknown_feed');
  end if;

  if v_outcome = 'error' then
    update public.calendar_feeds
       set last_synced_at       = now(),
           last_status          = 'error',
           last_error           = left(p_meta->>'error', 500),
           consecutive_failures = consecutive_failures + 1,
           -- Back off on a failing feed rather than hammering it: 1x, 2x,
           -- 4x the interval, capped at six hours. A platform that is
           -- rate-limiting us is not helped by trying harder.
           next_sync_at         = now() + least(
                                    interval '6 hours',
                                    (sync_interval_minutes
                                     * power(2, least(consecutive_failures, 4))
                                     || ' minutes')::interval),
           updated_at           = now()
     where id = p_feed_id;

    insert into public.calendar_sync_runs
           (feed_id, listing_id, trigger_source, finished_at, duration_ms,
            http_status, outcome, error)
    values (p_feed_id, v_feed.listing_id,
            coalesce(p_meta->>'trigger', 'cron'), now(),
            (p_meta->>'duration_ms')::integer,
            (p_meta->>'http_status')::integer,
            'error', left(p_meta->>'error', 500));

    return jsonb_build_object('ok', false, 'outcome', 'error',
                              'error', p_meta->>'error');
  end if;

  -- 304, or a byte-identical body. Nothing to diff, and saying so is
  -- cheaper than proving it row by row.
  if v_outcome = 'unchanged' then
    update public.calendar_feeds
       set last_synced_at       = now(),
           last_success_at      = now(),
           last_status          = 'unchanged',
           last_error           = null,
           consecutive_failures = 0,
           etag                 = coalesce(p_meta->>'etag', etag),
           last_modified        = coalesce(p_meta->>'last_modified', last_modified),
           next_sync_at         = now() + (sync_interval_minutes || ' minutes')::interval,
           updated_at           = now()
     where id = p_feed_id;

    insert into public.calendar_sync_runs
           (feed_id, listing_id, trigger_source, finished_at, duration_ms,
            http_status, outcome)
    values (p_feed_id, v_feed.listing_id,
            coalesce(p_meta->>'trigger', 'cron'), now(),
            (p_meta->>'duration_ms')::integer,
            (p_meta->>'http_status')::integer, 'unchanged');

    return jsonb_build_object('ok', true, 'outcome', 'unchanged');
  end if;

  -- ── the diff ──
  -- Schema-qualified to pg_temp on purpose. Bare `_incoming` resolves
  -- through the search path, and a same-named table in `public` would be
  -- the one dropped. Never let a cleanup statement guess.
  drop table if exists pg_temp._incoming;
  create temporary table _incoming (
    uid         text primary key,
    start_date  date not null,
    end_date    date not null,
    kind        text not null,
    summary     text,
    description text,
    guest_label text,
    checksum    text
  ) on commit drop;

  insert into _incoming (uid, start_date, end_date, kind, summary,
                         description, guest_label, checksum)
  select e.uid, e.start_date, e.end_date,
         case when e.kind in ('reservation','blocked','echo') then e.kind
              else 'blocked' end,
         left(e.summary, 300), left(e.description, 1000),
         left(e.guest_label, 120),
         md5(e.uid || e.start_date::text || e.end_date::text || coalesce(e.summary,''))
    from jsonb_to_recordset(p_events) as e(
           uid text, start_date date, end_date date, kind text,
           summary text, description text, guest_label text)
   where e.uid is not null
     and e.start_date is not null
     and e.end_date > e.start_date
  on conflict (uid) do nothing;

  select coalesce(array_agg(uid), '{}') into v_seen from _incoming;

  with upserted as (
    insert into public.calendar_blocks
           (listing_id, feed_id, external_uid, start_date, end_date,
            kind, platform, source, calendar_url, summary, description,
            guest_label, checksum, is_active, synced_at, last_seen_at)
    select v_feed.listing_id, v_feed.id, i.uid, i.start_date, i.end_date,
           i.kind, v_feed.platform, v_feed.platform, v_feed.url,
           i.summary, i.description, i.guest_label, i.checksum,
           true, now(), now()
      from _incoming i
    on conflict (feed_id, external_uid) where feed_id is not null
    do update set
      start_date  = excluded.start_date,
      end_date    = excluded.end_date,
      kind        = excluded.kind,
      summary     = excluded.summary,
      description = excluded.description,
      guest_label = excluded.guest_label,
      checksum    = excluded.checksum,
      is_active   = true,
      synced_at   = now(),
      last_seen_at = now()
    returning (xmax = 0) as inserted
  )
  select count(*) filter (where inserted),
         count(*) filter (where not inserted)
    into v_created, v_updated
    from upserted;

  -- Gone from the feed means cancelled on the other platform. Soft
  -- delete, so the history of what blocked a night survives the night.
  with released as (
    update public.calendar_blocks
       set is_active = false, dropped_at = now()
     where feed_id = p_feed_id
       and is_active
       and not (external_uid = any (v_seen))
    returning 1
  )
  select count(*) into v_dropped from released;

  -- ── conflicts ──
  -- A conflict that healed (the block vanished, or the booking was
  -- cancelled) closes itself. Only a live pair stays open.
  update public.calendar_conflicts c
     set status = 'resolved', resolved_at = now(), resolution = 'cleared_on_sync'
   where c.feed_id = p_feed_id
     and c.status  = 'open'
     and not exists (
       select 1
         from public.calendar_blocks b
         join public.listing_holds  h on h.booking_ref = c.booking_ref
        where b.id = c.block_id
          and b.is_active
          and h.released_at is null
          and b.stay && h.stay);

  with found as (
    insert into public.calendar_conflicts
           (listing_id, feed_id, block_id, booking_ref, booking_id,
            platform, overlap, severity)
    select v_feed.listing_id, p_feed_id, b.id, h.booking_ref, h.booking_id,
           v_feed.platform, b.stay * h.stay, 'critical'
      from public.calendar_blocks b
      join public.listing_holds  h
        on h.listing_id  = b.listing_id
       and h.released_at is null
       and h.stay && b.stay
     where b.feed_id = p_feed_id
       and b.is_active
       and b.kind <> 'echo'
    on conflict do nothing
    returning listing_id
  )
  select count(*) into v_conflicts from found;

  update public.calendar_feeds
     set last_synced_at       = now(),
         last_success_at      = now(),
         last_status          = 'ok',
         last_error           = null,
         consecutive_failures = 0,
         etag                 = p_meta->>'etag',
         last_modified        = p_meta->>'last_modified',
         content_hash         = p_meta->>'content_hash',
         last_event_count     = (select count(*)::integer from _incoming),
         last_block_count     = (select count(*)::integer
                                   from public.calendar_blocks
                                  where feed_id = p_feed_id and is_active),
         next_sync_at         = now() + (sync_interval_minutes || ' minutes')::interval,
         updated_at           = now()
   where id = p_feed_id;

  insert into public.calendar_sync_runs
         (feed_id, listing_id, trigger_source, finished_at, duration_ms,
          http_status, outcome, events_parsed, blocks_created,
          blocks_updated, blocks_dropped, conflicts_detected, bytes)
  values (p_feed_id, v_feed.listing_id,
          coalesce(p_meta->>'trigger', 'cron'), now(),
          (p_meta->>'duration_ms')::integer,
          (p_meta->>'http_status')::integer, 'ok',
          (select count(*) from _incoming),
          v_created, v_updated, v_dropped, v_conflicts,
          (p_meta->>'bytes')::integer);

  -- A conflict the host never hears about is a conflict that becomes a
  -- doorstep argument at 11pm.
  if v_conflicts > 0 then
    select l.partner_id, l.title into v_owner, v_title
      from public.listings l where l.id = v_feed.listing_id;

    if v_owner is not null and exists (
      select 1 from public.listing_calendar_settings
       where listing_id = v_feed.listing_id and alert_on_conflict) then
      insert into public.notifications (user_id, kind, title, body, url, meta)
      values (v_owner, 'calendar_conflict',
              'Double booking detected',
              v_conflicts || ' date range' || case when v_conflicts = 1 then '' else 's' end
                || ' on ' || coalesce(v_title, 'your listing')
                || ' are booked on both Cabana and ' || coalesce(v_feed.platform, 'another platform')
                || '. Open the calendar to resolve.',
              '/partner-calendar?listing=' || v_feed.listing_id::text,
              jsonb_build_object('listing_id', v_feed.listing_id,
                                 'feed_id', p_feed_id,
                                 'conflicts', v_conflicts));

      update public.calendar_conflicts
         set notified_at = now()
       where feed_id = p_feed_id and status = 'open' and notified_at is null;
    end if;
  end if;

  return jsonb_build_object(
    'ok',        true,
    'outcome',   'ok',
    'parsed',    (select count(*) from _incoming),
    'created',   v_created,
    'updated',   v_updated,
    'dropped',   v_dropped,
    'conflicts', v_conflicts
  );
end;
$$;


-- ── 11 · FEED MANAGEMENT ─────────────────────────────────────────────
-- Every one of these checks ownership itself rather than trusting a
-- caller-supplied listing_id, because these are security definer and the
-- API layer is not the last line of defence.

create or replace function public.cabana_calendar_add_feed(
  p_listing_id uuid,
  p_url        text,
  p_platform   text default 'other',
  p_label      text default null,
  p_interval   integer default 60
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, extensions
as $$
declare
  v_id   uuid;
  v_hash text;
  v_url  text := btrim(p_url);
begin
  if not public.cabana_calendar_operator(p_listing_id) then
    raise exception 'not_your_listing' using errcode = '42501';
  end if;

  -- webcal:// is what most platforms put on the clipboard. It is https
  -- with a different scheme name, and refusing it would send every host
  -- to support to be told to edit the URL by hand.
  if v_url ~* '^webcal://' then
    v_url := regexp_replace(v_url, '^webcal://', 'https://', 'i');
  end if;

  if v_url !~* '^https://' then
    raise exception 'feed_url_must_be_https' using errcode = '22023';
  end if;

  perform public.cabana_calendar_settings(p_listing_id);

  v_hash := encode(extensions.digest(v_url, 'sha256'), 'hex');

  insert into public.calendar_feeds
         (listing_id, platform, label, url, url_hash,
          sync_interval_minutes, created_by)
  values (p_listing_id, coalesce(nullif(p_platform, ''), 'other'),
          nullif(btrim(coalesce(p_label, '')), ''), v_url, v_hash,
          greatest(15, least(1440, coalesce(p_interval, 60))), auth.uid())
  on conflict (listing_id, url_hash) do update
     set is_active  = true,
         label      = coalesce(excluded.label, public.calendar_feeds.label),
         platform   = excluded.platform,
         -- Re-adding a feed is what a host does when it looks stuck.
         -- Make that gesture mean "try again now".
         next_sync_at = now(),
         consecutive_failures = 0,
         updated_at = now()
  returning id into v_id;

  return jsonb_build_object('ok', true, 'feed_id', v_id);
end;
$$;


create or replace function public.cabana_calendar_update_feed(
  p_feed_id uuid,
  p_patch   jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, extensions
as $$
declare v_listing uuid;
begin
  select listing_id into v_listing from public.calendar_feeds where id = p_feed_id;
  if v_listing is null then
    raise exception 'unknown_feed' using errcode = 'P0002';
  end if;
  if not public.cabana_calendar_operator(v_listing) then
    raise exception 'not_your_listing' using errcode = '42501';
  end if;

  update public.calendar_feeds set
    label                 = coalesce(p_patch->>'label', label),
    platform              = coalesce(p_patch->>'platform', platform),
    is_active             = coalesce((p_patch->>'is_active')::boolean, is_active),
    priority              = coalesce((p_patch->>'priority')::integer, priority),
    sync_interval_minutes = greatest(15, least(1440,
                              coalesce((p_patch->>'sync_interval_minutes')::integer,
                                       sync_interval_minutes))),
    -- Any change is a reason to re-read, and a re-enable must not wait an
    -- hour to prove itself.
    next_sync_at          = case when coalesce((p_patch->>'sync_now')::boolean, false)
                                   or coalesce((p_patch->>'is_active')::boolean, is_active) <> is_active
                                 then now() else next_sync_at end,
    consecutive_failures  = case when coalesce((p_patch->>'sync_now')::boolean, false)
                                 then 0 else consecutive_failures end,
    updated_at            = now()
  where id = p_feed_id;

  return jsonb_build_object('ok', true);
end;
$$;


create or replace function public.cabana_calendar_remove_feed(p_feed_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, extensions
as $$
declare v_listing uuid;
begin
  select listing_id into v_listing from public.calendar_feeds where id = p_feed_id;
  if v_listing is null then
    return jsonb_build_object('ok', true, 'already_gone', true);
  end if;
  if not public.cabana_calendar_operator(v_listing) then
    raise exception 'not_your_listing' using errcode = '42501';
  end if;

  -- Disconnecting a channel must open its nights again, or a host who
  -- leaves Airbnb keeps an Airbnb-shaped hole in their calendar forever.
  update public.calendar_conflicts
     set status = 'resolved', resolved_at = now(), resolution = 'feed_removed'
   where feed_id = p_feed_id and status = 'open';

  delete from public.calendar_feeds where id = p_feed_id;
  return jsonb_build_object('ok', true);
end;
$$;


-- The cron's work list. Ordered by how overdue a feed is, so a backlog
-- drains fairly instead of starving whoever sorts last by id.
create or replace function public.cabana_calendar_due_feeds(p_limit integer default 40)
returns table (
  feed_id       uuid,
  listing_id    uuid,
  platform      text,
  url           text,
  etag          text,
  last_modified text,
  content_hash  text,
  failures      integer
)
language sql
stable
security definer
set search_path = pg_catalog, public, extensions
as $$
  select f.id, f.listing_id, f.platform, f.url, f.etag,
         f.last_modified, f.content_hash, f.consecutive_failures
    from public.calendar_feeds f
    join public.listings l on l.id = f.listing_id
   where f.is_active
     and f.next_sync_at <= now()
     -- A feed that has failed 12 times in a row is broken, not slow.
     -- Stop spending on it until a human re-enables it.
     and f.consecutive_failures < 12
     and coalesce(l.is_active, true)
   order by f.next_sync_at asc, f.priority asc
   limit greatest(1, least(200, coalesce(p_limit, 40)));
$$;


-- ── 12 · THE HOST'S OWN BLOCKS ───────────────────────────────────────

create or replace function public.cabana_calendar_manual_block(
  p_listing_id uuid,
  p_start      date,
  p_end        date,
  p_note       text default null,
  p_kind       text default 'manual'
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, extensions
as $$
declare
  v_id  uuid;
  v_uid text;
  v_clash text;
begin
  if not public.cabana_calendar_operator(p_listing_id) then
    raise exception 'not_your_listing' using errcode = '42501';
  end if;
  if p_end <= p_start then
    raise exception 'end_must_follow_start' using errcode = '22023';
  end if;
  if p_kind not in ('manual','maintenance') then
    raise exception 'kind_must_be_manual_or_maintenance' using errcode = '22023';
  end if;

  -- Blocking nights a guest has already paid for is not a calendar edit,
  -- it is a cancellation, and it goes through the cancellation flow where
  -- the guest gets told and refunded.
  select h.booking_ref into v_clash
    from public.listing_holds h
   where h.listing_id = p_listing_id
     and h.released_at is null
     and h.stay && daterange(p_start, p_end, '[)')
   limit 1;

  if v_clash is not null then
    return jsonb_build_object('ok', false, 'error', 'booked',
                              'booking_ref', v_clash);
  end if;

  v_uid := 'manual-' || encode(extensions.gen_random_bytes(8), 'hex');

  insert into public.calendar_blocks
         (listing_id, feed_id, external_uid, start_date, end_date, kind,
          platform, source, summary, note, created_by, is_active, synced_at)
  values (p_listing_id, null, v_uid, p_start, p_end, p_kind,
          'cabana', 'host',
          case when p_kind = 'maintenance' then 'Maintenance' else 'Blocked by host' end,
          left(p_note, 500), auth.uid(), true, now())
  returning id into v_id;

  return jsonb_build_object('ok', true, 'block_id', v_id, 'uid', v_uid);
end;
$$;


create or replace function public.cabana_calendar_unblock(p_block_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, extensions
as $$
declare v_row public.calendar_blocks%rowtype;
begin
  select * into v_row from public.calendar_blocks where id = p_block_id;
  if not found then
    return jsonb_build_object('ok', true, 'already_gone', true);
  end if;
  if not public.cabana_calendar_operator(v_row.listing_id) then
    raise exception 'not_your_listing' using errcode = '42501';
  end if;

  -- An imported block is the other platform's statement, not ours. We do
  -- not get to delete it: it would return on the next poll, and in the
  -- meantime we would have sold a night somebody else is sleeping in.
  if v_row.feed_id is not null then
    return jsonb_build_object('ok', false, 'error', 'channel_owned',
      'detail', 'This range came from a connected calendar. Cancel it there, or disconnect the feed.');
  end if;

  delete from public.calendar_blocks where id = p_block_id;
  return jsonb_build_object('ok', true);
end;
$$;


create or replace function public.cabana_calendar_resolve_conflict(
  p_conflict_id uuid,
  p_resolution  text default 'acknowledged',
  p_status      text default 'resolved'
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, extensions
as $$
declare v_listing uuid;
begin
  select listing_id into v_listing from public.calendar_conflicts where id = p_conflict_id;
  if v_listing is null then
    raise exception 'unknown_conflict' using errcode = 'P0002';
  end if;
  if not public.cabana_calendar_operator(v_listing) then
    raise exception 'not_your_listing' using errcode = '42501';
  end if;
  if p_status not in ('resolved','ignored','open') then
    raise exception 'bad_status' using errcode = '22023';
  end if;

  update public.calendar_conflicts
     set status      = p_status,
         resolution  = left(p_resolution, 300),
         resolved_at = case when p_status = 'open' then null else now() end,
         resolved_by = case when p_status = 'open' then null else auth.uid() end
   where id = p_conflict_id;

  return jsonb_build_object('ok', true);
end;
$$;


-- ── 13 · ONE READ FOR THE WHOLE PAGE ─────────────────────────────────
-- The host calendar needs settings, feeds, health, blocks, bookings and
-- conflicts. Six round trips on a Nairobi 3G connection is a page that
-- feels broken, so it is one.

create or replace function public.cabana_calendar_overview(
  p_listing_id uuid,
  p_from       date default (current_date - 7),
  p_to         date default (current_date + 365)
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, extensions
as $$
declare
  v_cal public.listing_calendar_settings%rowtype;
  v_out jsonb;
begin
  if not public.cabana_calendar_operator(p_listing_id) then
    raise exception 'not_your_listing' using errcode = '42501';
  end if;

  v_cal := public.cabana_calendar_settings(p_listing_id);

  select jsonb_build_object(
    'ok', true,
    'listing', (select jsonb_build_object(
                  'id', l.id, 'title', l.title, 'city', l.city,
                  'country', l.country, 'is_active', l.is_active,
                  'checkin_time', l.checkin_time, 'checkout_time', l.checkout_time)
                  from public.listings l where l.id = p_listing_id),
    'settings', jsonb_build_object(
      'export_token',     v_cal.export_token,
      'export_enabled',   v_cal.export_enabled,
      'export_scope',     v_cal.export_scope,
      'show_guest_names', v_cal.show_guest_names,
      'timezone',         v_cal.timezone,
      'turnover_days',    v_cal.turnover_days,
      'horizon_days',     v_cal.horizon_days,
      'history_days',     v_cal.history_days,
      'block_on_import',  v_cal.block_on_import,
      'alert_on_conflict',v_cal.alert_on_conflict,
      'export_fetch_count', v_cal.export_fetch_count,
      'export_last_fetched_at', v_cal.export_last_fetched_at,
      'export_last_agent',  v_cal.export_last_agent,
      'token_rotated_at',   v_cal.token_rotated_at),
    'feeds', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', f.id, 'platform', f.platform, 'label', f.label,
               'url', f.url, 'is_active', f.is_active,
               'interval', f.sync_interval_minutes,
               'last_synced_at', f.last_synced_at,
               'last_success_at', f.last_success_at,
               'next_sync_at', f.next_sync_at,
               'status', f.last_status, 'error', f.last_error,
               'failures', f.consecutive_failures,
               'events', f.last_event_count,
               'blocks', f.last_block_count,
               -- Health is a judgement, and it belongs next to the data
               -- rather than re-derived differently in each client.
               'health', case
                 when not f.is_active                     then 'paused'
                 when f.consecutive_failures >= 12        then 'dead'
                 when f.consecutive_failures >= 3         then 'failing'
                 when f.last_success_at is null           then 'pending'
                 when f.last_success_at < now() - interval '24 hours' then 'stale'
                 else 'healthy' end)
             order by f.priority, f.created_at)
        from public.calendar_feeds f where f.listing_id = p_listing_id), '[]'::jsonb),
    'ranges', coalesce((
      select jsonb_agg(jsonb_build_object(
               'source', r.source, 'kind', r.kind, 'platform', r.platform,
               'start', r.start_date, 'end', r.end_date,
               'label', r.label, 'ref', r.ref, 'block_id', r.block_id))
        from public.cabana_calendar_ranges(p_listing_id, p_from, p_to) r), '[]'::jsonb),
    'conflicts', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', c.id, 'platform', c.platform, 'booking_ref', c.booking_ref,
               'start', lower(c.overlap), 'end', upper(c.overlap),
               'severity', c.severity, 'status', c.status,
               'detected_at', c.detected_at)
             order by c.detected_at desc)
        from public.calendar_conflicts c
       where c.listing_id = p_listing_id and c.status = 'open'), '[]'::jsonb),
    'recent_runs', coalesce((
      select jsonb_agg(jsonb_build_object(
               'feed_id', s.feed_id, 'at', s.started_at, 'outcome', s.outcome,
               'http', s.http_status, 'parsed', s.events_parsed,
               'created', s.blocks_created, 'dropped', s.blocks_dropped,
               'error', s.error, 'ms', s.duration_ms)
             order by s.started_at desc)
        from (select * from public.calendar_sync_runs
               where listing_id = p_listing_id
               order by started_at desc limit 20) s), '[]'::jsonb)
  ) into v_out;

  return v_out;
end;
$$;


-- Every listing a host operates, with just enough health to decide where
-- to click. Powers the calendar picker and the dashboard warning badge.
create or replace function public.cabana_calendar_my_listings()
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public, extensions
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'id', l.id,
           'title', coalesce(l.title, 'Untitled listing'),
           'city', l.city,
           'country', l.country,
           'is_active', l.is_active,
           'service', l.service,
           'feeds', (select count(*) from public.calendar_feeds f
                      where f.listing_id = l.id and f.is_active),
           'failing', (select count(*) from public.calendar_feeds f
                        where f.listing_id = l.id and f.is_active
                          and f.consecutive_failures >= 3),
           'conflicts', (select count(*) from public.calendar_conflicts c
                          where c.listing_id = l.id and c.status = 'open'),
           'export_on', coalesce((select lc.export_enabled
                                    from public.listing_calendar_settings lc
                                   where lc.listing_id = l.id), false))
         order by l.title), '[]'::jsonb)
    from public.listings l
   where (l.partner_id = auth.uid() or l.host_id = auth.uid()
          or exists (select 1 from public.listing_partners lp
                      where lp.listing_id = l.id and lp.user_id = auth.uid()
                        and lp.status = 'active'))
     and lower(coalesce(l.service, 'stays')) in ('stays','stay','apartments');
$$;


-- ── 14 · ROW LEVEL SECURITY ──────────────────────────────────────────
-- Reads are scoped to the people who operate the listing. Writes go
-- through the security-definer functions above and nowhere else, so a
-- stolen anon key cannot invent a block, a feed, or a token.

alter table public.listing_calendar_settings   enable row level security;
alter table public.calendar_feeds      enable row level security;
alter table public.calendar_blocks     enable row level security;
alter table public.calendar_sync_runs  enable row level security;
alter table public.calendar_conflicts  enable row level security;

do $$
declare t text;
begin
  foreach t in array array['listing_calendar_settings','calendar_feeds','calendar_blocks',
                           'calendar_sync_runs','calendar_conflicts']
  loop
    execute format('drop policy if exists %I on public.%I', t || '_read_own', t);
    execute format('drop policy if exists %I on public.%I', t || '_no_write', t);

    execute format($p$
      create policy %I on public.%I
        for select to authenticated
        using (public.cabana_calendar_operator(listing_id))
    $p$, t || '_read_own', t);

    -- No INSERT policy at all would be enough; this is here so the
    -- intent survives somebody later adding a permissive one by habit.
    execute format($p$
      create policy %I on public.%I
        for insert to authenticated with check (false)
    $p$, t || '_no_write', t);
  end loop;
end $$;


-- ── 14b · CLOSING A LIVE HOLE IN calendar_blocks ─────────────────────
-- Three policies from the original implementation granted PUBLIC — which
-- includes `anon`, whose key ships in the browser on every page — blanket
-- access to this table:
--
--   "read calendar blocks"    SELECT  using (true)
--   "insert calendar blocks"  INSERT  with check (true)
--   "update calendar blocks"  UPDATE  using (true)
--
-- RLS policies are OR'd, so the restrictive `with check (false)` added
-- above them changes nothing: one permissive policy on the same command
-- still grants the row.
--
-- With a key anyone can read out of the page source, that allowed reading
-- every host's calendar, inserting an arbitrary block onto any listing,
-- and rewriting any existing block.
--
-- It gets materially worse in this release. Until now calendar_blocks was
-- written by imports and read by NOTHING, so a forged row was cosmetic.
-- cabana_dates_available() now consults it, which turns "write any row"
-- into "make any listing on the marketplace unbookable".
--
-- Nothing legitimate depends on them: every write goes through the
-- service role or a security-definer function, and every read goes
-- through cabana_calendar_overview / cabana_calendar_ranges.
drop policy if exists "read calendar blocks"   on public.calendar_blocks;
drop policy if exists "insert calendar blocks" on public.calendar_blocks;
drop policy if exists "update calendar blocks" on public.calendar_blocks;

-- With no table-level grant, a future permissive policy cannot re-open
-- this on its own. listing_calendar_settings matters most: it holds the
-- export tokens, and a token IS the credential for the public feed.
revoke all on public.calendar_blocks           from anon;
revoke all on public.listing_calendar_settings from anon;
revoke all on public.calendar_feeds            from anon;
revoke all on public.calendar_sync_runs        from anon;
revoke all on public.calendar_conflicts        from anon;


-- ── 15 · EXECUTION RIGHTS ────────────────────────────────────────────
-- Three of these are service-role only and it matters which three.
-- cabana_calendar_export increments a counter and reads by token: exposed
-- to anon it becomes a token oracle. apply_sync writes the calendar.
-- due_feeds enumerates every host's feed URLs.

revoke all on function public.cabana_calendar_export(text,text)              from public, anon, authenticated;
revoke all on function public.cabana_calendar_apply_sync(uuid,jsonb,jsonb)   from public, anon, authenticated;
revoke all on function public.cabana_calendar_due_feeds(integer)             from public, anon, authenticated;
grant  execute on function public.cabana_calendar_export(text,text)            to service_role;
grant  execute on function public.cabana_calendar_apply_sync(uuid,jsonb,jsonb) to service_role;
grant  execute on function public.cabana_calendar_due_feeds(integer)           to service_role;

revoke all on function public.cabana_calendar_ranges(uuid,date,date)         from public, anon;
grant  execute on function public.cabana_calendar_ranges(uuid,date,date)       to authenticated, service_role;

-- Postgres grants EXECUTE on a new function to PUBLIC by default, and
-- `anon` is a member of PUBLIC. So a bare `grant ... to authenticated`
-- ADDS a role without removing one, and every function below stays
-- callable with the anon key that ships in the browser.
--
-- Each of them already refuses an unauthenticated caller —
-- cabana_calendar_operator() compares against auth.uid(), which is NULL
-- for anon, and NULL = NULL is not true. This closes no live hole. It is
-- still worth doing: right now a single ownership check is all that
-- stands between the public internet and a SECURITY DEFINER function
-- that writes calendars, and the day somebody relaxes one of those
-- checks the blast radius should be signed-in hosts.
revoke execute on function public.cabana_calendar_operator(uuid)                         from public, anon;
revoke execute on function public.cabana_calendar_settings(uuid)                         from public, anon;
revoke execute on function public.cabana_calendar_update_settings(uuid,jsonb)            from public, anon;
revoke execute on function public.cabana_calendar_rotate_token(uuid)                     from public, anon;
revoke execute on function public.cabana_calendar_add_feed(uuid,text,text,text,integer)  from public, anon;
revoke execute on function public.cabana_calendar_update_feed(uuid,jsonb)                from public, anon;
revoke execute on function public.cabana_calendar_remove_feed(uuid)                      from public, anon;
revoke execute on function public.cabana_calendar_manual_block(uuid,date,date,text,text) from public, anon;
revoke execute on function public.cabana_calendar_unblock(uuid)                          from public, anon;
revoke execute on function public.cabana_calendar_resolve_conflict(uuid,text,text)       from public, anon;
revoke execute on function public.cabana_calendar_overview(uuid,date,date)               from public, anon;
revoke execute on function public.cabana_calendar_my_listings()                          from public, anon;
revoke execute on function public.cabana_dates_available(uuid,date,date,text)            from public, anon;

-- A trigger function is invoked by its trigger, never by a caller.
revoke execute on function public.cabana_calendar_block_range() from public, anon, authenticated;

grant execute on function public.cabana_calendar_operator(uuid)                to authenticated, service_role;
grant execute on function public.cabana_calendar_settings(uuid)                to authenticated, service_role;
grant execute on function public.cabana_calendar_update_settings(uuid,jsonb)   to authenticated, service_role;
grant execute on function public.cabana_calendar_rotate_token(uuid)            to authenticated, service_role;
grant execute on function public.cabana_calendar_add_feed(uuid,text,text,text,integer) to authenticated, service_role;
grant execute on function public.cabana_calendar_update_feed(uuid,jsonb)       to authenticated, service_role;
grant execute on function public.cabana_calendar_remove_feed(uuid)             to authenticated, service_role;
grant execute on function public.cabana_calendar_manual_block(uuid,date,date,text,text) to authenticated, service_role;
grant execute on function public.cabana_calendar_unblock(uuid)                 to authenticated, service_role;
grant execute on function public.cabana_calendar_resolve_conflict(uuid,text,text) to authenticated, service_role;
grant execute on function public.cabana_calendar_overview(uuid,date,date)      to authenticated, service_role;
grant execute on function public.cabana_calendar_my_listings()                 to authenticated, service_role;

-- Unchanged callers, unchanged rights. Both now answer with channel data.
grant execute on function public.cabana_dates_available(uuid,date,date,text)   to authenticated, service_role;
revoke execute on function public.cabana_listing_calendar(uuid,date,date)     from public;
grant execute on function public.cabana_listing_calendar(uuid,date,date)       to anon, authenticated, service_role;


-- ── 16 · HOUSEKEEPING ────────────────────────────────────────────────
-- Sync runs accumulate at roughly 24 rows per feed per day. Left alone
-- that is a million-row table inside a year, and nobody has ever needed
-- an answer from the third week of last month.

create or replace function public.cabana_calendar_prune(p_days integer default 30)
returns integer
language plpgsql
security definer
set search_path = pg_catalog, public, extensions
as $$
declare v_n integer;
begin
  with gone as (
    delete from public.calendar_sync_runs
     where started_at < now() - (greatest(3, coalesce(p_days, 30)) || ' days')::interval
    returning 1
  )
  select count(*) into v_n from gone;

  -- Dropped blocks whose nights are long past teach us nothing.
  delete from public.calendar_blocks
   where is_active = false
     and dropped_at < now() - interval '90 days'
     and end_date   < current_date - 30;

  return v_n;
end;
$$;

revoke all on function public.cabana_calendar_prune(integer) from public, anon, authenticated;
grant  execute on function public.cabana_calendar_prune(integer) to service_role;


-- ── 17 · BACKFILL ────────────────────────────────────────────────────
-- Every live stay listing gets a calendar row and a token now, so the
-- first host to open the page finds a working URL rather than a spinner.

insert into public.listing_calendar_settings (listing_id)
select l.id from public.listings l
 where lower(coalesce(l.service, 'stays')) in ('stays','stay','apartments')
on conflict (listing_id) do nothing;

-- Rows written by the previous implementation have no feed and no kind.
-- They came from a real external calendar, so they are 'blocked' rather
-- than host-manual, and they must not masquerade as something a host can
-- delete from our side.
update public.calendar_blocks
   set kind     = 'blocked',
       platform = coalesce(platform, source, 'other')
 where kind = 'reservation'
   and feed_id is null
   and coalesce(source, '') <> 'host';


-- ── 18 · THE SCHEDULER ───────────────────────────────────────────────
-- This project deploys on Vercel Hobby, where cron jobs are capped at TWO
-- and fire ONCE A DAY. vercel.json already spends both on closing
-- bookings and reconciling payments.
--
-- A daily calendar sync is not a slow calendar sync, it is a broken one:
-- it means up to 24 hours in which an Airbnb guest has booked a night we
-- are still selling. The whole point of this feature is that the window
-- is minutes, not a day.
--
-- Postgres already has a scheduler, and for this job it is the better
-- one: pg_cron fires on time regardless of hosting plan, and pg_net makes
-- the call asynchronously so a slow endpoint cannot pin a connection.
--
-- ONE MANUAL STEP after deploying, using the same value as the
-- CRON_SECRET environment variable on Vercel:
--
--   insert into cabana_ops.cron_config (key, value)
--   values ('cron_secret', '<your CRON_SECRET>')
--   on conflict (key) do update set value = excluded.value, updated_at = now();
--
-- Until that row exists the job runs and deliberately does nothing, so
-- the endpoint is never called unauthenticated.

create schema if not exists cabana_ops;
revoke all on schema cabana_ops from public, anon, authenticated;

-- Outside `public` and with no grants, so PostgREST cannot expose it:
-- neither the anon key nor a signed-in user can read the secret.
create table if not exists cabana_ops.cron_config (
  key        text primary key,
  value      text not null,
  updated_at timestamptz not null default now()
);
revoke all on cabana_ops.cron_config from public, anon, authenticated;

insert into cabana_ops.cron_config (key, value)
values ('calendar_sync_url', 'https://cabana.africa/api/calendar-cron')
on conflict (key) do nothing;

create or replace function cabana_ops.trigger_calendar_sync()
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, extensions, net
as $$
declare
  v_url    text;
  v_secret text;
begin
  select value into v_url    from cabana_ops.cron_config where key = 'calendar_sync_url';
  select value into v_secret from cabana_ops.cron_config where key = 'cron_secret';

  -- A job that quietly 401s every fifteen minutes is worse than one that
  -- has plainly not been set up yet.
  if v_url is null or v_secret is null or v_secret = '' then
    return;
  end if;

  perform net.http_get(
    url     := v_url || '?limit=60',
    headers := jsonb_build_object(
                 'Authorization', 'Bearer ' || v_secret,
                 'User-Agent',    'Cabana-Scheduler/1.0'),
    timeout_milliseconds := 55000
  );
end;
$$;

revoke all on function cabana_ops.trigger_calendar_sync() from public, anon, authenticated;

-- Every 15 minutes. Each feed carries its own sync_interval_minutes and
-- next_sync_at, so this tick only wakes the ones actually due: an hourly
-- feed still polls hourly, this just decides how promptly "hourly" is
-- noticed.
select cron.unschedule('cabana-calendar-sync')
 where exists (select 1 from cron.job where jobname = 'cabana-calendar-sync');

select cron.schedule(
  'cabana-calendar-sync',
  '*/15 * * * *',
  $job$select cabana_ops.trigger_calendar_sync()$job$
);
