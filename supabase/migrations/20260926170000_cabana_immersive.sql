-- ═══════════════════════════════════════════════════════════════════
--  CABANA IMMERSIVE · VR and 360° experiences on /tours
--  ─────────────────────────────────────────────────────────────────
--  A guest who cannot make the trip, or wants to feel it before they
--  book, steps inside it: 360° and 180° video, stereo footage for
--  headsets, panoramas, and flat film on a virtual screen. Scenes can
--  be linked by hotspots, so one experience can be a walk through a
--  place or a branching video.
--
--  It is a paid product that launches as a free trial. The rules for
--  who may watch live here, in the database, and nowhere else:
--
--    · Scene media sits in a PRIVATE bucket. A viewer gets a signed URL
--      only if storage RLS says immersive_can_watch() for that
--      experience. Hiding a play button is not the paywall; this is.
--    · Posters and teasers sit in a PUBLIC bucket, because a locked
--      experience still has to be shown to be sold.
--    · immersive_settings.mode is the one switch:
--        trial  every published experience is open until trial_ends_at
--        open   every published experience is open, no banner
--        pass   'pass' experiences need an active immersive_passes row;
--               'free' ones stay open to everyone
--      Moving from the trial to paid is one update, not a deploy.
--
--  An experience may only reference private media inside its own
--  folder (exp/<its id>/…). Otherwise a pass-only experience could
--  borrow a free one's gate, or the reverse.
-- ═══════════════════════════════════════════════════════════════════

-- ── 1 · MEDIA REFERENCES + SCENE SHAPE ─────────────────────────────
-- A scene's media is either an absolute https URL (a CDN, a stream) or
-- a private object written as  sb:exp/<experience uuid>/<file>.
create or replace function public.immersive_ref_ok(p text, p_optional boolean default true)
returns boolean
language sql
immutable
set search_path = pg_catalog, public
as $$
  select case
    when p is null or p = '' then p_optional
    else length(p) <= 1000 and (
      p ~ '^https://[^\s"''<>\\]+$'
      or p ~ '^sb:exp/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[A-Za-z0-9._-]{1,200}$'
    )
  end;
$$;

create or replace function public.immersive_scenes_valid(p jsonb)
returns boolean
language plpgsql
immutable
set search_path = pg_catalog, public
as $$
declare
  s jsonb;
  h jsonb;
  ids text[] := '{}';
  v text;
