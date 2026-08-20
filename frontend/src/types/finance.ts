export type TransactionType = 'INCOME' | 'EXPENSE'

export type AccountType = 'CHECKING' | 'SAVINGS' | 'WALLET' | 'CREDIT_CARD' | 'INVESTMENT'

/** Espelha com.financeapp.account.dto.AccountResponse. Não tem campo de cor — o backend não modela isso. */
export interface Account {
  id: number
  name: string
  type: AccountType
  initialBalance: number
  active: boolean
  createdAt: string
  updatedAt: string
}

/** Espelha com.financeapp.category.dto.CategoryResponse. `color` é hex `#RRGGBB`. */
export interface Category {
  id: number
  name: string
  type: TransactionType
  color: string
  icon: string
  isDefault: boolean
  createdAt: string
}

export type PaymentMethodType = 'CASH' | 'DEBIT_CARD' | 'CREDIT_CARD' | 'PIX' | 'BANK_TRANSFER' | 'OTHER'

/** Espelha com.financeapp.paymentmethod.dto.PaymentMethodResponse. */
export interface PaymentMethod {
  id: number
  name: string
  type: PaymentMethodType
  createdAt: string
}

/** Espelha com.financeapp.transaction.dto.TransactionResponse (já traz nomes denormalizados). */
export interface Transaction {
  id: number
  description: string
  amount: number
  type: TransactionType
  date: string
  notes: string | null
  categoryId: number
  categoryName: string
  accountId: number
  accountName: string
  paymentMethodId: number
  paymentMethodName: string
  createdAt: string
  updatedAt: string
}

/** Espelha com.financeapp.dashboard.dto.DashboardSummaryResponse. */
export interface DashboardSummary {
  totalIncome: number
  totalExpenses: number
  netSavings: number
  availableBalance: number
}

/** Espelha com.financeapp.dashboard.dto.CategoryExpenseResponse. Sem cor — cruzar com a lista de categorias. */
export interface CategoryExpense {
  categoryId: number
  categoryName: string
  amount: number
  percentage: number
}

/** Espelha com.financeapp.dashboard.dto.DailyIncomeExpenseResponse. */
export interface DailyIncomeExpense {
  date: string
  income: number
  expense: number
}

/** Espelha com.financeapp.dashboard.dto.AccountBalanceResponse. Nunca inclui contas CREDIT_CARD. */
export interface AccountBalance {
  accountId: number
  accountName: string
  accountType: AccountType
  balance: number
}

export type RecurrenceFrequency = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY'

/** Referência resumida a conta/categoria/método de pagamento dentro de RecurringTransactionResponse. */
export interface RecurringTransactionRef {
  id: number
  name: string
}

/** Espelha com.financeapp.recurring.dto.RecurringTransactionResponse. Gera Transactions — nunca as substitui. */
export interface RecurringTransaction {
  id: number
  description: string
  amount: number
  type: TransactionType
  frequency: RecurrenceFrequency
  startDate: string
  endDate: string | null
  nextExecutionDate: string
  lastExecutionDate: string | null
  active: boolean
  account: RecurringTransactionRef
  category: RecurringTransactionRef
  paymentMethod: RecurringTransactionRef
}

export type BudgetStatus = 'SAFE' | 'WARNING' | 'EXCEEDED'

/** Referência resumida a categoria dentro de BudgetResponse/FinancialGoalResponse. */
export interface EntityRef {
  id: number
  name: string
}

/**
 * Espelha com.financeapp.budget.dto.BudgetResponse. `spent`/`remaining`/
 * `percentageUsed`/`status` são sempre calculados no backend a partir de
 * transactions — nunca persistidos, nunca recalculados no frontend.
 * `percentageUsed` pode passar de 100 (orçamento estourado).
 */
export interface Budget {
  id: number
  year: number
  month: number
  amount: number
  spent: number
  remaining: number
  percentageUsed: number
  status: BudgetStatus
  category: EntityRef
}

export type GoalStatus = 'ACTIVE' | 'COMPLETED' | 'CANCELLED'

/**
 * Espelha com.financeapp.goal.dto.FinancialGoalResponse. `currentAmount`/
 * `remainingAmount`/`progressPercentage` são sempre calculados no backend a
 * partir de `SUM(goal_contributions.amount)` — nunca persistidos.
 * `daysRemaining` é `null` sem `targetDate`, pode ser negativo (meta vencida).
 */
export interface FinancialGoal {
  id: number
  name: string
  description: string | null
  targetAmount: number
  currentAmount: number
  remainingAmount: number
  progressPercentage: number
  targetDate: string | null
  daysRemaining: number | null
  status: GoalStatus
  createdAt: string
}

/** Espelha com.financeapp.goal.dto.GoalContributionResponse. Histórico interno da meta — nunca uma Transaction. */
export interface GoalContribution {
  id: number
  amount: number
  date: string
  note: string | null
  createdAt: string
}
