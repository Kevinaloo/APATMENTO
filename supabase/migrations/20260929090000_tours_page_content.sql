-- ═══════════════════════════════════════════════════════════════════
-- CABANA TOURS · the page, edited from the console
-- ───────────────────────────────────────────────────────────────────
-- /tours is built from blocks the Cabana team edits in the console
-- (Tours → Page). Each block is one section of the page: its order,
-- whether it shows, and its words, pictures and picks. The page never
-- invents content: a section with nothing real in it stays hidden.
--
--   hero        the cover shown when no Spotlight slide is running,
--               plus search and quick links
--   departures  the departure board (fills itself from schedules)
--   kinds       categories, each with its own name, line and photo
--   collection  a curated row of tours the team picks (as many as
--               you like, ids collection-<something>)
--   immersive   the 360° / VR room (off until real worlds are filmed)
--   guides      the guides row (automatic, or hand-picked)
--   catalogue   the latest tours and the "nothing yet" message
--   pitch       the Spotlight offer for guides and operators
--   invite      the "list your tours" band
--
-- The illustrated slides that stood in for real content at launch are
-- retired here; Cabana's own slides are now made in the console with
-- real photos or film.
-- ═══════════════════════════════════════════════════════════════════

create table if not exists public.tour_page_blocks (
  id          text primary key check (id ~ '^[a-z][a-z0-9-]{1,47}$'),
  kind        text not null check (kind in ('hero', 'departures', 'kinds', 'collection', 'immersive',
                                            'guides', 'catalogue', 'pitch', 'invite')),
  position    integer not null default 100,
  enabled     boolean not null default true,
  content     jsonb not null default '{}'::jsonb check (jsonb_typeof(content) = 'object'),
  updated_at  timestamptz not null default now(),
  updated_by  text,
  constraint tour_page_blocks_size check (pg_column_size(content) < 65536),
  constraint tour_page_blocks_single check (kind = 'collection' or id = kind)
);
comment on table public.tour_page_blocks is
  'Sections of /tours, edited in the console (Tours → Page). Public read, admin write.';

create or replace function cabana_private.tour_page_block_touch()
returns trigger language plpgsql set search_path = pg_catalog, public as $$
begin
  new.updated_at := now();
  new.updated_by := lower(nullif(coalesce(auth.jwt()->>'email', ''), ''));
  return new;
end $$;
drop trigger if exists tour_page_blocks_touch on public.tour_page_blocks;
create trigger tour_page_blocks_touch before insert or update on public.tour_page_blocks
  for each row execute function cabana_private.tour_page_block_touch();

alter table public.tour_page_blocks enable row level security;
drop policy if exists tour_page_blocks_read on public.tour_page_blocks;
drop policy if exists tour_page_blocks_admin on public.tour_page_blocks;
create policy tour_page_blocks_read on public.tour_page_blocks for select to anon, authenticated using (true);
create policy tour_page_blocks_admin on public.tour_page_blocks for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
revoke all on public.tour_page_blocks from public, anon, authenticated;
grant select on public.tour_page_blocks to anon, authenticated;
grant insert, update, delete on public.tour_page_blocks to authenticated;
grant all on public.tour_page_blocks to service_role;

-- ── the launch copy ─────────────────────────────────────────────────
insert into public.tour_page_blocks (id, kind, position, enabled, content) values
('hero', 'hero', 0, true, jsonb_build_object(
  'eyebrow', 'Cabana Tours',
  'title', 'Safaris, day trips and city walks, *booked direct.*',
  'lede', 'Pick a date, message your guide and pay the deposit by M-Pesa. Every guide on Cabana is vetted by our team, and the price you see is the price they set.',
  'image', null, 'image_mobile', null, 'video', null, 'focal', '50% 50%', 'shade', 55,
  'search_placeholder', 'Where to? Try Naivasha, Diani or the Mara',
  'auto_departures', true,
  'links', jsonb_build_array(
    jsonb_build_object('label', 'This weekend', 'url', '/tours-catalogue?when=weekend'),
    jsonb_build_object('label', 'Day trips', 'url', '/tours-catalogue?len=1'),
    jsonb_build_object('label', 'Multi-day safaris', 'url', '/tours-catalogue?cat=big-safari'),
    jsonb_build_object('label', 'City walks', 'url', '/tours-catalogue?cat=city-tour'),
    jsonb_build_object('label', 'Under KES 5,000', 'url', '/tours-catalogue?price=u5')))),
('departures', 'departures', 10, true, jsonb_build_object(
  'eyebrow', 'Departures',
  'title', 'Leaving in the *next 30 days*',
  'lede', 'Scheduled tours that still have seats. Each card counts down to the moment the tour leaves.',
  'show_clock', true)),
