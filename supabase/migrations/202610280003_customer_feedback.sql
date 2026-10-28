-- Customer feedback belongs to the signed-in customer who submitted it.
create table if not exists public.customer_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  message text not null check (char_length(trim(message)) between 3 and 2000),
  created_at timestamptz not null default now()
);
alter table public.customer_feedback enable row level security;
drop policy if exists "Customers can submit their own feedback" on public.customer_feedback;
create policy "Customers can submit their own feedback" on public.customer_feedback
  for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "Customers can view their own feedback" on public.customer_feedback;
create policy "Customers can view their own feedback" on public.customer_feedback
  for select to authenticated using (auth.uid() = user_id);
grant select, insert on public.customer_feedback to authenticated;
