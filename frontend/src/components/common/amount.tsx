import { cn } from '@/lib/utils'
import { formatCurrency } from '@/lib/format'
import type { TransactionType } from '@/types/finance'
import { ArrowDownRight, ArrowUpRight } from 'lucide-react'

interface AmountProps {
  value: number
  type: TransactionType
  className?: string
}

export function Amount({ value, type, className }: AmountProps) {
  const isIncome = type === 'INCOME'
  return (
    <span className={cn('inline-flex items-center justify-end gap-1 font-semibold tabular-nums', isIncome ? 'text-success' : 'text-danger', className)}>
      {isIncome ? <ArrowUpRight className="size-3.5" aria-hidden /> : <ArrowDownRight className="size-3.5" aria-hidden />}
      {isIncome ? '+' : '-'} {formatCurrency(value)}
    </span>
  )
}
