-- ══════════════════════════════════════════════════════════════════════════
-- CABANA · OWNERSHIP ROLES & PAYOUT ROUTING
-- supabase/migrations/20260904120000_ownership_roles_and_payout_routing.sql
--
-- THE GAPS THIS FILLS
-- ───────────────────
-- The original model supports three ownership SHAPES (sole, partnership,
-- on_behalf) and two roles inside a partnership (operator, partner). Reality
-- has turned up cases that do not fit:
--
--   THE MANAGER/SUPERVISOR PROBLEM
--   ───────────────────────────────
--   A property management company looks after 40 apartments for 30 owners.
--   The manager did not and cannot own any of those properties, but they
--   need full operational access: they update prices, handle guests, manage
--   calendar. Under the old model they can only be listed as a "partner",
--   which implies equity they do not have and misleads every earnings view
--   they open.
--
--   Roles added: 'manager' (full operational access, zero equity stake;
--   the right model for property management companies, Airbnb co-hosts,
--   and caretakers), 'viewer' (read-only access for accountants, investors,
--   silent supervisors who need visibility but should touch nothing).
--
--   The equity check is unchanged: only 'operator' and 'partner' rows are
--   included in the equity sum. A manager or viewer row never has equity_bps
--   above zero — the database enforces this, not the browser.
--
--   THE PAYOUT ROUTING PROBLEM
--   ──────────────────────────
--   Two people co-own a listing. Where does the money go?
--
--   Option A — CONSOLIDATED
--   Money goes to one account (the operator's by default, or a nominated
--   partner). They receive the full payout and divide it however they like
--   offline. This is what happens today, implicitly, because the whole
--   booking sits on the operator's account. Making it explicit and declared
--   closes the future dispute ("you said the money would come to me").
--
--   Option B — SPLIT
--   The platform divides every payout at the moment it is released, crediting
--   each partner's wallet in the ratio of their equity_bps. Nobody has to
--   trust a partner to forward their share because the share never touches
--   that partner's hands. Each person's wallet page shows their cut, dated,
--   with the booking reference it came from.
--
--   Both options must be declared, not assumed. An undeclared payout routing
--   is a future dispute.
--
-- THE SCHEMA
-- ──────────
-- listings.payout_routing   → 'consolidated' | 'split'   (default: consolidated)
-- listings.payout_to_id     → uuid (profiles.id)
--   Who the consolidated payout goes to. Defaults to the operator.
--   Only meaningful when payout_routing = 'consolidated'.
--   On routing change this is set to the operator and stays there until
--   the partnership explicitly overrides it.
--
-- listing_partners.role     → extended to include 'manager' | 'viewer'
--   Enforced: manager and viewer rows must have equity_bps = 0.
--
-- listing_partners.manages_payouts  → boolean default false
--   Only one manager may have this flag. The flag means the manager can
--   approve payout release on behalf of the operator. It cannot be set
--   on a partner/viewer row — only a manager row.
--
-- listing_payout_splits     → ledger of every split action
--   Created when a booking settles under 'split' routing. One row per
--   partner. Feeds the per-partner wallet view without a join to bookings.
--
-- Idempotent and additive. Safe to re-run.
-- ══════════════════════════════════════════════════════════════════════════


-- ── 1 · EXTEND ROLE ENUM ─────────────────────────────────────────────────
-- The check constraint on listing_partners.role must be recreated. We drop
-- it and re-add it with the two new values.

do $$
begin
  alter table public.listing_partners
    drop constraint if exists listing_partners_role_check;
exception when others then null;
end $$;

alter table public.listing_partners
  add constraint listing_partners_role_check
  check (role in ('operator', 'partner', 'manager', 'viewer'));

comment on column public.listing_partners.role is
  'operator   – the primary account holder. One per listing, always. Has equity.
partner    – co-owner with declared equity. Receives split payouts when routing=split.
manager    – operational access, zero equity. Right model for property managers,
             co-hosts, caretakers. Can be granted payout-approval rights via manages_payouts.
