/* ════════════════════════════════════════════════════════════════
   CABANA · RESTAURANTS
   ────────────────────────────────────────────────────────────────
   A restaurant was being stored as a stay. The wizard wrote its one
   number into listings.price_night, so a samosa counter published at
   KES 30 and the board read it back as "KES 30 / night". Nothing on
   the row could say what that 30 bought, and there was nowhere at all
   to put the thing a restaurant actually sells: dishes.

   Four tables fix that.

     restaurant_profiles  one row per food listing. The commerce facts
                          a diner decides on: what a meal costs, how
                          long it takes, whether you can walk in.
     menu_sections        Breakfast, Grills, Drinks. Ordered.
     menu_items           a dish. Name, price, photo, badge, promo.
     restaurant_promos    a running offer, shown above the menu.

   listings keeps identity and location. Price per night stays null on
   a food row from here on: there is no such thing as a nightly samosa.

   Reads are public for live restaurants because a menu is a shop
   window. Writes belong to the listing's partner, checked against
   listings on every statement rather than trusted from the client.
   ════════════════════════════════════════════════════════════════ */

-- ── ownership predicate ──────────────────────────────────────────
-- A listing is writable by the partner who holds it. Held-for rows
-- (created by an ambassador on a restaurant's behalf) stay with the
-- creator until the real owner claims them, which is what partner_id
-- already tracks. Named apart from the older owns_listing(text,uuid)
-- so neither can be called by accident in place of the other.
create or replace function public.manages_listing(p_listing uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.listings l
    where l.id = p_listing
      and (l.partner_id = auth.uid() or l.host_id = auth.uid())
  );
$$;

create or replace function public.listing_is_live(p_listing uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.listings l
    where l.id = p_listing
      and coalesce(l.is_active, false) = true
      and l.deleted_at is null
  );
$$;

revoke all on function public.manages_listing(uuid) from public;
revoke all on function public.listing_is_live(uuid) from public;
grant execute on function public.manages_listing(uuid) to anon, authenticated;
grant execute on function public.listing_is_live(uuid) to anon, authenticated;

-- public.touch_updated_at() already exists and does exactly this;
-- these tables reuse it rather than declaring a second copy.

/* ── restaurant_profiles ────────────────────────────────────────
   Everything a diner weighs before tapping through, and nothing a
   stay needs. avg_price is the honest "what will this cost me"
   number: the price of one main course, not a cover charge.        */
create table if not exists public.restaurant_profiles (
  listing_id      uuid primary key references public.listings(id) on delete cascade,
  tagline         text,
  cuisines        text[]  not null default '{}',
  signature_dish  text,
  currency        text    not null default 'KES',
  avg_price       numeric,          -- typical price of one main
  min_order       numeric,          -- minimum for delivery
  delivery_fee    numeric,
  delivery_mins   integer,          -- door to door, once cooked
  prep_mins       integer,          -- kitchen time for collection
  serves_delivery boolean not null default true,
  serves_pickup   boolean not null default true,
  serves_dine_in  boolean not null default true,
  serves_alcohol  boolean not null default false,
  halal           boolean not null default false,
  opens_at        text,             -- 'HH:MM' local
  closes_at       text,
  open_days       text[]  not null default '{mon,tue,wed,thu,fri,sat,sun}',
  order_whatsapp  text,
  order_phone     text,
  hero_photo      text,
  accent          text,             -- hex the venue picks for its page
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

drop trigger if exists trg_restaurant_profiles_touch on public.restaurant_profiles;
create trigger trg_restaurant_profiles_touch
  before update on public.restaurant_profiles
  for each row execute function public.touch_updated_at();

/* ── menu_sections ──────────────────────────────────────────────
   A menu without sections is a wall of text. Every item belongs to
   exactly one, and deleting a section takes its items with it.     */
create table if not exists public.menu_sections (
  id          uuid primary key default gen_random_uuid(),
  listing_id  uuid not null references public.listings(id) on delete cascade,
  name        text not null,
  note        text,
  sort_order  integer not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists idx_menu_sections_listing
  on public.menu_sections (listing_id, sort_order);

drop trigger if exists trg_menu_sections_touch on public.menu_sections;
create trigger trg_menu_sections_touch
  before update on public.menu_sections
  for each row execute function public.touch_updated_at();

/* ── menu_items ─────────────────────────────────────────────────
   badge carries the three things a kitchen wants to shout about:
   what is new, what everyone orders, what the chef stands behind.
   promo_price is the struck-through-from price, so a deal is one
   number and one date range rather than a second row.              */
create table if not exists public.menu_items (
  id           uuid primary key default gen_random_uuid(),
  listing_id   uuid not null references public.listings(id) on delete cascade,
  section_id   uuid references public.menu_sections(id) on delete cascade,
  name         text not null,
  description  text,
  price        numeric not null default 0,
  promo_price  numeric,
  promo_until  timestamptz,
  currency     text not null default 'KES',
  photo        text,
  badge        text,               -- new | favourite | chef | spicy | vegan | healthy
  tags         text[] not null default '{}',
  prep_mins    integer,
  serves       text,               -- '1 person', 'shares 2'
  calories     integer,
  is_available boolean not null default true,
  sold_out_until timestamptz,
  order_count  integer not null default 0,
  sort_order   integer not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint menu_items_badge_known check (
    badge is null or badge in ('new','favourite','chef','spicy','vegan','healthy')
  ),
  constraint menu_items_price_sane check (price >= 0),
  constraint menu_items_promo_below_price check (
    promo_price is null or promo_price < price
  )
);

create index if not exists idx_menu_items_listing
  on public.menu_items (listing_id, sort_order);
create index if not exists idx_menu_items_section
  on public.menu_items (section_id, sort_order);
create index if not exists idx_menu_items_badge
  on public.menu_items (listing_id, badge) where badge is not null;

drop trigger if exists trg_menu_items_touch on public.menu_items;
create trigger trg_menu_items_touch
  before update on public.menu_items
  for each row execute function public.touch_updated_at();

/* ── restaurant_promos ──────────────────────────────────────────
   A promo is a claim made to a diner, so it carries its own window.
   An expired promo stops rendering without anyone having to log in
   and switch it off.                                               */
create table if not exists public.restaurant_promos (
  id          uuid primary key default gen_random_uuid(),
  listing_id  uuid not null references public.listings(id) on delete cascade,
  title       text not null,
  detail      text,
  kind        text not null default 'offer',   -- offer | happy_hour | combo | free_delivery
  code        text,
  discount_pct integer,
  starts_at   timestamptz,
  ends_at     timestamptz,
  is_active   boolean not null default true,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint restaurant_promos_kind_known check (
    kind in ('offer','happy_hour','combo','free_delivery')
  ),
  constraint restaurant_promos_pct_sane check (
    discount_pct is null or (discount_pct > 0 and discount_pct <= 90)
  )
);

create index if not exists idx_restaurant_promos_listing
  on public.restaurant_promos (listing_id, sort_order);

drop trigger if exists trg_restaurant_promos_touch on public.restaurant_promos;
create trigger trg_restaurant_promos_touch
  before update on public.restaurant_promos
  for each row execute function public.touch_updated_at();

-- ── RLS ──────────────────────────────────────────────────────────
alter table public.restaurant_profiles enable row level security;
alter table public.menu_sections       enable row level security;
alter table public.menu_items          enable row level security;
alter table public.restaurant_promos   enable row level security;

do $$
declare t text;
begin
  foreach t in array array['restaurant_profiles','menu_sections','menu_items','restaurant_promos']
  loop
    execute format('drop policy if exists %I on public.%I', t || '_public_read', t);
    execute format('drop policy if exists %I on public.%I', t || '_owner_all',   t);

    -- A menu is a shop window: anyone may read it while the venue is
    -- live. The owner keeps reading their own while it is paused.
    execute format($p$
      create policy %I on public.%I
      for select using (
        public.listing_is_live(listing_id) or public.manages_listing(listing_id)
      )$p$, t || '_public_read', t);

    execute format($p$
      create policy %I on public.%I
      for all
      using (public.manages_listing(listing_id) or public.is_operator())
      with check (public.manages_listing(listing_id) or public.is_operator())
      $p$, t || '_owner_all', t);
  end loop;
end $$;

grant select on public.restaurant_profiles, public.menu_sections,
                public.menu_items, public.restaurant_promos to anon, authenticated;
grant insert, update, delete on public.restaurant_profiles, public.menu_sections,
                public.menu_items, public.restaurant_promos to authenticated;

/* ── a food listing is not priced by the night ───────────────────
   Existing food rows carry their rate in price_night because that was
   the only numeric column the wizard wrote. Move it to the profile as
   avg_price, where it means something, and clear the stay fields so
   no board can render "/ night" against a restaurant again.        */
insert into public.restaurant_profiles (listing_id, currency, avg_price,
                                        cuisines, order_whatsapp, order_phone,
                                        hero_photo, opens_at, closes_at)
select l.id,
       coalesce(l.currency, 'KES'),
       nullif(l.price_night, 0),
       case when coalesce(l.extras->>'cuisine','') = '' then '{}'::text[]
            else array[btrim(l.extras->>'cuisine')] end,
       l.contact_whatsapp,
       l.contact_phone,
       l.photos[1],
       l.checkin_time,
       l.checkout_time
from public.listings l
where coalesce(l.service, l.type) = 'food'
on conflict (listing_id) do nothing;

update public.listings
set price_night = null,
    price_week  = null,
    price_month = null,
    deposit     = null,
    min_nights  = null
where coalesce(service, type) = 'food';

/* A restaurant published from here on never gets a nightly rate. The
   trigger below is the backstop for any surface that still tries. */
create or replace function public.listings_food_has_no_nightly_rate()
returns trigger
language plpgsql
as $$
begin
  if lower(coalesce(new.service, new.type, '')) = 'food' then
    new.price_night := null;
    new.price_week  := null;
    new.price_month := null;
    new.min_nights  := null;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_listings_food_no_nightly on public.listings;
create trigger trg_listings_food_no_nightly
  before insert or update on public.listings
  for each row execute function public.listings_food_has_no_nightly_rate();
