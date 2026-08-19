import { useQuery } from '@tanstack/react-query'
import { paymentMethodsService } from '@/services/payment-methods-service'
import { queryKeys } from '@/lib/query-keys'

export function usePaymentMethodsQuery() {
  return useQuery({ queryKey: queryKeys.paymentMethods, queryFn: paymentMethodsService.list })
}
