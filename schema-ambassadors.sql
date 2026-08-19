-- ═══════════════════════════════════════════════════════════════════════════
-- APATMENTO · AMBASSADOR PROGRAMME SCHEMA  v1
-- ─────────────────────────────────────────────────────────────────────────
-- A small, hand-picked field team that brings hosts, service providers and
-- travellers onto Cabana. Not the open agent network — the opposite of it.
-- The agent network is self-serve because a host is the right judge of an
-- agent. An ambassador speaks *for Cabana*, so Cabana picks them, one email
-- at a time.
--
-- Four principles, and every table below exists to serve one of them.
--
--   1. THE DOOR IS AN ALLOWLIST, AND THE ALLOWLIST IS SERVER-SIDE.
--      An ambassador is an email an admin typed in. Not a role claim in a
--      JWT, not a flag the browser sends, not a page you reach by knowing
--      the URL. Every read and write below re-derives the caller from
--      auth.uid() and re-checks the roster in Postgres. The dashboard's
--      own check is a courtesy to save a redirect; it is not the lock.
--
--   2. A CONFIRMED EMAIL, OR NOTHING.
--      An allowlist keyed on email is only as strong as the proof that the
--      account owns that email. Supabase will happily hold an unconfirmed
--      address on a fresh account, so anyone who learns an ambassador's
--      email could otherwise sign up as them and walk in. ambassador_gate()
--      demands email_confirmed_at. This is the single most load-bearing
--      line in the file.
--
--   3. THE RATE IS STAMPED, NEVER LOOKED UP LATER.
--      Commission is written onto the referral the moment it is created and
--      never recomputed. Two reasons, both about money. A promise made at
--      15% stays 15% even if the person leaves the programme — that is
--      simple honesty. And nobody can farm referrals as an ordinary user,
--      get added to the roster, and have their whole back catalogue
--      silently reprice upward. A rate that floats is a rate that can be
--      gamed by waiting.
--
--   4. ONBOARDING IS NOT THE PAYABLE EVENT. BOOKINGS ARE.
--      Nothing here pays for a signup. It pays when the host that the
--      ambassador brought actually earns. This is not thrift; it is the
--      whole fraud model. A fake host is worth exactly nothing, so there
--      is no reason to invent one, and the most common way these
--      programmes rot never starts.
--
-- Idempotent. Safe to re-run.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 0 · THE RATE CARD ─────────────────────────────────────────────────────
-- One function. Every rate in the business comes from here — the API mirrors
-- it for speed but this is the authority, and the mirror is asserted against
-- it in tests. When these numbers change, they change once, in this block.
--
--   Commission is a share of CABANA'S FEE, not of the booking. Cabana's fee
--   is 10% of gross, so an ambassador on a traveller earns 15% of that 10%
--   = 1.5% of the booking value. Say that out loud to anyone who asks, and
--   put it in the UI. A programme that lets people believe they earn 15% of
--   a booking is a programme that will be accused of lying, correctly.
--
--                        │ traveller  │ host / service provider
--   ─────────────────────┼────────────┼────────────────────────
--    ambassador          │    15%     │         10%
--    ordinary user       │    10%     │          5%
--
--   Both tiers earn for 365 days from the day the referral lands.
--
-- Previous rates were 20% traveller / 10% host for everybody. Ordinary users
-- are halved so the ambassador tier is worth being picked for; a tier that
-- pays what anyone can already get is not a tier, it is a lanyard.

create or replace function public.referral_rate(
  p_tier text,
  p_referral_type text
) returns numeric
language sql
immutable
as $$
  select case
    when coalesce(p_tier,'user') = 'ambassador' then
      case when coalesce(p_referral_type,'user') = 'user' then 0.15 else 0.10 end
    else
      case when coalesce(p_referral_type,'user') = 'user' then 0.10 else 0.05 end
  end::numeric;
$$;

comment on function public.referral_rate(text, text) is
  'Authoritative commission rate card. Share of the Cabana platform fee (itself 10% of gross), not of the booking. ambassador: 15% traveller / 10% host. user: 10% traveller / 5% host.';


