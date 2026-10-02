-- ═══════════════════════════════════════════════════════════════════════
-- CABANA · ONE CLEARANCE
-- ───────────────────────────────────────────────────────────────────────
-- Verify once, cleared everywhere. One person has one identity check
-- (Didit, government ID plus live selfie). Every role reads that same
-- answer; nobody is asked twice because they moved from hosting rooms
-- to driving to guiding.
--
-- What each role needs before it can operate:
--
--   ambassador, agent, influencer   identity            before the desk opens
--   driver                          identity + licence  before accepting a ride
--                                                       (the dashboard opens at once)
--   tour operator, tour guide       identity            before publishing a tour
--   event organiser                 identity            before publishing an event
--   rooms, food, shopping           identity            before a listing goes live
--   stays, car hire                 nothing at the start (a tick is optional)
--
--   An ORGANISATION account (company, NGO, school …) also needs its
--   registration certificate approved, on top of the person behind it.
--   Personal sellers in rooms, food, events and shopping never need
--   business documents.
--
-- Enforced in the database, not in a page:
--   · agent_status is 'active' only for a verified identity (the old
--     14 day grace and "submitted counts as active" are gone)
--   · is_ambassador and ambassador_gate require a verified identity
--   · drivers go online, receive invitations, make offers and get
--     assigned only when cleared; they are auto-approved the moment their
--     identity is verified and a person approves their licence
--   · tours, operators and events cannot be published by an uncleared
--     owner; gated listings wait in 'pending_verification' and switch
--     on by themselves the moment the owner clears
-- ═══════════════════════════════════════════════════════════════════════

-- ── 1 · the single answers ────────────────────────────────────────────
create or replace function public.cabana_identity_verified(p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_user is not null and (
    exists (select 1 from public.verification_status vs
             where vs.user_id = p_user and vs.identity_state = 'approved'
               and (vs.identity_expires is null or vs.identity_expires > now()))
    or exists (select 1 from public.agents a where a.id = p_user and a.kyc_status = 'verified')
    or exists (select 1 from public.profiles pr where pr.id = p_user
                 and (coalesce(pr.verified, false) or coalesce(pr.id_verification_status, '') in ('approved', 'verified')))
  );
$$;
revoke all on function public.cabana_identity_verified(uuid) from public, anon;
grant execute on function public.cabana_identity_verified(uuid) to authenticated, service_role;

create or replace function public.cabana_org_account(p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select m.account_type = 'organization' from public.member_public_profiles m where m.user_id = p_user), false);
$$;
revoke all on function public.cabana_org_account(uuid) from public, anon;
grant execute on function public.cabana_org_account(uuid) to authenticated, service_role;

-- ── 2 · the rules, readable by anyone (they are requirements, not fees)
create table if not exists public.cabana_kyc_rules (
  role                   text primary key,
  label                  text not null,
  needs_identity         boolean not null default true,
  needs_licence          boolean not null default false,
  org_needs_registration boolean not null default true,
  gate                   text,
  why                    text not null,
  sort                   smallint not null default 0
);
alter table public.cabana_kyc_rules enable row level security;
do $$ begin
  create policy cabana_kyc_rules_read on public.cabana_kyc_rules for select to anon, authenticated using (true);
exception when duplicate_object then null; end $$;
grant select on public.cabana_kyc_rules to anon, authenticated;

