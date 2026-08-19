const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

export function formatCurrency(value: number): string {
  return currencyFormatter.format(value)
}

const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})

/** Espera uma data no formato ISO `yyyy-MM-dd` (sem hora, sem fuso). */
export function formatDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number)
  return dateFormatter.format(new Date(year, month - 1, day))
}

const shortDateFormatter = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: 'short',
})

export function formatShortDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number)
  return shortDateFormatter.format(new Date(year, month - 1, day))
}

export function formatPercentage(value: number): string {
  return `${value.toFixed(1)}%`
}
