-- ══════════════════════════════════════════════════════════════════════════
-- Cabana · Fix phone-based claim identity
--
-- THE BUG
-- ───────
-- The 20260824092000 migration restricted transfer matching to only
-- auth.users.phone (the Supabase Auth verified phone field). But most
-- users sign up via email or Google OAuth and enter their phone number
-- in the signup form — which stores it in raw_user_meta_data.phone and
-- profiles.contact_phone, NOT in auth.users.phone.
--
-- Result: a transfer sent to a phone number could never be claimed by
-- someone who signed in via email, because the inbox query would never
-- match them. The listing was stranded.
--
-- THE FIX
-- ───────
-- A helper function that collects ALL normalised contacts for a user —
-- verified email, verified phone, and metadata phone — so every
-- matching function uses the same comprehensive check.
--
-- Idempotent and additive. Safe to re-run.
-- ══════════════════════════════════════════════════════════════════════════

-- ── 1 · Helper: all normalised contacts for a user ──────────────────────
-- Returns a set of normalised contact strings that identify this user.
-- Used by every function that needs to answer "is this transfer for me?"

create or replace function public.cabana_user_contacts(p_uid uuid)
returns text[]
language sql
stable
security definer
set search_path = pg_catalog, public, extensions
as $$
  select array_agg(distinct c) filter (where c is not null)
  from (
    -- Verified email (the primary auth identity)
    select public.cabana_norm_contact(u.email::text) as c
      from auth.users u where u.id = p_uid
    union all
    -- Verified phone (if they authenticated via phone OTP)
    select public.cabana_norm_contact(u.phone::text) as c
      from auth.users u where u.id = p_uid and u.phone is not null
    union all
    -- Phone from signup metadata (the field in the registration form)
    select public.cabana_norm_contact((u.raw_user_meta_data ->> 'phone')::text) as c
      from auth.users u where u.id = p_uid
        and u.raw_user_meta_data ->> 'phone' is not null
    union all
    -- Phone stored in the profiles table
    select public.cabana_norm_contact(p.contact_phone::text) as c
      from public.profiles p where p.id = p_uid
        and p.contact_phone is not null
  ) contacts;
$$;

comment on function public.cabana_user_contacts(uuid) is
  'Every normalised email and phone for a user, from every source: auth email, auth phone, metadata phone, and profile phone. One function, used by every claim/transfer/partner check, so they can never disagree about who someone is.';

revoke all on function public.cabana_user_contacts(uuid) from public, anon;
grant execute on function public.cabana_user_contacts(uuid) to authenticated;


-- ── 2 · Fix listing_transfers_for_me ────────────────────────────────────
-- The inbox query: what transfers are waiting for the signed-in user?

create or replace function public.listing_transfers_for_me()
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, extensions
as $$
declare
  v_uid      uuid := auth.uid();
  v_contacts text[];
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'reason', 'not_signed_in', 'transfers', '[]'::jsonb);
  end if;

  v_contacts := public.cabana_user_contacts(v_uid);

  return jsonb_build_object('ok', true, 'transfers', coalesce((
    select jsonb_agg(jsonb_build_object(
             'id', t.id, 'listing_id', t.listing_id, 'title', l.title,
             'city', l.city, 'photo', (to_jsonb(l.photos) -> 0) #>> '{}',
             'kind', t.kind, 'note', t.note,
             'from_name', coalesce(p.full_name, 'A Cabana partner'),
             'created_at', t.created_at, 'expires_at', t.expires_at
           ) order by t.created_at desc)
      from public.listing_transfers t
      join public.listings l on l.id = t.listing_id
      left join public.profiles p on p.id = t.from_user
     where t.status = 'pending' and t.expires_at > now()
       and t.to_contact_norm = any(v_contacts)
  ), '[]'::jsonb));
end;
$$;


-- ── 3 · Fix listing_transfer_accept ─────────────────────────────────────

