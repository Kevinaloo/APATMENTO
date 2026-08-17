-- ══════════════════════════════════════════════════════════════
-- CABANA · Booking lifecycle + welcome credits
-- Run this once in the Supabase SQL editor.
--
-- Everything here is additive and idempotent. Nothing is dropped,
-- nothing is renamed, and re-running it is a no-op. The application
-- code degrades gracefully if this has NOT been run yet (the sweeper
-- retries its writes without the new columns, and checkout retries a
-- booking insert without credit_applied), so there is no window where
-- the site is broken between deploy and migration. Running it simply
-- turns the last few features on.
-- ══════════════════════════════════════════════════════════════

-- ── 1. Lifecycle columns ─────────────────────────────────────
-- Written by the nightly sweeper (/api/utilities?action=close-bookings).
-- Until now nothing ever ended a booking: a stay whose dates had
-- passed sat at 'paid_pending_checkin' indefinitely, kept announcing
-- itself on the homepage as a live trip, and kept a working check-in
-- code. closed_at records when we stopped considering it live;
-- refund_due records money we are holding against a booking that will
-- never happen, so it can be found and returned rather than quietly
-- kept.

ALTER TABLE apartment_bookings
  ADD COLUMN IF NOT EXISTS closed_at      timestamptz,
  ADD COLUMN IF NOT EXISTS refund_due     numeric(12,2),
  ADD COLUMN IF NOT EXISTS credit_applied numeric(12,2) NOT NULL DEFAULT 0,
  -- The guest's own M-Pesa number. There was never a column for it:
  -- booking-confirm.html set contact_phone to the guest's number and
  -- then, three lines later in the same object literal, set it again
  -- to the host's. The second won, so the number we had just asked
  -- the guest for was discarded on every booking — which is why
  -- nothing could re-charge them for an outstanding balance without
  -- asking for it a second time.
  ADD COLUMN IF NOT EXISTS guest_phone    text;

ALTER TABLE tour_bookings
  ADD COLUMN IF NOT EXISTS closed_at      timestamptz,
  ADD COLUMN IF NOT EXISTS refund_due     numeric(12,2),
  ADD COLUMN IF NOT EXISTS refund_reason  text,
  ADD COLUMN IF NOT EXISTS credit_applied numeric(12,2) NOT NULL DEFAULT 0,
  -- tour_bookings never had the ledger mirror that apartment_bookings
  -- grew. Without amount_paid, a partly-paid tour is indistinguishable
  -- from a fully-paid one.
  ADD COLUMN IF NOT EXISTS amount_paid    numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cancelled_at   timestamptz;

ALTER TABLE event_tickets
  ADD COLUMN IF NOT EXISTS closed_at      timestamptz,
  ADD COLUMN IF NOT EXISTS refund_due     numeric(12,2),
  ADD COLUMN IF NOT EXISTS refund_reason  text,
  ADD COLUMN IF NOT EXISTS credit_applied numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS amount_paid    numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cancelled_at   timestamptz;

-- The sweeper scans by status and date. Without these it is a full
-- table scan every night.
CREATE INDEX IF NOT EXISTS idx_apt_bookings_sweep
  ON apartment_bookings (status, checkout_date);
CREATE INDEX IF NOT EXISTS idx_apt_bookings_guest
  ON apartment_bookings (guest_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tour_bookings_sweep
  ON tour_bookings (status, tour_date);
CREATE INDEX IF NOT EXISTS idx_tour_bookings_guest
  ON tour_bookings (guest_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_event_tickets_guest
  ON event_tickets (guest_id, created_at DESC);

-- ── 2. Backfill amount_paid on the new columns ───────────────
-- A booking that reached a settled status under the old single-payment
-- flow really was paid in full; that is what the status meant then.
-- Anything else starts at zero, which is the honest answer.
UPDATE tour_bookings
   SET amount_paid = COALESCE(grand_total, 0)
 WHERE amount_paid = 0
   AND status IN ('paid_pending_checkin', 'checked_in', 'completed');

UPDATE event_tickets
   SET amount_paid = COALESCE(grand_total, 0)
 WHERE amount_paid = 0
   AND status IN ('paid_pending_checkin', 'checked_in', 'completed');

-- ── 3. Reconcile apartment_bookings against the ledger ───────
-- booking_payments is the source of truth for money. Where the cached
-- amount_paid disagrees with the sum of cleared instalments, the
-- ledger wins.
UPDATE apartment_bookings b
   SET amount_paid = led.total
  FROM (SELECT booking_ref, SUM(amount) AS total
          FROM booking_payments
         WHERE status = 'paid'
         GROUP BY booking_ref) led
 WHERE b.payment_reference = led.booking_ref
   AND COALESCE(b.amount_paid, 0) <> led.total;

-- ── 4. Close what the clock has already closed ───────────────
-- The backlog the nightly sweeper would otherwise take one run to
-- clear. Uses Kenyan local time (UTC+3), matching the application.
UPDATE apartment_bookings
   SET status    = CASE WHEN status = 'checked_in' THEN 'completed' ELSE 'expired' END,
       closed_at = now()
 WHERE cancelled_at IS NULL
   AND checkout_date IS NOT NULL
   AND checkout_date < ((now() AT TIME ZONE 'Africa/Nairobi')::date)
   AND status IN ('pending_payment','part_paid','confirmed_balance_due',
                  'paid_pending_checkin','deposit_paid','checked_in');

-- Money held against a stay that is now expired is a refund liability.
-- Recorded, not deleted: someone has to decide what to give back.
UPDATE apartment_bookings
   SET refund_due    = amount_paid,
       refund_reason = COALESCE(refund_reason, 'stay_dates_passed_unsettled')
 WHERE status = 'expired'
   AND COALESCE(amount_paid, 0) > 0
   AND refund_due IS NULL;

UPDATE tour_bookings
   SET status    = CASE WHEN status = 'checked_in' THEN 'completed' ELSE 'expired' END,
       closed_at = now()
 WHERE tour_date IS NOT NULL
   AND tour_date < ((now() AT TIME ZONE 'Africa/Nairobi')::date)
   AND status IN ('pending_payment','part_paid','confirmed_balance_due',
                  'paid_pending_checkin','deposit_paid','checked_in');

-- ── 5. Welcome credits ───────────────────────────────────────
-- The grant itself is written by /api/rewards (action: claim-welcome)
-- with the service-role key. The only thing needed here is the
-- guarantee that it cannot happen twice.
--
-- schema-rewards.sql already creates:
--   CREATE UNIQUE INDEX idx_pt_booking_earn
--     ON point_transactions(booking_ref, type)
--     WHERE type = 'earn' AND booking_ref IS NOT NULL;
--
-- which covers booking_ref = 'WELCOME-<uid>'. This re-asserts it so
-- this file is safe to run against a database where schema-rewards.sql
-- was only partly applied.
CREATE UNIQUE INDEX IF NOT EXISTS idx_pt_booking_earn
  ON point_transactions (booking_ref, type)
  WHERE type = 'earn' AND booking_ref IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_pt_user_type
  ON point_transactions (user_id, type, created_at DESC);

-- ── 6. What the sweeper will find ────────────────────────────
-- Run this after the migration to see the state of the ledger.
--
--   SELECT status, count(*), sum(amount_paid) AS collected,
--          sum(refund_due) AS owed_back
--     FROM apartment_bookings
--    GROUP BY status
--    ORDER BY count(*) DESC;
