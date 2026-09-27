-- ═══════════════════════════════════════════════════════════════════
--  CABANA LIVE · events, live shows, movies, series and music
--  ─────────────────────────────────────────────────────────────────
--  /events stops being a ticket board and becomes a streaming and
--  events platform: a billboard, rows of titles, live shows, a music
--  room and ticketed nights, all uploaded from the console.
--
--  What lives here
--    live_titles      movies, series, live shows and specials
--    live_episodes    a series' seasons and episodes
--    live_media       WHAT actually plays. Separate and admin-only, so
--                     a premium file or stream URL is never readable
--                     by browsing the catalogue. live_play() hands it
--                     out after checking who is asking.
--    live_billboard   the hero slides at the top of each tab
--    live_settings    the one row that decides premium access
--    live_passes      who has premium, and until when
--    live_saves       My List and "remind me"
--    live_plays       what was watched, for the console
--    music_sources    YouTube channels and playlists the room follows
--    music_releases   new uploads from those sources
--    music_playlists  curated playlists (+ items)
--
--  Premium launches as ONE MONTH FREE per member. A signed-in member
--  claims it once (live_start_trial) and gets a 30-day pass. The
--  console can also open everything to everyone, grant passes, and
--  set a price later without a deploy.
--
--  The paywall is enforced in two places, both in the database:
--    · live_play() refuses to return a premium source to someone
--      without a pass.
--    · uploaded premium files sit in the PRIVATE live-media bucket,
--      and storage RLS asks live_object_readable() for every object.
-- ═══════════════════════════════════════════════════════════════════

-- ── 0 · SMALL SHARED CHECKS ────────────────────────────────────────
create or replace function public.live_url_ok(p text)
returns boolean
language sql
immutable
set search_path = pg_catalog
as $$
  select p is null or (length(p) <= 2048 and p ~* '^https://[^\s"''<>\\]+$');
$$;

create or replace function public.live_link_ok(p text)
returns boolean
language sql
immutable
set search_path = pg_catalog
as $$
  select p is null or (length(p) <= 2048 and (p ~ '^/[^\s"''<>\\]*$' or p ~* '^https://[^\s"''<>\\]+$'));
$$;

-- ── 1 · TITLES ─────────────────────────────────────────────────────
create table if not exists public.live_titles (
  id              uuid primary key default gen_random_uuid(),
  slug            text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{0,78}[a-z0-9]$'),
  kind            text not null default 'movie' check (kind in ('movie', 'show', 'live', 'special')),
  title           text not null check (length(btrim(title)) between 1 and 140),
  tagline         text check (tagline is null or length(tagline) <= 180),
  synopsis        text check (synopsis is null or length(synopsis) <= 5000),
  genres          text[] not null default '{}' check (cardinality(genres) <= 8),
  maturity        text check (maturity is null or maturity in ('G', 'PG', '13+', '16+', '18+')),
  year            smallint check (year is null or year between 1900 and 2100),
  runtime_min     integer check (runtime_min is null or runtime_min between 1 and 1440),
  language        text check (language is null or length(language) <= 40),
  country         text check (country is null or length(country) <= 60),
  cast_list       jsonb not null default '[]'::jsonb check (jsonb_typeof(cast_list) = 'array'),
  credits         text check (credits is null or length(credits) <= 400),
  poster_url      text check (public.live_url_ok(poster_url)),
  backdrop_url    text check (public.live_url_ok(backdrop_url)),
  logo_url        text check (public.live_url_ok(logo_url)),
  trailer_url     text check (public.live_url_ok(trailer_url)),
  trailer_youtube text check (trailer_youtube is null or trailer_youtube ~ '^[A-Za-z0-9_-]{11}$'),
  accent          text check (accent is null or accent ~ '^#[0-9a-fA-F]{6}$'),
  badge           text check (badge is null or length(badge) <= 24),
  available_on    text check (available_on is null or length(available_on) <= 60),
  external_url    text check (public.live_url_ok(external_url)),
  external_label  text check (external_label is null or length(external_label) <= 40),
  access          text not null default 'premium' check (access in ('free', 'premium')),
  status          text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  featured        boolean not null default false,
  sort_order      integer not null default 0,
  release_at      timestamptz,
  live_starts_at  timestamptz,
  live_ends_at    timestamptz,
  replay          boolean not null default true,
  event_id        bigint references public.events(id) on delete set null,
  published_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint live_titles_live_window_ck
    check (live_ends_at is null or live_starts_at is null or live_ends_at > live_starts_at),
  constraint live_titles_live_needs_start_ck
    check (kind <> 'live' or status <> 'published' or live_starts_at is not null)
);

create index if not exists live_titles_shelf_idx
  on public.live_titles (kind, featured desc, sort_order desc, published_at desc)
  where status = 'published';
create index if not exists live_titles_event_idx
  on public.live_titles (event_id) where event_id is not null;

