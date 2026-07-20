import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext'
import { useTasks } from '../contexts/TasksContext'
import { formatDate } from '../utils/formatDate'

export default function UpcomingTasksCard() {
  const { t, i18n } = useTranslation()
  const { user } = useAuth()
  const { tasks } = useTasks()

  const upcoming = useMemo(() => {
    const involved = tasks.filter(
      (task) => !task.completed && (task.assigneeIds.length === 0 || task.assigneeIds.includes(user.id))
    )
    const dated = involved.filter((task) => task.dueDate).sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    const undated = involved.filter((task) => !task.dueDate)
    return [...dated, ...undated].slice(0, 3)
  }, [tasks, user.id])

  return (
    <div className="rounded-xl border border-gray-200 bg-surface p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-900">{t('home.upcomingTasksTitle')}</p>
        <Link to="/tarefas" className="text-xs font-medium text-brand-600 hover:text-brand-700">
          {t('home.viewUpcomingTasks')}
        </Link>
      </div>

      {upcoming.length === 0 ? (
        <p className="mt-3 text-sm text-gray-400">🎉 {t('home.noUpcomingTasks')}</p>
      ) : (
        <ul className="mt-3 space-y-3">
          {upcoming.map((task) => (
            <li key={task.id}>
              <Link to="/tarefas" className="flex items-center gap-3">
                <span className="h-2 w-2 shrink-0 rounded-full bg-blue-500" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-900">{task.title}</p>
                  <p className="text-xs text-gray-500">
                    {task.dueDate
                      ? t('tasksPage.dueOn', { date: formatDate(task.dueDate, i18n.language) })
                      : t('home.noDueDate')}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