-- ── 1 · WIDEN THE REFERRAL LEDGER ─────────────────────────────────────────
-- referrals and referral_earnings predate this programme. They need to carry
-- a tier and a stamped rate, and referral_type needs to admit service
-- providers as their own thing.
--
-- Note on the constraints: schema-rewards.sql tried to add these with
-- `ADD CONSTRAINT IF NOT EXISTS`, which Postgres does not support — so they
-- were never actually created and referral_type has been unconstrained all
-- along. The do-blocks below check the catalogue instead, which both works
-- and stays re-runnable.

alter table public.referrals
  add column if not exists referrer_tier   text,
  add column if not exists commission_rate numeric(5,4),
  add column if not exists source          text,
  add column if not exists lead_id         uuid;

-- Backfill: everything that exists today was earned under the old ordinary-
-- user card. Stamp it explicitly rather than leaving nulls for the payout
-- path to guess at — a null rate is how you end up paying zero or paying
-- twice, and both are worse than paying the old number.
update public.referrals
   set referrer_tier   = coalesce(referrer_tier, 'user'),
       commission_rate = coalesce(commission_rate,
                                  case when coalesce(referral_type,'user') = 'user'
                                       then 0.20 else 0.10 end)
 where referrer_tier is null or commission_rate is null;

alter table public.referrals
  alter column referrer_tier set default 'user';

do $$
begin
  if not exists (select 1 from pg_constraint
                  where conrelid = 'public.referrals'::regclass
                    and conname  = 'referrals_type_check') then
    alter table public.referrals
      add constraint referrals_type_check
      check (referral_type in ('user','host','service_provider'));
  end if;

  if not exists (select 1 from pg_constraint
                  where conrelid = 'public.referrals'::regclass
                    and conname  = 'referrals_tier_check') then
    alter table public.referrals
      add constraint referrals_tier_check
      check (referrer_tier in ('user','ambassador'));
  end if;

  -- A rate outside this band is a bug or a theft. Refuse the row either way.
  if not exists (select 1 from pg_constraint
                  where conrelid = 'public.referrals'::regclass
                    and conname  = 'referrals_rate_sane') then
    alter table public.referrals
      add constraint referrals_rate_sane
      check (commission_rate is null or (commission_rate >= 0 and commission_rate <= 0.30));
  end if;
end $$;

create index if not exists idx_referrals_tier on public.referrals (referrer_tier);

-- referral_earnings carried `default 0.20` on commission_rate: the old
-- traveller rate, welded into the schema. Any insert that omitted the column
-- would silently pay the retired top rate. Drop the default outright so an
-- omission fails loudly instead of expensively.
alter table public.referral_earnings
  alter column commission_rate drop default;

alter table public.referral_earnings
  add column if not exists referrer_tier text,
  add column if not exists referral_type text,
  add column if not exists available_at  timestamptz,
  add column if not exists hold_reason   text,
  add column if not exists reversed_at   timestamptz;

comment on column public.referral_earnings.available_at is
  'When this commission becomes withdrawable. Commission is booked on payment but held past the cancellation window, so a book-now-refund-later loop pays nobody.';


-- ── 2 · THE ROSTER ────────────────────────────────────────────────────────
-- The door. One row per email an admin has authorised. Deliberately keyed on
-- the email rather than a user id, because the whole point is to authorise
-- someone who has not signed up yet.
--
-- Emails are stored lowercased and compared lowercased. The check constraint
-- enforces it at write time rather than trusting every caller to remember,
-- which is the difference between a rule and a hope.

create table if not exists public.ambassador_allowlist (
  email          text        primary key check (email = lower(email) and position('@' in email) > 1),
  full_name      text,
  region         text,
  note           text,

  -- what we asked of them, so the dashboard can show progress against a
  -- real target instead of an invented one
  monthly_target integer     not null default 10 check (monthly_target between 0 and 1000),

  invited_by     uuid        references auth.users (id) on delete set null,
  invited_at     timestamptz not null default now(),

  -- Revocation is a timestamp, never a delete. You want to be able to answer
  -- "who had access on the day that booking was attributed" a year later.
  revoked_at     timestamptz,
  revoked_by     uuid        references auth.users (id) on delete set null,
  revoke_reason  text
);

