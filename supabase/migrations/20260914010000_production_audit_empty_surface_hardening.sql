-- Production audit: close empty, publicly exposed PII surfaces.
-- Service-role integrations continue to bypass RLS.

drop policy if exists "Authenticated admin deletes" on public.lazy_requests;
drop policy if exists "Authenticated admin reads all" on public.lazy_requests;
drop policy if exists "Authenticated admin updates all" on public.lazy_requests;
alter policy admin_all_lazy_requests on public.lazy_requests to authenticated
  using ((select public.is_operator()) or (select public.is_admin()))
  with check ((select public.is_operator()) or (select public.is_admin()));

-- This legacy integration has no deployed caller and contains no rows.
-- Keep the table for compatibility while closing anonymous PII reads/writes.
drop policy if exists "Anon can insert bookings" on public.wb_bookings;
drop policy if exists "Public can read bookings by ref" on public.wb_bookings;
create policy "Admins manage legacy bookings" on public.wb_bookings
  for all to authenticated
  using ((select public.is_operator()) or (select public.is_admin()))
  with check ((select public.is_operator()) or (select public.is_admin()));

update storage.buckets set public=false where id='finance-proofs';
drop policy if exists "anon can read finance proofs" on storage.objects;
drop policy if exists "anon can upload finance proofs" on storage.objects;
drop policy if exists "auth can read finance proofs" on storage.objects;
drop policy if exists "auth can upload finance proofs" on storage.objects;
create policy "Users upload own finance proofs" on storage.objects
  for insert to authenticated
  with check (
    bucket_id='finance-proofs'
    and (
      (storage.foldername(name))[1]=(select auth.uid())::text
      or (select public.is_operator())
      or (select public.is_admin())
    )
  );
create policy "Users read own finance proofs" on storage.objects
  for select to authenticated
  using (
    bucket_id='finance-proofs'
    and (
      (storage.foldername(name))[1]=(select auth.uid())::text
      or (select public.is_operator())
      or (select public.is_admin())
    )
  );

notify pgrst, 'reload schema';
