/* ════════════════════════════════════════════════════════════════════
   CABANA · CALENDAR STUDIO
   ────────────────────────────────────────────────────────────────────
   The host calendar could close a night but never open one again: the
   page had no way to call cabana_calendar_unblock, so a host who blocked
   the wrong week had to ask support. It also stacked identical blocks on
   top of each other every time a nervous host pressed the button twice
   (production had three copies of the same night). Car-hire operators
   had two date inputs and a list.

   This migration gives every calendar in Cabana the same three things:

     1. RANGE EDITS THAT ARE EXACT
        cabana_calendar_set_ranges() opens, blocks or marks maintenance on
        any set of nights in one transaction. Existing host blocks are
        carved, never duplicated, so "open the 14th" inside a blocked week
        leaves the 12th–13th and the 15th–18th blocked. Paid nights and
        channel-owned nights are never touched here.

        car_operator_blackout_set() does the same for a vehicle, and
        car_operator_calendar() returns a whole fleet's hires and
        blackouts for a window in one read.

     2. NOTES, TASKS AND REMINDERS ON THE CALENDAR
        calendar_agenda rows belong to one person (RLS: owner only). A row
        with remind_at is delivered by calendar_agenda_tick(), which runs
        every minute from pg_cron, writes the in-app notification and asks
        /api/push-send to deliver it to the phone — the same route food
        orders already use, so a reminder reaches a host whose browser is
        closed.

     3. CLEAN DATA
        Exact duplicate host blocks are collapsed to one.
   ════════════════════════════════════════════════════════════════════ */


-- ── 1 · collapse exact duplicate host blocks ────────────────────────
delete from public.calendar_blocks b
 using public.calendar_blocks keep
 where b.feed_id is null and keep.feed_id is null
   and b.listing_id = keep.listing_id
   and b.kind = keep.kind
   and b.start_date = keep.start_date
   and b.end_date = keep.end_date
   and b.is_active and keep.is_active
   and b.id > keep.id;


