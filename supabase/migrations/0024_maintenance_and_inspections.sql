-- Maintenance requests: any house member reports an issue (with an
-- optional photo), any member can mark it resolved once it's fixed.
create table public.maintenance_requests (
  id uuid primary key default gen_random_uuid(),
  house_id uuid not null references public.houses (id) on delete cascade,
  title text not null,
  description text,
  photo_url text,
  occurred_on date,
  status text not null default 'open' check (status in ('open', 'resolved')),
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  resolved_by uuid references public.profiles (id),
  resolved_at timestamptz
);

alter table public.maintenance_requests enable row level security;

create policy "House members can view maintenance requests"
on public.maintenance_requests for select
to authenticated
using (public.is_house_member(house_id));

create policy "House members can create maintenance requests"
on public.maintenance_requests for insert
to authenticated
with check (public.is_house_member(house_id) and created_by = auth.uid());

create policy "House members can update maintenance requests"
on public.maintenance_requests for update
to authenticated
using (public.is_house_member(house_id));

create policy "House members can delete maintenance requests"
on public.maintenance_requests for delete
to authenticated
using (public.is_house_member(house_id));

-- Storage bucket for maintenance photos, one folder per house_id — same
-- shape as house-photos in migration 0012.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('maintenance-photos', 'maintenance-photos', true, 5242880, array['image/png', 'image/jpeg', 'image/webp', 'image/gif'])
on conflict (id) do nothing;

create policy "Maintenance photos are publicly accessible"
on storage.objects for select
using (bucket_id = 'maintenance-photos');

create policy "House members can upload maintenance photos"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'maintenance-photos'
  and public.is_house_member((storage.foldername(name))[1]::uuid)
);

create policy "House members can delete maintenance photos"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'maintenance-photos'
  and public.is_house_member((storage.foldername(name))[1]::uuid)
);

-- Inspections: a scheduled visit from the landlord/agency, with a
-- prep checklist attached.
create table public.inspections (
  id uuid primary key default gen_random_uuid(),
  house_id uuid not null references public.houses (id) on delete cascade,
  scheduled_date date not null,
  notes text,
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now()
);

alter table public.inspections enable row level security;

create policy "House members can view inspections"
on public.inspections for select
to authenticated
using (public.is_house_member(house_id));

create policy "House members can manage inspections"
on public.inspections for all
to authenticated
using (public.is_house_member(house_id))
with check (public.is_house_member(house_id));

create table public.inspection_tasks (
  id uuid primary key default gen_random_uuid(),
  inspection_id uuid not null references public.inspections (id) on delete cascade,
  title text not null,
  completed boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.inspection_tasks enable row level security;

create policy "House members can view inspection tasks"
on public.inspection_tasks for select
to authenticated
using (
  exists (
    select 1 from public.inspections
    where inspections.id = inspection_tasks.inspection_id
      and public.is_house_member(inspections.house_id)
  )
);

create policy "House members can manage inspection tasks"
on public.inspection_tasks for all
to authenticated
using (
  exists (
    select 1 from public.inspections
    where inspections.id = inspection_tasks.inspection_id
      and public.is_house_member(inspections.house_id)
  )
)
with check (
  exists (
    select 1 from public.inspections
    where inspections.id = inspection_tasks.inspection_id
      and public.is_house_member(inspections.house_id)
  )
);

alter publication supabase_realtime add table public.maintenance_requests;
alter publication supabase_realtime add table public.inspections;
alter publication supabase_realtime add table public.inspection_tasks;
