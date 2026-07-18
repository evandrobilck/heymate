-- Let a member leave their current house. If they were the admin and other
-- active members remain, hand admin rights to the longest-standing one first.
create function public.leave_house()
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  my_house_id uuid;
  am_admin boolean;
  other_admin_candidate uuid;
begin
  select house_id into my_house_id
  from public.house_members
  where user_id = auth.uid() and left_at is null
  limit 1;

  if my_house_id is null then
    raise exception 'You are not currently in a house';
  end if;

  select role = 'admin' into am_admin
  from public.house_members
  where house_id = my_house_id and user_id = auth.uid() and left_at is null;

  if am_admin then
    select user_id into other_admin_candidate
    from public.house_members
    where house_id = my_house_id
      and user_id != auth.uid()
      and left_at is null
    order by joined_at asc
    limit 1;

    if other_admin_candidate is not null then
      update public.house_members
      set role = 'admin'
      where house_id = my_house_id and user_id = other_admin_candidate;
    end if;
  end if;

  update public.house_members
  set left_at = current_date
  where house_id = my_house_id and user_id = auth.uid();
end;
$$;
