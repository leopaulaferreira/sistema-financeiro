import { useState } from 'react'
import { Bell, Menu, PanelLeftClose, PanelLeftOpen, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { SidebarContent } from './sidebar'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { useAuth } from '@/features/auth/auth-context'
import { initials } from '@/lib/format'

interface TopbarProps {
  collapsed: boolean
  onToggleCollapsed: () => void
  title: string
}

export function Topbar({ collapsed, onToggleCollapsed, title }: TopbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const { user } = useAuth()

  return (
    <header className="sticky top-0 z-30 flex h-[72px] shrink-0 items-center gap-3 border-b border-border bg-background/92 px-4 backdrop-blur-md supports-backdrop-filter:bg-background/78 sm:px-6 lg:px-8 xl:px-10">
      <Button
        variant="ghost"
        size="icon"
        className="hidden text-text-tertiary lg:inline-flex"
        onClick={onToggleCollapsed}
        aria-label={collapsed ? 'Expandir menu lateral' : 'Recolher menu lateral'}
      >
        {collapsed ? <PanelLeftOpen className="size-[18px]" /> : <PanelLeftClose className="size-[18px]" />}
      </Button>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <Button
          variant="ghost"
          size="icon"
          className="text-text-secondary lg:hidden"
          onClick={() => setMobileOpen(true)}
          aria-label="Abrir menu"
        >
          <Menu className="size-[18px]" />
        </Button>
        <SheetContent side="left" className="border-sidebar-border bg-sidebar p-0 text-sidebar-foreground">
          <SheetTitle className="sr-only">Menu de navegação</SheetTitle>
          <SidebarContent onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="hidden min-w-0 items-center gap-2 sm:flex">
        <span className="text-xs font-medium text-text-tertiary">Finanças</span>
        <span className="text-text-tertiary/50">/</span>
        <h1 className="truncate text-sm font-semibold text-foreground">{title}</h1>
      </div>
      <h1 className="truncate text-base font-semibold tracking-tight text-foreground sm:hidden">{title}</h1>

      <div className="ml-auto flex items-center gap-2">
        <div className="relative hidden md:block">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-tertiary" aria-hidden />
          <Input
            type="search"
            placeholder="Buscar transações..."
            aria-label="Buscar transações"
            className="w-56 border-border bg-surface-subtle pl-9 lg:w-72"
          />
        </div>
        <Button variant="ghost" size="icon" className="text-text-tertiary" aria-label="Notificações">
          <Bell className="size-[18px]" />
        </Button>
        <Avatar className="size-9 border border-accent-primary/20">
          <AvatarFallback className="bg-accent-primary/14 text-xs font-semibold text-accent-primary">
            {initials(user?.name ?? '?')}
          </AvatarFallback>
        </Avatar>
      </div>
    </header>
  )
}
