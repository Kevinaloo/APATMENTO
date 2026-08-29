-- ══════════════════════════════════════════════════════════════════════════
-- Cabana · Ownership claims are email-only
--
-- WHY PHONE NEVER WORKED
-- ───────────────────────
-- A phone number that identifies a Cabana account does not exist. It was
-- never one field — it was four, none reliably filled in:
--
--   auth.users.phone              only set if someone verified via phone OTP,
--                                  which no signup flow on this site offers
--   raw_user_meta_data ->> 'phone' only written by the creator/influencer
--                                  signup form
--   profiles.contact_phone        only written by that SAME creator form
--   profiles.phone                written by profile.html, a THIRD, disjoint
--                                  column the other two never touch
--
-- A normal traveller or host who signs up with email/password or Google
-- OAuth — the two paths everyone actually uses — never has a phone number
-- anywhere in the database. Sending an ownership transfer to a phone number
-- was sending it into a field nobody could ever fill in from the account
-- side. It was not a matching bug; it was an unmatchable design.
--
-- Email has none of this problem: Supabase populates auth.users.email for
-- every signup path — password, magic link, and every OAuth provider —
-- with no extra step and no alternate column. It is the one identity this
-- app has ever reliably had.
--
-- THE FIX
-- ───────
-- 1. Every function that accepts a new contact for a transfer, an on_behalf
--    hold, or a partnership seat now requires that contact to be an email
--    address. Existing phone-based rows are left untouched by these checks
--    — this only closes the door on creating new ones.
--
-- 2. Any transfer already stuck on a phone number is settled: cancelled,
--    with its listing returned to its sender exactly as listing_transfer_
--    cancel() would do it. Nobody loses a listing; they simply have to
--    resend it, and the form will only let them do that by email now.
--
-- Idempotent and additive. Safe to re-run.
-- ══════════════════════════════════════════════════════════════════════════

-- ── 1 · A single, obvious definition of "looks like an email" ───────────
-- Used everywhere a NEW contact is accepted. Deliberately stricter than
-- cabana_norm_contact(), which still has to read OLD rows that may hold a
-- phone number from before this migration.

create or replace function public.cabana_is_email(p_contact text)
returns boolean
language sql
immutable
set search_path = pg_catalog, public
as $$
  select p_contact is not null
     and position('@' in btrim(p_contact)) > 1
     and position('.' in split_part(btrim(p_contact), '@', 2)) > 0;
$$;

comment on function public.cabana_is_email(text) is
  'True if a contact string looks like an email address. Used to reject phone numbers at the point a NEW transfer, on_behalf hold, or partnership seat is created — see the migration header for why phone was retired.';

revoke all on function public.cabana_is_email(text) from public, anon;
grant execute on function public.cabana_is_email(text) to authenticated;


-- ── 2 · Starting a transfer: email only ──────────────────────────────────

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

  if not public.cabana_is_email(p_to_contact) then
    raise exception 'Give their email address. Claims are verified by email only, so a phone number cannot be used here.'
      using errcode = '22023';
  end if;

  v_norm := public.cabana_norm_contact(p_to_contact);

  -- Transferring to yourself is a no-op that would strand the listing in a
  -- pending state you then have to accept from your own account.
  if v_norm = public.cabana_norm_contact((select email::text from auth.users where id = v_uid)) then
    raise exception 'That is your own email address. The listing is already yours.'
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
    (p_listing_id, v_uid, btrim(p_to_name), lower(btrim(p_to_contact)), v_norm, 'handover', p_note)
  returning id into v_id;

  return jsonb_build_object('ok', true, 'transfer_id', v_id,
                            'to', btrim(p_to_name), 'contact', lower(btrim(p_to_contact)));
end;
$$;


-- ── 3 · Declaring ownership: email only for on_behalf and partnerships ──
-- Full function restated (CREATE OR REPLACE needs the whole body); the only
-- behavioural change from the version in 20260820100000 is the two new
-- cabana_is_email() checks, marked below.

