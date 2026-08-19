/** Espelha com.financeapp.common.exception.ApiError. */
export interface ApiErrorBody {
  status: number
  message: string
  errors: ApiFieldError[]
  timestamp: string
}

export interface ApiFieldError {
  field: string
  message: string
}
