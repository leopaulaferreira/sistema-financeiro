import { apiClient } from './api-client'
import type {
  AccountFlow,
  BalancePoint,
  CategoryReport,
  FinancialSummary,
  IncomeExpenseSeriesPoint,
  MonthlyComparison,
  PaymentMethodReport,
  Transaction,
} from '@/types/finance'
import type { IncomeExpenseSeriesParams, ReportExportParams, ReportPeriod, TopTransactionsParams } from '@/types/requests'

/**
 * Todos os agregados vêm prontos do backend (ARCHITECTURE.md, Fase 8) — o
 * frontend nunca recalcula totais/percentuais/saldo, só formata e
 * apresenta, no mesmo espírito de {@code dashboard-service}.
 */
export const reportsService = {
  summary: (params: ReportPeriod) => apiClient.get<FinancialSummary>('/api/reports/summary', { ...params }),
  incomeVsExpense: (params: IncomeExpenseSeriesParams) =>
    apiClient.get<IncomeExpenseSeriesPoint[]>('/api/reports/income-vs-expense', { ...params }),
  expensesByCategory: (params: ReportPeriod) =>
    apiClient.get<CategoryReport[]>('/api/reports/expenses-by-category', { ...params }),
  incomeByCategory: (params: ReportPeriod) =>
    apiClient.get<CategoryReport[]>('/api/reports/income-by-category', { ...params }),
  accountsFlow: (params: ReportPeriod) => apiClient.get<AccountFlow[]>('/api/reports/accounts-flow', { ...params }),
  balanceEvolution: (params: ReportPeriod) => apiClient.get<BalancePoint[]>('/api/reports/balance-evolution', { ...params }),
  monthlyComparison: (months?: number) => apiClient.get<MonthlyComparison[]>('/api/reports/monthly-comparison', { months }),
  topExpenses: (params: TopTransactionsParams) => apiClient.get<Transaction[]>('/api/reports/top-expenses', { ...params }),
  topIncome: (params: TopTransactionsParams) => apiClient.get<Transaction[]>('/api/reports/top-income', { ...params }),
  paymentMethods: (params: ReportPeriod) => apiClient.get<PaymentMethodReport[]>('/api/reports/payment-methods', { ...params }),
  exportCsv: (params: ReportExportParams) => apiClient.getBlob('/api/reports/export.csv', { ...params }),
}
