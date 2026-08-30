import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { BalancePoint } from '@/types/finance'
import { formatCurrency, formatShortDate } from '@/lib/format'

interface BalanceEvolutionChartProps {
  data: BalancePoint[]
}

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length || !label) return null

  return (
    <div className="rounded-xl border border-border-strong bg-popover px-3.5 py-3 text-xs shadow-[var(--shadow-elevated)]">
      <p className="mb-1.5 font-semibold text-foreground">{formatShortDate(label)}</p>
      <p className="financial-value font-medium text-accent-primary">{formatCurrency(payload[0].value)}</p>
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
        <CartesianGrid stroke="var(--border)" strokeDasharray="4 4" vertical={false} />
        <XAxis
          dataKey="date"
          tickFormatter={formatShortDate}
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
        <Area type="monotone" dataKey="balance" name="Saldo" stroke="var(--accent-primary)" strokeWidth={2.25} fill="url(#balanceGradient)" activeDot={{ r: 4, strokeWidth: 2, fill: 'var(--surface)' }} />
      </AreaChart>
    </ResponsiveContainer>
  )
}
