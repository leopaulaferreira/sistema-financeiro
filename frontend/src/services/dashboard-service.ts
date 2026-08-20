import { apiClient } from './api-client'
import type { AccountBalance, CategoryExpense, DailyIncomeExpense, DashboardSummary, Transaction } from '@/types/finance'

export interface DashboardPeriod {
  year: number
  month: number
}

/**
 * Todos os agregados vêm prontos do backend (ARCHITECTURE.md §8) — o
 * frontend nunca recalcula saldo, totalIncome, totalExpenses ou netSavings,
 * só formata e apresenta.
 */
export const dashboardService = {
  summary: ({ year, month }: DashboardPeriod) =>
    apiClient.get<DashboardSummary>('/api/dashboard/summary', { year, month }),
  expensesByCategory: ({ year, month }: DashboardPeriod) =>
    apiClient.get<CategoryExpense[]>('/api/dashboard/expenses-by-category', { year, month }),
  incomeVsExpense: ({ year, month }: DashboardPeriod) =>
    apiClient.get<DailyIncomeExpense[]>('/api/dashboard/income-vs-expense', { year, month }),
  recentTransactions: (limit?: number) =>
    apiClient.get<Transaction[]>('/api/dashboard/recent-transactions', { limit }),
  accountsBalance: () => apiClient.get<AccountBalance[]>('/api/dashboard/accounts-balance'),
}
