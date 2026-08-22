import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { SidebarContent } from './sidebar'
import { Topbar } from './topbar'
import { paths } from '@/routes/paths'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Footer } from '@/components/common/footer'

const pageTitles: Record<string, string> = {
  [paths.dashboard]: 'Dashboard',
  [paths.transactions]: 'Transações',
  [paths.accounts]: 'Contas',
  [paths.categories]: 'Categorias',
  [paths.paymentMethods]: 'Métodos de pagamento',
  [paths.budgets]: 'Orçamentos',
  [paths.goals]: 'Metas',
  [paths.reports]: 'Relatórios',
  [paths.settings]: 'Configurações',
}

export function AppLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const location = useLocation()
  const title = pageTitles[location.pathname] ?? 'Finanças'

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex min-h-screen bg-background">
        <aside
          className={cn(
            'sticky top-0 hidden h-screen shrink-0 border-r border-sidebar-border bg-sidebar transition-[width] duration-200 lg:block',
            collapsed ? 'w-[72px]' : 'w-64',
          )}
        >
          <SidebarContent collapsed={collapsed} />
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar collapsed={collapsed} onToggleCollapsed={() => setCollapsed((c) => !c)} title={title} />
          <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
            <div className="mx-auto w-full max-w-[1600px]">
              <Outlet />
            </div>
          </main>
          <Footer />
        </div>
      </div>
    </TooltipProvider>
  )
}
