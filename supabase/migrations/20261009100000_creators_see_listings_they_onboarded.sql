-- A person who builds a listing on somebody else's behalf (an ambassador or
-- agent filling in the form for a host) is recorded in listings.created_by,
-- while partner_id is the owner it was created for. Every read policy keyed on
-- partner_id alone, so the moment the owner claimed the listing it vanished
-- from the page of the person who made it. Creators can now READ what they
-- onboarded. Writes stay owner-only: this grants visibility, not control.
drop policy if exists "Creators read listings they onboarded" on public.listings;
create policy "Creators read listings they onboarded"
  on public.listings for select
  to authenticated
  using (created_by = auth.uid() and deleted_at is null);

create index if not exists listings_created_by_idx on public.listings (created_by) where deleted_at is null;
