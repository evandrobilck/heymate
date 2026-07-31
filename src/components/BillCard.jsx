import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext'
import { useHouse } from '../contexts/HouseContext'
import { useBills } from '../contexts/BillsContext'
import { useCategories } from '../contexts/CategoriesContext'
import { useToast } from '../contexts/ToastContext'
import { useConfirm } from '../contexts/ConfirmContext'
import { billCategories } from '../services/mockData'
import { formatCurrency } from '../utils/formatCurrency'
import { formatDate } from '../utils/formatDate'
import { resizeImageFile } from '../utils/resizeImage'
import { toDayKey } from '../utils/calendar'
import { getLatestOccurrenceOnOrBefore } from '../utils/recurrence'

export default function BillCard({ bill, onEdit }) {
  const { t, i18n } = useTranslation()
  const { user } = useAuth()
  const { house, isAdmin } = useHouse()
  const {
    toggleParticipantPaid,
    setBillPhoto,
    confirmBillAmount,
    deleteBill,
    deleteOccurrence,
    deleteOccurrenceAndFollowing,
  } = useBills()
  const { customBillCategories, customShoppingCategories } = useCategories()
  const showToast = useToast()
  const confirm = useConfirm()
  const [expanded, setExpanded] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [confirmingAmount, setConfirmingAmount] = useState(false)

  const category = billCategories.find((item) => item.id === bill.category)
  const customCategory = category
    ? null
    : [...customBillCategories, ...customShoppingCategories].find((item) => item.id === bill.category)
  const participants = bill.participantIds.map((id) => ({
    member: house.members.find((member) => member.id === id),
    share: bill.shares[id],
  }))
  const isFullyPaid = participants.every(({ share }) => share.paid)
  const canEdit = bill.createdBy === user.id || isAdmin
  const isRecurring = bill.recurrence !== 'none'

  const latestOccurrence = isRecurring
    ? getLatestOccurrenceOnOrBefore(
        bill.dueDate,
        bill.recurrence,
        toDayKey(new Date()),
        bill.recurrenceUntil,
        bill.excludedDates
      )
    : null
  const needsAmountReview = latestOccurrence !== null && latestOccurrence > (bill.amountConfirmedThrough ?? bill.dueDate)

  async function handleDeleteNonRecurring() {
    if (!(await confirm(t('billsPage.deleteConfirm')))) return
    try {
      await deleteBill(bill.id)
    } catch (err) {
      console.error(err)
      showToast(t('billsPage.deleteError'))
    }
  }

  async function handleDeleteOnlyThis() {
    if (!(await confirm(t('billsPage.deleteOnlyThisConfirm')))) return
    try {
      await deleteOccurrence(bill.id, bill.dueDate)
    } catch (err) {
      console.error(err)
      showToast(t('billsPage.deleteError'))
    }
    setConfirmingDelete(false)
  }

  async function handleDeleteFollowing() {
    if (!(await confirm(t('billsPage.deleteFollowingConfirm')))) return
    try {
      await deleteOccurrenceAndFollowing(bill.id, bill.dueDate)
    } catch (err) {
      console.error(err)
      showToast(t('billsPage.deleteError'))
    }
    setConfirmingDelete(false)
  }

  async function handlePhotoChange(event) {
    const file = event.target.files?.[0]
    if (!file) return
    setUploadingPhoto(true)
    try {
      const resized = await resizeImageFile(file)
      await setBillPhoto(bill.id, resized)
    } catch (err) {
      console.error(err)
      showToast(t('billsPage.photoError'))
    } finally {
      setUploadingPhoto(false)
      event.target.value = ''
    }
  }

  async function handleRemovePhoto() {
    if (!(await confirm(t('billsPage.removePhotoConfirm')))) return
    try {
      await setBillPhoto(bill.id, null)
    } catch (err) {
      console.error(err)
      showToast(t('billsPage.photoError'))
    }
  }

  async function handleConfirmSameAmount() {
    setConfirmingAmount(true)
    try {
      await confirmBillAmount(bill.id)
    } catch (err) {
      console.error(err)
      showToast(t('billsPage.amountReviewError'))
    } finally {
      setConfirmingAmount(false)
    }
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-surface p-4">
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className="flex w-full items-center gap-3 text-left"
      >
        <span className="text-xl">{category?.icon ?? (customCategory ? '🏷️' : '')}</span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-gray-900">
            {bill.title}
            {bill.source === 'shopping' && (
              <span className="ml-1" title={t('billsPage.fromShopping')}>
                🛒
              </span>
            )}
            {bill.isPrivate && (
              <span className="ml-1" title={t('billsPage.privateLabel')}>
                🔒
              </span>
            )}
          </p>
          <p className="text-xs text-gray-500">
            {t('billsPage.dueOn', { date: formatDate(bill.dueDate, i18n.language) })}
            {bill.recurrence !== 'none' && ` · ${t(`recurrence.${bill.recurrence}`)}`}
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold text-gray-900">
            {formatCurrency(bill.totalAmount, i18n.language, house.currency)}
          </p>
          <span className={`text-[10px] font-medium ${isFullyPaid ? 'text-green-600' : 'text-amber-600'}`}>
            {isFullyPaid ? t('billsPage.paid') : t('billsPage.pending')}
          </span>
        </div>
      </button>

      {needsAmountReview && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-amber-50 px-3 py-2 dark:bg-amber-950/40">
          <p className="text-xs font-medium text-amber-800 dark:text-amber-300">{t('billsPage.amountReviewPrompt')}</p>
          <div className="flex shrink-0 gap-3">
            <button
              type="button"
              onClick={onEdit}
              className="text-xs font-medium text-brand-600 hover:text-brand-700"
            >
              {t('billsPage.updateAmount')}
            </button>
            <button
              type="button"
              onClick={handleConfirmSameAmount}
              disabled={confirmingAmount}
              className="text-xs font-medium text-gray-500 hover:text-gray-700 disabled:opacity-50"
            >
              {t('billsPage.sameAmount')}
            </button>
          </div>
        </div>
      )}

      {expanded && (
        <div className="mt-3 border-t border-gray-100 pt-3">
          <div className="mb-3">
            {bill.photoUrl ? (
              <div>
                <a href={bill.photoUrl} target="_blank" rel="noreferrer">
                  <img
                    src={bill.photoUrl}
                    alt=""
                    className="h-32 w-full rounded-lg border border-gray-200 object-cover"
                  />
                </a>
                <div className="mt-1.5 flex gap-3">
                  <label className="cursor-pointer text-xs font-medium text-brand-600 hover:text-brand-700">
                    {uploadingPhoto ? t('billsPage.processingPhoto') : t('billsPage.changePhoto')}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoChange}
                      disabled={uploadingPhoto}
                      className="hidden"
                    />
                  </label>
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
              <label className="block cursor-pointer rounded-lg border border-dashed border-gray-300 px-3 py-2.5 text-center text-xs font-medium text-brand-600 hover:border-brand-400">
                {uploadingPhoto ? t('billsPage.processingPhoto') : t('billsPage.addPhoto')}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  disabled={uploadingPhoto}
                  className="hidden"
                />
              </label>
            )}
          </div>

          {canEdit && (
            <div className="mb-2 flex flex-wrap items-center justify-end gap-3">
              {confirmingDelete ? (
                isRecurring ? (
                  <>
                    <button
                      type="button"
                      onClick={handleDeleteOnlyThis}
                      className="text-xs font-medium text-red-600 hover:text-red-700"
                    >
                      {t('billsPage.deleteOnlyThis')}
                    </button>
                    <button
                      type="button"
                      onClick={handleDeleteFollowing}
                      className="text-xs font-medium text-red-600 hover:text-red-700"
                    >
                      {t('billsPage.deleteThisAndFollowing')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmingDelete(false)}
                      className="text-xs font-medium text-gray-400"
                    >
                      {t('vaultPage.cancel')}
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={handleDeleteNonRecurring}
                      className="text-xs font-medium text-red-600 hover:text-red-700"
                    >
                      {t('billsPage.delete')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmingDelete(false)}
                      className="text-xs font-medium text-gray-400"
                    >
                      {t('vaultPage.cancel')}
                    </button>
                  </>
                )
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setConfirmingDelete(true)}
                    className="text-xs font-medium text-red-600 hover:text-red-700"
                  >
                    {t('billsPage.delete')}
                  </button>
                  <button
                    type="button"
                    onClick={onEdit}
                    className="text-xs font-medium text-brand-600 hover:text-brand-700"
                  >
                    {t('billsPage.edit')}
                  </button>
                </>
              )}
            </div>
          )}
          <ul className="space-y-2">
            {participants.map(({ member, share }) => {
              const canToggle = member.id === user.id || isAdmin
              return (
                <li key={member.id} className="flex items-center justify-between text-sm">
                  <div>
                    <p className="text-gray-800">{member.name}</p>
                    <p className="text-xs text-gray-500">
                      {formatCurrency(share.amount, i18n.language, house.currency)}
                      {share.paid && share.paidAt
                        ? ` · ${t('billsPage.paidOn', { date: formatDate(share.paidAt, i18n.language) })}`
                        : ''}
                    </p>
                  </div>
                  {canToggle ? (
                    <button
                      type="button"
                      onClick={() => toggleParticipantPaid(bill.id, member.id)}
                      className={`rounded-full px-3 py-1 text-xs font-medium ${
                        share.paid
                          ? 'bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-400'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {share.paid ? t('billsPage.paid') : t('billsPage.markPaid')}
                    </button>
                  ) : (
                    <span className={`text-xs font-medium ${share.paid ? 'text-green-600' : 'text-gray-400'}`}>
                      {share.paid ? t('billsPage.paid') : t('billsPage.pending')}
                    </span>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
