-- ══════════════════════════════════════════════════════════════════════════
-- CABANA · WHO A LISTING BELONGS TO
-- supabase/migrations/20260820100000_listing_ownership_and_transfers.sql
--
-- THE PROBLEM THIS FIXES
-- ──────────────────────
-- `listings.partner_id` was the whole ownership model: one column, one
-- person, forever. Reality is not like that, and every gap cost us a real
-- listing:
--
--   · Two brothers run a block of flats together. One signs up, both work
--     it, and there is no way to say so — so the other has no login, no
--     bookings, and no claim on the money.
--   · A manager lists ten units for an owner who will never open the app.
--     The listings sit under the manager's account. When the manager leaves,
--     the owner loses ten live listings and every future booking on them.
--   · An ambassador or an agent onboards someone in the field. The form has
--     to be filled in by SOMEBODY, and whoever fills it in becomes the owner
--     of a property they do not own.
--   · A host sells the building. There has never been a way to hand the
--     listing over, so people delete and re-create — losing the reviews, the
--     ranking and the calendar.
--
-- THE MODEL
-- ─────────
-- Every listing declares what it IS, in one of three shapes:
--
--   sole         one person operates and manages it. The default, and by
--                far the most common. partner_id is the whole story.
--
--   partnership  several people co-own it. partner_id remains the ACCOUNT
--                the listing hangs off — somebody has to hold the calendar
--                and answer the guest — and listing_partners records who
--                else is in it and for what share. Equal split is computed,
--                never typed, because four people typing 25% each is four
--                chances to make it 99%.
--
--   on_behalf    the person filling in the form is not the owner. The
--                listing is held FOR a named person and hands over to them
--                the moment they claim it. Until then it is a custodianship,
--                not a possession, and it says so on every screen.
--
-- Handover is one mechanism, used by all of it: `listing_transfers`. A
-- transfer names a recipient by email or phone, waits, and on acceptance
-- moves partner_id and host_id atomically. Whoever held it loses it in the
-- same statement. There is no window in which two people own one listing.
--
-- THINGS THAT ARE DELIBERATE
-- ──────────────────────────
-- · A transfer is claimed by the RECIPIENT, never pushed by the sender.
--   Moving a listing onto somebody's account without their consent makes
--   them liable for a property they have never seen.
--
-- · Equity is validated in the database, not the browser. Shares that sum
--   to 97% are a dispute in eleven months' time, and the browser is the one
--   participant in this system that an interested party controls.
--
-- · Nothing here is a delete. A completed transfer keeps both sides, so
--   "who owned this listing when that booking was taken" stays answerable
--   for as long as the booking is.
--
-- · A co-owner who has no Cabana account is still recorded, by name and
--   contact. Waiting for someone to sign up before acknowledging their half
--   of a building is how you lose the building.
--
-- Idempotent and additive. Safe to re-run.
-- ══════════════════════════════════════════════════════════════════════════

-- ── 1 · WHAT A LISTING IS ─────────────────────────────────────────────────

