-- ═══════════════════════════════════════════════════════════════════
--  CABANA ADS v2 · one system, one truth
--  ─────────────────────────────────────────────────────────────────
--  What was broken, and what this migration does about each:
--
--  1. The console wrote `sub_text`, the site read `sub`. Supporting
--     lines saved in the console never reached a page. A trigger now
--     keeps both columns identical whichever one a writer uses.
--
--  2. `status` and `active` drifted. The console flipped status, older
--     code flipped active, the public read policy only looks at active.
--     `status` is now the single switch; `active` is derived from it,
--     and a legacy write to `active` alone is translated into a status.
--
--  3. The format check refused 'ticker' and had no 'poster', so the
--     dashboard welcome poster had nowhere to live. Both are allowed.
--
--  4. Shadow ad counters ran as the anonymous caller, which RLS stops,
--     so every secret ad showed 0 impressions forever. They now run as
--     definer. The console and the assistant also read `areas`,
--     `apa_enabled` and `apa_message`, which did not exist: every save
--     from the console failed and the assistant never saw an ad.
--
--  5. Nothing told an operator that a slot had quietly disappeared in a
--     page redesign. Pages now report every slot they mount (or fail
--     to) into ad_slot_health, and the console shows it live.
--
--  6. Per-campaign statistics in the console were keyed on a value the
--     site never sent, so every card read 0 views. Every served,
--     viewable, click, skip and dismiss is now written to ad_events
--     through one RPC that also keeps the counters.
-- ═══════════════════════════════════════════════════════════════════

-- ── 1 · CAMPAIGNS ───────────────────────────────────────────────────
alter table public.ad_campaigns
  add column if not exists slots        text[]  not null default '{}',
  add column if not exists media_kind   text,
  add column if not exists frequency    text,
  add column if not exists skip_after_s integer,
  add column if not exists duration_s   integer,
  add column if not exists viewables    bigint  not null default 0,
  add column if not exists notes        text;

alter table public.ad_campaigns drop constraint if exists ad_campaigns_format_check;
alter table public.ad_campaigns add constraint ad_campaigns_format_check
  check (format = any (array['window','video','carousel','split','native','ticker','sticky','poster']));

alter table public.ad_campaigns drop constraint if exists ad_campaigns_status_check;
alter table public.ad_campaigns add constraint ad_campaigns_status_check
  check (status = any (array['live','paused','draft']));

alter table public.ad_campaigns drop constraint if exists ad_campaigns_frequency_check;
alter table public.ad_campaigns add constraint ad_campaigns_frequency_check
  check (frequency is null or frequency = any (array['once','daily','session','always']));

create or replace function public.ad_campaigns_normalize()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  -- Counters moving is not an edit: leave the row (and updated_at) alone.
  if tg_op = 'UPDATE' and coalesce(current_setting('cabana.ads_renormalize', true), '') <> 'on' and
     (to_jsonb(new) - array['impressions','clicks','viewables','impression_count','click_count','updated_at'])
   = (to_jsonb(old) - array['impressions','clicks','viewables','impression_count','click_count','updated_at']) then
    return new;
  end if;

  -- A legacy writer that only flipped `active` still means something.
  if tg_op = 'UPDATE'
     and new.active is distinct from old.active
     and new.status is not distinct from old.status then
    new.status := case when new.active then 'live' else 'paused' end;
  end if;

  new.status := lower(coalesce(nullif(trim(new.status), ''), 'live'));
  if new.status not in ('live','paused','draft') then new.status := 'paused'; end if;
  new.active := (new.status = 'live');

  -- One supporting line, whichever column the writer used.
  if tg_op = 'UPDATE' and new.sub is distinct from old.sub
     and new.sub_text is not distinct from old.sub_text then
    new.sub_text := new.sub;
  end if;
  new.sub_text := nullif(trim(coalesce(new.sub_text, new.sub, '')), '');
  new.sub      := new.sub_text;

  new.advertiser := nullif(trim(coalesce(new.advertiser, '')), '');
  new.headline   := nullif(trim(coalesce(new.headline, '')), '');
  new.media_url  := nullif(trim(coalesce(new.media_url, '')), '');
  new.poster_url := nullif(trim(coalesce(new.poster_url, '')), '');
  new.cta_url    := coalesce(nullif(trim(coalesce(new.cta_url, '')), ''), '#');

  new.media_kind := case
    when new.media_url is null then null
    when new.media_url ~* '\.(mp4|webm|mov|m4v|ogv|ogg)(\?|#|$)' then 'video'
    when new.media_url ~* '(youtube\.com|youtu\.be)' then 'video'
    else 'image' end;

  new.priority := greatest(0, least(10, coalesce(new.priority, 5)));
  if new.page_targets is null or cardinality(new.page_targets) = 0 then
    new.page_targets := array['all'];
  end if;
  new.slots := coalesce(new.slots, '{}');

  if new.format = 'poster' then
    new.frequency    := coalesce(new.frequency, 'daily');
    new.skip_after_s := greatest(0, least(30, coalesce(new.skip_after_s, 3)));
    new.duration_s   := greatest(3, least(60, coalesce(new.duration_s, 8)));
    new.page_targets := array['dashboard'];
  end if;

  if new.end_date is not null and new.start_date is not null and new.end_date < new.start_date then
    raise exception 'The end date is before the start date' using errcode = '22023';
  end if;

  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists ad_campaigns_normalize on public.ad_campaigns;
