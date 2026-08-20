import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { goalsService } from '@/services/goals-service'
import { queryKeys } from '@/lib/query-keys'
import type {
  FinancialGoalCreateRequest,
  FinancialGoalUpdateRequest,
  GoalContributionCreateRequest,
  GoalSearchParams,
} from '@/types/requests'

export function useGoalsQuery(params?: GoalSearchParams) {
  return useQuery({
    queryKey: queryKeys.goals(params),
    queryFn: () => goalsService.list(params),
  })
}

export function useGoalContributionsQuery(goalId: number, enabled = true) {
  return useQuery({
    queryKey: queryKeys.goalContributions(goalId),
    queryFn: () => goalsService.listContributions(goalId),
    enabled,
  })
}

function invalidateAll(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ['goals'] })
}

export function useCreateGoal() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: FinancialGoalCreateRequest) => goalsService.create(data),
    onSuccess: () => invalidateAll(queryClient),
  })
}

export function useUpdateGoal() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: FinancialGoalUpdateRequest }) => goalsService.update(id, data),
    onSuccess: () => invalidateAll(queryClient),
  })
}

export function useDeleteGoal() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => goalsService.remove(id),
    onSuccess: () => invalidateAll(queryClient),
  })
}

export function useAddContribution() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ goalId, data }: { goalId: number; data: GoalContributionCreateRequest }) =>
      goalsService.addContribution(goalId, data),
    onSuccess: () => invalidateAll(queryClient),
  })
}

export function useRemoveContribution() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ goalId, contributionId }: { goalId: number; contributionId: number }) =>
      goalsService.removeContribution(goalId, contributionId),
    onSuccess: () => invalidateAll(queryClient),
  })
}