create index if not exists idx_amb_allow_live on public.ambassador_allowlist (email)
  where revoked_at is null;

comment on table public.ambassador_allowlist is
  'Admin-managed roster of authorised ambassador emails. Membership here plus a CONFIRMED auth email is the entire access condition for the ambassador gateway.';


-- ── 3 · AMBASSADORS ───────────────────────────────────────────────────────
-- Provisioned on first successful pass through the gate, never before. An
-- allowlist entry alone creates nothing; the person has to actually show up
-- and prove the email.

create table if not exists public.ambassadors (
  id             uuid primary key references auth.users (id) on delete cascade,
  email          text        not null unique check (email = lower(email)),

  full_name      text        not null,
  phone          text,
  region         text,
  avatar_url     text,

  -- public handle, and the code that carries attribution
  slug           text        not null unique,
  referral_code  text        not null unique,

  -- active   → working
  -- paused   → self-paused, links still attribute, nothing accrues
  -- suspended→ admin or fraud engine stopped them. Links stop attributing.
  status         text        not null default 'active'
                 check (status in ('active','paused','suspended')),
  suspended_at   timestamptz,
  suspend_reason text,

  -- 0 clean · 100 certainly fraudulent. Written only by the fraud engine.
  risk_score     integer     not null default 0 check (risk_score between 0 and 100),

  monthly_target integer     not null default 10,

  enrolled_at    timestamptz not null default now(),
  last_seen_at   timestamptz,
  updated_at     timestamptz not null default now()
);

create index if not exists idx_ambassadors_code   on public.ambassadors (referral_code);
create index if not exists idx_ambassadors_status on public.ambassadors (status);
create index if not exists idx_ambassadors_risk   on public.ambassadors (risk_score) where risk_score >= 50;


-- ── 4 · LEADS ─────────────────────────────────────────────────────────────
-- An ambassador stakes a claim on a prospect BEFORE onboarding them, and the
-- claim is what earns. This ordering is the anti-poaching mechanism and it
-- is worth being precise about why.
--
-- If you let an ambassador claim credit after a host has signed up, then the
-- rational move is to claim every new host on the platform and argue about
-- it later. If the claim must exist first, the ambassador has to actually
-- find someone nobody has found yet. Same programme, opposite incentive,
-- one ordering constraint apart.
--
-- contact_key is the dedupe axis: a normalised phone or email. Two
-- ambassadors cannot hold a live claim on the same human, and the platform's
-- existing hosts are excluded at claim time.

