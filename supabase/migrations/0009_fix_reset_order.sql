-- Fix: shopping_items.bill_id references bills(id) with no cascade rule, so
-- deleting bills before shopping_items (which happens whenever an item was
-- ever marked as bought, since mark_item_bought links it to a bill) violates
-- that foreign key and aborts the whole reset. Clear shopping_items first.
create or replace function public.reset_house_data(target_house_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if not exists (
    select 1 from public.house_members
    where house_id = target_house_id
      and user_id = auth.uid()
      and role = 'admin'
      and left_at is null
  ) then
    raise exception 'Only an admin can reset house data';
  end if;

  delete from public.shopping_items where house_id = target_house_id;
  delete from public.bill_shares
  where bill_id in (select id from public.bills where house_id = target_house_id);
  delete from public.bills where house_id = target_house_id;
  delete from public.tasks where house_id = target_house_id;
  delete from public.vault_custom_fields where house_id = target_house_id;
  update public.house_wifi set name = '', password = '' where house_id = target_house_id;
end;
$$;
