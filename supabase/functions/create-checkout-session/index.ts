// Called by the app when a house admin clicks "Assinar". Creates (or reuses)
// a Stripe Customer for the house and returns a Checkout Session URL to
// redirect the browser to. The actual subscription record is only updated
// once Stripe confirms payment via the stripe-webhook function — this
// endpoint just starts the checkout, it never writes subscription status.
import { createClient } from 'jsr:@supabase/supabase-js@2'
import Stripe from 'npm:stripe@17'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY')!
const APP_URL = Deno.env.get('APP_URL') ?? 'https://heymate-lovat.vercel.app'

// One Stripe Price per billing interval, all on the same "HeyFlat Casa"
// product — the plan the client asks for just selects which of these to
// check out with. stripe-webhook is what actually persists which one a
// house ended up on, reading it back off the real Stripe subscription.
const PRICE_IDS: Record<string, string> = {
  monthly: Deno.env.get('STRIPE_PRICE_ID')!,
  semiannual: Deno.env.get('STRIPE_PRICE_ID_SEMIANNUAL')!,
  annual: Deno.env.get('STRIPE_PRICE_ID_ANNUAL')!,
}

const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2025-08-27.basil' })
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type, apikey, x-client-info',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: corsHeaders })

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return new Response('Unauthorized', { status: 401, headers: corsHeaders })

  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  })
  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser()
  if (userError || !user) return new Response('Unauthorized', { status: 401, headers: corsHeaders })

  try {
    const { house_id, plan } = await req.json()
    if (!house_id) return new Response('Missing house_id', { status: 400, headers: corsHeaders })

    const priceId = PRICE_IDS[plan]
    if (!priceId) return new Response('Invalid plan', { status: 400, headers: corsHeaders })

    const { data: membership } = await supabase
      .from('house_members')
      .select('role')
      .eq('house_id', house_id)
      .eq('user_id', user.id)
      .is('left_at', null)
      .maybeSingle()

    if (!membership || membership.role !== 'admin') {
      return new Response('Only the house admin can subscribe', { status: 403, headers: corsHeaders })
    }

    const { data: house } = await supabase.from('houses').select('name').eq('id', house_id).single()
    const { data: subscriptionRow } = await supabase
      .from('house_subscriptions')
      .select('stripe_customer_id')
      .eq('house_id', house_id)
      .maybeSingle()

    let customerId = subscriptionRow?.stripe_customer_id as string | undefined

    if (!customerId) {
      const { data: profile } = await supabase.from('profiles').select('email, full_name').eq('id', user.id).single()
      const customer = await stripe.customers.create({
        email: profile?.email,
        name: profile?.full_name,
        metadata: { house_id, house_name: house?.name ?? '' },
      })
      customerId = customer.id
      await supabase.from('house_subscriptions').update({ stripe_customer_id: customerId }).eq('house_id', house_id)
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${APP_URL}/checkout-resultado?status=success`,
      cancel_url: `${APP_URL}/checkout-resultado?status=canceled`,
      allow_promotion_codes: true,
      subscription_data: { metadata: { house_id } },
      metadata: { house_id },
    })

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('[create-checkout-session] failed', err)
    return new Response(JSON.stringify({ error: 'Something went wrong starting checkout. Please try again.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
