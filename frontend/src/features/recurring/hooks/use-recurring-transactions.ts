import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { recurringTransactionsService } from '@/services/recurring-transactions-service'
import { queryKeys } from '@/lib/query-keys'
import type { RecurringTransactionCreateRequest, RecurringTransactionSearchParams, RecurringTransactionUpdateRequest } from '@/types/requests'

export function useRecurringTransactionsQuery(params?: RecurringTransactionSearchParams) {
  return useQuery({
    queryKey: queryKeys.recurringTransactions(params),
    queryFn: () => recurringTransactionsService.list(params),
  })
}

function invalidateAll(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ['recurring-transactions'] })
}

export function useCreateRecurringTransaction() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: RecurringTransactionCreateRequest) => recurringTransactionsService.create(data),
    onSuccess: () => invalidateAll(queryClient),
  })
}

export function useUpdateRecurringTransaction() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: RecurringTransactionUpdateRequest }) =>
      recurringTransactionsService.update(id, data),
    onSuccess: () => invalidateAll(queryClient),
  })
}

export function useDeleteRecurringTransaction() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => recurringTransactionsService.remove(id),
    onSuccess: () => invalidateAll(queryClient),
  })
}
