-- tasks had no DELETE policy at all, so a client-side delete matched zero
-- rows under RLS and silently no-op'd (PostgREST returns success either way).
create policy "Any house member can delete a task"
on public.tasks for delete
to authenticated
using (public.is_house_member(house_id));
