import type {
  BudgetSearchParams,
  GoalSearchParams,
  IncomeExpenseSeriesParams,
  RecurringTransactionSearchParams,
  ReportPeriod,
  TopTransactionsParams,
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
  reportSummary: (params: ReportPeriod) => ['reports', 'summary', params] as const,
  reportIncomeVsExpense: (params: IncomeExpenseSeriesParams) => ['reports', 'income-vs-expense', params] as const,
  reportExpensesByCategory: (params: ReportPeriod) => ['reports', 'expenses-by-category', params] as const,
  reportIncomeByCategory: (params: ReportPeriod) => ['reports', 'income-by-category', params] as const,
  reportAccountsFlow: (params: ReportPeriod) => ['reports', 'accounts-flow', params] as const,
  reportBalanceEvolution: (params: ReportPeriod) => ['reports', 'balance-evolution', params] as const,
  reportMonthlyComparison: (months?: number) => ['reports', 'monthly-comparison', months ?? 6] as const,
  reportTopExpenses: (params: TopTransactionsParams) => ['reports', 'top-expenses', params] as const,
  reportTopIncome: (params: TopTransactionsParams) => ['reports', 'top-income', params] as const,
  reportPaymentMethods: (params: ReportPeriod) => ['reports', 'payment-methods', params] as const,
}
