import { apiClient } from './api-client'
import type { User } from '@/types/auth'
import type { LoginRequest, RegisterRequest } from '@/types/requests'

export const authService = {
  // login/register: um 401 aqui é uma resposta de negócio (credenciais
  // inválidas / e-mail duplicado), não uma sessão expirada — skipAuthRetry
  // evita mascarar isso com uma tentativa de refresh sem sentido.
  register: (data: RegisterRequest) => apiClient.post<User>('/api/auth/register', data, { skipAuthRetry: true }),
  login: (data: LoginRequest) => apiClient.post<User>('/api/auth/login', data, { skipAuthRetry: true }),
  // logout: diferente do login, um 401 aqui nunca é uma resposta de negócio
  // válida — deixa o retry normal (refresh-e-repete) agir, senão um 401
  // espúrio (token XSRF de uso único já consumido por uma mutação anterior)
  // deixaria os cookies HttpOnly vivos no servidor sem revogar o refresh token.
  logout: () => apiClient.post<void>('/api/auth/logout'),
  me: () => apiClient.get<User>('/api/auth/me'),
}
