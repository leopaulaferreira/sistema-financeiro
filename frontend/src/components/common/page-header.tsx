interface PageHeaderProps {
  title: string
  description?: string
  actions?: React.ReactNode
}

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div className="mb-1 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h2 className="text-2xl font-semibold tracking-[-0.03em] text-foreground sm:text-[1.75rem] sm:leading-9">{title}</h2>
        {description && <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-text-secondary">{description}</p>}
      </div>
      {actions && <div className="flex w-full shrink-0 items-center gap-2 sm:w-auto">{actions}</div>}
    </div>
  )
}
