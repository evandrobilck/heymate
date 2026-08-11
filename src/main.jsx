import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import * as Sentry from '@sentry/react'
import './index.css'
import './i18n'
import { ThemeProvider } from './contexts/ThemeContext'
import { ToastProvider } from './contexts/ToastContext'
import { ConfirmProvider } from './contexts/ConfirmContext'
import { AuthProvider } from './contexts/AuthContext'
import { HouseProvider } from './contexts/HouseContext'
import { SubscriptionProvider } from './contexts/SubscriptionContext'
import { LanguageProvider } from './contexts/LanguageContext'
import { CategoriesProvider } from './contexts/CategoriesContext'
import { BillsProvider } from './contexts/BillsContext'
import { HistoricalExpensesProvider } from './contexts/HistoricalExpensesContext'
import { TasksProvider } from './contexts/TasksContext'
import { ShoppingProvider } from './contexts/ShoppingContext'
import { MaintenanceProvider } from './contexts/MaintenanceContext'
import { InspectionProvider } from './contexts/InspectionContext'
import { CalendarEventsProvider } from './contexts/CalendarEventsContext'
import { VaultProvider } from './contexts/VaultContext'
import App from './App.jsx'

// HeyFlat handles bank details/PayID/bill amounts, so request/response
// bodies and automatic user PII are kept out of what gets sent to Sentry —
// only the error itself and its stack trace.
Sentry.init({
  dsn: 'https://c301593baa71c53f21b65ed942fe1a2d@o4511889811701760.ingest.us.sentry.io/4511889834246144',
  dataCollection: {
    userInfo: false,
    httpBodies: [],
  },
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <ToastProvider>
          <ConfirmProvider>
            <AuthProvider>
              <HouseProvider>
                <SubscriptionProvider>
                  <LanguageProvider>
                    <CategoriesProvider>
                      <BillsProvider>
                        <HistoricalExpensesProvider>
                          <ShoppingProvider>
                            <TasksProvider>
                              <MaintenanceProvider>
                                <InspectionProvider>
                                  <CalendarEventsProvider>
                                    <VaultProvider>
                                      <App />
                                    </VaultProvider>
                                  </CalendarEventsProvider>
                                </InspectionProvider>
                              </MaintenanceProvider>
                            </TasksProvider>
                          </ShoppingProvider>
                        </HistoricalExpensesProvider>
                      </BillsProvider>
                    </CategoriesProvider>
                  </LanguageProvider>
                </SubscriptionProvider>
              </HouseProvider>
            </AuthProvider>
          </ConfirmProvider>
        </ToastProvider>
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>,
)
