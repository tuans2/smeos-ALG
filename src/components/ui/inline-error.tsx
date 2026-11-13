import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export interface InlineErrorProps {
  message: string
  onRetry?: () => void
  retryLabel?: string
  className?: string
}

export function InlineError({
  message,
  onRetry,
  retryLabel = "Tải lại",
  className,
}: InlineErrorProps) {
  return (
    <div
      role="alert"
      className={cn(
        "flex items-center justify-between gap-3 rounded-xl border border-danger/30 bg-danger-bg px-3.5 py-2.5 text-body-sm font-medium text-danger-text",
        className
      )}
    >
      <span>{message}</span>
      {onRetry && (
        <Button size="sm" variant="ghost" onClick={onRetry}>
          {retryLabel}
        </Button>
      )}
    </div>
  )
}
