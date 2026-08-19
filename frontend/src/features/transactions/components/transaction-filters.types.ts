export interface TransactionFiltersState {
  period: 'ALL' | '2026-08' | '2026-07'
  type: 'ALL' | 'INCOME' | 'EXPENSE'
  categoryId: string
  accountId: string
}

export const defaultTransactionFilters: TransactionFiltersState = {
  period: 'ALL',
  type: 'ALL',
  categoryId: 'ALL',
  accountId: 'ALL',
}
