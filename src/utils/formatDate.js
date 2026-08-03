export function formatDate(dateString, locale = 'en') {
  if (!dateString) return ''
  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(`${dateString}T00:00:00`))
}

export function formatMonthLabel(year, month, locale = 'en') {
  const label = new Intl.DateTimeFormat(locale, { month: 'long' }).format(new Date(`${year}-${month}-01T00:00:00`))
  return `${label.charAt(0).toUpperCase()}${label.slice(1)}`
}
