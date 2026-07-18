-- Profiles: one row per authenticated user, extends auth.users with a display name.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Profiles are viewable by authenticated users"
on public.profiles for select
to authenticated
using (true);

create policy "Users can update their own profile"
on public.profiles for update
to authenticated
using (auth.uid() = id);

-- Auto-create a profile row whenever a new user signs up.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', new.email));
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Houses
create table public.houses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invite_code text not null unique,
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now()
);

alter table public.houses enable row level security;

-- House members: preserves history (join date + leave date) per app rules.
create table public.house_members (
  id uuid primary key default gen_random_uuid(),
  house_id uuid not null references public.houses (id) on delete cascade,
  user_id uuid not null references public.profiles (id),
  role text not null default 'member' check (role in ('admin', 'member')),
  joined_at date not null default current_date,
  left_at date
);

alter table public.house_members enable row level security;

-- Security-definer helper to avoid recursive RLS checks.
create function public.is_house_member(target_house_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.house_members
    where house_id = target_house_id
      and user_id = auth.uid()
      and left_at is null
  );
$$;

create policy "Members can view their house"
on public.houses for select
to authenticated
using (public.is_house_member(id));

create policy "Members can view house membership"
on public.house_members for select
to authenticated
using (public.is_house_member(house_id));

create policy "Admins can update membership"
on public.house_members for update
to authenticated
using (
  public.is_house_member(house_id)
  and exists (
    select 1 from public.house_members hm
    where hm.house_id = house_members.house_id
      and hm.user_id = auth.uid()
      and hm.role = 'admin'
      and hm.left_at is null
  )
);

-- Atomically create a house and add the creator as its admin.
create function public.create_house(house_name text)
returns public.houses
language plpgsql
security definer set search_path = public
as $$
declare
  new_house public.houses;
  new_code text;
begin
  new_code := upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 6));

  insert into public.houses (name, invite_code, created_by)
  values (house_name, new_code, auth.uid())
  returning * into new_house;

  insert into public.house_members (house_id, user_id, role)
  values (new_house.id, auth.uid(), 'admin');

  return new_house;
end;
$$;

-- Join an existing house using its invite code.
create function public.join_house(code text)
returns public.houses
language plpgsql
security definer set search_path = public
as $$
declare
  target_house public.houses;
begin
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

-- Regenerate a house's invite code (admin only, enforced at the app layer via RLS below).
create function public.regenerate_invite_code(target_house_id uuid)
returns public.houses
language plpgsql
security definer set search_path = public
as $$
declare
  updated_house public.houses;
  new_code text;
begin
  if not exists (
    select 1 from public.house_members
    where house_id = target_house_id
      and user_id = auth.uid()
      and role = 'admin'
      and left_at is null
  ) then
    raise exception 'Only the house admin can regenerate the invite code';
  end if;

  new_code := upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 6));

  update public.houses set invite_code = new_code
  where id = target_house_id
  returning * into updated_house;

  return updated_house;
end;
$$;