begin
  if p is null or jsonb_typeof(p) <> 'array' or jsonb_array_length(p) > 40 then
    return false;
  end if;

  for s in select value from jsonb_array_elements(p) loop
    if jsonb_typeof(s) <> 'object' then return false; end if;

    v := s ->> 'id';
    if v is null or v !~ '^[A-Za-z0-9_-]{1,40}$' or v = any(ids) then return false; end if;
    ids := ids || v;

    if coalesce(s ->> 'kind', '') not in ('video', 'image') then return false; end if;
    if coalesce(s ->> 'projection', '') not in
       ('equirect', 'equirect_tb', 'equirect_sbs', 'vr180', 'vr180_sbs', 'flat') then
      return false;
    end if;
    if length(coalesce(s ->> 'name', '')) > 120 then return false; end if;

    -- A scene needs something to show: an uploaded or linked file, or a stream.
    if coalesce(s ->> 'src', '') = '' and coalesce(s ->> 'stream', '') = '' then return false; end if;
    if not public.immersive_ref_ok(s ->> 'src')        then return false; end if;
    if not public.immersive_ref_ok(s ->> 'src_mobile') then return false; end if;
    if not public.immersive_ref_ok(s ->> 'poster')     then return false; end if;
    if not public.immersive_ref_ok(s ->> 'audio')      then return false; end if;
    if coalesce(s ->> 'stream', '') <> '' and (s ->> 'stream') !~ '^https://[^\s"''<>\\]+$' then
      return false;
    end if;

    if s ? 'hotspots' then
      if jsonb_typeof(s -> 'hotspots') <> 'array' or jsonb_array_length(s -> 'hotspots') > 60 then
        return false;
      end if;
      for h in select value from jsonb_array_elements(s -> 'hotspots') loop
        if jsonb_typeof(h) <> 'object' then return false; end if;
        if coalesce(h ->> 'type', '') not in ('info', 'scene', 'tour', 'seek', 'link') then return false; end if;
        if jsonb_typeof(h -> 'yaw') <> 'number' or jsonb_typeof(h -> 'pitch') <> 'number' then return false; end if;
        if abs((h ->> 'pitch')::numeric) > 90 or abs((h ->> 'yaw')::numeric) > 360 then return false; end if;
        if length(coalesce(h ->> 'label', '')) > 80 or length(coalesce(h ->> 'text', '')) > 1200 then
          return false;
        end if;
        if h ->> 'type' = 'link' and coalesce(h ->> 'target', '') !~ '^https://[^\s"''<>\\]+$' then
          return false;
        end if;
        if h ->> 'type' = 'seek' and jsonb_typeof(h -> 'target') <> 'number' then return false; end if;
      end loop;
    end if;
  end loop;

  -- Second pass: a "go to scene" hotspot must land somewhere real.
  for s in select value from jsonb_array_elements(p) loop
    if s ? 'hotspots' then
      for h in select value from jsonb_array_elements(s -> 'hotspots') loop
        if h ->> 'type' = 'scene' and not (coalesce(h ->> 'target', '') = any(ids)) then
          return false;
        end if;
      end loop;
    end if;
  end loop;

  return true;
end;
$$;

-- ── 2 · TABLES ─────────────────────────────────────────────────────
create table if not exists public.immersive_experiences (
  id           uuid primary key default gen_random_uuid(),
  slug         text not null unique
               check (slug ~ '^[a-z0-9][a-z0-9-]{1,78}[a-z0-9]$'),
  title        text not null check (length(btrim(title)) between 2 and 120),
  tagline      text check (tagline is null or length(tagline) <= 160),
  description  text check (description is null or length(description) <= 4000),
  destination  text,
  country      text,
  credits      text check (credits is null or length(credits) <= 160),
  tour_id      bigint references public.tours(id) on delete set null,
  poster_url   text check (public.immersive_ref_ok(poster_url) and (poster_url is null or poster_url !~ '^sb:')),
  teaser_url   text check (public.immersive_ref_ok(teaser_url) and (teaser_url is null or teaser_url !~ '^sb:')),
  duration_s   integer check (duration_s is null or duration_s between 0 and 86400),
  access       text not null default 'free' check (access in ('free', 'pass')),
  status       text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  featured     boolean not null default false,
  sort_order   integer not null default 0,
  scenes       jsonb not null default '[]'::jsonb check (public.immersive_scenes_valid(scenes)),
  start_scene  text,
  -- Derived by the trigger below so the page never has to walk scenes
  -- to draw a card.
  format       text not null default '360' check (format in ('360', '180', 'flat', 'mixed')),
  media        text not null default 'video' check (media in ('video', 'image', 'mixed')),
  stereo       boolean not null default false,
  interactive  boolean not null default false,
  scene_count  integer not null default 0,
  published_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists immersive_experiences_live_idx
  on public.immersive_experiences (featured desc, sort_order desc, published_at desc)
  where status = 'published';
create index if not exists immersive_experiences_tour_idx
  on public.immersive_experiences (tour_id) where tour_id is not null;

create table if not exists public.immersive_settings (
  id              smallint primary key default 1 check (id = 1),
  mode            text not null default 'trial' check (mode in ('trial', 'open', 'pass')),
  trial_ends_at   timestamptz,
  banner_enabled  boolean not null default true,
  banner_title    text not null default 'Enjoy a free trial' check (length(banner_title) <= 60),
  banner_text     text not null default 'Every immersive experience is free while we launch. Put your phone in a viewer, go fullscreen, or step in with a headset.'
                  check (length(banner_text) <= 240),
  pass_price_kes  integer check (pass_price_kes is null or pass_price_kes between 0 and 10000000),
  pass_days       integer not null default 30 check (pass_days between 1 and 3650),
  presence_motion boolean not null default true,
  updated_at      timestamptz not null default now()
);
insert into public.immersive_settings (id) values (1) on conflict (id) do nothing;

create table if not exists public.immersive_passes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  starts_at   timestamptz not null default now(),
  expires_at  timestamptz,
  source      text not null default 'grant' check (source in ('grant', 'purchase', 'promo')),
  note        text check (note is null or length(note) <= 400),
  granted_by  text,
  revoked_at  timestamptz,
  created_at  timestamptz not null default now()
);
create index if not exists immersive_passes_user_idx on public.immersive_passes (user_id, expires_at);

