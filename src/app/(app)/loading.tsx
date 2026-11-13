import { SkeletonBlock } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <div className="flex flex-col gap-3.5 p-6 max-w-7xl mx-auto w-full">
      <SkeletonBlock lines={4} label="Đang tải nội dung" />
    </div>
  )
}
