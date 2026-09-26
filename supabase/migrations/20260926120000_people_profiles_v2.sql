-- ════════════════════════════════════════════════════════════════════
-- CABANA · PEOPLE PROFILES v2
-- Individual and organisation profiles, follows, verification badges,
-- living avatars, gated photos and a moderation trail.
--
-- Principles
--   · Public projection only. Email, phone, payments, ID numbers and
--     documents never leave private tables; the API returns cards built
--     by cabana_people_cards(), which exposes no private column.
--   · Badges are computed, never stored on the profile, so they cannot
--     be written by the member:
--       purple 'person'        identity verified (Didit KYC, a reviewed
--                              agent ID, or an approved ID check)
--       gold   'organization'  organisation account whose registration
--                              Cabana reviewed, run by a verified person
--   · Every table here is service-role only. Members act through
--     /api/people, which binds every write to their real session.
-- ════════════════════════════════════════════════════════════════════

-- ── 1 · Public profile, extended ─────────────────────────────────────
alter table public.member_public_profiles
  add column if not exists handle           text,
  add column if not exists account_type     text not null default 'individual',
  add column if not exists headline         text not null default '',
  add column if not exists city             text,
  add column if not exists country_code     text,
  add column if not exists show_location    boolean not null default false,
  add column if not exists languages        text[] not null default '{}',
  add column if not exists interests        text[] not null default '{}',
  add column if not exists avatar           jsonb,
  add column if not exists photo_url        text,
  add column if not exists photo_status     text not null default 'none',
  add column if not exists photo_updated_at timestamptz,
  add column if not exists theme            text not null default 'equator',
  add column if not exists org_name         text,
  add column if not exists org_kind         text,
  add column if not exists org_website      text,
  add column if not exists show_followers   boolean not null default true,
  add column if not exists allow_follow     boolean not null default true,
  add column if not exists show_listings    boolean not null default true,
  add column if not exists created_at       timestamptz not null default now();

do $$ begin
  alter table public.member_public_profiles
    add constraint mpp_handle_shape check (handle is null or handle ~ '^[a-z0-9][a-z0-9._]{1,22}[a-z0-9]$'),
    add constraint mpp_account_type check (account_type in ('individual','organization')),
    add constraint mpp_headline_len check (length(headline) <= 80),
    add constraint mpp_city_len check (city is null or length(city) <= 60),
    add constraint mpp_country check (country_code is null or country_code ~ '^[A-Z]{2}$'),
    add constraint mpp_languages check (cardinality(languages) <= 6),
    add constraint mpp_interests check (cardinality(interests) <= 8),
    add constraint mpp_avatar check (avatar is null or (jsonb_typeof(avatar) = 'object' and pg_column_size(avatar) < 600)),
    add constraint mpp_photo_status check (photo_status in ('none','approved','pending','rejected','removed')),
    add constraint mpp_photo_url check (photo_url is null or (photo_url like 'https://%' and length(photo_url) <= 400)),
    add constraint mpp_theme check (theme ~ '^[a-z0-9-]{2,24}$'),
    add constraint mpp_org_name check (org_name is null or length(org_name) between 2 and 80),
    add constraint mpp_org_kind check (org_kind is null or org_kind in
      ('company','hotel','property_manager','tour_operator','travel_agency','car_hire','restaurant',
       'event_organiser','ngo','government','school','other')),
    add constraint mpp_org_website check (org_website is null or (org_website ~ '^https://' and length(org_website) <= 120));
exception when duplicate_object then null; end $$;

create unique index if not exists mpp_handle_unique on public.member_public_profiles (lower(handle)) where handle is not null;
create index if not exists mpp_org_name_norm on public.member_public_profiles (lower(regexp_replace(org_name, '[^a-zA-Z0-9]', '', 'g')))
  where account_type = 'organization' and org_name is not null;

-- ── 2 · Follows ──────────────────────────────────────────────────────
create table if not exists public.member_follows (
  follower_id uuid not null references auth.users(id) on delete cascade,
  followee_id uuid not null references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (follower_id, followee_id),
  constraint member_follows_not_self check (follower_id <> followee_id)
);
create index if not exists member_follows_followee on public.member_follows (followee_id, created_at desc);
create index if not exists member_follows_follower on public.member_follows (follower_id, created_at desc);

