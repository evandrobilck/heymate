-- Let a bill be marked private: visible only to its creator and the
-- participants (debtors) selected on it, instead of the whole house.
alter table public.bills add column is_private boolean not null default false;

drop policy "House members can view bills" on public.bills;

create policy "House members can view bills"
on public.bills for select
to authenticated
using (
  public.is_house_member(house_id)
  and (
    not is_private
    or created_by = auth.uid()
    or exists (
      select 1 from public.bill_shares
      where bill_shares.bill_id = bills.id
        and bill_shares.user_id = auth.uid()
    )
  )
);

drop policy "House members can view bill shares" on public.bill_shares;

create policy "House members can view bill shares"
on public.bill_shares for select
to authenticated
using (
  exists (
    select 1 from public.bills
    where bills.id = bill_shares.bill_id
      and public.is_house_member(bills.house_id)
      and (
        not bills.is_private
        or bills.created_by = auth.uid()
        or exists (
          select 1 from public.bill_shares self_share
          where self_share.bill_id = bills.id
            and self_share.user_id = auth.uid()
        )
      )
  )
);

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
  p_is_private boolean default false
)
returns public.bills
language plpgsql
security definer set search_path = public
as $$
declare
  new_bill public.bills;
  share jsonb;
begin
  if not public.is_house_member(p_house_id) then
    raise exception 'Not a member of this house';
  end if;

  insert into public.bills (house_id, title, category, total_amount, due_date, recurrence, split_type, source, created_by, is_private)
  values (p_house_id, p_title, p_category, p_total_amount, p_due_date, p_recurrence, p_split_type, p_source, auth.uid(), coalesce(p_is_private, false))
  returning * into new_bill;

  for share in select * from jsonb_array_elements(p_shares)
  loop
    insert into public.bill_shares (bill_id, user_id, amount, percentage, paid, paid_at)
    values (
      new_bill.id,
      (share ->> 'user_id')::uuid,
      (share ->> 'amount')::numeric,
      nullif(share ->> 'percentage', '')::numeric,
      coalesce((share ->> 'paid')::boolean, false),
      nullif(share ->> 'paid_at', '')::date
    );
  end loop;

  return new_bill;
end;
$$;

create or replace function public.update_bill(
  p_bill_id uuid,
  p_title text,
  p_category text,
  p_total_amount numeric,
  p_due_date date,
  p_recurrence text,
  p_split_type text,
  p_shares jsonb,
  p_is_private boolean default false
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
      split_type = p_split_type,
      is_private = coalesce(p_is_private, false)
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
