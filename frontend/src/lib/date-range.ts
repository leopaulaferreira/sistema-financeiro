export function toIsoDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

/** Espera uma data no formato ISO `yyyy-MM-dd` (sem hora, sem fuso) e devolve `isoDate + days` também em ISO. */
export function addDays(isoDate: string, days: number): string {
  const [year, month, day] = isoDate.split('-').map(Number)
  const date = new Date(year, month - 1, day + days)
  return toIsoDate(date)
}

/**
 * `/api/reports` usa período half-open `[from, to)` (`to` exclusivo) —
 * diferente de `monthRange`/`previousMonthRange` acima (`to` inclusivo,
 * usado por `/api/transactions`). O usuário escolhe visualmente um `to`
 * inclusivo (ex.: "até 31/08/2026"); esta função converte para o contrato
 * da API somando um dia.
 */
export function toReportRange(fromInclusive: string, toInclusive: string): { from: string; to: string } {
  return { from: fromInclusive, to: addDays(toInclusive, 1) }
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

/** Deve espelhar MAX_PERIOD_YEARS em ReportService (backend) — período máximo aceito pelos relatórios. */
const MAX_REPORT_PERIOD_YEARS = 5

/**
 * Maior intervalo que `/api/reports` aceita (ver `ReportService.validatePeriod`),
 * usado pelo atalho "Todo o período" — o backend não tem endpoint pra "desde a
 * primeira transação", então isto é o "todo o período" que o sistema permite.
 * `from` fica 1 dia dentro do limite pra sobreviver ao `toReportRange` (+1 dia).
 */
export function maxReportPeriodRange(): { from: string; to: string } {
  const now = new Date()
  const to = toIsoDate(now)
  const from = new Date(now)
  from.setFullYear(from.getFullYear() - MAX_REPORT_PERIOD_YEARS)
  from.setDate(from.getDate() + 1)
  return { from: toIsoDate(from), to }
}
