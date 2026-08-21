import type { BudgetStatus } from '@/types/finance'

export const budgetStatusLabels: Record<BudgetStatus, string> = {
  SAFE: 'Dentro do orçamento',
  WARNING: 'Perto do limite',
  EXCEEDED: 'Orçamento estourado',
}

export const budgetStatusBadgeClass: Record<BudgetStatus, string> = {
  SAFE: 'border-success text-success',
  WARNING: 'border-warning text-warning',
  EXCEEDED: 'border-danger text-danger',
}

export const budgetStatusProgressVariant: Record<BudgetStatus, 'success' | 'warning' | 'danger'> = {
  SAFE: 'success',
  WARNING: 'warning',
  EXCEEDED: 'danger',
}
