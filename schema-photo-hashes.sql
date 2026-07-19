-- ═══════════════════════════════════════════════════════════════════
-- Migration: add photo_hashes column to listings
-- Purpose:   Enable cross-listing duplicate photo detection using
--            perceptual hashing (8×8 average hash, 64-char binary string).
--            When a host uploads photos, a hash is computed client-side
--            via Canvas API and stored here. On future uploads by other
--            hosts, incoming hashes are compared via Hamming distance ≤ 5.
-- Run once in Supabase SQL Editor or via CLI:
--   psql $DATABASE_URL -f schema-photo-hashes.sql
-- ═══════════════════════════════════════════════════════════════════

-- 1. Add the column (safe — does nothing if it already exists)
alter table public.listings
  add column if not exists photo_hashes text[] default null;

-- 2. Index for faster array containment queries (optional but helpful at scale)
create index if not exists listings_photo_hashes_idx
  on public.listings using gin (photo_hashes);

-- 3. Comment for clarity
comment on column public.listings.photo_hashes is
  'Perceptual hashes (8×8 average hash, 64-char binary string) of each
   uploaded photo. Used to detect duplicate or near-duplicate images
   across listings. Populated client-side via Canvas API on publish.
   Comparison uses Hamming distance ≤ 5 as the similarity threshold.';

-- 4. RLS note: existing policies already cover this column since it is
--    part of the listings table. No new policies needed.
--    Partners can only write their own rows (partner_id = auth.uid()).
--    Public can read active listings (status = ''active'').
