-- Balances shown in BalanceSummary are a live sum over every unpaid share
-- between two people, but that sum was never actually settled anywhere: if
-- A owes B on one bill and B owes A on another, marking B's share paid just
-- drops it out of the sum instead of reducing what A owes B. This adds real
-- partial-payment tracking so a new bill can offset an existing debt
-- between the same two people at creation time, instead of only netting
-- them together on screen.

alter table public.bill_shares add column paid_amount numeric not null default 0;
alter table public.bill_shares add column settled_via text;

update public.bill_shares set paid_amount = case when paid then amount else 0 end;

alter table public.bill_shares add constraint bill_shares_paid_amount_range
  check (paid_amount >= 0 and paid_amount <= amount + 0.01);

alter table public.bill_shares add constraint bill_shares_settled_via_check
  check (settled_via is null or settled_via in ('cash', 'debt_offset'));

-- create_bill now accepts paid_amount/settled_via per share (so callers can
-- pre-mark a share paid, same as mark_item_bought already does) and an
-- opt-in p_apply_debt_offset flag. When set, any newly added participant
-- who is owed money by the bill creator elsewhere in the house has that
-- existing debt paid down first (oldest due_date first), and the new
-- share is marked paid/partially paid by the same amount — a real,
-- persisted offset instead of a display-only net.
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

-- update_bill now carries paid_amount/settled_via through the share
-- rewrite too, so editing a bill doesn't wipe out a prior offset (it
-- already preserved the paid boolean via the client's keepPaid logic).
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
    insert into public.bill_shares (bill_id, user_id, amount, percentage, paid, paid_at, paid_amount, settled_via)
    values (
      p_bill_id,
      (share ->> 'user_id')::uuid,
      (share ->> 'amount')::numeric,
      nullif(share ->> 'percentage', '')::numeric,
      coalesce((share ->> 'paid')::boolean, false),
      nullif(share ->> 'paid_at', '')::date,
      coalesce((share ->> 'paid_amount')::numeric, case when coalesce((share ->> 'paid')::boolean, false) then (share ->> 'amount')::numeric else 0 end),
      nullif(share ->> 'settled_via', '')
    );
  end loop;

  return updated_bill;
end;
$$;

-- mark_item_bought pre-marks the buyer's own share paid — keep paid_amount
-- consistent with that so it isn't treated as an unpaid remainder anywhere
-- computeBalances-style logic sums paid_amount instead of the paid flag.
create or replace function public.mark_item_bought(
  p_item_id uuid,
  p_price numeric
)
returns public.shopping_items
language plpgsql
security definer set search_path = public
as $$
declare
  item public.shopping_items;
  new_bill public.bills;
  participant record;
  share_count int;
  share_amount numeric;
  updated_item public.shopping_items;
begin
  select * into item from public.shopping_items where id = p_item_id;

  if item is null or not public.is_house_member(item.house_id) then
    raise exception 'Shopping item not found';
  end if;

  select count(*) into share_count
  from public.house_members
  where house_id = item.house_id and left_at is null;

  share_amount := round(p_price / greatest(share_count, 1), 2);

  insert into public.bills (house_id, title, category, total_amount, due_date, recurrence, split_type, source, created_by)
  values (item.house_id, item.name, 'groceries', p_price, current_date, 'none', 'equal', 'shopping', auth.uid())
  returning * into new_bill;

  for participant in
    select user_id from public.house_members where house_id = item.house_id and left_at is null
  loop
    insert into public.bill_shares (bill_id, user_id, amount, paid, paid_at, paid_amount, settled_via)
    values (
      new_bill.id,
      participant.user_id,
      share_amount,
      participant.user_id = auth.uid(),
      case when participant.user_id = auth.uid() then current_date else null end,
      case when participant.user_id = auth.uid() then share_amount else 0 end,
      case when participant.user_id = auth.uid() then 'cash' else null end
    );
  end loop;

  update public.shopping_items
  set bought = true, bought_by = auth.uid(), bought_at = current_date, price = p_price, bill_id = new_bill.id
  where id = p_item_id
  returning * into updated_item;

  return updated_item;
end;
$$;