create table if not exists public.ambassador_leads (
  id             uuid primary key default gen_random_uuid(),
  ambassador_id  uuid        not null references public.ambassadors (id) on delete cascade,

  full_name      text        not null,
  contact_key    text        not null,   -- normalised: digits for phone, lowercase for email
  contact_kind   text        not null check (contact_kind in ('phone','email')),
  contact_raw    text        not null,   -- as typed, for a human to read

  lead_type      text        not null default 'host'
                 check (lead_type in ('host','service_provider','traveller')),
  category       text,                    -- stays · tours · carhire · food · …
  city           text,
  country        text,
  notes          text,

  -- claimed   → staked, not yet signed up
  -- signed_up → the auth account exists and is linked
  -- listed    → at least one live listing
  -- earning   → has produced a paid booking
  -- expired   → the claim lapsed unconverted
  -- rejected  → duplicate, pre-existing, or fraudulent
  status         text        not null default 'claimed'
                 check (status in ('claimed','signed_up','listed','earning','expired','rejected')),
  reject_reason  text,

  -- A claim is not a freehold. Unconverted, it lapses and the prospect is
  -- free for someone else. Otherwise the fastest ambassador simply claims a
  -- phone book on day one and blocks the whole team for a year.
  claim_expires_at timestamptz not null default (now() + interval '45 days'),

  converted_user_id uuid      references auth.users (id) on delete set null,
  converted_at     timestamptz,
  first_listing_id uuid,
  first_earning_at timestamptz,

  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- The load-bearing index. One live claim per human, across the whole team.
create unique index if not exists uq_amb_lead_live_contact
  on public.ambassador_leads (contact_key)
  where status in ('claimed','signed_up','listed','earning');

create index if not exists idx_amb_leads_owner  on public.ambassador_leads (ambassador_id, status);
create index if not exists idx_amb_leads_expiry on public.ambassador_leads (claim_expires_at)
  where status = 'claimed';


-- ── 5 · EVENTS ────────────────────────────────────────────────────────────
-- Append-only. Every consequential act, by ambassador or admin, lands here.
-- Nothing reads it in the hot path; it exists for the day someone disputes a
-- payout or an access decision, and on that day you either have this table
-- or you have an argument.

create table if not exists public.ambassador_events (
  id            bigint generated always as identity primary key,
  ambassador_id uuid        references public.ambassadors (id) on delete set null,
  actor_id      uuid        references auth.users (id) on delete set null,
  kind          text        not null,
  subject       text,
  meta          jsonb       not null default '{}'::jsonb,
  ip            text,
  user_agent    text,
  created_at    timestamptz not null default now()
);

create index if not exists idx_amb_events_amb  on public.ambassador_events (ambassador_id, created_at desc);
create index if not exists idx_amb_events_kind on public.ambassador_events (kind, created_at desc);


-- ── 6 · FRAUD SIGNALS ─────────────────────────────────────────────────────
-- Signals accumulate; they do not individually convict. Each carries a
-- weight, and the ambassador's risk_score is the decayed sum. Crossing a
-- threshold freezes accrual and asks a human — it does not delete anybody.
-- An automated system that can permanently destroy someone's earnings on a
-- heuristic will eventually do so to your best ambassador on a Friday night.

create table if not exists public.ambassador_fraud_signals (
  id            bigint generated always as identity primary key,
  ambassador_id uuid        not null references public.ambassadors (id) on delete cascade,
  signal        text        not null,
  weight        integer     not null check (weight between 1 and 100),
  detail        jsonb       not null default '{}'::jsonb,
  lead_id       uuid        references public.ambassador_leads (id) on delete set null,
  booking_ref   text,
  resolved      boolean     not null default false,
  resolved_by   uuid        references auth.users (id) on delete set null,
  resolved_note text,
  created_at    timestamptz not null default now()
);

create index if not exists idx_amb_fraud_open on public.ambassador_fraud_signals (ambassador_id)
  where resolved = false;

comment on table public.ambassador_fraud_signals is
  'Weighted fraud observations. Sum of unresolved weights drives ambassadors.risk_score. Threshold freezes accrual for human review; it never deletes earnings.';


-- ── 7 · NORMALISATION ─────────────────────────────────────────────────────
-- Dedupe is only as good as the key. "+254 712 345 678", "0712345678" and
-- "254712345678" are one person, and if the key does not say so, the whole
-- anti-poaching design in §4 is decorative.
--
-- Taking the last 9 digits collapses country code and trunk zero together
-- across the markets Cabana operates in. It is not universal — it is right
-- for +254/+255/+256/+234/+233 and safe elsewhere, because a false collision
-- costs one manual review and a false miss costs a duplicate payout.

create or replace function public.normalise_contact(p_raw text, p_kind text)
returns text
language sql
immutable
as $$
  select case
    when p_kind = 'email' then lower(btrim(p_raw))
    else right(regexp_replace(coalesce(p_raw,''), '\D', '', 'g'), 9)
  end;
$$;


-- ── 8 · THE GATE ──────────────────────────────────────────────────────────
-- Everything in this file funnels through here.
--
-- SECURITY DEFINER because it must read auth.users to see whether the email
-- is confirmed, which no ordinary caller may do. It is deliberately narrow:
-- it takes no arguments, so there is nothing to pass in and nothing to
-- forge. It answers exactly one question, about exactly one person — the one
-- holding the JWT.
--
-- Returns a verdict rather than a boolean so the dashboard can say *why*
-- someone was turned away. "Not authorised" with no reason generates a
-- support ticket every single time.

create or replace function public.ambassador_gate()
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_uid       uuid := auth.uid();
  v_email     text;
  v_confirmed timestamptz;
  v_allow     public.ambassador_allowlist%rowtype;
  v_amb       public.ambassadors%rowtype;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'reason', 'not_signed_in');
  end if;

  select lower(u.email), u.email_confirmed_at
    into v_email, v_confirmed
    from auth.users u
   where u.id = v_uid;

  if v_email is null then
    return jsonb_build_object('ok', false, 'reason', 'no_email');
  end if;

  -- Principle 2. An allowlist keyed on email means nothing until the account
  -- has proven it holds that email. Without this line, knowing an
  -- ambassador's address is the same as being one.
  if v_confirmed is null then
    return jsonb_build_object('ok', false, 'reason', 'email_unconfirmed', 'email', v_email);
  end if;

  select * into v_allow
    from public.ambassador_allowlist
   where email = v_email
     and revoked_at is null;

  if not found then
    return jsonb_build_object('ok', false, 'reason', 'not_authorised', 'email', v_email);
  end if;

  select * into v_amb from public.ambassadors where id = v_uid;

  if found and v_amb.status = 'suspended' then
    return jsonb_build_object('ok', false, 'reason', 'suspended',
                              'detail', coalesce(v_amb.suspend_reason, 'Under review'));
  end if;

  return jsonb_build_object(
    'ok',        true,
    'email',     v_email,
    'enrolled',  found,
    'status',    coalesce(v_amb.status, 'active'),
    'region',    coalesce(v_amb.region, v_allow.region),
    'target',    coalesce(v_amb.monthly_target, v_allow.monthly_target),
    'full_name', coalesce(v_amb.full_name, v_allow.full_name)
  );
