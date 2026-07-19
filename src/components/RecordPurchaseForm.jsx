import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext'
import { useHouse } from '../contexts/HouseContext'
import { useShopping } from '../contexts/ShoppingContext'
import { useCategories } from '../contexts/CategoriesContext'
import { billCategories } from '../services/mockData'
import { computeEqualShares, computeExactShares, computePercentageShares } from '../utils/splitBill'
import { formatCurrency } from '../utils/formatCurrency'

const SPLIT_TYPES = ['equal', 'percentage', 'exact']
const PURCHASE_CATEGORIES = billCategories.filter((cat) => cat.id === 'groceries' || cat.id === 'other')

export default function RecordPurchaseForm({ item, bill = null, onClose }) {
  const { t, i18n } = useTranslation()
  const { user } = useAuth()
  const { house } = useHouse()
  const { recordPurchase, updatePurchase } = useShopping()
  const { customShoppingCategories, hiddenCategoryIds } = useCategories()
  const isEditing = Boolean(bill)

  const activeMembers = house.members.filter((member) => !member.leftAt)
  // Include past members who are already on the purchase being edited, so
  // editing doesn't silently drop an ex-roommate's share.
  const memberOptions = isEditing
    ? [
        ...activeMembers,
        ...bill.participantIds
          .filter((id) => !activeMembers.some((member) => member.id === id))
          .map((id) => house.members.find((member) => member.id === id))
          .filter(Boolean),
      ]
    : activeMembers

  const visiblePurchaseCategories = PURCHASE_CATEGORIES.filter((cat) => !hiddenCategoryIds.includes(cat.id))
  const pickablePurchaseCategories =
    visiblePurchaseCategories.length > 0 || customShoppingCategories.length > 0
      ? visiblePurchaseCategories
      : PURCHASE_CATEGORIES

  const [title, setTitle] = useState(bill?.title ?? item.name)
  const [category, setCategory] = useState(
    bill?.category ?? pickablePurchaseCategories[0]?.id ?? customShoppingCategories[0]?.id ?? 'groceries'
  )
  const [totalAmount, setTotalAmount] = useState(bill ? String(bill.totalAmount) : '')
  const [buyerId, setBuyerId] = useState(bill?.createdBy ?? user.id)
  const [splitType, setSplitType] = useState(bill?.splitType ?? 'equal')
  const [participantIds, setParticipantIds] = useState(
    bill ? bill.participantIds : activeMembers.map((member) => member.id)
  )
  const [percentages, setPercentages] = useState(
    bill?.splitType === 'percentage'
      ? Object.fromEntries(bill.participantIds.map((id) => [id, String(bill.shares[id].percentage ?? '')]))
      : {}
  )
  const [exactAmounts, setExactAmounts] = useState(
    bill?.splitType === 'exact'
      ? Object.fromEntries(bill.participantIds.map((id) => [id, String(bill.shares[id].amount ?? '')]))
      : {}
  )

  const amountValue = Number(totalAmount) || 0

  function toggleParticipant(memberId) {
    setParticipantIds((prev) =>
      prev.includes(memberId) ? prev.filter((id) => id !== memberId) : [...prev, memberId]
    )
  }

  const percentageTotal = participantIds.reduce((sum, id) => sum + (Number(percentages[id]) || 0), 0)
  const exactTotal = participantIds.reduce((sum, id) => sum + (Number(exactAmounts[id]) || 0), 0)

  const isValid =
    title.trim() !== '' &&
    amountValue > 0 &&
    participantIds.length > 0 &&
    (splitType !== 'percentage' || Math.abs(percentageTotal - 100) < 0.01) &&
    (splitType !== 'exact' || Math.abs(exactTotal - amountValue) < 0.01)

  function handleSubmit(event) {
    event.preventDefault()
    if (!isValid) return

    let shares
    if (splitType === 'equal') {
      shares = computeEqualShares(amountValue, participantIds)
    } else if (splitType === 'percentage') {
      shares = computePercentageShares(
        amountValue,
        Object.fromEntries(participantIds.map((id) => [id, Number(percentages[id]) || 0]))
      )
    } else {
      shares = computeExactShares(
        Object.fromEntries(participantIds.map((id) => [id, Number(exactAmounts[id]) || 0]))
      )
    }

    if (isEditing) {
      // Preserve existing paid status for participants who remain, same as
      // editing a regular bill.
      participantIds.forEach((id) => {
        const previousShare = bill.shares[id]
        const keepPaid = Boolean(previousShare?.paid)
        shares[id] = { ...shares[id], paid: keepPaid, paidAt: keepPaid ? previousShare.paidAt : null }
      })

      updatePurchase(item.id, {
        title: title.trim(),
        category,
        totalAmount: amountValue,
        buyerId,
        splitType,
        participantIds,
        shares,
      })
    } else {
      // The buyer already paid at checkout, so their own share starts settled.
      if (shares[buyerId]) {
        shares[buyerId] = {
          ...shares[buyerId],
          paid: true,
          paidAt: new Date().toISOString().slice(0, 10),
        }
      }

      recordPurchase(item.id, {
        title: title.trim(),
        category,
        totalAmount: amountValue,
        buyerId,
        splitType,
        participantIds,
        shares,
      })
    }

    onClose()
  }

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">
            {isEditing ? t('shoppingPage.editPurchase') : t('shoppingPage.recordPurchase')}
          </h2>
          <button type="button" onClick={onClose} className="text-sm text-gray-400">
            {t('billsPage.close')}
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="text-xs font-medium text-gray-600">{t('billsPage.titleLabel')}</label>
            <input
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-purple-500"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-gray-600">{t('billsPage.categoryLabel')}</label>
            <div className="mt-1 flex flex-wrap gap-2">
              {pickablePurchaseCategories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategory(cat.id)}
                  className={`flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-medium ${
                    category === cat.id
                      ? 'border-purple-500 bg-purple-50 text-purple-700'
                      : 'border-gray-200 text-gray-600'
                  }`}
                >
                  <span>{cat.icon}</span>
                  {t(cat.labelKey)}
                </button>
              ))}
              {customShoppingCategories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategory(cat.id)}
                  className={`flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-medium ${
                    category === cat.id
                      ? 'border-purple-500 bg-purple-50 text-purple-700'
                      : 'border-gray-200 text-gray-600'
                  }`}
                >
                  <span>🏷️</span>
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600">{t('billsPage.amountLabel')}</label>
              <input
                type="number"
                min="0"
                step="0.01"
                autoFocus
                value={totalAmount}
                onChange={(event) => setTotalAmount(event.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-purple-500"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">{t('shoppingPage.buyerLabel')}</label>
              <select
                value={buyerId}
                onChange={(event) => setBuyerId(event.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-purple-500"
              >
                {activeMembers.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.id === user.id ? t('shoppingPage.you') : member.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-600">{t('billsPage.participantsLabel')}</label>
            <ul className="mt-1 space-y-2">
              {memberOptions.map((member) => {
                const checked = participantIds.includes(member.id)
                return (
                  <li key={member.id} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleParticipant(member.id)}
                      className="h-4 w-4 rounded border-gray-300 text-purple-600"
                    />
                    <span className="flex-1 text-sm text-gray-800">{member.name}</span>

                    {checked && splitType === 'percentage' && (
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={percentages[member.id] ?? ''}
                        onChange={(event) =>
                          setPercentages((prev) => ({ ...prev, [member.id]: event.target.value }))
                        }
                        placeholder="%"
                        className="w-16 rounded-lg border border-gray-300 px-2 py-1 text-right text-sm"
                      />
                    )}

                    {checked && splitType === 'exact' && (
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={exactAmounts[member.id] ?? ''}
                        onChange={(event) =>
                          setExactAmounts((prev) => ({ ...prev, [member.id]: event.target.value }))
                        }
                        placeholder="$"
                        className="w-20 rounded-lg border border-gray-300 px-2 py-1 text-right text-sm"
                      />
                    )}
                  </li>
                )
              })}
            </ul>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-600">{t('billsPage.splitTypeLabel')}</label>
            <div className="mt-1 flex gap-2">
              {SPLIT_TYPES.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setSplitType(type)}
                  className={`flex-1 rounded-lg border px-2 py-2 text-xs font-medium ${
                    splitType === type
                      ? 'border-purple-500 bg-purple-50 text-purple-700'
                      : 'border-gray-200 text-gray-600'
                  }`}
                >
                  {t(`splitType.${type}`)}
                </button>
              ))}
            </div>

            {splitType === 'percentage' && (
              <p
                className={`mt-1 text-xs ${
                  Math.abs(percentageTotal - 100) < 0.01 ? 'text-green-600' : 'text-gray-500'
                }`}
              >
                {t('billsPage.percentageTotal', { total: percentageTotal })}
              </p>
            )}
            {splitType === 'exact' && (
              <p
                className={`mt-1 text-xs ${
                  Math.abs(exactTotal - amountValue) < 0.01 ? 'text-green-600' : 'text-gray-500'
                }`}
              >
                {t('billsPage.exactTotal', {
                  total: formatCurrency(exactTotal, i18n.language, house.currency),
                  amount: formatCurrency(amountValue, i18n.language, house.currency),
                })}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={!isValid}
            className="w-full rounded-lg bg-purple-600 py-2.5 text-sm font-medium text-white disabled:opacity-40"
          >
            {isEditing ? t('billsPage.saveChanges') : t('shoppingPage.confirmBought')}
          </button>
        </form>
      </div>
    </div>
  )
}
