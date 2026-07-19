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
