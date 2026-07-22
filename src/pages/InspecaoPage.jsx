import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useInspection } from '../contexts/InspectionContext'
import InspectionCard from '../components/InspectionCard'
import AddInspectionForm from '../components/AddInspectionForm'
import SkeletonRows from '../components/SkeletonRows'
import EmptyState from '../components/EmptyState'
import { toDayKey } from '../utils/calendar'

export default function InspecaoPage() {
  const { t } = useTranslation()
  const { inspections, loading } = useInspection()
  const [showForm, setShowForm] = useState(false)

  const today = toDayKey(new Date())
  const upcoming = inspections.filter((inspection) => inspection.scheduledDate >= today)
  const past = inspections.filter((inspection) => inspection.scheduledDate < today)

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">{t('nav.inspection')}</h1>
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
        >
          + {t('inspectionPage.addInspection')}
        </button>
      </div>

      <div className="mt-4 space-y-2">
        <h2 className="text-sm font-semibold text-gray-900">{t('inspectionPage.upcomingTitle')}</h2>
        {loading ? (
          <SkeletonRows />
        ) : (
          <>
            {upcoming.length === 0 && <EmptyState icon="📋" message={t('inspectionPage.noUpcoming')} />}
            <ul className="space-y-2">
              {upcoming.map((inspection) => (
                <InspectionCard key={inspection.id} inspection={inspection} />
              ))}
            </ul>
          </>
        )}
      </div>

      {!loading && past.length > 0 && (
        <div className="mt-6 space-y-2">
          <h2 className="text-sm font-semibold text-gray-900">{t('inspectionPage.pastTitle')}</h2>
          <ul className="space-y-2 opacity-60">
            {past.map((inspection) => (
              <InspectionCard key={inspection.id} inspection={inspection} />
            ))}
          </ul>
        </div>
      )}

      {showForm && <AddInspectionForm onClose={() => setShowForm(false)} />}
    </div>
  )
}
