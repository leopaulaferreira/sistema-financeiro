import { apiClient } from './api-client'
import type { Category, TransactionType } from '@/types/finance'
import type { CategoryRequest } from '@/types/requests'

export const categoriesService = {
  list: (type?: TransactionType) => apiClient.get<Category[]>('/api/categories', { type }),
  get: (id: number) => apiClient.get<Category>(`/api/categories/${id}`),
  create: (data: CategoryRequest) => apiClient.post<Category>('/api/categories', data),
  update: (id: number, data: CategoryRequest) => apiClient.put<Category>(`/api/categories/${id}`, data),
  remove: (id: number) => apiClient.delete<void>(`/api/categories/${id}`),
}
