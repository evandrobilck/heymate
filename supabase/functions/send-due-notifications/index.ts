// Runs once an hour (via pg_cron, see migration 0023) and sends every
// configured reminder (see migration 0025's bill_reminders/task_reminders)
// whose target date + time matches right now. A reminder's "days before"
// projects onto the bill/task's due date (recurrence-aware for bills, same
// projection logic as the calendar page) to get a fire date; if that fire
// date is today and the current hour matches the reminder's time, it goes
// out via whichever channel(s) it's configured for (email, push, or both).
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { sendPush } from '../_shared/push.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const FROM_EMAIL = 'HeyFlat <notificacoes@mail.heyflat.com.au>'

// Notifications are timed for the house's market (Australia) rather than UTC,
// so "today" matches what members actually see due on the calendar.
const TIMEZONE = 'Australia/Sydney'

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

function addDays(dateKey: string, days: number): string {
  const [year, month, day] = dateKey.split('-').map(Number)
  const date = new Date(year, month - 1, day + days)
  return toDayKey(date)
}

function hourOfTime(timeStr: string): number {
  return Number(timeStr.split(':')[0])
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
      subject: `Reminder: "${p.title}"`,
      html: emailShell(
        `<p>Hi ${p.name},</p><p>Just a reminder about your task <strong>${p.title}</strong> in <strong>${p.houseName}</strong>.</p>`
      ),
    }),
    'pt-BR': (p) => ({
      subject: `Lembrete: "${p.title}"`,
      html: emailShell(
        `<p>Oi ${p.name},</p><p>Só lembrando da sua tarefa <strong>${p.title}</strong> em <strong>${p.houseName}</strong>.</p>`
      ),
    }),
    es: (p) => ({
      subject: `Recordatorio: "${p.title}"`,
      html: emailShell(
        `<p>Hola ${p.name},</p><p>Solo para recordarte tu tarea <strong>${p.title}</strong> en <strong>${p.houseName}</strong>.</p>`
      ),
    }),
  },
  bill: {
    en: (p) => ({
      subject: `Reminder: "${p.title}"`,
      html: emailShell(
        `<p>Hi ${p.name},</p><p>Your share of <strong>${p.title}</strong> (<strong>${p.amount}</strong>) is coming up in <strong>${p.houseName}</strong>.</p>`
      ),
    }),
    'pt-BR': (p) => ({
      subject: `Lembrete: conta "${p.title}"`,
      html: emailShell(
        `<p>Oi ${p.name},</p><p>Sua parte da conta <strong>${p.title}</strong> (<strong>${p.amount}</strong>) está chegando em <strong>${p.houseName}</strong>.</p>`
      ),
    }),
    es: (p) => ({
      subject: `Recordatorio: cuenta "${p.title}"`,
      html: emailShell(
        `<p>Hola ${p.name},</p><p>Tu parte de <strong>${p.title}</strong> (<strong>${p.amount}</strong>) se acerca en <strong>${p.houseName}</strong>.</p>`
      ),
    }),
  },
}

function renderTemplate(entityType: 'task' | 'bill', language: string, params: TemplateParams) {
  const byLanguage = TEMPLATES[entityType]
  const build = byLanguage[language] ?? byLanguage.en
  return build(params)
}

// --- Sending ------------------------------------------------------------

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

// --- Idempotency ---------------------------------------------------------

async function claim(entityType: 'task' | 'bill', entityId: string, occurrenceDate: string, userId: string, reminderId: string) {
  const { error } = await supabase
    .from('notification_log')
    .insert({ entity_type: entityType, entity_id: entityId, occurrence_date: occurrenceDate, user_id: userId, reminder_id: reminderId })
  if (error) {
    if (error.code === '23505') return false // already sent for this entity/occurrence/user/reminder
    throw error
  }
  return true
}

async function release(entityType: 'task' | 'bill', entityId: string, occurrenceDate: string, userId: string, reminderId: string) {
  await supabase
    .from('notification_log')
    .delete()
    .match({ entity_type: entityType, entity_id: entityId, occurrence_date: occurrenceDate, user_id: userId, reminder_id: reminderId })
}

type Reminder = { id: string; channel: 'email' | 'push' | 'both'; days_before: number; time_of_day: string }

