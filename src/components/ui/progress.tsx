import { cn } from "@/lib/utils"

export function Progress({
  value,
  className,
  barClassName,
}: {
  value: number
  className?: string
  barClassName?: string
}) {
  const pct = Math.max(0, Math.min(100, value))
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-surface-alt", className)}>
      <div
        className={cn("h-full rounded-full bg-primary transition-[width]", barClassName)}
        style={{ width: pct + "%" }}
      />
    </div>
  )
}
