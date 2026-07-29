import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext'
import { useHouse } from '../contexts/HouseContext'
import { useSubscription } from '../contexts/SubscriptionContext'
import { formatCurrency } from '../utils/formatCurrency'
import { isSubscriptionBlocked, isTrialExpired } from '../utils/subscriptionStatus'
import { PLAN_IDS, PLAN_PRICE_CENTS, PLAN_LABEL_KEYS, PLAN_PERIOD_KEYS } from '../utils/subscriptionPlans'

function BlockedScreen() {
  const { t, i18n } = useTranslation()
  const { logout } = useAuth()
  const { house, isAdmin } = useHouse()
  const { subscription, startCheckout } = useSubscription()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [selectedPlan, setSelectedPlan] = useState('monthly')

  const trialExpired = isTrialExpired(subscription)

  async function handleSubscribe() {
    setError('')
    setSubmitting(true)
    try {
      await startCheckout(selectedPlan)
    } catch (err) {
      console.error(err)
      setError(`${t('subscription.subscribeError')} (${err.message})`)
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-surface p-8 text-center shadow-sm">
        <span className="text-3xl">🔒</span>
        <h1 className="mt-3 text-lg font-semibold text-gray-900">
          {trialExpired ? t('subscription.trialExpiredTitle') : t('subscription.canceledTitle')}
        </h1>
        <p className="mt-2 text-sm text-gray-500">
          {trialExpired
            ? t('subscription.trialExpiredBody', { houseName: house.name })
            : t('subscription.canceledBody', { houseName: house.name })}
        </p>

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

        {isAdmin ? (
          <>
            <div className="mt-6 space-y-2 text-left">
              {PLAN_IDS.map((planId) => {
                const price = formatCurrency(PLAN_PRICE_CENTS[planId] / 100, i18n.language, 'AUD')
                const isSelected = selectedPlan === planId
                return (
                  <button
                    key={planId}
                    type="button"
                    onClick={() => setSelectedPlan(planId)}
                    className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-sm transition-colors ${
                      isSelected
                        ? 'border-brand-500 bg-brand-50 text-brand-700'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    <span className="font-medium">{t(PLAN_LABEL_KEYS[planId])}</span>
                    <span className="text-xs opacity-80">{t(PLAN_PERIOD_KEYS[planId], { price })}</span>
                  </button>
                )
              })}
            </div>
            <button
              type="button"
              onClick={handleSubscribe}
              disabled={submitting}
              className="mt-4 w-full rounded-lg bg-brand-600 py-2.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-40"
            >
              {t('subscription.subscribeButton')}
            </button>
          </>
        ) : (
          <p className="mt-6 text-sm text-gray-500">{t('subscription.nonAdminBlockedHint')}</p>
        )}

        <button type="button" onClick={logout} className="mt-4 text-sm font-medium text-gray-400 hover:text-gray-600">
          {t('auth.logout')}
        </button>
      </div>
    </div>
  )
}

export default function RequireActiveSubscription({ children }) {
  const { subscription, loading } = useSubscription()

  if (loading || !subscription) return null
  if (isSubscriptionBlocked(subscription)) return <BlockedScreen />

  return children
}
