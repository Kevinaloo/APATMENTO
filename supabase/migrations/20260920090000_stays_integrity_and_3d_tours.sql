-- ══════════════════════════════════════════════════════════════════════
-- CABANA · Stays integrity + the Cabana 3D Tour upgrade
--
-- WHAT THIS FIXES
-- ───────────────
-- 1. Hosts could write the fields that rank them. The "Partners manage own
--    listings" policy lets a host update every column on their own row,
--    including featured, internal_score, avg_rating and review_count. The
--    stays page sorts by internal_score and shows "In demand" above 60, so
--    one PATCH put any listing first with a fake 4.9★ (120). A paid
--    "featured" placement is worthless while it can be self-granted.
--    A trigger now keeps every system-owned column server-side. It also
--    stops a host re-activating a listing Cabana rejected or removed.
--
-- 2. Hosts could not see their own bookings. The host pages read a table
--    called `bookings` that does not exist, and apartment_bookings has no
--    host policy, so every host saw "No bookings" and KES 0 earned, and
--    never saw the HOST code they must give the guest at check-in.
--    host_stay_bookings() returns the host's paid stays with safe columns
--    only — never the guest's own check-in code.
--
-- 3. Guests could edit money-adjacent booking fields (refund_due,
--    cancelled_at, host_penalty, num_guests...) and delete paid bookings.
--
-- 4. Anyone signed in could write a "private review" about anyone, for any
--    booking, already visible. Reviews are now tied to a real, started
--    stay, one per side, revealed together (or 14 days after checkout),
--    and the revealed guest rating finally moves the listing's rating.
--
-- 5. The Cabana 3D Tour becomes a product: hosts request it while listing,
--    the request is stored (so a failed email never loses a lead), and a
--    listing with a live tour is featured at the top of Stays.
--
-- Idempotent. Safe to re-run.
-- ══════════════════════════════════════════════════════════════════════

-- ── 1 · 3D tour columns on listings ───────────────────────────────────
alter table public.listings add column if not exists tour_3d_status text not null default 'none';
alter table public.listings add column if not exists tour_3d_url text;
alter table public.listings add column if not exists tour_3d_requested_at timestamptz;

alter table public.listings drop constraint if exists listings_tour_3d_status_chk;
alter table public.listings add constraint listings_tour_3d_status_chk
  check (tour_3d_status in ('none','requested','scheduled','live'));

-- A live tour must point at our own /tours/ viewer or a known 3D host.
alter table public.listings drop constraint if exists listings_tour_3d_url_chk;
alter table public.listings add constraint listings_tour_3d_url_chk
  check (tour_3d_url is null
         or tour_3d_url ~ '^/tours/[a-z0-9-]+/(index\.html)?$'
         or tour_3d_url ~ '^https://(my\.matterport\.com|kuula\.co|app\.cloudpano\.com)/');

create index if not exists listings_featured_rank
  on public.listings (featured desc, internal_score desc)
  where is_active and deleted_at is null;


-- ── 2 · System-owned listing fields ───────────────────────────────────
-- SECURITY INVOKER on purpose: current_user is then the real caller.
-- Security-definer writers (update_listing_score, ownership transfers,
-- the review refresher below) run as the owner and pass straight through,
-- as does the service role used by the API and the admin console.
create or replace function public.listings_protect_system_fields()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
begin
  if current_user not in ('authenticated', 'anon') then return new; end if;
  if public.is_operator() or public.is_admin() then return new; end if;

  if tg_op = 'INSERT' then
    new.featured             := false;
    new.internal_score       := 50;      -- the same fair start for everyone
    new.avg_rating           := 0;
    new.review_count         := 0;
    new.booking_count        := 0;
    new.views                := 0;
    new.days_listed          := 0;
    new.approved_at          := null;
    new.rejection_reason     := null;
    new.tour_3d_status       := 'none';
    new.tour_3d_url          := null;
    new.tour_3d_requested_at := null;
    if new.status in ('rejected','suspended','banned','removed','deleted','live') then
      new.status := 'active';
    end if;
    return new;
  end if;

  new.featured             := old.featured;
  new.internal_score       := old.internal_score;
  new.avg_rating           := old.avg_rating;
  new.review_count         := old.review_count;
  new.booking_count        := old.booking_count;
  new.views                := old.views;
  new.days_listed          := old.days_listed;
  new.approved_at          := old.approved_at;
  new.rejection_reason     := old.rejection_reason;
  new.tour_3d_status       := old.tour_3d_status;
  new.tour_3d_url          := old.tour_3d_url;
  new.tour_3d_requested_at := old.tour_3d_requested_at;

  -- Moderation decisions belong to Cabana. A host can pause and resume
  -- their own listing, never undo a rejection or removal.
  if old.status in ('rejected','suspended','banned','removed','deleted') then
    new.status     := old.status;
    new.is_active  := old.is_active;
    new.deleted_at := old.deleted_at;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_zz_listings_protect_system_fields on public.listings;
