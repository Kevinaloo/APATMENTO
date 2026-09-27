-- The /events home page, arranged from the console.
--
-- home_sections holds { "order": [...], "hidden": [...] }: which sections
-- the home page shows and in what order (events, the billboard's
-- neighbours, the music rows, films...). The page falls back to its own
-- order for any key it does not find, so an empty object is the default
-- layout and an unknown key is ignored rather than breaking the page.
-- live_state() hands it to the page with the rest of the offer.

alter table public.live_settings
  add column if not exists home_sections jsonb not null default '{}'::jsonb;

alter table public.live_settings drop constraint if exists live_settings_home_sections_ck;
alter table public.live_settings add constraint live_settings_home_sections_ck
  check (jsonb_typeof(home_sections) = 'object' and pg_column_size(home_sections) < 4096);

create or replace function public.live_state()
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  st public.live_settings%rowtype;
  v_uid uuid := auth.uid();
  v_exp timestamptz;
  v_src text;
  v_has boolean := false;
  v_trial_used boolean := false;
begin
  select * into st from public.live_settings where id = 1;
  if v_uid is not null then
    select p.expires_at, p.source into v_exp, v_src
      from public.live_passes p
     where p.user_id = v_uid and p.revoked_at is null and p.starts_at <= now()
       and (p.expires_at is null or p.expires_at > now())
     order by p.expires_at desc nulls first
     limit 1;
    v_has := found;
    v_trial_used := exists (select 1 from public.live_passes p where p.user_id = v_uid and p.source = 'trial');
  end if;

  return jsonb_build_object(
    'signed_in', v_uid is not null,
    'premium', v_has or coalesce(st.open_to_all, false) or public.is_admin(),
    'open_to_all', coalesce(st.open_to_all, false),
    'has_pass', v_has,
    'pass_expires_at', v_exp,
    'pass_source', v_src,
    'trial_enabled', coalesce(st.trial_enabled, true),
    'trial_days', coalesce(st.trial_days, 30),
    'trial_used', v_trial_used,
    'price_kes', st.price_kes,
    'price_period', coalesce(st.price_period, 'month'),
    'premium_name', coalesce(st.premium_name, 'Cabana Live Premium'),
    'banner_title', coalesce(st.banner_title, 'Enjoy one month free access'),
    'banner_text', coalesce(st.banner_text, ''),
    'home', coalesce(st.home_sections, '{}'::jsonb),
    'server_time', now()
  );
end;
$$;
