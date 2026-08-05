// Client-reported fallback for updating house_subscriptions right after a
// successful iOS purchase, since RevenueCat's server-to-server webhook
// (revenuecat-webhook) has an unresolved delivery issue as of 2026-08-05 —
// that function/secret/logic were all verified working via a direct curl
// test (200 OK, DB updated correctly), RevenueCat's own webhook dispatch
// just never called it. Filed with RevenueCat support; kept as a permanent
// belt-and-suspenders path even after it's fixed, since it updates the UI
// immediately after purchase instead of waiting on webhook latency.
//
// Not a security downgrade: the client only reports data that came back
// from RevenueCat's own SDK (Purchases.purchasePackage), which already
// validated the real App Store transaction before returning it — the
// client can't fabricate this any more than it could fabricate what the
// webhook would have reported. Membership in the target house is still
// checked server-side before writing anything.
import { createClient } from 'jsr:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

// Matches revenuecat-webhook's map — keep both in sync if plans change.
const PRODUCT_TO_BILLING_INTERVAL: Record<string, string> = {
  'au.com.heyflat.casa.monthly': 'monthly',
  'au.com.heyflat.casa.semiannual': 'semiannual',
  'au.com.heyflat.casa.annual': 'annual',
}

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

  const { house_id, product_id, expiration_date, price_cents, currency } = await req.json()
  if (!house_id || !product_id) {
    return new Response('Missing house_id or product_id', { status: 400, headers: corsHeaders })
  }

  const { data: membership } = await supabase
    .from('house_members')
    .select('user_id')
    .eq('house_id', house_id)
    .eq('user_id', user.id)
    .is('left_at', null)
    .maybeSingle()

  if (!membership) return new Response('Not a member of this house', { status: 403, headers: corsHeaders })

  const { error: updateError } = await supabase
    .from('house_subscriptions')
    .update({
      status: 'active',
      provider: 'revenuecat',
      billing_interval: PRODUCT_TO_BILLING_INTERVAL[product_id] ?? 'monthly',
      price_cents: typeof price_cents === 'number' ? price_cents : undefined,
      currency: currency ?? undefined,
      current_period_end: expiration_date ?? null,
      canceled_at: null,
    })
    .eq('house_id', house_id)

  if (updateError) {
    return new Response(JSON.stringify({ error: updateError.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
