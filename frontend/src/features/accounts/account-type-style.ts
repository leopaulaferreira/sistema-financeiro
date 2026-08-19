import { Wallet, Landmark, PiggyBank, CreditCard, TrendingUp } from 'lucide-react'
import type { AccountType } from '@/types/finance'

/**
 * O backend não modela cor de conta (AccountResponse não tem esse campo) —
 * a cor é derivada do tipo, usando só tokens do design system, para manter
 * as contas visualmente diferenciadas sem inventar um dado que a API não tem.
 */
export const accountTypeStyle: Record<AccountType, { icon: typeof Wallet; colorVar: string }> = {
  CHECKING: { icon: Landmark, colorVar: 'var(--accent-primary)' },
  SAVINGS: { icon: PiggyBank, colorVar: 'var(--accent-secondary)' },
  WALLET: { icon: Wallet, colorVar: 'var(--success)' },
  CREDIT_CARD: { icon: CreditCard, colorVar: 'var(--danger)' },
  INVESTMENT: { icon: TrendingUp, colorVar: 'var(--warning)' },
}

export const accountTypeLabels: Record<AccountType, string> = {
  CHECKING: 'Conta corrente',
  SAVINGS: 'Poupança',
  WALLET: 'Carteira',
  CREDIT_CARD: 'Cartão de crédito',
  INVESTMENT: 'Investimento',
}
