import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext'
import { useVault } from '../contexts/VaultContext'
import Avatar from './Avatar'
import MaskedValue from './MaskedValue'

export default function MemberPaymentRow({ member }) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const { vault } = useVault()
  const info = vault.memberPayments[member.id] ?? { payId: '', bankDetails: '' }
  const isSelf = member.id === user.id

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
        <p>
          {t('vaultPage.payIdLabel')}: <MaskedValue value={info.payId} />
        </p>
        <p>
          {t('vaultPage.bankDetailsLabel')}: <MaskedValue value={info.bankDetails} />
        </p>
      </div>
    </li>
  )
}
