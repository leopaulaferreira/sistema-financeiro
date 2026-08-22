import { Banknote, CreditCard, QrCode, Landmark, MoreHorizontal } from 'lucide-react'
import type { PaymentMethodType } from '@/types/finance'

/**
 * O backend não modela ícone/cor de método de pagamento (PaymentMethodResponse
 * não tem esses campos) — como em account-type-style.ts, derivamos do tipo.
 */
export const paymentMethodTypeStyle: Record<PaymentMethodType, { icon: typeof Banknote; colorVar: string }> = {
  CASH: { icon: Banknote, colorVar: 'var(--success)' },
  DEBIT_CARD: { icon: CreditCard, colorVar: 'var(--accent-primary)' },
  CREDIT_CARD: { icon: CreditCard, colorVar: 'var(--danger)' },
  PIX: { icon: QrCode, colorVar: 'var(--accent-secondary)' },
  BANK_TRANSFER: { icon: Landmark, colorVar: 'var(--warning)' },
  OTHER: { icon: MoreHorizontal, colorVar: 'var(--text-secondary)' },
}

export const paymentMethodTypeLabels: Record<PaymentMethodType, string> = {
  CASH: 'Dinheiro',
  DEBIT_CARD: 'Cartão de débito',
  CREDIT_CARD: 'Cartão de crédito',
  PIX: 'Pix',
  BANK_TRANSFER: 'Transferência bancária',
  OTHER: 'Outro',
}
