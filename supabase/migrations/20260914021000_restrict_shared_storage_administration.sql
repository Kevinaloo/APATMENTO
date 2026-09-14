-- Brand and campaign media is public to read but restricted to Cabana
-- administrators for every write operation.
alter policy "Auth delete ads-media" on storage.objects to authenticated
  using (bucket_id='ads-media' and ((select public.is_admin()) or (select public.is_operator())));
alter policy "Auth update ads-media" on storage.objects to authenticated
  using (bucket_id='ads-media' and ((select public.is_admin()) or (select public.is_operator())))
  with check (bucket_id='ads-media' and ((select public.is_admin()) or (select public.is_operator())));
alter policy "Auth upload ads-media" on storage.objects to authenticated
  with check (bucket_id='ads-media' and ((select public.is_admin()) or (select public.is_operator())));
alter policy "Auth upload ads media" on storage.objects to authenticated
  with check (bucket_id='ads' and ((select public.is_admin()) or (select public.is_operator())));

alter policy "Auth delete bg-clips" on storage.objects to authenticated
  using (bucket_id='bg-clips' and ((select public.is_admin()) or (select public.is_operator())));
alter policy "Auth manage bg-clips" on storage.objects to authenticated
  with check (bucket_id='bg-clips' and ((select public.is_admin()) or (select public.is_operator())));
alter policy "Auth delete logo" on storage.objects to authenticated
  using (bucket_id='logo' and ((select public.is_admin()) or (select public.is_operator())));
alter policy "Auth upload logo" on storage.objects to authenticated
  with check (bucket_id='logo' and ((select public.is_admin()) or (select public.is_operator())));

alter policy "interstitial auth delete" on storage.objects to authenticated
  using (bucket_id='interstitial' and ((select public.is_admin()) or (select public.is_operator())));
alter policy "interstitial auth insert" on storage.objects to authenticated
  with check (bucket_id='interstitial' and ((select public.is_admin()) or (select public.is_operator())));
alter policy "interstitial auth update" on storage.objects to authenticated
  using (bucket_id='interstitial' and ((select public.is_admin()) or (select public.is_operator())))
  with check (bucket_id='interstitial' and ((select public.is_admin()) or (select public.is_operator())));

-- Private uploads are isolated by their first path segment.
alter policy "Partners read own uploads" on storage.objects to authenticated
  using (
    bucket_id='uploads' and (
      (storage.foldername(name))[1]=(select auth.uid())::text
      or (select public.is_admin()) or (select public.is_operator())
    )
  );
alter policy "Partners upload to uploads" on storage.objects to authenticated
  with check (
    bucket_id='uploads' and (
      (storage.foldername(name))[1]=(select auth.uid())::text
      or (select public.is_admin()) or (select public.is_operator())
    )
  );
alter policy "Admin delete uploads" on storage.objects to authenticated
  using (bucket_id='uploads' and ((select public.is_admin()) or (select public.is_operator())));

notify pgrst, 'reload schema';
