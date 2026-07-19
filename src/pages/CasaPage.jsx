import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext'
import { useHouse } from '../contexts/HouseContext'
import InviteCodeCard from '../components/InviteCodeCard'
import AddressCard from '../components/AddressCard'
import MemberListItem from '../components/MemberListItem'
import WifiCard from '../components/WifiCard'
import PaymentInfoList from '../components/PaymentInfoList'
import CustomFieldsCard from '../components/CustomFieldsCard'

export default function CasaPage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const {
    house,
    isAdmin,
    markMemberAsLeft,
    makeAdmin,
    updateMemberJoinedAt,
    regenerateInviteCode,
    leaveHouse,
    resetHouseData,
    deleteHouse,
  } = useHouse()
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

  async function handleEditJoinedAt(memberId, joinedAt) {
    try {
      await updateMemberJoinedAt(memberId, joinedAt)
    } catch (err) {
      console.error(err)
      alert(t('housePage.editJoinDateError'))
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

  async function handleResetData() {
    if (!window.confirm(t('housePage.resetDataConfirm'))) return
    try {
      await resetHouseData()
    } catch (err) {
      console.error(err)
      alert(t('housePage.resetDataError'))
    }
  }

  async function handleDeleteHouse() {
    const typed = window.prompt(t('housePage.deleteHouseConfirmPrompt', { name: house.name }))
    if (typed === null) return
    if (typed !== house.name) {
      alert(t('housePage.deleteHouseNameMismatch'))
      return
    }
    try {
      await deleteHouse()
      navigate('/onboarding')
    } catch (err) {
      console.error(err)
      alert(t('housePage.deleteHouseError'))
    }
  }

  return (
    <div className="space-y-6">
      {house.photoUrl && (
        <img
          src={house.photoUrl}
          alt={house.name}
          className="h-40 w-full rounded-xl object-cover sm:h-52"
        />
      )}

      <h1 className="text-xl font-semibold text-gray-900">{house.name}</h1>

      <AddressCard />

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
              onEditJoinedAt={handleEditJoinedAt}
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

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-6">
        <button
          type="button"
          onClick={handleLeaveHouse}
          className="rounded-full border border-red-300 px-4 py-1.5 text-xs font-medium text-red-500 hover:border-red-400 hover:text-red-700"
        >
          {t('housePage.leaveHouse')}
        </button>

        {isAdmin && (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleResetData}
              className="rounded-full border border-red-300 px-4 py-1.5 text-xs font-medium text-red-500 hover:border-red-400 hover:text-red-700"
            >
              {t('housePage.resetData')}
            </button>
            <button
              type="button"
              onClick={handleDeleteHouse}
              className="rounded-full border border-red-600 bg-red-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-red-700"
            >
              {t('housePage.deleteHouse')}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
