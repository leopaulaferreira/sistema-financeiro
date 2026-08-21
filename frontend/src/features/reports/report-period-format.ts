/**
 * `period`/`month` dos relatórios vêm como `"yyyy-MM-dd"` (granularidade
 * DAY) ou `"yyyy-MM"` (MONTH/comparativo mensal) — ver ARCHITECTURE.md,
 * Fase 8. Esta função detecta o formato pelo tamanho da string e formata
 * em pt-BR sem depender de `Date` (evita parsing ambíguo de "yyyy-MM").
 */
const MONTH_NAMES_SHORT = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

export function formatReportPeriod(period: string): string {
  const [year, month, day] = period.split('-').map(Number)
  if (day) {
    return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}`
  }
  return `${MONTH_NAMES_SHORT[month - 1]}/${String(year).slice(2)}`
}
