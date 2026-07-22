// Firebase Cloud Messaging via the current HTTP v1 API. The old "server
// key" + legacy send endpoint was shut down by Google in June 2024 — v1
// authenticates with a short-lived OAuth2 token minted from a service
// account's private key instead of a static key, so this signs and
// exchanges a JWT for one before every send (fine at our volume; no
// caching needed).
const FCM_PROJECT_ID = Deno.env.get('FCM_PROJECT_ID')
const FCM_CLIENT_EMAIL = Deno.env.get('FCM_CLIENT_EMAIL')
const FCM_PRIVATE_KEY = Deno.env.get('FCM_PRIVATE_KEY')

function base64url(input: Uint8Array | string): string {
  const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : input
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

async function getAccessToken(): Promise<string | null> {
  if (!FCM_PROJECT_ID || !FCM_CLIENT_EMAIL || !FCM_PRIVATE_KEY) return null

  const now = Math.floor(Date.now() / 1000)
  const header = { alg: 'RS256', typ: 'JWT' }
  const claims = {
    iss: FCM_CLIENT_EMAIL,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  }
  const unsignedToken = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(claims))}`

  const pem = FCM_PRIVATE_KEY.replace(/\\n/g, '\n')
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s/g, '')
  const keyBytes = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0))

  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    keyBytes,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', cryptoKey, new TextEncoder().encode(unsignedToken))
  const jwt = `${unsignedToken}.${base64url(new Uint8Array(signature))}`

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  })

  if (!res.ok) {
    console.error(`FCM token exchange failed: ${await res.text()}`)
    return null
  }

  const data = await res.json()
  return data.access_token as string
}

// Sends to every device token on file for a user. No-op (returns
// immediately) until FCM_PROJECT_ID/FCM_CLIENT_EMAIL/FCM_PRIVATE_KEY are
// all set as Supabase secrets and push_tokens has real rows.
export async function sendPush(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  userId: string,
  title: string,
  body: string
) {
  const accessToken = await getAccessToken()
  if (!accessToken) return

  const { data: tokens } = await supabase.from('push_tokens').select('token').eq('user_id', userId)
  for (const { token } of tokens ?? []) {
    const res = await fetch(`https://fcm.googleapis.com/v1/projects/${FCM_PROJECT_ID}/messages:send`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: { token, notification: { title, body } } }),
    })
    if (!res.ok) console.error(`FCM send failed for token: ${await res.text()}`)
  }
}
