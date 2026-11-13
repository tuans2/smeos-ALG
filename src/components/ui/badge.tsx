import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

export const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-caption font-semibold transition-colors select-none",
  {
    variants: {
      tone: {
        success: "bg-success-bg text-success-text border border-success/30",
        warning: "bg-warning-bg text-warning-text border border-warning/30",
        danger: "bg-danger-bg text-danger-text border border-danger/30",
        accent: "bg-selected text-selected-text border border-primary/30",
        info: "bg-primary-muted text-primary border border-primary/30",
        neutral: "bg-surface-alt text-text-muted border border-border",
      },
      size: {
        default: "text-caption px-2.5 py-0.5",
        sm: "text-[10px] px-2 py-0.2",
      },
    },
    defaultVariants: {
      tone: "neutral",
      size: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, tone, size, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ tone, size }), className)} {...props} />
}