create trigger ad_campaigns_normalize
  before insert or update on public.ad_campaigns
  for each row execute function public.ad_campaigns_normalize();

-- Bring every existing row through the same rules once.
select set_config('cabana.ads_renormalize', 'on', true);
update public.ad_campaigns set updated_at = updated_at;

-- ── 2 · SECRET (SHADOW) ADS ─────────────────────────────────────────
alter table public.shadow_ads
  add column if not exists areas       jsonb   not null default '["all"]'::jsonb,
  add column if not exists apa_enabled boolean not null default false,
  add column if not exists apa_message text,
  add column if not exists style       text    not null default 'glass',
  add column if not exists views       bigint  not null default 0;

create or replace function public.shadow_ads_normalize()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if tg_op = 'UPDATE' and coalesce(current_setting('cabana.ads_renormalize', true), '') <> 'on' and
     (to_jsonb(new) - array['impressions','clicks','dismissals','views','spend','updated_at'])
   = (to_jsonb(old) - array['impressions','clicks','dismissals','views','spend','updated_at']) then
    return new;
  end if;
  if tg_op = 'UPDATE'
     and new.active is distinct from old.active
     and new.status is not distinct from old.status then
    new.status := case when new.active then 'live' else 'paused' end;
  end if;
  new.status := lower(coalesce(nullif(trim(new.status), ''), 'live'));
  if new.status not in ('live','paused','draft') then new.status := 'paused'; end if;
  new.active := (new.status = 'live');

  new.media_url := nullif(trim(coalesce(new.media_url, '')), '');
  if new.media_url is not null then
    new.media_type := case when new.media_url ~* '\.(mp4|webm|mov|m4v|ogv)(\?|#|$)' then 'video' else 'image' end;
  end if;
  if new.surfaces is null or jsonb_typeof(new.surfaces) <> 'array' or jsonb_array_length(new.surfaces) = 0 then
    new.surfaces := '["all"]'::jsonb;
  end if;
  if new.areas is null or jsonb_typeof(new.areas) <> 'array' or jsonb_array_length(new.areas) = 0 then
    new.areas := '["all"]'::jsonb;
  end if;
  new.position := coalesce(nullif(new.position, ''), 'auto');
  if new.position not in ('auto','rise','side','bottom','top') then new.position := 'auto'; end if;
  new.style := coalesce(nullif(new.style, ''), 'glass');
  if new.style not in ('glass','photo','minimal') then new.style := 'glass'; end if;
  new.priority        := greatest(1, least(10, coalesce(new.priority, 5)));
  new.intent_min      := greatest(0, least(100, coalesce(new.intent_min, 0)));
  new.intent_max      := greatest(new.intent_min, least(100, coalesce(new.intent_max, 100)));
  new.max_per_session := greatest(1, least(10, coalesce(new.max_per_session, 1)));
  new.cooldown_s      := greatest(20, coalesce(new.cooldown_s, 90));
  new.dwell_show_s    := greatest(4, least(30, coalesce(new.dwell_show_s, 8)));
  new.min_dwell_s     := greatest(0, coalesce(new.min_dwell_s, 6));
  new.min_scroll_pct  := greatest(0, least(100, coalesce(new.min_scroll_pct, 0)));
  if new.end_date is not null and new.start_date is not null and new.end_date < new.start_date then
    raise exception 'The end date is before the start date' using errcode = '22023';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists shadow_ads_normalize on public.shadow_ads;
