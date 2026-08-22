/* ════════════════════════════════════════════════════════════════════
   CABANA · CALL SIGNALLING RELAY
   ────────────────────────────────────────────────────────────────────
   WebRTC needs a way for two browsers to hand each other an offer, an
   answer and a trickle of ICE candidates before they can talk directly.
   After that the audio is peer-to-peer and none of it comes near here.

   Realtime broadcast is the fast path and carries almost every call.
   This table is the path that is always there: a short-lived relay,
   written and read through /api/call under the service role, so it works
   for a visitor with no account, behind a proxy that eats WebSockets, on
   a network that blocks anything but HTTPS.

   Rows live for minutes. Every signal carries a client-side id so a peer
   that receives the same candidate down both paths applies it once.
   Nothing here is readable by any browser directly, which is why there
   are no permissive policies below: RLS is on and no policy grants
   select. The API is the only door.
════════════════════════════════════════════════════════════════════ */

create table if not exists public.call_signals (
  id         bigserial primary key,
  call_id    uuid not null references public.call_sessions(id) on delete cascade,

  -- 'caller' | 'callee'. Which end put this on the wire. A peer reads
  -- everything the OTHER end wrote and ignores its own.
  from_side  text not null check (from_side in ('caller','callee')),

  kind       text not null check (kind in ('offer','answer','ice','bye','renegotiate')),

  -- Deduplication across the two transports.
  signal_id  text not null,

  payload    jsonb not null,
  created_at timestamptz not null default now()
);

create unique index if not exists call_signals_dedupe_idx
  on public.call_signals (call_id, signal_id);
create index if not exists call_signals_read_idx
  on public.call_signals (call_id, id);

alter table public.call_signals enable row level security;
-- Deliberately no policies. Service role only, via /api/call.

comment on table public.call_signals is
  'Short-lived WebRTC signalling relay. Service-role only; the API is the sole reader and writer. Audio never touches this table.';

/* Signals are rubbish within a minute of a call ending. Called by the
   API on hang-up, and safe to call from a cron if one is ever wanted. */
create or replace function public.purge_stale_call_signals()
returns integer
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare removed integer;
begin
  delete from public.call_signals where created_at < now() - interval '30 minutes';
  get diagnostics removed = row_count;

  -- A call left ringing is a call nobody answered. Close it so the
  -- desk's live count reflects reality rather than abandoned tabs.
  update public.call_sessions
     set status = 'missed', ended_at = now(), end_reason = 'no_answer'
   where status = 'ringing' and started_at < now() - interval '3 minutes';

  update public.call_sessions
     set status = 'ended', ended_at = now(), end_reason = 'stale',
         duration_s = coalesce(duration_s, greatest(0, extract(epoch from (now() - coalesce(answered_at, started_at)))::int))
   where status in ('connecting','active') and started_at < now() - interval '4 hours';

  return removed;
end;
$$;

revoke all on function public.purge_stale_call_signals() from public, anon, authenticated;
