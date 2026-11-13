import { Skeleton } from "@/components/ui/skeleton"

export default function PlatformLoading() {
  return (
    <div role="status" aria-label="Đang tải Console" className="flex flex-col gap-[14px] p-6 max-w-7xl mx-auto w-full">
      <span className="sr-only">Đang tải Console</span>
      <Skeleton className="h-16 w-full rounded-2xl" />
      <Skeleton className="h-24 w-full rounded-2xl" />
      <Skeleton className="h-24 w-full rounded-2xl" />
      <Skeleton className="h-24 w-full rounded-2xl" />
    </div>
  )
}
