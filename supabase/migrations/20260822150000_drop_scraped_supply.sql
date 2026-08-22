-- ═══════════════════════════════════════════════════════════════════
--  RETIRE SCRAPED SUPPLY
--  ───────────────────────────────────────────────────────────────────
--  Cabana no longer lists supply it did not author. The nightly scraper
--  (/api/scrape.js) and its four Vercel crons are deleted; these are the
--  tables it wrote into.
--
--  Every consuming surface was moved to first-party data first, so
--  nothing on the site reads these at the point they are dropped:
--
--    home events strip   scraped_events      → events_public
--    category rails      scraped_events      → events_public
--                        scraped_tours       → tours_public
--                        scraped_carhire     → car_fleet
--                        scraped_shopping    → listings (type=shopping)
--    shopping page       scraped_shopping    → listings (type=shopping)
--    admin catalogue     all four            → removed from the registry
--
--  scraped_restaurants was written by the food scraper and read by
--  nothing; the restaurant surfaces use listings + menu_items.
--  scrape_sources held the scraper's per-source configuration and has no
--  meaning without it.
--
--  No foreign key, view, function or cron job referenced any of these —
--  verified before writing this migration — so the drops need no CASCADE
--  and cannot silently take anything else with them. RESTRICT is stated
--  explicitly so that if some later object does depend on one, the
--  migration fails loudly instead of destroying it.
--
--  Row counts at the time of writing (exported to JSON beforehand):
--    scraped_events 11 · scraped_carhire 12 · scraped_shopping 22
--    scraped_restaurants 22 · scraped_tours 0 · scrape_sources 11
-- ═══════════════════════════════════════════════════════════════════

drop table if exists public.scraped_events      restrict;
drop table if exists public.scraped_tours       restrict;
drop table if exists public.scraped_carhire     restrict;
drop table if exists public.scraped_shopping    restrict;
drop table if exists public.scraped_restaurants restrict;
drop table if exists public.scrape_sources      restrict;
