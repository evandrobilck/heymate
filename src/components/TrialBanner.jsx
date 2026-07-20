import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useHouse } from '../contexts/HouseContext'
import { useSubscription } from '../contexts/SubscriptionContext'
import { getDaysRemaining, isTrialExpired } from '../utils/subscriptionStatus'

const WARNING_THRESHOLD_DAYS = 5

export default function TrialBanner() {
  const { t } = useTranslation()
  const { isAdmin } = useHouse()
  const { subscription, startCheckout } = useSubscription()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  if (!subscription || subscription.status !== 'trialing' || isTrialExpired(subscription)) return null

  const daysLeft = getDaysRemaining(subscription.trialEndsAt)
  if (daysLeft > WARNING_THRESHOLD_DAYS) return null

  async function handleSubscribe() {
    setError('')
    setSubmitting(true)
    try {
      await startCheckout()
    } catch (err) {
      console.error(err)
      setError(`${t('subscription.subscribeError')} (${err.message})`)
      setSubmitting(false)
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800 md:px-8">
      <p>
        {t('subscription.daysRemaining', { count: daysLeft })} — {t('subscription.trialEndingBanner')}
      </p>
      {isAdmin ? (
        <button
          type="button"
          onClick={handleSubscribe}
          disabled={submitting}
          className="font-semibold text-amber-900 underline hover:no-underline disabled:opacity-40"
        >
          {t('subscription.subscribeButton')}
        </button>
      ) : (
        <span className="text-xs text-amber-700">{t('subscription.nonAdminBlockedHint')}</span>
      )}
      {error && <p className="w-full text-xs text-red-600">{error}</p>}
    </div>
  )
}
