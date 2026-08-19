import { Outlet } from 'react-router-dom'
import { Wallet2 } from 'lucide-react'

export function AuthLayout() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-2">
          <div className="flex size-11 items-center justify-center rounded-xl bg-accent-primary/15 text-accent-primary">
            <Wallet2 className="size-6" />
          </div>
          <span className="text-lg font-semibold tracking-tight text-foreground">Finanças</span>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-6 shadow-[0_1px_0_0_rgba(255,255,255,0.03)_inset,0_20px_40px_-24px_rgba(0,0,0,0.6)] sm:p-8">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
