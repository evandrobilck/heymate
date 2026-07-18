-- Bills (Contas)
create table public.bills (
  id uuid primary key default gen_random_uuid(),
  house_id uuid not null references public.houses (id) on delete cascade,
  title text not null,
  category text not null,
  total_amount numeric not null,
  due_date date not null,
  recurrence text not null default 'none',
  split_type text not null default 'equal',
  source text,
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now()
);

alter table public.bills enable row level security;

create policy "House members can view bills"
on public.bills for select
to authenticated
using (public.is_house_member(house_id));

create policy "House members can create bills"
on public.bills for insert
to authenticated
with check (public.is_house_member(house_id) and created_by = auth.uid());

-- Bill shares (per-participant split)
create table public.bill_shares (
  id uuid primary key default gen_random_uuid(),
  bill_id uuid not null references public.bills (id) on delete cascade,
  user_id uuid not null references public.profiles (id),
  amount numeric not null,
  percentage numeric,
  paid boolean not null default false,
  paid_at date,
  unique (bill_id, user_id)
);

alter table public.bill_shares enable row level security;

create policy "House members can view bill shares"
on public.bill_shares for select
to authenticated
using (
  exists (
    select 1 from public.bills
    where bills.id = bill_shares.bill_id
      and public.is_house_member(bills.house_id)
  )
);

create policy "Self or admin can update a bill share"
on public.bill_shares for update
to authenticated
using (
  user_id = auth.uid()
  or exists (
    select 1 from public.bills
    join public.house_members hm on hm.house_id = bills.house_id
    where bills.id = bill_shares.bill_id
      and hm.user_id = auth.uid()
      and hm.role = 'admin'
      and hm.left_at is null
  )
);

-- Atomically create a bill with all of its participant shares.
create function public.create_bill(
  p_house_id uuid,
  p_title text,
  p_category text,
  p_total_amount numeric,
  p_due_date date,
  p_recurrence text,
  p_split_type text,
  p_source text,
  p_shares jsonb
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

  insert into public.bills (house_id, title, category, total_amount, due_date, recurrence, split_type, source, created_by)
  values (p_house_id, p_title, p_category, p_total_amount, p_due_date, p_recurrence, p_split_type, p_source, auth.uid())
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

-- Tasks (Tarefas)
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  house_id uuid not null references public.houses (id) on delete cascade,
  title text not null,
  assignee_id uuid references public.profiles (id),
  recurrence text not null default 'none',
  due_date date,
  notify boolean not null default false,
  completed boolean not null default false,
  completed_by uuid references public.profiles (id),
  completed_at date,
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now()
);

alter table public.tasks enable row level security;

create policy "House members can view tasks"
on public.tasks for select
to authenticated
using (public.is_house_member(house_id));

create policy "House members can create tasks"
on public.tasks for insert
to authenticated
with check (public.is_house_member(house_id) and created_by = auth.uid());

create policy "Any house member can update a task"
on public.tasks for update
to authenticated
using (public.is_house_member(house_id));

-- Shopping list (Compras)
create table public.shopping_items (
  id uuid primary key default gen_random_uuid(),
  house_id uuid not null references public.houses (id) on delete cascade,
  name text not null,
  added_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  bought boolean not null default false,
  bought_by uuid references public.profiles (id),
  bought_at date,
  price numeric,
  bill_id uuid references public.bills (id)
);

alter table public.shopping_items enable row level security;

create policy "House members can view shopping items"
on public.shopping_items for select
to authenticated
using (public.is_house_member(house_id));

create policy "House members can add shopping items"
on public.shopping_items for insert
to authenticated
with check (public.is_house_member(house_id) and added_by = auth.uid());

create policy "Any house member can update a shopping item"
on public.shopping_items for update
to authenticated
using (public.is_house_member(house_id));

-- Mark a shopping item as bought: creates the linked bill (equal split, buyer pre-paid) atomically.
create function public.mark_item_bought(
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
    insert into public.bill_shares (bill_id, user_id, amount, paid, paid_at)
    values (
      new_bill.id,
      participant.user_id,
      share_amount,
      participant.user_id = auth.uid(),
      case when participant.user_id = auth.uid() then current_date else null end
    );
  end loop;

  update public.shopping_items
  set bought = true, bought_by = auth.uid(), bought_at = current_date, price = p_price, bill_id = new_bill.id
  where id = p_item_id
  returning * into updated_item;

  return updated_item;
end;
$$;

-- House vault: Wi-Fi
create table public.house_wifi (
  house_id uuid primary key references public.houses (id) on delete cascade,
  name text not null default '',
  password text not null default ''
);

alter table public.house_wifi enable row level security;

create policy "House members can view wifi"
on public.house_wifi for select
to authenticated
using (public.is_house_member(house_id));

create policy "Admins can manage wifi"
on public.house_wifi for all
to authenticated
using (
  exists (
    select 1 from public.house_members
    where house_id = house_wifi.house_id
      and user_id = auth.uid()
      and role = 'admin'
      and left_at is null
  )
);

-- House vault: per-member payment info
create table public.member_payments (
  house_id uuid not null references public.houses (id) on delete cascade,
  user_id uuid not null references public.profiles (id),
  pay_id text not null default '',
  bank_details text not null default '',
  primary key (house_id, user_id)
);

alter table public.member_payments enable row level security;

create policy "House members can view payment info"
on public.member_payments for select
to authenticated
using (public.is_house_member(house_id));

create policy "Self or admin can manage payment info"
on public.member_payments for all
to authenticated
using (
  user_id = auth.uid()
  or exists (
    select 1 from public.house_members
    where house_id = member_payments.house_id
      and user_id = auth.uid()
      and role = 'admin'
      and left_at is null
  )
);

-- House vault: free-form custom fields
create table public.vault_custom_fields (
  id uuid primary key default gen_random_uuid(),
  house_id uuid not null references public.houses (id) on delete cascade,
  label text not null,
  value text not null,
  created_at timestamptz not null default now()
);

alter table public.vault_custom_fields enable row level security;

create policy "House members can view custom fields"
on public.vault_custom_fields for select
to authenticated
using (public.is_house_member(house_id));

create policy "Admins can manage custom fields"
on public.vault_custom_fields for all
to authenticated
using (
  exists (
    select 1 from public.house_members
    where house_id = vault_custom_fields.house_id
      and user_id = auth.uid()
      and role = 'admin'
      and left_at is null
  )
);

-- Realtime: live updates for shared data across roommates.
alter publication supabase_realtime add table public.bills;
alter publication supabase_realtime add table public.bill_shares;
alter publication supabase_realtime add table public.tasks;
alter publication supabase_realtime add table public.shopping_items;
alter publication supabase_realtime add table public.house_wifi;
alter publication supabase_realtime add table public.member_payments;
alter publication supabase_realtime add table public.vault_custom_fields;
