import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useBills } from '../contexts/BillsContext'
import { isBillOccurrenceVisible } from '../utils/recurrence'
import BillCard from '../components/BillCard'
import AddBillForm from '../components/AddBillForm'
import BalanceSummary from '../components/BalanceSummary'
import SkeletonRows from '../components/SkeletonRows'
import EmptyState from '../components/EmptyState'

export default function ContasPage() {
  const { t } = useTranslation()
  const { bills, loading } = useBills()
  const [showForm, setShowForm] = useState(false)
  const [editingBill, setEditingBill] = useState(null)

  const visibleBills = bills.filter(isBillOccurrenceVisible)

  const pendingBills = visibleBills.filter((bill) => bill.participantIds.some((id) => !bill.shares[id].paid))
  const paidBills = visibleBills.filter((bill) => bill.participantIds.every((id) => bill.shares[id].paid))

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
            {pendingBills.length === 0 && <EmptyState icon="🎉" message={t('billsPage.noPending')} />}
            {pendingBills.map((bill) => (
              <BillCard key={bill.id} bill={bill} onEdit={() => setEditingBill(bill)} />
            ))}
          </>
        )}
      </div>

      {!loading && paidBills.length > 0 && (
        <div className="mt-6 space-y-3">
          <h2 className="text-sm font-semibold text-gray-900">{t('billsPage.paidTitle')}</h2>
          {paidBills.map((bill) => (
            <BillCard key={bill.id} bill={bill} onEdit={() => setEditingBill(bill)} />
          ))}
        </div>
      )}

      {showForm && <AddBillForm onClose={() => setShowForm(false)} />}
      {editingBill && <AddBillForm bill={editingBill} onClose={() => setEditingBill(null)} />}
    </div>
  )
}
