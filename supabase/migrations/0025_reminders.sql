-- Google Calendar-style reminders: any bill/task can have multiple
-- reminders, each with its own channel (email, push, or both), how many
-- days before the due date, and what time of day to send at.
create table public.bill_reminders (
  id uuid primary key default gen_random_uuid(),
  bill_id uuid not null references public.bills (id) on delete cascade,
  channel text not null default 'email' check (channel in ('email', 'push', 'both')),
  days_before integer not null default 0,
  time_of_day time not null default '08:00',
  created_at timestamptz not null default now()
);

alter table public.bill_reminders enable row level security;

create policy "House members can view bill reminders"
on public.bill_reminders for select
to authenticated
using (
  exists (
    select 1 from public.bills
    where bills.id = bill_reminders.bill_id
      and public.is_house_member(bills.house_id)
  )
);

create policy "House members can manage bill reminders"
on public.bill_reminders for all
to authenticated
using (
  exists (
    select 1 from public.bills
    where bills.id = bill_reminders.bill_id
      and public.is_house_member(bills.house_id)
  )
)
with check (
  exists (
    select 1 from public.bills
    where bills.id = bill_reminders.bill_id
      and public.is_house_member(bills.house_id)
  )
);

create table public.task_reminders (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks (id) on delete cascade,
  channel text not null default 'email' check (channel in ('email', 'push', 'both')),
  days_before integer not null default 0,
  time_of_day time not null default '08:00',
  created_at timestamptz not null default now()
);

alter table public.task_reminders enable row level security;

create policy "House members can view task reminders"
on public.task_reminders for select
to authenticated
using (
  exists (
    select 1 from public.tasks
    where tasks.id = task_reminders.task_id
      and public.is_house_member(tasks.house_id)
  )
);

create policy "House members can manage task reminders"
on public.task_reminders for all
to authenticated
using (
  exists (
    select 1 from public.tasks
    where tasks.id = task_reminders.task_id
      and public.is_house_member(tasks.house_id)
  )
)
with check (
  exists (
    select 1 from public.tasks
    where tasks.id = task_reminders.task_id
      and public.is_house_member(tasks.house_id)
  )
);

-- Migrate existing simple notify/notify_time tasks into the new model,
-- then drop the columns they replace.
insert into public.task_reminders (task_id, channel, days_before, time_of_day)
select id, 'email', 0, coalesce(notify_time, '08:00')
from public.tasks
where notify = true;

alter table public.tasks drop column notify;
alter table public.tasks drop column notify_time;

-- Device push tokens, one row per (user, device) — a user can be logged
-- in on more than one phone.
create table public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  token text not null unique,
  platform text not null check (platform in ('ios', 'android')),
  created_at timestamptz not null default now()
);

alter table public.push_tokens enable row level security;

create policy "Users can manage their own push tokens"
on public.push_tokens for all
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

alter publication supabase_realtime add table public.bill_reminders;
alter publication supabase_realtime add table public.task_reminders;
