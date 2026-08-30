import { cn } from "@/lib/utils"

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("animate-pulse rounded-lg bg-[linear-gradient(90deg,var(--surface-hover),color-mix(in_oklch,var(--surface-hover),var(--foreground)_4%),var(--surface-hover))] bg-[length:200%_100%]", className)}
      {...props}
    />
  )
}

export { Skeleton }
