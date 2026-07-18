export function toDayKey(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function makeCell(year, month, day, inCurrentMonth) {
  const date = new Date(year, month, day)
  return { date, dayKey: toDayKey(date), day: date.getDate(), inCurrentMonth }
}

export function getMonthGrid(year, month) {
  const firstOfMonth = new Date(year, month, 1)
  const startWeekday = firstOfMonth.getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const daysInPrevMonth = new Date(year, month, 0).getDate()

  const cells = []

  for (let i = startWeekday - 1; i >= 0; i--) {
    cells.push(makeCell(year, month - 1, daysInPrevMonth - i, false))
  }

  for (let day = 1; day <= daysInMonth; day++) {
    cells.push(makeCell(year, month, day, true))
  }

  let trailingDay = 1
  while (cells.length % 7 !== 0) {
    cells.push(makeCell(year, month + 1, trailingDay, false))
    trailingDay += 1
  }

  return cells
}
