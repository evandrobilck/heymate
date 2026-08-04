// Receives RevenueCat events for Apple In-App Purchase subscriptions and
// keeps house_subscriptions in sync, the same role stripe-webhook plays
// for Stripe — the client only ever starts a purchase or opens Apple's
// subscription management, never writes status directly.
//
// RevenueCat's appUserID is set to the house_id at purchase time (see
// syncRevenueCatUser in src/utils/revenueCat.js), so event.app_user_id
// here IS the house_id, the same way auth.uid() is trusted elsewhere.
//
// Authenticated by a shared secret configured as this function's own
// Authorization header value in the RevenueCat dashboard (Project
// Settings > Integrations > Webhooks) — RevenueCat has no request
// signing, this header is the only verification available.
import { createClient } from 'jsr:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const WEBHOOK_AUTH_TOKEN = Deno.env.get('REVENUECAT_WEBHOOK_AUTH_TOKEN')!

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

// Product identifiers to create in App Store Connect, matching the 3
// HeyFlat Casa plans (see src/utils/subscriptionPlans.js).
const PRODUCT_TO_BILLING_INTERVAL: Record<string, string> = {
  'au.com.heyflat.casa.monthly': 'monthly',
  'au.com.heyflat.casa.semiannual': 'semiannual',
  'au.com.heyflat.casa.annual': 'annual',
}

const ACTIVE_EVENTS = new Set(['INITIAL_PURCHASE', 'RENEWAL', 'UNCANCELLATION', 'PRODUCT_CHANGE'])

interface RevenueCatEvent {
  type: string
  app_user_id: string
  product_id?: string
  expiration_at_ms?: number
  price?: number
  currency?: string
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  const authHeader = req.headers.get('Authorization')
  if (!WEBHOOK_AUTH_TOKEN || authHeader !== `Bearer ${WEBHOOK_AUTH_TOKEN}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  const body = await req.json()
  const event: RevenueCatEvent = body.event
  const houseId = event.app_user_id

  if (!houseId) {
    return new Response(JSON.stringify({ received: true, skipped: 'no app_user_id' }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }

  if (ACTIVE_EVENTS.has(event.type)) {
    await supabase
      .from('house_subscriptions')
      .update({
        status: 'active',
        provider: 'revenuecat',
        billing_interval: PRODUCT_TO_BILLING_INTERVAL[event.product_id ?? ''] ?? 'monthly',
        price_cents: typeof event.price === 'number' ? Math.round(event.price * 100) : undefined,
        currency: event.currency,
        current_period_end: event.expiration_at_ms ? new Date(event.expiration_at_ms).toISOString() : null,
        canceled_at: null,
      })
      .eq('house_id', houseId)
  } else if (event.type === 'CANCELLATION') {
    // Apple subscriptions can't be cancelled immediately by the user —
    // this only means "won't renew"; it stays active until EXPIRATION.
    await supabase
      .from('house_subscriptions')
      .update({ provider: 'revenuecat', canceled_at: new Date().toISOString() })
      .eq('house_id', houseId)
  } else if (event.type === 'EXPIRATION') {
    await supabase
      .from('house_subscriptions')
      .update({ status: 'canceled', provider: 'revenuecat', canceled_at: new Date().toISOString() })
      .eq('house_id', houseId)
  } else if (event.type === 'BILLING_ISSUE') {
    await supabase.from('house_subscriptions').update({ status: 'past_due', provider: 'revenuecat' }).eq('house_id', houseId)
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
