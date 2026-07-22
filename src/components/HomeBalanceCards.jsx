import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext'
import { useHouse } from '../contexts/HouseContext'
import { useBills } from '../contexts/BillsContext'
import { computeBalances } from '../utils/computeBalances'
import { formatCurrency } from '../utils/formatCurrency'
import { isBillOccurrenceVisible } from '../utils/recurrence'
import Avatar from './Avatar'

function BalanceCard({ title, total, entries, tone, emptyLabel, memberName, findMember, currency, locale }) {
  const toneClasses =
    tone === 'positive'
      ? {
          border: 'border-green-200 dark:border-green-800',
          bg: 'bg-green-50 dark:bg-green-950/40',
          text: 'text-green-800 dark:text-green-300',
          amount: 'text-green-700 dark:text-green-400',
        }
      : {
          border: 'border-amber-200 dark:border-amber-800',
          bg: 'bg-amber-50 dark:bg-amber-950/40',
          text: 'text-amber-800 dark:text-amber-300',
          amount: 'text-amber-700 dark:text-amber-400',
        }

  return (
    <div className={`rounded-xl border ${toneClasses.border} ${toneClasses.bg} p-4`}>
      <p className={`text-xs font-medium ${toneClasses.text}`}>{title}</p>
      <p className={`mt-1 text-2xl font-semibold ${toneClasses.amount}`}>
        {formatCurrency(total, locale, currency)}
      </p>

      {entries.length === 0 ? (
        <p className="mt-2 text-xs text-gray-400">{emptyLabel}</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {entries.map(({ memberId, amount }) => {
            const member = findMember(memberId)
            return (
              <li key={memberId} className="flex items-center gap-2">
                <Avatar name={memberName(memberId)} avatarUrl={member?.avatarUrl} size="sm" />
                <span className="min-w-0 flex-1 truncate text-sm text-gray-700">{memberName(memberId)}</span>
                <span className={`text-sm font-medium ${toneClasses.text}`}>
                  {formatCurrency(amount, locale, currency)}
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

export default function HomeBalanceCards() {
  const { t, i18n } = useTranslation()
  const { user } = useAuth()
  const { house } = useHouse()
  const { bills } = useBills()

  const { owedToYou, youOwe, totalOwedToYou, totalYouOwe } = useMemo(
    () => computeBalances(bills.filter(isBillOccurrenceVisible), user.id),
    [bills, user.id]
  )

  function findMember(memberId) {
    return house.members.find((member) => member.id === memberId)
  }

  function memberName(memberId) {
    return findMember(memberId)?.name ?? '—'
  }

  return (
    <div className="space-y-4">
      <BalanceCard
        title={t('home.youOweTitle')}
        total={totalYouOwe}
        entries={youOwe}
        tone="warning"
        emptyLabel={t('home.allSettled')}
        memberName={memberName}
        findMember={findMember}
        currency={house.currency}
        locale={i18n.language}
      />
      <BalanceCard
        title={t('home.owedToYouTitle')}
        total={totalOwedToYou}
        entries={owedToYou}
        tone="positive"
        emptyLabel={t('home.allSettled')}
        memberName={memberName}
        findMember={findMember}
        currency={house.currency}
        locale={i18n.language}
      />
    </div>
  )
}
