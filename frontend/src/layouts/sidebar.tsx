import { NavLink, useNavigate } from 'react-router-dom'
import { LogOut, Settings, Wallet2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { navItems } from './nav-items'
import { paths } from '@/routes/paths'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Separator } from '@/components/ui/separator'
import { useAuth } from '@/features/auth/auth-context'
import { initials } from '@/lib/format'

interface SidebarContentProps {
  collapsed?: boolean
  onNavigate?: () => void
}

export function SidebarContent({ collapsed = false, onNavigate }: SidebarContentProps) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    onNavigate?.()
    logout().finally(() => navigate(paths.login))
  }

  return (
    <div className="flex h-full flex-col">
      <div className={cn('flex h-[72px] shrink-0 items-center gap-3 px-5', collapsed && 'justify-center px-0')}>
        <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-accent-primary/20 bg-accent-primary/12 text-accent-primary shadow-[0_8px_20px_-12px_var(--accent-primary)]">
          <Wallet2 className="size-[18px]" />
        </div>
        {!collapsed && (
          <span className="flex min-w-0 flex-col">
            <span className="text-sm font-semibold tracking-[-0.01em] text-foreground">Finanças</span>
            <span className="text-[0.6875rem] text-text-tertiary">Controle financeiro</span>
          </span>
        )}
      </div>

      <Separator className="opacity-60" />

      <nav className="flex-1 overflow-y-auto scrollbar-thin px-3 py-5">
        {!collapsed && (
          <p className="mb-2 px-3 text-[0.625rem] font-semibold tracking-[0.12em] text-text-tertiary uppercase">
            Navegação
          </p>
        )}
        <ul className="flex flex-col gap-1.5">
          {navItems.map((item) => (
            <li key={item.to}>
              <SidebarLink item={item} collapsed={collapsed} onNavigate={onNavigate} />
            </li>
          ))}
        </ul>
      </nav>

      <Separator className="opacity-60" />

      <div className="flex flex-col gap-1.5 px-3 py-4">
        <SidebarLink
          item={{ to: paths.settings, label: 'Configurações', icon: Settings }}
          collapsed={collapsed}
          onNavigate={onNavigate}
        />

        <FooterItem collapsed={collapsed}>
          <button
            type="button"
            onClick={handleLogout}
            className={cn(
              'flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-text-secondary transition-[color,background-color] duration-200 hover:bg-surface-hover/70 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/45',
              collapsed && 'justify-center px-0',
            )}
          >
            <Avatar className="size-8 shrink-0 border border-border-strong">
              <AvatarFallback className="bg-accent-secondary/15 text-xs font-semibold text-accent-secondary">
                {initials(user?.name ?? '?')}
              </AvatarFallback>
            </Avatar>
            {!collapsed && (
              <span className="flex min-w-0 flex-1 flex-col text-left">
                <span className="truncate text-sm font-medium text-foreground">{user?.name}</span>
                <span className="truncate text-[0.6875rem] text-text-tertiary">{user?.email}</span>
              </span>
            )}
            {!collapsed && <LogOut className="size-4 shrink-0 text-text-secondary" aria-hidden />}
          </button>
        </FooterItem>
      </div>
    </div>
  )
}

function FooterItem({ collapsed, children }: { collapsed: boolean; children: React.ReactNode }) {
  if (!collapsed) return children
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="right">Sair</TooltipContent>
    </Tooltip>
  )
}

interface SidebarLinkProps {
  item: { to: string; label: string; icon: React.ComponentType<{ className?: string }>; end?: boolean }
  collapsed: boolean
  onNavigate?: () => void
}

function SidebarLink({ item, collapsed, onNavigate }: SidebarLinkProps) {
  const Icon = item.icon
  const link = (
    <NavLink
      to={item.to}
      end={item.end}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          'relative flex min-h-10 items-center gap-3 overflow-hidden rounded-xl px-3 py-2 text-sm font-medium text-text-secondary transition-[color,background-color] duration-200 hover:bg-surface-hover/65 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/45',
          collapsed && 'justify-center px-0',
          isActive && 'bg-accent-primary/12 text-accent-primary before:absolute before:inset-y-2 before:left-0 before:w-0.5 before:rounded-full before:bg-accent-primary hover:bg-accent-primary/16 hover:text-accent-primary',
        )
      }
    >
      <Icon className="size-[17px] shrink-0" aria-hidden />
      {!collapsed && <span className="truncate">{item.label}</span>}
    </NavLink>
  )

  if (!collapsed) return link

  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right">{item.label}</TooltipContent>
    </Tooltip>
  )
}
