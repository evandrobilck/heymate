import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext'
import { useCategories } from '../contexts/CategoriesContext'
import { useHistoricalExpenses } from '../contexts/HistoricalExpensesContext'
import { billCategories } from '../services/mockData'
import Modal from './Modal'

export default function AddHistoricalExpenseForm({ onClose }) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const { customBillCategories, hiddenCategoryIds } = useCategories()
  const { addHistoricalExpense } = useHistoricalExpenses()

  const visibleBuiltInCategories = billCategories.filter((cat) => !hiddenCategoryIds.includes(cat.id))
  const pickableBuiltInCategories =
    visibleBuiltInCategories.length > 0 || customBillCategories.length > 0 ? visibleBuiltInCategories : billCategories

  const [title, setTitle] = useState('')
  const [category, setCategory] = useState(pickableBuiltInCategories[0]?.id ?? customBillCategories[0]?.id)
  const [totalAmount, setTotalAmount] = useState('')
  const [expenseDate, setExpenseDate] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const amountValue = Number(totalAmount) || 0
  const isValid = title.trim() !== '' && amountValue > 0 && expenseDate !== ''

  async function handleSubmit(event) {
    event.preventDefault()
    if (!isValid) return
    setSubmitting(true)
    try {
      await addHistoricalExpense({
        title: title.trim(),
        category,
        totalAmount: amountValue,
        expenseDate,
        createdBy: user.id,
      })
      onClose()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal>
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-900">{t('expensesPage.addOldTitle')}</h2>
        <button type="button" onClick={onClose} className="text-sm text-gray-400">
          {t('billsPage.close')}
        </button>
      </div>
      <p className="mt-1 text-xs text-gray-400">{t('expensesPage.addOldHint')}</p>

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
            <label className="text-xs font-medium text-gray-600">{t('expensesPage.dateLabel')}</label>
            <input
              type="date"
              value={expenseDate}
              onChange={(event) => setExpenseDate(event.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={!isValid || submitting}
          className="w-full rounded-lg bg-brand-600 py-2.5 text-sm font-medium text-white disabled:opacity-40"
        >
          {t('expensesPage.save')}
        </button>
      </form>
    </Modal>
  )
}
