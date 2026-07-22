import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useHouse } from '../contexts/HouseContext'
import { useBills } from '../contexts/BillsContext'
import { useCategories } from '../contexts/CategoriesContext'
import { billCategories, recurrenceOptions } from '../services/mockData'
import { computeEqualShares, computeExactShares, computePercentageShares } from '../utils/splitBill'
import { formatCurrency } from '../utils/formatCurrency'
import Modal from './Modal'
import ReminderList from './ReminderList'

const SPLIT_TYPES = ['equal', 'percentage', 'exact']

export default function AddBillForm({ onClose, bill = null }) {
  const { t, i18n } = useTranslation()
  const { house } = useHouse()
  const { addBill, updateBill } = useBills()
  const { customBillCategories, hiddenCategoryIds } = useCategories()
  const isEditing = Boolean(bill)

  const activeMembers = house.members.filter((member) => !member.leftAt)
  // Include past members who are already on the bill being edited, so
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

  // Fall back to showing every built-in category if hiding left nothing
  // pickable, so the form never becomes unusable.
  const visibleBuiltInCategories = billCategories.filter((cat) => !hiddenCategoryIds.includes(cat.id))
  const pickableBuiltInCategories =
    visibleBuiltInCategories.length > 0 || customBillCategories.length > 0 ? visibleBuiltInCategories : billCategories

  const [title, setTitle] = useState(bill?.title ?? '')
  const [category, setCategory] = useState(
    bill?.category ?? pickableBuiltInCategories[0]?.id ?? customBillCategories[0]?.id
  )
  const [totalAmount, setTotalAmount] = useState(bill ? String(bill.totalAmount) : '')
  const [dueDate, setDueDate] = useState(bill?.dueDate ?? '')
  const [recurrence, setRecurrence] = useState(bill?.recurrence ?? 'none')
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
  const [reminders, setReminders] = useState(bill?.reminders ?? [])

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
    dueDate !== '' &&
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

    const payload = {
      title: title.trim(),
      category,
      totalAmount: amountValue,
      dueDate,
      recurrence,
      splitType,
      participantIds,
      shares,
      reminders,
    }

    if (isEditing) {
      updateBill(bill.id, payload)
    } else {
      addBill(payload)
    }

    onClose()
  }

  return (
    <Modal>
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">
            {isEditing ? t('billsPage.editBill') : t('billsPage.addBill')}
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
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-gray-600">{t('billsPage.categoryLabel')}</label>
            <div className="mt-1 flex flex-wrap gap-2">
              {pickableBuiltInCategories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategory(cat.id)}
                  className={`flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-medium ${
                    category === cat.id
                      ? 'border-brand-500 bg-brand-50 text-brand-700 dark:text-white'
                      : 'border-gray-200 text-gray-600'
                  }`}
                >
                  <span>{cat.icon}</span>
                  {t(cat.labelKey)}
                </button>
              ))}
              {customBillCategories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategory(cat.id)}
                  className={`flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-medium ${
                    category === cat.id
                      ? 'border-brand-500 bg-brand-50 text-brand-700 dark:text-white'
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
                value={totalAmount}
                onChange={(event) => setTotalAmount(event.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">{t('billsPage.dueDateLabel')}</label>
              <input
                type="date"
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-600">{t('billsPage.recurrenceLabel')}</label>
            <select
              value={recurrence}
              onChange={(event) => setRecurrence(event.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
            >
              {recurrenceOptions.map((option) => (
                <option key={option} value={option}>
                  {t(`recurrence.${option}`)}
                </option>
              ))}
            </select>
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
                      className="h-4 w-4 rounded border-gray-300 text-brand-600"
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
                      ? 'border-brand-500 bg-brand-50 text-brand-700 dark:text-white'
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

          <div>
            <label className="text-xs font-medium text-gray-600">{t('reminders.label')}</label>
            <p className="mt-0.5 text-xs text-gray-400">{t('reminders.billHint')}</p>
            <div className="mt-2">
              <ReminderList reminders={reminders} onChange={setReminders} />
            </div>
          </div>

          <button
            type="submit"
            disabled={!isValid}
            className="w-full rounded-lg bg-brand-600 py-2.5 text-sm font-medium text-white disabled:opacity-40"
          >
            {isEditing ? t('billsPage.saveChanges') : t('billsPage.save')}
          </button>
        </form>
    </Modal>
  )
}
