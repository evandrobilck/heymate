-- Security audit finding: join_house had no rate limiting. Invite codes are
-- only 6 alphanumeric characters (~2 billion combinations, see create_house
-- in 0001_auth_and_houses.sql), so an unthrottled script could brute-force
-- its way into other people's houses and see their bills/tasks/shopping/vault
-- data. This throttles to 5 attempts per user per 15-minute window, self
-- contained (no external rate-limit infra needed).
create table public.join_house_attempts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  attempt_count int not null default 0,
  window_started_at timestamptz not null default now()
);
alter table public.join_house_attempts enable row level security;
-- No policies: only join_house (security definer) touches this table.

create or replace function public.join_house(code text)
returns public.houses
language plpgsql
security definer set search_path = public
as $$
declare
  target_house public.houses;
  attempts public.join_house_attempts;
begin
  select * into attempts from public.join_house_attempts where user_id = auth.uid();

  if attempts is null then
    insert into public.join_house_attempts (user_id) values (auth.uid());
  elsif attempts.window_started_at < now() - interval '15 minutes' then
    update public.join_house_attempts set attempt_count = 0, window_started_at = now() where user_id = auth.uid();
  elsif attempts.attempt_count >= 5 then
    raise exception 'Too many attempts. Try again later.';
  end if;

  update public.join_house_attempts set attempt_count = attempt_count + 1 where user_id = auth.uid();

  select * into target_house from public.houses where invite_code = upper(code);

  if target_house is null then
    raise exception 'Invalid invite code';
  end if;

  insert into public.house_members (house_id, user_id, role)
  values (target_house.id, auth.uid(), 'member')
  on conflict do nothing;

  return target_house;
end;
$$;
