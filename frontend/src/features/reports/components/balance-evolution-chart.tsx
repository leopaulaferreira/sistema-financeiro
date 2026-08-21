import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { BalancePoint } from '@/types/finance'
import { formatCurrency, formatShortDate } from '@/lib/format'

interface BalanceEvolutionChartProps {
  data: BalancePoint[]
}

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length || !label) return null

  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-lg">
      <p className="mb-1 font-medium text-foreground">{formatShortDate(label)}</p>
      <p className="text-text-secondary">{formatCurrency(payload[0].value)}</p>
    </div>
  )
}

export function BalanceEvolutionChart({ data }: BalanceEvolutionChartProps) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="balanceGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent-primary)" stopOpacity={0.28} />
            <stop offset="100%" stopColor="var(--accent-primary)" stopOpacity={0} />
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
        <Area type="monotone" dataKey="balance" name="Saldo" stroke="var(--accent-primary)" strokeWidth={2} fill="url(#balanceGradient)" />
      </AreaChart>
    </ResponsiveContainer>
  )
}
