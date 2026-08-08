import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext'
import { useHouse } from '../contexts/HouseContext'
import { useBills } from '../contexts/BillsContext'
import { useCategories } from '../contexts/CategoriesContext'
import { useConfirm } from '../contexts/ConfirmContext'
import { useToast } from '../contexts/ToastContext'
import { billCategories, recurrenceOptions } from '../services/mockData'
import { computeByDayShares, computeEqualShares, computeExactShares, computePercentageShares } from '../utils/splitBill'
import { computeBalances } from '../utils/computeBalances'
import { isBillOccurrenceVisible } from '../utils/recurrence'
import { formatCurrency } from '../utils/formatCurrency'
import { formatDate } from '../utils/formatDate'
import { resizeImageFile } from '../utils/resizeImage'
import Modal from './Modal'
import ReminderList from './ReminderList'
import PhotoPickerLabel from './PhotoPickerLabel'

const SPLIT_TYPES = ['equal', 'percentage', 'exact', 'byDay']

function daysInMonth(monthKey) {
  if (!monthKey) return 31
  const [year, month] = monthKey.split('-').map(Number)
  return new Date(year, month, 0).getDate()
}

// Same title (case/whitespace-insensitive) and category, due within 20 days
// of each other — close enough to be "did I already log this?" territory
// without flagging genuinely separate recurring cycles a month+ apart.
function daysBetween(dateKeyA, dateKeyB) {
  const [ay, am, ad] = dateKeyA.split('-').map(Number)
  const [by, bm, bd] = dateKeyB.split('-').map(Number)
  const a = new Date(ay, am - 1, ad)
  const b = new Date(by, bm - 1, bd)
  return Math.abs(Math.round((a - b) / 86400000))
}

function findPossibleDuplicate(bills, candidate) {
  const normalizedTitle = candidate.title.trim().toLowerCase()
  return bills.find(
    (existing) =>
      existing.title.trim().toLowerCase() === normalizedTitle &&
      existing.category === candidate.category &&
      daysBetween(existing.dueDate, candidate.dueDate) <= 20
  )
}

