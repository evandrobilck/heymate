import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext'
import AuthLayout from '../components/AuthLayout'

export default function RegisterPage() {
  const { t } = useTranslation()
  const { register } = useAuth()
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [confirmationSent, setConfirmationSent] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      const { needsEmailConfirmation } = await register(email, password, name.trim())
      if (needsEmailConfirmation) {
        setConfirmationSent(true)
      } else {
        navigate('/home')
      }
    } catch (err) {
      console.error(err)
      setError(t('auth.registerError'))
    } finally {
      setSubmitting(false)
    }
  }

  if (confirmationSent) {
    return (
      <AuthLayout>
        <h1 className="text-2xl font-semibold text-gray-900">{t('auth.checkEmailTitle')}</h1>
        <p className="mt-2 text-sm text-gray-500">{t('auth.checkEmailHint', { email })}</p>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout>
      <h1 className="text-2xl font-semibold text-gray-900">{t('auth.register')}</h1>

      <form onSubmit={handleSubmit} className="mt-6 space-y-3">
        <input
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder={t('auth.name')}
          required
          className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-purple-500"
        />
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder={t('auth.email')}
          required
          className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-purple-500"
        />
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder={t('auth.password')}
          required
          minLength={6}
          className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-purple-500"
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-purple-600 py-2.5 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-40"
        >
          {submitting ? t('auth.registering') : t('auth.register')}
        </button>
      </form>

      <p className="mt-6 text-sm text-gray-500">
        {t('auth.haveAccount')}{' '}
        <Link to="/login" className="font-medium text-purple-600">
          {t('auth.login')}
        </Link>
      </p>
    </AuthLayout>
  )
}
