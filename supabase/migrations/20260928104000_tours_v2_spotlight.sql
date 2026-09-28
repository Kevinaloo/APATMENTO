-- ═══════════════════════════════════════════════════════════════════
-- CABANA TOURS v2 · 5 of 5 · the Spotlight
-- ───────────────────────────────────────────────────────────────────
-- The top of /tours is a full-screen slideshow: image, video or a
-- YouTube film with words laid over it. Three kinds of slide live here:
--
--   sponsored  bought by a guide or operator for 1, 7, 14 or 30 days,
--              paid by M-Pesa, reviewed by a person before it goes live
--   tour       a tour the console chose to feature, free of charge
--   house      Cabana's own: Immersive, the guides, "get featured"
--
-- Money follows the same ledger as every booking. A Spotlight has a
-- SPOT-… reference; /api/stk-push charges grand_total in full
-- (payment_mode 'full'); whichever path marks the booking_payments row
-- paid (PayHero callback, poll, nightly reconcile), a trigger on that
-- row settles the Spotlight. So no payment path needs to know what a
-- Spotlight is, and none can leave one paid but unsettled.
--
-- Inventory is real: at most max_sponsored sponsored slides may overlap
-- on any day. An unpaid checkout holds its place for 30 minutes.
-- Paid but refused by review becomes non-expiring Cabana credit, the
-- same way a tour departure that fills before a deposit clears does.
--
-- Creative is checked like a chat message (no numbers, links, handles),
-- and media must be uploaded to the operator's own folder in the tours
-- bucket: nothing hotlinked, nothing that can change after review.
-- ═══════════════════════════════════════════════════════════════════

create table if not exists public.tour_spotlight_settings (
  id            smallint primary key default 1 check (id = 1),
  enabled       boolean not null default true,
  max_sponsored integer not null default 6 check (max_sponsored between 1 and 20),
  prices        jsonb   not null default '{"day": 1500, "week": 7500, "fortnight": 13500, "month": 24000}'::jsonb,
  review_hours  integer not null default 24 check (review_hours between 1 and 168),
  pitch         text,
  updated_at    timestamptz not null default now()
);
insert into public.tour_spotlight_settings (id) values (1) on conflict (id) do nothing;
alter table public.tour_spotlight_settings enable row level security;
drop policy if exists tour_spotlight_settings_read on public.tour_spotlight_settings;
drop policy if exists tour_spotlight_settings_admin on public.tour_spotlight_settings;
create policy tour_spotlight_settings_read on public.tour_spotlight_settings for select to anon, authenticated using (true);
create policy tour_spotlight_settings_admin on public.tour_spotlight_settings for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
revoke all on public.tour_spotlight_settings from public, anon, authenticated;
grant select on public.tour_spotlight_settings to anon, authenticated;
grant update on public.tour_spotlight_settings to authenticated;
grant all on public.tour_spotlight_settings to service_role;

create table if not exists public.tour_spotlights (
  id                uuid primary key default gen_random_uuid(),
  kind              text not null default 'sponsored' check (kind in ('sponsored', 'tour', 'house')),
  status            text not null default 'pending_payment'
                    check (status in ('draft', 'pending_payment', 'in_review', 'approved', 'paused', 'rejected', 'ended', 'cancelled')),
  user_id           uuid references auth.users(id) on delete set null,
  operator_id       bigint references public.tour_operators(id) on delete set null,
  tour_id           bigint references public.tours(id) on delete set null,
  media_kind        text not null default 'image' check (media_kind in ('image', 'video', 'youtube', 'art', 'world')),
  media_url         text,
  media_mobile_url  text,
  poster_url        text,
  focal             text not null default '50% 50%',
  art               text,
  kicker            text,
  headline          text not null,
  subline           text,
  cta_label         text,
  cta_url           text,
  accent            text,
  package           text check (package in ('day', 'week', 'fortnight', 'month')),
  days              integer,
  starts_at         timestamptz not null default now(),
  ends_at           timestamptz not null default (now() + interval '7 days'),
  priority          integer not null default 0,
  price_kes         integer not null default 0,
  grand_total       numeric not null default 0,
  amount_paid       numeric not null default 0,
  payment_mode      text not null default 'full',
  payment_reference text unique,
  paid_at           timestamptz,
  credited          numeric not null default 0,
  review_note       text,
  reviewed_at       timestamptz,
  reviewed_by       text,
  impressions       integer not null default 0,
  clicks            integer not null default 0,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint tour_spotlights_window check (ends_at > starts_at)
);
create index if not exists tour_spotlights_live on public.tour_spotlights (status, starts_at, ends_at);
create index if not exists tour_spotlights_user on public.tour_spotlights (user_id);
create index if not exists tour_spotlights_tour on public.tour_spotlights (tour_id);
alter table public.tour_spotlights enable row level security;
drop policy if exists tour_spotlights_owner_read on public.tour_spotlights;
drop policy if exists tour_spotlights_admin on public.tour_spotlights;
create policy tour_spotlights_owner_read on public.tour_spotlights for select to authenticated
  using (user_id = (select auth.uid()));
