import { useTranslation } from 'react-i18next'

export default function AuthLayout({ children }) {
  const { t } = useTranslation()

  return (
    <div className="flex min-h-svh flex-col md:flex-row">
      <div className="hidden shrink-0 flex-col justify-between bg-purple-600 p-12 text-white md:flex md:w-[420px]">
        <p className="text-xl font-semibold">{t('app.name')}</p>
        <h2 className="text-3xl font-semibold leading-tight">{t('app.tagline')}</h2>
        <p className="text-sm text-purple-200">{t('app.name')}</p>
      </div>

      <div className="bg-purple-600 px-6 py-8 text-center text-white md:hidden">
        <p className="text-lg font-semibold">{t('app.name')}</p>
        <p className="mt-1 text-sm text-purple-200">{t('app.tagline')}</p>
      </div>

      <div className="flex flex-1 items-center justify-center px-6 py-10">
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </div>
  )
}
