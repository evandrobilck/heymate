export function getMonthKeysWithBills(bills) {
  const keys = new Set(bills.map((bill) => bill.dueDate.slice(0, 7)))
  return Array.from(keys).sort().reverse()
}

export function computeCategoryTotals(bills, monthKey) {
  const totals = {}
  bills
    .filter((bill) => bill.dueDate.startsWith(monthKey))
    .forEach((bill) => {
      totals[bill.category] = (totals[bill.category] || 0) + bill.totalAmount
    })
  return totals
}

export function computeMonthlyTotals(bills, monthKeys) {
  return monthKeys.map((monthKey) => ({
    monthKey,
    total: bills
      .filter((bill) => bill.dueDate.startsWith(monthKey))
      .reduce((sum, bill) => sum + bill.totalAmount, 0),
  }))
}
