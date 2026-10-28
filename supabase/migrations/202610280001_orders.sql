-- Kivora customer orders. Run this file in Supabase SQL Editor.
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  order_number text not null unique,
  customer_name text not null,
  customer_email text not null,
  customer_phone text,
  shipping_address text not null,
  items jsonb not null check (jsonb_typeof(items) = 'array'),
  subtotal numeric(10,2) not null check (subtotal >= 0),
  shipping_fee numeric(10,2) not null default 0 check (shipping_fee >= 0),
  total numeric(10,2) not null check (total >= 0),
  status text not null default 'confirmed' check (status in ('confirmed','processing','shipped','delivered','cancelled')),
  payment_method text not null default 'cash_on_delivery',
  payment_status text not null default 'pending' check (payment_status in ('pending','paid','refunded')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.orders enable row level security;

drop policy if exists "Customers can view their own orders" on public.orders;
create policy "Customers can view their own orders"
  on public.orders for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Customers can create their own orders" on public.orders;
create policy "Customers can create their own orders"
  on public.orders for insert to authenticated
  with check (auth.uid() = user_id);

grant select, insert on public.orders to authenticated;

create or replace function public.cancel_my_order(p_order_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  changed_count integer;
begin
  update public.orders
  set status = 'cancelled', updated_at = now()
  where id = p_order_id
    and user_id = auth.uid()
    and status in ('confirmed', 'processing');
  get diagnostics changed_count = row_count;
  return changed_count = 1;
end;
$$;

revoke all on function public.cancel_my_order(uuid) from public;
grant execute on function public.cancel_my_order(uuid) to authenticated;
