import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-24 w-full rounded-lg border border-input bg-surface-subtle px-3 py-2.5 text-base text-foreground shadow-[0_1px_0_oklch(1_0_0/0.025)_inset] transition-[color,background-color,border-color,box-shadow] duration-200 outline-none placeholder:text-text-tertiary hover:border-border-strong focus-visible:border-accent-primary/65 focus-visible:bg-surface focus-visible:ring-2 focus-visible:ring-ring/35 disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20 md:text-sm dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
