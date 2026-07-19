export function getCurrentMonthKey(date = new Date()) {
  return date.toISOString().slice(0, 7)
}

export function computeTaskCountsByMember(tasks, monthKey) {
  const counts = {}
  tasks.forEach((task) => {
    if (!task.completed || !task.completedAt) return
    if (!task.completedAt.startsWith(monthKey)) return
    task.completedByIds.forEach((memberId) => {
      counts[memberId] = (counts[memberId] || 0) + 1
    })
  })
  return counts
}

export function formatMonth(monthKey, locale = 'en') {
  return new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'long' }).format(
    new Date(`${monthKey}-01T00:00:00`)
  )
}
