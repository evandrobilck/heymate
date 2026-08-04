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
// oldest not-yet-fully-paid occurrence, which only counts as "the" live
// Pendente card once it falls within `pendingWindowDays` of its due date —
// so a September rent bill doesn't show as due in August just because
// August's was paid.
export function getBillOccurrenceState(bill, todayKey, pendingWindowDays = 6) {
  if (bill.recurrence === 'none') return { completed: [], pending: null }

  const horizonKey = addDays(todayKey, pendingWindowDays)
  const occurrenceDates = getRecurrenceOccurrencesInRange(
    bill.dueDate,
    bill.recurrence,
    bill.dueDate,
    horizonKey,
    bill.recurrenceUntil,
    bill.excludedDates
  ).sort()

  const completed = []
  let pending = null

  for (const occurrenceDate of occurrenceDates) {
    const shares = mergeOccurrenceShares(bill, occurrenceDate)
    if (isOccurrenceComplete(shares, bill.participantIds)) {
      completed.push({ occurrenceDate, shares })
    } else if (pending === null) {
      pending = { occurrenceDate, shares }
    }
  }

  return { completed, pending }
}
