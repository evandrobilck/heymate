-- Broadcast changes to house_members (e.g. a roommate joining or leaving) so
-- everyone in the house sees updates live without a manual refresh.
alter publication supabase_realtime add table public.house_members;
