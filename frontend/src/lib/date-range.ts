export function toIsoDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

/** `to` é inclusivo — TransactionSpecifications usa `date <= :to` (diferente do half-open do dashboard). */
export function monthRange(year: number, month: number): { from: string; to: string } {
  const from = new Date(year, month - 1, 1)
  const to = new Date(year, month, 0)
  return { from: toIsoDate(from), to: toIsoDate(to) }
}

export function currentMonthRange(): { from: string; to: string } {
  const now = new Date()
  return monthRange(now.getFullYear(), now.getMonth() + 1)
}

export function previousMonthRange(): { from: string; to: string } {
  const now = new Date()
  const month = now.getMonth() === 0 ? 12 : now.getMonth()
  const year = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear()
  return monthRange(year, month)
}
