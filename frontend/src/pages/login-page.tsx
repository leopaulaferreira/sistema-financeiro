import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { paths } from '@/routes/paths'

export function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setTimeout(() => navigate(paths.dashboard), 500)
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-lg font-semibold tracking-tight text-foreground">Entrar</h1>
        <p className="mt-1 text-sm text-text-secondary">Acesse sua conta para continuar.</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="login-email">E-mail</Label>
          <Input
            id="login-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="voce@email.com"
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="login-password">Senha</Label>
          <Input
            id="login-password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
        </div>

        <Button type="submit" className="mt-2 w-full" disabled={submitting}>
          {submitting && <Loader2 className="size-4 animate-spin" />}
          Entrar
        </Button>
      </form>

      <p className="text-center text-sm text-text-secondary">
        Ainda não tem conta?{' '}
        <Link to={paths.register} className="font-medium text-accent-primary hover:underline">
          Criar conta
        </Link>
      </p>
    </div>
  )
}
