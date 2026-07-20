import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext'
import { useHouse } from '../contexts/HouseContext'
import { useBills } from '../contexts/BillsContext'
import { computeBalances } from '../utils/computeBalances'
import { formatCurrency } from '../utils/formatCurrency'

export default function BalanceSummary() {
  const { t, i18n } = useTranslation()
  const { user } = useAuth()
  const { house } = useHouse()
  const { bills } = useBills()

  const { owedToYou, youOwe, totalOwedToYou, totalYouOwe } = useMemo(
    () => computeBalances(bills, user.id),
    [bills, user.id]
  )

  if (totalOwedToYou === 0 && totalYouOwe === 0) return null

  function memberName(memberId) {
    return house.members.find((member) => member.id === memberId)?.name ?? '—'
  }

  return (
    <div className="mb-4 space-y-3">
      {totalOwedToYou > 0 && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-950/40">
          <p className="text-sm font-semibold text-green-800 dark:text-green-300">
            {t('billsPage.owedToYouTotal', { amount: formatCurrency(totalOwedToYou, i18n.language, house.currency) })}
          </p>
          <ul className="mt-2 space-y-1">
            {owedToYou.map(({ memberId, amount }) => (
              <li key={memberId} className="text-sm text-green-700 dark:text-green-400">
                {t('billsPage.owesYou', {
                  name: memberName(memberId),
                  amount: formatCurrency(amount, i18n.language, house.currency),
                })}
              </li>
            ))}
          </ul>
        </div>
      )}

      {totalYouOwe > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/40">
          <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
            {t('billsPage.youOweTotal', { amount: formatCurrency(totalYouOwe, i18n.language, house.currency) })}
          </p>
          <ul className="mt-2 space-y-1">
            {youOwe.map(({ memberId, amount }) => (
              <li key={memberId} className="text-sm text-amber-700 dark:text-amber-400">
                {t('billsPage.youOweMember', {
                  name: memberName(memberId),
                  amount: formatCurrency(amount, i18n.language, house.currency),
                })}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
