import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { LANGUAGE_STORAGE_KEY, SUPPORTED_LANGUAGES } from '../utils/language'
import { supabase } from '../services/supabase'
import { useAuth } from './AuthContext'

const LanguageContext = createContext(null)

export function LanguageProvider({ children }) {
  const { i18n } = useTranslation()
  const { user } = useAuth()
  const [language, setLanguageState] = useState(i18n.language)

  function setLanguage(nextLanguage) {
    if (!SUPPORTED_LANGUAGES.includes(nextLanguage)) return
    i18n.changeLanguage(nextLanguage)
    localStorage.setItem(LANGUAGE_STORAGE_KEY, nextLanguage)
    setLanguageState(nextLanguage)
    if (user?.id) {
      supabase.from('profiles').update({ language: nextLanguage }).eq('id', user.id).then()
    }
  }

  // Keep the server-side copy in sync so day-of notification emails go out
  // in the right language even though the preference lives in localStorage.
  useEffect(() => {
    if (!user?.id) return
    supabase.from('profiles').update({ language }).eq('id', user.id).then()
  }, [user?.id])

  const value = useMemo(
    () => ({ language, setLanguage, supportedLanguages: SUPPORTED_LANGUAGES }),
    [language]
  )

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}
