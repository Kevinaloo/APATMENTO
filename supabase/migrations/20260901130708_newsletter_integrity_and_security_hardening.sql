-- Cabana cleanup release: newsletter integrity and high-risk database hardening.

create table if not exists public.newsletter_subscribers (
  id bigint generated always as identity primary key,
  email text not null unique
    check (char_length(email) between 5 and 254 and email = lower(email)),
  source text not null default 'footer'
    check (char_length(source) between 1 and 80),
  subscribed_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unsubscribed_at timestamptz
);

comment on table public.newsletter_subscribers is
  'Consent-backed Cabana travel newsletter subscriptions. Writes are server-only.';
comment on column public.newsletter_subscribers.source is
  'Sanitised product surface that collected consent; never an arbitrary URL.';

alter table public.newsletter_subscribers enable row level security;
revoke all privileges on table public.newsletter_subscribers from public, anon, authenticated;
grant select, insert, update, delete on table public.newsletter_subscribers to service_role;
revoke all privileges on sequence public.newsletter_subscribers_id_seq from public, anon, authenticated;
grant usage, select on sequence public.newsletter_subscribers_id_seq to service_role;

-- These views previously ran with their owner's rights and bypassed the RLS
-- policies on agents, partnerships, listings, referrals, and profiles.
alter view public.v_agent_portfolio set (security_invoker = true);
alter view public.v_host_agents set (security_invoker = true);
revoke all privileges on table public.v_agent_portfolio from public, anon, authenticated;
revoke all privileges on table public.v_host_agents from public, anon, authenticated;
grant select on table public.v_agent_portfolio to authenticated, service_role;
grant select on table public.v_host_agents to authenticated, service_role;

-- Resolve every mutable-search-path warning reported by the security advisor.
alter function public.fd_touch() set search_path = pg_catalog, public, extensions;
alter function public.cabana_tour_due_at(date, integer) set search_path = pg_catalog, public, extensions;
alter function public.cabana_event_due_at(timestamptz, integer) set search_path = pg_catalog, public, extensions;
alter function public.referral_rate(text, text) set search_path = pg_catalog, public, extensions;
alter function public.normalise_contact(text, text) set search_path = pg_catalog, public, extensions;
alter function public.agent_days_left(public.agents) set search_path = pg_catalog, public, extensions;
alter function public.agent_status(public.agents) set search_path = pg_catalog, public, extensions;
alter function public.expire_agent_referrals() set search_path = pg_catalog, public, extensions;
alter function public.touch_updated_at() set search_path = pg_catalog, public, extensions;
alter function public.listings_food_has_no_nightly_rate() set search_path = pg_catalog, public, extensions;
alter function public.update_wb_updated_at() set search_path = pg_catalog, public, extensions;
alter function public.add_user_points(uuid, integer, boolean) set search_path = pg_catalog, public, extensions;

-- Trigger and internal risk functions are not browser-facing RPC endpoints.
revoke execute on function public.fd_touch() from public, anon, authenticated;
revoke execute on function public.touch_updated_at() from public, anon, authenticated;
revoke execute on function public.listings_food_has_no_nightly_rate() from public, anon, authenticated;
revoke execute on function public.update_wb_updated_at() from public, anon, authenticated;
revoke execute on function public.trg_ambassador_risk() from public, anon, authenticated;
revoke execute on function public.ambassador_recompute_risk(uuid) from public, anon, authenticated;
grant execute on function public.ambassador_recompute_risk(uuid) to service_role;

notify pgrst, 'reload schema';
