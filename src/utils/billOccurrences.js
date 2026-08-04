import { toDayKey } from './calendar'
import { getRecurrenceOccurrencesInRange } from './recurrence'

function addDays(dayKey, days) {
  const [year, month, day] = dayKey.split('-').map(Number)
  return toDayKey(new Date(year, month - 1, day + days))
}

export function mergeOccurrenceShares(bill, occurrenceDate) {
  const payments = bill.occurrencePayments?.[occurrenceDate] ?? {}
  const shares = {}

  bill.participantIds.forEach((id) => {
    const template = bill.shares[id]
    const payment = payments[id]
    shares[id] = payment
      ? {
          amount: payment.amount,
          percentage: payment.percentage,
          paid: payment.paid,
          paidAt: payment.paidAt,
          paidAmount: payment.paidAmount,
          settledVia: payment.settledVia,
        }
      : {
          amount: template.amount,
          percentage: template.percentage,
          paid: false,
          paidAt: null,
          paidAmount: 0,
          settledVia: null,
        }
  })

  return shares
}

function isOccurrenceComplete(shares, participantIds) {
  return participantIds.every((id) => shares[id]?.paid)
}

// Recurring bills have one fixed anchor due_date (recurrence.js never
// advances it) and per-cycle payment state lives in bill_occurrence_payments.
// This derives, as of `todayKey`: every occurrence that's fully paid by
// every participant (-> permanent Pagas history entries) and the single
// oldest not-yet-fully-paid occurrence (-> the live Pendente card).
//
// The `pendingWindowDays` gate only holds back a freshly-spawned NEXT cycle
// right after the previous one was completed (so a September rent bill
// doesn't show as due in August just because August's was paid) — it does
// NOT apply to a bill's first-ever unresolved cycle, which must show
// regardless of how far off its due date is, same as a non-recurring bill
// would, or a plain bill that's simply due later this month would silently
// vanish from Pendentes until 6 days out.
export function getBillOccurrenceState(bill, todayKey, pendingWindowDays = 6) {
  if (bill.recurrence === 'none') return { completed: [], pending: null }

  const horizonKey = addDays(todayKey, pendingWindowDays)
  // Search far enough ahead that a bill with no completed cycles yet is
  // always found, even if its due date is weeks or months out.
  const searchEndKey = addDays(todayKey, 366)
  const occurrenceDates = getRecurrenceOccurrencesInRange(
    bill.dueDate,
    bill.recurrence,
    bill.dueDate,
    searchEndKey,
    bill.recurrenceUntil,
    bill.excludedDates
  ).sort()

  const completed = []
  let candidate = null

  for (const occurrenceDate of occurrenceDates) {
    const shares = mergeOccurrenceShares(bill, occurrenceDate)
    if (isOccurrenceComplete(shares, bill.participantIds)) {
      completed.push({ occurrenceDate, shares })
    } else if (candidate === null) {
      candidate = { occurrenceDate, shares }
    }
  }

  let pending = null
  if (candidate) {
    const isDueSoonOrOverdue = candidate.occurrenceDate <= horizonKey
    const isFirstEverCycle = completed.length === 0
    if (isDueSoonOrOverdue || isFirstEverCycle) {
      pending = candidate
    }
  }

  return { completed, pending }
}
