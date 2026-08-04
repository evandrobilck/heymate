-- 0038 moved recurring bills' real per-cycle debt into
-- bill_occurrence_payments — bill_shares.paid on a recurring bill is now
-- just the (mostly stale) template row, since the client stopped touching
-- it after creation. 0037's debt-offset search in create_bill only looks
-- at bill_shares, so left as-is it would treat every recurring bill as a
-- permanently-unpaid debt to offset against, regardless of how many cycles
-- were actually paid off via toggle_occurrence_paid. Excluding recurring
-- bills here keeps auto-offset correct for the one-off bills it was built
-- for, instead of offsetting against a number that's no longer real.
create or replace function public.create_bill(
  p_house_id uuid,
  p_title text,
  p_category text,
  p_total_amount numeric,
  p_due_date date,
  p_recurrence text,
  p_split_type text,
  p_source text,
  p_shares jsonb,
  p_is_private boolean default false,
  p_apply_debt_offset boolean default false
)
returns public.bills
language plpgsql
security definer set search_path = public
as $$
declare
  new_bill public.bills;
  share jsonb;
  new_share record;
  remaining numeric;
  debt_row record;
  apply_amount numeric;
begin
  if not public.is_house_member(p_house_id) then
    raise exception 'Not a member of this house';
  end if;

  insert into public.bills (house_id, title, category, total_amount, due_date, recurrence, split_type, source, created_by, is_private)
  values (p_house_id, p_title, p_category, p_total_amount, p_due_date, p_recurrence, p_split_type, p_source, auth.uid(), coalesce(p_is_private, false))
  returning * into new_bill;

  for share in select * from jsonb_array_elements(p_shares)
  loop
    insert into public.bill_shares (bill_id, user_id, amount, percentage, paid, paid_at, paid_amount, settled_via)
    values (
      new_bill.id,
      (share ->> 'user_id')::uuid,
      (share ->> 'amount')::numeric,
      nullif(share ->> 'percentage', '')::numeric,
      coalesce((share ->> 'paid')::boolean, false),
      nullif(share ->> 'paid_at', '')::date,
      case when coalesce((share ->> 'paid')::boolean, false) then (share ->> 'amount')::numeric else 0 end,
      case when coalesce((share ->> 'paid')::boolean, false) then 'cash' else null end
    );
  end loop;

  if coalesce(p_apply_debt_offset, false) then
    for new_share in
      select bs.user_id, bs.amount
      from public.bill_shares bs
      where bs.bill_id = new_bill.id
        and bs.user_id <> auth.uid()
        and bs.paid = false
    loop
      remaining := new_share.amount;

      for debt_row in
        select bs2.id, (bs2.amount - bs2.paid_amount) as owed
        from public.bill_shares bs2
        join public.bills b2 on b2.id = bs2.bill_id
        where bs2.user_id = auth.uid()
          and b2.created_by = new_share.user_id
          and b2.house_id = p_house_id
          and b2.recurrence = 'none'
          and bs2.paid = false
          and bs2.amount - bs2.paid_amount > 0.005
        order by b2.due_date asc, b2.created_at asc
      loop
        exit when remaining <= 0.005;
        apply_amount := least(remaining, debt_row.owed);

        update public.bill_shares
        set paid_amount = paid_amount + apply_amount,
            paid = (paid_amount + apply_amount) >= amount - 0.005,
            paid_at = case when (paid_amount + apply_amount) >= amount - 0.005 then current_date else paid_at end,
            settled_via = 'debt_offset'
        where id = debt_row.id;

        remaining := remaining - apply_amount;
      end loop;

      if remaining < new_share.amount - 0.005 then
        update public.bill_shares
        set paid_amount = new_share.amount - remaining,
            paid = remaining <= 0.005,
            paid_at = case when remaining <= 0.005 then current_date else paid_at end,
            settled_via = 'debt_offset'
        where bill_id = new_bill.id and user_id = new_share.user_id;
      end if;
    end loop;
  end if;

  return new_bill;
end;
$$;
