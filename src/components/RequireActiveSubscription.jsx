import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext'
import { useHouse } from '../contexts/HouseContext'
import { useSubscription } from '../contexts/SubscriptionContext'
import { formatCurrency } from '../utils/formatCurrency'
import { isSubscriptionBlocked, isTrialExpired } from '../utils/subscriptionStatus'

function BlockedScreen() {
  const { t, i18n } = useTranslation()
  const { logout } = useAuth()
  const { house, isAdmin } = useHouse()
  const { subscription, simulateSubscribe } = useSubscription()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const trialExpired = isTrialExpired(subscription)
  const price = formatCurrency(subscription.priceCents / 100, i18n.language, subscription.currency)

  async function handleSubscribe() {
    setError('')
    setSubmitting(true)
    try {
      await simulateSubscribe()
    } catch (err) {
      console.error(err)
      setError(t('subscription.subscribeError'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
        <span className="text-3xl">🔒</span>
        <h1 className="mt-3 text-lg font-semibold text-gray-900">
          {trialExpired ? t('subscription.trialExpiredTitle') : t('subscription.canceledTitle')}
        </h1>
        <p className="mt-2 text-sm text-gray-500">
          {trialExpired
            ? t('subscription.trialExpiredBody', { houseName: house.name })
            : t('subscription.canceledBody', { houseName: house.name })}
        </p>
        <p className="mt-3 text-sm font-medium text-gray-700">{t('subscription.priceLabel', { price })}</p>

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

        {isAdmin ? (
          <button
            type="button"
            onClick={handleSubscribe}
            disabled={submitting}
            className="mt-6 w-full rounded-lg bg-purple-600 py-2.5 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-40"
          >
            {t('subscription.subscribeButton')}
          </button>
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
