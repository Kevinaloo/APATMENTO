-- Cabana: close analytics views that inherited owner privileges and
-- default ALL grants. Authenticated operators keep read access through
-- underlying RLS; anonymous visitors receive no view privileges.

do $$
declare v text;
begin
  foreach v in array array[
    'live_visitors', 'v_ad_performance', 'v_daily_intent',
    'v_partner_health', 'v_segment_summary',
    'v_advertiser_audiences', 'v_user_360'
  ] loop
    execute format('alter view public.%I set (security_invoker = true)', v);
    execute format('revoke all on public.%I from public, anon, authenticated', v);
    execute format('grant select on public.%I to authenticated, service_role', v);
  end loop;
end
$$;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public'
                 and tablename='audience_memberships' and policyname='operator_read_memberships') then
    create policy operator_read_memberships on public.audience_memberships
      for select to authenticated using (public.is_operator());
  end if;
  if not exists (select 1 from pg_policies where schemaname='public'
                 and tablename='user_profiles_enriched' and policyname='operator_read_enriched_profiles') then
    create policy operator_read_enriched_profiles on public.user_profiles_enriched
      for select to authenticated using (public.is_operator());
  end if;
  if not exists (select 1 from pg_policies where schemaname='public'
                 and tablename='visitor_identity_graph' and policyname='operator_read_identity_graph') then
    create policy operator_read_identity_graph on public.visitor_identity_graph
      for select to authenticated using (public.is_operator());
  end if;
end
$$;

-- Pin every advisor-flagged public function to trusted schemas. The
-- extensions schema is included for pgcrypto/PostGIS helpers.
alter function public.can_publish(uuid, text) set search_path = pg_catalog, public, extensions;
alter function public.cleanup_expired_otps() set search_path = pg_catalog, public, extensions;
alter function public.compute_user_enrichment(uuid) set search_path = pg_catalog, public, extensions;
alter function public.events_before_write() set search_path = pg_catalog, public, extensions;
alter function public.events_set_slug() set search_path = pg_catalog, public, extensions;
alter function public.expire_cabana_requests() set search_path = pg_catalog, public, extensions;
alter function public.increment_ad_click(text) set search_path = pg_catalog, public, extensions;
alter function public.increment_ad_impression(text) set search_path = pg_catalog, public, extensions;
alter function public.increment_ad_stat(uuid, text) set search_path = pg_catalog, public, extensions;
alter function public.increment_shadow_click(bigint) set search_path = pg_catalog, public, extensions;
alter function public.increment_shadow_dismiss(bigint) set search_path = pg_catalog, public, extensions;
alter function public.increment_shadow_impression(bigint) set search_path = pg_catalog, public, extensions;
alter function public.is_admin() set search_path = pg_catalog, public, extensions;
alter function public.listings_derive_service() set search_path = pg_catalog, public, extensions;
alter function public.refresh_segment_memberships() set search_path = pg_catalog, public, extensions;
alter function public.required_tier(text) set search_path = pg_catalog, public, extensions;
alter function public.sync_cleared_tier() set search_path = pg_catalog, public, extensions;
alter function public.sync_listing_latlong() set search_path = pg_catalog, public, extensions;
alter function public.touch_listing_draft() set search_path = pg_catalog, public, extensions;
alter function public.touch_updated_at() set search_path = pg_catalog, public, extensions;
alter function public.tours_set_slug() set search_path = pg_catalog, public, extensions;
alter function public.tours_stamp_published() set search_path = pg_catalog, public, extensions;
alter function public.update_lazy_updated_at() set search_path = pg_catalog, public, extensions;
alter function public.update_listing_score() set search_path = pg_catalog, public, extensions;

-- These definitions are byte-for-byte duplicates. Keep the canonical
-- names and remove only redundant maintenance/write amplification.
drop index if exists public.idx_listings_partner_id;
drop index if exists public.idx_lst_partner;
drop index if exists public.listings_partner_idx;
drop index if exists public.listings_service_active_idx;
