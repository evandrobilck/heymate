-- Adds the billing interval to house_subscriptions now that there are 3
-- plans (monthly/semiannual/annual) instead of just one. price_cents and
-- currency used to sit at their column defaults forever (only one price
-- ever existed) — from now on stripe-webhook keeps them in sync with
-- whichever price the house's Stripe subscription is actually on, since
-- that's the only source of truth once a house has picked a plan.
alter table public.house_subscriptions
  add column billing_interval text not null default 'monthly'
    check (billing_interval in ('monthly', 'semiannual', 'annual'));
