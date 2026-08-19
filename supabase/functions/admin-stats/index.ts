// Returns app-wide counts (users, houses, active subscriptions) for the
// owner-only /admin page. Uses the service role because profiles/houses RLS
// scopes normal users to their own house — only the hardcoded owner email
// is allowed through, checked server-side since client-side checks alone
// aren't a security boundary.
import { createClient } from 'jsr:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const OWNER_EMAIL = 'xp.vando@gmail.com'

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type, apikey, x-client-info',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return new Response('Unauthorized', { status: 401, headers: corsHeaders })

  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  })

  const { data, error } = await userClient.auth.getUser()
  if (error || !data.user || data.user.email !== OWNER_EMAIL) {
    return new Response('Unauthorized', { status: 401, headers: corsHeaders })
  }

  const [{ count: totalUsers }, { count: totalHouses }, { data: activeSubs }] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('houses').select('*', { count: 'exact', head: true }),
    supabase
      .from('house_subscriptions')
      .select('billing_interval, price_cents, currency, current_period_end')
      .eq('status', 'active'),
  ])

  const byInterval: Record<string, number> = { monthly: 0, semiannual: 0, annual: 0 }
  for (const sub of activeSubs ?? []) {
    if (sub.billing_interval in byInterval) byInterval[sub.billing_interval]++
  }

  // "Next month" revenue: only subscriptions whose current period actually
  // renews next calendar month will charge again then — a semiannual sub
  // renewing in 4 months contributes nothing to next month's cash-in.
  const now = new Date()
  const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  const monthAfterStart = new Date(now.getFullYear(), now.getMonth() + 2, 1)

  let nextMonthRevenueCents = 0
  let nextMonthCurrency = 'AUD'
  let nextMonthRenewalCount = 0
  for (const sub of activeSubs ?? []) {
    if (!sub.current_period_end) continue
    const periodEnd = new Date(sub.current_period_end)
    if (periodEnd >= nextMonthStart && periodEnd < monthAfterStart) {
      nextMonthRevenueCents += sub.price_cents ?? 0
      nextMonthCurrency = sub.currency ?? nextMonthCurrency
      nextMonthRenewalCount++
    }
  }

  return new Response(
    JSON.stringify({
      totalUsers: totalUsers ?? 0,
      totalHouses: totalHouses ?? 0,
      activeSubscriptions: activeSubs?.length ?? 0,
      subscriptionsByInterval: byInterval,
      nextMonthRevenueCents,
      nextMonthCurrency,
      nextMonthRenewalCount,
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  )
})