('kinds', 'kinds', 20, true, jsonb_build_object(
  'eyebrow', 'Ways to travel',
  'title', 'From sunrise game drives to *Friday-night food walks*',
  'lede', 'Every tour sits in one of these, so you can go straight to the kind of day you want.',
  'cta_label', 'Browse all tours',
  'show_empty', false,
  'items', jsonb_build_object(
    'day-safari', jsonb_build_object('name', 'Day safaris', 'blurb', 'Game drives you can fit between breakfast and dinner.', 'image', null, 'hidden', false, 'position', 1),
    'big-safari', jsonb_build_object('name', 'Multi-day safaris', 'blurb', 'The Mara, Amboseli and Tsavo, with nights in camp.', 'image', null, 'hidden', false, 'position', 2),
    'day-trip',   jsonb_build_object('name', 'Day trips', 'blurb', 'Lakes, gorges and hills a short drive from the city.', 'image', null, 'hidden', false, 'position', 3),
    'city-tour',  jsonb_build_object('name', 'City walks', 'blurb', 'Food, history, art and nightlife, on foot with a local.', 'image', null, 'hidden', false, 'position', 4),
    'adventure',  jsonb_build_object('name', 'Adventure', 'blurb', 'Hikes, climbs, cycling and white water.', 'image', null, 'hidden', false, 'position', 5),
    'culture',    jsonb_build_object('name', 'Culture & community', 'blurb', 'Markets, music and craft, and the people behind them.', 'image', null, 'hidden', false, 'position', 6),
    'beach',      jsonb_build_object('name', 'Coast & water', 'blurb', 'Dhows, reefs, islands and long afternoons by the sea.', 'image', null, 'hidden', false, 'position', 7),
    'expedition', jsonb_build_object('name', 'Expeditions', 'blurb', 'Four days or more, for the big mountains and far corners.', 'image', null, 'hidden', false, 'position', 8)))),
('immersive', 'immersive', 40, false, '{}'::jsonb),
('guides', 'guides', 50, true, jsonb_build_object(
  'eyebrow', 'Guides',
  'title', 'Know your guide *before you go*',
  'lede', 'See who they are and what they run, and ask them anything before you pay. Their number is shared with you once your booking is confirmed.',
  'cta_label', 'Meet all the guides',
  'featured_ids', '[]'::jsonb)),
('catalogue', 'catalogue', 60, true, jsonb_build_object(
  'eyebrow', 'The catalogue',
  'title', 'Browse *every tour*',
  'lede', 'Filter by date, price, length and group size in the full catalogue.',
  'cta_label', 'See all tours',
  'limit', 8,
  'empty_title', 'The first tours are on their way',
  'empty_text', 'Every guide and operator is vetted by our team before their tours go live. New tours appear here as soon as they are approved.',
  'empty_cta_label', 'List your tours',
  'empty_cta_url', '/list-your-tour')),
('pitch', 'pitch', 80, true, jsonb_build_object(
  'eyebrow', 'For guides and operators',
  'title', 'Put your tour *at the top of the page*',
  'lede', 'The Spotlight is the first thing travellers see on Cabana Tours: your photos or film, your headline, and a Book button that goes straight to your tour.',
  'bullets', jsonb_build_array(
    'Pay by M-Pesa and choose your start date. We review every slide within a day.',
    'If we can’t approve it, the full amount comes back to you as Cabana credit.',
    'Track views and taps for every day it runs.',
    'Only a few paid slides run at once, so yours is seen.'),
  'cta_label', 'Get featured',
  'cta_url', '/tours-studio?tab=spotlight')),
('invite', 'invite', 90, true, jsonb_build_object(
  'eyebrow', 'For guides and operators',
  'title', 'Run tours? *List them on Cabana.*',
  'lede', 'Whether you guide on your own or run a fleet, list what you already offer, set your own dates and prices, and keep the full fare. We take no commission on the tour price.',
  'bullets', jsonb_build_array(
    'No commission on the tour price',
    'Your own dates, departure times, group sizes and prices',
    'Travellers message you on Cabana and pay by M-Pesa',
    'Send private prices to groups straight from the chat'),
  'cta_label', 'List your tours',
  'cta_url', '/list-your-tour'))
on conflict (id) do nothing;

-- ── retire the illustrated stand-ins ────────────────────────────────
update public.tour_spotlights
   set status = 'ended', ends_at = least(ends_at, greatest(now(), starts_at + interval '1 second'))
 where kind = 'house' and media_kind in ('art', 'world') and status in ('approved', 'paused', 'draft');
