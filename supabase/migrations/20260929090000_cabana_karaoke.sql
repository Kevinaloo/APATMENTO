-- ═══════════════════════════════════════════════════════════════════
--  CABANA KARAOKE
--  ─────────────────────────────────────────────────────────────────
--  /events/karaoke: sing on your own, with friends in the same room
--  (one screen, phones as microphones), or with friends anywhere
--  (every device plays the track in sync and the singer's voice is
--  relayed live). A room can be public, so anyone can tune in; every
--  scored song is a performance that can be replayed, shared,
--  answered with a challenge, or put to a battle.
--
--  What lives here
--    karaoke_settings      the one row: free allowance, VIP name, price
--    karaoke_songs         every YouTube video someone can sing: its
--                          lyrics (cached from LRCLIB), how far those
--                          lyrics run off this video (learned from
--                          verified singers), its tempo, and the
--                          melody Cabana has learned from its singers
--    karaoke_rooms         a room: code, host, setup, visibility
--    karaoke_members       who is in a room: host, singer or guest
--    karaoke_invites       invitations by Cabana username
--    karaoke_queue         the line-up of songs in a room
--    karaoke_performances  every song sung for the record
--    karaoke_challenges    one performance answered by another; a
--                          battle is a challenge sung in one room
--    karaoke_votes         the crowd's verdict
--    karaoke_cheers        reactions pinned to a moment of a replay
--    karaoke_passes        Karaoke VIP
--    karaoke_waitlist      members who asked for VIP before it opened
--
--  The allowance is enforced here, not in the page. A performance can
--  only be created by karaoke_begin(), which counts this month's
--  sessions (one session is one song sung for the record) against the
--  free allowance unless the member holds VIP. Scores are written only
--  by the server, with the service role, after the recording has been
--  heard by Whisper and aligned against the lyrics. No client can set
--  a score, a rank or a winner.
-- ═══════════════════════════════════════════════════════════════════

-- ── 1 · SETTINGS ───────────────────────────────────────────────────
create table if not exists public.karaoke_settings (
  id                   smallint primary key default 1 check (id = 1),
  vip_name             text not null default 'Karaoke VIP' check (length(btrim(vip_name)) between 2 and 40),
  free_sessions        integer not null default 5 check (free_sessions between 0 and 1000),
  price_kes            integer check (price_kes is null or price_kes between 0 and 1000000),
  price_period         text not null default 'month' check (price_period in ('week', 'month', 'year')),
  open_to_all          boolean not null default false,
  premium_includes_vip boolean not null default false,
  ranked_needs_karaoke boolean not null default true,
  free_take_days       integer not null default 30 check (free_take_days between 1 and 3650),
  banner_title         text not null default 'Sing it. Battle it. Go live.' check (length(btrim(banner_title)) between 2 and 80),
  banner_text          text not null default 'Real lyrics that light up as you sing them, scores checked by AI, rooms for friends near and far, and battles the whole of Cabana can vote on.'
                         check (length(btrim(banner_text)) between 2 and 280),
  updated_at           timestamptz not null default now()
);
insert into public.karaoke_settings (id) values (1) on conflict (id) do nothing;

