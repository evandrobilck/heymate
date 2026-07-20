import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSubscription } from '../contexts/SubscriptionContext'
import { formatCurrency } from '../utils/formatCurrency'
import { getDaysRemaining, isTrialExpired } from '../utils/subscriptionStatus'

const STATUS_STYLES = {
  trialing: 'bg-blue-50 text-blue-700',
  active: 'bg-green-50 text-green-700',
  canceled: 'bg-gray-100 text-gray-500',
  past_due: 'bg-red-50 text-red-700',
}

const STATUS_LABEL_KEYS = {
  trialing: 'subscription.statusTrialing',
  active: 'subscription.statusActive',
  canceled: 'subscription.statusCanceled',
  past_due: 'subscription.statusPastDue',
}

function formatFullDate(isoString, locale) {
  if (!isoString) return ''
  return new Intl.DateTimeFormat(locale, { day: '2-digit', month: 'short', year: 'numeric' }).format(
    new Date(isoString)
  )
}

export default function SubscriptionCard() {
  const { t, i18n } = useTranslation()
  const { subscription, loading, startCheckout, cancelSubscription } = useSubscription()
  const [actionError, setActionError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (loading || !subscription) return null

  const { status, priceCents, currency, trialEndsAt, currentPeriodEnd, canceledAt } = subscription
  const price = formatCurrency(priceCents / 100, i18n.language, currency)

  async function handleSubscribe() {
    setActionError('')
    setSubmitting(true)
    try {
      await startCheckout()
    } catch (err) {
      console.error(err)
      setActionError(`${t('subscription.subscribeError')} (${err.message})`)
      setSubmitting(false)
    }
  }

  async function handleCancel() {
    if (!window.confirm(t('subscription.cancelConfirm'))) return
    setActionError('')
    setSubmitting(true)
    try {
      await cancelSubscription()
    } catch (err) {
      console.error(err)
      setActionError(`${t('subscription.cancelError')} (${err.message})`)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-3 rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-900">{t('subscription.title')}</p>
        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLES[status] ?? STATUS_STYLES.canceled}`}>
          {t(STATUS_LABEL_KEYS[status] ?? STATUS_LABEL_KEYS.canceled)}
        </span>
      </div>

      <p className="text-xs text-amber-600">{t('subscription.simulationNote')}</p>

      <p className="text-sm text-gray-600">{t('subscription.priceLabel', { price })}</p>

      {status === 'trialing' && isTrialExpired(subscription) && (
        <p className="text-sm font-medium text-red-600">{t('subscription.trialExpiredLabel')}</p>
      )}
      {status === 'trialing' && !isTrialExpired(subscription) && (
        <p className="text-sm text-gray-600">
          {t('subscription.trialEndsOn', { date: formatFullDate(trialEndsAt, i18n.language) })} ·{' '}
          {t('subscription.daysRemaining', { count: getDaysRemaining(trialEndsAt) })}
        </p>
      )}
      {status === 'active' && currentPeriodEnd && (
        <p className="text-sm text-gray-600">
          {t('subscription.renewsOn', { date: formatFullDate(currentPeriodEnd, i18n.language) })}
        </p>
      )}
      {status === 'canceled' && canceledAt && (
        <p className="text-sm text-gray-600">
          {t('subscription.canceledOn', { date: formatFullDate(canceledAt, i18n.language) })}
        </p>
      )}

      {actionError && <p className="text-sm text-red-600">{actionError}</p>}

      <div className="flex gap-2">
        {status !== 'active' && (
          <button
            type="button"
            onClick={handleSubscribe}
            disabled={submitting}
            className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-40"
          >
            {status === 'canceled' ? t('subscription.reactivateButton') : t('subscription.subscribeButton')}
          </button>
        )}
        {status !== 'canceled' && (
          <button
            type="button"
            onClick={handleCancel}
            disabled={submitting}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 hover:border-gray-400 disabled:opacity-40"
          >
            {t('subscription.cancelButton')}
          </button>
        )}
      </div>
    </div>
  )
}
