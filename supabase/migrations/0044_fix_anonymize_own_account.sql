-- 0042's anonymize_own_account() referenced public.member_payments, a
-- table that was actually dropped back in 0005 when per-member payment
-- info (pay_id/bank_details) moved onto profiles directly — this made
-- every account deletion fail with "relation ... does not exist" (caught
-- via delete-account's per-step error logging). The line was redundant
-- anyway: those fields are already cleared by the update below.
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
