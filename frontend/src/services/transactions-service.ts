import { apiClient } from './api-client'
import type { Transaction } from '@/types/finance'
import type { TransactionRequest, TransactionSearchParams } from '@/types/requests'
import type { PageResponse } from '@/types/pagination'

export const transactionsService = {
  search: (params: TransactionSearchParams) =>
    apiClient.get<PageResponse<Transaction>>('/api/transactions', { ...params }),
  get: (id: number) => apiClient.get<Transaction>(`/api/transactions/${id}`),
  create: (data: TransactionRequest) => apiClient.post<Transaction>('/api/transactions', data),
  update: (id: number, data: TransactionRequest) => apiClient.put<Transaction>(`/api/transactions/${id}`, data),
  remove: (id: number) => apiClient.delete<void>(`/api/transactions/${id}`),
}
