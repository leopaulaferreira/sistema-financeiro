import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowDownLeft, ArrowRight, ArrowUpRight, ChartNoAxesCombined, Check, Eye, EyeOff, Loader2, Lock, Mail, Target, Wallet2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { paths } from '@/routes/paths'
import { useAuth } from '@/features/auth/auth-context'
import { ApiClientError, friendlyErrorMessage } from '@/services/api-error'
import './login-page.css'

/** Ilustração estática do produto, sem conexão com dados da conta. */
function FinancialPreview() {
  return (
    <div className="login-preview" aria-hidden="true">
      <div className="login-overview">
        <div className="login-overview-heading">
          <span><span className="login-status-dot" /> Seu dinheiro, em perspectiva</span>
          <ChartNoAxesCombined size={16} />
        </div>
        <div className="login-balance">
          <div><span className="login-preview-label">Saldo total</span><strong><small>R$</small> 12.850<span>,00</span></strong></div>
          <span className="login-growth"><ArrowUpRight size={13} /> 12,4% <span>no mês</span></span>
        </div>
        <div className="login-chart">
          <svg viewBox="0 0 480 122" fill="none" preserveAspectRatio="none">
            <defs>
              <linearGradient id="login-chart-fill" x1="0" y1="0" x2="0" y2="122" gradientUnits="userSpaceOnUse">
                <stop stopColor="#a391ff" stopOpacity=".25" />
                <stop offset="1" stopColor="#a391ff" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="login-chart-line" x1="0" y1="0" x2="480" y2="0" gradientUnits="userSpaceOnUse">
                <stop stopColor="#7461c8" /><stop offset="1" stopColor="#c8bbff" />
              </linearGradient>
            </defs>
            <path d="M0 25H480 M0 65H480 M0 105H480" stroke="white" strokeOpacity=".06" strokeDasharray="3 6" />
            <path d="M0 105C20 105 25 87 48 90S80 110 106 86S134 73 158 78S193 45 219 57S250 70 276 43S314 66 345 37S374 46 402 24S450 32 480 8V122H0Z" fill="url(#login-chart-fill)" />
            <path className="login-chart-line" d="M0 105C20 105 25 87 48 90S80 110 106 86S134 73 158 78S193 45 219 57S250 70 276 43S314 66 345 37S374 46 402 24S450 32 480 8" stroke="url(#login-chart-line)" strokeWidth="2.5" pathLength="1" />
          </svg>
          <div className="login-chart-months"><span>JAN</span><span>FEV</span><span>MAR</span><span>ABR</span><span>MAI</span><span>JUN</span></div>
        </div>
        <div className="login-cashflow">
          <div><span className="login-flow-icon"><ArrowDownLeft size={16} /></span><span>Receitas<strong>R$ 8.500,00</strong></span></div>
          <div><span className="login-flow-icon login-flow-out"><ArrowUpRight size={16} /></span><span>Despesas<strong>R$ 3.240,00</strong></span></div>
        </div>
      </div>
      <div className="login-goal">
        <span className="login-goal-icon"><Target size={18} /></span>
        <div><span>Reserva de emergência</span><strong>Mais perto do seu objetivo</strong><div className="login-goal-track"><span /></div></div>
        <span className="login-goal-percent">75%</span>
      </div>
      <span className="login-preview-caption">Uma visão do que você pode organizar. Dados ilustrativos.</span>
    </div>
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
    <div className="login-page">
      <div className="login-ambient" aria-hidden="true" />
      <header className="login-header">
        <div className="login-brand"><span className="login-brand-icon"><Wallet2 size={21} aria-hidden="true" /></span><span>finanças<span className="login-brand-period">.</span></span></div>
        <span className="login-header-note">Menos planilhas. Mais possibilidades.</span>
      </header>

      <main className="login-main">
        <section className="login-story" aria-labelledby="login-story-title">
          <div className="login-eyebrow"><span /> UM NOVO OLHAR PARA SUAS FINANÇAS</div>
          <h2 id="login-story-title">Seu dinheiro.<br /><span>Suas possibilidades.</span></h2>
          <p className="login-story-description">Clareza para o presente. Planos para o futuro.<br className="hidden sm:block" /> Organize sua vida financeira em um só lugar.</p>
          <FinancialPreview />
          <div className="login-benefits"><span><Check size={14} aria-hidden="true" /> Contas em dia</span><span><Check size={14} aria-hidden="true" /> Metas no radar</span><span><Check size={14} aria-hidden="true" /> Você no controle</span></div>
        </section>

        <section className="login-access" aria-labelledby="login-title">
          <div className="login-form-card">
            <div className="login-welcome-icon" aria-hidden="true"><ArrowUpRight size={23} /></div>
            <div className="login-form-heading">
              <span className="login-form-eyebrow">SEU PRÓXIMO PASSO COMEÇA AQUI</span>
              <h1 id="login-title">Bem-vindo de volta<span>.</span></h1>
              <p>Entre e cuide do que importa para você.</p>
            </div>

            <form onSubmit={handleSubmit} className="login-form" noValidate>
              <div className="login-field">
                <Label htmlFor="login-email">E-mail</Label>
                <div className="login-input-wrap">
                  <Mail className="login-input-icon" size={17} aria-hidden="true" />
                  <Input id="login-email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@email.com" className="login-input" />
                </div>
              </div>

              <div className="login-field">
                <Label htmlFor="login-password">Senha</Label>
                <div className="login-input-wrap">
                  <Lock className="login-input-icon" size={17} aria-hidden="true" />
                  <Input id="login-password" type={passwordVisible ? 'text' : 'password'} autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="login-input login-password-input" />
                  <button type="button" onClick={() => setPasswordVisible((visible) => !visible)} aria-label={passwordVisible ? 'Ocultar senha' : 'Mostrar senha'} aria-pressed={passwordVisible} className="login-password-toggle">
                    {passwordVisible ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </div>

              {error && <p role="alert" className="rounded-lg border border-danger/20 bg-danger/8 px-3 py-2 text-sm text-danger">{error}</p>}

              <Button type="submit" size="lg" className="login-submit" disabled={submitting} aria-busy={submitting}>
                {submitting ? <><Loader2 className="size-4 animate-spin" aria-hidden="true" /> Entrando...</> : <>Entrar <ArrowRight size={17} aria-hidden="true" /></>}
              </Button>
            </form>

            <div className="login-signup"><span>Ainda não tem conta?</span><Link to={paths.register}>Criar conta <ArrowUpRight size={14} aria-hidden="true" /></Link></div>
          </div>
          <p className="login-access-note"><Wallet2 size={14} aria-hidden="true" /> Sua vida financeira merece esse cuidado.</p>
        </section>
      </main>

      <footer className="login-footer"><span>Controle financeiro pessoal, do seu jeito.</span><span>Organize hoje. Conquiste amanhã.<span className="login-footer-spark" aria-hidden="true">✳</span></span></footer>
    </div>
  )
}
