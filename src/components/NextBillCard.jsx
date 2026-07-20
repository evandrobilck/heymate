import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useHouse } from '../contexts/HouseContext'
import { useBills } from '../contexts/BillsContext'
import { billCategories } from '../services/mockData'
import { toDayKey } from '../utils/calendar'
import { getNextOccurrenceOnOrAfter } from '../utils/recurrence'
import { formatCurrency } from '../utils/formatCurrency'
import { formatDate } from '../utils/formatDate'

export default function NextBillCard() {
  const { t, i18n } = useTranslation()
  const { house } = useHouse()
  const { bills } = useBills()

  const next = useMemo(() => {
    const todayKey = toDayKey(new Date())

    const candidates = bills
      .filter((bill) => bill.participantIds.some((id) => !bill.shares[id].paid))
      .map((bill) => {
        const date =
          bill.recurrence === 'none'
            ? bill.dueDate
            : getNextOccurrenceOnOrAfter(bill.dueDate, bill.recurrence, todayKey, bill.recurrenceUntil, bill.excludedDates)
        return date ? { bill, date, overdue: date < todayKey } : null
      })
      .filter(Boolean)
      .sort((a, b) => a.date.localeCompare(b.date))

    return candidates[0] ?? null
  }, [bills])

  const category = next && billCategories.find((cat) => cat.id === next.bill.category)

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <p className="text-sm font-semibold text-gray-900">{t('home.nextBillTitle')}</p>

      {!next ? (
        <p className="mt-3 text-sm text-gray-400">{t('home.noUpcomingBills')}</p>
      ) : (
        <Link to="/contas" className="mt-3 flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-purple-50 text-lg">
            {category?.icon ?? '📄'}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-gray-900">{next.bill.title}</p>
            <p className={`text-xs ${next.overdue ? 'font-medium text-red-600' : 'text-gray-500'}`}>
              {next.overdue ? t('home.overdue') : t('billsPage.dueOn', { date: formatDate(next.date, i18n.language) })}
            </p>
          </div>
          <span className="text-sm font-semibold text-gray-900">
            {formatCurrency(next.bill.totalAmount, i18n.language, house.currency)}
          </span>
        </Link>
      )}
    </div>
  )
}
