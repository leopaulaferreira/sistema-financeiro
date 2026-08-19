const DEV_FALLBACK_API_URL = 'http://localhost:8080'

function resolveApiUrl(): string {
  const configured = import.meta.env.VITE_API_URL
  if (configured) return configured

  if (import.meta.env.PROD) {
    throw new Error(
      'VITE_API_URL não foi definida no build de produção. Configure a variável de ambiente antes do deploy.',
    )
  }

  return DEV_FALLBACK_API_URL
}

export const API_URL = resolveApiUrl()
