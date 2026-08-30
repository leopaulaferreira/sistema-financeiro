import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { IncomeExpenseSeriesPoint } from '@/types/finance'
import { formatCurrency } from '@/lib/format'
import { formatReportPeriod } from '../report-period-format'

interface IncomeExpenseSeriesChartProps {
  data: IncomeExpenseSeriesPoint[]
}

interface TooltipPayloadEntry {
  dataKey: string
  value: number
}

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: TooltipPayloadEntry[]; label?: string }) {
  if (!active || !payload?.length || !label) return null

  const income = payload.find((p) => p.dataKey === 'income')?.value ?? 0
  const expense = payload.find((p) => p.dataKey === 'expense')?.value ?? 0

  return (
    <div className="rounded-xl border border-border-strong bg-popover px-3.5 py-3 text-xs shadow-[var(--shadow-elevated)]">
      <p className="mb-2 font-semibold text-foreground">{formatReportPeriod(label)}</p>
      <p className="flex items-center gap-1.5 text-success">
        <span className="size-1.5 rounded-full bg-success" /> Receita: {formatCurrency(income)}
      </p>
      <p className="flex items-center gap-1.5 text-danger">
        <span className="size-1.5 rounded-full bg-danger" /> Despesa: {formatCurrency(expense)}
      </p>
    </div>
  )
}

/** Mesmo desenho visual de `FinancialChart` (dashboard) — aqui generalizado para `period` (dia ou mês) em vez de `date`. */
export function IncomeExpenseSeriesChart({ data }: IncomeExpenseSeriesChartProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-5 text-xs font-medium text-text-secondary" aria-hidden>
        <span className="flex items-center gap-2"><span className="h-0.5 w-5 rounded-full bg-success" />Receitas</span>
        <span className="flex items-center gap-2"><span className="w-5 border-t-2 border-dashed border-danger" />Despesas</span>
      </div>
      <ResponsiveContainer width="100%" height={252}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="reportIncomeGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--success)" stopOpacity={0.28} />
            <stop offset="100%" stopColor="var(--success)" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="reportExpenseGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--danger)" stopOpacity={0.24} />
            <stop offset="100%" stopColor="var(--danger)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="var(--border)" strokeDasharray="4 4" vertical={false} />
        <XAxis
          dataKey="period"
          tickFormatter={formatReportPeriod}
          tick={{ fill: 'var(--text-secondary)', fontSize: 12 }}
          axisLine={false}
          tickLine={false}
          interval="preserveStartEnd"
          minTickGap={24}
        />
        <YAxis
          tick={{ fill: 'var(--text-secondary)', fontSize: 12 }}
          axisLine={false}
          tickLine={false}
          width={56}
          tickFormatter={(v: number) => (v === 0 ? '0' : `${Math.round(v / 100) / 10}k`)}
        />
        <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'var(--border)', strokeWidth: 1 }} />
        <Area type="monotone" dataKey="income" name="Receita" stroke="var(--success)" strokeWidth={2.25} fill="url(#reportIncomeGradient)" activeDot={{ r: 4, strokeWidth: 2, fill: 'var(--surface)' }} />
        <Area type="monotone" dataKey="expense" name="Despesa" stroke="var(--danger)" strokeWidth={2.25} strokeDasharray="5 4" fill="url(#reportExpenseGradient)" activeDot={{ r: 4, strokeWidth: 2, fill: 'var(--surface)' }} />
      </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
