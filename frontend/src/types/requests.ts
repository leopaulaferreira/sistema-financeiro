import type { AccountType, PaymentMethodType, TransactionType } from './finance'

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
