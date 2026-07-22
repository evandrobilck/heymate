import { useState } from 'react'
import { Link } from 'react-router-dom'

const CONTENT = {
  en: {
    label: 'English',
    title: 'Privacy Policy',
    updated: 'Last updated: July 2026',
    sections: [
      {
        heading: 'Who we are',
        body: 'HeyFlat ("we", "us") is a shared-household organization app operated by Egg Studio. This policy explains what information HeyFlat collects, how it is used, and the choices you have.',
      },
      {
        heading: 'Information we collect',
        body:
          'When you create an account and use HeyFlat, we collect: your name, email address, and (optionally) a profile photo; information you and your housemates add to organize your household, such as house name, address, photo, Wi-Fi details, bills, tasks, shopping list items, maintenance reports, and inspection checklists; and, if you enable push notifications, a device token used to deliver them.',
      },
      {
        heading: 'How we use your information',
        body:
          "We use this information to operate the core features of the app: showing your household's shared bills, tasks, and shopping list; sending you email and/or push reminders you configure; and identifying you to your housemates within your own household. We do not use your data for advertising, and we do not sell your data to third parties.",
      },
      {
        heading: 'Payments',
        body:
          "If you subscribe to HeyFlat, payment is processed by Stripe. HeyFlat never receives or stores your card number or full payment details — Stripe handles that directly and provides us only with subscription status (active, canceled, etc).",
      },
      {
        heading: 'Service providers',
        body:
          'HeyFlat relies on a small number of service providers to operate: Supabase (database, authentication, and file storage), Resend (delivering email reminders), Google Firebase Cloud Messaging (delivering push notifications), Stripe (subscription billing), and Codemagic/Apple/Google (app distribution). These providers process data only as needed to provide their service to us.',
      },
      {
        heading: 'Data retention and deletion',
        body:
          "You can leave a household at any time from the House tab, which removes your association with it. A house admin can reset all of a household's shared data (bills, tasks, shopping items) or delete the household entirely from the House tab. To request deletion of your account and personal data, contact us using the details below.",
      },
      {
        heading: "Children's privacy",
        body: 'HeyFlat is not directed at children under 16, and we do not knowingly collect information from them.',
      },
      {
        heading: 'Changes to this policy',
        body: 'We may update this policy from time to time. Material changes will be reflected by updating the date above.',
      },
      {
        heading: 'Contact us',
        body: 'Questions about this policy or your data? Email us at hello@heyflat.com.au.',
      },
    ],
  },
  pt: {
    label: 'Português',
    title: 'Política de Privacidade',
    updated: 'Última atualização: julho de 2026',
    sections: [
      {
        heading: 'Quem somos',
        body: 'O HeyFlat ("nós") é um aplicativo de organização para casas compartilhadas, operado pela Egg Studio. Esta política explica quais informações o HeyFlat coleta, como são usadas, e quais escolhas você tem.',
      },
      {
        heading: 'Informações que coletamos',
        body:
          'Ao criar uma conta e usar o HeyFlat, coletamos: seu nome, email e (opcionalmente) uma foto de perfil; informações que você e seus colegas de casa adicionam para organizar a casa, como nome, endereço, foto, dados de Wi-Fi, contas, tarefas, itens de compra, relatos de manutenção e checklists de inspeção; e, se você ativar notificações push, um token do dispositivo usado para entregá-las.',
      },
      {
        heading: 'Como usamos suas informações',
        body:
          'Usamos essas informações para operar as funções principais do app: mostrar as contas, tarefas e lista de compras compartilhadas da sua casa; enviar lembretes por email e/ou push que você configurar; e te identificar para seus colegas de casa dentro da sua própria casa. Não usamos seus dados para publicidade, e não vendemos seus dados a terceiros.',
      },
      {
        heading: 'Pagamentos',
        body:
          'Se você assinar o HeyFlat, o pagamento é processado pela Stripe. O HeyFlat nunca recebe ou armazena o número do seu cartão ou dados completos de pagamento — a Stripe cuida disso diretamente e nos fornece apenas o status da assinatura (ativa, cancelada, etc).',
      },
      {
        heading: 'Prestadores de serviço',
        body:
          'O HeyFlat depende de um pequeno número de prestadores de serviço para funcionar: Supabase (banco de dados, autenticação e armazenamento de arquivos), Resend (envio de lembretes por email), Google Firebase Cloud Messaging (envio de notificações push), Stripe (cobrança de assinatura), e Codemagic/Apple/Google (distribuição do app). Esses prestadores processam dados apenas conforme necessário para nos fornecer o serviço.',
      },
      {
        heading: 'Retenção e exclusão de dados',
        body:
          'Você pode sair de uma casa a qualquer momento pela aba Casa, o que remove sua associação com ela. Um administrador da casa pode redefinir todos os dados compartilhados da casa (contas, tarefas, itens de compra) ou excluir a casa inteiramente pela aba Casa. Para solicitar a exclusão da sua conta e dados pessoais, entre em contato usando os dados abaixo.',
      },
      {
        heading: 'Privacidade de crianças',
        body: 'O HeyFlat não é direcionado a crianças menores de 16 anos, e não coletamos informações delas conscientemente.',
      },
      {
        heading: 'Alterações nesta política',
        body: 'Podemos atualizar esta política de tempos em tempos. Mudanças relevantes serão refletidas atualizando a data acima.',
      },
      {
        heading: 'Fale conosco',
        body: 'Dúvidas sobre esta política ou seus dados? Escreva para hello@heyflat.com.au.',
      },
    ],
  },
}

export default function PrivacyPolicyPage() {
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
          <p className="mt-1 text-xs text-gray-400">{copy.updated}</p>

          <div className="mt-6 space-y-6">
            {copy.sections.map((section) => (
              <div key={section.heading}>
                <h2 className="text-sm font-semibold text-gray-900">{section.heading}</h2>
                <p className="mt-1 text-sm leading-relaxed text-gray-600">{section.body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
