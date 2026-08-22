-- ═══════════════════════════════════════════════════════════════════
--  CAR FLEET · admin write access
--  ───────────────────────────────────────────────────────────────────
--  Every other supply table in the catalogue grants the platform admin
--  write access: listings via `Admin update listings` / op_listings_delete,
--  tours and events via `admin full access`, menus and the scraped
--  catalogues via is_operator(). car_fleet was the exception — its only
--  write policy is car_fleet_owner_write, which requires the caller to
--  own the operator record.
--
--  The effect was that the console could show a vehicle and offer to
--  pause or retire it, and the write would be silently refused by RLS.
--  An operator cannot answer for supply they are unable to take down.
--
--  This adds the same admin grant the sibling tables already have. It is
--  additive: car_fleet_owner_write is untouched, so operators keep
--  managing their own fleet exactly as before.
--
--  Idempotent. Safe to re-run.
-- ═══════════════════════════════════════════════════════════════════

drop policy if exists car_fleet_admin_write on public.car_fleet;

create policy car_fleet_admin_write
  on public.car_fleet
  for all
  using (public.is_admin() or public.is_operator())
  with check (public.is_admin() or public.is_operator());

comment on policy car_fleet_admin_write on public.car_fleet is
  'Platform admins manage the whole fleet. Mirrors the admin grant on tours, events and listings.';

-- Admins must also be able to see a vehicle in order to act on it.
-- car_fleet_public_read only exposes active vehicles belonging to a
-- verified operator, which hides exactly the rows most likely to need
-- attention.
drop policy if exists car_fleet_admin_read on public.car_fleet;

create policy car_fleet_admin_read
  on public.car_fleet
  for select
  using (public.is_admin() or public.is_operator());
