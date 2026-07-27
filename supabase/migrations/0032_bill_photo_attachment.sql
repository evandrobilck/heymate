-- Let any house member attach a photo of the actual bill/invoice to a
-- bill record (not a per-person payment receipt — those stay off-app,
-- see the Gastos/BillCard discussion). One photo per bill, same shape as
-- maintenance_requests.photo_url.
alter table public.bills add column photo_url text;

-- Narrow, security-definer path to touch just photo_url, since there's no
-- general-purpose "house members can update any bill" policy (bill edits
-- otherwise go through update_bill, gated to creator/admin) — same pattern
-- as set_bill_recurrence_until in migration 0018. Any house member (not
-- just the creator/admin) can attach/replace the photo.
create or replace function public.set_bill_photo(p_bill_id uuid, p_photo_url text)
returns public.bills
language plpgsql
security definer set search_path = public
as $$
declare
  updated_bill public.bills;
  target_house_id uuid;
begin
  select house_id into target_house_id from public.bills where id = p_bill_id;

  if target_house_id is null then
    raise exception 'Bill not found';
  end if;

  if not public.is_house_member(target_house_id) then
    raise exception 'Not authorized';
  end if;

  update public.bills set photo_url = p_photo_url where id = p_bill_id
  returning * into updated_bill;

  return updated_bill;
end;
$$;

-- Storage bucket for bill photos, one folder per house_id — same shape as
-- maintenance-photos in migration 0024.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('bill-photos', 'bill-photos', true, 5242880, array['image/png', 'image/jpeg', 'image/webp', 'image/gif'])
on conflict (id) do nothing;

create policy "Bill photos are publicly accessible"
on storage.objects for select
using (bucket_id = 'bill-photos');

create policy "House members can upload bill photos"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'bill-photos'
  and public.is_house_member((storage.foldername(name))[1]::uuid)
);

create policy "House members can delete bill photos"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'bill-photos'
  and public.is_house_member((storage.foldername(name))[1]::uuid)
);
