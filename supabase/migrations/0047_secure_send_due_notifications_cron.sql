-- send-due-notifications had no authentication check at all (Deno.serve
-- didn't even read the request) — anyone who found the URL could trigger it
-- repeatedly, sending real emails (Resend, paid) and push notifications to
-- every user with something due. The function now requires a CRON_SECRET
-- bearer token (see supabase/functions/send-due-notifications/index.ts).
-- This reschedules the cron job to send that secret instead of the
-- service_role_key, reading it from Vault the same way service_role_key
-- already is. Run `select vault.create_secret('<the CRON_SECRET value>',
-- 'cron_secret');` first (SQL Editor), and set the same value as the
-- CRON_SECRET secret on the send-due-notifications edge function.
select cron.unschedule('send-due-notifications-hourly');

select cron.schedule(
  'send-due-notifications-hourly',
  '0 * * * *',
  $$
  select net.http_post(
    url := 'https://dirxyjzjsohmvvwrfwfm.supabase.co/functions/v1/send-due-notifications',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);
