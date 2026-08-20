const CSRF_COOKIE_NAME = 'XSRF-TOKEN'

/**
 * Lê o cookie XSRF-TOKEN (legível por JavaScript por definição — é assim que
 * o padrão double-submit do Spring Security funciona) para reenviá-lo no
 * header X-XSRF-TOKEN em requisições mutáveis. Nunca usado para autenticação,
 * só como prova de origem contra CSRF (ARCHITECTURE.md §5.0).
 */
export function readCsrfCookie(): string | null {
  const prefix = `${CSRF_COOKIE_NAME}=`
  const cookie = document.cookie.split('; ').find((entry) => entry.startsWith(prefix))
  return cookie ? decodeURIComponent(cookie.slice(prefix.length)) : null
}
