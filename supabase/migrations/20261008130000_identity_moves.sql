-- ════════════════════════════════════════════════════════════════════
-- CABANA · MOVING A VERIFIED IDENTITY BETWEEN ACCOUNTS
--   One person, one verified account. When someone verifies on a new
--   account, the ID is already held by an older one. The old account's
--   owner (or, if they cannot get in, an operator) can move the
--   verification across in one atomic step.
-- ════════════════════════════════════════════════════════════════════

alter table public.identity_links drop constraint if exists identity_links_status_check;
alter table public.identity_links add constraint identity_links_status_check
  check (status in ('open','allowed','same_person','dismissed','move_requested','moved'));

create table if not exists public.identity_moves (
  id           uuid primary key default gen_random_uuid(),
  from_user    uuid not null,   -- holds the verification today
  to_user      uuid not null,   -- asked to receive it
  session_id   uuid,
  status       text not null default 'pending' check (status in ('pending','approved','declined','expired','cancelled')),
  decided_by   uuid,
  decided_via  text check (decided_via in ('owner','operator')),
  decided_at   timestamptz,
  note         text check (note is null or length(note) <= 300),
  requested_at timestamptz not null default now(),
  expires_at   timestamptz not null default now() + interval '14 days',
  constraint identity_moves_distinct check (from_user <> to_user)
);
create unique index if not exists identity_moves_one_pending on public.identity_moves (from_user, to_user) where status = 'pending';
create index if not exists identity_moves_from on public.identity_moves (from_user, status);
create index if not exists identity_moves_to on public.identity_moves (to_user, requested_at desc);
alter table public.identity_moves
  add constraint identity_moves_from_fk foreign key (from_user) references auth.users(id) on delete cascade not valid,
  add constraint identity_moves_to_fk foreign key (to_user) references auth.users(id) on delete cascade not valid;

alter table public.identity_moves enable row level security;
drop policy if exists identity_moves_service on public.identity_moves;
create policy identity_moves_service on public.identity_moves for all to service_role using (true) with check (true);
