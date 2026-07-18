-- Personal profile fields: contact info, payment info (now unified here instead
-- of per-house), and an emergency contact.
alter table public.profiles
  add column phone text,
  add column avatar_url text,
  add column pay_id text,
  add column bank_details text,
  add column emergency_contact_name text,
  add column emergency_contact_phone text;

-- Now that profiles carry personal/financial fields, tighten who can read them:
-- only yourself, or someone you currently or previously shared a house with
-- (kept broad enough to still show past roommates' names in history).
create function public.shares_house_with(target_user_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1
    from public.house_members hm1
    join public.house_members hm2 on hm1.house_id = hm2.house_id
    where hm1.user_id = auth.uid()
      and hm2.user_id = target_user_id
  );
$$;

drop policy "Profiles are viewable by authenticated users" on public.profiles;

create policy "Profiles viewable by self or housemates"
on public.profiles for select
to authenticated
using (auth.uid() = id or public.shares_house_with(id));

-- Retire the per-house payment table: PayID/bank details now live on the profile.
drop table if exists public.member_payments;

-- Storage bucket for avatar photos.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/png', 'image/jpeg', 'image/webp', 'image/gif'])
on conflict (id) do nothing;

create policy "Avatar images are publicly accessible"
on storage.objects for select
using (bucket_id = 'avatars');

create policy "Users can upload their own avatar"
on storage.objects for insert
to authenticated
with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users can update their own avatar"
on storage.objects for update
to authenticated
using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users can delete their own avatar"
on storage.objects for delete
to authenticated
using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- Live-update profiles (e.g. a roommate's PayID or photo changing).
alter publication supabase_realtime add table public.profiles;
