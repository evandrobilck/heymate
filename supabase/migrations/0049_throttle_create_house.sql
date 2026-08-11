-- Security hardening follow-up to 0048: create_house had no rate limiting
-- either — an authenticated account (real or throwaway) could call it in a
-- tight loop and flood the database with houses, no cap at all. Mirrors
-- join_house's own throttle: 10 houses per user per hour is far above any
-- real usage pattern but stops a scripted flood.
create table public.create_house_attempts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  attempt_count int not null default 0,
  window_started_at timestamptz not null default now()
);
alter table public.create_house_attempts enable row level security;
-- No policies: only create_house (security definer) touches this table.

create or replace function public.create_house(house_name text)
returns public.houses
language plpgsql
security definer set search_path = public
as $$
declare
  new_house public.houses;
  new_code text;
  attempts public.create_house_attempts;
begin
  select * into attempts from public.create_house_attempts where user_id = auth.uid();

  if attempts is null then
    insert into public.create_house_attempts (user_id) values (auth.uid());
  elsif attempts.window_started_at < now() - interval '1 hour' then
    update public.create_house_attempts set attempt_count = 0, window_started_at = now() where user_id = auth.uid();
  elsif attempts.attempt_count >= 10 then
    raise exception 'Too many houses created. Try again later.';
  end if;

  update public.create_house_attempts set attempt_count = attempt_count + 1 where user_id = auth.uid();

  new_code := upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 6));

  insert into public.houses (name, invite_code, created_by)
  values (house_name, new_code, auth.uid())
  returning * into new_house;

  insert into public.house_members (house_id, user_id, role)
  values (new_house.id, auth.uid(), 'admin');

  return new_house;
end;
$$;
