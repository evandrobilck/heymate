import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useInspection } from '../contexts/InspectionContext'
import { useToast } from '../contexts/ToastContext'
import { useConfirm } from '../contexts/ConfirmContext'
import { formatDate } from '../utils/formatDate'

export default function InspectionCard({ inspection }) {
  const { t, i18n } = useTranslation()
  const { addTask, toggleTask, deleteTask, deleteInspection } = useInspection()
  const showToast = useToast()
  const confirm = useConfirm()
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [expanded, setExpanded] = useState(false)

  const doneCount = inspection.tasks.filter((task) => task.completed).length

  async function handleAddTask(event) {
    event.preventDefault()
    if (!newTaskTitle.trim()) return
    try {
      await addTask(inspection.id, newTaskTitle.trim())
      setNewTaskTitle('')
    } catch (err) {
      console.error(err)
      showToast(t('inspectionPage.taskError'))
    }
  }

  async function handleToggleTask(task) {
    try {
      await toggleTask(task.id, !task.completed)
    } catch (err) {
      console.error(err)
      showToast(t('inspectionPage.taskError'))
    }
  }

  async function handleDeleteTask(taskId) {
    try {
      await deleteTask(taskId)
    } catch (err) {
      console.error(err)
      showToast(t('inspectionPage.taskError'))
    }
  }

  async function handleDeleteInspection() {
    if (!(await confirm(t('inspectionPage.deleteConfirm')))) return
    try {
      await deleteInspection(inspection.id)
    } catch (err) {
      console.error(err)
      showToast(t('inspectionPage.deleteError'))
    }
  }

  return (
    <li className="rounded-xl border border-gray-200 bg-surface p-3">
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className="flex w-full items-center justify-between gap-2 text-left"
      >
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-900">{formatDate(inspection.scheduledDate, i18n.language)}</p>
          {inspection.notes && <p className="mt-0.5 truncate text-xs text-gray-500">{inspection.notes}</p>}
        </div>
        <span className="shrink-0 text-xs font-medium text-gray-500">
          {t('inspectionPage.tasksProgress', { done: doneCount, total: inspection.tasks.length })}
        </span>
      </button>

      {expanded && (
        <div className="mt-3 border-t border-gray-100 pt-3">
          <ul className="space-y-2">
            {inspection.tasks.map((task) => (
              <li key={task.id} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={task.completed}
                  onChange={() => handleToggleTask(task)}
                  className="h-4 w-4 rounded border-gray-300 text-brand-600"
                />
                <span className={`flex-1 text-sm ${task.completed ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
                  {task.title}
                </span>
                <button
                  type="button"
                  onClick={() => handleDeleteTask(task.id)}
                  className="text-xs font-medium text-gray-400 hover:text-red-600"
                >
                  {t('vaultPage.remove')}
                </button>
              </li>
            ))}
            {inspection.tasks.length === 0 && <p className="text-xs text-gray-400">{t('inspectionPage.noTasks')}</p>}
          </ul>

          <form onSubmit={handleAddTask} className="mt-3 flex gap-2">
            <input
              type="text"
              value={newTaskTitle}
              onChange={(event) => setNewTaskTitle(event.target.value)}
              placeholder={t('inspectionPage.taskPlaceholder')}
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
            />
            <button type="submit" className="rounded-lg bg-brand-600 px-3 py-2 text-xs font-medium text-white">
              {t('inspectionPage.addTask')}
            </button>
          </form>

          <div className="mt-3 flex justify-end border-t border-gray-100 pt-2">
            <button
              type="button"
              onClick={handleDeleteInspection}
              className="text-xs font-medium text-gray-400 hover:text-red-600"
            >
              {t('inspectionPage.deleteInspection')}
            </button>
          </div>
        </div>
      )}
    </li>
  )
}
