import { useTranslation } from 'react-i18next'

export default function AuthLayout({ children }) {
  const { t } = useTranslation()

  return (
    <div className="flex min-h-svh flex-col md:flex-row">
      <div className="hidden shrink-0 flex-col justify-between bg-brand-600 p-12 text-white md:flex md:w-[420px]">
        <img src="/logo-white.svg" alt={t('app.name')} className="h-8 w-auto" />
        <h2 className="text-3xl font-semibold leading-tight">{t('app.tagline')}</h2>
        <img src="/logo-white.svg" alt={t('app.name')} className="h-4 w-auto opacity-70" />
      </div>

      <div className="bg-brand-600 px-6 py-8 text-center text-white md:hidden">
        <img src="/logo-white.svg" alt={t('app.name')} className="mx-auto h-7 w-auto" />
        <p className="mt-1 text-sm text-brand-200">{t('app.tagline')}</p>
      </div>

      <div className="flex flex-1 items-center justify-center px-6 py-10">
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </div>
  )
}
