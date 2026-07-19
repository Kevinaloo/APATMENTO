/* ─────────────────────────────────────────────
   OTP codes table for Apatmento Magic Link auth
   Stores hashed one-time passwords (6-digit codes)
   for passwordless sign-in/sign-up flow.
───────────────────────────────────────────── */

create table if not exists public.otp_codes (
  email       text primary key,
  code_hash   text        not null,
  expires_at  timestamptz not null,
  used        boolean     not null default false,
  created_at  timestamptz not null default now()
);

create index if not exists otp_codes_expires_idx on public.otp_codes (expires_at);

alter table public.otp_codes enable row level security;

create policy "anon can upsert own otp" on public.otp_codes
  for insert with check (true);

create policy "anon can update own otp" on public.otp_codes
  for update using (true);

create policy "anon can read own otp" on public.otp_codes
  for select using (true);

create or replace function public.cleanup_expired_otps()
returns void language sql security definer as $$
  delete from public.otp_codes where expires_at < now() - interval '15 minutes';
$$;
