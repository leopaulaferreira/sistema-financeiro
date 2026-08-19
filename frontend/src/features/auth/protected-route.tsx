import { Navigate, Outlet } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useAuth } from './auth-context'
import { paths } from '@/routes/paths'

function FullPageSpinner() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Loader2 className="size-6 animate-spin text-text-secondary" aria-label="Carregando" />
    </div>
  )
}

/** Bloqueia rotas autenticadas até a sessão ser resolvida via GET /api/auth/me. */
export function ProtectedRoute() {
  const { status } = useAuth()

  if (status === 'loading') return <FullPageSpinner />
  if (status === 'unauthenticated') return <Navigate to={paths.login} replace />
  return <Outlet />
}

/** Evita que um usuário já autenticado veja login/registro — manda direto pro dashboard. */
export function PublicOnlyRoute() {
  const { status } = useAuth()

  if (status === 'loading') return <FullPageSpinner />
  if (status === 'authenticated') return <Navigate to={paths.dashboard} replace />
  return <Outlet />
}
