-- ═══════════════════════════════════════════════════════════════════════
-- Drivers cannot approve themselves.
--
-- driver_documents was writable by its driver (and insertable by anyone,
-- for any driver): a row with status 'approved', or an approved licence
-- with its expiry pushed forward, was enough for cabana_driver_cleared().
-- Now only an admin decides a document. A driver can add a pending one
-- for their own account, and the only change they can make to an existing
-- row is the one driver_document_submit() makes: retiring a pending upload
-- that a newer one replaces.
--
-- drivers.status_note is protected too: it is what tells the remittance
-- path a suspension was for an unpaid balance (and so may be lifted
-- automatically). A driver suspended for anything else must not be able
-- to relabel it.
-- ═══════════════════════════════════════════════════════════════════════
create or replace function cabana_private.driver_document_guard()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare jwt_role text := coalesce(auth.jwt()->>'role', nullif(current_setting('request.jwt.claim.role', true), ''));
begin
  if jwt_role not in ('anon', 'authenticated') or coalesce(public.is_admin(), false) then return new; end if;
  if not exists (select 1 from public.drivers d where d.id = new.driver_id and d.user_id = auth.uid()) then
    raise exception 'You can only manage your own documents' using errcode = '42501';
  end if;
  if tg_op = 'INSERT' then
    new.status := 'pending';
    new.note := null;
    new.reviewed_at := null;
    return new;
  end if;
  if old.status = 'pending' and new.status = 'expired' then
    new.driver_id := old.driver_id; new.kind := old.kind; new.file_url := old.file_url; new.expires_on := old.expires_on;
    return new;
  end if;
  new.driver_id := old.driver_id; new.kind := old.kind; new.file_url := old.file_url;
  new.expires_on := old.expires_on; new.status := old.status; new.note := old.note; new.reviewed_at := old.reviewed_at;
  return new;
end $$;
revoke all on function cabana_private.driver_document_guard() from public, anon, authenticated;
create or replace trigger cabana_aa_driver_document_guard before insert or update on public.driver_documents
  for each row execute function cabana_private.driver_document_guard();

alter policy documents_apply on public.driver_documents
  with check (driver_id in (select d.id from public.drivers d where d.user_id = (select auth.uid())));

do $$
declare d text; p text;
begin
  d := pg_get_functiondef('public.cab_guard_driver_update()'::regprocedure);
  if position('new.status_note := old.status_note' in d) > 0 then return; end if;
  p := replace(d, 'new.status := old.status;', 'new.status := old.status;' || chr(10) || '    new.status_note := old.status_note;');
  if p = d then raise exception 'cab_guard_driver_update changed shape'; end if;
  execute p;
end $$;
