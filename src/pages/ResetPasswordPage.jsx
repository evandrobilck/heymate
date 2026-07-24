import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext'
import AuthLayout from '../components/AuthLayout'

export default function ResetPasswordPage() {
  const { t } = useTranslation()
  const { updatePassword } = useAuth()
  const navigate = useNavigate()

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError(t('auth.passwordsDontMatch'))
      return
    }

    setSubmitting(true)
    try {
      await updatePassword(password)
      setDone(true)
      setTimeout(() => navigate('/home'), 1500)
    } catch (err) {
      console.error(err)
      setError(t('auth.updatePasswordError'))
    } finally {
      setSubmitting(false)
    }
  }

  if (done) {
    return (
      <AuthLayout>
        <h1 className="text-2xl font-semibold text-gray-900">{t('auth.passwordUpdated')}</h1>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout>
      <h1 className="text-2xl font-semibold text-gray-900">{t('auth.newPasswordTitle')}</h1>

      <form onSubmit={handleSubmit} className="mt-6 space-y-3">
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder={t('auth.newPassword')}
          required
          minLength={6}
          autoCapitalize="none"
          autoCorrect="off"
          autoComplete="new-password"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? 'reset-password-error' : undefined}
          className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-brand-500"
        />
        <input
          type="password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          placeholder={t('auth.confirmPassword')}
          required
          minLength={6}
          autoCapitalize="none"
          autoCorrect="off"
          autoComplete="new-password"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? 'reset-password-error' : undefined}
          className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-brand-500"
        />
        {error && (
          <p id="reset-password-error" role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-brand-600 py-2.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-40"
        >
          {submitting ? t('auth.updatingPassword') : t('auth.updatePassword')}
        </button>
      </form>
    </AuthLayout>
  )
}
