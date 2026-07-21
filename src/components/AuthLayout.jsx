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

      <div className="relative flex min-h-svh flex-1 flex-col bg-brand-600 px-6 pb-8 pt-16 md:hidden">
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
          <img
            src="/logo-mark-white.svg"
            alt=""
            className="absolute -right-16 -top-20 h-64 w-64 rotate-12 opacity-90"
          />
        </div>

        <div className="relative flex flex-1 flex-col justify-center">
          <div className="rounded-3xl bg-surface p-6 shadow-xl">
            <img src="/logo-purple.svg" alt={t('app.name')} className="mx-auto h-9 w-auto dark:hidden" />
            <img src="/logo-white.svg" alt={t('app.name')} className="mx-auto hidden h-9 w-auto dark:block" />
            <div className="mt-6">{children}</div>
          </div>
        </div>

        <div className="relative mt-8 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-white/70">
            {t('app.developedBy')}
          </p>
          <img src="/egg-studio-logo-white.svg" alt="Egg Studio" className="mx-auto mt-2 h-6 w-auto opacity-90" />
        </div>
      </div>

      <div className="hidden flex-1 items-center justify-center px-6 py-10 md:flex">
        <div className="w-full max-w-sm">
          <img src="/logo-mark-purple.svg" alt="" aria-hidden="true" className="mx-auto h-14 w-auto dark:hidden" />
          <img
            src="/logo-mark-white.svg"
            alt=""
            aria-hidden="true"
            className="mx-auto hidden h-14 w-auto dark:block"
          />
          <div className="mt-6">{children}</div>
        </div>
      </div>
    </div>
  )
}