create or replace function public.listing_transfer_accept(p_transfer_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, extensions
as $$
declare
  v_uid      uuid := auth.uid();
  v_t        public.listing_transfers%rowtype;
  v_contacts text[];
  v_name     text;
begin
  if v_uid is null then raise exception 'Sign in first' using errcode = '42501'; end if;

  select * into v_t from public.listing_transfers where id = p_transfer_id for update;
  if not found then raise exception 'That transfer does not exist' using errcode = 'P0002'; end if;
  if v_t.status <> 'pending' then
    raise exception 'That transfer is already %', v_t.status using errcode = '22023';
  end if;
  if v_t.expires_at <= now() then
    raise exception 'That transfer has expired. Ask them to send it again.' using errcode = '22023';
  end if;

  v_contacts := public.cabana_user_contacts(v_uid);

  select coalesce(u.raw_user_meta_data ->> 'full_name', u.email)
    into v_name from auth.users u where u.id = v_uid;

  -- The load-bearing check: only the named recipient may accept.
  if not (v_t.to_contact_norm = any(v_contacts)) then
    raise exception 'This listing was sent to a different email address or phone number' using errcode = '42501';
  end if;

  update public.listings
     set partner_id = v_uid, host_id = v_uid,
         ownership_type = case when ownership_type = 'on_behalf' then 'sole' else ownership_type end,
         held_for_name = null, held_for_contact = null, ownership_declared_at = now(),
         is_active = case when activate_on_claim then true else is_active end,
         status = case when activate_on_claim then 'active' else status end,
         activate_on_claim = false
   where id = v_t.listing_id;

  if exists (select 1 from information_schema.columns
              where table_schema = 'public' and table_name = 'listings' and column_name = 'owner_id') then
    execute 'update public.listings set owner_id = $1 where id = $2' using v_uid, v_t.listing_id;
  end if;

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


-- ── 4 · Fix listing_transfer_decline ────────────────────────────────────

create or replace function public.listing_transfer_decline(p_transfer_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, extensions
as $$
declare
  v_uid      uuid := auth.uid();
  v_t        public.listing_transfers%rowtype;
  v_contacts text[];
begin
  if v_uid is null then raise exception 'Sign in first' using errcode = '42501'; end if;
  select * into v_t from public.listing_transfers where id = p_transfer_id for update;
  if not found or v_t.status <> 'pending' then
    raise exception 'That transfer is no longer open' using errcode = '22023';
  end if;

  v_contacts := public.cabana_user_contacts(v_uid);
  if not (v_t.to_contact_norm = any(v_contacts)) then
    raise exception 'That transfer was not sent to you' using errcode = '42501';
  end if;

  update public.listing_transfers set status = 'declined', declined_at = now() where id = p_transfer_id;
  update public.listings
     set ownership_type = 'sole', held_for_name = null, held_for_contact = null
   where id = v_t.listing_id and ownership_type = 'on_behalf';
  return jsonb_build_object('ok', true);
end;
$$;


-- ── 5 · Fix listing_partner_confirm ─────────────────────────────────────

create or replace function public.listing_partner_confirm(p_partner_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, extensions
as $$
declare
  v_uid      uuid := auth.uid();
  v_row      public.listing_partners%rowtype;
  v_contacts text[];
begin
  if v_uid is null then raise exception 'Sign in first' using errcode = '42501'; end if;
  select * into v_row from public.listing_partners where id = p_partner_id for update;
  if not found then raise exception 'That partnership seat does not exist' using errcode = 'P0002'; end if;

  v_contacts := public.cabana_user_contacts(v_uid);
  if v_row.user_id is distinct from v_uid
     and not (v_row.contact_norm = any(v_contacts)) then
    raise exception 'That seat is not yours' using errcode = '42501';
  end if;

  update public.listing_partners
     set user_id = v_uid, status = 'active', confirmed_at = now(), updated_at = now()
   where id = p_partner_id;
  return jsonb_build_object('ok', true, 'listing_id', v_row.listing_id);
end;
$$;


-- ── 6 · Fix the privacy guard trigger ───────────────────────────────────

create or replace function public.listing_claim_privacy_guard()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, extensions
as $$
declare
  v_uid uuid := auth.uid();
  v_transfer public.listing_transfers%rowtype;
  v_contacts text[];
  v_is_recipient boolean := false;
begin
  if new.ownership_type = 'on_behalf' or new.activate_on_claim then
    new.is_active := false;
    new.status := 'pending_owner';
    new.activate_on_claim := true;
    return new;
  end if;

  if tg_op = 'UPDATE' and (new.is_active is true or new.status in ('active','approved','published')) then
    select * into v_transfer
      from public.listing_transfers
     where listing_id = new.id and status = 'pending'
     order by created_at desc limit 1;

    if found then
      if v_uid is not null then
        v_contacts := public.cabana_user_contacts(v_uid);

        v_is_recipient := new.partner_id = v_uid
          and new.host_id = v_uid
          and old.partner_id = v_transfer.from_user
          and new.ownership_type <> 'on_behalf'
          and new.activate_on_claim is false
          and v_transfer.to_contact_norm = any(v_contacts);
      end if;

      if not v_is_recipient then
        new.is_active := false;
        new.status := 'pending_owner';
        new.activate_on_claim := true;
      end if;
    end if;
  end if;

  return new;
end;
$$;

revoke all on function public.listing_claim_privacy_guard() from public, anon, authenticated;


-- ── 7 · Update the ownership view with transfer contact + kind ──────────
-- The sender needs to see whether the recipient was given an email or
-- phone, and needs the transfer id to build a claim URL they can share.

create or replace view public.v_listing_ownership
with (security_invoker = true)
as
select
  l.id as listing_id,
  l.partner_id,
  l.title,
  l.ownership_type,
  l.equity_split,
  l.held_for_name,
  l.held_for_contact,
  l.created_by,
  l.created_by_role,
  (select count(*) from public.listing_partners p
    where p.listing_id = l.id and p.status <> 'removed') as partner_count,
  coalesce((select jsonb_agg(jsonb_build_object(
              'id', p.id, 'name', p.full_name, 'contact', p.contact,
              'equity_pct', round(p.equity_bps / 100.0, 2),
              'role', p.role, 'status', p.status,
              'has_account', p.user_id is not null)
            order by (p.role = 'operator') desc, p.full_name)
     from public.listing_partners p
    where p.listing_id = l.id and p.status <> 'removed'), '[]'::jsonb) as partners,
  (select t.id from public.listing_transfers t
    where t.listing_id = l.id and t.status = 'pending' limit 1) as pending_transfer_id,
  (select t.to_name from public.listing_transfers t
    where t.listing_id = l.id and t.status = 'pending' limit 1) as pending_transfer_to,
  (select t.to_contact from public.listing_transfers t
    where t.listing_id = l.id and t.status = 'pending' limit 1) as pending_transfer_contact,
  (select t.kind from public.listing_transfers t
    where t.listing_id = l.id and t.status = 'pending' limit 1) as pending_transfer_kind
from public.listings l;

grant select on public.v_listing_ownership to authenticated;


-- ── 8 · Grants ──────────────────────────────────────────────────────────

do $$
declare fn text;
begin
  foreach fn in array array[
    'public.listing_transfers_for_me()',
    'public.listing_transfer_accept(uuid)',
    'public.listing_transfer_decline(uuid)',
    'public.listing_partner_confirm(uuid)'
  ] loop
    execute format('revoke all on function %s from public, anon', fn);
    execute format('grant execute on function %s to authenticated', fn);
  end loop;
end $$;