-- ── 3 · Reports ──────────────────────────────────────────────────────
create table if not exists public.profile_reports (
  id          bigint generated always as identity primary key,
  reporter_id uuid not null references auth.users(id) on delete cascade,
  target_id   uuid not null references auth.users(id) on delete cascade,
  reason      text not null check (reason in ('impersonation','inappropriate_photo','offensive_content','scam','spam','other')),
  detail      text not null default '' check (length(detail) <= 500),
  status      text not null default 'open' check (status in ('open','actioned','dismissed')),
  resolution  text,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at  timestamptz not null default now(),
  constraint profile_reports_not_self check (reporter_id <> target_id)
);
create unique index if not exists profile_reports_one_open on public.profile_reports (reporter_id, target_id) where status = 'open';
create index if not exists profile_reports_open on public.profile_reports (target_id, created_at desc) where status = 'open';

-- ── 4 · Photo moderation trail ───────────────────────────────────────
-- Images are never copied here. A rejected image is deleted at once;
-- only its fingerprint stays, so the same file cannot be retried.
create table if not exists public.profile_photo_reviews (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  storage_path text,
  sha256       text not null check (sha256 ~ '^[a-f0-9]{64}$'),
  status       text not null check (status in ('approved','rejected','pending_review')),
  source       text not null check (source in ('ai','human','report','hash')),
  verdict      jsonb not null default '{}'::jsonb,
  reason       text,
  reviewed_by  uuid references auth.users(id) on delete set null,
  reviewed_at  timestamptz,
  created_at   timestamptz not null default now()
);
create index if not exists ppr_queue on public.profile_photo_reviews (created_at) where status = 'pending_review';
create index if not exists ppr_rejected_hash on public.profile_photo_reviews (sha256) where status = 'rejected';
create index if not exists ppr_user on public.profile_photo_reviews (user_id, created_at desc);