end $$;

revoke all on function public.ambassador_gate() from public;
grant execute on function public.ambassador_gate() to authenticated;

comment on function public.ambassador_gate() is
  'The access decision for the ambassador gateway. Confirmed email + live allowlist entry + not suspended. Takes no arguments by design: there is nothing to forge.';


-- A boolean form for RLS, where a verdict object is inconvenient.
create or replace function public.is_ambassador(p_uid uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
      from public.ambassadors a
      join auth.users u                      on u.id = a.id
      join public.ambassador_allowlist w     on w.email = a.email
     where a.id = p_uid
       and a.status <> 'suspended'
       and u.email_confirmed_at is not null
       and w.revoked_at is null
  );
$$;

revoke all on function public.is_ambassador(uuid) from public;
grant execute on function public.is_ambassador(uuid) to authenticated;


-- ── 9 · ENROLMENT ─────────────────────────────────────────────────────────
-- Called on first arrival. Re-runs the gate itself rather than trusting the
-- caller to have run it — a function that assumes it is only ever called
-- after a check is a function that will one day be called without one.

create or replace function public.ambassador_enrol(
  p_full_name text,
  p_phone     text default null,
  p_region    text default null
) returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_uid    uuid := auth.uid();
  v_gate   jsonb := public.ambassador_gate();
  v_email  text;
  v_base   text;
  v_slug   text;
  v_code   text;
  v_n      integer := 0;
  v_row    public.ambassadors%rowtype;
