import { API_URL } from '@/lib/env'
import { readCsrfCookie } from './csrf'
import { ApiClientError, defaultMessageFor } from './api-error'

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

type QueryParams = Record<string, string | number | boolean | undefined | null>

interface RequestOptions {
  method?: HttpMethod
  body?: unknown
  params?: QueryParams
  /**
   * Chamadas de auth (login/register/refresh/logout) nunca devem disparar o
   * fluxo de refresh-e-repetir: um 401 nelas é uma resposta de negócio
   * (ex.: credenciais inválidas), não uma sessão expirada.
   */
  skipAuthRetry?: boolean
}

/**
 * Estratégia de refresh (ARCHITECTURE.md §5 + Fase 5 item 4):
 * - qualquer 401 em uma chamada autenticada tenta UM refresh;
 * - se o refresh funcionar, a requisição original é repetida uma única vez
 *   (sem re-tentar refresh de novo, mesmo que a repetição também falhe);
 * - se o refresh falhar, a sessão local é encerrada (via `unauthorizedHandler`)
 *   e o 401 original é propagado para quem chamou;
 * - `refreshPromise` implementa single-flight: requisições 401 concorrentes
 *   compartilham a mesma chamada de refresh em vez de disparar N chamadas.
 */
let refreshPromise: Promise<boolean> | null = null

type UnauthorizedHandler = () => void
let unauthorizedHandler: UnauthorizedHandler | null = null

/** Registrado pelo AuthProvider para reagir a uma sessão que expirou de fato (após refresh falhar). */
export function setUnauthorizedHandler(handler: UnauthorizedHandler | null): void {
  unauthorizedHandler = handler
}

function buildUrl(path: string, params?: QueryParams): string {
  const url = new URL(path, API_URL)
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, String(value))
      }
    }
  }
  return url.toString()
}

async function performRequest(path: string, options: RequestOptions): Promise<Response> {
  const method = options.method ?? 'GET'
  const headers: Record<string, string> = {}
  let body: string | undefined

  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json'
    body = JSON.stringify(options.body)
  }

  if (method !== 'GET') {
    const csrfToken = readCsrfCookie()
    if (csrfToken) headers['X-XSRF-TOKEN'] = csrfToken
  }

  try {
    return await fetch(buildUrl(path, options.params), {
      method,
      headers,
      body,
      credentials: 'include',
    })
  } catch {
    throw new ApiClientError(0, defaultMessageFor(0))
  }
}

async function parseJsonSafe(res: Response): Promise<unknown> {
  const text = await res.text()
  if (!text) return undefined
  try {
    return JSON.parse(text)
  } catch {
    return undefined
  }
}

function isApiErrorBody(value: unknown): value is { message?: string; errors?: { field: string; message: string }[] } {
  return typeof value === 'object' && value !== null
}

async function toApiClientError(res: Response): Promise<ApiClientError> {
  const data = await parseJsonSafe(res)
  if (isApiErrorBody(data) && data.message) {
    return new ApiClientError(res.status, data.message, data.errors ?? [])
  }
  return new ApiClientError(res.status, defaultMessageFor(res.status))
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (res.status === 204) return undefined as T
  if (!res.ok) throw await toApiClientError(res)
  return (await parseJsonSafe(res)) as T
}

function ensureRefreshed(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = performRequest('/api/auth/refresh', { method: 'POST' })
      .then((res) => res.ok)
      .catch(() => false)
      .finally(() => {
        refreshPromise = null
      })
  }
  return refreshPromise
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  let res = await performRequest(path, options)

  if (res.status === 401 && !options.skipAuthRetry) {
    const refreshed = await ensureRefreshed()
    if (!refreshed) {
      unauthorizedHandler?.()
      throw await toApiClientError(res)
    }

    res = await performRequest(path, options)

    // O cookie XSRF-TOKEN é de uso único: toda mutação bem-sucedida (o
    // próprio refresh acima incluído) o apaga, e um novo só é emitido na
    // resposta de uma falha por token ausente/inválido. Sem esta segunda
    // tentativa, duas mutações em sequência sem nenhum GET no meio (ex.:
    // excluir dois itens rapidamente) fariam a segunda "gastar" o token que
    // acabou de ser reemitido pela primeira e falhar com um 401 que não é,
    // de fato, sessão expirada.
    if (res.status === 401) res = await performRequest(path, options)

    if (res.status === 401) unauthorizedHandler?.()
  }

  return handleResponse<T>(res)
}

/**
 * Baixa um arquivo (ex.: CSV de relatórios) em vez de fazer parse JSON da
 * resposta — reaproveita o mesmo fetch com cookies/CSRF e a mesma
 * estratégia de refresh de {@link request}, só troca o parsing final.
 */
async function requestBlob(path: string, params?: QueryParams): Promise<Blob> {
  let res = await performRequest(path, { method: 'GET', params })

  if (res.status === 401) {
    const refreshed = await ensureRefreshed()
    if (!refreshed) {
      unauthorizedHandler?.()
      throw await toApiClientError(res)
    }
    res = await performRequest(path, { method: 'GET', params })
    if (res.status === 401) unauthorizedHandler?.()
  }

  if (!res.ok) throw await toApiClientError(res)
  return res.blob()
}

export const apiClient = {
  get: <T>(path: string, params?: QueryParams) => request<T>(path, { method: 'GET', params }),
  post: <T>(path: string, body?: unknown, options?: Pick<RequestOptions, 'skipAuthRetry'>) =>
    request<T>(path, { method: 'POST', body, ...options }),
  put: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PUT', body }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
  getBlob: (path: string, params?: QueryParams) => requestBlob(path, params),
}
