import type { AccountType, GoalStatus, PaymentMethodType, RecurrenceFrequency, ReportGranularity, TransactionType } from './finance'

/** Espelha com.financeapp.auth.dto.RegisterRequest. */
export interface RegisterRequest {
  name: string
  email: string
  password: string
}

/** Espelha com.financeapp.auth.dto.LoginRequest. */
export interface LoginRequest {
  email: string
  password: string
}

/** Espelha com.financeapp.account.dto.AccountRequest (criação — a conta sempre nasce ativa). */
export interface AccountRequest {
  name: string
  type: AccountType
  initialBalance: number
}

/** Espelha com.financeapp.account.dto.AccountUpdateRequest (PUT substitui o registro inteiro). */
export interface AccountUpdateRequest extends AccountRequest {
  active: boolean
}

/** Espelha com.financeapp.category.dto.CategoryRequest. `color` deve ser hex `#RRGGBB`. */
export interface CategoryRequest {
  name: string
  type: TransactionType
  color: string
  icon: string
}

/** Espelha com.financeapp.paymentmethod.dto.PaymentMethodRequest. */
export interface PaymentMethodRequest {
  name: string
  type: PaymentMethodType
}

/** Espelha com.financeapp.transaction.dto.TransactionRequest (usado em criação e atualização). */
export interface TransactionRequest {
  description: string
  amount: number
  type: TransactionType
  date: string
  categoryId: number
  accountId: number
  paymentMethodId: number
  notes?: string | null
}

export interface TransactionSearchParams {
  from?: string
  to?: string
  type?: TransactionType
  categoryId?: number
  accountId?: number
  page?: number
  size?: number
}

/** Espelha com.financeapp.recurring.dto.RecurringTransactionCreateRequest. nextExecutionDate nunca é enviada — o backend sempre calcula. */
export interface RecurringTransactionCreateRequest {
  description: string
  amount: number
  type: TransactionType
  categoryId: number
  accountId: number
  paymentMethodId: number
  frequency: RecurrenceFrequency
  startDate: string
  endDate?: string | null
}

/** Espelha com.financeapp.recurring.dto.RecurringTransactionUpdateRequest. PUT substitui o registro inteiro, incluindo active (reaproveitado para pausar/reativar). */
export interface RecurringTransactionUpdateRequest {
  description: string
  amount: number
  categoryId: number
  accountId: number
  paymentMethodId: number
  frequency: RecurrenceFrequency
  startDate: string
  endDate?: string | null
  active: boolean
}

export interface RecurringTransactionSearchParams {
  type?: TransactionType
  active?: boolean
  frequency?: RecurrenceFrequency
}

/** Espelha com.financeapp.budget.dto.BudgetCreateRequest/BudgetUpdateRequest — PUT substitui o registro inteiro. */
export interface BudgetCreateRequest {
  categoryId: number
  year: number
  month: number
  amount: number
}

export type BudgetUpdateRequest = BudgetCreateRequest

export interface BudgetSearchParams {
  year?: number
  month?: number
  categoryId?: number
}

/** Espelha com.financeapp.goal.dto.FinancialGoalCreateRequest. */
export interface FinancialGoalCreateRequest {
  name: string
  description?: string | null
  targetAmount: number
  targetDate?: string | null
}

/**
 * Espelha com.financeapp.goal.dto.FinancialGoalUpdateRequest. `status` só
 * aceita ACTIVE/CANCELLED — COMPLETED é sempre derivado automaticamente
 * pelo backend a partir das contribuições (rejeitado com 400 se enviado).
 */
export interface FinancialGoalUpdateRequest extends FinancialGoalCreateRequest {
  status: Exclude<GoalStatus, 'COMPLETED'>
}

export interface GoalSearchParams {
  status?: GoalStatus
}

/** Espelha com.financeapp.goal.dto.GoalContributionCreateRequest. */
export interface GoalContributionCreateRequest {
  amount: number
  date: string
  note?: string | null
}

/** Período usado pela maioria dos endpoints de /api/reports — from inclusivo, to exclusivo ([from, to)). */
export interface ReportPeriod {
  from: string
  to: string
}

export interface IncomeExpenseSeriesParams extends ReportPeriod {
  granularity?: ReportGranularity
}

export interface TopTransactionsParams extends ReportPeriod {
  limit?: number
}

export interface ReportExportParams extends ReportPeriod {
  type?: TransactionType
  categoryId?: number
  accountId?: number
}
