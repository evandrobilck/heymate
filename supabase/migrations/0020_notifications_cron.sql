-- Schedules the send-due-notifications edge function to run once a day.
-- Run this AFTER the edge function has been deployed (see chat instructions).
--
-- STEP 1 — one-time only: store the service role key in Vault so it never
-- sits in plain text inside cron.job (visible to anyone who can query it).
-- Replace <SERVICE_ROLE_KEY> below with the key from
-- Project Settings -> API -> service_role, then run just this block.
select vault.create_secret('<SERVICE_ROLE_KEY>', 'service_role_key');

-- STEP 2: enable the extensions the cron job needs.
create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

-- STEP 3: schedule the daily run at 21:00 UTC (~7-8am Sydney, depending on
-- daylight saving). Adjust the cron expression if you'd rather a different
-- local time.
select cron.schedule(
  'send-due-notifications-daily',
  '0 21 * * *',
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
