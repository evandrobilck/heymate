import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useHouse } from '../contexts/HouseContext'
import { useBills } from '../contexts/BillsContext'
import { billCategories } from '../services/mockData'
import { toDayKey } from '../utils/calendar'
import { getBillOccurrenceState } from '../utils/billOccurrences'
import { formatCurrency } from '../utils/formatCurrency'
import { formatDate } from '../utils/formatDate'

export default function NextBillCard() {
  const { t, i18n } = useTranslation()
  const { house } = useHouse()
  const { bills } = useBills()

  const upcoming = useMemo(() => {
    const todayKey = toDayKey(new Date())

    return bills
      .map((bill) => {
        if (bill.recurrence === 'none') {
          const isPaid = bill.participantIds.every((id) => bill.shares[id].paid)
          return isPaid ? null : { bill, date: bill.dueDate, overdue: bill.dueDate < todayKey }
        }
        // Same "oldest unpaid cycle" the bill's Contas card shows — a cycle
        // already settled via toggleOccurrencePaid shouldn't still look due.
        const { pending } = getBillOccurrenceState(bill, todayKey)
        return pending ? { bill, date: pending.occurrenceDate, overdue: pending.occurrenceDate < todayKey } : null
      })
      .filter(Boolean)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 3)
  }, [bills])

  return (
    <div className="rounded-xl border border-gray-200 bg-surface p-4">
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
