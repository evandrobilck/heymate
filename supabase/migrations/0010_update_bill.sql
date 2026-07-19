-- Let the bill's creator or a house admin edit it after creation. Rewrites
-- the bill's fields and replaces its shares atomically, mirroring create_bill.
create or replace function public.update_bill(
  p_bill_id uuid,
  p_title text,
  p_category text,
  p_total_amount numeric,
  p_due_date date,
  p_recurrence text,
  p_split_type text,
  p_shares jsonb
)
returns public.bills
language plpgsql
security definer set search_path = public
as $$
declare
  updated_bill public.bills;
  target_house_id uuid;
  share jsonb;
begin
  select house_id into target_house_id from public.bills where id = p_bill_id;

  if target_house_id is null then
    raise exception 'Bill not found';
  end if;

  if not exists (
    select 1 from public.bills
    where id = p_bill_id
      and (
        created_by = auth.uid()
        or exists (
          select 1 from public.house_members
          where house_id = target_house_id
            and user_id = auth.uid()
            and role = 'admin'
            and left_at is null
        )
      )
  ) then
    raise exception 'Only the bill creator or an admin can edit this bill';
  end if;

  update public.bills
  set title = p_title,
      category = p_category,
      total_amount = p_total_amount,
      due_date = p_due_date,
      recurrence = p_recurrence,
      split_type = p_split_type
  where id = p_bill_id
  returning * into updated_bill;

  delete from public.bill_shares where bill_id = p_bill_id;

  for share in select * from jsonb_array_elements(p_shares)
  loop
    insert into public.bill_shares (bill_id, user_id, amount, percentage, paid, paid_at)
    values (
      p_bill_id,
      (share ->> 'user_id')::uuid,
      (share ->> 'amount')::numeric,
      nullif(share ->> 'percentage', '')::numeric,
      coalesce((share ->> 'paid')::boolean, false),
      nullif(share ->> 'paid_at', '')::date
    );
  end loop;

  return updated_bill;
end;
$$;
