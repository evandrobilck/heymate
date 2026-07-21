import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext'

export default function CheckoutResultPage() {
  const { t } = useTranslation()
  const { isAuthenticated } = useAuth()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const success = searchParams.get('status') === 'success'

  // On the web, the session is shared with this tab, so send the user
  // straight back to their settings instead of leaving them on a static
  // page. On native, this loads in a separate in-app browser context with
  // no shared session, so there's no one to redirect — the static message
  // is all that renders there.
  useEffect(() => {
    if (!isAuthenticated) return
    const timeout = setTimeout(() => navigate('/configuracoes', { replace: true }), 1500)
    return () => clearTimeout(timeout)
  }, [isAuthenticated, navigate])

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
        {!isAuthenticated && <p className="mt-6 text-xs text-gray-400">{t('subscription.resultCloseHint')}</p>}
      </div>
    </div>
  )
}