create trigger trg_zz_listings_protect_system_fields
  before insert or update on public.listings
  for each row execute function public.listings_protect_system_fields();


-- ── 3 · 3D tour requests ──────────────────────────────────────────────
create table if not exists public.tour3d_requests (
  id              uuid primary key default gen_random_uuid(),
  listing_id      uuid not null references public.listings(id) on delete cascade,
  host_id         uuid not null default auth.uid(),
  contact_name    text,
  contact_email   text,
  contact_phone   text,
  contact_pref    text not null default 'call'
                  check (contact_pref in ('call','text','email')),
  best_time       text,
  notes           text,
  status          text not null default 'new'
                  check (status in ('new','contacted','scheduled','completed','declined','cancelled')),
  source          text not null default 'add_listing',
  emailed_at      timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint tour3d_requests_text_len check (
    coalesce(length(contact_name),0)  <= 120 and
    coalesce(length(contact_email),0) <= 160 and
    coalesce(length(contact_phone),0) <= 40  and
    coalesce(length(best_time),0)     <= 120 and
    coalesce(length(notes),0)         <= 1000)
);

-- One open request per listing. A second tick while one is open is the
-- same lead, not a new one.
create unique index if not exists tour3d_requests_one_open_per_listing
  on public.tour3d_requests (listing_id)
  where status in ('new','contacted','scheduled');
create index if not exists tour3d_requests_status_created
  on public.tour3d_requests (status, created_at desc);

alter table public.tour3d_requests enable row level security;

drop policy if exists tour3d_insert_own on public.tour3d_requests;
create policy tour3d_insert_own on public.tour3d_requests
  for insert to authenticated
  with check (
    host_id = auth.uid()
    and status = 'new'
    and emailed_at is null
    and exists (select 1 from public.listings l
                 where l.id = listing_id
                   and (l.partner_id = auth.uid() or l.host_id = auth.uid()))
  );

drop policy if exists tour3d_select_own on public.tour3d_requests;
create policy tour3d_select_own on public.tour3d_requests
  for select to authenticated
  using (host_id = auth.uid() or public.is_operator() or public.is_admin());

drop policy if exists tour3d_operator_update on public.tour3d_requests;
create policy tour3d_operator_update on public.tour3d_requests
  for update to authenticated
  using (public.is_operator() or public.is_admin())
  with check (public.is_operator() or public.is_admin());

-- Mark the listing as requested, and keep it in step with the request.
create or replace function public.tour3d_requests_sync_listing()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  new.updated_at := now();
  if tg_op = 'INSERT' then
    update public.listings
       set tour_3d_status = case when tour_3d_status = 'none' then 'requested' else tour_3d_status end,
           tour_3d_requested_at = coalesce(tour_3d_requested_at, now())
     where id = new.listing_id;
  elsif new.status = 'scheduled' and old.status is distinct from 'scheduled' then
    update public.listings set tour_3d_status = 'scheduled'
     where id = new.listing_id and tour_3d_status in ('none','requested');
  elsif new.status in ('declined','cancelled') and old.status is distinct from new.status then
    update public.listings set tour_3d_status = 'none', tour_3d_requested_at = null
     where id = new.listing_id and tour_3d_status in ('requested','scheduled');
  end if;
  return new;
end;
$$;
revoke all on function public.tour3d_requests_sync_listing() from public, anon, authenticated;

drop trigger if exists tour3d_requests_sync_listing_t on public.tour3d_requests;
create trigger tour3d_requests_sync_listing_t
  before insert or update on public.tour3d_requests
  for each row execute function public.tour3d_requests_sync_listing();

