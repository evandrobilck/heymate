-- Server-side copy of the user's language preference (client only had it in
-- localStorage), so the daily notification email job can write in the
-- recipient's language.
alter table public.profiles add column language text not null default 'en';

-- Idempotency ledger for the daily due-date email job: one row per
-- (entity, occurrence date, recipient) that has already been emailed, so a
-- job re-run (or a slightly-late cron) never double-sends.
create table public.notification_log (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null check (entity_type in ('task', 'bill')),
  entity_id uuid not null,
  occurrence_date date not null,
  user_id uuid not null references public.profiles (id),
  sent_at timestamptz not null default now(),
  unique (entity_type, entity_id, occurrence_date, user_id)
);

alter table public.notification_log enable row level security;
-- No policies: only the send-due-notifications edge function (service role,
-- which bypasses RLS) ever touches this table.