create trigger shadow_ads_normalize
  before insert or update on public.shadow_ads
  for each row execute function public.shadow_ads_normalize();

update public.shadow_ads set updated_at = updated_at;
select set_config('cabana.ads_renormalize', 'off', true);

-- Counters run as definer: the anonymous visitor cannot update the row.
create or replace function public.increment_shadow_impression(p_ad_id bigint)
returns void language sql security definer set search_path = pg_catalog, public
as $$ update public.shadow_ads set impressions = impressions + 1 where id = p_ad_id and active; $$;

create or replace function public.increment_shadow_click(p_ad_id bigint)
returns void language sql security definer set search_path = pg_catalog, public
as $$ update public.shadow_ads set clicks = clicks + 1 where id = p_ad_id and active; $$;

create or replace function public.increment_shadow_dismiss(p_ad_id bigint)
returns void language sql security definer set search_path = pg_catalog, public
as $$ update public.shadow_ads set dismissals = dismissals + 1 where id = p_ad_id and active; $$;

grant execute on function public.increment_shadow_impression(bigint) to anon, authenticated;
grant execute on function public.increment_shadow_click(bigint)      to anon, authenticated;
grant execute on function public.increment_shadow_dismiss(bigint)    to anon, authenticated;

create index if not exists idx_shadow_ev_ad_created on public.shadow_ad_events (ad_id, created_at desc);

-- ── 3 · EVENTS ──────────────────────────────────────────────────────
-- ad_events pointed at a table that no longer drives anything.
alter table public.ad_events drop constraint if exists ad_events_campaign_id_fkey;
alter table public.ad_events add constraint ad_events_campaign_id_fkey
  foreign key (campaign_id) references public.ad_campaigns(id) on delete set null;
create index if not exists idx_ae_campaign_created on public.ad_events (campaign_id, created_at desc);
create index if not exists idx_ae_slot_created     on public.ad_events (inventory_id, created_at desc);
revoke all on table public.ad_events from anon;
revoke insert, update, delete, truncate, references, trigger on table public.ad_events from authenticated;

create or replace function public.ad_track(
  p_campaign text, p_event text, p_page text default null, p_slot text default null,
  p_visitor text default null, p_device text default null)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_id uuid;
begin
  if p_event is null or p_event not in ('impression','viewable','click','skip','dismiss','complete') then return; end if;
  if p_campaign is null or length(p_campaign) > 80 then return; end if;

  select id into v_id from public.ad_campaigns
   where (id::text = p_campaign or campaign_id = p_campaign)
   limit 1;
  if v_id is null then return; end if;   -- house creatives are not billed

  insert into public.ad_events (campaign_id, inventory_id, visitor_id, event_type, device, page)
  values (v_id, left(p_slot, 64), left(p_visitor, 64), p_event, left(p_device, 16), left(p_page, 48));

  if p_event = 'impression' then
    update public.ad_campaigns set impressions = impressions + 1 where id = v_id;
  elsif p_event = 'viewable' then
    update public.ad_campaigns set viewables = viewables + 1 where id = v_id;
  elsif p_event = 'click' then
    update public.ad_campaigns set clicks = clicks + 1 where id = v_id;
  end if;
end;
$$;
revoke all on function public.ad_track(text,text,text,text,text,text) from public;
grant execute on function public.ad_track(text,text,text,text,text,text) to anon, authenticated;

