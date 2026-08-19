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