-- ── 2 · EPISODES ───────────────────────────────────────────────────
create table if not exists public.live_episodes (
  id          uuid primary key default gen_random_uuid(),
  title_id    uuid not null references public.live_titles(id) on delete cascade,
  season      smallint not null default 1 check (season between 1 and 99),
  number      smallint not null default 1 check (number between 1 and 999),
  name        text not null check (length(btrim(name)) between 1 and 140),
  synopsis    text check (synopsis is null or length(synopsis) <= 2000),
  runtime_min integer check (runtime_min is null or runtime_min between 1 and 1440),
  still_url   text check (public.live_url_ok(still_url)),
  access      text check (access is null or access in ('free', 'premium')),
  air_at      timestamptz,
  status      text not null default 'published' check (status in ('draft', 'published')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (title_id, season, number)
);
create index if not exists live_episodes_title_idx on public.live_episodes (title_id, season, number);

-- ── 3 · MEDIA (what plays) ─────────────────────────────────────────
--  upload   a private object in live-media, path t/<title>/… or
--           t/<title>/e/<episode>/…
--  hls      an https .m3u8 (a CDN or a live encoder)
--  mp4      an https progressive file
--  youtube  an 11-character video id (a premiere, a free film)
--  embed    an https player URL from a partner platform
create table if not exists public.live_media (
  id          uuid primary key default gen_random_uuid(),
  title_id    uuid not null references public.live_titles(id) on delete cascade,
  episode_id  uuid references public.live_episodes(id) on delete cascade,
  source      text not null check (source in ('upload', 'hls', 'mp4', 'youtube', 'embed')),
  ref         text not null check (length(ref) between 3 and 2048),
  duration_s  integer check (duration_s is null or duration_s between 0 and 172800),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint live_media_upload_path_ck check (
    source <> 'upload' or (
      ref like 't/' || title_id::text || '/%'
      and (episode_id is null or ref like 't/' || title_id::text || '/e/' || episode_id::text || '/%')
      and ref !~ '\.\.'
    )),
  constraint live_media_url_ck check (source not in ('hls', 'mp4', 'embed') or public.live_url_ok(ref)),
  constraint live_media_youtube_ck check (source <> 'youtube' or ref ~ '^[A-Za-z0-9_-]{11}$')
);
create unique index if not exists live_media_one_per_slot
  on public.live_media (title_id, coalesce(episode_id, '00000000-0000-0000-0000-000000000000'::uuid));

-- ── 4 · BILLBOARD ──────────────────────────────────────────────────
create table if not exists public.live_billboard (
  id                uuid primary key default gen_random_uuid(),
  placements        text[] not null default '{home}'
                    check (cardinality(placements) >= 1
                           and placements <@ array['home', 'events', 'live', 'movies', 'shows', 'music']::text[]),
  kind              text not null default 'custom' check (kind in ('custom', 'event', 'title', 'track')),
  ref               text check (ref is null or length(ref) <= 64),
  kicker            text check (kicker is null or length(kicker) <= 40),
  headline          text check (headline is null or length(headline) <= 120),
  subline           text check (subline is null or length(subline) <= 280),
  logo_url          text check (public.live_url_ok(logo_url)),
  media_kind        text not null default 'image' check (media_kind in ('image', 'video', 'youtube')),
  media_url         text,
  media_mobile_url  text check (public.live_url_ok(media_mobile_url)),
  poster_url        text check (public.live_url_ok(poster_url)),
  venue             text check (venue is null or length(venue) <= 120),
  when_at           timestamptz,
  available_on      text check (available_on is null or length(available_on) <= 60),
  cta_label         text check (cta_label is null or length(cta_label) <= 30),
  cta_url           text check (public.live_link_ok(cta_url)),
  cta2_label        text check (cta2_label is null or length(cta2_label) <= 30),
  cta2_url          text check (public.live_link_ok(cta2_url)),
  accent            text check (accent is null or accent ~ '^#[0-9a-fA-F]{6}$'),
  premium           boolean not null default false,
  starts_at         timestamptz,
  ends_at           timestamptz,
  status            text not null default 'draft' check (status in ('draft', 'published')),
  sort_order        integer not null default 0,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint live_billboard_media_ck check (
    media_url is null
    or (media_kind = 'youtube' and media_url ~ '^[A-Za-z0-9_-]{11}$')
    or (media_kind <> 'youtube' and public.live_url_ok(media_url))),
  constraint live_billboard_window_ck check (ends_at is null or starts_at is null or ends_at > starts_at)
);
create index if not exists live_billboard_live_idx
  on public.live_billboard (sort_order desc, created_at desc) where status = 'published';

-- ── 5 · PREMIUM ────────────────────────────────────────────────────
create table if not exists public.live_settings (
  id             smallint primary key default 1 check (id = 1),
  premium_name   text not null default 'Cabana Live Premium' check (length(premium_name) between 2 and 40),
  open_to_all    boolean not null default false,
  trial_enabled  boolean not null default true,
  trial_days     integer not null default 30 check (trial_days between 1 and 365),
  price_kes      integer check (price_kes is null or price_kes between 0 and 10000000),
  price_period   text not null default 'month' check (price_period in ('week', 'month', 'year')),
  banner_title   text not null default 'Enjoy one month free access' check (length(banner_title) <= 60),
  banner_text    text not null default 'Live shows, movies, series and concerts on Cabana. Your first month is on us, no card needed.'
                 check (length(banner_text) <= 240),
  updated_at     timestamptz not null default now()
);
insert into public.live_settings (id) values (1) on conflict (id) do nothing;

create table if not exists public.live_passes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  starts_at   timestamptz not null default now(),
  expires_at  timestamptz,
  source      text not null default 'grant' check (source in ('trial', 'grant', 'purchase', 'promo')),
  note        text check (note is null or length(note) <= 400),
  granted_by  text,
  revoked_at  timestamptz,
  created_at  timestamptz not null default now()
);
create index if not exists live_passes_user_idx on public.live_passes (user_id, expires_at);
-- One free month per member, ever.
create unique index if not exists live_passes_one_trial on public.live_passes (user_id) where source = 'trial';

