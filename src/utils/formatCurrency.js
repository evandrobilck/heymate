export function formatCurrency(amount, locale = 'en', currency = 'AUD') {
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount)
}
