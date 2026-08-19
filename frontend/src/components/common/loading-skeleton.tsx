import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent } from '@/components/ui/card'

export function StatCardSkeleton() {
  return (
    <Card className="border-border bg-surface py-0 shadow-none">
      <CardContent className="flex items-start justify-between gap-3 p-5">
        <div className="flex flex-1 flex-col gap-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-7 w-32" />
        </div>
        <Skeleton className="size-9 shrink-0 rounded-lg" />
      </CardContent>
    </Card>
  )
}

export function ChartSkeleton({ height = 300 }: { height?: number }) {
  return <Skeleton className="w-full rounded-xl" style={{ height }} />
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-11 w-full rounded-lg" />
      ))}
    </div>
  )
}