-- A live tour is the paid placement: featured at the top of Stays.
create or replace function public.listings_tour_live_features()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
begin
  if new.tour_3d_status = 'live' and new.tour_3d_url is not null
     and (tg_op = 'INSERT' or old.tour_3d_status is distinct from 'live') then
    new.featured := true;
  end if;
  return new;
end;
$$;
drop trigger if exists trg_zzz_listings_tour_live_features on public.listings;
create trigger trg_zzz_listings_tour_live_features
  before insert or update of tour_3d_status, tour_3d_url on public.listings
  for each row execute function public.listings_tour_live_features();

-- The two tours already built are live, and now featured like any other.
update public.listings
   set tour_3d_status = 'live', tour_3d_url = '/tours/jets-nest/index.html'
 where id = '65ef1d11-a4e3-4250-bbac-f826c0cd10d2' and tour_3d_status <> 'live';
update public.listings
   set tour_3d_status = 'live', tour_3d_url = '/tours/shikaz-homes/index.html'
 where id = '20b22953-2c13-4e6c-a5c4-3cbefcc20cae' and tour_3d_status <> 'live';


-- ── 4 · Guest booking edits and deletes ───────────────────────────────
-- cabana_secure_apartment_booking already freezes money, dates, codes and
-- status on a guest UPDATE. These are the fields it left open.
create or replace function public.cabana_lock_guest_booking_fields()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
begin
  if current_user not in ('authenticated', 'anon') then return new; end if;
  if public.is_operator() then return new; end if;
  new.num_guests          := old.num_guests;
  new.cancelled_at        := old.cancelled_at;
  new.cancel_reason       := old.cancel_reason;
  new.refund_amount       := old.refund_amount;
  new.refund_reason       := old.refund_reason;
  new.refunded_at         := old.refunded_at;
  new.refund_due          := old.refund_due;
  new.host_penalty        := old.host_penalty;
  new.rehomed_from        := old.rehomed_from;
  new.rehomed_to          := old.rehomed_to;
  new.closed_at           := old.closed_at;
  new.balance_paid_at     := old.balance_paid_at;
  new.deposit_amount      := old.deposit_amount;
  new.checkout_request_id := old.checkout_request_id;
  new.referral_root_ref   := old.referral_root_ref;
  new.payment_mode        := old.payment_mode;
  new.apartment_name      := old.apartment_name;
  new.listing_name        := old.listing_name;
  new.location            := old.location;
  new.contact_whatsapp    := old.contact_whatsapp;
  new.contact_phone       := old.contact_phone;
  new.contact_email       := old.contact_email;
  return new;
end;
$$;
drop trigger if exists cabana_zz_lock_guest_booking_fields on public.apartment_bookings;
create trigger cabana_zz_lock_guest_booking_fields
  before update on public.apartment_bookings
  for each row execute function public.cabana_lock_guest_booking_fields();

-- An unpaid attempt can be withdrawn. A booking with money on it is a
-- record the host, the ledger and support all depend on.
create or replace function public.cabana_guard_booking_delete()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if auth.uid() is null or public.is_operator() then return old; end if;
  if coalesce(old.amount_paid, 0) > 0
     or coalesce(old.status, 'pending_payment') not in ('pending_payment', 'failed', 'expired')
     or exists (select 1 from public.booking_payments p
                 where p.booking_ref = old.payment_reference and p.status = 'paid') then
    raise exception 'A booking with a payment on it cannot be deleted. Cancel it from My Bookings instead.'
      using errcode = '42501';
  end if;
  return old;
end;
$$;
revoke all on function public.cabana_guard_booking_delete() from public, anon, authenticated;
drop trigger if exists cabana_guard_booking_delete_t on public.apartment_bookings;
create trigger cabana_guard_booking_delete_t
  before delete on public.apartment_bookings
  for each row execute function public.cabana_guard_booking_delete();


