// Runs once an hour (via pg_cron, see migration 0023) and emails every house
// member who has something due *today*: a task assigned to them with
// "notify" checked, or their unpaid share of a bill (including recurring
// bill occurrences projected onto today, same logic as the calendar page).
// Bills and tasks without a specific notify_time go out at DEFAULT_HOUR, the
// house's traditional morning reminder; a task with notify_time only goes
// out once the local clock reaches that hour, e.g. "take out the trash"
// set to fire at 19:00 instead of first thing in the morning.
import { createClient } from 'jsr:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const FROM_EMAIL = 'HeyFlat <notificacoes@mail.heyflat.com.au>'

// Notifications are timed for the house's market (Australia) rather than UTC,
// so "today" matches what members actually see due on the calendar.
const TIMEZONE = 'Australia/Sydney'
const DEFAULT_HOUR = 8

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

function todayKey(): string {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', { timeZone: TIMEZONE }).format(new Date())
}

function currentLocalHour(): number {
  return Number(
    new Intl.DateTimeFormat('en-US', { timeZone: TIMEZONE, hour: 'numeric', hourCycle: 'h23' }).format(new Date())
  )
}

// --- Recurrence math, ported from src/utils/recurrence.js -----------------

function addMonths(date: Date, months: number): Date {
  const day = date.getDate()
  const result = new Date(date.getFullYear(), date.getMonth() + months, 1)
  const daysInResultMonth = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate()
  result.setDate(Math.min(day, daysInResultMonth))
  return result
}

function stepAnchor(anchor: Date, recurrence: string, steps: number): Date {
  if (recurrence === 'weekly') {
    const d = new Date(anchor)
    d.setDate(d.getDate() + 7 * steps)
    return d
  }
  if (recurrence === 'biweekly') {
    const d = new Date(anchor)
    d.setDate(d.getDate() + 14 * steps)
    return d
  }
  if (recurrence === 'monthly') return addMonths(anchor, steps)
  if (recurrence === 'yearly') return addMonths(anchor, steps * 12)
  return anchor
}

function toDayKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function billIsDueOn(
  dueDateKey: string,
  recurrence: string,
  recurrenceUntil: string | null,
  excludedDates: string[],
  targetKey: string
): boolean {
  if (excludedDates.includes(targetKey)) return false
  if (recurrenceUntil && targetKey > recurrenceUntil) return false
  if (!recurrence || recurrence === 'none') return dueDateKey === targetKey

  const [year, month, day] = dueDateKey.split('-').map(Number)
  const anchor = new Date(year, month - 1, day)
  const MAX_STEPS = 500

  for (let i = 0; i < MAX_STEPS; i++) {
    const key = toDayKey(stepAnchor(anchor, recurrence, i))
    if (key > targetKey) break
    if (key === targetKey) return true
  }
  for (let i = -1; i > -MAX_STEPS; i--) {
    const key = toDayKey(stepAnchor(anchor, recurrence, i))
    if (key < targetKey) break
    if (key === targetKey) return true
  }
  return false
}

// --- Email templates --------------------------------------------------

const CURRENCY_LOCALE: Record<string, string> = { en: 'en-AU', 'pt-BR': 'pt-BR', es: 'es' }

function formatAmount(amount: number, currency: string, language: string): string {
  const locale = CURRENCY_LOCALE[language] ?? 'en-AU'
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount)
}

function emailShell(innerHtml: string): string {
  return `<div style="font-family:-apple-system,Helvetica,Arial,sans-serif;max-width:480px;margin:0 auto">
    <div style="background:#6e0bfc;padding:20px 24px;border-radius:12px 12px 0 0">
      <span style="color:#fff;font-size:18px;font-weight:700">HeyFlat</span>
    </div>
    <div style="border:1px solid #eee;border-top:none;padding:24px;border-radius:0 0 12px 12px;color:#111;font-size:14px;line-height:1.6">
      ${innerHtml}
    </div>
  </div>`
}

type TemplateParams = { name: string; title: string; houseName: string; amount?: string }

const TEMPLATES: Record<'task' | 'bill', Record<string, (p: TemplateParams) => { subject: string; html: string }>> = {
  task: {
    en: (p) => ({
      subject: `Reminder: "${p.title}" is due today`,
      html: emailShell(
        `<p>Hi ${p.name},</p><p>Just a reminder that your task <strong>${p.title}</strong> is due today in <strong>${p.houseName}</strong>.</p>`
      ),
    }),
    'pt-BR': (p) => ({
      subject: `Lembrete: "${p.title}" vence hoje`,
      html: emailShell(
        `<p>Oi ${p.name},</p><p>Só lembrando que sua tarefa <strong>${p.title}</strong> vence hoje em <strong>${p.houseName}</strong>.</p>`
      ),
    }),
    es: (p) => ({
      subject: `Recordatorio: "${p.title}" vence hoy`,
      html: emailShell(
        `<p>Hola ${p.name},</p><p>Solo para recordarte que tu tarea <strong>${p.title}</strong> vence hoy en <strong>${p.houseName}</strong>.</p>`
      ),
    }),
  },
  bill: {
    en: (p) => ({
      subject: `Reminder: "${p.title}" is due today`,
      html: emailShell(
        `<p>Hi ${p.name},</p><p>Your share of <strong>${p.title}</strong> (<strong>${p.amount}</strong>) is due today in <strong>${p.houseName}</strong>.</p>`
      ),
    }),
    'pt-BR': (p) => ({
      subject: `Lembrete: conta "${p.title}" vence hoje`,
      html: emailShell(
        `<p>Oi ${p.name},</p><p>Sua parte da conta <strong>${p.title}</strong> (<strong>${p.amount}</strong>) vence hoje em <strong>${p.houseName}</strong>.</p>`
      ),
    }),
    es: (p) => ({
      subject: `Recordatorio: cuenta "${p.title}" vence hoy`,
      html: emailShell(
        `<p>Hola ${p.name},</p><p>Tu parte de <strong>${p.title}</strong> (<strong>${p.amount}</strong>) vence hoy en <strong>${p.houseName}</strong>.</p>`
      ),
    }),
  },
}