create or replace function public.listing_declare_ownership(
  p_listing_id  uuid,
  p_type        text,
  p_split       text    default null,
  p_partners    jsonb   default '[]'::jsonb,
  p_holder_name text    default null,
  p_holder_contact text default null,
  p_note        text default null
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

  if v_listing.partner_id is distinct from v_uid and not public.is_operator() then
    raise exception 'That is not your listing' using errcode = '42501';
  end if;

  if p_type not in ('sole','partnership','on_behalf') then
    raise exception 'Unknown ownership type' using errcode = '22023';
  end if;

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
  if p_type = 'on_behalf' then
    if coalesce(btrim(p_holder_name), '') = '' or coalesce(btrim(p_holder_contact), '') = '' then
      raise exception 'Who is this listing for? Give a name and an email address.'
        using errcode = '22023';
    end if;
    -- CHANGED: email required, not "email or phone".
    if not public.cabana_is_email(p_holder_contact) then
      raise exception 'Give their email address. Claims are verified by email only, so a phone number cannot be used here.'
        using errcode = '22023';
    end if;

    update public.listing_partners
       set status = 'removed', removed_at = now(), updated_at = now()
     where listing_id = p_listing_id and status <> 'removed';

    update public.listings
       set ownership_type = 'on_behalf',
           equity_split = null,
           held_for_name = btrim(p_holder_name),
           held_for_contact = lower(btrim(p_holder_contact)),
           ownership_declared_at = now()
     where id = p_listing_id;

    insert into public.listing_transfers
      (listing_id, from_user, to_name, to_contact, to_contact_norm, kind, note)
    values
      (p_listing_id, v_uid, btrim(p_holder_name), lower(btrim(p_holder_contact)),
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
    -- CHANGED: email required, not "email or phone".
    if v_contact = '' or not public.cabana_is_email(v_contact) then
      raise exception '% needs an email address. Claims are verified by email only, so a phone number cannot be used here.', v_name
        using errcode = '22023';
    end if;
    v_contact := lower(v_contact);
    if public.cabana_norm_contact(v_contact) = public.cabana_norm_contact(
         (select email::text from auth.users where id = v_uid)) then
      raise exception 'You are already in this partnership as the operator. Add the OTHER partners.'
        using errcode = '22023';
    end if;

    if v_split = 'equal' then
      v_bps := v_each;
    else
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
         where public.cabana_norm_contact(u.email::text) = public.cabana_norm_contact(v_contact)
         limit 1),
       v_name, v_contact, public.cabana_norm_contact(v_contact),
       v_bps, 'partner', 'invited', v_uid);
  end loop;

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
  'Declare a listing as sole, a partnership with equity, or held on behalf of a named person. Every recipient is identified by email — phone numbers are rejected at creation because no signup path on this site reliably records one.';


-- ── 4 · Settle every transfer already stuck on a phone number ───────────
-- These can never be claimed under the old model and never could have
-- been — see the migration header. Cancel them exactly as
-- listing_transfer_cancel() would: the listing returns to its sender,
-- nothing is deleted, and the sender can resend it by email.

do $$
declare
  r record;
  v_n integer := 0;
begin
  for r in
    select * from public.listing_transfers
     where status = 'pending' and not public.cabana_is_email(to_contact)
  loop
    update public.listing_transfers
       set status = 'cancelled', cancelled_at = now()
     where id = r.id;

    update public.listings
       set ownership_type = 'sole', held_for_name = null, held_for_contact = null
     where id = r.listing_id and ownership_type = 'on_behalf';

    v_n := v_n + 1;
  end loop;

  raise notice 'Cancelled % phone-based transfer(s) that could never be claimed.', v_n;
end $$;


-- ── 5 · Grants ────────────────────────────────────────────────────────────

do $$
declare fn text;
begin
  foreach fn in array array[
    'public.listing_transfer_start(uuid, text, text, text)',
    'public.listing_declare_ownership(uuid, text, text, jsonb, text, text, text)'
  ] loop
    execute format('revoke all on function %s from public, anon', fn);
    execute format('grant execute on function %s to authenticated', fn);
  end loop;
end $$;
