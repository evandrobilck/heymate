import { useState } from 'react'
import { useTranslation } from 'react-i18next'

export default function CategoryManager({ title, hint, categories, onAdd, onRemove }) {
  const { t } = useTranslation()
  const [adding, setAdding] = useState(false)
  const [label, setLabel] = useState('')

  function handleAdd(event) {
    event.preventDefault()
    if (!label.trim()) return
    onAdd(label.trim())
    setLabel('')
    setAdding(false)
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-surface p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-gray-900">{title}</p>
          {hint && <p className="text-xs text-gray-400">{hint}</p>}
        </div>
        {!adding && (
          <button type="button" onClick={() => setAdding(true)} className="text-xs font-medium text-brand-600">
            {t('settingsPage.addCategory')}
          </button>
        )}
      </div>

      {categories.length === 0 && !adding && (
        <p className="mt-2 text-sm text-gray-400">{t('settingsPage.noCustomCategories')}</p>
      )}

      {categories.length > 0 && (
        <ul className="mt-2 space-y-2">
          {categories.map((cat) => (
            <li key={cat.id} className="flex items-center justify-between text-sm">
              <span className="text-gray-800">🏷️ {cat.label}</span>
              <button
                type="button"
                onClick={() => onRemove(cat.id)}
                className="text-xs font-medium text-gray-400 hover:text-red-600"
              >
                {t('vaultPage.remove')}
              </button>
            </li>
          ))}
        </ul>
      )}

      {adding && (
        <form onSubmit={handleAdd} className="mt-3 flex gap-2 border-t border-gray-100 pt-3">
          <input
            type="text"
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            placeholder={t('settingsPage.categoryPlaceholder')}
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
          />
          <button type="submit" className="rounded-lg bg-brand-600 px-3 py-2 text-xs font-medium text-white">
            {t('vaultPage.save')}
          </button>
          <button
            type="button"
            onClick={() => setAdding(false)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-600"
          >
            {t('vaultPage.cancel')}
          </button>
        </form>
      )}
    </div>
  )
}
