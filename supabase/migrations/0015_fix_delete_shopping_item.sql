-- Fix: shopping_items.bill_id references bills(id) with no cascade rule
-- (same issue fixed for reset_house_data in 0009), so deleting the bill
-- while the shopping_items row still points to it violates that foreign
-- key. Delete the shopping_items row first, then the bill.
create or replace function public.delete_shopping_item(p_item_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  item public.shopping_items;
  linked_bill_id uuid;
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
  end if;

  linked_bill_id := item.bill_id;

  delete from public.shopping_items where id = p_item_id;

  if linked_bill_id is not null then
    delete from public.bill_shares where bill_id = linked_bill_id;
    delete from public.bills where id = linked_bill_id;
  end if;
end;
$$;