viewer     – read-only. For accountants, investors, silent supervisors.';


-- ── 2 · ENFORCE ZERO EQUITY FOR MANAGERS AND VIEWERS ─────────────────────

do $$
begin
  alter table public.listing_partners
    drop constraint if exists lpartners_nonowner_no_equity;
exception when others then null;
end $$;

alter table public.listing_partners
  add constraint lpartners_nonowner_no_equity
  check (
    role in ('operator', 'partner')
    or equity_bps = 0
  );

comment on constraint lpartners_nonowner_no_equity on public.listing_partners is
  'Managers and viewers cannot hold equity. Their equity_bps must be zero.';


-- ── 3 · PAYOUT-APPROVAL DELEGATION ───────────────────────────────────────

alter table public.listing_partners
  add column if not exists manages_payouts boolean not null default false;

do $$
begin
  alter table public.listing_partners
    drop constraint if exists lpartners_manages_payouts_only_manager;
exception when others then null;
end $$;

alter table public.listing_partners
  add constraint lpartners_manages_payouts_only_manager
  check (
    not manages_payouts or role = 'manager'
  );

-- At most one manager per listing holds manages_payouts. A partial unique
-- index enforces this without a trigger.
create unique index if not exists uq_lpartners_payout_manager
  on public.listing_partners (listing_id)
  where manages_payouts = true and status not in ('removed', 'declined');

comment on column public.listing_partners.manages_payouts is
  'Only one manager per listing may hold this flag. When true, this manager can
   trigger payout release from their own dashboard, acting on behalf of the operator.
   Never set on partner or viewer rows — the constraint above enforces this.';


-- ── 4 · PAYOUT ROUTING ON LISTINGS ───────────────────────────────────────

alter table public.listings
  add column if not exists payout_routing text not null default 'consolidated',
  add column if not exists payout_to_id   uuid references auth.users (id) on delete set null,
  add column if not exists payout_routing_declared_at timestamptz;

do $$
begin
  alter table public.listings
    drop constraint if exists listings_payout_routing_chk;
exception when others then null;
end $$;

alter table public.listings
  add constraint listings_payout_routing_chk
  check (payout_routing in ('consolidated', 'split'));

comment on column public.listings.payout_routing is
  'consolidated – every payout goes to payout_to_id (or the operator if null).
                  Partners divide amongst themselves outside the platform.
split        – the platform credits each partner''s wallet in proportion to
               their equity_bps at the moment a booking settles. No money
               passes through any other partner''s hands.';

comment on column public.listings.payout_to_id is
  'The single recipient in consolidated mode. Must be a partner or the operator.
   Null means the operator receives. Only honoured when payout_routing = consolidated.';

comment on column public.listings.payout_routing_declared_at is
  'When the partnership last agreed on a routing decision. Surfaced in the audit log.';


-- ── 5 · SPLIT PAYOUT LEDGER ───────────────────────────────────────────────
-- One row per partner per settled booking when payout_routing = 'split'.
-- Immutable after creation: a payout line is a fact, not a calculation.

create table if not exists public.listing_payout_splits (
  id              uuid primary key default gen_random_uuid(),
  listing_id      uuid not null references public.listings (id) on delete cascade,
  booking_id      uuid not null,                       -- apartment_bookings.id (no FK across table sets)
  booking_ref     text,                                -- human-readable ref for receipts
  partner_id      uuid not null references auth.users (id) on delete restrict,
  partner_name    text not null,
  equity_bps      integer not null check (equity_bps between 1 and 10000),
  gross_payout    numeric(12,2) not null,              -- total payout for the booking
  partner_amount  numeric(12,2) not null,              -- gross_payout × equity_bps / 10000
  currency        text not null default 'KES',
  created_at      timestamptz not null default now(),
  -- A split is created once and never updated. The source of truth is the
  -- booking and the equity at settlement time — not what equity is today.
  constraint lps_positive_amounts check (gross_payout > 0 and partner_amount > 0)
);

