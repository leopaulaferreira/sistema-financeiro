import { useQuery } from '@tanstack/react-query'
import { dashboardService, type DashboardPeriod } from '@/services/dashboard-service'
import { queryKeys } from '@/lib/query-keys'

export function useDashboardSummary(period: DashboardPeriod) {
  return useQuery({
    queryKey: queryKeys.dashboardSummary(period.year, period.month),
    queryFn: () => dashboardService.summary(period),
  })
}

export function useExpensesByCategory(period: DashboardPeriod) {
  return useQuery({
    queryKey: queryKeys.dashboardExpensesByCategory(period.year, period.month),
    queryFn: () => dashboardService.expensesByCategory(period),
  })
}

export function useIncomeVsExpense(period: DashboardPeriod) {
  return useQuery({
    queryKey: queryKeys.dashboardIncomeVsExpense(period.year, period.month),
    queryFn: () => dashboardService.incomeVsExpense(period),
  })
}

export function useRecentTransactions(limit?: number) {
  return useQuery({
    queryKey: queryKeys.dashboardRecentTransactions(limit),
    queryFn: () => dashboardService.recentTransactions(limit),
  })
}

export function useAccountsBalance() {
  return useQuery({
    queryKey: queryKeys.dashboardAccountsBalance,
    queryFn: dashboardService.accountsBalance,
  })
}
