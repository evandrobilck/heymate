-- House Settings: rename house, house photo, and per-house custom categories
-- for bills and shopping purchases.

alter table public.houses add column photo_url text;

create policy "Admins can update house"
on public.houses for update
to authenticated
using (
  exists (
    select 1 from public.house_members
    where house_id = houses.id
      and user_id = auth.uid()
      and role = 'admin'
      and left_at is null
  )
);

-- Custom categories (in addition to the built-in ones), admin-managed.
create table public.bill_categories (
  id uuid primary key default gen_random_uuid(),
  house_id uuid not null references public.houses (id) on delete cascade,
  label text not null,
  created_at timestamptz not null default now()
);

alter table public.bill_categories enable row level security;

create policy "House members can view bill categories"
on public.bill_categories for select
to authenticated
using (public.is_house_member(house_id));

create policy "Admins can manage bill categories"
on public.bill_categories for all
to authenticated
using (
  exists (
    select 1 from public.house_members
    where house_id = bill_categories.house_id
      and user_id = auth.uid()
      and role = 'admin'
      and left_at is null
  )
);

create table public.shopping_categories (
  id uuid primary key default gen_random_uuid(),
  house_id uuid not null references public.houses (id) on delete cascade,
  label text not null,
  created_at timestamptz not null default now()
);

alter table public.shopping_categories enable row level security;

create policy "House members can view shopping categories"
on public.shopping_categories for select
to authenticated
using (public.is_house_member(house_id));

create policy "Admins can manage shopping categories"
on public.shopping_categories for all
to authenticated
using (
  exists (
    select 1 from public.house_members
    where house_id = shopping_categories.house_id
      and user_id = auth.uid()
      and role = 'admin'
      and left_at is null
  )
);

-- Storage bucket for house photos, one folder per house_id.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('house-photos', 'house-photos', true, 5242880, array['image/png', 'image/jpeg', 'image/webp', 'image/gif'])
on conflict (id) do nothing;

create policy "House photos are publicly accessible"
on storage.objects for select
using (bucket_id = 'house-photos');

create policy "House admins can upload house photo"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'house-photos'
  and exists (
    select 1 from public.house_members
    where house_id = (storage.foldername(name))[1]::uuid
      and user_id = auth.uid()
      and role = 'admin'
      and left_at is null
  )
);

create policy "House admins can update house photo"
on storage.objects for update
to authenticated
using (
  bucket_id = 'house-photos'
  and exists (
    select 1 from public.house_members
    where house_id = (storage.foldername(name))[1]::uuid
      and user_id = auth.uid()
      and role = 'admin'
      and left_at is null
  )
);

create policy "House admins can delete house photo"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'house-photos'
  and exists (
    select 1 from public.house_members
    where house_id = (storage.foldername(name))[1]::uuid
      and user_id = auth.uid()
      and role = 'admin'
      and left_at is null
  )
);

alter publication supabase_realtime add table public.houses;
alter publication supabase_realtime add table public.bill_categories;
alter publication supabase_realtime add table public.shopping_categories;
