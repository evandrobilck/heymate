-- Reminders for custom calendar events, same shape as bill_reminders/
-- task_reminders (migration 0025). Events have no per-user assignment, so
-- when a reminder fires it goes to every active member of the house.
create table public.event_reminders (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.calendar_events (id) on delete cascade,
  channel text not null default 'email' check (channel in ('email', 'push', 'both')),
  days_before integer not null default 0,
  time_of_day time not null default '08:00',
  created_at timestamptz not null default now()
);

alter table public.event_reminders enable row level security;

create policy "House members can view event reminders"
on public.event_reminders for select
to authenticated
using (
  exists (
    select 1 from public.calendar_events
    where calendar_events.id = event_reminders.event_id
      and public.is_house_member(calendar_events.house_id)
  )
);

create policy "House members can manage event reminders"
on public.event_reminders for all
to authenticated
using (
  exists (
    select 1 from public.calendar_events
    where calendar_events.id = event_reminders.event_id
      and public.is_house_member(calendar_events.house_id)
  )
)
with check (
  exists (
    select 1 from public.calendar_events
    where calendar_events.id = event_reminders.event_id
      and public.is_house_member(calendar_events.house_id)
  )
);

alter publication supabase_realtime add table public.event_reminders;

-- send-due-notifications' idempotency log needs to accept 'event' too. Look
-- up the auto-generated check-constraint name rather than hardcoding it
-- (same caution as migration 0026's unique-constraint rename).
do $$
declare
  constraint_name text;
begin
  select con.conname into constraint_name
  from pg_constraint con
  join pg_class rel on rel.oid = con.conrelid
  where rel.relname = 'notification_log'
    and con.contype = 'c'
    and pg_get_constraintdef(con.oid) like '%entity_type%';

  if constraint_name is not null then
    execute format('alter table public.notification_log drop constraint %I', constraint_name);
  end if;
end $$;

alter table public.notification_log add constraint notification_log_entity_type_check
  check (entity_type in ('task', 'bill', 'event'));
