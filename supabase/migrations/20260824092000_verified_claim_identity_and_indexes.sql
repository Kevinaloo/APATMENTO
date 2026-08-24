-- Cabana · verified claim identity and concurrent fleet integrity
--
-- Only Auth-verified email/phone fields may authorize a claim. User-editable
-- metadata is display data and must never be accepted as proof of identity.

create or replace function public.listing_claim_privacy_guard()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, extensions
as $$
declare
  v_uid uuid := auth.uid();
  v_transfer public.listing_transfers%rowtype;
  v_mail text;
  v_tel text;
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
        select public.cabana_norm_contact(u.email),
               public.cabana_norm_contact(u.phone)
          into v_mail, v_tel
          from auth.users u where u.id = v_uid;

        v_is_recipient := new.partner_id = v_uid
          and new.host_id = v_uid
          and old.partner_id = v_transfer.from_user
          and new.ownership_type <> 'on_behalf'
          and new.activate_on_claim is false
          and v_transfer.to_contact_norm in (coalesce(v_mail, '~none~'), coalesce(v_tel, '~none~'));
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

create or replace function public.listing_transfers_for_me()
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, extensions
as $$
declare
  v_uid uuid := auth.uid();
  v_mail text;
  v_tel text;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'reason', 'not_signed_in', 'transfers', '[]'::jsonb);
  end if;

  select public.cabana_norm_contact(u.email), public.cabana_norm_contact(u.phone)
    into v_mail, v_tel from auth.users u where u.id = v_uid;

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
       and t.to_contact_norm in (coalesce(v_mail, '~none~'), coalesce(v_tel, '~none~'))
  ), '[]'::jsonb));
end;
$$;

create or replace function public.listing_transfer_accept(p_transfer_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, extensions
as $$
declare
  v_uid uuid := auth.uid();
  v_t public.listing_transfers%rowtype;
  v_mail text;
  v_tel text;
  v_name text;
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

  select public.cabana_norm_contact(u.email), public.cabana_norm_contact(u.phone),
         coalesce(u.raw_user_meta_data ->> 'full_name', u.email)
    into v_mail, v_tel, v_name from auth.users u where u.id = v_uid;

  if v_t.to_contact_norm not in (coalesce(v_mail, '~none~'), coalesce(v_tel, '~none~')) then
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

create or replace function public.listing_transfer_decline(p_transfer_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, extensions
as $$
declare
  v_uid uuid := auth.uid();
  v_t public.listing_transfers%rowtype;
  v_mail text;
  v_tel text;
begin
  if v_uid is null then raise exception 'Sign in first' using errcode = '42501'; end if;
  select * into v_t from public.listing_transfers where id = p_transfer_id for update;
  if not found or v_t.status <> 'pending' then
    raise exception 'That transfer is no longer open' using errcode = '22023';
  end if;

  select public.cabana_norm_contact(u.email), public.cabana_norm_contact(u.phone)
    into v_mail, v_tel from auth.users u where u.id = v_uid;
  if v_t.to_contact_norm not in (coalesce(v_mail, '~none~'), coalesce(v_tel, '~none~')) then
    raise exception 'That transfer was not sent to you' using errcode = '42501';
  end if;

  update public.listing_transfers set status = 'declined', declined_at = now() where id = p_transfer_id;
  update public.listings
     set ownership_type = 'sole', held_for_name = null, held_for_contact = null
   where id = v_t.listing_id and ownership_type = 'on_behalf';
  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.listing_partner_confirm(p_partner_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, extensions
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.listing_partners%rowtype;
  v_mail text;
  v_tel text;
begin
  if v_uid is null then raise exception 'Sign in first' using errcode = '42501'; end if;
  select * into v_row from public.listing_partners where id = p_partner_id for update;
  if not found then raise exception 'That partnership seat does not exist' using errcode = 'P0002'; end if;

  select public.cabana_norm_contact(u.email), public.cabana_norm_contact(u.phone)
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

-- One account can submit only one fleet-operator application, even when two
-- browser requests arrive at the same time.
create unique index if not exists car_operators_owner_id_uidx
  on public.car_operators(owner_id) where owner_id is not null;
