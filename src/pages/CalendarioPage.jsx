import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useBills } from '../contexts/BillsContext'
import { useTasks } from '../contexts/TasksContext'
import { getMonthGrid, toDayKey } from '../utils/calendar'
import { formatCurrency } from '../utils/formatCurrency'
import { formatDate } from '../utils/formatDate'

const WEEKDAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']

export default function CalendarioPage() {
  const { t, i18n } = useTranslation()
  const { bills } = useBills()
  const { tasks } = useTasks()

  const today = useMemo(() => new Date(), [])
  const [cursor, setCursor] = useState({ year: today.getFullYear(), month: today.getMonth() })
  const [selectedDay, setSelectedDay] = useState(toDayKey(today))

  const eventsByDay = useMemo(() => {
    const map = {}
    bills.forEach((bill) => {
      if (!map[bill.dueDate]) map[bill.dueDate] = []
      map[bill.dueDate].push({ type: 'bill', id: bill.id, title: bill.title, amount: bill.totalAmount })
    })
    tasks.forEach((task) => {
      const day = task.completed ? task.completedAt : task.dueDate
      if (!day) return
      if (!map[day]) map[day] = []
      map[day].push({ type: 'task', id: task.id, title: task.title, completed: task.completed })
    })
    return map
  }, [bills, tasks])

  const grid = useMemo(() => getMonthGrid(cursor.year, cursor.month), [cursor])
  const monthLabel = new Intl.DateTimeFormat(i18n.language, { year: 'numeric', month: 'long' }).format(
    new Date(cursor.year, cursor.month, 1)
  )

  function goToPrevMonth() {
    setCursor((prev) => {
      const date = new Date(prev.year, prev.month - 1, 1)
      return { year: date.getFullYear(), month: date.getMonth() }
    })
  }

  function goToNextMonth() {
    setCursor((prev) => {
      const date = new Date(prev.year, prev.month + 1, 1)
      return { year: date.getFullYear(), month: date.getMonth() }
    })
  }

  const selectedEvents = eventsByDay[selectedDay] ?? []

  return (
    <div>
      <h1 className="text-xl font-semibold text-gray-900">{t('nav.calendar')}</h1>

      <div className="mt-4 flex gap-8">
        <div className="w-80 shrink-0">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={goToPrevMonth}
              aria-label={t('calendarPage.prevMonth')}
              className="px-2 py-1 text-lg text-gray-400 hover:text-gray-600"
            >
              ‹
            </button>
            <p className="text-sm font-semibold capitalize text-gray-900">{monthLabel}</p>
            <button
              type="button"
              onClick={goToNextMonth}
              aria-label={t('calendarPage.nextMonth')}
              className="px-2 py-1 text-lg text-gray-400 hover:text-gray-600"
            >
              ›
            </button>
          </div>

          <div className="mt-3 grid grid-cols-7 gap-1 text-center text-[10px] font-medium text-gray-400">
            {WEEKDAY_KEYS.map((key) => (
              <span key={key}>{t(`calendarPage.weekday.${key}`)}</span>
            ))}
          </div>

          <div className="mt-1 grid grid-cols-7 gap-1">
            {grid.map((cell) => {
              const events = eventsByDay[cell.dayKey] ?? []
              const hasBill = events.some((event) => event.type === 'bill')
              const hasTask = events.some((event) => event.type === 'task')
              const isSelected = cell.dayKey === selectedDay
              const isToday = cell.dayKey === toDayKey(today)

              return (
                <button
                  key={cell.dayKey}
                  type="button"
                  onClick={() => setSelectedDay(cell.dayKey)}
                  className={`flex flex-col items-center gap-0.5 rounded-lg py-1.5 text-xs ${
                    !cell.inCurrentMonth ? 'text-gray-300' : 'text-gray-700'
                  } ${isSelected ? 'bg-purple-600 text-white' : isToday ? 'bg-purple-50' : ''}`}
                >
                  <span>{cell.day}</span>
                  <span className="flex h-1.5 gap-0.5">
                    {hasBill && (
                      <span className={`h-1.5 w-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-purple-500'}`} />
                    )}
                    {hasTask && (
                      <span className={`h-1.5 w-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-blue-500'}`} />
                    )}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        <div className="flex-1">
          <p className="text-sm font-semibold text-gray-900">{formatDate(selectedDay, i18n.language)}</p>
          {selectedEvents.length === 0 ? (
            <p className="mt-2 text-sm text-gray-400">{t('calendarPage.noEvents')}</p>
          ) : (
            <ul className="mt-2 space-y-2">
              {selectedEvents.map((event) => (
                <li
                  key={`${event.type}-${event.id}`}
                  className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3"
                >
                  <span
                    className={`h-2 w-2 shrink-0 rounded-full ${event.type === 'bill' ? 'bg-purple-500' : 'bg-blue-500'}`}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-900">{event.title}</p>
                    <p className="text-xs text-gray-500">
                      {event.type === 'bill'
                        ? t('calendarPage.billDue')
                        : event.completed
                          ? t('calendarPage.taskDone')
                          : t('calendarPage.taskDue')}
                    </p>
                  </div>
                  {event.type === 'bill' && (
                    <span className="text-sm font-semibold text-gray-900">
                      {formatCurrency(event.amount, i18n.language)}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
