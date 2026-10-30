-- Keep catalogue stock in sync with new orders without rewriting historical orders.
-- Products created in the new catalogue use UUIDs; older sample product IDs are left untouched.
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
BEGIN
  IF TG_OP = 'INSERT' THEN
    FOR line IN SELECT value FROM jsonb_array_elements(COALESCE(NEW.items, '[]'::jsonb))
    LOOP
      IF COALESCE(line->>'product_id', '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
        product_uuid := (line->>'product_id')::uuid;
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
      END IF;
    END LOOP;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM 'cancelled' AND NEW.status = 'cancelled' THEN
    FOR line IN SELECT value FROM jsonb_array_elements(COALESCE(OLD.items, '[]'::jsonb))
    LOOP
      IF COALESCE(line->>'product_id', '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
        product_uuid := (line->>'product_id')::uuid;
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
