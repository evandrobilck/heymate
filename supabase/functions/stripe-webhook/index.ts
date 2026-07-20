// Receives Stripe events and is the *only* place that writes subscription
// status/dates into house_subscriptions once real billing is live — the
// client only ever starts checkout or asks to cancel, never writes status
// directly. Signature-verified, so this trusts Stripe's payload and uses
// the service role key to bypass RLS.
import { createClient } from 'jsr:@supabase/supabase-js@2'
import Stripe from 'npm:stripe@17'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY')!
const STRIPE_WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET')!

const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2025-08-27.basil' })
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

function mapStripeStatus(status: Stripe.Subscription.Status): string {
  if (status === 'active' || status === 'trialing') return 'active'
  if (status === 'past_due' || status === 'unpaid' || status === 'incomplete') return 'past_due'
  return 'canceled'
}

// Recent Stripe API versions moved current_period_end off the subscription
// itself and onto each subscription item — it's no longer a top-level field.
function getCurrentPeriodEnd(subscription: Stripe.Subscription): number | undefined {
  return subscription.items.data[0]?.current_period_end
}

async function updateFromSubscription(houseId: string, subscription: Stripe.Subscription) {
  const periodEnd = getCurrentPeriodEnd(subscription)

  await supabase
    .from('house_subscriptions')
    .update({
      status: mapStripeStatus(subscription.status),
      stripe_subscription_id: subscription.id,
      current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
      canceled_at: subscription.status === 'canceled' ? new Date().toISOString() : null,
    })
    .eq('house_id', houseId)
}

Deno.serve(async (req) => {
  const signature = req.headers.get('stripe-signature')
  const body = await req.text()

  let event: Stripe.Event
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature!, STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    console.error('Webhook signature verification failed', err)
    return new Response('Invalid signature', { status: 400 })
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      const houseId = session.metadata?.house_id
      if (houseId && session.subscription) {
        const subscription = await stripe.subscriptions.retrieve(session.subscription as string)
        await updateFromSubscription(houseId, subscription)
      }
      break
    }
    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription
      const houseId = subscription.metadata?.house_id
      if (houseId) await updateFromSubscription(houseId, subscription)
      break
    }
    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription
      const houseId = subscription.metadata?.house_id
      if (houseId) {
        await supabase
          .from('house_subscriptions')
          .update({ status: 'canceled', canceled_at: new Date().toISOString() })
          .eq('house_id', houseId)
      }
      break
    }
    default:
      break
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
