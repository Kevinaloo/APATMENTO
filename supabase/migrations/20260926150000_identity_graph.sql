-- ════════════════════════════════════════════════════════════════════
-- CABANA · ONE IDENTITY
--   1. Provider tick needs something LIVE, not an approved shell.
--   2. Identity graph: keyed hashes only (never raw ID data) that link
--      accounts belonging to the same person, for ban-evasion and
--      one-person-one-verified-account checks.
--   3. Verify once: a verified identity satisfies agent KYC, now and
--      for agents who join later.
--   4. Soft signals: a phone number or email alias shared with a banned
--      account is surfaced to operators, never used to block anyone.
-- ════════════════════════════════════════════════════════════════════

-- ── 1 · provider = verified AND something bookable right now ─────────
create or replace function public.cabana_offers_services(p_user uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select
    exists (select 1 from public.listings l where l.partner_id = p_user and l.is_active and l.status = 'active' and l.deleted_at is null)
    or exists (select 1 from public.tours t where t.status = 'published'
                 and (t.owner_id = p_user or t.operator_id in (select o.id from public.tour_operators o where o.owner_id = p_user and o.status = 'approved')))
    or exists (select 1 from public.events e where e.status = 'published' and coalesce(e.ends_at, e.starts_at, now()) >= now() - interval '1 day'
                 and (e.owner_id = p_user or e.organiser_id in (select o.id from public.event_organisers o where o.owner_id = p_user and o.status = 'approved')))
    or exists (select 1 from public.car_fleet f join public.car_operators c on c.id = f.operator_id
                 where c.owner_id = p_user and coalesce(c.verified, false) and f.status = 'active'
                   and (c.paused_until is null or c.paused_until < now()))
    or exists (select 1 from public.drivers d where d.user_id = p_user and d.status = 'approved')
    or exists (select 1 from public.agent_partnerships ap
                 join public.agents a on a.id = ap.agent_id
                 join public.listings l on l.id::text = ap.listing_id::text
                 where ap.agent_id = p_user and ap.status = 'approved' and not coalesce(a.suspended, false)
                   and l.is_active and l.status = 'active' and l.deleted_at is null);
$$;
revoke all on function public.cabana_offers_services(uuid) from public, anon, authenticated;
grant execute on function public.cabana_offers_services(uuid) to service_role;

create or replace function public.cabana_people_cards(p_ids uuid[])
returns table (
  id uuid, first_name text, display_name text, published boolean, handle text,
  account_type text, avatar jsonb, photo_url text, headline text, org_kind text,
  identity_verified boolean, org_verified boolean, provider boolean, badge text,
  verified_as text, professional boolean, allow_follow boolean, hidden boolean
)
language sql stable security definer set search_path = '' as $$
  with ids as (select distinct x as id from unnest(p_ids[1:100]) x where x is not null),
  base as (
    select i.id, pr.first_name, m.display_name, coalesce(m.published, false) published, m.handle,
      coalesce(m.account_type, 'individual') account_type, m.avatar,
      case when m.photo_status = 'approved' then m.photo_url end photo_url,
      coalesce(m.headline, '') headline, m.org_kind,
      coalesce(m.allow_follow, true) allow_follow,
      (u.id is null or u.deleted_at is not null or coalesce(pr.banned, false)) hidden,
      (
        exists (select 1 from public.verification_status vs where vs.user_id = i.id
                  and vs.identity_state = 'approved' and (vs.identity_expires is null or vs.identity_expires > now()))
        or exists (select 1 from public.agents a where a.id = i.id and a.kyc_status = 'verified' and not coalesce(a.suspended, false))
        or coalesce(pr.id_verification_status, '') in ('approved','verified')
        or coalesce(pr.verified, false)
      ) identity_verified,
      exists (select 1 from public.organization_verifications o where o.user_id = i.id and o.status = 'approved') org_approved,
      public.cabana_offers_services(i.id) offers_services,
      (
        exists (select 1 from public.agents a where a.id = i.id and not coalesce(a.suspended, false))
        or exists (select 1 from public.ambassadors am where am.id = i.id and am.status = 'active')
        or exists (select 1 from public.tour_operators t where t.owner_id = i.id and t.status = 'approved')
        or exists (select 1 from public.event_organisers e where e.owner_id = i.id and e.status = 'approved')
        or exists (select 1 from public.car_operators c where c.owner_id = i.id)
      ) other_role
    from ids i
    left join auth.users u on u.id = i.id
    left join public.profiles pr on pr.id = i.id
    left join public.member_public_profiles m on m.user_id = i.id
  ),
  graded as (
    select b.*, case when b.account_type = 'organization' then b.org_approved else b.identity_verified end as entity_verified
    from base b
  )
  select g.id, g.first_name, g.display_name, g.published, g.handle, g.account_type, g.avatar, g.photo_url,
    g.headline, g.org_kind, g.identity_verified,
    (g.org_approved and g.account_type = 'organization') org_verified,
    (g.entity_verified and g.offers_services) provider,
    case when g.entity_verified and g.offers_services then 'provider'
         when g.account_type = 'organization' and g.org_approved then 'organization'
         when g.account_type = 'individual' and g.identity_verified then 'person' end badge,
    case when g.entity_verified then g.account_type end verified_as,
    (g.offers_services or g.other_role) professional,
    g.allow_follow, g.hidden
  from graded g;
$$;
revoke all on function public.cabana_people_cards(uuid[]) from public, anon, authenticated;
grant execute on function public.cabana_people_cards(uuid[]) to service_role;

-- ── 2 · identity graph ───────────────────────────────────────────────
-- hash = HMAC-SHA256(server pepper, normalised value). The pepper never
-- leaves the server, so these cannot be reversed or matched elsewhere.
create table if not exists public.identity_fingerprints (
  user_id    uuid not null references auth.users(id) on delete cascade,
  kind       text not null check (kind in ('document','id_number','name_dob','device')),
  hash       text not null check (hash ~ '^[a-f0-9]{64}$'),
  source     text not null default 'didit',
  session_id uuid references public.verification_sessions(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (user_id, kind, hash)
);
create index if not exists identity_fp_lookup on public.identity_fingerprints (kind, hash);

create table if not exists public.identity_links (
  id          uuid primary key default gen_random_uuid(),
  user_a      uuid not null references auth.users(id) on delete cascade,
  user_b      uuid not null references auth.users(id) on delete cascade,
  reason      text not null check (reason in ('same_document','same_id_number','same_name_dob','same_face','same_device','same_phone','same_email_alias','same_payout')),
  strength    text not null check (strength in ('strong','medium','weak')),
  severity    text not null default 'info' check (severity in ('info','review','critical')),
  status      text not null default 'open' check (status in ('open','allowed','same_person','dismissed','move_requested')),
  note        text,
  detected_at timestamptz not null default now(),
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  constraint identity_links_order check (user_a < user_b),
  unique (user_a, user_b, reason)
);
create index if not exists identity_links_open on public.identity_links (detected_at desc) where status in ('open','move_requested') and severity <> 'info';
create index if not exists identity_links_a on public.identity_links (user_a);
create index if not exists identity_links_b on public.identity_links (user_b);

do $$ declare t text; begin
  foreach t in array array['identity_fingerprints','identity_links'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from public, anon, authenticated', t);
    execute format('grant all on public.%I to service_role', t);
    execute format('drop policy if exists %I on public.%I', t || '_service', t);
    execute format('create policy %I on public.%I for all to service_role using (true) with check (true)', t || '_service', t);
  end loop;
end $$;

-- Is an account currently restricted? One definition for everything.
create or replace function public.cabana_is_restricted(p_user uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((select pr.banned or coalesce(pr.suspended_until > now(), false) or pr.host_status in ('suspended','banned')
                   or pr.status in ('banned','suspended') from public.profiles pr where pr.id = p_user), false)
      or exists (select 1 from public.agents a where a.id = p_user and coalesce(a.suspended, false));
$$;
revoke all on function public.cabana_is_restricted(uuid) from public, anon, authenticated;
grant execute on function public.cabana_is_restricted(uuid) to service_role;

create or replace function public.cabana_link_accounts(p_a uuid, p_b uuid, p_reason text, p_strength text, p_severity text, p_note text default null)
returns void language plpgsql volatile security definer set search_path = '' as $$
declare lo uuid := least(p_a, p_b); hi uuid := greatest(p_a, p_b);
begin
  if p_a is null or p_b is null or p_a = p_b then return; end if;
  insert into public.identity_links (user_a, user_b, reason, strength, severity, note)
    values (lo, hi, p_reason, p_strength, p_severity, p_note)
  on conflict (user_a, user_b, reason) do update
    set severity = case when public.identity_links.status in ('allowed','same_person','dismissed') then public.identity_links.severity
                        when excluded.severity = 'critical' or public.identity_links.severity = 'critical' then 'critical'
                        when excluded.severity = 'review' or public.identity_links.severity = 'review' then 'review' else 'info' end,
        note = coalesce(excluded.note, public.identity_links.note);
end $$;
revoke all on function public.cabana_link_accounts(uuid, uuid, text, text, text, text) from public, anon, authenticated;
grant execute on function public.cabana_link_accounts(uuid, uuid, text, text, text, text) to service_role;

-- ── 3 · soft signals: phone and email aliases shared with a restricted account
create or replace function public.cabana_norm_phone(p text)
returns text language sql immutable set search_path = '' as $$
  select case
    when d is null or length(d) < 9 then null
    when length(d) = 10 and left(d, 1) = '0' then '254' || right(d, 9)
    when length(d) = 9 and left(d, 1) in ('7','1') then '254' || d
    else d end
  from (select nullif(regexp_replace(coalesce(p, ''), '\D', '', 'g'), '') d) x;
$$;
create or replace function public.cabana_norm_email(p text)
returns text language sql immutable set search_path = '' as $$
  select case when e is null or position('@' in e) = 0 then null
    when split_part(e, '@', 2) in ('gmail.com','googlemail.com')
      then replace(split_part(split_part(e, '@', 1), '+', 1), '.', '') || '@gmail.com'
    else split_part(split_part(e, '@', 1), '+', 1) || '@' || split_part(e, '@', 2) end
  from (select nullif(lower(btrim(coalesce(p, ''))), '') e) x;
$$;

create or replace function cabana_private.profile_signal_links()
returns trigger language plpgsql security definer set search_path = '' as $$
declare other record; phones text[]; mail text;
begin
  phones := array_remove(array[public.cabana_norm_phone(new.phone), public.cabana_norm_phone(new.mpesa_number), public.cabana_norm_phone(new.contact_phone)], null);
  mail := public.cabana_norm_email(new.email);
  for other in
    select p.id, 'same_phone' reason from public.profiles p
     where p.id <> new.id and cardinality(phones) > 0
       and (public.cabana_norm_phone(p.phone) = any(phones) or public.cabana_norm_phone(p.mpesa_number) = any(phones) or public.cabana_norm_phone(p.contact_phone) = any(phones))
    union
    select p.id, 'same_email_alias' from public.profiles p
     where p.id <> new.id and mail is not null and lower(coalesce(p.email,'')) <> lower(coalesce(new.email,''))
       and public.cabana_norm_email(p.email) = mail
  loop
    if public.cabana_is_restricted(other.id) or public.cabana_is_restricted(new.id) then
      perform public.cabana_link_accounts(new.id, other.id, other.reason, 'medium', 'review', 'Shares a ' || replace(other.reason, 'same_', '') || ' with a restricted account');
    else
      perform public.cabana_link_accounts(new.id, other.id, other.reason, 'weak', 'info', null);
    end if;
  end loop;
  return new;
exception when others then
  return new; -- signals must never break a sign-up or profile save
end $$;
drop trigger if exists profile_signal_links on public.profiles;
create trigger profile_signal_links after insert or update of phone, mpesa_number, contact_phone, email on public.profiles
  for each row execute function cabana_private.profile_signal_links();

-- When someone is banned, every account already linked to them becomes worth a look.
create or replace function cabana_private.profile_ban_escalate()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if coalesce(new.banned, false) and not coalesce(old.banned, false) then
    update public.identity_links set severity = case when strength = 'weak' then 'review' else 'critical' end
     where status = 'open' and (user_a = new.id or user_b = new.id);
  end if;
  return new;
exception when others then return new;
end $$;
drop trigger if exists profile_ban_escalate on public.profiles;
create trigger profile_ban_escalate after update of banned on public.profiles
  for each row execute function cabana_private.profile_ban_escalate();

-- ── 4 · verify once ──────────────────────────────────────────────────
create or replace function cabana_private.identity_satisfies_agent()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.identity_state = 'approved' and (tg_op = 'INSERT' or old.identity_state is distinct from 'approved') then
    update public.agents set kyc_status = 'verified', kyc_verified_at = now(), kyc_reject_reason = null, updated_at = now()
     where id = new.user_id and kyc_status <> 'verified';
  end if;
  return new;
end $$;
drop trigger if exists identity_satisfies_agent on public.verification_status;
create trigger identity_satisfies_agent after insert or update of identity_state on public.verification_status
  for each row execute function cabana_private.identity_satisfies_agent();

create or replace function cabana_private.agent_inherits_identity()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if coalesce(new.kyc_status, 'unverified') <> 'verified' and exists (
    select 1 from public.verification_status vs where vs.user_id = new.id and vs.identity_state = 'approved'
      and (vs.identity_expires is null or vs.identity_expires > now())) then
    new.kyc_status := 'verified'; new.kyc_verified_at := now(); new.kyc_reject_reason := null;
  end if;
  return new;
end $$;
drop trigger if exists agent_inherits_identity on public.agents;
create trigger agent_inherits_identity before insert on public.agents
  for each row execute function cabana_private.agent_inherits_identity();

-- Existing agents who already hold a Didit identity.
update public.agents a set kyc_status = 'verified', kyc_verified_at = coalesce(a.kyc_verified_at, now()), kyc_reject_reason = null
 where a.kyc_status <> 'verified' and exists (select 1 from public.verification_status vs where vs.user_id = a.id and vs.identity_state = 'approved');

-- ── 5 · operator inbox: linked accounts worth a look ─────────────────
do $$
declare d text; patched text;
begin
  d := pg_get_functiondef('public.admin_inbox()'::regprocedure);
  if position('Possible duplicate account' in d) > 0 then return; end if;
  patched := replace(d, $x$       + (select count(distinct target_id) from public.profile_reports where status = 'open')
    into v_n;$x$, $x$       + (select count(distinct target_id) from public.profile_reports where status = 'open')
       + (select count(*) from public.identity_links where status in ('open','move_requested') and severity <> 'info')
    into v_n;$x$);
  patched := replace(patched, $x$        from public.profile_reports pr where pr.status = 'open' group by pr.target_id
    ) z order by at desc limit 8) q;$x$, $x$        from public.profile_reports pr where pr.status = 'open' group by pr.target_id
      union all
      select jsonb_build_object('queue','profiles','severity', case when il.severity = 'critical' then 'high' else 'med' end,'id',il.id::text,
        'title', case when il.status = 'move_requested' then 'Verification move requested' else 'Possible duplicate account' end,
        'sub', replace(il.reason,'_',' ') || coalesce(' · ' || il.note, ''), 'at', il.detected_at, 'link','#/profiles?tab=links'), il.detected_at
        from public.identity_links il where il.status in ('open','move_requested') and il.severity <> 'info'
    ) z order by at desc limit 8) q;$x$);
  if patched = d then raise exception 'admin_inbox changed shape; patch by hand'; end if;
  execute patched;
end $$;
