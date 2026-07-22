import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext'
import { useHouse } from '../contexts/HouseContext'
import { useMaintenance } from '../contexts/MaintenanceContext'
import { useToast } from '../contexts/ToastContext'
import { useConfirm } from '../contexts/ConfirmContext'
import { formatDate } from '../utils/formatDate'

export default function MaintenanceCard({ request }) {
  const { t, i18n } = useTranslation()
  const { user } = useAuth()
  const { house } = useHouse()
  const { resolveRequest, reopenRequest, deleteRequest } = useMaintenance()
  const showToast = useToast()
  const confirm = useConfirm()
  const [submitting, setSubmitting] = useState(false)

  const reporter = house.members.find((member) => member.id === request.createdBy)
  const resolver = request.resolvedBy ? house.members.find((member) => member.id === request.resolvedBy) : null

  async function handleToggleStatus() {
    setSubmitting(true)
    try {
      if (request.status === 'open') {
        await resolveRequest(request.id, user.id)
      } else {
        await reopenRequest(request.id)
      }
    } catch (err) {
      console.error(err)
      showToast(t('maintenancePage.updateError'))
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete() {
    if (!(await confirm(t('maintenancePage.deleteConfirm')))) return
    try {
      await deleteRequest(request.id)
    } catch (err) {
      console.error(err)
      showToast(t('maintenancePage.deleteError'))
    }
  }

  return (
    <li className="rounded-xl border border-gray-200 bg-surface p-3">
      {request.photoUrl && (
        <img src={request.photoUrl} alt="" className="mb-3 h-40 w-full rounded-lg object-cover" />
      )}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p
            className={`text-sm font-medium ${
              request.status === 'resolved' ? 'text-gray-400 line-through' : 'text-gray-900'
            }`}
          >
            {request.title}
          </p>
          {request.description && <p className="mt-0.5 text-xs text-gray-500">{request.description}</p>}
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-gray-500">
            <span>{t('maintenancePage.reportedBy', { name: reporter?.name })}</span>
            {request.occurredOn && <span>· {formatDate(request.occurredOn, i18n.language)}</span>}
          </div>
          {request.status === 'resolved' && resolver && (
            <p className="mt-0.5 text-xs text-green-600">{t('maintenancePage.resolvedBy', { name: resolver.name })}</p>
          )}
        </div>
        {request.photoUrl && (
          <a
            href={request.photoUrl}
            download
            target="_blank"
            rel="noreferrer"
            className="shrink-0 text-xs font-medium text-brand-600 hover:text-brand-700"
          >
            {t('maintenancePage.downloadPhoto')}
          </a>
        )}
      </div>

      <div className="mt-2 flex justify-end gap-3 border-t border-gray-100 pt-2">
        <button
          type="button"
          onClick={handleToggleStatus}
          disabled={submitting}
          className="text-xs font-medium text-gray-400 hover:text-brand-600 disabled:opacity-40"
        >
          {request.status === 'open' ? t('maintenancePage.markResolved') : t('maintenancePage.reopen')}
        </button>
        <button type="button" onClick={handleDelete} className="text-xs font-medium text-gray-400 hover:text-red-600">
          {t('vaultPage.remove')}
        </button>
      </div>
    </li>
  )
}
