import { apiClient } from './api-client'
import type { AccountBalance, CategoryExpense, DailyIncomeExpense, DashboardSummary, Transaction } from '@/types/finance'

export interface MonthPeriod {
  year: number
  month: number
}

export type DashboardPeriod = MonthPeriod | { total: true }

/** `{ total: true }` omite year/month da query — backend agrega desde a primeira transação do usuário. */
function periodParams(period: DashboardPeriod) {
  return 'total' in period ? {} : { year: period.year, month: period.month }
}

/**
 * Todos os agregados vêm prontos do backend (ARCHITECTURE.md §8) — o
 * frontend nunca recalcula saldo, totalIncome, totalExpenses ou netSavings,
 * só formata e apresenta.
 */
export const dashboardService = {
  summary: (period: DashboardPeriod) =>
    apiClient.get<DashboardSummary>('/api/dashboard/summary', periodParams(period)),
  expensesByCategory: (period: DashboardPeriod) =>
    apiClient.get<CategoryExpense[]>('/api/dashboard/expenses-by-category', periodParams(period)),
  incomeVsExpense: (period: DashboardPeriod) =>
    apiClient.get<DailyIncomeExpense[]>('/api/dashboard/income-vs-expense', periodParams(period)),
  recentTransactions: (limit?: number) =>
    apiClient.get<Transaction[]>('/api/dashboard/recent-transactions', { limit }),
  accountsBalance: () => apiClient.get<AccountBalance[]>('/api/dashboard/accounts-balance'),
}
