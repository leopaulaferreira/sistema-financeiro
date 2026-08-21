import { useQuery } from '@tanstack/react-query'
import { reportsService } from '@/services/reports-service'
import { queryKeys } from '@/lib/query-keys'
import type { IncomeExpenseSeriesParams, ReportPeriod, TopTransactionsParams } from '@/types/requests'

export function useReportSummary(params: ReportPeriod) {
  return useQuery({ queryKey: queryKeys.reportSummary(params), queryFn: () => reportsService.summary(params) })
}

export function useIncomeVsExpense(params: IncomeExpenseSeriesParams) {
  return useQuery({
    queryKey: queryKeys.reportIncomeVsExpense(params),
    queryFn: () => reportsService.incomeVsExpense(params),
  })
}

export function useExpensesByCategoryReport(params: ReportPeriod) {
  return useQuery({
    queryKey: queryKeys.reportExpensesByCategory(params),
    queryFn: () => reportsService.expensesByCategory(params),
  })
}

export function useIncomeByCategoryReport(params: ReportPeriod) {
  return useQuery({
    queryKey: queryKeys.reportIncomeByCategory(params),
    queryFn: () => reportsService.incomeByCategory(params),
  })
}

export function useAccountsFlow(params: ReportPeriod) {
  return useQuery({ queryKey: queryKeys.reportAccountsFlow(params), queryFn: () => reportsService.accountsFlow(params) })
}

export function useBalanceEvolution(params: ReportPeriod) {
  return useQuery({
    queryKey: queryKeys.reportBalanceEvolution(params),
    queryFn: () => reportsService.balanceEvolution(params),
  })
}

export function useMonthlyComparison(months?: number) {
  return useQuery({
    queryKey: queryKeys.reportMonthlyComparison(months),
    queryFn: () => reportsService.monthlyComparison(months),
  })
}

export function useTopExpenses(params: TopTransactionsParams) {
  return useQuery({ queryKey: queryKeys.reportTopExpenses(params), queryFn: () => reportsService.topExpenses(params) })
}

export function useTopIncome(params: TopTransactionsParams) {
  return useQuery({ queryKey: queryKeys.reportTopIncome(params), queryFn: () => reportsService.topIncome(params) })
}

export function usePaymentMethodsReport(params: ReportPeriod) {
  return useQuery({
    queryKey: queryKeys.reportPaymentMethods(params),
    queryFn: () => reportsService.paymentMethods(params),
  })
}
