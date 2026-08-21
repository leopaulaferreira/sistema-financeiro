import { CreditCard } from 'lucide-react'
import type { PaymentMethodReport } from '@/types/finance'
import { formatCurrency, formatPercentage } from '@/lib/format'
import { EmptyState } from '@/components/common/empty-state'

interface PaymentMethodsListProps {
  data: PaymentMethodReport[]
}

/** Método de pagamento não tem cor própria no domínio (diferente de categoria) — paleta fixa de tokens, ciclada por posição. */
const PALETTE = ['var(--accent-primary)', 'var(--accent-secondary)', 'var(--success)', 'var(--warning)', 'var(--danger)']

export function PaymentMethodsList({ data }: PaymentMethodsListProps) {
  if (data.length === 0) {
    return <EmptyState icon={CreditCard} title="Nenhuma despesa no período" />
  }

  return (
    <ul className="flex flex-col gap-2.5">
      {data.map((entry, index) => (
        <li key={entry.paymentMethodId} className="flex items-center gap-2.5 text-sm">
          <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: PALETTE[index % PALETTE.length] }} aria-hidden />
          <span className="min-w-0 flex-1 truncate text-text-primary">{entry.paymentMethodName}</span>
          <span className="shrink-0 text-text-secondary">
            {entry.transactionCount} lanç. · {formatPercentage(entry.percentage)}
          </span>
          <span className="w-24 shrink-0 text-right font-medium tabular-nums text-foreground">{formatCurrency(entry.amount)}</span>
        </li>
      ))}
    </ul>
  )
}
