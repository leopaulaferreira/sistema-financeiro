import { Outlet } from 'react-router-dom'
import { Wallet2 } from 'lucide-react'
import { Footer } from '@/components/common/footer'

export function AuthLayout() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-[25rem]">
        <div className="mb-8 flex flex-col items-center gap-2.5">
          <div className="flex size-12 items-center justify-center rounded-2xl border border-accent-primary/20 bg-accent-primary/12 text-accent-primary shadow-[0_12px_28px_-16px_var(--accent-primary)]">
            <Wallet2 className="size-5" />
          </div>
          <span className="text-lg font-semibold tracking-[-0.02em] text-foreground">Finanças</span>
          <span className="text-xs text-text-tertiary">Controle financeiro pessoal</span>
        </div>

        <div className="rounded-2xl border border-border-strong bg-surface p-6 shadow-[var(--shadow-elevated)] sm:p-8">
          <Outlet />
        </div>
      </div>

      <Footer />
    </div>
  )
}
