-- Prices, product details and delivery fee are recalculated from the catalogue on the server.
CREATE OR REPLACE FUNCTION public.kivora_price_order_from_catalogue()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  line jsonb;
  rebuilt_items jsonb := '[]'::jsonb;
  raw_product_id text;
  product_uuid uuid;
  qty integer;
  product_row record;
  computed_subtotal numeric(12,2) := 0;
BEGIN
  IF jsonb_typeof(COALESCE(NEW.items, '[]'::jsonb)) <> 'array' OR jsonb_array_length(COALESCE(NEW.items, '[]'::jsonb)) = 0 THEN
    RAISE EXCEPTION 'Your cart is empty.' USING ERRCODE = '23514';
  END IF;

  FOR line IN SELECT value FROM jsonb_array_elements(NEW.items)
  LOOP
    raw_product_id := COALESCE(line->>'product_id', '');
    IF raw_product_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
      RAISE EXCEPTION 'Preview products cannot be purchased. Please refresh the catalogue and select a published product.' USING ERRCODE = '23514';
    END IF;
    product_uuid := raw_product_id::uuid;
    qty := COALESCE(NULLIF(line->>'quantity', '')::integer, 1);
    IF qty < 1 OR qty > 99 THEN
      RAISE EXCEPTION 'Choose a valid quantity for each product.' USING ERRCODE = '23514';
    END IF;
    SELECT id, name, category, image_url, price, is_active, stock_quantity
      INTO product_row FROM public.products WHERE id = product_uuid FOR UPDATE;
    IF NOT FOUND OR product_row.is_active IS DISTINCT FROM true OR product_row.stock_quantity < qty THEN
      RAISE EXCEPTION 'Product % is unavailable or does not have enough stock.', COALESCE(line->>'name', product_uuid::text)
        USING ERRCODE = '23514';
    END IF;
    computed_subtotal := computed_subtotal + (product_row.price * qty);
    rebuilt_items := rebuilt_items || jsonb_build_array(jsonb_build_object(
      'product_id', product_row.id,
      'name', product_row.name,
      'category', product_row.category,
      'image', product_row.image_url,
      'unit_price', product_row.price,
      'quantity', qty,
      'line_total', product_row.price * qty
    ));
  END LOOP;

  NEW.items := rebuilt_items;
  NEW.subtotal := computed_subtotal;
  NEW.shipping_fee := CASE WHEN computed_subtotal = 0 OR computed_subtotal >= 4999 THEN 0 ELSE 199 END;
  NEW.total := computed_subtotal + NEW.shipping_fee;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS kivora_order_price_validation ON public.orders;
CREATE TRIGGER kivora_order_price_validation
  BEFORE INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.kivora_price_order_from_catalogue();

-- Keep catalogue stock in sync with new orders without rewriting historical orders.
-- Product IDs from the managed catalogue are UUIDs. Preview/sample product IDs are rejected.
CREATE OR REPLACE FUNCTION public.kivora_apply_order_stock()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  line jsonb;
  product_uuid uuid;
  qty integer;
  affected integer;
  raw_product_id text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    FOR line IN SELECT value FROM jsonb_array_elements(COALESCE(NEW.items, '[]'::jsonb))
    LOOP
      raw_product_id := COALESCE(line->>'product_id', '');
      IF raw_product_id = '' THEN
        RAISE EXCEPTION 'An order item is missing its catalogue product ID.' USING ERRCODE = '23514';
      END IF;
      IF raw_product_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
        RAISE EXCEPTION 'Preview products cannot be purchased. Please refresh the catalogue and select a published product.' USING ERRCODE = '23514';
      END IF;
      product_uuid := raw_product_id::uuid;
      qty := GREATEST(1, COALESCE(NULLIF(line->>'quantity', '')::integer, 1));
      UPDATE public.products
        SET stock_quantity = stock_quantity - qty, updated_at = now()
        WHERE id = product_uuid AND is_active = true AND stock_quantity >= qty;
      GET DIAGNOSTICS affected = ROW_COUNT;
      IF affected = 0 THEN
        RAISE EXCEPTION 'Product % is unavailable or does not have enough stock.', COALESCE(line->>'name', product_uuid::text)
          USING ERRCODE = '23514';
      END IF;
      INSERT INTO public.inventory_movements(product_id, quantity_change, reason, note, created_by)
        VALUES (product_uuid, -qty, 'sale', 'Reserved for order ' || NEW.order_number, auth.uid());
    END LOOP;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM 'cancelled' AND NEW.status = 'cancelled' THEN
    FOR line IN SELECT value FROM jsonb_array_elements(COALESCE(OLD.items, '[]'::jsonb))
    LOOP
      raw_product_id := COALESCE(line->>'product_id', '');
      IF raw_product_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
        product_uuid := raw_product_id::uuid;
        qty := GREATEST(1, COALESCE(NULLIF(line->>'quantity', '')::integer, 1));
        UPDATE public.products SET stock_quantity = stock_quantity + qty, updated_at = now()
          WHERE id = product_uuid;
        INSERT INTO public.inventory_movements(product_id, quantity_change, reason, note, created_by)
          VALUES (product_uuid, qty, 'return', 'Restocked from cancelled order ' || OLD.order_number, auth.uid());
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS kivora_order_stock_insert ON public.orders;
CREATE TRIGGER kivora_order_stock_insert
  AFTER INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.kivora_apply_order_stock();

DROP TRIGGER IF EXISTS kivora_order_stock_cancel ON public.orders;
CREATE TRIGGER kivora_order_stock_cancel
  AFTER UPDATE OF status ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.kivora_apply_order_stock();
