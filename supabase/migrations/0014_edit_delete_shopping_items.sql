-- Edit and delete shopping list items / recorded purchases.
--
-- Not-yet-bought items: any house member can rename (already allowed via the
-- existing update policy) and delete (new: any house member, no financial
-- data attached yet).
--
-- Already-bought items: editing/deleting touches the linked bill, so it's
-- restricted to the buyer or an admin, mirroring update_bill.

create or replace function public.delete_shopping_item(p_item_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  item public.shopping_items;
begin
  select * into item from public.shopping_items where id = p_item_id;

  if item is null or not public.is_house_member(item.house_id) then
    raise exception 'Shopping item not found';
  end if;

  if item.bought then
    if not (
      item.bought_by = auth.uid()
      or exists (
        select 1 from public.house_members
        where house_id = item.house_id
          and user_id = auth.uid()
          and role = 'admin'
          and left_at is null
      )
    ) then
      raise exception 'Only the buyer or an admin can delete this purchase';
    end if;

    if item.bill_id is not null then
      delete from public.bill_shares where bill_id = item.bill_id;
      delete from public.bills where id = item.bill_id;
    end if;
  end if;

  delete from public.shopping_items where id = p_item_id;
end;
$$;

create or replace function public.update_purchase(
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
  share jsonb;
  updated_item public.shopping_items;
begin
  select * into item from public.shopping_items where id = p_item_id;

  if item is null or not public.is_house_member(item.house_id) then
    raise exception 'Shopping item not found';
  end if;

  if not item.bought or item.bill_id is null then
    raise exception 'This item has not been purchased yet';
  end if;

  if not (
    item.bought_by = auth.uid()
    or exists (
      select 1 from public.house_members
      where house_id = item.house_id
        and user_id = auth.uid()
        and role = 'admin'
        and left_at is null
    )
  ) then
    raise exception 'Only the buyer or an admin can edit this purchase';
  end if;

  if not exists (
    select 1 from public.house_members
    where house_id = item.house_id and user_id = p_buyer_id and left_at is null
  ) then
    raise exception 'Buyer must be an active house member';
  end if;

  update public.bills
  set title = p_title,
      category = p_category,
      total_amount = p_total_amount,
      split_type = p_split_type,
      created_by = p_buyer_id
  where id = item.bill_id;

  delete from public.bill_shares where bill_id = item.bill_id;

  for share in select * from jsonb_array_elements(p_shares)
  loop
    insert into public.bill_shares (bill_id, user_id, amount, percentage, paid, paid_at)
    values (
      item.bill_id,
      (share ->> 'user_id')::uuid,
      (share ->> 'amount')::numeric,
      nullif(share ->> 'percentage', '')::numeric,
      coalesce((share ->> 'paid')::boolean, false),
      nullif(share ->> 'paid_at', '')::date
    );
  end loop;

  update public.shopping_items
  set name = p_title, price = p_total_amount, bought_by = p_buyer_id
  where id = p_item_id
  returning * into updated_item;

  return updated_item;
end;
$$;
