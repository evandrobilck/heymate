-- Recurring bills (rent, gas, ...) store a single anchor due_date and a
-- single paid flag per participant in bill_shares — recurrence itself is
-- computed client-side purely for display (see recurrence.js). That meant
-- marking a recurring bill paid had nothing to "reset" for the next cycle:
-- the same bill_shares row just stayed paid forever, so the bill vanished
-- from Pendentes permanently instead of coming back due next month.
--
-- This adds per-cycle payment tracking: bill_shares keeps its role as the
-- template split (used to seed each new occurrence and to drive
-- non-recurring bills exactly as before); bill_occurrence_payments records
-- whether a given participant has paid a *specific* occurrence date of a
-- recurring bill. The client derives, per recurring bill: every occurrence
-- that's fully paid (-> permanent history entry in Pagas) and the single
-- oldest not-yet-fully-paid occurrence (-> the live Pendente card, only
-- surfaced once it's within its due window).

create table public.bill_occurrence_payments (
  id uuid primary key default gen_random_uuid(),
  bill_id uuid not null references public.bills (id) on delete cascade,
  occurrence_date date not null,
  user_id uuid not null references public.profiles (id),
  amount numeric not null,
  percentage numeric,
  paid boolean not null default false,
  paid_at date,
  paid_amount numeric not null default 0,
  settled_via text,
  unique (bill_id, occurrence_date, user_id),
  constraint bill_occurrence_payments_paid_amount_range check (paid_amount >= 0 and paid_amount <= amount + 0.01),
  constraint bill_occurrence_payments_settled_via_check check (settled_via is null or settled_via in ('cash', 'debt_offset'))
);

alter table public.bill_occurrence_payments enable row level security;

-- Mirrors bill_shares' privacy-aware SELECT policy (0036), reusing the same
-- security-definer is_bill_participant() helper instead of a self-referencing
-- subquery, for the same reason 0036 exists: a policy on this table can't
-- safely query this table itself.
create policy "House members can view occurrence payments"
on public.bill_occurrence_payments for select
to authenticated
using (
  exists (
    select 1 from public.bills
    where bills.id = bill_occurrence_payments.bill_id
      and public.is_house_member(bills.house_id)
      and (
        not bills.is_private
        or bills.created_by = auth.uid()
        or public.is_bill_participant(bills.id)
      )
  )
);

-- All writes go through this RPC (upsert-toggle), same "self or admin" rule
-- as bill_shares — no direct INSERT/UPDATE policy is needed since there's
-- no client path that writes this table other than through here.
create or replace function public.toggle_occurrence_paid(
  p_bill_id uuid,
  p_occurrence_date date,
  p_user_id uuid,
  p_amount numeric,
  p_percentage numeric default null
)
returns public.bill_occurrence_payments
language plpgsql
security definer set search_path = public
as $$
declare
  target_house_id uuid;
  existing public.bill_occurrence_payments;
  result public.bill_occurrence_payments;
  next_paid boolean;
begin
  select house_id into target_house_id from public.bills where id = p_bill_id;
  if target_house_id is null then
    raise exception 'Bill not found';
  end if;

  if not (
    p_user_id = auth.uid()
    or exists (
      select 1 from public.house_members
      where house_id = target_house_id
        and user_id = auth.uid()
        and role = 'admin'
        and left_at is null
    )
  ) then
    raise exception 'Not allowed to toggle this participant''s payment';
  end if;

  select * into existing from public.bill_occurrence_payments
  where bill_id = p_bill_id and occurrence_date = p_occurrence_date and user_id = p_user_id;

  next_paid := existing is null or not existing.paid;

  insert into public.bill_occurrence_payments (bill_id, occurrence_date, user_id, amount, percentage, paid, paid_at, paid_amount, settled_via)
  values (
    p_bill_id, p_occurrence_date, p_user_id, p_amount, p_percentage,
    next_paid,
    case when next_paid then current_date else null end,
    case when next_paid then p_amount else 0 end,
    case when next_paid then 'cash' else null end
  )
  on conflict (bill_id, occurrence_date, user_id)
  do update set
    amount = excluded.amount,
    percentage = excluded.percentage,
    paid = excluded.paid,
    paid_at = excluded.paid_at,
    paid_amount = excluded.paid_amount,
    settled_via = excluded.settled_via
  returning * into result;

  return result;
end;
$$;

alter publication supabase_realtime add table public.bill_occurrence_payments;
