import { Navigate } from 'react-router-dom'
import { useHouse } from '../contexts/HouseContext'

export default function RequireHouse({ children }) {
  const { hasHouse, loading } = useHouse()

  if (loading) return null
  if (!hasHouse) return <Navigate to="/onboarding" replace />

  return children
}