create policy tour_spotlights_admin on public.tour_spotlights for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
revoke all on public.tour_spotlights from public, anon, authenticated;
grant select, insert, update, delete on public.tour_spotlights to authenticated;
grant all on public.tour_spotlights to service_role;

create table if not exists public.tour_spotlight_stats (
  spotlight_id uuid not null references public.tour_spotlights(id) on delete cascade,
  day          date not null,
  impressions  integer not null default 0,
  clicks       integer not null default 0,
  primary key (spotlight_id, day)
);
alter table public.tour_spotlight_stats enable row level security;
revoke all on public.tour_spotlight_stats from public, anon, authenticated;
grant all on public.tour_spotlight_stats to service_role;

-- A payment path writes booking-shaped statuses ('paid_pending_checkin')
-- to whatever table a reference names. Those are not Spotlight states;
-- the settle trigger below is the only thing that moves a Spotlight on
-- payment, so anything else is ignored rather than refused.
create or replace function cabana_private.tour_spotlight_guard()
returns trigger language plpgsql set search_path = pg_catalog as $$
begin
  if new.status is null or new.status not in ('draft', 'pending_payment', 'in_review', 'approved', 'paused', 'rejected', 'ended', 'cancelled') then
    new.status := old.status;
  end if;
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists tour_spotlight_guard on public.tour_spotlights;
create trigger tour_spotlight_guard before update on public.tour_spotlights
  for each row execute function cabana_private.tour_spotlight_guard();

-- ── helpers ─────────────────────────────────────────────────────────
create or replace function cabana_private.youtube_id(p text)
returns text language sql immutable set search_path = pg_catalog as $$
  select case
    when p is null then null
    when btrim(p) ~ '^[A-Za-z0-9_-]{11}$' then btrim(p)
    else substring(btrim(p) from '(?:youtu\.be/|youtube(?:-nocookie)?\.com/(?:watch\?(?:[^#]*&)?v=|embed/|shorts/|live/|v/))([A-Za-z0-9_-]{11})')
  end
$$;

create or replace function cabana_private.spotlight_media_ok(p_url text, p_owner uuid)
returns boolean language sql immutable set search_path = pg_catalog as $$
  select p_url is not null and p_owner is not null
     and p_url ~ ('^https://[a-z0-9]+\.supabase\.co/storage/v1/object/public/tours/' || p_owner::text || '/[A-Za-z0-9._/-]+$')
$$;

create or replace function cabana_private.spotlight_text_ok(p text)
returns void language plpgsql stable set search_path = pg_catalog, cabana_private as $$
declare g jsonb;
begin
  if coalesce(btrim(p), '') = '' then return; end if;
  g := cabana_private.chat_guard(p, false, '{}'::text[]);
  if jsonb_array_length(coalesce(g->'hard', '[]'::jsonb)) > 0 then
    raise exception 'Keep phone numbers, links and handles out of your Spotlight. Travellers message you on Cabana.'
      using errcode = '22023', hint = 'guard';
  end if;
end $$;

create or replace function cabana_private.spotlight_days(p_package text)
returns integer language sql immutable set search_path = pg_catalog as $$
  select case p_package when 'day' then 1 when 'week' then 7 when 'fortnight' then 14 when 'month' then 30 end
$$;

-- The fewest free sponsored places on any day in [p_from, p_to).
create or replace function cabana_private.spotlight_free_slots(p_from timestamptz, p_to timestamptz, p_exclude uuid default null)
returns integer language sql stable security definer set search_path = pg_catalog, public as $$
  with s as (select max_sponsored from public.tour_spotlight_settings where id = 1),
  days as (
    select d::date as day
      from generate_series((p_from at time zone 'Africa/Nairobi')::date,
                           ((p_to - interval '1 second') at time zone 'Africa/Nairobi')::date, interval '1 day') d
  ),
  load as (
    select days.day, count(sp.id) as n
      from days
      left join public.tour_spotlights sp
        on sp.kind = 'sponsored' and sp.id is distinct from p_exclude
       and (sp.status in ('in_review', 'approved', 'paused')
            or (sp.status = 'pending_payment' and sp.created_at > now() - interval '30 minutes'))
       and sp.starts_at < ((days.day + 1)::timestamp at time zone 'Africa/Nairobi')
       and sp.ends_at   > (days.day::timestamp at time zone 'Africa/Nairobi')
     group by days.day
  )
  select greatest(0, coalesce((select max_sponsored from s), 6) - coalesce(max(n), 0))::int from load