create table if not exists public.live_saves (
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  kind        text not null check (kind in ('title', 'event', 'track')),
  ref         text not null check (length(ref) between 1 and 64),
  remind      boolean not null default false,
  created_at  timestamptz not null default now(),
  primary key (user_id, kind, ref)
);

create table if not exists public.live_plays (
  id          bigint generated always as identity primary key,
  title_id    uuid not null references public.live_titles(id) on delete cascade,
  episode_id  uuid references public.live_episodes(id) on delete set null,
  user_id     uuid,
  seconds     integer not null default 0 check (seconds between 0 and 172800),
  completed   boolean not null default false,
  device      text check (device is null or length(device) <= 24),
  created_at  timestamptz not null default now()
);
create index if not exists live_plays_title_idx on public.live_plays (title_id, created_at desc);
create index if not exists live_plays_day_idx on public.live_plays (created_at desc);

-- ── 6 · MUSIC CATALOGUE ────────────────────────────────────────────
create table if not exists public.music_sources (
  id              uuid primary key default gen_random_uuid(),
  kind            text not null default 'channel' check (kind in ('channel', 'playlist')),
  external_id     text not null unique check (external_id ~ '^[A-Za-z0-9_-]{10,80}$'),
  label           text check (label is null or length(label) <= 120),
  market          text not null default 'KE' check (market ~ '^[A-Z]{2}$'),
  auto            boolean not null default false,
  active          boolean not null default true,
  items_count     integer not null default 0,
  last_synced_at  timestamptz,
  last_error      text,
  created_at      timestamptz not null default now()
);

create table if not exists public.music_releases (
  video_id       text primary key check (video_id ~ '^[A-Za-z0-9_-]{11}$'),
  source_id      uuid references public.music_sources(id) on delete set null,
  channel_id     text,
  market         text not null default 'KE' check (market ~ '^[A-Z]{2}$'),
  title          text not null,
  artist         text not null,
  thumbnail_url  text,
  published_at   timestamptz,
  views          bigint not null default 0 check (views >= 0),
  likes          bigint not null default 0 check (likes >= 0),
  views_delta    bigint not null default 0 check (views_delta >= 0),
  velocity       numeric not null default 0,
  genre          text not null default 'other',
  culture        text,
  format         text not null default 'track',
  active         boolean not null default true,
  first_seen_at  timestamptz not null default now(),
  refreshed_at   timestamptz not null default now()
);
create index if not exists music_releases_recent_idx on public.music_releases (market, published_at desc) where active;

create or replace view public.music_releases_public
with (security_invoker = true)
as
select video_id, market, title, artist, thumbnail_url, published_at, views, likes,
       views_delta, velocity, genre, culture, format, refreshed_at
  from public.music_releases
 where active and published_at > now() - interval '120 days';

