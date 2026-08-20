import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { paths } from '@/routes/paths'
import { useAuth } from '@/features/auth/auth-context'
import { ApiClientError, friendlyErrorMessage } from '@/services/api-error'

export function RegisterPage() {
  const navigate = useNavigate()
  const { register } = useAuth()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirmPassword) {
      setError('As senhas não coincidem.')
      return
    }
    setError('')
    setSubmitting(true)
    register({ name, email, password })
      .then(() => {
        toast.success('Conta criada com sucesso.', { description: 'Faça login para continuar.' })
        navigate(paths.login)
      })
      .catch((err: unknown) => {
        setError(err instanceof ApiClientError && (err.status === 400 || err.status === 409) ? err.message : friendlyErrorMessage(err))
      })
      .finally(() => setSubmitting(false))
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-lg font-semibold tracking-tight text-foreground">Criar conta</h1>
        <p className="mt-1 text-sm text-text-secondary">Leva menos de um minuto.</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="register-name">Nome</Label>
          <Input id="register-name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome" />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="register-email">E-mail</Label>
          <Input
            id="register-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="voce@email.com"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-2">
            <Label htmlFor="register-password">Senha</Label>
            <Input
              id="register-password"
              type="password"
              autoComplete="new-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="register-confirm-password">Confirmar</Label>
            <Input
              id="register-confirm-password"
              type="password"
              autoComplete="new-password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
        </div>

        {error && <p className="text-xs text-danger">{error}</p>}

        <Button type="submit" className="mt-2 w-full" disabled={submitting}>
          {submitting && <Loader2 className="size-4 animate-spin" />}
          Criar conta
        </Button>
      </form>

      <p className="text-center text-sm text-text-secondary">
        Já tem conta?{' '}
        <Link to={paths.login} className="font-medium text-accent-primary hover:underline">
          Entrar
        </Link>
      </p>
    </div>
  )
}
