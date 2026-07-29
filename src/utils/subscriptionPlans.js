// Kept in sync by hand with the 3 "HeyFlat Casa" Stripe prices — there's no
// public Stripe API call for listing prices from the client, so these
// hardcoded amounts are what's shown before a house has subscribed. Once a
// house is actually subscribed, the real price/currency come from
// subscription.priceCents/currency (set by stripe-webhook off the real
// Stripe subscription), not from this table.
export const PLAN_IDS = ['monthly', 'semiannual', 'annual']

export const PLAN_PRICE_CENTS = { monthly: 1500, semiannual: 8100, annual: 15000 }

export const PLAN_LABEL_KEYS = {
  monthly: 'subscription.planMonthly',
  semiannual: 'subscription.planSemiannual',
  annual: 'subscription.planAnnual',
}

export const PLAN_PERIOD_KEYS = {
  monthly: 'subscription.periodMonthly',
  semiannual: 'subscription.periodSemiannual',
  annual: 'subscription.periodAnnual',
}
