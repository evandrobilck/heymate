import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext'
import { useVault } from '../contexts/VaultContext'
import Avatar from './Avatar'

const EMPTY_INFO = {
  phone: '',
  payId: '',
  bankDetails: '',
  emergencyContactName: '',
  emergencyContactPhone: '',
}

export default function MemberPaymentRow({ member }) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const { vault } = useVault()
  const info = vault.memberPayments[member.id] ?? EMPTY_INFO
  const isSelf = member.id === user.id

  const emergencyContact = [info.emergencyContactName, info.emergencyContactPhone].filter(Boolean).join(' · ')

  return (
    <li className="rounded-xl border border-gray-200 bg-white p-3">
      <div className="flex items-center gap-3">
        <Avatar name={member.name} avatarUrl={member.avatarUrl} size="sm" />
        <p className="flex-1 text-sm font-medium text-gray-900">{member.name}</p>
        {isSelf && (
          <Link to="/perfil" className="text-xs font-medium text-purple-600">
            {t('vaultPage.editInProfile')}
          </Link>
        )}
      </div>

      <div className="mt-2 space-y-1 pl-11 text-xs text-gray-600">
        <p>{t('profilePage.phone')}: {info.phone || '—'}</p>
        <p>{t('vaultPage.payIdLabel')}: {info.payId || '—'}</p>
        <p>{t('vaultPage.bankDetailsLabel')}: {info.bankDetails || '—'}</p>
        <p>{t('profilePage.emergencyContact')}: {emergencyContact || '—'}</p>
      </div>
    </li>
  )
}
