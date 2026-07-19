import { useNavigate } from 'react-router-dom'
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
  const { house, isAdmin, markMemberAsLeft, makeAdmin, regenerateInviteCode, leaveHouse } = useHouse()
  const navigate = useNavigate()

  if (!house) return null

  const activeMembers = house.members.filter((member) => !member.leftAt)
  const pastMembers = house.members.filter((member) => member.leftAt)

  async function handleMakeAdmin(memberId) {
    if (!window.confirm(t('housePage.makeAdminConfirm'))) return
    try {
      await makeAdmin(memberId)
    } catch (err) {
      console.error(err)
      alert(t('housePage.makeAdminError'))
    }
  }

  async function handleLeaveHouse() {
    if (!window.confirm(t('housePage.leaveConfirm'))) return
    try {
      await leaveHouse()
      navigate('/onboarding')
    } catch (err) {
      console.error(err)
      alert(t('housePage.leaveError'))
    }
  }

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
              onMakeAdmin={handleMakeAdmin}
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

      <div className="border-t border-gray-100 pt-6">
        <button type="button" onClick={handleLeaveHouse} className="text-xs font-medium text-red-500 hover:text-red-700">
          {t('housePage.leaveHouse')}
        </button>
      </div>
    </div>
  )
}
