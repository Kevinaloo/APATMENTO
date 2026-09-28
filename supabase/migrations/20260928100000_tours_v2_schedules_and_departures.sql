-- ═══════════════════════════════════════════════════════════════════
-- CABANA TOURS v2 · 1 of 5 · schedules you can count down to
-- ───────────────────────────────────────────────────────────────────
-- The tours page now shows a departure board: every tour leaving in the
-- next thirty days, with a live countdown. A countdown needs a real
-- departure, so a tour's schedule has to be something Postgres can
-- expand into dates rather than a single optional "next departure".
--
--   on_request  no fixed dates; bookable any day, never on the board
--   daily       every day
--   weekly      the weekdays in departure_days ('mon'..'sun')      NEW
--   fixed       next_departure, plus any ISO dates in departure_days
--
-- departure_time is the local hour a tour leaves. It is for display
-- and the countdown only: the booking cut-off still runs from midnight
-- Nairobi time, exactly as cabana_secure_tour_booking always has.
-- ═══════════════════════════════════════════════════════════════════

alter table public.tours add column if not exists departure_time time;
comment on column public.tours.departure_time is
  'Local (Africa/Nairobi) time a departure leaves. Display and countdown only; the booking cut-off runs from midnight.';
comment on column public.tours.departure_days is
  'weekly: weekday codes mon..sun. fixed: extra ISO dates (YYYY-MM-DD) beyond next_departure.';

alter table public.tours drop constraint if exists tours_schedule_type_check;
alter table public.tours add constraint tours_schedule_type_check
  check (schedule_type = any (array['fixed', 'on_request', 'daily', 'weekly']));

-- Guides and companies are both "operators" to the database, but a
-- traveller choosing who to walk a city with wants to know which is which.
alter table public.tour_operators add column if not exists persona text not null default 'operator';
alter table public.tour_operators drop constraint if exists tour_operators_persona_check;
alter table public.tour_operators add constraint tour_operators_persona_check
  check (persona in ('operator', 'guide'));

-- ── helpers ─────────────────────────────────────────────────────────
create or replace function cabana_private.try_date(p text)
returns date language plpgsql immutable set search_path = pg_catalog as $$
begin
  if p is null or btrim(p) !~ '^\d{4}-\d{2}-\d{2}$' then return null; end if;
  return btrim(p)::date;
exception when others then
  return null;
end $$;

-- Does a tour run on this date? One definition, used by the booking
-- guard, the departure board and the messenger, so the three can never
-- disagree about whether a Saturday is a departure.
create or replace function cabana_private.tour_runs_on(p_schedule text, p_next date, p_days jsonb, p_date date)
returns boolean language sql immutable set search_path = pg_catalog, cabana_private as $$
  select case coalesce(p_schedule, 'on_request')
    when 'daily' then true
    when 'on_request' then true
    when 'weekly' then exists (
      select 1
        from jsonb_array_elements_text(case when jsonb_typeof(p_days) = 'array' then p_days else '[]'::jsonb end) d
       where left(lower(btrim(d)), 3) = (array['mon','tue','wed','thu','fri','sat','sun'])[extract(isodow from p_date)::int])
    when 'fixed' then p_date = p_next or exists (
      select 1
        from jsonb_array_elements_text(case when jsonb_typeof(p_days) = 'array' then p_days else '[]'::jsonb end) d
       where cabana_private.try_date(d) = p_date)
    else false end
$$;

-- ── the departure board ─────────────────────────────────────────────
-- Scheduled departures for published tours, soonest first, only those
-- whose booking window is still open. p_per_tour keeps a daily tour
-- from filling the board with thirty copies of itself.
create or replace function public.tour_departures(p_days integer default 30, p_tour bigint default null, p_per_tour integer default 3)
returns table (tour_id bigint, departs_on date, departs_at timestamptz, closes_at timestamptz, seats_left integer, seats_total integer)
language sql stable security definer set search_path = pg_catalog, public, cabana_private as $$
  with today as (select (now() at time zone 'Africa/Nairobi')::date as d),
  cand as (
    select t.id, gs::date as day, t.departure_time, t.booking_cutoff_hours,
           coalesce(t.spots_total, t.group_max) as cap
      from public.tours t
     cross join today
     cross join lateral generate_series(today.d, today.d + least(greatest(coalesce(p_days, 30), 1), 120), interval '1 day') gs
     where t.status = 'published'
       and t.schedule_type in ('daily', 'weekly', 'fixed')
       and (p_tour is null or t.id = p_tour)
       and cabana_private.tour_runs_on(t.schedule_type, t.next_departure, t.departure_days, gs::date)
       and ((gs::date)::timestamp at time zone 'Africa/Nairobi')
             - make_interval(hours => coalesce(t.booking_cutoff_hours, 48)) > now()
  ),
  ranked as (
    select c.*, row_number() over (partition by c.id order by c.day) as rn from cand c
  )
  select r.id,
         r.day,
         (r.day + coalesce(r.departure_time, time '00:00')) at time zone 'Africa/Nairobi',
         (r.day::timestamp at time zone 'Africa/Nairobi') - make_interval(hours => coalesce(r.booking_cutoff_hours, 48)),
         public.cabana_seats_left('tour', r.id, r.day, ''),
         r.cap
    from ranked r
   where r.rn <= least(greatest(coalesce(p_per_tour, 3), 1), 60)
   order by r.day, r.id
$$;
revoke all on function public.tour_departures(integer, bigint, integer) from public;
grant execute on function public.tour_departures(integer, bigint, integer) to anon, authenticated, service_role;

-- ── the public view learns the new columns ──────────────────────────
-- Same columns, same order, two appended. security_invoker stays on, as
-- the production audit set it.
create or replace view public.tours_public with (security_invoker = true, security_barrier = true) as
 select t.id, t.slug, t.title, t.summary, t.description, t.category, t.destination, t.county, t.country,
        t.start_point, t.meeting_point, t.duration_label, t.duration_hours, t.days, t.price_kes,
        t.child_price_kes, t.deposit_pct, t.price_basis, t.group_min, t.group_max, t.schedule_type,
        t.next_departure, t.departure_days, t.spots_total, t.spots_left, t.cover_url, t.photos, t.videos,
        t.tags, t.highlights, t.includes_list, t.excludes_list, t.itinerary, t.what_to_bring, t.languages,
        t.cancellation, t.accessibility, t.featured, t.sort_weight, t.published_at,
        o.id as operator_id, o.slug as operator_slug, o.name as operator_name, o.tagline as operator_tagline,
        o.logo_url as operator_logo, o.kind as operator_kind, o.verified as operator_verified,
        o.county as operator_county, t.latitude, t.longitude, t.meeting_lat, t.meeting_lng,
        t.showcase, t.showcase_video, t.showcase_rank, t.showcase_headline, t.video_poster,
        t.departure_time, o.persona as operator_persona, t.booking_cutoff_hours
   from public.tours t
   left join public.tour_operators o on o.id = t.operator_id
  where t.status = 'published';
revoke insert, update, delete, truncate, references, trigger on public.tours_public from public, anon, authenticated;
grant select on public.tours_public to anon, authenticated;

notify pgrst, 'reload schema';
