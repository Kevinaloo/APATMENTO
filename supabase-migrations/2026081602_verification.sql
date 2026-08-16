/* ══════════════════════════════════════════════════════════════════════
   Identity verification (Didit)  —  supabase-migrations/2026081602_verification.sql

   Two tables:
     verification_sessions — one row per attempt, the audit trail
     verification_status   — one row per user, the current answer

   The split matters. A partner may attempt three times; compliance needs
   every attempt, but every read path ("can this person publish?") wants a
   single row it can join cheaply. Deriving status by scanning attempts
   would put an ORDER BY on the hot path of every listing publish.

   No document images or extracted PII are stored here. Didit holds the
   documents; we keep the decision, the reference, and the minimum needed
   to show a partner why they were declined. That keeps our breach surface
   small and keeps data-minimisation defensible under Kenya's DPA 2019,
   Nigeria's NDPA 2023, South Africa's POPIA and the GDPR.
══════════════════════════════════════════════════════════════════════ */

-- ── Enums ──────────────────────────────────────────────────────────────

do $$ begin
  create type verification_state as enum (
    'not_started',
    'in_progress',   -- session created, partner has not finished
    'pending',       -- submitted, Didit or a reviewer still deciding
    'approved',
    'declined',
    'expired',       -- session timed out unused
    'review'         -- flagged for a human (AML hit, mismatch)
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type verification_kind as enum (
    'identity',      -- OCR + liveness + face match
    'identity_aml',  -- the above plus sanctions/PEP screening
    'biometric'      -- face match against an already-verified identity
  );
exception when duplicate_object then null; end $$;

-- ── Attempts ───────────────────────────────────────────────────────────

create table if not exists public.verification_sessions (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,

  didit_session_id  text not null unique,
  workflow_id       text not null,
  kind              verification_kind not null default 'identity',

  -- why this verification was asked for: 'stays', 'rides', 'carhire',
  -- 'tours', 'agent', 'payout'. Lets us report conversion per funnel.
  context           text not null,

  state             verification_state not null default 'in_progress',

  -- Didit's hosted flow. Short-lived; regenerate rather than reuse.
  verification_url  text,

  -- Decision detail only. Never document images, never a full ID number.
  decision          jsonb not null default '{}'::jsonb,
  decline_reason    text,

  -- Set when the partner's declared country differs from the document's.
  -- Not a failure by itself (diaspora hosts are common) but worth seeing.
  declared_country  text,
  document_country  text,

  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  completed_at      timestamptz,
  expires_at        timestamptz not null default now() + interval '7 days'
);

create index if not exists vs_user on public.verification_sessions (user_id, created_at desc);
create index if not exists vs_state on public.verification_sessions (state) where state in ('pending','review');
create index if not exists vs_context on public.verification_sessions (context, state);

-- ── Current status, one row per person ─────────────────────────────────

create table if not exists public.verification_status (
  user_id            uuid primary key references auth.users(id) on delete cascade,

  identity_state     verification_state not null default 'not_started',
  identity_at        timestamptz,
  identity_expires   timestamptz,   -- re-verify when the document expires

  aml_state          verification_state not null default 'not_started',
  aml_at             timestamptz,

  -- Cached from the approved document so we can show "Verified: Amara O."
  -- without another Didit round-trip. First name + initial only.
  display_name       text,
  document_country   text,
  document_type      text,          -- 'passport' | 'national_id' | 'drivers_licence'

  -- Highest risk tier the person is cleared for. See can_publish() below.
  cleared_tier       smallint not null default 0,

  last_session_id    uuid references public.verification_sessions(id) on delete set null,
  updated_at         timestamptz not null default now()
);

-- ── RLS ────────────────────────────────────────────────────────────────
-- A person may read their own verification state and nothing else.
-- Writes come only from the server (service role) after a signed webhook,
-- never from the browser: a client that could write its own status could
-- mark itself approved.

alter table public.verification_sessions enable row level security;
alter table public.verification_status   enable row level security;

drop policy if exists "own sessions: read" on public.verification_sessions;
create policy "own sessions: read" on public.verification_sessions
  for select using (auth.uid() = user_id);

drop policy if exists "own status: read" on public.verification_status;
create policy "own status: read" on public.verification_status
  for select using (auth.uid() = user_id);

-- deliberately no insert/update/delete policy for either table.

-- ── Risk tiers ─────────────────────────────────────────────────────────
/* Tier 0  no verification         events, shopping, food listings
   Tier 1  identity verified       stays, roommates, tours
   Tier 2  identity + AML          car hire, agents, any payout
   Tier 3  identity + AML + biometric re-auth   rides (driver carries people)

   Tiers rise with the harm a bad actor could do in person. A fraudulent
   event listing costs a ticket price; a stranger driving a passenger at
   night is a different category of risk, so drivers re-prove they are the
   registered person rather than verifying once at signup.
*/

create or replace function public.required_tier(p_service text)
returns smallint
language sql
immutable
as $$
  select case p_service
    when 'rides'     then 3
    when 'carhire'   then 2
    when 'agent'     then 2
    when 'payout'    then 2
    when 'stays'     then 1
    when 'roommates' then 1
    when 'tours'     then 1
    else 0
  end::smallint;
$$;

create or replace function public.can_publish(p_user uuid, p_service text)
returns boolean
language sql
stable
as $$
  select coalesce(
    (select vs.cleared_tier from public.verification_status vs where vs.user_id = p_user),
    0
  ) >= public.required_tier(p_service);
$$;

-- Recompute cleared_tier whenever status changes, so the value can never
-- drift from the states it is derived from.
create or replace function public.sync_cleared_tier()
returns trigger
language plpgsql
as $$
begin
  new.cleared_tier := case
    when new.identity_state <> 'approved' then 0
    when new.aml_state = 'approved' then 2
    else 1
  end;
  -- Tier 3 is granted by the rides onboarding flow after a biometric
  -- re-auth, not here; it is set explicitly and must not be downgraded
  -- by an unrelated status write.
  if (tg_op = 'UPDATE' and old.cleared_tier = 3 and new.identity_state = 'approved') then
    new.cleared_tier := 3;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_sync_cleared_tier on public.verification_status;
create trigger trg_sync_cleared_tier
  before insert or update on public.verification_status
  for each row execute function public.sync_cleared_tier();
