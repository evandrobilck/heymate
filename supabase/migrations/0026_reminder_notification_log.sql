-- With multiple configurable reminders per bill/task now possible (see
-- migration 0025), the idempotency key needs to include *which* reminder
-- fired, not just the entity/occurrence/user — otherwise a second reminder
-- for the same bill (e.g. "1 day before" after "3 days before" already
-- fired) would be blocked as a false duplicate.
alter table public.notification_log add column reminder_id uuid;

-- Drop the old auto-named unique constraint without hardcoding its exact
-- generated name (Postgres can truncate/hash long auto-names).
do $$
declare
  constraint_name text;
begin
  select con.conname into constraint_name
  from pg_constraint con
  join pg_class rel on rel.oid = con.conrelid
  where rel.relname = 'notification_log'
    and con.contype = 'u';

  if constraint_name is not null then
    execute format('alter table public.notification_log drop constraint %I', constraint_name);
  end if;
end $$;

alter table public.notification_log
  add constraint notification_log_unique_send
  unique (entity_type, entity_id, occurrence_date, user_id, reminder_id);
