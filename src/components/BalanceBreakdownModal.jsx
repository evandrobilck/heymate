import { useTranslation } from 'react-i18next'
import Modal from './Modal'
import { formatCurrency } from '../utils/formatCurrency'
import { formatDate } from '../utils/formatDate'

function BreakdownList({ items, locale, currency }) {
  if (items.length === 0) {
    return <p className="text-xs text-gray-400">—</p>
  }

  return (
    <ul className="space-y-1.5">
      {items.map((item) => (
        <li
          key={`${item.billId}-${item.occurrenceDate ?? 'single'}`}
          className="flex items-center justify-between gap-3 text-sm"
        >
          <span className="min-w-0 flex-1 truncate text-gray-700">
            {item.title}
            {item.occurrenceDate && (
              <span className="text-gray-400"> · {formatDate(item.occurrenceDate, locale)}</span>
            )}
          </span>
          <span className="shrink-0 font-medium text-gray-900">
            {formatCurrency(item.amount, locale, currency)}
          </span>
        </li>
      ))}
    </ul>
  )
}

export default function BalanceBreakdownModal({ memberName, netAmount, direction, breakdown, currency, locale, onClose }) {
  const { t } = useTranslation()
  const { theyOweYou = [], youOweThem = [] } = breakdown ?? {}

  const totalTheyOweYou = theyOweYou.reduce((sum, item) => sum + item.amount, 0)
  const totalYouOweThem = youOweThem.reduce((sum, item) => sum + item.amount, 0)

  return (
    <Modal>
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-lg font-semibold text-gray-900">
          {t('billsPage.breakdownTitle', { name: memberName })}
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          aria-label={t('billsPage.close')}
        >
          ✕
        </button>
      </div>

      <p
        className={`mt-1 text-sm font-medium ${
          direction === 'owedToYou' ? 'text-green-700' : 'text-amber-700'
        }`}
      >
        {direction === 'owedToYou'
          ? t('billsPage.owesYou', { name: memberName, amount: formatCurrency(netAmount, locale, currency) })
          : t('billsPage.youOweMember', { name: memberName, amount: formatCurrency(netAmount, locale, currency) })}
      </p>

      <div className="mt-4 space-y-4">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-green-700">
            {t('billsPage.breakdownTheyOwe', { name: memberName })}
          </p>
          <BreakdownList items={theyOweYou} locale={locale} currency={currency} />
          {theyOweYou.length > 0 && (
            <p className="mt-2 text-right text-xs text-gray-500">
              {t('billsPage.breakdownSubtotal', { amount: formatCurrency(totalTheyOweYou, locale, currency) })}
            </p>
          )}
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-amber-700">
            {t('billsPage.breakdownYouOwe', { name: memberName })}
          </p>
          <BreakdownList items={youOweThem} locale={locale} currency={currency} />
          {youOweThem.length > 0 && (
            <p className="mt-2 text-right text-xs text-gray-500">
              {t('billsPage.breakdownSubtotal', { amount: formatCurrency(totalYouOweThem, locale, currency) })}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-gray-200 pt-3 text-sm font-semibold text-gray-900">
          <span>{t('billsPage.breakdownNet')}</span>
          <span>{formatCurrency(totalTheyOweYou - totalYouOweThem, locale, currency)}</span>
        </div>
      </div>

      <button
        type="button"
        onClick={onClose}
        className="mt-5 w-full rounded-lg bg-gray-100 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
      >
        {t('billsPage.close')}
      </button>
    </Modal>
  )
}
