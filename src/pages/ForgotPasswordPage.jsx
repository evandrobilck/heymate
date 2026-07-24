import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext'
import AuthLayout from '../components/AuthLayout'

export default function ForgotPasswordPage() {
  const { t } = useTranslation()
  const { sendPasswordReset } = useAuth()

  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      await sendPasswordReset(email)
      setSent(true)
    } catch (err) {
      console.error(err)
      setError(t('auth.resetLinkError'))
    } finally {
      setSubmitting(false)
    }
  }

  if (sent) {
    return (
      <AuthLayout>
        <h1 className="text-2xl font-semibold text-gray-900">{t('auth.checkEmailTitle')}</h1>
        <p className="mt-2 text-sm text-gray-500">{t('auth.resetLinkSent', { email })}</p>
        <p className="mt-6 text-sm text-gray-500">
          <Link to="/login" className="font-medium text-brand-600">
            {t('auth.backToLogin')}
          </Link>
        </p>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout>
      <h1 className="text-2xl font-semibold text-gray-900">{t('auth.forgotPasswordTitle')}</h1>
      <p className="mt-2 text-sm text-gray-500">{t('auth.forgotPasswordHint')}</p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-3">
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder={t('auth.email')}
          required
          autoCapitalize="none"
          autoCorrect="off"
          autoComplete="email"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? 'forgot-password-error' : undefined}
          className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-brand-500"
        />
        {error && (
          <p id="forgot-password-error" role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-brand-600 py-2.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-40"
        >
          {submitting ? t('auth.sendingResetLink') : t('auth.sendResetLink')}
        </button>
      </form>

      <p className="mt-6 text-sm text-gray-500">
        <Link to="/login" className="font-medium text-brand-600">
          {t('auth.backToLogin')}
        </Link>
      </p>
    </AuthLayout>
  )
}
