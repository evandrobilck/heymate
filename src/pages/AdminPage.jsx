import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../services/supabase'

const OWNER_EMAIL = 'xp.vando@gmail.com'

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
        <div className="grid grid-cols-2 gap-3">
          <StatCard label="Usuários" value={stats.totalUsers} />
          <StatCard label="Casas" value={stats.totalHouses} />
          <StatCard label="Assinaturas ativas" value={stats.activeSubscriptions} />
        </div>
      )}
    </div>
  )
}
