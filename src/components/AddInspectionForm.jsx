import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext'
import { useInspection } from '../contexts/InspectionContext'
import { useToast } from '../contexts/ToastContext'
import Modal from './Modal'

export default function AddInspectionForm({ onClose }) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const { addInspection } = useInspection()
  const showToast = useToast()

  const [scheduledDate, setScheduledDate] = useState('')
  const [notes, setNotes] = useState('')
  const [taskTitles, setTaskTitles] = useState([])
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const isValid = scheduledDate !== ''

  function handleAddTaskTitle(event) {
    event.preventDefault()
    if (!newTaskTitle.trim()) return
    setTaskTitles((prev) => [...prev, newTaskTitle.trim()])
    setNewTaskTitle('')
  }

  function handleRemoveTaskTitle(index) {
    setTaskTitles((prev) => prev.filter((_, i) => i !== index))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (!isValid) return
    setSubmitting(true)
    try {
      await addInspection({ scheduledDate, notes: notes.trim(), createdBy: user.id, taskTitles })
      onClose()
    } catch (err) {
      console.error(err)
      showToast(t('inspectionPage.addError'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal>
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-900">{t('inspectionPage.addInspection')}</h2>
        <button type="button" onClick={onClose} className="text-sm text-gray-400">
          {t('tasksPage.close')}
        </button>
      </div>

      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <div>
          <label className="text-xs font-medium text-gray-600">{t('inspectionPage.dateLabel')}</label>
          <input
            type="date"
            value={scheduledDate}
            onChange={(event) => setScheduledDate(event.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
          />
        </div>

        <div>
          <label className="text-xs font-medium text-gray-600">{t('inspectionPage.notesLabel')}</label>
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            rows={2}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
          />
        </div>

        <div>
          <label className="text-xs font-medium text-gray-600">{t('inspectionPage.checklistLabel')}</label>
          <p className="mt-0.5 text-xs text-gray-400">{t('inspectionPage.checklistHint')}</p>

          {taskTitles.length > 0 && (
            <ul className="mt-2 space-y-1.5">
              {taskTitles.map((title, index) => (
                <li
                  key={`${title}-${index}`}
                  className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-700"
                >
                  <span className="flex-1">{title}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveTaskTitle(index)}
                    className="text-xs font-medium text-gray-400 hover:text-red-600"
                  >
                    {t('vaultPage.remove')}
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-2 flex gap-2">
            <input
              type="text"
              value={newTaskTitle}
              onChange={(event) => setNewTaskTitle(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') handleAddTaskTitle(event)
              }}
              placeholder={t('inspectionPage.taskPlaceholder')}
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
            />
            <button
              type="button"
              onClick={handleAddTaskTitle}
              className="rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-600 hover:border-brand-400 hover:text-brand-600"
            >
              {t('inspectionPage.addTask')}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={!isValid || submitting}
          className="w-full rounded-lg bg-brand-600 py-2.5 text-sm font-medium text-white disabled:opacity-40"
        >
          {submitting ? t('inspectionPage.saving') : t('inspectionPage.save')}
        </button>
      </form>
    </Modal>
  )
}
