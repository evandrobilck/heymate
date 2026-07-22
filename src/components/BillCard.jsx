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

export default function BillCard({ bill, onEdit }) {
  const { t, i18n } = useTranslation()
  const { user } = useAuth()
  const { house, isAdmin } = useHouse()
  const { toggleParticipantPaid, deleteBill, deleteOccurrence, deleteOccurrenceAndFollowing } = useBills()
  const { customBillCategories, customShoppingCategories } = useCategories()
  const showToast = useToast()
  const confirm = useConfirm()
  const [expanded, setExpanded] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)

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

      {expanded && (
        <div className="mt-3 border-t border-gray-100 pt-3">
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
