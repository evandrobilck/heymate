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
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <p className="text-sm font-semibold text-gray-900">🏆 {t('roommateOfMonth.title')}</p>
      <p className="text-xs text-gray-500">{formatMonth(monthKey, i18n.language)}</p>

      {leaders.length === 0 && <p className="mt-3 text-sm text-gray-400">{t('roommateOfMonth.empty')}</p>}

      {leaders.length === 1 && (
        <div className="mt-3 flex items-center gap-3">
          <Avatar name={leaders[0].member.name} avatarUrl={leaders[0].member.avatarUrl} />
          <div>
            <p className="text-sm font-medium text-gray-900">{leaders[0].member.name}</p>
            <p className="text-xs text-gray-500">
              {t('roommateOfMonth.taskCount', { count: leaders[0].count })}
            </p>
          </div>
        </div>
      )}

      {leaders.length > 1 && (
        <div className="mt-3 space-y-2">
          <p className="text-xs font-medium text-amber-600">{t('roommateOfMonth.tie')}</p>
          {leaders.map(({ member, count }) => (
            <div key={member.id} className="flex items-center gap-3">
              <Avatar name={member.name} avatarUrl={member.avatarUrl} size="sm" />
              <div>
                <p className="text-sm font-medium text-gray-900">{member.name}</p>
                <p className="text-xs text-gray-500">{t('roommateOfMonth.taskCount', { count })}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={() => setShowHallOfFame((prev) => !prev)}
        className="mt-3 text-xs font-medium text-purple-600"
      >
        {showHallOfFame ? t('roommateOfMonth.hideHallOfFame') : t('roommateOfMonth.viewHallOfFame')}
      </button>

      {showHallOfFame && (
        <ul className="mt-2 space-y-2 border-t border-gray-100 pt-2">
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
  )
}