create table if not exists public.music_playlists (
  id           uuid primary key default gen_random_uuid(),
  slug         text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{0,78}[a-z0-9]$'),
  title        text not null check (length(btrim(title)) between 1 and 80),
  description  text check (description is null or length(description) <= 280),
  cover_url    text check (public.live_url_ok(cover_url)),
  accent       text check (accent is null or accent ~ '^#[0-9a-fA-F]{6}$'),
  mood         text check (mood is null or length(mood) <= 24),
  kind         text not null default 'editorial' check (kind in ('editorial', 'mood', 'party', 'artist', 'genre')),
  status       text not null default 'draft' check (status in ('draft', 'published')),
  featured     boolean not null default false,
  sort_order   integer not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table if not exists public.music_playlist_items (
  playlist_id       uuid not null references public.music_playlists(id) on delete cascade,
  video_id          text not null check (video_id ~ '^[A-Za-z0-9_-]{11}$'),
  title             text not null check (length(title) between 1 and 200),
  artist            text check (artist is null or length(artist) <= 120),
  thumbnail_url     text check (public.live_url_ok(thumbnail_url)),
  duration_seconds  integer check (duration_seconds is null or duration_seconds between 0 and 86400),
  position          integer not null default 0,
  added_at          timestamptz not null default now(),
  primary key (playlist_id, video_id)
);
create index if not exists music_playlist_items_order_idx on public.music_playlist_items (playlist_id, position);

-- The console's "refresh now" button marks the board stale; the sync
-- function refreshes on its next call (the cron below makes one within
-- minutes, or the console calls it straight away).
alter table public.music_chart_meta add column if not exists force_refresh boolean not null default false;

-- ── 7 · NORMALISE ON WRITE ─────────────────────────────────────────
create or replace function public.live_touch()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create or replace function public.live_titles_normalize()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  new.slug := lower(btrim(new.slug));
  new.title := btrim(new.title);
  new.genres := coalesce(array(
    select distinct on (lower(btrim(g))) btrim(g)
      from unnest(coalesce(new.genres, '{}')) g
     where length(btrim(g)) between 1 and 32), '{}');
  if new.status = 'published' and new.published_at is null then
    new.published_at := now();
  end if;
  new.updated_at := now();
  return new;
end;
$$;

-- An episode's media must belong to that episode's own series.
create or replace function public.live_media_guard()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if new.episode_id is not null and not exists (
    select 1 from public.live_episodes e where e.id = new.episode_id and e.title_id = new.title_id
  ) then
    raise exception 'live_media_episode_mismatch' using errcode = '23514';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists live_titles_normalize on public.live_titles;
create trigger live_titles_normalize before insert or update on public.live_titles
  for each row execute function public.live_titles_normalize();
drop trigger if exists live_episodes_touch on public.live_episodes;
create trigger live_episodes_touch before update on public.live_episodes
  for each row execute function public.live_touch();
drop trigger if exists live_media_guard on public.live_media;
create trigger live_media_guard before insert or update on public.live_media
  for each row execute function public.live_media_guard();
drop trigger if exists live_billboard_touch on public.live_billboard;
create trigger live_billboard_touch before update on public.live_billboard
  for each row execute function public.live_touch();
drop trigger if exists live_settings_touch on public.live_settings;
create trigger live_settings_touch before update on public.live_settings
  for each row execute function public.live_touch();
drop trigger if exists music_playlists_touch on public.music_playlists;
create trigger music_playlists_touch before update on public.music_playlists
  for each row execute function public.live_touch();

-- ── 8 · WHO MAY WATCH ──────────────────────────────────────────────
create or replace function public.live_has_pass()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select auth.uid() is not null and exists (
    select 1 from public.live_passes p
     where p.user_id = auth.uid()
       and p.revoked_at is null
       and p.starts_at <= now()
       and (p.expires_at is null or p.expires_at > now())
  );
$$;

create or replace function public.live_can_watch(p_title uuid, p_episode uuid default null)
returns boolean
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  t public.live_titles%rowtype;
  v_access text;
  v_ep_access text;
  v_ep_status text;
begin
  if p_title is null then return false; end if;
  if public.is_admin() then return true; end if;
  select * into t from public.live_titles where id = p_title;
  if not found or t.status <> 'published' then return false; end if;
  if t.release_at is not null and t.release_at > now() then return false; end if;
  v_access := t.access;
  if p_episode is not null then
    select e.access, e.status into v_ep_access, v_ep_status
      from public.live_episodes e where e.id = p_episode and e.title_id = p_title;
    if not found or v_ep_status <> 'published' then return false; end if;
    v_access := coalesce(v_ep_access, v_access);
  end if;
  if v_access = 'free' then return true; end if;
  if coalesce((select s.open_to_all from public.live_settings s where s.id = 1), false) then return true; end if;
  return public.live_has_pass();
end;
$$;

-- Storage RLS calls this for every object in the private bucket.
create or replace function public.live_object_readable(p_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  v_uuid constant text := '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
  v_title text := split_part(coalesce(p_name, ''), '/', 2);
  v_ep text := split_part(coalesce(p_name, ''), '/', 4);
begin
  if split_part(coalesce(p_name, ''), '/', 1) <> 't' or v_title !~ v_uuid then
    return public.is_admin();
  end if;
  if split_part(p_name, '/', 3) = 'e' then
    if v_ep !~ v_uuid then return public.is_admin(); end if;
    return public.live_can_watch(v_title::uuid, v_ep::uuid);
  end if;
  return public.live_can_watch(v_title::uuid, null);
end;
$$;

-- ── 9 · WHAT THE PAGE CALLS ────────────────────────────────────────
create or replace function public.live_state()
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  st public.live_settings%rowtype;
  v_uid uuid := auth.uid();
  v_exp timestamptz;
  v_src text;
  v_has boolean := false;
  v_trial_used boolean := false;
begin
  select * into st from public.live_settings where id = 1;
  if v_uid is not null then
    select p.expires_at, p.source into v_exp, v_src
      from public.live_passes p
     where p.user_id = v_uid and p.revoked_at is null and p.starts_at <= now()
       and (p.expires_at is null or p.expires_at > now())
     order by p.expires_at desc nulls first
     limit 1;
    v_has := found;
    v_trial_used := exists (select 1 from public.live_passes p where p.user_id = v_uid and p.source = 'trial');
  end if;

  return jsonb_build_object(
    'signed_in', v_uid is not null,
    'premium', v_has or coalesce(st.open_to_all, false) or public.is_admin(),
    'open_to_all', coalesce(st.open_to_all, false),
    'has_pass', v_has,
    'pass_expires_at', v_exp,
    'pass_source', v_src,
    'trial_enabled', coalesce(st.trial_enabled, true),
    'trial_days', coalesce(st.trial_days, 30),
    'trial_used', v_trial_used,
    'price_kes', st.price_kes,
    'price_period', coalesce(st.price_period, 'month'),
    'premium_name', coalesce(st.premium_name, 'Cabana Live Premium'),
    'banner_title', coalesce(st.banner_title, 'Enjoy one month free access'),
    'banner_text', coalesce(st.banner_text, ''),
    'server_time', now()
  );
end;
$$;

-- A member claims their free month. Once per member, ever. A member
-- who already holds an active pass keeps their trial for later.
create or replace function public.live_start_trial()
returns jsonb
language plpgsql
volatile
security definer
set search_path = pg_catalog, public
as $$
declare
  st public.live_settings%rowtype;
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'sign_in_required' using errcode = '28000';
  end if;
  select * into st from public.live_settings where id = 1;
  if not coalesce(st.trial_enabled, true) then
    return public.live_state() || jsonb_build_object('started', false, 'reason', 'trial_closed');
  end if;
  if exists (select 1 from public.live_passes p where p.user_id = v_uid and p.source = 'trial') then
    return public.live_state() || jsonb_build_object('started', false, 'reason', 'trial_used');
  end if;
  if public.live_has_pass() then
    return public.live_state() || jsonb_build_object('started', false, 'reason', 'already_premium');
  end if;

  insert into public.live_passes (user_id, starts_at, expires_at, source, note)
  values (v_uid, now(), now() + make_interval(days => coalesce(st.trial_days, 30)), 'trial', 'Free month')
  on conflict do nothing;

  return public.live_state() || jsonb_build_object('started', true);
end;
$$;

-- Hands out what to play, after checking who is asking. For an upload
-- it returns the storage path; the browser still needs a signed URL,
-- and storage RLS checks again.
create or replace function public.live_play(p_title uuid, p_episode uuid default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  t public.live_titles%rowtype;
  st public.live_settings%rowtype;
  v_ep uuid := p_episode;
  m public.live_media%rowtype;
  v_admin boolean := public.is_admin();
begin
  select * into t from public.live_titles where id = p_title;
  if not found or (t.status <> 'published' and not v_admin) then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;
  if t.release_at is not null and t.release_at > now() and not v_admin then
    return jsonb_build_object('ok', false, 'reason', 'coming_soon', 'release_at', t.release_at);
  end if;
  if t.kind = 'live' and not v_admin then
    if t.live_starts_at is not null and t.live_starts_at > now() + interval '15 minutes' then
      return jsonb_build_object('ok', false, 'reason', 'not_started', 'starts_at', t.live_starts_at);
    end if;
    if t.live_ends_at is not null and t.live_ends_at < now() and not t.replay then
      return jsonb_build_object('ok', false, 'reason', 'ended');
    end if;
  end if;

  if t.kind = 'show' and v_ep is null then
    select e.id into v_ep from public.live_episodes e
     where e.title_id = t.id and e.status = 'published'
     order by e.season, e.number limit 1;
  end if;

  if not public.live_can_watch(t.id, v_ep) then
    select * into st from public.live_settings where id = 1;
    return jsonb_build_object(
      'ok', false,
      'reason', case when auth.uid() is null then 'signin' else 'premium' end,
      'trial_available', coalesce(st.trial_enabled, true) and not exists (
        select 1 from public.live_passes p where p.user_id = auth.uid() and p.source = 'trial'),
      'episode_id', v_ep);
  end if;

  select * into m from public.live_media
   where title_id = t.id and episode_id is not distinct from v_ep limit 1;
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'no_media', 'episode_id', v_ep);
  end if;

  return jsonb_build_object('ok', true, 'source', m.source, 'ref', m.ref,
                            'episode_id', v_ep, 'duration_s', m.duration_s);
end;
$$;

create or replace function public.live_log_play(
  p_title uuid, p_episode uuid default null, p_seconds integer default 0,
  p_completed boolean default false, p_device text default null)
returns void
language plpgsql
volatile
security definer
set search_path = pg_catalog, public
as $$
begin
  if not exists (select 1 from public.live_titles where id = p_title and status = 'published') then
    return;
  end if;
  insert into public.live_plays (title_id, episode_id, user_id, seconds, completed, device)
  values (p_title,
          case when exists (select 1 from public.live_episodes e where e.id = p_episode and e.title_id = p_title)
               then p_episode end,
          auth.uid(),
          greatest(0, least(coalesce(p_seconds, 0), 172800)),
          coalesce(p_completed, false),
          left(nullif(btrim(coalesce(p_device, '')), ''), 24));
end;
$$;

-- ── 10 · CONSOLE ───────────────────────────────────────────────────
create or replace function public.admin_live_overview()
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
begin
  if not public.is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  return jsonb_build_object(
    'counts', jsonb_build_object(
      'published', (select count(*) from public.live_titles where status = 'published'),
      'draft', (select count(*) from public.live_titles where status = 'draft'),
      'movie', (select count(*) from public.live_titles where kind = 'movie' and status <> 'archived'),
      'show', (select count(*) from public.live_titles where kind = 'show' and status <> 'archived'),
      'live', (select count(*) from public.live_titles where kind = 'live' and status <> 'archived'),
      'special', (select count(*) from public.live_titles where kind = 'special' and status <> 'archived'),
      'live_now', (select count(*) from public.live_titles where kind = 'live' and status = 'published'
                     and live_starts_at <= now() and (live_ends_at is null or live_ends_at > now())),
      'billboard', (select count(*) from public.live_billboard where status = 'published'
                      and (starts_at is null or starts_at <= now()) and (ends_at is null or ends_at > now())),
      'playlists', (select count(*) from public.music_playlists where status = 'published'),
      'sources', (select count(*) from public.music_sources where active)),
    'passes_active', (select count(*) from public.live_passes where revoked_at is null
                        and starts_at <= now() and (expires_at is null or expires_at > now())),
    'trials_claimed', (select count(*) from public.live_passes where source = 'trial'),
    'trials_30', (select count(*) from public.live_passes where source = 'trial' and created_at > now() - interval '30 days'),
    'plays_30', (select count(*) from public.live_plays where created_at > now() - interval '30 days'),
    'viewers_30', (select count(distinct user_id) from public.live_plays where created_at > now() - interval '30 days'),
    'seconds_30', (select coalesce(sum(seconds), 0) from public.live_plays where created_at > now() - interval '30 days'),
    'by_title', coalesce((select jsonb_object_agg(x.title_id, jsonb_build_object('plays', x.plays, 'seconds', x.seconds, 'completed', x.completed))
                   from (select title_id, count(*) plays, sum(seconds) seconds, count(*) filter (where completed) completed
                           from public.live_plays where created_at > now() - interval '30 days' group by title_id) x), '{}'::jsonb),
    'music', (select to_jsonb(m) - 'refresh_token' from public.music_chart_meta m where market = 'KE'),
    'chart_tracks', (select count(*) from public.music_chart_tracks where market = 'KE' and active),
    'releases', (select count(*) from public.music_releases_public)
  );
end;
$$;

create or replace function public.admin_live_passes()
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
begin
  if not public.is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  return jsonb_build_object('passes', (select coalesce(jsonb_agg(x order by x.created_at desc), '[]'::jsonb) from (
    select p.id, p.user_id, u.email, p.starts_at, p.expires_at, p.source, p.note, p.granted_by, p.revoked_at, p.created_at,
           (p.revoked_at is null and p.starts_at <= now() and (p.expires_at is null or p.expires_at > now())) as active
      from public.live_passes p left join auth.users u on u.id = p.user_id
     order by p.created_at desc limit 400) x));
end;
$$;

create or replace function public.admin_live_pass_action(
  p_action text, p_email text default null, p_days integer default 30,
  p_note text default null, p_pass uuid default null)
returns jsonb
language plpgsql
volatile
security definer
set search_path = pg_catalog, public
as $$
declare
  v_uid uuid;
  v_id uuid;
begin
  if not public.is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;

  if p_action = 'grant' then
    select id into v_uid from auth.users where lower(email) = lower(btrim(coalesce(p_email, ''))) limit 1;
    if v_uid is null then raise exception 'No member has that email' using errcode = 'P0002'; end if;
    insert into public.live_passes (user_id, expires_at, source, note, granted_by)
    values (v_uid,
            case when coalesce(p_days, 0) > 0 then now() + make_interval(days => least(p_days, 3650)) end,
            'grant', left(p_note, 400), auth.jwt() ->> 'email')
    returning id into v_id;
    perform cabana_admin.log('live_pass_grant', 'member', v_uid::text, jsonb_build_object('pass', v_id, 'days', p_days));
    return jsonb_build_object('ok', true, 'pass', v_id, 'user_id', v_uid);

  elsif p_action = 'revoke' then
    update public.live_passes set revoked_at = now() where id = p_pass and revoked_at is null;
    perform cabana_admin.log('live_pass_revoke', 'live_pass', p_pass::text, '{}'::jsonb);
    return jsonb_build_object('ok', true);

  elsif p_action = 'extend' then
    update public.live_passes
       set expires_at = greatest(coalesce(expires_at, now()), now()) + make_interval(days => greatest(1, least(coalesce(p_days, 30), 3650)))
     where id = p_pass and revoked_at is null;
    perform cabana_admin.log('live_pass_extend', 'live_pass', p_pass::text, jsonb_build_object('days', p_days));
    return jsonb_build_object('ok', true);
  end if;

  raise exception 'Unknown action %', p_action using errcode = '22023';
end;
$$;

create or replace function public.admin_music_refresh()
returns jsonb
language plpgsql
volatile
security definer
set search_path = pg_catalog, public
as $$
begin
  if not public.is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  update public.music_chart_meta set force_refresh = true, updated_at = now() where market = 'KE';
  perform cabana_admin.log('music_refresh', 'music_chart', 'KE', '{}'::jsonb);
  return jsonb_build_object('ok', true);
end;
$$;

-- ── 11 · ROW LEVEL SECURITY ────────────────────────────────────────
alter table public.live_titles          enable row level security;
alter table public.live_episodes        enable row level security;
alter table public.live_media           enable row level security;
alter table public.live_billboard       enable row level security;
alter table public.live_settings        enable row level security;
alter table public.live_passes          enable row level security;
alter table public.live_saves           enable row level security;
alter table public.live_plays           enable row level security;
alter table public.music_sources        enable row level security;
alter table public.music_releases       enable row level security;
alter table public.music_playlists      enable row level security;
alter table public.music_playlist_items enable row level security;

drop policy if exists live_titles_read on public.live_titles;
create policy live_titles_read on public.live_titles
  for select to anon, authenticated using (status = 'published' or (select public.is_admin()));
drop policy if exists live_titles_admin on public.live_titles;
create policy live_titles_admin on public.live_titles
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

drop policy if exists live_episodes_read on public.live_episodes;
create policy live_episodes_read on public.live_episodes
  for select to anon, authenticated using (
    (status = 'published' and exists (select 1 from public.live_titles t where t.id = title_id and t.status = 'published'))
    or (select public.is_admin()));
drop policy if exists live_episodes_admin on public.live_episodes;
create policy live_episodes_admin on public.live_episodes
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

drop policy if exists live_media_admin on public.live_media;
create policy live_media_admin on public.live_media
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

drop policy if exists live_billboard_read on public.live_billboard;
create policy live_billboard_read on public.live_billboard
  for select to anon, authenticated using (
    (status = 'published' and (starts_at is null or starts_at <= now()) and (ends_at is null or ends_at > now()))
    or (select public.is_admin()));
drop policy if exists live_billboard_admin on public.live_billboard;
create policy live_billboard_admin on public.live_billboard
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

drop policy if exists live_settings_admin on public.live_settings;
create policy live_settings_admin on public.live_settings
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

drop policy if exists live_passes_own on public.live_passes;
create policy live_passes_own on public.live_passes
  for select to authenticated using (user_id = (select auth.uid()) or (select public.is_admin()));
drop policy if exists live_passes_admin on public.live_passes;
create policy live_passes_admin on public.live_passes
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

drop policy if exists live_saves_own on public.live_saves;
create policy live_saves_own on public.live_saves
  for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

drop policy if exists live_plays_admin on public.live_plays;
create policy live_plays_admin on public.live_plays
  for select to authenticated using ((select public.is_admin()));

drop policy if exists music_sources_admin on public.music_sources;
create policy music_sources_admin on public.music_sources
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

drop policy if exists music_releases_read on public.music_releases;
create policy music_releases_read on public.music_releases
  for select to anon, authenticated using (active);

drop policy if exists music_playlists_read on public.music_playlists;
create policy music_playlists_read on public.music_playlists
  for select to anon, authenticated using (status = 'published' or (select public.is_admin()));
drop policy if exists music_playlists_admin on public.music_playlists;
create policy music_playlists_admin on public.music_playlists
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

drop policy if exists music_playlist_items_read on public.music_playlist_items;
create policy music_playlist_items_read on public.music_playlist_items
  for select to anon, authenticated using (
    exists (select 1 from public.music_playlists p where p.id = playlist_id and p.status = 'published')
    or (select public.is_admin()));
drop policy if exists music_playlist_items_admin on public.music_playlist_items;
create policy music_playlist_items_admin on public.music_playlist_items
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

revoke all on public.live_titles, public.live_episodes, public.live_media, public.live_billboard,
              public.live_settings, public.live_passes, public.live_saves, public.live_plays,
              public.music_sources, public.music_releases, public.music_playlists,
              public.music_playlist_items from anon, authenticated;

grant select on public.live_titles, public.live_episodes, public.live_billboard,
                public.music_releases, public.music_playlists, public.music_playlist_items to anon, authenticated;
grant insert, update, delete on public.live_titles, public.live_episodes, public.live_billboard,
                public.music_playlists, public.music_playlist_items to authenticated;
grant select, insert, update, delete on public.live_media, public.live_passes, public.live_saves,
                public.music_sources to authenticated;
grant select, update on public.live_settings to authenticated;
grant select on public.live_plays to authenticated;
revoke all on public.music_releases_public from public;
grant select on public.music_releases_public to anon, authenticated;

-- ── 12 · FUNCTION PRIVILEGES ───────────────────────────────────────
revoke all on function public.live_has_pass() from public, anon, authenticated;
revoke all on function public.live_can_watch(uuid, uuid) from public, anon, authenticated;
revoke all on function public.live_object_readable(text) from public, anon, authenticated;
revoke all on function public.live_state() from public, anon, authenticated;
revoke all on function public.live_start_trial() from public, anon, authenticated;
revoke all on function public.live_play(uuid, uuid) from public, anon, authenticated;
revoke all on function public.live_log_play(uuid, uuid, integer, boolean, text) from public, anon, authenticated;
revoke all on function public.admin_live_overview() from public, anon;
revoke all on function public.admin_live_passes() from public, anon;
revoke all on function public.admin_live_pass_action(text, text, integer, text, uuid) from public, anon;
revoke all on function public.admin_music_refresh() from public, anon;

grant execute on function public.live_object_readable(text) to anon, authenticated;
grant execute on function public.live_state() to anon, authenticated;
grant execute on function public.live_start_trial() to authenticated;
grant execute on function public.live_play(uuid, uuid) to anon, authenticated;
grant execute on function public.live_log_play(uuid, uuid, integer, boolean, text) to anon, authenticated;
grant execute on function public.admin_live_overview() to authenticated;
grant execute on function public.admin_live_passes() to authenticated;
grant execute on function public.admin_live_pass_action(text, text, integer, text, uuid) to authenticated;
grant execute on function public.admin_music_refresh() to authenticated;

-- ── 13 · STORAGE ───────────────────────────────────────────────────
-- Films and episodes: private, large, resumable uploads.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('live-media', 'live-media', false, 5368709120,
        array['video/mp4', 'video/webm', 'video/quicktime', 'audio/mpeg', 'audio/mp4', 'audio/aac', 'text/vtt'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Posters, backdrops, title logos, trailers and billboard media: public,
-- because a locked film still has to be shown to be sold.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('live-public', 'live-public', true, 524288000,
        array['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif', 'video/mp4', 'video/webm'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "live media watchable" on storage.objects;
create policy "live media watchable" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'live-media' and public.live_object_readable(name));

drop policy if exists "live public read" on storage.objects;
create policy "live public read" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'live-public');

drop policy if exists "live media admin write" on storage.objects;
create policy "live media admin write" on storage.objects
  for insert to authenticated
  with check (bucket_id in ('live-media', 'live-public') and (select public.is_admin()));

drop policy if exists "live media admin update" on storage.objects;
create policy "live media admin update" on storage.objects
  for update to authenticated
  using (bucket_id in ('live-media', 'live-public') and (select public.is_admin()))
  with check (bucket_id in ('live-media', 'live-public') and (select public.is_admin()));

drop policy if exists "live media admin delete" on storage.objects;
create policy "live media admin delete" on storage.objects
  for delete to authenticated
  using (bucket_id in ('live-media', 'live-public') and (select public.is_admin()));

-- ── 14 · REALTIME ──────────────────────────────────────────────────
-- An open page picks up a new billboard slide or a show going live
-- without a reload. RLS still applies to what each viewer receives.
do $$
begin
  if not exists (select 1 from pg_publication_tables
                  where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'live_titles') then
    alter publication supabase_realtime add table public.live_titles;
  end if;
  if not exists (select 1 from pg_publication_tables
                  where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'live_billboard') then
    alter publication supabase_realtime add table public.live_billboard;
  end if;
end
$$;

-- ── 15 · THE BOARD REFRESHES ON ITS OWN ────────────────────────────
-- Every 10 minutes pg_cron asks the sync function for the chart. The
-- function only goes to YouTube when the cached board is stale, so the
-- call is cheap when nothing is due, and visitors never wait on it.
insert into cabana_ops.cron_config (key, value)
values ('music_refresh_url', 'https://gfwgbgdvxtocwhilrtdw.supabase.co/functions/v1/youtube-sync?action=chart')
on conflict (key) do nothing;

create or replace function cabana_ops.trigger_music_refresh()
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_url text;
begin
  select value into v_url from cabana_ops.cron_config where key = 'music_refresh_url';
  if v_url is null then return; end if;
  perform net.http_get(url := v_url, timeout_milliseconds := 55000);
end;
$$;
revoke all on function cabana_ops.trigger_music_refresh() from public, anon, authenticated;

select cron.unschedule(jobid) from cron.job where jobname = 'cabana-music-refresh';
select cron.schedule('cabana-music-refresh', '*/10 * * * *', 'select cabana_ops.trigger_music_refresh()');
