-- Recurring bills store one fixed total_amount, but real-world utility
-- bills (water, power, gas) change every cycle. This tracks the most
-- recent occurrence date whose amount was reviewed, so the client can
-- nudge "did this month's amount change?" once per cycle instead of
-- nagging on every visit — without keeping a separate amount per month.
alter table public.bills add column amount_confirmed_through date;

-- Editing a bill (whatever changed) counts as reviewing its current
-- amount, so bump the marker to today whenever update_bill runs.
create or replace function public.update_bill(
  p_bill_id uuid,
  p_title text,
  p_category text,
  p_total_amount numeric,
  p_due_date date,
  p_recurrence text,
  p_split_type text,
  p_shares jsonb
)
returns public.bills
language plpgsql
security definer set search_path = public
as $$
declare
  updated_bill public.bills;
  target_house_id uuid;
  share jsonb;
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
    raise exception 'Only the bill creator or an admin can edit this bill';
  end if;

  update public.bills
  set title = p_title,
      category = p_category,
      total_amount = p_total_amount,
      due_date = p_due_date,
      recurrence = p_recurrence,
      split_type = p_split_type,
      amount_confirmed_through = current_date
  where id = p_bill_id
  returning * into updated_bill;

  delete from public.bill_shares where bill_id = p_bill_id;

  for share in select * from jsonb_array_elements(p_shares)
  loop
    insert into public.bill_shares (bill_id, user_id, amount, percentage, paid, paid_at)
    values (
      p_bill_id,
      (share ->> 'user_id')::uuid,
      (share ->> 'amount')::numeric,
      nullif(share ->> 'percentage', '')::numeric,
      coalesce((share ->> 'paid')::boolean, false),
      nullif(share ->> 'paid_at', '')::date
    );
  end loop;

  return updated_bill;
end;
$$;

-- Lets any house member dismiss the nudge ("still the same amount") without
-- opening the edit form. Narrow, security-definer path — same reasoning as
-- set_bill_photo: this only touches a low-risk review marker, not the
-- amount/shares themselves, so it doesn't need creator/admin gating.
create or replace function public.confirm_bill_amount(p_bill_id uuid)
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

  update public.bills set amount_confirmed_through = current_date where id = p_bill_id
  returning * into updated_bill;

  return updated_bill;
end;
$$;
