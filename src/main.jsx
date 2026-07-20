import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import './i18n'
import { ThemeProvider } from './contexts/ThemeContext'
import { AuthProvider } from './contexts/AuthContext'
import { HouseProvider } from './contexts/HouseContext'
import { SubscriptionProvider } from './contexts/SubscriptionContext'
import { LanguageProvider } from './contexts/LanguageContext'
import { CategoriesProvider } from './contexts/CategoriesContext'
import { BillsProvider } from './contexts/BillsContext'
import { TasksProvider } from './contexts/TasksContext'
import { ShoppingProvider } from './contexts/ShoppingContext'
import { VaultProvider } from './contexts/VaultContext'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <ThemeProvider>
      <AuthProvider>
        <HouseProvider>
          <SubscriptionProvider>
            <LanguageProvider>
              <CategoriesProvider>
                <BillsProvider>
                  <ShoppingProvider>
                    <TasksProvider>
                      <VaultProvider>
                        <App />
                      </VaultProvider>
                    </TasksProvider>
                  </ShoppingProvider>
                </BillsProvider>
              </CategoriesProvider>
            </LanguageProvider>
          </SubscriptionProvider>
        </HouseProvider>
      </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>,
)
