import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Loader2, Lock, Mail, TrendingUp, Wallet2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { paths } from '@/routes/paths'
import { useAuth } from '@/features/auth/auth-context'
import { ApiClientError, friendlyErrorMessage } from '@/services/api-error'

/**
 * Sparkline puramente decorativo — traçado fixo, não deriva de nenhum dado
 * real da conta. Existe só para sugerir "produto financeiro" no painel de
 * marca, então nunca deve ler de API/contexto.
 */
function DecorativeSparkline() {
  return (
    <svg viewBox="0 0 240 72" fill="none" className="h-16 w-full" aria-hidden="true">
      <defs>
        <linearGradient id="sparkline-stroke" x1="0" y1="0" x2="240" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="oklch(0.78 0.12 210)" />
          <stop offset="100%" stopColor="oklch(0.71 0.17 292)" />
        </linearGradient>
        <linearGradient id="sparkline-fill" x1="0" y1="0" x2="0" y2="72" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="oklch(0.67 0.185 292)" stopOpacity="0.22" />
          <stop offset="100%" stopColor="oklch(0.67 0.185 292)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d="M0 52 L28 46 L56 55 L84 34 L112 40 L140 20 L168 28 L196 10 L240 16"
        stroke="url(#sparkline-stroke)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M0 52 L28 46 L56 55 L84 34 L112 40 L140 20 L168 28 L196 10 L240 16 L240 72 L0 72 Z"
        fill="url(#sparkline-fill)"
      />
    </svg>
  )
}

/** Grade de pontos sutil ao fundo do painel de marca — puramente ornamental. */
function DecorativeDotGrid() {
  return (
    <svg className="absolute inset-0 h-full w-full opacity-[0.14]" aria-hidden="true">
      <defs>
        <pattern id="login-dot-grid" width="28" height="28" patternUnits="userSpaceOnUse">
          <circle cx="1.5" cy="1.5" r="1.5" fill="oklch(0.965 0.006 270)" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#login-dot-grid)" />
    </svg>
  )
}

function BrandingPanel() {
  return (
    <aside
      aria-hidden="true"
      className="relative hidden overflow-hidden bg-background lg:flex lg:w-[52%] lg:flex-col lg:justify-between lg:p-12 xl:p-16"
    >
      {/* Camadas de profundidade: gradiente radial extremamente sutil + glows pontuais */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(60% 55% at 18% 12%, color-mix(in oklch, var(--accent-primary) 16%, transparent), transparent), radial-gradient(45% 40% at 85% 88%, color-mix(in oklch, var(--accent-secondary) 12%, transparent), transparent)',
        }}
      />
      <DecorativeDotGrid />
      <div className="pointer-events-none absolute top-1/4 -left-24 size-72 rounded-full bg-accent-primary/18 blur-[110px]" />
      <div className="pointer-events-none absolute -right-20 bottom-1/4 size-64 rounded-full bg-accent-secondary/14 blur-[110px]" />

      {/* Linhas finas sugerindo eixos/grid de gráfico, bem discretas */}
      <svg className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.08]" aria-hidden="true">
        <line x1="0" y1="30%" x2="100%" y2="30%" stroke="oklch(0.965 0.006 270)" strokeWidth="1" />
        <line x1="0" y1="68%" x2="100%" y2="68%" stroke="oklch(0.965 0.006 270)" strokeWidth="1" />
        <line x1="22%" y1="0" x2="22%" y2="100%" stroke="oklch(0.965 0.006 270)" strokeWidth="1" />
      </svg>

      <div className="relative flex animate-in fade-in-0 slide-in-from-left-2 items-center gap-2.5 duration-700">
        <div className="flex size-10 items-center justify-center rounded-xl border border-accent-primary/25 bg-accent-primary/12 text-accent-primary shadow-[0_12px_28px_-16px_var(--accent-primary)]">
          <Wallet2 className="size-5" />
        </div>
        <span className="text-base font-semibold tracking-[-0.02em] text-foreground">Finanças</span>
      </div>

      <div className="relative flex animate-in fade-in-0 slide-in-from-left-2 max-w-md flex-col gap-4 duration-700 [animation-delay:100ms] [animation-fill-mode:backwards]">
        <h2 className="text-3xl leading-[1.15] font-semibold tracking-[-0.03em] text-balance text-foreground xl:text-4xl">
          Tenha clareza sobre o seu dinheiro.
        </h2>
        <p className="text-sm leading-relaxed text-text-secondary">
          Contas, transações e metas em um só lugar — visão completa das suas finanças, sem planilhas.
        </p>

        <div className="mt-4 w-full max-w-[15.5rem] rounded-2xl border border-white/8 bg-white/[0.03] p-4 shadow-[var(--shadow-card)] backdrop-blur-sm">
          <div className="flex items-center justify-between gap-2 text-[0.6875rem] text-text-tertiary">
            <span className="flex items-center gap-1">
              <TrendingUp className="size-3 text-accent-secondary" />
              Evolução
            </span>
            <span className="text-success">+12,4%</span>
          </div>
          <DecorativeSparkline />
        </div>
      </div>

      <p className="relative animate-in fade-in-0 text-xs text-text-tertiary duration-700 [animation-delay:150ms] [animation-fill-mode:backwards]">
        Controle financeiro pessoal
      </p>
    </aside>
  )
}

