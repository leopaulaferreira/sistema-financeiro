import { cn } from '@/lib/utils'
import { formatCurrency } from '@/lib/format'
import type { TransactionType } from '@/types/finance'

interface AmountProps {
  value: number
  type: TransactionType
  className?: string
}

export function Amount({ value, type, className }: AmountProps) {
  const isIncome = type === 'INCOME'
  return (
    <span className={cn('font-medium tabular-nums', isIncome ? 'text-success' : 'text-danger', className)}>
      {isIncome ? '+' : '-'} {formatCurrency(value)}
    </span>
  )
}
