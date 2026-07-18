import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext'
import { useHouse } from '../contexts/HouseContext'
import Avatar from './Avatar'
import { NAV_TABS } from './navIcons'

export default function Sidebar() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const { house } = useHouse()

  return (
    <nav className="hidden h-svh w-60 shrink-0 flex-col border-r border-gray-200 bg-white md:flex">
      <div className="px-5 py-6">
        <p className="text-lg font-semibold text-purple-600">{t('app.name')}</p>
        <p className="mt-0.5 truncate text-xs text-gray-400">{house.name}</p>
      </div>

      <ul className="flex-1 space-y-1 px-3">
        {NAV_TABS.map(({ to, labelKey, Icon }) => (
          <li key={to}>
            <NavLink
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive ? 'bg-purple-50 text-purple-700' : 'text-gray-600 hover:bg-gray-50'
                }`
              }
            >
              <Icon className="h-5 w-5" />
              {t(labelKey)}
            </NavLink>
          </li>
        ))}
      </ul>

      <NavLink
        to="/perfil"
        className={({ isActive }) =>
          `flex items-center gap-3 border-t border-gray-100 px-5 py-4 ${isActive ? 'bg-purple-50' : 'hover:bg-gray-50'}`
        }
      >
        <Avatar name={user.name} avatarUrl={user.avatarUrl} size="sm" />
        <p className="truncate text-sm font-medium text-gray-700">{user.name}</p>
      </NavLink>
    </nav>
  )
}
