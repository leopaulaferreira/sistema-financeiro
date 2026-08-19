import { createContext, use, useCallback, useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { authService } from '@/services/auth-service'
import { setUnauthorizedHandler } from '@/services/api-client'
import type { User } from '@/types/auth'
import type { LoginRequest, RegisterRequest } from '@/types/requests'

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated'

interface AuthContextValue {
  user: User | null
  status: AuthStatus
  login: (data: LoginRequest) => Promise<void>
  register: (data: RegisterRequest) => Promise<User>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [status, setStatus] = useState<AuthStatus>('loading')
  const queryClient = useQueryClient()

  const clearSession = useCallback(() => {
    setUser(null)
    setStatus('unauthenticated')
    queryClient.clear()
  }, [queryClient])

  useEffect(() => {
    setUnauthorizedHandler(clearSession)
    authService
      .me()
      .then((me) => {
        setUser(me)
        setStatus('authenticated')
      })
      .catch(() => {
        setUser(null)
        setStatus('unauthenticated')
      })
    return () => setUnauthorizedHandler(null)
  }, [clearSession])

  const login = useCallback(async (data: LoginRequest) => {
    const me = await authService.login(data)
    setUser(me)
    setStatus('authenticated')
  }, [])

  const register = useCallback((data: RegisterRequest) => authService.register(data), [])

  const logout = useCallback(async () => {
    try {
      await authService.logout()
    } catch {
      // best-effort — o estado local é limpo de qualquer forma abaixo.
    }
    clearSession()
  }, [clearSession])

  return <AuthContext value={{ user, status, login, register, logout }}>{children}</AuthContext>
}

export function useAuth(): AuthContextValue {
  const ctx = use(AuthContext)
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider')
  return ctx
}
