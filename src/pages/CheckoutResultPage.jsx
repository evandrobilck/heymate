import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

export default function CheckoutResultPage() {
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  const success = searchParams.get('status') === 'success'

  return (
    <div className="flex min-h-svh items-center justify-center bg-gray-50 px-6 text-center">
      <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-surface p-8 shadow-sm">
        <span className="text-4xl">{success ? '✅' : '↩️'}</span>
        <h1 className="mt-4 text-xl font-semibold text-gray-900">
          {success ? t('subscription.resultSuccessTitle') : t('subscription.resultCanceledTitle')}
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          {success ? t('subscription.resultSuccessBody') : t('subscription.resultCanceledBody')}
        </p>
        <p className="mt-6 text-xs text-gray-400">{t('subscription.resultCloseHint')}</p>
      </div>
    </div>
  )
}
