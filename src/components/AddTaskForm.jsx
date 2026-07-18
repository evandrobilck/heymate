import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext'
import { useHouse } from '../contexts/HouseContext'
import { useTasks } from '../contexts/TasksContext'
import { taskRecurrenceOptions } from '../services/mockData'

export default function AddTaskForm({ onClose }) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const { house } = useHouse()
  const { addTask } = useTasks()

  const activeMembers = house.members.filter((member) => !member.leftAt)

  const [title, setTitle] = useState('')
  const [assigneeId, setAssigneeId] = useState('')
  const [recurrence, setRecurrence] = useState('none')
  const [dueDate, setDueDate] = useState('')
  const [notify, setNotify] = useState(false)

  const isValid = title.trim() !== ''

  function handleSubmit(event) {
    event.preventDefault()
    if (!isValid) return

    addTask({
      title: title.trim(),
      assigneeId: assigneeId || null,
      recurrence,
      dueDate: dueDate || null,
      notify,
      createdBy: user.id,
    })

    onClose()
  }

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">{t('tasksPage.addTask')}</h2>
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
            <select
              value={assigneeId}
              onChange={(event) => setAssigneeId(event.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-purple-500"
            >
              <option value="">{t('tasksPage.general')}</option>
              {activeMembers.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </select>
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
            {t('tasksPage.save')}
          </button>
        </form>
      </div>
    </div>
  )
}
