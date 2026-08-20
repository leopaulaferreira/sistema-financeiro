import { Pencil, Trash2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Amount } from '@/components/common/amount'
import { formatDate } from '@/lib/format'
import { frequencyLabels } from '../frequency-style'
import type { RecurringTransaction } from '@/types/finance'

interface RecurringTransactionCardProps {
  recurring: RecurringTransaction
  onEdit: () => void
  onToggleActive: () => void
  onDelete: () => void
}

export function RecurringTransactionCard({ recurring, onEdit, onToggleActive, onDelete }: RecurringTransactionCardProps) {
  return (
    <Card className="border-border bg-surface py-0 shadow-none transition-colors hover:bg-surface-hover">
      <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate text-sm font-medium text-foreground">{recurring.description}</span>
            {!recurring.active && (
              <Badge variant="outline" className="border-border text-text-secondary">
                Pausada
              </Badge>
            )}
          </div>
          <p className="text-xs text-text-secondary">
            {frequencyLabels[recurring.frequency]} · próxima em {formatDate(recurring.nextExecutionDate)}
          </p>
          <div className="flex flex-wrap gap-1.5">
            <Badge variant="outline" className="border-border font-normal text-text-secondary">
              {recurring.account.name}
            </Badge>
            <Badge variant="outline" className="border-border font-normal text-text-secondary">
              {recurring.category.name}
            </Badge>
          </div>
        </div>

        <div className="flex shrink-0 items-center justify-between gap-4 sm:flex-col sm:items-end sm:gap-2">
          <Amount value={recurring.amount} type={recurring.type} className="text-base" />
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              onClick={onEdit}
              aria-label={`Editar ${recurring.description}`}
            >
              <Pencil className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-xs text-text-secondary hover:text-foreground"
              onClick={onToggleActive}
            >
              {recurring.active ? 'Pausar' : 'Ativar'}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-8 text-text-secondary hover:text-danger"
              onClick={onDelete}
              aria-label={`Excluir ${recurring.description}`}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
