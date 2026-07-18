import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function RedirectIfAuthenticated({ children }) {
  const { isAuthenticated, loading } = useAuth()

  if (loading) return null
  if (isAuthenticated) return <Navigate to="/home" replace />

  return children
}
