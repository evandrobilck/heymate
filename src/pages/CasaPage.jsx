import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext'
import { useHouse } from '../contexts/HouseContext'
import InviteCodeCard from '../components/InviteCodeCard'
import MemberListItem from '../components/MemberListItem'
import WifiCard from '../components/WifiCard'
import PaymentInfoList from '../components/PaymentInfoList'
import CustomFieldsCard from '../components/CustomFieldsCard'

export default function CasaPage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const { house, isAdmin, markMemberAsLeft, regenerateInviteCode } = useHouse()

  const activeMembers = house.members.filter((member) => !member.leftAt)
  const pastMembers = house.members.filter((member) => member.leftAt)

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-gray-900">{house.name}</h1>

      <InviteCodeCard inviteCode={house.inviteCode} canManage={isAdmin} onRegenerate={regenerateInviteCode} />

      <div>
        <h2 className="text-sm font-semibold text-gray-900">{t('housePage.membersTitle')}</h2>
        <ul className="mt-2 divide-y divide-gray-100">
          {activeMembers.map((member) => (
            <MemberListItem
              key={member.id}
              member={member}
              canManage={isAdmin && member.id !== user.id}
              onMarkAsLeft={markMemberAsLeft}
            />
          ))}
        </ul>
      </div>

      {pastMembers.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-900">{t('housePage.pastMembersTitle')}</h2>
          <ul className="mt-2 divide-y divide-gray-100 opacity-60">
            {pastMembers.map((member) => (
              <MemberListItem key={member.id} member={member} isPast />
            ))}
          </ul>
        </div>
      )}

      <div className="space-y-3 border-t border-gray-100 pt-6">
        <h2 className="text-sm font-semibold text-gray-900">🔒 {t('vaultPage.title')}</h2>
        <WifiCard />
        <PaymentInfoList />
        <CustomFieldsCard />
      </div>
    </div>
  )
}