function PasswordToggle({ visible, onToggle }: { visible: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'}
      aria-pressed={visible}
      className="absolute top-1/2 right-1 flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-text-tertiary transition-colors hover:text-text-secondary focus-visible:text-foreground focus-visible:ring-2 focus-visible:ring-ring/45 focus-visible:outline-none"
    >
      {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
    </button>
  )
}

export function LoginPage() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [email, setEmail] = useState('user@gmail.com')
  const [password, setPassword] = useState('123456789')
  const [passwordVisible, setPasswordVisible] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    login({ email, password })
      .then(() => navigate(paths.dashboard))
      .catch((err: unknown) => {
        setError(err instanceof ApiClientError && err.status === 401 ? err.message : friendlyErrorMessage(err))
      })
      .finally(() => setSubmitting(false))
  }

  return (
    <div className="flex min-h-screen w-full bg-background">
      <BrandingPanel />

      <div className="flex flex-1 flex-col justify-center px-6 py-10 sm:px-10 lg:px-12 xl:px-20">
        <div className="mx-auto w-full max-w-[23rem] animate-in fade-in-0 slide-in-from-bottom-2 duration-500">
          <div className="mb-8 flex flex-col items-center gap-2.5 lg:hidden">
            <div className="flex size-12 items-center justify-center rounded-2xl border border-accent-primary/20 bg-accent-primary/12 text-accent-primary shadow-[0_12px_28px_-16px_var(--accent-primary)]">
              <Wallet2 className="size-5" />
            </div>
            <span className="text-lg font-semibold tracking-[-0.02em] text-foreground">Finanças</span>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-semibold tracking-[-0.03em] text-foreground">Bem-vindo de volta</h1>
            <p className="mt-2 text-sm text-text-secondary">Entre na sua conta para continuar.</p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
            <div className="flex flex-col gap-2">
              <Label htmlFor="login-email">E-mail</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-text-tertiary" />
                <Input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="voce@email.com"
                  className="h-11 pl-10"
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="login-password">Senha</Label>
              <div className="relative">
                <Lock className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-text-tertiary" />
                <Input
                  id="login-password"
                  type={passwordVisible ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="h-11 pr-10 pl-10"
                />
                <PasswordToggle visible={passwordVisible} onToggle={() => setPasswordVisible((v) => !v)} />
              </div>
            </div>

            {error && (
              <p
                role="alert"
                className="animate-in fade-in-0 slide-in-from-top-1 rounded-lg border border-danger/20 bg-danger/8 px-3 py-2 text-sm text-danger duration-300"
              >
                {error}
              </p>
            )}

            <Button type="submit" size="lg" className="mt-1 w-full" disabled={submitting} aria-busy={submitting}>
              {submitting && <Loader2 className="size-4 animate-spin" />}
              Entrar
            </Button>
          </form>

          <p className="mt-8 text-center text-sm text-text-secondary">
            Ainda não tem conta?{' '}
            <Link to={paths.register} className="font-medium text-accent-primary hover:underline">
              Criar conta
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