-- ── 2 · SONGS ──────────────────────────────────────────────────────
-- Written by the karaoke edge function (lyrics, tempo) and by the
-- verifier (learned offset, melody). Read by everyone.
create table if not exists public.karaoke_songs (
  video_id          text primary key check (video_id ~ '^[A-Za-z0-9_-]{11}$'),
  title             text not null default '' check (length(title) <= 200),
  artist            text not null default '' check (length(artist) <= 120),
  track             text check (track is null or length(track) <= 160),
  track_artist      text check (track_artist is null or length(track_artist) <= 120),
  duration_s        integer check (duration_s is null or duration_s between 1 and 7200),
  kind              text not null default 'original' check (kind in ('karaoke', 'original', 'lyric', 'live')),
  thumb             text check (public.live_url_ok(thumb)),
  lyrics            jsonb check (lyrics is null or (jsonb_typeof(lyrics) = 'object' and pg_column_size(lyrics) < 262144)),
  lyrics_status     text not null default 'pending' check (lyrics_status in ('pending', 'words', 'synced', 'plain', 'none', 'error')),
  lyrics_source     text check (lyrics_source is null or lyrics_source in ('lrclib', 'manual')),
  lyrics_ref        text check (lyrics_ref is null or length(lyrics_ref) <= 80),
  lyrics_checked_at timestamptz,
  lang              text check (lang is null or lang in ('en', 'sw', 'mixed')),
  offset_s          real not null default 0 check (offset_s between -60 and 60),
  offset_n          integer not null default 0 check (offset_n >= 0),
  bpm               real check (bpm is null or bpm between 40 and 250),
  bpm_source        text check (bpm_source is null or length(bpm_source) <= 20),
  melody            text check (melody is null or length(melody) <= 40000),
  melody_n          integer not null default 0 check (melody_n >= 0),
  sung              integer not null default 0 check (sung >= 0),
  best_score        integer check (best_score is null or best_score between 0 and 100),
  hidden            boolean not null default false,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index if not exists karaoke_songs_sung_idx on public.karaoke_songs (sung desc, updated_at desc) where not hidden;

-- ── 3 · ROOMS ──────────────────────────────────────────────────────
-- The Realtime channel of a room is named after its secret. A row is
-- only visible to people allowed in the room, so seeing the row and
-- knowing the channel are the same permission.
create table if not exists public.karaoke_rooms (
  id             uuid primary key default gen_random_uuid(),
  code           text not null unique check (code ~ '^[A-HJ-NP-Z2-9]{6}$'),
  secret         text not null default replace(gen_random_uuid()::text, '-', ''),
  host_id        uuid not null references auth.users(id) on delete cascade,
  host_stage     jsonb,
  title          text not null default 'Karaoke night' check (length(btrim(title)) between 1 and 60),
  setup          text not null default 'online' check (setup in ('screen', 'online')),
  visibility     text not null default 'private' check (visibility in ('private', 'public')),
  status         text not null default 'open' check (status in ('open', 'live', 'ended')),
  now_playing    jsonb check (now_playing is null or (jsonb_typeof(now_playing) = 'object' and pg_column_size(now_playing) < 4000)),
  audience       integer not null default 0 check (audience >= 0),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  last_active_at timestamptz not null default now(),
  ended_at       timestamptz
);
create index if not exists karaoke_rooms_public_idx on public.karaoke_rooms (status, last_active_at desc) where visibility = 'public';
create index if not exists karaoke_rooms_host_idx on public.karaoke_rooms (host_id, created_at desc);

create table if not exists public.karaoke_members (
  room_id   uuid not null references public.karaoke_rooms(id) on delete cascade,
  user_id   uuid not null references auth.users(id) on delete cascade,
  role      text not null default 'guest' check (role in ('host', 'singer', 'guest')),
  stage     jsonb,
  joined_at timestamptz not null default now(),
  seen_at   timestamptz not null default now(),
  primary key (room_id, user_id)
);
create index if not exists karaoke_members_user_idx on public.karaoke_members (user_id, seen_at desc);

create table if not exists public.karaoke_invites (
  id          uuid primary key default gen_random_uuid(),
  room_id     uuid not null references public.karaoke_rooms(id) on delete cascade,
  inviter_id  uuid not null references auth.users(id) on delete cascade,
  invitee_id  uuid not null references auth.users(id) on delete cascade,
  status      text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at  timestamptz not null default now(),
  answered_at timestamptz,
  unique (room_id, invitee_id)
);
create index if not exists karaoke_invites_invitee_idx on public.karaoke_invites (invitee_id, status, created_at desc);
create index if not exists karaoke_invites_inviter_idx on public.karaoke_invites (inviter_id, created_at desc);

create table if not exists public.karaoke_queue (
  id             uuid primary key default gen_random_uuid(),
  room_id        uuid not null references public.karaoke_rooms(id) on delete cascade,
  video_id       text not null references public.karaoke_songs(video_id),
  singer_id      uuid references auth.users(id) on delete set null,
  guest_name     text check (guest_name is null or length(btrim(guest_name)) between 1 and 30),
  added_by       uuid references auth.users(id) on delete set null,
  position       integer not null default 0,
  status         text not null default 'queued' check (status in ('queued', 'singing', 'done', 'skipped')),
  battle         uuid,
  performance_id uuid,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists karaoke_queue_room_idx on public.karaoke_queue (room_id, status, position);

-- ── 4 · PERFORMANCES ───────────────────────────────────────────────
create table if not exists public.karaoke_performances (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  guest_name   text check (guest_name is null or length(btrim(guest_name)) between 1 and 30),
  room_id      uuid references public.karaoke_rooms(id) on delete set null,
  queue_id     uuid,
  video_id     text not null references public.karaoke_songs(video_id),
  challenge_id uuid,
  status       text not null default 'recording'
                 check (status in ('recording', 'uploaded', 'verifying', 'scored', 'failed', 'discarded')),
  visibility   text not null default 'private' check (visibility in ('private', 'link', 'public')),
  stage        jsonb,
  ranked       boolean not null default false,
  counted      boolean not null default true,
  vip          boolean not null default false,
  take_path    text check (take_path is null or take_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.(webm|ogg|m4a|mp4|mp3|aac|wav)$'),
  take_mime    text check (take_mime is null or length(take_mime) <= 60),
  take_bytes   integer check (take_bytes is null or take_bytes between 1 and 26214400),
  duration_s   real check (duration_s is null or duration_s between 0 and 7200),
  song_start_s real not null default 0 check (song_start_s between 0 and 7200),
  timemap      jsonb check (timemap is null or (jsonb_typeof(timemap) = 'array' and jsonb_array_length(timemap) <= 60)),
  device       jsonb check (device is null or (jsonb_typeof(device) = 'object' and pg_column_size(device) < 2000)),
  live         jsonb check (live is null or (jsonb_typeof(live) = 'object' and pg_column_size(live) < 24000)),
  contour      text check (contour is null or (length(contour) <= 40000 and contour ~ '^[A-Za-z0-9+/=]*$')),
  verify       jsonb check (verify is null or (jsonb_typeof(verify) = 'object' and pg_column_size(verify) < 60000)),
  score        integer check (score is null or score between 0 and 100),
  grade        text check (grade is null or length(grade) <= 3),
  parts        jsonb check (parts is null or jsonb_typeof(parts) = 'object'),
  verified     boolean not null default false,
  cheers       integer not null default 0 check (cheers >= 0),
  plays        integer not null default 0 check (plays >= 0),
  created_at   timestamptz not null default now(),
  finished_at  timestamptz,
  scored_at    timestamptz,
  expires_at   timestamptz
);
create index if not exists karaoke_perf_user_idx on public.karaoke_performances (user_id, created_at desc);
create index if not exists karaoke_perf_public_idx on public.karaoke_performances (created_at desc) where visibility = 'public' and status = 'scored';
create index if not exists karaoke_perf_rank_idx on public.karaoke_performances (score desc, created_at desc) where visibility = 'public' and status = 'scored' and ranked;
create index if not exists karaoke_perf_video_idx on public.karaoke_performances (video_id, score desc) where status = 'scored';
create index if not exists karaoke_perf_room_idx on public.karaoke_performances (room_id, created_at desc) where room_id is not null;
create index if not exists karaoke_perf_status_idx on public.karaoke_performances (status, created_at) where status in ('recording', 'uploaded', 'verifying');

-- ── 5 · CHALLENGES AND BATTLES ─────────────────────────────────────
create table if not exists public.karaoke_challenges (
  id             uuid primary key default gen_random_uuid(),
  kind           text not null default 'challenge' check (kind in ('challenge', 'battle')),
  video_id       text not null references public.karaoke_songs(video_id),
  room_id        uuid references public.karaoke_rooms(id) on delete set null,
  a_user         uuid not null references auth.users(id) on delete cascade,
  a_perf         uuid not null references public.karaoke_performances(id) on delete cascade,
  a_stage        jsonb,
  b_user         uuid references auth.users(id) on delete cascade,
  b_perf         uuid references public.karaoke_performances(id) on delete set null,
  b_stage        jsonb,
  open           boolean not null default false,
  is_public      boolean not null default false,
  status         text not null default 'waiting' check (status in ('waiting', 'voting', 'done', 'declined', 'expired')),
  message        text check (message is null or length(message) <= 140),
  votes_a        integer not null default 0 check (votes_a >= 0),
  votes_b        integer not null default 0 check (votes_b >= 0),
  winner         text check (winner is null or winner in ('a', 'b', 'draw')),
  created_at     timestamptz not null default now(),
  answered_at    timestamptz,
  voting_ends_at timestamptz,
  expires_at     timestamptz not null default now() + interval '7 days'
);
create index if not exists karaoke_ch_open_idx on public.karaoke_challenges (status, created_at desc) where is_public;
create index if not exists karaoke_ch_a_idx on public.karaoke_challenges (a_user, created_at desc);
create index if not exists karaoke_ch_b_idx on public.karaoke_challenges (b_user, created_at desc);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'karaoke_perf_challenge_fk') then
    alter table public.karaoke_performances
      add constraint karaoke_perf_challenge_fk foreign key (challenge_id) references public.karaoke_challenges(id) on delete set null;
  end if;
end $$;

create table if not exists public.karaoke_votes (
  challenge_id uuid not null references public.karaoke_challenges(id) on delete cascade,
  voter_id     uuid not null references auth.users(id) on delete cascade,
  pick         text not null check (pick in ('a', 'b')),
  created_at   timestamptz not null default now(),
  primary key (challenge_id, voter_id)
);

create table if not exists public.karaoke_cheers (
  id             bigint generated always as identity primary key,
  performance_id uuid not null references public.karaoke_performances(id) on delete cascade,
  user_id        uuid not null references auth.users(id) on delete cascade,
  emoji          text not null check (emoji in ('🔥', '🙌', '💃', '❤️', '🎉', '🥁', '🎤', '👑')),
  at_s           real not null check (at_s between 0 and 7200),
  created_at     timestamptz not null default now()
);
create index if not exists karaoke_cheers_perf_idx on public.karaoke_cheers (performance_id, at_s);
create index if not exists karaoke_cheers_user_idx on public.karaoke_cheers (user_id, performance_id);

-- ── 6 · VIP ────────────────────────────────────────────────────────
create table if not exists public.karaoke_passes (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  starts_at  timestamptz not null default now(),
  expires_at timestamptz,
  source     text not null default 'grant' check (source in ('grant', 'purchase', 'promo')),
  note       text check (note is null or length(note) <= 400),
  granted_by text,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists karaoke_passes_user_idx on public.karaoke_passes (user_id) where revoked_at is null;

create table if not exists public.karaoke_waitlist (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- ── 7 · HOUSEKEEPING TRIGGERS ──────────────────────────────────────
create or replace function public.karaoke_touch()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists karaoke_songs_touch on public.karaoke_songs;
create trigger karaoke_songs_touch before update on public.karaoke_songs for each row execute function public.karaoke_touch();
drop trigger if exists karaoke_rooms_touch on public.karaoke_rooms;
create trigger karaoke_rooms_touch before update on public.karaoke_rooms for each row execute function public.karaoke_touch();
drop trigger if exists karaoke_queue_touch on public.karaoke_queue;
create trigger karaoke_queue_touch before update on public.karaoke_queue for each row execute function public.karaoke_touch();
drop trigger if exists karaoke_settings_touch on public.karaoke_settings;
create trigger karaoke_settings_touch before update on public.karaoke_settings for each row execute function public.karaoke_touch();

-- ── 8 · SMALL SHARED HELPERS ───────────────────────────────────────
-- The month runs on Nairobi time, which is where the allowance resets.
create or replace function public.karaoke_month_start()
returns timestamptz
language sql
stable
set search_path = pg_catalog
as $$
  select (date_trunc('month', now() at time zone 'Africa/Nairobi')) at time zone 'Africa/Nairobi';
$$;

-- Six characters, no 0/O or 1/I, drawn from real randomness.
create or replace function public.karaoke_new_code()
returns text
language plpgsql
volatile
set search_path = pg_catalog, public
as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_bytes bytea;
  v_code text;
  i int;
begin
  loop
    v_bytes := uuid_send(gen_random_uuid());
    v_code := '';
    for i in 0..5 loop
      v_code := v_code || substr(alphabet, 1 + (get_byte(v_bytes, i) % 32), 1);
    end loop;
    exit when not exists (select 1 from public.karaoke_rooms r where r.code = v_code);
  end loop;
  return v_code;
end;
$$;

-- How a member appears on a stage: the name and look they chose on
-- their Cabana profile. Never an email, phone or real name they did
-- not choose to show.
create or replace function public.karaoke_stage(p_uid uuid)
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select coalesce(
    (select jsonb_build_object(
        'handle', m.handle,
        'name', coalesce(nullif(btrim(m.display_name), ''), 'Cabana singer'),
        'avatar', m.avatar,
        'photo', case when m.photo_status = 'approved' then m.photo_url end,
        'type', m.account_type)
       from public.member_public_profiles m where m.user_id = p_uid),
    jsonb_build_object('handle', null, 'name', 'Cabana singer', 'avatar', null, 'photo', null, 'type', 'individual'));
$$;

create or replace function public.karaoke_vip_of(p_uid uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  st public.karaoke_settings%rowtype;
  v_until timestamptz;
  v_src text;
begin
  if p_uid is null then return jsonb_build_object('vip', false); end if;
  select * into st from public.karaoke_settings where id = 1;
  select p.expires_at, p.source into v_until, v_src
    from public.karaoke_passes p
   where p.user_id = p_uid and p.revoked_at is null and p.starts_at <= now()
     and (p.expires_at is null or p.expires_at > now())
   order by p.expires_at desc nulls first
   limit 1;
  if found then return jsonb_build_object('vip', true, 'until', v_until, 'source', v_src); end if;
  if coalesce(st.open_to_all, false) then return jsonb_build_object('vip', true, 'source', 'open'); end if;
  if coalesce(st.premium_includes_vip, false) and exists (
      select 1 from public.live_passes lp
       where lp.user_id = p_uid and lp.revoked_at is null and lp.starts_at <= now()
         and (lp.expires_at is null or lp.expires_at > now())) then
    return jsonb_build_object('vip', true, 'source', 'premium');
  end if;
  if p_uid = auth.uid() and public.is_admin() then return jsonb_build_object('vip', true, 'source', 'team'); end if;
  return jsonb_build_object('vip', false);
end;
$$;

create or replace function public.karaoke_used(p_uid uuid)
returns integer
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select count(*)::int from public.karaoke_performances p
   where p.user_id = p_uid and p.counted and p.created_at >= public.karaoke_month_start();
$$;

-- Row-level helpers. security definer so a policy can ask about a room
-- without recursing through the room's own policy.
create or replace function public.karaoke_is_member(p_room uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select auth.uid() is not null and exists (
    select 1 from public.karaoke_members m where m.room_id = p_room and m.user_id = auth.uid());
$$;

create or replace function public.karaoke_is_invited(p_room uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select auth.uid() is not null and exists (
    select 1 from public.karaoke_invites i where i.room_id = p_room and i.invitee_id = auth.uid());
$$;

create or replace function public.karaoke_room_visible(p_room uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1 from public.karaoke_rooms r
     where r.id = p_room
       and (r.visibility = 'public'
            or r.host_id = auth.uid()
            or public.karaoke_is_member(r.id)
            or public.karaoke_is_invited(r.id)
            or public.is_admin()));
$$;

-- A take may only be written into the singer's own folder, for a
-- performance that is theirs and still recording.
create or replace function public.karaoke_take_writable(p_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  m text[];
begin
  if auth.uid() is null then return false; end if;
  m := regexp_match(coalesce(p_name, ''), '^([0-9a-f-]{36})/([0-9a-f-]{36})\.(webm|ogg|m4a|mp4|mp3|aac|wav)$');
  if m is null or m[1] <> auth.uid()::text then return false; end if;
  return exists (
    select 1 from public.karaoke_performances p
     where p.id = m[2]::uuid and p.user_id = auth.uid() and p.status = 'recording');
exception when others then
  return false;
end;
$$;

-- One room, as its members see it.
create or replace function public.karaoke_room_json(p_room uuid, p_uid uuid)
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select jsonb_build_object(
    'id', r.id, 'code', r.code, 'secret', r.secret, 'title', r.title, 'setup', r.setup,
    'visibility', r.visibility, 'status', r.status, 'host_id', r.host_id, 'host', r.host_stage,
    'now_playing', r.now_playing, 'created_at', r.created_at,
    'role', (select m.role from public.karaoke_members m where m.room_id = r.id and m.user_id = p_uid),
    'members', coalesce((
      select jsonb_agg(jsonb_build_object('user_id', m.user_id, 'role', m.role, 'stage', m.stage, 'seen_at', m.seen_at)
                       order by (m.role = 'host') desc, (m.role = 'singer') desc, m.joined_at)
        from public.karaoke_members m
       where m.room_id = r.id
         -- In a public room the audience is counted, not listed.
         and (r.visibility = 'private' or m.role <> 'guest' or m.user_id = p_uid)), '[]'::jsonb),
    'audience', (select count(*) from public.karaoke_members m where m.room_id = r.id and m.role = 'guest'),
    'queue', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', q.id, 'video_id', q.video_id, 'singer_id', q.singer_id, 'guest_name', q.guest_name,
               'position', q.position, 'status', q.status, 'battle', q.battle, 'performance_id', q.performance_id,
               'title', s.title, 'artist', s.artist, 'track', s.track, 'track_artist', s.track_artist,
               'kind', s.kind, 'duration_s', s.duration_s, 'lyrics_status', s.lyrics_status)
             order by q.position, q.created_at)
        from public.karaoke_queue q join public.karaoke_songs s on s.video_id = q.video_id
       where q.room_id = r.id and q.status in ('queued', 'singing')), '[]'::jsonb),
    'server_time', clock_timestamp())
  from public.karaoke_rooms r
  where r.id = p_room;
$$;

-- ── 9 · WHAT THE PAGE ASKS FIRST ───────────────────────────────────
create or replace function public.karaoke_state()
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  st public.karaoke_settings%rowtype;
  v_uid uuid := auth.uid();
  v_vip jsonb;
  v_is_vip boolean;
  v_used int := 0;
  v_handle text;
  v_name text;
begin
  select * into st from public.karaoke_settings where id = 1;
  v_vip := public.karaoke_vip_of(v_uid);
  v_is_vip := coalesce((v_vip ->> 'vip')::boolean, false);
  if v_uid is not null then
    v_used := public.karaoke_used(v_uid);
    select m.handle, m.display_name into v_handle, v_name from public.member_public_profiles m where m.user_id = v_uid;
  end if;
  return jsonb_build_object(
    'signed_in', v_uid is not null,
    'user_id', v_uid,
    'handle', v_handle,
    'name', v_name,
    'vip', v_is_vip,
    'vip_until', v_vip ->> 'until',
    'vip_source', v_vip ->> 'source',
    'free_sessions', st.free_sessions,
    'used', v_used,
    'remaining', case when v_is_vip then null else greatest(0, st.free_sessions - v_used) end,
    'resets_at', public.karaoke_month_start() + interval '1 month',
    'vip_name', st.vip_name,
    'price_kes', st.price_kes,
    'price_period', st.price_period,
    'banner_title', st.banner_title,
    'banner_text', st.banner_text,
    'ranked_needs_karaoke', st.ranked_needs_karaoke,
    'free_take_days', st.free_take_days,
    'waitlisted', v_uid is not null and exists (select 1 from public.karaoke_waitlist w where w.user_id = v_uid),
    'server_time', clock_timestamp()
  );
end;
$$;

-- The server's clock, for keeping every device in a room on one beat.
create or replace function public.karaoke_now()
returns timestamptz
language sql
volatile
set search_path = pg_catalog
as $$
  select clock_timestamp();
$$;

-- ── 10 · ROOMS ─────────────────────────────────────────────────────
create or replace function public.karaoke_room_create(p_title text default null, p_setup text default 'online', p_visibility text default 'private')
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_uid uuid := auth.uid();
  v_id uuid;
  v_stage jsonb;
begin
  if v_uid is null then raise exception 'sign_in_required' using errcode = '28000'; end if;
  if (select count(*) from public.karaoke_rooms r where r.host_id = v_uid and r.created_at > now() - interval '1 day') >= 30 then
    raise exception 'too_many_rooms' using errcode = 'P0001';
  end if;
  -- A host keeps at most three rooms open; the least recent closes.
  update public.karaoke_rooms set status = 'ended', ended_at = now()
   where id in (select r.id from public.karaoke_rooms r
                 where r.host_id = v_uid and r.status <> 'ended'
                 order by r.last_active_at desc offset 2);
  v_stage := public.karaoke_stage(v_uid);
  insert into public.karaoke_rooms (code, host_id, host_stage, title, setup, visibility)
  values (public.karaoke_new_code(), v_uid, v_stage,
          coalesce(nullif(btrim(regexp_replace(left(coalesce(p_title, ''), 60), '[[:cntrl:]]', '', 'g')), ''), 'Karaoke night'),
          case when p_setup in ('screen', 'online') then p_setup else 'online' end,
          case when p_visibility in ('private', 'public') then p_visibility else 'private' end)
  returning id into v_id;
  insert into public.karaoke_members (room_id, user_id, role, stage) values (v_id, v_uid, 'host', v_stage);
  return public.karaoke_room_json(v_id, v_uid);
end;
$$;

-- Coming in by code (typed, scanned, or from a link). The code is the
-- key to a private room. Signed-in members are remembered; a guest
-- without an account can watch and listen.
create or replace function public.karaoke_enter(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_uid uuid := auth.uid();
  v_code text := upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
  v_room public.karaoke_rooms%rowtype;
  v_invited boolean;
begin
  if v_code !~ '^[A-HJ-NP-Z2-9]{6}$' then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  select * into v_room from public.karaoke_rooms where code = v_code;
  if not found then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if v_room.status = 'ended' then return jsonb_build_object('ok', false, 'reason', 'ended', 'title', v_room.title); end if;
  if v_uid is not null then
    v_invited := exists (select 1 from public.karaoke_invites i where i.room_id = v_room.id and i.invitee_id = v_uid and i.status <> 'declined');
    insert into public.karaoke_members (room_id, user_id, role, stage)
    values (v_room.id, v_uid,
            case when v_room.host_id = v_uid then 'host'
                 when v_invited or v_room.visibility = 'private' then 'singer'
                 else 'guest' end,
            public.karaoke_stage(v_uid))
    on conflict (room_id, user_id) do update
      set seen_at = now(),
          stage = excluded.stage,
          role = case when public.karaoke_members.role = 'guest' and v_invited then 'singer' else public.karaoke_members.role end;
    update public.karaoke_invites set status = 'accepted', answered_at = now()
     where room_id = v_room.id and invitee_id = v_uid and status = 'pending';
  end if;
  update public.karaoke_rooms set last_active_at = now() where id = v_room.id;
  return jsonb_build_object('ok', true, 'room', public.karaoke_room_json(v_room.id, v_uid));
end;
$$;

create or replace function public.karaoke_room_get(p_room uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
begin
  if not public.karaoke_room_visible(p_room) then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  return jsonb_build_object('ok', true, 'room', public.karaoke_room_json(p_room, auth.uid()));
end;
$$;

-- The host runs the room. A singer may only say what is playing,
-- because in a room spread across places the singer's device keeps
-- the time for everyone.
create or replace function public.karaoke_room_update(p_room uuid, p_patch jsonb)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_uid uuid := auth.uid();
  v_room public.karaoke_rooms%rowtype;
  v_host boolean;
  v_singer boolean;
  v_patch jsonb := coalesce(p_patch, '{}'::jsonb);
begin
  if v_uid is null then raise exception 'sign_in_required' using errcode = '28000'; end if;
  select * into v_room from public.karaoke_rooms where id = p_room;
  if not found then raise exception 'not_found' using errcode = 'P0002'; end if;
  v_host := v_room.host_id = v_uid or public.is_admin();
  v_singer := exists (select 1 from public.karaoke_members m where m.room_id = p_room and m.user_id = v_uid and m.role in ('host', 'singer'));
  if not v_host and not v_singer then raise exception 'forbidden' using errcode = '42501'; end if;
  if v_room.status = 'ended' and not v_host then raise exception 'room_ended' using errcode = 'P0001'; end if;
  if not v_host then
    v_patch := v_patch - 'title' - 'visibility' - 'setup';
    if v_patch ->> 'status' = 'ended' then v_patch := v_patch - 'status'; end if;
  end if;
  update public.karaoke_rooms set
    title = case when v_patch ? 'title'
                 then coalesce(nullif(btrim(regexp_replace(left(v_patch ->> 'title', 60), '[[:cntrl:]]', '', 'g')), ''), title)
                 else title end,
    visibility = case when v_patch ->> 'visibility' in ('private', 'public') then v_patch ->> 'visibility' else visibility end,
    setup = case when v_patch ->> 'setup' in ('screen', 'online') then v_patch ->> 'setup' else setup end,
    status = case when v_patch ->> 'status' in ('open', 'live', 'ended') then v_patch ->> 'status' else status end,
    ended_at = case when v_patch ->> 'status' = 'ended' then now() else ended_at end,
    now_playing = case when v_patch ? 'now_playing'
                       then case when jsonb_typeof(v_patch -> 'now_playing') = 'object' then v_patch -> 'now_playing' end
                       else now_playing end,
    host_stage = case when v_patch ->> 'visibility' = 'public' then public.karaoke_stage(host_id) else host_stage end,
    last_active_at = now()
  where id = p_room;
  if v_patch ->> 'status' = 'ended' then
    update public.karaoke_queue set status = 'skipped' where room_id = p_room and status = 'queued';
  end if;
  return public.karaoke_room_json(p_room, v_uid);
end;
$$;

create or replace function public.karaoke_leave(p_room uuid)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then return jsonb_build_object('ok', true); end if;
  delete from public.karaoke_members where room_id = p_room and user_id = v_uid and role <> 'host';
  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.karaoke_member_set(p_room uuid, p_user uuid, p_role text)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'sign_in_required' using errcode = '28000'; end if;
  if not exists (select 1 from public.karaoke_rooms r where r.id = p_room and (r.host_id = v_uid or public.is_admin())) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_user = v_uid then raise exception 'host_role_fixed' using errcode = 'P0001'; end if;
  if p_role = 'remove' then
    delete from public.karaoke_members where room_id = p_room and user_id = p_user and role <> 'host';
    update public.karaoke_queue set status = 'skipped' where room_id = p_room and singer_id = p_user and status = 'queued';
  elsif p_role in ('singer', 'guest') then
    update public.karaoke_members set role = p_role where room_id = p_room and user_id = p_user and role <> 'host';
  else
    raise exception 'bad_role' using errcode = '22023';
  end if;
  return public.karaoke_room_json(p_room, v_uid);
end;
$$;

-- ── 11 · INVITATIONS BY USERNAME ───────────────────────────────────
create or replace function public.karaoke_invite(p_room uuid, p_handle text)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_uid uuid := auth.uid();
  v_room public.karaoke_rooms%rowtype;
  v_h text := lower(btrim(regexp_replace(coalesce(p_handle, ''), '^@+', '')));
  v_target uuid;
  v_pub boolean;
  v_tname text;
  v_inv uuid;
  v_me jsonb;
begin
  if v_uid is null then raise exception 'sign_in_required' using errcode = '28000'; end if;
  select * into v_room from public.karaoke_rooms where id = p_room;
  if not found or v_room.status = 'ended' then return jsonb_build_object('ok', false, 'reason', 'room'); end if;
  if not exists (select 1 from public.karaoke_members m where m.room_id = p_room and m.user_id = v_uid and m.role in ('host', 'singer')) then
    return jsonb_build_object('ok', false, 'reason', 'forbidden');
  end if;
  if v_h !~ '^[a-z0-9][a-z0-9._]{1,22}[a-z0-9]$' then return jsonb_build_object('ok', false, 'reason', 'handle'); end if;
  select m.user_id, m.published, m.display_name into v_target, v_pub, v_tname
    from public.member_public_profiles m where lower(m.handle) = v_h limit 1;
  if v_target is null then return jsonb_build_object('ok', false, 'reason', 'no_member'); end if;
  if v_target = v_uid then return jsonb_build_object('ok', false, 'reason', 'self'); end if;
  if (select count(*) from public.karaoke_invites i where i.inviter_id = v_uid and i.created_at > now() - interval '1 hour') >= 40
     or (select count(*) from public.karaoke_invites i where i.inviter_id = v_uid and i.invitee_id = v_target and i.created_at > now() - interval '1 hour') >= 5 then
    return jsonb_build_object('ok', false, 'reason', 'rate');
  end if;
  insert into public.karaoke_invites (room_id, inviter_id, invitee_id)
  values (p_room, v_uid, v_target)
  on conflict (room_id, invitee_id) do update
    set inviter_id = excluded.inviter_id, created_at = now(),
        status = case when public.karaoke_invites.status = 'accepted' then 'accepted' else 'pending' end
  returning id into v_inv;
  v_me := public.karaoke_stage(v_uid);
  perform public.cabana_notify(
    v_target, 'karaoke',
    left(coalesce(v_me ->> 'name', 'A friend') || ' invited you to sing', 140),
    left('Karaoke room “' || v_room.title || '”. Tap to join and take the mic.', 240),
    '/events/karaoke/room/' || v_room.code,
    jsonb_build_object('room', v_room.id, 'invite', v_inv, 'from', v_me ->> 'handle'));
  return jsonb_build_object('ok', true, 'invite', v_inv,
    'member', jsonb_build_object('handle', v_h, 'name', case when v_pub then v_tname end));
end;
$$;

create or replace function public.karaoke_invites_mine()
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
      'id', i.id, 'status', i.status, 'created_at', i.created_at,
      'room', jsonb_build_object('id', r.id, 'code', r.code, 'title', r.title, 'setup', r.setup,
                                 'visibility', r.visibility, 'status', r.status, 'now_playing', r.now_playing),
      'from', public.karaoke_stage(i.inviter_id))
    order by i.created_at desc), '[]'::jsonb)
  from public.karaoke_invites i
  join public.karaoke_rooms r on r.id = i.room_id
  where auth.uid() is not null and i.invitee_id = auth.uid()
    and i.status = 'pending' and r.status <> 'ended'
    and i.created_at > now() - interval '2 days';
$$;

create or replace function public.karaoke_invite_answer(p_invite uuid, p_accept boolean)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_uid uuid := auth.uid();
  v_inv public.karaoke_invites%rowtype;
  v_code text;
begin
  if v_uid is null then raise exception 'sign_in_required' using errcode = '28000'; end if;
  select * into v_inv from public.karaoke_invites where id = p_invite and invitee_id = v_uid;
  if not found then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  update public.karaoke_invites set status = case when p_accept then 'accepted' else 'declined' end, answered_at = now() where id = p_invite;
  select code into v_code from public.karaoke_rooms where id = v_inv.room_id and status <> 'ended';
  if p_accept and v_code is not null then
    insert into public.karaoke_members (room_id, user_id, role, stage)
    values (v_inv.room_id, v_uid, 'singer', public.karaoke_stage(v_uid))
    on conflict (room_id, user_id) do update set role = case when public.karaoke_members.role = 'guest' then 'singer' else public.karaoke_members.role end, seen_at = now();
  end if;
  return jsonb_build_object('ok', true, 'code', case when p_accept then v_code end);
end;
$$;

-- ── 12 · THE LINE-UP ───────────────────────────────────────────────
create or replace function public.karaoke_queue_add(p_room uuid, p_video text, p_singer uuid default null, p_guest text default null, p_battle uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_uid uuid := auth.uid();
  v_room public.karaoke_rooms%rowtype;
  v_host boolean;
  v_singer uuid := p_singer;
  v_guest text := nullif(btrim(regexp_replace(left(coalesce(p_guest, ''), 30), '[[:cntrl:]]', '', 'g')), '');
  v_pos int;
  v_id uuid;
begin
  if v_uid is null then raise exception 'sign_in_required' using errcode = '28000'; end if;
  select * into v_room from public.karaoke_rooms where id = p_room;
  if not found or v_room.status = 'ended' then raise exception 'room_ended' using errcode = 'P0001'; end if;
  if not exists (select 1 from public.karaoke_members m where m.room_id = p_room and m.user_id = v_uid and m.role in ('host', 'singer')) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  v_host := v_room.host_id = v_uid;
  if not exists (select 1 from public.karaoke_songs s where s.video_id = p_video and not s.hidden) then
    raise exception 'song_unknown' using errcode = 'P0002';
  end if;
  if v_guest is not null then
    if not v_host then raise exception 'forbidden' using errcode = '42501'; end if;
    v_singer := null;
  elsif v_singer is null then
    v_singer := v_uid;
  elsif v_singer <> v_uid then
    if not v_host then raise exception 'forbidden' using errcode = '42501'; end if;
    if not exists (select 1 from public.karaoke_members m where m.room_id = p_room and m.user_id = v_singer and m.role in ('host', 'singer')) then
      raise exception 'not_a_singer' using errcode = 'P0001';
    end if;
  end if;
  if (select count(*) from public.karaoke_queue q where q.room_id = p_room and q.status in ('queued', 'singing')) >= 60 then
    raise exception 'queue_full' using errcode = 'P0001';
  end if;
  select coalesce(max(q.position), 0) + 1 into v_pos from public.karaoke_queue q where q.room_id = p_room;
  insert into public.karaoke_queue (room_id, video_id, singer_id, guest_name, added_by, position, battle)
  values (p_room, p_video, v_singer, v_guest, v_uid, v_pos, p_battle)
  returning id into v_id;
  update public.karaoke_rooms set last_active_at = now() where id = p_room;
  return public.karaoke_room_json(p_room, v_uid);
end;
$$;

create or replace function public.karaoke_queue_set(p_item uuid, p_action text, p_value integer default null)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_uid uuid := auth.uid();
  v_item public.karaoke_queue%rowtype;
  v_host boolean;
  v_own boolean;
begin
  if v_uid is null then raise exception 'sign_in_required' using errcode = '28000'; end if;
  select * into v_item from public.karaoke_queue where id = p_item;
  if not found then raise exception 'not_found' using errcode = 'P0002'; end if;
  v_host := exists (select 1 from public.karaoke_rooms r where r.id = v_item.room_id and (r.host_id = v_uid or public.is_admin()));
  v_own := v_item.singer_id = v_uid or v_item.added_by = v_uid;
  if p_action in ('remove', 'skip') and (v_host or v_own) then
    update public.karaoke_queue set status = 'skipped' where id = p_item and status in ('queued', 'singing');
  elsif p_action = 'done' and (v_host or v_own) then
    update public.karaoke_queue set status = 'done' where id = p_item;
  elsif p_action = 'move' and v_host then
    update public.karaoke_queue set position = greatest(0, coalesce(p_value, position)) where id = p_item;
  elsif p_action = 'next' and v_host then
    -- Play this one next: one ahead of everything still queued.
    update public.karaoke_queue set position = coalesce((select min(q.position) from public.karaoke_queue q
                                                          where q.room_id = v_item.room_id and q.status = 'queued'), 1) - 1
     where id = p_item;
  else
    raise exception 'forbidden' using errcode = '42501';
  end if;
  update public.karaoke_rooms set last_active_at = now() where id = v_item.room_id;
  return public.karaoke_room_json(v_item.room_id, v_uid);
end;
$$;

-- ── 13 · SINGING FOR THE RECORD ────────────────────────────────────
-- The only way a performance comes into being. This is where the free
-- allowance is counted.
create or replace function public.karaoke_begin(
  p_video text,
  p_room uuid default null,
  p_queue uuid default null,
  p_guest text default null,
  p_song_start real default 0,
  p_challenge uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_uid uuid := auth.uid();
  st public.karaoke_settings%rowtype;
  v_song public.karaoke_songs%rowtype;
  v_vip jsonb;
  v_is_vip boolean;
  v_used int := 0;
  v_ch public.karaoke_challenges%rowtype;
  v_guest text := nullif(btrim(regexp_replace(left(coalesce(p_guest, ''), 30), '[[:cntrl:]]', '', 'g')), '');
  v_ranked boolean;
  v_id uuid;
begin
  if v_uid is null then return jsonb_build_object('ok', false, 'reason', 'signin'); end if;
  select * into st from public.karaoke_settings where id = 1;
  select * into v_song from public.karaoke_songs where video_id = p_video and not hidden;
  if not found then return jsonb_build_object('ok', false, 'reason', 'song'); end if;

  if p_room is not null and not exists (
      select 1 from public.karaoke_rooms r join public.karaoke_members m on m.room_id = r.id and m.user_id = v_uid
       where r.id = p_room and r.status <> 'ended' and m.role in ('host', 'singer')) then
    return jsonb_build_object('ok', false, 'reason', 'room');
  end if;
  if v_guest is not null and (p_room is null or not exists (select 1 from public.karaoke_rooms r where r.id = p_room and r.host_id = v_uid)) then
    return jsonb_build_object('ok', false, 'reason', 'guest');
  end if;

  -- One take at a time. Anything left recording was abandoned and does
  -- not count.
  update public.karaoke_performances set status = 'failed', counted = false
   where user_id = v_uid and status = 'recording';

  v_vip := public.karaoke_vip_of(v_uid);
  v_is_vip := coalesce((v_vip ->> 'vip')::boolean, false);
  if not v_is_vip then
    v_used := public.karaoke_used(v_uid);
    if v_used >= st.free_sessions then
      return jsonb_build_object('ok', false, 'reason', 'quota', 'used', v_used, 'free', st.free_sessions,
                                'resets_at', public.karaoke_month_start() + interval '1 month');
    end if;
  end if;

  if p_challenge is not null then
    select * into v_ch from public.karaoke_challenges where id = p_challenge;
    if not found or v_ch.status <> 'waiting' or v_ch.video_id <> p_video or v_ch.a_user = v_uid
       or (v_ch.b_user is not null and v_ch.b_user <> v_uid) or (v_ch.b_user is null and not v_ch.open)
       or v_ch.expires_at < now() or v_guest is not null then
      return jsonb_build_object('ok', false, 'reason', 'challenge');
    end if;
  end if;

  -- Ranked means a fair fight: a karaoke (instrumental) track, lyrics
  -- with a clock, and the account holder singing.
  v_ranked := (v_song.kind = 'karaoke' or not st.ranked_needs_karaoke)
              and v_song.lyrics_status in ('words', 'synced') and v_guest is null;

  insert into public.karaoke_performances (user_id, guest_name, room_id, queue_id, video_id, challenge_id, ranked, vip, song_start_s, expires_at)
  values (v_uid, v_guest, p_room, p_queue, p_video, p_challenge, v_ranked, v_is_vip,
          greatest(0, least(7200, coalesce(p_song_start, 0))),
          case when v_is_vip then null else now() + make_interval(days => st.free_take_days) end)
  returning id into v_id;

  if p_queue is not null then
    update public.karaoke_queue set status = 'singing', performance_id = v_id
     where id = p_queue and room_id = p_room and status in ('queued', 'singing');
  end if;
  if p_room is not null then update public.karaoke_rooms set last_active_at = now() where id = p_room; end if;

  return jsonb_build_object('ok', true, 'id', v_id, 'ranked', v_ranked, 'vip', v_is_vip,
    'folder', v_uid::text,
    'remaining', case when v_is_vip then null else greatest(0, st.free_sessions - v_used - 1) end);
end;
$$;

-- The take is in storage; record what the page measured and hand the
-- performance to the verifier.
create or replace function public.karaoke_finish(
  p_perf uuid,
  p_ext text,
  p_mime text,
  p_bytes integer,
  p_duration real,
  p_timemap jsonb default null,
  p_device jsonb default null,
  p_live jsonb default null,
  p_contour text default null)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_uid uuid := auth.uid();
  v_perf public.karaoke_performances%rowtype;
begin
  if v_uid is null then raise exception 'sign_in_required' using errcode = '28000'; end if;
  select * into v_perf from public.karaoke_performances where id = p_perf and user_id = v_uid;
  if not found then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if v_perf.status <> 'recording' then return jsonb_build_object('ok', false, 'reason', 'state', 'status', v_perf.status); end if;
  if coalesce(p_ext, '') !~ '^(webm|ogg|m4a|mp4|mp3|aac|wav)$' then return jsonb_build_object('ok', false, 'reason', 'format'); end if;
  if coalesce(p_duration, 0) < 20 then
    update public.karaoke_performances set status = 'discarded', counted = false, finished_at = now() where id = p_perf;
    return jsonb_build_object('ok', false, 'reason', 'short');
  end if;
  update public.karaoke_performances set
    status = 'uploaded',
    take_path = v_uid::text || '/' || p_perf::text || '.' || p_ext,
    take_mime = left(coalesce(p_mime, 'audio/' || p_ext), 60),
    take_bytes = greatest(1, least(26214400, coalesce(p_bytes, 1))),
    duration_s = least(7200, p_duration),
    timemap = case when jsonb_typeof(p_timemap) = 'array' and jsonb_array_length(p_timemap) <= 60 then p_timemap end,
    device = case when jsonb_typeof(p_device) = 'object' and pg_column_size(p_device) < 2000 then p_device end,
    live = case when jsonb_typeof(p_live) = 'object' and pg_column_size(p_live) < 24000 then p_live end,
    contour = case when p_contour ~ '^[A-Za-z0-9+/=]*$' and length(p_contour) <= 40000 then p_contour end,
    finished_at = now()
  where id = p_perf;
  return jsonb_build_object('ok', true);
end;
$$;

-- Walking away before the verdict gives the session back.
create or replace function public.karaoke_discard(p_perf uuid)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'sign_in_required' using errcode = '28000'; end if;
  update public.karaoke_performances set
    counted = case when status in ('recording', 'uploaded', 'failed') then false else counted end,
    status = 'discarded',
    visibility = 'private'
  where id = p_perf and user_id = v_uid and status <> 'discarded';
  update public.karaoke_queue set status = 'skipped' where performance_id = p_perf and status = 'singing';
  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.karaoke_publish(p_perf uuid, p_visibility text)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_uid uuid := auth.uid();
  v_perf public.karaoke_performances%rowtype;
  v_stage jsonb;
begin
  if v_uid is null then raise exception 'sign_in_required' using errcode = '28000'; end if;
  if p_visibility not in ('private', 'link', 'public') then raise exception 'bad_visibility' using errcode = '22023'; end if;
  select * into v_perf from public.karaoke_performances where id = p_perf and user_id = v_uid;
  if not found then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if p_visibility <> 'private' and v_perf.status <> 'scored' then return jsonb_build_object('ok', false, 'reason', 'not_scored'); end if;
  v_stage := public.karaoke_stage(v_uid);
  if v_perf.guest_name is not null then
    v_stage := jsonb_build_object('handle', null, 'name', v_perf.guest_name, 'guest', true, 'host', v_stage);
  end if;
  update public.karaoke_performances
     set visibility = p_visibility,
         stage = case when p_visibility = 'private' then stage else v_stage end
   where id = p_perf;
  return jsonb_build_object('ok', true, 'visibility', p_visibility);
end;
$$;

-- One performance, for the replay page. Link-only takes are reached
-- only through here, by their id, never by listing.
create or replace function public.karaoke_performance(p_perf uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  v_uid uuid := auth.uid();
  p public.karaoke_performances%rowtype;
  v_ok boolean;
begin
  select * into p from public.karaoke_performances where id = p_perf;
  if not found then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  v_ok := p.user_id = v_uid
       or (p.visibility in ('public', 'link') and p.status = 'scored')
       or (p.room_id is not null and public.karaoke_is_member(p.room_id))
       or public.is_admin();
  if not v_ok then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  return jsonb_build_object('ok', true, 'mine', p.user_id = v_uid, 'performance', jsonb_build_object(
    'id', p.id, 'user_id', case when p.user_id = v_uid or p.visibility <> 'private' then p.user_id end,
    'guest_name', p.guest_name, 'room_id', p.room_id, 'video_id', p.video_id, 'challenge_id', p.challenge_id,
    'status', p.status, 'visibility', p.visibility, 'stage', coalesce(p.stage, case when p.user_id = v_uid then public.karaoke_stage(v_uid) end),
    'ranked', p.ranked, 'vip', p.vip, 'has_take', p.take_path is not null and p.status in ('uploaded', 'verifying', 'scored'),
    'duration_s', p.duration_s, 'song_start_s', p.song_start_s, 'timemap', p.timemap, 'contour', p.contour,
    'verify', p.verify, 'score', p.score, 'grade', p.grade, 'parts', p.parts, 'verified', p.verified,
    'cheers', p.cheers, 'plays', p.plays, 'created_at', p.created_at, 'scored_at', p.scored_at, 'expires_at', p.expires_at),
    'song', (select jsonb_build_object('video_id', s.video_id, 'title', s.title, 'artist', s.artist, 'track', s.track,
                     'track_artist', s.track_artist, 'kind', s.kind, 'duration_s', s.duration_s, 'lyrics_status', s.lyrics_status,
                     'offset_s', s.offset_s, 'bpm', s.bpm, 'best_score', s.best_score, 'sung', s.sung)
               from public.karaoke_songs s where s.video_id = p.video_id),
    'moments', coalesce((select jsonb_agg(jsonb_build_object('e', c.emoji, 't', c.at_s) order by c.at_s)
                           from (select emoji, at_s from public.karaoke_cheers where performance_id = p.id order by created_at desc limit 300) c), '[]'::jsonb),
    'challenge', (select jsonb_build_object('id', c.id, 'kind', c.kind, 'status', c.status, 'winner', c.winner,
                         'a_perf', c.a_perf, 'b_perf', c.b_perf, 'votes_a', c.votes_a, 'votes_b', c.votes_b)
                    from public.karaoke_challenges c where c.id = p.challenge_id or c.a_perf = p.id or c.b_perf = p.id
                   order by c.created_at desc limit 1));
end;
$$;

-- ── 14 · CHALLENGES, BATTLES AND THE CROWD ─────────────────────────
create or replace function public.karaoke_challenge_create(p_perf uuid, p_handle text default null, p_message text default null)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_uid uuid := auth.uid();
  v_perf public.karaoke_performances%rowtype;
  v_target uuid;
  v_h text := lower(btrim(regexp_replace(coalesce(p_handle, ''), '^@+', '')));
  v_open boolean := v_h = '';
  v_vip boolean;
  v_id uuid;
  v_stage jsonb;
  v_song text;
begin
  if v_uid is null then raise exception 'sign_in_required' using errcode = '28000'; end if;
  select * into v_perf from public.karaoke_performances where id = p_perf and user_id = v_uid;
  if not found or v_perf.status <> 'scored' or v_perf.guest_name is not null then
    return jsonb_build_object('ok', false, 'reason', 'not_scored');
  end if;
  v_vip := coalesce((public.karaoke_vip_of(v_uid) ->> 'vip')::boolean, false);
  if (select count(*) from public.karaoke_challenges c where c.a_user = v_uid and c.status = 'waiting' and c.expires_at > now())
     >= (case when v_vip then 30 else 3 end) then
    return jsonb_build_object('ok', false, 'reason', 'limit', 'vip', v_vip);
  end if;
  if not v_open then
    if v_h !~ '^[a-z0-9][a-z0-9._]{1,22}[a-z0-9]$' then return jsonb_build_object('ok', false, 'reason', 'handle'); end if;
    select m.user_id into v_target from public.member_public_profiles m where lower(m.handle) = v_h limit 1;
    if v_target is null then return jsonb_build_object('ok', false, 'reason', 'no_member'); end if;
    if v_target = v_uid then return jsonb_build_object('ok', false, 'reason', 'self'); end if;
  end if;
  v_stage := public.karaoke_stage(v_uid);
  -- An open challenge is a public one, so the performance goes public.
  if v_open and v_perf.visibility <> 'public' then
    update public.karaoke_performances set visibility = 'public', stage = v_stage where id = p_perf;
    v_perf.visibility := 'public';
  end if;
  insert into public.karaoke_challenges (kind, video_id, room_id, a_user, a_perf, a_stage, b_user, open, is_public, message)
  values ('challenge', v_perf.video_id, v_perf.room_id, v_uid, p_perf, v_stage, v_target, v_open,
          v_perf.visibility = 'public',
          nullif(btrim(regexp_replace(left(coalesce(p_message, ''), 140), '[[:cntrl:]]', '', 'g')), ''))
  returning id into v_id;
  update public.karaoke_performances set challenge_id = coalesce(challenge_id, v_id) where id = p_perf;
  if v_target is not null then
    select coalesce(nullif(track, ''), title) into v_song from public.karaoke_songs where video_id = v_perf.video_id;
    perform public.cabana_notify(
      v_target, 'karaoke',
      left(coalesce(v_stage ->> 'name', 'Someone') || ' challenged you to a sing-off', 140),
      left('Beat ' || v_perf.score || ' on “' || coalesce(v_song, 'this song') || '”. You have 7 days.', 240),
      '/events/karaoke/c/' || v_id,
      jsonb_build_object('challenge', v_id));
  end if;
  return jsonb_build_object('ok', true, 'id', v_id, 'open', v_open);
end;
$$;

create or replace function public.karaoke_challenge_decline(p_challenge uuid)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if auth.uid() is null then raise exception 'sign_in_required' using errcode = '28000'; end if;
  update public.karaoke_challenges set status = 'declined', answered_at = now()
   where id = p_challenge and b_user = auth.uid() and status = 'waiting';
  return jsonb_build_object('ok', found);
end;
$$;

-- A battle: two performances of one song, sung in one room.
create or replace function public.karaoke_battle_open(p_room uuid, p_a uuid, p_b uuid)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_uid uuid := auth.uid();
  a public.karaoke_performances%rowtype;
  b public.karaoke_performances%rowtype;
  v_room public.karaoke_rooms%rowtype;
  v_id uuid;
begin
  if v_uid is null then raise exception 'sign_in_required' using errcode = '28000'; end if;
  select * into v_room from public.karaoke_rooms where id = p_room;
  if not found or (v_room.host_id <> v_uid and not public.is_admin()) then raise exception 'forbidden' using errcode = '42501'; end if;
  select * into a from public.karaoke_performances where id = p_a and room_id = p_room and status = 'scored';
  select * into b from public.karaoke_performances where id = p_b and room_id = p_room and status = 'scored';
  if a.id is null or b.id is null or a.video_id <> b.video_id or a.id = b.id then
    return jsonb_build_object('ok', false, 'reason', 'pair');
  end if;
  select id into v_id from public.karaoke_challenges where kind = 'battle' and a_perf = p_a and b_perf = p_b;
  if v_id is null then
    insert into public.karaoke_challenges (kind, video_id, room_id, a_user, a_perf, a_stage, b_user, b_perf, b_stage,
                                           is_public, status, answered_at, voting_ends_at)
    values ('battle', a.video_id, p_room, a.user_id, a.id,
            coalesce(a.stage, case when a.guest_name is not null then jsonb_build_object('name', a.guest_name, 'guest', true) else public.karaoke_stage(a.user_id) end),
            b.user_id, b.id,
            coalesce(b.stage, case when b.guest_name is not null then jsonb_build_object('name', b.guest_name, 'guest', true) else public.karaoke_stage(b.user_id) end),
            v_room.visibility = 'public', 'voting', now(),
            now() + case when v_room.visibility = 'public' then interval '24 hours' else interval '30 minutes' end)
    returning id into v_id;
    update public.karaoke_performances set challenge_id = v_id where id in (p_a, p_b) and challenge_id is null;
  end if;
  return jsonb_build_object('ok', true, 'id', v_id);
end;
$$;

create or replace function public.karaoke_challenge(p_challenge uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  v_uid uuid := auth.uid();
  c public.karaoke_challenges%rowtype;
begin
  select * into c from public.karaoke_challenges where id = p_challenge;
  if not found then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if not (c.is_public or c.open or c.a_user = v_uid or c.b_user = v_uid or public.is_admin()
          or (c.room_id is not null and public.karaoke_is_member(c.room_id))) then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;
  return jsonb_build_object('ok', true,
    'challenge', jsonb_build_object(
      'id', c.id, 'kind', c.kind, 'video_id', c.video_id, 'status', c.status, 'open', c.open, 'public', c.is_public,
      'message', c.message, 'votes_a', c.votes_a, 'votes_b', c.votes_b, 'winner', c.winner,
      'a_stage', c.a_stage, 'b_stage', c.b_stage, 'a_perf', c.a_perf, 'b_perf', c.b_perf,
      'a_mine', c.a_user = v_uid, 'b_mine', c.b_user = v_uid, 'for_me', c.b_user = v_uid or (c.open and c.a_user <> v_uid),
      'created_at', c.created_at, 'voting_ends_at', c.voting_ends_at, 'expires_at', c.expires_at),
    'my_vote', (select v.pick from public.karaoke_votes v where v.challenge_id = c.id and v.voter_id = v_uid),
    'a', (select jsonb_build_object('id', p.id, 'score', p.score, 'grade', p.grade, 'parts', p.parts, 'verified', p.verified,
                                    'duration_s', p.duration_s, 'song_start_s', p.song_start_s, 'timemap', p.timemap)
            from public.karaoke_performances p where p.id = c.a_perf),
    'b', (select jsonb_build_object('id', p.id, 'score', p.score, 'grade', p.grade, 'parts', p.parts, 'verified', p.verified,
                                    'duration_s', p.duration_s, 'song_start_s', p.song_start_s, 'timemap', p.timemap)
            from public.karaoke_performances p where p.id = c.b_perf and p.status = 'scored'),
    'song', (select jsonb_build_object('video_id', s.video_id, 'title', s.title, 'artist', s.artist, 'track', s.track,
                                       'track_artist', s.track_artist, 'kind', s.kind, 'duration_s', s.duration_s)
               from public.karaoke_songs s where s.video_id = c.video_id));
end;
$$;

create or replace function public.karaoke_vote(p_challenge uuid, p_pick text)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_uid uuid := auth.uid();
  c public.karaoke_challenges%rowtype;
  v_new boolean;
begin
  if v_uid is null then return jsonb_build_object('ok', false, 'reason', 'signin'); end if;
  if p_pick not in ('a', 'b') then raise exception 'bad_pick' using errcode = '22023'; end if;
  select * into c from public.karaoke_challenges where id = p_challenge for update;
  if not found or c.status <> 'voting' or coalesce(c.voting_ends_at, now()) <= now() then
    return jsonb_build_object('ok', false, 'reason', 'closed');
  end if;
  if not (c.is_public or (c.room_id is not null and public.karaoke_is_member(c.room_id))) then
    return jsonb_build_object('ok', false, 'reason', 'closed');
  end if;
  if v_uid in (c.a_user, c.b_user) then return jsonb_build_object('ok', false, 'reason', 'contestant'); end if;
  insert into public.karaoke_votes (challenge_id, voter_id, pick) values (p_challenge, v_uid, p_pick)
  on conflict (challenge_id, voter_id) do nothing;
  v_new := found;
  if v_new then
    update public.karaoke_challenges
       set votes_a = votes_a + (p_pick = 'a')::int, votes_b = votes_b + (p_pick = 'b')::int
     where id = p_challenge
     returning * into c;
  end if;
  return jsonb_build_object('ok', true, 'counted', v_new, 'votes_a', c.votes_a, 'votes_b', c.votes_b);
end;
$$;

-- The verdict: the verified score, with the crowd carrying up to thirty
-- percent. The crowd's share grows with its size and reaches the full
-- thirty at ten votes, so two friends voting cannot overturn a clear
-- gap. With nobody voting, the score alone decides.
create or replace function public.karaoke_decide(p_challenge uuid)
returns text
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  c public.karaoke_challenges%rowtype;
  sa numeric; sb numeric; va numeric; vb numeric; total numeric; w numeric;
  v_w text;
begin
  select * into c from public.karaoke_challenges where id = p_challenge for update;
  if not found or c.b_perf is null then return null; end if;
  select coalesce(score, 0) into sa from public.karaoke_performances where id = c.a_perf;
  select coalesce(score, 0) into sb from public.karaoke_performances where id = c.b_perf;
  total := c.votes_a + c.votes_b;
  if total > 0 then
    w := 0.3 * least(1.0, total / 10.0);
    va := (1 - w) * sa + w * (100.0 * c.votes_a / total);
    vb := (1 - w) * sb + w * (100.0 * c.votes_b / total);
  else
    va := sa; vb := sb;
  end if;
  v_w := case when abs(va - vb) < 0.5 then 'draw' when va > vb then 'a' else 'b' end;
  update public.karaoke_challenges set status = 'done', winner = v_w where id = p_challenge;
  return v_w;
end;
$$;

create or replace function public.karaoke_cheer(p_perf uuid, p_emoji text, p_at real)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_uid uuid := auth.uid();
  p public.karaoke_performances%rowtype;
begin
  if v_uid is null then return jsonb_build_object('ok', false, 'reason', 'signin'); end if;
  select * into p from public.karaoke_performances where id = p_perf;
  if not found or p.status <> 'scored' or not (p.visibility in ('public', 'link') or p.user_id = v_uid
     or (p.room_id is not null and public.karaoke_is_member(p.room_id))) then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;
  if (select count(*) from public.karaoke_cheers c where c.performance_id = p_perf and c.user_id = v_uid) >= 40 then
    return jsonb_build_object('ok', false, 'reason', 'rate');
  end if;
  insert into public.karaoke_cheers (performance_id, user_id, emoji, at_s)
  values (p_perf, v_uid, p_emoji, greatest(0, least(7200, coalesce(p_at, 0))));
  update public.karaoke_performances set cheers = cheers + 1 where id = p_perf;
  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.karaoke_play(p_perf uuid)
returns void
language sql
security definer
set search_path = pg_catalog, public
as $$
  update public.karaoke_performances set plays = plays + 1
   where id = p_perf and status = 'scored' and visibility in ('public', 'link');
$$;

create or replace function public.karaoke_waitlist_join()
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if auth.uid() is null then return jsonb_build_object('ok', false, 'reason', 'signin'); end if;
  insert into public.karaoke_waitlist (user_id) values (auth.uid()) on conflict (user_id) do nothing;
  return jsonb_build_object('ok', true);
end;
$$;

-- ── 15 · WHAT IS ON RIGHT NOW ──────────────────────────────────────
create or replace function public.karaoke_rooms_live()
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select coalesce(jsonb_agg(x order by (x ->> 'status' = 'live') desc, (x ->> 'audience')::int desc, x ->> 'last_active_at' desc), '[]'::jsonb)
  from (
    select jsonb_build_object(
      'id', r.id, 'code', r.code, 'title', r.title, 'setup', r.setup, 'status', r.status, 'host', r.host_stage,
      'now_playing', r.now_playing, 'last_active_at', r.last_active_at,
      'singers', (select count(*) from public.karaoke_members m where m.room_id = r.id and m.role in ('host', 'singer')),
      'audience', (select count(*) from public.karaoke_members m where m.room_id = r.id and m.role = 'guest' and m.seen_at > now() - interval '30 minutes'),
      'song', (select jsonb_build_object('video_id', s.video_id, 'title', s.title, 'artist', s.artist, 'track', s.track, 'track_artist', s.track_artist)
                 from public.karaoke_songs s where s.video_id = r.now_playing ->> 'video')) as x
    from public.karaoke_rooms r
    where r.visibility = 'public' and r.status <> 'ended' and r.last_active_at > now() - interval '30 minutes'
    order by r.last_active_at desc
    limit 24) q;
$$;

create or replace function public.karaoke_leaders(p_days integer default 7)
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  with pool as (
    select p.id, p.user_id, p.video_id, p.score, p.grade, p.stage, p.cheers, p.plays, p.created_at
      from public.karaoke_performances p
     where p.status = 'scored' and p.visibility = 'public' and p.ranked and p.guest_name is null
       and p.created_at > now() - make_interval(days => greatest(1, least(coalesce(p_days, 7), 365)))
  )
  select jsonb_build_object(
    'performances', coalesce((select jsonb_agg(jsonb_build_object(
        'id', t.id, 'score', t.score, 'grade', t.grade, 'stage', t.stage, 'cheers', t.cheers, 'plays', t.plays, 'created_at', t.created_at,
        'song', (select jsonb_build_object('video_id', s.video_id, 'title', s.title, 'artist', s.artist, 'track', s.track, 'track_artist', s.track_artist)
                   from public.karaoke_songs s where s.video_id = t.video_id))
        order by t.score desc, t.created_at)
      from (select * from pool order by score desc, created_at limit 20) t), '[]'::jsonb),
    'singers', coalesce((select jsonb_agg(x order by coalesce((x ->> 'points')::int, 0) desc)
      from (select jsonb_build_object('stage', (array_agg(pool.stage order by pool.created_at desc))[1],
                                      'songs', count(*), 'best', max(pool.score),
                                      'points', coalesce(sum(pool.score) filter (where pool.score >= 50), 0)) as x
              from pool group by pool.user_id
              order by sum(pool.score) filter (where pool.score >= 50) desc nulls last limit 12) s), '[]'::jsonb));
$$;

-- ── 16 · THE SERVER'S SIDE (service role only) ─────────────────────
-- Called by the verifier once Whisper has heard the take.
create or replace function public.karaoke_settle(p_perf uuid, p_result jsonb)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  p public.karaoke_performances%rowtype;
  c public.karaoke_challenges%rowtype;
  v_score int := greatest(0, least(100, coalesce((p_result ->> 'score')::int, 0)));
  v_stage jsonb;
  v_song text;
begin
  select * into p from public.karaoke_performances where id = p_perf for update;
  if not found then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if p.status not in ('uploaded', 'verifying', 'failed') then return jsonb_build_object('ok', false, 'reason', 'state', 'status', p.status); end if;
  update public.karaoke_performances set
    status = 'scored',
    score = v_score,
    grade = left(p_result ->> 'grade', 3),
    parts = case when jsonb_typeof(p_result -> 'parts') = 'object' then p_result -> 'parts' end,
    verify = case when jsonb_typeof(p_result -> 'verify') = 'object' and pg_column_size(p_result -> 'verify') < 60000 then p_result -> 'verify' end,
    verified = coalesce((p_result ->> 'verified')::boolean, false),
    ranked = ranked and coalesce((p_result ->> 'verified')::boolean, false),
    scored_at = now()
  where id = p_perf;
  update public.karaoke_songs set sung = sung + 1,
         best_score = case when p.ranked and coalesce((p_result ->> 'verified')::boolean, false)
                           then greatest(coalesce(best_score, 0), v_score) else best_score end
   where video_id = p.video_id;
  if p.queue_id is not null then
    update public.karaoke_queue set status = 'done', performance_id = p_perf where id = p.queue_id;
  end if;
  -- An answer to a challenge opens the vote.
  if p.challenge_id is not null then
    select * into c from public.karaoke_challenges where id = p.challenge_id for update;
    if found and c.kind = 'challenge' and c.status = 'waiting' and c.a_perf <> p_perf
       and (c.b_user = p.user_id or (c.b_user is null and c.open)) and p.user_id <> c.a_user then
      v_stage := public.karaoke_stage(p.user_id);
      update public.karaoke_challenges set
        b_user = p.user_id, b_perf = p_perf, b_stage = v_stage, status = 'voting', answered_at = now(),
        voting_ends_at = now() + interval '24 hours'
       where id = c.id;
      if c.is_public then
        update public.karaoke_performances set visibility = 'public', stage = v_stage where id = p_perf and visibility <> 'public';
      else
        -- Between two people the verified score decides, straight away.
        update public.karaoke_performances set visibility = 'link', stage = v_stage where id = p_perf and visibility = 'private';
        perform public.karaoke_decide(c.id);
      end if;
      select coalesce(nullif(track, ''), title) into v_song from public.karaoke_songs where video_id = p.video_id;
      perform public.cabana_notify(
        c.a_user, 'karaoke',
        left(coalesce(v_stage ->> 'name', 'Your challenger') || ' answered your challenge with ' || v_score, 140),
        left('“' || coalesce(v_song, 'Your song') || '”: ' || case when c.is_public then 'the crowd votes for 24 hours.' else 'see who won.' end, 240),
        '/events/karaoke/c/' || c.id,
        jsonb_build_object('challenge', c.id));
    end if;
  end if;
  return jsonb_build_object('ok', true, 'score', v_score);
end;
$$;

-- The lyric clock for this video, learned from singers. A running
-- average that forgets slowly, with outliers refused once it is
-- settled.
create or replace function public.karaoke_song_calibrate(p_video text, p_offset real, p_weight real default 1)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  s public.karaoke_songs%rowtype;
  n real;
  w real := greatest(0.1, least(3, coalesce(p_weight, 1)));
begin
  select * into s from public.karaoke_songs where video_id = p_video for update;
  if not found or p_offset is null or abs(p_offset) > 45 then return jsonb_build_object('ok', false); end if;
  if s.offset_n >= 3 and abs(p_offset - s.offset_s) > 6 then return jsonb_build_object('ok', false, 'reason', 'outlier'); end if;
  n := least(s.offset_n, 40);
  update public.karaoke_songs
     set offset_s = round(((s.offset_s * n + p_offset * w) / (n + w))::numeric, 3)::real,
         offset_n = s.offset_n + 1
   where video_id = p_video;
  return jsonb_build_object('ok', true);
end;
$$;

-- Housekeeping every ten minutes.
create or replace function public.karaoke_sweep()
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_rooms int; v_takes int; v_ch int;
  v_row record;
begin
  update public.karaoke_rooms set status = 'ended', ended_at = now()
   where status <> 'ended' and last_active_at < now() - interval '6 hours';
  get diagnostics v_rooms = row_count;
  update public.karaoke_queue q set status = 'skipped'
    from public.karaoke_rooms r where r.id = q.room_id and r.status = 'ended' and q.status in ('queued', 'singing');
  update public.karaoke_performances set status = 'failed', counted = false
   where status = 'recording' and created_at < now() - interval '3 hours';
  get diagnostics v_takes = row_count;
  update public.karaoke_performances set status = 'uploaded'
   where status = 'verifying' and finished_at < now() - interval '15 minutes';
  update public.karaoke_challenges set status = 'expired'
   where status = 'waiting' and expires_at < now();
  get diagnostics v_ch = row_count;
  for v_row in select id from public.karaoke_challenges where status = 'voting' and voting_ends_at < now() loop
    perform public.karaoke_decide(v_row.id);
  end loop;
  return jsonb_build_object('rooms_ended', v_rooms, 'takes_failed', v_takes, 'challenges_expired', v_ch);
end;
$$;

-- ── 17 · THE CONSOLE ───────────────────────────────────────────────
create or replace function public.admin_karaoke_overview()
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
begin
  if not public.is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  return jsonb_build_object(
    'rooms_open', (select count(*) from public.karaoke_rooms where status <> 'ended'),
    'rooms_live', (select count(*) from public.karaoke_rooms where status = 'live' and last_active_at > now() - interval '30 minutes'),
    'rooms_public', (select count(*) from public.karaoke_rooms where status <> 'ended' and visibility = 'public'),
    'performances_today', (select count(*) from public.karaoke_performances where created_at > now() - interval '1 day'),
    'performances_month', (select count(*) from public.karaoke_performances where created_at >= public.karaoke_month_start()),
    'scored_month', (select count(*) from public.karaoke_performances where status = 'scored' and created_at >= public.karaoke_month_start()),
    'verified_month', (select count(*) from public.karaoke_performances where verified and created_at >= public.karaoke_month_start()),
    'avg_score', (select round(avg(score)) from public.karaoke_performances where status = 'scored' and created_at > now() - interval '30 days'),
    'singers_month', (select count(distinct user_id) from public.karaoke_performances where created_at >= public.karaoke_month_start()),
    'public_performances', (select count(*) from public.karaoke_performances where status = 'scored' and visibility = 'public'),
    'challenges_open', (select count(*) from public.karaoke_challenges where status in ('waiting', 'voting')),
    'vip_active', (select count(*) from public.karaoke_passes where revoked_at is null and starts_at <= now() and (expires_at is null or expires_at > now())),
    'waitlist', (select count(*) from public.karaoke_waitlist),
    'songs', (select count(*) from public.karaoke_songs),
    'lyrics', (select coalesce(jsonb_object_agg(lyrics_status, n), '{}'::jsonb) from (select lyrics_status, count(*) n from public.karaoke_songs group by 1) x),
    'top_songs', coalesce((select jsonb_agg(jsonb_build_object('video_id', video_id, 'title', title, 'artist', artist, 'sung', sung, 'kind', kind,
                                                               'lyrics_status', lyrics_status, 'offset_s', offset_s, 'offset_n', offset_n, 'hidden', hidden))
                             from (select * from public.karaoke_songs order by sung desc, updated_at desc limit 30) s), '[]'::jsonb),
    'recent', coalesce((select jsonb_agg(jsonb_build_object('id', p.id, 'email', u.email, 'video_id', p.video_id, 'status', p.status,
                                                            'score', p.score, 'visibility', p.visibility, 'verified', p.verified, 'created_at', p.created_at))
                          from (select * from public.karaoke_performances order by created_at desc limit 40) p
                          left join auth.users u on u.id = p.user_id), '[]'::jsonb)
  );
end;
$$;

create or replace function public.admin_karaoke_passes()
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
begin
  if not public.is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  return jsonb_build_object(
    'passes', (select coalesce(jsonb_agg(x order by x.created_at desc), '[]'::jsonb) from (
      select p.id, p.user_id, u.email, p.starts_at, p.expires_at, p.source, p.note, p.granted_by, p.revoked_at, p.created_at,
             (p.revoked_at is null and p.starts_at <= now() and (p.expires_at is null or p.expires_at > now())) as active
        from public.karaoke_passes p left join auth.users u on u.id = p.user_id
       order by p.created_at desc limit 400) x),
    'waitlist', (select coalesce(jsonb_agg(jsonb_build_object('email', u.email, 'created_at', w.created_at) order by w.created_at desc), '[]'::jsonb)
                   from (select * from public.karaoke_waitlist order by created_at desc limit 400) w left join auth.users u on u.id = w.user_id));
end;
$$;

create or replace function public.admin_karaoke_pass_action(p_action text, p_email text default null, p_days integer default 30, p_note text default null, p_pass uuid default null)
returns jsonb
language plpgsql
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
    insert into public.karaoke_passes (user_id, expires_at, source, note, granted_by)
    values (v_uid, case when coalesce(p_days, 0) > 0 then now() + make_interval(days => least(p_days, 3650)) end,
            'grant', left(p_note, 400), auth.jwt() ->> 'email')
    returning id into v_id;
    -- Takes already sung are kept as long as VIP takes are.
    update public.karaoke_performances set expires_at = null, vip = true where user_id = v_uid and expires_at is not null;
    perform cabana_admin.log('karaoke_pass_grant', 'member', v_uid::text, jsonb_build_object('pass', v_id, 'days', p_days));
    return jsonb_build_object('ok', true, 'pass', v_id, 'user_id', v_uid);
  elsif p_action = 'revoke' then
    update public.karaoke_passes set revoked_at = now() where id = p_pass and revoked_at is null;
    perform cabana_admin.log('karaoke_pass_revoke', 'karaoke_pass', p_pass::text, '{}'::jsonb);
    return jsonb_build_object('ok', true);
  elsif p_action = 'extend' then
    update public.karaoke_passes
       set expires_at = greatest(coalesce(expires_at, now()), now()) + make_interval(days => greatest(1, least(coalesce(p_days, 30), 3650)))
     where id = p_pass and revoked_at is null;
    perform cabana_admin.log('karaoke_pass_extend', 'karaoke_pass', p_pass::text, jsonb_build_object('days', p_days));
    return jsonb_build_object('ok', true);
  end if;
  raise exception 'Unknown action %', p_action using errcode = '22023';
end;
$$;

create or replace function public.admin_karaoke_moderate(p_kind text, p_id text, p_action text, p_value text default null)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if not public.is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_kind = 'performance' and p_action = 'hide' then
    update public.karaoke_performances set visibility = 'private' where id = p_id::uuid;
  elsif p_kind = 'room' and p_action = 'end' then
    update public.karaoke_rooms set status = 'ended', ended_at = now() where id = p_id::uuid;
  elsif p_kind = 'song' and p_action in ('hide', 'show') then
    update public.karaoke_songs set hidden = (p_action = 'hide') where video_id = p_id;
  elsif p_kind = 'song' and p_action = 'kind' and p_value in ('karaoke', 'original', 'lyric', 'live') then
    update public.karaoke_songs set kind = p_value where video_id = p_id;
  elsif p_kind = 'song' and p_action = 'offset' then
    update public.karaoke_songs set offset_s = greatest(-60, least(60, p_value::real)), offset_n = greatest(offset_n, 3) where video_id = p_id;
  elsif p_kind = 'song' and p_action = 'relyric' then
    update public.karaoke_songs set lyrics_status = 'pending', lyrics_checked_at = null where video_id = p_id;
  else
    raise exception 'Unknown action' using errcode = '22023';
  end if;
  perform cabana_admin.log('karaoke_' || p_kind || '_' || p_action, 'karaoke_' || p_kind, p_id, jsonb_build_object('value', p_value));
  return jsonb_build_object('ok', true);
end;
$$;

-- ── 18 · ROW LEVEL SECURITY ────────────────────────────────────────
alter table public.karaoke_settings     enable row level security;
alter table public.karaoke_songs        enable row level security;
alter table public.karaoke_rooms        enable row level security;
alter table public.karaoke_members      enable row level security;
alter table public.karaoke_invites      enable row level security;
alter table public.karaoke_queue        enable row level security;
alter table public.karaoke_performances enable row level security;
alter table public.karaoke_challenges   enable row level security;
alter table public.karaoke_votes        enable row level security;
alter table public.karaoke_cheers       enable row level security;
alter table public.karaoke_passes       enable row level security;
alter table public.karaoke_waitlist     enable row level security;

drop policy if exists karaoke_settings_read on public.karaoke_settings;
create policy karaoke_settings_read on public.karaoke_settings for select to anon, authenticated using (true);
drop policy if exists karaoke_settings_admin on public.karaoke_settings;
create policy karaoke_settings_admin on public.karaoke_settings
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

drop policy if exists karaoke_songs_read on public.karaoke_songs;
create policy karaoke_songs_read on public.karaoke_songs for select to anon, authenticated using (not hidden or (select public.is_admin()));
drop policy if exists karaoke_songs_admin on public.karaoke_songs;
create policy karaoke_songs_admin on public.karaoke_songs
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

drop policy if exists karaoke_rooms_read on public.karaoke_rooms;
create policy karaoke_rooms_read on public.karaoke_rooms for select to anon, authenticated
  using (visibility = 'public' or host_id = (select auth.uid()) or public.karaoke_is_member(karaoke_rooms.id)
         or public.karaoke_is_invited(karaoke_rooms.id) or (select public.is_admin()));

drop policy if exists karaoke_members_read on public.karaoke_members;
create policy karaoke_members_read on public.karaoke_members for select to anon, authenticated
  using (user_id = (select auth.uid())
         or (select public.is_admin())
         or (role <> 'guest' and public.karaoke_room_visible(room_id))
         or (public.karaoke_is_member(room_id)
             and exists (select 1 from public.karaoke_rooms r where r.id = karaoke_members.room_id and r.visibility = 'private')));

drop policy if exists karaoke_invites_read on public.karaoke_invites;
create policy karaoke_invites_read on public.karaoke_invites for select to authenticated
  using (inviter_id = (select auth.uid()) or invitee_id = (select auth.uid()) or (select public.is_admin()));

drop policy if exists karaoke_queue_read on public.karaoke_queue;
create policy karaoke_queue_read on public.karaoke_queue for select to anon, authenticated
  using (public.karaoke_room_visible(room_id));

drop policy if exists karaoke_perf_read on public.karaoke_performances;
create policy karaoke_perf_read on public.karaoke_performances for select to anon, authenticated
  using (user_id = (select auth.uid())
         or (visibility = 'public' and status = 'scored')
         or (room_id is not null and public.karaoke_is_member(room_id))
         or (select public.is_admin()));

drop policy if exists karaoke_ch_read on public.karaoke_challenges;
create policy karaoke_ch_read on public.karaoke_challenges for select to anon, authenticated
  using (is_public or (open and status = 'waiting')
         or a_user = (select auth.uid()) or b_user = (select auth.uid())
         or (select public.is_admin()));

drop policy if exists karaoke_votes_own on public.karaoke_votes;
create policy karaoke_votes_own on public.karaoke_votes for select to authenticated
  using (voter_id = (select auth.uid()) or (select public.is_admin()));

drop policy if exists karaoke_cheers_read on public.karaoke_cheers;
create policy karaoke_cheers_read on public.karaoke_cheers for select to anon, authenticated
  using (exists (select 1 from public.karaoke_performances p where p.id = performance_id));

drop policy if exists karaoke_passes_own on public.karaoke_passes;
create policy karaoke_passes_own on public.karaoke_passes for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));

drop policy if exists karaoke_waitlist_own on public.karaoke_waitlist;
create policy karaoke_waitlist_own on public.karaoke_waitlist for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));

revoke all on public.karaoke_settings, public.karaoke_songs, public.karaoke_rooms, public.karaoke_members,
              public.karaoke_invites, public.karaoke_queue, public.karaoke_performances, public.karaoke_challenges,
              public.karaoke_votes, public.karaoke_cheers, public.karaoke_passes, public.karaoke_waitlist
  from anon, authenticated;
grant select on public.karaoke_settings, public.karaoke_songs, public.karaoke_rooms, public.karaoke_members,
                public.karaoke_queue, public.karaoke_performances, public.karaoke_challenges, public.karaoke_cheers
  to anon, authenticated;
grant select on public.karaoke_invites, public.karaoke_votes, public.karaoke_passes, public.karaoke_waitlist to authenticated;
grant update on public.karaoke_settings, public.karaoke_songs to authenticated;

-- ── 19 · FUNCTION PRIVILEGES ───────────────────────────────────────
-- Internal helpers: nobody calls these directly.
revoke all on function public.karaoke_new_code() from public, anon, authenticated;
revoke all on function public.karaoke_stage(uuid) from public, anon, authenticated;
revoke all on function public.karaoke_vip_of(uuid) from public, anon, authenticated;
revoke all on function public.karaoke_used(uuid) from public, anon, authenticated;
revoke all on function public.karaoke_room_json(uuid, uuid) from public, anon, authenticated;
revoke all on function public.karaoke_decide(uuid) from public, anon, authenticated;
revoke all on function public.karaoke_touch() from public, anon, authenticated;
-- Policy helpers run as the caller's role inside policies.
revoke all on function public.karaoke_is_member(uuid) from public;
revoke all on function public.karaoke_room_visible(uuid) from public;
revoke all on function public.karaoke_is_invited(uuid) from public;
revoke all on function public.karaoke_take_writable(text) from public;
grant execute on function public.karaoke_is_member(uuid) to anon, authenticated;
grant execute on function public.karaoke_room_visible(uuid) to anon, authenticated;
grant execute on function public.karaoke_is_invited(uuid) to anon, authenticated;
grant execute on function public.karaoke_take_writable(text) to authenticated;
grant execute on function public.karaoke_month_start() to anon, authenticated;

-- The page's calls.
revoke all on function public.karaoke_state() from public;
revoke all on function public.karaoke_now() from public;
revoke all on function public.karaoke_room_create(text, text, text) from public, anon;
revoke all on function public.karaoke_enter(text) from public;
revoke all on function public.karaoke_room_get(uuid) from public;
revoke all on function public.karaoke_room_update(uuid, jsonb) from public, anon;
revoke all on function public.karaoke_leave(uuid) from public, anon;
revoke all on function public.karaoke_member_set(uuid, uuid, text) from public, anon;
revoke all on function public.karaoke_invite(uuid, text) from public, anon;
revoke all on function public.karaoke_invites_mine() from public, anon;
revoke all on function public.karaoke_invite_answer(uuid, boolean) from public, anon;
revoke all on function public.karaoke_queue_add(uuid, text, uuid, text, uuid) from public, anon;
revoke all on function public.karaoke_queue_set(uuid, text, integer) from public, anon;
revoke all on function public.karaoke_begin(text, uuid, uuid, text, real, uuid) from public, anon;
revoke all on function public.karaoke_finish(uuid, text, text, integer, real, jsonb, jsonb, jsonb, text) from public, anon;
revoke all on function public.karaoke_discard(uuid) from public, anon;
revoke all on function public.karaoke_publish(uuid, text) from public, anon;
revoke all on function public.karaoke_performance(uuid) from public;
revoke all on function public.karaoke_challenge_create(uuid, text, text) from public, anon;
revoke all on function public.karaoke_challenge_decline(uuid) from public, anon;
revoke all on function public.karaoke_battle_open(uuid, uuid, uuid) from public, anon;
revoke all on function public.karaoke_challenge(uuid) from public;
revoke all on function public.karaoke_vote(uuid, text) from public, anon;
revoke all on function public.karaoke_cheer(uuid, text, real) from public, anon;
revoke all on function public.karaoke_play(uuid) from public;
revoke all on function public.karaoke_waitlist_join() from public, anon;
revoke all on function public.karaoke_rooms_live() from public;
revoke all on function public.karaoke_leaders(integer) from public;

grant execute on function public.karaoke_state() to anon, authenticated;
grant execute on function public.karaoke_now() to anon, authenticated;
grant execute on function public.karaoke_room_create(text, text, text) to authenticated;
grant execute on function public.karaoke_enter(text) to anon, authenticated;
grant execute on function public.karaoke_room_get(uuid) to anon, authenticated;
grant execute on function public.karaoke_room_update(uuid, jsonb) to authenticated;
grant execute on function public.karaoke_leave(uuid) to authenticated;
grant execute on function public.karaoke_member_set(uuid, uuid, text) to authenticated;
grant execute on function public.karaoke_invite(uuid, text) to authenticated;
grant execute on function public.karaoke_invites_mine() to authenticated;
grant execute on function public.karaoke_invite_answer(uuid, boolean) to authenticated;
grant execute on function public.karaoke_queue_add(uuid, text, uuid, text, uuid) to authenticated;
grant execute on function public.karaoke_queue_set(uuid, text, integer) to authenticated;
grant execute on function public.karaoke_begin(text, uuid, uuid, text, real, uuid) to authenticated;
grant execute on function public.karaoke_finish(uuid, text, text, integer, real, jsonb, jsonb, jsonb, text) to authenticated;
grant execute on function public.karaoke_discard(uuid) to authenticated;
grant execute on function public.karaoke_publish(uuid, text) to authenticated;
grant execute on function public.karaoke_performance(uuid) to anon, authenticated;
grant execute on function public.karaoke_challenge_create(uuid, text, text) to authenticated;
grant execute on function public.karaoke_challenge_decline(uuid) to authenticated;
grant execute on function public.karaoke_battle_open(uuid, uuid, uuid) to authenticated;
grant execute on function public.karaoke_challenge(uuid) to anon, authenticated;
grant execute on function public.karaoke_vote(uuid, text) to authenticated;
grant execute on function public.karaoke_cheer(uuid, text, real) to authenticated;
grant execute on function public.karaoke_play(uuid) to anon, authenticated;
grant execute on function public.karaoke_waitlist_join() to authenticated;
grant execute on function public.karaoke_rooms_live() to anon, authenticated;
grant execute on function public.karaoke_leaders(integer) to anon, authenticated;

-- Server only: the verifier and the scheduler.
revoke all on function public.karaoke_settle(uuid, jsonb) from public, anon, authenticated;
revoke all on function public.karaoke_song_calibrate(text, real, real) from public, anon, authenticated;
revoke all on function public.karaoke_sweep() from public, anon, authenticated;
grant execute on function public.karaoke_settle(uuid, jsonb) to service_role;
grant execute on function public.karaoke_song_calibrate(text, real, real) to service_role;
grant execute on function public.karaoke_sweep() to service_role;

-- The console.
revoke all on function public.admin_karaoke_overview() from public, anon;
revoke all on function public.admin_karaoke_passes() from public, anon;
revoke all on function public.admin_karaoke_pass_action(text, text, integer, text, uuid) from public, anon;
revoke all on function public.admin_karaoke_moderate(text, text, text, text) from public, anon;
grant execute on function public.admin_karaoke_overview() to authenticated;
grant execute on function public.admin_karaoke_passes() to authenticated;
grant execute on function public.admin_karaoke_pass_action(text, text, integer, text, uuid) to authenticated;
grant execute on function public.admin_karaoke_moderate(text, text, text, text) to authenticated;

-- ── 20 · STORAGE ───────────────────────────────────────────────────
-- Takes are private. A singer writes into their own folder while the
-- performance is recording and can read their own takes; everyone else
-- hears a take through /api/karaoke, which checks who may.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('karaoke-takes', 'karaoke-takes', false, 26214400,
        array['audio/webm', 'audio/ogg', 'audio/mp4', 'audio/mpeg', 'audio/aac', 'audio/wav', 'audio/x-m4a', 'video/webm', 'video/mp4'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "karaoke takes write own" on storage.objects;
create policy "karaoke takes write own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'karaoke-takes' and public.karaoke_take_writable(name));

drop policy if exists "karaoke takes read own" on storage.objects;
create policy "karaoke takes read own" on storage.objects
  for select to authenticated
  using (bucket_id = 'karaoke-takes' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "karaoke takes delete own" on storage.objects;
create policy "karaoke takes delete own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'karaoke-takes' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "karaoke takes update own" on storage.objects;
create policy "karaoke takes update own" on storage.objects
  for update to authenticated
  using (bucket_id = 'karaoke-takes' and public.karaoke_take_writable(name))
  with check (bucket_id = 'karaoke-takes' and public.karaoke_take_writable(name));

-- ── 21 · REALTIME ──────────────────────────────────────────────────
-- A room's line-up, members and invitations reach open pages as they
-- change. RLS decides what each viewer receives.
alter table public.karaoke_queue replica identity full;
alter table public.karaoke_members replica identity full;
do $$
declare t text;
begin
  foreach t in array array['karaoke_rooms', 'karaoke_queue', 'karaoke_members', 'karaoke_invites', 'karaoke_performances', 'karaoke_challenges'] loop
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end
$$;

-- ── 22 · THE SCHEDULER ─────────────────────────────────────────────
-- The database tidies itself every ten minutes. The storage side (takes
-- past their keep-by date, takes waiting for a verdict) is the web
-- function's job, because files are removed through the Storage API.
insert into cabana_ops.cron_config (key, value)
values ('karaoke_sweep_url', 'https://cabana.africa/api/karaoke?op=sweep')
on conflict (key) do nothing;

create or replace function cabana_ops.trigger_karaoke_sweep()
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, extensions, net
as $$
declare
  v_url text;
  v_secret text;
begin
  perform public.karaoke_sweep();
  select value into v_url from cabana_ops.cron_config where key = 'karaoke_sweep_url';
  select value into v_secret from cabana_ops.cron_config where key = 'cron_secret';
  if v_url is null or v_secret is null or v_secret = '' then return; end if;
  perform net.http_post(
    url := v_url,
    headers := jsonb_build_object('Authorization', 'Bearer ' || v_secret, 'Content-Type', 'application/json',
                                  'User-Agent', 'Cabana-Scheduler/1.0'),
    body := '{"op":"sweep"}'::jsonb,
    timeout_milliseconds := 55000);
end;
$$;
revoke all on function cabana_ops.trigger_karaoke_sweep() from public, anon, authenticated;

select cron.unschedule(jobid) from cron.job where jobname = 'cabana-karaoke-sweep';
select cron.schedule('cabana-karaoke-sweep', '*/10 * * * *', 'select cabana_ops.trigger_karaoke_sweep()');
