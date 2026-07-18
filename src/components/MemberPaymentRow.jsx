import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useVault } from '../contexts/VaultContext'
import Avatar from './Avatar'
import MaskedValue from './MaskedValue'

export default function MemberPaymentRow({ member, canEdit }) {
  const { t } = useTranslation()
  const { vault, updateMemberPayment } = useVault()
  const info = vault.memberPayments[member.id] ?? { payId: '', bankDetails: '' }
  const [editing, setEditing] = useState(false)
  const [payId, setPayId] = useState(info.payId)
  const [bankDetails, setBankDetails] = useState(info.bankDetails)

  function handleSave(event) {
    event.preventDefault()
    updateMemberPayment(member.id, payId.trim(), bankDetails.trim())
    setEditing(false)
  }

  function handleCancel() {
    setPayId(info.payId)
    setBankDetails(info.bankDetails)
    setEditing(false)
  }

  return (
    <li className="rounded-xl border border-gray-200 bg-white p-3">
      <div className="flex items-center gap-3">
        <Avatar name={member.name} size="sm" />
        <p className="flex-1 text-sm font-medium text-gray-900">{member.name}</p>
        {canEdit && !editing && (
          <button type="button" onClick={() => setEditing(true)} className="text-xs font-medium text-purple-600">
            {t('vaultPage.edit')}
          </button>
        )}
      </div>

      {editing ? (
        <form onSubmit={handleSave} className="mt-3 space-y-2">
          <input
            type="text"
            value={payId}
            onChange={(event) => setPayId(event.target.value)}
            placeholder={t('vaultPage.payIdLabel')}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-purple-500"
          />
          <input
            type="text"
            value={bankDetails}
            onChange={(event) => setBankDetails(event.target.value)}
            placeholder={t('vaultPage.bankDetailsLabel')}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-purple-500"
          />
          <div className="flex gap-2">
            <button type="submit" className="flex-1 rounded-lg bg-purple-600 py-2 text-xs font-medium text-white">
              {t('vaultPage.save')}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="flex-1 rounded-lg border border-gray-300 py-2 text-xs font-medium text-gray-600"
            >
              {t('vaultPage.cancel')}
            </button>
          </div>
        </form>
      ) : (
        <div className="mt-2 space-y-1 pl-11 text-xs text-gray-600">
          <p>
            {t('vaultPage.payIdLabel')}: <MaskedValue value={info.payId} />
          </p>
          <p>
            {t('vaultPage.bankDetailsLabel')}: <MaskedValue value={info.bankDetails} />
          </p>
        </div>
      )}
    </li>
  )
}