-- ── 5 · What a host sees of their stays ───────────────────────────────
-- Paid (or once-paid) stays on listings the caller hosts. The guest's own
-- code is never returned: the host's job is to ASK for it at the door.
-- The guest's phone and the host's code appear once money has arrived.
create or replace function public.host_stay_bookings(p_limit integer default 200)
returns table (
  id uuid, listing_id uuid, listing_title text, guest_name text, guest_phone text,
  checkin_date date, checkout_date date, nights integer, num_guests integer,
  status text, payment_mode text, stay_total numeric, service_fee numeric,
  grand_total numeric, amount_paid numeric, balance_paid boolean,
  payment_reference text, host_code text, cancelled_at timestamptz,
  checked_in_at timestamptz, created_at timestamptz
)
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select b.id, l.id, coalesce(l.title, b.listing_name, b.apartment_name), b.guest_name,
         case when coalesce(b.amount_paid, 0) > 0 then b.guest_phone end,
         b.checkin_date, b.checkout_date, b.nights, b.num_guests,
         b.status, b.payment_mode, b.stay_total, b.service_fee,
         b.grand_total, b.amount_paid, b.balance_paid,
         b.payment_reference,
         case when coalesce(b.amount_paid, 0) > 0 and b.cancelled_at is null then b.host_code end,
         b.cancelled_at, b.checked_in_at, b.created_at
    from public.apartment_bookings b
    left join public.listings l
      on l.id = coalesce(b.listing_id,
                case when b.apartment_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
                     then b.apartment_id::uuid end)
   where auth.uid() is not null
     and (b.host_id = auth.uid() or l.partner_id = auth.uid() or l.host_id = auth.uid())
     and (coalesce(b.amount_paid, 0) > 0
          or b.status in ('confirmed_balance_due','deposit_paid','paid_pending_checkin',
                          'checked_in','completed','rehomed'))
   order by b.checkin_date desc, b.created_at desc
   limit least(greatest(coalesce(p_limit, 200), 1), 500);
$$;
revoke all on function public.host_stay_bookings(integer) from public, anon;
grant execute on function public.host_stay_bookings(integer) to authenticated;


-- ── 6 · Private reviews: real stays only ──────────────────────────────
alter table public.private_reviews drop constraint if exists private_reviews_rating_chk;
alter table public.private_reviews add constraint private_reviews_rating_chk check (
  rating between 1 and 5
  and (cleanliness   is null or cleanliness   between 1 and 5)
  and (accuracy      is null or accuracy      between 1 and 5)
  and (communication is null or communication between 1 and 5)
  and (value_rating  is null or value_rating  between 1 and 5)
  and coalesce(length(body), 0) <= 2000);
create unique index if not exists private_reviews_one_per_direction
  on public.private_reviews (booking_id, direction);

create or replace function public.private_reviews_validate()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  b public.apartment_bookings%rowtype;
  l public.listings%rowtype;
  v_uid uuid := auth.uid();
  v_today date := (now() at time zone 'Africa/Nairobi')::date;
begin
  if v_uid is null or public.is_operator() then return new; end if;

  select * into b from public.apartment_bookings where id = new.booking_id;
  if not found then raise exception 'Booking not found' using errcode = '22023'; end if;
  select * into l from public.listings where id = coalesce(b.listing_id,
    case when b.apartment_id ~* '^[0-9a-f-]{36}$' then b.apartment_id::uuid end);

  if new.direction = 'guest_to_host' then
    if b.guest_id is distinct from v_uid then
      raise exception 'Only the guest on this booking can review the host' using errcode = '42501';
    end if;
    new.subject_id := coalesce(b.host_id, l.partner_id);
  elsif new.direction = 'host_to_guest' then
    if v_uid is distinct from b.host_id and v_uid is distinct from l.partner_id then
      raise exception 'Only the host of this booking can review the guest' using errcode = '42501';
    end if;
    new.subject_id := b.guest_id;
  else
    raise exception 'Unknown review direction' using errcode = '22023';
  end if;

  if b.cancelled_at is not null
     or not (b.status in ('checked_in', 'completed') or b.checked_in_at is not null) then
    raise exception 'A stay can be reviewed once it has started' using errcode = '22023';
  end if;
  if b.checkout_date + 30 < v_today then
    raise exception 'The review window for this stay has closed' using errcode = '22023';
  end if;

  new.author_id  := v_uid;
  new.listing_id := coalesce(l.id::text, b.apartment_id);
  new.visible_at := null;
  new.created_at := now();
  return new;
end;
$$;
revoke all on function public.private_reviews_validate() from public, anon, authenticated;
drop trigger if exists private_reviews_validate_t on public.private_reviews;
create trigger private_reviews_validate_t
  before insert on public.private_reviews
  for each row execute function public.private_reviews_validate();

