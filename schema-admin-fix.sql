-- ═══════════════════════════════════════════════════════════════════
-- APATMENTO · ADMIN FIX PATCH
-- Run this in Supabase SQL editor (Dashboard > SQL Editor > New query)
-- Fixes: push_campaigns RLS, notifications admin policy, admin_users
-- ═══════════════════════════════════════════════════════════════════

-- ── 0 · Ensure is_operator() function is up to date ────────────────
create or replace function public.is_operator()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    auth.jwt() ->> 'email' in ('apatmento@gmail.com', 'worlddossy@gmail.com'),
    false
  );
$$;


-- ── 1 · PUSH CAMPAIGNS — fix RLS to allow admin reads/writes ───────
-- Old schema had `using (false)` which blocks everything including admin.
-- Replace with operator-only access.

alter table push_campaigns enable row level security;

drop policy if exists "no direct client access" on push_campaigns;
drop policy if exists "admin_all_push_campaigns" on push_campaigns;

create policy "admin_all_push_campaigns" on push_campaigns
  for all
  to authenticated
  using (public.is_operator())
  with check (public.is_operator());


-- ── 2 · NOTIFICATIONS — add admin read/write policy ─────────────────
-- notifications table is written by edge functions (service role),
-- but admin panel needs to SELECT from it for the push log.

alter table notifications enable row level security;

drop policy if exists "admin_read_notifications" on notifications;
drop policy if exists "admin_all_notifications" on notifications;

create policy "admin_all_notifications" on notifications
  for all
  to authenticated
  using (public.is_operator())
  with check (public.is_operator());


-- ── 3 · PUSH SUBSCRIPTIONS — admin read access ──────────────────────
alter table push_subscriptions enable row level security;

drop policy if exists "admin_read_push_subscriptions" on push_subscriptions;

create policy "admin_read_push_subscriptions" on push_subscriptions
  for select
  to authenticated
  using (public.is_operator());


-- ── 4 · LAZY REQUESTS — admin full access ───────────────────────────
-- lazy_requests is read/written via REST with JWT, needs RLS policy.
alter table lazy_requests enable row level security;

drop policy if exists "admin_all_lazy_requests" on lazy_requests;

-- Public can INSERT (the contact form), admin can do everything
create policy "admin_all_lazy_requests" on lazy_requests
  for all
  to authenticated
  using (public.is_operator())
  with check (public.is_operator());

-- Allow anonymous insert (the form submission)
drop policy if exists "public_insert_lazy_requests" on lazy_requests;
create policy "public_insert_lazy_requests" on lazy_requests
  for insert
  to anon, authenticated
  with check (true);


-- ── 5 · PROFILES — admin read access for impersonate search ─────────
-- profiles readable by owner; admin can read all
drop policy if exists "admin_read_profiles" on profiles;
create policy "admin_read_profiles" on profiles
  for select
  to authenticated
  using (public.is_operator() or auth.uid() = id);


-- ── 6 · ADMIN USERS TABLE — ensure emails are seeded ────────────────
-- Some functions may reference an admin_users table. Create and seed it.
create table if not exists public.admin_users (
  id         bigserial primary key,
  email      text unique not null,
  role       text not null default 'admin',
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;

drop policy if exists "admin_read_admin_users" on public.admin_users;
create policy "admin_read_admin_users" on public.admin_users
  for select
  to authenticated
  using (public.is_operator());

-- Seed the two operator emails
insert into public.admin_users (email, role)
values
  ('apatmento@gmail.com', 'superadmin'),
  ('worlddossy@gmail.com', 'superadmin')
on conflict (email) do update set role = excluded.role;


-- ═══ DONE ═══════════════════════════════════════════════════════════
-- After running this:
-- 1. Push campaigns CRUD will work in admin panel
-- 2. Notifications log will load in push panel
-- 3. Lazy requests (contact form leads) will load + be editable
-- 4. Impersonate/profile search will return results
-- 5. admin_users seeded with both operator emails
-- ═══════════════════════════════════════════════════════════════════
