import { cn } from "@/lib/utils"

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn("animate-pulse motion-reduce:animate-none rounded-lg bg-surface-alt", className)} />
}

/** Khối nhiều dòng giữ chỗ + một nhãn cho trình đọc màn hình. */
export function SkeletonBlock({ lines = 3, label = "Đang tải" }: { lines?: number; label?: string }) {
  return (
    <div role="status" className="flex flex-col gap-2">
      <span className="sr-only">{label}</span>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className="h-4" />
      ))}
    </div>
  )
}
