import type {
  BudgetSearchParams,
  GoalSearchParams,
  RecurringTransactionSearchParams,
  TransactionSearchParams,
} from '@/types/requests'

/** Chaves centralizadas para evitar strings soltas espalhadas pelos hooks. */
export const queryKeys = {
  accounts: ['accounts'] as const,
  categories: (type?: string) => ['categories', type ?? 'ALL'] as const,
  paymentMethods: ['payment-methods'] as const,
  transactions: (params: TransactionSearchParams) => ['transactions', params] as const,
  transaction: (id: number) => ['transactions', 'detail', id] as const,
  recurringTransactions: (params?: RecurringTransactionSearchParams) => ['recurring-transactions', params ?? {}] as const,
  budgets: (params?: BudgetSearchParams) => ['budgets', params ?? {}] as const,
  goals: (params?: GoalSearchParams) => ['goals', params ?? {}] as const,
  goalContributions: (goalId: number) => ['goals', goalId, 'contributions'] as const,
  dashboard: ['dashboard'] as const,
  dashboardSummary: (year: number, month: number) => ['dashboard', 'summary', year, month] as const,
  dashboardExpensesByCategory: (year: number, month: number) =>
    ['dashboard', 'expenses-by-category', year, month] as const,
  dashboardIncomeVsExpense: (year: number, month: number) =>
    ['dashboard', 'income-vs-expense', year, month] as const,
  dashboardRecentTransactions: (limit?: number) => ['dashboard', 'recent-transactions', limit] as const,
  dashboardAccountsBalance: ['dashboard', 'accounts-balance'] as const,
}
