import type { ReactNode } from "react"
import Link from "next/link"
import { Clock } from "@/components/ui/icon-set/clock"
import { COMING_SOON_LABEL, isRouteLocked } from "@/lib/feature-lock"

/**
 * Bọc layout của tuyến bị khóa: production → màn "Sắp ra mắt", còn lại → nội dung thật.
 * Chặn cả khi người dùng gõ thẳng URL.
 */
export function FeatureLockedGuard({ route, children }: { route: string; children: ReactNode }) {
  if (!isRouteLocked(route)) return <>{children}</>

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-selected text-primary">
        <Clock className="h-6 w-6" aria-hidden="true" />
      </div>
      <h1 className="text-title font-bold text-text">{COMING_SOON_LABEL}</h1>
      <p className="max-w-md text-body text-text-muted">
        Tính năng này đang được hoàn thiện và sẽ sớm mở cho cửa hàng của bạn.
      </p>
      <Link
        href="/"
        className="rounded-lg bg-primary px-5 py-2.5 text-body-sm font-bold text-surface hover:bg-primary-dark"
      >
        Về trang chủ
      </Link>
    </div>
  )
}
