// Groups items into year -> month buckets (each keyed "YYYY" / "MM"),
// sorted most recent first, for sections that collapse a long paid/history
// list down to "click a year to see its months".
export function groupByYearMonth(items, getDateKey) {
  const byYear = new Map()
  for (const item of items) {
    const [year, month] = getDateKey(item).split('-')
    if (!byYear.has(year)) byYear.set(year, new Map())
    const byMonth = byYear.get(year)
    if (!byMonth.has(month)) byMonth.set(month, [])
    byMonth.get(month).push(item)
  }
  return [...byYear.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([year, byMonth]) => ({
      year,
      months: [...byMonth.entries()]
        .sort(([a], [b]) => b.localeCompare(a))
        .map(([month, monthItems]) => ({ month, items: monthItems })),
    }))
}
