import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useHouse } from '../contexts/HouseContext'
import { useVault } from '../contexts/VaultContext'

export default function CustomFieldsCard() {
  const { t } = useTranslation()
  const { isAdmin } = useHouse()
  const { vault, addCustomField, removeCustomField } = useVault()
  const [adding, setAdding] = useState(false)
  const [label, setLabel] = useState('')
  const [value, setValue] = useState('')

  function handleAdd(event) {
    event.preventDefault()
    if (!label.trim() || !value.trim()) return
    addCustomField(label.trim(), value.trim())
    setLabel('')
    setValue('')
    setAdding(false)
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-900">📝 {t('vaultPage.customFieldsTitle')}</p>
        {isAdmin && !adding && (
          <button type="button" onClick={() => setAdding(true)} className="text-xs font-medium text-purple-600">
            {t('vaultPage.addField')}
          </button>
        )}
      </div>

      {vault.customFields.length === 0 && !adding && (
        <p className="mt-2 text-sm text-gray-400">{t('vaultPage.noCustomFields')}</p>
      )}

      {vault.customFields.length > 0 && (
        <ul className="mt-2 space-y-2">
          {vault.customFields.map((field) => (
            <li key={field.id} className="flex items-center justify-between text-sm">
              <div>
                <p className="text-gray-600">{field.label}</p>
                <p className="font-medium text-gray-900">{field.value}</p>
              </div>
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => removeCustomField(field.id)}
                  className="text-xs font-medium text-gray-400 hover:text-red-600"
                >
                  {t('vaultPage.remove')}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {adding && (
        <form onSubmit={handleAdd} className="mt-3 space-y-2 border-t border-gray-100 pt-3">
          <input
            type="text"
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            placeholder={t('vaultPage.fieldLabelPlaceholder')}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-purple-500"
          />
          <input
            type="text"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder={t('vaultPage.fieldValuePlaceholder')}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-purple-500"
          />
          <div className="flex gap-2">
            <button type="submit" className="flex-1 rounded-lg bg-purple-600 py-2 text-xs font-medium text-white">
              {t('vaultPage.save')}
            </button>
            <button
              type="button"
              onClick={() => setAdding(false)}
              className="flex-1 rounded-lg border border-gray-300 py-2 text-xs font-medium text-gray-600"
            >
              {t('vaultPage.cancel')}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
