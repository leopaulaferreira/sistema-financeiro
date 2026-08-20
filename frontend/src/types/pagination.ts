/** Espelha com.financeapp.common.pagination.PageResponse. */
export interface PageResponse<T> {
  content: T[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}
