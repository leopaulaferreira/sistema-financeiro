import { apiClient } from './api-client'
import type { FinancialGoal, GoalContribution } from '@/types/finance'
import type {
  FinancialGoalCreateRequest,
  FinancialGoalUpdateRequest,
  GoalContributionCreateRequest,
  GoalSearchParams,
} from '@/types/requests'

export const goalsService = {
  list: (params?: GoalSearchParams) => apiClient.get<FinancialGoal[]>('/api/goals', { ...params }),
  get: (id: number) => apiClient.get<FinancialGoal>(`/api/goals/${id}`),
  create: (data: FinancialGoalCreateRequest) => apiClient.post<FinancialGoal>('/api/goals', data),
  update: (id: number, data: FinancialGoalUpdateRequest) => apiClient.put<FinancialGoal>(`/api/goals/${id}`, data),
  remove: (id: number) => apiClient.delete<void>(`/api/goals/${id}`),
  listContributions: (goalId: number) => apiClient.get<GoalContribution[]>(`/api/goals/${goalId}/contributions`),
  addContribution: (goalId: number, data: GoalContributionCreateRequest) =>
    apiClient.post<GoalContribution>(`/api/goals/${goalId}/contributions`, data),
  removeContribution: (goalId: number, contributionId: number) =>
    apiClient.delete<void>(`/api/goals/${goalId}/contributions/${contributionId}`),
}
