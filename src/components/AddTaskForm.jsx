import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext'
import { useHouse } from '../contexts/HouseContext'
import { useTasks } from '../contexts/TasksContext'
import { taskRecurrenceOptions } from '../services/mockData'

export default function AddTaskForm({ onClose, task = null }) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const { house } = useHouse()
  const { addTask, updateTask } = useTasks()
  const isEditing = Boolean(task)

  const activeMembers = house.members.filter((member) => !member.leftAt)
  // Include past members already assigned to the task being edited, so
  // editing doesn't silently drop an ex-roommate's assignment.
  const memberOptions = isEditing
    ? [
        ...activeMembers,
        ...task.assigneeIds
          .filter((id) => !activeMembers.some((member) => member.id === id))
          .map((id) => house.members.find((member) => member.id === id))
          .filter(Boolean),
      ]
    : activeMembers

  const [title, setTitle] = useState(task?.title ?? '')
  const [assigneeIds, setAssigneeIds] = useState(task?.assigneeIds ?? [])
  const [recurrence, setRecurrence] = useState(task?.recurrence ?? 'none')
  const [dueDate, setDueDate] = useState(task?.dueDate ?? '')
  const [notify, setNotify] = useState(task?.notify ?? false)

  const isValid = title.trim() !== ''

  function toggleAssignee(memberId) {
    setAssigneeIds((prev) =>
      prev.includes(memberId) ? prev.filter((id) => id !== memberId) : [...prev, memberId]
    )
  }

  function handleSubmit(event) {
    event.preventDefault()
    if (!isValid) return

    const payload = {
      title: title.trim(),
      assigneeIds,
      recurrence,
      dueDate: dueDate || null,
      notify,
    }

    if (isEditing) {
      updateTask(task.id, payload)
    } else {
      addTask({ ...payload, createdBy: user.id })
    }

    onClose()
  }

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">
            {isEditing ? t('tasksPage.editTask') : t('tasksPage.addTask')}
          </h2>
          <button type="button" onClick={onClose} className="text-sm text-gray-400">
            {t('tasksPage.close')}
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="text-xs font-medium text-gray-600">{t('tasksPage.titleLabel')}</label>
            <input
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-purple-500"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-gray-600">{t('tasksPage.assigneeLabel')}</label>
            <p className="mt-0.5 text-xs text-gray-400">{t('tasksPage.assigneeHint')}</p>
            <ul className="mt-1 space-y-2">
              {memberOptions.map((member) => (
                <li key={member.id} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={assigneeIds.includes(member.id)}
                    onChange={() => toggleAssignee(member.id)}
                    className="h-4 w-4 rounded border-gray-300 text-purple-600"
                  />
                  <span className="text-sm text-gray-800">{member.name}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-600">{t('tasksPage.recurrenceLabel')}</label>
            <select
              value={recurrence}
              onChange={(event) => setRecurrence(event.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-purple-500"
            >
              {taskRecurrenceOptions.map((option) => (
                <option key={option} value={option}>
                  {t(`recurrence.${option}`)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-600">{t('tasksPage.dueDateLabel')}</label>
            <input
              type="date"
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-purple-500"
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={notify}
              onChange={(event) => setNotify(event.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-purple-600"
            />
            {t('tasksPage.notifyLabel')}
          </label>

          <button
            type="submit"
            disabled={!isValid}
            className="w-full rounded-lg bg-purple-600 py-2.5 text-sm font-medium text-white disabled:opacity-40"
          >
            {isEditing ? t('billsPage.saveChanges') : t('tasksPage.save')}
          </button>
        </form>
      </div>
    </div>
  )
}
