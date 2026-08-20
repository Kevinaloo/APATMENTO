-- ═══════════════════════════════════════════════════════════════════════════
-- TEST FIXTURE · enough of the live schema to exercise listing ownership
-- ─────────────────────────────────────────────────────────────────────────
-- A stand-in for auth.users, public.profiles and public.listings, with the
-- columns the ownership migration reads. auth.uid() reads a GUC instead of a
-- JWT so a test can impersonate; is_operator() reads a second one, so the
-- admin bypass can be exercised without inventing an admin email.
--
-- `listings.photos` is declared text[] here on purpose: it is text[] in
-- production and the transfer inbox has to survive that as well as jsonb.
-- ═══════════════════════════════════════════════════════════════════════════

create extension if not exists pgcrypto;

create schema if not exists auth;
create table auth.users (
  id uuid primary key default gen_random_uuid(),
  email text,
  phone text,
  raw_user_meta_data jsonb default '{}'::jsonb,
  email_confirmed_at timestamptz,
  created_at timestamptz default now()
);
create or replace function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('test.uid', true), '')::uuid;
$$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text
);

create table public.listings (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid references auth.users(id) on delete set null,
  host_id    uuid references auth.users(id) on delete set null,
  owner_id   uuid references auth.users(id) on delete set null,
  title text,
  city text,
  photos text[] default '{}',
  service text default 'stays',
  status text default 'active',
  is_active boolean default true
);

create or replace function public.is_operator() returns boolean
language sql stable as $$
  select coalesce(current_setting('test.operator', true) = 'yes', false);
$$;

do $$
begin
  if not exists (select 1 from pg_roles where rolname='anon')          then create role anon;          end if;
  if not exists (select 1 from pg_roles where rolname='authenticated') then create role authenticated; end if;
end $$;
