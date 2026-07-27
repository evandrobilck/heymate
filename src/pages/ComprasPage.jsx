import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext'
import { useShopping } from '../contexts/ShoppingContext'
import ShoppingListItem from '../components/ShoppingListItem'
import SkeletonRows from '../components/SkeletonRows'
import EmptyState from '../components/EmptyState'

// Items the house has bought/added at least twice before, excluding
// anything already pending — a quick "add this again" shortcut instead of
// a real recommendation model.
const MIN_FREQUENCY = 2
const MAX_SUGGESTIONS = 6

function computeFrequentSuggestions(items, pendingItems) {
  const counts = new Map()
  items.forEach((item) => {
    const key = item.name.trim().toLowerCase()
    if (!key) return
    if (!counts.has(key)) counts.set(key, { name: item.name.trim(), count: 0 })
    counts.get(key).count += 1
  })

  const pendingKeys = new Set(pendingItems.map((item) => item.name.trim().toLowerCase()))

  return Array.from(counts.values())
    .filter((entry) => entry.count >= MIN_FREQUENCY && !pendingKeys.has(entry.name.toLowerCase()))
    .sort((a, b) => b.count - a.count)
    .slice(0, MAX_SUGGESTIONS)
}

export default function ComprasPage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const { items, loading, addItem } = useShopping()
  const [newItemName, setNewItemName] = useState('')

  const pendingItems = items.filter((item) => !item.bought)
  const boughtItems = items.filter((item) => item.bought)
  const frequentSuggestions = useMemo(
    () => computeFrequentSuggestions(items, pendingItems),
    [items, pendingItems]
  )

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

      {frequentSuggestions.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-medium text-gray-500">{t('shoppingPage.frequentItems')}</p>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {frequentSuggestions.map((suggestion) => (
              <button
                key={suggestion.name}
                type="button"
                onClick={() => addItem(suggestion.name, user.id)}
                className="rounded-full border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:border-brand-300 hover:text-brand-600"
              >
                + {suggestion.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mt-4 space-y-2">
        <h2 className="text-sm font-semibold text-gray-900">{t('shoppingPage.toBuyTitle')}</h2>
        {loading ? (
          <SkeletonRows />
        ) : (
          <>
            {pendingItems.length === 0 && <EmptyState icon="🛒" message={t('shoppingPage.noPending')} />}
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
