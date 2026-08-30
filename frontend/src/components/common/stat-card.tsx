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
  neutral: 'border-accent-primary/15 bg-accent-primary/10 text-accent-primary',
  success: 'border-success/15 bg-success/9 text-success',
  danger: 'border-danger/15 bg-danger/9 text-danger',
}

const toneAccents: Record<NonNullable<StatCardProps['tone']>, string> = {
  neutral: 'bg-accent-primary',
  success: 'bg-success',
  danger: 'bg-danger',
}

export function StatCard({ label, value, icon: Icon, tone = 'neutral', hint }: StatCardProps) {
  return (
    <Card className="relative py-0 transition-[border-color,transform] duration-200 hover:-translate-y-0.5 hover:border-border-strong">
      <span className={cn('absolute inset-y-5 left-0 w-0.5 rounded-r-full', toneAccents[tone])} aria-hidden />
      <CardContent className="flex min-h-32 items-start justify-between gap-4 p-5 pl-6">
        <div className="flex min-w-0 flex-col gap-2">
          <span className="text-[0.6875rem] font-semibold tracking-[0.055em] text-text-secondary uppercase">{label}</span>
          <span className="financial-value truncate text-2xl font-semibold text-foreground sm:text-[1.625rem]">{value}</span>
          {hint && <span className="text-xs text-text-tertiary">{hint}</span>}
        </div>
        <div className={cn('flex size-10 shrink-0 items-center justify-center rounded-xl border', toneStyles[tone])}>
          <Icon className="size-[18px]" aria-hidden />
        </div>
      </CardContent>
    </Card>
  )
}