-- ── 2 · exact range edits for stays ─────────────────────────────────
-- p_ranges: [{"start":"2026-10-01","end":"2026-10-04"}, …]  (end exclusive:
-- the checkout morning, so one night is start → start + 1)
-- p_state:  'open' | 'manual' | 'maintenance'
create or replace function public.cabana_calendar_set_ranges(
  p_listing_id uuid,
  p_ranges     jsonb,
  p_state      text,
  p_note       text default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, extensions
as $$
declare
  r        jsonb;
  v_start  date;
  v_end    date;
  v_clash  text;
  b        public.calendar_blocks%rowtype;
  v_opened integer := 0;
  v_closed integer := 0;
  v_skipped jsonb := '[]'::jsonb;
  v_n      integer := 0;
begin
  if not public.cabana_calendar_operator(p_listing_id) then
    raise exception 'not_your_listing' using errcode = '42501';
  end if;
  if p_state not in ('open', 'manual', 'maintenance') then
    raise exception 'state_must_be_open_manual_or_maintenance' using errcode = '22023';
  end if;
  if jsonb_typeof(p_ranges) <> 'array' or jsonb_array_length(p_ranges) = 0 then
    raise exception 'ranges_required' using errcode = '22023';
  end if;
  if jsonb_array_length(p_ranges) > 120 then
    raise exception 'too_many_ranges' using errcode = '22023';
  end if;

  for r in select * from jsonb_array_elements(p_ranges) loop
    v_n := v_n + 1;
    v_start := (r->>'start')::date;
    v_end   := (r->>'end')::date;
    if v_start is null or v_end is null or v_end <= v_start then
      raise exception 'end_must_follow_start' using errcode = '22023';
    end if;
    if v_end - v_start > 730 then
      raise exception 'range_too_long' using errcode = '22023';
    end if;
    -- Yesterday is history. Editing it changes nothing a guest can book.
    if v_end <= current_date - 1 then
      continue;
    end if;

    -- Closing nights a guest has paid for is a cancellation, not an edit.
    if p_state <> 'open' then
      select h.booking_ref into v_clash
        from public.listing_holds h
       where h.listing_id = p_listing_id
         and h.released_at is null
         and h.stay && daterange(v_start, v_end, '[)')
       limit 1;
      if v_clash is not null then
        v_skipped := v_skipped || jsonb_build_object(
          'start', v_start, 'end', v_end, 'reason', 'booked', 'booking_ref', v_clash);
        continue;
      end if;
    end if;

    -- Carve every host block this range touches. Imported (channel) blocks
    -- are the other platform's statement and are left exactly as they are.
    for b in
      select * from public.calendar_blocks
       where listing_id = p_listing_id
         and feed_id is null
         and is_active
         and kind in ('manual', 'maintenance')
         and stay && daterange(v_start, v_end, '[)')
       for update
    loop
      v_opened := v_opened + (least(b.end_date, v_end) - greatest(b.start_date, v_start));
      delete from public.calendar_blocks where id = b.id;
      if b.start_date < v_start then
        insert into public.calendar_blocks
               (listing_id, feed_id, external_uid, start_date, end_date, kind,
                platform, source, summary, note, created_by, is_active, synced_at)
        values (b.listing_id, null, 'manual-' || encode(extensions.gen_random_bytes(8), 'hex'),
                b.start_date, v_start, b.kind, 'cabana', 'host', b.summary, b.note,
                b.created_by, true, now());
      end if;
      if b.end_date > v_end then
        insert into public.calendar_blocks
               (listing_id, feed_id, external_uid, start_date, end_date, kind,
                platform, source, summary, note, created_by, is_active, synced_at)
        values (b.listing_id, null, 'manual-' || encode(extensions.gen_random_bytes(8), 'hex'),
                v_end, b.end_date, b.kind, 'cabana', 'host', b.summary, b.note,
                b.created_by, true, now());
      end if;
    end loop;

    if p_state <> 'open' then
      insert into public.calendar_blocks
             (listing_id, feed_id, external_uid, start_date, end_date, kind,
              platform, source, summary, note, created_by, is_active, synced_at)
      values (p_listing_id, null, 'manual-' || encode(extensions.gen_random_bytes(8), 'hex'),
              v_start, v_end, p_state, 'cabana', 'host',
              case when p_state = 'maintenance' then 'Maintenance' else 'Blocked by host' end,
              left(nullif(btrim(coalesce(p_note, '')), ''), 500), auth.uid(), true, now());
      v_closed := v_closed + (v_end - v_start);
    end if;
  end loop;

  -- Adjacent blocks of the same kind become one, so the exported feed and
  -- the host's own view stay a handful of clean ranges, not confetti.
  perform public.cabana_calendar_merge_host_blocks(p_listing_id);

  return jsonb_build_object(
    'ok', true,
    'state', p_state,
    'nights_opened', case when p_state = 'open' then v_opened else 0 end,
    'nights_closed', v_closed,
    'skipped', v_skipped);
end;
$$;

comment on function public.cabana_calendar_set_ranges(uuid, jsonb, text, text) is
  'Open, block or mark maintenance on any set of nights, carving existing host blocks exactly. Paid and channel-owned nights are never changed.';


create or replace function public.cabana_calendar_merge_host_blocks(p_listing_id uuid)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, extensions
as $$
declare
  a public.calendar_blocks%rowtype;
  nxt public.calendar_blocks%rowtype;
  merged boolean := true;
  guard integer := 0;
begin
  while merged and guard < 500 loop
    merged := false;
    guard := guard + 1;
    select x.* into a
      from public.calendar_blocks x
      join public.calendar_blocks y
        on y.listing_id = x.listing_id and y.feed_id is null and y.is_active
       and y.kind = x.kind and y.id <> x.id
       and y.start_date <= x.end_date and y.end_date >= x.start_date
       and coalesce(y.note, '') = coalesce(x.note, '')
     where x.listing_id = p_listing_id and x.feed_id is null and x.is_active
       and x.kind in ('manual', 'maintenance')
     order by x.start_date
     limit 1;
    if found then
      select y.* into nxt
        from public.calendar_blocks y
       where y.listing_id = a.listing_id and y.feed_id is null and y.is_active
         and y.kind = a.kind and y.id <> a.id
         and y.start_date <= a.end_date and y.end_date >= a.start_date
         and coalesce(y.note, '') = coalesce(a.note, '')
       order by y.start_date
       limit 1;
      update public.calendar_blocks
         set start_date = least(a.start_date, nxt.start_date),
             end_date   = greatest(a.end_date, nxt.end_date),
             synced_at  = now()
       where id = a.id;
      delete from public.calendar_blocks where id = nxt.id;
      merged := true;
    end if;
  end loop;
end;
$$;

revoke all on function public.cabana_calendar_merge_host_blocks(uuid) from public, anon, authenticated;
revoke all on function public.cabana_calendar_set_ranges(uuid, jsonb, text, text) from public, anon;
grant execute on function public.cabana_calendar_set_ranges(uuid, jsonb, text, text) to authenticated;


-- ── 3 · the fleet calendar ──────────────────────────────────────────
-- Car dates are whole days, inclusive at both ends, exactly as
-- car_blackouts and car_bookings already store them.
create or replace function public.car_operator_calendar(
  p_from date default (current_date - 7),
  p_to   date default (current_date + 120)
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, extensions
as $$
declare
  o public.car_operators%rowtype;
  v_from date := coalesce(p_from, current_date - 7);
  v_to   date := least(coalesce(p_to, current_date + 120), coalesce(p_from, current_date) + 400);
begin
  o := public.car_me_operator();
  return jsonb_build_object(
    'ok', true,
    'from', v_from, 'to', v_to,
    'operator', jsonb_build_object('id', o.id, 'name', o.name, 'currency', coalesce(o.currency_code, 'KES'),
                                   'city', o.city, 'verified', o.verified),
    'fleet', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', f.id, 'make', f.make, 'model', f.model, 'year', f.year, 'plate', f.plate,
               'class', f.class, 'status', f.status, 'day_rate', f.day_rate, 'colour', f.colour,
               'photo', case when jsonb_typeof(f.photos) = 'array' then f.photos->>0 end)
             order by f.created_at)
        from public.car_fleet f
       where f.operator_id = o.id and f.status <> 'retired'), '[]'::jsonb),
    'bookings', coalesce((
      select jsonb_agg(public.car_booking_json(b, 'operator') order by b.starts_on)
        from public.car_bookings b
       where b.operator_id = o.id
         and b.status in ('requested', 'confirmed', 'active', 'completed', 'no_show')
         and b.starts_on <= v_to and b.ends_on >= v_from), '[]'::jsonb),
    'blackouts', coalesce((
      select jsonb_agg(jsonb_build_object(
               'vehicle_id', x.vehicle_id, 'starts_on', x.starts_on, 'ends_on', x.ends_on,
               'reason', x.reason, 'booking_id', x.booking_id)
             order by x.starts_on)
        from public.car_blackouts x
        join public.car_fleet f on f.id = x.vehicle_id
       where f.operator_id = o.id
         and x.starts_on <= v_to and x.ends_on >= v_from), '[]'::jsonb));
