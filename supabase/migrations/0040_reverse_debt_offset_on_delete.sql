-- create_bill's debt-offset (0037) reduces an existing debt when a new bill
-- is created, but delete_bill had no idea that mutation ever happened —
-- deleting the bill that triggered the offset left the paid-down old debt
-- paid down forever, even after the transaction that justified it was gone
-- (e.g. a bill created by mistake and immediately deleted).
--
-- This records each offset application (keyed by bill_id + user_id, not the
-- bill_shares row's surrogate id, so it survives update_bill's delete+
-- reinsert of shares) and reverses it precisely when its source bill is
-- deleted, instead of just adding the amount back blindly.

create table public.bill_debt_offsets (
  id uuid primary key default gen_random_uuid(),
  source_bill_id uuid not null references public.bills (id) on delete cascade,
  source_user_id uuid not null references public.profiles (id),
  target_bill_id uuid not null references public.bills (id) on delete cascade,
  target_user_id uuid not null references public.profiles (id),
  amount numeric not null,
  created_at timestamptz not null default now()
);

alter table public.bill_debt_offsets enable row level security;

create policy "House members can view debt offsets"
on public.bill_debt_offsets for select
to authenticated
using (
  exists (
    select 1 from public.bills
    where bills.id = bill_debt_offsets.source_bill_id
      and public.is_house_member(bills.house_id)
  )
);

-- Undoes every offset a bill's creation applied to other bills' shares,
-- looking each target share up by (bill_id, user_id) so it's found
-- correctly even if that share's row has been replaced since (e.g. by
-- update_bill's delete+reinsert). Called by delete_bill before it removes
-- the source bill.
create or replace function public.reverse_bill_debt_offsets(p_bill_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  offset_row record;
  target_share public.bill_shares;
  reversed_amount numeric;
begin
  for offset_row in
    select target_bill_id, target_user_id, amount
    from public.bill_debt_offsets
    where source_bill_id = p_bill_id
  loop
    select * into target_share
    from public.bill_shares
    where bill_id = offset_row.target_bill_id and user_id = offset_row.target_user_id;

    if target_share.id is not null then
      reversed_amount := greatest(target_share.paid_amount - offset_row.amount, 0);

      update public.bill_shares
      set paid_amount = reversed_amount,
          paid = reversed_amount >= target_share.amount - 0.005,
          paid_at = case when reversed_amount >= target_share.amount - 0.005 then target_share.paid_at else null end,
          settled_via = case when reversed_amount <= 0.005 then null else target_share.settled_via end
      where id = target_share.id;
    end if;
  end loop;

  delete from public.bill_debt_offsets where source_bill_id = p_bill_id;
end;
$$;

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

  perform public.reverse_bill_debt_offsets(p_bill_id);

  update public.shopping_items set bill_id = null where bill_id = p_bill_id;

  delete from public.bills where id = p_bill_id;
end;
$$;

-- create_bill now logs each offset application it makes.
create or replace function public.create_bill(
  p_house_id uuid,
  p_title text,
  p_category text,
  p_total_amount numeric,
  p_due_date date,
  p_recurrence text,
  p_split_type text,
  p_source text,
  p_shares jsonb,
  p_is_private boolean default false,
  p_apply_debt_offset boolean default false
)
returns public.bills
language plpgsql
security definer set search_path = public
as $$
declare
  new_bill public.bills;
  share jsonb;
  new_share record;
  remaining numeric;
  debt_row record;
  apply_amount numeric;
begin
  if not public.is_house_member(p_house_id) then
    raise exception 'Not a member of this house';
  end if;

  insert into public.bills (house_id, title, category, total_amount, due_date, recurrence, split_type, source, created_by, is_private)
  values (p_house_id, p_title, p_category, p_total_amount, p_due_date, p_recurrence, p_split_type, p_source, auth.uid(), coalesce(p_is_private, false))
  returning * into new_bill;

  for share in select * from jsonb_array_elements(p_shares)
  loop
    insert into public.bill_shares (bill_id, user_id, amount, percentage, paid, paid_at, paid_amount, settled_via)
    values (
      new_bill.id,
      (share ->> 'user_id')::uuid,
      (share ->> 'amount')::numeric,
      nullif(share ->> 'percentage', '')::numeric,
      coalesce((share ->> 'paid')::boolean, false),
      nullif(share ->> 'paid_at', '')::date,
      case when coalesce((share ->> 'paid')::boolean, false) then (share ->> 'amount')::numeric else 0 end,
      case when coalesce((share ->> 'paid')::boolean, false) then 'cash' else null end
    );
  end loop;

  if coalesce(p_apply_debt_offset, false) then
    for new_share in
      select bs.user_id, bs.amount
      from public.bill_shares bs
      where bs.bill_id = new_bill.id
        and bs.user_id <> auth.uid()
        and bs.paid = false
    loop
      remaining := new_share.amount;

      for debt_row in
        select bs2.id, b2.id as bill_id, (bs2.amount - bs2.paid_amount) as owed
        from public.bill_shares bs2
        join public.bills b2 on b2.id = bs2.bill_id
        where bs2.user_id = auth.uid()
          and b2.created_by = new_share.user_id
          and b2.house_id = p_house_id
          and b2.recurrence = 'none'
          and bs2.paid = false
          and bs2.amount - bs2.paid_amount > 0.005
        order by b2.due_date asc, b2.created_at asc
      loop
        exit when remaining <= 0.005;
        apply_amount := least(remaining, debt_row.owed);

        update public.bill_shares
        set paid_amount = paid_amount + apply_amount,
            paid = (paid_amount + apply_amount) >= amount - 0.005,
            paid_at = case when (paid_amount + apply_amount) >= amount - 0.005 then current_date else paid_at end,
            settled_via = 'debt_offset'
        where id = debt_row.id;

        insert into public.bill_debt_offsets (source_bill_id, source_user_id, target_bill_id, target_user_id, amount)
        values (new_bill.id, new_share.user_id, debt_row.bill_id, auth.uid(), apply_amount);

        remaining := remaining - apply_amount;
      end loop;

      if remaining < new_share.amount - 0.005 then
        update public.bill_shares
        set paid_amount = new_share.amount - remaining,
            paid = remaining <= 0.005,
            paid_at = case when remaining <= 0.005 then current_date else paid_at end,
            settled_via = 'debt_offset'
        where bill_id = new_bill.id and user_id = new_share.user_id;
      end if;
    end loop;
  end if;

  return new_bill;
end;
$$;
