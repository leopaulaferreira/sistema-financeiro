import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import type { CategoryExpense } from '@/types/finance'
import { formatCurrency, formatPercentage } from '@/lib/format'
import { EmptyState } from '@/components/common/empty-state'
import { PieChart as PieChartIcon } from 'lucide-react'

/** CategoryExpenseResponse não traz cor — cai aqui quando a categoria não está mais na lista atual. */
const FALLBACK_COLOR = 'var(--muted-foreground)'

interface CategoryChartProps {
  data: CategoryExpense[]
  colorByCategoryId: Map<number, string>
}

interface ChartDatum extends CategoryExpense {
  color: string
}

function ChartTooltip({ active, payload }: { active?: boolean; payload?: { payload: ChartDatum }[] }) {
  if (!active || !payload?.length) return null
  const item = payload[0].payload

  return (
    <div className="rounded-xl border border-border-strong bg-popover px-3.5 py-3 text-xs shadow-[var(--shadow-elevated)]">
      <p className="flex items-center gap-1.5 font-medium text-foreground">
        <span className="size-1.5 rounded-full" style={{ backgroundColor: item.color }} />
        {item.categoryName}
      </p>
      <p className="mt-1 text-text-secondary">
        {formatCurrency(item.amount)} · {formatPercentage(item.percentage)}
      </p>
    </div>
  )
}

export function CategoryChart({ data, colorByCategoryId }: CategoryChartProps) {
  if (data.length === 0) {
    return (
      <EmptyState
        icon={PieChartIcon}
        title="Sem despesas no período"
        description="Assim que houver despesas categorizadas, elas aparecem aqui."
      />
    )
  }

  const chartData: ChartDatum[] = data.map((entry) => ({
    ...entry,
    color: colorByCategoryId.get(entry.categoryId) ?? FALLBACK_COLOR,
  }))
  const total = chartData.reduce((sum, entry) => sum + entry.amount, 0)

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
      <div className="relative w-full sm:max-w-[220px]">
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie
              data={chartData}
              dataKey="amount"
              nameKey="categoryName"
              innerRadius="64%"
              outerRadius="90%"
              paddingAngle={3}
              cornerRadius={3}
              strokeWidth={0}
            >
              {chartData.map((entry) => (
                <Cell key={entry.categoryId} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<ChartTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[0.625rem] font-semibold tracking-[0.08em] text-text-tertiary uppercase">Total</span>
          <span className="financial-value mt-1 max-w-28 truncate text-sm font-semibold text-foreground">{formatCurrency(total)}</span>
        </div>
      </div>

      <ul className="flex min-w-0 flex-1 flex-col gap-2.5">
        {chartData.map((entry) => (
          <li key={entry.categoryId} className="flex items-center gap-2.5 text-sm">
            <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: entry.color }} aria-hidden />
            <span className="min-w-0 flex-1 truncate text-text-primary">{entry.categoryName}</span>
            <span className="shrink-0 text-text-secondary">{formatPercentage(entry.percentage)}</span>
            <span className="financial-value w-24 shrink-0 text-right font-semibold text-foreground">
              {formatCurrency(entry.amount)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
