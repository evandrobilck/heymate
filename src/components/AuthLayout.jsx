import { useTranslation } from 'react-i18next'

export default function AuthLayout({ children }) {
  const { t } = useTranslation()

  return (
    <div className="flex min-h-svh">
      <div className="flex w-[420px] shrink-0 flex-col justify-between bg-purple-600 p-12 text-white">
        <p className="text-xl font-semibold">{t('app.name')}</p>
        <h2 className="text-3xl font-semibold leading-tight">{t('app.tagline')}</h2>
        <p className="text-sm text-purple-200">{t('app.name')}</p>
      </div>

      <div className="flex flex-1 items-center justify-center px-6">
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </div>
  )
}
