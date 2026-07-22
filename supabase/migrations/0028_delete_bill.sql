-- There was previously no way to actually delete a bill (only cosmetic
-- occurrence-hiding for recurring series via deleteOccurrence /
-- deleteOccurrenceAndFollowing). This adds a real hard-delete for the
-- non-recurring case, gated the same way as update_bill (creator or admin).
-- shopping_items.bill_id has no cascade, so any linked item is unlinked
-- rather than left dangling on a foreign key violation.
create or replace function public.delete_bill(p_bill_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  target_house_id uuid;
begin
  select house_id into target_house_id from public.bills where id = p_bill_id;

  if target_house_id is null then
    raise exception 'Bill not found';
  end if;

  if not exists (
    select 1 from public.bills
    where id = p_bill_id
      and (
        created_by = auth.uid()
        or exists (
          select 1 from public.house_members
          where house_id = target_house_id
            and user_id = auth.uid()
            and role = 'admin'
            and left_at is null
        )
      )
  ) then
    raise exception 'Only the bill creator or an admin can delete this bill';
  end if;

  update public.shopping_items set bill_id = null where bill_id = p_bill_id;

  delete from public.bills where id = p_bill_id;
end;
$$;
