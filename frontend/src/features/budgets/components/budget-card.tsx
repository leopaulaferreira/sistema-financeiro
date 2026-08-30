import { Pencil, Trash2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ProgressBar } from '@/components/common/progress-bar'
import { formatCurrency, formatPercentage } from '@/lib/format'
import { budgetStatusBadgeClass, budgetStatusLabels, budgetStatusProgressVariant } from '../budget-status-style'
import type { Budget } from '@/types/finance'

interface BudgetCardProps {
  budget: Budget
  onEdit: () => void
  onDelete: () => void
}

export function BudgetCard({ budget, onEdit, onDelete }: BudgetCardProps) {
  return (
    <Card className="py-0 transition-[border-color,transform] duration-200 hover:-translate-y-0.5 hover:border-border-strong">
      <CardContent className="flex min-h-44 flex-col gap-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-1">
            <span className="truncate text-sm font-medium text-foreground">{budget.category.name}</span>
            <span className="financial-value text-sm font-medium text-text-secondary">
              {formatCurrency(budget.spent)} / {formatCurrency(budget.amount)}
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Button variant="ghost" size="icon" className="size-8" onClick={onEdit} aria-label={`Editar orçamento de ${budget.category.name}`}>
              <Pencil className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-8 text-text-secondary hover:text-danger"
              onClick={onDelete}
              aria-label={`Excluir orçamento de ${budget.category.name}`}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        </div>

        <ProgressBar percentage={budget.percentageUsed} variant={budgetStatusProgressVariant[budget.status]} />

        <div className="flex flex-wrap items-center justify-between gap-2">
          <Badge variant="outline" className={budgetStatusBadgeClass[budget.status]}>
            {budgetStatusLabels[budget.status]}
          </Badge>
          <span className="text-xs tabular-nums text-text-secondary">
            {formatPercentage(budget.percentageUsed)} ·{' '}
            {budget.remaining >= 0
              ? `${formatCurrency(budget.remaining)} restantes`
              : `${formatCurrency(Math.abs(budget.remaining))} acima do limite`}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
