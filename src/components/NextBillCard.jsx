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

  const upcoming = useMemo(() => {
    const todayKey = toDayKey(new Date())

    return bills
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
      .slice(0, 3)
  }, [bills])

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-900">{t('home.upcomingBillsTitle')}</p>
        <Link to="/contas" className="text-xs font-medium text-brand-600 hover:text-brand-700">
          {t('home.viewUpcomingBills')}
        </Link>
      </div>

      {upcoming.length === 0 ? (
        <p className="mt-3 text-sm text-gray-400">🎉 {t('home.noUpcomingBills')}</p>
      ) : (
        <ul className="mt-3 space-y-3">
          {upcoming.map(({ bill, date, overdue }) => {
            const category = billCategories.find((cat) => cat.id === bill.category)
            return (
              <li key={bill.id}>
                <Link to="/contas" className="flex items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-50 text-lg">
                    {category?.icon ?? '📄'}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-900">{bill.title}</p>
                    <p className={`text-xs ${overdue ? 'font-medium text-red-600' : 'text-gray-500'}`}>
                      {overdue ? t('home.overdue') : t('billsPage.dueOn', { date: formatDate(date, i18n.language) })}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-gray-900">
                    {formatCurrency(bill.totalAmount, i18n.language, house.currency)}
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
