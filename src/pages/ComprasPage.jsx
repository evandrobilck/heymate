import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext'
import { useShopping } from '../contexts/ShoppingContext'
import ShoppingListItem from '../components/ShoppingListItem'
import SkeletonRows from '../components/SkeletonRows'

export default function ComprasPage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const { items, loading, addItem } = useShopping()
  const [newItemName, setNewItemName] = useState('')

  const pendingItems = items.filter((item) => !item.bought)
  const boughtItems = items.filter((item) => item.bought)

  function handleAddItem(event) {
    event.preventDefault()
    if (!newItemName.trim()) return
    addItem(newItemName.trim(), user.id)
    setNewItemName('')
  }

  return (
    <div>
      <h1 className="text-xl font-semibold text-gray-900">{t('nav.shopping')}</h1>

      <form onSubmit={handleAddItem} className="mt-4 flex gap-2">
        <input
          type="text"
          value={newItemName}
          onChange={(event) => setNewItemName(event.target.value)}
          placeholder={t('shoppingPage.addPlaceholder')}
          className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
        />
        <button
          type="submit"
          disabled={!newItemName.trim()}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
        >
          {t('shoppingPage.add')}
        </button>
      </form>

      <div className="mt-4 space-y-2">
        <h2 className="text-sm font-semibold text-gray-900">{t('shoppingPage.toBuyTitle')}</h2>
        {loading ? (
          <SkeletonRows />
        ) : (
          <>
            {pendingItems.length === 0 && <p className="text-sm text-gray-400">{t('shoppingPage.noPending')}</p>}
            <ul className="space-y-2">
              {pendingItems.map((item) => (
                <ShoppingListItem key={item.id} item={item} />
              ))}
            </ul>
          </>
        )}
      </div>

      {!loading && boughtItems.length > 0 && (
        <div className="mt-6 space-y-2">
          <h2 className="text-sm font-semibold text-gray-900">{t('shoppingPage.boughtTitle')}</h2>
          <ul className="space-y-2 opacity-60">
            {boughtItems.map((item) => (
              <ShoppingListItem key={item.id} item={item} />
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
