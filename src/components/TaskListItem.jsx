import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext'
import { useHouse } from '../contexts/HouseContext'
import { useTasks } from '../contexts/TasksContext'
import { formatDate } from '../utils/formatDate'

export default function TaskListItem({ task }) {
  const { t, i18n } = useTranslation()
  const { user } = useAuth()
  const { house } = useHouse()
  const { toggleTaskCompleted } = useTasks()

  const assignee = task.assigneeId ? house.members.find((member) => member.id === task.assigneeId) : null
  const completedByMember = task.completedBy
    ? house.members.find((member) => member.id === task.completedBy)
    : null

  return (
    <li className="flex items-start gap-3 rounded-xl border border-gray-200 bg-white p-3">
      <button
        type="button"
        onClick={() => toggleTaskCompleted(task.id, user.id)}
        aria-label={t('tasksPage.markDone')}
        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
          task.completed ? 'border-purple-600 bg-purple-600 text-white' : 'border-gray-300'
        }`}
      >
        {task.completed && (
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-3 w-3"
          >
            <path d="m5 12 5 5L19 7" />
          </svg>
        )}
      </button>

      <div className="min-w-0 flex-1">
        <p className={`text-sm font-medium ${task.completed ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
          {task.title}
        </p>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-gray-500">
          <span>{assignee ? assignee.name : t('tasksPage.general')}</span>
          {task.recurrence !== 'none' && <span>· {t(`recurrence.${task.recurrence}`)}</span>}
          {!task.completed && task.dueDate && (
            <span>· {t('tasksPage.dueOn', { date: formatDate(task.dueDate, i18n.language) })}</span>
          )}
          {task.notify && <span aria-label={t('tasksPage.notifyOn')}>🔔</span>}
        </div>
        {task.completed && completedByMember && (
          <p className="mt-0.5 text-xs text-green-600">
            {t('tasksPage.completedBy', {
              name: completedByMember.name,
              date: formatDate(task.completedAt, i18n.language),
            })}
          </p>
        )}
      </div>
    </li>
  )
}
