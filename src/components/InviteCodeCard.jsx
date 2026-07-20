import { useState } from 'react'
import { useTranslation } from 'react-i18next'

export default function InviteCodeCard({ inviteCode, canManage, onRegenerate }) {
  const { t } = useTranslation()
  const [copied, setCopied] = useState('')

  const inviteLink = `${window.location.origin}/register?invite=${inviteCode}`

  async function copy(value, key) {
    await navigator.clipboard.writeText(value)
    setCopied(key)
    setTimeout(() => setCopied(''), 1500)
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <p className="text-sm font-semibold text-gray-900">{t('housePage.inviteTitle')}</p>
      <p className="mt-1 text-xs text-gray-500">{t('housePage.inviteHint')}</p>

      <div className="mt-3 flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
        <span className="font-mono text-sm tracking-widest text-gray-900">{inviteCode}</span>
        <button type="button" onClick={() => copy(inviteCode, 'code')} className="text-xs font-medium text-brand-600">
          {copied === 'code' ? t('housePage.copied') : t('housePage.copyCode')}
        </button>
      </div>

      <div className="mt-2 flex items-center justify-between">
        <button type="button" onClick={() => copy(inviteLink, 'link')} className="text-xs font-medium text-brand-600">
          {copied === 'link' ? t('housePage.copied') : t('housePage.copyLink')}
        </button>

        {canManage && (
          <button
            type="button"
            onClick={onRegenerate}
            className="text-xs font-medium text-gray-400 hover:text-gray-600"
          >
            {t('housePage.regenerate')}
          </button>
        )}
      </div>
    </div>
  )
}
