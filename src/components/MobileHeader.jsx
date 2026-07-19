import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext'
import Avatar from './Avatar'

export default function MobileHeader() {
  const { t } = useTranslation()
  const { user } = useAuth()

  return (
    <header className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3 md:hidden">
      <img src="/logo-purple.svg" alt={t('app.name')} className="h-6 w-auto" />
      <Link to="/perfil" aria-label={t('profilePage.title')}>
        <Avatar name={user.name} avatarUrl={user.avatarUrl} size="sm" />
      </Link>
    </header>
  )
}
