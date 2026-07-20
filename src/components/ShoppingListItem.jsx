import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext'
import { useHouse } from '../contexts/HouseContext'
import { useBills } from '../contexts/BillsContext'
import { useShopping } from '../contexts/ShoppingContext'
import { formatCurrency } from '../utils/formatCurrency'
import { formatDate } from '../utils/formatDate'
import RecordPurchaseForm from './RecordPurchaseForm'

export default function ShoppingListItem({ item }) {
  const { t, i18n } = useTranslation()
  const { user } = useAuth()
  const { house, isAdmin } = useHouse()
  const { bills } = useBills()
  const { renameItem, deleteItem } = useShopping()
  const [recording, setRecording] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [editingPurchase, setEditingPurchase] = useState(false)
  const [nameValue, setNameValue] = useState(item.name)

  const addedByMember = house.members.find((member) => member.id === item.addedBy)
  const boughtByMember = item.boughtBy ? house.members.find((member) => member.id === item.boughtBy) : null
  const linkedBill = item.billId ? bills.find((bill) => bill.id === item.billId) : null

  async function handleDelete(confirmKey) {
    if (!window.confirm(t(confirmKey))) return
    try {
      await deleteItem(item.id)
    } catch (err) {
      console.error(err)
      alert(t('shoppingPage.deleteError'))
    }
  }

  function handleSaveName(event) {
    event.preventDefault()
    if (nameValue.trim()) renameItem(item.id, nameValue.trim())
    setRenaming(false)
  }

  function handleCancelRename() {
    setNameValue(item.name)
    setRenaming(false)
  }

  if (item.bought) {
    const canEditPurchase = linkedBill && (linkedBill.createdBy === user.id || isAdmin)

    return (
      <li className="rounded-xl border border-gray-200 bg-surface p-3">
        <div className="flex items-center gap-3">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-600 text-white">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-3 w-3"
            >
              <path d="m5 12 5 5L19 7" />
            </svg>
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-gray-400 line-through">{item.name}</p>
            <p className="text-xs text-gray-500">
              {t('shoppingPage.boughtBy', {
                name: boughtByMember?.name,
                date: formatDate(item.boughtAt, i18n.language),
              })}
            </p>
          </div>
          <span className="text-sm font-medium text-gray-900">
            {formatCurrency(item.price, i18n.language, house.currency)}
          </span>
        </div>

        {canEditPurchase && (
          <div className="mt-2 flex justify-end gap-3 border-t border-gray-100 pt-2">
            <button
              type="button"
              onClick={() => setEditingPurchase(true)}
              className="text-xs font-medium text-brand-600 hover:text-brand-700"
            >
              {t('billsPage.edit')}
            </button>
            <button
              type="button"
              onClick={() => handleDelete('shoppingPage.deletePurchaseConfirm')}
              className="text-xs font-medium text-gray-400 hover:text-red-600"
            >
              {t('vaultPage.remove')}
            </button>
          </div>
        )}

        {editingPurchase && linkedBill && (
          <RecordPurchaseForm item={item} bill={linkedBill} onClose={() => setEditingPurchase(false)} />
        )}
      </li>
    )
  }

  return (
    <li className="rounded-xl border border-gray-200 bg-surface p-3">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setRecording(true)}
          aria-label={t('shoppingPage.markBought')}
          className="h-5 w-5 shrink-0 rounded-full border-2 border-gray-300"
        />
        <div className="min-w-0 flex-1">
          {renaming ? (
            <form onSubmit={handleSaveName} className="flex items-center gap-2">
              <input
                type="text"
                autoFocus
                value={nameValue}
                onChange={(event) => setNameValue(event.target.value)}
                className="flex-1 rounded-lg border border-gray-300 px-2 py-1 text-sm outline-none focus:border-brand-500"
              />
              <button type="submit" className="text-xs font-medium text-brand-600">
                {t('vaultPage.save')}
              </button>
              <button type="button" onClick={handleCancelRename} className="text-xs font-medium text-gray-400">
                {t('vaultPage.cancel')}
              </button>
            </form>
          ) : (
            <>
              <p className="text-sm font-medium text-gray-900">{item.name}</p>
              <p className="text-xs text-gray-500">{t('shoppingPage.addedBy', { name: addedByMember?.name })}</p>
            </>
          )}
        </div>
        {!renaming && (
          <div className="flex shrink-0 gap-3">
            <button
              type="button"
              onClick={() => setRenaming(true)}
              className="text-xs font-medium text-gray-400 hover:text-brand-600"
            >
              {t('vaultPage.edit')}
            </button>
            <button
              type="button"
              onClick={() => handleDelete('shoppingPage.deleteConfirm')}
              className="text-xs font-medium text-gray-400 hover:text-red-600"
            >
              {t('vaultPage.remove')}
            </button>
          </div>
        )}
      </div>

      {recording && <RecordPurchaseForm item={item} onClose={() => setRecording(false)} />}
    </li>
  )
}
