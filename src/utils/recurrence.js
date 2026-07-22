import { toDayKey } from './calendar'

// Clamp-aware month addition: Jan 31 + 1 month -> Feb 28/29, not Mar 3.
function addMonths(date, months) {
  const day = date.getDate()
  const result = new Date(date.getFullYear(), date.getMonth() + months, 1)
  const daysInResultMonth = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate()
  result.setDate(Math.min(day, daysInResultMonth))
  return result
}

function stepAnchor(anchor, recurrence, steps) {
  if (recurrence === 'daily') {
    const d = new Date(anchor)
    d.setDate(d.getDate() + steps)
    return d
  }
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

// All occurrences of a recurring due date that fall within [rangeStartKey, rangeEndKey]
// (both "YYYY-MM-DD"), projected forward and backward from the anchor date.
// `recurrenceUntil` (inclusive cutoff) and `excludedDates` let individual
// occurrences be hidden without touching the underlying bill.
export function getRecurrenceOccurrencesInRange(
  dueDateKey,
  recurrence,
  rangeStartKey,
  rangeEndKey,
  recurrenceUntil = null,
  excludedDates = []
) {
  if (!dueDateKey) return []

  function isVisible(key) {
    if (recurrenceUntil && key > recurrenceUntil) return false
    if (excludedDates.includes(key)) return false
    return true
  }

  if (!recurrence || recurrence === 'none') {
    return dueDateKey >= rangeStartKey && dueDateKey <= rangeEndKey && isVisible(dueDateKey) ? [dueDateKey] : []
  }

  const [year, month, day] = dueDateKey.split('-').map(Number)
  const anchor = new Date(year, month - 1, day)
  const results = []
  const MAX_STEPS = 500

  for (let i = 0; i < MAX_STEPS; i++) {
    const key = toDayKey(stepAnchor(anchor, recurrence, i))
    if (key > rangeEndKey) break
    if (key >= rangeStartKey && isVisible(key)) results.push(key)
  }

  for (let i = -1; i > -MAX_STEPS; i--) {
    const key = toDayKey(stepAnchor(anchor, recurrence, i))
    if (key < rangeStartKey) break
    if (key <= rangeEndKey && isVisible(key)) results.push(key)
  }

  return results
}

// Pages that only ever show a bill's stored due_date (not a rolling
// per-occurrence view, e.g. ContasPage/BalanceSummary) need to know whether
// that one date has been individually excluded or cut off by the recurring
// series' end — either way means "nothing to show for this bill right now".
export function isBillOccurrenceVisible(bill) {
  if (bill.recurrence === 'none') return true
  if (bill.excludedDates.includes(bill.dueDate)) return false
  if (bill.recurrenceUntil && bill.dueDate > bill.recurrenceUntil) return false
  return true
}

// The next occurrence on or after `fromKey`, searching up to a year ahead.
export function getNextOccurrenceOnOrAfter(
  dueDateKey,
  recurrence,
  fromKey,
  recurrenceUntil = null,
  excludedDates = []
) {
  if (!dueDateKey) return null

  if (!recurrence || recurrence === 'none') {
    return dueDateKey >= fromKey ? dueDateKey : null
  }

  const [year, month, day] = fromKey.split('-').map(Number)
  const horizon = toDayKey(new Date(year, month - 1, day + 366))
  const occurrences = getRecurrenceOccurrencesInRange(
    dueDateKey,
    recurrence,
    fromKey,
    horizon,
    recurrenceUntil,
    excludedDates
  )
  if (occurrences.length === 0) return null
  return occurrences.slice().sort()[0]
}
