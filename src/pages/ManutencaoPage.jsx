import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMaintenance } from '../contexts/MaintenanceContext'
import MaintenanceCard from '../components/MaintenanceCard'
import AddMaintenanceForm from '../components/AddMaintenanceForm'
import SkeletonRows from '../components/SkeletonRows'
import EmptyState from '../components/EmptyState'

export default function ManutencaoPage() {
  const { t } = useTranslation()
  const { requests, loading } = useMaintenance()
  const [showForm, setShowForm] = useState(false)

  const openRequests = requests.filter((request) => request.status === 'open')
  const resolvedRequests = requests.filter((request) => request.status === 'resolved')

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">{t('nav.maintenance')}</h1>
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
        >
          + {t('maintenancePage.addRequest')}
        </button>
      </div>

      <div className="mt-4 space-y-2">
        <h2 className="text-sm font-semibold text-gray-900">{t('maintenancePage.openTitle')}</h2>
        {loading ? (
          <SkeletonRows />
        ) : (
          <>
            {openRequests.length === 0 && <EmptyState icon="🛠️" message={t('maintenancePage.noOpen')} />}
            <ul className="space-y-2">
              {openRequests.map((request) => (
                <MaintenanceCard key={request.id} request={request} />
              ))}
            </ul>
          </>
        )}
      </div>

      {!loading && resolvedRequests.length > 0 && (
        <div className="mt-6 space-y-2">
          <h2 className="text-sm font-semibold text-gray-900">{t('maintenancePage.resolvedTitle')}</h2>
          <ul className="space-y-2 opacity-60">
            {resolvedRequests.map((request) => (
              <MaintenanceCard key={request.id} request={request} />
            ))}
          </ul>
        </div>
      )}

      {showForm && <AddMaintenanceForm onClose={() => setShowForm(false)} />}
    </div>
  )
}