$$;

-- ── what the page shows ─────────────────────────────────────────────
create or replace function public.tour_spotlight_feed()
returns jsonb language sql stable security definer set search_path = pg_catalog, public as $$
  select coalesce(jsonb_agg(row order by ord), '[]'::jsonb) from (
    select jsonb_build_object(
      'id', sp.id, 'kind', sp.kind, 'sponsored', sp.kind = 'sponsored',
      'media_kind', sp.media_kind, 'media_url', sp.media_url, 'media_mobile_url', sp.media_mobile_url,
      'poster_url', sp.poster_url, 'focal', sp.focal, 'art', sp.art,
      'kicker', sp.kicker, 'headline', sp.headline, 'subline', sp.subline,
      'cta_label', sp.cta_label, 'cta_url', case when sp.kind = 'sponsored' then null else sp.cta_url end,
      'accent', sp.accent, 'ends_at', sp.ends_at,
      'tour', case when t.id is null then null else jsonb_build_object(
        'id', t.id, 'title', t.title, 'destination', coalesce(nullif(t.destination, ''), t.county),
        'price', t.price_kes, 'price_basis', t.price_basis, 'deposit_pct', t.deposit_pct,
        'duration', coalesce(t.duration_label, t.days || case when t.days = 1 then ' day' else ' days' end),
        'cover', coalesce(t.cover_url, t.photos->>0),
        'next_departure', (select d.departs_at from public.tour_departures(60, t.id, 1) d limit 1)) end,
      'operator', case when o.id is null then null else jsonb_build_object(
        'id', o.id, 'name', o.name, 'verified', o.verified, 'persona', o.persona, 'logo', o.logo_url) end
    ) as row,
    row_number() over (order by case sp.kind when 'sponsored' then 0 when 'tour' then 1 else 2 end,
                                sp.priority desc, sp.paid_at nulls last, sp.created_at) as ord
      from public.tour_spotlights sp
      left join public.tours t on t.id = sp.tour_id
      left join public.tour_operators o on o.id = coalesce(sp.operator_id, t.operator_id) and o.status = 'approved'
     where sp.status = 'approved' and now() >= sp.starts_at and now() < sp.ends_at
       and (sp.tour_id is null or t.status = 'published')
       and (select enabled from public.tour_spotlight_settings where id = 1)
     order by ord
     limit 12
  ) x
$$;
revoke all on function public.tour_spotlight_feed() from public;
grant execute on function public.tour_spotlight_feed() to anon, authenticated;

create or replace function public.tour_spotlight_track(p_id uuid, p_event text)
returns void language plpgsql security definer set search_path = pg_catalog, public as $$
declare v int := case p_event when 'view' then 1 else 0 end; k int := case p_event when 'click' then 1 else 0 end;
begin
  if p_event not in ('view', 'click') then return; end if;
  update public.tour_spotlights set impressions = impressions + v, clicks = clicks + k
   where id = p_id and status = 'approved' and now() >= starts_at and now() < ends_at;
  if found then
    insert into public.tour_spotlight_stats (spotlight_id, day, impressions, clicks)
    values (p_id, (now() at time zone 'Africa/Nairobi')::date, v, k)
    on conflict (spotlight_id, day) do update
      set impressions = public.tour_spotlight_stats.impressions + excluded.impressions,
          clicks = public.tour_spotlight_stats.clicks + excluded.clicks;
  end if;
end $$;
revoke all on function public.tour_spotlight_track(uuid, text) from public;
grant execute on function public.tour_spotlight_track(uuid, text) to anon, authenticated;

-- ── what an operator can buy ────────────────────────────────────────
create or replace function public.tour_spotlight_quote(p_package text, p_start date default null)
returns jsonb language plpgsql stable security definer set search_path = pg_catalog, public, cabana_private as $$
declare s public.tour_spotlight_settings%rowtype; d int; price int; today date := (now() at time zone 'Africa/Nairobi')::date;
  v_start date := coalesce(p_start, (now() at time zone 'Africa/Nairobi')::date); v_from timestamptz; v_to timestamptz;
