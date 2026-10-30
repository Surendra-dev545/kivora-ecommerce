# Kivora catalogue and inventory setup

Kivora is being built as a single-owner store. The store owner creates products; there are no seller accounts or seller payouts.

## One-time Supabase setup

After the code is deployed, open your Supabase project → SQL Editor and run these migrations in order:

1. `supabase/migrations/202610300003_single_owner_catalogue_inventory.sql`
2. `supabase/migrations/202610300004_order_inventory_sync.sql`

Do not rerun older order or rider migrations as part of this step. These two migrations add the product catalogue, private inventory movement history, stock checks on new orders, and automatic restocking when an order is cancelled. Existing orders and payment records are not rewritten.

## Store-owner access

In Vercel Project Settings → Environment Variables, make sure these server settings exist:

- `SUPABASE_SERVICE_ROLE_KEY` — private server-only Supabase service role key. Never expose it as a `NEXT_PUBLIC_*` variable.
- `ADMIN_EMAILS` — comma-separated email address(es) allowed to use the admin APIs.

The project also needs its existing `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` settings.

## Add your first live product

1. Sign in to Kivora using an email listed in `ADMIN_EMAILS`.
2. Open `/admin/products`.
3. Add the real product name, category, price, image URL and actual available stock.
4. Tick “Publish this product on the storefront” and save.

New catalogue products start with zero stock unless you enter a real quantity. The storefront reads published, in-stock products from Supabase. Preview/sample product IDs are not accepted for new orders once the inventory trigger is installed.

## Important

The stock trigger reserves stock atomically when an order is created and returns stock when the order is cancelled. Online payment verification and delivery tracking remain separate workflows; do not treat an order as paid or delivered just because it exists.
