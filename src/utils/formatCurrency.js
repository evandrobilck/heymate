export function formatCurrency(amount, locale = 'en') {
  return new Intl.NumberFormat(locale, { style: 'currency', currency: 'AUD' }).format(amount)
}