begin
  select * into s from public.tour_spotlight_settings where id = 1;
  d := cabana_private.spotlight_days(p_package);
  if d is null then raise exception 'Choose a Spotlight package.' using errcode = '22023'; end if;
  price := nullif(s.prices->>p_package, '')::int;
  if v_start < today then v_start := today; end if;
  v_from := greatest(v_start::timestamp at time zone 'Africa/Nairobi', now());
  v_to := (v_start + d)::timestamp at time zone 'Africa/Nairobi';
  return jsonb_build_object('package', p_package, 'days', d, 'price', price, 'enabled', s.enabled,
    'starts_at', v_from, 'ends_at', v_to,
    'free_slots', cabana_private.spotlight_free_slots(v_from, v_to, null), 'max', s.max_sponsored,
    'review_hours', s.review_hours);
end $$;
revoke all on function public.tour_spotlight_quote(text, date) from public;
grant execute on function public.tour_spotlight_quote(text, date) to anon, authenticated;

create or replace function public.tour_spotlight_calendar(p_days integer default 60)
returns jsonb language sql stable security definer set search_path = pg_catalog, public, cabana_private as $$
  select coalesce(jsonb_agg(jsonb_build_object('day', d::date,
           'free', cabana_private.spotlight_free_slots(greatest((d::date)::timestamp at time zone 'Africa/Nairobi', now()),
                                                       ((d::date) + 1)::timestamp at time zone 'Africa/Nairobi', null))
           order by d), '[]'::jsonb)
    from generate_series((now() at time zone 'Africa/Nairobi')::date,
                         (now() at time zone 'Africa/Nairobi')::date + least(greatest(coalesce(p_days, 60), 1), 120) - 1,
                         interval '1 day') d
$$;
revoke all on function public.tour_spotlight_calendar(integer) from public;
grant execute on function public.tour_spotlight_calendar(integer) to anon, authenticated;

create or replace function public.tour_spotlight_create(p jsonb)
returns jsonb language plpgsql security definer set search_path = pg_catalog, public, cabana_private, extensions as $$
declare
  me uuid := auth.uid();
  s public.tour_spotlight_settings%rowtype; op public.tour_operators%rowtype; t public.tours%rowtype;
  today date := (now() at time zone 'Africa/Nairobi')::date;
  v_tour bigint; v_kind text; v_url text; v_mobile text; v_poster text;
  v_head text; v_kick text; v_sub text; v_cta text; v_accent text; v_focal text;
  v_pkg text; v_days int; v_price int; v_start date; v_from timestamptz; v_to timestamptz; v_ref text;
  r public.tour_spotlights%rowtype;