insert into public.cabana_kyc_rules (role, label, needs_identity, needs_licence, gate, why, sort) values
  ('ambassador',      'Cabana ambassador',  true,  false, 'Open the ambassador desk',
   'Ambassadors bring hosts and money onto Cabana in our name, so we confirm who they are first.', 10),
  ('agent',           'Cabana agent',       true,  false, 'Represent listings and earn',
   'Hosts trust agents whose identity Cabana has confirmed.', 20),
  ('influencer',      'Creator',            true,  false, 'Share links that earn',
   'Creator links pay out real money, so the person behind them is verified once.', 30),
  ('driver',          'Cabana Move driver', true,  true,  'Accept rides',
   'Riders step into your car. We confirm your identity and your driving licence before your first trip.', 40),
  ('tour_operator',   'Tour operator',      true,  false, 'Publish tours',
   'Travellers hand over deposits for a day in your hands. They book verified operators.', 50),
  ('tour_guide',      'Tour guide',         true,  false, 'Publish tours',
   'Travellers hand over deposits for a day in your hands. They book verified guides.', 55),
  ('event_organiser', 'Event organiser',    true,  false, 'Publish events and sell tickets',
   'Ticket money is paid before the night. Buyers know a verified person is behind the door list.', 60),
  ('roommates_host',  'Room host',          true,  false, 'Publish rooms',
   'Someone will live in your home. Both sides are verified before a key changes hands.', 70),
  ('food_vendor',     'Kitchen',            true,  false, 'Publish your kitchen',
   'Diners pay and wait at their door. They order from verified kitchens.', 80),
  ('shopping_seller', 'Seller',             true,  false, 'Publish your shop',
   'Buyers pay before delivery. They buy from verified sellers.', 90),
  ('stays_host',      'Stay host',          false, false, null,
   'Optional. Guests see a purple tick on your stays and book with more confidence.', 100),
  ('car_hire',        'Car hire operator',  false, false, null,
   'Optional at the start. Renters see who owns the fleet they are booking.', 110)
on conflict (role) do update set label = excluded.label, needs_identity = excluded.needs_identity,
  needs_licence = excluded.needs_licence, gate = excluded.gate, why = excluded.why, sort = excluded.sort;

-- ── 3 · a role's clearance, as steps a person can act on ──────────────
create or replace function public.cabana_clearance(p_user uuid, p_role text)
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  r public.cabana_kyc_rules%rowtype;
  v_id boolean; v_session text; v_decline text; v_org boolean; v_org_state text;
  v_driver public.drivers%rowtype; v_lic public.driver_documents%rowtype;
  v_lic_state text; steps jsonb := '[]'::jsonb; ok boolean := true;
begin
  select * into r from public.cabana_kyc_rules where role = p_role;
  if not found then
    return jsonb_build_object('role', p_role, 'cleared', true, 'steps', '[]'::jsonb);
  end if;

  v_id := public.cabana_identity_verified(p_user);
  select s.state::text, s.decline_reason into v_session, v_decline
    from public.verification_sessions s where s.user_id = p_user order by s.created_at desc limit 1;

  if r.needs_identity then
    steps := steps || jsonb_build_object('key', 'identity', 'label', 'Government ID and a live selfie',
      'state', case when v_id then 'done'
                    when v_session = 'review' then 'review'
                    when v_session = 'in_progress' then 'in_progress'
                    when v_session = 'declined' then 'declined' else 'todo' end,
      'detail', case when v_decline = 'duplicate_identity' then 'duplicate_identity' end);
    ok := ok and v_id;
  end if;

  if r.needs_licence then
    select * into v_driver from public.drivers where user_id = p_user;
    if found then
      select * into v_lic from public.driver_documents d
       where d.driver_id = v_driver.id and d.kind = 'driving_licence' and d.file_url is not null
       order by (d.status = 'approved') desc, d.created_at desc limit 1;
    end if;
    v_lic_state := case
      when v_lic.id is null then 'todo'
      when v_lic.status = 'approved' and (v_lic.expires_on is null or v_lic.expires_on >= current_date) then 'done'
      when v_lic.status = 'approved' then 'expired'
      when v_lic.status = 'pending' then 'review'
      when v_lic.status = 'rejected' then 'declined'
      else coalesce(v_lic.status, 'todo') end;
    steps := steps || jsonb_build_object('key', 'licence', 'label', 'Driving licence',
      'state', v_lic_state, 'detail', v_lic.note, 'expires_on', v_lic.expires_on);
    ok := ok and v_lic_state = 'done';
  end if;

  v_org := public.cabana_org_account(p_user);
  if v_org and r.org_needs_registration and r.needs_identity then
    select o.status into v_org_state from public.organization_verifications o
     where o.user_id = p_user order by o.created_at desc limit 1;
    steps := steps || jsonb_build_object('key', 'organisation', 'label', 'Registration certificate',
      'state', case v_org_state when 'approved' then 'done' when 'submitted' then 'review'
                                when 'rejected' then 'declined' when 'revoked' then 'declined' else 'todo' end);
    ok := ok and v_org_state = 'approved';
  end if;

  return jsonb_build_object('role', r.role, 'label', r.label, 'gate', r.gate, 'why', r.why,
    'cleared', ok, 'required', r.needs_identity or r.needs_licence, 'organisation', v_org, 'steps', steps);
