import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { Capacitor } from '@capacitor/core'
import { FirebaseAnalytics } from '@capacitor-firebase/analytics'
import { useAuth } from '../contexts/AuthContext'

// Reports screen views and the signed-in user to Firebase/Google Analytics.
// Native platforms only, same as PushRegistration — the web build has no
// Firebase config wired up, so there's nowhere for web events to go.
export default function AnalyticsTracker() {
  const location = useLocation()
  const { user } = useAuth()

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return
    FirebaseAnalytics.setCurrentScreen({ screenName: location.pathname })
  }, [location.pathname])

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return
    FirebaseAnalytics.setUserId({ userId: user?.id ?? null })
  }, [user?.id])

  return null
}
