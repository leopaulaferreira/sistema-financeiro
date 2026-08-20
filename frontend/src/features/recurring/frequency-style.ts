import type { RecurrenceFrequency } from '@/types/finance'

export const frequencyLabels: Record<RecurrenceFrequency, string> = {
  DAILY: 'Diária',
  WEEKLY: 'Semanal',
  MONTHLY: 'Mensal',
  YEARLY: 'Anual',
}
