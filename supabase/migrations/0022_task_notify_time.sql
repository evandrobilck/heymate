-- Optional time-of-day for a task's reminder email, e.g. a task like
-- "take out the trash" that can only be done after 7pm. Null keeps the
-- existing behavior (reminder sent at the daily default hour).
alter table public.tasks add column notify_time time;
