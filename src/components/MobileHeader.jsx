import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext'

export default function MobileHeader() {
  const { t } = useTranslation()
  const { logout } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  return (
    <header className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3 md:hidden">
      <p className="text-base font-semibold text-purple-600">{t('app.name')}</p>
      <button type="button" onClick={handleLogout} className="text-xs font-medium text-gray-400 hover:text-gray-600">
        {t('auth.logout')}
      </button>
    </header>
  )
}
