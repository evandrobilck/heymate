import { useState } from 'react'
import { useTranslation } from 'react-i18next'

export default function MaskedValue({ value }) {
  const { t } = useTranslation()
  const [revealed, setRevealed] = useState(false)

  if (!value) {
    return <span className="text-gray-400">—</span>
  }

  return (
    <span className="inline-flex items-center gap-2">
      <span className="font-mono">{revealed ? value : '•'.repeat(Math.min(value.length, 10))}</span>
      <button
        type="button"
        onClick={() => setRevealed((prev) => !prev)}
        className="text-xs font-medium text-purple-600"
      >
        {revealed ? t('vaultPage.hide') : t('vaultPage.show')}
      </button>
    </span>
  )
}
