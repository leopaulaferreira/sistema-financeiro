import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { DashboardPeriod } from '@/services/dashboard-service'

const MONTH_LABELS = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
]

const TOTAL_VALUE = 'total'

interface DashboardPeriodSelectorProps {
  value: DashboardPeriod
  onChange: (period: DashboardPeriod) => void
}

/**
 * Igual ao PeriodSelector (usado em Orçamentos), mas com uma opção extra
 * "Todo o período" que agrega desde a primeira transação do usuário. Não é
 * compartilhado com Orçamentos porque orçamento é um conceito
 * inerentemente mensal — "total" não se aplica lá.
 */
export function DashboardPeriodSelector({ value, onChange }: DashboardPeriodSelectorProps) {
  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i)
  const isTotal = 'total' in value

  return (
    <div className="flex gap-2">
      <Select
        value={isTotal ? TOTAL_VALUE : String(value.month)}
        onValueChange={(v) => {
          if (v === TOTAL_VALUE) {
            onChange({ total: true })
          } else {
            onChange({ year: isTotal ? currentYear : value.year, month: Number(v) })
          }
        }}
      >
        <SelectTrigger className="w-40 border-border bg-surface" aria-label="Mês">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={TOTAL_VALUE}>Todo o período</SelectItem>
          {MONTH_LABELS.map((label, i) => (
            <SelectItem key={label} value={String(i + 1)}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {!isTotal && (
        <Select value={String(value.year)} onValueChange={(v) => onChange({ year: Number(v), month: value.month })}>
          <SelectTrigger className="w-24 border-border bg-surface" aria-label="Ano">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {years.map((year) => (
              <SelectItem key={year} value={String(year)}>
                {year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  )
}