create index if not exists idx_lps_listing   on public.listing_payout_splits (listing_id);
create index if not exists idx_lps_partner   on public.listing_payout_splits (partner_id);
create index if not exists idx_lps_booking   on public.listing_payout_splits (booking_id);
create unique index if not exists uq_lps_booking_partner
  on public.listing_payout_splits (booking_id, partner_id);

comment on table public.listing_payout_splits is
  'Immutable ledger of per-partner payout credits generated when a booking settles
   under split routing. Each row is a fact stamped at settlement time; equity changes
   after settlement do not retroactively alter past rows.';


-- ── 6 · VIEW: v_listing_ownership (extend existing) ───────────────────────
-- Widen the view to expose payout_routing, payout_to_id, and the new roles.

create or replace view public.v_listing_ownership as
select
  l.id                           as listing_id,
  l.title,
  l.ownership_type,
  l.equity_split,
  l.held_for_name,
  l.held_for_contact,
  l.activate_on_claim,
  l.payout_routing,
  l.payout_to_id,
  l.payout_routing_declared_at,
  l.ownership_declared_at,
  l.partner_id                   as operator_id,
  -- summarise partners for quick display
  (select count(*) from public.listing_partners p2
    where p2.listing_id = l.id and p2.status not in ('removed','declined')
      and p2.role in ('operator','partner'))                as partner_count,
  (select count(*) from public.listing_partners p2
    where p2.listing_id = l.id and p2.status not in ('removed','declined')
      and p2.role = 'manager')                             as manager_count,
  (select count(*) from public.listing_partners p2
    where p2.listing_id = l.id and p2.status not in ('removed','declined')
      and p2.role = 'viewer')                              as viewer_count,
  -- pending transfer
  (select t.id from public.listing_transfers t
    where t.listing_id = l.id and t.status = 'pending'
    order by t.created_at desc limit 1)                    as pending_transfer_id,
  (select t.to_name from public.listing_transfers t
    where t.listing_id = l.id and t.status = 'pending'
    order by t.created_at desc limit 1)                    as pending_transfer_to,
  -- who consolidates to, resolved
  coalesce(
    (select pr.full_name from public.profiles pr where pr.id = l.payout_to_id),
    (select pr.full_name from public.profiles pr where pr.id = l.partner_id)
  )                                                        as payout_to_name,
  -- all seats as JSON
  (select coalesce(jsonb_agg(jsonb_build_object(
              'id',           p.id,
              'user_id',      p.user_id,
              'name',         p.full_name,
              'contact',      p.contact,
              'role',         p.role,
              'status',       p.status,
              'equity_bps',   p.equity_bps,
              'equity_pct',   round(p.equity_bps / 100.0, 2),
              'manages_payouts', p.manages_payouts,
              'has_account',  p.user_id is not null
            ) order by
              (p.role = 'operator') desc,
              (p.role = 'partner')  desc,
              (p.role = 'manager')  desc,
              p.full_name
          ), '[]'::jsonb)
    from public.listing_partners p
    where p.listing_id = l.id and p.status not in ('removed','declined')
  )                                                        as seats
from public.listings l;

comment on view public.v_listing_ownership is
  'Complete ownership picture for a listing: shape, seats with roles (including managers
   and viewers), payout routing decision, and any pending transfer. Read by every screen
   that renders ownership state. RLS on listings is the access gate; this view adds no
   extra filtering.';


-- ── 7 · RPC: listing_set_payout_routing ──────────────────────────────────
-- The operator (or a manager with manages_payouts) declares how a partnership
-- pays out. Called by the payout settings screen.

create or replace function public.listing_set_payout_routing(
  p_listing_id uuid,
  p_routing    text,             -- 'consolidated' | 'split'
  p_to_id      uuid  default null -- only for 'consolidated'; null → operator
) returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, extensions
as $$
declare
  v_uid     uuid := auth.uid();
  v_listing public.listings%rowtype;
  v_to_id   uuid;
