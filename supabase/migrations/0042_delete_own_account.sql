-- Self-service account deletion (Apple App Review guideline 5.1.1(v) —
-- account deletion must be user-initiated, not "email us and we'll take
-- care of it").
--
-- profiles.id is referenced (without cascade) by dozens of tables across
-- the schema — bills.created_by, bill_shares.user_id, tasks, shopping
-- items, etc. — because a housemate's historical shares/tasks need to stay
-- attached to a valid member so the rest of the house's shared records
-- (and everyone else's balances) don't corrupt when they leave. So this
-- doesn't hard-delete the profiles row (which would fail on those FKs
-- anyway) — it anonymizes it in place, removes the person from every
-- house exactly like leave_house(), and the edge function that calls this
-- (supabase/functions/delete-account) soft-deletes the auth.users row via
-- admin.deleteUser(id, true), which disables login and invalidates
-- sessions without hard-deleting the row profiles.id cascades from.
alter table public.profiles add column deleted_at timestamptz;

create or replace function public.anonymize_own_account()
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  while exists (
    select 1 from public.house_members where user_id = auth.uid() and left_at is null
  ) loop
    perform public.leave_house();
  end loop;

  delete from public.member_payments where user_id = auth.uid();

  update public.profiles
  set full_name = 'Deleted user',
      phone = null,
      avatar_url = null,
      pay_id = null,
      bank_details = null,
      emergency_contact_name = null,
      emergency_contact_phone = null,
      email = null,
      deleted_at = now()
  where id = auth.uid();
end;
$$;
