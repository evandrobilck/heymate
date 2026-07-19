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
        <div className="rounded-xl border border-green-200 bg-green-50 p-4">
          <p className="text-sm font-semibold text-green-800">
            {t('billsPage.owedToYouTotal', { amount: formatCurrency(totalOwedToYou, i18n.language) })}
          </p>
          <ul className="mt-2 space-y-1">
            {owedToYou.map(({ memberId, amount }) => (
              <li key={memberId} className="text-sm text-green-700">
                {t('billsPage.owesYou', {
                  name: memberName(memberId),
                  amount: formatCurrency(amount, i18n.language),
                })}
              </li>
            ))}
          </ul>
        </div>
      )}

      {totalYouOwe > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-800">
            {t('billsPage.youOweTotal', { amount: formatCurrency(totalYouOwe, i18n.language) })}
          </p>
          <ul className="mt-2 space-y-1">
            {youOwe.map(({ memberId, amount }) => (
              <li key={memberId} className="text-sm text-amber-700">
                {t('billsPage.youOweMember', {
                  name: memberName(memberId),
                  amount: formatCurrency(amount, i18n.language),
                })}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
