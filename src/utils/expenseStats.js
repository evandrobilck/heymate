import { toDayKey } from './calendar'

export function getMonthKeysWithBills(bills) {
  const keys = new Set(bills.map((bill) => bill.dueDate.slice(0, 7)))
  return Array.from(keys).sort().reverse()
}

export function computeMonthlyTotals(bills, monthKeys) {
  return monthKeys.map((monthKey) => ({
    monthKey,
    total: bills
      .filter((bill) => bill.dueDate.startsWith(monthKey))
      .reduce((sum, bill) => sum + bill.totalAmount, 0),
  }))
}

function billsInRange(bills, startKey, endKey) {
  return bills.filter((bill) => bill.dueDate >= startKey && bill.dueDate <= endKey)
}

export function computeCategoryTotalsInRange(bills, startKey, endKey) {
  const totals = {}
  billsInRange(bills, startKey, endKey).forEach((bill) => {
    totals[bill.category] = (totals[bill.category] || 0) + bill.totalAmount
  })
  return totals
}

export function computeTotalInRange(bills, startKey, endKey) {
  return billsInRange(bills, startKey, endKey).reduce((sum, bill) => sum + bill.totalAmount, 0)
}

export function countBillsInRange(bills, startKey, endKey) {
  return billsInRange(bills, startKey, endKey).length
}

// The immediately preceding period of the same length, e.g. Jan 20 - Feb 9
// -> Dec 31 - Jan 19.
export function getPreviousRange(startKey, endKey) {
  const [sy, sm, sd] = startKey.split('-').map(Number)
  const [ey, em, ed] = endKey.split('-').map(Number)
  const start = new Date(sy, sm - 1, sd)
  const end = new Date(ey, em - 1, ed)
  const rangeDays = Math.round((end - start) / 86400000) + 1

  const prevEnd = new Date(start)
  prevEnd.setDate(prevEnd.getDate() - 1)
  const prevStart = new Date(prevEnd)
  prevStart.setDate(prevStart.getDate() - (rangeDays - 1))

  return { start: toDayKey(prevStart), end: toDayKey(prevEnd) }
}
