import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext'
import { useHouse } from '../contexts/HouseContext'
import { useTasks } from '../contexts/TasksContext'
import { useToast } from '../contexts/ToastContext'
import { useConfirm } from '../contexts/ConfirmContext'
import { formatDate } from '../utils/formatDate'
import AddTaskForm from './AddTaskForm'

export default function TaskListItem({ task }) {
  const { t, i18n } = useTranslation()
  const { user } = useAuth()
  const { house } = useHouse()
  const { markTaskDone, markTaskUndone, deleteTask } = useTasks()
  const showToast = useToast()
  const confirm = useConfirm()
  const [pickingCompleters, setPickingCompleters] = useState(false)
  const [completedByIds, setCompletedByIds] = useState([user.id])
  const [editing, setEditing] = useState(false)

  const activeMembers = house.members.filter((member) => !member.leftAt)
  const assignees = task.assigneeIds
    .map((id) => house.members.find((member) => member.id === id))
    .filter(Boolean)
  const assigneeLabel = assignees.length > 0 ? assignees.map((member) => member.name).join(', ') : t('tasksPage.general')
  const completedByMembers = task.completedByIds
    .map((id) => house.members.find((member) => member.id === id))
    .filter(Boolean)

  function toggleCompleter(memberId) {
    setCompletedByIds((prev) =>
      prev.includes(memberId) ? prev.filter((id) => id !== memberId) : [...prev, memberId]
    )
  }

  function handleCircleClick() {
    if (task.completed) {
      markTaskUndone(task.id)
    } else {
      setCompletedByIds([user.id])
      setPickingCompleters(true)
    }
  }

  function handleConfirmDone(event) {
    event.preventDefault()
    if (completedByIds.length === 0) return
    markTaskDone(task.id, completedByIds)
    setPickingCompleters(false)
  }

  async function handleDelete() {
    if (!(await confirm(t('tasksPage.deleteConfirm')))) return
    try {
      await deleteTask(task.id)
    } catch (err) {
      console.error(err)
      showToast(t('tasksPage.deleteError'))
    }
  }

  return (
    <li className="rounded-xl border border-gray-200 bg-surface p-3">
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={handleCircleClick}
          aria-label={t('tasksPage.markDone')}
          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
            task.completed ? 'border-brand-600 bg-brand-600 text-white' : 'border-gray-300'
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
            <span>{assigneeLabel}</span>
            {task.recurrence !== 'none' && <span>· {t(`recurrence.${task.recurrence}`)}</span>}
            {!task.completed && task.dueDate && (
              <span>· {t('tasksPage.dueOn', { date: formatDate(task.dueDate, i18n.language) })}</span>
            )}
            {task.reminders.length > 0 && (
              <span aria-label={t('reminders.label')}>🔔 {task.reminders.length}</span>
            )}
          </div>
          {task.completed && completedByMembers.length > 0 && (
            <p className="mt-0.5 text-xs text-green-600">
              {t('tasksPage.completedBy', {
                name: completedByMembers.map((member) => member.name).join(', '),
                date: formatDate(task.completedAt, i18n.language),
              })}
            </p>
          )}
        </div>
      </div>

      {pickingCompleters && (
        <form onSubmit={handleConfirmDone} className="mt-3 border-t border-gray-100 pt-3">
          <p className="text-xs font-medium text-gray-600">{t('tasksPage.whoCompleted')}</p>
          <ul className="mt-2 space-y-2">
            {activeMembers.map((member) => (
              <li key={member.id} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={completedByIds.includes(member.id)}
                  onChange={() => toggleCompleter(member.id)}
                  className="h-4 w-4 rounded border-gray-300 text-brand-600"
                />
                <span className="text-sm text-gray-800">{member.name}</span>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex gap-2">
            <button
              type="submit"
              disabled={completedByIds.length === 0}
              className="flex-1 rounded-lg bg-brand-600 py-2 text-xs font-medium text-white disabled:opacity-40"
            >
              {t('tasksPage.confirmDone')}
            </button>
            <button
              type="button"
              onClick={() => setPickingCompleters(false)}
              className="flex-1 rounded-lg border border-gray-300 py-2 text-xs font-medium text-gray-600"
            >
              {t('vaultPage.cancel')}
            </button>
          </div>
        </form>
      )}

      {!pickingCompleters && (
        <div className="mt-2 flex justify-end gap-3 border-t border-gray-100 pt-2">
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="text-xs font-medium text-gray-400 hover:text-brand-600"
          >
            {t('vaultPage.edit')}
          </button>
          <button
            type="button"
            onClick={handleDelete}
            className="text-xs font-medium text-gray-400 hover:text-red-600"
          >
            {t('vaultPage.remove')}
          </button>
        </div>
      )}

      {editing && <AddTaskForm task={task} onClose={() => setEditing(false)} />}
    </li>
  )
}
