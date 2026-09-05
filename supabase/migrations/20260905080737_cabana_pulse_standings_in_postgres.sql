-- Standings, shelving and titles, computed in the database.
--
-- The Edge Function's job is to fetch the board from YouTube and write the
-- tracks. Everything downstream of that (which shelf a record sits on, how
-- artists rank against each other, who holds the week) is derived here, so
-- the podium keeps working whatever version of the function is deployed and
-- there is exactly one definition of each rule.
--
-- This file carries the final, corrected definitions. Two things were wrong
-- on the way here and both are fixed below rather than left in the history:
--
--   1. The shelving UPDATE originally referenced its own target through a
--      LATERAL join, which Postgres rejects. It reads from a derived set
--      keyed on the primary key instead.
--   2. Shelving is an UPDATE on the very table the trigger watches, so the
--      recompute called itself until the stack gave out. Only the outermost
--      statement recomputes now.

-- ── shelving ──────────────────────────────────────────────────────────────
create or replace function public.music_shelf(p_title text, p_artist text)
returns table (genre text, culture text)
language plpgsql
immutable
security invoker
set search_path = ''
as $$
declare
  hay text := lower(coalesce(p_title, '') || ' ' || coalesce(p_artist, ''));
begin
  culture := case
    when hay ~ '\m(mugithi|kikuyu|gikuyu|muthirigu)\M'            then 'Kikuyu'
    when hay ~ '\m(ohangla|luo|dholuo|nyatiti|benga)\M'           then 'Luo'
    when hay ~ '\m(kamba|kikamba|katitu|kilumi)\M'                then 'Kamba'
    when hay ~ '\m(kalenjin|kipsigis|nandi)\M'                    then 'Kalenjin'
    when hay ~ '\m(luhya|isukuti|bukusu|maragoli)\M'              then 'Luhya'
    when hay ~ '\m(mijikenda|giriama|chonyi|duruma|sengenya)\M'   then 'Mijikenda'
    when hay ~ '\m(maasai|masai|olmaa)\M'                         then 'Maasai'
    when hay ~ '\m(kisii|gusii|ekegusii)\M'                       then 'Kisii'
    when hay ~ '\m(meru|kimeru)\M'                                then 'Meru'
    when hay ~ '\m(taita|dawida)\M'                               then 'Taita'
    when hay ~ '\m(somali|soomaali)\M'                            then 'Somali'
    when hay ~ '\m(turkana|ngiturkana)\M'                         then 'Turkana'
    when hay ~ '\m(taarab|mwanzele|chakacha)\M'                   then 'Swahili coast'
    else null
  end;

  genre := case
    when culture is not null                                        then 'tribal'
    when hay ~ '\m(gengetone|genge|sheng|mbogi|ochungulo)\M'        then 'gengetone'
    when hay ~ '\m(drill|trapcore)\M'                               then 'drill'
    when hay ~ '\m(amapiano|yanos|log ?drum)\M'                     then 'amapiano'
    when hay ~ '\m(bongo|singeli|bongofleva|wasafi|tanzania)\M'     then 'bongo'
    when hay ~ '\m(gospel|worship|praise|mungu|yesu|jesus|tenzi)\M' then 'gospel'
    when hay ~ '\m(reggae|dancehall|riddim|rasta)\M'                then 'reggae'
    when hay ~ '\m(hip ?hop|rap|cypher|freestyle)\M'                then 'hiphop'
    when hay ~ '\m(rnb|soul|ballad|acoustic)\M'                     then 'rnb'
    when hay ~ '\m(afrobeat|afrobeats|afropop|naija)\M'             then 'afrobeat'
    else 'other'
  end;

  return next;
end;
$$;

comment on function public.music_shelf(text, text) is
  'Classifies a record into a genre, and a Kenyan culture when it is sung in a mother tongue.';

