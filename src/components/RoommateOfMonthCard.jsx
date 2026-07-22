import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useHouse } from '../contexts/HouseContext'
import { useTasks } from '../contexts/TasksContext'
import { mockHallOfFame } from '../services/mockData'
import { computeTaskCountsByMember, formatMonth, getCurrentMonthKey } from '../utils/leaderboard'
import Avatar from './Avatar'

export default function RoommateOfMonthCard() {
  const { t, i18n } = useTranslation()
  const { house } = useHouse()
  const { tasks } = useTasks()
  const [showHallOfFame, setShowHallOfFame] = useState(false)

  const monthKey = getCurrentMonthKey()
  const counts = computeTaskCountsByMember(tasks, monthKey)
  const activeMembers = house.members.filter((member) => !member.leftAt)

  const leaderboard = activeMembers
    .map((member) => ({ member, count: counts[member.id] || 0 }))
    .filter((entry) => entry.count > 0)
    .sort((a, b) => b.count - a.count)

  const topCount = leaderboard[0]?.count ?? 0
  const leaders = leaderboard.filter((entry) => entry.count === topCount)

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-surface">
      <div className="bg-gradient-to-br from-brand-600 to-brand-800 px-5 py-6 text-center text-white">
        <p className="text-sm font-medium text-white/90">🏆 {t('roommateOfMonth.title')}</p>
        <p className="text-xs text-white/70">{formatMonth(monthKey, i18n.language)}</p>

        {leaders.length === 0 && <p className="mt-4 text-sm text-white/90">{t('roommateOfMonth.empty')}</p>}

        {leaders.length === 1 && (
          <div className="mt-4 flex flex-col items-center gap-2">
            <Avatar name={leaders[0].member.name} avatarUrl={leaders[0].member.avatarUrl} size="xl" />
            <p className="text-base font-semibold">{leaders[0].member.name}</p>
            <p className="text-sm text-white/90">{t('roommateOfMonth.taskCount', { count: leaders[0].count })}</p>
          </div>
        )}

        {leaders.length > 1 && (
          <div className="mt-4">
            <p className="text-xs font-medium text-amber-300">{t('roommateOfMonth.tie')}</p>
            <div className="mt-3 flex flex-wrap justify-center gap-4">
              {leaders.map(({ member, count }) => (
                <div key={member.id} className="flex flex-col items-center gap-1.5">
                  <Avatar name={member.name} avatarUrl={member.avatarUrl} size="lg" />
                  <p className="text-sm font-medium">{member.name}</p>
                  <p className="text-xs text-white/90">{t('roommateOfMonth.taskCount', { count })}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="p-3 text-center">
        <button
          type="button"
          onClick={() => setShowHallOfFame((prev) => !prev)}
          className="text-xs font-medium text-brand-600"
        >
          {showHallOfFame ? t('roommateOfMonth.hideHallOfFame') : t('roommateOfMonth.viewHallOfFame')}
        </button>

        {showHallOfFame && (
          <ul className="mt-2 space-y-2 border-t border-gray-100 pt-2 text-left">
            {mockHallOfFame.length === 0 && (
              <li className="text-sm text-gray-400">{t('roommateOfMonth.empty')}</li>
            )}
            {mockHallOfFame.map((entry) => {
              const winner = house.members.find((member) => member.id === entry.winnerId)
              return (
                <li key={entry.month} className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">{formatMonth(entry.month, i18n.language)}</span>
                  <span className="font-medium text-gray-900">
                    {winner?.name} · {t('roommateOfMonth.taskCount', { count: entry.taskCount })}
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
