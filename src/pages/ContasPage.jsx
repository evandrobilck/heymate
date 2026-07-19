import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useBills } from '../contexts/BillsContext'
import BillCard from '../components/BillCard'
import AddBillForm from '../components/AddBillForm'

export default function ContasPage() {
  const { t } = useTranslation()
  const { bills } = useBills()
  const [showForm, setShowForm] = useState(false)
  const [editingBill, setEditingBill] = useState(null)

  const pendingBills = bills.filter((bill) => bill.participantIds.some((id) => !bill.shares[id].paid))
  const paidBills = bills.filter((bill) => bill.participantIds.every((id) => bill.shares[id].paid))

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">{t('nav.accounts')}</h1>
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700"
        >
          + {t('billsPage.addBill')}
        </button>
      </div>

      <div className="mt-4 space-y-3">
        <h2 className="text-sm font-semibold text-gray-900">{t('billsPage.pendingTitle')}</h2>
        {pendingBills.length === 0 && <p className="text-sm text-gray-400">{t('billsPage.noPending')}</p>}
        {pendingBills.map((bill) => (
          <BillCard key={bill.id} bill={bill} onEdit={() => setEditingBill(bill)} />
        ))}
      </div>

      {paidBills.length > 0 && (
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
