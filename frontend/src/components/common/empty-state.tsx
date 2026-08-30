import type { LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex min-h-52 flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border-strong bg-surface-subtle/45 px-6 py-12 text-center">
      <div className="flex size-12 items-center justify-center rounded-xl border border-border bg-surface-hover/65 text-text-secondary shadow-[0_1px_0_oklch(1_0_0/0.03)_inset]">
        <Icon className="size-5" strokeWidth={1.75} aria-hidden />
      </div>
      <div>
        <p className="text-sm font-semibold text-foreground">{title}</p>
        {description && <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-text-secondary">{description}</p>}
      </div>
      {action}
    </div>
  )
}
