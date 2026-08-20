import { apiClient } from './api-client'
import type { PaymentMethod } from '@/types/finance'
import type { PaymentMethodRequest } from '@/types/requests'

export const paymentMethodsService = {
  list: () => apiClient.get<PaymentMethod[]>('/api/payment-methods'),
  get: (id: number) => apiClient.get<PaymentMethod>(`/api/payment-methods/${id}`),
  create: (data: PaymentMethodRequest) => apiClient.post<PaymentMethod>('/api/payment-methods', data),
  update: (id: number, data: PaymentMethodRequest) => apiClient.put<PaymentMethod>(`/api/payment-methods/${id}`, data),
  remove: (id: number) => apiClient.delete<void>(`/api/payment-methods/${id}`),
}
