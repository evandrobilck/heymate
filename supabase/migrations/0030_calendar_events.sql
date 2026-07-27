-- Custom calendar events: a house member marks something on a date that
-- isn't a bill or task — a shared dinner, a friend visiting, etc.
create table public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  house_id uuid not null references public.houses (id) on delete cascade,
  title text not null,
  event_date date not null,
  event_time time,
  location text,
  notes text,
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now()
);

alter table public.calendar_events enable row level security;

create policy "House members can view calendar events"
on public.calendar_events for select
to authenticated
using (public.is_house_member(house_id));

create policy "House members can manage calendar events"
on public.calendar_events for all
to authenticated
using (public.is_house_member(house_id))
with check (public.is_house_member(house_id));

alter publication supabase_realtime add table public.calendar_events;
