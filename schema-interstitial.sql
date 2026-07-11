-- ══════════════════════════════════════════════════════════════
--  APATMENTO · INTERSTITIAL (SPLASH SCREEN) STORAGE
--  ──────────────────────────────────────────────────────────────
--  The homepage splash (silent video / image shown on landing) stores
--  BOTH its config (splash.json) and its media in ONE public bucket:
--  `interstitial`.
--
--    • Public READ  — every visitor's browser fetches splash.json and
--                     the media directly, with no auth.
--    • Auth WRITE   — only signed-in operators (the admin console runs
--                     as an authenticated Supabase user) may upload,
--                     replace, or delete.
--
--  The admin console calls storage.createBucket('interstitial',{public:true})
--  on load, so the bucket usually already exists. This script is the
--  belt-and-braces version: safe to run repeatedly, and it pins the
--  read/write policies explicitly.
--
--  Run once in the Supabase SQL editor.
-- ══════════════════════════════════════════════════════════════

-- 1) Ensure the bucket exists and is public (idempotent).
insert into storage.buckets (id, name, public, file_size_limit)
values ('interstitial', 'interstitial', true, 209715200)  -- 200 MB ceiling
on conflict (id) do update
  set public = true,
      file_size_limit = 209715200;

-- 2) Public read: anyone can download objects in this bucket.
drop policy if exists "interstitial public read" on storage.objects;
create policy "interstitial public read"
  on storage.objects for select
  to public
  using ( bucket_id = 'interstitial' );

-- 3) Authenticated write: signed-in users may insert (upload) objects.
drop policy if exists "interstitial auth insert" on storage.objects;
create policy "interstitial auth insert"
  on storage.objects for insert
  to authenticated
  with check ( bucket_id = 'interstitial' );

-- 4) Authenticated update: signed-in users may overwrite (upsert) objects.
drop policy if exists "interstitial auth update" on storage.objects;
create policy "interstitial auth update"
  on storage.objects for update
  to authenticated
  using ( bucket_id = 'interstitial' )
  with check ( bucket_id = 'interstitial' );

-- 5) Authenticated delete: signed-in users may remove objects.
drop policy if exists "interstitial auth delete" on storage.objects;
create policy "interstitial auth delete"
  on storage.objects for delete
  to authenticated
  using ( bucket_id = 'interstitial' );

-- ── NOTES ──────────────────────────────────────────────────────
-- • These policies scope strictly to bucket_id = 'interstitial'; no
--   other bucket is affected.
-- • If you want to lock writes to ONLY the two operator emails rather
--   than any authenticated user, replace the `to authenticated` write
--   policies with a check against auth.jwt()->>'email', e.g.:
--
--     with check (
--       bucket_id = 'interstitial'
--       and (auth.jwt() ->> 'email') in ('apatmento@gmail.com','worlddossy@gmail.com')
--     )
--
--   The admin console is already gated to those emails on the client,
--   so the broader `authenticated` rule is usually sufficient.
-- ══════════════════════════════════════════════════════════════
