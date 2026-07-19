-- Let a recurring bill's individual calendar occurrences be hidden, without
-- touching the real bill/payment record. Two modes:
--   - "delete only this one": skip a single date (bill_occurrence_exceptions)
--   - "delete this and following": stop the series after a cutoff date
--     (bills.recurrence_until)
-- Both are purely cosmetic for the calendar view.

alter table public.bills add column recurrence_until date;

create table public.bill_occurrence_exceptions (
  id uuid primary key default gen_random_uuid(),
  bill_id uuid not null references public.bills (id) on delete cascade,
  occurrence_date date not null,
  unique (bill_id, occurrence_date)
);

alter table public.bill_occurrence_exceptions enable row level security;

create policy "House members can view occurrence exceptions"
on public.bill_occurrence_exceptions for select
to authenticated
using (
  exists (
    select 1 from public.bills
    where bills.id = bill_occurrence_exceptions.bill_id
      and public.is_house_member(bills.house_id)
  )
);

create policy "House members can manage occurrence exceptions"
on public.bill_occurrence_exceptions for all
to authenticated
using (
  exists (
    select 1 from public.bills
    where bills.id = bill_occurrence_exceptions.bill_id
      and public.is_house_member(bills.house_id)
  )
);

-- Narrow, security-definer path to touch just recurrence_until on bills,
-- since there's no general-purpose "house members can update any bill"
-- policy (bill edits otherwise go through update_bill, gated to creator/admin).
create or replace function public.set_bill_recurrence_until(p_bill_id uuid, p_until_date date)
returns public.bills
language plpgsql
security definer set search_path = public
as $$
declare
  target_bill public.bills;
  updated_bill public.bills;
begin
  select * into target_bill from public.bills where id = p_bill_id;

  if target_bill is null or not public.is_house_member(target_bill.house_id) then
    raise exception 'Bill not found';
  end if;

  update public.bills set recurrence_until = p_until_date where id = p_bill_id
  returning * into updated_bill;

  return updated_bill;
end;
$$;

alter publication supabase_realtime add table public.bill_occurrence_exceptions;
