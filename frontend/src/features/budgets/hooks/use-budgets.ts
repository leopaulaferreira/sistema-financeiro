import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { budgetsService } from '@/services/budgets-service'
import { queryKeys } from '@/lib/query-keys'
import type { BudgetCreateRequest, BudgetSearchParams, BudgetUpdateRequest } from '@/types/requests'

export function useBudgetsQuery(params?: BudgetSearchParams) {
  return useQuery({
    queryKey: queryKeys.budgets(params),
    queryFn: () => budgetsService.list(params),
  })
}

function invalidateAll(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ['budgets'] })
}

export function useCreateBudget() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: BudgetCreateRequest) => budgetsService.create(data),
    onSuccess: () => invalidateAll(queryClient),
  })
}

export function useUpdateBudget() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: BudgetUpdateRequest }) => budgetsService.update(id, data),
    onSuccess: () => invalidateAll(queryClient),
  })
}

export function useDeleteBudget() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => budgetsService.remove(id),
    onSuccess: () => invalidateAll(queryClient),
  })
}
