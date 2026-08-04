// Called when a user taps "Excluir minha conta" in Profile. Anonymizes
// their profile and removes them from every house (via the
// anonymize_own_account RPC — same referential-integrity reasoning as its
// migration comment), deletes their avatar files, then soft-deletes the
// auth.users row so they can no longer log in. Soft delete (not a hard
// delete) is deliberate: profiles.id cascades from auth.users, and
// profiles.id is what every bill/task/shopping row's created_by/user_id
// points at — a hard delete would either cascade destructively through a
// house's shared history or fail outright on those foreign keys.
import { createClient } from 'jsr:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

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

  const { error: rpcError } = await userClient.rpc('anonymize_own_account')
  if (rpcError) {
    return new Response(JSON.stringify({ error: rpcError.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const { data: avatarFiles } = await supabase.storage.from('avatars').list(user.id)
  if (avatarFiles?.length) {
    await supabase.storage.from('avatars').remove(avatarFiles.map((file) => `${user.id}/${file.name}`))
  }

  const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id, true)
  if (deleteError) {
    return new Response(JSON.stringify({ error: deleteError.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
