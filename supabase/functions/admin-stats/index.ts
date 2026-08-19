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

  const [{ count: totalUsers }, { count: totalHouses }, { count: activeSubscriptions }] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('houses').select('*', { count: 'exact', head: true }),
    supabase.from('house_subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'active'),
  ])

  return new Response(
    JSON.stringify({ totalUsers: totalUsers ?? 0, totalHouses: totalHouses ?? 0, activeSubscriptions: activeSubscriptions ?? 0 }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  )
})
