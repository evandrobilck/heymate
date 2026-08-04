import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useBills } from '../contexts/BillsContext'
import { isBillOccurrenceVisible } from '../utils/recurrence'
import { getBillOccurrenceState } from '../utils/billOccurrences'
import { toDayKey } from '../utils/calendar'
import { formatMonthLabel } from '../utils/formatDate'
import { groupByYearMonth } from '../utils/groupByYearMonth'
import BillCard from '../components/BillCard'
import AddBillForm from '../components/AddBillForm'
import BalanceSummary from '../components/BalanceSummary'
import SkeletonRows from '../components/SkeletonRows'
import EmptyState from '../components/EmptyState'

export default function ContasPage() {
  const { t, i18n } = useTranslation()
  const { bills, loading } = useBills()
  const [showForm, setShowForm] = useState(false)
  const [editingBill, setEditingBill] = useState(null)
  const [expandedYears, setExpandedYears] = useState(() => new Set())

  // Non-recurring bills are a single card (their own due_date/shares).
  // Recurring bills spread into one card per cycle: any fully paid cycle
  // becomes a permanent Pagas entry, and the oldest unpaid cycle becomes
  // the live Pendente card once it's due (see getBillOccurrenceState).
  const { pendingItems, paidItems } = useMemo(() => {
    const todayKey = toDayKey(new Date())
    const pending = []
    const paid = []

    bills.filter(isBillOccurrenceVisible).forEach((bill) => {
      if (bill.recurrence === 'none') {
        const isPaid = bill.participantIds.every((id) => bill.shares[id].paid)
        ;(isPaid ? paid : pending).push({ bill, occurrenceDate: bill.dueDate })
        return
      }

      const { completed, pending: currentPending } = getBillOccurrenceState(bill, todayKey)
      completed.forEach(({ occurrenceDate }) => paid.push({ bill, occurrenceDate }))
      if (currentPending) pending.push({ bill, occurrenceDate: currentPending.occurrenceDate })
    })

    return { pendingItems: pending, paidItems: paid }
  }, [bills])

  const paidBillsByYear = useMemo(() => groupByYearMonth(paidItems, (item) => item.occurrenceDate), [paidItems])

  function toggleYear(year) {
    setExpandedYears((prev) => {
      const next = new Set(prev)
      if (next.has(year)) {
        next.delete(year)
      } else {
        next.add(year)
      }
      return next
    })
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">{t('nav.accounts')}</h1>
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
        >
          + {t('billsPage.addBill')}
        </button>
      </div>

      <div className="mt-4">
        <BalanceSummary />
      </div>

      <div className="mt-4 space-y-3">
        <h2 className="text-sm font-semibold text-gray-900">{t('billsPage.pendingTitle')}</h2>
        {loading ? (
          <SkeletonRows />
        ) : (
          <>
            {pendingItems.length === 0 && <EmptyState icon="🎉" message={t('billsPage.noPending')} />}
            {pendingItems.map(({ bill, occurrenceDate }) => (
              <BillCard
                key={`${bill.id}-${occurrenceDate}`}
                bill={bill}
                occurrenceDate={occurrenceDate}
                onEdit={() => setEditingBill(bill)}
              />
            ))}
          </>
        )}
      </div>

      {!loading && paidItems.length > 0 && (
        <div className="mt-6 space-y-3">
          <h2 className="text-sm font-semibold text-gray-900">{t('billsPage.paidTitle')}</h2>
          <div className="space-y-2">
            {paidBillsByYear.map(({ year, months }) => {
              const isOpen = expandedYears.has(year)
              return (
                <div key={year} className="rounded-xl border border-gray-200 bg-surface">
                  <button
                    type="button"
                    onClick={() => toggleYear(year)}
                    aria-expanded={isOpen}
                    className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-semibold text-gray-900"
                  >
                    <span>{year}</span>
                    <span className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}>⌄</span>
                  </button>
                  {isOpen && (
                    <div className="space-y-4 border-t border-gray-100 px-4 pb-4 pt-3">
                      {months.map(({ month, items: monthBills }) => (
                        <div key={month} className="space-y-2">
                          <h3 className="text-xs font-semibold uppercase text-gray-500">
                            {formatMonthLabel(year, month, i18n.language)}
                          </h3>
                          <div className="space-y-3">
                            {monthBills.map(({ bill, occurrenceDate }) => (
                              <BillCard
                                key={`${bill.id}-${occurrenceDate}`}
                                bill={bill}
                                occurrenceDate={occurrenceDate}
                                onEdit={() => setEditingBill(bill)}
                              />
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {showForm && <AddBillForm onClose={() => setShowForm(false)} />}
      {editingBill && <AddBillForm bill={editingBill} onClose={() => setEditingBill(null)} />}
    </div>
  )
}
