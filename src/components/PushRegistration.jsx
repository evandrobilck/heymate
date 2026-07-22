import { useEffect } from 'react'
import { Capacitor } from '@capacitor/core'
import { PushNotifications } from '@capacitor/push-notifications'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../services/supabase'

// Registers this device for push notifications and upserts its token into
// push_tokens so the server-side reminder/notification functions can target
// it. Native platforms only — there's no push channel for the web build.
export default function PushRegistration() {
  const { user } = useAuth()

  useEffect(() => {
    if (!Capacitor.isNativePlatform() || !user?.id) return

    let registrationListener
    let errorListener

    async function setup() {
      const permission = await PushNotifications.requestPermissions()
      if (permission.receive !== 'granted') return

      registrationListener = await PushNotifications.addListener('registration', async (token) => {
        const { error } = await supabase
          .from('push_tokens')
          .upsert(
            { user_id: user.id, token: token.value, platform: Capacitor.getPlatform() },
            { onConflict: 'token' }
          )
        if (error) console.error(error)
      })

      errorListener = await PushNotifications.addListener('registrationError', (err) => {
        console.error('Push registration error', err)
      })

      await PushNotifications.register()
    }

    setup()

    return () => {
      registrationListener?.remove()
      errorListener?.remove()
    }
  }, [user?.id])

  return null
}
