-- Let a task be marked done by more than one person. Replaces the single
-- completed_by column with a join table.

create table public.task_completers (
  task_id uuid not null references public.tasks (id) on delete cascade,
  user_id uuid not null references public.profiles (id),
  primary key (task_id, user_id)
);

alter table public.task_completers enable row level security;

create policy "House members can view task completers"
on public.task_completers for select
to authenticated
using (
  exists (
    select 1 from public.tasks
    where tasks.id = task_completers.task_id
      and public.is_house_member(tasks.house_id)
  )
);

create policy "House members can manage task completers"
on public.task_completers for all
to authenticated
using (
  exists (
    select 1 from public.tasks
    where tasks.id = task_completers.task_id
      and public.is_house_member(tasks.house_id)
  )
);

insert into public.task_completers (task_id, user_id)
select id, completed_by from public.tasks where completed = true and completed_by is not null
on conflict do nothing;

alter table public.tasks drop column completed_by;

alter publication supabase_realtime add table public.task_completers;
