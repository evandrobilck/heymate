-- House address (shown on the Casa page), currency, hidden built-in
-- categories, and admin-transfer.

alter table public.houses add column address text;
alter table public.houses add column currency text not null default 'AUD';

-- Lets admins hide built-in categories they don't use, without deleting them.
create table public.hidden_bill_categories (
  house_id uuid not null references public.houses (id) on delete cascade,
  category_id text not null,
  primary key (house_id, category_id)
);

alter table public.hidden_bill_categories enable row level security;

create policy "House members can view hidden categories"
on public.hidden_bill_categories for select
to authenticated
using (public.is_house_member(house_id));

create policy "Admins can manage hidden categories"
on public.hidden_bill_categories for all
to authenticated
using (
  exists (
    select 1 from public.house_members
    where house_id = hidden_bill_categories.house_id
      and user_id = auth.uid()
      and role = 'admin'
      and left_at is null
  )
);

-- Hand admin rights to another active member and step down.
create or replace function public.transfer_admin(target_house_id uuid, new_admin_id uuid)
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
    raise exception 'Only an admin can transfer admin rights';
  end if;

  if not exists (
    select 1 from public.house_members
    where house_id = target_house_id
      and user_id = new_admin_id
      and left_at is null
  ) then
    raise exception 'Target must be an active house member';
  end if;

  update public.house_members set role = 'admin' where house_id = target_house_id and user_id = new_admin_id;
  update public.house_members set role = 'member' where house_id = target_house_id and user_id = auth.uid();
end;
$$;

alter publication supabase_realtime add table public.hidden_bill_categories;