create schema if not exists cabana_private;

-- Revealed guest ratings are the listing's public rating.
create or replace function cabana_private.refresh_listing_rating(p_listing text)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare v_avg numeric; v_n integer;
begin
  if p_listing is null or p_listing !~* '^[0-9a-f-]{36}$' then return; end if;
  select coalesce(round(avg(rating)::numeric, 2), 0), count(*)
    into v_avg, v_n
    from public.private_reviews
   where listing_id = p_listing and direction = 'guest_to_host'
     and visible_at is not null and visible_at <= now();
  update public.listings set avg_rating = v_avg, review_count = v_n
   where id = p_listing::uuid
     and (avg_rating is distinct from v_avg or review_count is distinct from v_n);
end;
$$;
revoke all on function cabana_private.refresh_listing_rating(text) from public, anon, authenticated;

create or replace function public.try_reveal_reviews(p_booking uuid)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare b public.apartment_bookings%rowtype; v_listing text;
begin
  select * into b from public.apartment_bookings where id = p_booking;
  if not found then return; end if;
  if auth.uid() is not null and not public.is_operator()
     and auth.uid() is distinct from b.guest_id and auth.uid() is distinct from b.host_id then
    return;
  end if;
  -- Both sides written, or the other side had 14 days after checkout.
  if (select count(*) from public.private_reviews where booking_id = p_booking) >= 2
     or b.checkout_date + 14 <= (now() at time zone 'Africa/Nairobi')::date then
    select pr.listing_id into v_listing
      from public.private_reviews pr where pr.booking_id = p_booking limit 1;
    update public.private_reviews set visible_at = now()
     where booking_id = p_booking and visible_at is null;
    perform cabana_private.refresh_listing_rating(
      coalesce(v_listing, b.listing_id::text, b.apartment_id));
  end if;
end;
$$;
revoke all on function public.try_reveal_reviews(uuid) from public, anon;
grant execute on function public.try_reveal_reviews(uuid) to authenticated;

create or replace function public.cabana_reveal_due_reviews()
returns integer
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare r record; n integer := 0;
begin
  for r in
    select distinct pr.booking_id
      from public.private_reviews pr
      join public.apartment_bookings b on b.id = pr.booking_id
     where pr.visible_at is null
       and b.checkout_date + 14 <= (now() at time zone 'Africa/Nairobi')::date
  loop
    perform public.try_reveal_reviews(r.booking_id);
    n := n + 1;
  end loop;
  return n;
end;
$$;
revoke all on function public.cabana_reveal_due_reviews() from public, anon, authenticated;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobid) from cron.job where jobname = 'cabana-reveal-due-reviews';
    perform cron.schedule('cabana-reveal-due-reviews', '17 3 * * *',
                          'select public.cabana_reveal_due_reviews()');
  end if;
end $$;


-- ── 7 · Legacy public `reviews` table ─────────────────────────────────
-- Nothing on the site writes it any more, but its policies still let any
-- account post a rating for any listing and let hosts rewrite a guest's
-- stars. Inserts now need a started stay; hosts may only reply.
drop policy if exists "Guests create reviews" on public.reviews;
create policy "Guests create reviews" on public.reviews
  for insert with check (
    auth.uid() = guest_id
    and exists (select 1 from public.apartment_bookings b
                 where b.guest_id = auth.uid()
                   and (b.listing_id = reviews.listing_id or b.apartment_id = reviews.listing_id::text)
                   and b.cancelled_at is null
                   and (b.status in ('checked_in','completed') or b.checked_in_at is not null))
  );

create or replace function public.reviews_host_reply_only()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
begin
  if current_user not in ('authenticated', 'anon') or public.is_operator() then return new; end if;
  if auth.uid() is distinct from old.guest_id then
    new.rating       := old.rating;
    new.review_text  := old.review_text;
    new.guest_id     := old.guest_id;
    new.guest_name   := old.guest_name;
    new.listing_id   := old.listing_id;
    new.listing_name := old.listing_name;
    new.created_at   := old.created_at;
  end if;
  return new;
end;
$$;
drop trigger if exists reviews_host_reply_only_t on public.reviews;
create trigger reviews_host_reply_only_t
  before update on public.reviews
  for each row execute function public.reviews_host_reply_only();
