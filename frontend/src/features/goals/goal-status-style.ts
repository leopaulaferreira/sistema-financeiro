import type { GoalStatus } from '@/types/finance'

export const goalStatusLabels: Record<GoalStatus, string> = {
  ACTIVE: 'Em andamento',
  COMPLETED: 'Concluída',
  CANCELLED: 'Cancelada',
}

export const goalStatusBadgeClass: Record<GoalStatus, string> = {
  ACTIVE: 'border-accent-primary text-accent-primary',
  COMPLETED: 'border-success text-success',
  CANCELLED: 'border-border text-text-secondary',
}
