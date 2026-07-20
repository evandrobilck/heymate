import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { supabase } from '../services/supabase'
import { useHouse } from './HouseContext'

const SubscriptionContext = createContext(null)

function mapSubscriptionRow(row) {
  if (!row) return null
  return {
    status: row.status,
    plan: row.plan,
    priceCents: row.price_cents,
    currency: row.currency,
    trialEndsAt: row.trial_ends_at,
    currentPeriodEnd: row.current_period_end,
    canceledAt: row.canceled_at,
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

  // Starts a real Stripe Checkout session (test mode) and redirects the
  // browser there. The subscription row itself is only updated once Stripe
  // confirms payment via the stripe-webhook edge function.
  async function startCheckout() {
    if (!house?.id) return
    const { data, error } = await supabase.functions.invoke('create-checkout-session', {
      body: { house_id: house.id },
    })
    if (error) throw error
    window.location.href = data.url
  }

  // Cancels the subscription in Stripe (test mode). house_subscriptions is
  // updated by stripe-webhook once Stripe confirms the cancellation.
  async function cancelSubscription() {
    if (!house?.id) return
    const { error } = await supabase.functions.invoke('cancel-subscription', {
      body: { house_id: house.id },
    })
    if (error) throw error
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
