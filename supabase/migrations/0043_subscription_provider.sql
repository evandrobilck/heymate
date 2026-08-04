-- iOS purchases now go through Apple In-App Purchase (RevenueCat) instead
-- of Stripe, to satisfy App Review guideline 3.1.1. house_subscriptions
-- needs to know which provider last confirmed payment for a house, so the
-- client knows whether "cancel" should call Stripe or deep-link to Apple's
-- own subscription management (Apple doesn't allow a custom cancel flow
-- to replace that).
alter table public.house_subscriptions
  add column provider text not null default 'stripe'
    check (provider in ('stripe', 'revenuecat'));