export default function AddBillForm({ onClose, bill = null }) {
  const { t, i18n } = useTranslation()
  const { user } = useAuth()
  const { house } = useHouse()
  const { bills, addBill, updateBill, setBillPhoto } = useBills()
  const { customBillCategories, hiddenCategoryIds } = useCategories()
  const confirm = useConfirm()
  const showToast = useToast()
  const isEditing = Boolean(bill)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  // Tracked locally (not just read off `bill.photoUrl`) because `bill` is a
  // snapshot the parent page captured when "Edit" was clicked — it won't
  // pick up BillsContext's refresh() on its own while this modal stays open.
  const [photoUrl, setPhotoUrl] = useState(bill?.photoUrl ?? null)
  // When creating a new bill there's no id yet to attach a photo to — the
  // resized file is held here and actually uploaded right after the bill
  // is saved (see handleSubmit), so the user can pick it up front instead
  // of having to reopen the bill in Edit afterward just for the photo.
  const [pendingPhotoFile, setPendingPhotoFile] = useState(null)
  const [pendingPhotoPreview, setPendingPhotoPreview] = useState(null)

  useEffect(() => {
    return () => {
      if (pendingPhotoPreview) URL.revokeObjectURL(pendingPhotoPreview)
    }
  }, [pendingPhotoPreview])

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
  const [splitMonth, setSplitMonth] = useState(bill?.splitMonth ?? (bill?.dueDate ?? '').slice(0, 7) || new Date().toISOString().slice(0, 7))
  const [days, setDays] = useState(
    bill?.splitType === 'byDay'
      ? Object.fromEntries(bill.participantIds.map((id) => [id, String(bill.shares[id].days ?? '')]))
      : {}
  )
  const [reminders, setReminders] = useState(bill?.reminders ?? [])
  const [isPrivate, setIsPrivate] = useState(bill?.isPrivate ?? false)

  const amountValue = Number(totalAmount) || 0

  // Only relevant when creating a bill: if a checked participant is
  // already owed money by the current user from other bills, create_bill's
  // p_apply_debt_offset will settle that existing debt with this share
  // instead of requiring a separate cash payment. Surfaced as a hint so
  // it isn't a silent balance change.
  const owedToMembers = useMemo(() => {
    if (isEditing) return {}
    const { youOwe } = computeBalances(bills.filter(isBillOccurrenceVisible), user.id)
    return Object.fromEntries(youOwe.map(({ memberId, amount }) => [memberId, amount]))
  }, [bills, user.id, isEditing])

  const monthDayCount = daysInMonth(splitMonth)

  function dayValue(memberId) {
    return Number(days[memberId] ?? monthDayCount) || 0
  }

  function estimateShare(memberId) {
    if (splitType === 'exact') return Number(exactAmounts[memberId]) || 0
    if (splitType === 'percentage') return round2((Number(percentages[memberId]) || 0) * amountValue / 100)
    if (splitType === 'byDay') {
      const totalDays = participantIds.reduce((sum, id) => sum + dayValue(id), 0)
      return totalDays > 0 ? round2((amountValue * dayValue(memberId)) / totalDays) : 0
    }
    return participantIds.length > 0 ? round2(amountValue / participantIds.length) : 0
  }

  function round2(value) {
    return Math.round(value * 100) / 100
  }

  function toggleParticipant(memberId) {
    setParticipantIds((prev) =>
      prev.includes(memberId) ? prev.filter((id) => id !== memberId) : [...prev, memberId]
    )
  }

  const percentageTotal = participantIds.reduce((sum, id) => sum + (Number(percentages[id]) || 0), 0)
  const exactTotal = participantIds.reduce((sum, id) => sum + (Number(exactAmounts[id]) || 0), 0)
  const dayTotal = participantIds.reduce((sum, id) => sum + dayValue(id), 0)

  const isValid =
    title.trim() !== '' &&
    amountValue > 0 &&
    dueDate !== '' &&
    participantIds.length > 0 &&
    (splitType !== 'percentage' || Math.abs(percentageTotal - 100) < 0.01) &&
    (splitType !== 'exact' || Math.abs(exactTotal - amountValue) < 0.01) &&
    (splitType !== 'byDay' || dayTotal > 0)

  async function handlePhotoChange(file) {
    if (!isEditing) {
      // No bill.id yet — hold onto the resized file and upload it right
      // after the bill itself is created (see handleSubmit).
      try {
        const resized = await resizeImageFile(file)
        if (pendingPhotoPreview) URL.revokeObjectURL(pendingPhotoPreview)
        setPendingPhotoFile(resized)
        setPendingPhotoPreview(URL.createObjectURL(resized))
      } catch (err) {
        console.error(err)
        showToast(t('billsPage.photoError'))
      }
      return
    }

    setUploadingPhoto(true)
    try {
      const resized = await resizeImageFile(file)
      const uploadedUrl = await setBillPhoto(bill.id, resized)
      setPhotoUrl(uploadedUrl)
    } catch (err) {
      console.error(err)
      showToast(t('billsPage.photoError'))
    } finally {
      setUploadingPhoto(false)
    }
  }

  async function handleRemovePhoto() {
    if (!isEditing) {
      if (pendingPhotoPreview) URL.revokeObjectURL(pendingPhotoPreview)
      setPendingPhotoFile(null)
      setPendingPhotoPreview(null)
      return
    }

    if (!(await confirm(t('billsPage.removePhotoConfirm')))) return
    try {
      await setBillPhoto(bill.id, null)
      setPhotoUrl(null)
    } catch (err) {
      console.error(err)
      showToast(t('billsPage.photoError'))
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (!isValid) return

    if (!isEditing) {
      const duplicate = findPossibleDuplicate(bills, { title, category, dueDate })
      if (duplicate) {
        const proceed = await confirm(
          t('billsPage.duplicateConfirm', {
            title: duplicate.title,
            date: formatDate(duplicate.dueDate, i18n.language),
          })
        )
        if (!proceed) return
      }
    }

    let shares
    if (splitType === 'equal') {
      shares = computeEqualShares(amountValue, participantIds)
    } else if (splitType === 'percentage') {
      shares = computePercentageShares(
        amountValue,
        Object.fromEntries(participantIds.map((id) => [id, Number(percentages[id]) || 0]))
      )
    } else if (splitType === 'byDay') {
      shares = computeByDayShares(
        amountValue,
        Object.fromEntries(participantIds.map((id) => [id, dayValue(id)]))
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
      splitMonth: splitType === 'byDay' ? splitMonth : null,
      participantIds,
      shares,
      reminders,
      isPrivate,
    }

    setSubmitting(true)
    try {
      if (isEditing) {
        await updateBill(bill.id, payload)
      } else {
        const newBillId = await addBill(payload)
        if (newBillId && pendingPhotoFile) {
          try {
            await setBillPhoto(newBillId, pendingPhotoFile)
          } catch (err) {
            console.error(err)
            showToast(t('billsPage.photoError'))
          }
        }
      }
      onClose()
    } catch (err) {
      console.error(err)
      showToast(t('billsPage.saveError'))
    } finally {
      setSubmitting(false)
    }
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
            <label className="text-xs font-medium text-gray-600">{t('billsPage.photoLabel')}</label>
            <div className="mt-1">
              {(isEditing ? photoUrl : pendingPhotoPreview) ? (
                <div>
                  <a href={isEditing ? photoUrl : pendingPhotoPreview} target="_blank" rel="noreferrer">
                    <img
                      src={isEditing ? photoUrl : pendingPhotoPreview}
                      alt=""
                      className="h-32 w-full rounded-lg border border-gray-200 object-cover"
                    />
                  </a>
                  <div className="mt-1.5 flex gap-3">
                    <PhotoPickerLabel
                      onPick={handlePhotoChange}
                      disabled={uploadingPhoto}
                      className="cursor-pointer text-xs font-medium text-brand-600 hover:text-brand-700"
                    >
                      {uploadingPhoto ? t('billsPage.processingPhoto') : t('billsPage.changePhoto')}
                    </PhotoPickerLabel>
                    <button
                      type="button"
                      onClick={handleRemovePhoto}
                      className="text-xs font-medium text-gray-400 hover:text-red-600"
                    >
                      {t('vaultPage.remove')}
                    </button>
                  </div>
                </div>
              ) : (
                <PhotoPickerLabel
                  onPick={handlePhotoChange}
                  disabled={uploadingPhoto}
                  className="block cursor-pointer rounded-lg border border-dashed border-gray-300 px-3 py-2.5 text-center text-xs font-medium text-brand-600 hover:border-brand-400"
                >
                  {uploadingPhoto ? t('billsPage.processingPhoto') : t('billsPage.addPhoto')}
                </PhotoPickerLabel>
              )}
            </div>
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
                <option key={option} value={option} className="text-black">
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
                const owedAmount = owedToMembers[member.id]
                const showOffsetHint = checked && owedAmount > 0.005 && estimateShare(member.id) > 0.005
                return (
                  <li key={member.id}>
                    <div className="flex items-center gap-2">
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

                      {checked && splitType === 'byDay' && (
                        <input
                          type="number"
                          min="0"
                          max={monthDayCount}
                          value={days[member.id] ?? String(monthDayCount)}
                          onChange={(event) =>
                            setDays((prev) => ({ ...prev, [member.id]: event.target.value }))
                          }
                          placeholder={t('billsPage.daysLabel')}
                          className="w-16 rounded-lg border border-gray-300 px-2 py-1 text-right text-sm"
                        />
                      )}

                      {checked && (splitType === 'percentage' || splitType === 'byDay') && (
                        <span className="w-20 shrink-0 text-right text-xs font-medium text-gray-500">
                          {formatCurrency(estimateShare(member.id), i18n.language, house.currency)}
                        </span>
                      )}
                    </div>
                    {showOffsetHint && (
                      <p className="ml-6 mt-0.5 text-xs text-brand-600">
                        {t('billsPage.debtOffsetHint', {
                          name: member.name,
                          amount: formatCurrency(owedAmount, i18n.language, house.currency),
                        })}
                      </p>
                    )}
                  </li>
                )
              })}
            </ul>
          </div>

          <div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={isPrivate}
                onChange={(event) => setIsPrivate(event.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-brand-600"
              />
              <span className="text-xs font-medium text-gray-600">{t('billsPage.privateLabel')}</span>
            </label>
            {isPrivate && <p className="mt-1 text-xs text-gray-400">{t('billsPage.privateHint')}</p>}
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
            {splitType === 'byDay' && (
              <div className="mt-2">
                <label className="text-xs font-medium text-gray-600">{t('billsPage.splitMonthLabel')}</label>
                <input
                  type="month"
                  value={splitMonth}
                  onChange={(event) => setSplitMonth(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
                />
                <p className="mt-1 text-xs text-gray-500">
                  {t('billsPage.dayTotal', { total: dayTotal, monthDays: monthDayCount })}
                </p>
              </div>
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
            disabled={!isValid || submitting}
            className="w-full rounded-lg bg-brand-600 py-2.5 text-sm font-medium text-white disabled:opacity-40"
          >
            {isEditing ? t('billsPage.saveChanges') : t('billsPage.save')}
          </button>
        </form>
    </Modal>
  )
}
