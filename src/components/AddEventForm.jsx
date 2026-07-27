import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext'
import { useCalendarEvents } from '../contexts/CalendarEventsContext'
import { useToast } from '../contexts/ToastContext'
import Modal from './Modal'

export default function AddEventForm({ defaultDate, onClose }) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const { addEvent } = useCalendarEvents()
  const showToast = useToast()

  const [title, setTitle] = useState('')
  const [eventDate, setEventDate] = useState(defaultDate ?? '')
  const [eventTime, setEventTime] = useState('')
  const [location, setLocation] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const isValid = title.trim() !== '' && eventDate !== ''

  async function handleSubmit(event) {
    event.preventDefault()
    if (!isValid) return
    setSubmitting(true)
    try {
      await addEvent({
        title: title.trim(),
        eventDate,
        eventTime,
        location: location.trim(),
        notes: notes.trim(),
        createdBy: user.id,
      })
      onClose()
    } catch (err) {
      console.error(err)
      showToast(t('calendarPage.eventAddError'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal>
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-900">{t('calendarPage.createEvent')}</h2>
        <button type="button" onClick={onClose} className="text-sm text-gray-400">
          {t('tasksPage.close')}
        </button>
      </div>

      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <div>
          <label className="text-xs font-medium text-gray-600">{t('calendarPage.eventTitleLabel')}</label>
          <input
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder={t('calendarPage.eventTitlePlaceholder')}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
          />
        </div>

        <div className="flex gap-3">
          <div className="flex-1">
            <label className="text-xs font-medium text-gray-600">{t('calendarPage.eventDateLabel')}</label>
            <input
              type="date"
              value={eventDate}
              onChange={(event) => setEventDate(event.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
            />
          </div>
          <div className="flex-1">
            <label className="text-xs font-medium text-gray-600">{t('calendarPage.eventTimeLabel')}</label>
            <input
              type="time"
              value={eventTime}
              onChange={(event) => setEventTime(event.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-gray-600">{t('calendarPage.eventLocationLabel')}</label>
          <input
            type="text"
            value={location}
            onChange={(event) => setLocation(event.target.value)}
            placeholder={t('calendarPage.eventLocationPlaceholder')}
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
