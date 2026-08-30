import { cn } from '@/lib/utils'

interface ProgressBarProps {
  /** Percentual real, sem cap — pode passar de 100 (a barra em si é sempre visualmente limitada a 100%). */
  percentage: number
  variant?: 'success' | 'warning' | 'danger'
  className?: string
}

export function ProgressBar({ percentage, variant = 'success', className }: ProgressBarProps) {
  const clamped = Math.min(Math.max(percentage, 0), 100)
  const colorClass = variant === 'danger' ? 'bg-danger' : variant === 'warning' ? 'bg-warning' : 'bg-success'

  return (
    <div
      className={cn('h-1.5 w-full overflow-hidden rounded-full bg-surface-hover', className)}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(clamped)}
    >
      <div className={cn('h-full rounded-full transition-[width] duration-200 ease-out', colorClass)} style={{ width: `${clamped}%` }} />
    </div>
  )
}