end $$;
revoke all on function public.cabana_clearance(uuid, text) from public, anon, authenticated;
grant execute on function public.cabana_clearance(uuid, text) to service_role;

-- The signed-in person's own picture: identity once, then every role
-- they hold (or the one they are about to take on).
create or replace function public.cabana_my_clearance(p_role text default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare me uuid := auth.uid(); roles text[] := '{}'; out jsonb := '[]'::jsonb; x text;
begin
  if me is null then raise exception 'Sign in to see your verification.' using errcode = '42501'; end if;
  if p_role is not null then
    roles := array[p_role];
  else
    if exists (select 1 from public.ambassadors where id = me) then roles := roles || 'ambassador'; end if;
    if exists (select 1 from public.agents where id = me and not coalesce(is_creator, false)) then roles := roles || 'agent'; end if;
    if exists (select 1 from public.agents where id = me and coalesce(is_creator, false)) then roles := roles || 'influencer'; end if;
    if exists (select 1 from public.drivers where user_id = me) then roles := roles || 'driver'; end if;
    if exists (select 1 from public.tour_operators where owner_id = me and coalesce(persona, 'operator') = 'operator') then roles := roles || 'tour_operator'; end if;
    if exists (select 1 from public.tour_operators where owner_id = me and persona = 'guide') then roles := roles || 'tour_guide'; end if;
    if exists (select 1 from public.event_organisers where owner_id = me) or exists (select 1 from public.events where owner_id = me) then roles := roles || 'event_organiser'; end if;
    if exists (select 1 from public.listings where partner_id = me and service = 'roommates' and deleted_at is null) then roles := roles || 'roommates_host'; end if;
    if exists (select 1 from public.listings where partner_id = me and service = 'food' and deleted_at is null) then roles := roles || 'food_vendor'; end if;
    if exists (select 1 from public.listings where partner_id = me and service = 'shopping' and deleted_at is null) then roles := roles || 'shopping_seller'; end if;
    if exists (select 1 from public.listings where partner_id = me and coalesce(service, 'stays') = 'stays' and deleted_at is null) then roles := roles || 'stays_host'; end if;
    if exists (select 1 from public.car_operators where owner_id = me) then roles := roles || 'car_hire'; end if;
  end if;
  foreach x in array roles loop
    out := out || public.cabana_clearance(me, x);
  end loop;
  return jsonb_build_object('identity_verified', public.cabana_identity_verified(me),
    'organisation', public.cabana_org_account(me), 'roles', out);
end $$;
revoke all on function public.cabana_my_clearance(text) from public, anon;
grant execute on function public.cabana_my_clearance(text) to authenticated;

-- ── 4 · agents and creators: verified, or not yet ─────────────────────
create or replace function public.agent_status(a public.agents)
returns text
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select case when a.suspended then 'suspended'
              when a.kyc_status = 'verified' or public.cabana_identity_verified(a.id) then 'active'
              else 'restricted' end;
$$;

-- ── 5 · ambassadors ────────────────────────────────────────────────────
create or replace function public.is_ambassador(p_uid uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists(
    select 1 from public.ambassadors a
    join auth.users u on u.id = a.id
    join public.ambassador_allowlist w on w.email = a.email
    where a.id = p_uid and a.status <> 'suspended' and u.email_confirmed_at is not null and w.revoked_at is null
  ) and public.cabana_identity_verified(p_uid);
$$;

do $$
declare d text; p text;
begin
  d := pg_get_functiondef('public.ambassador_gate()'::regprocedure);
  if position('identity_required' in d) > 0 then return; end if;
  p := replace(d,
    $x$  return jsonb_build_object('ok',true,'email',v_email,'enrolled',found,$x$,
    $x$  if not public.cabana_identity_verified(v_uid) then
    return jsonb_build_object('ok',false,'reason','identity_required','email',v_email,
      'clearance',public.cabana_clearance(v_uid,'ambassador'),
      'full_name',coalesce(v_amb.full_name,v_allow.full_name));
  end if;
  return jsonb_build_object('ok',true,'email',v_email,'enrolled',found,$x$);
  if p = d then raise exception 'ambassador_gate changed shape; patch by hand'; end if;
  execute p;
end $$;

-- ── 6 · drivers: licence on file, identity verified, then the road ────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('kyc-documents', 'kyc-documents', false, 10485760,
        array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf'])
on conflict (id) do nothing;

do $$ begin
  create policy kyc_documents_own_insert on storage.objects for insert to authenticated
    with check (bucket_id = 'kyc-documents' and (storage.foldername(name))[1] = (select auth.uid())::text);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy kyc_documents_own_read on storage.objects for select to authenticated
    using (bucket_id = 'kyc-documents'
           and ((storage.foldername(name))[1] = (select auth.uid())::text or (select public.is_admin())));
exception when duplicate_object then null; end $$;

create or replace function public.cabana_driver_cleared(p_driver uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.drivers d
     where d.id = p_driver and d.status = 'approved'
       and public.cabana_identity_verified(d.user_id)
       and exists (select 1 from public.driver_documents x
                    where x.driver_id = d.id and x.kind = 'driving_licence' and x.status = 'approved'
                      and x.file_url is not null
                      and (x.expires_on is null or x.expires_on >= current_date))
  );
$$;
revoke all on function public.cabana_driver_cleared(uuid) from public, anon;
grant execute on function public.cabana_driver_cleared(uuid) to authenticated, service_role;

-- A driver files their own licence into their own folder; a person reviews it.
create or replace function public.driver_document_submit(p_kind text, p_path text, p_number text default null, p_expires date default null)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare d public.drivers%rowtype; v_id uuid;
begin
  select * into d from public.drivers where user_id = auth.uid();
  if not found then raise exception 'Apply as a driver first.' using errcode = '42501'; end if;
  if p_kind not in ('driving_licence', 'psv_badge', 'good_conduct', 'logbook', 'insurance', 'inspection', 'vehicle_photo') then
    raise exception 'That document type is not accepted here.' using errcode = '22023';
  end if;
  if p_path is null or split_part(p_path, '/', 1) <> auth.uid()::text or p_path ~ '\.\.' or length(p_path) > 300 then
    raise exception 'Upload the document again.' using errcode = '22023';
  end if;
  if p_kind = 'driving_licence' and p_expires is not null and p_expires < current_date then
    raise exception 'That licence has expired. Upload a valid one.' using errcode = '22023';
  end if;
  update public.driver_documents set status = 'expired', note = 'Replaced by a newer upload'
   where driver_id = d.id and kind = p_kind and status = 'pending';
  insert into public.driver_documents (driver_id, kind, file_url, status, expires_on)
  values (d.id, p_kind, p_path, 'pending', p_expires) returning id into v_id;
  if p_kind = 'driving_licence' then
    update public.drivers set licence_no = coalesce(nullif(btrim(p_number), ''), licence_no),
           licence_expiry = coalesce(p_expires, licence_expiry),
           status = case when status = 'applied' then 'under_review' else status end, updated_at = now()
     where id = d.id;
  end if;
  insert into public.ops_alerts (kind, severity, title, body, meta)
  values ('kyc', 'info', 'Driver document to review',
          'A driver uploaded a ' || replace(p_kind, '_', ' ') || '. Review it in People → Clearance.',
          jsonb_build_object('driver_id', d.id, 'document_id', v_id, 'kind', p_kind));
  return public.cabana_clearance(auth.uid(), 'driver');
end $$;
revoke all on function public.driver_document_submit(text, text, text, date) from public, anon;
grant execute on function public.driver_document_submit(text, text, text, date) to authenticated;

-- Approve a driver the moment the last condition lands.
create or replace function cabana_private.driver_auto_clear(p_user uuid)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare d public.drivers%rowtype;
begin
  select * into d from public.drivers where user_id = p_user for update;
  if not found or d.status not in ('applied', 'under_review') then return; end if;
  if not public.cabana_identity_verified(p_user) then return; end if;
  if not exists (select 1 from public.driver_documents x
                  where x.driver_id = d.id and x.kind = 'driving_licence' and x.status = 'approved'
                    and x.file_url is not null and (x.expires_on is null or x.expires_on >= current_date)) then
    return;
  end if;
  update public.drivers set status = 'approved', approved_at = coalesce(approved_at, now()),
         status_note = null, updated_at = now() where id = d.id;
  insert into public.notifications (user_id, title, body, url, kind, meta)
  values (p_user, 'You are cleared to drive',
          'Your identity and driving licence are verified. Go online and rides near you will start arriving.',
          '/driver', 'driver', jsonb_build_object('event', 'driver_cleared'));
end $$;
revoke all on function cabana_private.driver_auto_clear(uuid) from public, anon, authenticated;

create or replace function public.admin_clearance_queue()
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
begin
  if not public.is_admin() then raise exception 'Admins only' using errcode = '42501'; end if;
  return jsonb_build_object(
    'driver_documents', coalesce((select jsonb_agg(jsonb_build_object(
        'id', x.id, 'kind', x.kind, 'path', x.file_url, 'status', x.status, 'expires_on', x.expires_on,
        'created_at', x.created_at, 'driver_id', d.id, 'user_id', d.user_id, 'name', d.full_name,
        'phone', d.phone, 'licence_no', d.licence_no, 'driver_status', d.status,
        'identity_verified', public.cabana_identity_verified(d.user_id)) order by x.created_at)
      from public.driver_documents x join public.drivers d on d.id = x.driver_id
      where x.status = 'pending' and x.file_url is not null), '[]'::jsonb),
    'waiting_listings', coalesce((select jsonb_agg(jsonb_build_object('id', l.id, 'title', l.title,
        'service', l.service, 'partner_id', l.partner_id, 'updated_at', l.updated_at,
        'identity_verified', public.cabana_identity_verified(l.partner_id)) order by l.updated_at desc)
      from public.listings l where l.status = 'pending_verification' and l.deleted_at is null), '[]'::jsonb));
end $$;
revoke all on function public.admin_clearance_queue() from public, anon;
grant execute on function public.admin_clearance_queue() to authenticated;

create or replace function public.admin_driver_document_decide(p_document uuid, p_approve boolean, p_note text default null)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare x public.driver_documents%rowtype; d public.drivers%rowtype;
begin
  if not public.is_admin() then raise exception 'Admins only' using errcode = '42501'; end if;
  select * into x from public.driver_documents where id = p_document for update;
  if not found then raise exception 'Document not found' using errcode = 'P0002'; end if;
  select * into d from public.drivers where id = x.driver_id;
  update public.driver_documents
     set status = case when p_approve then 'approved' else 'rejected' end,
         note = nullif(left(btrim(coalesce(p_note, '')), 300), ''), reviewed_at = now()
   where id = x.id;
  if p_approve then
    perform cabana_private.driver_auto_clear(d.user_id);
  else
    insert into public.notifications (user_id, title, body, url, kind, meta)
    values (d.user_id, 'Your ' || replace(x.kind, '_', ' ') || ' needs another look',
            coalesce(nullif(btrim(p_note), ''), 'The photo was unclear or the document did not match. Upload it again from your driver dashboard.'),
            '/driver', 'driver', jsonb_build_object('event', 'document_rejected', 'kind', x.kind));
  end if;
  return public.cabana_clearance(d.user_id, 'driver');
end $$;
revoke all on function public.admin_driver_document_decide(uuid, boolean, text) from public, anon;
grant execute on function public.admin_driver_document_decide(uuid, boolean, text) to authenticated;

-- Rides only go to cleared drivers.
do $$
declare d text; p text;
begin
  d := pg_get_functiondef('public.cab_ping(double precision, double precision, boolean, boolean, text, numeric, numeric, integer)'::regprocedure);
  if position('cabana_driver_cleared' in d) = 0 then
    p := replace(d, $x$where user_id = auth.uid() and status = 'approved';$x$,
                    $x$where user_id = auth.uid() and status = 'approved' and public.cabana_driver_cleared(id);$x$);
    if p = d then raise exception 'cab_ping changed shape'; end if;
    execute p;
  end if;

  d := pg_get_functiondef('public.ride_driver_fits(uuid, uuid)'::regprocedure);
  if position('cabana_driver_cleared' in d) = 0 then
    p := replace(d, $x$and d.status = 'approved'$x$, $x$and public.cabana_driver_cleared(d.id)$x$);
    if p = d then raise exception 'ride_driver_fits changed shape'; end if;
    execute p;
  end if;

  d := pg_get_functiondef('public.ride_driver_offer(uuid, bigint, integer, text)'::regprocedure);
  if position('cabana_driver_cleared' in d) = 0 then
    p := replace(d, $x$if d.status <> 'approved' then perform public.ride_err('driver_not_approved'); end if;$x$,
      $x$if d.status <> 'approved' then perform public.ride_err('driver_not_approved'); end if;
  if not public.cabana_driver_cleared(d.id) then perform public.ride_err('driver_not_cleared'); end if;$x$);
    if p = d then raise exception 'ride_driver_offer changed shape'; end if;
    execute p;
  end if;

  d := pg_get_functiondef('public.ride_assign(uuid, uuid, text)'::regprocedure);
  if position('cabana_driver_cleared' in d) = 0 then
    p := replace(d, $x$if not found or d.status <> 'approved' then perform public.ride_err('driver_unavailable'); end if;$x$,
      $x$if not found or not public.cabana_driver_cleared(d.id) then perform public.ride_err('driver_unavailable'); end if;$x$);
    if p = d then raise exception 'ride_assign changed shape'; end if;
    execute p;
  end if;

  d := pg_get_functiondef('public.ride_driver_board()'::regprocedure);
  if position('cabana_driver_cleared' in d) = 0 then
    p := replace(d, $x$if d.status = 'approved' and l.is_online$x$, $x$if public.cabana_driver_cleared(d.id) and l.is_online$x$);
    p := replace(p, $x$'invitations', v_inv, 'active', v_active$x$,
      $x$'clearance', public.cabana_clearance(d.user_id, 'driver'), 'invitations', v_inv, 'active', v_active$x$);
    if p = d then raise exception 'ride_driver_board changed shape'; end if;
    execute p;
  end if;
end $$;

-- ── 7 · publishing needs a cleared owner ──────────────────────────────
create or replace function cabana_private.role_for_service(p_service text)
returns text
language sql
immutable
set search_path = pg_catalog
as $$
  select case lower(coalesce(p_service, 'stays'))
    when 'roommates' then 'roommates_host' when 'food' then 'food_vendor'
    when 'shopping' then 'shopping_seller' when 'events' then 'event_organiser'
    when 'tours' then 'tour_operator' else null end;
$$;

create or replace function cabana_private.listing_clearance_gate()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare v_role text := cabana_private.role_for_service(new.service);
begin
  if v_role is null or new.partner_id is null then return new; end if;
  if coalesce(new.is_active, false) and coalesce(new.status, 'active') = 'active'
     and (tg_op = 'INSERT' or not (coalesce(old.is_active, false) and coalesce(old.status, 'active') = 'active'))
     and not coalesce((public.cabana_clearance(new.partner_id, v_role)->>'cleared')::boolean, false) then
    new.status := 'pending_verification';
    new.is_active := false;
  end if;
  return new;
end $$;
revoke all on function cabana_private.listing_clearance_gate() from public, anon, authenticated;
create or replace trigger trg_zzzz_listing_clearance_gate before insert or update on public.listings
  for each row execute function cabana_private.listing_clearance_gate();

create or replace function cabana_private.tour_clearance_gate()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare v_owner uuid; v_kind text; v_persona text;
begin
  if new.status <> 'published' or (tg_op = 'UPDATE' and old.status = 'published') then return new; end if;
  select o.owner_id, o.kind, o.persona into v_owner, v_kind, v_persona from public.tour_operators o where o.id = new.operator_id;
  if v_kind = 'cabana' then return new; end if;
  v_owner := coalesce(new.owner_id, v_owner);
  if v_owner is null then return new; end if;
  if not coalesce((public.cabana_clearance(v_owner, case when v_persona = 'guide' then 'tour_guide' else 'tour_operator' end)->>'cleared')::boolean, false) then
    raise exception 'Verify your identity before this tour can go live. It takes two minutes and counts everywhere on Cabana.'
      using errcode = '42501', hint = 'clearance_required';
  end if;
  return new;
end $$;
revoke all on function cabana_private.tour_clearance_gate() from public, anon, authenticated;
create or replace trigger trg_aa_tour_clearance_gate before insert or update of status on public.tours
  for each row execute function cabana_private.tour_clearance_gate();

create or replace function cabana_private.tour_operator_clearance_gate()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if new.status = 'approved' and (tg_op = 'INSERT' or old.status is distinct from 'approved')
     and coalesce(new.kind, 'partner') <> 'cabana' and new.owner_id is not null
     and not coalesce((public.cabana_clearance(new.owner_id, case when new.persona = 'guide' then 'tour_guide' else 'tour_operator' end)->>'cleared')::boolean, false) then
    raise exception 'This operator has not verified their identity yet. Approve them once their check clears.'
      using errcode = '42501', hint = 'clearance_required';
  end if;
  return new;
end $$;
revoke all on function cabana_private.tour_operator_clearance_gate() from public, anon, authenticated;
create or replace trigger trg_aa_tour_operator_clearance_gate before insert or update of status on public.tour_operators
  for each row execute function cabana_private.tour_operator_clearance_gate();

create or replace function cabana_private.event_clearance_gate()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare v_owner uuid;
begin
  if new.status <> 'published' or (tg_op = 'UPDATE' and old.status = 'published') then return new; end if;
  v_owner := coalesce(new.owner_id, (select o.owner_id from public.event_organisers o where o.id = new.organiser_id));
  if v_owner is null then return new; end if;
  if not coalesce((public.cabana_clearance(v_owner, 'event_organiser')->>'cleared')::boolean, false) then
    raise exception 'Verify your identity before this event can go on sale. It takes two minutes and counts everywhere on Cabana.'
      using errcode = '42501', hint = 'clearance_required';
  end if;
  return new;
end $$;
revoke all on function cabana_private.event_clearance_gate() from public, anon, authenticated;
create or replace trigger trg_aa_event_clearance_gate before insert or update of status on public.events
  for each row execute function cabana_private.event_clearance_gate();

-- ── 8 · clearing switches things on by itself ─────────────────────────
create or replace function cabana_private.on_clearance_changed(p_user uuid)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare l record; n integer := 0;
begin
  perform cabana_private.driver_auto_clear(p_user);
  for l in select id, service from public.listings
            where partner_id = p_user and status = 'pending_verification' and deleted_at is null
  loop
    if coalesce((public.cabana_clearance(p_user, cabana_private.role_for_service(l.service))->>'cleared')::boolean, false) then
      update public.listings set status = 'active', is_active = true, updated_at = now() where id = l.id;
      n := n + 1;
    end if;
  end loop;
  if n > 0 then
    insert into public.notifications (user_id, title, body, url, kind, meta)
    values (p_user, case when n = 1 then 'Your listing is live' else n || ' listings are live' end,
            'Your verification cleared, so what was waiting is now open to guests.',
            '/partner-listings', 'listing', jsonb_build_object('event', 'clearance_live', 'count', n));
  end if;
end $$;
revoke all on function cabana_private.on_clearance_changed(uuid) from public, anon, authenticated;

create or replace function cabana_private.verification_status_cleared()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if new.identity_state = 'approved' and (tg_op = 'INSERT' or old.identity_state is distinct from 'approved') then
    perform cabana_private.on_clearance_changed(new.user_id);
  end if;
  return new;
exception when others then
  raise warning 'verification_status_cleared: %', sqlerrm;
  return new;
end $$;
revoke all on function cabana_private.verification_status_cleared() from public, anon, authenticated;
create or replace trigger trg_verification_status_cleared after insert or update of identity_state on public.verification_status
  for each row execute function cabana_private.verification_status_cleared();

create or replace function cabana_private.organization_cleared()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if new.status = 'approved' and (tg_op = 'INSERT' or old.status is distinct from 'approved') then
    perform cabana_private.on_clearance_changed(new.user_id);
  end if;
  return new;
exception when others then
  raise warning 'organization_cleared: %', sqlerrm;
  return new;
end $$;
revoke all on function cabana_private.organization_cleared() from public, anon, authenticated;
create or replace trigger trg_organization_cleared after insert or update of status on public.organization_verifications
  for each row execute function cabana_private.organization_cleared();
