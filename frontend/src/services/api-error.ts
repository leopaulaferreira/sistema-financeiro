import type { ApiFieldError } from '@/types/api-error'

/**
 * Erro lançado por toda chamada da camada `services/`. `status` 0 significa
 * falha de rede/conexão (o `fetch` nem chegou a receber uma resposta).
 */
export class ApiClientError extends Error {
  readonly status: number
  readonly errors: ApiFieldError[]

  constructor(status: number, message: string, errors: ApiFieldError[] = []) {
    super(message)
    this.name = 'ApiClientError'
    this.status = status
    this.errors = errors
  }
}

const DEFAULT_MESSAGES: Record<number, string> = {
  0: 'Não foi possível conectar ao servidor. Verifique sua conexão.',
  401: 'Sessão expirada ou inválida.',
  403: 'Você não tem permissão para realizar esta ação.',
  404: 'Recurso não encontrado.',
  500: 'Erro interno do servidor. Tente novamente em instantes.',
}

export function defaultMessageFor(status: number): string {
  return DEFAULT_MESSAGES[status] ?? 'Ocorreu um erro inesperado. Tente novamente.'
}

/**
 * Mensagem segura para exibir ao usuário — nunca stack trace ou detalhe
 * interno. Para 400/404/409/422 a mensagem já vem pronta da API; para os
 * demais casos usamos um texto genérico e amigável.
 */
export function friendlyErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    if (error.status === 500 || error.status === 0) return defaultMessageFor(error.status)
    return error.message || defaultMessageFor(error.status)
  }
  return 'Ocorreu um erro inesperado. Tente novamente.'
}
