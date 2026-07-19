import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useHouse } from '../contexts/HouseContext'
import { useVault } from '../contexts/VaultContext'

export default function WifiCard() {
  const { t } = useTranslation()
  const { isAdmin } = useHouse()
  const { vault, updateWifi } = useVault()
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(vault.wifi.name)
  const [password, setPassword] = useState(vault.wifi.password)

  function handleSave(event) {
    event.preventDefault()
    updateWifi(name.trim(), password)
    setEditing(false)
  }

  function handleCancel() {
    setName(vault.wifi.name)
    setPassword(vault.wifi.password)
    setEditing(false)
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-900">📶 {t('vaultPage.wifiTitle')}</p>
        {isAdmin && !editing && (
          <button type="button" onClick={() => setEditing(true)} className="text-xs font-medium text-purple-600">
            {t('vaultPage.edit')}
          </button>
        )}
      </div>

      {editing ? (
        <form onSubmit={handleSave} className="mt-3 space-y-2">
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={t('vaultPage.wifiNameLabel')}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-purple-500"
          />
          <input
            type="text"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder={t('vaultPage.wifiPasswordLabel')}
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
        <div className="mt-3 space-y-1 text-sm">
          <p className="text-gray-600">
            {t('vaultPage.wifiNameLabel')}: <span className="font-medium text-gray-900">{vault.wifi.name}</span>
          </p>
          <p className="text-gray-600">
            {t('vaultPage.wifiPasswordLabel')}: <span className="font-medium text-gray-900">{vault.wifi.password || '—'}</span>
          </p>
        </div>
      )}
    </div>
  )
}
