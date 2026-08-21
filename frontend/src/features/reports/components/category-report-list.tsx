import { PieChart } from 'lucide-react'
import type { CategoryReport } from '@/types/finance'
import { formatCurrency, formatPercentage } from '@/lib/format'
import { ProgressBar } from '@/components/common/progress-bar'
import { EmptyState } from '@/components/common/empty-state'

interface CategoryReportListProps {
  data: CategoryReport[]
  colorByCategoryId: Map<number, string>
  variant: 'success' | 'danger'
  emptyMessage: string
}

const FALLBACK_COLOR = 'var(--muted-foreground)'

export function CategoryReportList({ data, colorByCategoryId, variant, emptyMessage }: CategoryReportListProps) {
  if (data.length === 0) {
    return <EmptyState icon={PieChart} title={emptyMessage} />
  }

  return (
    <ul className="flex flex-col gap-3">
      {data.map((entry) => (
        <li key={entry.categoryId} className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2 text-sm">
            <span
              className="size-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: colorByCategoryId.get(entry.categoryId) ?? FALLBACK_COLOR }}
              aria-hidden
            />
            <span className="min-w-0 flex-1 truncate text-text-primary">{entry.categoryName}</span>
            <span className="shrink-0 text-text-secondary">{formatPercentage(entry.percentage)}</span>
            <span className="w-24 shrink-0 text-right font-medium tabular-nums text-foreground">
              {formatCurrency(entry.amount)}
            </span>
          </div>
          <ProgressBar percentage={entry.percentage} variant={variant} />
        </li>
      ))}
    </ul>
  )
}
