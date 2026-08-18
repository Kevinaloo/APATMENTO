-- Cabana: SECURITY DEFINER functions bypass RLS and PostgreSQL grants new
-- functions to PUBLIC by default. Remove that inherited RPC surface from
-- user-only and internal functions while preserving the deliberately public
-- ride, referral and advertising counters used by signed-out visitors.

-- Authenticated user operations. Each function either binds work to
-- auth.uid() or is called from an authenticated booking/agent flow.
revoke all on function public.active_yellow_count(uuid) from public, anon, authenticated;
grant execute on function public.active_yellow_count(uuid) to authenticated, service_role;

revoke all on function public.agent_can_earn(uuid) from public, anon, authenticated;
grant execute on function public.agent_can_earn(uuid) to authenticated, service_role;

revoke all on function public.agent_listing_availability(text,date,date) from public, anon, authenticated;
grant execute on function public.agent_listing_availability(text,date,date) to authenticated, service_role;

revoke all on function public.agent_request_partnership(text,numeric,text) from public, anon, authenticated;
grant execute on function public.agent_request_partnership(text,numeric,text) to authenticated, service_role;

revoke all on function public.agent_signup(text,text,text,text,boolean,text,text,integer) from public, anon, authenticated;
grant execute on function public.agent_signup(text,text,text,text,boolean,text,text,integer) to authenticated, service_role;

revoke all on function public.host_report_agent(uuid,text,text,bigint) from public, anon, authenticated;
grant execute on function public.host_report_agent(uuid,text,text,bigint) to authenticated, service_role;

revoke all on function public.host_respond_partnership(bigint,text,numeric,numeric,text) from public, anon, authenticated;
grant execute on function public.host_respond_partnership(bigint,text,numeric,numeric,text) to authenticated, service_role;

revoke all on function public.host_set_partnership_state(bigint,text) from public, anon, authenticated;
grant execute on function public.host_set_partnership_state(bigint,text) to authenticated, service_role;

revoke all on function public.checkin_eligible(uuid) from public, anon, authenticated;
grant execute on function public.checkin_eligible(uuid) to authenticated, service_role;

revoke all on function public.find_match_candidates(uuid,integer) from public, anon, authenticated;
grant execute on function public.find_match_candidates(uuid,integer) to authenticated, service_role;

revoke all on function public.match_allowed(uuid) from public, anon, authenticated;
grant execute on function public.match_allowed(uuid) to authenticated, service_role;

revoke all on function public.try_reveal_reviews(uuid) from public, anon, authenticated;
grant execute on function public.try_reveal_reviews(uuid) to authenticated, service_role;

-- Internal settlement, maintenance, scoring and trigger functions. Vercel
-- server routes and scheduled jobs use service_role; browsers never do.
revoke all on function public.hours_to_checkin(uuid) from public, anon, authenticated;
grant execute on function public.hours_to_checkin(uuid) to service_role;

revoke all on function public.cleanup_expired_otps() from public, anon, authenticated;
grant execute on function public.cleanup_expired_otps() to service_role;

revoke all on function public.compute_settlement(uuid,text,numeric) from public, anon, authenticated;
grant execute on function public.compute_settlement(uuid,text,numeric) to service_role;

revoke all on function public.compute_user_enrichment(uuid) from public, anon, authenticated;
grant execute on function public.compute_user_enrichment(uuid) to service_role;

revoke all on function public.dispatch_rescue_ride(uuid,uuid,uuid,text,numeric,numeric,text,numeric,numeric,numeric,numeric,boolean) from public, anon, authenticated;
grant execute on function public.dispatch_rescue_ride(uuid,uuid,uuid,text,numeric,numeric,text,numeric,numeric,numeric,numeric,boolean) to service_role;

revoke all on function public.expire_cabana_requests() from public, anon, authenticated;
grant execute on function public.expire_cabana_requests() to service_role;

revoke all on function public.float_balance() from public, anon, authenticated;
grant execute on function public.float_balance() to service_role;

revoke all on function public.issue_yellow_card(uuid,text,uuid,uuid,text) from public, anon, authenticated;
grant execute on function public.issue_yellow_card(uuid,text,uuid,uuid,text) to service_role;

revoke all on function public.prune_signal_events() from public, anon, authenticated;
grant execute on function public.prune_signal_events() to service_role;

revoke all on function public.purge_expired_listing_drafts() from public, anon, authenticated;
grant execute on function public.purge_expired_listing_drafts() to service_role;

revoke all on function public.recompute_internal_score(text) from public, anon, authenticated;
grant execute on function public.recompute_internal_score(text) to service_role;

revoke all on function public.refresh_segment_memberships() from public, anon, authenticated;
grant execute on function public.refresh_segment_memberships() to service_role;

revoke all on function public.reveal_stale_reviews() from public, anon, authenticated;
grant execute on function public.reveal_stale_reviews() to service_role;

revoke all on function public.rls_auto_enable() from public, anon, authenticated;
grant execute on function public.rls_auto_enable() to service_role;

revoke all on function public.roll_programme_event() from public, anon, authenticated;
grant execute on function public.roll_programme_event() to service_role;

revoke all on function public.trg_review_score() from public, anon, authenticated;
grant execute on function public.trg_review_score() to service_role;

revoke all on function public.update_listing_score() from public, anon, authenticated;
grant execute on function public.update_listing_score() to service_role;