-- ── one artist, one row ───────────────────────────────────────────────────
create or replace function public.music_artist_key(p_artist text)
returns text
language sql
immutable
security invoker
set search_path = ''
as $$
  select coalesce(
    nullif(regexp_replace(
      regexp_replace(lower(coalesce(p_artist, '')),
        '\m(official|vevo|music|records|tv|hd|entertainment|media|studios?|channel)\M', ' ', 'g'),
      '[^a-z0-9]+', '', 'g'), ''),
    nullif(regexp_replace(lower(coalesce(p_artist, '')), '[^a-z0-9]+', '', 'g'), ''),
    'unknown'
  );
$$;

comment on function public.music_artist_key(text) is
  'Collapses channel-name noise so one artist is one row. "Mejja Genge" and "Mejja Official" agree.';

-- ── the recompute ─────────────────────────────────────────────────────────
create or replace function public.music_refresh_standings(p_market text default 'KE')
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := now();
  v_today date := (v_now at time zone 'UTC')::date;
  v_count integer := 0;
  v_period record;
begin
  -- Shelve anything the writer left unclassified. Postgres will not let an
  -- UPDATE target appear again in its own FROM via LATERAL, so this reads
  -- from a derived set keyed on the primary key.
  update public.music_chart_tracks t
  set genre = s.genre, culture = s.culture
  from (
    select market, video_id, (public.music_shelf(title, artist)).*
    from public.music_chart_tracks
    where market = p_market and active
  ) s
  where t.market = s.market
    and t.video_id = s.video_id
    and (t.genre is distinct from s.genre or t.culture is distinct from s.culture);

  -- Standings. Board position matters most at the top but never decides
  -- alone; momentum outweighs lifetime reach; a catalogue earns a modest
  -- premium so depth beats a fluke without a label channel with forty
  -- uploads running away with the year.
  with scored as (
    select
      public.music_artist_key(artist) as artist_key,
      artist, rank, video_id, title, thumbnail_url, genre, culture,
      views, likes, views_delta,
      (greatest(0, 51 - rank)::numeric / 50) * 10
        + log(10, 1 + views_delta) * 4
        + log(10, 1 + views) * 1.6
        + log(10, 1 + likes) * 0.9 as weight
    from public.music_chart_tracks
    where market = p_market and active
  ),
  lead_track as (
    select distinct on (artist_key)
      artist_key, video_id, title, thumbnail_url, genre, culture, rank
    from scored
    order by artist_key, rank
  ),
  grouped as (
    select
      s.artist_key,
      max(s.artist) as artist,
      sum(s.weight) * (1 + log(10, count(*)) * 0.35) as score,
      count(*)::int as tracks_count,
      min(s.rank)::smallint as best_rank,
      sum(s.views)::bigint as total_views,
      sum(s.views_delta)::bigint as views_delta,
      sum(s.likes)::bigint as total_likes
    from scored s
    group by s.artist_key
  ),
  ranked as (
    select g.*, l.video_id, l.title, l.thumbnail_url, l.genre, l.culture,
           row_number() over (order by g.score desc, g.best_rank asc)::smallint as new_rank
    from grouped g join lead_track l on l.artist_key = g.artist_key
  )
  insert into public.music_chart_artists as a
    (market, artist_key, artist, rank, previous_rank, score, tracks_count,
     best_rank, total_views, views_delta, total_likes, lead_video_id,
     lead_title, thumbnail_url, genre, culture, active, last_seen_at, refreshed_at)
  select p_market, r.artist_key, r.artist, r.new_rank, null, round(r.score, 4),
         r.tracks_count, r.best_rank, r.total_views, r.views_delta, r.total_likes,
         r.video_id, r.title, r.thumbnail_url, r.genre, r.culture, true, v_now, v_now
  from ranked r
  where r.new_rank <= 60
  on conflict (market, artist_key) do update set
    artist = excluded.artist,
    previous_rank = case when a.rank is distinct from excluded.rank then a.rank else a.previous_rank end,
    rank = excluded.rank,
    score = excluded.score,
    tracks_count = excluded.tracks_count,
    best_rank = excluded.best_rank,
    total_views = excluded.total_views,
    views_delta = excluded.views_delta,
    total_likes = excluded.total_likes,
    lead_video_id = excluded.lead_video_id,
    lead_title = excluded.lead_title,
    thumbnail_url = excluded.thumbnail_url,
    genre = excluded.genre,
    culture = excluded.culture,
    active = true,
    last_seen_at = excluded.last_seen_at,
    refreshed_at = excluded.refreshed_at;

  get diagnostics v_count = row_count;

  update public.music_chart_artists
  set active = false, refreshed_at = v_now
  where market = p_market and active and last_seen_at < v_now;

  -- One snapshot per artist per day. Repeat refreshes on the same day
  -- replace rather than stack, so a busy afternoon cannot buy a title.
  insert into public.music_chart_artist_daily
    (market, day, artist_key, artist, score, views_delta, best_rank, thumbnail_url)
  select p_market, v_today, artist_key, artist, score, views_delta, best_rank, thumbnail_url
  from public.music_chart_artists
  where market = p_market and active and rank <= 40
  on conflict (market, day, artist_key) do update set
    artist = excluded.artist,
    score = excluded.score,
    views_delta = excluded.views_delta,
    best_rank = excluded.best_rank,
    thumbnail_url = excluded.thumbnail_url;

  delete from public.music_chart_artist_daily
  where market = p_market and day < v_today - 400;

  -- Titles are decided over a window, never off a single day.
  for v_period in
    select * from (values
      ('week',  interval '7 days',   date_trunc('week',  v_today::timestamp)::date),
      ('month', interval '30 days',  date_trunc('month', v_today::timestamp)::date),
      ('year',  interval '365 days', date_trunc('year',  v_today::timestamp)::date)
    ) as t(period, span, period_start)
  loop
    insert into public.music_chart_awards
      (market, period, period_start, artist_key, artist, score, views_delta,
       days_counted, thumbnail_url, lead_video_id, lead_title, decided_at)
    select p_market, v_period.period, v_period.period_start, w.artist_key, w.artist,
           round(w.score, 4), w.views_delta, w.days_counted,
           coalesce(a.thumbnail_url, w.thumbnail_url), a.lead_video_id, a.lead_title, v_now
    from (
      select artist_key, max(artist) as artist, sum(score) as score,
             sum(views_delta)::bigint as views_delta, count(*)::int as days_counted,
             max(thumbnail_url) as thumbnail_url
      from public.music_chart_artist_daily
      where market = p_market and day > v_today - v_period.span
      group by artist_key
      order by sum(score) desc
      limit 1
    ) w
    left join public.music_chart_artists a
      on a.market = p_market and a.artist_key = w.artist_key
    on conflict (market, period, period_start) do update set
      artist_key = excluded.artist_key,
      artist = excluded.artist,
      score = excluded.score,
      views_delta = excluded.views_delta,
      days_counted = excluded.days_counted,
      thumbnail_url = excluded.thumbnail_url,
      lead_video_id = excluded.lead_video_id,
      lead_title = excluded.lead_title,
      decided_at = excluded.decided_at;
  end loop;

  return v_count;
end;
$$;

comment on function public.music_refresh_standings(text) is
  'Recomputes artist standings, daily snapshots and the week/month/year titles for one market.';

revoke all on function public.music_refresh_standings(text) from public, anon, authenticated;

-- ── fire it whenever the board changes ────────────────────────────────────
create or replace function public.music_tracks_after_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- The recompute shelves tracks, and shelving is an UPDATE on the very
  -- table this trigger watches. Only the outermost statement recomputes.
  if pg_trigger_depth() > 1 then
    return null;
  end if;
  perform public.music_refresh_standings('KE');
  return null;
end;
$$;

drop trigger if exists music_tracks_standings_trg on public.music_chart_tracks;
create trigger music_tracks_standings_trg
  after insert or update on public.music_chart_tracks
  for each statement
  execute function public.music_tracks_after_write();

comment on trigger music_tracks_standings_trg on public.music_chart_tracks is
  'Keeps artist standings and titles in step with the board, whatever writes it.';
