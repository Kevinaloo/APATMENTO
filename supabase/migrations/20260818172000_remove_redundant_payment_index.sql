-- The first production application briefly created a second unique index on
-- booking_payments.reference even though the column's UNIQUE constraint
-- already enforces the same invariant. Keep the constraint-owned index.

drop index if exists public.booking_payments_reference_uidx;
