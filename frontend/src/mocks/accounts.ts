import type { Account } from '@/types/finance'

export const mockAccounts: Account[] = [
  {
    id: 'acc-nubank',
    name: 'Nubank',
    type: 'CHECKING',
    initialBalance: 500,
    active: true,
    color: 'oklch(0.64 0.19 293)',
  },
  {
    id: 'acc-itau',
    name: 'Itaú',
    type: 'CHECKING',
    initialBalance: 4700,
    active: true,
    color: 'oklch(0.78 0.12 210)',
  },
  {
    id: 'acc-carteira',
    name: 'Carteira',
    type: 'WALLET',
    initialBalance: 1000,
    active: true,
    color: 'oklch(0.72 0.17 149)',
  },
  {
    id: 'acc-cartao-xp',
    name: 'Cartão XP Visa',
    type: 'CREDIT_CARD',
    initialBalance: 0,
    active: true,
    color: 'oklch(0.65 0.21 25)',
  },
]

export const accountTypeLabels: Record<Account['type'], string> = {
  CHECKING: 'Conta corrente',
  SAVINGS: 'Poupança',
  WALLET: 'Carteira',
  CREDIT_CARD: 'Cartão de crédito',
  INVESTMENT: 'Investimento',
}
