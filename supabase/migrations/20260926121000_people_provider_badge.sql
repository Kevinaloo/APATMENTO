-- ════════════════════════════════════════════════════════════════════
-- CABANA · THIRD TICK: VERIFIED PROVIDER ("Cabana Reef")
--
--   person        purple  identity verified individual
--   organization  gold    verified organisation
--   provider      reef    a verified person OR organisation that
--                         actively offers services on Cabana
--
-- Provider outranks the other two, because it carries both facts:
-- "we know who this is" and "they deliver on Cabana right now". It is
-- earned and lost automatically: pause every listing and it falls back
-- to purple or gold on the next read, with nothing stored to go stale.
--
-- Offering services means at least one of:
--   an active, published listing (stays, rooms, food, shopping…)
--   an approved tour operator or event organiser
--   a verified car-hire operator or an approved Cabana Move driver
--   an agent with at least one host-approved partnership
-- ════════════════════════════════════════════════════════════════════
drop function if exists public.cabana_people_cards(uuid[]);
create function public.cabana_people_cards(p_ids uuid[])
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
        or coalesce(pr.verified, false)  -- host verified by a Cabana operator
      ) identity_verified,
      exists (select 1 from public.organization_verifications o where o.user_id = i.id and o.status = 'approved') org_approved,
      (
        exists (select 1 from public.listings l where l.partner_id = i.id and l.is_active and l.status = 'active' and l.deleted_at is null)
        or exists (select 1 from public.tour_operators t where t.owner_id = i.id and t.status = 'approved')
        or exists (select 1 from public.event_organisers e where e.owner_id = i.id and e.status = 'approved')
        or exists (select 1 from public.car_operators c where c.owner_id = i.id and coalesce(c.verified, false))
        or exists (select 1 from public.drivers d where d.user_id = i.id and d.status = 'approved')
        or exists (select 1 from public.agent_partnerships ap join public.agents a on a.id = ap.agent_id
                    where ap.agent_id = i.id and ap.status = 'approved' and not coalesce(a.suspended, false))
      ) offers_services,
      (
        exists (select 1 from public.agents a where a.id = i.id and not coalesce(a.suspended, false))
        or exists (select 1 from public.ambassadors am where am.id = i.id and am.status = 'active')
      ) other_role
    from ids i
    left join auth.users u on u.id = i.id
    left join public.profiles pr on pr.id = i.id
    left join public.member_public_profiles m on m.user_id = i.id
  ),
  graded as (
    select b.*,
      case when b.account_type = 'organization' then b.org_approved else b.identity_verified end as entity_verified
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
