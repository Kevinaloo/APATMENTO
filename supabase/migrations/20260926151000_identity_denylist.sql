-- ════════════════════════════════════════════════════════════════════
-- CABANA · A BAN OUTLIVES THE ACCOUNT
-- When a member is banned, their identity fingerprints and a SHA-256 of
-- their normalised phone and email go on a denylist that survives
-- account deletion. Nothing readable is stored. New identity checks and
-- new sign-ups are compared against it; matches reach operators.
-- ════════════════════════════════════════════════════════════════════
create table if not exists public.identity_denylist (
  kind        text not null check (kind in ('document','id_number','name_dob','device','phone','email')),
  hash        text not null check (hash ~ '^[a-f0-9]{64}$'),
  source_user uuid references auth.users(id) on delete set null,
  reason      text,
  created_at  timestamptz not null default now(),
  lifted_at   timestamptz,
  primary key (kind, hash)
);
alter table public.identity_denylist enable row level security;
revoke all on public.identity_denylist from public, anon, authenticated;
grant all on public.identity_denylist to service_role;
drop policy if exists identity_denylist_service on public.identity_denylist;
create policy identity_denylist_service on public.identity_denylist for all to service_role using (true) with check (true);

create or replace function public.cabana_contact_hash(p text)
returns text language sql immutable set search_path = '' as $$
  select case when p is null then null else encode(extensions.digest('cabana-contact|' || p, 'sha256'), 'hex') end;
$$;

create or replace function cabana_private.profile_ban_denylist()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if coalesce(new.banned, false) and not coalesce(old.banned, false) then
    insert into public.identity_denylist (kind, hash, source_user, reason)
      select f.kind, f.hash, new.id, new.ban_reason from public.identity_fingerprints f where f.user_id = new.id and f.kind <> 'device'
      on conflict (kind, hash) do update set lifted_at = null, source_user = excluded.source_user;
    insert into public.identity_denylist (kind, hash, source_user, reason)
      select k, h, new.id, new.ban_reason from (values
        ('phone', public.cabana_contact_hash(public.cabana_norm_phone(new.phone))),
        ('phone', public.cabana_contact_hash(public.cabana_norm_phone(new.mpesa_number))),
        ('phone', public.cabana_contact_hash(public.cabana_norm_phone(new.contact_phone))),
        ('email', public.cabana_contact_hash(public.cabana_norm_email(new.email)))) v(k, h)
      where h is not null
      on conflict (kind, hash) do update set lifted_at = null, source_user = excluded.source_user;
  elsif not coalesce(new.banned, false) and coalesce(old.banned, false) then
    update public.identity_denylist set lifted_at = now() where source_user = new.id and lifted_at is null;
  end if;
  return new;
exception when others then return new;
end $$;
drop trigger if exists profile_ban_denylist on public.profiles;
create trigger profile_ban_denylist after update of banned on public.profiles
  for each row execute function cabana_private.profile_ban_denylist();

-- New sign-ups and contact changes are checked against the denylist.
create or replace function cabana_private.profile_denylist_check()
returns trigger language plpgsql security definer set search_path = '' as $$
declare hit record;
begin
  select d.kind, d.source_user into hit from public.identity_denylist d
   where d.lifted_at is null and d.source_user is distinct from new.id and (
     (d.kind = 'phone' and d.hash in (public.cabana_contact_hash(public.cabana_norm_phone(new.phone)),
                                      public.cabana_contact_hash(public.cabana_norm_phone(new.mpesa_number)),
                                      public.cabana_contact_hash(public.cabana_norm_phone(new.contact_phone))))
     or (d.kind = 'email' and d.hash = public.cabana_contact_hash(public.cabana_norm_email(new.email))))
   limit 1;
  if found then
    if hit.source_user is not null then
      perform public.cabana_link_accounts(new.id, hit.source_user, case when hit.kind = 'email' then 'same_email_alias' else 'same_phone' end, 'medium', 'critical', 'Matches a banned member');
    end if;
    insert into public.ops_alerts (kind, severity, title, body, meta)
      values ('identity', 'warn', 'New account matches a banned member',
              'Its ' || hit.kind || ' matches a banned member. Nothing was blocked; review it in Profiles & ticks.', jsonb_build_object('user_id', new.id, 'signal', hit.kind));
  end if;
  return new;
exception when others then return new;
end $$;
drop trigger if exists profile_denylist_check on public.profiles;
create trigger profile_denylist_check after insert or update of phone, mpesa_number, contact_phone, email on public.profiles
  for each row execute function cabana_private.profile_denylist_check();
