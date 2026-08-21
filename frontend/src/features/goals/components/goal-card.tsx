import { CircleDollarSign, Pencil, Trash2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ProgressBar } from '@/components/common/progress-bar'
import { formatCurrency, formatDate, formatPercentage } from '@/lib/format'
import { goalStatusBadgeClass, goalStatusLabels } from '../goal-status-style'
import type { FinancialGoal } from '@/types/finance'

interface GoalCardProps {
  goal: FinancialGoal
  onEdit: () => void
  onDelete: () => void
  onManageContributions: () => void
}

export function GoalCard({ goal, onEdit, onDelete, onManageContributions }: GoalCardProps) {
  const progressVariant = goal.status === 'CANCELLED' ? 'warning' : 'success'

  return (
    <Card className="border-border bg-surface py-0 shadow-none transition-colors hover:bg-surface-hover">
      <CardContent className="flex flex-col gap-3 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-1">
            <span className="truncate text-sm font-medium text-foreground">{goal.name}</span>
            {goal.description && <span className="truncate text-xs text-text-secondary">{goal.description}</span>}
            <span className="text-xs tabular-nums text-text-secondary">
              {formatCurrency(goal.currentAmount)} / {formatCurrency(goal.targetAmount)}
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Button variant="ghost" size="icon" className="size-8" onClick={onEdit} aria-label={`Editar ${goal.name}`}>
              <Pencil className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-8 text-text-secondary hover:text-danger"
              onClick={onDelete}
              aria-label={`Excluir ${goal.name}`}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        </div>

        <ProgressBar percentage={goal.progressPercentage} variant={progressVariant} />

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className={goalStatusBadgeClass[goal.status]}>
              {goalStatusLabels[goal.status]}
            </Badge>
            {goal.targetDate && (
              <span className="text-xs text-text-secondary">
                Meta: {formatDate(goal.targetDate)}
                {goal.daysRemaining !== null && goal.status === 'ACTIVE' && (
                  <> · {goal.daysRemaining >= 0 ? `${goal.daysRemaining} dias restantes` : 'atrasada'}</>
                )}
              </span>
            )}
          </div>
          <span className="text-xs font-medium tabular-nums text-text-secondary">{formatPercentage(goal.progressPercentage)}</span>
        </div>

        {goal.status !== 'CANCELLED' && (
          <Button variant="outline" size="sm" className="w-fit" onClick={onManageContributions}>
            <CircleDollarSign className="size-3.5" />
            Contribuições
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
