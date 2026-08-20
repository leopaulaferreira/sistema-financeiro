import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { transactionsService } from '@/services/transactions-service'
import { queryKeys } from '@/lib/query-keys'
import type { TransactionRequest, TransactionSearchParams } from '@/types/requests'

export function useTransactionsQuery(params: TransactionSearchParams) {
  return useQuery({
    queryKey: queryKeys.transactions(params),
    queryFn: () => transactionsService.search(params),
    placeholderData: keepPreviousData,
  })
}

function invalidateAll(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ['transactions'] })
  queryClient.invalidateQueries({ queryKey: queryKeys.dashboard })
}

export function useCreateTransaction() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: TransactionRequest) => transactionsService.create(data),
    onSuccess: () => invalidateAll(queryClient),
  })
}

export function useUpdateTransaction() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: TransactionRequest }) => transactionsService.update(id, data),
    onSuccess: () => invalidateAll(queryClient),
  })
}

export function useDeleteTransaction() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => transactionsService.remove(id),
    onSuccess: () => invalidateAll(queryClient),
  })
}