begin
  if me is null then raise exception 'Sign in first.' using errcode = '42501'; end if;
  select * into s from public.tour_spotlight_settings where id = 1;
  if not coalesce(s.enabled, false) then raise exception 'The Spotlight is paused right now. Try again soon.' using errcode = 'P0001'; end if;

  select * into op from public.tour_operators where owner_id = me and status = 'approved' order by created_at limit 1;
  if not found then
    raise exception 'Your guide or operator profile needs to be approved before you can buy a Spotlight.'
      using errcode = '42501', hint = 'operator_required';
  end if;

  v_tour := case when coalesce(p->>'tour_id', '') ~ '^\d+$' then (p->>'tour_id')::bigint end;
  if v_tour is not null then
    select * into t from public.tours
     where id = v_tour and status = 'published' and (owner_id = me or operator_id = op.id);
    if not found then raise exception 'Pick one of your published tours.' using errcode = '22023'; end if;
  end if;

  v_kind := coalesce(p->>'media_kind', 'image');
  if v_kind not in ('image', 'video', 'youtube') then raise exception 'Choose a photo, a video or a YouTube film.' using errcode = '22023'; end if;
  v_url := nullif(btrim(coalesce(p->>'media_url', '')), '');
  if v_kind = 'youtube' then
    v_url := cabana_private.youtube_id(v_url);
    if v_url is null then raise exception 'That does not look like a YouTube link.' using errcode = '22023'; end if;
  elsif not cabana_private.spotlight_media_ok(v_url, me) then
    raise exception 'Upload the photo or video here, so it cannot change after review.' using errcode = '22023';
  end if;
  v_mobile := nullif(btrim(coalesce(p->>'media_mobile_url', '')), '');
  if v_mobile is not null and not cabana_private.spotlight_media_ok(v_mobile, me) then v_mobile := null; end if;
  v_poster := nullif(btrim(coalesce(p->>'poster_url', '')), '');
  if v_poster is not null and not cabana_private.spotlight_media_ok(v_poster, me) then v_poster := null; end if;

  v_head := btrim(regexp_replace(coalesce(p->>'headline', ''), '\s+', ' ', 'g'));
  if length(v_head) < 3 or length(v_head) > 70 then raise exception 'Give the Spotlight a headline of up to 70 characters.' using errcode = '22023'; end if;
  v_kick := left(nullif(btrim(coalesce(p->>'kicker', '')), ''), 40);
  v_sub := left(nullif(btrim(regexp_replace(coalesce(p->>'subline', ''), '\s+', ' ', 'g')), ''), 160);
  v_cta := left(nullif(btrim(coalesce(p->>'cta_label', '')), ''), 24);
  perform cabana_private.spotlight_text_ok(concat_ws(' · ', v_head, v_kick, v_sub, v_cta));
  v_accent := case when coalesce(p->>'accent', '') ~ '^#[0-9A-Fa-f]{6}$' then p->>'accent' end;
  v_focal := case when coalesce(p->>'focal', '') ~ '^\d{1,3}% \d{1,3}%$' then p->>'focal' else '50% 50%' end;

  v_pkg := p->>'package';
  v_days := cabana_private.spotlight_days(v_pkg);
  if v_days is null then raise exception 'Choose a Spotlight package.' using errcode = '22023'; end if;
  v_price := nullif(s.prices->>v_pkg, '')::int;
  if v_price is null or v_price <= 0 then raise exception 'That package is not on sale right now.' using errcode = '22023'; end if;
  v_start := coalesce(cabana_private.try_date(p->>'start'), today);
  if v_start < today or v_start > today + 120 then raise exception 'Choose a start date within the next four months.' using errcode = '22023'; end if;
  v_from := greatest(v_start::timestamp at time zone 'Africa/Nairobi', now());
  v_to := (v_start + v_days)::timestamp at time zone 'Africa/Nairobi';

  -- One unpaid checkout at a time: an abandoned one gives its place back.
  update public.tour_spotlights set status = 'cancelled'
   where user_id = me and status = 'pending_payment' and amount_paid = 0;

  if cabana_private.spotlight_free_slots(v_from, v_to, null) <= 0 then
    raise exception 'Those dates are fully booked. Try a later start date.' using errcode = 'P0001', hint = 'sold_out';
  end if;

  v_ref := 'SPOT-' || upper(substr(encode(extensions.gen_random_bytes(4), 'hex'), 1, 6)) || '-'
           || floor(extract(epoch from clock_timestamp()) * 1000)::bigint;
  insert into public.tour_spotlights (kind, status, user_id, operator_id, tour_id, media_kind, media_url, media_mobile_url,
     poster_url, focal, kicker, headline, subline, cta_label, accent, package, days, starts_at, ends_at,
     price_kes, grand_total, payment_mode, payment_reference)
  values ('sponsored', 'pending_payment', me, op.id, t.id, v_kind, v_url, v_mobile, v_poster, v_focal, v_kick, v_head,
          v_sub, v_cta, v_accent, v_pkg, v_days, v_from, v_to, v_price, v_price, 'full', v_ref)
  returning * into r;
  return to_jsonb(r) - 'review_note' - 'reviewed_by';
end $$;
revoke all on function public.tour_spotlight_create(jsonb) from public, anon;
grant execute on function public.tour_spotlight_create(jsonb) to authenticated;

create or replace function public.tour_spotlight_cancel(p_id uuid)
returns jsonb language plpgsql security definer set search_path = pg_catalog, public as $$
declare me uuid := auth.uid();
begin
  update public.tour_spotlights set status = 'cancelled'
   where id = p_id and user_id = me and status in ('draft', 'pending_payment') and amount_paid = 0;
  if not found then raise exception 'Only an unpaid Spotlight can be cancelled here. Ask Cabana support about a paid one.' using errcode = '22023'; end if;
  return jsonb_build_object('ok', true);
end $$;
revoke all on function public.tour_spotlight_cancel(uuid) from public, anon;
grant execute on function public.tour_spotlight_cancel(uuid) to authenticated;

