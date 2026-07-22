import { useEffect } from 'react'
import { Capacitor } from '@capacitor/core'
import { FirebaseMessaging } from '@capacitor-firebase/messaging'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../services/supabase'

// Registers this device for push notifications and upserts its token into
// push_tokens so the server-side reminder/notification functions can target
// it. Native platforms only — there's no push channel for the web build.
// Uses @capacitor-firebase/messaging (not @capacitor/push-notifications) so
// iOS also yields an FCM-compatible token — the plain Capacitor plugin only
// exposes the raw APNs token on iOS, which our FCM v1 send path can't use.
export default function PushRegistration() {
  const { user } = useAuth()

  useEffect(() => {
    if (!Capacitor.isNativePlatform() || !user?.id) return

    let tokenListener

    async function saveToken(token) {
      const { error } = await supabase
        .from('push_tokens')
        .upsert({ user_id: user.id, token, platform: Capacitor.getPlatform() }, { onConflict: 'token' })
      if (error) console.error(error)
    }

    async function setup() {
      const permission = await FirebaseMessaging.requestPermissions()
      if (permission.receive !== 'granted') return

      tokenListener = await FirebaseMessaging.addListener('tokenReceived', (event) => {
        saveToken(event.token)
      })

      const { token } = await FirebaseMessaging.getToken()
      if (token) await saveToken(token)
    }

    setup()

    return () => {
      tokenListener?.remove()
    }
  }, [user?.id])

  return null
}
