-- Cabana Pulse: a quota-safe, first-party cache of YouTube's Kenya music chart.
--
-- The browser only receives active chart rows.  All writes happen through the
-- youtube-sync Edge Function over its server-only database connection, so a visitor cannot
-- alter rankings or burn YouTube quota by writing directly to the database.

create table if not exists public.music_chart_tracks (
  market text not null default 'KE',
  video_id text not null,
  rank smallint not null,
  previous_rank smallint,
  title text not null,
  artist text not null,
  thumbnail_url text,
  published_at timestamptz,
  duration_seconds integer,
  views bigint not null default 0,
  likes bigint not null default 0,
  comments bigint not null default 0,
  views_delta bigint not null default 0,
  trend_score numeric not null default 0,
  format text not null default 'track',
  active boolean not null default true,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  refreshed_at timestamptz not null default now(),
  primary key (market, video_id),
  constraint music_chart_tracks_market_ck check (market ~ '^[A-Z]{2}$'),
  constraint music_chart_tracks_rank_ck check (rank between 1 and 100),
  constraint music_chart_tracks_previous_rank_ck check (previous_rank is null or previous_rank between 1 and 100),
  constraint music_chart_tracks_counts_ck check (views >= 0 and likes >= 0 and comments >= 0 and views_delta >= 0),
  constraint music_chart_tracks_format_ck check (format in ('track', 'dj_mix', 'roots', 'live'))
);

comment on table public.music_chart_tracks is
  'Cabana Pulse cache of YouTube music results by market. Server-side writes only.';

create index if not exists music_chart_tracks_active_rank_idx
  on public.music_chart_tracks (market, active, rank);
create index if not exists music_chart_tracks_format_rank_idx
  on public.music_chart_tracks (market, format, rank) where active;

create table if not exists public.music_chart_meta (
  market text primary key,
  source text not null default 'youtube_most_popular',
  last_refreshed_at timestamptz,
  next_refresh_at timestamptz,
  refreshing_until timestamptz,
  refresh_token uuid,
  tracks_count integer not null default 0,
  cache_version integer not null default 1,
  last_error text,
  updated_at timestamptz not null default now(),
  constraint music_chart_meta_market_ck check (market ~ '^[A-Z]{2}$'),
  constraint music_chart_meta_count_ck check (tracks_count >= 0)
);

comment on table public.music_chart_meta is
  'Freshness and single-flight refresh state for Cabana Pulse. Publicly readable, server-written.';

insert into public.music_chart_meta (market)
values ('KE')
on conflict (market) do nothing;

alter table public.music_chart_tracks enable row level security;
alter table public.music_chart_meta enable row level security;

drop policy if exists "public reads active music chart" on public.music_chart_tracks;
create policy "public reads active music chart"
on public.music_chart_tracks for select
to anon, authenticated
using (active);

drop policy if exists "public reads music chart freshness" on public.music_chart_meta;
create policy "public reads music chart freshness"
on public.music_chart_meta for select
to anon, authenticated
using (true);

revoke insert, update, delete on public.music_chart_tracks from anon, authenticated;
revoke insert, update, delete on public.music_chart_meta from anon, authenticated;
grant select on public.music_chart_tracks, public.music_chart_meta to anon, authenticated;

create or replace view public.music_chart_public
with (security_invoker = true)
as
select
  market,
  video_id,
  rank,
  previous_rank,
  title,
  artist,
  thumbnail_url,
  published_at,
  duration_seconds,
  views,
  likes,
  comments,
  views_delta,
  trend_score,
  format,
  refreshed_at
from public.music_chart_tracks
where active;

revoke all on public.music_chart_public from public;
grant select on public.music_chart_public to anon, authenticated;

-- Postgres Changes lets an already-open Events page refresh the Pulse rail as
-- soon as the Edge Function publishes a new chart.  The guarded block is safe
-- on databases where the table was already added manually.
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'music_chart_tracks'
  ) then
    alter publication supabase_realtime add table public.music_chart_tracks;
  end if;
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'events'
  ) then
    alter publication supabase_realtime add table public.events;
  end if;
end
$$;