end;
$$;

revoke all on function public.car_operator_calendar(date, date) from public, anon;
grant execute on function public.car_operator_calendar(date, date) to authenticated;


-- p_state: 'open' | 'blocked'   ·   dates inclusive
create or replace function public.car_operator_blackout_set(
  p_vehicle uuid,
  p_start   date,
  p_end     date,
  p_state   text
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  o public.car_operators%rowtype;
  x public.car_blackouts%rowtype;
  v_ref text;
begin
  o := public.car_me_operator();
  if not exists (select 1 from public.car_fleet where id = p_vehicle and operator_id = o.id) then
    perform public.car_err('vehicle_not_found');
  end if;
  if p_start is null or p_end is null or p_end < p_start or p_end - p_start > 730 then
    perform public.car_err('dates_invalid');
  end if;
  if p_state not in ('open', 'blocked') then
    perform public.car_err('dates_invalid');
  end if;

  if p_state = 'blocked' then
    select b.ref into v_ref from public.car_bookings b
     where b.vehicle_id = p_vehicle
       and b.status in ('requested', 'confirmed', 'active')
       and b.starts_on <= p_end and b.ends_on >= p_start
     limit 1;
    if v_ref is not null then
      return jsonb_build_object('ok', false, 'error', 'booked', 'booking_ref', v_ref);
    end if;
  end if;

  -- Carve the operator's own blackouts; hire blackouts belong to the hire.
  for x in
    select * from public.car_blackouts
     where vehicle_id = p_vehicle and booking_id is null and reason = 'operator'
       and starts_on <= p_end and ends_on >= p_start
     for update
  loop
    delete from public.car_blackouts where id = x.id;
    if x.starts_on < p_start then
      insert into public.car_blackouts (vehicle_id, starts_on, ends_on, reason)
      values (p_vehicle, x.starts_on, p_start - 1, 'operator')
      on conflict (vehicle_id, starts_on, ends_on, reason) do nothing;
    end if;
    if x.ends_on > p_end then
      insert into public.car_blackouts (vehicle_id, starts_on, ends_on, reason)
      values (p_vehicle, p_end + 1, x.ends_on, 'operator')
      on conflict (vehicle_id, starts_on, ends_on, reason) do nothing;
    end if;
  end loop;

  if p_state = 'blocked' then
    insert into public.car_blackouts (vehicle_id, starts_on, ends_on, reason)
    values (p_vehicle, p_start, p_end, 'operator')
    on conflict (vehicle_id, starts_on, ends_on, reason) do nothing;
  end if;

  return jsonb_build_object('ok', true, 'state', p_state,
    'blackouts', coalesce((select jsonb_agg(jsonb_build_object('starts_on', starts_on, 'ends_on', ends_on,
                                     'reason', reason, 'booking_id', booking_id) order by starts_on)
                             from public.car_blackouts where vehicle_id = p_vehicle and ends_on >= current_date - 7),
                          '[]'::jsonb));
end;
$$;

revoke all on function public.car_operator_blackout_set(uuid, date, date, text) from public, anon;
grant execute on function public.car_operator_blackout_set(uuid, date, date, text) to authenticated;


-- ── 4 · notes, tasks and reminders ──────────────────────────────────
create table if not exists public.calendar_agenda (
  id           uuid primary key default gen_random_uuid(),
  owner_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  scope        text not null default 'general'
               check (scope in ('stay', 'vehicle', 'general')),
  subject_id   uuid,
  subject_label text,
  kind         text not null default 'note'
               check (kind in ('note', 'task', 'reminder')),
  title        text not null check (char_length(btrim(title)) between 1 and 160),
  body         text check (body is null or char_length(body) <= 2000),
  on_date      date not null,
  at_time      time,
  remind_at    timestamptz,
  booking_ref  text,
  done_at      timestamptz,
  reminded_at  timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists calendar_agenda_owner_date
  on public.calendar_agenda (owner_id, on_date);
create index if not exists calendar_agenda_due
  on public.calendar_agenda (remind_at)
  where reminded_at is null and done_at is null and remind_at is not null;

alter table public.calendar_agenda enable row level security;

drop policy if exists calendar_agenda_owner_all on public.calendar_agenda;
create policy calendar_agenda_owner_all on public.calendar_agenda
  for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

grant select, insert, update, delete on public.calendar_agenda to authenticated;
revoke all on public.calendar_agenda from anon;

-- Moving a reminder re-arms it; a completed item never fires.
create or replace function public.calendar_agenda_touch()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  new.updated_at := now();
  new.owner_id := coalesce(old.owner_id, new.owner_id);
  if tg_op = 'UPDATE' and new.remind_at is distinct from old.remind_at then
    new.reminded_at := null;
  end if;
  return new;
end;
$$;

drop trigger if exists calendar_agenda_touch_t on public.calendar_agenda;
create trigger calendar_agenda_touch_t
  before update on public.calendar_agenda
  for each row execute function public.calendar_agenda_touch();


create or replace function public.calendar_agenda_tick()
returns integer
language plpgsql
security definer
set search_path = pg_catalog, public, extensions, net, cabana_ops
as $$
declare
  a      public.calendar_agenda%rowtype;
  nid    uuid;
  secret text;
  v_url  text;
  n      integer := 0;
begin
  select value into secret from cabana_ops.cron_config where key = 'cron_secret';

  for a in
    select * from public.calendar_agenda
     where remind_at is not null and remind_at <= now()
       and reminded_at is null and done_at is null
       -- A reminder more than a day late is noise, not help.
       and remind_at > now() - interval '1 day'
     order by remind_at
     limit 200
     for update skip locked
  loop
    v_url := case a.scope
      when 'vehicle' then '/partner-fleet?tab=calendar&date=' || a.on_date
      when 'stay'    then '/partner-calendar?listing=' || coalesce(a.subject_id::text, '') || '&date=' || a.on_date
      else '/partner-calendar?date=' || a.on_date end;

    insert into public.notifications (user_id, title, body, url, kind, meta)
    values (a.owner_id,
            left('Reminder · ' || a.title, 140),
            left(concat_ws(' · ',
                   nullif(a.subject_label, ''),
                   to_char(a.on_date, 'Dy DD Mon'),
                   nullif(left(coalesce(a.body, ''), 120), '')), 240),
            v_url, 'reminder',
            jsonb_build_object('agenda_id', a.id, 'booking_ref', a.booking_ref))
    returning id into nid;

    update public.calendar_agenda set reminded_at = now() where id = a.id;
    n := n + 1;

    if secret is not null and secret <> '' then
      begin
        perform net.http_post(
          url := 'https://cabana.africa/api/push-send?action=database-notification',
          headers := jsonb_build_object('Authorization', 'Bearer ' || secret,
            'Content-Type', 'application/json', 'User-Agent', 'Cabana-Calendar/1.0'),
          body := jsonb_build_object('action', 'database-notification', 'notification_id', nid),
          timeout_milliseconds := 15000);
      exception when others then
        raise warning 'calendar reminder push queue failed: %', sqlerrm;
      end;
    end if;
  end loop;
  return n;
end;
$$;

revoke all on function public.calendar_agenda_tick() from public, anon, authenticated;

do $$
begin
  perform cron.unschedule(jobid) from cron.job where jobname = 'cabana-calendar-reminders';
  perform cron.schedule('cabana-calendar-reminders', '* * * * *', 'select public.calendar_agenda_tick()');
exception when others then
  raise warning 'pg_cron unavailable, reminders will not be scheduled: %', sqlerrm;
end $$;
