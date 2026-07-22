// Called by the app right after a shopping item is added. Pushes an instant
// notification to every other active member of the house. No-op until
// FCM_SERVER_KEY is configured (needs a Firebase project) and the app
// registers device tokens into push_tokens — both still pending.
import { createClient } from 'jsr:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const FCM_SERVER_KEY = Deno.env.get('FCM_SERVER_KEY')

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type, apikey, x-client-info',
}

async function sendPush(userId: string, title: string, body: string) {
  if (!FCM_SERVER_KEY) return

  const { data: tokens } = await supabase.from('push_tokens').select('token').eq('user_id', userId)
  for (const { token } of tokens ?? []) {
    await fetch('https://fcm.googleapis.com/fcm/send', {
      method: 'POST',
      headers: { Authorization: `key=${FCM_SERVER_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: token, notification: { title, body } }),
    })
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const { item_id } = await req.json()
    if (!item_id) return new Response('Missing item_id', { status: 400, headers: corsHeaders })

    const { data: item, error: itemError } = await supabase
      .from('shopping_items')
      .select('name, house_id, added_by')
      .eq('id', item_id)
      .single()
    if (itemError) throw itemError

    const { data: house } = await supabase.from('houses').select('name').eq('id', item.house_id).single()

    const { data: members } = await supabase
      .from('house_members')
      .select('user_id')
      .eq('house_id', item.house_id)
      .is('left_at', null)
      .neq('user_id', item.added_by)

    const { data: adder } = await supabase.from('profiles').select('full_name').eq('id', item.added_by).single()

    for (const member of members ?? []) {
      await sendPush(
        member.user_id,
        house?.name ?? 'HeyFlat',
        `${adder?.full_name ?? 'Alguém'} adicionou "${item.name}" à lista de compras`
      )
    }

    return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (err) {
    console.error(err)
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
