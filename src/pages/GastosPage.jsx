import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useHouse } from '../contexts/HouseContext'
import { useBills } from '../contexts/BillsContext'
import { useCategories } from '../contexts/CategoriesContext'
import { billCategories } from '../services/mockData'
import { computeCategoryTotals, computeMonthlyTotals, getMonthKeysWithBills } from '../utils/expenseStats'
import { downloadCsv } from '../utils/exportCsv'
import { formatCurrency } from '../utils/formatCurrency'
import { formatMonth } from '../utils/leaderboard'

const CATEGORY_COLORS = {
  rent: '#a855f7',
  utilities: '#f59e0b',
  internet: '#3b82f6',
  groceries: '#10b981',
  other: '#6b7280',
}
const CUSTOM_CATEGORY_COLOR = '#f97316'

export default function GastosPage() {
  const { t, i18n } = useTranslation()
  const { house } = useHouse()
  const { bills } = useBills()
  const { customBillCategories, customShoppingCategories } = useCategories()

  const allCustomCategories = [...customBillCategories, ...customShoppingCategories]

  function categoryLabel(categoryId) {
    const builtin = billCategories.find((cat) => cat.id === categoryId)
    if (builtin) return t(builtin.labelKey)
    return allCustomCategories.find((cat) => cat.id === categoryId)?.label ?? categoryId
  }

  const monthKeys = useMemo(() => getMonthKeysWithBills(bills), [bills])
  const [selectedMonth, setSelectedMonth] = useState(monthKeys[0] ?? '')

  const categoryTotals = useMemo(() => computeCategoryTotals(bills, selectedMonth), [bills, selectedMonth])
  const categoryData = [
    ...billCategories.map((category) => ({
      id: category.id,
      name: t(category.labelKey),
      color: CATEGORY_COLORS[category.id],
    })),
    ...allCustomCategories.map((category) => ({
      id: category.id,
      name: category.label,
      color: CUSTOM_CATEGORY_COLOR,
    })),
  ]
    .map((category) => ({ ...category, value: categoryTotals[category.id] || 0 }))
    .filter((entry) => entry.value > 0)
  const monthTotal = categoryData.reduce((sum, entry) => sum + entry.value, 0)

  const monthlyData = useMemo(() => {
    const recentMonths = monthKeys.slice(0, 6).reverse()
    return computeMonthlyTotals(bills, recentMonths).map((entry) => ({
      ...entry,
      label: formatMonth(entry.monthKey, i18n.language),
    }))
  }, [bills, monthKeys, i18n.language])

  function handleExport() {
    const rows = [
      [t('expensesPage.csvTitle'), t('expensesPage.csvCategory'), t('expensesPage.csvAmount'), t('expensesPage.csvDueDate')],
      ...bills
        .filter((bill) => bill.dueDate.startsWith(selectedMonth))
        .map((bill) => [bill.title, categoryLabel(bill.category), bill.totalAmount, bill.dueDate]),
    ]
    downloadCsv(`heyflat-expenses-${selectedMonth}.csv`, rows)
  }

  if (monthKeys.length === 0) {
    return (
      <div>
        <h1 className="text-xl font-semibold text-gray-900">{t('nav.expenses')}</h1>
        <p className="mt-4 text-sm text-gray-400">{t('expensesPage.empty')}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">{t('nav.expenses')}</h1>
        <select
          value={selectedMonth}
          onChange={(event) => setSelectedMonth(event.target.value)}
          className="rounded-lg border border-gray-300 px-2 py-1 text-sm"
        >
          {monthKeys.map((monthKey) => (
            <option key={monthKey} value={monthKey}>
              {formatMonth(monthKey, i18n.language)}
            </option>
          ))}
        </select>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-gray-900">{t('expensesPage.byCategory')}</p>
          <p className="text-sm font-semibold text-gray-900">{formatCurrency(monthTotal, i18n.language, house.currency)}</p>
        </div>

        {categoryData.length === 0 ? (
          <p className="mt-3 text-sm text-gray-400">{t('expensesPage.noneThisMonth')}</p>
        ) : (
          <>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={categoryData} dataKey="value" nameKey="name" innerRadius={45} outerRadius={70} paddingAngle={2}>
                    {categoryData.map((entry) => (
                      <Cell key={entry.id} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(value, i18n.language, house.currency)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="mt-2 space-y-1">
              {categoryData.map((entry) => (
                <li key={entry.id} className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-2 text-gray-600">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
                    {entry.name}
                  </span>
                  <span className="font-medium text-gray-900">
                    {formatCurrency(entry.value, i18n.language, house.currency)}
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <p className="text-sm font-semibold text-gray-900">{t('expensesPage.monthlyComparison')}</p>
        <div className="mt-2 h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} width={40} />
              <Tooltip formatter={(value) => formatCurrency(value, i18n.language, house.currency)} />
              <Bar dataKey="total" fill="#9333ea" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <button
        type="button"
        onClick={handleExport}
        className="w-full rounded-lg border border-purple-300 py-2.5 text-sm font-medium text-purple-600"
      >
        {t('expensesPage.export')}
      </button>
    </div>
  )
}
