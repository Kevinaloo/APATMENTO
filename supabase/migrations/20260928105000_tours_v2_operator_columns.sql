-- ═══════════════════════════════════════════════════════════════════
-- CABANA TOURS v2 · operator contact details leave the public tables
-- ───────────────────────────────────────────────────────────────────
-- Applied after the v2 front end was live, because the old listing form
-- read its own operator row with select('*').
--
-- Phone, WhatsApp and email on tour_operators were readable by anyone
-- with the anon key. They are now reachable only through:
--   tour_operator_me()       the operator's own row
--   admin_tour_operators()   the console
--   a paid tour booking      the traveller gets the guide's number
-- tours_public and the guides directory use only the columns below.
-- ═══════════════════════════════════════════════════════════════════

revoke select on public.tour_operators from anon, authenticated;
grant select (id, owner_id, slug, name, tagline, bio, logo_url, county, kind, status,
              verified, verified_at, created_at, updated_at, persona)
  on public.tour_operators to anon, authenticated;