create or replace function public.tour_spotlights_mine()
returns jsonb language sql stable security definer set search_path = pg_catalog, public as $$
  select coalesce(jsonb_agg(jsonb_build_object(
      'id', sp.id, 'status', sp.status, 'kind', sp.kind, 'tour_id', sp.tour_id, 'tour', t.title,
      'media_kind', sp.media_kind, 'media_url', sp.media_url, 'poster_url', sp.poster_url, 'focal', sp.focal,
      'kicker', sp.kicker, 'headline', sp.headline, 'subline', sp.subline, 'cta_label', sp.cta_label, 'accent', sp.accent,
      'package', sp.package, 'days', sp.days, 'starts_at', sp.starts_at, 'ends_at', sp.ends_at,
      'price_kes', sp.price_kes, 'grand_total', sp.grand_total, 'amount_paid', sp.amount_paid, 'paid_at', sp.paid_at,
      'payment_reference', sp.payment_reference, 'review_note', sp.review_note, 'credited', sp.credited,
      'live', sp.status = 'approved' and now() >= sp.starts_at and now() < sp.ends_at,
      'impressions', sp.impressions, 'clicks', sp.clicks,
      'daily', coalesce((select jsonb_agg(jsonb_build_object('day', st.day, 'views', st.impressions, 'clicks', st.clicks) order by st.day)
                           from public.tour_spotlight_stats st where st.spotlight_id = sp.id), '[]'::jsonb),
      'created_at', sp.created_at) order by sp.created_at desc), '[]'::jsonb)
    from public.tour_spotlights sp
    left join public.tours t on t.id = sp.tour_id
   where sp.user_id = auth.uid() and auth.uid() is not null and sp.status <> 'cancelled'
$$;
revoke all on function public.tour_spotlights_mine() from public, anon;
grant execute on function public.tour_spotlights_mine() to authenticated;

-- ── money in ────────────────────────────────────────────────────────
create or replace function cabana_private.settle_spotlight(p_ref text)
returns void language plpgsql security definer set search_path = pg_catalog, public as $$
declare sp public.tour_spotlights%rowtype; v_paid numeric; newly boolean;
begin
  select * into sp from public.tour_spotlights where payment_reference = p_ref for update;
  if not found then return; end if;
  select coalesce(sum(amount), 0) into v_paid from public.booking_payments where booking_ref = p_ref and status = 'paid';
  newly := v_paid >= sp.grand_total and sp.grand_total > 0 and sp.paid_at is null;
  update public.tour_spotlights
     set amount_paid = v_paid,
         paid_at = case when newly then now() else paid_at end,
         status = case when v_paid >= grand_total and grand_total > 0 and status in ('draft', 'pending_payment', 'cancelled')
                       then 'in_review' else status end
   where id = sp.id;
  if newly and sp.user_id is not null then
    insert into public.notifications (user_id, title, body, url, kind, meta)
    values (sp.user_id, 'Payment received · your Spotlight is in review',
            'We look at every Spotlight before it goes live on the tours page, usually within a few hours.',
            '/tours-studio?tab=spotlight', 'payment', jsonb_build_object('spotlight_id', sp.id));
  end if;
end $$;

create or replace function cabana_private.booking_payment_spotlight()
returns trigger language plpgsql security definer set search_path = pg_catalog, public, cabana_private as $$
begin
  if new.booking_table = 'tour_spotlights' and new.status = 'paid'
     and (tg_op = 'INSERT' or old.status is distinct from 'paid') then
    perform cabana_private.settle_spotlight(new.booking_ref);
  end if;
  return new;
exception when others then
  raise warning 'booking_payment_spotlight: %', sqlerrm;
  return new;
end $$;
drop trigger if exists booking_payment_spotlight on public.booking_payments;
create trigger booking_payment_spotlight after insert or update of status on public.booking_payments
  for each row execute function cabana_private.booking_payment_spotlight();

-- ── the console ─────────────────────────────────────────────────────
create or replace function public.admin_tour_spotlights()
returns jsonb language plpgsql stable security definer set search_path = pg_catalog, public, cabana_private as $$
begin
  perform cabana_admin.guard();
  return coalesce((select jsonb_agg(jsonb_build_object(
      'id', sp.id, 'kind', sp.kind, 'status', sp.status, 'user_id', sp.user_id,
      'buyer', case when sp.user_id is not null then cabana_private.member_name(sp.user_id) end,
      'operator', o.name, 'operator_id', sp.operator_id, 'tour_id', sp.tour_id, 'tour', t.title,
      'media_kind', sp.media_kind, 'media_url', sp.media_url, 'media_mobile_url', sp.media_mobile_url,
      'poster_url', sp.poster_url, 'focal', sp.focal, 'art', sp.art,
      'kicker', sp.kicker, 'headline', sp.headline, 'subline', sp.subline, 'cta_label', sp.cta_label, 'cta_url', sp.cta_url,
      'accent', sp.accent, 'package', sp.package, 'days', sp.days, 'starts_at', sp.starts_at, 'ends_at', sp.ends_at,
      'priority', sp.priority, 'price_kes', sp.price_kes, 'grand_total', sp.grand_total, 'amount_paid', sp.amount_paid,
      'paid_at', sp.paid_at, 'credited', sp.credited, 'payment_reference', sp.payment_reference,
      'review_note', sp.review_note, 'reviewed_at', sp.reviewed_at,
      'impressions', sp.impressions, 'clicks', sp.clicks,
      'live', sp.status = 'approved' and now() >= sp.starts_at and now() < sp.ends_at,
      'created_at', sp.created_at)
      order by case sp.status when 'in_review' then 0 when 'approved' then 1 when 'paused' then 2 when 'pending_payment' then 3 else 4 end,
               sp.created_at desc)
    from public.tour_spotlights sp
    left join public.tours t on t.id = sp.tour_id
    left join public.tour_operators o on o.id = sp.operator_id
   where sp.status <> 'cancelled' or sp.amount_paid > 0), '[]'::jsonb);
