export interface TransactionFiltersState {
  period: 'ALL' | 'CURRENT' | 'PREVIOUS'
  type: 'ALL' | 'INCOME' | 'EXPENSE'
  categoryId: 'ALL' | string
  accountId: 'ALL' | string
}

export const defaultTransactionFilters: TransactionFiltersState = {
  period: 'ALL',
  type: 'ALL',
  categoryId: 'ALL',
  accountId: 'ALL',
}
