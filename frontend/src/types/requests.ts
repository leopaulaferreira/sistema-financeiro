import type { AccountType, PaymentMethodType, RecurrenceFrequency, TransactionType } from './finance'

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
