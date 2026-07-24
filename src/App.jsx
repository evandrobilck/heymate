import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import RequireAuth from './components/RequireAuth'
import RequireHouse from './components/RequireHouse'
import RequireActiveSubscription from './components/RequireActiveSubscription'
import RedirectIfAuthenticated from './components/RedirectIfAuthenticated'

const LoginPage = lazy(() => import('./pages/LoginPage'))
const RegisterPage = lazy(() => import('./pages/RegisterPage'))
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'))
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'))
const OnboardingPage = lazy(() => import('./pages/OnboardingPage'))
const CheckoutResultPage = lazy(() => import('./pages/CheckoutResultPage'))
const PrivacyPolicyPage = lazy(() => import('./pages/PrivacyPolicyPage'))
const SupportPage = lazy(() => import('./pages/SupportPage'))
const HomePage = lazy(() => import('./pages/HomePage'))
const ContasPage = lazy(() => import('./pages/ContasPage'))
const TarefasPage = lazy(() => import('./pages/TarefasPage'))
const GastosPage = lazy(() => import('./pages/GastosPage'))
const ComprasPage = lazy(() => import('./pages/ComprasPage'))
const CalendarioPage = lazy(() => import('./pages/CalendarioPage'))
const ManutencaoPage = lazy(() => import('./pages/ManutencaoPage'))
const InspecaoPage = lazy(() => import('./pages/InspecaoPage'))
const CasaPage = lazy(() => import('./pages/CasaPage'))
const SettingsPage = lazy(() => import('./pages/SettingsPage'))
const ProfilePage = lazy(() => import('./pages/ProfilePage'))

function PageFallback() {
  return (
    <div className="flex h-full min-h-[50vh] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-200 border-t-brand-600" />
    </div>
  )
}

export default function App() {
  return (
    <Suspense fallback={<PageFallback />}>
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
          path="/esqueci-senha"
          element={
            <RedirectIfAuthenticated>
              <ForgotPasswordPage />
            </RedirectIfAuthenticated>
          }
        />
        <Route path="/redefinir-senha" element={<ResetPasswordPage />} />

        <Route path="/checkout-resultado" element={<CheckoutResultPage />} />
        <Route path="/privacidade" element={<PrivacyPolicyPage />} />
        <Route path="/suporte" element={<SupportPage />} />

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
                <RequireActiveSubscription>
                  <Layout />
                </RequireActiveSubscription>
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
          <Route path="/manutencao" element={<ManutencaoPage />} />
          <Route path="/inspecao" element={<InspecaoPage />} />
          <Route path="/casa" element={<CasaPage />} />
          <Route path="/configuracoes" element={<SettingsPage />} />
          <Route path="/perfil" element={<ProfilePage />} />
        </Route>

        <Route path="/" element={<Navigate to="/home" replace />} />
        <Route path="*" element={<Navigate to="/home" replace />} />
      </Routes>
    </Suspense>
  )
}
