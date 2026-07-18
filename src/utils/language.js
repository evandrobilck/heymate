export const SUPPORTED_LANGUAGES = ['en', 'pt-BR', 'es']
export const DEFAULT_LANGUAGE = 'en'
export const LANGUAGE_STORAGE_KEY = 'heyflat_language'

export function detectLanguage() {
  const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY)
  if (stored && SUPPORTED_LANGUAGES.includes(stored)) {
    return stored
  }

  const browserLanguage = navigator.language
  if (SUPPORTED_LANGUAGES.includes(browserLanguage)) {
    return browserLanguage
  }

  const browserLanguagePrefix = browserLanguage?.split('-')[0]
  if (browserLanguagePrefix === 'pt') {
    return 'pt-BR'
  }
  if (browserLanguagePrefix === 'es') {
    return 'es'
  }

  return DEFAULT_LANGUAGE
}