-- ── 5 · Organisation verification (gold) ─────────────────────────────
create table if not exists public.organization_verifications (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users(id) on delete cascade,
  legal_name          text not null check (length(legal_name) between 2 and 120),
  org_kind            text not null,
  country_code        text not null check (country_code ~ '^[A-Z]{2}$'),
  registration_number text not null check (length(registration_number) between 2 and 60),
  website             text check (website is null or (website ~ '^https://' and length(website) <= 120)),
  document_path       text not null check (length(document_path) <= 300),
  status              text not null default 'submitted' check (status in ('submitted','approved','rejected','revoked','withdrawn')),
  review_note         text check (review_note is null or length(review_note) <= 500),
  reviewed_by         uuid references auth.users(id) on delete set null,
  reviewed_at         timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create unique index if not exists org_verif_one_active on public.organization_verifications (user_id) where status in ('submitted','approved');
create index if not exists org_verif_queue on public.organization_verifications (created_at) where status = 'submitted';

-- ── 6 · Lock everything to the server ────────────────────────────────
do $$ declare t text; begin
  foreach t in array array['member_follows','profile_reports','profile_photo_reviews','organization_verifications'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from public, anon, authenticated', t);
    execute format('grant all on public.%I to service_role', t);
    execute format('drop policy if exists %I on public.%I', t || '_service', t);
    execute format('create policy %I on public.%I for all to service_role using (true) with check (true)', t || '_service', t);
  end loop;
end $$;
grant usage, select on sequence public.profile_reports_id_seq to service_role;

-- Identity outcomes are written by the server only. The legacy
-- id_verifications table allowed a member to update their own row,
-- including its status; members may now only read theirs.
drop policy if exists user_own_verification on public.id_verifications;
drop policy if exists id_verifications_read_own on public.id_verifications;
create policy id_verifications_read_own on public.id_verifications for select to authenticated
  using (user_id = (select auth.uid()));
revoke insert, update, delete on public.id_verifications from anon, authenticated;
revoke insert, update, delete on public.verification_status, public.verification_sessions from anon, authenticated;

-- ── 7 · Storage ──────────────────────────────────────────────────────
-- profile-photos : public, written only by the server after moderation
-- profile-pending: private inbox, a member may add files to their folder
-- org-documents  : private, a member may add files to their folder
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('profile-photos',  'profile-photos',  true,  1048576, array['image/webp','image/jpeg','image/png']),
  ('profile-pending', 'profile-pending', false, 3145728, array['image/webp','image/jpeg','image/png']),
  ('org-documents',   'org-documents',   false, 8388608, array['image/jpeg','image/png','image/webp','application/pdf'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "profile pending: own folder insert" on storage.objects;
create policy "profile pending: own folder insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'profile-pending' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists "org documents: own folder insert" on storage.objects;
create policy "org documents: own folder insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'org-documents' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- ── 8 · The only public projection ───────────────────────────────────
create or replace function public.cabana_people_cards(p_ids uuid[])
returns table (
  id uuid, first_name text, display_name text, published boolean, handle text,
  account_type text, avatar jsonb, photo_url text, headline text, org_kind text,
  identity_verified boolean, org_verified boolean, badge text, professional boolean,
  allow_follow boolean, hidden boolean
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
      ) identity_verified,
      exists (select 1 from public.organization_verifications o where o.user_id = i.id and o.status = 'approved') org_approved,
      (
        exists (select 1 from public.listings l where l.partner_id = i.id and l.is_active and l.status = 'active' and l.deleted_at is null)
        or exists (select 1 from public.agents a where a.id = i.id and not coalesce(a.suspended, false))
        or exists (select 1 from public.ambassadors am where am.id = i.id and am.status = 'active')
        or exists (select 1 from public.tour_operators t where t.owner_id = i.id and t.status in ('active','approved','published'))
        or exists (select 1 from public.event_organisers e where e.owner_id = i.id and e.status in ('active','approved','published'))
        or exists (select 1 from public.car_operators c where c.owner_id = i.id and coalesce(c.verified, false))
      ) professional
    from ids i
    left join auth.users u on u.id = i.id
    left join public.profiles pr on pr.id = i.id
    left join public.member_public_profiles m on m.user_id = i.id
  )
  select b.id, b.first_name, b.display_name, b.published, b.handle, b.account_type, b.avatar, b.photo_url,
    b.headline, b.org_kind, b.identity_verified,
    (b.org_approved and b.account_type = 'organization') org_verified,
    case when b.account_type = 'organization' then case when b.org_approved then 'organization' end
         when b.identity_verified then 'person' end badge,
    b.professional, b.allow_follow, b.hidden
  from base b;
$$;
revoke all on function public.cabana_people_cards(uuid[]) from public, anon, authenticated;
grant execute on function public.cabana_people_cards(uuid[]) to service_role;

-- Counts and history for one full profile. Returns no private column.
create or replace function public.cabana_people_stats(p_id uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'followers', (select count(*) from public.member_follows f where f.followee_id = p_id),
    'following', (select count(*) from public.member_follows f where f.follower_id = p_id),
    'listings',  (select count(*) from public.listings l where l.partner_id = p_id and l.is_active and l.status = 'active' and l.deleted_at is null),
    'reviews',   (select count(*) from public.reviews r join public.listings l on l.id = r.listing_id where l.partner_id = p_id),
    'rating',    (select round(avg(r.rating)::numeric, 2) from public.reviews r join public.listings l on l.id = r.listing_id where l.partner_id = p_id),
    'member_since', (select to_char(u.created_at, 'YYYY-MM') from auth.users u where u.id = p_id),
    'identity_since', (select to_char(vs.identity_at, 'YYYY-MM') from public.verification_status vs where vs.user_id = p_id and vs.identity_state = 'approved'),
    'org_since', (select to_char(max(o.reviewed_at), 'YYYY-MM') from public.organization_verifications o where o.user_id = p_id and o.status = 'approved'),
    'roles', public.cabana_public_role_badges(p_id),
    'operators', coalesce((
      select jsonb_agg(x) from (
        select jsonb_build_object('kind', 'tour_operator', 'name', t.name, 'verified', coalesce(t.verified, false)) x
          from public.tour_operators t where t.owner_id = p_id and t.status in ('active','approved','published')
        union all
        select jsonb_build_object('kind', 'event_organiser', 'name', e.name, 'verified', coalesce(e.verified, false))
          from public.event_organisers e where e.owner_id = p_id and e.status in ('active','approved','published')
        union all
        select jsonb_build_object('kind', 'car_hire', 'name', c.name, 'verified', coalesce(c.verified, false))
          from public.car_operators c where c.owner_id = p_id and coalesce(c.verified, false)
      ) z), '[]'::jsonb)
  );
$$;
revoke all on function public.cabana_people_stats(uuid) from public, anon, authenticated;
grant execute on function public.cabana_people_stats(uuid) to service_role;

-- Atomic follow with a daily ceiling, so a script cannot follow the
-- whole directory. Returns the follower count after the change.
create or replace function public.cabana_follow(p_follower uuid, p_followee uuid, p_on boolean)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare v_new boolean := false;
begin
  if p_follower = p_followee then raise exception 'You cannot follow yourself.' using errcode = 'P0001'; end if;
  if p_on then
    if (select count(*) from public.member_follows where follower_id = p_follower and created_at > now() - interval '24 hours') >= 200 then
      raise exception 'You have followed a lot of people today. Try again tomorrow.' using errcode = 'P0001';
    end if;
    insert into public.member_follows (follower_id, followee_id) values (p_follower, p_followee)
      on conflict do nothing;
    v_new := found;
  else
    delete from public.member_follows where follower_id = p_follower and followee_id = p_followee;
  end if;
  return jsonb_build_object('following', p_on, 'new', v_new,
    'followers', (select count(*) from public.member_follows where followee_id = p_followee));
end $$;
revoke all on function public.cabana_follow(uuid, uuid, boolean) from public, anon, authenticated;
grant execute on function public.cabana_follow(uuid, uuid, boolean) to service_role;

-- ── 9 · Operator inbox ───────────────────────────────────────────────
do $$
declare d text; patched text;
begin
  d := pg_get_functiondef('public.admin_inbox()'::regprocedure);
  if position('queue'',''profiles''' in d) > 0 then return; end if;
  patched := replace(d, '  select count(*) into v_n from public.partner_uploads',
$blk$  select (select count(*) from public.profile_photo_reviews where status = 'pending_review')
       + (select count(*) from public.organization_verifications where status = 'submitted')
       + (select count(distinct target_id) from public.profile_reports where status = 'open')
    into v_n;
  counts := counts || jsonb_build_object('profiles', v_n);
  select coalesce(jsonb_agg(x), '[]'::jsonb) into v from (
    select * from (
      select jsonb_build_object('queue','profiles','severity','med','id',o.id::text,
        'title','Organisation check · ' || o.legal_name,
        'sub', upper(o.country_code) || ' · ' || replace(o.org_kind,'_',' '), 'at', o.created_at, 'link','#/profiles?tab=orgs') as x, o.created_at as at
        from public.organization_verifications o where o.status = 'submitted'
      union all
      select jsonb_build_object('queue','profiles','severity','med','id',r.id::text,
        'title','Profile photo to review', 'sub', coalesce(r.reason, 'Automatic check was not certain'),
        'at', r.created_at, 'link','#/profiles?tab=photos'), r.created_at
        from public.profile_photo_reviews r where r.status = 'pending_review'
      union all
      select jsonb_build_object('queue','profiles','severity', case when count(*) >= 3 then 'high' else 'med' end,'id',pr.target_id::text,
        'title','Profile reported · ' || count(*) || ' report' || case when count(*) > 1 then 's' else '' end,
        'sub', string_agg(distinct replace(pr.reason,'_',' '), ', '), 'at', max(pr.created_at), 'link','#/profiles?tab=reports'), max(pr.created_at)
        from public.profile_reports pr where pr.status = 'open' group by pr.target_id
    ) z order by at desc limit 8) q;
  items := items || v;

  select count(*) into v_n from public.partner_uploads$blk$);
  if patched = d then raise exception 'admin_inbox changed shape; patch by hand'; end if;
  execute patched;
end $$;
