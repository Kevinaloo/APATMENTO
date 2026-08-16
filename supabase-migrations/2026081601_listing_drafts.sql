-- Resumable listing drafts
-- Additive only: creates one new table. Touches no existing table.
-- Project: gfwgbgdvxtocwhilrtdw

create table if not exists public.listing_drafts (
  id             uuid primary key default gen_random_uuid(),
  owner_id       uuid not null references auth.users(id) on delete cascade,

  -- which service pipeline this draft belongs to.
  -- must match the service registry keys used by the wizard.
  service        text not null
                 check (service in ('stay','tour','event','car','restaurant','shopping')),

  -- set once the draft has been promoted to a real row, so we can
  -- show "continue editing" vs "start new" and avoid double-publish.
  published_id   text,

  -- wizard position
  current_step   text not null default 'start',
  steps_done     text[] not null default '{}',

  -- the whole form payload, shape owned by the per-service schema.
  -- jsonb (not json) so we can index and patch individual keys.
  data           jsonb not null default '{}'::jsonb,

  -- resume-card display fields, denormalised so the dashboard query
  -- never has to crack open `data`.
  display_title  text,
  completion_pct smallint not null default 0
                 check (completion_pct between 0 and 100),

  -- optimistic concurrency: client sends the version it last saw.
  -- protects against two tabs racing each other.
  version        integer not null default 1,

  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  expires_at     timestamptz not null default now() + interval '30 days'
);

-- one live draft per service per user. keeps the resume card unambiguous.
-- partial index so published drafts don't block starting a fresh one.
create unique index if not exists listing_drafts_one_live
  on public.listing_drafts (owner_id, service)
  where published_id is null;

create index if not exists listing_drafts_owner_recent
  on public.listing_drafts (owner_id, updated_at desc);

create index if not exists listing_drafts_expiry
  on public.listing_drafts (expires_at)
  where published_id is null;

-- bump updated_at and version on every write, and slide the expiry window
-- forward so an actively-edited draft is never reaped.
create or replace function public.touch_listing_draft()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  new.version    := old.version + 1;
  new.expires_at := now() + interval '30 days';
  return new;
end;
$$;

drop trigger if exists trg_touch_listing_draft on public.listing_drafts;
create trigger trg_touch_listing_draft
  before update on public.listing_drafts
  for each row execute function public.touch_listing_draft();

-- RLS: a draft is private to its owner, full stop.
alter table public.listing_drafts enable row level security;

drop policy if exists "own drafts: select" on public.listing_drafts;
create policy "own drafts: select" on public.listing_drafts
  for select using (auth.uid() = owner_id);

drop policy if exists "own drafts: insert" on public.listing_drafts;
create policy "own drafts: insert" on public.listing_drafts
  for insert with check (auth.uid() = owner_id);

drop policy if exists "own drafts: update" on public.listing_drafts;
create policy "own drafts: update" on public.listing_drafts
  for update using (auth.uid() = owner_id)
              with check (auth.uid() = owner_id);

drop policy if exists "own drafts: delete" on public.listing_drafts;
create policy "own drafts: delete" on public.listing_drafts
  for delete using (auth.uid() = owner_id);

-- Atomic upsert used by the autosave hook. Merges a partial patch into
-- `data` rather than overwriting, so two in-flight saves from different
-- steps cannot clobber each other's fields.
create or replace function public.save_listing_draft(
  p_service       text,
  p_patch         jsonb,
  p_current_step  text     default null,
  p_display_title text     default null,
  p_completion    smallint default null
)
returns public.listing_drafts
language plpgsql
security invoker
as $$
declare
  result public.listing_drafts;
begin
  insert into public.listing_drafts as d
    (owner_id, service, data, current_step, display_title, completion_pct)
  values
    (auth.uid(), p_service, p_patch,
     coalesce(p_current_step, 'start'),
     p_display_title,
     coalesce(p_completion, 0))
  on conflict (owner_id, service) where published_id is null
  do update set
    data          = d.data || excluded.data,
    current_step  = coalesce(p_current_step, d.current_step),
    display_title = coalesce(p_display_title, d.display_title),
    completion_pct= coalesce(p_completion, d.completion_pct),
    steps_done    = case
                      when p_current_step is not null
                       and not (p_current_step = any(d.steps_done))
                      then array_append(d.steps_done, p_current_step)
                      else d.steps_done
                    end
  returning * into result;

  return result;
end;
$$;

-- Reaper for abandoned drafts. Schedule via pg_cron if available,
-- otherwise call from an edge function on a daily trigger.
create or replace function public.purge_expired_listing_drafts()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  n integer;
begin
  delete from public.listing_drafts
  where published_id is null
    and expires_at < now();
  get diagnostics n = row_count;
  return n;
end;
$$;
