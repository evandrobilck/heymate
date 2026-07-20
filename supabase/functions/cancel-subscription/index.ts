// Called when a house admin clicks "Cancelar assinatura". Cancels the
// subscription in Stripe immediately (no refund, matches what's promised in
// the Terms — "cancele quando quiser, sem multa"). The house_subscriptions
// row is updated by stripe-webhook once Stripe confirms the cancellation.
import { createClient } from 'jsr:@supabase/supabase-js@2'
import Stripe from 'npm:stripe@17'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY')!

const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2025-08-27.basil' })
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
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

  const { house_id } = await req.json()
  if (!house_id) return new Response('Missing house_id', { status: 400, headers: corsHeaders })

  const { data: membership } = await supabase
    .from('house_members')
    .select('role')
    .eq('house_id', house_id)
    .eq('user_id', user.id)
    .is('left_at', null)
    .maybeSingle()

  if (!membership || membership.role !== 'admin') {
    return new Response('Only the house admin can cancel', { status: 403, headers: corsHeaders })
  }

  const { data: subscriptionRow } = await supabase
    .from('house_subscriptions')
    .select('stripe_subscription_id')
    .eq('house_id', house_id)
    .maybeSingle()

  if (!subscriptionRow?.stripe_subscription_id) {
    return new Response('No active Stripe subscription for this house', { status: 400, headers: corsHeaders })
  }

  await stripe.subscriptions.cancel(subscriptionRow.stripe_subscription_id)

  return new Response(JSON.stringify({ ok: true }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
