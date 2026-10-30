-- Add the manual "out for delivery" milestone used by the customer tracker.
-- Replace any existing CHECK constraint that validates the orders.status column,
-- then re-create it with the expanded status set.
DO $$
DECLARE
  status_constraint RECORD;
BEGIN
  FOR status_constraint IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.orders'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%status%'
  LOOP
    EXECUTE format('ALTER TABLE public.orders DROP CONSTRAINT %I', status_constraint.conname);
  END LOOP;

  ALTER TABLE public.orders
    ADD CONSTRAINT orders_status_check
    CHECK (status IN (
      'awaiting_payment',
      'confirmed',
      'processing',
      'shipped',
      'out_for_delivery',
      'delivered',
      'cancelled'
    ));
END $$;
