-- Private rider roster, order assignment and latest GPS position.
CREATE TABLE IF NOT EXISTS public.rider_profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.order_delivery_tracking (
  order_id uuid PRIMARY KEY REFERENCES public.orders(id) ON DELETE CASCADE,
  rider_id uuid NOT NULL REFERENCES auth.users(id),
  latitude double precision NOT NULL CHECK (latitude BETWEEN -90 AND 90),
  longitude double precision NOT NULL CHECK (longitude BETWEEN -180 AND 180),
  accuracy_m double precision,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS assigned_rider_id uuid REFERENCES auth.users(id);
ALTER TABLE public.rider_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_delivery_tracking ENABLE ROW LEVEL SECURITY;
-- No direct client policies: all reads/writes go through authenticated server routes.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname='supabase_realtime')
     AND NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='order_delivery_tracking') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.order_delivery_tracking;
  END IF;
END $$;
-- Add a rider by creating their Auth user in Supabase, then inserting their UUID and display name:
-- INSERT INTO public.rider_profiles (user_id, display_name) VALUES ('AUTH-USER-UUID', 'Rider name');