begin
  if v_uid is null then
    raise exception 'Sign in first' using errcode = '42501';
  end if;

  select * into v_listing from public.listings where id = p_listing_id;
  if not found then
    raise exception 'That listing does not exist' using errcode = 'P0002';
  end if;

  -- Only operator OR a manager with manages_payouts may change routing
  if v_listing.partner_id is distinct from v_uid then
    if not exists (
      select 1 from public.listing_partners
       where listing_id = p_listing_id
         and user_id = v_uid
         and role = 'manager'
         and manages_payouts = true
         and status = 'active'
    ) and not public.is_operator() then
      raise exception 'Only the operator or the delegated payout manager may change payout routing'
        using errcode = '42501';
    end if;
  end if;

  if p_routing not in ('consolidated', 'split') then
    raise exception 'Payout routing must be "consolidated" or "split"'
      using errcode = '22023';
  end if;

  -- For 'split' mode, listing must be a partnership with declared equity
  if p_routing = 'split' then
    if v_listing.ownership_type <> 'partnership' then
      raise exception 'Split payouts are only available for partnership listings. '\
        'Declare partners and their equity first.'
        using errcode = '22023';
    end if;
    -- Must have at least one non-operator active partner with equity
    if not exists (
      select 1 from public.listing_partners
       where listing_id = p_listing_id
         and role = 'partner'
         and status = 'active'
         and equity_bps > 0
    ) then
      raise exception 'Add at least one partner with a confirmed equity share before enabling split payouts.'
        using errcode = '22023';
    end if;
  end if;

  -- Validate payout_to_id for consolidated mode
  if p_routing = 'consolidated' and p_to_id is not null then
    -- Must be the operator or an active partner with equity
    if p_to_id <> v_listing.partner_id then
      if not exists (
        select 1 from public.listing_partners
         where listing_id = p_listing_id
           and user_id = p_to_id
           and role in ('operator','partner')
           and status = 'active'
      ) then
        raise exception 'The consolidated payout recipient must be the operator or an active partner'
          using errcode = '22023';
      end if;
    end if;
    v_to_id := p_to_id;
  elsif p_routing = 'consolidated' then
    -- Default to operator
    v_to_id := v_listing.partner_id;
  else
    -- Split mode: payout_to_id is unused
    v_to_id := null;
  end if;

  update public.listings
     set payout_routing              = p_routing,
         payout_to_id                = v_to_id,
         payout_routing_declared_at  = now()
   where id = p_listing_id;

  return jsonb_build_object(
    'ok',      true,
    'routing', p_routing,
    'to_id',   v_to_id,
    'to_name', (
      select pr.full_name from public.profiles pr where pr.id = v_to_id
    )
  );
end;
$$;

revoke all on function public.listing_set_payout_routing(uuid, text, uuid) from public, anon;
grant execute on function public.listing_set_payout_routing(uuid, text, uuid) to authenticated;

comment on function public.listing_set_payout_routing(uuid, text, uuid) is
  'Set how a partnership listing distributes payouts: consolidated (one nominated recipient)
   or split (the platform credits each partner proportionally at settlement). Only the
   operator or a manager with manages_payouts may call this.';


-- ── 8 · RPC: listing_add_seat ────────────────────────────────────────────
-- Unified way to add a manager, viewer, or extra partner (as opposed to the
-- full re-declare that listing_declare_ownership performs). Allows adding
-- a manager or viewer to ANY listing type — not just partnerships — because
-- a sole operator can still have a property manager.

create or replace function public.listing_add_seat(
  p_listing_id    uuid,
  p_name          text,
  p_contact       text,
  p_role          text,            -- 'manager' | 'viewer' | 'partner'
  p_equity_pct    numeric default 0,
  p_manages_payouts boolean default false,
  p_note          text default null
) returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, extensions
as $$
declare
  v_uid     uuid := auth.uid();
  v_listing public.listings%rowtype;
  v_bps     integer;
  v_seat_id uuid;
  v_user_id uuid;
