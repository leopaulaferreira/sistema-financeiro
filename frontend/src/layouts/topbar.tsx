import { useState } from 'react'
import { Bell, Menu, PanelLeftClose, PanelLeftOpen, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { SidebarContent } from './sidebar'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

interface TopbarProps {
  collapsed: boolean
  onToggleCollapsed: () => void
  title: string
}

export function Topbar({ collapsed, onToggleCollapsed, title }: TopbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b border-border bg-background/95 px-4 backdrop-blur supports-backdrop-filter:bg-background/80 sm:px-6">
      <Button
        variant="ghost"
        size="icon"
        className="hidden lg:inline-flex"
        onClick={onToggleCollapsed}
        aria-label={collapsed ? 'Expandir menu lateral' : 'Recolher menu lateral'}
      >
        {collapsed ? <PanelLeftOpen className="size-[18px]" /> : <PanelLeftClose className="size-[18px]" />}
      </Button>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={() => setMobileOpen(true)}
          aria-label="Abrir menu"
        >
          <Menu className="size-[18px]" />
        </Button>
        <SheetContent side="left" className="w-72 border-sidebar-border bg-sidebar p-0 text-sidebar-foreground">
          <SheetTitle className="sr-only">Menu de navegação</SheetTitle>
          <SidebarContent onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      <h1 className="truncate text-lg font-semibold tracking-tight text-foreground">{title}</h1>

      <div className="ml-auto flex items-center gap-2">
        <div className="relative hidden sm:block">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-text-secondary" aria-hidden />
          <Input
            type="search"
            placeholder="Buscar transações..."
            aria-label="Buscar transações"
            className="w-56 border-border bg-surface pl-8 lg:w-72"
          />
        </div>
        <Button variant="ghost" size="icon" aria-label="Notificações">
          <Bell className="size-[18px]" />
        </Button>
        <Avatar className="size-8">
          <AvatarFallback className="bg-accent-primary/20 text-xs font-medium text-accent-primary">LP</AvatarFallback>
        </Avatar>
      </div>
    </header>
  )
}