end $$;
revoke all on function public.admin_tour_spotlights() from public, anon;
grant execute on function public.admin_tour_spotlights() to authenticated;

create or replace function public.admin_tour_spotlight_decide(p_id uuid, p_action text, p_note text default null)
returns jsonb language plpgsql security definer set search_path = pg_catalog, public, cabana_private as $$
declare sp public.tour_spotlights%rowtype; span interval; did int := 0; credit int;
begin
  perform cabana_admin.guard();
  select * into sp from public.tour_spotlights where id = p_id for update;
  if not found then raise exception 'Spotlight not found' using errcode = '22023'; end if;

  if p_action = 'approve' then
    if sp.status not in ('in_review', 'paused', 'rejected') and not (sp.kind <> 'sponsored' and sp.status = 'draft') then
      raise exception 'Only a Spotlight in review can be approved (this one is %).', sp.status using errcode = '22023';
    end if;
    if sp.kind = 'sponsored' and sp.amount_paid < sp.grand_total then
      raise exception 'This Spotlight has not been paid for yet.' using errcode = '22023';
    end if;
    span := sp.ends_at - sp.starts_at;
    -- Review time is not the buyer's loss: a late approval moves the window.
    update public.tour_spotlights
       set status = 'approved', reviewed_at = now(), reviewed_by = lower(coalesce(auth.jwt()->>'email', 'console')),
           review_note = nullif(btrim(coalesce(p_note, '')), ''),
           starts_at = case when sp.kind = 'sponsored' and now() > sp.starts_at and sp.status = 'in_review' then now() else sp.starts_at end,
           ends_at   = case when sp.kind = 'sponsored' and now() > sp.starts_at and sp.status = 'in_review' then now() + span else sp.ends_at end
     where id = sp.id;
    if sp.user_id is not null and sp.kind = 'sponsored' then
      insert into public.notifications (user_id, title, body, url, kind, meta)
      values (sp.user_id, 'Your Spotlight is approved',
              'It plays at the top of cabana.africa/tours for the dates you booked. Watch how it does in your studio.',
              '/tours-studio?tab=spotlight', 'general', jsonb_build_object('spotlight_id', sp.id));
    end if;
  elsif p_action = 'reject' then
    if sp.status in ('ended', 'cancelled') then raise exception 'This Spotlight is already closed.' using errcode = '22023'; end if;
    update public.tour_spotlights
       set status = 'rejected', reviewed_at = now(), reviewed_by = lower(coalesce(auth.jwt()->>'email', 'console')),
           review_note = nullif(btrim(coalesce(p_note, '')), '')
     where id = sp.id;
    -- Paid and refused: the money becomes credit that never expires.
    if sp.amount_paid > 0 and sp.credited = 0 and sp.user_id is not null then
      credit := round(sp.amount_paid)::int;
      with ins as (
        insert into public.point_transactions (user_id, type, points, amount_kes, service_type, booking_ref, description)
        values (sp.user_id, 'earn', credit, sp.amount_paid, 'tours', sp.payment_reference,
                'Your Spotlight was not approved, so its payment is now Cabana credit. It never expires.')
        on conflict do nothing returning 1)
      select count(*) into did from ins;
      if did > 0 then
        update public.user_points set available_points = available_points + credit,
               lifetime_points = lifetime_points + credit, updated_at = now()
         where user_id = sp.user_id;
        if not found then
          insert into public.user_points (user_id, available_points, lifetime_points) values (sp.user_id, credit, credit);
        end if;
        update public.tour_spotlights set credited = sp.amount_paid where id = sp.id;
      end if;
    end if;
    if sp.user_id is not null and sp.kind = 'sponsored' then
      insert into public.notifications (user_id, title, body, url, kind, meta)
      values (sp.user_id, 'Your Spotlight needs changes',
              coalesce(nullif(btrim(coalesce(p_note, '')), ''), 'It was not approved.')
                || case when sp.amount_paid > 0 then ' Your payment is now Cabana credit.' else '' end,
              '/tours-studio?tab=spotlight', 'general', jsonb_build_object('spotlight_id', sp.id));
    end if;
  elsif p_action = 'pause' then
    update public.tour_spotlights set status = 'paused' where id = sp.id and status = 'approved';
  elsif p_action = 'resume' then
    update public.tour_spotlights set status = 'approved' where id = sp.id and status = 'paused';
  elsif p_action = 'end' then
    update public.tour_spotlights set status = 'ended', ends_at = least(ends_at, greatest(now(), starts_at + interval '1 second'))
     where id = sp.id and status in ('approved', 'paused');
  else
    raise exception 'Unknown action' using errcode = '22023';
  end if;
  perform cabana_admin.log('tour_spotlight_' || p_action, 'tour_spotlight', sp.id::text,
                           jsonb_build_object('note', p_note, 'kind', sp.kind));
  return jsonb_build_object('ok', true);
