import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { paymentMethodsService } from '@/services/payment-methods-service'
import { queryKeys } from '@/lib/query-keys'
import type { PaymentMethodRequest } from '@/types/requests'

export function usePaymentMethodsQuery() {
  return useQuery({ queryKey: queryKeys.paymentMethods, queryFn: paymentMethodsService.list })
}

export function useCreatePaymentMethod() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: PaymentMethodRequest) => paymentMethodsService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.paymentMethods })
    },
  })
}

export function useUpdatePaymentMethod() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: PaymentMethodRequest }) => paymentMethodsService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.paymentMethods })
    },
  })
}

export function useDeletePaymentMethod() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => paymentMethodsService.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.paymentMethods })
    },
  })
}