alter table public.listings
  add column if not exists ownership_type text not null default 'sole',
  add column if not exists ownership_declared_at timestamptz,
  add column if not exists equity_split text,
  -- Who actually filled the form in. Distinct from who owns the result, and
  -- that distinction is the entire point of on_behalf. Never used for
  -- permissions; kept so an onboarding can be credited and audited.
  add column if not exists created_by uuid references auth.users (id) on delete set null,
  add column if not exists created_by_role text,
  -- Set while a listing is held for someone who has not claimed it yet.
  add column if not exists held_for_name text,
  add column if not exists held_for_contact text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'listings_ownership_type_chk'
  ) then
    alter table public.listings
      add constraint listings_ownership_type_chk
      check (ownership_type in ('sole','partnership','on_behalf'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'listings_equity_split_chk'
  ) then
    alter table public.listings
      add constraint listings_equity_split_chk
      check (equity_split is null or equity_split in ('equal','custom'));
  end if;
end $$;

comment on column public.listings.ownership_type is
  'sole | partnership | on_behalf. Declared by the person listing. partner_id remains the operating account in every case; this says what that account represents.';
comment on column public.listings.created_by is
  'Who filled the form in. An ambassador or agent onboarding a host is not that host, and permissions never read this column.';
comment on column public.listings.held_for_name is
  'Set while an on_behalf listing is waiting to be claimed. Cleared by listing_transfer_accept().';

-- Whether this listing goes live the moment its owner claims it.
--
-- An ambassador or an agent sitting with a host does all the work of a
-- listing: photos, price, description, the lot. Publishing that before the
-- host has agreed would put somebody's property, address and phone number on
-- a public website because a third party filled in a form. So an on-behalf
-- listing built in the field is created INACTIVE and activated by the
-- handover — the ambassador does the work, the owner does the publishing.
--
-- This is a listing-level flag rather than a transfer-level one because it
-- describes the listing's state, and because a second transfer of the same
-- listing (the owner later sells the building) must not re-run it.
alter table public.listings
  add column if not exists activate_on_claim boolean not null default false;

comment on column public.listings.activate_on_claim is
  'Set on a listing built for somebody who has not agreed to publish it yet. listing_transfer_accept() clears it and switches the listing on.';

create index if not exists idx_listings_ownership
  on public.listings (ownership_type) where ownership_type <> 'sole';
create index if not exists idx_listings_created_by
  on public.listings (created_by) where created_by is not null;


-- ── 2 · CO-OWNERS ─────────────────────────────────────────────────────────
-- One row per partner in a partnership listing, INCLUDING the operator, so
-- the equity of a listing is one query with no special case for the person
-- whose account it happens to hang off. A partnership whose operator is
-- implicit is a partnership where the operator's share is whatever is left
-- over, and "whatever is left over" is not a number anybody agreed to.

create table if not exists public.listing_partners (
  id              uuid primary key default gen_random_uuid(),
  listing_id      uuid not null references public.listings (id) on delete cascade,

  -- Linked when the partner has an account; null until then. A partner
  -- without a Cabana login is still a partner.
  user_id         uuid references auth.users (id) on delete set null,
  full_name       text not null,
  contact         text,                       -- email or phone, as given
  contact_norm    text,                       -- lowercased / digits, for matching

  -- Basis points, so a three-way equal split is 3333/3333/3334 and sums to
  -- exactly 10000 instead of 99.99%. Percentages are derived for display.
  equity_bps      integer not null default 0
                  check (equity_bps between 0 and 10000),

  role            text not null default 'partner'
                  check (role in ('operator','partner')),

  -- invited  · recorded by the operator, not yet confirmed by the person
  -- active   · confirmed, or the operator themselves
  -- removed  · kept for history; never counted toward equity
  status          text not null default 'invited'
                  check (status in ('invited','active','removed')),

  invited_by      uuid references auth.users (id) on delete set null,
  confirmed_at    timestamptz,
  removed_at      timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists idx_lpartners_listing on public.listing_partners (listing_id, status);
create index if not exists idx_lpartners_user    on public.listing_partners (user_id) where user_id is not null;
create index if not exists idx_lpartners_contact on public.listing_partners (contact_norm) where contact_norm is not null;

-- One live row per person per listing. Prevents the same partner being added
-- twice at 50% each and quietly owning the whole thing.
create unique index if not exists uq_lpartners_live_user
  on public.listing_partners (listing_id, user_id)
  where user_id is not null and status <> 'removed';
create unique index if not exists uq_lpartners_live_contact
  on public.listing_partners (listing_id, contact_norm)
  where contact_norm is not null and status <> 'removed';

comment on table public.listing_partners is
  'Co-owners of a partnership listing, the operator included. Equity in basis points so an equal split sums to exactly 10000.';


-- ── 3 · TRANSFERS ─────────────────────────────────────────────────────────
-- One mechanism for every handover: selling a property, correcting a listing
-- created under the wrong account, and an on_behalf listing reaching the
-- person it was always for.
--
-- The recipient is named by contact, not by user id, because the whole point
-- is that they frequently do not have an account yet. They claim it when
-- they sign up with that address or number.

create table if not exists public.listing_transfers (
  id              uuid primary key default gen_random_uuid(),
  listing_id      uuid not null references public.listings (id) on delete cascade,

  from_user       uuid references auth.users (id) on delete set null,
  to_user         uuid references auth.users (id) on delete set null,   -- set on accept

  to_name         text not null,
  to_contact      text not null,
  to_contact_norm text not null,

  -- on_behalf · created with the listing, by someone listing for another
  -- handover  · an existing owner passing a live listing on
  kind            text not null default 'handover'
                  check (kind in ('on_behalf','handover')),

  note            text,

  status          text not null default 'pending'
                  check (status in ('pending','accepted','declined','cancelled','expired')),

  accepted_at     timestamptz,
  declined_at     timestamptz,
  cancelled_at    timestamptz,
  -- A pending transfer is a listing in limbo. It should not stay there
  -- forever, and an expiry that the sender can see is kinder than one they
  -- cannot.
  expires_at      timestamptz not null default (now() + interval '90 days'),
  created_at      timestamptz not null default now()
);

create index if not exists idx_ltransfers_listing on public.listing_transfers (listing_id, status);
create index if not exists idx_ltransfers_from    on public.listing_transfers (from_user, status);
create index if not exists idx_ltransfers_to      on public.listing_transfers (to_contact_norm, status);

-- At most one live transfer per listing. Two pending transfers on one
-- listing is a race that ends with the wrong person owning a building.
create unique index if not exists uq_ltransfers_one_live
  on public.listing_transfers (listing_id)
  where status = 'pending';

comment on table public.listing_transfers is
  'Handover of a listing to a named recipient. Claimed by the recipient, never pushed by the sender: moving a property onto an account without consent makes that person liable for it.';


-- ── 4 · CONTACT NORMALISATION ─────────────────────────────────────────────
-- The same rule everywhere, so "+254 712 345 678" typed by an operator and
-- "0712345678" typed by the recipient at sign-up are the same person. If
-- these two ever diverge, a transfer becomes unclaimable and the listing is
-- stranded with nobody able to reach it.

create or replace function public.cabana_norm_contact(p_contact text)
returns text
language sql
immutable
set search_path = pg_catalog, public
as $$
  select case
    when p_contact is null or btrim(p_contact) = '' then null
    when position('@' in p_contact) > 0 then lower(btrim(p_contact))
    else
      -- last 9 digits: strips +254 / 254 / 0 prefixes without knowing them
      right(regexp_replace(p_contact, '[^0-9]', '', 'g'), 9)
  end;
$$;

comment on function public.cabana_norm_contact(text) is
  'One normalisation rule for matching a person by email or phone. Emails lowercase; phones reduced to their last 9 digits so local and international forms match.';


-- ── 5 · DECLARING OWNERSHIP ───────────────────────────────────────────────
-- Called when a listing is created and whenever the operator changes their
-- mind. Rewrites the co-owner set in one statement so the listing can never
-- be observed half-declared.
--
-- p_partners is [{ name, contact, equity_pct }]. The operator is added
-- automatically as the first partner and does not appear in the array —
-- forgetting to include yourself in your own partnership should not be
-- possible.

create or replace function public.listing_declare_ownership(
  p_listing_id  uuid,
  p_type        text,
  p_split       text    default null,     -- 'equal' | 'custom'
  p_partners    jsonb   default '[]'::jsonb,
  p_holder_name text    default null,     -- on_behalf: who it is really for
  p_holder_contact text default null,
  p_note        text    default null
) returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, extensions
as $$
declare
  v_uid       uuid := auth.uid();
  v_listing   public.listings%rowtype;
  v_split     text;
  v_count     integer;
  v_each      integer;
  v_remainder integer;
  v_sum       integer := 0;
  v_i         integer := 0;
  v_partner   jsonb;
  v_name      text;
  v_contact   text;
  v_bps       integer;
  v_transfer  uuid;
begin
  if v_uid is null then
    raise exception 'Sign in first' using errcode = '42501';
  end if;

  select * into v_listing from public.listings where id = p_listing_id;
  if not found then
    raise exception 'That listing does not exist' using errcode = 'P0002';
  end if;

  -- Only the operating account may say what the listing is. Not a co-owner:
  -- a 10% partner redeclaring the listing as sole and theirs is the exact
  -- attack this check exists for.
  if v_listing.partner_id is distinct from v_uid and not public.is_operator() then
    raise exception 'That is not your listing' using errcode = '42501';
  end if;

  if p_type not in ('sole','partnership','on_behalf') then
    raise exception 'Unknown ownership type' using errcode = '22023';
  end if;

  -- A listing already handed over cannot be redeclared by its previous
  -- holder, and a listing with a live transfer must settle that first. An
  -- EXPIRED transfer is not a live one, so it is settled rather than obeyed.
  perform public.listing_transfers_expire(p_listing_id);

  if exists (select 1 from public.listing_transfers
              where listing_id = p_listing_id and status = 'pending') then
    raise exception 'This listing has a transfer waiting. Cancel it first.'
      using errcode = '22023';
  end if;

  -- ── sole ────────────────────────────────────────────────────────────
  if p_type = 'sole' then
    update public.listing_partners
       set status = 'removed', removed_at = now(), updated_at = now()
     where listing_id = p_listing_id and status <> 'removed';

    update public.listings
       set ownership_type = 'sole',
           equity_split = null,
           held_for_name = null,
           held_for_contact = null,
           ownership_declared_at = now()
     where id = p_listing_id;

    return jsonb_build_object('ok', true, 'ownership_type', 'sole');
  end if;

  -- ── on_behalf ───────────────────────────────────────────────────────
  -- The listing is not the caller's. It is held for someone, and a pending
  -- transfer to that someone is created in the same statement — the hold
  -- and the way out of the hold are one thing, so a listing can never be
  -- marked "for someone else" with no route to reach them.
  if p_type = 'on_behalf' then
    if coalesce(btrim(p_holder_name), '') = '' or coalesce(btrim(p_holder_contact), '') = '' then
      raise exception 'Who is this listing for? Give a name and a contact.'
        using errcode = '22023';
    end if;
    if public.cabana_norm_contact(p_holder_contact) is null then
      raise exception 'That contact does not look like an email address or a phone number'
        using errcode = '22023';
    end if;

    update public.listing_partners
       set status = 'removed', removed_at = now(), updated_at = now()
     where listing_id = p_listing_id and status <> 'removed';

    update public.listings
       set ownership_type = 'on_behalf',
           equity_split = null,
           held_for_name = btrim(p_holder_name),
           held_for_contact = btrim(p_holder_contact),
           ownership_declared_at = now()
     where id = p_listing_id;

    insert into public.listing_transfers
      (listing_id, from_user, to_name, to_contact, to_contact_norm, kind, note)
    values
      (p_listing_id, v_uid, btrim(p_holder_name), btrim(p_holder_contact),
       public.cabana_norm_contact(p_holder_contact), 'on_behalf', p_note)
    returning id into v_transfer;

    return jsonb_build_object('ok', true, 'ownership_type', 'on_behalf',
                              'transfer_id', v_transfer);
  end if;

  -- ── partnership ─────────────────────────────────────────────────────
  v_split := coalesce(p_split, 'equal');
  if v_split not in ('equal','custom') then
    raise exception 'A split is either equal or custom' using errcode = '22023';
  end if;

  v_count := coalesce(jsonb_array_length(p_partners), 0);
  if v_count < 1 then
    raise exception 'A partnership needs at least one other partner. On your own, it is a sole listing.'
      using errcode = '22023';
  end if;
  if v_count > 19 then
    raise exception 'That is more partners than this supports. Talk to us.'
      using errcode = '22023';
  end if;

  update public.listing_partners
     set status = 'removed', removed_at = now(), updated_at = now()
   where listing_id = p_listing_id and status <> 'removed';

  -- Equal split: computed, never typed. v_count + 1 because the operator is
  -- in the partnership too. The remainder goes to the operator rather than
  -- being dropped, so the shares sum to exactly 10000 basis points.
  if v_split = 'equal' then
    v_each      := 10000 / (v_count + 1);
    v_remainder := 10000 - (v_each * (v_count + 1));
  end if;

  insert into public.listing_partners
    (listing_id, user_id, full_name, contact, contact_norm, equity_bps, role, status,
     invited_by, confirmed_at)
  values
    (p_listing_id, v_uid,
     coalesce((select full_name from public.profiles where id = v_uid), 'Operator'),
     null, null,
     case when v_split = 'equal' then v_each + v_remainder else 0 end,
     'operator', 'active', v_uid, now());

  for v_i in 0 .. v_count - 1 loop
    v_partner := p_partners -> v_i;
    v_name    := btrim(coalesce(v_partner ->> 'name', ''));
    v_contact := btrim(coalesce(v_partner ->> 'contact', ''));

    if v_name = '' then
      raise exception 'Every partner needs a name' using errcode = '22023';
    end if;
    if v_contact = '' or public.cabana_norm_contact(v_contact) is null then
      raise exception 'Every partner needs an email address or a phone number'
        using errcode = '22023';
    end if;
    -- You are already in your own partnership, as the operator. Adding
    -- yourself again would trip a unique index with an unreadable message
    -- and, on a custom split, would double-count your share.
    if public.cabana_norm_contact(v_contact) = public.cabana_norm_contact(
         (select email from auth.users where id = v_uid)) then
      raise exception 'You are already in this partnership as the operator. Add the OTHER partners.'
        using errcode = '22023';
    end if;

    if v_split = 'equal' then
      v_bps := v_each;
    else
      -- Percentages arrive with up to two decimals; basis points hold that
      -- exactly, which is why they are the unit here.
      v_bps := round(coalesce((v_partner ->> 'equity_pct')::numeric, 0) * 100)::integer;
      if v_bps <= 0 then
        raise exception 'Give % a share above zero, or leave them out.', v_name
          using errcode = '22023';
      end if;
      v_sum := v_sum + v_bps;
    end if;

    insert into public.listing_partners
      (listing_id, user_id, full_name, contact, contact_norm, equity_bps, role,
       status, invited_by)
    values
      (p_listing_id,
       (select u.id from auth.users u
         where public.cabana_norm_contact(u.email) = public.cabana_norm_contact(v_contact)
         limit 1),
       v_name, v_contact, public.cabana_norm_contact(v_contact),
       v_bps, 'partner', 'invited', v_uid);
  end loop;

  -- Custom splits are checked AFTER the loop so the operator's share is
  -- whatever is left — but only if that leaves them something. Shares that
  -- total 97% or 104% are a dispute in eleven months, and the browser is
  -- the one participant here that an interested party controls.
  if v_split = 'custom' then
    if v_sum >= 10000 then
      raise exception 'Those shares come to % percent, leaving nothing for you. They must total under 100.',
        round(v_sum / 100.0, 2) using errcode = '22023';
    end if;
    update public.listing_partners
       set equity_bps = 10000 - v_sum, updated_at = now()
     where listing_id = p_listing_id and role = 'operator' and status = 'active';
  end if;

  update public.listings
     set ownership_type = 'partnership',
         equity_split = v_split,
         held_for_name = null,
         held_for_contact = null,
         ownership_declared_at = now()
   where id = p_listing_id;

  return jsonb_build_object(
    'ok', true,
    'ownership_type', 'partnership',
    'split', v_split,
    'partners', (select coalesce(jsonb_agg(jsonb_build_object(
                          'name', full_name, 'contact', contact,
                          'equity_pct', round(equity_bps / 100.0, 2),
                          'role', role, 'status', status,
                          'has_account', user_id is not null)
                        order by (role = 'operator') desc, full_name), '[]'::jsonb)
                 from public.listing_partners
                  where listing_id = p_listing_id and status <> 'removed')
  );
end;
$$;

comment on function public.listing_declare_ownership(uuid, text, text, jsonb, text, text, text) is
  'Declare a listing as sole, a partnership with equity, or held on behalf of a named person. Rewrites the co-owner set in one statement so a listing is never observed half-declared.';


-- ── 6 · STARTING A TRANSFER ───────────────────────────────────────────────

-- Settle transfers nobody acted on. Called on the write path that is blocked
-- by them (see listing_transfer_start) so it cannot be forgotten, and safe to
-- call from a scheduled sweep as well.
--
-- This matters more than it looks: uq_ltransfers_one_live keys on
-- status = 'pending', so a transfer left pending past its expiry would block
-- every future transfer of that listing, permanently. A listing that can
-- never be handed over again because somebody ignored an offer in 2026 is a
-- listing we have quietly broken.
create or replace function public.listing_transfers_expire(p_listing_id uuid default null)
returns integer
language plpgsql
security definer
set search_path = pg_catalog, public, extensions
as $$
declare v_n integer;
begin
  update public.listing_transfers
     set status = 'expired'
   where status = 'pending'
     and expires_at <= now()
     and (p_listing_id is null or listing_id = p_listing_id);
  get diagnostics v_n = row_count;
  return v_n;
end;
$$;

comment on function public.listing_transfers_expire(uuid) is
  'Settle transfers nobody acted on. Required, not cosmetic: the one-live-transfer index keys on status, so a stale pending row blocks a listing from ever being transferred again.';


create or replace function public.listing_transfer_start(
  p_listing_id uuid,
  p_to_name    text,
  p_to_contact text,
  p_note       text default null
) returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, extensions
as $$
declare
  v_uid     uuid := auth.uid();
  v_listing public.listings%rowtype;
  v_norm    text;
  v_id      uuid;
begin
  if v_uid is null then
    raise exception 'Sign in first' using errcode = '42501';
  end if;

  select * into v_listing from public.listings where id = p_listing_id;
  if not found then
    raise exception 'That listing does not exist' using errcode = 'P0002';
  end if;
  if v_listing.partner_id is distinct from v_uid and not public.is_operator() then
    raise exception 'That is not your listing to transfer' using errcode = '42501';
  end if;

  if coalesce(btrim(p_to_name), '') = '' then
    raise exception 'Who are you transferring it to?' using errcode = '22023';
  end if;
  v_norm := public.cabana_norm_contact(p_to_contact);
  if v_norm is null then
    raise exception 'Give an email address or a phone number for them' using errcode = '22023';
  end if;

  -- Transferring to yourself is a no-op that would strand the listing in a
  -- pending state you then have to accept from your own account.
  if v_norm = public.cabana_norm_contact((select email from auth.users where id = v_uid)) then
    raise exception 'That is your own contact. The listing is already yours.'
      using errcode = '22023';
  end if;

  -- Clear anything that has quietly timed out, so an ignored offer from last
  -- year does not permanently prevent this listing being handed over.
  perform public.listing_transfers_expire(p_listing_id);

  if exists (select 1 from public.listing_transfers
              where listing_id = p_listing_id and status = 'pending') then
    raise exception 'This listing already has a transfer waiting' using errcode = '23505';
  end if;

  insert into public.listing_transfers
    (listing_id, from_user, to_name, to_contact, to_contact_norm, kind, note)
  values
    (p_listing_id, v_uid, btrim(p_to_name), btrim(p_to_contact), v_norm, 'handover', p_note)
  returning id into v_id;

  return jsonb_build_object('ok', true, 'transfer_id', v_id,
                            'to', btrim(p_to_name), 'contact', btrim(p_to_contact));
end;
$$;


-- ── 7 · WHAT IS WAITING FOR ME ────────────────────────────────────────────
-- Matched on the caller's own email and phone, read from auth.users inside a
-- security-definer function. The caller never states who they are: a route
-- that took a contact as a parameter would let anybody claim anybody's
-- listing by guessing an address.

create or replace function public.listing_transfers_for_me()
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, extensions
as $$
declare
  v_uid  uuid := auth.uid();
  v_mail text;
  v_tel  text;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'reason', 'not_signed_in', 'transfers', '[]'::jsonb);
  end if;

  select public.cabana_norm_contact(u.email),
         public.cabana_norm_contact(coalesce(u.phone, u.raw_user_meta_data ->> 'phone'))
    into v_mail, v_tel
    from auth.users u where u.id = v_uid;

  return jsonb_build_object('ok', true, 'transfers', coalesce((
    select jsonb_agg(jsonb_build_object(
             'id',          t.id,
             'listing_id',  t.listing_id,
             'title',       l.title,
             'city',        l.city,
             -- to_jsonb() first, because `photos` is text[] on some rows of
             -- this schema's history and jsonb on others. Indexing either
             -- directly breaks on the other.
             'photo',       (to_jsonb(l.photos) -> 0) #>> '{}',
             'kind',        t.kind,
             'note',        t.note,
             'from_name',   coalesce(p.full_name, 'A Cabana partner'),
             'created_at',  t.created_at,
             'expires_at',  t.expires_at
           ) order by t.created_at desc)
      from public.listing_transfers t
      join public.listings l on l.id = t.listing_id
      left join public.profiles p on p.id = t.from_user
     where t.status = 'pending'
       and t.expires_at > now()
       and t.to_contact_norm in (coalesce(v_mail, '~none~'), coalesce(v_tel, '~none~'))
  ), '[]'::jsonb));
end;
$$;


-- ── 8 · ACCEPTING ─────────────────────────────────────────────────────────
-- The whole handover, in one statement. partner_id and host_id move, the
-- hold is cleared, the previous holder's co-owner row (if any) is retired,
-- and the recipient becomes the operator. There is no moment at which two
-- people own this listing and no moment at which nobody does.

create or replace function public.listing_transfer_accept(p_transfer_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, extensions
as $$
declare
  v_uid  uuid := auth.uid();
  v_t    public.listing_transfers%rowtype;
  v_mail text;
  v_tel  text;
  v_name text;
begin
  if v_uid is null then
    raise exception 'Sign in first' using errcode = '42501';
  end if;

  select * into v_t from public.listing_transfers where id = p_transfer_id for update;
  if not found then
    raise exception 'That transfer does not exist' using errcode = 'P0002';
  end if;
  if v_t.status <> 'pending' then
    raise exception 'That transfer is already %', v_t.status using errcode = '22023';
  end if;
  -- Deliberately no `update ... set status = 'expired'` here. The RAISE below
  -- aborts the transaction, so that write would be rolled back with it — dead
  -- code that reads as if it works. Expiry is a fact about `expires_at`, and
  -- the rows are settled by listing_transfers_expire() on a path that commits.
  if v_t.expires_at <= now() then
    raise exception 'That transfer has expired. Ask them to send it again.'
      using errcode = '22023';
  end if;

  select public.cabana_norm_contact(u.email),
         public.cabana_norm_contact(coalesce(u.phone, u.raw_user_meta_data ->> 'phone')),
         coalesce(u.raw_user_meta_data ->> 'full_name', u.email)
    into v_mail, v_tel, v_name
    from auth.users u where u.id = v_uid;

  -- The listing is claimed by the person it names, and by nobody else. This
  -- is the load-bearing check in the whole file: without it, any signed-in
  -- account could accept any transfer by id.
  if v_t.to_contact_norm not in (coalesce(v_mail, '~none~'), coalesce(v_tel, '~none~')) then
    raise exception 'This listing was sent to a different email address or phone number'
      using errcode = '42501';
  end if;

  update public.listings
     set partner_id = v_uid,
         host_id    = v_uid,
         ownership_type = case when ownership_type = 'on_behalf' then 'sole'
                               else ownership_type end,
         held_for_name = null,
         held_for_contact = null,
         ownership_declared_at = now(),
         -- A listing built for somebody in the field publishes here, at the
         -- moment they accept it, and not one second earlier. See the note
         -- on listings.activate_on_claim.
         is_active = case when activate_on_claim then true else is_active end,
         status    = case when activate_on_claim then 'active' else status end,
         activate_on_claim = false
   where id = v_t.listing_id;

  -- `owner_id` is the older of the three owner columns and is not present on
  -- every deployment of this schema. Leaving it stale would hand the agent
  -- network's own ownership check (agent_can_represent) to the previous
  -- owner, so it is updated where it exists rather than assumed.
  if exists (select 1 from information_schema.columns
              where table_schema = 'public' and table_name = 'listings'
                and column_name = 'owner_id') then
    execute 'update public.listings set owner_id = $1 where id = $2'
      using v_uid, v_t.listing_id;
  end if;

  -- If the listing was a partnership, the seat labelled 'operator' now
  -- belongs to the new owner. Their equity is whatever the old operator's
  -- was: a transfer moves a share, it does not renegotiate one.
  update public.listing_partners
     set user_id = v_uid, full_name = coalesce(v_name, full_name),
         status = 'active', confirmed_at = now(), updated_at = now()
   where listing_id = v_t.listing_id and role = 'operator' and status <> 'removed';

  update public.listing_transfers
     set status = 'accepted', to_user = v_uid, accepted_at = now()
   where id = p_transfer_id;

  return jsonb_build_object('ok', true, 'listing_id', v_t.listing_id);
end;
$$;


-- ── 9 · DECLINING AND CANCELLING ──────────────────────────────────────────
-- Two routes because they are two different acts by two different people,
-- and collapsing them would mean either party could undo the other's.

create or replace function public.listing_transfer_decline(p_transfer_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, extensions
as $$
declare
  v_uid  uuid := auth.uid();
  v_t    public.listing_transfers%rowtype;
  v_mail text;
  v_tel  text;
begin
  if v_uid is null then raise exception 'Sign in first' using errcode = '42501'; end if;

  select * into v_t from public.listing_transfers where id = p_transfer_id for update;
  if not found or v_t.status <> 'pending' then
    raise exception 'That transfer is no longer open' using errcode = '22023';
  end if;

  select public.cabana_norm_contact(u.email),
         public.cabana_norm_contact(coalesce(u.phone, u.raw_user_meta_data ->> 'phone'))
    into v_mail, v_tel from auth.users u where u.id = v_uid;

  if v_t.to_contact_norm not in (coalesce(v_mail, '~none~'), coalesce(v_tel, '~none~')) then
    raise exception 'That transfer was not sent to you' using errcode = '42501';
  end if;

  update public.listing_transfers
     set status = 'declined', declined_at = now() where id = p_transfer_id;

  -- A declined on_behalf listing is stranded: it is marked as somebody
  -- else's and that somebody has said no. Hand it back to whoever built it,
  -- as their own, rather than leaving a listing nobody can edit.
  update public.listings
     set ownership_type = 'sole', held_for_name = null, held_for_contact = null
   where id = v_t.listing_id and ownership_type = 'on_behalf';

  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.listing_transfer_cancel(p_transfer_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, extensions
as $$
declare
  v_uid uuid := auth.uid();
  v_t   public.listing_transfers%rowtype;
begin
  if v_uid is null then raise exception 'Sign in first' using errcode = '42501'; end if;

  select * into v_t from public.listing_transfers where id = p_transfer_id for update;
  if not found or v_t.status <> 'pending' then
    raise exception 'That transfer is no longer open' using errcode = '22023';
  end if;
  if v_t.from_user is distinct from v_uid and not public.is_operator() then
    raise exception 'That is not your transfer to cancel' using errcode = '42501';
  end if;

  update public.listing_transfers
     set status = 'cancelled', cancelled_at = now() where id = p_transfer_id;

  update public.listings
     set ownership_type = 'sole', held_for_name = null, held_for_contact = null
   where id = v_t.listing_id and ownership_type = 'on_behalf';

  return jsonb_build_object('ok', true);
end;
$$;


-- ── 10 · CONFIRMING YOUR OWN SEAT ─────────────────────────────────────────
-- A co-owner added by name confirms themselves once they have an account.
-- They cannot change their share by doing so — that is the operator's to
-- declare and the partnership's to agree offline.

create or replace function public.listing_partner_confirm(p_partner_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, extensions
as $$
declare
  v_uid  uuid := auth.uid();
  v_row  public.listing_partners%rowtype;
  v_mail text;
  v_tel  text;
begin
  if v_uid is null then raise exception 'Sign in first' using errcode = '42501'; end if;

  select * into v_row from public.listing_partners where id = p_partner_id for update;
  if not found then
    raise exception 'That partnership seat does not exist' using errcode = 'P0002';
  end if;

  select public.cabana_norm_contact(u.email),
         public.cabana_norm_contact(coalesce(u.phone, u.raw_user_meta_data ->> 'phone'))
    into v_mail, v_tel from auth.users u where u.id = v_uid;

  if v_row.user_id is distinct from v_uid
     and v_row.contact_norm not in (coalesce(v_mail, '~none~'), coalesce(v_tel, '~none~')) then
    raise exception 'That seat is not yours' using errcode = '42501';
  end if;

  update public.listing_partners
     set user_id = v_uid, status = 'active', confirmed_at = now(), updated_at = now()
   where id = p_partner_id;

  return jsonb_build_object('ok', true, 'listing_id', v_row.listing_id);
end;
$$;


-- ── 11 · RLS ──────────────────────────────────────────────────────────────
-- Read is generous, write is closed. Every write above goes through a
-- security-definer function that re-derives the caller from auth.uid() and
-- re-checks ownership. A direct INSERT policy on listing_partners would let
-- anyone write themselves a 90% share of somebody else's building.

alter table public.listing_partners  enable row level security;
alter table public.listing_transfers enable row level security;

drop policy if exists lpartners_read on public.listing_partners;
create policy lpartners_read on public.listing_partners
  for select to authenticated
  using (
    user_id = auth.uid()
    or exists (select 1 from public.listings l
                where l.id = listing_id and l.partner_id = auth.uid())
    or public.is_operator()
  );

drop policy if exists ltransfers_read on public.listing_transfers;
create policy ltransfers_read on public.listing_transfers
  for select to authenticated
  using (from_user = auth.uid() or to_user = auth.uid() or public.is_operator());

revoke all on public.listing_partners  from anon;
revoke all on public.listing_transfers from anon;

-- The functions are the only write path, so they are the only thing granted.
do $$
declare fn text;
begin
  foreach fn in array array[
    'public.listing_declare_ownership(uuid, text, text, jsonb, text, text, text)',
    'public.listing_transfer_start(uuid, text, text, text)',
    'public.listing_transfers_for_me()',
    'public.listing_transfer_accept(uuid)',
    'public.listing_transfer_decline(uuid)',
    'public.listing_transfer_cancel(uuid)',
    'public.listing_partner_confirm(uuid)',
    'public.listing_transfers_expire(uuid)'
  ] loop
    execute format('revoke all on function %s from public, anon', fn);
    execute format('grant execute on function %s to authenticated', fn);
  end loop;
end $$;

grant execute on function public.cabana_norm_contact(text) to authenticated;


-- ── 12 · A LISTING'S OWNERSHIP, IN ONE READ ───────────────────────────────
-- So a dashboard does not have to join three tables and get the equity
-- arithmetic right in JavaScript.

create or replace view public.v_listing_ownership as
select
  l.id                       as listing_id,
  l.partner_id,
  l.title,
  l.ownership_type,
  l.equity_split,
  l.held_for_name,
  l.held_for_contact,
  l.created_by,
  l.created_by_role,
  (select count(*) from public.listing_partners p
    where p.listing_id = l.id and p.status <> 'removed')            as partner_count,
  coalesce((select jsonb_agg(jsonb_build_object(
              'id', p.id, 'name', p.full_name, 'contact', p.contact,
              'equity_pct', round(p.equity_bps / 100.0, 2),
              'role', p.role, 'status', p.status,
              'has_account', p.user_id is not null)
            -- Operator first, then partners by name. `role desc` happens to
            -- sort 'partner' above 'operator' alphabetically, which is the
            -- opposite of what any screen showing this wants.
            order by (p.role = 'operator') desc, p.full_name)
     from public.listing_partners p
    where p.listing_id = l.id and p.status <> 'removed'), '[]'::jsonb) as partners,
  (select t.id from public.listing_transfers t
    where t.listing_id = l.id and t.status = 'pending' limit 1)     as pending_transfer_id,
  (select t.to_name from public.listing_transfers t
    where t.listing_id = l.id and t.status = 'pending' limit 1)     as pending_transfer_to
from public.listings l;

comment on view public.v_listing_ownership is
  'One row per listing describing who owns it and on what terms. Inherits RLS from listings.';
