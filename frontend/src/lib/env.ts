const DEV_FALLBACK_API_URL = 'http://localhost:8080'

/**
 * Fase 10 §14: em produção o frontend chama `/api` na mesma origem (Nginx
 * faz proxy para o backend) — não é preciso configurar VITE_API_URL nesse
 * caso, `window.location.origin` já resolve para a origem certa. Isso
 * simplifica CORS/cookies/CSRF/HTTPS (tudo same-origin) e evita hardcodar
 * um domínio de produção no bundle. VITE_API_URL continua aceita como
 * override explícito, caso um dia backend/frontend precisem ficar em
 * origens diferentes.
 */
function resolveApiUrl(): string {
  const configured = import.meta.env.VITE_API_URL
  if (configured) return configured

  if (import.meta.env.PROD) return window.location.origin

  return DEV_FALLBACK_API_URL
}

export const API_URL = resolveApiUrl()
