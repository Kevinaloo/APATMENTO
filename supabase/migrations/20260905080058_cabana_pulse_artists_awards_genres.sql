-- Cabana Pulse, second pass: artists, awards, genres and a search cache.
--
-- The chart already caches tracks. Ranking ARTISTS is a different question:
-- an artist with three mid-table records outranks one with a single hit, so
-- standings are computed from the whole active board rather than read off
-- rank 1. Awards (week / month / year) are decided from daily snapshots, so
-- one loud afternoon cannot buy a title.
--
-- Every write below happens server-side. Visitors read; they never rank.

alter table public.music_chart_tracks
  add column if not exists genre text not null default 'other';

alter table public.music_chart_tracks
  drop constraint if exists music_chart_tracks_genre_ck;
alter table public.music_chart_tracks
  add constraint music_chart_tracks_genre_ck check (genre in (
    'gengetone','afrobeat','bongo','drill','amapiano','gospel',
    'rnb','hiphop','reggae','tribal','other'
  ));

create index if not exists music_chart_tracks_genre_rank_idx
  on public.music_chart_tracks (market, genre, rank) where active;

-- Tribal is a culture, not a sound. Kikuyu mugithi and Luo ohangla share a
-- shelf because both are sung in a mother tongue for the people who speak
-- it, so the culture is recorded alongside the genre rather than inside it.
alter table public.music_chart_tracks
  add column if not exists culture text;

create table if not exists public.music_chart_artists (
  market text not null default 'KE',
  artist_key text not null,
  artist text not null,
  rank smallint not null,
  previous_rank smallint,
  score numeric not null default 0,
  tracks_count integer not null default 0,
  best_rank smallint,
  total_views bigint not null default 0,
  views_delta bigint not null default 0,
  total_likes bigint not null default 0,
  lead_video_id text,
  lead_title text,
  thumbnail_url text,
  genre text not null default 'other',
  culture text,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  active boolean not null default true,
  refreshed_at timestamptz not null default now(),
  primary key (market, artist_key),
  constraint music_chart_artists_market_ck check (market ~ '^[A-Z]{2}$'),
  constraint music_chart_artists_rank_ck check (rank between 1 and 200),
  constraint music_chart_artists_prev_ck check (previous_rank is null or previous_rank between 1 and 200),
  constraint music_chart_artists_counts_ck check (
    tracks_count >= 0 and total_views >= 0 and views_delta >= 0 and total_likes >= 0
  )
);

comment on table public.music_chart_artists is
  'Cabana Pulse artist standings, recomputed from the active track board. Server-side writes only.';

create index if not exists music_chart_artists_active_rank_idx
  on public.music_chart_artists (market, active, rank);

create table if not exists public.music_chart_artist_daily (
  market text not null default 'KE',
  day date not null,
  artist_key text not null,
  artist text not null,
  score numeric not null default 0,
  views_delta bigint not null default 0,
  best_rank smallint,
  thumbnail_url text,
  primary key (market, day, artist_key),
  constraint music_chart_artist_daily_market_ck check (market ~ '^[A-Z]{2}$')
);

comment on table public.music_chart_artist_daily is
  'One row per artist per day. The source of truth for week, month and year titles.';

create index if not exists music_chart_artist_daily_window_idx
  on public.music_chart_artist_daily (market, day desc);

create table if not exists public.music_chart_awards (
  market text not null default 'KE',
  period text not null,
  period_start date not null,
  artist_key text not null,
  artist text not null,
  score numeric not null default 0,
  views_delta bigint not null default 0,
  days_counted integer not null default 0,
  thumbnail_url text,
  lead_video_id text,
  lead_title text,
  decided_at timestamptz not null default now(),
  primary key (market, period, period_start),
  constraint music_chart_awards_market_ck check (market ~ '^[A-Z]{2}$'),
  constraint music_chart_awards_period_ck check (period in ('week','month','year'))
);

comment on table public.music_chart_awards is
  'Artist of the week, month and year per market, decided from music_chart_artist_daily.';

create index if not exists music_chart_awards_recent_idx
  on public.music_chart_awards (market, period, period_start desc);

-- YouTube search costs 100 quota units of a 10,000 unit day. A repeated
-- query must never reach Google twice.
create table if not exists public.music_search_cache (
  query_key text primary key,
  query text not null,
  results jsonb not null default '[]'::jsonb,
  hits integer not null default 0,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '12 hours')
);

create index if not exists music_search_cache_expiry_idx
  on public.music_search_cache (expires_at);

alter table public.music_chart_artists enable row level security;
alter table public.music_chart_artist_daily enable row level security;
alter table public.music_chart_awards enable row level security;
alter table public.music_search_cache enable row level security;

drop policy if exists "public reads artist standings" on public.music_chart_artists;
create policy "public reads artist standings"
  on public.music_chart_artists for select
  to anon, authenticated
  using (active);

drop policy if exists "public reads awards" on public.music_chart_awards;
create policy "public reads awards"
  on public.music_chart_awards for select
  to anon, authenticated
  using (true);

-- Daily snapshots and the search cache stay server-side. No policy is added,
-- so RLS denies anon and authenticated by default while the service role and
-- the Edge Function's direct connection keep full access.
grant select on public.music_chart_artists, public.music_chart_awards to anon, authenticated;
revoke all on public.music_chart_artist_daily from anon, authenticated;
revoke all on public.music_search_cache from anon, authenticated;

create or replace view public.music_artists_public
with (security_invoker = true)
as
select market, artist_key, artist, rank, previous_rank, score, tracks_count,
       best_rank, total_views, views_delta, total_likes, lead_video_id,
       lead_title, thumbnail_url, genre, culture, first_seen_at, refreshed_at
from public.music_chart_artists
where active;

comment on view public.music_artists_public is
  'Read-only artist standings for the Cabana Pulse podium.';

grant select on public.music_artists_public to anon, authenticated;
