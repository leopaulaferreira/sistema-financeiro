import { apiClient } from './api-client'
import type { Account } from '@/types/finance'
import type { AccountRequest, AccountUpdateRequest } from '@/types/requests'

export const accountsService = {
  list: () => apiClient.get<Account[]>('/api/accounts'),
  get: (id: number) => apiClient.get<Account>(`/api/accounts/${id}`),
  create: (data: AccountRequest) => apiClient.post<Account>('/api/accounts', data),
  update: (id: number, data: AccountUpdateRequest) => apiClient.put<Account>(`/api/accounts/${id}`, data),
  remove: (id: number) => apiClient.delete<void>(`/api/accounts/${id}`),
}
