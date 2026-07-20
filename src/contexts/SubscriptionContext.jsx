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

  // Simulates what a successful Stripe checkout would do — no payment provider wired up yet.
  async function simulateSubscribe() {
    if (!house?.id) return
    const periodEnd = new Date()
    periodEnd.setDate(periodEnd.getDate() + 30)

    const { error } = await supabase
      .from('house_subscriptions')
      .update({ status: 'active', current_period_end: periodEnd.toISOString(), canceled_at: null })
      .eq('house_id', house.id)

    if (error) throw error
    await refresh()
  }

  // Simulates what a Stripe cancellation webhook would do.
  async function simulateCancel() {
    if (!house?.id) return
    const { error } = await supabase
      .from('house_subscriptions')
      .update({ status: 'canceled', canceled_at: new Date().toISOString() })
      .eq('house_id', house.id)

    if (error) throw error
    await refresh()
  }

  const value = useMemo(
    () => ({ subscription, loading, simulateSubscribe, simulateCancel }),
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