begin
  if not (v_gate->>'ok')::boolean then
    return v_gate;
  end if;
  v_email := v_gate->>'email';

  select * into v_row from public.ambassadors where id = v_uid;
  if found then
    update public.ambassadors
       set last_seen_at = now(),
           full_name    = coalesce(nullif(btrim(p_full_name), ''), full_name),
           phone        = coalesce(nullif(btrim(p_phone), ''),  phone),
           region       = coalesce(nullif(btrim(p_region), ''), region),
           updated_at   = now()
     where id = v_uid
     returning * into v_row;
    return jsonb_build_object('ok', true, 'created', false,
                              'ambassador', to_jsonb(v_row));
  end if;

  v_base := lower(regexp_replace(coalesce(nullif(btrim(p_full_name),''), split_part(v_email,'@',1)),
                                 '[^a-zA-Z0-9]+', '-', 'g'));
  v_base := btrim(left(nullif(v_base,''), 24), '-');
  if v_base is null or v_base = '' then v_base := 'ambassador'; end if;

  v_slug := v_base;
  while exists (select 1 from public.ambassadors where slug = v_slug) loop
    v_n := v_n + 1;
    v_slug := v_base || '-' || v_n;
  end loop;

  -- Codes are prefixed so an ambassador link is legible at a glance in the
  -- ledger, in a WhatsApp message, and in a dispute.
  loop
    v_code := 'AMB-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
    exit when not exists (select 1 from public.referral_codes where code = v_code)
          and not exists (select 1 from public.ambassadors    where referral_code = v_code);
  end loop;

  insert into public.ambassadors (id, email, full_name, phone, region, slug, referral_code,
                                  monthly_target, last_seen_at)
  values (v_uid, v_email,
          coalesce(nullif(btrim(p_full_name),''), split_part(v_email,'@',1)),
          nullif(btrim(p_phone),''),
          coalesce(nullif(btrim(p_region),''), v_gate->>'region'),
          v_slug, v_code,
          coalesce((v_gate->>'target')::integer, 10),
          now())
  returning * into v_row;

  -- The ambassador's code must also live in referral_codes, because that is
  -- the table the public ?ref= capture already reads. One code, one meaning,
  -- wherever it is seen.
  insert into public.referral_codes (user_id, code)
  values (v_uid, v_code)
  on conflict (user_id) do update set code = excluded.code;

  insert into public.ambassador_events (ambassador_id, actor_id, kind, subject, meta)
  values (v_uid, v_uid, 'enrolled', v_email, jsonb_build_object('slug', v_slug, 'code', v_code));

  return jsonb_build_object('ok', true, 'created', true, 'ambassador', to_jsonb(v_row));
end $$;

revoke all on function public.ambassador_enrol(text, text, text) from public;
grant execute on function public.ambassador_enrol(text, text, text) to authenticated;


-- ── 10 · CLAIMING A LEAD ──────────────────────────────────────────────────
-- The staking mechanism from §4, with its three refusals:
--
--   already_on_platform  the prospect is not new, so there is nothing to
--                        onboard and nothing to pay for. Catches the oldest
--                        trick in the programme — claiming existing hosts.
--   already_claimed      a teammate holds a live claim. First to find, wins.
--   rate_limited         nobody meets thirty new hosts in an afternoon.
--                        Someone dumping a contact list is not prospecting.
--
-- The rate limit is the quiet one, and the one that matters most. Without
-- it, the dominant strategy is to claim every number you have ever seen and
-- wait for a few to convert by coincidence. That is not recruitment, it is a
-- lottery ticket bought with someone else's money.

create or replace function public.ambassador_claim_lead(
  p_full_name    text,
  p_contact_raw  text,
  p_contact_kind text,
  p_lead_type    text default 'host',
  p_category     text default null,
  p_city         text default null,
  p_country      text default null,
  p_notes        text default null
) returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_uid   uuid := auth.uid();
  v_key   text;
  v_day   integer;
  v_hour  integer;
  v_row   public.ambassador_leads%rowtype;
  v_owner text;
