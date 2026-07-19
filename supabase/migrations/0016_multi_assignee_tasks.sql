-- Let a task have more than one assignee. Replaces the single assignee_id
-- column with a join table (empty set = "Todos"/general, same meaning as
-- assignee_id being null before).

create table public.task_assignees (
  task_id uuid not null references public.tasks (id) on delete cascade,
  user_id uuid not null references public.profiles (id),
  primary key (task_id, user_id)
);

alter table public.task_assignees enable row level security;

create policy "House members can view task assignees"
on public.task_assignees for select
to authenticated
using (
  exists (
    select 1 from public.tasks
    where tasks.id = task_assignees.task_id
      and public.is_house_member(tasks.house_id)
  )
);

create policy "House members can manage task assignees"
on public.task_assignees for all
to authenticated
using (
  exists (
    select 1 from public.tasks
    where tasks.id = task_assignees.task_id
      and public.is_house_member(tasks.house_id)
  )
);

insert into public.task_assignees (task_id, user_id)
select id, assignee_id from public.tasks where assignee_id is not null
on conflict do nothing;

alter table public.tasks drop column assignee_id;

alter publication supabase_realtime add table public.task_assignees;
