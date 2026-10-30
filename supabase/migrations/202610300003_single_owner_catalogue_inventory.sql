-- Kivora single-owner catalogue and inventory foundation.
-- Existing orders and payment records are intentionally untouched.
CREATE TABLE IF NOT EXISTS public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text NOT NULL DEFAULT '',
  category text NOT NULL,
  sku text UNIQUE,
  price numeric(12,2) NOT NULL CHECK (price >= 0),
  compare_at_price numeric(12,2) CHECK (compare_at_price IS NULL OR compare_at_price >= price),
  image_url text NOT NULL DEFAULT '',
  stock_quantity integer NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
  low_stock_threshold integer NOT NULL DEFAULT 5 CHECK (low_stock_threshold >= 0),
  is_active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS products_active_category_idx ON public.products (is_active, category);
CREATE INDEX IF NOT EXISTS products_updated_at_idx ON public.products (updated_at DESC);

CREATE TABLE IF NOT EXISTS public.inventory_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  quantity_change integer NOT NULL CHECK (quantity_change <> 0),
  reason text NOT NULL CHECK (reason IN ('opening_stock','restock','correction','sale','return')),
  note text NOT NULL DEFAULT '',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS inventory_movements_product_created_idx
  ON public.inventory_movements (product_id, created_at DESC);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can view active Kivora products" ON public.products;
CREATE POLICY "Public can view active Kivora products"
  ON public.products FOR SELECT USING (is_active = true);
-- Inventory movement history is private; writes and admin reads use verified server routes.
