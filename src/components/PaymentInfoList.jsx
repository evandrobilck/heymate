import { useTranslation } from 'react-i18next'
import { useHouse } from '../contexts/HouseContext'
import MemberPaymentRow from './MemberPaymentRow'

export default function PaymentInfoList() {
  const { t } = useTranslation()
  const { house } = useHouse()

  const activeMembers = house.members.filter((member) => !member.leftAt)

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <p className="text-sm font-semibold text-gray-900">💳 {t('vaultPage.paymentsTitle')}</p>
      <ul className="mt-3 space-y-2">
        {activeMembers.map((member) => (
          <MemberPaymentRow key={member.id} member={member} />
        ))}
      </ul>
    </div>
  )
}