begin
  if not public.is_ambassador(v_uid) then
    return jsonb_build_object('ok', false, 'reason', 'not_authorised');
  end if;

  if coalesce(btrim(p_full_name), '') = '' or coalesce(btrim(p_contact_raw), '') = '' then
    return jsonb_build_object('ok', false, 'reason', 'incomplete');
  end if;

  if p_contact_kind not in ('phone','email') then
    return jsonb_build_object('ok', false, 'reason', 'bad_contact_kind');
  end if;

  v_key := public.normalise_contact(p_contact_raw, p_contact_kind);
  if length(coalesce(v_key,'')) < (case when p_contact_kind = 'phone' then 9 else 5 end) then
    return jsonb_build_object('ok', false, 'reason', 'bad_contact');
  end if;

  -- Velocity. Counted on claims made, not claims surviving, so deleting a
  -- claim cannot buy back quota.
  select count(*) into v_day
    from public.ambassador_leads
   where ambassador_id = v_uid and created_at > now() - interval '24 hours';
  select count(*) into v_hour
    from public.ambassador_leads
   where ambassador_id = v_uid and created_at > now() - interval '1 hour';

  if v_day >= 25 or v_hour >= 8 then
    insert into public.ambassador_fraud_signals (ambassador_id, signal, weight, detail)
    values (v_uid, 'claim_velocity', 15,
            jsonb_build_object('day', v_day, 'hour', v_hour));
    return jsonb_build_object('ok', false, 'reason', 'rate_limited',
                              'detail', 'Claim limit reached. 8 per hour, 25 per day.');
  end if;

  -- Is this human already on Cabana? Email is exact; phone is matched on the
  -- normalised tail against the contact details hosts actually publish.
  if p_contact_kind = 'email' then
    if exists (select 1 from auth.users where lower(email) = v_key) then
      return jsonb_build_object('ok', false, 'reason', 'already_on_platform');
    end if;
  else
    if exists (
      select 1 from public.listings l
       where public.normalise_contact(l.contact_phone,    'phone') = v_key
          or public.normalise_contact(l.contact_whatsapp, 'phone') = v_key
    ) then
      return jsonb_build_object('ok', false, 'reason', 'already_on_platform');
    end if;
  end if;

  -- Someone else's live claim. Name the holder only if it is the caller —
  -- otherwise this endpoint becomes a way to enumerate your colleagues'
  -- pipelines, which is both a privacy leak and an invitation to poach.
  select ambassador_id::text into v_owner
    from public.ambassador_leads
   where contact_key = v_key
     and status in ('claimed','signed_up','listed','earning')
   limit 1;

  if v_owner is not null then
    return jsonb_build_object('ok', false,
      'reason', case when v_owner = v_uid::text then 'already_yours' else 'already_claimed' end);
  end if;

  insert into public.ambassador_leads
    (ambassador_id, full_name, contact_key, contact_kind, contact_raw,
     lead_type, category, city, country, notes)
  values
    (v_uid, btrim(p_full_name), v_key, p_contact_kind, btrim(p_contact_raw),
     coalesce(p_lead_type,'host'), p_category, p_city, p_country, p_notes)
  returning * into v_row;

  insert into public.ambassador_events (ambassador_id, actor_id, kind, subject, meta)
  values (v_uid, v_uid, 'lead_claimed', btrim(p_full_name),
          jsonb_build_object('lead_id', v_row.id, 'type', p_lead_type, 'city', p_city));

  return jsonb_build_object('ok', true, 'lead', to_jsonb(v_row));

exception
  -- The partial unique index is the real arbiter under concurrency. Two
  -- ambassadors claiming the same number in the same millisecond both pass
  -- the SELECT above; exactly one survives the INSERT. Catching it here
  -- turns a 500 into an honest answer.
  when unique_violation then
    return jsonb_build_object('ok', false, 'reason', 'already_claimed');
end $$;

revoke all on function public.ambassador_claim_lead(text,text,text,text,text,text,text,text) from public;
grant execute on function public.ambassador_claim_lead(text,text,text,text,text,text,text,text) to authenticated;


-- ── 11 · RISK ─────────────────────────────────────────────────────────────
-- Decayed sum of unresolved signals. A signal from ninety days ago should
-- not carry the weight of one from this morning; people learn, and a
-- programme that never forgets is a programme nobody stays in.

