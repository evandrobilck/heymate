import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { Capacitor } from '@capacitor/core'
import { Browser } from '@capacitor/browser'
import { supabase } from '../services/supabase'
import { useHouse } from './HouseContext'
import { purchasePlanWithRevenueCat, resetRevenueCatUser, syncRevenueCatUser } from '../utils/revenueCat'

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

const SubscriptionContext = createContext(null)

// supabase.functions.invoke() only gives a generic error on non-2xx
// responses — the actual reason (which our edge functions send as plain
// text) is on error.context, a Response we still need to read.
async function readFunctionError(error) {
  if (error?.context?.text) {
    try {
      const text = await error.context.text()
      if (text) return text
    } catch {
      // fall through to the generic message below
    }
  }
  return error?.message ?? String(error)
}

function mapSubscriptionRow(row) {
  if (!row) return null
  return {
    status: row.status,
    plan: row.plan,
    billingInterval: row.billing_interval,
    priceCents: row.price_cents,
    currency: row.currency,
    trialEndsAt: row.trial_ends_at,
    currentPeriodEnd: row.current_period_end,
    canceledAt: row.canceled_at,
    provider: row.provider,
  }
}

export function SubscriptionProvider({ children }) {
  const { house } = useHouse()
  const [subscription, setSubscription] = useState(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!house?.id) {
      setSubscription(null)
      setLoading(false)
      return
    }

    setLoading(true)
    const { data, error } = await supabase
      .from('house_subscriptions')
      .select('*')
      .eq('house_id', house.id)
      .maybeSingle()

    if (error) {
      console.error(error)
    } else {
      setSubscription(mapSubscriptionRow(data))
    }
    setLoading(false)
  }, [house?.id])

  useEffect(() => {
    refresh()
  }, [refresh])

  useEffect(() => {
    if (!house?.id) return

    const channel = supabase
      .channel(`house-subscription-${house.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'house_subscriptions', filter: `house_id=eq.${house.id}` },
        () => refresh()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [house?.id, refresh])

  // Apple requires iOS purchases to go through StoreKit — RevenueCat needs
  // its "current user" set to this house (a subscription unlocks the whole
  // house, not just whoever bought it) before a purchase can be attributed
  // correctly by revenuecat-webhook. No-ops on web/Android, where Stripe
  // checkout is still used directly.
  useEffect(() => {
    if (Capacitor.getPlatform() !== 'ios') return
    if (house?.id) {
      syncRevenueCatUser(house.id)
    } else {
      resetRevenueCatUser()
    }
  }, [house?.id])

  // On iOS this must be an Apple In-App Purchase (App Review guideline
  // 3.1.1) — everywhere else it's a real Stripe Checkout session. Either
  // way, house_subscriptions itself is only ever written by a webhook
  // (stripe-webhook or revenuecat-webhook) once the provider confirms
  // payment, never by the client directly.
  async function startCheckout(plan) {
    if (!house?.id) return

    if (Capacitor.getPlatform() === 'ios') {
      await purchasePlanWithRevenueCat(plan)
      // revenuecat-webhook updates house_subscriptions asynchronously —
      // give it a few seconds to land instead of leaving the UI showing
      // "not subscribed" right after a successful purchase.
      for (let attempt = 0; attempt < 5; attempt++) {
        await sleep(1500)
        await refresh()
      }
      return
    }

    const { data, error } = await supabase.functions.invoke('create-checkout-session', {
      body: { house_id: house.id, plan },
    })
    if (error) throw new Error(await readFunctionError(error))

    if (Capacitor.isNativePlatform()) {
      await Browser.open({ url: data.url })
    } else {
      window.location.href = data.url
    }
  }

  // A subscription bought via Apple can only be cancelled through Apple's
  // own subscription management (App Review doesn't allow a custom in-app
  // cancel flow to replace it) — deep-link there instead of calling Stripe.
  // house_subscriptions is updated by revenuecat-webhook once Apple
  // confirms the cancellation.
  async function cancelSubscription() {
    if (!house?.id) return

    if (subscription?.provider === 'revenuecat') {
      await Browser.open({ url: 'https://apps.apple.com/account/subscriptions' })
      return
    }

    const { error } = await supabase.functions.invoke('cancel-subscription', {
      body: { house_id: house.id },
    })
    if (error) throw new Error(await readFunctionError(error))
    await refresh()
  }

  const value = useMemo(
    () => ({ subscription, loading, startCheckout, cancelSubscription }),
    [subscription, loading]
  )

  return <SubscriptionContext.Provider value={value}>{children}</SubscriptionContext.Provider>
}

export function useSubscription() {
  const context = useContext(SubscriptionContext)
  if (!context) {
    throw new Error('useSubscription must be used within a SubscriptionProvider')
  }
  return context
}
