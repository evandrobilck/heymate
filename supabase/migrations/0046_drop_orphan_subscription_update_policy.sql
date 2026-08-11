-- The "Admins can update their house subscription" policy (0021_house_subscriptions.sql)
-- was created back when the app simulated payment directly from the client, before
-- Stripe/RevenueCat existed. house_subscriptions is now only ever written by
-- stripe-webhook, revenuecat-webhook and sync-revenuecat-purchase, all using the
-- service role key (which bypasses RLS) — the policy became an unused, exploitable
-- hole: any house admin could activate their own subscription for free straight
-- from the browser, with no payment involved.
drop policy "Admins can update their house subscription" on public.house_subscriptions;
