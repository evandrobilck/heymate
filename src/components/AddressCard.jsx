import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useHouse } from '../contexts/HouseContext'

export default function AddressCard() {
  const { t } = useTranslation()
  const { house, isAdmin, updateHouseAddress } = useHouse()
  const [editing, setEditing] = useState(false)
  const [address, setAddress] = useState(house.address ?? '')

  function handleSave(event) {
    event.preventDefault()
    updateHouseAddress(address.trim())
    setEditing(false)
  }

  function handleCancel() {
    setAddress(house.address ?? '')
    setEditing(false)
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-900">📍 {t('housePage.addressTitle')}</p>
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
            value={address}
            onChange={(event) => setAddress(event.target.value)}
            placeholder={t('housePage.addressPlaceholder')}
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
        <p className="mt-2 text-sm text-gray-600">{house.address || '—'}</p>
      )}
    </div>
  )
}
