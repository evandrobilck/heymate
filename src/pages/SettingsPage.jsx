import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useHouse } from '../contexts/HouseContext'
import { useCategories } from '../contexts/CategoriesContext'
import CategoryManager from '../components/CategoryManager'

export default function SettingsPage() {
  const { t } = useTranslation()
  const { house, isAdmin, renameHouse, uploadHousePhoto } = useHouse()
  const {
    customBillCategories,
    customShoppingCategories,
    addBillCategory,
    removeBillCategory,
    addShoppingCategory,
    removeShoppingCategory,
  } = useCategories()
  const navigate = useNavigate()

  const [name, setName] = useState(house.name)
  const [savingName, setSavingName] = useState(false)
  const [savedName, setSavedName] = useState(false)
  const [nameError, setNameError] = useState('')
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [photoError, setPhotoError] = useState('')

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
    } catch (err) {
      console.error(err)
      setPhotoError(t('settingsPage.photoError'))
    } finally {
      setUploadingPhoto(false)
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-gray-900">{t('settingsPage.title')}</h1>

      <div className="space-y-3 rounded-xl border border-gray-200 bg-white p-4">
        <p className="text-sm font-semibold text-gray-900">{t('settingsPage.housePhoto')}</p>
        <div className="flex items-center gap-4">
          {house.photoUrl ? (
            <img src={house.photoUrl} alt="" className="h-20 w-20 rounded-xl object-cover" />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-gray-100 text-3xl">🏠</div>
          )}
          <label className="cursor-pointer text-sm font-medium text-purple-600 hover:text-purple-700">
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
        {photoError && <p className="text-sm text-red-600">{photoError}</p>}
      </div>

      <form onSubmit={handleSaveName} className="space-y-3 rounded-xl border border-gray-200 bg-white p-4">
        <p className="text-sm font-semibold text-gray-900">{t('settingsPage.houseName')}</p>
        <input
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-purple-500"
        />
        {nameError && <p className="text-sm text-red-600">{nameError}</p>}
        <button
          type="submit"
          disabled={savingName}
          className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-40"
        >
          {savingName ? t('profilePage.saving') : savedName ? t('profilePage.saved') : t('profilePage.save')}
        </button>
      </form>

      <CategoryManager
        title={t('settingsPage.billCategories')}
        hint={t('settingsPage.billCategoriesHint')}
        categories={customBillCategories}
        onAdd={addBillCategory}
        onRemove={removeBillCategory}
      />

      <CategoryManager
        title={t('settingsPage.shoppingCategories')}
        hint={t('settingsPage.shoppingCategoriesHint')}
        categories={customShoppingCategories}
        onAdd={addShoppingCategory}
        onRemove={removeShoppingCategory}
      />
    </div>
  )
}