function renderTemplate(entityType: 'task' | 'bill', language: string, params: TemplateParams) {
  const byLanguage = TEMPLATES[entityType]
  const build = byLanguage[language] ?? byLanguage.en
  return build(params)
}

// --- Sending + idempotency -------------------------------------------

async function sendEmail(to: string, subject: string, html: string) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: FROM_EMAIL, to: [to], subject, html }),
  })
  if (!res.ok) {
    throw new Error(`Resend error ${res.status}: ${await res.text()}`)
  }
}

async function claim(entityType: 'task' | 'bill', entityId: string, occurrenceDate: string, userId: string) {
  const { error } = await supabase
    .from('notification_log')
    .insert({ entity_type: entityType, entity_id: entityId, occurrence_date: occurrenceDate, user_id: userId })
  if (error) {
    if (error.code === '23505') return false // already sent for this entity/date/user
    throw error
  }
  return true
}

async function release(entityType: 'task' | 'bill', entityId: string, occurrenceDate: string, userId: string) {
  await supabase
    .from('notification_log')
    .delete()
    .match({ entity_type: entityType, entity_id: entityId, occurrence_date: occurrenceDate, user_id: userId })
}

Deno.serve(async () => {
  try {
    const today = todayKey()
    const currentHour = currentLocalHour()
    let sent = 0
    const errors: string[] = []

    const { data: allNotifyTasks, error: tasksError } = await supabase
      .from('tasks')
      .select('id, title, house_id, notify_time, task_assignees(user_id)')
      .eq('notify', true)
      .eq('completed', false)
      .eq('due_date', today)
    if (tasksError) throw tasksError

    const tasks = (allNotifyTasks ?? []).filter((task) => {
      const hour = task.notify_time ? Number(task.notify_time.split(':')[0]) : DEFAULT_HOUR
      return hour === currentHour
    })

    const { data: bills, error: billsError } =
      currentHour === DEFAULT_HOUR
        ? await supabase
            .from('bills')
            .select(
              'id, title, total_amount, due_date, recurrence, recurrence_until, house_id, bill_occurrence_exceptions(occurrence_date), bill_shares(user_id, amount, paid)'
            )
        : { data: [], error: null }
    if (billsError) throw billsError

    const dueBills = (bills ?? []).filter((bill) =>
      billIsDueOn(
        bill.due_date,
        bill.recurrence,
        bill.recurrence_until,
        (bill.bill_occurrence_exceptions ?? []).map((e: { occurrence_date: string }) => e.occurrence_date),
        today
      )
    )

    const houseIds = new Set<string>()
    const userIds = new Set<string>()
    for (const task of tasks ?? []) {
      houseIds.add(task.house_id)
      for (const a of task.task_assignees ?? []) userIds.add(a.user_id)
    }
    for (const bill of dueBills) {
      houseIds.add(bill.house_id)
      for (const s of bill.bill_shares ?? []) if (!s.paid) userIds.add(s.user_id)
    }

    if (houseIds.size === 0 && userIds.size === 0) {
      return new Response(JSON.stringify({ ok: true, sent: 0 }), { headers: { 'Content-Type': 'application/json' } })
    }

    const { data: houses } = await supabase.from('houses').select('id, name, currency').in('id', [...houseIds])
    const houseById = new Map((houses ?? []).map((h) => [h.id, h]))

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, email, language')
      .in('id', [...userIds])
    const profileById = new Map((profiles ?? []).map((p) => [p.id, p]))

    for (const task of tasks ?? []) {
      const house = houseById.get(task.house_id)
      for (const a of task.task_assignees ?? []) {
        const profile = profileById.get(a.user_id)
        if (!profile?.email) continue
        const claimed = await claim('task', task.id, today, a.user_id)
        if (!claimed) continue
        try {
          const { subject, html } = renderTemplate('task', profile.language ?? 'en', {
            name: profile.full_name ?? profile.email,
            title: task.title,
            houseName: house?.name ?? '',
          })
          await sendEmail(profile.email, subject, html)
          sent++
        } catch (err) {
          errors.push(`task ${task.id} -> ${a.user_id}: ${err}`)
          await release('task', task.id, today, a.user_id)
        }
      }
    }

    for (const bill of dueBills) {
      const house = houseById.get(bill.house_id)
      for (const share of bill.bill_shares ?? []) {
        if (share.paid) continue
        const profile = profileById.get(share.user_id)
        if (!profile?.email) continue
        const claimed = await claim('bill', bill.id, today, share.user_id)
        if (!claimed) continue
        try {
          const { subject, html } = renderTemplate('bill', profile.language ?? 'en', {
            name: profile.full_name ?? profile.email,
            title: bill.title,
            houseName: house?.name ?? '',
            amount: formatAmount(share.amount, house?.currency ?? 'AUD', profile.language ?? 'en'),
          })
          await sendEmail(profile.email, subject, html)
          sent++
        } catch (err) {
          errors.push(`bill ${bill.id} -> ${share.user_id}: ${err}`)
          await release('bill', bill.id, today, share.user_id)
        }
      }
    }

    return new Response(JSON.stringify({ ok: true, sent, errors }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error(err)
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
