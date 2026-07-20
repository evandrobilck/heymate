-- Per-house subscription billing. No payment provider wired up yet —
-- status is changed directly by the client (admin-only) to simulate what
-- a future Stripe webhook would eventually do.
create table public.house_subscriptions (
  house_id uuid primary key references public.houses (id) on delete cascade,
  status text not null default 'trialing' check (status in ('trialing', 'active', 'canceled', 'past_due')),
  plan text not null default 'heyflat_casa',
  price_cents integer not null default 1500,
  currency text not null default 'AUD',
  trial_ends_at timestamptz not null,
  current_period_end timestamptz,
  canceled_at timestamptz,
  stripe_customer_id text,
  stripe_subscription_id text,
  created_at timestamptz not null default now()
);

alter table public.house_subscriptions enable row level security;

create policy "Members can view their house subscription"
on public.house_subscriptions for select
to authenticated
using (public.is_house_member(house_id));

create policy "Admins can update their house subscription"
on public.house_subscriptions for update
to authenticated
using (
  public.is_house_member(house_id)
  and exists (
    select 1 from public.house_members hm
    where hm.house_id = house_subscriptions.house_id
      and hm.user_id = auth.uid()
      and hm.role = 'admin'
      and hm.left_at is null
  )
);

-- Every new house starts with a 30-day trial.
create function public.handle_new_house_subscription()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.house_subscriptions (house_id, trial_ends_at)
  values (new.id, now() + interval '30 days');
  return new;
end;
$$;

create trigger on_house_created_subscription
after insert on public.houses
for each row execute function public.handle_new_house_subscription();

-- Backfill: give houses created before this migration a trial too.
insert into public.house_subscriptions (house_id, trial_ends_at)
select id, now() + interval '30 days' from public.houses
on conflict (house_id) do nothing;

-- Broadcast status changes live (e.g. simulated subscribe/cancel from Settings).
alter publication supabase_realtime add table public.house_subscriptions;
