-- The public track projection predates genre and culture. Rebuild it so the
-- browser can filter the board without a second round trip.
drop view if exists public.music_chart_public;

create view public.music_chart_public
with (security_invoker = true)
as
select market, video_id, rank, previous_rank, title, artist, thumbnail_url,
       published_at, duration_seconds, views, likes, comments, views_delta,
       trend_score, format, genre, culture, refreshed_at
from public.music_chart_tracks
where active;

comment on view public.music_chart_public is
  'Read-only view of the active Cabana Pulse board, including genre and culture.';

grant select on public.music_chart_public to anon, authenticated;
