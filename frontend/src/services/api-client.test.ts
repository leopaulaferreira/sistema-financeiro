import { afterEach, describe, expect, it, vi } from 'vitest'
import { apiClient, setUnauthorizedHandler } from './api-client'

function jsonResponse(status: number, body: unknown = {}): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

function mockFetchSequence(responses: Response[]): ReturnType<typeof vi.fn> {
  const fetchMock = vi.fn()
  for (const res of responses) fetchMock.mockImplementationOnce(() => Promise.resolve(res))
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

/**
 * Cobre a estratégia de refresh/CSRF documentada em `api-client.ts` e no
 * ARCHITECTURE.md (Fase 5) — a parte mais sutil e fácil de quebrar sem notar
 * do frontend (single-flight de refresh, retry duplo por causa do cookie
 * CSRF de uso único, encerramento de sessão só quando o refresh de fato falha).
 */
describe('apiClient', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    setUnauthorizedHandler(null)
    document.cookie = 'XSRF-TOKEN=; Max-Age=0'
  })

  it('sends the X-XSRF-TOKEN header on mutating requests when the cookie is present', async () => {
    document.cookie = 'XSRF-TOKEN=abc123'
    const fetchMock = mockFetchSequence([jsonResponse(201, { id: 1 })])

    await apiClient.post('/api/accounts', { name: 'Nubank' })

    const init = fetchMock.mock.calls[0][1] as RequestInit
    expect((init.headers as Record<string, string>)['X-XSRF-TOKEN']).toBe('abc123')
  })

  it('does not send the CSRF header on GET requests', async () => {
    document.cookie = 'XSRF-TOKEN=abc123'
    const fetchMock = mockFetchSequence([jsonResponse(200, [])])

    await apiClient.get('/api/accounts')

    const init = fetchMock.mock.calls[0][1] as RequestInit
    expect((init.headers as Record<string, string>)['X-XSRF-TOKEN']).toBeUndefined()
  })

  it('refreshes once and retries the original request after a 401', async () => {
    const fetchMock = mockFetchSequence([
      jsonResponse(401),
      jsonResponse(200),
      jsonResponse(200, { ok: true }),
    ])

    const result = await apiClient.get<{ ok: boolean }>('/api/accounts')

    expect(result).toEqual({ ok: true })
    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(String(fetchMock.mock.calls[1][0])).toContain('/api/auth/refresh')
  })

  it('retries a second time when the retry also 401s (single-use CSRF cookie)', async () => {
    const fetchMock = mockFetchSequence([
      jsonResponse(401),
      jsonResponse(200),
      jsonResponse(401),
      jsonResponse(200, { ok: true }),
    ])

    const result = await apiClient.post<{ ok: boolean }>('/api/accounts', { name: 'x' })

    expect(result).toEqual({ ok: true })
    expect(fetchMock).toHaveBeenCalledTimes(4)
  })

  it('ends the session and propagates the error when refresh itself fails', async () => {
    mockFetchSequence([jsonResponse(401), jsonResponse(401)])
    const handler = vi.fn()
    setUnauthorizedHandler(handler)

    await expect(apiClient.get('/api/accounts')).rejects.toThrow()
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('does not retry auth calls marked skipAuthRetry (a business 401, not an expired session)', async () => {
    const fetchMock = mockFetchSequence([jsonResponse(401, { message: 'E-mail ou senha inválidos' })])

    await expect(
      apiClient.post('/api/auth/login', { email: 'a@a.com', password: 'x' }, { skipAuthRetry: true }),
    ).rejects.toThrow('E-mail ou senha inválidos')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('shares a single in-flight refresh call across concurrent 401s (single-flight)', async () => {
    const callsPerUrl: Record<string, number> = {}
    let refreshCalls = 0
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes('/api/auth/refresh')) {
        refreshCalls += 1
        return Promise.resolve(jsonResponse(200))
      }
      callsPerUrl[url] = (callsPerUrl[url] ?? 0) + 1
      const status = callsPerUrl[url] === 1 ? 401 : 200
      return Promise.resolve(jsonResponse(status, { ok: true }))
    })
    vi.stubGlobal('fetch', fetchMock)

    const [a, b] = await Promise.all([
      apiClient.get<{ ok: boolean }>('/api/accounts'),
      apiClient.get<{ ok: boolean }>('/api/goals'),
    ])

    expect(a).toEqual({ ok: true })
    expect(b).toEqual({ ok: true })
    expect(refreshCalls).toBe(1)
  })
})
