import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useHouse } from '../contexts/HouseContext'
import { NAV_TABS, MoreIcon } from './navIcons'

// Keep the bar itself to the 4 most-used tabs — everything else lives
// behind "Mais" so the bar stays thumb-friendly instead of cramming in
// all 8 destinations.
const PRIMARY_PATHS = ['/home', '/contas', '/tarefas', '/compras']

export default function MobileNav() {
  const { t } = useTranslation()
  const { isAdmin } = useHouse()
  const location = useLocation()
  const [showMore, setShowMore] = useState(false)
  const visibleTabs = NAV_TABS.filter((tab) => !tab.adminOnly || isAdmin)

  const primaryTabs = visibleTabs.filter((tab) => PRIMARY_PATHS.includes(tab.to))
  const moreTabs = visibleTabs.filter((tab) => !PRIMARY_PATHS.includes(tab.to))
  const isMoreActive = moreTabs.some((tab) => location.pathname === tab.to)

  return (
    <>
      {showMore && (
        <>
          <button
            type="button"
            aria-label={t('tasksPage.close')}
            className="fixed inset-0 z-10 md:hidden"
            onClick={() => setShowMore(false)}
          />
          <div className="fixed inset-x-3 bottom-[4.75rem] z-20 rounded-2xl border border-gray-200 bg-surface p-2 shadow-lg md:hidden">
            <ul className="grid grid-cols-4 gap-1">
              {moreTabs.map(({ to, labelKey, Icon }) => (
                <li key={to}>
                  <NavLink
                    to={to}
                    onClick={() => setShowMore(false)}
                    className={({ isActive }) =>
                      `flex flex-col items-center gap-1 rounded-xl px-2 py-3 text-[10px] font-medium ${
                        isActive ? 'bg-brand-50 text-brand-600 dark:text-white' : 'text-gray-500 hover:bg-gray-50'
                      }`
                    }
                  >
                    <Icon className="h-5 w-5" />
                    <span className="leading-none">{t(labelKey)}</span>
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}

      <nav className="fixed inset-x-0 bottom-0 z-10 flex border-t border-gray-200 bg-surface pb-[env(safe-area-inset-bottom)] md:hidden">
        <ul className="flex w-full justify-between px-1">
          {primaryTabs.map(({ to, labelKey, Icon }) => (
            <li key={to} className="flex-1">
              <NavLink
                to={to}
                onClick={() => setShowMore(false)}
                className={({ isActive }) =>
                  `flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors ${
                    isActive ? 'text-brand-600 dark:text-white' : 'text-gray-400 hover:text-gray-600'
                  }`
                }
              >
                <Icon className="h-5 w-5" />
                <span className="leading-none">{t(labelKey)}</span>
              </NavLink>
            </li>
          ))}
          {moreTabs.length > 0 && (
            <li className="flex-1">
              <button
                type="button"
                onClick={() => setShowMore((prev) => !prev)}
                className={`flex w-full flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors ${
                  showMore || isMoreActive ? 'text-brand-600 dark:text-white' : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                <MoreIcon className="h-5 w-5" />
                <span className="leading-none">{t('nav.more')}</span>
              </button>
            </li>
          )}
        </ul>
      </nav>
    </>
  )
}
