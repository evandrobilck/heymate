-- 0038 introduced per-cycle payment tracking for recurring bills
-- (bill_occurrence_payments), but any recurring bill that already had a
-- participant marked paid under the old single-flag system (bill_shares)
-- had no corresponding occurrence row — so the new occurrence-aware logic
-- in the client (which ignores bill_shares.paid for recurring bills
-- entirely) saw no payment history at all and treated every such bill as
-- freshly unpaid. That silently reopened every already-settled recurring
-- bill the moment 0038 went live.
--
-- This backfills one bill_occurrence_payments row, at the bill's anchor
-- due_date, for every recurring bill_shares row that has any amount paid
-- (paid_amount > 0 covers both fully paid and partially offset shares),
-- carrying its existing paid/paid_at/paid_amount/settled_via forward as
-- that cycle's recorded payment.
insert into public.bill_occurrence_payments (bill_id, occurrence_date, user_id, amount, percentage, paid, paid_at, paid_amount, settled_via)
select bs.bill_id, b.due_date, bs.user_id, bs.amount, bs.percentage, bs.paid, bs.paid_at, bs.paid_amount, bs.settled_via
from public.bill_shares bs
join public.bills b on b.id = bs.bill_id
where b.recurrence <> 'none'
  and bs.paid_amount > 0
on conflict (bill_id, occurrence_date, user_id) do nothing;
