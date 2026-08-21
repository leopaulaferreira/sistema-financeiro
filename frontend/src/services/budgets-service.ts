import { apiClient } from './api-client'
import type { Budget } from '@/types/finance'
import type { BudgetCreateRequest, BudgetSearchParams, BudgetUpdateRequest } from '@/types/requests'

export const budgetsService = {
  list: (params?: BudgetSearchParams) => apiClient.get<Budget[]>('/api/budgets', { ...params }),
  get: (id: number) => apiClient.get<Budget>(`/api/budgets/${id}`),
  create: (data: BudgetCreateRequest) => apiClient.post<Budget>('/api/budgets', data),
  update: (id: number, data: BudgetUpdateRequest) => apiClient.put<Budget>(`/api/budgets/${id}`, data),
  remove: (id: number) => apiClient.delete<void>(`/api/budgets/${id}`),
}
