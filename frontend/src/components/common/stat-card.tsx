import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'

interface StatCardProps {
  label: string
  value: string
  icon: LucideIcon
  tone?: 'neutral' | 'success' | 'danger'
  hint?: string
}

const toneStyles: Record<NonNullable<StatCardProps['tone']>, string> = {
  neutral: 'bg-accent-primary/12 text-accent-primary',
  success: 'bg-success/12 text-success',
  danger: 'bg-danger/12 text-danger',
}

export function StatCard({ label, value, icon: Icon, tone = 'neutral', hint }: StatCardProps) {
  return (
    <Card className="border-border bg-surface py-0 shadow-none">
      <CardContent className="flex items-start justify-between gap-3 p-5">
        <div className="flex min-w-0 flex-col gap-1.5">
          <span className="text-sm text-text-secondary">{label}</span>
          <span className="truncate text-2xl font-semibold tracking-tight text-foreground">{value}</span>
          {hint && <span className="text-xs text-text-secondary">{hint}</span>}
        </div>
        <div className={cn('flex size-9 shrink-0 items-center justify-center rounded-lg', toneStyles[tone])}>
          <Icon className="size-[18px]" aria-hidden />
        </div>
      </CardContent>
    </Card>
  )
}