-- The dashboard hero still calls these; they now land in the same log.
create or replace function public.increment_ad_impression(p_campaign_id text)
returns void language sql security definer set search_path = pg_catalog, public
as $$ select public.ad_track(p_campaign_id, 'impression', 'dashboard', 'dashboard.hero', null, null); $$;

create or replace function public.increment_ad_click(p_campaign_id text)
returns void language sql security definer set search_path = pg_catalog, public
as $$ select public.ad_track(p_campaign_id, 'click', 'dashboard', 'dashboard.hero', null, null); $$;

-- ── 4 · SETTINGS (the rules the console edits) ──────────────────────
create table if not exists public.ad_settings (
  id          integer primary key default 1 check (id = 1),
  settings    jsonb   not null default '{}'::jsonb,
  updated_at  timestamptz not null default now(),
  updated_by  text
);
insert into public.ad_settings (id, settings) values (1, jsonb_build_object(
  'enabled', true,
  'house_ads', true,
  'max_units', 3,
  'min_gap', 900,
  'fold_guard', true,
  'infeed', jsonb_build_object('first', 6, 'every', 12, 'max', 2),
  'sticky', jsonb_build_object('enabled', true, 'delay_s', 20),
  'shadow', jsonb_build_object('enabled', true),
  'poster', jsonb_build_object('enabled', true),
  'disabled_slots', '[]'::jsonb
)) on conflict (id) do nothing;

alter table public.ad_settings enable row level security;
drop policy if exists ad_settings_read on public.ad_settings;
create policy ad_settings_read on public.ad_settings for select to anon, authenticated using (true);
revoke insert, update, delete on public.ad_settings from anon, authenticated;
grant select on public.ad_settings to anon, authenticated;

-- ── 5 · SLOT HEALTH (pages report what they really mounted) ─────────
create table if not exists public.ad_slot_health (
  page          text not null,
  slot          text not null,
  format        text,
  state         text not null,
  campaign_id   text,
  detail        text,
  hits          bigint not null default 1,
  first_seen    timestamptz not null default now(),
  last_seen     timestamptz not null default now(),
  last_live_at  timestamptz,
  primary key (page, slot)
);
alter table public.ad_slot_health enable row level security;
revoke all on public.ad_slot_health from anon, authenticated;

create or replace function public.ad_heartbeat(p_page text, p_reports jsonb)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  r jsonb;
  n integer := 0;
  v_state text;
begin
  if p_page is null or p_page !~ '^[a-z0-9_-]{1,40}$' then return; end if;
  if p_reports is null or jsonb_typeof(p_reports) <> 'array' then return; end if;
  for r in select * from jsonb_array_elements(p_reports) loop
    n := n + 1;
    exit when n > 24;
    continue when coalesce(r->>'slot', '') !~ '^[a-z0-9_.:-]{1,64}$';
    v_state := coalesce(r->>'state', 'unknown');
    continue when v_state not in ('live','house','empty','missing','blocked','deferred','error','off');
    insert into public.ad_slot_health as h (page, slot, format, state, campaign_id, detail, last_live_at)
    values (p_page, r->>'slot', left(r->>'format', 20), v_state, left(r->>'campaign', 80), left(r->>'detail', 240),
            case when v_state in ('live','house') then now() end)
    on conflict (page, slot) do update set
      format       = excluded.format,
      state        = excluded.state,
      campaign_id  = excluded.campaign_id,
      detail       = excluded.detail,
      hits         = h.hits + 1,
      last_seen    = now(),
      last_live_at = coalesce(excluded.last_live_at, h.last_live_at);
  end loop;
end;
$$;
revoke all on function public.ad_heartbeat(text, jsonb) from public;
grant execute on function public.ad_heartbeat(text, jsonb) to anon, authenticated;

