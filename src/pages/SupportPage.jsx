import { useState } from 'react'
import { Link } from 'react-router-dom'

const CONTENT = {
  en: {
    label: 'English',
    title: 'Support',
    body: "Need help with HeyFlat, or found a bug? We're happy to help.",
    emailLabel: 'Email us at',
    faqTitle: 'Common questions',
    faqs: [
      {
        q: 'How do I invite housemates?',
        a: 'Open the House tab and share your invite code — anyone with the code can join your household.',
      },
      {
        q: 'How do I cancel my subscription?',
        a: 'Go to Settings, and manage your subscription from there. Billing is handled securely by Stripe.',
      },
      {
        q: 'How do I delete my account or data?',
        a: 'Email us at the address below and we’ll take care of it.',
      },
    ],
  },
  pt: {
    label: 'Português',
    title: 'Suporte',
    body: 'Precisa de ajuda com o HeyFlat, ou encontrou um bug? Estamos aqui pra ajudar.',
    emailLabel: 'Escreva pra gente em',
    faqTitle: 'Perguntas comuns',
    faqs: [
      {
        q: 'Como convido meus colegas de casa?',
        a: 'Abra a aba Casa e compartilhe o código de convite — qualquer pessoa com o código pode entrar na sua casa.',
      },
      {
        q: 'Como cancelo minha assinatura?',
        a: 'Vá em Configurações e gerencie sua assinatura por lá. A cobrança é feita com segurança pela Stripe.',
      },
      {
        q: 'Como apago minha conta ou meus dados?',
        a: 'Escreva pra gente no email abaixo que a gente resolve.',
      },
    ],
  },
}

export default function SupportPage() {
  const [lang, setLang] = useState('en')
  const copy = CONTENT[lang]

  return (
    <div className="min-h-svh bg-gray-50 px-4 py-10">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex items-center justify-between">
          <Link to="/" className="text-sm font-medium text-brand-600 hover:text-brand-700">
            ← HeyFlat
          </Link>
          <div className="flex gap-2">
            {Object.entries(CONTENT).map(([key, value]) => (
              <button
                key={key}
                type="button"
                onClick={() => setLang(key)}
                className={`rounded-full px-3 py-1 text-xs font-medium ${
                  lang === key ? 'bg-brand-600 text-white' : 'bg-gray-200 text-gray-600'
                }`}
              >
                {value.label}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-surface p-6 sm:p-8">
          <h1 className="text-2xl font-semibold text-gray-900">{copy.title}</h1>
          <p className="mt-2 text-sm text-gray-600">{copy.body}</p>
          <p className="mt-4 text-sm font-medium text-gray-900">
            {copy.emailLabel}{' '}
            <a href="mailto:hello@heyflat.com.au" className="text-brand-600 hover:text-brand-700">
              hello@heyflat.com.au
            </a>
          </p>

          <div className="mt-8 border-t border-gray-100 pt-6">
            <h2 className="text-sm font-semibold text-gray-900">{copy.faqTitle}</h2>
            <div className="mt-4 space-y-4">
              {copy.faqs.map((faq) => (
                <div key={faq.q}>
                  <p className="text-sm font-medium text-gray-800">{faq.q}</p>
                  <p className="mt-1 text-sm text-gray-600">{faq.a}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
