import { Input } from '@/components/ui/input'

interface ReportPeriodPickerProps {
  from: string
  toInclusive: string
  onChange: (range: { from: string; toInclusive: string }) => void
}

/**
 * `to` aqui é inclusivo (o que o usuário espera ao escolher "até uma
 * data") — a página converte para o contrato half-open `[from, to)` da API
 * via `toReportRange` antes de chamar os hooks.
 */
export function ReportPeriodPicker({ from, toInclusive, onChange }: ReportPeriodPickerProps) {
  return (
    <div className="flex items-center gap-2">
      <Input
        type="date"
        value={from}
        max={toInclusive}
        onChange={(e) => onChange({ from: e.target.value, toInclusive })}
        aria-label="Data inicial"
        className="w-40 border-border bg-surface"
      />
      <span className="text-sm text-text-secondary">até</span>
      <Input
        type="date"
        value={toInclusive}
        min={from}
        onChange={(e) => onChange({ from, toInclusive: e.target.value })}
        aria-label="Data final"
        className="w-40 border-border bg-surface"
      />
    </div>
  )
}
