import { createContext, useCallback, useContext, useMemo, useState } from 'react'

const ToastContext = createContext(null)
const DISMISS_AFTER_MS = 4000

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null)

  const showToast = useCallback((message) => {
    const id = Date.now()
    setToast({ id, message })
    setTimeout(() => {
      setToast((current) => (current?.id === id ? null : current))
    }, DISMISS_AFTER_MS)
  }, [])

  const value = useMemo(() => ({ showToast }), [showToast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toast && (
        <div className="pointer-events-none fixed inset-x-0 bottom-20 z-50 flex justify-center px-4 md:bottom-6">
          <div className="pointer-events-auto rounded-lg bg-gray-900 px-4 py-2.5 text-center text-sm text-white shadow-lg dark:bg-gray-100 dark:text-gray-900">
            {toast.message}
          </div>
        </div>
      )}
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context.showToast
}