create or replace function public.ambassador_recompute_risk(p_amb uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare v_score integer;
begin
  select least(100, greatest(0, coalesce(round(sum(
           weight * exp(-extract(epoch from (now() - created_at)) / (86400 * 45.0))
         ))::integer, 0)))
    into v_score
    from public.ambassador_fraud_signals
   where ambassador_id = p_amb and resolved = false;

  update public.ambassadors set risk_score = v_score, updated_at = now() where id = p_amb;
  return v_score;
end $$;

create or replace function public.trg_ambassador_risk() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform public.ambassador_recompute_risk(coalesce(new.ambassador_id, old.ambassador_id));
  return null;
end $$;

drop trigger if exists ambassador_risk_sync on public.ambassador_fraud_signals;
create trigger ambassador_risk_sync
  after insert or update or delete on public.ambassador_fraud_signals
  for each row execute function public.trg_ambassador_risk();


-- ── 12 · ROW LEVEL SECURITY ───────────────────────────────────────────────
-- The API already re-checks everything, but RLS is what holds if the API is
-- ever bypassed — a leaked anon key, a new client, a route written in a
-- hurry two years from now. Defence that depends on every future caller
-- being careful is not defence.

alter table public.ambassador_allowlist      enable row level security;
alter table public.ambassadors               enable row level security;
alter table public.ambassador_leads          enable row level security;
alter table public.ambassador_events         enable row level security;
alter table public.ambassador_fraud_signals  enable row level security;

-- The roster is admin-only, in both directions. An ambassador has no reason
-- to read the list of other ambassadors' emails, and every reason to want to.
drop policy if exists amb_allow_none on public.ambassador_allowlist;
create policy amb_allow_none on public.ambassador_allowlist
  for all to authenticated using (false) with check (false);

-- An ambassador reads their own profile. Nothing else.
drop policy if exists amb_self_read on public.ambassadors;
create policy amb_self_read on public.ambassadors
  for select to authenticated using (id = auth.uid());

-- Deliberately no INSERT or UPDATE policy on ambassadors. Enrolment happens
-- only through ambassador_enrol(), so status, risk_score and referral_code
-- are unreachable from a client. Grant an UPDATE policy here and an
-- ambassador can set their own status to 'active' after being suspended.
drop policy if exists amb_self_write on public.ambassadors;

-- Leads: read your own. Writes go through ambassador_claim_lead(), which is
-- where the dedupe, velocity and pre-existence checks live. A direct INSERT
-- policy would let a client skip all three.
drop policy if exists amb_leads_read on public.ambassador_leads;
create policy amb_leads_read on public.ambassador_leads
  for select to authenticated
  using (ambassador_id = auth.uid());

-- Notes are the one field an ambassador may edit freely — it is their own
-- scratchpad. The WITH CHECK pins ambassador_id so a row cannot be handed to
-- someone else on the way out.
drop policy if exists amb_leads_note on public.ambassador_leads;
create policy amb_leads_note on public.ambassador_leads
  for update to authenticated
  using (ambassador_id = auth.uid())
  with check (ambassador_id = auth.uid());

drop policy if exists amb_events_read on public.ambassador_events;
create policy amb_events_read on public.ambassador_events
  for select to authenticated using (ambassador_id = auth.uid());

-- Fraud signals are invisible to their subject. Telling someone which
-- heuristic caught them is telling them which heuristic to route around.
drop policy if exists amb_fraud_none on public.ambassador_fraud_signals;
create policy amb_fraud_none on public.ambassador_fraud_signals
  for all to authenticated using (false) with check (false);


-- ── 13 · THE DASHBOARD VIEW ───────────────────────────────────────────────
-- Everything the ambassador dashboard needs about *itself*, in one round
-- trip. security_invoker keeps the caller's RLS in force, so this view can
-- be read directly by the browser without becoming a hole.

create or replace view public.v_ambassador_me
with (security_invoker = true) as
select
  a.id, a.full_name, a.email, a.phone, a.region, a.slug, a.referral_code,
  a.status, a.risk_score, a.monthly_target, a.enrolled_at,

  (select count(*) from public.ambassador_leads l
    where l.ambassador_id = a.id and l.status = 'claimed')                       as leads_open,
  (select count(*) from public.ambassador_leads l
    where l.ambassador_id = a.id and l.status in ('signed_up','listed','earning')) as leads_converted,
  (select count(*) from public.ambassador_leads l
    where l.ambassador_id = a.id and l.status = 'earning')                        as leads_earning,
  (select count(*) from public.ambassador_leads l
    where l.ambassador_id = a.id and l.status in ('signed_up','listed','earning')
      and l.converted_at > date_trunc('month', now()))                            as converted_this_month,

  coalesce((select sum(e.commission_kes) from public.referral_earnings e
             where e.referrer_id = a.id and e.status <> 'reversed'), 0)           as earned_total,
  coalesce((select sum(e.commission_kes) from public.referral_earnings e
             where e.referrer_id = a.id and e.status <> 'reversed'
               and coalesce(e.available_at, e.created_at) <= now()), 0)           as earned_available,
  coalesce((select sum(e.commission_kes) from public.referral_earnings e
             where e.referrer_id = a.id and e.status <> 'reversed'
               and coalesce(e.available_at, e.created_at) > now()), 0)            as earned_pending
from public.ambassadors a
where a.id = auth.uid();

grant select on public.v_ambassador_me to authenticated;
