import * as React from "react"
import { cn } from "@/lib/utils"

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "flat" | "elevated" | "interactive"
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  function Card({ className, variant = "default", ...props }, ref) {
    const variantClasses = {
      default: "border border-border bg-surface shadow-[var(--shadow-card)]",
      flat: "border border-border/60 bg-surface-alt shadow-[var(--shadow-subtle)]",
      elevated: "border border-border bg-surface shadow-[var(--shadow-dialog)]",
      interactive: "border border-border bg-surface hover:border-primary/50 shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-dialog)] transition-all cursor-pointer",
    }

    return (
      <div
        ref={ref}
        className={cn("rounded-[var(--radius-card)]", variantClasses[variant], className)}
        {...props}
      />
    )
  }
)
Card.displayName = "Card"

export const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  function CardHeader({ className, ...props }, ref) {
    return <div ref={ref} className={cn("flex flex-col space-y-1.5 p-5 sm:p-6", className)} {...props} />
  }
)
CardHeader.displayName = "CardHeader"

export const CardTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  function CardTitle({ className, ...props }, ref) {
    return <h3 ref={ref} className={cn("text-title font-bold text-text tracking-tight", className)} {...props} />
  }
)
CardTitle.displayName = "CardTitle"

export const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  function CardDescription({ className, ...props }, ref) {
    return <p ref={ref} className={cn("text-body-sm text-text-muted", className)} {...props} />
  }
)
CardDescription.displayName = "CardDescription"

export const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  function CardContent({ className, ...props }, ref) {
    return <div ref={ref} className={cn("p-5 sm:p-6 pt-0", className)} {...props} />
  }
)
CardContent.displayName = "CardContent"

export const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  function CardFooter({ className, ...props }, ref) {
    return <div ref={ref} className={cn("flex items-center p-5 sm:p-6 pt-0 border-t border-border/40 mt-4", className)} {...props} />
  }
)
CardFooter.displayName = "CardFooter"
