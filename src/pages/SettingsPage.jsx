import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext'
import { useHouse } from '../contexts/HouseContext'
import { useBills } from '../contexts/BillsContext'
import { useCategories } from '../contexts/CategoriesContext'
import { useToast } from '../contexts/ToastContext'
import { useConfirm } from '../contexts/ConfirmContext'
import { billCategories, currencyOptions } from '../services/mockData'
import CategoryManager from '../components/CategoryManager'
import SubscriptionCard from '../components/SubscriptionCard'

export default function SettingsPage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const { house, isAdmin, renameHouse, uploadHousePhoto, updateHouseCurrency, transferAdmin } = useHouse()
  const { bills } = useBills()
  const {
    customBillCategories,
    customShoppingCategories,
    hiddenCategoryIds,
    addBillCategory,
    removeBillCategory,
    addShoppingCategory,
    removeShoppingCategory,
    hideBuiltInCategory,
    showBuiltInCategory,
  } = useCategories()
  const navigate = useNavigate()
  const showToast = useToast()
  const confirm = useConfirm()

  const [name, setName] = useState(house.name)
  const [savingName, setSavingName] = useState(false)
  const [savedName, setSavedName] = useState(false)
  const [nameError, setNameError] = useState('')
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [photoError, setPhotoError] = useState('')
  const [currencyError, setCurrencyError] = useState('')
  const [categoryToggleError, setCategoryToggleError] = useState('')

  const otherActiveMembers = house.members.filter((member) => !member.leftAt && member.id !== user.id)
  const [transferTarget, setTransferTarget] = useState(otherActiveMembers[0]?.id ?? '')
  const [transferError, setTransferError] = useState('')

  useEffect(() => {
    if (!isAdmin) navigate('/casa', { replace: true })
  }, [isAdmin, navigate])

  if (!isAdmin) return null

  async function handleSaveName(event) {
    event.preventDefault()
    if (!name.trim()) return
    setSavingName(true)
    setNameError('')
    try {
      await renameHouse(name.trim())
      setSavedName(true)
      showToast(t('profilePage.saved'))
      setTimeout(() => setSavedName(false), 2000)
    } catch (err) {
      console.error(err)
      setNameError(t('settingsPage.nameError'))
    } finally {
      setSavingName(false)
    }
  }

  async function handlePhotoChange(event) {
    const file = event.target.files?.[0]
    if (!file) return
    setUploadingPhoto(true)
    setPhotoError('')
    try {
      await uploadHousePhoto(file)
      showToast(t('profilePage.saved'))
    } catch (err) {
      console.error(err)
      setPhotoError(t('settingsPage.photoError'))
    } finally {
      setUploadingPhoto(false)
    }
  }

  async function handleChangeCurrency(code) {
    setCurrencyError('')
    try {
      await updateHouseCurrency(code)
      showToast(t('profilePage.saved'))
    } catch (err) {
      console.error(err)
      setCurrencyError(t('settingsPage.currencyError'))
    }
  }

  async function handleToggleBuiltInCategory(categoryId, isHidden) {
    setCategoryToggleError('')
    try {
      if (isHidden) {
        await showBuiltInCategory(categoryId)
      } else {
        await hideBuiltInCategory(categoryId)
      }
    } catch (err) {
      console.error(err)
      setCategoryToggleError(t('settingsPage.categoryToggleError'))
    }
  }

  async function handleRemoveBillCategory(id) {
    const usageCount = bills.filter((bill) => bill.category === id).length
    if (usageCount > 0 && !(await confirm(t('settingsPage.categoryInUseConfirm', { count: usageCount })))) return
    try {
      await removeBillCategory(id)
    } catch (err) {
      console.error(err)
      showToast(t('settingsPage.categoryRemoveError'))
    }
  }

  async function handleRemoveShoppingCategory(id) {
    const usageCount = bills.filter((bill) => bill.category === id).length
    if (usageCount > 0 && !(await confirm(t('settingsPage.categoryInUseConfirm', { count: usageCount })))) return
    try {
      await removeShoppingCategory(id)
    } catch (err) {
      console.error(err)
      showToast(t('settingsPage.categoryRemoveError'))
    }
  }

  async function handleTransferAdmin() {
    if (!transferTarget) return
    const targetName = otherActiveMembers.find((member) => member.id === transferTarget)?.name
    if (!(await confirm(t('settingsPage.transferAdminConfirm', { name: targetName })))) return
    setTransferError('')
    try {
      await transferAdmin(transferTarget)
      navigate('/casa')
    } catch (err) {
      console.error(err)
      setTransferError(t('settingsPage.transferAdminError'))
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-gray-900">{t('settingsPage.title')}</h1>

      <SubscriptionCard />

      <div className="space-y-3 rounded-xl border border-gray-200 bg-surface p-4">
        <p className="text-sm font-semibold text-gray-900">{t('settingsPage.housePhoto')}</p>
        <div className="flex items-center gap-4">
          {house.photoUrl ? (
            <img src={house.photoUrl} alt="" className="h-20 w-20 rounded-xl object-cover" />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-gray-100 text-3xl">🏠</div>
          )}
          <label className="cursor-pointer text-sm font-medium text-brand-600 hover:text-brand-700">
            {uploadingPhoto ? t('profilePage.uploading') : t('settingsPage.changePhoto')}
            <input
              type="file"
              accept="image/*"
              onChange={handlePhotoChange}
              disabled={uploadingPhoto}
              className="hidden"
            />
          </label>
        </div>
        {photoError && (
          <p role="alert" className="text-sm text-red-600">
            {photoError}
          </p>
        )}
      </div>

      <form onSubmit={handleSaveName} className="space-y-3 rounded-xl border border-gray-200 bg-surface p-4">
        <p className="text-sm font-semibold text-gray-900">{t('settingsPage.houseName')}</p>
        <input
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          aria-invalid={Boolean(nameError)}
          aria-describedby={nameError ? 'house-name-error' : undefined}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
        />
        {nameError && (
          <p id="house-name-error" role="alert" className="text-sm text-red-600">
            {nameError}
          </p>
        )}
        <button
          type="submit"
          disabled={savingName}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-40"
        >
          {savingName ? t('profilePage.saving') : savedName ? t('profilePage.saved') : t('profilePage.save')}
        </button>
      </form>

      <div className="space-y-3 rounded-xl border border-gray-200 bg-surface p-4">
        <p className="text-sm font-semibold text-gray-900">{t('settingsPage.currency')}</p>
        <div className="flex flex-wrap gap-2">
          {currencyOptions.map((code) => (
            <button
              key={code}
              type="button"
              onClick={() => handleChangeCurrency(code)}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium ${
                house.currency === code
                  ? 'border-brand-500 bg-brand-50 text-brand-700 dark:text-white'
                  : 'border-gray-200 text-gray-600'
              }`}
            >
              {code}
            </button>
          ))}
        </div>
        {currencyError && (
          <p role="alert" className="text-sm text-red-600">
            {currencyError}
          </p>
        )}
      </div>

      <div className="space-y-3 rounded-xl border border-gray-200 bg-surface p-4">
        <div>
          <p className="text-sm font-semibold text-gray-900">{t('settingsPage.builtInCategories')}</p>
          <p className="text-xs text-gray-400">{t('settingsPage.builtInCategoriesHint')}</p>
        </div>
        <ul className="space-y-2">
          {billCategories.map((cat) => {
            const hidden = hiddenCategoryIds.includes(cat.id)
            return (
              <li key={cat.id} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-gray-800">
                  <span>{cat.icon}</span>
                  {t(cat.labelKey)}
                </span>
                <button
                  type="button"
                  onClick={() => handleToggleBuiltInCategory(cat.id, hidden)}
                  className={`text-xs font-medium ${hidden ? 'text-gray-400' : 'text-brand-600'}`}
                >
                  {hidden ? t('settingsPage.showCategory') : t('settingsPage.hideCategory')}
                </button>
              </li>
            )
          })}
        </ul>
        {categoryToggleError && (
          <p role="alert" className="text-sm text-red-600">
            {categoryToggleError}
          </p>
        )}
      </div>

      <CategoryManager
        title={t('settingsPage.billCategories')}
        hint={t('settingsPage.billCategoriesHint')}
        categories={customBillCategories}
        onAdd={addBillCategory}
        onRemove={handleRemoveBillCategory}
      />

      <CategoryManager
        title={t('settingsPage.shoppingCategories')}
        hint={t('settingsPage.shoppingCategoriesHint')}
        categories={customShoppingCategories}
        onAdd={addShoppingCategory}
        onRemove={handleRemoveShoppingCategory}
      />

      <div className="space-y-3 rounded-xl border border-gray-200 bg-surface p-4">
        <div>
          <p className="text-sm font-semibold text-gray-900">{t('settingsPage.transferAdmin')}</p>
          <p className="text-xs text-gray-400">{t('settingsPage.transferAdminHint')}</p>
        </div>
        {otherActiveMembers.length === 0 ? (
          <p className="text-sm text-gray-400">{t('settingsPage.noOtherMembers')}</p>
        ) : (
          <div className="flex gap-2">
            <select
              value={transferTarget}
              onChange={(event) => setTransferTarget(event.target.value)}
              aria-describedby={transferError ? 'transfer-admin-error' : undefined}
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
            >
              {otherActiveMembers.map((member) => (
                <option key={member.id} value={member.id} className="text-black">
                  {member.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleTransferAdmin}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
            >
              {t('settingsPage.transfer')}
            </button>
          </div>
        )}
        {transferError && (
          <p id="transfer-admin-error" role="alert" className="text-sm text-red-600">
            {transferError}
          </p>
        )}
      </div>
    </div>
  )
}