begin
  if v_uid is null then
    raise exception 'Sign in first' using errcode = '42501';
  end if;

  select * into v_listing from public.listings where id = p_listing_id;
  if not found then
    raise exception 'That listing does not exist' using errcode = 'P0002';
  end if;

  -- Only operator (or admin) may add seats
  if v_listing.partner_id is distinct from v_uid and not public.is_operator() then
    raise exception 'Only the listing operator may add a seat' using errcode = '42501';
  end if;

  -- Role validation
  if p_role not in ('manager', 'viewer', 'partner') then
    raise exception 'Role must be "manager", "viewer", or "partner"' using errcode = '22023';
  end if;

  -- Contact must be email
  if not public.cabana_is_email(p_contact) then
    raise exception 'Give their email address. Invitations are sent by email.'
      using errcode = '22023';
  end if;

  -- Cannot add yourself
  if public.cabana_norm_contact(p_contact) =
     public.cabana_norm_contact((select email::text from auth.users where id = v_uid)) then
    raise exception 'You are already on this listing as the operator.' using errcode = '22023';
  end if;

  -- Non-owner roles cannot have equity
  if p_role in ('manager', 'viewer') then
    if p_equity_pct <> 0 then
      raise exception 'Managers and viewers cannot hold an equity share. Use the "partner" role for co-owners.'
        using errcode = '22023';
    end if;
    v_bps := 0;
  else
    -- partner: equity is optional here (they can be added without finalising equity)
    v_bps := round(coalesce(p_equity_pct, 0) * 100)::integer;
    if v_bps < 0 or v_bps > 9999 then
      raise exception 'Equity must be between 0% and 99.99%' using errcode = '22023';
    end if;
  end if;

  -- manages_payouts only on manager seats
  if p_manages_payouts and p_role <> 'manager' then
    raise exception 'Payout management rights can only be granted to a manager seat.'
      using errcode = '22023';
  end if;

  -- Resolve account if it exists
  select id into v_user_id from auth.users
   where public.cabana_norm_contact(email::text) = public.cabana_norm_contact(p_contact)
   limit 1;

  insert into public.listing_partners
    (listing_id, user_id, full_name, contact, contact_norm,
     equity_bps, role, status, manages_payouts, invited_by)
  values
    (p_listing_id, v_user_id, btrim(p_name), lower(btrim(p_contact)),
     public.cabana_norm_contact(p_contact),
     v_bps, p_role, 'invited', p_manages_payouts, v_uid)
  returning id into v_seat_id;

  return jsonb_build_object(
    'ok',       true,
    'seat_id',  v_seat_id,
    'role',     p_role,
    'name',     btrim(p_name),
    'contact',  lower(btrim(p_contact)),
    'has_account', v_user_id is not null,
    'manages_payouts', p_manages_payouts
  );
end;
$$;

revoke all on function public.listing_add_seat(uuid, text, text, text, numeric, boolean, text) from public, anon;
grant execute on function public.listing_add_seat(uuid, text, text, text, numeric, boolean, text) to authenticated;

comment on function public.listing_add_seat(uuid, text, text, text, numeric, boolean, text) is
  'Add a manager, viewer, or additional partner to any listing. Managers and viewers carry
   zero equity; a manager may optionally be granted payout-approval rights. Separate from
   listing_declare_ownership, which rebuilds the full partner set for ownership declaration.';


-- ── 9 · RPC: listing_record_split_payout ─────────────────────────────────
-- Called by the payout job after a booking settles under split routing.
-- Creates immutable ledger rows for each active partner.

