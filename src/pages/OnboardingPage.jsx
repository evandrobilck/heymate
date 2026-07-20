import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext'
import { useHouse } from '../contexts/HouseContext'
import AuthLayout from '../components/AuthLayout'

export default function OnboardingPage() {
  const { t } = useTranslation()
  const { logout } = useAuth()
  const { createHouse, joinHouse } = useHouse()
  const navigate = useNavigate()

  const [mode, setMode] = useState('create')
  const [houseName, setHouseName] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleCreate(event) {
    event.preventDefault()
    if (!houseName.trim()) return
    setSubmitting(true)
    setError('')
    try {
      await createHouse(houseName.trim())
      navigate('/home')
    } catch (err) {
      console.error(err)
      setError(t('onboarding.createError'))
    } finally {
      setSubmitting(false)
    }
  }

  async function handleJoin(event) {
    event.preventDefault()
    if (!inviteCode.trim()) return
    setSubmitting(true)
    setError('')
    try {
      await joinHouse(inviteCode.trim())
      navigate('/home')
    } catch (err) {
      console.error(err)
      setError(t('onboarding.invalidCode'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setMode('create')}
          className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium ${
            mode === 'create' ? 'border-brand-500 bg-brand-50 text-brand-700 dark:text-white' : 'border-gray-200 text-gray-600'
          }`}
        >
          {t('onboarding.createTab')}
        </button>
        <button
          type="button"
          onClick={() => setMode('join')}
          className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium ${
            mode === 'join' ? 'border-brand-500 bg-brand-50 text-brand-700 dark:text-white' : 'border-gray-200 text-gray-600'
          }`}
        >
          {t('onboarding.joinTab')}
        </button>
      </div>

      {mode === 'create' ? (
        <form onSubmit={handleCreate} className="mt-6 space-y-3">
          <h1 className="text-2xl font-semibold text-gray-900">{t('onboarding.createTitle')}</h1>
          <p className="text-sm text-gray-500">{t('onboarding.createHint')}</p>
          <input
            type="text"
            value={houseName}
            onChange={(event) => setHouseName(event.target.value)}
            placeholder={t('onboarding.houseNamePlaceholder')}
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-brand-500"
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-brand-600 py-2.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-40"
          >
            {t('onboarding.createButton')}
          </button>
        </form>
      ) : (
        <form onSubmit={handleJoin} className="mt-6 space-y-3">
          <h1 className="text-2xl font-semibold text-gray-900">{t('onboarding.joinTitle')}</h1>
          <p className="text-sm text-gray-500">{t('onboarding.joinHint')}</p>
          <input
            type="text"
            value={inviteCode}
            onChange={(event) => setInviteCode(event.target.value)}
            placeholder={t('onboarding.codePlaceholder')}
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm uppercase outline-none focus:border-brand-500"
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-brand-600 py-2.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-40"
          >
            {t('onboarding.joinButton')}
          </button>
        </form>
      )}

      <button type="button" onClick={logout} className="mt-6 text-xs text-gray-400 hover:text-gray-600">
        {t('auth.logout')}
      </button>
    </AuthLayout>
  )
}
