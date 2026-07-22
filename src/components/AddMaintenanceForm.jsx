import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext'
import { useMaintenance } from '../contexts/MaintenanceContext'
import { useToast } from '../contexts/ToastContext'
import Modal from './Modal'

export default function AddMaintenanceForm({ onClose }) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const { addRequest } = useMaintenance()
  const showToast = useToast()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [occurredOn, setOccurredOn] = useState(new Date().toISOString().slice(0, 10))
  const [photoFile, setPhotoFile] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const isValid = title.trim() !== ''

  function handlePhotoChange(event) {
    const file = event.target.files?.[0]
    if (!file) return
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (!isValid) return
    setSubmitting(true)
    try {
      await addRequest({
        title: title.trim(),
        description: description.trim(),
        occurredOn,
        photoFile,
        createdBy: user.id,
      })
      onClose()
    } catch (err) {
      console.error(err)
      showToast(t('maintenancePage.addError'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal>
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-900">{t('maintenancePage.addRequest')}</h2>
        <button type="button" onClick={onClose} className="text-sm text-gray-400">
          {t('tasksPage.close')}
        </button>
      </div>

      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <div>
          <label className="text-xs font-medium text-gray-600">{t('maintenancePage.titleLabel')}</label>
          <input
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder={t('maintenancePage.titlePlaceholder')}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
          />
        </div>

        <div>
          <label className="text-xs font-medium text-gray-600">{t('maintenancePage.descriptionLabel')}</label>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={3}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
          />
        </div>

        <div>
          <label className="text-xs font-medium text-gray-600">{t('maintenancePage.dateLabel')}</label>
          <input
            type="date"
            value={occurredOn}
            onChange={(event) => setOccurredOn(event.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
          />
        </div>

        <div>
          <label className="text-xs font-medium text-gray-600">{t('maintenancePage.photoLabel')}</label>
          {photoPreview && <img src={photoPreview} alt="" className="mt-2 h-40 w-full rounded-lg object-cover" />}
          <label className="mt-2 block cursor-pointer rounded-lg border border-dashed border-gray-300 px-3 py-3 text-center text-sm font-medium text-brand-600 hover:border-brand-400">
            {photoPreview ? t('maintenancePage.changePhoto') : t('maintenancePage.addPhoto')}
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handlePhotoChange}
              className="hidden"
            />
          </label>
        </div>

        <button
          type="submit"
          disabled={!isValid || submitting}
          className="w-full rounded-lg bg-brand-600 py-2.5 text-sm font-medium text-white disabled:opacity-40"
        >
          {submitting ? t('maintenancePage.saving') : t('maintenancePage.save')}
        </button>
      </form>
    </Modal>
  )
}
