-- Replaces the old mark_item_bought flow: recording a purchase now takes a
-- category, who actually bought it, and a full participant/split selection,
-- mirroring create_bill instead of always splitting equally among everyone.
create or replace function public.record_purchase(
  p_item_id uuid,
  p_title text,
  p_category text,
  p_total_amount numeric,
  p_buyer_id uuid,
  p_split_type text,
  p_shares jsonb
)
returns public.shopping_items
language plpgsql
security definer set search_path = public
as $$
declare
  item public.shopping_items;
  new_bill public.bills;
  share jsonb;
  updated_item public.shopping_items;
begin
  select * into item from public.shopping_items where id = p_item_id;

  if item is null or not public.is_house_member(item.house_id) then
    raise exception 'Shopping item not found';
  end if;

  if not exists (
    select 1 from public.house_members
    where house_id = item.house_id and user_id = p_buyer_id and left_at is null
  ) then
    raise exception 'Buyer must be an active house member';
  end if;

  insert into public.bills (house_id, title, category, total_amount, due_date, recurrence, split_type, source, created_by)
  values (item.house_id, p_title, p_category, p_total_amount, current_date, 'none', p_split_type, 'shopping', p_buyer_id)
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

  update public.shopping_items
  set bought = true, bought_by = p_buyer_id, bought_at = current_date, price = p_total_amount, bill_id = new_bill.id
  where id = p_item_id
  returning * into updated_item;

  return updated_item;
end;
$$;
