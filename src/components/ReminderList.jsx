import { useTranslation } from 'react-i18next'

const CHANNELS = ['email', 'push', 'both']

export default function ReminderList({ reminders, onChange }) {
  const { t } = useTranslation()

  function updateReminder(index, patch) {
    onChange(reminders.map((reminder, i) => (i === index ? { ...reminder, ...patch } : reminder)))
  }

  function removeReminder(index) {
    onChange(reminders.filter((_, i) => i !== index))
  }

  function addReminder() {
    onChange([...reminders, { channel: 'email', daysBefore: 0, timeOfDay: '08:00' }])
  }

  return (
    <div className="space-y-2">
      {reminders.map((reminder, index) => (
        <div key={index} className="flex flex-wrap items-center gap-2">
          <select
            value={reminder.channel}
            onChange={(event) => updateReminder(index, { channel: event.target.value })}
            className="rounded-lg border border-gray-300 px-2 py-1.5 text-xs outline-none focus:border-brand-500"
          >
            {CHANNELS.map((channel) => (
              <option key={channel} value={channel} className="text-black">
                {t(`reminders.channel.${channel}`)}
              </option>
            ))}
          </select>
          <input
            type="number"
            min="0"
            value={reminder.daysBefore}
            onChange={(event) => updateReminder(index, { daysBefore: Number(event.target.value) || 0 })}
            className="w-14 rounded-lg border border-gray-300 px-2 py-1.5 text-xs outline-none focus:border-brand-500"
          />
          <span className="shrink-0 text-xs text-gray-500">{t('reminders.daysBefore')}</span>
          <input
            type="time"
            value={reminder.timeOfDay}
            onChange={(event) => updateReminder(index, { timeOfDay: event.target.value })}
            className="rounded-lg border border-gray-300 px-2 py-1.5 text-xs outline-none focus:border-brand-500"
          />
          <button
            type="button"
            onClick={() => removeReminder(index)}
            aria-label={t('vaultPage.remove')}
            className="ml-auto shrink-0 text-gray-400 hover:text-red-600"
          >
            ✕
          </button>
        </div>
      ))}

      <button type="button" onClick={addReminder} className="text-xs font-medium text-brand-600 hover:text-brand-700">
        + {t('reminders.addReminder')}
      </button>
    </div>
  )
}
