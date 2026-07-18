import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import RequireAuth from './components/RequireAuth'
import RequireHouse from './components/RequireHouse'
import RedirectIfAuthenticated from './components/RedirectIfAuthenticated'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import OnboardingPage from './pages/OnboardingPage'
import HomePage from './pages/HomePage'
import ContasPage from './pages/ContasPage'
import TarefasPage from './pages/TarefasPage'
import GastosPage from './pages/GastosPage'
import ComprasPage from './pages/ComprasPage'
import CalendarioPage from './pages/CalendarioPage'
import CasaPage from './pages/CasaPage'

export default function App() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <RedirectIfAuthenticated>
            <LoginPage />
          </RedirectIfAuthenticated>
        }
      />
      <Route
        path="/register"
        element={
          <RedirectIfAuthenticated>
            <RegisterPage />
          </RedirectIfAuthenticated>
        }
      />

      <Route
        path="/onboarding"
        element={
          <RequireAuth>
            <OnboardingPage />
          </RequireAuth>
        }
      />

      <Route
        element={
          <RequireAuth>
            <RequireHouse>
              <Layout />
            </RequireHouse>
          </RequireAuth>
        }
      >
        <Route path="/home" element={<HomePage />} />
        <Route path="/contas" element={<ContasPage />} />
        <Route path="/tarefas" element={<TarefasPage />} />
        <Route path="/gastos" element={<GastosPage />} />
        <Route path="/compras" element={<ComprasPage />} />
        <Route path="/calendario" element={<CalendarioPage />} />
        <Route path="/casa" element={<CasaPage />} />
      </Route>

      <Route path="/" element={<Navigate to="/home" replace />} />
      <Route path="*" element={<Navigate to="/home" replace />} />
    </Routes>
  )
}
