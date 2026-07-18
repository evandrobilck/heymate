import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useHouse } from '../contexts/HouseContext'
import { useShopping } from '../contexts/ShoppingContext'
import { formatCurrency } from '../utils/formatCurrency'
import { formatDate } from '../utils/formatDate'

export default function ShoppingListItem({ item }) {
  const { t, i18n } = useTranslation()
  const { house } = useHouse()
  const { markAsBought } = useShopping()
  const [entering, setEntering] = useState(false)
  const [price, setPrice] = useState('')

  const addedByMember = house.members.find((member) => member.id === item.addedBy)
  const boughtByMember = item.boughtBy ? house.members.find((member) => member.id === item.boughtBy) : null

  function handleConfirm(event) {
    event.preventDefault()
    const value = Number(price)
    if (!value || value <= 0) return
    markAsBought(item.id, value)
    setEntering(false)
    setPrice('')
  }

  if (item.bought) {
    return (
      <li className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3">
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-purple-600 text-white">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-3 w-3"
          >
            <path d="m5 12 5 5L19 7" />
          </svg>
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-gray-400 line-through">{item.name}</p>
          <p className="text-xs text-gray-500">
            {t('shoppingPage.boughtBy', {
              name: boughtByMember?.name,
              date: formatDate(item.boughtAt, i18n.language),
            })}
          </p>
        </div>
        <span className="text-sm font-medium text-gray-900">{formatCurrency(item.price, i18n.language)}</span>
      </li>
    )
  }

  return (
    <li className="rounded-xl border border-gray-200 bg-white p-3">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setEntering((prev) => !prev)}
          aria-label={t('shoppingPage.markBought')}
          className="h-5 w-5 shrink-0 rounded-full border-2 border-gray-300"
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-gray-900">{item.name}</p>
          <p className="text-xs text-gray-500">{t('shoppingPage.addedBy', { name: addedByMember?.name })}</p>
        </div>
      </div>

      {entering && (
        <form onSubmit={handleConfirm} className="mt-3 flex items-center gap-2">
          <input
            type="number"
            min="0"
            step="0.01"
            autoFocus
            value={price}
            onChange={(event) => setPrice(event.target.value)}
            placeholder={t('shoppingPage.pricePlaceholder')}
            className="w-24 rounded-lg border border-gray-300 px-2 py-1.5 text-sm outline-none focus:border-purple-500"
          />
          <button type="submit" className="rounded-lg bg-purple-600 px-3 py-1.5 text-xs font-medium text-white">
            {t('shoppingPage.confirmBought')}
          </button>
          <button type="button" onClick={() => setEntering(false)} className="text-xs text-gray-400">
            {t('shoppingPage.cancel')}
          </button>
        </form>
      )}
    </li>
  )
}