-- ── 6 · ONE READ FOR A PAGE ─────────────────────────────────────────
-- Everything a page needs in one request, with the date and targeting
-- rules decided here once rather than re-implemented in every script.
create or replace function public.ads_bundle(p_page text)
returns jsonb
language sql
stable
security invoker
set search_path = pg_catalog, public
as $$
  with today as (select (now() at time zone 'Africa/Nairobi')::date d),
  camps as (
    select c.id, c.campaign_id, c.advertiser, c.format, c.headline, c.sub_text, c.cta_text, c.cta_url, c.tag,
           c.price_display, c.media_url, c.poster_url, c.media_kind, c.theme_gradient, c.accent_color, c.icon_svg,
           c.priority, c.slots, c.page_targets, c.frequency, c.skip_after_s, c.duration_s, c.updated_at
      from public.ad_campaigns c, today t
     where c.status = 'live' and c.active
       and (c.start_date is null or c.start_date <= t.d)
       and (c.end_date   is null or c.end_date   >= t.d)
       and (c.page_targets && array['all', p_page]
            or exists (select 1 from unnest(c.slots) s where s like p_page || '.%'))
       and (c.format <> 'poster' or p_page = 'dashboard')
  ),
  shadows as (
    select s.id, s.advertiser, s.headline, s.sub_text, s.cta_text, s.cta_url, s.media_type, s.media_url, s.poster_url,
           s.theme_gradient, s.accent, s.surfaces, s.position, s.device, s.intent_min, s.intent_max, s.min_dwell_s,
           s.min_scroll_pct, s.reading_modes, s.keywords, s.areas, s.max_per_session, s.cooldown_s, s.dwell_show_s,
           s.priority, s.style, s.updated_at
      from public.shadow_ads s, today t
     where s.status = 'live' and s.active
       and (s.start_date is null or s.start_date <= t.d)
       and (s.end_date   is null or s.end_date   >= t.d)
       and (s.surfaces ? 'all' or s.surfaces ? p_page)
  )
  select jsonb_build_object(
    'page', p_page,
    'at', now(),
    'settings', coalesce((select settings from public.ad_settings where id = 1), '{}'::jsonb),
    'campaigns', coalesce((select jsonb_agg(to_jsonb(c) order by c.priority desc, c.updated_at desc) from camps c), '[]'::jsonb),
    'shadow', coalesce((select jsonb_agg(to_jsonb(s) order by s.priority desc) from shadows s), '[]'::jsonb)
  );
$$;
revoke all on function public.ads_bundle(text) from public;
grant execute on function public.ads_bundle(text) to anon, authenticated;

-- ── 7 · CONSOLE ─────────────────────────────────────────────────────
create or replace function public.admin_ads_overview(p_days integer default 30)
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  v_since timestamptz := now() - make_interval(days => greatest(1, least(180, coalesce(p_days, 30))));
  v jsonb;
begin
  perform cabana_admin.guard();
  with ev as (
    select campaign_id, inventory_id, event_type, created_at from public.ad_events where created_at >= v_since
  ),
  per_camp as (
    select campaign_id,
           count(*) filter (where event_type = 'impression') served,
           count(*) filter (where event_type = 'viewable')   viewable,
           count(*) filter (where event_type = 'click')      clicks,
           count(*) filter (where event_type = 'skip')       skips,
           count(*) filter (where event_type = 'complete')   completes,
           max(created_at) last_event
      from ev group by campaign_id
  ),
  per_slot as (
    select inventory_id slot,
           count(*) filter (where event_type = 'impression') served,
           count(*) filter (where event_type = 'viewable')   viewable,
           count(*) filter (where event_type = 'click')      clicks
      from ev where inventory_id is not null group by inventory_id
  ),
  daily as (
    select (created_at at time zone 'Africa/Nairobi')::date d,
           count(*) filter (where event_type = 'impression') served,
           count(*) filter (where event_type = 'viewable')   viewable,
           count(*) filter (where event_type = 'click')      clicks
      from ev group by 1
  ),
  sh_ev as (
    select ad_id,
           count(*) filter (where event = 'viewable') viewable,
           count(*) filter (where event = 'click')    clicks,
           count(*) filter (where event = 'dismiss')  dismissals,
           count(*) filter (where event = 'ignore')   ignored
      from public.shadow_ad_events where created_at >= v_since group by ad_id
  )
  select jsonb_build_object(
    'days', p_days,
    'settings', coalesce((select settings from public.ad_settings where id = 1), '{}'::jsonb),
    'settings_at', (select updated_at from public.ad_settings where id = 1),
    'campaigns', coalesce((select jsonb_agg(to_jsonb(c) || jsonb_build_object(
        'stats', jsonb_build_object('served', coalesce(p.served,0), 'viewable', coalesce(p.viewable,0),
                                    'clicks', coalesce(p.clicks,0), 'skips', coalesce(p.skips,0),
                                    'completes', coalesce(p.completes,0), 'last_event', p.last_event))
      order by c.created_at desc)
      from public.ad_campaigns c left join per_camp p on p.campaign_id = c.id), '[]'::jsonb),
    'shadow', coalesce((select jsonb_agg(to_jsonb(s) || jsonb_build_object(
        'stats', jsonb_build_object('viewable', coalesce(e.viewable,0), 'clicks', coalesce(e.clicks,0),
                                    'dismissals', coalesce(e.dismissals,0), 'ignored', coalesce(e.ignored,0)))
      order by s.created_at desc)
      from public.shadow_ads s left join sh_ev e on e.ad_id = s.id), '[]'::jsonb),
    'slots', coalesce((select jsonb_agg(jsonb_build_object('slot', slot, 'served', served, 'viewable', viewable, 'clicks', clicks)) from per_slot), '[]'::jsonb),
    'health', coalesce((select jsonb_agg(to_jsonb(h) order by h.page, h.slot) from public.ad_slot_health h), '[]'::jsonb),
    'daily', coalesce((select jsonb_agg(jsonb_build_object('d', d, 'served', served, 'viewable', viewable, 'clicks', clicks) order by d) from daily), '[]'::jsonb)
  ) into v;
  return v;
