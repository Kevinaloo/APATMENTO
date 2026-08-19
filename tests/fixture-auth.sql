-- ═══════════════════════════════════════════════════════════════════════════
-- TEST FIXTURE · a minimal stand-in for Supabase's auth schema
-- ─────────────────────────────────────────────────────────────────────────
-- Enough of auth.users and auth.uid() to exercise the ambassador gate on a
-- throwaway Postgres. auth.uid() reads a GUC instead of a JWT so tests can
-- impersonate. Mirrors the live column types for the tables the migration
-- touches — including referral_earnings.commission_rate's stale 0.20
-- default, so the test that proves the migration drops it is meaningful.
-- ═══════════════════════════════════════════════════════════════════════════

create schema if not exists auth;
create table auth.users (
  id uuid primary key default gen_random_uuid(),
  email text,
  email_confirmed_at timestamptz,
  created_at timestamptz default now()
);
-- Supabase's auth.uid() reads the request JWT claims; this stub reads a GUC
-- so tests can impersonate a user.
create or replace function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('test.uid', true), '')::uuid;
$$;

create table public.referral_codes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users(id) on delete cascade,
  code text not null unique,
  created_at timestamptz default now()
);
create table public.referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid references auth.users(id) on delete cascade,
  referred_id uuid references auth.users(id) on delete cascade,
  referral_type text default 'user',
  code_used text,
  expires_at timestamptz,
  created_at timestamptz default now()
);
create table public.referral_earnings (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid references auth.users(id) on delete cascade,
  referred_id uuid references auth.users(id) on delete cascade,
  service_type text not null,
  gross_amount numeric default 0,
  platform_fee numeric default 0,
  commission_rate numeric default 0.20,
  commission_kes numeric default 0,
  status text default 'pending',
  booking_ref text,
  created_at timestamptz default now()
);
create table public.listings (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid, title text,
  contact_phone text, contact_whatsapp text, contact_email text,
  status text default 'active'
);
-- Roles are cluster-wide, so creating them must tolerate a re-run.
do $$
begin
  if not exists (select 1 from pg_roles where rolname='anon')          then create role anon;          end if;
  if not exists (select 1 from pg_roles where rolname='authenticated') then create role authenticated; end if;
end $$;
