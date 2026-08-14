import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Browser } from '@capacitor/browser'
import { useSubscription } from '../contexts/SubscriptionContext'
import { useConfirm } from '../contexts/ConfirmContext'
import { formatCurrency } from '../utils/formatCurrency'
import { getDaysRemaining, isTrialExpired } from '../utils/subscriptionStatus'
import { PLAN_IDS, PLAN_PRICE_CENTS, PLAN_LABEL_KEYS, PLAN_PERIOD_KEYS } from '../utils/subscriptionPlans'

const PRIVACY_POLICY_URL = 'https://heyflat.com.au/privacidade'
const TERMS_OF_USE_URL = 'https://heyflat.com.au/termos'

const STATUS_STYLES = {
  trialing: 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400',
  active: 'bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-400',
  canceled: 'bg-gray-100 text-gray-500',
  past_due: 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400',
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
  const confirm = useConfirm()
  const [actionError, setActionError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState('monthly')

  if (loading || !subscription) return null

  const { status, billingInterval, priceCents, currency, trialEndsAt, currentPeriodEnd, canceledAt, provider } =
    subscription
  const isRevenueCat = provider === 'revenuecat'
  const needsPlanChoice = status !== 'active'
  const currentPeriodKey = PLAN_PERIOD_KEYS[billingInterval] ?? PLAN_PERIOD_KEYS.monthly
  const currentPrice = formatCurrency(priceCents / 100, i18n.language, currency)

  async function handleSubscribe() {
    setActionError('')
    setSubmitting(true)
    try {
      await startCheckout(selectedPlan)
    } catch (err) {
      console.error(err)
      setActionError(`${t('subscription.subscribeError')} (${err.message})`)
      setSubmitting(false)
    }
  }

  async function handleCancel() {
    // A subscription bought via Apple can only be cancelled from Apple's
    // own subscription management screen (which cancelSubscription()
    // opens) — no destructive action happens on our side to confirm here.
    if (!isRevenueCat && !(await confirm(t('subscription.cancelConfirm')))) return
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
    <div className="space-y-3 rounded-xl border border-gray-200 bg-surface p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-900">{t('subscription.title')}</p>
        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLES[status] ?? STATUS_STYLES.canceled}`}>
          {t(STATUS_LABEL_KEYS[status] ?? STATUS_LABEL_KEYS.canceled)}
        </span>
      </div>

      {!needsPlanChoice && <p className="text-sm text-gray-600">{t(currentPeriodKey, { price: currentPrice })}</p>}

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

      {needsPlanChoice && (
        <div>
          <p className="text-xs font-medium text-gray-600">{t('subscription.choosePlan')}</p>
          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
            {PLAN_IDS.map((planId) => {
              const price = formatCurrency(PLAN_PRICE_CENTS[planId] / 100, i18n.language, 'AUD')
              const isSelected = selectedPlan === planId
              return (
                <button
                  key={planId}
                  type="button"
                  onClick={() => setSelectedPlan(planId)}
                  className={`rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                    isSelected
                      ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-950/40'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  <span className="block font-medium">{t(PLAN_LABEL_KEYS[planId])}</span>
                  <span className="block text-xs opacity-80">{t(PLAN_PERIOD_KEYS[planId], { price })}</span>
                </button>
              )
            })}
          </div>
          <p className="mt-2 text-xs text-gray-500">
            <button type="button" onClick={() => Browser.open({ url: TERMS_OF_USE_URL })} className="underline hover:text-gray-700">
              {t('subscription.termsOfUseLink')}
            </button>
            {' · '}
            <button type="button" onClick={() => Browser.open({ url: PRIVACY_POLICY_URL })} className="underline hover:text-gray-700">
              {t('subscription.privacyPolicyLink')}
            </button>
          </p>
        </div>
      )}

      {actionError && <p className="text-sm text-red-600">{actionError}</p>}

      <div className="flex gap-2">
        {status !== 'active' && (
          <button
            type="button"
            onClick={handleSubscribe}
            disabled={submitting}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-40"
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
            {isRevenueCat ? t('subscription.manageOnAppStoreButton') : t('subscription.cancelButton')}
          </button>
        )}
      </div>
    </div>
  )
}