end;
$$;

create or replace function public.admin_ads_settings_save(p_settings jsonb)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v jsonb;
begin
  perform cabana_admin.guard();
  if p_settings is null or jsonb_typeof(p_settings) <> 'object' then
    raise exception 'Settings must be an object' using errcode = '22023';
  end if;
  update public.ad_settings
     set settings   = settings || p_settings,
         updated_at = now(),
         updated_by = lower(coalesce(auth.jwt() ->> 'email', ''))
   where id = 1
  returning settings into v;
  perform cabana_admin.log('ads.settings', 'ad_settings', '1', p_settings);
  return v;
end;
$$;

create or replace function public.admin_ad_preview(p_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  v jsonb;
begin
  perform cabana_admin.guard();
  select to_jsonb(c) into v from public.ad_campaigns c where c.id = p_id;
  return v;
end;
$$;

create or replace function public.admin_ads_health_clear(p_page text, p_slot text)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  perform cabana_admin.guard();
  delete from public.ad_slot_health where page = p_page and (p_slot is null or slot = p_slot);
  perform cabana_admin.log('ads.health_clear', 'ad_slot', coalesce(p_page,'') || ':' || coalesce(p_slot,'*'), '{}'::jsonb);
  return jsonb_build_object('ok', true);
end;
$$;

do $$
declare f text;
begin
  foreach f in array array[
    'public.admin_ads_overview(integer)',
    'public.admin_ads_settings_save(jsonb)',
    'public.admin_ad_preview(uuid)',
    'public.admin_ads_health_clear(text,text)'
  ] loop
    execute format('revoke all on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end $$;

-- ── 8 · STORAGE ─────────────────────────────────────────────────────
update storage.buckets
   set allowed_mime_types = array['image/jpeg','image/jpg','image/png','image/webp','image/avif','image/gif',
                                  'video/mp4','video/webm','video/quicktime'],
       file_size_limit    = 209715200
 where id = 'ads-media';

-- ── 9 · HOUSEKEEPING ────────────────────────────────────────────────
do $$
begin
  perform cron.unschedule(jobid) from cron.job where jobname = 'cabana-ad-events-prune';
  perform cron.schedule('cabana-ad-events-prune', '17 3 * * *',
    $q$delete from public.ad_events where created_at < now() - interval '400 days';
       delete from public.shadow_ad_events where created_at < now() - interval '400 days';
       delete from public.ad_slot_health where last_seen < now() - interval '60 days'$q$);
exception when others then
  raise notice 'pg_cron unavailable, ad event pruning not scheduled: %', sqlerrm;
end $$;
