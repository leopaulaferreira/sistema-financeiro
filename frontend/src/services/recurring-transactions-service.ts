import { apiClient } from './api-client'
import type { RecurringTransaction } from '@/types/finance'
import type {
  RecurringTransactionCreateRequest,
  RecurringTransactionSearchParams,
  RecurringTransactionUpdateRequest,
} from '@/types/requests'

export const recurringTransactionsService = {
  list: (params?: RecurringTransactionSearchParams) =>
    apiClient.get<RecurringTransaction[]>('/api/recurring-transactions', { ...params }),
  get: (id: number) => apiClient.get<RecurringTransaction>(`/api/recurring-transactions/${id}`),
  create: (data: RecurringTransactionCreateRequest) =>
    apiClient.post<RecurringTransaction>('/api/recurring-transactions', data),
  update: (id: number, data: RecurringTransactionUpdateRequest) =>
    apiClient.put<RecurringTransaction>(`/api/recurring-transactions/${id}`, data),
  remove: (id: number) => apiClient.delete<void>(`/api/recurring-transactions/${id}`),
}
