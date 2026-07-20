import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useHouse } from '../contexts/HouseContext'
import { useBills } from '../contexts/BillsContext'
import { useCategories } from '../contexts/CategoriesContext'
import { billCategories } from '../services/mockData'
import { toDayKey } from '../utils/calendar'
import {
  computeCategoryTotalsInRange,
  computeMonthlyTotals,
  computeTotalInRange,
  getMonthKeysWithBills,
  getPreviousRange,
} from '../utils/expenseStats'
import { downloadCsv } from '../utils/exportCsv'
import { formatCurrency } from '../utils/formatCurrency'
import { formatDate } from '../utils/formatDate'
import { formatMonth } from '../utils/leaderboard'

const CATEGORY_COLORS = {
  rent: '#a855f7',
  utilities: '#f59e0b',
  water: '#06b6d4',
  gas: '#ef4444',
  internet: '#3b82f6',
  groceries: '#10b981',
  other: '#6b7280',
}
const CUSTOM_CATEGORY_COLOR = '#f97316'

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function endOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0)
}

function MetricCard({ label, children, sub }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <p className="text-xs font-medium text-gray-500">{label}</p>
      {children}
      {sub && <p className="mt-1 text-xs text-gray-400">{sub}</p>}
    </div>
  )
}

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

  const today = useMemo(() => new Date(), [])
  const [periodStart, setPeriodStart] = useState(toDayKey(startOfMonth(today)))
  const [periodEnd, setPeriodEnd] = useState(toDayKey(endOfMonth(today)))

  function applyPreset(preset) {
    if (preset === 'thisMonth') {
      setPeriodStart(toDayKey(startOfMonth(today)))
      setPeriodEnd(toDayKey(endOfMonth(today)))
    } else if (preset === 'lastMonth') {
      const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1)
      setPeriodStart(toDayKey(startOfMonth(lastMonth)))
      setPeriodEnd(toDayKey(endOfMonth(lastMonth)))
    } else if (preset === 'last3Months') {
      setPeriodStart(toDayKey(startOfMonth(new Date(today.getFullYear(), today.getMonth() - 2, 1))))
      setPeriodEnd(toDayKey(endOfMonth(today)))
    }
  }

  const monthKeys = useMemo(() => getMonthKeysWithBills(bills), [bills])

  const categoryTotals = useMemo(
    () => computeCategoryTotalsInRange(bills, periodStart, periodEnd),
    [bills, periodStart, periodEnd]
  )
  const categoryData = [
    ...billCategories.map((category) => ({
      id: category.id,
      name: t(category.labelKey),
      icon: category.icon,
      color: CATEGORY_COLORS[category.id],
    })),
    ...allCustomCategories.map((category) => ({
      id: category.id,
      name: category.label,
      icon: '🏷️',
      color: CUSTOM_CATEGORY_COLOR,
    })),
  ]
    .map((category) => ({ ...category, value: categoryTotals[category.id] || 0 }))
    .filter((entry) => entry.value > 0)
    .sort((a, b) => b.value - a.value)

  const periodTotal = useMemo(
    () => computeTotalInRange(bills, periodStart, periodEnd),
    [bills, periodStart, periodEnd]
  )
  const previousRange = useMemo(() => getPreviousRange(periodStart, periodEnd), [periodStart, periodEnd])
  const previousTotal = useMemo(
    () => computeTotalInRange(bills, previousRange.start, previousRange.end),
    [bills, previousRange]
  )
  const percentChange = previousTotal > 0 ? ((periodTotal - previousTotal) / previousTotal) * 100 : null
  const isIncrease = percentChange !== null && percentChange > 0.5
  const isDecrease = percentChange !== null && percentChange < -0.5
  const topCategory = categoryData[0] ?? null

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
        .filter((bill) => bill.dueDate >= periodStart && bill.dueDate <= periodEnd)
        .map((bill) => [bill.title, categoryLabel(bill.category), bill.totalAmount, bill.dueDate]),
    ]
    downloadCsv(`heyflat-expenses-${periodStart}_to_${periodEnd}.csv`, rows)
  }

  if (bills.length === 0) {
    return (
      <div>
        <h1 className="text-xl font-semibold text-gray-900">{t('nav.expenses')}</h1>
        <p className="mt-4 text-sm text-gray-400">{t('expensesPage.empty')}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-gray-900">{t('nav.expenses')}</h1>
        <button
          type="button"
          onClick={handleExport}
          className="rounded-lg border border-purple-300 px-4 py-2 text-sm font-medium text-purple-600 hover:bg-purple-50"
        >
          {t('expensesPage.export')}
        </button>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="text-xs font-medium text-gray-500">{t('expensesPage.from')}</label>
          <input
            type="date"
            value={periodStart}
            onChange={(event) => setPeriodStart(event.target.value)}
            className="mt-1 block rounded-lg border border-gray-300 px-2 py-1.5 text-sm outline-none focus:border-purple-500"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500">{t('expensesPage.to')}</label>
          <input
            type="date"
            value={periodEnd}
            onChange={(event) => setPeriodEnd(event.target.value)}
            className="mt-1 block rounded-lg border border-gray-300 px-2 py-1.5 text-sm outline-none focus:border-purple-500"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {['thisMonth', 'lastMonth', 'last3Months'].map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => applyPreset(preset)}
              className="rounded-full border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:border-purple-300 hover:text-purple-600"
            >
              {t(`expensesPage.${preset}`)}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <MetricCard
          label={t('expensesPage.totalPeriod')}
          sub={`${formatDate(periodStart, i18n.language)} – ${formatDate(periodEnd, i18n.language)}`}
        >
          <p className="mt-1 text-2xl font-semibold text-gray-900">
            {formatCurrency(periodTotal, i18n.language, house.currency)}
          </p>
        </MetricCard>

        <MetricCard
          label={t('expensesPage.vsPrevious')}
          sub={
            percentChange === null
              ? undefined
              : `${formatCurrency(previousTotal, i18n.language, house.currency)} ${t('expensesPage.previousPeriod')}`
          }
        >
          <p
            className={`mt-1 text-2xl font-semibold ${
              percentChange === null ? 'text-gray-400' : isIncrease ? 'text-red-600' : isDecrease ? 'text-green-600' : 'text-gray-900'
            }`}
          >
            {percentChange === null
              ? t('expensesPage.noPreviousData')
              : `${percentChange > 0 ? '+' : ''}${percentChange.toFixed(0)}%`}
          </p>
        </MetricCard>

        <MetricCard label={t('expensesPage.topCategory')}>
          {topCategory ? (
            <>
              <p className="mt-1 text-lg font-semibold text-gray-900">
                {topCategory.icon} {topCategory.name}
              </p>
              <p className="mt-1 text-xs text-gray-400">
                {formatCurrency(topCategory.value, i18n.language, house.currency)}
              </p>
            </>
          ) : (
            <p className="mt-1 text-sm text-gray-400">{t('expensesPage.noneInPeriod')}</p>
          )}
        </MetricCard>
      </div>

      <div>
        <p className="text-sm font-semibold text-gray-900">{t('expensesPage.byCategory')}</p>
        {categoryData.length === 0 ? (
          <p className="mt-2 text-sm text-gray-400">{t('expensesPage.noneInPeriod')}</p>
        ) : (
          <div className="mt-2 flex gap-3 overflow-x-auto pb-1">
            {categoryData.map((category) => {
              const share = periodTotal > 0 ? (category.value / periodTotal) * 100 : 0
              return (
                <div
                  key={category.id}
                  className="min-w-[150px] shrink-0 rounded-xl border border-gray-200 bg-white p-3"
                >
                  <p className="flex items-center gap-1.5 text-xs font-medium text-gray-500">
                    <span>{category.icon}</span>
                    {category.name}
                  </p>
                  <p className="mt-1 text-base font-semibold text-gray-900">
                    {formatCurrency(category.value, i18n.language, house.currency)}
                  </p>
                  <p className="text-xs text-gray-400">{share.toFixed(0)}%</p>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {categoryData.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-4">
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
        </div>
      )}

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
    </div>
  )
}
