-- REPLICA IDENTITY FULL so DELETE events include house_id (needed for the
-- postgres_changes `filter: house_id=eq.X` subscriptions in the frontend to
-- fire when rows are bulk-deleted by reset_house_data / delete_house below).
alter table public.house_members replica identity full;
alter table public.bills replica identity full;
alter table public.tasks replica identity full;
alter table public.shopping_items replica identity full;
alter table public.vault_custom_fields replica identity full;

-- Wipe all bills/tasks/shopping/vault data for a house, keeping the house
-- and its members intact. Admin-only.
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
  delete from public.member_payments where house_id = target_house_id;
  update public.house_wifi set name = '', password = '' where house_id = target_house_id;
end;
$$;

-- Permanently delete a house and everything in it (members, bills, tasks,
-- shopping, vault all cascade via FK). Admin-only.
create or replace function public.delete_house(target_house_id uuid)
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
    raise exception 'Only an admin can delete this house';
  end if;

  delete from public.houses where id = target_house_id;
end;
$$;