create or replace function public.listing_record_split_payout(
  p_listing_id uuid,
  p_booking_id uuid,
  p_booking_ref text,
  p_gross_payout numeric,
  p_currency text default 'KES'
) returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, extensions
as $$
declare
  v_listing      public.listings%rowtype;
  v_partner      record;
  v_amount       numeric;
  v_rows_created integer := 0;
  v_total_bps    integer := 0;
begin
  -- Only callable by service role / internal jobs
  if not public.is_operator() then
    raise exception 'Service use only' using errcode = '42501';
  end if;

  select * into v_listing from public.listings where id = p_listing_id;
  if not found then
    raise exception 'Listing not found' using errcode = 'P0002';
  end if;

  if v_listing.payout_routing <> 'split' then
    raise exception 'This listing uses consolidated payouts, not split' using errcode = '22023';
  end if;

  if p_gross_payout <= 0 then
    raise exception 'Payout amount must be positive' using errcode = '22023';
  end if;

  -- Idempotent: skip if already recorded for this booking
  if exists (select 1 from public.listing_payout_splits where booking_id = p_booking_id) then
    return jsonb_build_object('ok', true, 'skipped', true,
      'reason', 'Split already recorded for this booking');
  end if;

  -- Sum live equity to validate it covers 100%
  select sum(equity_bps) into v_total_bps
    from public.listing_partners
   where listing_id = p_listing_id
     and status = 'active'
     and role in ('operator', 'partner');

  if v_total_bps <> 10000 then
    raise exception 'Equity shares sum to % basis points, not 10000. Fix the partnership before releasing split payouts.',
      v_total_bps using errcode = '22023';
  end if;

  -- Create one row per equity-holding seat
  for v_partner in
    select lp.user_id, lp.full_name, lp.equity_bps
      from public.listing_partners lp
     where lp.listing_id = p_listing_id
       and lp.status = 'active'
       and lp.role in ('operator', 'partner')
       and lp.user_id is not null   -- must have an account to receive a wallet credit
     order by lp.role desc, lp.full_name
  loop
    v_amount := round((p_gross_payout * v_partner.equity_bps / 10000.0)::numeric, 2);
    insert into public.listing_payout_splits
      (listing_id, booking_id, booking_ref, partner_id, partner_name,
       equity_bps, gross_payout, partner_amount, currency)
    values
      (p_listing_id, p_booking_id, p_booking_ref, v_partner.user_id,
       v_partner.full_name, v_partner.equity_bps, p_gross_payout, v_amount, p_currency);

    v_rows_created := v_rows_created + 1;
  end loop;

  return jsonb_build_object(
    'ok',           true,
    'rows_created', v_rows_created,
    'gross',        p_gross_payout,
    'currency',     p_currency
  );
end;
$$;

revoke all on function public.listing_record_split_payout(uuid, uuid, text, numeric, text) from public, anon;
-- granted to service_role only; authenticated users cannot call this

comment on function public.listing_record_split_payout(uuid, uuid, text, numeric, text) is
  'Service-only. Writes the per-partner split ledger when a booking settles under
   split routing. Idempotent. Validates equity sums to 100% before creating any row.';


-- ── 10 · GRANTS ON NEW TABLE ──────────────────────────────────────────────
-- authenticated users read their own split rows; nobody writes

alter table public.listing_payout_splits enable row level security;

do $$
begin
  drop policy if exists "partners see their own splits" on public.listing_payout_splits;
exception when others then null;
end $$;

create policy "partners see their own splits"
  on public.listing_payout_splits
  for select
  to authenticated
  using (partner_id = auth.uid());

-- Operators can see all splits for their listing
do $$
begin
  drop policy if exists "operators see listing splits" on public.listing_payout_splits;
exception when others then null;
end $$;

create policy "operators see listing splits"
  on public.listing_payout_splits
  for select
  to authenticated
  using (
    listing_id in (
      select id from public.listings where partner_id = auth.uid()
    )
  );

comment on table public.listing_payout_splits is
  'Immutable split payout ledger. RLS: partners see their own rows; operators see all rows for their listing.';
