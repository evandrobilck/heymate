import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext'
import { useLanguage } from '../contexts/LanguageContext'
import { useTheme } from '../contexts/ThemeContext'
import { useToast } from '../contexts/ToastContext'
import { useConfirm } from '../contexts/ConfirmContext'
import { resizeImageFile } from '../utils/resizeImage'
import Avatar from '../components/Avatar'
import PhotoPickerLabel from '../components/PhotoPickerLabel'

const LANGUAGE_LABELS = {
  en: 'English',
  'pt-BR': 'Português (Brasil)',
  es: 'Español',
}

export default function ProfilePage() {
  const { t } = useTranslation()
  const { user, updateProfile, uploadAvatar, deleteAccount, logout } = useAuth()
  const { language, setLanguage, supportedLanguages } = useLanguage()
  const { theme, toggleTheme } = useTheme()
  const showToast = useToast()
  const confirm = useConfirm()
  const navigate = useNavigate()

  const [name, setName] = useState(user.name)
  const [phone, setPhone] = useState(user.phone)
  const [payId, setPayId] = useState(user.payId)
  const [bankDetails, setBankDetails] = useState(user.bankDetails)
  const [emergencyContactName, setEmergencyContactName] = useState(user.emergencyContactName)
  const [emergencyContactPhone, setEmergencyContactPhone] = useState(user.emergencyContactPhone)

  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [error, setError] = useState('')
  const [deletingAccount, setDeletingAccount] = useState(false)

  async function handleSave(event) {
    event.preventDefault()
    setSaving(true)
    setSaved(false)
    setError('')
    try {
      await updateProfile({
        name: name.trim(),
        phone: phone.trim(),
        payId: payId.trim(),
        bankDetails: bankDetails.trim(),
        emergencyContactName: emergencyContactName.trim(),
        emergencyContactPhone: emergencyContactPhone.trim(),
      })
      setSaved(true)
      showToast(t('profilePage.saved'))
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      console.error(err)
      setError(t('profilePage.saveError'))
    } finally {
      setSaving(false)
    }
  }

  async function handlePhotoChange(file) {
    setUploadingPhoto(true)
    setError('')
    try {
      const resized = await resizeImageFile(file, { maxDimension: 800 })
      await uploadAvatar(resized)
      showToast(t('profilePage.saved'))
    } catch (err) {
      console.error(err)
      setError(t('profilePage.photoError'))
    } finally {
      setUploadingPhoto(false)
    }
  }

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  async function handleDeleteAccount() {
    if (!(await confirm(t('profilePage.deleteAccountConfirm')))) return
    setDeletingAccount(true)
    try {
      await deleteAccount()
      navigate('/login')
    } catch (err) {
      console.error(err)
      showToast(t('profilePage.deleteAccountError'))
      setDeletingAccount(false)
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-gray-900">{t('profilePage.title')}</h1>

      <div className="rounded-xl border border-gray-200 bg-surface p-4">
        <div className="flex items-center gap-4">
          <Avatar name={user.name} avatarUrl={user.avatarUrl} size="lg" />
          <PhotoPickerLabel
            onPick={handlePhotoChange}
            disabled={uploadingPhoto}
            maxDimension={800}
            className="cursor-pointer text-sm font-medium text-brand-600 hover:text-brand-700"
          >
            {uploadingPhoto ? t('profilePage.uploading') : t('profilePage.changePhoto')}
          </PhotoPickerLabel>
        </div>
      </div>

      <div className="space-y-3 rounded-xl border border-gray-200 bg-surface p-4">
        <p className="text-sm font-semibold text-gray-900">{t('profilePage.language')}</p>
        <div className="flex gap-2">
          {supportedLanguages.map((lang) => (
            <button
              key={lang}
              type="button"
              onClick={() => setLanguage(lang)}
              className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium ${
                language === lang ? 'border-brand-500 bg-brand-50 text-brand-700 dark:text-white' : 'border-gray-200 text-gray-600'
              }`}
            >
              {LANGUAGE_LABELS[lang]}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3 rounded-xl border border-gray-200 bg-surface p-4">
        <p className="text-sm font-semibold text-gray-900">{t('profilePage.theme')}</p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => theme === 'dark' && toggleTheme()}
            className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium ${
              theme === 'light' ? 'border-brand-500 bg-brand-50 text-brand-700 dark:text-white' : 'border-gray-200 text-gray-600'
            }`}
          >
            ☀️ {t('profilePage.themeLight')}
          </button>
          <button
            type="button"
            onClick={() => theme === 'light' && toggleTheme()}
            className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium ${
              theme === 'dark' ? 'border-brand-500 bg-brand-50 text-brand-700 dark:text-white' : 'border-gray-200 text-gray-600'
            }`}
          >
            🌙 {t('profilePage.themeDark')}
          </button>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        <div className="space-y-3 rounded-xl border border-gray-200 bg-surface p-4">
          <p className="text-sm font-semibold text-gray-900">{t('profilePage.basicInfo')}</p>

          <div>
            <label className="text-xs font-medium text-gray-600">{t('profilePage.name')}</label>
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-gray-600">{t('profilePage.email')}</label>
            <input
              type="email"
              value={user.email}
              disabled
              className="mt-1 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-500"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-gray-600">{t('profilePage.phone')}</label>
            <input
              type="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
            />
          </div>
        </div>

        <div className="space-y-3 rounded-xl border border-gray-200 bg-surface p-4">
          <p className="text-sm font-semibold text-gray-900">{t('profilePage.paymentInfo')}</p>

          <div>
            <label className="text-xs font-medium text-gray-600">{t('vaultPage.payIdLabel')}</label>
            <input
              type="text"
              value={payId}
              onChange={(event) => setPayId(event.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-gray-600">{t('vaultPage.bankDetailsLabel')}</label>
            <input
              type="text"
              value={bankDetails}
              onChange={(event) => setBankDetails(event.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
            />
          </div>
        </div>

        <div className="space-y-3 rounded-xl border border-gray-200 bg-surface p-4">
          <p className="text-sm font-semibold text-gray-900">{t('profilePage.emergencyContact')}</p>

          <div>
            <label className="text-xs font-medium text-gray-600">{t('profilePage.emergencyName')}</label>
            <input
              type="text"
              value={emergencyContactName}
              onChange={(event) => setEmergencyContactName(event.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-gray-600">{t('profilePage.emergencyPhone')}</label>
            <input
              type="tel"
              value={emergencyContactPhone}
              onChange={(event) => setEmergencyContactPhone(event.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
            />
          </div>
        </div>

        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-lg bg-brand-600 py-2.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-40"
        >
          {saving ? t('profilePage.saving') : saved ? t('profilePage.saved') : t('profilePage.save')}
        </button>
      </form>

      <div className="flex items-center justify-between border-t border-gray-100 pt-6">
        <button type="button" onClick={handleLogout} className="text-xs font-medium text-red-500 hover:text-red-700">
          {t('auth.logout')}
        </button>
        <button
          type="button"
          onClick={handleDeleteAccount}
          disabled={deletingAccount}
          className="text-xs font-medium text-gray-400 hover:text-red-700 disabled:opacity-50"
        >
          {deletingAccount ? t('profilePage.deleteAccountDeleting') : t('profilePage.deleteAccount')}
        </button>
      </div>
    </div>
  )
}
