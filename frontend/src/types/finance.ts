export type TransactionType = 'INCOME' | 'EXPENSE'

export type AccountType = 'CHECKING' | 'SAVINGS' | 'WALLET' | 'CREDIT_CARD' | 'INVESTMENT'

export interface Account {
  id: string
  name: string
  type: AccountType
  initialBalance: number
  active: boolean
  color: string
}

export interface Category {
  id: string
  name: string
  type: TransactionType
  color: string
  icon: string
}

export type PaymentMethodType = 'DEBIT' | 'CREDIT' | 'PIX' | 'CASH' | 'TRANSFER'

export interface PaymentMethod {
  id: string
  name: string
  type: PaymentMethodType
}

export interface Transaction {
  id: string
  type: TransactionType
  description: string
  amount: number
  date: string
  categoryId: string
  accountId: string
  paymentMethodId: string
  note?: string
}

export interface DashboardSummary {
  totalIncome: number
  totalExpenses: number
  netSavings: number
  availableBalance: number
}

export interface CategoryExpense {
  categoryId: string
  categoryName: string
  color: string
  amount: number
  percentage: number
}

export interface DailyIncomeExpense {
  date: string
  income: number
  expense: number
}

export interface AccountBalance {
  accountId: string
  accountName: string
  accountType: AccountType
  balance: number
}