Deno.serve(async () => {
  try {
    const today = todayKey()
    const currentHour = currentLocalHour()
    let sent = 0
    const errors: string[] = []

    const { data: allTasks, error: tasksError } = await supabase
      .from('tasks')
      .select('id, title, house_id, due_date, task_assignees(user_id), task_reminders(*)')
      .eq('completed', false)
      .not('due_date', 'is', null)
    if (tasksError) throw tasksError

    const { data: allBills, error: billsError } = await supabase
      .from('bills')
      .select(
        'id, title, total_amount, due_date, recurrence, recurrence_until, house_id, bill_occurrence_exceptions(occurrence_date), bill_shares(user_id, amount, paid), bill_reminders(*)'
      )
    if (billsError) throw billsError

    // Pair each task/bill with the specific reminder(s) firing this hour,
    // and (for bills) the occurrence date that reminder is about.
    const dueTasks: { task: (typeof allTasks)[number]; reminder: Reminder }[] = []
    for (const task of allTasks ?? []) {
      for (const reminder of (task.task_reminders ?? []) as Reminder[]) {
        const fireDate = addDays(task.due_date, -reminder.days_before)
        if (fireDate === today && hourOfTime(reminder.time_of_day) === currentHour) {
          dueTasks.push({ task, reminder })
        }
      }
    }

    const dueBills: { bill: (typeof allBills)[number]; reminder: Reminder; occurrenceDate: string }[] = []
    for (const bill of allBills ?? []) {
      const excludedDates = (bill.bill_occurrence_exceptions ?? []).map(
        (e: { occurrence_date: string }) => e.occurrence_date
      )
      for (const reminder of (bill.bill_reminders ?? []) as Reminder[]) {
        const occurrenceDate = addDays(today, reminder.days_before)
        const isDue = billIsDueOn(bill.due_date, bill.recurrence, bill.recurrence_until, excludedDates, occurrenceDate)
        if (isDue && hourOfTime(reminder.time_of_day) === currentHour) {
          dueBills.push({ bill, reminder, occurrenceDate })
        }
      }
    }

    if (dueTasks.length === 0 && dueBills.length === 0) {
      return new Response(JSON.stringify({ ok: true, sent: 0 }), { headers: { 'Content-Type': 'application/json' } })
    }

    const houseIds = new Set<string>()
    const userIds = new Set<string>()
    for (const { task } of dueTasks) {
      houseIds.add(task.house_id)
      for (const a of task.task_assignees ?? []) userIds.add(a.user_id)
    }
    for (const { bill } of dueBills) {
      houseIds.add(bill.house_id)
      for (const s of bill.bill_shares ?? []) if (!s.paid) userIds.add(s.user_id)
    }

    const { data: houses } = await supabase.from('houses').select('id, name, currency').in('id', [...houseIds])
    const houseById = new Map((houses ?? []).map((h) => [h.id, h]))

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, email, language')
      .in('id', [...userIds])
    const profileById = new Map((profiles ?? []).map((p) => [p.id, p]))

    for (const { task, reminder } of dueTasks) {
      const house = houseById.get(task.house_id)
      for (const a of task.task_assignees ?? []) {
        const profile = profileById.get(a.user_id)
        if (!profile) continue
        const claimed = await claim('task', task.id, task.due_date, a.user_id, reminder.id)
        if (!claimed) continue
        try {
          const { subject, html } = renderTemplate('task', profile.language ?? 'en', {
            name: profile.full_name ?? profile.email,
            title: task.title,
            houseName: house?.name ?? '',
          })
          if (reminder.channel === 'email' || reminder.channel === 'both') {
            if (profile.email) await sendEmail(profile.email, subject, html)
          }
          if (reminder.channel === 'push' || reminder.channel === 'both') {
            await sendPush(supabase, a.user_id, subject, `${task.title} — ${house?.name ?? ''}`)
          }
          sent++
        } catch (err) {
          errors.push(`task ${task.id} -> ${a.user_id}: ${err}`)
          await release('task', task.id, task.due_date, a.user_id, reminder.id)
        }
      }
    }

    for (const { bill, reminder, occurrenceDate } of dueBills) {
      const house = houseById.get(bill.house_id)
      for (const share of bill.bill_shares ?? []) {
        if (share.paid) continue
        const profile = profileById.get(share.user_id)
        if (!profile) continue
        const claimed = await claim('bill', bill.id, occurrenceDate, share.user_id, reminder.id)
        if (!claimed) continue
        try {
          const { subject, html } = renderTemplate('bill', profile.language ?? 'en', {
            name: profile.full_name ?? profile.email,
            title: bill.title,
            houseName: house?.name ?? '',
            amount: formatAmount(share.amount, house?.currency ?? 'AUD', profile.language ?? 'en'),
          })
          if (reminder.channel === 'email' || reminder.channel === 'both') {
            if (profile.email) await sendEmail(profile.email, subject, html)
          }
          if (reminder.channel === 'push' || reminder.channel === 'both') {
            await sendPush(supabase, share.user_id, subject, `${bill.title} — ${house?.name ?? ''}`)
          }
          sent++
        } catch (err) {
          errors.push(`bill ${bill.id} -> ${share.user_id}: ${err}`)
          await release('bill', bill.id, occurrenceDate, share.user_id, reminder.id)
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
