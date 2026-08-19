import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { DailyIncomeExpense } from '@/types/finance'
import { formatCurrency, formatShortDate } from '@/lib/format'

interface FinancialChartProps {
  data: DailyIncomeExpense[]
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
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-lg">
      <p className="mb-1.5 font-medium text-foreground">{formatShortDate(label)}</p>
      <p className="flex items-center gap-1.5 text-success">
        <span className="size-1.5 rounded-full bg-success" /> Receita: {formatCurrency(income)}
      </p>
      <p className="flex items-center gap-1.5 text-danger">
        <span className="size-1.5 rounded-full bg-danger" /> Despesa: {formatCurrency(expense)}
      </p>
    </div>
  )
}

export function FinancialChart({ data }: FinancialChartProps) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--success)" stopOpacity={0.28} />
            <stop offset="100%" stopColor="var(--success)" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--danger)" stopOpacity={0.24} />
            <stop offset="100%" stopColor="var(--danger)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="var(--border)" vertical={false} />
        <XAxis
          dataKey="date"
          tickFormatter={formatShortDate}
          tick={{ fill: 'var(--text-secondary)', fontSize: 12 }}
          axisLine={{ stroke: 'var(--border)' }}
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
        <Area type="monotone" dataKey="income" name="Receita" stroke="var(--success)" strokeWidth={2} fill="url(#incomeGradient)" />
        <Area type="monotone" dataKey="expense" name="Despesa" stroke="var(--danger)" strokeWidth={2} fill="url(#expenseGradient)" />
      </AreaChart>
    </ResponsiveContainer>
  )
}
