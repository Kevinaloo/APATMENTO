-- Cabana · ownership claims are private by construction
--
-- The original ownership migration built the handover model correctly, but
-- a browser could still activate a row before declaring it on_behalf. This
-- migration makes privacy a database invariant, not a UI convention.

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
  -- A row that says it is held for somebody can never be public.
  if new.ownership_type = 'on_behalf' or new.activate_on_claim then
    new.is_active := false;
    new.status := 'pending_owner';
    new.activate_on_claim := true;
    return new;
  end if;

  -- A pending handover also keeps the listing private. The one exception is
  -- listing_transfer_accept(): it moves ownership to the verified recipient
  -- and clears the hold in this same update. Re-derive that identity here so
  -- a direct UPDATE cannot imitate the claim.
  if tg_op = 'UPDATE' and (new.is_active is true or new.status in ('active','approved','published')) then
    select * into v_transfer
      from public.listing_transfers
     where listing_id = new.id and status = 'pending'
     order by created_at desc limit 1;

    if found then
      if v_uid is not null then
        select public.cabana_norm_contact(u.email),
               public.cabana_norm_contact(coalesce(u.phone, u.raw_user_meta_data ->> 'phone'))
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

drop trigger if exists listings_claim_privacy_guard_t on public.listings;
create trigger listings_claim_privacy_guard_t
before insert or update of ownership_type, activate_on_claim, is_active, status, partner_id, host_id
on public.listings
for each row execute function public.listing_claim_privacy_guard();

-- Decline/cancel means "do not publish". Return the row to its preparer as
-- a private draft; never silently turn a rejected invitation into inventory.
create or replace function public.listing_claim_closed_guard()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, extensions
as $$
begin
  if old.status = 'pending'
     and new.status in ('declined','cancelled','expired')
     and new.kind = 'on_behalf' then
    update public.listings
       set is_active = false,
           status = 'draft',
           activate_on_claim = false,
           ownership_type = 'sole',
           held_for_name = null,
           held_for_contact = null
     where id = new.listing_id;
  end if;
  return new;
end;
$$;

revoke all on function public.listing_claim_closed_guard() from public, anon, authenticated;

drop trigger if exists listing_claim_closed_guard_t on public.listing_transfers;
create trigger listing_claim_closed_guard_t
after update of status on public.listing_transfers
for each row execute function public.listing_claim_closed_guard();

-- Repair any legacy invitation that was accidentally made public.
update public.listings l
   set is_active = false,
       status = 'pending_owner',
       activate_on_claim = true
 where exists (
   select 1 from public.listing_transfers t
    where t.listing_id = l.id and t.kind = 'on_behalf' and t.status = 'pending'
 );

-- Views bypass RLS unless they explicitly invoke the caller's policies.
-- Preserve the exact existing column order so deployed consumers do not see
-- a CREATE OR REPLACE shape error.
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
    where t.listing_id = l.id and t.status = 'pending' limit 1) as pending_transfer_to
from public.listings l;

grant select on public.v_listing_ownership to authenticated;
