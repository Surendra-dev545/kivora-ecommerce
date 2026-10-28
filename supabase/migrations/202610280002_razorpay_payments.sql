-- Razorpay payment references and an explicit state for orders awaiting payment.
alter table public.orders
  add column if not exists razorpay_order_id text,
  add column if not exists razorpay_payment_id text;

create unique index if not exists orders_razorpay_order_id_unique
  on public.orders (razorpay_order_id)
  where razorpay_order_id is not null;

alter table public.orders drop constraint if exists orders_status_check;
alter table public.orders add constraint orders_status_check
  check (status in ('awaiting_payment','confirmed','processing','shipped','delivered','cancelled'));

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
    and status in ('awaiting_payment','confirmed','processing');
  get diagnostics changed_count = row_count;
  return changed_count = 1;
end;
$$;

revoke all on function public.cancel_my_order(uuid) from public;
grant execute on function public.cancel_my_order(uuid) to authenticated;
