-- Historical expenses: a lightweight manual log for bills from before the
-- house started using HeyFlat, kept purely for the Gastos reports/charts.
-- Deliberately separate from `bills` so these never enter the bill-splitting
-- flow — no shares, no due dates, no reminders, and they never show up in
-- the Contas tab.
create table public.historical_expenses (
  id uuid primary key default gen_random_uuid(),
  house_id uuid not null references public.houses (id) on delete cascade,
  title text not null,
  category text not null,
  total_amount numeric not null,
  expense_date date not null,
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now()
);

alter table public.historical_expenses enable row level security;

create policy "House members can view historical expenses"
on public.historical_expenses for select
to authenticated
using (public.is_house_member(house_id));

create policy "House members can create historical expenses"
on public.historical_expenses for insert
to authenticated
with check (public.is_house_member(house_id) and created_by = auth.uid());

create policy "House members can delete historical expenses"
on public.historical_expenses for delete
to authenticated
using (public.is_house_member(house_id));

alter publication supabase_realtime add table public.historical_expenses;
