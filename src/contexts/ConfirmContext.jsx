import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import Modal from '../components/Modal'

const ConfirmContext = createContext(null)

export function ConfirmProvider({ children }) {
  const { t } = useTranslation()
  const [request, setRequest] = useState(null)

  const confirm = useCallback((message) => {
    return new Promise((resolve) => {
      setRequest({ message, resolve })
    })
  }, [])

  function resolve(result) {
    request?.resolve(result)
    setRequest(null)
  }

  const value = useMemo(() => ({ confirm }), [confirm])

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      {request && (
        <Modal>
          <p className="text-sm text-gray-700">{request.message}</p>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={() => resolve(false)}
              className="flex-1 rounded-lg border border-gray-300 py-2 text-sm font-medium text-gray-600 hover:border-gray-400"
            >
              {t('vaultPage.cancel')}
            </button>
            <button
              type="button"
              onClick={() => resolve(true)}
              className="flex-1 rounded-lg bg-red-600 py-2 text-sm font-medium text-white hover:bg-red-700"
            >
              {t('tasksPage.confirmDone')}
            </button>
          </div>
        </Modal>
      )}
    </ConfirmContext.Provider>
  )
}

export function useConfirm() {
  const context = useContext(ConfirmContext)
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmProvider')
  }
  return context.confirm
}
