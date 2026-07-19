import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useHouse } from '../contexts/HouseContext'
import { formatCurrency } from '../utils/formatCurrency'
import { formatDate } from '../utils/formatDate'
import RecordPurchaseForm from './RecordPurchaseForm'

export default function ShoppingListItem({ item }) {
  const { t, i18n } = useTranslation()
  const { house } = useHouse()
  const [recording, setRecording] = useState(false)

  const addedByMember = house.members.find((member) => member.id === item.addedBy)
  const boughtByMember = item.boughtBy ? house.members.find((member) => member.id === item.boughtBy) : null

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
          onClick={() => setRecording(true)}
          aria-label={t('shoppingPage.markBought')}
          className="h-5 w-5 shrink-0 rounded-full border-2 border-gray-300"
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-gray-900">{item.name}</p>
          <p className="text-xs text-gray-500">{t('shoppingPage.addedBy', { name: addedByMember?.name })}</p>
        </div>
      </div>

      {recording && <RecordPurchaseForm item={item} onClose={() => setRecording(false)} />}
    </li>
  )
}
