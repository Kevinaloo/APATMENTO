-- Referral relationships are private to the two participants.
drop policy if exists "read own referrals" on public.referrals;
notify pgrst, 'reload schema';
