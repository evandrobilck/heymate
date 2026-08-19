import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../services/supabase'

const OWNER_EMAIL = 'xp.vando@gmail.com'

const INTERVAL_LABELS = { monthly: 'Mensais', semiannual: 'Semestrais', annual: 'Anuais' }

function formatCurrency(cents, currency) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: currency || 'AUD' }).format((cents || 0) / 100)
}

function StatCard({ label, value }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-surface p-4">
      <p className="text-xs font-medium text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-gray-900">{value}</p>
    </div>
  )
}

export default function AdminPage() {
  const { user } = useAuth()
  const [stats, setStats] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (user.email !== OWNER_EMAIL) return
    supabase.functions
      .invoke('admin-stats')
      .then(({ data, error }) => {
        if (error) throw error
        setStats(data)
      })
      .catch((err) => {
        console.error(err)
        setError('Não foi possível carregar as estatísticas.')
      })
  }, [user.email])

  if (user.email !== OWNER_EMAIL) return <Navigate to="/home" replace />

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-gray-900">Admin</h1>

      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}

      {!stats && !error && <p className="text-sm text-gray-500">Carregando...</p>}

      {stats && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <StatCard label="Usuários" value={stats.totalUsers} />
            <StatCard label="Casas" value={stats.totalHouses} />
          </div>

          <div className="space-y-3 rounded-xl border border-gray-200 bg-surface p-4">
            <p className="text-sm font-semibold text-gray-900">Assinaturas ativas: {stats.activeSubscriptions}</p>
            <div className="grid grid-cols-3 gap-3">
              {Object.entries(INTERVAL_LABELS).map(([key, label]) => (
                <div key={key}>
                  <p className="text-xs font-medium text-gray-500">{label}</p>
                  <p className="mt-1 text-lg font-semibold text-gray-900">{stats.subscriptionsByInterval?.[key] ?? 0}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-surface p-4">
            <p className="text-xs font-medium text-gray-500">Estimativa a receber no próximo mês</p>
            <p className="mt-1 text-2xl font-semibold text-gray-900">
              {formatCurrency(stats.nextMonthRevenueCents, stats.nextMonthCurrency)}
            </p>
            <p className="mt-1 text-xs text-gray-500">{stats.nextMonthRenewalCount} renovações previstas</p>
          </div>
        </>
      )}
    </div>
  )
}
