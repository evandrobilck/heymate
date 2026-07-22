import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext'
import { useHouse } from '../contexts/HouseContext'
import { useTasks } from '../contexts/TasksContext'
import { taskRecurrenceOptions } from '../services/mockData'
import Modal from './Modal'
import ReminderList from './ReminderList'

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
  const [reminders, setReminders] = useState(task?.reminders ?? [])

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
      reminders,
    }

    if (isEditing) {
      updateTask(task.id, payload)
    } else {
      addTask({ ...payload, createdBy: user.id })
    }

    onClose()
  }

  return (
    <Modal>
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
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
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
                    className="h-4 w-4 rounded border-gray-300 text-brand-600"
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
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
            >
              {taskRecurrenceOptions.map((option) => (
                <option key={option} value={option} className="text-black">
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
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-gray-600">{t('reminders.label')}</label>
            <p className="mt-0.5 text-xs text-gray-400">{t('reminders.taskHint')}</p>
            <div className="mt-2">
              <ReminderList reminders={reminders} onChange={setReminders} />
            </div>
          </div>

          <button
            type="submit"
            disabled={!isValid}
            className="w-full rounded-lg bg-brand-600 py-2.5 text-sm font-medium text-white disabled:opacity-40"
          >
            {isEditing ? t('billsPage.saveChanges') : t('tasksPage.save')}
          </button>
        </form>
    </Modal>
  )
}
