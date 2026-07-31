-- 0035's "bill_shares" SELECT policy referenced bill_shares itself (via a
-- correlated self_share subquery) to check participation. Postgres RLS
-- re-applies a table's own policy to any query against that table,
-- including one issued from inside its own policy — so that self-reference
-- caused "infinite recursion detected in policy for relation bill_shares",
-- which made the whole bills query fail and every bill (not just private
-- ones) disappear from the app.
--
-- Fix: move the participation check into a security-definer function
-- (same pattern as is_house_member), which runs as the function owner and
-- bypasses RLS on the query inside it — breaking the cycle.
create function public.is_bill_participant(p_bill_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.bill_shares
    where bill_id = p_bill_id
      and user_id = auth.uid()
  );
$$;

drop policy "House members can view bills" on public.bills;

create policy "House members can view bills"
on public.bills for select
to authenticated
using (
  public.is_house_member(house_id)
  and (
    not is_private
    or created_by = auth.uid()
    or public.is_bill_participant(id)
  )
);

drop policy "House members can view bill shares" on public.bill_shares;

create policy "House members can view bill shares"
on public.bill_shares for select
to authenticated
using (
  exists (
    select 1 from public.bills
    where bills.id = bill_shares.bill_id
      and public.is_house_member(bills.house_id)
      and (
        not bills.is_private
        or bills.created_by = auth.uid()
        or public.is_bill_participant(bills.id)
      )
  )
);
