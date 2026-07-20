import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useBills } from '../contexts/BillsContext'
import { useTasks } from '../contexts/TasksContext'
import { getMonthGrid, toDayKey } from '../utils/calendar'
import { getRecurrenceOccurrencesInRange } from '../utils/recurrence'

const WEEKDAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']

export default function HomeCalendarCard() {
  const { t, i18n } = useTranslation()
  const { bills } = useBills()
  const { tasks } = useTasks()

  const today = useMemo(() => new Date(), [])
  const grid = useMemo(() => getMonthGrid(today.getFullYear(), today.getMonth()), [today])
  const rangeStartKey = grid[0]?.dayKey
  const rangeEndKey = grid[grid.length - 1]?.dayKey

  const eventsByDay = useMemo(() => {
    const map = {}
    bills.forEach((bill) => {
      const occurrences = getRecurrenceOccurrencesInRange(
        bill.dueDate,
        bill.recurrence,
        rangeStartKey,
        rangeEndKey,
        bill.recurrenceUntil,
        bill.excludedDates
      )
      occurrences.forEach((day) => {
        if (!map[day]) map[day] = { bill: false, task: false }
        map[day].bill = true
      })
    })
    tasks.forEach((task) => {
      if (task.recurrence && task.recurrence !== 'none') {
        const occurrences = getRecurrenceOccurrencesInRange(task.dueDate, task.recurrence, rangeStartKey, rangeEndKey)
        occurrences.forEach((day) => {
          if (!map[day]) map[day] = { bill: false, task: false }
          map[day].task = true
        })
        return
      }
      const day = task.completed ? task.completedAt : task.dueDate
      if (!day) return
      if (!map[day]) map[day] = { bill: false, task: false }
      map[day].task = true
    })
    return map
  }, [bills, tasks, rangeStartKey, rangeEndKey])

  const monthLabel = new Intl.DateTimeFormat(i18n.language, { year: 'numeric', month: 'long' }).format(today)
  const todayKey = toDayKey(today)

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold capitalize text-gray-900">{monthLabel}</p>
        <Link to="/calendario" className="text-xs font-medium text-brand-600 hover:text-brand-700">
          {t('home.viewFullCalendar')}
        </Link>
      </div>

      <div className="mt-3 grid grid-cols-7 gap-1 text-center text-[10px] font-medium text-gray-400">
        {WEEKDAY_KEYS.map((key) => (
          <span key={key}>{t(`calendarPage.weekday.${key}`)}</span>
        ))}
      </div>

      <div className="mt-1 grid grid-cols-7 gap-1">
        {grid.map((cell) => {
          const events = eventsByDay[cell.dayKey]
          const isToday = cell.dayKey === todayKey

          return (
            <Link
              key={cell.dayKey}
              to="/calendario"
              className={`flex flex-col items-center gap-0.5 rounded-lg py-1.5 text-xs ${
                !cell.inCurrentMonth ? 'text-gray-300' : 'text-gray-700'
              } ${isToday ? 'bg-brand-50 font-semibold text-brand-700' : ''}`}
            >
              <span>{cell.day}</span>
              <span className="flex h-1.5 gap-0.5">
                {events?.bill && <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />}
                {events?.task && <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />}
              </span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
