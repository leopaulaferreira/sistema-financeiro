import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { MonthlyComparison } from '@/types/finance'
import { formatCurrency } from '@/lib/format'
import { formatReportPeriod } from '../report-period-format'

interface MonthlyComparisonChartProps {
  data: MonthlyComparison[]
}

interface TooltipPayloadEntry {
  dataKey: string
  value: number
}

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: TooltipPayloadEntry[]; label?: string }) {
  if (!active || !payload?.length || !label) return null

  const income = payload.find((p) => p.dataKey === 'income')?.value ?? 0
  const expense = payload.find((p) => p.dataKey === 'expense')?.value ?? 0
  const netResult = payload.find((p) => p.dataKey === 'netResult')?.value ?? 0

  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-lg">
      <p className="mb-1.5 font-medium text-foreground">{formatReportPeriod(label)}</p>
      <p className="flex items-center gap-1.5 text-success">
        <span className="size-1.5 rounded-full bg-success" /> Receita: {formatCurrency(income)}
      </p>
      <p className="flex items-center gap-1.5 text-danger">
        <span className="size-1.5 rounded-full bg-danger" /> Despesa: {formatCurrency(expense)}
      </p>
      <p className="mt-1 border-t border-border pt-1 text-text-secondary">Resultado: {formatCurrency(netResult)}</p>
    </div>
  )
}

export function MonthlyComparisonChart({ data }: MonthlyComparisonChartProps) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid stroke="var(--border)" vertical={false} />
        <XAxis
          dataKey="month"
          tickFormatter={formatReportPeriod}
          tick={{ fill: 'var(--text-secondary)', fontSize: 12 }}
          axisLine={{ stroke: 'var(--border)' }}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: 'var(--text-secondary)', fontSize: 12 }}
          axisLine={false}
          tickLine={false}
          width={56}
          tickFormatter={(v: number) => (v === 0 ? '0' : `${Math.round(v / 100) / 10}k`)}
        />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--surface-hover)' }} />
        <Bar dataKey="income" name="Receita" fill="var(--success)" radius={[4, 4, 0, 0]} />
        <Bar dataKey="expense" name="Despesa" fill="var(--danger)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
