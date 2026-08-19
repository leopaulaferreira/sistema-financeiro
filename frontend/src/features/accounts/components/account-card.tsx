import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/format'
import { accountTypeLabels, accountTypeStyle } from '../account-type-style'
import type { AccountType } from '@/types/finance'
import { cn } from '@/lib/utils'

interface AccountCardProps {
  name: string
  type: AccountType
  balance: number
  active?: boolean
  onEdit?: () => void
  onToggleActive?: () => void
  onDelete?: () => void
}

export function AccountCard({ name, type, balance, active = true, onEdit, onToggleActive, onDelete }: AccountCardProps) {
  const { icon: Icon, colorVar } = accountTypeStyle[type]
  const isNegative = balance < 0

  return (
    <Card className="border-border bg-surface py-0 shadow-none transition-colors hover:bg-surface-hover">
      <CardContent className="flex items-start justify-between gap-3 p-5">
        <div className="flex min-w-0 items-start gap-3">
          <div
            className="flex size-10 shrink-0 items-center justify-center rounded-lg"
            style={{ backgroundColor: `color-mix(in oklch, ${colorVar} 16%, transparent)`, color: colorVar }}
          >
            <Icon className="size-[18px]" aria-hidden />
          </div>
          <div className="flex min-w-0 flex-col gap-1">
            <span className="truncate text-sm font-medium text-foreground">{name}</span>
            <span className="text-xs text-text-secondary">{accountTypeLabels[type]}</span>
            <span className={cn('text-lg font-semibold tabular-nums', isNegative ? 'text-danger' : 'text-foreground')}>
              {formatCurrency(balance)}
            </span>
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          {!active && (
            <Badge variant="outline" className="border-border text-text-secondary">
              Inativa
            </Badge>
          )}
          <div className="flex items-center gap-3">
            {onEdit && (
              <button
                type="button"
                onClick={onEdit}
                className="rounded text-xs font-medium text-accent-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Editar
              </button>
            )}
            {onToggleActive && (
              <button
                type="button"
                onClick={onToggleActive}
                className="rounded text-xs font-medium text-text-secondary hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {active ? 'Desativar' : 'Ativar'}
              </button>
            )}
            {onDelete && (
              <button
                type="button"
                onClick={onDelete}
                className="rounded text-xs font-medium text-text-secondary hover:text-danger hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Excluir
              </button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