end $$;
revoke all on function public.admin_tour_spotlight_decide(uuid, text, text) from public, anon;
grant execute on function public.admin_tour_spotlight_decide(uuid, text, text) to authenticated;

-- Spotlights waiting for review join the console inbox, beside tours.
do $patch$
declare
  def text := pg_get_functiondef('public.admin_inbox()'::regprocedure);
  anchor text := $a$  return jsonb_build_object('counts', counts, 'items', items, 'at', now());$a$;
  addition text := $b$  -- spotlights (added by the Cabana Tours v2 migration)
  select count(*) into v_n from public.tour_spotlights where status = 'in_review';
  counts := counts || jsonb_build_object('spotlights', v_n);
  select coalesce(jsonb_agg(x), '[]'::jsonb) into v from (
    select jsonb_build_object('queue', 'spotlights', 'severity', 'med', 'id', sp.id::text,
      'title', 'Spotlight to review · ' || sp.headline,
      'sub', concat_ws(' · ', (select o.name from public.tour_operators o where o.id = sp.operator_id),
                       sp.package, 'KES ' || to_char(sp.amount_paid, 'FM999,999,990') || ' paid'),
      'at', coalesce(sp.paid_at, sp.created_at), 'link', '#/tours') as x
      from public.tour_spotlights sp where sp.status = 'in_review'
     order by sp.paid_at nulls last limit 8) q;
  items := items || v;

$b$;
begin
  if position('spotlights (added by' in def) > 0 then return; end if;
  if position(anchor in def) = 0 then
    raise notice 'admin_inbox changed shape; spotlights queue not added';
    return;
  end if;
  execute replace(def, anchor, addition || anchor);
end;
$patch$;

-- Cabana's own opening slides, so the Spotlight is never empty and
-- never has to invent a tour. The console can edit or end them.
-- Words wrapped in *stars* are set in the italic accent on the page.
insert into public.tour_spotlights (kind, status, media_kind, art, kicker, headline, subline, cta_label, cta_url, accent,
                                    starts_at, ends_at, priority)
select * from (values
  ('house', 'approved', 'world', 'world', 'Cabana Immersive · VR and 360°', 'Step into the wild *before you book*',
   'Step inside safaris, reefs and cities in 360°. Move your phone, slot it into a viewer, or put on a headset.',
   'Step inside', '#immersive', '#7C5CFF', now(), now() + interval '10 years', 30),
  ('house', 'approved', 'art', 'guides', 'The people who take you there', 'Guides who live *where they walk*',
   'Message a guide before you book. Every conversation stays on Cabana, and their number unlocks the moment you pay.',
   'Meet the guides', '/tour-guides', '#12E0D0', now(), now() + interval '10 years', 20),
  ('house', 'approved', 'art', 'featured', 'For guides and operators', 'This could be *your tour*',
   'Put a departure, a film or your whole company in the Spotlight: the first thing every traveller on Cabana Tours sees.',
   'Get featured', '/tours-studio?tab=spotlight', '#FFB020', now(), now() + interval '10 years', 10)
) v(kind, status, media_kind, art, kicker, headline, subline, cta_label, cta_url, accent, starts_at, ends_at, priority)
where not exists (select 1 from public.tour_spotlights where kind = 'house');

notify pgrst, 'reload schema';
