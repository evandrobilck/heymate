import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useHouse } from '../contexts/HouseContext'
import { NAV_TABS } from './navIcons'

export default function MobileNav() {
  const { t } = useTranslation()
  const { isAdmin } = useHouse()
  const visibleTabs = NAV_TABS.filter((tab) => !tab.adminOnly || isAdmin)

  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 flex border-t border-gray-200 bg-white pb-[env(safe-area-inset-bottom)] md:hidden">
      <ul className="flex w-full justify-between px-1">
        {visibleTabs.map(({ to, labelKey, Icon }) => (
          <li key={to} className="flex-1">
            <NavLink
              to={to}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors ${
                  isActive ? 'text-purple-600' : 'text-gray-400 hover:text-gray-600'
                }`
              }
            >
              <Icon className="h-5 w-5" />
              <span className="leading-none">{t(labelKey)}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
