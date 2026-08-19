import { Wallet, Landmark, PiggyBank, CreditCard, TrendingUp } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/format'
import { accountTypeLabels } from '@/mocks/accounts'
import type { Account, AccountType } from '@/types/finance'
import { cn } from '@/lib/utils'

const typeIcons: Record<AccountType, typeof Wallet> = {
  CHECKING: Landmark,
  SAVINGS: PiggyBank,
  WALLET: Wallet,
  CREDIT_CARD: CreditCard,
  INVESTMENT: TrendingUp,
}

interface AccountCardProps {
  account: Account
  balance: number
  onEdit?: () => void
  onToggleActive?: () => void
}

export function AccountCard({ account, balance, onEdit, onToggleActive }: AccountCardProps) {
  const Icon = typeIcons[account.type]
  const isNegative = balance < 0

  return (
    <Card className="border-border bg-surface py-0 shadow-none transition-colors hover:bg-surface-hover">
      <CardContent className="flex items-start justify-between gap-3 p-5">
        <div className="flex min-w-0 items-start gap-3">
          <div
            className="flex size-10 shrink-0 items-center justify-center rounded-lg"
            style={{ backgroundColor: `color-mix(in oklch, ${account.color} 16%, transparent)`, color: account.color }}
          >
            <Icon className="size-[18px]" aria-hidden />
          </div>
          <div className="flex min-w-0 flex-col gap-1">
            <span className="truncate text-sm font-medium text-foreground">{account.name}</span>
            <span className="text-xs text-text-secondary">{accountTypeLabels[account.type]}</span>
            <span className={cn('text-lg font-semibold tabular-nums', isNegative ? 'text-danger' : 'text-foreground')}>
              {formatCurrency(balance)}
            </span>
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          {!account.active && (
            <Badge variant="outline" className="border-border text-text-secondary">
              Inativa
            </Badge>
          )}
          <div className="flex items-center gap-3">
            {onEdit && (
              <button
                type="button"
                onClick={onEdit}
                className="text-xs font-medium text-accent-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
              >
                Editar
              </button>
            )}
            {onToggleActive && (
              <button
                type="button"
                onClick={onToggleActive}
                className="text-xs font-medium text-text-secondary hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
              >
                {account.active ? 'Desativar' : 'Ativar'}
              </button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
