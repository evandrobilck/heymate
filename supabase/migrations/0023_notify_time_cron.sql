-- Reschedules send-due-notifications from once a day to once an hour, so a
-- task's optional notify_time (added in migration 0022) can be honored —
-- the function itself decides per-run which tasks/bills are actually due
-- at the current local hour, see supabase/functions/send-due-notifications.
-- Run this in the Supabase SQL editor after redeploying the edge function.
select cron.unschedule('send-due-notifications-daily');

select cron.schedule(
  'send-due-notifications-hourly',
  '0 * * * *',
  $$
  select net.http_post(
    url := 'https://dirxyjzjsohmvvwrfwfm.supabase.co/functions/v1/send-due-notifications',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);