create table if not exists public.immersive_pass_requests (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  email          text,
  phone          text,
  message        text check (message is null or length(message) <= 600),
  experience_id  uuid references public.immersive_experiences(id) on delete set null,
  status         text not null default 'open' check (status in ('open', 'granted', 'closed')),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create unique index if not exists immersive_pass_requests_one_open
  on public.immersive_pass_requests (user_id) where status = 'open';

create table if not exists public.immersive_plays (
  id             bigint generated always as identity primary key,
  experience_id  uuid not null references public.immersive_experiences(id) on delete cascade,
  user_id        uuid,
  seconds        integer not null default 0,
  scenes_seen    integer not null default 1,
  mode           text not null default 'window'
                 check (mode in ('window', 'fullscreen', 'visor', 'xr')),
  device         text,
  completed      boolean not null default false,
  created_at     timestamptz not null default now()
);
create index if not exists immersive_plays_exp_idx on public.immersive_plays (experience_id, created_at desc);
create index if not exists immersive_plays_day_idx on public.immersive_plays (created_at desc);

-- ── 3 · NORMALISE ON WRITE ─────────────────────────────────────────
create or replace function public.immersive_experiences_normalize()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  s jsonb;
  n_360 int := 0; n_180 int := 0; n_flat int := 0;
  n_vid int := 0; n_img int := 0;
  any_stereo boolean := false;
  any_hot boolean := false;
  ref text;
  prefix text := 'sb:exp/' || new.id::text || '/';
begin
  new.slug := lower(btrim(new.slug));
  new.title := btrim(new.title);

  for s in select value from jsonb_array_elements(coalesce(new.scenes, '[]'::jsonb)) loop
    case s ->> 'projection'
      when 'flat' then n_flat := n_flat + 1;
      when 'vr180' then n_180 := n_180 + 1;
      when 'vr180_sbs' then n_180 := n_180 + 1;
      else n_360 := n_360 + 1;
    end case;
    if s ->> 'kind' = 'video' then n_vid := n_vid + 1; else n_img := n_img + 1; end if;
    if s ->> 'projection' in ('equirect_tb', 'equirect_sbs', 'vr180_sbs') then any_stereo := true; end if;
    if jsonb_typeof(s -> 'hotspots') = 'array' and jsonb_array_length(s -> 'hotspots') > 0 then
      any_hot := true;
    end if;

    -- Private media must live in this experience's own folder.
    foreach ref in array array[s ->> 'src', s ->> 'src_mobile', s ->> 'poster', s ->> 'audio'] loop
      if ref like 'sb:%' and left(ref, length(prefix)) <> prefix then
        raise exception 'immersive_media_outside_folder' using errcode = '22023',
          detail = 'Private media for this experience must be uploaded under exp/' || new.id::text || '/';
      end if;
    end loop;
  end loop;

  new.scene_count := jsonb_array_length(coalesce(new.scenes, '[]'::jsonb));
  new.format := case
    when n_360 > 0 and n_180 = 0 and n_flat = 0 then '360'
    when n_180 > 0 and n_360 = 0 and n_flat = 0 then '180'
    when n_flat > 0 and n_360 = 0 and n_180 = 0 then 'flat'
    when new.scene_count = 0 then '360'
    else 'mixed' end;
  new.media := case
    when n_vid > 0 and n_img = 0 then 'video'
    when n_img > 0 and n_vid = 0 then 'image'
    when new.scene_count = 0 then 'video'
    else 'mixed' end;
  new.stereo := any_stereo;
  new.interactive := any_hot or new.scene_count > 1;

  -- The start scene must be a scene. Default to the first.
  if new.scene_count = 0 then
    new.start_scene := null;
  elsif new.start_scene is null or not exists (
      select 1 from jsonb_array_elements(new.scenes) x where x.value ->> 'id' = new.start_scene) then
    new.start_scene := new.scenes -> 0 ->> 'id';
  end if;

  if new.status = 'published' then
    if new.scene_count = 0 then
      raise exception 'immersive_needs_a_scene' using errcode = '22023',
        detail = 'Add at least one scene before publishing.';
    end if;
    if tg_op = 'INSERT' or old.status is distinct from 'published' then
      new.published_at := coalesce(new.published_at, now());
    end if;
  end if;

  if tg_op = 'UPDATE' then new.updated_at := now(); end if;
  return new;
end;
$$;

drop trigger if exists immersive_experiences_normalize on public.immersive_experiences;
create trigger immersive_experiences_normalize
  before insert or update on public.immersive_experiences
  for each row execute function public.immersive_experiences_normalize();

create or replace function public.immersive_touch()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists immersive_settings_touch on public.immersive_settings;
create trigger immersive_settings_touch before update on public.immersive_settings
  for each row execute function public.immersive_touch();
drop trigger if exists immersive_pass_requests_touch on public.immersive_pass_requests;
create trigger immersive_pass_requests_touch before update on public.immersive_pass_requests
  for each row execute function public.immersive_touch();

-- ── 4 · WHO MAY WATCH ──────────────────────────────────────────────
create or replace function public.immersive_open_now()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select coalesce((
    select s.mode = 'open'
        or (s.mode = 'trial' and (s.trial_ends_at is null or s.trial_ends_at > now()))
      from public.immersive_settings s where s.id = 1
  ), false);
$$;

create or replace function public.immersive_has_pass()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select auth.uid() is not null and exists (
    select 1 from public.immersive_passes p
     where p.user_id = auth.uid()
       and p.revoked_at is null
       and p.starts_at <= now()
       and (p.expires_at is null or p.expires_at > now())
  );
$$;

create or replace function public.immersive_can_watch(p_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  v_status text;
  v_access text;
begin
  if p_id is null then return false; end if;
  if public.is_admin() then return true; end if;
  select e.status, e.access into v_status, v_access
    from public.immersive_experiences e where e.id = p_id;
  if not found or v_status <> 'published' then return false; end if;
  if v_access = 'free' then return true; end if;
  if public.immersive_open_now() then return true; end if;
  return public.immersive_has_pass();
end;
$$;

-- Storage RLS calls this for every object in the private bucket.
create or replace function public.immersive_object_readable(p_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  v_id text := split_part(coalesce(p_name, ''), '/', 2);
begin
  if split_part(coalesce(p_name, ''), '/', 1) <> 'exp'
     or v_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return public.is_admin();
  end if;
  return public.immersive_can_watch(v_id::uuid);
end;
$$;

-- Everything the page needs to know about access, in one call.
create or replace function public.immersive_state()
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  st public.immersive_settings%rowtype;
  v_uid uuid := auth.uid();
  v_open boolean := public.immersive_open_now();
  v_pass_exp timestamptz;
  v_has_pass boolean := false;
begin
  select * into st from public.immersive_settings where id = 1;
  if v_uid is not null then
    select p.expires_at into v_pass_exp
      from public.immersive_passes p
     where p.user_id = v_uid and p.revoked_at is null and p.starts_at <= now()
       and (p.expires_at is null or p.expires_at > now())
     order by p.expires_at desc nulls first
     limit 1;
    v_has_pass := found;
  end if;

  return jsonb_build_object(
    'mode', coalesce(st.mode, 'trial'),
    'open', v_open,
    'trial', coalesce(st.mode, 'trial') = 'trial' and v_open,
    'trial_ends_at', st.trial_ends_at,
    'signed_in', v_uid is not null,
    'has_pass', v_has_pass,
    'pass_expires_at', v_pass_exp,
    'pass_price_kes', st.pass_price_kes,
    'pass_days', coalesce(st.pass_days, 30),
    'presence_motion', coalesce(st.presence_motion, true),
    'banner', jsonb_build_object(
      'enabled', coalesce(st.banner_enabled, true) and coalesce(st.mode, 'trial') = 'trial' and v_open,
      'title', coalesce(st.banner_title, 'Enjoy a free trial'),
      'text', coalesce(st.banner_text, '')),
    'request_open', v_uid is not null and exists (
      select 1 from public.immersive_pass_requests r where r.user_id = v_uid and r.status = 'open'),
    'server_time', now()
  );
end;
$$;

-- ── 5 · GUEST WRITES (through functions only) ──────────────────────
create or replace function public.immersive_log_play(
  p_experience uuid,
  p_seconds integer,
  p_mode text default 'window',
  p_device text default null,
  p_completed boolean default false,
  p_scenes integer default 1)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  -- A glance is not a play. Under two seconds is an accidental open.
  if p_experience is null or coalesce(p_seconds, 0) < 2 then return; end if;
  if not exists (select 1 from public.immersive_experiences
                  where id = p_experience and status = 'published') then
    return;
  end if;
  insert into public.immersive_plays (experience_id, user_id, seconds, scenes_seen, mode, device, completed)
  values (p_experience, auth.uid(),
          least(greatest(p_seconds, 0), 21600),
          least(greatest(coalesce(p_scenes, 1), 1), 40),
          case when p_mode in ('window', 'fullscreen', 'visor', 'xr') then p_mode else 'window' end,
          left(regexp_replace(coalesce(p_device, ''), '[^a-z0-9 _-]', '', 'gi'), 24),
          coalesce(p_completed, false));
end;
$$;

create or replace function public.immersive_request_pass(
  p_phone text default null,
  p_message text default null,
  p_experience uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_uid uuid := auth.uid();
  v_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  v_phone text := nullif(left(regexp_replace(coalesce(p_phone, ''), '[^0-9+ ]', '', 'g'), 20), '');
  v_id uuid;
begin
  if v_uid is null then
    raise exception 'sign_in_required' using errcode = '42501';
  end if;
  insert into public.immersive_pass_requests (user_id, email, phone, message, experience_id)
  values (v_uid, nullif(v_email, ''), v_phone, nullif(left(btrim(coalesce(p_message, '')), 600), ''),
          (select id from public.immersive_experiences where id = p_experience and status = 'published'))
  on conflict (user_id) where status = 'open'
  do update set phone = coalesce(excluded.phone, immersive_pass_requests.phone),
                message = coalesce(excluded.message, immersive_pass_requests.message),
                experience_id = coalesce(excluded.experience_id, immersive_pass_requests.experience_id)
  returning id into v_id;
  return jsonb_build_object('ok', true, 'id', v_id);
end;
$$;

-- ── 6 · CONSOLE ────────────────────────────────────────────────────
create or replace function public.admin_immersive_overview()
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  since timestamptz := now() - interval '30 days';
begin
  perform cabana_admin.guard();
  return jsonb_build_object(
    'counts', (select jsonb_build_object(
        'published', count(*) filter (where status = 'published'),
        'draft',     count(*) filter (where status = 'draft'),
        'archived',  count(*) filter (where status = 'archived'),
        'featured',  count(*) filter (where status = 'published' and featured))
      from public.immersive_experiences),
    'plays_30',   (select count(*) from public.immersive_plays where created_at > since),
    'seconds_30', (select coalesce(sum(seconds), 0) from public.immersive_plays where created_at > since),
    'viewers_30', (select count(distinct user_id) from public.immersive_plays where created_at > since and user_id is not null),
    'completed_30', (select count(*) from public.immersive_plays where created_at > since and completed),
    'by_mode', (select coalesce(jsonb_object_agg(mode, n), '{}'::jsonb) from (
        select mode, count(*) n from public.immersive_plays where created_at > since group by mode) x),
    'by_experience', (select coalesce(jsonb_object_agg(experience_id::text,
        jsonb_build_object('plays', n, 'seconds', s, 'completed', c, 'last', l)), '{}'::jsonb) from (
        select experience_id, count(*) n, coalesce(sum(seconds), 0) s,
               count(*) filter (where completed) c, max(created_at) l
          from public.immersive_plays group by experience_id) x),
    'daily', (select coalesce(jsonb_agg(jsonb_build_object('d', d, 'n', n) order by d), '[]'::jsonb) from (
        select (created_at at time zone 'Africa/Nairobi')::date d, count(*) n
          from public.immersive_plays where created_at > since group by 1) x),
    'requests_open', (select count(*) from public.immersive_pass_requests where status = 'open'),
    'passes_active', (select count(*) from public.immersive_passes
                       where revoked_at is null and (expires_at is null or expires_at > now()))
  );
end;
$$;

create or replace function public.admin_immersive_passes()
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
begin
  perform cabana_admin.guard();
  return jsonb_build_object(
    'passes', (select coalesce(jsonb_agg(x order by x.created_at desc), '[]'::jsonb) from (
        select p.id, p.user_id, u.email, p.starts_at, p.expires_at, p.source, p.note, p.granted_by,
               p.revoked_at, p.created_at,
               (p.revoked_at is null and (p.expires_at is null or p.expires_at > now())) as active
          from public.immersive_passes p left join auth.users u on u.id = p.user_id
         order by p.created_at desc limit 500) x),
    'requests', (select coalesce(jsonb_agg(x order by x.created_at desc), '[]'::jsonb) from (
        select r.id, r.user_id, coalesce(r.email, u.email) email, r.phone, r.message, r.status,
               r.experience_id, e.title as experience, r.created_at
          from public.immersive_pass_requests r
          left join auth.users u on u.id = r.user_id
          left join public.immersive_experiences e on e.id = r.experience_id
         order by (r.status = 'open') desc, r.created_at desc limit 300) x)
  );
end;
$$;

create or replace function public.admin_immersive_pass_action(
  p_action text,
  p_email text default null,
  p_days integer default null,
  p_note text default null,
  p_request uuid default null,
  p_pass uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_uid uuid;
  v_id uuid;
begin
  perform cabana_admin.guard();

  if p_action = 'grant' then
    select u.id into v_uid from auth.users u where lower(u.email) = lower(btrim(coalesce(p_email, ''))) limit 1;
    if v_uid is null then
      raise exception 'No Cabana member signs in with that email.' using errcode = 'P0002';
    end if;
    insert into public.immersive_passes (user_id, expires_at, source, note, granted_by)
    values (v_uid,
            case when coalesce(p_days, 0) > 0 then now() + make_interval(days => p_days) end,
            'grant', nullif(left(btrim(coalesce(p_note, '')), 400), ''),
            lower(coalesce(auth.jwt() ->> 'email', 'console')))
    returning id into v_id;
    update public.immersive_pass_requests set status = 'granted'
     where status = 'open' and (id = p_request or user_id = v_uid);
    perform cabana_admin.log('immersive_pass_grant', 'member', v_uid::text,
      jsonb_build_object('pass', v_id, 'days', p_days));
    return jsonb_build_object('ok', true, 'pass', v_id, 'user_id', v_uid);

  elsif p_action = 'revoke' then
    update public.immersive_passes set revoked_at = now() where id = p_pass and revoked_at is null;
    perform cabana_admin.log('immersive_pass_revoke', 'immersive_pass', p_pass::text, '{}'::jsonb);
    return jsonb_build_object('ok', true);

  elsif p_action = 'close_request' then
    update public.immersive_pass_requests set status = 'closed' where id = p_request and status = 'open';
    perform cabana_admin.log('immersive_request_close', 'immersive_request', p_request::text, '{}'::jsonb);
    return jsonb_build_object('ok', true);
  end if;

  raise exception 'Unknown action %', p_action using errcode = '22023';
end;
$$;

-- ── 7 · ROW LEVEL SECURITY ─────────────────────────────────────────
alter table public.immersive_experiences   enable row level security;
alter table public.immersive_settings      enable row level security;
alter table public.immersive_passes        enable row level security;
alter table public.immersive_pass_requests enable row level security;
alter table public.immersive_plays         enable row level security;

drop policy if exists immersive_experiences_read_live on public.immersive_experiences;
create policy immersive_experiences_read_live on public.immersive_experiences
  for select to anon, authenticated using (status = 'published');
drop policy if exists immersive_experiences_admin on public.immersive_experiences;
create policy immersive_experiences_admin on public.immersive_experiences
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

drop policy if exists immersive_settings_admin on public.immersive_settings;
create policy immersive_settings_admin on public.immersive_settings
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

drop policy if exists immersive_passes_own on public.immersive_passes;
create policy immersive_passes_own on public.immersive_passes
  for select to authenticated using (user_id = (select auth.uid()) or (select public.is_admin()));
drop policy if exists immersive_passes_admin on public.immersive_passes;
create policy immersive_passes_admin on public.immersive_passes
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

drop policy if exists immersive_requests_own on public.immersive_pass_requests;
create policy immersive_requests_own on public.immersive_pass_requests
  for select to authenticated using (user_id = (select auth.uid()) or (select public.is_admin()));
drop policy if exists immersive_requests_admin on public.immersive_pass_requests;
create policy immersive_requests_admin on public.immersive_pass_requests
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

drop policy if exists immersive_plays_admin on public.immersive_plays;
create policy immersive_plays_admin on public.immersive_plays
  for select to authenticated using ((select public.is_admin()));

revoke all on public.immersive_experiences, public.immersive_settings, public.immersive_passes,
              public.immersive_pass_requests, public.immersive_plays from anon;
grant select on public.immersive_experiences to anon, authenticated;
grant insert, update, delete on public.immersive_experiences to authenticated;
grant select, update on public.immersive_settings to authenticated;
grant select, insert, update, delete on public.immersive_passes to authenticated;
grant select, update on public.immersive_pass_requests to authenticated;
grant select on public.immersive_plays to authenticated;

-- ── 8 · FUNCTION PRIVILEGES ────────────────────────────────────────
-- Supabase grants EXECUTE to anon and authenticated by default, so each
-- function is revoked from all three and granted back only where needed.
-- The three helpers are reached from inside immersive_object_readable,
-- which runs as its owner; no client needs to call them over REST.
revoke all on function public.immersive_open_now() from public, anon, authenticated;
revoke all on function public.immersive_has_pass() from public, anon, authenticated;
revoke all on function public.immersive_can_watch(uuid) from public, anon, authenticated;
revoke all on function public.immersive_object_readable(text) from public, anon, authenticated;
revoke all on function public.immersive_state() from public, anon, authenticated;
revoke all on function public.immersive_log_play(uuid, integer, text, text, boolean, integer) from public, anon, authenticated;
revoke all on function public.immersive_request_pass(text, text, uuid) from public, anon, authenticated;
revoke all on function public.admin_immersive_overview() from public, anon;
revoke all on function public.admin_immersive_passes() from public, anon;
revoke all on function public.admin_immersive_pass_action(text, text, integer, text, uuid, uuid) from public, anon;

grant execute on function public.immersive_object_readable(text) to anon, authenticated;
grant execute on function public.immersive_state() to anon, authenticated;
grant execute on function public.immersive_log_play(uuid, integer, text, text, boolean, integer) to anon, authenticated;
grant execute on function public.immersive_request_pass(text, text, uuid) to authenticated;
grant execute on function public.admin_immersive_overview() to authenticated;
grant execute on function public.admin_immersive_passes() to authenticated;
grant execute on function public.admin_immersive_pass_action(text, text, integer, text, uuid, uuid) to authenticated;

-- ── 9 · STORAGE ────────────────────────────────────────────────────
-- Scene media: private. 360° masters are large, so the cap is generous
-- and uploads go through the resumable (TUS) endpoint in 6 MB chunks.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('immersive', 'immersive', false, 5368709120,
        array['video/mp4', 'video/webm', 'video/quicktime',
              'image/jpeg', 'image/png', 'image/webp', 'image/avif',
              'audio/mpeg', 'audio/mp4', 'audio/aac', 'audio/ogg', 'audio/webm', 'audio/wav', 'audio/x-wav', 'audio/x-m4a'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Posters and teasers: public, because a locked experience still sells.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('immersive-public', 'immersive-public', true, 104857600,
        array['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'video/mp4', 'video/webm'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "immersive media watchable" on storage.objects;
create policy "immersive media watchable" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'immersive' and public.immersive_object_readable(name));

drop policy if exists "immersive media admin write" on storage.objects;
create policy "immersive media admin write" on storage.objects
  for insert to authenticated
  with check (bucket_id in ('immersive', 'immersive-public') and (select public.is_admin()));

drop policy if exists "immersive media admin update" on storage.objects;
create policy "immersive media admin update" on storage.objects
  for update to authenticated
  using (bucket_id in ('immersive', 'immersive-public') and (select public.is_admin()))
  with check (bucket_id in ('immersive', 'immersive-public') and (select public.is_admin()));

drop policy if exists "immersive media admin delete" on storage.objects;
create policy "immersive media admin delete" on storage.objects
  for delete to authenticated
  using (bucket_id in ('immersive', 'immersive-public') and (select public.is_admin()));

drop policy if exists "immersive public read" on storage.objects;
create policy "immersive public read" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'immersive-public');

-- ── 10 · THE CONSOLE INBOX ─────────────────────────────────────────
-- Pass requests are people waiting on a reply, so they belong in the
-- operator inbox beside everything else. admin_inbox is long and owned
-- by the console migration; rather than fork a copy of it here, add the
-- count and the items just before it returns. Idempotent: it does
-- nothing once the queue is present.
do $patch$
declare
  def text := pg_get_functiondef('public.admin_inbox()'::regprocedure);
  anchor text := $a$  return jsonb_build_object('counts', counts, 'items', items, 'at', now());$a$;
  addition text := $b$  -- immersive_requests (added by the Cabana Immersive migration)
  select count(*) into v_n from public.immersive_pass_requests where status = 'open';
  counts := counts || jsonb_build_object('immersive_requests', v_n);
  select coalesce(jsonb_agg(x), '[]'::jsonb) into v from (
    select jsonb_build_object('queue', 'immersive_requests', 'severity', 'normal', 'id', r.id::text,
      'title', 'Immersive pass request · ' || coalesce(r.email, 'member'),
      'sub', concat_ws(' · ', nullif(r.phone, ''), (select e.title from public.immersive_experiences e where e.id = r.experience_id)),
      'at', r.created_at, 'link', '#/immersive?tab=access') as x
      from public.immersive_pass_requests r where r.status = 'open'
     order by r.created_at desc limit 8) q;
  items := items || v;

$b$;
begin
  if position('immersive_requests' in def) > 0 then return; end if;
  if position(anchor in def) = 0 then
    raise notice 'admin_inbox changed shape; immersive_requests not added';
    return;
  end if;
  execute replace(def, anchor, addition || anchor);
end;
$patch$;
