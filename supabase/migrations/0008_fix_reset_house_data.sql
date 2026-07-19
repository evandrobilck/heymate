-- Fix: reset_house_data referenced member_payments, which was dropped back
-- in 0005 when PayID/bank details moved onto profiles. Redefine without it.
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

  delete from public.bill_shares
  where bill_id in (select id from public.bills where house_id = target_house_id);
  delete from public.bills where house_id = target_house_id;
  delete from public.tasks where house_id = target_house_id;
  delete from public.shopping_items where house_id = target_house_id;
  delete from public.vault_custom_fields where house_id = target_house_id;
  update public.house_wifi set name = '', password = '' where house_id = target_house_id;
end;
$$;
